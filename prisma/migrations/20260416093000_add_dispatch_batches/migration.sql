CREATE TYPE "DispatchBatchStatus" AS ENUM (
  'PENDING_ASSIGNMENT',
  'ASSIGNED',
  'PICKED_UP',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'FAILED',
  'CANCELLED'
);

CREATE TABLE "DispatchBatch" (
  "id" TEXT NOT NULL,
  "batchCode" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "operatorUserId" TEXT,
  "status" "DispatchBatchStatus" NOT NULL DEFAULT 'PENDING_ASSIGNMENT',
  "destinationSnapshotJson" JSONB,
  "totalAmountKobo" INTEGER NOT NULL,
  "notes" TEXT,
  "assignedAt" TIMESTAMP(3),
  "pickedUpAt" TIMESTAMP(3),
  "deliveredAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "DispatchBatch_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "DeliveryJob"
ADD COLUMN "dispatchBatchId" TEXT;

CREATE UNIQUE INDEX "DispatchBatch_batchCode_key" ON "DispatchBatch"("batchCode");
CREATE INDEX "DispatchBatch_orderId_status_idx" ON "DispatchBatch"("orderId", "status");
CREATE INDEX "DispatchBatch_operatorUserId_status_idx" ON "DispatchBatch"("operatorUserId", "status");
CREATE INDEX "DeliveryJob_dispatchBatchId_idx" ON "DeliveryJob"("dispatchBatchId");

ALTER TABLE "DispatchBatch"
ADD CONSTRAINT "DispatchBatch_orderId_fkey"
FOREIGN KEY ("orderId") REFERENCES "Order"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DispatchBatch"
ADD CONSTRAINT "DispatchBatch_operatorUserId_fkey"
FOREIGN KEY ("operatorUserId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "DeliveryJob"
ADD CONSTRAINT "DeliveryJob_dispatchBatchId_fkey"
FOREIGN KEY ("dispatchBatchId") REFERENCES "DispatchBatch"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
