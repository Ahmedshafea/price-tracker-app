// app/products/strategies/page.tsx
// This is the new page for managing all strategies

import { db } from "@/lib/db";
import StrategyForm from "./StrategyForm"; // The client component for the form
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

type StrategyRow = {
  id: string;
  name: string;
  type: string;
  config?: string | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
};

export default async function StrategiesPage() {
  const allStrategies: StrategyRow[] = await db.strategy.findMany();
  
  const handleAddStrategy = async (formData: FormData) => {
    "use server";
    // This server action needs to be slightly modified to handle a new strategy without being tied to a product yet.
    const name = formData.get("name") as string;
    const strategyType = formData.get("strategyType") as string;
    const competitorType = formData.get("competitorType") as string;
    const adjustmentType = formData.get("adjustmentType") as string;
    const adjustmentValue = parseFloat(formData.get("adjustmentValue") as string);
    
    if (!name || !strategyType || !competitorType || !adjustmentType || isNaN(adjustmentValue)) {
      return { success: false, error: "Missing required fields" };
    }
    
    const strategyConfig = { strategyType, competitorType, adjustmentType, adjustmentValue };
    
    try {
      await db.strategy.create({
        data: {
          name,
          type: strategyType as any,
          config: JSON.stringify(strategyConfig)
        }
      });
      revalidatePath("/products/strategies");
      return { success: true };
    } catch (error) {
      console.error("Error creating new strategy:", error);
      return { success: false, error: "Failed to create new strategy." };
    }
  };

  return (
    <div className="container mx-auto py-10 max-w-4xl">
      <div className="flex items-center mb-6">
        <Link href="/products" className="mr-4">
          <ArrowLeft className="h-6 w-6 text-gray-500 hover:text-gray-900" />
        </Link>
        <h1 className="text-2xl font-bold">Manage Pricing Strategies</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <StrategyForm addStrategyAction={handleAddStrategy} />
        
        <Card>
          <CardHeader>
            <CardTitle>Existing Strategies</CardTitle>
          </CardHeader>
          <CardContent>
            {allStrategies.length > 0 ? (
              <ul className="space-y-4">
                {allStrategies.map(s => (
                  <li key={s.id} className="p-4 border rounded-md">
                    <h3 className="font-semibold">{s.name}</h3>
                    <p className="text-sm text-gray-500">
                      Type: {s.type}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500">No strategies found. Create one to get started.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}