"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import CompetitorsTable from "@/components/CompetitorsTable";
import { Input } from "@/components/ui/input";

interface CompetitorsSectionProps {
  productId: string;
  competitors: any[];
  handleAddCompetitor: (formData: FormData) => Promise<any>;
  handleTrackCompetitor: (competitorId: string) => Promise<any>;
}

export default function CompetitorsSection({ productId, competitors, handleAddCompetitor, handleTrackCompetitor }: CompetitorsSectionProps) {
  return (
    <Card className="mb-10 shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-xl">Competitors</CardTitle>
            <CardDescription className="mt-1">
              Track competitor prices to optimize your pricing strategy
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">Add Competitor</h3>
          <form action={handleAddCompetitor} className="flex space-x-2">
            <Input type="url" name="url" placeholder="https://competitor.com/product-url" required />
            <Button type="submit">Add</Button>
          </form>
        </div>
        <CompetitorsTable
          productId={productId}
          competitors={competitors}
          handleTrackCompetitor={handleTrackCompetitor}
        />
      </CardContent>
    </Card>
  );
}