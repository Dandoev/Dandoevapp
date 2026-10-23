'use client';

import React, { useState } from 'react';
import {
  Bike,
  Plus,
  BatteryCharging,
  Zap,
  CheckCircle2,
  AlertCircle,
  Edit2,
  Trash2,
  Search,
  Filter,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { formatNaira, capitalize, getStatusColor } from '@/lib/utils';

interface FleetTabProps {
  bikes: any[];
  loadingBikes: boolean;
  onOpenAddModal: () => void;
  onOpenEditModal: (bike: any) => void;
  onDeleteBike: (id: string) => void;
}

export default function FleetTab({
  bikes,
  loadingBikes,
  onOpenAddModal,
  onOpenEditModal,
  onDeleteBike,
}: FleetTabProps) {
  const [filter, setFilter] = useState<'all' | 'in_stock' | 'out_of_stock'>('all');
  const [search, setSearch] = useState('');

  const filteredBikes = bikes.filter((b) => {
    if (filter === 'in_stock' && b.stockQuantity <= 0) return false;
    if (filter === 'out_of_stock' && b.stockQuantity > 0) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        b.name?.toLowerCase().includes(q) ||
        b.brand?.toLowerCase().includes(q) ||
        b.model?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalUnits = bikes.reduce((acc, b) => acc + (b.stockQuantity || 0), 0);
  const totalFinancedUnits = bikes.filter(b => b.availability === 'out_of_stock' || !b.stockQuantity).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Fleet Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Fleet Stock</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{totalUnits} units</h3>
            </div>
            <div className="rounded-lg p-2.5 bg-indigo-50 text-[#021064]">
              <Bike className="h-5 w-5" />
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-2">Available across Lagos &amp; Abuja fulfillment hubs</p>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Swappable Battery Packs</p>
              <h3 className="text-2xl font-bold text-teal-700 mt-1">{totalUnits * 2} Packs</h3>
            </div>
            <div className="rounded-lg p-2.5 bg-teal-50 text-teal-700">
              <BatteryCharging className="h-5 w-5" />
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-2">Dual 48V/60V fast-swapping Li-ion standard</p>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">BNPL Active Allocation</p>
              <h3 className="text-2xl font-bold text-emerald-700 mt-1">94%</h3>
            </div>
            <div className="rounded-lg p-2.5 bg-emerald-50 text-emerald-700">
              <Zap className="h-5 w-5" />
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-2">Fleet utilization on active delivery financing</p>
        </Card>
      </div>

      {/* Action & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {['all', 'in_stock', 'out_of_stock'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f as any)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition-all cursor-pointer ${
                filter === f
                  ? 'bg-[#021064] text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {f.replace(/_/g, ' ')}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search bike brand/model..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-[#021064] focus:outline-none"
            />
          </div>

          <Button
            size="sm"
            variant="primary"
            onClick={onOpenAddModal}
            className="text-xs font-semibold whitespace-nowrap gap-1.5"
          >
            <Plus className="h-4 w-4" />
            <span>Add New E-Bike</span>
          </Button>
        </div>
      </div>

      {/* Fleet Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>E-Bike &amp; Specs</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Cash Price</TableHead>
                <TableHead>Stock Level</TableHead>
                <TableHead>Battery System</TableHead>
                <TableHead>BNPL Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingBikes ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-slate-400">
                    Loading fleet inventory...
                  </TableCell>
                </TableRow>
              ) : filteredBikes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-slate-400">
                    No e-bikes found matching criteria.
                  </TableCell>
                </TableRow>
              ) : (
                filteredBikes.map((bike) => (
                  <TableRow key={bike.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center text-[#021064]">
                          <Bike className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-900">{bike.name}</div>
                          <div className="text-xs text-slate-500 font-medium">
                            {bike.brand} {bike.model}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs font-medium text-slate-600">
                      {bike.category || 'Commercial Delivery'}
                    </TableCell>
                    <TableCell className="font-bold text-slate-900">
                      {formatNaira(bike.price)}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                          bike.stockQuantity > 5
                            ? 'bg-emerald-50 text-emerald-800'
                            : bike.stockQuantity > 0
                            ? 'bg-amber-50 text-amber-800'
                            : 'bg-red-50 text-red-800'
                        }`}
                      >
                        {bike.stockQuantity} in stock
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-xs text-teal-800 font-medium">
                        <BatteryCharging className="h-3.5 w-3.5 text-teal-600" />
                        <span>Dual Swappable (60V)</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {bike.bnplEligible ? (
                        <Badge variant="success" className="text-[10px]">BNPL Eligible</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px]">Outright Only</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onOpenEditModal(bike)}
                          className="h-8 px-2 text-xs font-semibold text-slate-700 hover:text-slate-900"
                        >
                          <Edit2 className="h-3.5 w-3.5 mr-1" />
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDeleteBike(bike.id)}
                          className="h-8 px-2 text-xs font-semibold text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
