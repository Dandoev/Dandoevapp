import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withRoles, withValidation } from '@/lib/api-handler';
import prisma from '@/lib/prisma';

const schema=z.object({riderId:z.string().uuid(),loanId:z.string().uuid().optional(),orderId:z.string().uuid().optional()});
export const POST=withRoles(['super_admin','operations_admin'],withValidation(schema,async(_req,ctx)=>{
  const {id}=await ctx.params;
  try {
    const rider=await prisma.user.findUnique({where:{id:ctx.validatedBody.riderId},select:{id:true}});
    const asset=await prisma.vehicleAsset.findUnique({where:{id},select:{id:true,bikeId:true}});
    if(!rider||!asset)return NextResponse.json({error:'Rider or asset not found'},{status:404});
    if(ctx.validatedBody.loanId){const loan=await prisma.loan.findUnique({where:{id:ctx.validatedBody.loanId},select:{userId:true,bikeId:true}});if(!loan||loan.userId!==rider.id||loan.bikeId!==asset.bikeId)return NextResponse.json({error:'Loan does not belong to this rider and bike'},{status:409});}
    if(ctx.validatedBody.orderId){const order=await prisma.order.findUnique({where:{id:ctx.validatedBody.orderId},select:{userId:true,bikeId:true}});if(!order||order.userId!==rider.id||order.bikeId!==asset.bikeId)return NextResponse.json({error:'Order does not belong to this rider and bike'},{status:409});}
    const assignment=await prisma.vehicleAssignment.create({data:{assetId:id,...ctx.validatedBody}});
    return NextResponse.json({data:assignment},{status:201});
  } catch{return NextResponse.json({error:'Asset already assigned or assignment unavailable'},{status:409});}
}));
