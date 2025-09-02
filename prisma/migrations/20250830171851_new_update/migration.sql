/*
  Warnings:

  - You are about to drop the `ProductStrategy` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Strategy` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."ProductStrategy" DROP CONSTRAINT "ProductStrategy_productId_fkey";

-- DropForeignKey
ALTER TABLE "public"."ProductStrategy" DROP CONSTRAINT "ProductStrategy_strategyId_fkey";

-- AlterTable
ALTER TABLE "public"."Product" ADD COLUMN     "cost" DECIMAL(10,2);

-- DropTable
DROP TABLE "public"."ProductStrategy";

-- DropTable
DROP TABLE "public"."Strategy";
