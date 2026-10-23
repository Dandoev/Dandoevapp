'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Search,
  Bell,
  ChevronDown,
  Check,
  LogOut,
  ExternalLink,
  X,
  FileText,
  Bike,
  User,
  Menu,
  Smartphone,
} from 'lucide-react';
import { formatNaira } from '@/lib/utils';

interface AdminHeaderProps {
  currentRole: string;
  onRoleChange: (role: string) => void;
  onOpenMobileInfo: () => void;
  onOpenMobileMenu?: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  pendingApplicationsCount: number;
  loans?: any[];
  bikes?: any[];
  onSelectLoanResult?: (loan: any) => void;
  onNavigateTab?: (tab: any) => void;
}

export default function AdminHeader({
  currentRole,
  onRoleChange,
  onOpenMobileInfo,
  onOpenMobileMenu,
  searchQuery,
  onSearchChange,
  pendingApplicationsCount,
  loans = [],
  bikes = [],
  onSelectLoanResult,
  onNavigateTab,
}: AdminHeaderProps) {
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [formattedDate, setFormattedDate] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    };
    const timer = window.setTimeout(() => setFormattedDate(now.toLocaleDateString('en-US', options)), 0);
    return () => window.clearTimeout(timer);
  }, []);

  // Wire up Cmd+K / Ctrl+K shortcut for Global Search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        setSearchFocused(true);
      } else if (e.key === 'Escape') {
        setSearchFocused(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const roles = [
    { id: 'super_admin', label: 'Super Admin', desc: 'Full system control & user permissions' },
    { id: 'credit_underwriter', label: 'Credit Underwriter', desc: 'BNPL approval & Open Banking review' },
    { id: 'fleet_manager', label: 'Fleet Operations', desc: 'Bike allocation & battery health' },
    { id: 'collections_agent', label: 'Collections Officer', desc: 'Repayments & delinquency recovery' },
  ];

  const activeRoleObj = roles.find((r) => r.id === currentRole) || roles[0];

  const handleLogout = () => {
    document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    document.cookie = 'sb-access-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    try {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    } catch {}
    window.location.href = '/auth/signin';
  };

  const q = searchQuery.trim().toLowerCase();
  const matchedLoans = q
    ? loans
        .filter(
          (l) =>
            l.id?.toLowerCase().includes(q) ||
            l.user?.name?.toLowerCase().includes(q) ||
            l.user?.email?.toLowerCase().includes(q) ||
            l.bike?.name?.toLowerCase().includes(q)
        )
        .slice(0, 4)
    : [];

  const matchedBikes = q
    ? bikes
        .filter(
          (b) =>
            b.name?.toLowerCase().includes(q) ||
            b.category?.toLowerCase().includes(q) ||
            b.brand?.toLowerCase().includes(q)
        )
        .slice(0, 3)
    : [];

  return (
    <header className="sticky top-0 z-30 flex w-full items-center justify-between h-20 px-4 sm:px-6 lg:px-8 bg-white border-b border-slate-200/80">
      {/* Left: Mobile Menu Button + Greeting & Date */}
      <div className="flex items-center gap-3 text-slate-800">
        {onOpenMobileMenu && (
          <button
            onClick={onOpenMobileMenu}
            className="lg:hidden p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700"
            aria-label="Open Navigation Menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base sm:text-lg font-extrabold text-[#021064] tracking-tight">
              {activeRoleObj.label} Console
            </h1>
            <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded-full bg-teal-50 border border-teal-200 text-[#006b5b] text-[10px] font-extrabold uppercase">
              CBN &amp; NDPR Live
            </span>
          </div>
          <div className="hidden sm:flex items-center text-slate-400 text-xs gap-1.5 font-medium">
            <span>{activeRoleObj.desc}</span>
            <span>·</span>
            <span>{formattedDate}</span>
          </div>
        </div>
      </div>

      {/* Right Actions: Mobile App Companion + Quick Marketplace Link + Notification Bell + Cmd+K Search + Role Switcher */}
      <div className="flex items-center gap-2.5 sm:gap-3.5">
        <button
          onClick={onOpenMobileInfo}
          className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 border border-teal-200 text-xs font-bold text-[#006b5b] transition-colors cursor-pointer"
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>Mobile App Sync</span>
        </button>

        <Link
          href="/bikes"
          className="hidden xl:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 transition-colors"
        >
          <span>Rider Storefront</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </Link>

        {/* Notification Bell with Ping Dot */}
        <button
          onClick={() => onNavigateTab?.('applications')}
          title={`${pendingApplicationsCount} pending applications`}
          className="relative flex items-center justify-center w-10 h-10 rounded-full text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <Bell className="h-5 w-5 text-slate-600" />
          {pendingApplicationsCount > 0 && (
            <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center ring-2 ring-white">
              {pendingApplicationsCount}
            </span>
          )}
        </button>

        {/* Global Search Input with Cmd+K Quick Results Dropdown */}
        <div className="relative hidden md:block">
          <div className="relative flex items-center">
            <Search className="absolute left-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search loans, riders, bikes..."
              value={searchQuery}
              onFocus={() => setSearchFocused(true)}
              onChange={(e) => {
                onSearchChange(e.target.value);
                setSearchFocused(true);
              }}
              className="w-64 lg:w-80 h-10 pl-9 pr-14 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#29A174]/20 focus:border-[#29A174] focus:bg-white transition-all"
            />
            {searchQuery ? (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-3 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : (
              <kbd className="absolute right-2.5 px-1.5 py-0.5 text-[10px] font-bold text-slate-400 bg-white border border-slate-200 rounded-md pointer-events-none">
                ⌘K
              </kbd>
            )}
          </div>

          {searchFocused && q.length > 0 && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setSearchFocused(false)} />
              <div className="absolute right-0 mt-2 w-96 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 p-3 space-y-3">
                {matchedLoans.length === 0 && matchedBikes.length === 0 ? (
                  <div className="text-center py-6 text-xs text-slate-400">
                    No matching loans, riders, or e-bikes for &ldquo;{searchQuery}&rdquo;
                  </div>
                ) : (
                  <>
                    {matchedLoans.length > 0 && (
                      <div>
                        <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 px-2 mb-1">
                          Loan Applications & Borrowers
                        </div>
                        <div className="space-y-1">
                          {matchedLoans.map((loan) => (
                            <button
                              key={loan.id}
                              onClick={() => {
                                setSearchFocused(false);
                                onSelectLoanResult?.(loan);
                              }}
                              className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 text-left text-xs transition-colors"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <FileText className="w-4 h-4 text-[#29A174] shrink-0" />
                                <div className="truncate">
                                  <div className="font-bold text-slate-900 truncate">
                                    {loan.user?.name || 'Borrower'} · {loan.bike?.name || 'E-Bike'}
                                  </div>
                                  <div className="text-[10px] text-slate-500 font-mono">
                                    #{loan.id?.slice(0, 8)} · {loan.status}
                                  </div>
                                </div>
                              </div>
                              <span className="font-bold text-slate-800 tabular-nums shrink-0 ml-2">
                                {formatNaira(loan.totalRepayable || loan.loanAmount || 0)}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {matchedBikes.length > 0 && (
                      <div>
                        <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 px-2 mb-1">
                          Fleet Inventory
                        </div>
                        <div className="space-y-1">
                          {matchedBikes.map((b) => (
                            <button
                              key={b.id}
                              onClick={() => {
                                setSearchFocused(false);
                                onNavigateTab?.('bikes');
                              }}
                              className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 text-left text-xs transition-colors"
                            >
                              <div className="flex items-center gap-2.5">
                                <Bike className="w-4 h-4 text-primary shrink-0" />
                                <div>
                                  <div className="font-bold text-slate-900">{b.name}</div>
                                  <div className="text-[10px] text-slate-500">{b.category}</div>
                                </div>
                              </div>
                              <span className="font-bold text-slate-800 tabular-nums">
                                {formatNaira(b.price)}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </>
          )}
        </div>

        {/* Role Selector Badge / Dropdown */}
        <div className="relative">
          <button
            onClick={() => setRoleMenuOpen(!roleMenuOpen)}
            className="flex items-center gap-2 h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors text-xs font-semibold text-slate-700 cursor-pointer"
          >
            <div className="h-2 w-2 rounded-full bg-[#29A174]" />
            <span className="hidden sm:inline">{activeRoleObj.label}</span>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
          </button>

          {roleMenuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setRoleMenuOpen(false)} />
              <div className="absolute right-0 mt-2 w-64 p-2 bg-white border border-slate-200 rounded-2xl shadow-xl z-50">
                <div className="px-3 py-2 border-b border-slate-100 mb-1">
                  <p className="text-xs font-bold text-slate-900">Switch Operational Role</p>
                  <p className="text-[11px] text-slate-500">Role-Based Access Control</p>
                </div>
                <div className="space-y-1">
                  {roles.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => {
                        onRoleChange(r.id);
                        setRoleMenuOpen(false);
                      }}
                      className={`w-full flex items-start justify-between rounded-xl p-2 text-left text-xs transition-colors cursor-pointer ${
                        currentRole === r.id
                          ? 'bg-[#29A174]/10 text-[#29A174] font-semibold'
                          : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div>
                        <div className="font-semibold">{r.label}</div>
                        <div className="text-[10px] text-slate-500 font-normal">{r.desc}</div>
                      </div>
                      {currentRole === r.id && (
                        <Check className="h-4 w-4 text-[#29A174] shrink-0 mt-0.5" />
                      )}
                    </button>
                  ))}
                </div>

                <div className="border-t border-slate-100 mt-2 pt-1">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 rounded-xl p-2 text-left text-xs text-red-600 hover:bg-red-50 transition-colors cursor-pointer font-semibold"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
