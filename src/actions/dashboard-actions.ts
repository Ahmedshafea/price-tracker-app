"use server";

import { db } from "@/lib/db";
import { priceTrackingService } from "@/lib/price-tracking";
import { revalidatePath } from "next/cache";

// دالة خادم لإضافة منتج جديد
