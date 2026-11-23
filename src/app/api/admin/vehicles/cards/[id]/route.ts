import {NextRequest,NextResponse} from 'next/server';
import {withRoles,type ApiContext} from '@/lib/api-handler';
import prisma from '@/lib/prisma';

export const DELETE=withRoles(['super_admin','operations_admin'],async(_req:NextRequest,ctx:ApiContext)=>{
 const {id}=await ctx.params;
 const updated=await prisma.vehicleCard.updateMany({where:{id,active:true},data:{active:false,revokedAt:new Date()}});
 if(!updated.count)return NextResponse.json({error:'Active card not found'},{status:404});
 return NextResponse.json({success:true});
});
