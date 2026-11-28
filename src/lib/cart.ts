export type CartItem = { bikeId: string; name: string; price: number; image?: string; quantity: number };

const KEY = 'dandoev-cart';

export function readCart(): CartItem[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(window.localStorage.getItem(KEY) || '[]'); } catch { return []; }
}

export function addToCart(item: Omit<CartItem, 'quantity'>, quantity = 1): CartItem[] {
  const cart = readCart();
  const existing = cart.find((entry) => entry.bikeId === item.bikeId);
  if (existing) existing.quantity += quantity;
  else cart.push({ ...item, quantity });
  window.localStorage.setItem(KEY, JSON.stringify(cart));
  window.dispatchEvent(new CustomEvent('dandoev-cart-updated'));
  return cart;
}

export function removeFromCart(bikeId: string): CartItem[] {
  const cart = readCart().filter((item) => item.bikeId !== bikeId);
  window.localStorage.setItem(KEY, JSON.stringify(cart));
  window.dispatchEvent(new CustomEvent('dandoev-cart-updated'));
  return cart;
}
