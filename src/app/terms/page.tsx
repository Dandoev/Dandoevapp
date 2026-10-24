'use client';

import Link from 'next/link';

export default function TermsPage() {
    return (
        <div style={{ minHeight: '100vh', background: 'var(--white)' }}>
            <nav style={{ background: 'var(--white)', borderBottom: '1px solid var(--gray-200)', padding: '1rem 0', position: 'sticky', top: 0, zIndex: 10 }}>
                <div className="container flex justify-between items-center">
                    <Link href="/" className="logo" style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--primary)', letterSpacing: '-0.05em' }}>
                        DandoEv
                    </Link>
                    <Link href="/bnpl/loan-terms" className="btn btn-primary btn-sm">Return to Application</Link>
                </div>
            </nav>

            <header style={{ padding: '4rem 0 2rem', background: 'linear-gradient(to bottom, var(--gray-50), var(--white))', textAlign: 'center' }}>
                <div className="container-sm">
                    <h1 style={{ fontSize: 'var(--text-4xl)', fontWeight: 900, marginBottom: '1rem', letterSpacing: '-0.02em', color: 'var(--gray-900)' }}>
                        Terms and Conditions
                    </h1>
                    <p style={{ color: 'var(--gray-600)', fontSize: 'var(--text-lg)' }}>
                        Effective Date: March 29, 2026
                    </p>
                </div>
            </header>

            <main className="container-sm" style={{ paddingBottom: '6rem' }}>
                <div style={{ background: 'var(--white)', borderRadius: 'var(--radius-2xl)', border: '1px solid var(--gray-200)', padding: '3rem', boxShadow: 'var(--shadow-sm)' }}>
                    <div className="prose">
                        <section id="introduction" style={{ marginBottom: '2.5rem' }}>
                            <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 800, color: 'var(--primary)', marginBottom: '1rem', borderBottom: '2px solid var(--gray-100)', paddingBottom: '0.5rem' }}>1. INTRODUCTION</h2>
                            <p>These Terms and Conditions (the &quot;Terms&quot;) and our Privacy Policy govern your access to and use of the DandoEv Platform (the &quot;Platform&quot;), including the mobile application, web-based administrative systems, and any related services (the &quot;Services&quot;) made available by DandoEv Limited (&quot;DandoEv&quot;, &quot;We&quot;, &quot;Us&quot; or &quot;Our&quot;).</p>
                            <p>By accessing or using the Platform, you agree to be bound by these Terms and our Privacy Policy, whether or not you create an account, complete a financing application, or make any payment. If you do not agree to these Terms, you must immediately discontinue use of the Platform.</p>
                            <p>The Platform is designed to enable users to browse, select, and acquire electric mobility products and related items offered by DandoEv through a financing structure, including but not limited to electric bicycles (each an &quot;Asset&quot; and collectively, the &quot;Assets&quot;), and to manage payments and obligations associated therewith.</p>
                        </section>

                        <section id="registration" style={{ marginBottom: '2.5rem' }}>
                            <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 800, color: 'var(--primary)', marginBottom: '1rem', borderBottom: '2px solid var(--gray-100)', paddingBottom: '0.5rem' }}>2. ACCOUNT, REGISTRATION &amp; COMMUNICATION</h2>
                            <p>In order to access certain features of the Platform, you may be required to create an account using your mobile number and complete identity verification procedures.</p>
                            <p>You agree that all information provided by you during registration and use of the Platform shall be accurate, complete, and kept up to date at all times. You shall be solely responsible for maintaining the confidentiality of your login credentials and for all activities carried out under your account.</p>
                            <p>By using the Platform, you consent to receiving communications from us, including transactional messages, payment reminders, service notifications, and promotional communications.</p>
                        </section>

                        <section id="changes" style={{ marginBottom: '2.5rem' }}>
                            <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 800, color: 'var(--primary)', marginBottom: '1rem', borderBottom: '2px solid var(--gray-100)', paddingBottom: '0.5rem' }}>3. ACCEPTANCE OF CHANGES</h2>
                            <p>At our sole discretion, we may amend these Terms at any time. Where such amendments are made, we may notify you by publication on the Platform or by other means of communication. Your continued use of the Platform following such update shall constitute your acceptance of the revised Terms.</p>
                        </section>

                        <section id="eligibility" style={{ marginBottom: '2.5rem' }}>
                            <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 800, color: 'var(--primary)', marginBottom: '1rem', borderBottom: '2px solid var(--gray-100)', paddingBottom: '0.5rem' }}>4. ELIGIBILITY</h2>
                            <p>Only persons who are at least 18 years of age, and who possess the legal capacity to enter into binding agreements under applicable law, may use the Platform.</p>
                        </section>

                        <section id="ownership" style={{ marginBottom: '3rem' }}>
                            <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 800, color: 'var(--primary)', marginBottom: '1rem', borderBottom: '2px solid var(--gray-100)', paddingBottom: '0.5rem' }}>5. OWNERSHIP AND USER RESPONSIBILITIES</h2>
                            <p>Where an Asset is acquired through the Platform under a financing arrangement, legal ownership of the Asset shall remain vested in DandoEv or its financing partner until full and final payment of all outstanding obligations has been made.</p>
                            <div style={{ background: 'var(--gray-50)', padding: '1.5rem', borderRadius: 'var(--radius-xl)', borderLeft: '4px solid var(--primary)', marginTop: '1rem' }}>
                                <p style={{ margin: 0 }}><strong>User Assumption of Risk:</strong> You acknowledge and agree that you shall bear full responsibility for the possession, custody, operation, use and maintenance of the Asset from the moment it is delivered. DandoEv shall not be liable for any injury, loss, damage, liability or claim arising from or connected to your use, operation or possession of the Asset.</p>
                            </div>
                        </section>

                        <section id="restrictions" style={{ marginBottom: '2.5rem' }}>
                            <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 800, color: 'var(--primary)', marginBottom: '1rem', borderBottom: '2px solid var(--gray-100)', paddingBottom: '0.5rem' }}>6. RESTRICTION ON TRANSFER</h2>
                            <p>You shall not sell, transfer, assign, pledge, lease, sublet, or otherwise dispose of the Asset to any third party until all payment obligations have been fully discharged. Your obligation to complete payment for the Asset shall be absolute, irrevocable and unconditional, and shall not be affected by any damage to, loss of, or inability to use the Asset.</p>
                        </section>

                        <section id="payments" style={{ marginBottom: '2.5rem' }}>
                            <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 800, color: 'var(--primary)', marginBottom: '1rem', borderBottom: '2px solid var(--gray-100)', paddingBottom: '0.5rem' }}>7. FINANCING AND PAYMENTS</h2>
                            <p>All payments for Assets acquired through the Platform shall be made in accordance with the financing terms presented to you at the point of application. You authorize DandoEv and/or its designated payment service providers to initiate recurring debits from your designated payment method.</p>
                            <p>Failure to make payment when due may result in penalties, suspension of your account, restriction of access to the Platform, repossession of the Asset, or referral to third-party recovery or credit agencies.</p>
                        </section>

                        <section id="liability" style={{ marginBottom: '2.5rem' }}>
                            <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 800, color: 'var(--primary)', marginBottom: '1rem', borderBottom: '2px solid var(--gray-100)', paddingBottom: '0.5rem' }}>8. LIMITATION OF LIABILITY</h2>
                            <p>To the fullest extent permitted by law, DandoEv shall not be liable for any indirect, incidental, consequential, or special damages, including loss of profits, revenue, data, or business opportunities. DandoEv&rsquo;s total aggregate liability shall be strictly limited to the amount paid by you for the relevant Service in the thirty (30) days preceding the event giving rise to the claim.</p>
                        </section>

                        <section id="ip" style={{ marginBottom: '2.5rem' }}>
                            <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 800, color: 'var(--primary)', marginBottom: '1rem', borderBottom: '2px solid var(--gray-100)', paddingBottom: '0.5rem' }}>9. INTELLECTUAL PROPERTY</h2>
                            <p>The Intellectual Property Rights (IPRs) in the System and all related documentation belong to DandoEv. You are not permitted to copy, reproduce, or tamper in any way with the Platform and related documentation.</p>
                        </section>

                        <section id="governance" style={{ marginBottom: '2.5rem' }}>
                            <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 800, color: 'var(--primary)', marginBottom: '1rem', borderBottom: '2px solid var(--gray-100)', paddingBottom: '0.5rem' }}>10. APPLICABLE LAW</h2>
                            <p>These Terms and any action related thereto shall be governed by the laws of Nigeria. Any Disputes will be resolved through binding arbitration in accordance with applicable law.</p>
                        </section>
                    </div>

                    <div style={{ marginTop: '4rem', padding: '2rem', background: 'var(--primary)', borderRadius: 'var(--radius-xl)', color: 'white', textAlign: 'center' }}>
                        <h3 style={{ fontWeight: 800, marginBottom: '0.5rem' }}>Have questions about these terms?</h3>
                        <p style={{ opacity: 0.9, marginBottom: '1.5rem' }}>Our support team is here to help you understand your rights and obligations.</p>
                        <Link href="/contact" className="btn btn-outline" style={{ color: 'white', borderColor: 'rgba(255,255,255,0.3)' }}>Contact Support</Link>
                    </div>
                </div>
            </main>
        </div>
    );
}
