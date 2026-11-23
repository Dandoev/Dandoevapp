import {createHmac} from 'node:crypto';

export function normalizeOmniCard(value:unknown){return typeof value==='string'&&/^[0-9A-Fa-f]{16}$/.test(value)?value.toUpperCase():null;}
export function hashOmniCard(cardNumber:string){
 const key=process.env.OMNI_CARD_HASH_SECRET;
 if(!key||key.length<32)throw new Error('OMNI_CARD_HASH_SECRET must be configured');
 return createHmac('sha256',key).update(cardNumber).digest('hex');
}
