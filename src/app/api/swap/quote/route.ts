import {NextResponse} from 'next/server';
import {z} from 'zod';
import {withAuth} from '@/lib/api-handler';
import {quoteSwap} from '@/lib/swap/service';
const input=z.object({cabinetId:z.string().uuid(),batterySn:z.string().trim().min(2).max(100)});
export const POST=withAuth(async(req,ctx)=>{try{const parsed=input.safeParse(await req.json());if(!parsed.success)return NextResponse.json({error:'Station and battery serial are required'},{status:400});return NextResponse.json({data:await quoteSwap(ctx.user.sub,parsed.data.cabinetId,parsed.data.batterySn)});}catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Unable to price swap'},{status:422});}});
