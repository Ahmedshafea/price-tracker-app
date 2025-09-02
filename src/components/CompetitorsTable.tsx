"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RefreshCcw, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { deleteCompetitorAction } from "@/actions/product-actions";

export default function CompetitorsTable({
  productId,
  competitors,
  handleAddCompetitor,
  handleTrackCompetitor,
}) {
  const router = useRouter();
  const competitorsWithPrices = competitors.filter(c => c.currentPrice !== null);

  const handleDelete = async (competitorId: string) => {
    await deleteCompetitorAction(competitorId);
    router.refresh();
  };
  
  const handleTrack = async (competitorId: string) => {
    await handleTrackCompetitor(competitorId);
    router.refresh();
  };

  return (
    <div className="mt-6">
      
      <h3 className="text-lg font-semibold mb-2">Competitors</h3>
      {competitorsWithPrices.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Competitor</TableHead>
              <TableHead>Latest Price</TableHead>
              <TableHead>Difference</TableHead>
              <TableHead>Last Updated</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {competitors.map((competitor) => (
              <TableRow key={competitor.id}>
                <TableCell>
                  <a href={competitor.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                    {competitor.name}
                  </a>
                </TableCell>
                <TableCell>
                  {competitor.currentPrice?.toFixed(2)} {competitor.currency}
                </TableCell>
                <TableCell>
                  {competitor.currentPrice && competitor.product.currentPrice && (
                    <span className={competitor.currentPrice < competitor.product.currentPrice ? "text-red-500" : "text-green-500"}>
                      {/* ⚠️ تم تعديل هذا الجزء لضمان أن الحساب صحيح ⚠️ */}
                      {(((competitor.currentPrice - competitor.product.currentPrice) / competitor.product.currentPrice) * 100).toFixed(2)}%
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  {new Date(competitor.updatedAt).toLocaleString()}
                </TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <Button variant="ghost" size="sm" onClick={() => handleTrack(competitor.id)} title="Track Now">
                      <RefreshCcw className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(competitor.id)} title="Delete">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <p className="text-gray-500">No competitors added yet.</p>
      )}
    </div>
  );
}