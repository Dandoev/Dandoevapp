import { afterEach, describe, expect, it, vi } from "vitest";

describe("Mono Prove KYC Verification Flow", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
    delete process.env.MONO_PROVE_SECRET_KEY;
    delete process.env.MONO_PROVE_WEBHOOK_SECRET;
  });

  it("initiates Mono Prove session with correct API endpoint, headers and payload", async () => {
    process.env.MONO_PROVE_SECRET_KEY = "live_sk_test_prove";
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: "successful",
        data: {
          id: "PRV_SESSION_123",
          mono_url: "https://prove.mono.co/PRV_SESSION_123",
          reference: "PROVE-ref-123",
        },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { initiateMonoProve } = await import("../mono");
    const session = await initiateMonoProve({
      reference: "PROVE-ref-123",
      redirectUrl: "dandoev://kyc-callback",
      customer: {
        name: "Test User",
        email: "test@example.com",
        phone: "08012345678",
        identity: { number: "22334455667", type: "bvn" },
      },
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.withmono.com/v1/prove/initiate",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "mono-sec-key": "live_sk_test_prove",
          "Content-Type": "application/json",
        }),
        body: expect.stringContaining("PROVE-ref-123"),
      }),
    );
    expect(session.id).toBe("PRV_SESSION_123");
    expect(session.url).toBe("https://prove.mono.co/PRV_SESSION_123");
    expect(session.reference).toBe("PROVE-ref-123");
  }, 20000);

  it("fetches customer verification status directly from Mono Prove API", async () => {
    process.env.MONO_PROVE_SECRET_KEY = "live_sk_test_prove";
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        status: "success",
        data: {
          reference: "PROVE-ref-123",
          status: "successful",
          verification: {
            bvn: { verified: true, number: "22334455667" },
            liveness: { passed: true, confidence_score: 98.7 },
          },
        },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { fetchMonoProveCustomer } = await import("../mono");
    const result = await fetchMonoProveCustomer("PROVE-ref-123");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.withmono.com/v1/prove/customers/PROVE-ref-123",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          "mono-sec-key": "live_sk_test_prove",
        }),
      }),
    );
    expect(result).not.toBeNull();
    expect(result?.verified).toBe(true);
    expect(result?.status).toBe("successful");
  });

  it("returns null when customer has not completed verification (404)", async () => {
    process.env.MONO_PROVE_SECRET_KEY = "live_sk_test_prove";
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ status: "failed", message: "Customer not found" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { fetchMonoProveCustomer } = await import("../mono");
    const result = await fetchMonoProveCustomer("PROVE-pending-123");
    expect(result).toBeNull();
  });
});
