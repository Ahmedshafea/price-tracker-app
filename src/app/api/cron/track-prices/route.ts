import { priceTrackingService } from "@/lib/price-tracking";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    await priceTrackingService.trackCompetitorPrices();
    return NextResponse.json({ success: true, message: "Price tracking completed." });
  } catch (error) {
    console.error("Cron job failed:", error);
    return NextResponse.json({ success: false, message: "An error occurred." }, { status: 500 });
  }
}