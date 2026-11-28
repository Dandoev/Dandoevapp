import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/** Lightweight endpoint for Render health checks and uptime monitors. */
export function GET() {
  return NextResponse.json({ status: 'ok', service: 'dandoev-api', timestamp: new Date().toISOString() }, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
