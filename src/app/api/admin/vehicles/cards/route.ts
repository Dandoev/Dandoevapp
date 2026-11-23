import {NextRequest,NextResponse} from 'next/server';
import {withRoles,type ApiContext} from '@/lib/api-handler';
import prisma from '@/lib/prisma';
import {hashOmniCard,normalizeOmniCard} from '@/lib/omni-card';

const roles=['super_admin','operations_admin'];
export const POST=withRoles(roles,async(req:NextRequest,_ctx:ApiContext)=>{
 let body:unknown;try{body=await req.json();}catch{return NextResponse.json({error:'Invalid JSON'},{status:400});}
 const value=body as {cardNumber?:unknown;riderId?:unknown};const card=normalizeOmniCard(value?.cardNumber);
 if(!card||typeof value?.riderId!=='string'||!value.riderId.trim())return NextResponse.json({error:'Valid card number and rider ID required'},{status:400});
 let cardHash:string;try{cardHash=hashOmniCard(card);}catch{return NextResponse.json({error:'Card hashing unavailable'},{status:503});}
 const existing=await prisma.vehicleCard.findUnique({where:{cardHash}});if(existing)return NextResponse.json({error:'Card already enrolled; revoke it before reassignment'},{status:409});
 const enrolled=await prisma.vehicleCard.create({data:{cardHash,riderId:value.riderId.trim()}});
 return NextResponse.json({id:enrolled.id,riderId:enrolled.riderId,active:enrolled.active},{status:201});
});

export const GET=withRoles(roles,async(_req:NextRequest,_ctx:ApiContext)=>{
 const cards=await prisma.vehicleCard.findMany({orderBy:{createdAt:'desc'},take:200,select:{id:true,riderId:true,active:true,createdAt:true,revokedAt:true}});
 return NextResponse.json({data:cards});
});
