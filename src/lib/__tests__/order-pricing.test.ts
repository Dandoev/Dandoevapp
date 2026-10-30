import { describe, expect, it } from 'vitest';
import { calculateOutrightOrderTotal } from '../order-pricing';

describe('outright order pricing', () => {
  it('uses the same insured total expected by secure payment initialization', () => {
    expect(calculateOutrightOrderTotal({ bikeTotal: 1_700_000, accessoriesTotal: 0, deliveryType: 'delivery_lagos' }))
      .toEqual({ subtotal: 1_700_000, insuranceFee: 170_000, deliveryFee: 20_000, totalAmount: 1_890_000 });
  });

  it('includes accessories in 10% insurance and supports free pickup', () => {
    expect(calculateOutrightOrderTotal({ bikeTotal: 0, accessoriesTotal: 60_000, deliveryType: 'pickup' }))
      .toEqual({ subtotal: 60_000, insuranceFee: 6_000, deliveryFee: 0, totalAmount: 66_000 });
  });
});
