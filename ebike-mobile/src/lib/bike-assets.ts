// ============================================================
// DandoEv Mobile — Bundled Local Asset Registry
// Resolves static image assets cleanly across Web, Android & iOS
// ============================================================

export const BRAND_ASSETS = {
  logo: require('../../assets/logo.png'),
  icon: require('../../assets/icon.png'),
  emblem: require('../../assets/android-icon-foreground.png'),
};

export const BIKE_ASSETS: Record<string, any> = {
  'bike-g90': require('../../assets/bikes/DandoEv_G90-removebg-preview.png'),
  'bike-x5': require('../../assets/bikes/DandoEv_X5-removebg-preview.png'),
  'bike-x6': require('../../assets/bikes/DandoEV_X6-removebg-preview.png'),
  'bike-x4': require('../../assets/bikes/DandoEv_X4-removebg-preview.png'),
  'bike-x5-lite': require('../../assets/bikes/DandoEv_X5_Lite-removebg-preview.png'),
  'bike-x2': require('../../assets/bikes/DandoEv_X2-removebg-preview.png'),
  'bike-g90-lite': require('../../assets/bikes/DandoEv_G90_Lite-removebg-preview.png'),
  'battery-48v-25ah': require('../../assets/batteries/0a1ca434-12a4-4dd2-9df0-0f491053101b.jpg'),
  'battery-48v-20ah': require('../../assets/batteries/0a6fa4c4-99db-4149-9f4a-a0b7b83b698c.jpg'),
  'battery-48v-15ah': require('../../assets/batteries/6ca5def3-b4ac-4034-bc77-e14b4b2b90d3.jpg'),
  'battery-36v-15ah': require('../../assets/batteries/6ca5def3-b4ac-4034-bc77-e14b4b2b90d3.jpg'),
  'battery-36v-10ah': require('../../assets/batteries/0a1ca434-12a4-4dd2-9df0-0f491053101b.jpg'),
  'charger-fast-54v': require('../../assets/batteries/6ca5def3-b4ac-4034-bc77-e14b4b2b90d3.jpg'),
  'charger-standard-42v': require('../../assets/batteries/0a6fa4c4-99db-4149-9f4a-a0b7b83b698c.jpg'),
};

export function getBikeAsset(idOrModel: string): any {
  return getProductAsset(idOrModel);
}

export function getProductAsset(idOrModel: string): any {
  if (BIKE_ASSETS[idOrModel]) return BIKE_ASSETS[idOrModel];
  const lower = idOrModel.toLowerCase();
  if (lower.includes('25ah')) return BIKE_ASSETS['battery-48v-25ah'];
  if (lower.includes('20ah')) return BIKE_ASSETS['battery-48v-20ah'];
  if (lower.includes('36v') || lower.includes('36 v')) return BIKE_ASSETS['battery-36v-15ah'];
  if (lower.includes('15ah')) return BIKE_ASSETS['battery-48v-15ah'];
  if (lower.includes('battery')) return BIKE_ASSETS['battery-48v-20ah'];
  if (lower.includes('charger') && lower.includes('fast')) return BIKE_ASSETS['charger-fast-54v'];
  if (lower.includes('charger')) return BIKE_ASSETS['charger-standard-42v'];
  if (lower.includes('g90') && lower.includes('lite')) return BIKE_ASSETS['bike-g90-lite'];
  if (lower.includes('g90')) return BIKE_ASSETS['bike-g90'];
  if (lower.includes('x5') && lower.includes('lite')) return BIKE_ASSETS['bike-x5-lite'];
  if (lower.includes('x5')) return BIKE_ASSETS['bike-x5'];
  if (lower.includes('x6')) return BIKE_ASSETS['bike-x6'];
  if (lower.includes('x4')) return BIKE_ASSETS['bike-x4'];
  if (lower.includes('x2')) return BIKE_ASSETS['bike-x2'];
  return BIKE_ASSETS['bike-g90'];
}
