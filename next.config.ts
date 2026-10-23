import type { NextConfig } from "next";
import { withSentryConfig } from '@sentry/nextjs';

// ============================================================
// Next.js Production Configuration — DandoEv
// ============================================================

const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(self), interest-cohort=()',
  },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://js.paystack.co https://*.sentry.io",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https: http:",
      "connect-src 'self' https://api.paystack.co https://api.ng.termii.com https://api.resend.com https://*.supabase.co wss://*.supabase.co https://api.mono.co https://api.withmono.com https://*.sentry.io",
      "frame-src https://js.paystack.co https://connect.withmono.com",
      "worker-src blob:",
    ].join('; '),
  },
];

const nextConfig: NextConfig = {
  // Use a single build worker on memory-constrained CI or local machines.
  ...(process.env.EBIKE_LOW_RESOURCE_BUILD === '1' ? { experimental: { cpus: 1 } } : {}),
  // ---- Security Headers ----
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },

  // ---- Image Optimization ----
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: 'mock-storage.com' },
    ],
  },

  // ---- Production Optimizations ----
  compress: true,
  poweredByHeader: false,    // Don't leak Next.js version

  // ---- Logging ----
  logging: {
    fetches: {
      fullUrl: process.env.NODE_ENV === 'development',
    },
  },

  // ---- External packages that should not be bundled (server-only) ----
  serverExternalPackages: ['@prisma/client', 'pino', 'bullmq', 'ioredis'],
};

// ---- Sentry — only wrap if DSN is configured ----
const configuredNext = process.env.SENTRY_DSN
  ? withSentryConfig(nextConfig, {
    org: process.env.SENTRY_ORG || 'dandoev',
    project: process.env.SENTRY_PROJECT || 'dandoev-web',
    silent: !process.env.CI,
    widenClientFileUpload: true,
    sourcemaps: {
      deleteSourcemapsAfterUpload: true,
    },
    disableLogger: true,
    automaticVercelMonitors: true,
  })
  : nextConfig;

export default configuredNext;
