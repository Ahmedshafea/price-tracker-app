/*
  Warnings:

  - You are about to drop the column `recommendedPrice` on the `PriceHistory` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."PriceHistory" DROP COLUMN "recommendedPrice";

-- AlterTable
ALTER TABLE "public"."ProductStrategy" ADD COLUMN     "recommendedPrice" DECIMAL(10,2);
