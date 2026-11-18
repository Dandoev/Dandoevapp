import {randomInt} from 'node:crypto';
import {NextRequest,NextResponse} from 'next/server';
import {withAuth,type ApiContext} from '@/lib/api-handler';
import prisma from '@/lib/prisma';

export const POST=withAuth(async(req:NextRequest,ctx:ApiContext)=>{
 const {id}=await ctx.params;
 let body:unknown;try{body=await req.json();}catch{return NextResponse.json({error:'Invalid JSON'},{status:400});}
 if(!body||typeof body!=='object'||(body as {operation?:unknown}).operation!=='unlock')return NextResponse.json({error:'Only verified unlock requests are supported'},{status:400});
 if(process.env.OMNI_REMOTE_UNLOCK_ENABLED!=='true')return NextResponse.json({error:'Remote unlock is disabled'},{status:503});
 const assignment=await prisma.vehicleAssignment.findFirst({where:{assetId:id,riderId:ctx.user.sub,endedAt:null},include:{asset:{select:{imei:true,firmwareVersion:true,status:true}}}});
 if(!assignment||!assignment.asset.imei)return NextResponse.json({error:'Bike not found'},{status:404});
 if(!assignment.asset.firmwareVersion||assignment.asset.status!=='active')return NextResponse.json({error:'Bike is not eligible for remote commands'},{status:409});
 const heartbeat=await prisma.vehicleTelemetry.findFirst({where:{assetId:id},orderBy:{observedAt:'desc'},select:{observedAt:true}});
 if(!heartbeat||Date.now()-heartbeat.observedAt.getTime()>120000)return NextResponse.json({error:'Bike connection is stale'},{status:409});
 const pending=await prisma.vehicleCommand.findFirst({where:{assetId:id,status:{in:['requested','queued','dispatched','acknowledged']},expiresAt:{gt:new Date()}}});
 if(pending)return NextResponse.json({error:'A bike command is already pending'},{status:409});
 const command=await prisma.vehicleCommand.create({data:{assetId:id,riderId:ctx.user.sub,operation:'unlock',sequence:randomInt(1,2147483647),expiresAt:new Date(Date.now()+30000)}});
 return NextResponse.json({id:command.id,status:command.status,expiresAt:command.expiresAt},{status:202});
});

export const GET=withAuth(async(_req:NextRequest,ctx:ApiContext)=>{
 const {id}=await ctx.params;
 const assigned=await prisma.vehicleAssignment.findFirst({where:{assetId:id,riderId:ctx.user.sub,endedAt:null},select:{id:true}});if(!assigned)return NextResponse.json({error:'Bike not found'},{status:404});
 const commands=await prisma.vehicleCommand.findMany({where:{assetId:id,riderId:ctx.user.sub},orderBy:{requestedAt:'desc'},take:10,select:{id:true,operation:true,status:true,resultMessage:true,requestedAt:true,expiresAt:true}});
 return NextResponse.json({data:commands});
});
