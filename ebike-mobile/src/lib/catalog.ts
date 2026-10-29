import { MobileApi } from './api';
import type { DemoProduct } from './demo-data';

export async function getLiveBikes(): Promise<DemoProduct[]> {
  const result = await MobileApi.getBikes();
  return (result.data ?? []).map((bike) => ({
    id: bike.id,
    type: 'bike' as const,
    name: bike.name,
    brand: bike.brand || 'DandoEv',
    model: bike.model || '',
    category: bike.category || 'E-Bikes',
    price: Number(bike.price),
    weeklyRate: 0,
    dailyRate: 0,
    image: bike.model || bike.name,
    images: bike.images || [],
    motorPower: bike.motorPower || undefined,
    batteryCapacity: bike.batteryCapacity || undefined,
    rangeKm: bike.rangeKm || undefined,
    topSpeed: bike.topSpeed || undefined,
    warranty: bike.warranty || '',
    rating: Number(bike.rating || 0),
    reviewCount: bike.reviewCount || 0,
    inStock: bike.stockQuantity > 0,
    features: bike.features || [],
    description: bike.description || '',
  }));
}
