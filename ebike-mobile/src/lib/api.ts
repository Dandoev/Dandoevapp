// ============================================================
// DandoEv Mobile — Unified Backend API Client
// Connects React Native app to backend API endpoints
// ============================================================

import { APP_CONFIG } from './config';

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
  token?: string | null;
}

async function apiRequest<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (options.token) {
    headers['Authorization'] = `Bearer ${options.token}`;
  }

  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const res = await fetch(`${APP_CONFIG.apiEndpoint}${cleanEndpoint}`, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || `API Request failed with status ${res.status}`);
  }

  return data as T;
}

export const MobileApi = {
  // 1. Auth & Session
  async signIn(credentials: { email: string; password: string }) {
    return apiRequest<{
      success: boolean;
      accessToken?: string;
      token?: string;
      user?: any;
      session?: any;
      error?: string;
    }>('/auth/signin', {
      method: 'POST',
      body: credentials,
    });
  },

  async signUp(userData: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    password: string;
  }) {
    return apiRequest<{
      success: boolean;
      accessToken?: string;
      token?: string;
      user?: any;
      session?: any;
      error?: string;
    }>('/auth/signup', {
      method: 'POST',
      body: userData,
    });
  },

  async getProfile(token: string) {
    return apiRequest<{ success: boolean; data: any }>('/auth/me', { token });
  },

  // 2. Bikes & Marketplace
  async getBikes() {
    return apiRequest<{ success: boolean; data: any[] }>('/bikes');
  },

  async getBikeById(id: string) {
    return apiRequest<{ success: boolean; data: any }>(`/bikes/${id}`);
  },

  // 3. Mono Open Banking & KYC
  async verifyMonoKyc(code: string, token: string) {
    return apiRequest<{ success: boolean; message: string; data: any }>('/kyc/mono', {
      method: 'POST',
      body: { code },
      token,
    });
  },

  // 4. BNPL Loans & Repayments
  async applyForLoan(loanData: any, token: string) {
    return apiRequest<{ success: boolean; loanId: string; message: string }>('/loans', {
      method: 'POST',
      body: loanData,
      token,
    });
  },

  async getMyLoans(token: string) {
    return apiRequest<{ success: boolean; data: any[] }>('/loans', { token });
  },

  async getRepaymentSchedule(loanId: string, token: string) {
    return apiRequest<{ success: boolean; data: any[] }>(`/loans/${loanId}/repayments`, { token });
  },

  // 5. Save-As-You-Ride Micro-Savings & Wallet
  async getWalletBalance(token: string) {
    return apiRequest<{ success: boolean; data: any }>('/wallet', { token });
  },

  async toggleDailySavings(enabled: boolean, amount: number, token: string) {
    return apiRequest<{ success: boolean; message: string }>('/user/dashboard', {
      method: 'PATCH',
      body: { dailySavingsEnabled: enabled, dailySavingsAmount: amount },
      token,
    });
  },

  // 6. Security & MFA
  async setupMfa(token: string) {
    return apiRequest<{ success: boolean; secret: string; qrUri: string; backupCodes: string[] }>(
      '/auth/mfa/setup',
      { method: 'POST', token }
    );
  },

  async verifyMfa(code: string, secret: string, token: string) {
    return apiRequest<{ success: boolean; message: string }>('/auth/mfa/verify', {
      method: 'POST',
      body: { code, secret },
      token,
    });
  },

  // 7. NDPR Data Portability & Erasure
  async exportComplianceData(token: string) {
    return apiRequest<{ success: boolean; data: any }>('/user/compliance', { token });
  },

  // 8. Outright Orders & Checkout
  async createOrder(orderData: any, token?: string | null) {
    return apiRequest<{ success: boolean; orderId?: string; data?: any }>('/orders', {
      method: 'POST',
      body: orderData,
      token,
    });
  },
};
