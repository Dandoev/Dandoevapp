import { afterEach, describe, expect, it, vi } from "vitest";

const ENV_KEYS = [
  "NODE_ENV",
  "MONO_ENVIRONMENT",
  "NEXT_PUBLIC_MONO_ENVIRONMENT",
  "MONO_SECRET_KEY",
  "MONO_CONNECT_SECRET_KEY",
  "MONO_LOOKUP_SECRET_KEY",
  "MONO_PROVE_SECRET_KEY",
  "MONO_PAYMENTS_SECRET_KEY",
  "MONO_SANDBOX_LOOKUP_SECRET_KEY",
  "NEXT_PUBLIC_MONO_PUBLIC_KEY",
];
const original = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
const env = process.env as Record<string, string | undefined>;

async function loadMono() {
  vi.resetModules();
  return import("../mono");
}

describe("Mono sandbox is disabled outside tests", () => {
  afterEach(() => {
    for (const k of ENV_KEYS) {
      if (original[k] === undefined) delete env[k];
      else env[k] = original[k];
    }
  });

  it("ignores MONO_ENVIRONMENT=sandbox in production and development", async () => {
    for (const nodeEnv of ["production", "development"]) {
      env.NODE_ENV = nodeEnv;
      env.MONO_ENVIRONMENT = "sandbox";
      env.MONO_SANDBOX_LOOKUP_SECRET_KEY = "test_sk_sandbox";
      env.MONO_LOOKUP_SECRET_KEY = "live_sk_lookup";
      const mono = await loadMono();
      expect(mono.getMonoProductKey("lookup")).toBe("live_sk_lookup");
      expect(mono.isMonoProductConfigured("lookup")).toBe(true);
    }
  }, 15000);

  it("never treats a test_sk_ key as configured in live mode", async () => {
    env.NODE_ENV = "production";
    delete env.MONO_LOOKUP_SECRET_KEY;
    env.MONO_SECRET_KEY = "test_sk_legacy";
    const mono = await loadMono();
    expect(mono.isMonoProductConfigured("lookup")).toBe(false);
  });

  it("prefers a live product key over a legacy test fallback", async () => {
    env.NODE_ENV = "production";
    env.MONO_SECRET_KEY = "test_sk_legacy";
    env.MONO_CONNECT_SECRET_KEY = "live_sk_connect";
    const mono = await loadMono();
    expect(mono.getMonoProductKey("connect")).toBe("live_sk_connect");
  });

  it("reports production issues for sandbox keys and environments", async () => {
    env.NODE_ENV = "development";
    env.MONO_ENVIRONMENT = "sandbox";
    env.MONO_CONNECT_SECRET_KEY = "live_sk_c";
    env.MONO_LOOKUP_SECRET_KEY = "test_sk_l";
    env.MONO_PROVE_SECRET_KEY = "live_sk_p";
    env.MONO_PAYMENTS_SECRET_KEY = "live_sk_pay";
    env.NEXT_PUBLIC_MONO_PUBLIC_KEY = "test_pk_x";
    delete env.MONO_SECRET_KEY;
    const mono = await loadMono();
    const issues = mono.getMonoProductionIssues();
    expect(issues.some((i) => i.includes("MONO_LOOKUP_SECRET_KEY"))).toBe(true);
    expect(issues.some((i) => i.includes("NEXT_PUBLIC_MONO_PUBLIC_KEY"))).toBe(true);
    expect(issues.some((i) => i.includes("MONO_ENVIRONMENT=sandbox"))).toBe(true);
  });

  it("only hands live_pk_ keys to the Connect widget", async () => {
    vi.resetModules();
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    env.NEXT_PUBLIC_MONO_PUBLIC_KEY = "test_pk_sandbox";
    let { getMonoConnectPublicKey } = await import("../mono-public");
    expect(getMonoConnectPublicKey()).toBeNull();
    env.NEXT_PUBLIC_MONO_PUBLIC_KEY = "live_pk_real";
    ({ getMonoConnectPublicKey } = await import("../mono-public"));
    expect(getMonoConnectPublicKey()).toBe("live_pk_real");
    errorSpy.mockRestore();
  });
});
