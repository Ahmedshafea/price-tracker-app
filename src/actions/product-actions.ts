"use server";


import { db } from "@/lib/db";
import { priceTrackingService } from "@/lib/price-tracking";
import { revalidatePath } from "next/cache";


export async function addNewProduct(url: string, userId: string) {
  try {
    const result = await priceTrackingService.addProductFromUrl(url, userId);
    if (result.success) {
      revalidatePath("/products");
      return { success: true };
    } else {
      console.error(result.error);
      return { success: false, error: result.error };
    }
  } catch (error) {
    console.error("Error adding product from URL:", error);
    return { success: false, error: "An unexpected error occurred." };
  }
}

// دالة خادم لحذف منتج واحد
export async function deleteProduct(productId: string) {
  try {
    await db.product.delete({ where: { id: productId } });
    revalidatePath("/products");
    return { success: true };
  } catch (error) {
    console.error("Error deleting product:", error);
    return { success: false, error: "Failed to delete product." };
  }
}

// دالة خادم لحذف عدة منتجات
export async function deleteMultipleProducts(productIds: string[]) {
  try {
    await db.product.deleteMany({ where: { id: { in: productIds } } });
    revalidatePath("/products");
    return { success: true };
  } catch (error) {
    console.error("Error deleting multiple products:", error);
    return { success: false, error: "Failed to delete products." };
  }
}

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

  revalidatePath(`/products`);
  return { success: true, productId: initialProduct.id };
}

// Server Action لإضافة منتج منافس
export async function addCompetitorAction(productId: string, formData: FormData) {
  const url = formData.get("url") as string;
  if (!url) return { success: false, error: "URL is required" };

  // التحقق مما إذا كان المنافس موجودًا بالفعل
  const existingCompetitor = await db.competitorProduct.findUnique({ where: { url } });

  if (existingCompetitor) {
    // إذا كان موجودًا، نحدثه في الخلفية فقط
    priceTrackingService.scrapeAndSaveCompetitor(existingCompetitor.id, url);
    revalidatePath(`/products/${productId}`);
    return { success: true, competitorId: existingCompetitor.id };
  }

  // الخطوة 1: إنشاء سجل فارغ في قاعدة البيانات
  const initialCompetitor = await db.competitorProduct.create({
    data: {
      name: "جاري استخراج البيانات...",
      url: url,
      currency: "N/A",
      productId,
    },
  });

  // الخطوة 2: تشغيل عملية السحب في الخلفية بشكل غير متزامن
  priceTrackingService.scrapeAndSaveCompetitor(initialCompetitor.id, url);

  revalidatePath(`/products/${productId}`);
  return { success: true, competitorId: initialCompetitor.id };
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
  
  await priceTrackingService.applyPricingStrategies({ id: productId });
  
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
    
    await priceTrackingService.applyPricingStrategies({ id: productId });

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