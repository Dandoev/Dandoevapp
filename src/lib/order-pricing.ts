export const OUTRIGHT_INSURANCE_RATE = 0.1;

export function calculateOutrightOrderTotal(input: {
  bikeTotal: number;
  accessoriesTotal: number;
  deliveryType: 'pickup' | 'delivery_lagos' | 'delivery_outside';
}) {
  const subtotal = input.bikeTotal + input.accessoriesTotal;
  const insuranceFee = Math.round(subtotal * OUTRIGHT_INSURANCE_RATE);
  const deliveryFee = input.deliveryType === 'pickup' ? 0 : input.deliveryType === 'delivery_lagos' ? 20_000 : 50_000;
  return { subtotal, insuranceFee, deliveryFee, totalAmount: subtotal + insuranceFee + deliveryFee };
}
