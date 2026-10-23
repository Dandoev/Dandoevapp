import { test as base, expect } from '@playwright/test';
import { CheckoutPage } from '../pages/checkout.page';
import { PaymentCallbackPage } from '../pages/payment-callback.page';

type Fixtures = {
  checkout: CheckoutPage;
  callback: PaymentCallbackPage;
};

export const test = base.extend<Fixtures>({
  checkout: async ({ page }, provide) => {
    await page.context().addCookies([{
      name: 'token', value: 'playwright-session', url: 'http://127.0.0.1:3100',
    }]);
    await page.route('**/api/bikes/test-bike', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: {
        id: 'test-bike', name: 'Test Bike', category: 'Commuter', price: 100000,
        images: [], availability: 'in_stock', stockQuantity: 1,
      } }),
    }));
    await provide(new CheckoutPage(page));
  },
  callback: async ({ page }, provide) => provide(new PaymentCallbackPage(page)),
});

export { expect };
