'use client';

import Link from 'next/link';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-emerald-500 selection:text-black">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-md border-b border-white/10 py-4">
        <div className="max-w-5xl mx-auto px-6 flex justify-between items-center">
          <Link href="/" className="text-2xl font-black text-white tracking-tight">
            DandoEv
          </Link>
          <div className="flex items-center gap-4 text-xs font-semibold">
            <Link href="/terms" className="text-slate-400 hover:text-white transition-colors">
              Terms & Conditions
            </Link>
            <Link
              href="/"
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-4 py-2 rounded-lg transition-all"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </nav>

      {/* Header */}
      <header className="py-16 bg-gradient-to-b from-slate-900 to-slate-950 border-b border-white/5 text-center">
        <div className="max-w-3xl mx-auto px-6">
          <span className="inline-block px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-xs font-bold tracking-wider uppercase mb-4">
            NDPR &amp; Global Privacy Standards Compliant
          </span>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white mb-4">
            Privacy Policy
          </h1>
          <p className="text-slate-400 text-sm sm:text-base">
            Effective Date: October 23, 2026 • Last Updated: October 2026
          </p>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">
            App ID / Package Name: <code className="bg-slate-800 text-emerald-300 px-2 py-0.5 rounded font-mono">com.dandoev.mobile</code>
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-6 sm:p-10 space-y-10 shadow-2xl backdrop-blur-sm text-slate-300 text-sm leading-relaxed">
          
          {/* Summary Box */}
          <div className="p-5 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-slate-200">
            <h2 className="text-base font-bold text-emerald-400 mb-2">Policy Overview</h2>
            <p className="text-xs sm:text-sm text-slate-300">
              DandoEv Limited (&quot;DandoEv&quot;, &quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) operates the DandoEv Commercial E-Bike Platform and Mobile Application (<code className="text-emerald-300">com.dandoev.mobile</code>). This Privacy Policy explains how we collect, process, encrypt, store, and safeguard your personal and financial information in compliance with the Nigeria Data Protection Act (NDPA) and NDPR regulations.
            </p>
          </div>

          {/* Section 1 */}
          <section id="information-collected" className="space-y-4">
            <h2 className="text-xl font-bold text-white border-b border-white/10 pb-2 flex items-center gap-2">
              <span className="text-emerald-400">1.</span> Information We Collect
            </h2>
            <p>
              To provide our electric mobility products, outright purchases, and Buy Now Pay Later (BNPL) lease financing, we collect the following categories of personal data:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-slate-300">
              <li>
                <strong className="text-white">Identity &amp; KYC Verification Data:</strong> Full legal name, date of birth, residential address, telephone number, email address, photograph/selfie, Bank Verification Number (BVN), and National Identity Number (NIN).
              </li>
              <li>
                <strong className="text-white">Uploaded Documents:</strong> Clear digital copies of government-issued identification cards (NIN slip, Voter card, Driver’s License), utility bills for address proof, and guarantor authorization forms.
              </li>
              <li>
                <strong className="text-white">Financial &amp; Banking Data:</strong> Bank account numbers, Nigerian NIP bank codes, 6-month transaction statement history (retrieved securely via licensed Open Banking partner Mono), repayment cadence records, and Save-As-You-Ride escrow vault balances.
              </li>
              <li>
                <strong className="text-white">Device &amp; Telemetry Data:</strong> IP address, device model, operating system version, push notification tokens, and mobile crash diagnostic logs.
              </li>
              <li>
                <strong className="text-white">Physical Asset &amp; Location Data:</strong> GPS telemetry and speed metrics linked to financed E-Bikes for maintenance scheduling, battery swap network coordination, and anti-theft asset recovery.
              </li>
            </ul>
          </section>

          {/* Section 2 */}
          <section id="purpose" className="space-y-4">
            <h2 className="text-xl font-bold text-white border-b border-white/10 pb-2 flex items-center gap-2">
              <span className="text-emerald-400">2.</span> Why We Process Your Information
            </h2>
            <p>We process your data for strictly lawful purposes including:</p>
            <div className="grid sm:grid-cols-2 gap-3 pt-2">
              <div className="p-4 rounded-lg bg-slate-800/40 border border-white/5">
                <h3 className="font-semibold text-white mb-1">Identity Verification</h3>
                <p className="text-xs text-slate-400">Validating BVN and NIN against official national identity databases to prevent fraud and impersonation.</p>
              </div>
              <div className="p-4 rounded-lg bg-slate-800/40 border border-white/5">
                <h3 className="font-semibold text-white mb-1">Credit Underwriting</h3>
                <p className="text-xs text-slate-400">Analyzing verified 6-month cashflow statements to determine fair loan affordability and repayment cadences.</p>
              </div>
              <div className="p-4 rounded-lg bg-slate-800/40 border border-white/5">
                <h3 className="font-semibold text-white mb-1">Payment Processing</h3>
                <p className="text-xs text-slate-400">Executing outright checkout orders, down payments, and automated bi-daily or weekly loan installment debits via NIBSS.</p>
              </div>
              <div className="p-4 rounded-lg bg-slate-800/40 border border-white/5">
                <h3 className="font-semibold text-white mb-1">Fleet &amp; Asset Protection</h3>
                <p className="text-xs text-slate-400">Binding bike frame VINs, dual battery serials, and fast chargers to legitimate active riders.</p>
              </div>
            </div>
          </section>

          {/* Section 3 */}
          <section id="security" className="space-y-4">
            <h2 className="text-xl font-bold text-white border-b border-white/10 pb-2 flex items-center gap-2">
              <span className="text-emerald-400">3.</span> Data Security &amp; Encryption Standards
            </h2>
            <p>
              DandoEv implements bank-grade cryptographic security measures to protect your sensitive PII (Personally Identifiable Information):
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong className="text-white">AES-256-GCM Field-Level Encryption:</strong> All sensitive identity numbers (BVN, NIN, account numbers) are encrypted at the application level before being written to PostgreSQL.
              </li>
              <li>
                <strong className="text-white">HMAC-SHA256 Blind Indexing:</strong> Allows searchability of encrypted identities without exposing raw plaintext in database memory.
              </li>
              <li>
                <strong className="text-white">Transport Layer Security (TLS 1.3):</strong> All network traffic between your mobile device, our backend API, and third-party partners is enforced using Strict-Transport-Security (HSTS).
              </li>
              <li>
                <strong className="text-white">Cryptographic Webhook Signatures:</strong> All incoming payment callbacks from payment processors are verified using HMAC-SHA512 with timing-safe comparison to prevent replay attacks.
              </li>
            </ul>
          </section>

          {/* Section 4 */}
          <section id="third-parties" className="space-y-4">
            <h2 className="text-xl font-bold text-white border-b border-white/10 pb-2 flex items-center gap-2">
              <span className="text-emerald-400">4.</span> Third-Party Processors &amp; Data Sharing
            </h2>
            <p>
              We do not sell, rent, or trade your personal data. We only share information with licensed, PCI-compliant infrastructure partners necessary to deliver our services:
            </p>
            <div className="space-y-3 pt-1">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg bg-slate-800/30 border border-white/5 gap-2">
                <div>
                  <strong className="text-white">Mono Technologies Nigeria Limited</strong>
                  <p className="text-xs text-slate-400">Open Banking statement analysis, DirectPay checkout, and NIBSS Direct Debit mandate execution.</p>
                </div>
                <span className="text-xs bg-emerald-500/10 text-emerald-300 px-2.5 py-1 rounded border border-emerald-500/20 whitespace-nowrap">Payment &amp; Banking</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg bg-slate-800/30 border border-white/5 gap-2">
                <div>
                  <strong className="text-white">Supabase Inc.</strong>
                  <p className="text-xs text-slate-400">Encrypted relational database hosting and private document storage for KYC files.</p>
                </div>
                <span className="text-xs bg-blue-500/10 text-blue-300 px-2.5 py-1 rounded border border-blue-500/20 whitespace-nowrap">Infrastructure &amp; Auth</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg bg-slate-800/30 border border-white/5 gap-2">
                <div>
                  <strong className="text-white">Termii Communication Limited</strong>
                  <p className="text-xs text-slate-400">Delivering transactional SMS verification codes, payment receipts, and repayment reminders.</p>
                </div>
                <span className="text-xs bg-amber-500/10 text-amber-300 px-2.5 py-1 rounded border border-amber-500/20 whitespace-nowrap">SMS Gateway</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg bg-slate-800/30 border border-white/5 gap-2">
                <div>
                  <strong className="text-white">Resend Inc.</strong>
                  <p className="text-xs text-slate-400">Dispatching digital invoices, loan approval notices, and contract summaries via email.</p>
                </div>
                <span className="text-xs bg-purple-500/10 text-purple-300 px-2.5 py-1 rounded border border-purple-500/20 whitespace-nowrap">Transactional Email</span>
              </div>
            </div>
          </section>

          {/* Section 5 */}
          <section id="retention-rights" className="space-y-4">
            <h2 className="text-xl font-bold text-white border-b border-white/10 pb-2 flex items-center gap-2">
              <span className="text-emerald-400">5.</span> Data Retention, User Rights &amp; Account Deletion
            </h2>
            <p>
              Under the Nigeria Data Protection Regulation (NDPR), you have the right to:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Request a copy of the personal data we hold about you.</li>
              <li>Request rectification of incorrect or outdated personal details.</li>
              <li>Withdraw consent for marketing communications at any time.</li>
              <li>
                <strong className="text-white">Request Account &amp; Data Deletion:</strong> You may request full deletion of your user account and personal data online via our dedicated <Link href="/delete-account" className="text-emerald-400 font-semibold underline">Account Deletion Portal</Link> or by emailing our Data Protection Officer at <a href="mailto:privacy@dandoev.com" className="text-emerald-400 underline">privacy@dandoev.com</a> / <a href="mailto:contactdandoev@gmail.com" className="text-emerald-400 underline">contactdandoev@gmail.com</a>.
              </li>
            </ul>
            <div className="p-4 rounded-lg bg-slate-800/60 border border-white/5 text-xs text-slate-400">
              <strong className="text-slate-200">Regulatory Retention Notice:</strong> If you currently maintain an active financing lease or uncompleted loan balance with DandoEv, financial records and asset bindings must be preserved until full loan liquidation in accordance with Central Bank of Nigeria (CBN) and anti-money laundering (AML) regulatory compliance.
            </div>
          </section>

          {/* Section 6 */}
          <section id="children" className="space-y-4">
            <h2 className="text-xl font-bold text-white border-b border-white/10 pb-2 flex items-center gap-2">
              <span className="text-emerald-400">6.</span> Children&apos;s Privacy
            </h2>
            <p>
              Our services are strictly directed to commercial operators and individuals who are at least 18 years of age. We do not knowingly collect or solicit personal data from anyone under the age of 18.
            </p>
          </section>

          {/* Section 7 */}
          <section id="contact" className="space-y-4">
            <h2 className="text-xl font-bold text-white border-b border-white/10 pb-2 flex items-center gap-2">
              <span className="text-emerald-400">7.</span> Contact &amp; Data Protection Officer
            </h2>
            <p>
              If you have questions, feedback, or wish to exercise your data privacy rights, please reach our Data Protection team:
            </p>
            <div className="p-4 rounded-xl bg-slate-800/80 border border-white/10 space-y-1 text-xs sm:text-sm">
              <p><strong className="text-white">Entity:</strong> DandoEv Limited</p>
              <p><strong className="text-white">Email:</strong> <a href="mailto:privacy@dandoev.com" className="text-emerald-400">privacy@dandoev.com</a> / <a href="mailto:contactdandoev@gmail.com" className="text-emerald-400">contactdandoev@gmail.com</a></p>
              <p><strong className="text-white">Address:</strong> Lagos, Nigeria</p>
              <p><strong className="text-white">Web:</strong> <a href="https://dashboard.dandoev.com" className="text-emerald-400">https://dashboard.dandoev.com</a></p>
            </div>
          </section>

        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8 bg-slate-950 text-center text-xs text-slate-500">
        <p>© 2026 DandoEv Limited. All rights reserved. • Package: com.dandoev.mobile</p>
      </footer>
    </div>
  );
}
