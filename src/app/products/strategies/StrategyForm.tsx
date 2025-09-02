"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Save } from "lucide-react";

export default function StrategyForm({ addStrategyAction }) {
  const router = useRouter();
  const [strategyName, setStrategyName] = useState("");
  const [strategyType, setStrategyType] = useState("lower");
  const [competitorType, setCompetitorType] = useState("cheapest");
  const [adjustmentType, setAdjustmentType] = useState("fixed");
  const [adjustmentValue, setAdjustmentValue] = useState(1);
  // ⚠️ إضافة حالة جديدة لشروط السعر
  const [minPriceType, setMinPriceType] = useState("fixed");
  const [minPriceValue, setMinPriceValue] = useState<number | null>(null);
  const [maxPriceType, setMaxPriceType] = useState("fixed");
  const [maxPriceValue, setMaxPriceValue] = useState<number | null>(null);

  const handleFormAction = async (formData: FormData) => {
    formData.set("strategyType", strategyType);
    formData.set("competitorType", competitorType);
    formData.set("adjustmentType", adjustmentType);
    formData.set("adjustmentValue", adjustmentValue.toString());
    
    // ⚠️ دمج قيم الشروط في FormData
    if (minPriceValue !== null) {
      formData.set("minPriceType", minPriceType);
      formData.set("minPriceValue", minPriceValue.toString());
    }
    if (maxPriceValue !== null) {
      formData.set("maxPriceType", maxPriceType);
      formData.set("maxPriceValue", maxPriceValue.toString());
    }
    
    const result = await addStrategyAction(formData);
    if (result.success) {
      setStrategyName("");
      setAdjustmentValue(1);
      setMinPriceValue(null);
      setMaxPriceValue(null);
      router.refresh();
    } else {
      console.error(result.error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create New Strategy</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={handleFormAction} className="space-y-4">
          <div>
            <Label htmlFor="name">Strategy Name</Label>
            <Input
              id="name"
              name="name"
              placeholder="e.g., Beat Lowest Competitor"
              required
              value={strategyName}
              onChange={(e) => setStrategyName(e.target.value)}
            />
          </div>
          
          <div>
            <Label htmlFor="strategyType">Set my price to</Label>
            <Select name="strategyType" value={strategyType} onValueChange={setStrategyType}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lower">Be lower than</SelectItem>
                <SelectItem value="match">Match</SelectItem>
                <SelectItem value="higher">Be higher than</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="competitorType">Competitor Type</Label>
            <Select name="competitorType" value={competitorType} onValueChange={setCompetitorType}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select Competitor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cheapest">Cheapest competitor</SelectItem>
                <SelectItem value="average">Average competitor</SelectItem>
                <SelectItem value="most_expensive">Most expensive competitor</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end space-x-2">
            <div className="flex-1">
              <Label>Adjustment</Label>
              <Input
                type="number"
                name="adjustmentValue"
                value={adjustmentValue || ''}
                onChange={(e) => setAdjustmentValue(parseFloat(e.target.value))}
                step="0.01"
              />
            </div>
            <Select name="adjustmentType" value={adjustmentType} onValueChange={setAdjustmentType}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fixed">$</SelectItem>
                <SelectItem value="percent">%</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* ⚠️ إضافة شروط السعر الجديدة */}
          <div className="space-y-2 pt-4 border-t mt-4">
            <p className="text-sm font-medium">Price Constraints</p>
            <div className="flex items-center space-x-2">
              <Label>but not lower than Cost plus</Label>
              <Input
                type="number"
                name="minPriceValue"
                value={minPriceValue || ''}
                onChange={(e) => setMinPriceValue(parseFloat(e.target.value) || null)}
                step="0.01"
                className="w-24"
              />
              <Select name="minPriceType" value={minPriceType} onValueChange={setMinPriceType}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">$</SelectItem>
                  <SelectItem value="percent">%</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <Label>or higher than Cost plus</Label>
              <Input
                type="number"
                name="maxPriceValue"
                value={maxPriceValue || ''}
                onChange={(e) => setMaxPriceValue(parseFloat(e.target.value) || null)}
                step="0.01"
                className="w-24"
              />
              <Select name="maxPriceType" value={maxPriceType} onValueChange={setMaxPriceType}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">$</SelectItem>
                  <SelectItem value="percent">%</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <Button type="submit" className="w-full mt-2">
            <Save className="mr-2 h-4 w-4" /> Save New Strategy
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}