"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, X } from "lucide-react";
import type { ReactElement } from "react";

type Strategy = { id: string; name: string; type: string; config?: string };

export type AddStrategyPayload = {
  name: string;
  strategyType: string;
  competitorType: string;
  adjustmentType: string;
  adjustmentValue: number;
  strategyId?: string | null;
};

export default function StrategyModal({
  productId,
  initialStrategies,
  addStrategyAction,
}: {
  productId: string;
  initialStrategies: Strategy[];
  // support either (productId, payload) or (payload) signatures — typed loosely with unknown for safety
  addStrategyAction: ((productId: string, payload: AddStrategyPayload) => Promise<any>) | ((payload: AddStrategyPayload) => Promise<any>);
}): ReactElement {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStrategyId, setSelectedStrategyId] = useState("new");
  const [strategyName, setStrategyName] = useState("");
  const [strategyType, setStrategyType] = useState("lower");
  const [competitorType, setCompetitorType] = useState("cheapest");
  const [adjustmentType, setAdjustmentType] = useState("fixed");
  const [adjustmentValue, setAdjustmentValue] = useState(1);
  // removed unused min/max state and isNewStrategy to satisfy lint
  // add them back when used

  const handleSelectStrategy = (id: string) => {
    setSelectedStrategyId(id);
    if (id === "new") {
      // إعادة تعيين الحالات
      setStrategyName("");
      setStrategyType("lower");
      setCompetitorType("cheapest");
      setAdjustmentType("fixed");
      setAdjustmentValue(1);
    } else {
      const selected = initialStrategies.find((s) => s.id === id);
      if (selected) {
        setStrategyName(selected.name);
        setStrategyType(selected.type || "lower");
        try {
          const cfg = JSON.parse(selected.config || "{}");
          setCompetitorType(cfg.competitorType || "cheapest");
          setAdjustmentType(cfg.adjustmentType || "fixed");
          setAdjustmentValue(cfg.adjustmentValue ?? 1);
          // ⚠️ جلب قيم الشروط الجديدة
        } catch {
          // إعادة تعيين الحالات عند فشل التحميل
          setCompetitorType("cheapest");
          setAdjustmentType("fixed");
          setAdjustmentValue(1);
        }
      }
    }
  };

  const handleFormAction = async (formData: FormData) => {
    // ⚠️ دمج قيم الشروط في FormData

    const result = await addStrategyAction(productId, formData);
    if (result.success) {
      setIsModalOpen(false);
      router.refresh();
    } else {
      console.error(result.error);
    }
  };

  return (
    <>
      <Button className="w-full mt-4" onClick={() => setIsModalOpen(true)}>Set a price strategy</Button>
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-50">
          <div className="relative p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Set Price Strategy</h3>
              <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
                <X />
              </Button>
            </div>
            
            <div className="mb-4">
              <Label>Select/Create Strategy</Label>
              <Select onValueChange={handleSelectStrategy} value={selectedStrategyId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a strategy" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">+ Create New Strategy</SelectItem>
                  {initialStrategies.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

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
                    value={adjustmentValue}
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
              
              <Button type="submit" className="w-full mt-2">
                <Save className="mr-2 h-4 w-4" /> Save and Activate Strategy
              </Button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}