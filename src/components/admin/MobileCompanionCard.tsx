'use client';

import React from 'react';
import { Smartphone, QrCode, CheckCircle2, ArrowRight, Shield, Zap } from 'lucide-react';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { APP_NAME } from '@/lib/constants';

interface MobileCompanionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function MobileCompanionModal({ open, onOpenChange }: MobileCompanionModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <div className="flex items-center gap-2 text-teal-600 mb-1">
          <Smartphone className="h-5 w-5" />
          <span className="text-xs font-bold uppercase tracking-wider">Buyer-Facing Platform</span>
        </div>
        <DialogTitle>{APP_NAME} Rider Mobile App Ecosystem</DialogTitle>
        <DialogDescription>
          In production, buyers and riders access the financing portal exclusively through the mobile app. The web platform is strictly reserved for administrators, underwriting teams, and fleet operations.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 my-2 text-xs text-slate-600">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2">
          <div className="font-semibold text-slate-900 flex items-center gap-1.5 text-sm">
            <Zap className="h-4 w-4 text-teal-600" />
            <span>Buyer Journeys on Mobile:</span>
          </div>
          <ul className="space-y-1.5 pl-2 text-slate-600">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
              <span><strong>E-Bike Marketplace:</strong> Browse specs, dual-battery range, and daily EMI options.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
              <span><strong>3-Min BNPL Checkout:</strong> Instant Mono Open Banking statement analysis and BVN match.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
              <span><strong>Save-As-You-Ride Escrow:</strong> ₦1,000/day compulsory locked micro-savings balance.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
              <span><strong>QR Payment & Battery Swaps:</strong> Paystack bi-daily repayments and swap station access.</span>
            </li>
          </ul>
        </div>

        <div className="rounded-xl border border-teal-100 bg-teal-50/60 p-3 flex items-center justify-between">
          <div>
            <p className="font-semibold text-teal-950">Mobile Codebase Status</p>
            <p className="text-[11px] text-teal-800">Located in <code className="font-mono bg-white px-1 py-0.5 rounded border border-teal-200">ebike-mobile/</code> directory (React Native Expo).</p>
          </div>
          <Badge variant="accent" className="text-xs">Ready for Testing</Badge>
        </div>
      </div>

      <DialogFooter>
        <Button variant="default" onClick={() => onOpenChange(false)}>
          Got it, Return to Admin Console
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
