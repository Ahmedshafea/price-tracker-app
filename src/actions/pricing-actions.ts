// في ملف src/actions/product-actions.ts
"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { priceTrackingService } from "@/lib/price-tracking";

// Server Action لإضافة منتج رئيسي جديد
export async function addProductFromUrl(url: string, userId: string) {
    // الخطوة 1: إنشاء سجل في قاعدة البيانات بسرعة مع رسالة انتظار
    const initialProduct = await db.product.create({
        data: {
            name: "جاري استخراج البيانات...",
            productUrl: url,
            currency: "N/A",
            userId,
        },
    });
    // الخطوة 2: تشغيل عملية السحب في الخلفية بشكل غير متزامن
    priceTrackingService.scrapeAndSaveProduct(initialProduct.id, url);
    revalidatePath(`/dashboard`);
    return { success: true, productId: initialProduct.id };
}

// Action for adding a new competitor product
export async function addCompetitorAction(productId: string, formData: FormData) {
  const url = formData.get("url") as string;
  if (!url) return { success: false, error: "URL is required" };
  const competitor = await priceTrackingService.addCompetitorProduct(productId, url);
  if (competitor.success) {
    await priceTrackingService.applyPricingStrategies({ id: productId });
  }
  revalidatePath(`/dashboard/${productId}`);
}

// Action for tracking a single competitor
export async function trackCompetitorAction(competitorId: string) {
  const competitor = await db.competitorProduct.findUnique({
    where: { id: competitorId },
    include: { product: { include: { strategies: { include: { strategy: true } } } } },
  });
  if (!competitor) return;
  const result = await priceTrackingService.trackSingleCompetitor(competitor);
  if (result.priceChanged && competitor.product.strategies.length > 0) {
    await priceTrackingService.applyPricingStrategies(competitor.product);
    revalidatePath(`/dashboard/${competitor.productId}`);
  }
}

// Action for deleting a competitor
export async function deleteCompetitorAction(competitorId: string) {
  const competitor = await db.competitorProduct.findUnique({
    where: { id: competitorId },
    select: { productId: true },
  });
  if (!competitor) {
    return { success: false, error: "Competitor not found." };
  }
  const productId = competitor.productId;
  await priceTrackingService.deleteCompetitorProduct(competitorId);
  await priceTrackingService.applyPricingStrategies({ id: productId });
  revalidatePath(`/dashboard/${productId}`);
}

// Action to update product cost
export async function updateProductCostAction(productId: string, formData: FormData) {
  const cost = parseFloat(formData.get("cost") as string);
  if (isNaN(cost)) {
    return { success: false, error: "Invalid cost value." };
  }
  try {
    await db.product.update({
      where: { id: productId },
      data: { cost: cost },
    });
    await priceTrackingService.applyPricingStrategies({ id: productId });
    revalidatePath(`/dashboard/${productId}`);
    return { success: true };
  } catch (error) {
    console.error("Error updating product cost:", error);
    return { success: false, error: "Failed to update product cost." };
  }
}

// Action to delete a single product
export async function deleteProductAction(formData: FormData) {
  const productId = formData.get("productId") as string;
  try {
    await db.product.delete({ where: { id: productId } });
    revalidatePath("/dashboard");
  } catch (error) {
    console.error("Error deleting product:", error);
  }
}
// Action for creating a new strategy
export async function createStrategyAction(formData: FormData) {
  const name = formData.get("name") as string;
  const strategyType = formData.get("strategyType") as string;
  const competitorType = formData.get("competitorType") as string;
  const adjustmentType = formData.get("adjustmentType") as string;
  const adjustmentValue = parseFloat(formData.get("adjustmentValue") as string);

  if (!name || !strategyType || !competitorType || !adjustmentType || isNaN(adjustmentValue)) {
    return { success: false, error: "Missing required fields" };
  }

  const strategyConfig = {
    strategyType,
    competitorType,
    adjustmentType,
    adjustmentValue,
  };

  try {
    const newStrategy = await db.strategy.create({
      data: {
        name,
        type: strategyType,
        config: JSON.stringify(strategyConfig),
      },
    });

    revalidatePath("/dashboard/strategies");
    return { success: true, strategy: newStrategy };
  } catch (error) {
    console.error("Error creating new strategy:", error);
    return { success: false, error: "Failed to create new strategy." };
  }
}

// ⚠️ تم تصحيح هذه الدالة
export async function linkStrategyAction(productId: string, formData: FormData) {
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
    await db.productStrategy.create({
      data: {
        productId: productId,
        strategyId: strategyId,
        isActive: true,
        recommendedPrice: null, // سيتم تحديثه لاحقًا
      },
    });

    // ⚠️ استدعاء دالة الحساب بشكل منفصل
    await priceTrackingService.applyPricingStrategies({ id: productId });

    revalidatePath(`/dashboard/${productId}`);
    return { success: true };
  } catch (error) {
    console.error("Error linking strategy:", error);
    return { success: false, error: "Failed to link strategy." };
  }
}









