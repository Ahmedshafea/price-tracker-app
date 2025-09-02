"use server";

import { db } from "@/lib/db";
import { pricingStrategyService } from "@/lib/pricing-strategy";
import { revalidatePath } from "next/cache";

// Action for creating a new strategy
export async function createStrategyAction(formData: FormData) {
  const name = formData.get("name") as string;
  const strategyType = formData.get("strategyType") as string;
  const competitorType = formData.get("competitorType") as string;
  const adjustmentType = formData.get("adjustmentType") as string;
  const adjustmentValue = parseFloat(formData.get("adjustmentValue") as string);
  // ⚠️ جلب قيم الشروط الجديدة
  const minPriceType = formData.get("minPriceType") as string;
  const minPriceValue = parseFloat(formData.get("minPriceValue") as string);
  const maxPriceType = formData.get("maxPriceType") as string;
  const maxPriceValue = parseFloat(formData.get("maxPriceValue") as string);

  if (!name || !strategyType || !competitorType || !adjustmentType || isNaN(adjustmentValue)) {
    return { success: false, error: "Missing required fields" };
  }

  // ⚠️ تحديث كائن الإعدادات
  const strategyConfig = {
    strategyType,
    competitorType,
    adjustmentType,
    adjustmentValue,
    minPriceConstraint: minPriceValue ? { type: minPriceType, value: minPriceValue } : null,
    maxPriceConstraint: maxPriceValue ? { type: maxPriceType, value: maxPriceValue } : null,
  };

  try {
    const newStrategy = await db.strategy.create({
      data: {
        name,
        type: strategyType,
        config: JSON.stringify(strategyConfig),
      },
    });

    revalidatePath("/products/strategies");
    return { success: true, strategy: newStrategy };
  } catch (error) {
    console.error("Error creating new strategy:", error);
    return { success: false, error: "Failed to create new strategy." };
  }
}


// Action for linking an existing strategy to a product
// ⚠️ The `try...catch` block is now correctly placed inside the function.
export async function linkStrategyAction(formData: FormData) {
  const productId = formData.get("productId") as string;
  const strategyId = formData.get("strategyId") as string;

  if (!strategyId || !productId) {
    return { success: false, error: "Missing required fields" };
  }

  try {
    // 1. إلغاء تفعيل أي استراتيجية نشطة حاليًا للمنتج
    await db.productStrategy.updateMany({
      where: { productId: productId },
      data: { isActive: false, recommendedPrice: null },
    });

    // 2. تفعيل الاستراتيجية المختارة
    const product = await db.product.findUnique({
      where: { id: productId },
      include: { competitors: true },
    });
    console.log("Product data retrieved:", product); // ⚠️  عرض بيانات المنتج

    if (!product) {
      return { success: false, error: "Product not found." };
    }

    const strategy = await db.strategy.findUnique({
      where: { id: strategyId },
    });

    if (!strategy) {
      return { success: false, error: "Strategy not found." };
    }

    const competitorsWithPrices = product.competitors.filter(c => c.currentPrice !== null);

    console.log("Competitors with prices:", competitorsWithPrices); // ⚠️ عرض المنافسين

    let recommendedPrice = null;

    if (product.currentPrice !== null && competitorsWithPrices.length > 0) {
        const strategyConfig = JSON.parse(strategy.config);
        console.log("Strategy config:", strategyConfig); // ⚠️ عرض إعدادات الاستراتيجية

        const recommendedPriceResult = pricingStrategyService.calculateRecommendedPrice(
            { price: product.currentPrice, currency: product.currency },
            competitorsWithPrices,
            strategyConfig
        );
        console.log("Recommended price result:", recommendedPriceResult); // ⚠️ عرض النتيجة

        recommendedPrice = recommendedPriceResult?.recommendedPrice;
    }

    await db.productStrategy.create({
      data: {
        productId: productId,
        strategyId: strategyId,
        isActive: true,
        recommendedPrice: recommendedPrice,
      },
    });

    revalidatePath(`/products/${productId}`);
    return { success: true };
  } catch (error) {
    console.error("Error linking strategy:", error);
    return { success: false, error: "Failed to link strategy." };
  }
}






