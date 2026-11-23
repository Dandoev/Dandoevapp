import {createHmac,timingSafeEqual} from 'node:crypto';
import {NextRequest,NextResponse} from 'next/server';
import prisma from '@/lib/prisma';

export const runtime='nodejs';
function authorized(req:NextRequest,body:string){const secret=process.env.OMNI_INGEST_SECRET,t=req.headers.get('x-omni-timestamp')||'',sig=req.headers.get('x-omni-signature')||'';if(!secret||secret.length<32||!/^\d{13}$/.test(t)||Math.abs(Date.now()-Number(t))>120000||!/^[0-9a-f]{64}$/.test(sig))return false;return timingSafeEqual(createHmac('sha256',secret).update(`${t}.${body}`).digest(),Buffer.from(sig,'hex'));}
export async function GET(req:NextRequest){
 if(!authorized(req,''))return NextResponse.json({error:'Unauthorized'},{status:401});
 await prisma.vehicleCommand.updateMany({where:{status:{in:['requested','queued','dispatched','acknowledged']},expiresAt:{lte:new Date()}},data:{status:'unknown',resultMessage:'Command expired without confirmed device state'}});
 const imeis=(req.nextUrl.searchParams.get('imeis')||'').split(',').filter(x=>/^\d{15}$/.test(x)).slice(0,1000);if(!imeis.length)return NextResponse.json({data:[]});
 const candidates=await prisma.vehicleCommand.findMany({where:{status:'requested',expiresAt:{gt:new Date()},asset:{imei:{in:imeis},unlockBlockedAt:null,status:'active'}},include:{asset:{select:{imei:true}}},orderBy:{requestedAt:'asc'},take:20});
 const data=[];for(const c of candidates){const claimed=await prisma.vehicleCommand.updateMany({where:{id:c.id,status:'requested'},data:{status:'queued'}});if(claimed.count)data.push({id:c.id,imei:c.asset.imei,operation:c.operation,source:c.reason==='rfid_card'?'rfid':'app',actor:c.actor,sequence:c.sequence,expiresAt:c.expiresAt.getTime()});}
 return NextResponse.json({data});
}
export async function POST(req:NextRequest){
 const body=await req.text();if(body.length>1024||!authorized(req,body))return NextResponse.json({error:'Unauthorized'},{status:401});
 let value:unknown;try{value=JSON.parse(body);}catch{return NextResponse.json({error:'Invalid JSON'},{status:400});}
 const item=value as {id?:unknown;status?:unknown};if(typeof item?.id!=='string'||!['dispatched','acknowledged','applied','failed','expired','unknown'].includes(String(item.status)))return NextResponse.json({error:'Invalid status'},{status:400});
 const existing=await prisma.vehicleCommand.findUnique({where:{id:item.id}});if(!existing)return NextResponse.json({error:'Command not found'},{status:404});
 if(['applied','failed','expired','unknown'].includes(existing.status))return NextResponse.json({success:true});
 const allowed:Record<string,string[]>={queued:['dispatched','failed','expired','unknown'],dispatched:['acknowledged','applied','failed','unknown'],acknowledged:['applied','failed','unknown']};
 if(!allowed[existing.status]?.includes(String(item.status)))return NextResponse.json({error:'Invalid transition'},{status:409});
 await prisma.vehicleCommand.updateMany({where:{id:item.id,status:existing.status},data:{status:String(item.status)}});return NextResponse.json({success:true});
}
