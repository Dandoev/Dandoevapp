import prisma from '@/lib/prisma';
import {createHmac} from 'node:crypto';
import {initiateMonoPayment,isMonoProductConfigured,verifyMonoPayment} from '@/lib/mono';
import {providerRows,swapOutcome,yunku} from './yunku';
import {postLedgerEntries} from '@/lib/ledger';

export async function syncCabinets(pageNum=1){
 const list=providerRows(await yunku('deviceList',{pageNum,pageSize:300}));
 for(const c of list){
  if(typeof c.deviceCode!=='string'||!c.deviceCode)throw new Error('Invalid cabinet code');
  const coordinate=(value:unknown,limit:number)=>value!==''&&value!=null&&Number.isFinite(Number(value))&&Math.abs(Number(value))<=limit?Number(value):null;
  const data={name:String(c.deviceName||c.deviceCode),address:String(c.address||''),hours:String(c.businessHours||''),latitude:coordinate(c.latitudeWgs84,90),longitude:coordinate(c.longitudeWgs84,180)};
  await prisma.swapCabinet.upsert({where:{deviceCode:c.deviceCode},create:{deviceCode:c.deviceCode,...data},update:data});
 }
 if(list.length){
  const status=providerRows(await yunku('deviceSelectList',{deviceCode:list.map(c=>c.deviceCode).join(','),pageSize:300,pageNum:1}));
  for(const c of status){if(typeof c.deviceCode!=='string'||!Array.isArray(c.portsDetails))continue;await prisma.swapCabinet.updateMany({where:{deviceCode:c.deviceCode},data:{onlineStatus:Number(c.onlineStatus),available:Math.max(0,Number(c.mayNumber)||0),ports:c.portsDetails,syncedAt:new Date()}});}
 }
 return {imported:list.length,nextPage:list.length===300?pageNum+1:null};
}

async function quoteFor(userId:string,cabinetId:string,batterySn:string){
 const [user,cabinet]=await Promise.all([prisma.user.findUnique({where:{id:userId}}),prisma.swapCabinet.findUnique({where:{id:cabinetId},include:{tiers:true}})]);
 if(!user?.phone)throw new Error('A verified rider phone number is required');
 if(!cabinet?.enabled||!cabinet.categoryId)throw new Error('Station and battery type are not configured');
 if(cabinet.onlineStatus!==1||!cabinet.syncedAt||Date.now()-cabinet.syncedAt.getTime()>60000)throw new Error('Station availability needs refreshing');
 const ports=cabinet.ports as Array<{batteryTypeId:number;boxStatus:number;batterySn?:string;soc?:number}>|null;
 const port=ports?.find(p=>Number(p.batteryTypeId)===cabinet.categoryId&&Number(p.boxStatus)===2);
 if(!port)throw new Error('No fully charged compatible battery is reported');
 const bindings=providerRows(await yunku('selectUserBatteryBinding',{openId:userId,phone:user.phone}));
 const binding=bindings.find(b=>b.batteryNum===batterySn&&Number(b.categoryId)===cabinet.categoryId);
 if(!binding)throw new Error('This battery is not bound to your rider account and compatible category');
 // Yunku's documented binding response has no SOC. Some deployments expose one
 // as an extension; never price from the charged replacement battery in a port.
 const soc=Number(binding.soc??binding.batterySoc??binding.batteryPower);
 if(!Number.isInteger(soc)||soc<0||soc>100)throw new Error('Returned battery charge is unavailable from Yunku; tier pricing cannot be calculated safely');
 const tier=cabinet.tiers.find(t=>t.enabled&&t.categoryId===cabinet.categoryId&&t.minSoc<=soc&&t.maxSoc>=soc);
 if(!tier)throw new Error(`No admin price tier covers ${soc}% battery charge`);
 return {user,cabinet,categoryId:cabinet.categoryId,batterySoc:soc,priceKobo:tier.priceKobo};
}

export async function quoteSwap(userId:string,cabinetId:string,batterySn:string){
 const q=await quoteFor(userId,cabinetId,batterySn);
 return {cabinetId,deviceCode:q.cabinet.deviceCode,name:q.cabinet.name,batterySoc:q.batterySoc,categoryId:q.categoryId,priceKobo:q.priceKobo};
}

export async function checkoutSwap(userId:string,cabinetId:string,batterySn:string,requestKey:string){
 if(process.env.SWAP_PAYMENTS_ENABLED!=='true'||!isMonoProductConfigured('payments'))throw new Error('Swap payments are not enabled');
 if(process.env.YUNKU_OPERATIONS_ENABLED!=='true')throw new Error('Swap cabinet operations are not enabled');
 const origin=process.env.SWAP_PUBLIC_URL;if(!origin?.startsWith('https://'))throw new Error('Swap payment return URL is not configured');
 const [user,cabinet]=await Promise.all([prisma.user.findUnique({where:{id:userId}}),prisma.swapCabinet.findUnique({where:{id:cabinetId}})]);
 if(!user?.phone||!user.email)throw new Error('A verified rider profile with phone and email is required');
 const phone=user.phone;
 const quote=await quoteFor(userId,cabinetId,batterySn);
 const synced=await yunku('getSyncUserStatus',{openId:userId,phone:user.phone});
 if(Number(synced.data?.status)!==1)throw new Error('Your swap account needs activation by support');
 const claim=await prisma.$transaction(async tx=>{
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`swap:${userId}`}))`;
  const existing=await tx.swapPurchase.findUnique({where:{userId_requestKey:{userId,requestKey}}});if(existing)return {order:existing,created:false};
  const active=await tx.swapPurchase.findFirst({where:{userId,status:{in:['awaiting_payment','dispatching','pending','unknown','attention_required']}}});
  if(active)throw new Error('Finish or reconcile your existing swap before paying for another');
  const order=await tx.swapPurchase.create({data:{userId,cabinetId,requestKey,amountKobo:quote.priceKobo,batterySoc:quote.batterySoc,categoryId:quote.categoryId,batterySn,phone}});
  return {order,created:true};
 });
 const {order}=claim;if(!claim.created)return order;
 try{
  const payment=await initiateMonoPayment({amount:order.amountKobo/100,type:'onetime-debit',reference:order.id,description:`DandoEv battery swap at ${quote.cabinet.name}`,customer:{name:`${user.firstName} ${user.lastName}`,email:user.email},redirect_url:`${origin.replace(/\/$/,'')}/swap-payment-return`});
  if(!payment.payment_link.startsWith('https://'))throw new Error('Invalid Mono checkout URL');
  return await prisma.swapPurchase.update({where:{id:order.id},data:{paymentUrl:payment.payment_link,paymentStatus:'pending'}});
 }catch{await prisma.swapPurchase.update({where:{id:order.id},data:{paymentStatus:'unknown'}});throw new Error('Payment initialization needs reconciliation; do not start a second payment');}
}

export async function paySwapFromWallet(userId:string,cabinetId:string,batterySn:string,requestKey:string){
 if(process.env.YUNKU_OPERATIONS_ENABLED!=='true')throw new Error('Swap cabinet operations are not enabled');
 const quote=await quoteFor(userId,cabinetId,batterySn);
  const synced=await yunku('getSyncUserStatus',{openId:userId,phone:quote.user.phone!});
 if(Number(synced.data?.status)!==1)throw new Error('Your swap account needs activation by support');
 const amount=quote.priceKobo/100;
 return prisma.$transaction(async tx=>{
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`swap:${userId}`}))`;
  const existing=await tx.swapPurchase.findUnique({where:{userId_requestKey:{userId,requestKey}}});if(existing)return existing;
  const active=await tx.swapPurchase.findFirst({where:{userId,status:{in:['awaiting_payment','dispatching','pending','unknown','attention_required']}}});
  if(active)throw new Error('Finish or reconcile your existing swap before paying for another');
  const wallet=await tx.wallet.findUnique({where:{userId}});
  if(!wallet)throw new Error('Fund your wallet before paying for a swap');
  const debited=await tx.wallet.updateMany({where:{id:wallet.id,mainBalance:{gte:amount}},data:{mainBalance:{decrement:amount}}});
  if(!debited.count)throw new Error('Insufficient wallet balance for this swap');
  const order=await tx.swapPurchase.create({data:{userId,cabinetId,requestKey,amountKobo:quote.priceKobo,batterySoc:quote.batterySoc,categoryId:quote.categoryId!,batterySn,phone:quote.user.phone!,paymentStatus:'paid',paymentMethod:'wallet'}});
  await postLedgerEntries(tx,[{account:`wallet_main:${userId}`,debit:amount,credit:0,reference:order.id,details:'Battery swap paid from wallet'},{account:'swap_revenue',debit:0,credit:amount,reference:order.id,details:'Battery swap wallet payment'}]);
  return order;
 });
}

export async function verifySwapPayment(id:string){
 const order=await prisma.swapPurchase.findUniqueOrThrow({where:{id}});
 if(order.paymentStatus==='paid')return order;
 if(!isMonoProductConfigured('payments'))throw new Error('Mono payments are not configured');
 const result=await verifyMonoPayment(order.id);
 if(result.reference!==order.id)throw new Error('Payment reference mismatch');
 if(result.status==='successful'&&(result.currency!=='NGN'||Math.round(result.amount*100)!==order.amountKobo))throw new Error('Payment amount or currency mismatch');
 await prisma.swapPurchase.updateMany({where:{id,paymentStatus:{not:'paid'}},data:{paymentStatus:result.status==='successful'?'paid':result.status}});
 return prisma.swapPurchase.findUniqueOrThrow({where:{id}});
}

export async function executeSwap(id:string){
 if(process.env.YUNKU_OPERATIONS_ENABLED!=='true')throw new Error('Cabinet operations are disabled');
 const order=await prisma.swapPurchase.findUniqueOrThrow({where:{id},include:{cabinet:true}});
 if(order.paymentStatus!=='paid')throw new Error('Payment must be verified first');
 if(order.status!=='awaiting_payment')return order;
 const origin=process.env.SWAP_PUBLIC_URL,callbackSecret=process.env.SWAP_CALLBACK_SECRET;
 if(!origin?.startsWith('https://')||!callbackSecret||callbackSecret.length<32)throw new Error('Swap callback connection is not configured');
 const callbackToken=createHmac('sha256',callbackSecret).update(order.id).digest('hex');
 const notify=`${origin.replace(/\/$/,'')}/api/swap/yunku/callback/${order.id}?token=${callbackToken}`;
 if(!order.cabinet.enabled)throw new Error('Station is unavailable; contact support about this payment');
 const claim=await prisma.swapPurchase.updateMany({where:{id,status:'awaiting_payment',paymentStatus:'paid'},data:{status:'dispatching'}});if(!claim.count)throw new Error('Swap is already being processed');
 try{const response=await yunku('changeBattery',{openId:order.userId,phone:order.phone,deviceCode:order.cabinet.deviceCode,batterySn:order.batterySn,categoryId:order.categoryId,notifyUrl:notify});const result=response.data??response;if(!result.recordId)throw new Error('Missing swap record ID');return await prisma.swapPurchase.update({where:{id},data:{recordId:String(result.recordId),status:'pending',result}});}catch{await prisma.swapPurchase.update({where:{id},data:{status:'unknown'}});throw new Error('Cabinet result is uncertain. Do not repeat the request; contact support.');}
}

export async function reconcileSwap(id:string){
 let order=await prisma.swapPurchase.findUniqueOrThrow({where:{id}});
 if(!order.recordId&&order.status==='unknown'){
  const format=(date:Date)=>{const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Lagos',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(date);const value=(type:string)=>parts.find(part=>part.type===type)?.value||'';return `${value('year')}-${value('month')}-${value('day')} ${value('hour')}:${value('minute')}:${value('second')}`;};
  const response=await yunku('changeBatteryRecordList',{openId:order.userId,phone:order.phone,batterySn:order.batterySn,beginTime:format(new Date(order.createdAt.getTime()-300000)),endTime:format(new Date(Date.now()+60000)),pageNum:1,pageSize:20});
  const cabinet=await prisma.swapCabinet.findUniqueOrThrow({where:{id:order.cabinetId},select:{deviceCode:true}});
  const matches=providerRows(response).filter(result=>Number(result.type)===2&&String(result.openId)===order.userId&&String(result.phone)===order.phone&&String(result.emptyBattery)===order.batterySn&&String(result.emptyDeviceCode)===cabinet.deviceCode&&Number(result.categoryId)===order.categoryId);
  if(matches.length!==1)return order;
  const recordId=String(matches[0].id||'');if(!recordId)throw new Error('Recovered swap record has no ID');
  order=await prisma.swapPurchase.update({where:{id},data:{recordId}});
 }
 if(!order.recordId)return order;
 const response=await yunku('getChangeBatteryRecord',{id:order.recordId}),result=response.data??response;
 if(String(result.id)!==order.recordId)throw new Error('Swap record mismatch');
 if(Number(result.type)!==2||result.emptyDeviceCode==null)throw new Error('Unexpected swap record');
 const cabinet=await prisma.swapCabinet.findUniqueOrThrow({where:{id:order.cabinetId}});
 if(result.emptyDeviceCode!==cabinet.deviceCode||result.emptyBattery!==order.batterySn)throw new Error('Swap battery or cabinet mismatch');
 return prisma.swapPurchase.update({where:{id},data:{status:swapOutcome(Number(result.finishResult)),result}});
}

export async function refundFailedWalletSwap(id:string,adminId:string){
 return prisma.$transaction(async tx=>{
  const order=await tx.swapPurchase.findUniqueOrThrow({where:{id}});
  if(order.paymentMethod!=='wallet'||order.paymentStatus!=='paid'||order.status!=='failed'||!order.recordId)throw new Error('Only a confirmed failed wallet swap can be refunded');
  const claimed=await tx.swapPurchase.updateMany({where:{id,paymentMethod:'wallet',paymentStatus:'paid',status:'failed',recordId:{not:null}},data:{paymentStatus:'refunded'}});
  if(!claimed.count)throw new Error('This swap has already been refunded or changed');
  const amount=order.amountKobo/100;
  await tx.wallet.update({where:{userId:order.userId},data:{mainBalance:{increment:amount}}});
  await postLedgerEntries(tx,[{account:'swap_revenue',debit:amount,credit:0,reference:`refund:${id}`,details:'Failed battery swap refund'},{account:`wallet_main:${order.userId}`,debit:0,credit:amount,reference:`refund:${id}`,details:'Failed battery swap refund'}]);
  await tx.auditLog.create({data:{userId:adminId,action:'swap.wallet.refund',resource:'swap_purchase',resourceId:id,details:JSON.stringify({amountKobo:order.amountKobo,recordId:order.recordId})}});
  return tx.swapPurchase.findUniqueOrThrow({where:{id}});
 });
}
