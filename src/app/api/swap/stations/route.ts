import {NextResponse} from 'next/server';
import {withAuth} from '@/lib/api-handler';
import prisma from '@/lib/prisma';
export const GET=withAuth(async()=>{
 try{const data=await prisma.swapCabinet.findMany({where:{enabled:true},orderBy:{name:'asc'}});return NextResponse.json({data:data.map(c=>({id:c.id,deviceCode:c.deviceCode,name:c.name,address:c.address,hours:c.hours,latitude:c.latitude,longitude:c.longitude,categoryId:c.categoryId,priceKobo:null,tieredPricing:true,onlineStatus:c.onlineStatus,available:c.syncedAt&&Date.now()-c.syncedAt.getTime()<=60000?c.available:null,syncedAt:c.syncedAt}))});}catch{return NextResponse.json({error:'Swap stations unavailable'},{status:503});}
});
