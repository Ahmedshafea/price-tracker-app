-- CreateTable
CREATE TABLE "public"."Strategy" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "config" TEXT NOT NULL DEFAULT '{}',

    CONSTRAINT "Strategy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ProductStrategy" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "strategyId" TEXT NOT NULL,
    "recommendedPrice" DECIMAL(10,2),
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ProductStrategy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Strategy_type_key" ON "public"."Strategy"("type");

-- AddForeignKey
ALTER TABLE "public"."ProductStrategy" ADD CONSTRAINT "ProductStrategy_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProductStrategy" ADD CONSTRAINT "ProductStrategy_strategyId_fkey" FOREIGN KEY ("strategyId") REFERENCES "public"."Strategy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
