// في ملف src/actions/product-actions.ts
"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { priceTrackingService } from "@/lib/price-tracking";

// Server Action لإضافة منتج رئيسي جديد
export async function addProductFromUrl(url: string, userId: string) {
    try {
        const result = await priceTrackingService.addProductFromUrl(url, userId);
        if (result.success) {
            revalidatePath("/products");
            return { success: true, productId: result.products?.[0]?.id };
        } else {
            console.error(result.error);
            return { success: false, error: result.error };
        }
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error("Error adding product from URL:", errorMessage);
        return { success: false, error: "An unexpected error occurred." };
    }
}

// Action for adding a new competitor product
export async function addCompetitorAction(productId: string, formData: FormData) {
  const url = formData.get("url") as string;
  if (!url) return { success: false, error: "URL is required" };
  const competitor = await priceTrackingService.addCompetitorProduct(productId, url);
  if (competitor.success) {
    await priceTrackingService.applyPricingStrategies({ 
      id: productId,
      currentPrice: null,
      currency: 'USD',
      cost: null
    });
  }
  revalidatePath(`/products/${productId}`);
  return competitor;
}

// Action for tracking a single competitor
export async function trackCompetitorAction(competitorId: string) {
  const competitor = await db.competitorProduct.findUnique({
    where: { id: competitorId },
    include: { product: { include: { strategies: { include: { strategy: true } } } } },
  });
  if (!competitor) return;
  const result = await priceTrackingService.trackSingleCompetitor({
    id: competitor.id,
    url: competitor.url,
    productId: competitor.productId,
    currentPrice: competitor.currentPrice?.toNumber() || null,
    name: competitor.name
  });
  if (result.priceChanged && competitor.product.strategies.length > 0) {
    await priceTrackingService.applyPricingStrategies({
      id: competitor.product.id,
      currentPrice: competitor.product.currentPrice?.toNumber() || null,
      currency: competitor.product.currency,
      cost: competitor.product.cost?.toNumber() || null
    });
    revalidatePath(`/products/${competitor.productId}`);
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
  await priceTrackingService.applyPricingStrategies({ 
    id: productId,
    currentPrice: null,
    currency: 'USD',
    cost: null
  });
  revalidatePath(`/products/${productId}`);
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
    
    const product = await db.product.findUnique({
      where: { id: productId },
      select: { currentPrice: true, currency: true }
    });
    
    await priceTrackingService.applyPricingStrategies({ 
      id: productId,
      currentPrice: product?.currentPrice?.toNumber() || null,
      currency: product?.currency || 'USD',
      cost: cost
    });
    
    revalidatePath(`/products/${productId}`);
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
    revalidatePath("/products");
    return { success: true };
  } catch (error) {
    console.error("Error deleting product:", error);
    return { success: false, error: "Failed to delete product." };
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

    revalidatePath("/products/strategies");
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

    const product = await db.product.findUnique({
      where: { id: productId },
      select: { currentPrice: true, currency: true, cost: true }
    });
    
    // ⚠️ استدعاء دالة الحساب بشكل منفصل
    await priceTrackingService.applyPricingStrategies({ 
      id: productId,
      currentPrice: product?.currentPrice?.toNumber() || null,
      currency: product?.currency || 'USD',
      cost: product?.cost?.toNumber() || null
    });

    revalidatePath(`/products/${productId}`);
    return { success: true };
  } catch (error) {
    console.error("Error linking strategy:", error);
    return { success: false, error: "Failed to link strategy." };
  }
}