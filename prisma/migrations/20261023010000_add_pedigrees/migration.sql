-- CreateTable
CREATE TABLE "PedigreeNode" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "birdId" TEXT,
    "ring" TEXT,
    "name" TEXT,
    "sex" "Sex",
    "colour" TEXT,
    "strain" TEXT,
    "breeder" TEXT,
    "notes" TEXT,
    "sireId" TEXT,
    "damId" TEXT,
    "shareToken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PedigreeNode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PedigreeNode_birdId_key" ON "PedigreeNode"("birdId");

-- CreateIndex
CREATE UNIQUE INDEX "PedigreeNode_shareToken_key" ON "PedigreeNode"("shareToken");

-- CreateIndex
CREATE INDEX "PedigreeNode_ownerId_idx" ON "PedigreeNode"("ownerId");

-- AddForeignKey
ALTER TABLE "PedigreeNode" ADD CONSTRAINT "PedigreeNode_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PedigreeNode" ADD CONSTRAINT "PedigreeNode_birdId_fkey" FOREIGN KEY ("birdId") REFERENCES "Bird"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PedigreeNode" ADD CONSTRAINT "PedigreeNode_sireId_fkey" FOREIGN KEY ("sireId") REFERENCES "PedigreeNode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PedigreeNode" ADD CONSTRAINT "PedigreeNode_damId_fkey" FOREIGN KEY ("damId") REFERENCES "PedigreeNode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

