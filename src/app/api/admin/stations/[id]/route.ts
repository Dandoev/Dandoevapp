import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withRoles, withValidation } from '@/lib/api-handler';
import prisma from '@/lib/prisma';
const schema=z.object({name:z.string().min(2).max(120),address:z.string().min(5).max(240),latitude:z.number().min(-90).max(90),longitude:z.number().min(-180).max(180),hours:z.string().min(2).max(120),batteryTypes:z.array(z.string().min(1).max(60)).min(1),availableBatteries:z.number().int().min(0),enabled:z.boolean()}).partial();
export const PATCH=withRoles(['super_admin','operations_admin'],withValidation(schema,async(_req,ctx)=>{
  const {id}=await ctx.params;
  try{return NextResponse.json({data:await prisma.swapStation.update({where:{id},data:ctx.validatedBody})});}
  catch{return NextResponse.json({error:'Station not found or update unavailable'},{status:404});}
}));
