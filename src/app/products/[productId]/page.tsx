// في ملف app/products/[productId]/page.tsx
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { addCompetitorAction, trackCompetitorAction, updateProductCostAction } from "@/actions/product-actions";
import { linkStrategyAction } from "@/actions/pricing-actions";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, TrendingUp, Package, DollarSign, BarChart3 } from "lucide-react";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import CompetitorsSection from "./CompetitorsSection";
import StrategyForm from "./StrategyForm";

// Client component to handle the cost update form
function CostUpdateForm({ productId, initialCost }: { productId: string; initialCost: number | null }) {
  async function handleUpdateCost(formData: FormData) {
    "use server";
    await updateProductCostAction(productId, formData);
  }

  return (
    <form action={handleUpdateCost} className="flex gap-2 mt-3">
      <Input
        type="number"
        name="cost"
        defaultValue={initialCost?.toFixed(2) || ''}
        step="0.01"
        placeholder="Enter cost"
        className="h-9 text-sm"
      />
      <Button type="submit" size="sm" className="h-9">
        <Save className="h-4 w-4" />
      </Button>
    </form>
  );
}

export default async function ProductPage({ params }: { params: { productId: string } }) {
  const { productId } = await params;
  const product = await db.product.findUnique({
    where: { id: productId },
    include: {
      competitors: {
        orderBy: { createdAt: "asc" },
        include: { product: true },
      },
      strategies: {
        include: { strategy: true },
        where: { isActive: true },
      },
    },
  });
  const allStrategies = await db.strategy.findMany();

  if (!product) {
    notFound();
  }

  const sanitizedProduct = {
    ...product,
    currentPrice: product.currentPrice?.toNumber() ?? null,
    cost: product.cost?.toNumber() ?? null,
    competitors: product.competitors.map((c) => ({
      ...c,
      currentPrice: c.currentPrice?.toNumber() ?? null,
      product: {
        ...c.product,
        currentPrice: c.product.currentPrice?.toNumber() ?? null,
        cost: c.product.cost?.toNumber() ?? null,
      },
    })),
    // Ensure product.strategy (productStrategy) Decimal fields are converted
    strategies: product.strategies.map((ps) => ({
      // copy primitive fields
      id: ps.id,
      productId: ps.productId,
      strategyId: ps.strategyId,
      isActive: ps.isActive,
      // convert Decimal to number (or null)
      recommendedPrice: ps.recommendedPrice?.toNumber() ?? null,
      // preserve nested strategy object (assumed serializable)
      strategy: ps.strategy,
      createdAt: ps.createdAt,
      updatedAt: ps.updatedAt,
    })),
  };
  
  const lowestPrice = sanitizedProduct.competitors.reduce((min, c) => c.currentPrice !== null && c.currentPrice < min ? c.currentPrice : min, Infinity);
  const highestPrice = sanitizedProduct.competitors.reduce((max, c) => c.currentPrice !== null && c.currentPrice > max ? c.currentPrice : max, -Infinity);
  const recommendedPrice = sanitizedProduct.strategies[0]?.recommendedPrice;

  const handleAddCompetitor = addCompetitorAction.bind(null, productId);
  const handleTrackCompetitor = trackCompetitorAction;
  const handleUpdateCost = updateProductCostAction.bind(null, productId);
  
  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Header Section */}
      <div className="mb-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div className="flex items-center gap-6">
            {sanitizedProduct.imageUrl && (
              <div className="relative w-24 h-24 rounded-xl overflow-hidden border border-gray-200 shadow-sm">
                <Image 
                  src={sanitizedProduct.imageUrl} 
                  alt={sanitizedProduct.name} 
                  fill 
                  className="object-cover"
                />
              </div>
            )}
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{sanitizedProduct.name}</h1>
              <p className="text-lg text-gray-600 mt-1">
                Your Price: <span className="font-semibold text-indigo-600">
                  {sanitizedProduct.currentPrice?.toFixed(2) || 'N/A'} {sanitizedProduct.currency}
                </span>
              </p>
            </div>
          </div>
          
          <div className="flex gap-3">
            <Link href={`/products/products/${productId}/edit`}>
              <Button variant="outline">Edit Product</Button>
            </Link>
            <Link href={`/products/products`}>
              <Button variant="ghost">Back to Products</Button>
            </Link>
          </div>
        </div>
        
        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-l-4 border-l-indigo-500 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Recommended Price</p>
                  <p className={`text-2xl font-bold mt-1 ${recommendedPrice ? 'text-indigo-600' : 'text-gray-400'}`}>
                    {recommendedPrice !== null && recommendedPrice !== undefined 
                      ? `${recommendedPrice.toFixed(2)} ${sanitizedProduct.currency}` 
                      : "N/A"}
                  </p>
                </div>
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-indigo-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-emerald-500 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Product Cost</p>
                  <p className="text-2xl font-bold text-emerald-600 mt-1">
                    {sanitizedProduct.cost !== null 
                      ? `${sanitizedProduct.cost.toFixed(2)} ${sanitizedProduct.currency}` 
                      : "N/A"}
                  </p>
                  <CostUpdateForm productId={productId} initialCost={sanitizedProduct.cost} />
                </div>
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <Package className="h-6 w-6 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-rose-500 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Lowest Competitor</p>
                  <p className="text-2xl font-bold text-rose-600 mt-1">
                    {lowestPrice !== Infinity 
                      ? `${lowestPrice.toFixed(2)} ${sanitizedProduct.currency}` 
                      : "N/A"}
                  </p>
                </div>
                <div className="p-2 bg-rose-100 rounded-lg">
                  <BarChart3 className="h-6 w-6 text-rose-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-blue-500 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Highest Competitor</p>
                  <p className="text-2xl font-bold text-blue-600 mt-1">
                    {highestPrice !== -Infinity 
                      ? `${highestPrice.toFixed(2)} ${sanitizedProduct.currency}` 
                      : "N/A"}
                  </p>
                </div>
                <div className="p-2 bg-blue-100 rounded-lg">
                  <DollarSign className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Competitors Section - Now using the separate client component */}
      <CompetitorsSection 
        productId={product.id} 
        competitors={sanitizedProduct.competitors} 
        handleAddCompetitor={handleAddCompetitor} // ⚠️ تم تمرير الدالة
        handleTrackCompetitor={handleTrackCompetitor} // ⚠️ تم تمرير الدالة
      />
      
      {/* Strategy Section */}
      <Card className="shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl">Pricing Strategy</CardTitle>
          <CardDescription>
            Apply a pricing strategy to get automated price recommendations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <StrategyForm 
            productId={productId} 
            strategies={allStrategies} 
            currentStrategyId={sanitizedProduct.strategies[0]?.strategyId} 
          />
          
          <div className="pt-4 border-t border-gray-100">
            <Link href={`/products/strategies`}>
              <Button variant="outline" className="w-full">
                Manage Pricing Strategies
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}