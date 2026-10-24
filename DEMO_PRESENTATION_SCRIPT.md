# DandoEv — Executive Demo Presentation Script & Clickthrough Guide

> **Audience:** Investors, Commercial Partners, Financial Regulators & Board of Directors  
> **Platform Version:** Production v2.0 (Mono Open Banking + AES-256-GCM + NDPR + Paystack)  
> **Presenter Demo Host:** `http://localhost:3000` (or staging domain)

---

## 🔑 1-Click Demo Credentials

| Role | Email | Password | Direct 1-Click Access |
|---|---|---|---|
| **Financed Buyer (Solomon Dunu)** | `solomon.dunu@demo.com` | `password123` | Click **"Demo Buyer"** on `/auth/signin` |
| **Super Administrator** | `admin@dandoev.com` | (set in Supabase Auth) | Sign in at `/login` |

---

## 🎬 Act 1: The Commercial Marketplace & E-Bike Selection (2 Minutes)

### 📍 URL: [`/bikes`](file:///c:/Users/DELL/Downloads/Ebike/src/app/bikes/page.tsx)
* **What to Show:**
  1. Open `/bikes` to showcase the digital catalog (Dando S-Series Commuter, G90 Long-Range, X5 Fat-Tire).
  2. Filter by Category (*Commuter*, *Sports*, *Cargo*) and battery range.
  3. Highlight the **Dual Pricing Badge**: Outright purchase price vs. **₦/month BNPL Installments**.
* **Talking Points:**
  > *"DandoEv solves the primary barrier to commercial electric mobility in Nigeria: upfront capital expenditure. A rider earning ₦12,000 – ₦18,000 daily cannot afford a ₦1.5M bike upfront, but can effortlessly service a ₦4,500 every-2-day micro-installment."*
* **Action:** Click on **"Dando S-Series Commuter"** to navigate into the detail view.

---

## ⚡ Act 2: 3-Minute Frictionless BNPL Checkout (3 Minutes)

### 📍 URL: [`/checkout/bnpl`](file:///c:/Users/DELL/Downloads/Ebike/src/app/checkout/bnpl/page.tsx)
* **What to Show:**
  1. **Step 1 (Delivery & Profile):** Pre-populated contact details for Lagos dispatch. Click *Continue*.
  2. **Step 2 (Mono Open Banking Connect):**
     - Click **"Connect Bank via Mono"**.
     - Observe the instant simulation: pulls verified **BVN**, verified Name, and 6-month statement turnover (*Average monthly inflow: ₦320,000*).
     - Point out: **Zero paperwork, zero physical utility bills, zero branch visits.**
  3. **Step 3 (EMI & Tenure Customization):**
     - Toggle between **6, 12, 18, and 24 months** tenure.
     - Adjust the **Down Payment Slider** (10% ➔ 20%) and watch the daily and monthly installments recalculate in real time.
     - Showcase the **Comprehensive E-Bike & Rider Insurance** toggle.
  4. **Step 4 (Digital Loan Agreement & E-Signing):**
     - Review the scheduled installments and Mono Direct Debit mandate acknowledgment.
     - Click **"Sign Agreement & Complete Checkout"**.
     - See instant confirmation and dispatch allocation!
* **Talking Points:**
  > *"Traditional vehicle leasing in Nigeria takes 2 to 3 weeks of paperwork. DandoEv reduces loan origination to under 3 minutes using Mono Open Banking, automated cashflow scoring, and digital Direct Debit mandates."*

---

## 💳 Act 3: Save-As-You-Ride Micro-Savings & Repayment Portal (2 Minutes)

### 📍 URL: [`/dashboard/repayments`](file:///c:/Users/DELL/Downloads/Ebike/src/app/dashboard/repayments/page.tsx)
* **What to Show:**
  1. **Visual Repayment Progress:** 53.8% of loan settled (₦385,000 paid / ₦715,000 total).
  2. **Save-As-You-Ride Daily Auto-Sweep:**
     - Toggle daily savings (*₦1,000 / day* or *₦1,500 / day*).
     - Explain how daily earnings from delivery rides are automatically swept via Mono Direct Debit into a locked wallet so the rider never defaults on monthly obligations.
  3. **Early Settlement 0% Interest Rebate Calculator:**
     - Show the dynamic rebate: *"Pay off early today and save ₦36,000 in unearned future interest!"*
  4. **1-Click DirectPay:** Manual instant payment button.
* **Talking Points:**
  > *"Commercial riders operate on daily cashflows. Asking them for ₦65,000 at the end of the month leads to defaults. Our Save-As-You-Ride micro-savings sweeps ₦1,000/day invisibly, turning default rates into virtually zero."*

---

## 🤝 Act 4: Digital Guarantor 30-Second Co-Signing (2 Minutes)

### 📍 URL: [`/guarantor-invite/demo-invite-token`](file:///c:/Users/DELL/Downloads/Ebike/src/app/guarantor-invite/[token]/page.tsx)
* **What to Show:**
  1. Explain that when a rider applies, their guarantor receives a magic link via WhatsApp/SMS.
  2. The guarantor opens this clean, mobile-first page showing the applicant's vehicle and loan terms.
  3. The guarantor verifies their identity in 1 click using **Mono Open Banking**.
  4. Digital e-signature executed with immutable audit logging.
* **Talking Points:**
  > *"Guarantor verification used to require physical civil servant passport photographs and stamped letters. We converted it into a 30-second mobile magic link verified cryptographically via Mono Open Banking."*

---

## 🛡️ Act 5: Executive Admin Center, Fraud & NDPR Governance (3 Minutes)

### 📍 URL: [`/admin`](file:///c:/Users/DELL/Downloads/Ebike/src/app/admin/page.tsx)
* **What to Show:**
  1. **Executive Portfolio KPIs:** Total Revenue (₦48.65M), Active Financed Bikes (38), Default Rate (1.45%), Portfolio Status Breakdown.
  2. **Physical Asset Serial Allocation:**
     - Navigate to **"Applications"** tab.
     - Click **"Approve"** on a loan to demonstrate how operations assigns the physical **Bike Serial Number, Chassis Number, and Dual Battery Numbers** before dispatch.
  3. **Real-Time Fraud & Anomaly Console ([`/admin/fraud`](file:///c:/Users/DELL/Downloads/Ebike/src/app/admin/fraud/page.tsx)):**
     - Real-time stream of high-risk flags, velocity triggers, and debt-to-income (DTI) violations.
     - 1-click **"Approve Override"** vs **"Block & Suspend Profile"**.
  4. **NDPR & Data Governance Portal ([`/admin/compliance`](file:///c:/Users/DELL/Downloads/Ebike/src/app/admin/compliance/page.tsx)):**
     - Data subject erasure requests (Right to be Forgotten).
     - Explain our statutory compliance separation: personal PII is anonymized while preserving 6-year CBN financial ledger records.
* **Talking Points:**
  > *"Every single action on DandoEv is built to international fintech standards. PII is encrypted with AES-256-GCM, card details never touch our servers under PCI-DSS SAQ-A, and financial ledgers strictly adhere to Central Bank of Nigeria statutory guidelines."*

---

## 🎯 Wrap-Up & Closing Pitch (1 Minute)

* **Key Takeaway:**
  * DandoEv is not just an e-bike store; it is a **vertically integrated fintech & clean mobility platform** purpose-built for Africa's gig economy.
  * Powered by **Mono Open Banking** for 3-minute originations and daily micro-savings.
  * Ready for staging deployment and institutional debt facility funding.
