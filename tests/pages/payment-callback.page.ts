import { expect, type Page } from '@playwright/test';
import { BasePage } from './base.page';

export class PaymentCallbackPage extends BasePage {
  constructor(page: Page) { super(page); }

  async expectSuccess(): Promise<void> {
    await expect(this.page.getByRole('heading', { name: 'Payment Successful!' })).toBeVisible();
  }

  async expectFailure(): Promise<void> {
    await expect(this.page.getByRole('heading', { name: /Payment Failed|Payment Could Not Be Verified/i })).toBeVisible();
  }
}
