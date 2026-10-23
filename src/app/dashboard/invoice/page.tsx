'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { formatNaira, formatDate } from '@/lib/utils';
import { APP_NAME } from '@/lib/constants';
import { Loader2, ArrowLeft, Printer, Shield, Battery, FileText, CheckCircle2 } from 'lucide-react';

function InvoiceContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const loanId = searchParams.get('loanId');

    const [loan, setLoan] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!loanId) {
            setError('No Loan ID provided.');
            setLoading(false);
            return;
        }

        async function fetchLoan() {
            try {
                const token = document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1]
                           || document.cookie.split('; ').find(row => row.startsWith('sb-access-token='))?.split('=')[1];
                
                if (!token) {
                    router.push('/auth/signin');
                    return;
                }

                const res = await fetch(`/api/loans/${loanId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (res.status === 401) {
                    router.push('/auth/signin');
                    return;
                }

                const data = await res.json();
                if (data.success) {
                    setLoan(data.data);
                } else {
                    setError(data.error || 'Failed to load invoice details');
                }
            } catch (err) {
                setError('Network error');
            } finally {
                setLoading(false);
            }
        }

        fetchLoan();
    }, [loanId, router]);

    if (loading) return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Loader2 size={48} className="animate-spin text-primary" />
        </div>
    );

    if (error || !loan) return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
            <h2 style={{ fontWeight: 700, marginBottom: '0.5rem' }}>Error Loading Invoice</h2>
            <p style={{ color: 'var(--gray-500)', marginBottom: '1.5rem' }}>{error || 'Invoice not found'}</p>
            <Link href="/dashboard" className="btn btn-primary btn-sm">Return to Dashboard</Link>
        </div>
    );

    const isApprovedOrActive = ['approved', 'active', 'completed'].includes(loan.status);

    return (
        <div style={{ minHeight: '100vh', background: 'var(--gray-50)', padding: '2rem 1rem' }}>
            <div className="container" style={{ maxWidth: '800px' }}>
                
                {/* Back Link & Action Bar */}
                <div className="flex justify-between items-center print-hide" style={{ marginBottom: '1.5rem' }}>
                    <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--gray-600)', fontWeight: 600, fontSize: 'var(--text-sm)' }}>
                        <ArrowLeft size={16} />
                        <span>Back to Dashboard</span>
                    </Link>
                    <button 
                        onClick={() => window.print()}
                        className="btn btn-outline btn-sm flex items-center gap-2"
                        style={{ padding: '0.5rem 1rem', minHeight: 'auto' }}>
                        <Printer size={16} />
                        <span>Print Invoice</span>
                    </button>
                </div>

                {/* Printable Invoice Card */}
                <div className="card card-elevated" style={{ background: 'var(--white)', padding: '2.5rem', borderRadius: 'var(--radius-2xl)', border: '1px solid var(--gray-200)' }}>
                    
                    {/* Invoice Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', borderBottom: '2px solid var(--gray-100)', paddingBottom: '1.5rem', marginBottom: '2rem' }}>
                        <div>
                            <img src="/logo.png" alt={APP_NAME} style={{ height: '40px', width: 'auto', marginBottom: '0.75rem' }} />
                            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--gray-500)' }}>Plot 14, Admiralty Way, Lekki Phase 1, Lagos</div>
                            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--gray-500)' }}>support@dandoev.com • +234 800 DANDOEV</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Invoice</h1>
                            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--gray-600)', marginBottom: '0.25rem' }}>Invoice No: <span style={{ fontWeight: 600 }}>INV-{loan.id.slice(0, 8).toUpperCase()}</span></div>
                            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--gray-500)' }}>Date: {formatDate(loan.approvedAt || loan.createdAt)}</div>
                            <div style={{ marginTop: '0.5rem' }}>
                                <span className={`badge ${loan.status === 'active' || loan.status === 'approved' ? 'badge-success' : 'badge-warning'}`}>
                                    {loan.status.toUpperCase()}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Customer & Loan Details Grid */}
                    <div className="grid grid-2" style={{ gap: '2rem', marginBottom: '2rem' }}>
                        <div>
                            <h3 style={{ fontSize: 'var(--text-xs)', color: 'var(--gray-500)', textTransform: 'uppercase', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>Billed To:</h3>
                            <div style={{ fontWeight: 700, fontSize: 'var(--text-base)' }}>{loan.user.firstName} {loan.user.lastName}</div>
                            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--gray-600)', marginTop: '0.25rem' }}>{loan.user.email}</div>
                            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--gray-500)', marginTop: '0.25rem' }}>Employment Status: {loan.employmentStatus || 'Employee'}</div>
                        </div>
                        <div>
                            <h3 style={{ fontSize: 'var(--text-xs)', color: 'var(--gray-500)', textTransform: 'uppercase', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>Payment Terms:</h3>
                            <div style={{ fontWeight: 700, fontSize: 'var(--text-sm)' }}>Buy Now Pay Later (BNPL)</div>
                            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--gray-600)', marginTop: '0.25rem' }}>Tenure: {loan.tenure} Months</div>
                            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--gray-600)', marginTop: '0.25rem' }}>Installment: {formatNaira(loan.monthlyRepayment)} / every 2 days</div>
                        </div>
                    </div>

                    {/* Purchase Item Table */}
                    <div style={{ marginBottom: '2rem' }}>
                        <h3 style={{ fontSize: 'var(--text-xs)', color: 'var(--gray-500)', textTransform: 'uppercase', marginBottom: '0.75rem', letterSpacing: '0.05em' }}>Purchased Items</h3>
                        <div style={{ border: '1px solid var(--gray-200)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                            <div style={{ display: 'flex', background: 'var(--gray-50)', padding: '0.75rem 1rem', fontWeight: 700, fontSize: 'var(--text-xs)', borderBottom: '1px solid var(--gray-200)', textTransform: 'uppercase', color: 'var(--gray-600)' }}>
                                <div style={{ flex: 2 }}>Item Description</div>
                                <div style={{ flex: 1, textAlign: 'right' }}>Unit Price</div>
                                <div style={{ flex: 1, textAlign: 'center' }}>Qty</div>
                                <div style={{ flex: 1, textAlign: 'right' }}>Total</div>
                            </div>
                            <div style={{ display: 'flex', padding: '1rem', fontSize: 'var(--text-sm)', borderBottom: '1px solid var(--gray-100)', alignItems: 'center' }}>
                                <div style={{ flex: 2 }}>
                                    <div style={{ fontWeight: 700 }}>{loan.bike.name}</div>
                                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--gray-500)', marginTop: '0.125rem' }}>Category: {loan.bike.category || 'E-Bike'} • Brand: {loan.bike.brand}</div>
                                </div>
                                <div style={{ flex: 1, textAlign: 'right', fontWeight: 600 }}>{formatNaira(loan.bike.price)}</div>
                                <div style={{ flex: 1, textAlign: 'center' }}>1</div>
                                <div style={{ flex: 1, textAlign: 'right', fontWeight: 700 }}>{formatNaira(loan.bike.price)}</div>
                            </div>
                            
                            {/* Check if extra battery/accessory was included in order */}
                            {/* Since the loan amount might be greater than the bike price, calculate accessory cost */}
                            {Number(loan.loanAmount) > Number(loan.bike.price) && (
                                <div style={{ display: 'flex', padding: '1rem', fontSize: 'var(--text-sm)', borderBottom: '1px solid var(--gray-100)', alignItems: 'center' }}>
                                    <div style={{ flex: 2 }}>
                                        <div style={{ fontWeight: 700 }}>🔋 Extra Battery & Chargers Accessory Bundle</div>
                                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--gray-500)', marginTop: '0.125rem' }}>Bundled Accessory for E-Bike</div>
                                    </div>
                                    <div style={{ flex: 1, textAlign: 'right', fontWeight: 600 }}>{formatNaira(Number(loan.loanAmount) - Number(loan.bike.price))}</div>
                                    <div style={{ flex: 1, textAlign: 'center' }}>1</div>
                                    <div style={{ flex: 1, textAlign: 'right', fontWeight: 700 }}>{formatNaira(Number(loan.loanAmount) - Number(loan.bike.price))}</div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Financial Summary */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '2.5rem' }}>
                        <div style={{ width: '300px', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: 'var(--text-sm)' }}>
                            <div className="flex justify-between"><span style={{ color: 'var(--gray-500)' }}>Subtotal</span><span style={{ fontWeight: 600 }}>{formatNaira(loan.loanAmount)}</span></div>
                            <div className="flex justify-between"><span style={{ color: 'var(--gray-500)' }}>Interest & Fees</span><span style={{ fontWeight: 600 }}>{formatNaira(Number(loan.totalRepayable) - Number(loan.loanAmount))}</span></div>
                            <div style={{ borderTop: '1px solid var(--gray-300)', paddingTop: '0.5rem', marginTop: '0.25rem' }} className="flex justify-between">
                                <span style={{ fontWeight: 700, fontSize: 'var(--text-base)' }}>Total Repayable</span>
                                <span style={{ fontWeight: 800, fontSize: 'var(--text-base)', color: 'var(--primary)' }}>{formatNaira(loan.totalRepayable)}</span>
                            </div>
                        </div>
                    </div>

                    {/* ADMIN ASSIGNED NUMBERS (SERIALS / CHASSIS) */}
                    {isApprovedOrActive && (
                        <div style={{ background: 'var(--gray-50)', padding: '1.5rem', borderRadius: 'var(--radius-xl)', border: '1px solid var(--gray-200)', marginBottom: '2rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', fontWeight: 700, fontSize: 'var(--text-sm)', color: 'var(--primary)' }}>
                                <Shield size={18} />
                                <span>Official Assigned Asset Identifiers</span>
                            </div>
                            <div className="grid grid-2" style={{ gap: '1rem 2rem', fontSize: 'var(--text-sm)' }}>
                                <div>
                                    <div style={{ color: 'var(--gray-500)', fontSize: 'var(--text-xs)' }}>Bike Serial Number</div>
                                    <div style={{ fontWeight: 700, fontFamily: 'monospace', fontSize: 'var(--text-sm)', marginTop: '0.125rem' }}>{loan.bikeSerialNumber || 'Pending Assignment'}</div>
                                </div>
                                <div>
                                    <div style={{ color: 'var(--gray-500)', fontSize: 'var(--text-xs)' }}>Chassis Number</div>
                                    <div style={{ fontWeight: 700, fontFamily: 'monospace', fontSize: 'var(--text-sm)', marginTop: '0.125rem' }}>{loan.chassisNumber || 'Pending Assignment'}</div>
                                </div>
                                <div>
                                    <div style={{ color: 'var(--gray-500)', fontSize: 'var(--text-xs)' }}>Battery Number 1 (Primary)</div>
                                    <div style={{ fontWeight: 700, fontFamily: 'monospace', fontSize: 'var(--text-sm)', marginTop: '0.125rem' }} className="flex items-center gap-1">
                                        <Battery size={14} color="var(--success)" />
                                        <span>{loan.batteryNumber1 || 'Pending Assignment'}</span>
                                    </div>
                                </div>
                                
                                {/* Only display Battery Number 2 if the loan amount was higher than bike price or if batteryNumber2 is set */}
                                {(loan.batteryNumber2 || Number(loan.loanAmount) > Number(loan.bike.price)) && (
                                    <div>
                                        <div style={{ color: 'var(--gray-500)', fontSize: 'var(--text-xs)' }}>Battery Number 2 (Extra Battery)</div>
                                        <div style={{ fontWeight: 700, fontFamily: 'monospace', fontSize: 'var(--text-sm)', marginTop: '0.125rem' }} className="flex items-center gap-1">
                                            <Battery size={14} color="var(--success)" />
                                            <span>{loan.batteryNumber2 || 'Pending Assignment'}</span>
                                        </div>
                                    </div>
                                )}
                                
                                {/* Charger Number */}
                                {(loan.chargerNumber || Number(loan.loanAmount) > Number(loan.bike.price)) && (
                                    <div>
                                        <div style={{ color: 'var(--gray-500)', fontSize: 'var(--text-xs)' }}>Charger Serial Number</div>
                                        <div style={{ fontWeight: 700, fontFamily: 'monospace', fontSize: 'var(--text-sm)', marginTop: '0.125rem' }} className="flex items-center gap-1">
                                            <Shield size={14} color="var(--success)" />
                                            <span>{loan.chargerNumber || 'Pending Assignment'}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Invoice Footer Disclaimer */}
                    <div style={{ borderTop: '1px solid var(--gray-200)', paddingTop: '1.5rem', textAlign: 'center', fontSize: 'var(--text-xs)', color: 'var(--gray-500)', lineHeight: 1.5 }}>
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.25rem', fontWeight: 600, color: 'var(--primary)', marginBottom: '0.375rem' }}>
                            <CheckCircle2 size={14} color="var(--success)" />
                            <span>This is a computer generated invoice and requires no physical signature.</span>
                        </div>
                        <div>DandoEv E-Bike Marketplace and Financing. All Rights Reserved.</div>
                    </div>

                </div>

            </div>
        </div>
    );
}

export default function InvoicePage() {
    return (
        <Suspense fallback={
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Loader2 size={40} className="animate-spin" style={{ color: 'var(--primary)' }} />
            </div>
        }>
            <InvoiceContent />
        </Suspense>
    );
}
