'use client';

import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  ShieldCheck,
  Lock,
  Key,
  CheckCircle2,
  XCircle,
  MoreVertical,
  Search,
  Check,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';

interface UserItem {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  status?: string;
  permissions?: string[];
  createdAt?: string;
}

interface UsersAccessTabProps {
  initialUsers?: any[];
  currentUserRole?: string;
}

export default function UsersAccessTab({
  initialUsers = [],
  currentUserRole = 'super_admin',
}: UsersAccessTabProps) {
  const isSuperAdmin = currentUserRole === 'super_admin';

  // Seed with default staff if none provided
  const [users, setUsers] = useState<UserItem[]>([
    {
      id: 'usr-01',
      firstName: 'System',
      lastName: 'Admin',
      email: 'admin@dandoev.com',
      role: 'super_admin',
      status: 'active',
      permissions: ['loans:approve', 'loans:reject', 'bikes:manage', 'recovery:execute', 'users:manage', 'compliance:audit', 'reconciliation:settle'],
      createdAt: '2026-01-10',
    },
    {
      id: 'usr-02',
      firstName: 'Adewale',
      lastName: 'Okonkwo',
      email: 'adewale.risk@dandoev.com',
      role: 'credit_underwriter',
      status: 'active',
      permissions: ['loans:approve', 'loans:reject', 'bikes:manage'],
      createdAt: '2026-02-01',
    },
    {
      id: 'usr-03',
      firstName: 'Zainab',
      lastName: 'Aliyu',
      email: 'zainab.fleet@dandoev.com',
      role: 'fleet_manager',
      status: 'active',
      permissions: ['bikes:manage'],
      createdAt: '2026-02-14',
    },
    {
      id: 'usr-04',
      firstName: 'Emeka',
      lastName: 'Nnamdi',
      email: 'emeka.collections@dandoev.com',
      role: 'collections_agent',
      status: 'active',
      permissions: ['recovery:execute'],
      createdAt: '2026-03-01',
    },
    {
      id: 'usr-05',
      firstName: 'Folashade',
      lastName: 'Balogun',
      email: 'compliance@dandoev.com',
      role: 'compliance_officer',
      status: 'active',
      permissions: ['compliance:audit'],
      createdAt: '2026-03-10',
    },
  ]);

  const [search, setSearch] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedUserForPerms, setSelectedUserForPerms] = useState<UserItem | null>(null);

  // Form state for creating staff
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: 'credit_underwriter',
    permissions: ['loans:approve', 'loans:reject'],
  });

  const availablePermissions = [
    { id: 'loans:approve', label: 'Approve BNPL Loans', desc: 'Can allocate assets & disburse' },
    { id: 'loans:reject', label: 'Reject BNPL Loans', desc: 'Can issue adverse action notice' },
    { id: 'bikes:manage', label: 'Manage Fleet & Bikes', desc: 'Create, update, and retire e-bikes' },
    { id: 'recovery:execute', label: 'Collections Recovery', desc: 'Trigger WhatsApp nudges & debit retries' },
    { id: 'reconciliation:settle', label: 'Financial Settlement', desc: 'Match bank logs & clear discrepancies' },
    { id: 'compliance:audit', label: 'NDPR & KYC Clearance', desc: 'Review identity docs & erasure requests' },
    { id: 'users:manage', label: 'Manage Staff & Roles', desc: 'Create internal users & assign permissions' },
  ];

  const handleRolePresetChange = (role: string) => {
    let perms: string[] = [];
    if (role === 'super_admin') {
      perms = availablePermissions.map(p => p.id);
    } else if (role === 'credit_underwriter') {
      perms = ['loans:approve', 'loans:reject', 'bikes:manage'];
    } else if (role === 'fleet_manager') {
      perms = ['bikes:manage'];
    } else if (role === 'collections_agent') {
      perms = ['recovery:execute'];
    } else if (role === 'compliance_officer') {
      perms = ['compliance:audit'];
    }
    setFormData(prev => ({ ...prev, role, permissions: perms }));
  };

  const togglePermission = (permId: string) => {
    setFormData(prev => {
      const exists = prev.permissions.includes(permId);
      const updated = exists
        ? prev.permissions.filter(p => p !== permId)
        : [...prev.permissions, permId];
      return { ...prev, permissions: updated };
    });
  };

  const fetchStaff = async () => {
    try {
      const res = await fetch('/api/admin/users');
      if (res.ok) {
        const d = await res.json();
        if (Array.isArray(d.data) && d.data.length > 0) {
          setUsers(d.data);
        }
      }
    } catch {}
  };

  React.useEffect(() => {
    fetchStaff();
  }, []);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showNotice = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName || !formData.email) {
      showNotice('Please fill out first name and email.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        const d = await res.json();
        if (d.data) {
          setUsers(prev => [d.data, ...prev.filter(u => u.id !== d.data.id)]);
        }
        setIsCreateModalOpen(false);
        showNotice(`Staff account for ${formData.firstName} provisioned and saved!`);
        setFormData({
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          role: 'credit_underwriter',
          permissions: ['loans:approve', 'loans:reject'],
        });
        fetchStaff();
      } else {
        const data = await res.json().catch(() => ({}));
        showNotice(data.error || 'Staff account could not be created.');
      }
    } catch {
      showNotice('Network error. Staff account was not created.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleUserStatus = async (userId: string) => {
    const target = users.find(u => u.id === userId);
    if (!target) return;
    const nextStatus = target.status === 'active' ? 'suspended' : 'active';
    try {
      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId, status: nextStatus }),
      });
      if (!response.ok) throw new Error('Update failed');
      setUsers(users.map(u => (u.id === userId ? { ...u, status: nextStatus } : u)));
      showNotice(`${target.firstName}'s access status updated to ${nextStatus.toUpperCase()}.`);
    } catch {
      showNotice('Access status could not be updated.');
    }
  };

  const filteredUsers = users.filter(u => {
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        u.firstName?.toLowerCase().includes(q) ||
        u.lastName?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.role?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {toastMsg && (
        <div className="p-3.5 rounded-2xl bg-[#021064] text-white text-xs font-bold flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-[#26fedc]" />
            <span>{toastMsg}</span>
          </div>
          <button onClick={() => setToastMsg(null)} className="text-white/70 hover:text-white">
            ✕
          </button>
        </div>
      )}
      {/* RBAC Governance Header */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1 text-[#021064]">
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
            <span className="text-xs font-bold uppercase tracking-wider">Role-Based Access Control (RBAC)</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Staff User Directory &amp; Permissions</h2>
          <p className="text-xs text-slate-500 max-w-2xl mt-0.5">
            Super Administrators can provision internal staff accounts, assign granular operational permissions, and revoke system access.
          </p>
        </div>

        {isSuperAdmin ? (
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            variant="primary"
            size="sm"
            className="text-xs font-semibold gap-1.5 self-start sm:self-auto"
          >
            <UserPlus className="h-4 w-4" />
            <span>Create Staff User</span>
          </Button>
        ) : (
          <Badge variant="outline" className="text-xs text-slate-500">
            Read Only (Super Admin required to edit)
          </Badge>
        )}
      </div>

      {/* Search & Statistics */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Badge variant="primary" className="text-xs py-1 px-2.5">
            {users.length} Active Staff Accounts
          </Badge>
          <Badge variant="outline" className="text-xs py-1 px-2.5">
            5 Distinct Role Profiles
          </Badge>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search staff by name, email, role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-[#021064] focus:outline-none"
          />
        </div>
      </div>

      {/* Staff Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Staff Member</TableHead>
                <TableHead>System Role</TableHead>
                <TableHead>Assigned Permissions</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                {isSuperAdmin && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => {
                const isSuper = user.role === 'super_admin';
                const roleLabels: Record<string, string> = {
                  super_admin: 'Super Admin',
                  credit_underwriter: 'Credit Underwriter',
                  fleet_manager: 'Fleet Manager',
                  collections_agent: 'Collections Officer',
                  compliance_officer: 'Compliance Officer',
                };

                return (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs uppercase shadow-xs">
                          {user.firstName[0]}{user.lastName[0] || ''}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-sm">
                            {user.firstName} {user.lastName}
                          </div>
                          <div className="text-xs text-slate-500 font-medium">{user.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          isSuper
                            ? 'primary'
                            : user.role === 'credit_underwriter'
                            ? 'info'
                            : user.role === 'fleet_manager'
                            ? 'accent'
                            : user.role === 'collections_agent'
                            ? 'warning'
                            : 'success'
                        }
                        className="text-xs font-semibold"
                      >
                        {roleLabels[user.role] || user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 flex-wrap max-w-xs">
                        {user.permissions && user.permissions.length > 0 ? (
                          <>
                            <span className="text-xs font-mono font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                              {user.permissions.length} grants
                            </span>
                            <span className="text-[10px] text-slate-400">
                              ({user.permissions.slice(0, 2).join(', ')}{user.permissions.length > 2 ? '...' : ''})
                            </span>
                          </>
                        ) : (
                          <span className="text-xs text-slate-400">No custom grants</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                          user.status === 'active'
                            ? 'bg-emerald-50 text-emerald-800'
                            : 'bg-red-50 text-red-800'
                        }`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${user.status === 'active' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                        {user.status === 'active' ? 'Active' : 'Suspended'}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-slate-500 font-mono">
                      {user.createdAt || '2026-02-01'}
                    </TableCell>
                    {isSuperAdmin && (
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedUserForPerms(user)}
                            className="h-8 px-2 text-xs font-semibold text-slate-700 hover:text-slate-900"
                          >
                            Permissions
                          </Button>
                          {!isSuper && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleUserStatus(user.id)}
                              className={`h-8 px-2 text-xs font-semibold ${
                                user.status === 'active' ? 'text-amber-600 hover:bg-amber-50' : 'text-emerald-600 hover:bg-emerald-50'
                              }`}
                            >
                              {user.status === 'active' ? 'Suspend' : 'Activate'}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal: Create Staff User (Super Admin only) */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogHeader>
          <div className="flex items-center gap-2 text-[#021064] mb-1">
            <UserPlus className="h-5 w-5" />
            <span className="text-xs font-bold uppercase tracking-wider">Super Admin Provisioning</span>
          </div>
          <DialogTitle>Create New Staff Account</DialogTitle>
          <DialogDescription>
            Grant access credentials and configure operational permission scopes for internal team members.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleCreateUser} className="space-y-4 my-2 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">First Name *</label>
              <Input
                required
                placeholder="e.g. Babatunde"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Last Name</label>
              <Input
                placeholder="e.g. Adeleke"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Official Email Address *</label>
            <Input
              type="email"
              required
              placeholder="name@dandoev.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Assigned Operational Role *</label>
            <select
              value={formData.role}
              onChange={(e) => handleRolePresetChange(e.target.value)}
              className="w-full h-9 rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#021064]"
            >
              <option value="credit_underwriter">Credit Underwriter (Adjudication &amp; Cashflow)</option>
              <option value="fleet_manager">Fleet Operations (Inventory &amp; Battery Telemetry)</option>
              <option value="collections_agent">Collections Officer (Repayments &amp; Recovery)</option>
              <option value="compliance_officer">Compliance &amp; NDPR Officer (KYC &amp; Erasures)</option>
              <option value="super_admin">Super Administrator (Full System Authority)</option>
            </select>
          </div>

          {/* Granular Permission Toggles */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Granular Permission Matrix ({formData.permissions.length} selected)
            </label>
            <div className="space-y-1.5 max-h-48 overflow-y-auto rounded-lg border border-slate-200 p-2.5 bg-slate-50">
              {availablePermissions.map((perm) => {
                const isChecked = formData.permissions.includes(perm.id);
                return (
                  <label
                    key={perm.id}
                    onClick={() => togglePermission(perm.id)}
                    className={`flex items-start gap-2.5 p-2 rounded-md transition-colors cursor-pointer ${
                      isChecked ? 'bg-white shadow-xs border border-slate-200' : 'hover:bg-slate-200/50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {}}
                      className="mt-0.5 rounded text-[#021064] focus:ring-[#021064]"
                    />
                    <div className="flex-1">
                      <div className="font-semibold text-slate-900 text-xs">{perm.label}</div>
                      <div className="text-[10px] text-slate-500">{perm.desc}</div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Create &amp; Issue Access
            </Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* Modal: View/Inspect Permissions */}
      {selectedUserForPerms && (
        <Dialog open={Boolean(selectedUserForPerms)} onOpenChange={() => setSelectedUserForPerms(null)}>
          <DialogHeader>
            <div className="flex items-center gap-2 text-[#021064] mb-1">
              <Key className="h-5 w-5" />
              <span className="text-xs font-bold uppercase tracking-wider">Access Rights</span>
            </div>
            <DialogTitle>
              {selectedUserForPerms.firstName} {selectedUserForPerms.lastName}
            </DialogTitle>
            <DialogDescription>
              Role: <strong className="capitalize text-slate-800">{selectedUserForPerms.role.replace(/_/g, ' ')}</strong> ({selectedUserForPerms.email})
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 my-2 text-xs">
            <div className="font-semibold text-slate-800 mb-1">Active Permission Grants:</div>
            <div className="space-y-1.5">
              {availablePermissions.map((p) => {
                const granted = selectedUserForPerms.permissions?.includes(p.id);
                return (
                  <div
                    key={p.id}
                    className={`flex items-center justify-between p-2 rounded-lg border text-xs ${
                      granted ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950 font-medium' : 'bg-slate-50 border-slate-100 text-slate-400'
                    }`}
                  >
                    <span>{p.label}</span>
                    {granted ? (
                      <span className="flex items-center gap-1 text-emerald-700 text-[11px] font-semibold">
                        <Check className="h-3.5 w-3.5" /> Granted
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-400">Denied</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <DialogFooter>
            <Button variant="default" onClick={() => setSelectedUserForPerms(null)}>
              Done
            </Button>
          </DialogFooter>
        </Dialog>
      )}
    </div>
  );
}
