import { afterEach, describe, expect, it, vi } from 'vitest';

describe('Mono production integration', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
    delete process.env.MONO_PAYMENTS_SECRET_KEY;
    delete process.env.MONO_CONNECT_SECRET_KEY;
    delete process.env.MONO_LOOKUP_SECRET_KEY;
    delete process.env.MONO_PROVE_SECRET_KEY;
  });

  it('uses the current v3 mandate debit endpoint and preserves processing state', async () => {
    process.env.MONO_PAYMENTS_SECRET_KEY = 'test_sk_configured';
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { id: 'debit-1', status: 'processing', reference: 'DD-123' } }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const { chargeMonoMandate } = await import('../mono');

    const result = await chargeMonoMandate({ mandateId: 'mandate-1', amount: 500, reference: 'DD-123', narration: 'Installment 1' });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.withmono.com/v3/payments/mandates/mandate-1/debit',
      expect.objectContaining({ method: 'POST', headers: expect.objectContaining({ 'mono-sec-key': 'test_sk_configured' }) })
    );
    expect(result.status).toBe('pending');
  }, 60_000);

  it('never converts a live Mono failure into a successful debit', async () => {
    process.env.MONO_PAYMENTS_SECRET_KEY = 'test_sk_configured';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500, text: async () => 'upstream failure' }));
    const { chargeMonoMandate } = await import('../mono');

    await expect(chargeMonoMandate({ mandateId: 'mandate-1', amount: 500, reference: 'DD-123', narration: 'Installment 1' }))
      .rejects.toThrow('Mono API error');
  });

  it('enforces Mono debit reference constraints before calling the gateway', async () => {
    process.env.MONO_PAYMENTS_SECRET_KEY = 'test_sk_configured';
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const { chargeMonoMandate } = await import('../mono');

    await expect(chargeMonoMandate({ mandateId: 'mandate-1', amount: 500, reference: 'x'.repeat(25), narration: 'Installment 1' }))
      .rejects.toThrow('1-24 characters');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('verifies the exact configured Mono webhook secret', async () => {
    const { verifyMonoSignature } = await import('../mono');
    expect(verifyMonoSignature('{}', 'secret-value', 'secret-value')).toBe(true);
    expect(verifyMonoSignature('{}', 'wrong-value', 'secret-value')).toBe(false);
  });

  it('routes credit history through the Lookup credential and requires a real response', async () => {
    process.env.MONO_LOOKUP_SECRET_KEY = 'test_sk_lookup';
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: { providers: ['xds'], credit_history: [] } }) });
    vi.stubGlobal('fetch', fetchMock);
    const { getMonoCreditHistory } = await import('../mono');
    const report = await getMonoCreditHistory('12345678901');
    expect(fetchMock).toHaveBeenCalledWith('https://api.withmono.com/v3/lookup/credit-history/all', expect.objectContaining({ headers: expect.objectContaining({ 'mono-sec-key': 'test_sk_lookup' }) }));
    expect(report.creditScore).toBe(0);
  });

  it('routes Prove initiation through the Prove credential', async () => {
    process.env.MONO_PROVE_SECRET_KEY = 'test_sk_prove';
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: { mono_url: 'https://example.com/verify', reference: 'ref-1' } }) });
    vi.stubGlobal('fetch', fetchMock);
    const { initiateMonoProve } = await import('../mono');
    await initiateMonoProve({ reference: 'ref-1', redirectUrl: 'dandoev://kyc-callback', customer: { name: 'Test User', email: 'test@example.com' } });
    expect(fetchMock).toHaveBeenCalledWith('https://api.withmono.com/v1/prove/initiate', expect.objectContaining({ headers: expect.objectContaining({ 'mono-sec-key': 'test_sk_prove' }) }));
  });

  it('uses the Payments credential and kobo amount for DirectPay', async () => {
    process.env.MONO_PAYMENTS_SECRET_KEY = 'test_sk_payments';
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ status: 'successful', data: { mono_url: 'https://checkout.mono.co/test', reference: 'DND123' } }) });
    vi.stubGlobal('fetch', fetchMock);
    const { initiateMonoPayment } = await import('../mono');
    const session = await initiateMonoPayment({ amount: 1500, type: 'onetime-debit', description: 'Bike purchase', reference: 'DND123', customer: { name: 'Test User', email: 'test@example.com' }, redirect_url: 'https://example.com/checkout/mobile-return' });
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.withmono.com/v2/payments/initiate');
    expect(options.headers['mono-sec-key']).toBe('test_sk_payments');
    expect(JSON.parse(options.body).amount).toBe(150000);
    expect(session.reference).toBe('DND123');
  });

  it('treats an unfinished Mono payment as pending', async () => {
    process.env.MONO_PAYMENTS_SECRET_KEY = 'test_sk_payments';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 404, ok: false }));
    const { verifyMonoPayment } = await import('../mono');
    expect((await verifyMonoPayment('DND123')).status).toBe('pending');
  });

  it('routes live BVN lookup through Mono v3 lookup endpoint when configured', async () => {
    process.env.MONO_LOOKUP_SECRET_KEY = 'test_sk_lookup';
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          bvn: '22233344455',
          firstname: 'Solomon',
          surname: 'Dunu',
          birthdate: '1994-06-15',
          telephoneno: '08034567890',
          watchlist: false,
        },
      }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const { lookupMonoBvn } = await import('../mono');
    const result = await lookupMonoBvn('22233344455');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.withmono.com/v3/lookup/bvn',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'mono-sec-key': 'test_sk_lookup' }),
        body: JSON.stringify({ bvn: '22233344455' }),
      })
    );
    expect(result.verified).toBe(true);
    expect(result.fullName).toBe('SOLOMON DUNU');
    expect(result.bvnMasked).toBe('222*****455');
  });

  it('routes live NIN lookup through Mono v3 lookup endpoint', async () => {
    process.env.MONO_LOOKUP_SECRET_KEY = 'test_sk_lookup';
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          nin: '11223344556',
          firstname: 'Amina',
          surname: 'Bello',
          birthdate: '1996-04-12',
          telephoneno: '08123456789',
        },
      }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const { lookupMonoNin } = await import('../mono');
    const result = await lookupMonoNin('11223344556');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.withmono.com/v3/lookup/nin',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'mono-sec-key': 'test_sk_lookup' }),
        body: JSON.stringify({ nin: '11223344556' }),
      })
    );
    expect(result.verified).toBe(true);
    expect(result.fullName).toBe('AMINA BELLO');
  });

  it('routes NUBAN bank account lookup through Mono v3 account-number lookup', async () => {
    process.env.MONO_LOOKUP_SECRET_KEY = 'test_sk_lookup';
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          account_number: '0148920310',
          name: 'SOLOMON DUNU',
          bvn: '22233344455',
        },
      }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const { verifyMonoBankAccount } = await import('../mono');
    const result = await verifyMonoBankAccount({
      accountNumber: '0148920310',
      bankName: 'Guaranty Trust Bank (GTBank)',
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.withmono.com/v3/lookup/account-number',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'mono-sec-key': 'test_sk_lookup' }),
      })
    );
    expect(result.verified).toBe(true);
    expect(result.accountName).toBe('SOLOMON DUNU');
    expect(result.bankCode).toBe('058');
  });

  it('routes Connect auth code token exchange through Mono v2 accounts/auth endpoint', async () => {
    process.env.MONO_CONNECT_SECRET_KEY = 'test_sk_connect';
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'live_acct_abc123' }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const { exchangeMonoToken } = await import('../mono');
    const result = await exchangeMonoToken('live_code_xyz999');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.withmono.com/v2/accounts/auth',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'mono-sec-key': 'test_sk_connect' }),
        body: JSON.stringify({ code: 'live_code_xyz999' }),
      })
    );
    expect(result.id).toBe('live_acct_abc123');
  });

  it('routes Connect identity lookup through Mono v2 accounts/:id/identity endpoint', async () => {
    process.env.MONO_CONNECT_SECRET_KEY = 'test_sk_connect';
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          fullName: 'SOLOMON DUNU',
          bvn: '22233344455',
          email: 'solomon@dandoev.com',
          phone: '08034567890',
        },
      }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const { getMonoIdentity } = await import('../mono');
    const result = await getMonoIdentity('live_acct_abc123');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.withmono.com/v2/accounts/live_acct_abc123/identity',
      expect.objectContaining({
        headers: expect.objectContaining({ 'mono-sec-key': 'test_sk_connect' }),
      })
    );
    expect(result.name).toBe('SOLOMON DUNU');
    expect(result.bvn).toBe('22233344455');
  });

  it('supports HMAC-SHA512 webhook signature verification', async () => {
    const crypto = await import('crypto');
    const { verifyMonoSignature } = await import('../mono');
    const rawBody = JSON.stringify({ event: 'mono.events.payment_successful', data: { reference: 'DND123' } });
    const secret = 'webhook_secret_key_123';
    const hmacSig = crypto.createHmac('sha512', secret).update(rawBody).digest('hex');
    expect(verifyMonoSignature(rawBody, hmacSig, secret)).toBe(true);
    expect(verifyMonoSignature(rawBody, 'invalid_signature_hash', secret)).toBe(false);
  });
});
