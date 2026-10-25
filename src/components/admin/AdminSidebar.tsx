'use client';

import React from 'react';
import Link from 'next/link';
import {
  LayoutGrid,
  Wallet,
  ArrowLeftRight,
  ShieldAlert,
  Target,
  Bike,
  Users,
  Settings,
  ShieldCheck,
  LogOut,
  Activity,
  X,
} from 'lucide-react';

export type AdminTab =
  | 'overview'
  | 'applications'
  | 'bikes'
  | 'payments'
  | 'defaults'
  | 'reconciliation'
  | 'compliance'
  | 'users'
  | 'activity'
  | 'settings';

interface AdminSidebarProps {
  activeTab: AdminTab;
  onSelectTab: (tab: AdminTab) => void;
  pendingCount: number;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  userRole?: string;
  userProfile?: { firstName?: string; lastName?: string; email?: string } | null;
}

interface MenuItem {
  id: AdminTab;
  label: string;
  icon: any;
  badge?: number;
  badgeTone?: 'amber' | 'rose' | 'teal';
  isSuperAdminOnly?: boolean;
  section: 'operations' | 'finance' | 'governance';
}

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin', finance_admin: 'Finance Admin', compliance_officer: 'Compliance Officer',
  operations_admin: 'Operations Admin', credit_underwriter: 'Credit Underwriter',
  fleet_manager: 'Fleet Manager', collections_agent: 'Collections Agent',
};

export default function AdminSidebar({
  activeTab,
  onSelectTab,
  pendingCount,
  isOpenMobile,
  onCloseMobile,
  userRole = 'super_admin',
  userProfile,
}: AdminSidebarProps) {
  const isSuperAdmin = userRole === 'super_admin';
  const fullName = `${userProfile?.firstName || ''} ${userProfile?.lastName || ''}`.trim() || userProfile?.email || 'Administrator';
  const initials = `${userProfile?.firstName?.[0] || ''}${userProfile?.lastName?.[0] || ''}` || 'AD';

  const menuItems: MenuItem[] = [
    // Core Operations
    {
      id: 'overview',
      label: 'Executive Overview',
      icon: LayoutGrid,
      section: 'operations',
    },
    {
      id: 'applications',
      label: 'Underwriting Queue',
      icon: Target,
      badge: pendingCount,
      badgeTone: 'amber',
      section: 'operations',
    },
    {
      id: 'bikes',
      label: 'Fleet & Battery Stock',
      icon: Bike,
      section: 'operations',
    },
    // Financials & Risk
    {
      id: 'payments',
      label: 'Repayments & Escrow',
      icon: Wallet,
      section: 'finance',
    },
    {
      id: 'defaults',
      label: 'Delinquency & Recovery',
      icon: ShieldAlert,
      section: 'finance',
    },
    {
      id: 'reconciliation',
      label: 'Gateway Reconciliation',
      icon: ArrowLeftRight,
      section: 'finance',
    },
    // Governance & System
    {
      id: 'compliance',
      label: 'KYC & NDPR Compliance',
      icon: ShieldCheck,
      section: 'governance',
    },
    {
      id: 'activity',
      label: 'Security Audit Trail',
      icon: Activity,
      section: 'governance',
    },
    {
      id: 'users',
      label: 'Staff & RBAC',
      icon: Users,
      isSuperAdminOnly: true,
      section: 'governance',
    },
    {
      id: 'settings',
      label: 'System Parameters',
      icon: Settings,
      section: 'governance',
    },
  ];

  const sections = [
    { key: 'operations', title: 'Core Operations' },
    { key: 'finance', title: 'Portfolio & Risk' },
    { key: 'governance', title: 'Governance & Audit' },
  ] as const;

  const handleLogout = () => {
    document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    document.cookie = 'sb-access-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    try {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    } catch {}
    window.location.href = '/login';
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Admin navigation follows the mobile brand's navy and cyan palette. */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col justify-between w-[260px] shrink-0 bg-[#0A1B46] text-[#C8E4F5] transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 border-r border-[#55C5F3]/15 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Brand Logo Header */}
          <div className="flex items-center justify-between h-24 px-5 border-b border-white/10">
            <Link href="/admin" className="flex items-center gap-2.5">
              <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center shadow-md p-1.5">
                <img src="/logo.png" alt="DandoEv" className="h-full w-full object-contain" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-lg font-black tracking-tight text-white font-display">DandoEv</span>
                </div>
                <span className="block text-[10px] text-[#8DC5E4] font-semibold uppercase tracking-wider">
                  Admin workspace
                </span>
              </div>
            </Link>
            <button
              onClick={onCloseMobile}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white lg:hidden cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Grouped Navigation Links */}
          <nav className="flex-1 overflow-y-auto px-3.5 py-5 space-y-5">
            {sections.map((sec) => {
              const items = menuItems.filter((m) => m.section === sec.key);
              return (
                <div key={sec.key} className="space-y-1">
                  <div className="px-3 pb-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400/80">
                    {sec.title}
                  </div>
                  {items.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    const isRestricted = item.isSuperAdminOnly && !isSuperAdmin;

                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          if (!isRestricted) {
                            onSelectTab(item.id);
                            onCloseMobile();
                          }
                        }}
                        disabled={isRestricted}
                        className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer ${
                          isActive
                            ? 'bg-[#36B9EF] text-[#071B48] shadow-md ring-1 ring-[#8EE0FF]/50'
                            : isRestricted
                            ? 'opacity-30 cursor-not-allowed text-slate-500'
                            : 'text-slate-300/85 hover:bg-white/8 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Icon
                            className={`h-4 w-4 shrink-0 ${
                              isActive ? 'text-[#071B48]' : 'text-[#8FB5D0]'
                            }`}
                          />
                          <span>{item.label}</span>
                        </div>

                        {item.badge !== undefined && item.badge > 0 && (
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                              isActive
                                ? 'bg-[#071B48] text-white'
                                : 'bg-amber-500/20 text-amber-300 border border-amber-400/30'
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </nav>
        </div>

        {/* Staff identity and sign out */}
        <div className="p-4 border-t border-white/10 space-y-3 bg-[#071638]">
          {/* Staff Profile Card */}
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/10">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-9 w-9 rounded-xl bg-[#37BCEC] border border-[#8EE0FF]/40 flex items-center justify-center text-[#071B48] text-xs font-black shrink-0">
                {initials.toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-extrabold text-white truncate">{fullName}</div>
                <div className="text-[10px] text-slate-400 truncate">{ROLE_LABELS[userRole] || 'Administrator'}</div>
              </div>
            </div>

            <button
              onClick={handleLogout}
              title="Sign Out of Admin Portal"
              className="p-2 rounded-lg text-slate-400 hover:bg-rose-500/20 hover:text-rose-300 transition-colors cursor-pointer shrink-0"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
