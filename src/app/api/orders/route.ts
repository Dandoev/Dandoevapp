import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withIdempotency, withValidation, type ApiContext } from '@/lib/api-handler';
import { createOrderSchema, type CreateOrderInput } from '@/lib/schemas';
import prisma from '@/lib/prisma';
import logger from '@/lib/logger';
import { type TxClient } from '@/lib/prisma-types';
import { calculateOutrightOrderTotal } from '@/lib/order-pricing';

/**
 * GET /api/orders — List orders for authenticated user (or all for admins)
 */
export const GET = withAuth(
  async (req: NextRequest, ctx: ApiContext) => {
    try {
      const isAdmin = ['super_admin', 'operations_admin'].includes(ctx.user.role);
      const orders = await prisma.order.findMany({
        where: isAdmin ? {} : { userId: ctx.user.sub },
        include: {
          bike: { select: { name: true, brand: true, images: true } },
          accessories: {
            include: {
              accessory: { select: { name: true, category: true, images: true } }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
      });

      return NextResponse.json({ success: true, data: orders });
    } catch (error) {
      logger.error({ error }, 'Failed to fetch orders');
      return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
    }
  }
);

/**
 * POST /api/orders — Create a new order
 */
export const POST = withAuth(
  withIdempotency(
    withValidation(
      createOrderSchema,
      async (req: NextRequest, ctx: ApiContext & { validatedBody: CreateOrderInput }) => {
        const log = logger.child({ requestId: ctx.requestId, route: 'orders' });
        const data = ctx.validatedBody;

        try {
          let bike = null;
          let bikeUnitPrice = 0;
          let bikeTotal = 0;

          // ---- 1. Verify bike if provided ----
          if (data.bikeId) {
            bike = await prisma.bike.findUnique({
              where: { id: data.bikeId },
            });

            if (!bike) {
              return NextResponse.json({ error: 'Bike not found' }, { status: 404 });
            }

            if (bike.availability !== 'in_stock' || bike.stockQuantity < data.quantity) {
              return NextResponse.json({ error: 'Bike is not available in the requested quantity' }, { status: 409 });
            }

            bikeUnitPrice = Number(bike.price);
            bikeTotal = bikeUnitPrice * data.quantity;
          }

          // ---- 2. Verify accessories if provided ----
          let dbAccessories: any[] = [];
          let accessoriesTotal = 0;

          if (data.accessories && data.accessories.length > 0) {
            const accessoryIds = data.accessories.map(a => a.id);
            dbAccessories = await prisma.accessory.findMany({
              where: { id: { in: accessoryIds } },
            });

            if (dbAccessories.length !== accessoryIds.length) {
              return NextResponse.json({ error: 'One or more accessories not found' }, { status: 404 });
            }

            // Check stock
            for (const reqAcc of data.accessories) {
              const dbAcc = dbAccessories.find(a => a.id === reqAcc.id);
              if (dbAcc.stockQuantity < reqAcc.quantity) {
                return NextResponse.json({ error: `Accessory '${dbAcc.name}' is out of stock in the requested quantity` }, { status: 409 });
              }
              accessoriesTotal += Number(dbAcc.price) * reqAcc.quantity;
            }
          }

          // Ensure we are actually ordering something
          if (!bike && dbAccessories.length === 0) {
            return NextResponse.json({ error: 'Cannot create empty order' }, { status: 400 });
          }

          // Determine delivery option and fee (Outright buyers have option for Pickup: Free, Lagos: 20000, Outside Lagos: 50000)
          const deliveryType = data.deliveryType || (data.deliveryAddress === 'Pickup Hub' ? 'pickup' : (data.deliveryState === 'Lagos' ? 'delivery_lagos' : 'delivery_outside'));
          const { deliveryFee, insuranceFee, totalAmount } = calculateOutrightOrderTotal({
            bikeTotal, accessoriesTotal, deliveryType,
          });

          // Verify loan ownership if loanId is provided
          if (data.loanId) {
            const loan = await prisma.loan.findFirst({
              where: { id: data.loanId, userId: ctx.user.sub },
            });
            if (!loan) {
              return NextResponse.json({ error: 'Loan not found or does not belong to you' }, { status: 403 });
            }
          }

          // ---- 3. Create order in a transaction ----
          const order = await prisma.$transaction(async (tx: TxClient) => {
            // Decrement bike stock if applicable with strict stock availability check
            if (bike && data.bikeId) {
              const bikeUpdate = await tx.bike.updateMany({
                where: {
                  id: data.bikeId,
                  stockQuantity: { gte: data.quantity },
                },
                data: { stockQuantity: { decrement: data.quantity } },
              });

              if (bikeUpdate.count === 0) {
                throw new Error('Bike is no longer in stock in the requested quantity');
              }
            }

            // Create OrderAccessory items and decrement accessory stock
            if (data.accessories && data.accessories.length > 0) {
              for (const reqAcc of data.accessories) {
                const dbAcc = dbAccessories.find(a => a.id === reqAcc.id);
                const accUpdate = await tx.accessory.updateMany({
                  where: {
                    id: reqAcc.id,
                    stockQuantity: { gte: reqAcc.quantity },
                  },
                  data: { stockQuantity: { decrement: reqAcc.quantity } },
                });

                if (accUpdate.count === 0) {
                  throw new Error(`Accessory '${dbAcc?.name}' is no longer in stock in the requested quantity`);
                }
              }
            }

            const newOrder = await tx.order.create({
              data: {
                userId: ctx.user.sub,
                bikeId: data.bikeId || null,
                quantity: bike ? data.quantity : 0, // 0 if only accessories
                unitPrice: bikeUnitPrice,
                totalAmount,
                paymentMethod: data.paymentMethod,
                status: 'pending',
                deliveryType,
                deliveryFee,
                insuranceFee,
                serviceFee: 0,
                deliveryAddress: deliveryType === 'pickup' ? 'Lagos Central Pickup Hub' : data.deliveryAddress,
                deliveryCity: deliveryType === 'pickup' ? 'Ikeja' : data.deliveryCity,
                deliveryState: deliveryType === 'pickup' ? 'Lagos' : data.deliveryState,
                deliveryPhone: data.deliveryPhone,
                loanId: data.loanId || null,
                notes: data.notes || null,
              },
            });

            if (data.accessories && data.accessories.length > 0) {
              for (const reqAcc of data.accessories) {
                const dbAcc = dbAccessories.find(a => a.id === reqAcc.id);
                await tx.orderAccessory.create({
                  data: {
                    orderId: newOrder.id,
                    accessoryId: reqAcc.id,
                    quantity: reqAcc.quantity,
                    unitPrice: Number(dbAcc.price),
                  }
                });
              }
            }

            return newOrder;
          });

          log.info({ orderId: order.id }, 'Order created');

          return NextResponse.json(
            { success: true, orderId: order.id, message: 'Order created successfully' },
            { status: 201 }
          );
        } catch (error) {
          log.error({ error }, 'Order creation error');
          return NextResponse.json({ error: 'Failed to process order' }, { status: 500 });
        }
      }
    )
  )
);
