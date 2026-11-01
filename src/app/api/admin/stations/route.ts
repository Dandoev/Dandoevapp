import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withRoles, withValidation } from '@/lib/api-handler';
import prisma from '@/lib/prisma';

const stationSchema = z.object({name:z.string().min(2).max(120),address:z.string().min(5).max(240),latitude:z.number().min(-90).max(90),longitude:z.number().min(-180).max(180),hours:z.string().min(2).max(120),batteryTypes:z.array(z.string().min(1).max(60)).min(1),availableBatteries:z.number().int().min(0),enabled:z.boolean().default(false)});
export const GET = withRoles(['super_admin','operations_admin'],async()=>{
  try{return NextResponse.json({data:await prisma.swapStation.findMany({orderBy:{name:'asc'}})});}
  catch{return NextResponse.json({error:'Station records unavailable'},{status:503});}
});
export const POST = withRoles(['super_admin','operations_admin'],withValidation(stationSchema,async(_req,ctx)=>{
  try{const station=await prisma.swapStation.create({data:ctx.validatedBody});return NextResponse.json({data:station},{status:201});}
  catch{return NextResponse.json({error:'Unable to create station'},{status:503});}
}));
