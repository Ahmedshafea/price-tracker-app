// في ملف src/app/products/page.tsx

import { db } from "@/lib/db";
import ProductsClient from "./productsClient";

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
  const toNumberSafe = (v: unknown): number | null => {
    if (v == null) return null;
    // handle Prisma Decimal instances (have .toNumber())
    if (typeof (v as any)?.toNumber === "function") return (v as any).toNumber();
    const n = Number(v as any);
    return Number.isFinite(n) ? n : null;
  };

  const sanitizedProducts = products.map(({ strategies = [], competitors = [], currentPrice, cost, ...rest }) => {
    const recommendedPrice = toNumberSafe(strategies[0]?.recommendedPrice);
    const strategyName = strategies[0]?.strategy?.name ?? "N/A";

    return {
      ...rest,
      currentPrice: toNumberSafe(currentPrice),
      cost: toNumberSafe(cost),
      competitors: competitors.map((c) => ({
        ...c,
        currentPrice: toNumberSafe(c.currentPrice),
      })),
      strategies: strategies.map((s) => ({
        ...s,
        recommendedPrice: toNumberSafe(s.recommendedPrice),
      })),
      // keep a convenient top-level value if you used it earlier
      recommendedPrice,
      strategyName,
    };
  });

  return <ProductsClient products={sanitizedProducts} />;
}