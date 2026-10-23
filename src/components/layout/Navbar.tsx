'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { APP_NAME } from '@/lib/constants';
import {
  Bike,
  Zap,
  ShieldCheck,
  UserCircle,
  LayoutDashboard,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';

interface NavbarProps {
  backHref?: string;
  backLabel?: string;
  rightSlot?: React.ReactNode;
}

export default function Navbar({ backHref, backLabel, rightSlot }: NavbarProps) {
  const pathname = usePathname();

  const navLinks = [
    { href: '/bikes', label: 'Marketplace' },
    { href: '/accessories', label: 'Accessories' },
    { href: '/checkout/bnpl', label: '3-Min BNPL' },
    { href: '/dashboard', label: 'Rider Portal' },
  ];

  return (
    <header className="bg-white/95 backdrop-blur-md sticky top-0 z-50 border-b border-slate-200/80 shadow-xs">
      <nav className="flex justify-between items-center w-full px-4 sm:px-6 py-3.5 max-w-7xl mx-auto">
        <div className="flex items-center gap-4 sm:gap-8">
          {backHref && (
            <Link
              href={backHref}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-primary transition-colors pr-2 border-r border-slate-200"
            >
              <ArrowLeft className="w-4 h-4" />
              {backLabel && <span className="hidden sm:inline">{backLabel}</span>}
            </Link>
          )}

          <Link href="/" className="flex items-center gap-2.5 group">
            <img src="/logo.png" alt={APP_NAME} className="h-9 sm:h-10 w-auto" />
          </Link>

          <div className="hidden md:flex gap-1 items-center">
            {navLinks.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== '/' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition-all ${
                    isActive
                      ? 'text-primary bg-slate-100/90 shadow-2xs'
                      : 'text-slate-600 hover:text-primary hover:bg-slate-50'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-2.5 sm:gap-3">
          {rightSlot}
          <Link
            href="/checkout/bnpl"
            className="hidden lg:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-50 text-secondary border border-teal-200 text-xs font-bold hover:bg-teal-100 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Check Eligibility</span>
          </Link>
          <Link
            href="/admin"
            className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary-light transition-colors shadow-xs"
          >
            <Zap className="w-3.5 h-3.5 text-accent" />
            <span>Admin Console</span>
          </Link>
          <Link
            href="/auth/signin"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:border-primary/30 hover:bg-slate-50 transition-colors text-xs font-bold text-slate-700"
            title="Sign In"
          >
            <UserCircle className="w-5 h-5 text-primary" />
            <span className="hidden sm:inline">Sign In</span>
          </Link>
        </div>
      </nav>
    </header>
  );
}
