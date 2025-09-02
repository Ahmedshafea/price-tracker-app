// في ملف src/app/products/page.tsx

import { db } from "@/lib/db";
import DashboardClient from "./productsClient";

export default async function DashboardPage() {
  const userId = "example_user_id";

  const products = await db.product.findMany({
    where: { userId },
    include: {
      competitors: true,
      strategies: {
        include: {
          strategy: true,
        },
        where: { isActive: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // ⚠️ تحويل جميع قيم Decimal إلى Number قبل تمريرها
  const sanitizedProducts = products.map((product) => {
    const recommendedPrice = product.strategies[0]?.recommendedPrice?.toNumber() || null;
    const strategyName = product.strategies[0]?.strategy.name || "N/A";
    
    // sanitizing nested Decimal values in competitors
    const sanitizedCompetitors = product.competitors.map(c => ({
      ...c,
      currentPrice: c.currentPrice?.toNumber() || null
    }));

    return {
      ...product,
      currentPrice: product.currentPrice?.toNumber() || null,
      cost: product.cost?.toNumber() || null,
      competitors: sanitizedCompetitors,
      recommendedPrice,
      strategyName,
    };
  });

  return <DashboardClient products={sanitizedProducts} />;
}