import {createHash} from 'node:crypto';
import prisma from '@/lib/prisma';

type Fields=Record<string,string|number>;
export function yunkuSignature(fields:Fields,appId:string,apiKey:string,timeStamp:string){
 const params=Object.keys(fields).sort().map(key=>`${key}=${fields[key]}`).join('&');
 return createHash('md5').update(`appId=${appId}&apiKey=${apiKey}&timeStamp=${timeStamp}&${params}`,'utf8').digest('base64');
}
export async function yunku(method:string,fields:Fields){
 const base=process.env.YUNKU_API_URL,appId=process.env.YUNKU_APP_ID,apiKey=process.env.YUNKU_API_KEY;
 if(!base?.startsWith('https://')||!appId||!apiKey)throw new Error('Yunku connection is not configured');
 if(method==='deviceSelectList'){
  await prisma.swapProviderGate.upsert({where:{id:'status'},create:{id:'status',availableAt:new Date(0)},update:{}});
  const claim=await prisma.swapProviderGate.updateMany({where:{id:'status',availableAt:{lte:new Date()}},data:{availableAt:new Date(Date.now()+1100)}});
  if(!claim.count)throw new Error('Cabinet status refresh is busy. Try again shortly.');
 }
 const timeStamp=String(Math.floor(Date.now()/1000)),form=new FormData();
 for(const [key,value] of Object.entries(fields))form.append(key,String(value));
 const response=await fetch(`${base.replace(/\/$/,'')}/v1/serviceApi/${method}`,{method:'POST',headers:{appId,timeStamp,sign:yunkuSignature(fields,appId,apiKey,timeStamp)},body:form,signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw new Error(`Yunku request failed (${response.status})`);
 const result=await response.json();if(String(result.code)!=='200')throw new Error(`Yunku rejected request (code ${String(result.code)})`);
 return result;
}
export function providerRows(response:Record<string,any>):Record<string,any>[] {
 const rows=Array.isArray(response.data)?response.data:response.data?.list??response.data?.records??response.list??response.rows;
 if(!Array.isArray(rows))throw new Error('Unrecognized Yunku list response; confirm vendor response format');
 return rows;
}
export function swapOutcome(code:number){
 if(code===26||code===28)return 'completed';
 if(code===25||code===27)return 'attention_required';
 if([20,21,22,23,24,29].includes(code))return 'failed';
 return 'pending';
}
