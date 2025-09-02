import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Save } from "lucide-react";
import { linkStrategyAction } from "@/actions/pricing-actions";

export default function StrategyForm({
  productId,
  strategies,
  currentStrategyId,
}: {
  productId: string;
  strategies: Array<{ id: string; name: string }>;
  currentStrategyId?: string | null;
}) {
  return (
    <form action={linkStrategyAction} className="space-y-4">
      <input type="hidden" name="productId" value={productId} />
      <div>
        <Label htmlFor="strategyId">Select a Strategy</Label>
        <Select name="strategyId" defaultValue={currentStrategyId ?? "none"}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select a strategy" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">-- None --</SelectItem>
            {strategies.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button type="submit" className="w-full mt-2">
        <Save className="mr-2 h-4 w-4" /> Link Strategy to Product
      </Button>
    </form>
  );
}