/*
  Warnings:

  - Added the required column `ownerId` to the `Bird` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Bird" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "ownerId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "Bird" ADD CONSTRAINT "Bird_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
