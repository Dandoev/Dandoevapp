import { test, expect } from '../../fixtures/checkout.fixture';

test.describe('checkout payment', () => {
  test.beforeEach(async ({ page, checkout }) => {
    await page.route('**/api/orders', route => route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, orderId: 'order-123' }),
    }));
    await checkout.goto();
    await checkout.enterBuyerAndChoosePickup();
  });

  test('shows a payment error and does not confirm the order when initialization fails', async ({ page, checkout }) => {
    await page.route('**/api/payments/initialize', route => route.fulfill({
      status: 502,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Payment initialization failed' }),
    }));

    await checkout.submitPayment();
    await expect(page.getByText('Payment initialization failed')).toBeVisible();
    await expect(page.getByRole('heading', { name: /Order Confirmed/ })).toHaveCount(0);
    await expect(page).toHaveURL(/\/checkout\?bikeId=test-bike/);
  });

  test('confirms only after the callback verifies a successful payment', async ({ page, checkout, callback }) => {
    await page.route('**/api/payments/initialize', async route => {
      const request = route.request().postDataJSON();
      expect(request).toMatchObject({ orderId: 'order-123', amount: 100000, provider: 'mono' });
      await route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ data: { authorizationUrl: '/checkout/callback?reference=mono-ref' } }) });
    });
    await page.route('**/api/payments/verify?reference=mono-ref', route => route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ data: { status: 'success', amount: 100000, reference: 'mono-ref' } }),
    }));

    await checkout.submitPayment();
    await callback.expectSuccess();
  });

  test('shows the gateway verification error after redirect', async ({ page, checkout, callback }) => {
    await page.route('**/api/payments/initialize', route => route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ data: { authorizationUrl: '/checkout/callback?reference=mono-ref' } }),
    }));
    await page.route('**/api/payments/verify?reference=mono-ref', route => route.fulfill({
      status: 400, contentType: 'application/json',
      body: JSON.stringify({ error: 'Payment has not succeeded' }),
    }));

    await checkout.submitPayment();
    await callback.expectFailure();
    await expect(page.getByText('Payment has not succeeded')).toBeVisible();
  });
});
