// ============================================================
// API Handler — Composable Middleware Chain
// - withAuth()            → Verify JWT, attach user to context
// - withRoles()           → RBAC check
// - withScopes()          → Fine-grained OAuth 2.0 scope verification
// - withRateLimit()       → Per-tier rate limiting
// - withValidation()      → Zod schema validation
// - withIdempotency()     → Idempotency key handling
// - withSecurityHeaders() → OWASP security headers injection
// - withFraudCheck()      → Real-time fraud anomaly assessment
// ============================================================
import { NextRequest, NextResponse } from 'next/server';
import { verifySupabaseToken, extractBearerToken, type JwtPayload } from './auth';
import { checkRateLimit, rateLimitResponse, type RateLimitConfig } from './rate-limiter';
import { validateRequest } from './validate';
import { checkIdempotencyKey, storeIdempotencyResponse } from './idempotency';
import { createRequestLogger } from './logger';
import { applySecurityHeaders, hasRequiredScopes, type ApiScope } from './api-security';
import { evaluateRisk, type FraudAssessmentResult, type FraudEvaluationContext } from './fraud-detector';
import { ZodSchema } from 'zod';
import crypto from 'crypto';

// ---- Extended Request Context ----

export interface ApiContext {
  user: JwtPayload;
  requestId: string;
  body?: unknown;
  params?: any;
  fraudAssessment?: FraudAssessmentResult;
}

type ApiHandler = (req: NextRequest, ctx: ApiContext) => Promise<NextResponse>;

// ---- withAuth: Require valid access token ----

export function withAuth(handler: ApiHandler): (req: NextRequest, nextCtx?: any) => Promise<NextResponse> {
  return async (req: NextRequest, nextCtx?: any) => {
    const requestId = req.headers.get('x-request-id') || crypto.randomUUID();

    // Try Authorization header first, then cookie fallback
    const authHeader = req.headers.get('authorization');
    const token = extractBearerToken(authHeader) || req.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    try {
      const payload = await verifySupabaseToken(token);
      if (!payload) throw new Error('Invalid token');
      return handler(req, { user: payload, requestId, params: nextCtx?.params });
    } catch {
      return NextResponse.json(
        { error: 'Invalid or expired session' },
        { status: 401 }
      );
    }
  };
}

// ---- withRoles: Require specific user roles ----

export function withRoles(
  roles: string[],
  handler: ApiHandler
): (req: NextRequest, nextCtx?: any) => Promise<NextResponse> {
  return withAuth(async (req, ctx) => {
    if (!roles.includes(ctx.user.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }
    return handler(req, ctx);
  });
}

// ---- withRateLimit: Apply rate limiting tier ----

export function withRateLimit(
  config: RateLimitConfig,
  identifierFn: (req: NextRequest, ctx?: ApiContext) => string,
  handler: (req: NextRequest, ctx?: ApiContext) => Promise<NextResponse>
): (req: NextRequest, ctx?: ApiContext) => Promise<NextResponse> {
  return async (req: NextRequest, ctx?: ApiContext) => {
    const identifier = identifierFn(req, ctx);
    const result = await checkRateLimit(identifier, config);

    if (!result.allowed) {
      return rateLimitResponse(result);
    }

    const response = await handler(req, ctx);
    response.headers.set('X-RateLimit-Remaining', result.remaining.toString());
    return response;
  };
}

// ---- withValidation: Validate request body with Zod ----

export function withValidation<T>(
  schema: ZodSchema<T>,
  handler: (req: NextRequest, ctx: ApiContext & { validatedBody: T }) => Promise<NextResponse>
): ApiHandler {
  return async (req: NextRequest, ctx: ApiContext) => {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    const result = validateRequest(schema, body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: result.errors },
        { status: 400 }
      );
    }

    return handler(req, { ...ctx, validatedBody: result.data! });
  };
}

// ---- withIdempotency: Handle idempotent POST requests ----

export function withIdempotency<C extends ApiContext = ApiContext>(
  handler: (req: NextRequest, ctx: C) => Promise<NextResponse>
): (req: NextRequest, ctx: C) => Promise<NextResponse> {
  return async (req: NextRequest, ctx: C) => {
    const idempotencyKey = req.headers.get('idempotency-key');

    if (!idempotencyKey) {
      // If no key provided, proceed without idempotency
      return handler(req, ctx);
    }

    const endpoint = new URL(req.url).pathname;
    const cached = await checkIdempotencyKey(idempotencyKey, ctx.user.sub, endpoint);

    if (cached.isDuplicate) {
      const log = createRequestLogger(ctx.requestId, endpoint);
      log.info({ idempotencyKey }, 'Returning cached idempotent response');
      return NextResponse.json(cached.cachedResponseBody, {
        status: cached.cachedResponseCode,
      });
    }

    const response = await handler(req, ctx);

    // Store the response for future duplicate requests
    const responseBody = await response.clone().json().catch(() => null);
    await storeIdempotencyResponse(
      idempotencyKey,
      ctx.user.sub,
      endpoint,
      response.status,
      responseBody
    );

    return response;
  };
}

// ---- Helper: Get client IP from request ----

export function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}

// ---- withSecurityHeaders: Inject OWASP security headers ----

export function withSecurityHeaders(
  handler: (req: NextRequest, ctx?: any) => Promise<NextResponse>
): (req: NextRequest, ctx?: any) => Promise<NextResponse> {
  return async (req: NextRequest, ctx?: any) => {
    const response = await handler(req, ctx);
    return applySecurityHeaders(response);
  };
}

// ---- withScopes: Require specific OAuth 2.0 / fine-grained scopes ----

export function withScopes(
  requiredScopes: ApiScope[],
  handler: ApiHandler
): (req: NextRequest, nextCtx?: any) => Promise<NextResponse> {
  return withAuth(async (req, ctx) => {
    // In our JWT or Supabase claims, scopes may be attached to user metadata or derived from role
    const ROLE_DEFAULT_SCOPES: Record<string, string[]> = {
      super_admin: ['admin:all', '*'],
      finance_admin: ['loans:read', 'loans:approve', 'payments:initiate', 'payments:verify'],
      credit_underwriter: ['loans:read', 'loans:approve', 'compliance:review'],
      compliance_officer: ['compliance:review', 'loans:read', 'user:read'],
      operations_admin: ['user:read', 'loans:read'],
      customer: ['user:read', 'user:write', 'loans:read', 'loans:apply', 'payments:initiate'],
    };

    const explicitScopes = (ctx.user as any).scopes as string[] | undefined;
    const userScopes: string[] =
      explicitScopes && explicitScopes.length > 0
        ? explicitScopes
        : ROLE_DEFAULT_SCOPES[ctx.user.role] || [ctx.user.role];

    if (!hasRequiredScopes(userScopes, requiredScopes)) {
      return NextResponse.json(
        { error: 'Insufficient scope permissions', requiredScopes },
        { status: 403 }
      );
    }
    return handler(req, ctx);
  });
}

// ---- withFraudCheck: Evaluate risk before mutating financial/auth states ----

export function withFraudCheck<C extends ApiContext = ApiContext>(
  actionType: FraudEvaluationContext['actionType'],
  getFinancialDetails?: (req: NextRequest, ctx: C) => { amount?: number; loanAmount?: number; monthlyIncome?: number },
  handler?: (req: NextRequest, ctx: C) => Promise<NextResponse>
): (req: NextRequest, ctx: C) => Promise<NextResponse> {
  return async (req: NextRequest, ctx: C) => {
    const ipAddress = getClientIp(req);
    const userAgent = req.headers.get('user-agent') || undefined;
    const financial = getFinancialDetails ? getFinancialDetails(req, ctx) : {};

    const evaluation = await evaluateRisk({
      userId: ctx.user.sub,
      ipAddress,
      userAgent,
      actionType,
      amount: financial.amount,
      loanAmount: financial.loanAmount,
      monthlyIncome: financial.monthlyIncome,
    });

    if (evaluation.action === 'BLOCK') {
      return NextResponse.json(
        {
          error: 'Action blocked by fraud security system',
          riskLevel: evaluation.riskLevel,
          reasons: evaluation.reasons,
        },
        { status: 403 }
      );
    }

    if (evaluation.action === 'STEP_UP_MFA') {
      const mfaHeader = req.headers.get('x-mfa-token');
      if (!mfaHeader) {
        return NextResponse.json(
          {
            error: 'Step-up Multi-Factor Authentication required for this operation',
            riskLevel: evaluation.riskLevel,
            stepUpRequired: true,
          },
          { status: 403 }
        );
      }
    }

    ctx.fraudAssessment = evaluation;
    if (handler) {
      return handler(req, ctx);
    }
    return NextResponse.json({ success: true, evaluation });
  };
}

