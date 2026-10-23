-- CreateEnum
CREATE TYPE "RaceType" AS ENUM ('OLD_BIRD', 'YOUNG_BIRD');

-- CreateEnum
CREATE TYPE "RaceStatus" AS ENUM ('PLACED', 'CLOCKED', 'NOT_CLOCKED', 'LATE', 'LOST');

-- CreateTable
CREATE TABLE "RaceResult" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "birdId" TEXT NOT NULL,
    "raceName" TEXT NOT NULL,
    "raceDate" TIMESTAMP(3) NOT NULL,
    "organisation" TEXT,
    "raceType" "RaceType",
    "status" "RaceStatus" NOT NULL DEFAULT 'PLACED',
    "liberationTime" TEXT,
    "clockTime" TEXT,
    "clockDayOffset" INTEGER NOT NULL DEFAULT 0,
    "distanceYards" INTEGER,
    "clubPosition" INTEGER,
    "clubBirds" INTEGER,
    "clubLofts" INTEGER,
    "fedPosition" INTEGER,
    "fedBirds" INTEGER,
    "fedLofts" INTEGER,
    "openPosition" INTEGER,
    "openBirds" INTEGER,
    "openLofts" INTEGER,
    "points" DOUBLE PRECISION,
    "prizePence" INTEGER,
    "weather" TEXT,
    "wind" TEXT,
    "notes" TEXT,
    "showOnPedigree" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RaceResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RaceResult_birdId_idx" ON "RaceResult"("birdId");

-- CreateIndex
CREATE INDEX "RaceResult_ownerId_idx" ON "RaceResult"("ownerId");

-- AddForeignKey
ALTER TABLE "RaceResult" ADD CONSTRAINT "RaceResult_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RaceResult" ADD CONSTRAINT "RaceResult_birdId_fkey" FOREIGN KEY ("birdId") REFERENCES "Bird"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

