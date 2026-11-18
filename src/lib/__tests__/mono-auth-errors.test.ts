import { describe, it, expect } from "vitest";
import { classifyMonoAuthError, MonoFeatureUnavailableError } from "../mono";

describe("classifyMonoAuthError", () => {
  it("detects a product that is not enabled", () => {
    expect(
      classifyMonoAuthError(401, '{"message":"This feature is not enabled for your business. Please contact support to enable it."}'),
    ).toBe("not_enabled");
  });

  it("detects a rotated/revoked secret key", () => {
    expect(
      classifyMonoAuthError(401, '{"message":"The provided secret key is invalid. Please ensure you\'re using the correct secret key"}'),
    ).toBe("invalid_key");
  });

  it("detects a key from an app without the Lookup product", () => {
    expect(
      classifyMonoAuthError(401, '{"message":"Please use a Lookup app, go to your dashboard and create an app with Lookup product."}'),
    ).toBe("wrong_app");
  });

  it("ignores non-401 responses and unknown 401 bodies", () => {
    expect(classifyMonoAuthError(400, "secret key is invalid")).toBeNull();
    expect(classifyMonoAuthError(401, "Unauthorized")).toBeNull();
  });

  it("produces an actionable message for an invalid key", () => {
    const err = new MonoFeatureUnavailableError("lookup", "invalid_key");
    expect(err.message).toContain("MONO_LOOKUP_SECRET_KEY");
    expect(err.reason).toBe("invalid_key");
  });
});
