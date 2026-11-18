import {NextRequest,NextResponse} from 'next/server';
import {withRoles,type ApiContext} from '@/lib/api-handler';
import prisma from '@/lib/prisma';

const roles=['super_admin','operations_admin'];

export const POST=withRoles(roles,async(req:NextRequest,ctx:ApiContext)=>{
 const {id}=await ctx.params;
 let body:unknown;try{body=await req.json();}catch{return NextResponse.json({error:'Invalid JSON'},{status:400});}
 const reason=body&&typeof body==='object'&&typeof (body as {reason?:unknown}).reason==='string'?(body as {reason:string}).reason.trim():'';
 if(reason.length<5||reason.length>500)return NextResponse.json({error:'A lock reason between 5 and 500 characters is required'},{status:400});
 if(process.env.OMNI_REMOTE_LOCK_ENABLED!=='true')return NextResponse.json({error:'Admin remote lock is disabled'},{status:503});
 const asset=await prisma.vehicleAsset.findUnique({where:{id},select:{id:true,imei:true,status:true,firmwareVersion:true}});if(!asset)return NextResponse.json({error:'Bike not found'},{status:404});
 if(!asset.imei||asset.status!=='active'||!asset.firmwareVersion)return NextResponse.json({error:'Bike is not eligible for remote lock'},{status:409});
 // H0 reports lock and battery, but not a verified stationary state. Never infer that state.
 return NextResponse.json({error:'Remote lock is blocked until firmware supplies verified stationary state',code:'STATIONARY_PROOF_REQUIRED'},{status:409});
});
