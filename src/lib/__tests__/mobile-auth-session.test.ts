import { describe, expect, it } from "vitest";
import { selectUsableAccessToken } from "../../../ebike-mobile/src/lib/auth-session";

describe("mobile auth session selection", () => {
  it("uses a newer valid Supabase access token instead of a stale stored token", () => {
    expect(
      selectUsableAccessToken(
        { access_token: "fresh-token", expires_at: 2_000 },
        "expired-token",
        1_000_000,
      ),
    ).toBe("fresh-token");
  });

  it("rejects a session that expires within thirty seconds", () => {
    expect(
      selectUsableAccessToken(
        { access_token: "almost-expired", expires_at: 1_020 },
        "expired-token",
        1_000_000,
      ),
    ).toBeNull();
  });
});
