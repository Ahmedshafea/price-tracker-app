/*
  Warnings:

  - A unique constraint covering the columns `[type]` on the table `Strategy` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."Product" ALTER COLUMN "cost" SET DEFAULT 0.0;

-- CreateIndex
CREATE UNIQUE INDEX "Strategy_type_key" ON "public"."Strategy"("type");
