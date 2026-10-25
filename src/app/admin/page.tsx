'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import AdminSidebar, { AdminTab } from '@/components/admin/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';
import MobileCompanionModal from '@/components/admin/MobileCompanionCard';

// Sub-Tab Views
import OverviewTab from '@/components/admin/tabs/OverviewTab';
import ApplicationsTab from '@/components/admin/tabs/ApplicationsTab';
import FleetTab from '@/components/admin/tabs/FleetTab';
import RepaymentsTab from '@/components/admin/tabs/RepaymentsTab';
import DefaultsTab from '@/components/admin/tabs/DefaultsTab';
import ReconciliationTab from '@/components/admin/tabs/ReconciliationTab';
import ComplianceTab from '@/components/admin/tabs/ComplianceTab';
import UsersAccessTab from '@/components/admin/tabs/UsersAccessTab';
import AuditLogsTab from '@/components/admin/tabs/AuditLogsTab';
import SettingsTab from '@/components/admin/tabs/SettingsTab';

// Operational Modals & Drawers
import BikeModal from '@/components/admin/BikeModal';
import LoanApprovalModal from '@/components/admin/LoanApprovalModal';
import LoanRejectionModal from '@/components/admin/LoanRejectionModal';
import ApplicationDetailDrawer from '@/components/admin/ApplicationDetailDrawer';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [currentRole, setCurrentRole] = useState<string>('super_admin');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileInfoOpen, setMobileInfoOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');

  // Primary Data Collections
  const [loans, setLoans] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [bikes, setBikes] = useState<any[]>([]);
  const [loadingBikes, setLoadingBikes] = useState(false);
  const [adminStats, setAdminStats] = useState<any>(null);
  const [userList, setUserList] = useState<any[]>([]);
  const [reconData, setReconData] = useState<any>({ logs: [], settlements: [] });
  const [kycDocs, setKycDocs] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [delinquentData, setDelinquentData] = useState<{ totalAtRisk: number; repayments: any[] }>({
    totalAtRisk: 0,
    repayments: [],
  });
  const [systemConfig, setSystemConfig] = useState<Record<string, string>>({});
  const [recoveryExecuting, setRecoveryExecuting] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Modals & Drawers State
  const [isBikeModalOpen, setIsBikeModalOpen] = useState(false);
  const [selectedBike, setSelectedBike] = useState<any | null>(null);
  const [selectedLoanForApproval, setSelectedLoanForApproval] = useState<any | null>(null);
  const [selectedLoanForRejection, setSelectedLoanForRejection] = useState<any | null>(null);
  const [selectedLoanForDetail, setSelectedLoanForDetail] = useState<any | null>(null);

  // Enterprise Toast & Confirmation Dialog State
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    description: string;
    confirmLabel: string;
    danger?: boolean;
    onConfirm: () => Promise<void> | void;
  } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4500);
  };

  const reportLoadError = (section: string) => {
    setLoadError(`Some live ${section} data could not be loaded. Check the database connection and retry.`);
  };

  // Data Fetchers
  const fetchAdminStats = async () => {
    try {
      const r = await fetch('/api/admin/stats');
      if (r.ok) {
        const d = await r.json();
        setAdminStats(d.data);
      } else reportLoadError('overview');
    } catch { reportLoadError('overview'); }
  };

  const fetchBikes = async () => {
    setLoadingBikes(true);
    try {
      const r = await fetch('/api/admin/bikes');
      if (r.ok) {
        const data = await r.json();
        setBikes(Array.isArray(data) ? data : []);
      } else reportLoadError('fleet');
    } catch (e) {
      console.error('Failed to fetch bikes', e);
    } finally {
      setLoadingBikes(false);
    }
  };

  const fetchDelinquent = async () => {
    try {
      const r = await fetch('/api/admin/loans/delinquent');
      if (r.ok) {
        const d = await r.json();
        setDelinquentData(d.data || { totalAtRisk: 0, repayments: [] });
      }
    } catch { reportLoadError('delinquency'); }
  };

  const fetchUserList = async () => {
    try {
      const r = await fetch('/api/admin/users');
      if (r.ok) {
        const d = await r.json();
        setUserList(d.data || []);
      }
    } catch { reportLoadError('user'); }
  };

  const fetchReconData = async () => {
    try {
      const r = await fetch('/api/admin/reconciliation');
      if (r.ok) {
        const d = await r.json();
        setReconData(d || { logs: [], settlements: [] });
      }
    } catch { reportLoadError('reconciliation'); }
  };

  const fetchKycDocs = async () => {
    try {
      const r = await fetch('/api/admin/kyc?status=pending');
      if (r.ok) {
        const d = await r.json();
        setKycDocs(d.data || []);
      }
    } catch { reportLoadError('KYC'); }
  };

  const fetchAuditLogs = async () => {
    try {
      const r = await fetch('/api/admin/audit-logs');
      if (r.ok) {
        const d = await r.json();
        setAuditLogs(d.data || []);
      }
    } catch { reportLoadError('audit'); }
  };

  const fetchConfig = async () => {
    try {
      const r = await fetch('/api/admin/config');
      if (r.ok) {
        const d = await r.json();
        setSystemConfig(d.data || {});
      }
    } catch { reportLoadError('configuration'); }
  };

  const refreshLoans = async () => {
    try {
      const lRes = await fetch('/api/loans');
      const lData = await lRes.json();
      setLoans(Array.isArray(lData.data) ? [...lData.data].reverse() : []);
      fetchAdminStats();
    } catch { reportLoadError('loan'); }
  };

  const handleExecuteRecoveryAction = (actionType: string, actionLabel: string, repayment?: any) => {
    setConfirmDialog({
      title: `Execute Recovery: ${actionLabel}`,
      description: `You are about to trigger "${actionLabel}"${
        repayment?.user?.name ? ` for borrower ${repayment.user.name}` : ''
      }. This action will be recorded in the immutable CBN compliance audit log.`,
      confirmLabel: `Confirm & Execute`,
      danger: actionType.includes('immobilize') || actionType.includes('repossession'),
      onConfirm: async () => {
        setConfirmDialog(null);
        setRecoveryExecuting(actionType);
        try {
          const res = await fetch('/api/admin/recovery/execute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              actionType,
              repaymentId: repayment?.repaymentId || repayment?.id,
              userId: repayment?.user?.id,
              amount: repayment?.amount,
            }),
          });
          const data = await res.json();
          if (res.ok) {
            showToast(data.message || `${actionLabel} triggered successfully.`, 'success');
            fetchDelinquent();
          } else {
            showToast(`Action failed: ${data.error || data.message || 'Error occurred'}`, 'error');
          }
        } catch {
          showToast('Network error executing recovery action.', 'error');
        } finally {
          setRecoveryExecuting(null);
        }
      },
    });
  };

  const handleDeleteBike = (id: string) => {
    const targetBike = bikes.find((b) => b.id === id);
    setConfirmDialog({
      title: 'Retire E-Bike from Active Inventory?',
      description: `Are you sure you want to retire "${
        targetBike?.name || id
      }" from the marketplace catalog? Existing active loans on this model will not be affected.`,
      confirmLabel: 'Retire Asset',
      danger: true,
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          const res = await fetch(`/api/admin/bikes/${id}`, { method: 'DELETE' });
          if (res.ok) {
            showToast(`Retired ${targetBike?.name || 'E-Bike'} from inventory.`, 'success');
            fetchBikes();
          } else {
            showToast('Failed to retire e-bike.', 'error');
          }
        } catch {
          showToast('Network error retiring e-bike.', 'error');
        }
      },
    });
  };

  // Initial Load
  useEffect(() => {
    fetch('/api/auth/me')
      .then(async (response) => {
        if (!response.ok) throw new Error('Unable to load authenticated administrator');
        return response.json();
      })
      .then((data) => {
        setCurrentRole(data.user.role);
        setCurrentUser(data.user);
      })
      .catch(() => reportLoadError('administrator profile'));

    Promise.all([
      fetch('/api/loans').then((r) => r.json()),
      fetch('/api/orders').then((r) => r.json()),
    ])
      .then(([l, o]) => {
        const loansArr = Array.isArray(l?.data) ? l.data : Array.isArray(l) ? l : [];
        const ordersArr = Array.isArray(o?.data) ? o.data : Array.isArray(o) ? o : [];
        setLoans([...loansArr].reverse());
        setOrders([...ordersArr].reverse());
      })
      .catch(() => reportLoadError('loan and order'));

    fetchBikes();
    fetchDelinquent();
    fetchConfig();
    fetchAdminStats();
    fetchUserList();
    fetchReconData();
    fetchKycDocs();
    fetchAuditLogs();
  }, []);

  const pendingAppsCount = loans.filter((l) => l.status === 'under_review' || l.status === 'pending').length;

  const stats = {
    totalRevenue: adminStats?.totalRevenue || 0,
    pendingApplications: pendingAppsCount,
    activeLoans: adminStats?.activeLoans || 0,
    totalUsers: adminStats?.totalUsers || 0,
    defaultRate: adminStats?.defaultRate || 0,
    loansByStatus: adminStats?.loansByStatus || [],
    monthlyRevenue: adminStats?.monthlyRevenue || [],
    escrowBalance: adminStats?.escrowBalance || 0,
    onTimeRate: adminStats?.onTimeRate || 0,
    monthGrowth: adminStats?.monthGrowth || 0,
    recentLedger: adminStats?.recentLedger || [],
    regionalHubs: adminStats?.regionalHubs || [],
    providerVolume: adminStats?.providerVolume || [],
  };

  return (
    <div className="admin-workspace flex min-h-screen bg-[#EAF6FF] text-[#0A1B46] antialiased font-sans">
      {/* Enterprise Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 max-w-md px-5 py-3.5 rounded-2xl shadow-2xl border text-xs font-bold flex items-center gap-3 animate-fade-in-up ${
            toast.type === 'error'
              ? 'bg-rose-950 text-white border-rose-500/40'
              : 'bg-slate-900 text-white border-emerald-500/40'
          }`}
        >
          <span
            className={`w-2.5 h-2.5 rounded-full shrink-0 ${
              toast.type === 'error' ? 'bg-rose-400' : 'bg-[#29A174]'
            }`}
          />
          <span>{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            className="text-white/60 hover:text-white ml-2 text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {/* Enterprise Confirmation Modal */}
      {confirmDialog && (
        <div className="modal-overlay" onClick={() => setConfirmDialog(null)}>
          <div
            className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl space-y-4 animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-black text-slate-900">{confirmDialog.title}</h3>
            <p className="text-xs text-slate-600 leading-relaxed">{confirmDialog.description}</p>
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                onClick={() => setConfirmDialog(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                onClick={confirmDialog.onConfirm}
                className={`px-5 py-2.5 rounded-xl text-white font-bold text-xs shadow-sm ${
                  confirmDialog.danger
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-[#021064] hover:bg-[#1e2a78]'
                }`}
              >
                {confirmDialog.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enterprise Collapsible Sidebar */}
      <AdminSidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        pendingCount={pendingAppsCount}
        isOpenMobile={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
        userRole={currentRole}
        userProfile={currentUser}
      />

      {/* Main Administrative Workplace */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Global Executive Header */}
        <AdminHeader
          currentRole={currentRole}
          onOpenMobileInfo={() => setMobileInfoOpen(true)}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          searchQuery={globalSearch}
          onSearchChange={setGlobalSearch}
          pendingApplicationsCount={pendingAppsCount}
          loans={loans}
          bikes={bikes}
          onSelectLoanResult={(loan) => setSelectedLoanForDetail(loan)}
          onNavigateTab={(t) => setActiveTab(t)}
        />

        {/* Tab Content Container: Finebank clean canvas */}
        <main className="flex-1 overflow-y-auto w-full bg-[radial-gradient(circle_at_92%_0%,#D2F1FF_0%,#EAF6FF_34%,#F5FAFF_75%)] px-4 py-5 sm:px-6 sm:py-7 xl:px-8">
          {loadError && (
            <div role="alert" className="mb-5 flex items-center justify-between gap-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <span>{loadError}</span>
              <button type="button" onClick={() => window.location.reload()} className="shrink-0 font-bold underline">Retry</button>
            </div>
          )}
          {activeTab === 'overview' && (
            <OverviewTab
              stats={stats}
              delinquentData={delinquentData}
              auditLogs={auditLogs}
              bikesCount={bikes.length}
              onNavigateToTab={(t) => setActiveTab(t)}
            />
          )}

          {activeTab === 'applications' && (
            <ApplicationsTab
              loans={loans}
              onOpenApprovalModal={(loan) => setSelectedLoanForApproval(loan)}
              onOpenRejectionModal={(loan) => setSelectedLoanForRejection(loan)}
              onOpenDetailDrawer={(loan) => setSelectedLoanForDetail(loan)}
              searchQuery={globalSearch}
            />
          )}

          {activeTab === 'bikes' && (
            <FleetTab
              bikes={bikes}
              loadingBikes={loadingBikes}
              onOpenAddModal={() => {
                setSelectedBike(null);
                setIsBikeModalOpen(true);
              }}
              onOpenEditModal={(bike) => {
                setSelectedBike(bike);
                setIsBikeModalOpen(true);
              }}
              onDeleteBike={handleDeleteBike}
            />
          )}

          {activeTab === 'payments' && (
            <RepaymentsTab
              loans={loans}
              onOpenDetailDrawer={(loan) => setSelectedLoanForDetail(loan)}
            />
          )}

          {activeTab === 'defaults' && (
            <DefaultsTab
              delinquentData={delinquentData}
              onExecuteRecovery={handleExecuteRecoveryAction}
              executingAction={recoveryExecuting}
            />
          )}

          {activeTab === 'reconciliation' && (
            <ReconciliationTab reconData={reconData} />
          )}

          {activeTab === 'compliance' && (
            <ComplianceTab kycDocs={kycDocs} />
          )}

          {activeTab === 'users' && (
            <UsersAccessTab
              initialUsers={userList}
              currentUserRole={currentRole}
            />
          )}

          {activeTab === 'activity' && (
            <AuditLogsTab auditLogs={auditLogs} />
          )}

          {activeTab === 'settings' && (
            <SettingsTab
              systemConfig={systemConfig}
              userRole={currentRole}
            />
          )}
        </main>
      </div>

      {/* Operational Modals & Side Drawers */}
      {isBikeModalOpen && (
        <BikeModal
          bike={selectedBike}
          onClose={() => setIsBikeModalOpen(false)}
          onSave={(savedBike) => {
            if (savedBike) {
              setBikes((prev) => {
                const exists = prev.some((b) => b.id === savedBike.id);
                return exists
                  ? prev.map((b) => (b.id === savedBike.id ? { ...b, ...savedBike } : b))
                  : [savedBike, ...prev];
              });
              showToast(
                selectedBike
                  ? `Updated "${savedBike.name}" fleet specifications.`
                  : `Added "${savedBike.name}" to active fleet inventory.`,
                'success'
              );
            }
            fetchBikes();
          }}
        />
      )}

      {selectedLoanForApproval && (
        <LoanApprovalModal
          isOpen={Boolean(selectedLoanForApproval)}
          onClose={() => setSelectedLoanForApproval(null)}
          loan={selectedLoanForApproval}
          onApproveSuccess={(allocated) => {
            const targetId = selectedLoanForApproval.id;
            setLoans((prev) =>
              prev.map((l) =>
                l.id === targetId
                  ? {
                      ...l,
                      status: 'approved',
                      ...(allocated || {}),
                    }
                  : l
              )
            );
            showToast(
              `Approved BNPL loan #${String(targetId).slice(0, 8)} & allocated VIN ${
                allocated?.bikeSerialNumber || ''
              }.`,
              'success'
            );
            refreshLoans();
          }}
        />
      )}

      {selectedLoanForRejection && (
        <LoanRejectionModal
          isOpen={Boolean(selectedLoanForRejection)}
          onClose={() => setSelectedLoanForRejection(null)}
          loan={selectedLoanForRejection}
          onRejectSuccess={(reason) => {
            const targetId = selectedLoanForRejection.id;
            setLoans((prev) =>
              prev.map((l) =>
                l.id === targetId
                  ? {
                      ...l,
                      status: 'rejected',
                      rejectionReason: reason,
                    }
                  : l
              )
            );
            showToast(`Declined BNPL application #${String(targetId).slice(0, 8)}.`, 'success');
            refreshLoans();
          }}
        />
      )}

      {selectedLoanForDetail && (
        <ApplicationDetailDrawer
          isOpen={Boolean(selectedLoanForDetail)}
          onClose={() => setSelectedLoanForDetail(null)}
          loan={selectedLoanForDetail}
          onApproveClick={(l) => {
            setSelectedLoanForDetail(null);
            setSelectedLoanForApproval(l);
          }}
          onRejectClick={(l) => {
            setSelectedLoanForDetail(null);
            setSelectedLoanForRejection(l);
          }}
        />
      )}

      {/* Mobile App Companion Guide Modal */}
      <MobileCompanionModal
        open={mobileInfoOpen}
        onOpenChange={setMobileInfoOpen}
      />
    </div>
  );
}
