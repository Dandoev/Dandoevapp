CREATE TABLE "vehicle_maintenance_cases" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "resolution" TEXT,
    "createdBy" TEXT NOT NULL,
    "closedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "vehicle_maintenance_cases_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "vehicle_maintenance_cases_assetId_status_createdAt_idx" ON "vehicle_maintenance_cases"("assetId", "status", "createdAt" DESC);

ALTER TABLE "vehicle_maintenance_cases" ADD CONSTRAINT "vehicle_maintenance_cases_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "vehicle_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
