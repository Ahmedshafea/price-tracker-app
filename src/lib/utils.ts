import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function normalizeCurrency(currency: string): string {
  const currencyMap: Record<string, string> = {
    "د.ع": "IQD",
    "دينار عراقي": "IQD",
    دينار: "IQD",
    "Iraqi Dinar": "IQD",
    "ج.م": "EGP",
    جنيه: "EGP",
    "جنيه مصري": "EGP",
    "ر.س": "SAR",
    ريال: "SAR",
    "ريال سعودي": "SAR",
    "د.إ": "AED",
    درهم: "AED",
    "درهم إماراتي": "AED",
    "د.ك": "KWD",
    "دينار كويتي": "KWD",
    "ر.ق": "QAR",
    "ريال قطري": "QAR",
    "ر.ع": "OMR",
    "ريال عماني": "OMR",
    "$": "USD",
    "دولار أمريكي": "USD",
    دولار: "USD",
    "€": "EUR",
    يورو: "EUR",
    "£": "GBP",
    "جنيه استرليني": "GBP",
    "¥": "JPY",
    "ين ياباني": "JPY",
    CHF: "CHF",
    AUD: "AUD",
    CAD: "CAD",
    "₩": "KRW",
    CNY: "CNY",
    INR: "INR",
    RUB: "RUB",
  };

  const normalized =
    currencyMap[currency.toLowerCase().trim()] ||
    currency.toUpperCase().trim();

  // إذا كان الرمز القياسي غير صالح، يمكنك هنا وضع fallback
  // مثال: إذا كان الرمز غير معروف، ارجع "USD" كقيمة افتراضية
  // لكن في حالتنا، سنرجع الرمز كما هو للسماح لـ convertPrice بالتعامل مع الخطأ.
  return normalized;
}

export function parsePrice(_text: string) {
  /* implementation or keep stub */
  return null;
}
export function isValidPrice(val: number | null): val is number {
  return typeof val === "number" && !isNaN(val);
}
