import { expect, type Page } from '@playwright/test';
import { BasePage } from './base.page';

export class CheckoutPage extends BasePage {
  constructor(page: Page) { super(page); }

  async goto(): Promise<void> {
    await this.navigate('/checkout?bikeId=test-bike');
    await expect(this.page.getByRole('heading', { name: 'Buyer & Delivery Information' })).toBeVisible();
  }

  async enterBuyerAndChoosePickup(): Promise<void> {
    await this.page.getByPlaceholder('Solomon').fill('Ada');
    await this.page.getByPlaceholder('Dunu').fill('Okafor');
    await this.page.getByPlaceholder('you@example.com').fill('ada@example.com');
    await this.page.getByPlaceholder('0803 123 4567').fill('08031234567');
    await this.page.getByRole('button', { name: /Lagos Hub Pickup/ }).click();
    await this.page.getByRole('button', { name: 'Continue to Payment Method' }).click();
    await expect(this.page.getByRole('heading', { name: 'Select Payment Channel' })).toBeVisible();
  }

  async submitPayment(): Promise<void> {
    await this.page.getByRole('button', { name: /Complete Payment/ }).click();
  }
}
