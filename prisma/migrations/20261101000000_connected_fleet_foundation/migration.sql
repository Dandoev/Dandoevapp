CREATE TABLE "vehicle_assets" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "bikeId" TEXT NOT NULL,
  "serialNumber" TEXT NOT NULL,
  "imei" TEXT,
  "bleMac" TEXT,
  "firmwareVersion" TEXT,
  "status" TEXT NOT NULL DEFAULT 'inventory',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "vehicle_assets_bikeId_fkey" FOREIGN KEY ("bikeId") REFERENCES "bikes"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "vehicle_assets_serialNumber_key" ON "vehicle_assets"("serialNumber");
CREATE UNIQUE INDEX "vehicle_assets_imei_key" ON "vehicle_assets"("imei");
CREATE UNIQUE INDEX "vehicle_assets_bleMac_key" ON "vehicle_assets"("bleMac");
CREATE INDEX "vehicle_assets_bikeId_status_idx" ON "vehicle_assets"("bikeId", "status");

CREATE TABLE "vehicle_assignments" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "assetId" TEXT NOT NULL,
  "riderId" TEXT NOT NULL,
  "loanId" TEXT,
  "orderId" TEXT,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endedAt" TIMESTAMP(3),
  CONSTRAINT "vehicle_assignments_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "vehicle_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "vehicle_assignments_assetId_endedAt_idx" ON "vehicle_assignments"("assetId", "endedAt");
CREATE INDEX "vehicle_assignments_riderId_endedAt_idx" ON "vehicle_assignments"("riderId", "endedAt");
CREATE UNIQUE INDEX "vehicle_assignments_active_asset_key" ON "vehicle_assignments"("assetId") WHERE "endedAt" IS NULL;

CREATE TABLE "swap_stations" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "address" TEXT NOT NULL,
  "latitude" DECIMAL(10,7) NOT NULL,
  "longitude" DECIMAL(10,7) NOT NULL,
  "hours" TEXT NOT NULL,
  "batteryTypes" TEXT[] NOT NULL,
  "availableBatteries" INTEGER NOT NULL DEFAULT 0,
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "swap_stations_enabled_idx" ON "swap_stations"("enabled");

CREATE TABLE "vehicle_positions" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "assetId" TEXT NOT NULL,
  "latitude" DECIMAL(10,7) NOT NULL,
  "longitude" DECIMAL(10,7) NOT NULL,
  "satellites" INTEGER,
  "hdop" DECIMAL(6,2),
  "estimated" BOOLEAN NOT NULL DEFAULT false,
  "observedAt" TIMESTAMP(3) NOT NULL,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "source" TEXT NOT NULL DEFAULT 'omni-device',
  CONSTRAINT "vehicle_positions_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "vehicle_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "vehicle_positions_assetId_observedAt_idx" ON "vehicle_positions"("assetId", "observedAt" DESC);
CREATE UNIQUE INDEX "vehicle_positions_assetId_observedAt_key" ON "vehicle_positions"("assetId", "observedAt");
