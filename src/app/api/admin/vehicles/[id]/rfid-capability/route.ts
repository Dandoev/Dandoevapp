import {NextRequest,NextResponse} from 'next/server';
import {withRoles,type ApiContext} from '@/lib/api-handler';
import prisma from '@/lib/prisma';

export const POST=withRoles(['super_admin'],async(req:NextRequest,ctx:ApiContext)=>{
 const {id}=await ctx.params;
 let body:unknown;try{body=await req.json();}catch{return NextResponse.json({error:'Invalid JSON'},{status:400});}
 const value=body as {verified?:unknown;firmwareVersion?:unknown};
 if(typeof value?.verified!=='boolean'||(value.verified&&(typeof value.firmwareVersion!=='string'||value.firmwareVersion.trim().length<3)))return NextResponse.json({error:'Verified flag and tested firmware version required'},{status:400});
 const asset=await prisma.vehicleAsset.findUnique({where:{id},select:{id:true}});if(!asset)return NextResponse.json({error:'Bike not found'},{status:404});
 const updated=await prisma.vehicleAsset.update({where:{id},data:{rfidVerified:value.verified,...(value.verified?{firmwareVersion:(value.firmwareVersion as string).trim()}:{})},select:{id:true,rfidVerified:true,firmwareVersion:true}});
 return NextResponse.json(updated);
});
