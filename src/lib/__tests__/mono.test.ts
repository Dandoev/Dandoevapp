import { afterEach, describe, expect, it, vi } from 'vitest';

describe('Mono production integration', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
    delete process.env.MONO_SECRET_KEY;
  });

  it('uses the current v3 mandate debit endpoint and preserves processing state', async () => {
    process.env.MONO_SECRET_KEY = 'test_sk_configured';
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { id: 'debit-1', status: 'processing', reference: 'DD-123' } }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const { chargeMonoMandate } = await import('../mono');

    const result = await chargeMonoMandate({ mandateId: 'mandate-1', amount: 500, reference: 'DD-123', narration: 'Installment 1' });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.withmono.com/v3/payments/mandates/mandate-1/debit',
      expect.objectContaining({ method: 'POST' })
    );
    expect(result.status).toBe('pending');
  }, 60_000);

  it('never converts a live Mono failure into a successful debit', async () => {
    process.env.MONO_SECRET_KEY = 'test_sk_configured';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500, text: async () => 'upstream failure' }));
    const { chargeMonoMandate } = await import('../mono');

    await expect(chargeMonoMandate({ mandateId: 'mandate-1', amount: 500, reference: 'DD-123', narration: 'Installment 1' }))
      .rejects.toThrow('Mono API error');
  });

  it('enforces Mono debit reference constraints before calling the gateway', async () => {
    process.env.MONO_SECRET_KEY = 'test_sk_configured';
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
});
