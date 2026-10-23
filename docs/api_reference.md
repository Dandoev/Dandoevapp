# DandoEv — Production API Reference & Architecture Spec

> **Version:** 2.0  
> **Base URL:** `https://dandoev.com/api`  
> **Auth:** Bearer Token (`Authorization: Bearer <access_token>`)  
> **Data Privacy:** NDPR (Nigeria Data Protection Regulation) & PCI-DSS SAQ-A Compliant

---

## 1. Authentication & Security Endpoints

### 1.1 `POST /auth/signin`
Authenticate user session and retrieve JWT access token.
```json
// Request
{
  "email": "user@dandoev.com",
  "password": "SecurePassword123!"
}
// Response 200
{
  "success": true,
  "token": "eyJhbGciOi...",
  "user": {
    "id": "uuid",
    "email": "user@dandoev.com",
    "role": "customer"
  }
}
```

### 1.2 `POST /auth/mfa/setup`
Initialize RFC 6238 TOTP Multi-Factor Authentication.
```json
// Headers: Authorization: Bearer <token>
// Response 200
{
  "success": true,
  "secret": "JBSWY3DPEHPK3PXP",
  "qrUri": "otpauth://totp/DandoEv:user@dandoev.com?secret=JBSWY3DPEHPK3PXP...",
  "backupCodes": ["a1b2-c3d4", "e5f6-g7h8", "..."]
}
```

### 1.3 `POST /auth/mfa/verify`
Verify 6-digit TOTP code or single-use backup recovery code.
```json
// Request
{
  "code": "123456",
  "secret": "JBSWY3DPEHPK3PXP"
}
// Response 200
{
  "success": true,
  "message": "MFA code verified successfully"
}
```

---

## 2. Open Banking & KYC (Mono Integration)

### 2.1 `POST /kyc/mono`
Exchange Mono Connect widget code, verify BVN identity, analyze 6-month statement turnover, and activate Direct Debit mandate.
```json
// Request
{
  "code": "code_xyz123_from_mono_widget"
}
// Response 200
{
  "success": true,
  "message": "Identity and financial assessment verified successfully via Mono",
  "data": {
    "verifiedName": "Solomon Dunu",
    "kycStatus": "verified",
    "statementAnalyzed": true,
    "monthlyIncomeEstimate": 350000
  }
}
```

### 2.2 `POST /webhooks/mono`
Webhook ingress for Mono DirectPay and Mandate events.
* Verifies `mono-webhook-secret` signature with timing-safe comparison.

---

## 3. BNPL Loans & Checkout

### 3.1 `POST /loans`
Submit a new BNPL loan application.
```json
// Request
{
  "bikeId": "seed-bike-G90",
  "loanAmount": 1485000,
  "downPayment": 165000,
  "tenure": 12,
  "interestRate": 4.0,
  "monthlyRepayment": 148500,
  "totalRepayable": 1782000,
  "deliveryAddress": "12 Admiralty Way",
  "deliveryCity": "Lagos",
  "deliveryState": "Lagos"
}
// Response 201
{
  "success": true,
  "loanId": "LOAN-882194",
  "message": "Application submitted for review"
}
```

### 3.2 `GET /loans`
List all BNPL loan applications for the authenticated user (or all loans for admin roles).

---

## 4. User Compliance & Privacy (NDPR / GDPR)

### 4.1 `GET /user/compliance`
Export complete machine-readable user data package (Right of Access & Portability).
```json
// Response 200
{
  "success": true,
  "data": {
    "complianceStandard": "NDPR (Nigeria Data Protection Regulation) / GDPR",
    "exportDate": "2026-08-24T00:00:00.000Z",
    "profile": { ... },
    "loans": [ ... ],
    "orders": [ ... ],
    "wallet": { ... }
  }
}
```

### 4.2 `POST /user/compliance`
Request account data scrubbing & erasure (Right to be Forgotten).
```json
// Request
{
  "action": "REQUEST_ERASURE"
}
// Response 200
{
  "success": true,
  "message": "User data has been successfully scrubbed and anonymized in compliance with NDPR/GDPR standards."
}
```

---

## 5. Admin Operations & Fraud Console

### 5.1 `GET /admin/fraud`
List high-risk flagged applications, failed card deduction spikes, and velocity anomalies.

### 5.2 `POST /admin/fraud`
Execute administrative mitigation (`APPROVE_LOAN` or `BLOCK_USER`).

### 5.3 `GET /admin/compliance`
Audit logs of NDPR data erasure requests and Mono KYC verification trails.
