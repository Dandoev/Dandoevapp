import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('Termii phone OTP delivery', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('TERMII_API_KEY', 'TL_test_key');
    vi.stubEnv('TERMII_BASE_URL', 'https://termii.test');
    vi.stubEnv('TERMII_SENDER_ID', 'DandoEv');
    vi.stubEnv('TERMII_OTP_CHANNEL', 'dnd');
  });

  it('generates a verifiable PIN and dispatches it by transactional SMS', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ otp: '482913', pin_id: 'pin-123' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ code: 'ok', message_id: 'sms-456' }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const { sendPhoneOtp } = await import('../termii');
    const result = await sendPhoneOtp('08031234567');

    expect(result).toEqual({ pinId: 'pin-123', phone: '+2348031234567', messageId: 'sms-456' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][0]).toBe('https://termii.test/api/sms/otp/generate');
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toMatchObject({
      to: '2348031234567',
      from: 'DandoEv',
      channel: 'dnd',
      sms: expect.stringContaining('482913'),
    });
  }, 15_000);

  it('does not create a login challenge when SMS delivery is rejected', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ otp: '482913', pin_id: 'pin-123' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ code: 'failed', message: 'Sender ID rejected' }), { status: 400 }));
    vi.stubGlobal('fetch', fetchMock);

    const { sendPhoneOtp } = await import('../termii');
    await expect(sendPhoneOtp('08031234567')).rejects.toThrow('Sender ID rejected');
  });

  it('normalizes guarantor numbers before sending an SMS', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ code: 'ok', message_id: 'invite-123' }), { status: 200 })
    );
    vi.stubGlobal('fetch', fetchMock);

    const { sendSms } = await import('../termii');
    await sendSms('0803 123 4567', 'Complete your guarantor form');

    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({
      to: '2348031234567',
      channel: 'generic',
    });
  });

  it('fails instead of reporting a delivery when Termii is not configured', async () => {
    vi.stubEnv('TERMII_API_KEY', '');
    const { sendSms } = await import('../termii');
    await expect(sendSms('08031234567', 'Test message')).rejects.toThrow('TERMII_API_KEY is missing');
  });
});
