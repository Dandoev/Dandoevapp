ALTER TABLE "vehicle_assets" ADD COLUMN "unlockBlockedAt" TIMESTAMP(3), ADD COLUMN "unlockBlockReason" TEXT, ADD COLUMN "rfidVerified" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "vehicle_cards" (
  "id" TEXT NOT NULL,
  "cardHash" TEXT NOT NULL,
  "riderId" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revokedAt" TIMESTAMP(3),
  CONSTRAINT "vehicle_cards_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "vehicle_cards_cardHash_key" ON "vehicle_cards"("cardHash");
CREATE INDEX "vehicle_cards_riderId_active_idx" ON "vehicle_cards"("riderId", "active");

CREATE TABLE "vehicle_card_events" (
  "id" TEXT NOT NULL,
  "assetId" TEXT,
  "cardHash" TEXT NOT NULL,
  "decision" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "observedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "vehicle_card_events_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "vehicle_card_events_cardHash_createdAt_idx" ON "vehicle_card_events"("cardHash", "createdAt" DESC);
CREATE INDEX "vehicle_card_events_assetId_createdAt_idx" ON "vehicle_card_events"("assetId", "createdAt" DESC);
ALTER TABLE "vehicle_card_events" ADD CONSTRAINT "vehicle_card_events_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "vehicle_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
