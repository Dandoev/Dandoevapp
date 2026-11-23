import {NextResponse} from 'next/server';
import {z} from 'zod';
import {withAuth} from '@/lib/api-handler';
import prisma from '@/lib/prisma';
import {checkoutSwap,executeSwap,paySwapFromWallet,reconcileSwap,verifySwapPayment} from '@/lib/swap/service';
export const GET=withAuth(async(_req,ctx)=>{try{return NextResponse.json({data:await prisma.swapPurchase.findMany({where:{userId:ctx.user.sub},orderBy:{createdAt:'desc'},take:30,include:{cabinet:{select:{name:true}}}})});}catch{return NextResponse.json({error:'Swap history unavailable'},{status:503});}});
const schema=z.discriminatedUnion('action',[
 z.object({action:z.literal('checkout'),cabinetId:z.string().uuid(),batterySn:z.string().min(1).max(100),requestKey:z.string().min(16).max(100)}),
 z.object({action:z.literal('wallet'),cabinetId:z.string().uuid(),batterySn:z.string().min(1).max(100),requestKey:z.string().min(16).max(100)}),
 z.object({action:z.enum(['verify','execute','reconcile']),id:z.string().uuid()}),
]);
export const POST=withAuth(async(req,ctx)=>{
 try{const parsed=schema.safeParse(await req.json());if(!parsed.success)return NextResponse.json({error:'Invalid swap request'},{status:400});const data=parsed.data;
 if(data.action==='checkout')return NextResponse.json({data:await checkoutSwap(ctx.user.sub,data.cabinetId,data.batterySn,data.requestKey)});
 if(data.action==='wallet')return NextResponse.json({data:await paySwapFromWallet(ctx.user.sub,data.cabinetId,data.batterySn,data.requestKey)});
 const order=await prisma.swapPurchase.findFirst({where:{id:data.id,userId:ctx.user.sub}});if(!order)return NextResponse.json({error:'Swap not found'},{status:404});
 const result=data.action==='verify'?await verifySwapPayment(order.id):data.action==='execute'?await executeSwap(order.id):await reconcileSwap(order.id);return NextResponse.json({data:result});
 }catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Swap service unavailable'},{status:502});}
});
