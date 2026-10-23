import { NextRequest, NextResponse } from 'next/server';
import { withRoles, withValidation } from '@/lib/api-handler';
import { updateBikeSchema } from '@/lib/schemas';
import dbService from '@/lib/db-service';
import logger from '@/lib/logger';

// ---- PUT: Update Bike ----
const putHandler = withValidation(updateBikeSchema, async (req, ctx) => {
  const url = new URL(req.url);
  const id = url.pathname.split('/').pop()!;
  const data = ctx.validatedBody;

  try {
    const updated = await dbService.updateBike(id, {
      ...(data.name && { name: data.name }),
      ...(data.brand && { brand: data.brand }),
      ...(data.model !== undefined && { model: data.model }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.price !== undefined && { price: Number(data.price) }),
      ...(data.category !== undefined && { category: data.category }),
      ...(data.stockQuantity !== undefined && { stockQuantity: Number(data.stockQuantity) }),
      ...(data.availability !== undefined && { availability: data.availability as 'in_stock' | 'out_of_stock' | 'pre_order' }),
      ...(data.bnplEligible !== undefined && { bnplEligible: data.bnplEligible }),
      ...(data.bnplMinDownPayment !== undefined && { bnplMinDownPayment: Number(data.bnplMinDownPayment) }),
      ...(data.features !== undefined && { features: data.features }),
      ...(data.colors !== undefined && { colors: data.colors }),
    });

    if (!updated) {
      return NextResponse.json({ error: 'Bike not found' }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    logger.error({ error }, 'Failed to update bike');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

// ---- DELETE: Remove / Retire Bike ----
const deleteHandler = async (req: NextRequest) => {
  const url = new URL(req.url);
  const id = url.pathname.split('/').pop()!;

  try {
    const deleted = await dbService.deleteBike(id);
    if (!deleted) {
      return NextResponse.json({ error: 'Bike not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: 'Bike retired from fleet inventory' });
  } catch (error) {
    logger.error({ error }, 'Failed to delete bike');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
};

export const PUT = withRoles(['super_admin', 'operations_admin', 'fleet_manager'], putHandler);
export const DELETE = withRoles(['super_admin', 'operations_admin', 'fleet_manager'], deleteHandler);
