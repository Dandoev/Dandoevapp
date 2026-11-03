export const TOKEN_STORAGE_KEY = "@dandoev_auth_token";

type SessionSnapshot = {
  access_token?: string | null;
  expires_at?: number | null;
};

export function selectUsableAccessToken(
  session: SessionSnapshot | null | undefined,
  fallbackToken?: string | null,
  nowMs = Date.now(),
): string | null {
  if (!session?.access_token) return fallbackToken || null;
  if (session.expires_at && session.expires_at * 1000 <= nowMs + 30_000) {
    return null;
  }
  return session.access_token;
}
