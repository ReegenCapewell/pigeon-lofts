-- CreateEnum
CREATE TYPE "MedicalType" AS ENUM ('VACCINATION', 'TREATMENT', 'ILLNESS', 'HEALTH_CHECK');

-- CreateTable
CREATE TABLE "MedicalRecord" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "birdId" TEXT NOT NULL,
    "type" "MedicalType" NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "nextDueDate" TIMESTAMP(3),
    "reminderDone" BOOLEAN NOT NULL DEFAULT false,
    "category" TEXT,
    "title" TEXT,
    "product" TEXT,
    "batchNumber" TEXT,
    "dose" TEXT,
    "method" TEXT,
    "vet" TEXT,
    "outcome" TEXT,
    "weightGrams" INTEGER,
    "condition" TEXT,
    "notes" TEXT,
    "batchId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicalRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MedicalRecord_birdId_idx" ON "MedicalRecord"("birdId");

-- CreateIndex
CREATE INDEX "MedicalRecord_ownerId_nextDueDate_idx" ON "MedicalRecord"("ownerId", "nextDueDate");

-- CreateIndex
CREATE INDEX "MedicalRecord_batchId_idx" ON "MedicalRecord"("batchId");

-- AddForeignKey
ALTER TABLE "MedicalRecord" ADD CONSTRAINT "MedicalRecord_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalRecord" ADD CONSTRAINT "MedicalRecord_birdId_fkey" FOREIGN KEY ("birdId") REFERENCES "Bird"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

