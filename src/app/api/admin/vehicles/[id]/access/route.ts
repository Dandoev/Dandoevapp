import {NextRequest,NextResponse} from 'next/server';
import {withRoles,type ApiContext} from '@/lib/api-handler';
import prisma from '@/lib/prisma';

export const POST=withRoles(['super_admin','operations_admin'],async(req:NextRequest,ctx:ApiContext)=>{
 const {id}=await ctx.params;
 let body:unknown;try{body=await req.json();}catch{return NextResponse.json({error:'Invalid JSON'},{status:400});}
 const value=body as {blocked?:unknown;reason?:unknown};
 if(typeof value?.blocked!=='boolean'||(value.blocked&&(typeof value.reason!=='string'||value.reason.trim().length<5||value.reason.length>500)))return NextResponse.json({error:'Blocked flag and reason required'},{status:400});
 const asset=await prisma.vehicleAsset.findUnique({where:{id},select:{id:true}});if(!asset)return NextResponse.json({error:'Bike not found'},{status:404});
 await prisma.$transaction(async tx=>{
  await tx.vehicleAsset.update({where:{id},data:{unlockBlockedAt:value.blocked?new Date():null,unlockBlockReason:value.blocked?(value.reason as string).trim():null}});
  if(value.blocked)await tx.vehicleCommand.updateMany({where:{assetId:id,status:{in:['requested','queued']}},data:{status:'failed',resultMessage:'Admin blocked bike access before dispatch'}});
 });
 return NextResponse.json({blocked:value.blocked});
});
