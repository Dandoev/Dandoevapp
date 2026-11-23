import {createHmac,timingSafeEqual} from 'node:crypto';
import {NextRequest,NextResponse} from 'next/server';
import {reconcileSwap} from '@/lib/swap/service';

// Callback bodies are hints only. Authoritative outcome is fetched through the signed Yunku API.
export async function POST(req:NextRequest,context:{params:Promise<{id:string}>}){
 const {id}=await context.params,secret=process.env.SWAP_CALLBACK_SECRET,token=req.nextUrl.searchParams.get('token')||'';
 if(!secret||secret.length<32)return NextResponse.json({error:'Not configured'},{status:503});
 const expected=createHmac('sha256',secret).update(id).digest('hex');
 if(!/^[a-f0-9]{64}$/.test(token)||!timingSafeEqual(Buffer.from(expected),Buffer.from(token)))return NextResponse.json({error:'Unauthorized'},{status:401});
 try{const order=await reconcileSwap(id);if(!order.recordId)return NextResponse.json({error:'Record not available yet'},{status:503});return NextResponse.json({code:200});}catch{return NextResponse.json({error:'Reconciliation unavailable'},{status:503});}
}
