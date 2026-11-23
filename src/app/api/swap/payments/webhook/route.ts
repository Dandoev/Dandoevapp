import {NextRequest,NextResponse} from 'next/server';
import {verifyMonoSignature} from '@/lib/mono';
import prisma from '@/lib/prisma';
import {verifySwapPayment} from '@/lib/swap/service';

export async function POST(req:NextRequest){
 const secret=process.env.SWAP_MONO_WEBHOOK_SECRET;
 if(!secret)return NextResponse.json({error:'Webhook is not configured'},{status:503});
 const raw=await req.text();if(raw.length>32768)return NextResponse.json({error:'Payload too large'},{status:413});
 if(!verifyMonoSignature(raw,req.headers.get('mono-webhook-secret')||req.headers.get('x-mono-signature')||'',secret))return NextResponse.json({error:'Unauthorized'},{status:401});
 try{const payload=JSON.parse(raw);const ref=payload.data?.reference;if(typeof ref!=='string')return NextResponse.json({received:true});const order=await prisma.swapPurchase.findUnique({where:{id:ref}});if(order)await verifySwapPayment(order.id);return NextResponse.json({received:true});}catch{return NextResponse.json({error:'Payment reconciliation unavailable'},{status:503});}
}
