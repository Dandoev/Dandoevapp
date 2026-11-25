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
              const modelMatch = data.bikeId.replace(/^(bike|seed-bike)-/i, '');
              bike = await prisma.bike.findFirst({
                where: {
                  OR: [
                    { model: { equals: modelMatch, mode: 'insensitive' } },
                    { name: { contains: modelMatch, mode: 'insensitive' } },
                  ],
                },
              });
            }

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
          const ACCESSORY_SLUG_MAP: Record<string, string> = {
            'battery-36v-15ah': 'seed-acc-battery-250000',
            'battery-36v-10ah': 'seed-acc-battery-250000',
            'battery-48v-15ah': 'seed-acc-battery-350000',
            'battery-48v-20ah': 'seed-acc-battery-300000',
            'battery-48v-25ah': 'seed-acc-battery-385000',
            'charger-fast-5a': 'seed-acc-charger-60000',
            'charger-standard-2a': 'seed-acc-charger-45000',
          };

          type ResolvedAccessory = {
            dbAcc: any;
            quantity: number;
          };
          const resolvedAccessories: ResolvedAccessory[] = [];
          let accessoriesTotal = 0;

          if (data.accessories && data.accessories.length > 0) {
            for (const reqAcc of data.accessories) {
              const reqId = String(reqAcc.id || '').trim();
              let dbAcc = await prisma.accessory.findUnique({
                where: { id: reqId },
              });

              if (!dbAcc && ACCESSORY_SLUG_MAP[reqId]) {
                dbAcc = await prisma.accessory.findUnique({
                  where: { id: ACCESSORY_SLUG_MAP[reqId] },
                });
              }

              if (!dbAcc) {
                const lower = reqId.toLowerCase();
                let namePattern = '';
                if (lower.includes('36v') || lower.includes('x2')) {
                  namePattern = '36V';
                } else if (lower.includes('48v-15ah') || lower.includes('48v 15ah') || lower.includes('x4') || lower.includes('x5')) {
                  namePattern = '48V 15Ah';
                } else if (lower.includes('48v-20ah') || lower.includes('48v 20ah')) {
                  namePattern = '48V 20Ah';
                } else if (lower.includes('48v-25ah') || lower.includes('48v 25ah')) {
                  namePattern = '48V 25Ah';
                } else if (lower.includes('charger')) {
                  namePattern = 'Charger';
                }

                if (namePattern) {
                  dbAcc = await prisma.accessory.findFirst({
                    where: {
                      name: { contains: namePattern, mode: 'insensitive' },
                    },
                  });
                }
              }

              if (!dbAcc) {
                return NextResponse.json({ error: 'One or more accessories not found' }, { status: 404 });
              }

              if (dbAcc.stockQuantity < reqAcc.quantity) {
                return NextResponse.json({ error: `Accessory '${dbAcc.name}' is out of stock in the requested quantity` }, { status: 409 });
              }

              accessoriesTotal += Number(dbAcc.price) * reqAcc.quantity;
              resolvedAccessories.push({
                dbAcc,
                quantity: reqAcc.quantity,
              });
            }
          }

          // Ensure we are actually ordering something
          if (!bike && resolvedAccessories.length === 0) {
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
            if (bike) {
              const bikeUpdate = await tx.bike.updateMany({
                where: {
                  id: bike.id,
                  stockQuantity: { gte: data.quantity },
                },
                data: { stockQuantity: { decrement: data.quantity } },
              });

              if (bikeUpdate.count === 0) {
                throw new Error('Bike is no longer in stock in the requested quantity');
              }
            }

            // Create OrderAccessory items and decrement accessory stock
            if (resolvedAccessories.length > 0) {
              for (const item of resolvedAccessories) {
                const accUpdate = await tx.accessory.updateMany({
                  where: {
                    id: item.dbAcc.id,
                    stockQuantity: { gte: item.quantity },
                  },
                  data: { stockQuantity: { decrement: item.quantity } },
                });

                if (accUpdate.count === 0) {
                  throw new Error(`Accessory '${item.dbAcc.name}' is no longer in stock in the requested quantity`);
                }
              }
            }

            const newOrder = await tx.order.create({
              data: {
                userId: ctx.user.sub,
                bikeId: bike ? bike.id : null,
                quantity: bike ? data.quantity : 0, // 0 if only accessories
                unitPrice: bikeUnitPrice,
                totalAmount,
                paymentMethod: data.paymentMethod,
                status: 'pending',
                deliveryType,
                deliveryFee,
                insuranceFee,
                serviceFee: 0,
                deliveryAddress: deliveryType === 'pickup' ? 'Plot 770 Festac Link Rd, Amuwo Odofin, Lagos' : data.deliveryAddress,
                deliveryCity: deliveryType === 'pickup' ? 'Amuwo Odofin' : data.deliveryCity,
                deliveryState: deliveryType === 'pickup' ? 'Lagos' : data.deliveryState,
                deliveryPhone: data.deliveryPhone,
                loanId: data.loanId || null,
                notes: data.notes || null,
              },
            });

            if (resolvedAccessories.length > 0) {
              for (const item of resolvedAccessories) {
                await tx.orderAccessory.create({
                  data: {
                    orderId: newOrder.id,
                    accessoryId: item.dbAcc.id,
                    quantity: item.quantity,
                    unitPrice: Number(item.dbAcc.price),
                  }
                });
              }
            }

            return newOrder;
          });

          log.info({ orderId: order.id }, 'Order created');

          return NextResponse.json(
            { success: true, orderId: order.id, totalAmount: Number(order.totalAmount), message: 'Order created successfully' },
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
