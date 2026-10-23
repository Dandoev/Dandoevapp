'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Bike, Wallet, User, BatteryCharging } from 'lucide-react';

export default function MobileNav() {
  const pathname = usePathname();

  // Hide on Auth pages or Admin
  if (pathname.startsWith('/auth') || pathname.startsWith('/admin')) return null;

  const navItems = [
    { href: '/', label: 'Home', icon: Home, match: (p: string) => p === '/' },
    { href: '/bikes', label: 'Bikes', icon: Bike, match: (p: string) => p.startsWith('/bikes') },
    { href: '/accessories', label: 'Add-ons', icon: BatteryCharging, match: (p: string) => p.startsWith('/accessories') },
    { href: '/checkout/bnpl', label: '3-Min BNPL', icon: Wallet, match: (p: string) => p.startsWith('/checkout/bnpl') || p.startsWith('/bnpl') },
    { href: '/dashboard', label: 'Portal', icon: User, match: (p: string) => p.startsWith('/dashboard') },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-2 py-2 pb-safe bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-[0_-4px_16px_rgba(2,16,100,0.06)]">
      {navItems.map((item) => {
        const isActive = item.match(pathname);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center justify-center transition-all duration-200 px-3 py-1.5 rounded-xl min-w-[60px] ${
              isActive
                ? 'text-primary bg-teal-50/90 ring-1 ring-teal-200/60'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
            <span className={`text-[10px] font-bold mt-0.5 ${isActive ? 'text-primary' : 'text-slate-500'}`}>
              {item.label}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
