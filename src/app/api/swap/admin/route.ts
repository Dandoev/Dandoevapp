import {NextResponse} from 'next/server';
import {z} from 'zod';
import {withRoles} from '@/lib/api-handler';
import prisma from '@/lib/prisma';
import {reconcileSwap,refundFailedWalletSwap,syncCabinets,verifySwapPayment} from '@/lib/swap/service';

const readers=['super_admin','operations_admin','finance_admin'];
export const GET=withRoles(readers,async()=>{
 try{const [cabinets,orders]=await Promise.all([prisma.swapCabinet.findMany({orderBy:{name:'asc'},include:{tiers:true}}),prisma.swapPurchase.findMany({orderBy:{createdAt:'desc'},take:100,include:{cabinet:{select:{name:true}}}})]);return NextResponse.json({cabinets,orders,configured:{yunku:!!process.env.YUNKU_APP_ID&&!!process.env.YUNKU_API_KEY,operations:process.env.YUNKU_OPERATIONS_ENABLED==='true',payments:process.env.SWAP_PAYMENTS_ENABLED==='true'}});}catch{return NextResponse.json({error:'Swap records unavailable. Apply the swap migration and check the database.'},{status:503});}
});
const input=z.discriminatedUnion('action',[
 z.object({action:z.literal('sync'),page:z.number().int().positive().default(1)}),
 z.object({action:z.literal('configure'),id:z.string().uuid(),priceKobo:z.number().int().positive().max(100000000),categoryId:z.number().int().positive(),enabled:z.boolean(),tiers:z.array(z.object({categoryId:z.number().int().positive(),minSoc:z.number().int().min(0).max(100),maxSoc:z.number().int().min(0).max(100),priceKobo:z.number().int().positive(),enabled:z.boolean().default(true)})).max(20)}),
 z.object({action:z.literal('reconcile'),id:z.string().uuid()}),
 z.object({action:z.literal('refund_wallet'),id:z.string().uuid()}),
]);
export const POST=withRoles(readers,async(req,ctx)=>{
 try{const parsed=input.safeParse(await req.json());if(!parsed.success)return NextResponse.json({error:'Invalid action or settings'},{status:400});const data=parsed.data;
 if(!['reconcile','refund_wallet'].includes(data.action)&&!['super_admin','operations_admin'].includes(ctx.user.role))return NextResponse.json({error:'Operations role required'},{status:403});
 if(data.action==='sync')return NextResponse.json(await syncCabinets(data.page));
 if(data.action==='refund_wallet'){
  if(!['super_admin','finance_admin'].includes(ctx.user.role))return NextResponse.json({error:'Finance role required'},{status:403});
  return NextResponse.json({data:await refundFailedWalletSwap(data.id,ctx.user.sub)});
 }
 if(data.action==='configure'){const {action,id,tiers,...settings}=data;await prisma.$transaction(async tx=>{await tx.swapCabinet.update({where:{id},data:settings});await tx.swapPriceTier.deleteMany({where:{cabinetId:id}});await tx.swapPriceTier.createMany({data:tiers.map(t=>({...t,cabinetId:id}))});await tx.auditLog.create({data:{userId:ctx.user.sub,action:'swap.cabinet.configure',resource:'swap_cabinet',resourceId:id,details:JSON.stringify({settings,tiers})}});});return NextResponse.json({success:true});}
 await verifySwapPayment(data.id);return NextResponse.json({data:await reconcileSwap(data.id)});
 }catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Swap operation failed'},{status:502});}
});
