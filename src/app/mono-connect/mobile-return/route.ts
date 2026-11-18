import { NextRequest, NextResponse } from "next/server";

/**
 * Mono Connect redirects here after bank authorization. The mobile browser
 * session cannot consume the server URL directly, so forward only the
 * callback parameters to the Expo deep link.
 */
export function GET(req: NextRequest) {
  const source = new URL(req.url);
  const target = new URL("dandoev://mono-connect-callback");
  for (const key of ["code", "status", "reference", "ref", "error", "message"]) {
    const value = source.searchParams.get(key);
    if (value) target.searchParams.set(key, value);
  }
  return NextResponse.redirect(target);
}
