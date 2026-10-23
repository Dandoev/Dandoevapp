import { NextRequest, NextResponse } from 'next/server';
import { withRoles, withValidation } from '@/lib/api-handler';
import { createBikeSchema } from '@/lib/schemas';
import dbService from '@/lib/db-service';
import logger from '@/lib/logger';

// ---- GET: List all bikes for admin ----
const getHandler = async (req: NextRequest) => {
  try {
    const bikes = await dbService.getBikes();
    return NextResponse.json(bikes);
  } catch (error) {
    logger.error({ error }, 'Failed to fetch bikes from database');
    return NextResponse.json({ error: 'Failed to fetch bikes' }, { status: 500 });
  }
};

// ---- POST: Create New Bike ----
const postHandler = withValidation(createBikeSchema, async (req, ctx) => {
  const data = ctx.validatedBody;

  try {
    const bike = await dbService.createBike({
      name: data.name,
      brand: data.brand,
      model: data.model || 'Commercial',
      description: data.description || '',
      price: Number(data.price),
      category: data.category || 'Commercial',
      stockQuantity: Number(data.stockQuantity || 1),
      availability: data.availability as 'in_stock' | 'out_of_stock' | 'pre_order',
      bnplEligible: Boolean(data.bnplEligible),
      bnplMinDownPayment: Number(data.bnplMinDownPayment || 10),
      features: data.features || ['Dual Swappable 60V Battery', 'Hydraulic Disc Brakes', 'Anti-Theft GPS Tracker'],
      colors: data.colors || ['Black'],
      images: ['/bikes/DandoEv_X5.jpg'],
      batteryHealthSoh: 99.2,
    });

    return NextResponse.json(bike, { status: 201 });
  } catch (error) {
    logger.error({ error }, 'Failed to create bike');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

// Chain with Roles auth
export const GET = withRoles(['super_admin', 'operations_admin', 'fleet_manager', 'credit_underwriter'], getHandler);
export const POST = withRoles(['super_admin', 'operations_admin', 'fleet_manager'], postHandler);
