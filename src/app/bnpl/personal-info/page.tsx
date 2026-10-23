'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { APP_NAME, EMPLOYMENT_OPTIONS, NIGERIAN_STATES } from '@/lib/constants';
import { AlertTriangle, BarChart3, Home, Upload } from 'lucide-react';

const BNPL_STEPS = ['Personal Info', 'Identity (KYC)', 'Financial', 'Guarantor', 'Loan Terms', 'Submit'];

function Stepper({ current }: { current: number }) {
    return (
        <div className="stepper" style={{ marginBottom: '2rem' }}>
            {BNPL_STEPS.map((label, i) => (
                <div key={i} className="stepper-step">
                    <div className={`stepper-dot ${i < current ? 'completed' : i === current ? 'active' : ''}`}>
                        {i < current ? '✓' : i + 1}
                    </div>
                    <span className="stepper-label">{label}</span>
                    {i < BNPL_STEPS.length - 1 && <div className={`stepper-line ${i < current ? 'completed' : ''}`} />}
                </div>
            ))}
        </div>
    );
}

export default function PersonalInfoPage() {
    const router = useRouter();
    const defaultForm = {
        firstName: '', lastName: '', email: '', phone: '', dateOfBirth: '', gender: '', address: '',
        city: '', state: '', employmentStatus: '', monthlyIncome: '', employerName: '', employerAddress: '',
        addressVerified: false,
    };

    const [form, setForm] = useState(() => {
        if (typeof window !== 'undefined') {
            try {
                const saved = sessionStorage.getItem('bnpl_data');
                if (saved) {
                    const parsed = JSON.parse(saved);
                    if (parsed.personalInfo) {
                        return { ...defaultForm, ...parsed.personalInfo };
                    }
                }
            } catch {}
        }
        return defaultForm;
    });

    const u = (field: string, value: string | boolean) => setForm((prev: any) => ({ ...prev, [field]: value }));

    const isValid = form.firstName && form.lastName && form.email && form.phone && form.dateOfBirth && form.gender && form.address && form.city && form.state && form.employmentStatus && form.monthlyIncome && form.addressVerified;

    return (
        <div style={{ minHeight: '100vh', background: 'var(--gray-50)' }}>
            <nav style={{ background: 'var(--white)', borderBottom: '1px solid var(--gray-200)', padding: '0.75rem 0' }}>
                <div className="container flex items-center gap-4">
                    <Link href="/bikes" style={{ color: 'var(--gray-600)', fontSize: '1.25rem' }}>←</Link>
                    <div>
                        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'var(--text-lg)' }}>BNPL Application</div>
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--gray-500)' }}>Step 1 of 6</div>
                    </div>
                </div>
            </nav>

            <div className="container-sm" style={{ padding: '1.5rem 1rem' }}>
                <Stepper current={0} />

                <div style={{ marginBottom: '1.5rem' }}>
                    <div className="flex items-center justify-between flex-wrap gap-3" style={{ marginBottom: '0.75rem' }}>
                        <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 800 }}>Personal Information</h1>
                        <Link href="/checkout/bnpl" className="btn btn-accent btn-sm" style={{ fontSize: 'var(--text-xs)' }}>
                            ⚡ Switch to 3-Min Mono Express Checkout →
                        </Link>
                    </div>
                    <div className="alert alert-warning" style={{ fontSize: 'var(--text-xs)' }}>
                        <span style={{ color: '#F39C12', display: 'flex' }}><AlertTriangle size={16} /></span>
                        <span>Please ensure the name matches your government-issued ID</span>
                    </div>
                </div>

                <div className="card card-elevated" style={{ padding: 'var(--space-6)', borderRadius: 'var(--radius-2xl)' }}>
                    <div className="flex flex-col gap-4">
                        <div className="grid grid-2" style={{ gap: '1rem' }}>
                            <div className="form-group">
                                <label className="form-label">First Name</label>
                                <input className="form-input" placeholder="Muhammad" value={form.firstName} onChange={e => u('firstName', e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Last Name</label>
                                <input className="form-input" placeholder="Abubakr" value={form.lastName} onChange={e => u('lastName', e.target.value)} />
                            </div>
                        </div>
                        <div className="grid grid-2" style={{ gap: '1rem' }}>
                            <div className="form-group">
                                <label className="form-label">Email Address</label>
                                <input className="form-input" type="email" placeholder="you@ex.com" value={form.email} onChange={e => u('email', e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Phone Number</label>
                                <input className="form-input" type="tel" placeholder="080..." value={form.phone} onChange={e => u('phone', e.target.value)} />
                            </div>
                        </div>
                        <div className="grid grid-2" style={{ gap: '1rem' }}>
                            <div className="form-group">
                                <label className="form-label">Date of Birth</label>
                                <input className="form-input" type="date" value={form.dateOfBirth} onChange={e => u('dateOfBirth', e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Gender</label>
                                <select className="form-select" value={form.gender} onChange={e => u('gender', e.target.value)}>
                                    <option value="">Select</option>
                                    <option>Male</option>
                                    <option>Female</option>
                                    <option>Other</option>
                                </select>
                            </div>
                        </div>

                        <div style={{ borderTop: '1px solid var(--gray-100)', paddingTop: '1rem', marginTop: '0.5rem' }}>
                            <h3 style={{ fontWeight: 700, marginBottom: '0.75rem', fontSize: 'var(--text-base)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Home size={18} color="var(--primary)" /> Residential Address
                            </h3>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Home Address</label>
                            <input className="form-input" placeholder="24 Sandstrip Oworoshoki" value={form.address} onChange={e => u('address', e.target.value)} />
                        </div>
                        <div className="grid grid-2" style={{ gap: '1rem' }}>
                            <div className="form-group">
                                <label className="form-label">City</label>
                                <input className="form-input" placeholder="Lagos" value={form.city} onChange={e => u('city', e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">State</label>
                                <select className="form-select" value={form.state} onChange={e => u('state', e.target.value)}>
                                    <option value="">Select state</option>
                                    {NIGERIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Address Verification (Utility Bill / Rent Receipt)</label>
                            <input
                                type="file"
                                id="utility-bill-upload"
                                accept="image/*,.pdf"
                                style={{ display: 'none' }}
                                onChange={(e) => {
                                    if (e.target.files?.[0]) {
                                        u('addressVerified', true);
                                    }
                                }}
                            />
                            <div 
                                onClick={() => document.getElementById('utility-bill-upload')?.click()}
                                style={{ 
                                    border: '2px dashed var(--gray-300)', 
                                    padding: '1.5rem', 
                                    borderRadius: 'var(--radius-lg)', 
                                    textAlign: 'center', 
                                    cursor: 'pointer', 
                                    background: form.addressVerified ? 'rgba(76, 175, 80, 0.05)' : 'var(--gray-50)',
                                    borderColor: form.addressVerified ? 'var(--success)' : 'var(--gray-300)'
                                }}>
                                {form.addressVerified ? (
                                    <div className="animate-scale-in">
                                        <span style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.5rem', color: 'var(--success)' }}><Upload size={32} /></span>
                                        <span style={{ fontSize: 'var(--text-sm)', color: 'var(--success)', fontWeight: 600 }}>Document Uploaded Successfully (Click to replace)</span>
                                    </div>
                                ) : (
                                    <>
                                        <span style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.5rem', color: 'var(--gray-400)' }}><Upload size={32} /></span>
                                        <span style={{ fontSize: 'var(--text-sm)', color: 'var(--gray-600)', fontWeight: 500 }}>Click to select proof of address file</span>
                                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--gray-400)', marginTop: '0.25rem' }}>Must be within the last 3 months (JPG, PNG, PDF)</div>
                                    </>
                                )}
                            </div>
                        </div>

                        <div style={{ borderTop: '1px solid var(--gray-200)', paddingTop: '1rem', marginTop: '0.5rem' }}>
                            <h3 style={{ fontWeight: 700, marginBottom: '0.75rem', fontSize: 'var(--text-base)' }}>Employment Details</h3>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Employment Status</label>
                            <select className="form-select" value={form.employmentStatus} onChange={e => u('employmentStatus', e.target.value)}>
                                <option value="">Select</option>
                                {EMPLOYMENT_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Monthly Income (₦)</label>
                            <input className="form-input" type="number" placeholder="350000" value={form.monthlyIncome} onChange={e => u('monthlyIncome', e.target.value)} />
                        </div>
                        <div className="grid grid-2" style={{ gap: '1rem' }}>
                            <div className="form-group">
                                <label className="form-label">Employer / Platform</label>
                                <select className="form-select" value={form.employerName} onChange={e => u('employerName', e.target.value)}>
                                    <option value="">Select Platform</option>
                                    <option value="Bolt">Bolt</option>
                                    <option value="Chowdeck">Chowdeck</option>
                                    <option value="Glovo">Glovo</option>
                                    <option value="Indrive">Indrive</option>
                                    <option value="Waysdrop">Waysdrop</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Office Address / Hub</label>
                                <input className="form-input" placeholder="Office address" value={form.employerAddress} onChange={e => u('employerAddress', e.target.value)} />
                            </div>
                        </div>

                        {(['Bolt', 'Chowdeck', 'Glovo', 'Indrive', 'Waysdrop'].includes(form.employerName)) && (
                            <div className="form-group animate-fade-in-up">
                                <label className="form-label">Upload {form.employerName} Account Dashboard</label>
                                <input
                                    type="file"
                                    id="platform-dashboard-upload"
                                    accept="image/*,.pdf"
                                    style={{ display: 'none' }}
                                />
                                <div
                                    onClick={() => document.getElementById('platform-dashboard-upload')?.click()}
                                    style={{ border: '2px dashed var(--gray-300)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', textAlign: 'center', cursor: 'pointer', background: 'var(--gray-50)' }}>
                                    <span style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.5rem', color: 'var(--primary)' }}><BarChart3 size={32} /></span>
                                    <span style={{ fontSize: 'var(--text-sm)', color: 'var(--gray-600)', fontWeight: 500 }}>Click to upload screenshot of your dashboard</span>
                                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--gray-400)', marginTop: '0.25rem' }}>Showing total rides/earnings</div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex justify-between" style={{ marginTop: '1.5rem' }}>
                    <Link href="/bikes" className="btn btn-ghost">Cancel</Link>
                    <button onClick={() => {
                        const saved = JSON.parse(sessionStorage.getItem('bnpl_data') || '{}');
                        sessionStorage.setItem('bnpl_data', JSON.stringify({ ...saved, personalInfo: form }));
                        router.push('/bnpl/kyc');
                    }} className={`btn btn-primary ${!isValid ? 'disabled' : ''}`} style={{ opacity: isValid ? 1 : 0.5, pointerEvents: isValid ? 'auto' : 'none' }}>Continue →</button>
                </div>
            </div>
        </div>
    );
}
