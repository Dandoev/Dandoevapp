'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import { formatNaira } from '@/lib/utils';
import { readCart, removeFromCart, type CartItem } from '@/lib/cart';

export default function CartPage() {
  const [items, setItems] = useState<CartItem[]>([]);
  useEffect(() => {
    const sync = () => setItems(readCart());
    sync();
    window.addEventListener('dandoev-cart-updated', sync);
    return () => window.removeEventListener('dandoev-cart-updated', sync);
  }, []);
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartParam = encodeURIComponent(JSON.stringify(items.map(({ bikeId, quantity }) => ({ bikeId, quantity }))));

  return <div className="min-h-screen bg-background text-on-surface pb-20"><Navbar backHref="/bikes" backLabel="Shop" /><main className="mx-auto max-w-4xl px-5 py-10"><div className="mb-8"><p className="text-xs font-bold uppercase tracking-widest text-secondary">Your selection</p><h1 className="mt-2 text-3xl font-black text-primary">Shopping cart</h1><p className="mt-2 text-sm text-slate-500">Review multiple e-bikes before starting one secure outright checkout.</p></div>{!items.length ? <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center"><h2 className="text-xl font-bold text-primary">Your cart is empty</h2><Link href="/bikes" className="mt-5 inline-flex rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white">Browse e-bikes</Link></div> : <><div className="space-y-3">{items.map((item) => <div key={item.bikeId} className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4"><img src={item.image || '/bikes/DandoEV_X6.jpg'} alt="" className="h-20 w-24 object-contain" /><div className="min-w-0 flex-1"><h2 className="font-bold text-primary">{item.name}</h2><p className="text-sm text-slate-500">Quantity: {item.quantity}</p></div><div className="text-right"><p className="font-black text-primary">{formatNaira(item.price * item.quantity)}</p><button type="button" onClick={() => setItems(removeFromCart(item.bikeId))} className="mt-2 text-xs font-bold text-rose-600">Remove</button></div></div>)}</div><div className="mt-6 flex flex-col items-start justify-between gap-4 rounded-2xl bg-primary p-5 text-white sm:flex-row sm:items-center"><div><p className="text-xs uppercase tracking-wider text-white/70">Product subtotal</p><p className="text-2xl font-black">{formatNaira(total)}</p></div><Link href={`/checkout?cart=${cartParam}`} className="rounded-xl bg-accent px-5 py-3 text-sm font-black text-primary-dark">Checkout all items →</Link></div></>}</main></div>;
}
