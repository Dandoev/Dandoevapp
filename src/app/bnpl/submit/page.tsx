'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { CheckCircle2, ClipboardList, UserCheck, Wallet } from 'lucide-react';

export default function SubmitPage() {
    const [invites, setInvites] = useState<string[]>([]);
    useEffect(() => {
        try {
            const submission = JSON.parse(sessionStorage.getItem('bnpl_submission') || '{}');
            setInvites(Array.isArray(submission.guarantorInvites) ? submission.guarantorInvites : []);
        } catch {}
    }, []);
    return (
        <div style={{ minHeight: '100vh', background: 'var(--gray-50)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="container-sm animate-scale-in" style={{ textAlign: 'center', padding: '2rem 1rem' }}>
                <div style={{
                    width: '100px', height: '100px', borderRadius: '50%', margin: '0 auto 1.5rem',
                    background: 'var(--success-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 0 0 12px rgba(46,204,113,0.1)',
                }}><CheckCircle2 size={48} color="var(--success)" strokeWidth={3} /></div>

                <h1 style={{ fontSize: 'var(--text-3xl)', fontWeight: 800, marginBottom: '0.75rem' }}>Application Submitted!</h1>
                <p style={{ color: 'var(--gray-600)', lineHeight: 1.7, marginBottom: '2rem', maxWidth: '400px', margin: '0 auto 2rem' }}>
                    Your BNPL application has been submitted successfully. Our team will review it within 24 hours and notify you via email and SMS.
                </p>

                <div className="card card-elevated" style={{ padding: 'var(--space-6)', borderRadius: 'var(--radius-2xl)', marginBottom: '2rem', textAlign: 'left' }}>
                    <h3 style={{ fontWeight: 700, marginBottom: '1rem', textAlign: 'center' }}>What happens next?</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {[
                            { icon: <ClipboardList size={20} color="var(--warning-dark)" />, title: 'Application Review', desc: 'Our team reviews your documents and KYC information', status: 'In Progress' },
                            { icon: <CheckCircle2 size={20} color="var(--gray-500)" />, title: 'KYC Verification', desc: 'We verify your identity, BVN, and facial match', status: 'Pending' },
                            { icon: <UserCheck size={20} color="var(--gray-500)" />, title: 'Guarantors Verification', desc: 'Your guarantors complete their verification process', status: 'Pending' },
                            { icon: <Wallet size={20} color="var(--gray-500)" />, title: 'Approval & Disbursement', desc: 'Once approved, your bike will be dispatched', status: 'Pending' },
                        ].map((step, i) => (
                            <div key={i} className="flex items-start gap-3">
                                <div style={{
                                    width: '40px', height: '40px', borderRadius: 'var(--radius-lg)', flexShrink: 0,
                                    background: i === 0 ? 'var(--warning-bg)' : 'var(--gray-100)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>{step.icon}</div>
                                <div style={{ flex: 1 }}>
                                    <div className="flex items-center justify-between">
                                        <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>{step.title}</span>
                                        <span className={`badge ${i === 0 ? 'badge-warning' : 'badge-default'}`}>{step.status}</span>
                                    </div>
                                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--gray-500)', marginTop: '0.125rem' }}>{step.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {invites.length > 0 && (
                    <div className="card" style={{ padding: 'var(--space-5)', marginBottom: '1.5rem', textAlign: 'left' }}>
                        <h3 style={{ fontWeight: 700, marginBottom: '0.75rem' }}>Share guarantor verification links</h3>
                        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--gray-500)', marginBottom: '0.75rem' }}>Approval remains locked until both guarantors complete Mono verification and sign.</p>
                        {invites.map((invite, index) => <a key={invite} href={invite} target="_blank" rel="noreferrer" className="btn btn-outline btn-full" style={{ marginTop: '0.5rem' }}>Open Guarantor {index + 1} Link</a>)}
                    </div>
                )}

                <div className="flex flex-col gap-3" style={{ maxWidth: '300px', margin: '0 auto' }}>
                    <Link href="/dashboard" className="btn btn-primary btn-full">Go to Dashboard</Link>
                    <Link href="/bikes" className="btn btn-outline btn-full">Browse More Bikes</Link>
                </div>
            </div>
        </div>
    );
}
