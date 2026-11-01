import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withRoles, withValidation } from '@/lib/api-handler';
import prisma from '@/lib/prisma';

const schema=z.object({bikeId:z.string().uuid(),serialNumber:z.string().trim().min(3).max(80),imei:z.string().regex(/^\d{15}$/).optional(),bleMac:z.string().regex(/^([0-9a-fA-F]{2}:){5}[0-9a-fA-F]{2}$/).optional()});
const roles=['super_admin','operations_admin'];
export const GET=withRoles(roles,async()=>{
  try{return NextResponse.json({data:await prisma.vehicleAsset.findMany({include:{bike:{select:{name:true,model:true}},assignments:{where:{endedAt:null},take:1}},orderBy:{createdAt:'desc'}})});}
  catch{return NextResponse.json({error:'Asset inventory unavailable'},{status:503});}
});
export const POST=withRoles(roles,withValidation(schema,async(_req,ctx)=>{
  try{const asset=await prisma.vehicleAsset.create({data:ctx.validatedBody});return NextResponse.json({data:asset},{status:201});}
  catch{return NextResponse.json({error:'Unable to register asset; check bike ID and unique identifiers'},{status:409});}
}));
