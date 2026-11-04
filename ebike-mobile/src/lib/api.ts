// ============================================================
// DandoEv Mobile — Unified Backend API Client
// Connects React Native app to backend API endpoints
// ============================================================

import { APP_CONFIG } from "./config";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "./supabase";
import { selectUsableAccessToken, TOKEN_STORAGE_KEY } from "./auth-session";

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  headers?: Record<string, string>;
  body?: any;
  token?: string | null;
  timeout?: number;
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestOptions = {},
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;

  // Set default 25s timeout to allow Render cold-starts & mobile latency
  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    options.timeout || 25000,
  );

  try {
    const performRequest = (accessToken?: string | null) =>
      fetch(`${APP_CONFIG.apiEndpoint}${cleanEndpoint}`, {
        method: options.method || "GET",
        headers: {
          ...headers,
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
      });

    let requestToken = options.token;
    if (requestToken && !requestToken.startsWith("demo-")) {
      const { data } = await supabase.auth.getSession();
      requestToken =
        selectUsableAccessToken(data.session, requestToken) || requestToken;
    }

    let res = await performRequest(requestToken);
    if (
      res.status === 401 &&
      requestToken &&
      !requestToken.startsWith("demo-")
    ) {
      const { data, error } = await supabase.auth.refreshSession();
      const refreshedToken = selectUsableAccessToken(data.session, null);
      if (!error && refreshedToken) {
        await AsyncStorage.setItem(TOKEN_STORAGE_KEY, refreshedToken);
        res = await performRequest(refreshedToken);
      }
    }

    // Render/proxy errors can occasionally return an empty or HTML body. Do not
    // let JSON.parse mask the actual authentication/network error as
    // "Unexpected EOF".
    const responseText = await res.text();
    let data: any = null;
    if (responseText.trim()) {
      try {
        data = JSON.parse(responseText);
      } catch {
        if (!res.ok) {
          throw new Error(
            `Server returned an invalid response (${res.status}). Please try again.`,
          );
        }
        throw new Error(
          "Server returned an invalid response. Please try again.",
        );
      }
    }

    if (!res.ok) {
      const serverMessage = data?.error || data?.message;
      if (res.status === 401)
        throw new Error(
          serverMessage || "Your session has expired. Please sign in again.",
        );
      if (res.status === 429)
        throw new Error(
          serverMessage ||
            "Too many attempts. Please wait a moment and try again.",
        );
      if (res.status >= 500)
        throw new Error(
          serverMessage ||
            "The service is temporarily unavailable. Please try again shortly.",
        );
      throw new Error(
        serverMessage || `Request failed (${res.status}). Please try again.`,
      );
    }

    if (data === null) {
      throw new Error("Server returned an empty response. Please try again.");
    }

    return data as T;
  } catch (err: any) {
    if (err.name === "AbortError") {
      throw new Error("Server connection timed out. Please try again.");
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
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
    }>("/auth/signin", {
      method: "POST",
      body: credentials,
      timeout: 30000,
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
    }>("/auth/signup", {
      method: "POST",
      body: userData,
      timeout: 30000,
    });
  },

  async getProfile(token: string) {
    return apiRequest<{ success: boolean; data: any }>("/auth/me", { token });
  },

  async getNotifications(token: string) {
    return apiRequest<{ success: boolean; data: any[] }>("/notifications", {
      token,
    });
  },

  async markNotificationsRead(token: string) {
    return apiRequest<{ success: boolean }>("/notifications", {
      method: "PATCH",
      token,
    });
  },

  // 2. Bikes & Marketplace
  async getBikes() {
    return apiRequest<{ success: boolean; data: any[] }>("/bikes");
  },

  async getBikeById(id: string) {
    return apiRequest<{ success: boolean; data: any }>(`/bikes/${id}`);
  },

  // 3. Mono Open Banking & KYC
  async verifyMonoKyc(
    data: string | { bvn: string; nin: string },
    token: string,
  ) {
    return apiRequest<{ success: boolean; message: string; data: any }>(
      "/kyc/mono",
      {
        method: "POST",
        body:
          typeof data === "string"
            ? { code: data }
            : { action: "verify_kyc", ...data },
        token,
      },
    );
  },
  async initiateMonoProve(redirectUrl: string, token: string) {
    return apiRequest<{
      success: boolean;
      data: { url: string; reference: string };
    }>("/kyc/prove/initiate", { method: "POST", body: { redirectUrl }, token });
  },
  async initiateMonoConnect(redirectUrl: string, token: string) {
    return apiRequest<{
      success: boolean;
      data: { url?: string; mono_url?: string; reference: string };
    }>("/kyc/connect/initiate", {
      method: "POST",
      body: { redirectUrl },
      token,
    });
  },
  async completeMonoFinancial(
    code: string,
    token: string,
    options: {
      tenureMonths: number;
      deductionFrequency: string;
      proposedMonthlyRepayment: number;
    },
  ) {
    return apiRequest<{ success: boolean; data: any }>("/kyc/mono", {
      method: "POST",
      body: { code, setupMandate: true, ...options },
      token,
    });
  },

  // 4. BNPL Loans & Repayments
  async applyForLoan(loanData: any, token: string, idempotencyKey?: string) {
    return apiRequest<{ success: boolean; loanId: string; message: string }>(
      "/loans",
      {
        method: "POST",
        body: loanData,
        token,
        headers: idempotencyKey
          ? { "Idempotency-Key": idempotencyKey }
          : undefined,
      },
    );
  },

  async getMyLoans(token: string) {
    return apiRequest<{ success: boolean; data: any[] }>("/loans", { token });
  },

  async getRepaymentSchedule(loanId: string, token: string) {
    return apiRequest<{ success: boolean; data: any[] }>(
      `/loans/${loanId}/repayments`,
      { token },
    );
  },

  // 5. Save-As-You-Ride Micro-Savings & Wallet
  async getWalletBalance(token: string) {
    return apiRequest<{ success: boolean; data: any }>("/wallet", { token });
  },

  async toggleDailySavings(enabled: boolean, amount: number, token: string) {
    return apiRequest<{ success: boolean; message: string }>(
      "/user/dashboard",
      {
        method: "PATCH",
        body: { dailySavingsEnabled: enabled, dailySavingsAmount: amount },
        token,
      },
    );
  },

  // 6. Security & MFA
  async setupMfa(token: string) {
    return apiRequest<{
      success: boolean;
      secret: string;
      qrUri: string;
      backupCodes: string[];
    }>("/auth/mfa/setup", { method: "POST", token });
  },

  async verifyMfa(code: string, secret: string, token: string) {
    return apiRequest<{ success: boolean; message: string }>(
      "/auth/mfa/verify",
      {
        method: "POST",
        body: { code, secret },
        token,
      },
    );
  },

  // 7. NDPR Data Portability & Erasure
  async exportComplianceData(token: string) {
    return apiRequest<{ success: boolean; data: any }>("/user/compliance", {
      token,
    });
  },

  async requestAccountDeletion(
    params: { email?: string; phone?: string; reason?: string },
    token?: string,
  ) {
    return apiRequest<{ success: boolean; message?: string; error?: string }>(
      "/user/delete-account",
      {
        method: "POST",
        body: params,
        token,
      },
    );
  },

  // 8. Outright Orders & Checkout
  async createOrder(orderData: any, token?: string | null) {
    return apiRequest<{
      success: boolean;
      orderId?: string;
      totalAmount?: number;
      data?: any;
    }>("/orders", {
      method: "POST",
      body: orderData,
      token,
    });
  },

  async initializePayment(
    paymentData: {
      amount: number;
      orderId: string;
      callbackUrl: string;
      provider?: "mono";
    },
    token: string,
  ) {
    return apiRequest<{
      success: boolean;
      data: {
        authorizationUrl: string;
        reference: string;
        transactionId: string;
        provider: string;
      };
    }>("/payments/initialize", {
      method: "POST",
      body: paymentData,
      token,
    });
  },

  async verifyPayment(reference: string, token: string) {
    return apiRequest<{
      success: boolean;
      data: { status: string; amount: number; reference: string };
    }>(`/payments/verify?reference=${encodeURIComponent(reference)}`, {
      token,
    });
  },

  async fundWallet(amount: number, token: string) {
    return apiRequest<{ success: boolean; data: { authorizationUrl: string; reference: string } }>(
      '/payments/initialize',
      { method: 'POST', token, body: { amount, walletTopup: true, provider: 'mono', callbackUrl: `${APP_CONFIG.apiBaseUrl}/checkout/mobile-return` } },
    );
  },
};
