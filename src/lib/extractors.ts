import "server-only";

/**
 * نفس الدوال المساعدة من الكود الأصلي مع نفس المنطق والـ logs
 * ومتحوّلة إلى TypeScript + Exported functions
 * علشان نستخدمها من أي ملف تاني.
 */

// دالة مخصصة لاستخلاص السعر فقط
export async function extractPrice(page: any): Promise<{ price: number | null; originalText: string | null }> {
  let extractedPrice: number | null = null;
  let originalText: string | null = null;

  // 1) البحث في Meta tags و JSON-LD
  console.log("🔍 البحث عن السعر في Meta tags و JSON-LD...");
  const metaAndJsonPriceSelectors = [
    "meta[property='product:price:amount']",
    "meta[property='product:price']",
    "meta[itemprop='price']",
    "meta[name='price']",
    "meta[property='og:price:amount']",
  ];

  for (let selector of metaAndJsonPriceSelectors) {
    try {
      const priceValue = await page.$eval(selector, (el: any) => el.content);
      if (priceValue && isValidPrice(priceValue)) {
        console.log(`✅ وجدت السعر في ${selector}: ${priceValue}`);
        const parsed = parsePrice(priceValue);
        if (parsed.price !== null) {
          return parsed;
        }
      }
    } catch {}
  }

  try {
    const jsonLDPrice = await page.evaluate(() => {
      const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
      for (let script of scripts) {
        try {
          const data = JSON.parse(script.textContent || "{}");
          if (data.offers && data.offers.price) return data.offers.price;
          if (data['@type'] === 'Product' && data.offers) {
            return (Array.isArray(data.offers) ? data.offers[0]?.price : data.offers.price) || null;
          }
        } catch {}
      }
      return null;
    });
    if (jsonLDPrice && isValidPrice(jsonLDPrice)) {
      console.log(`✅ وجدت السعر في JSON-LD: ${jsonLDPrice}`);
      const parsed = parsePrice(jsonLDPrice);
      if (parsed.price !== null) {
        return parsed;
      }
    }
  } catch {}

  // 2) البحث في CSS Selectors
  console.log("🔍 البحث عن السعر في CSS Selectors...");
  const priceSelectors = [
    ".a-price .a-offscreen",
    "#priceblock_ourprice",
    "[itemprop='price']",
    "[data-price]",
    ".price",
    ".sellingPrice",
    ".current-price",
    ".offer-price",
    "[id*='price' i]",
    ".product-price",
    ".regular-price",
    ".amount",
    ".cost",
    ".value",
    ".a-button-text .a-text-price",
    "[class*='Price']:not([class*='Old']):not([class*='Strike']):not([class*='Original']):not([class*='sale']):not([class*='discount'])",
  ];

  for (let selector of priceSelectors) {
    try {
      const elements = await page.$$(selector);
      for (let element of elements) {
        const text: string | null = await element.evaluate((el: any) => el.innerText || el.textContent);
        if (text && isValidPrice(text)) {
          const parsed = parsePrice(text);
          if (parsed.price !== null) {
            return parsed;
          }
        }
      }
    } catch {}
  }

  // 3) التحقق من التوفر كخيار أخير إذا لم يتم العثور على أي سعر
  console.log("⚠️ فشل البحث عن السعر، جارٍ التحقق من حالة التوفر...");
  const isOutOfStock = await page.evaluate(() => {
    const outOfStockKeywords = ['out of stock', 'unavailable', 'غير متوفر', 'نفدت الكمية', 'غير متاح حاليا', 'نفذ'];
    const pageText = (document.body.innerText || "").toLowerCase();
    for (const keyword of outOfStockKeywords) {
      if (pageText.includes(keyword)) {
        return true;
      }
    }
    return false;
  });

  if (isOutOfStock) {
    console.log("⚠️ المنتج غير متوفر.");
    return { price: null, originalText: "المنتج غير متوفر" };
  }

  console.log("❌ لم يتم العثور على أي سعر");
  return { price: null, originalText: null };
}

export async function extractCurrency(page: any): Promise<{ currency: string | null }> {
  // 1) البحث في Meta tags
  console.log("🔍 البحث عن العملة في Meta tags...");
  try {
    const currency = await page.$eval("meta[property='product:price:currency']", (el: any) => el.content);
    if (currency) {
      console.log(`✅ وجدت العملة في Meta: ${currency}`);
      return { currency };
    }
  } catch {}

  try {
    const currency = await page.$eval("meta[itemprop='priceCurrency']", (el: any) => el.content);
    if (currency) {
      console.log(`✅ وجدت العملة في Meta: ${currency}`);
      return { currency };
    }
  } catch {}

  // 2) البحث في JSON-LD
  console.log("🔍 البحث عن العملة في JSON-LD...");
  try {
    const currency = await page.evaluate(() => {
      const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
      for (let script of scripts) {
        try {
          const data = JSON.parse(script.textContent || "{}");
          if (data.offers && data.offers.priceCurrency) return data.offers.priceCurrency;
          if (data['@type'] === 'Product' && data.offers) {
            return (Array.isArray(data.offers) ? data.offers[0]?.priceCurrency : data.offers.priceCurrency) || null;
          }
        } catch {}
      }
      return null;
    });
    if (currency) {
      console.log(`✅ وجدت العملة في JSON-LD: ${currency}`);
      return { currency };
    }
  } catch {}

  // 3) البحث في CSS Selectors
  console.log("🔍 البحث عن العملة في CSS Selectors...");
  const currencyMap: Record<string, string> = {
    'د.ع': 'IQD', 'دينار عراقي': 'IQD', 'دينار': 'IQD', 'Iraqi Dinar': 'IQD',
    'ج.م': 'EGP', 'جنيه': 'EGP', 'جنيه مصري': 'EGP', 'EGP': 'EGP',
    'ر.س': 'SAR', 'ريال': 'SAR', 'ريال سعودي': 'SAR', 'SAR': 'SAR',
    'د.إ': 'AED', 'درهم': 'AED', 'درهم إماراتي': 'AED', 'AED': 'AED',
    'د.ك': 'KWD', 'دينار كويتي': 'KWD', 'KWD': 'KWD',
    'ر.ق': 'QAR', 'ريال قطري': 'QAR', 'QAR': 'QAR',
    'ر.ع': 'OMR', 'ريال عماني': 'OMR', 'OMR': 'OMR',
    'د.ب': 'BHD', 'دينار بحريني': 'BHD', 'BHD': 'BHD',
    'ج.س': 'SDG', 'جنيه سوداني': 'SDG', 'SDG': 'SDG',
    'د.ل': 'LYD', 'دينار ليبي': 'LYD', 'LYD': 'LYD',
    'د.أ': 'JOD', 'دينار أردني': 'JOD', 'JOD': 'JOD',
    'ل.ل': 'LBP', 'ليرة لبنانية': 'LBP', 'LBP': 'LBP',
    'د.ت': 'TND', 'دينار تونسي': 'TND', 'TND': 'TND',
    'د.ج': 'DZD', 'دينار جزائري': 'DZD', 'DZD': 'DZD',
    'د.م': 'MAD', 'درهم مغربي': 'MAD', 'MAD': 'MAD',
    'ر.ي': 'YER', 'ريال يمني': 'YER', 'YER': 'YER',
    'ل.س': 'SYP', 'ليرة سورية': 'SYP', 'SYP': 'SYP',
    'ش.ص': 'SOS', 'شلن صومالي': 'SOS', 'SOS': 'SOS',
    'ج.ق': 'DJF', 'فرنك جيبوتي': 'DJF', 'DJF': 'DJF',
    'ك.ج': 'KMF', 'فرنك قمري': 'KMF', 'KMF': 'KMF',
    'م.أ': 'MRU', 'أوقية موريتانية': 'MRU', 'MRU': 'MRU',
    '$': 'USD', 'دولار أمريكي': 'USD', 'دولار': 'USD', 'USD': 'USD', 'Dollar': 'USD',
    '€': 'EUR', 'يورو': 'EUR', 'EUR': 'EUR', 'Euro': 'EUR',
    '£': 'GBP', 'جنيه استرليني': 'GBP', 'GBP': 'GBP',
    '¥': 'JPY', 'ين ياباني': 'JPY', 'JPY': 'JPY',
    'CHF': 'CHF', 'فرنك سويسري': 'CHF',
    'AUD': 'AUD', 'دولار أسترالي': 'AUD',
    'CAD': 'CAD', 'دولار كندي': 'CAD', 'C$': 'CAD',
    '₩': 'KRW', 'وُن كوري': 'KRW', 'KRW': 'KRW',
    'CNY': 'CNY', 'يوان صيني': 'CNY', 'RMB': 'CNY',
    'INR': 'INR', 'روبية هندية': 'INR',
    'RUB': 'RUB', 'روبل روسي': 'RUB'
  };

  const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const priceSelectors = [
    ".a-price .a-offscreen",
    ".a-price-current .a-price-fraction",
    ".a-price .a-price-fraction",
    "#priceblock_ourprice",
    "#priceblock_dealprice",
    ".x-price-primary",
    ".x-price-approx__price",
    ".sellingPrice",
    ".current-price",
    ".offer-price",
    "[itemprop='price']",
    "[data-price]",
    ".price",
    "[class*='price' i]",
    "[id*='price' i]",
    ".product-price",
    ".regular-price",
    ".amount",
    "h2, h3, h4, h5, h6, span, p, a",
  ];

  for (let selector of priceSelectors) {
    try {
      const elements = await page.$$(selector);
      for (let element of elements) {
        const text: string | null = await element.evaluate((el: any) => el.innerText || el.textContent);
        if (text) {
          const pattern = new RegExp(Object.keys(currencyMap).map(escapeRegex).join("|"), "i");
          const localCurrencyMatch = text.match(pattern);
          if (localCurrencyMatch) {
            for (const [key, value] of Object.entries(currencyMap)) {
              if (localCurrencyMatch[0].toLowerCase().includes(key.toLowerCase())) {
                console.log(`✅ وجدت العملة في CSS Selector: ${value}`);
                return { currency: value };
              }
            }
          }
        }
      }
    } catch {}
  }

  console.log("⚠️ لم يتم العثور على عملة في البيانات المهيكلة أو CSS، جارٍ البحث في نص الصفحة...");
  const pageText: string = await page.evaluate(() => document.body.innerText || "");
  const allText = pageText.toLowerCase();

  for (const [key, value] of Object.entries(currencyMap)) {
    if (allText.includes(key.toLowerCase())) {
      console.log(`✅ وجدت العملة في نص الصفحة: ${value}`);
      return { currency: value };
    }
  }

  console.log("❌ لم يتم العثور على أي عملة");
  return { currency: null };
}

// دالة لاستخراج الصورة الرئيسية للمنتج
export async function extractImage(page: any): Promise<{ image: string | null }> {
  console.log("🖼️ جارٍ استخراج صورة المنتج...");
  const imageSelectors = [
    "meta[property='og:image']",
    "meta[itemprop='image']",
    "meta[name='twitter:image']",
    ".product-image",
    ".main-image",
    "#img-main",
    "[id*='image' i]",
    "[class*='image' i]",
  ];

  for (const selector of imageSelectors) {
    try {
      const imageUrl = await page.$eval(selector, (el: any) => (el.src || el.content));
      if (imageUrl) {
        console.log(`✅ وجدت الصورة في ${selector}: ${imageUrl}`);
        return { image: imageUrl };
      }
    } catch {}
  }

  console.log("❌ لم يتم العثور على أي صورة");
  return { image: null };
}

// دالة تحليل السعر
export function parsePrice(priceText: string): { price: number | null; originalText: string } {
  if (!priceText || typeof priceText !== 'string')
    return { price: null, originalText: priceText as any };

  let cleanText = priceText.toString().trim()
    .replace(/[\u200B-\u200D\uFEFF]/g, '')   // إزالة مسافات خفية
    .replace(/\s+/g, ' ')
    .replace(/٬/g, ',')
    .replace(/٫/g, '.')
    // تحويل الأرقام العربية -> إنجليزية
    .replace(/٠/g, '0').replace(/١/g, '1').replace(/٢/g, '2').replace(/٣/g, '3').replace(/٤/g, '4')
    .replace(/٥/g, '5').replace(/٦/g, '6').replace(/٧/g, '7').replace(/٨/g, '8').replace(/٩/g, '9');

  console.log(`🔍 تحليل النص: "${cleanText}"`);
  const priceMatch = cleanText.match(/(\d[\d,.]*)/);
  if (!priceMatch) {
    console.log("❌ لم يتم العثور على أي رقم للسعر");
    return { price: null, originalText: cleanText };
  }

  let priceStr = priceMatch[1];

  // ✅ إزالة الفواصل الخاصة بالآلاف
  let normalized = priceStr.replace(/,/g, '');

  // ✅ تحويل للنص العشري
  let priceNumber = parseFloat(normalized);

  if (isNaN(priceNumber) || priceNumber < 0.01 || priceNumber > 100000000) {
    console.log(`❌ رقم غير صحيح: ${priceNumber}`);
    return { price: null, originalText: cleanText };
  }

  const result = { price: priceNumber, originalText: cleanText };
  console.log(`✅ نتيجة تحليل السعر النهائية:`, result);
  return result;
}

// دالة التحقق من صحة السعر
export function isValidPrice(priceText: string): boolean {
  if (!priceText || typeof priceText !== 'string') return false;

  const discountKeywords = ['خصم', 'توفير', 'تخفيض', 'نسبة', 'discount', 'off', 'sale'];
  const lowerCaseText = priceText.toLowerCase();

  for (const keyword of discountKeywords) {
    if (lowerCaseText.includes(keyword)) {
      if (lowerCaseText.includes('%') && priceText.match(/^-?\d+%$/)) {
        return false;
      }
    }
  }

  const statusKeywords = ['غير متوفر', 'غير متاح', 'نفدت الكمية', 'بيعت الكمية', 'out of stock', 'unavailable'];
  for (const keyword of statusKeywords) {
    if (lowerCaseText.includes(keyword)) return false;
  }

  if (!/\d/.test(priceText)) return false;

  const cleanText = priceText.replace(/[\s,]/g, '').replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString());
  const numericValue = parseFloat(cleanText.replace(/٫/g, '.').replace(/[^\d.]/g, ''));

  if (isNaN(numericValue) || numericValue <= 0 || numericValue > 100000000) return false;

  return true;
}

export function normalizeCurrency(currency: string): string {
    const currencyMap: Record<string, string> = {
        'د.ع': 'IQD', 'دينار عراقي': 'IQD', 'دينار': 'IQD', 'Iraqi Dinar': 'IQD',
        'ج.م': 'EGP', 'جنيه': 'EGP', 'جنيه مصري': 'EGP',
        'ر.س': 'SAR', 'ريال': 'SAR', 'ريال سعودي': 'SAR',
        'د.إ': 'AED', 'درهم': 'AED', 'درهم إماراتي': 'AED',
        'د.ك': 'KWD', 'دينار كويتي': 'KWD',
        'ر.ق': 'QAR', 'ريال قطري': 'QAR',
        'ر.ع': 'OMR', 'ريال عماني': 'OMR',
        '$': 'USD', 'دولار أمريكي': 'USD', 'دولار': 'USD',
        '€': 'EUR', 'يورو': 'EUR',
        '£': 'GBP', 'جنيه استرليني': 'GBP',
        '¥': 'JPY', 'ين ياباني': 'JPY',
        'CHF': 'CHF',
        'AUD': 'AUD',
        'CAD': 'CAD',
        '₩': 'KRW',
        'CNY': 'CNY',
        'INR': 'INR',
        'RUB': 'RUB'
    };

    const normalized = currencyMap[currency.toLowerCase().trim()] || currency.toUpperCase().trim();
    
    return normalized;
}

/**
 * Lightweight, strongly-typed helpers to extract numeric price from arbitrary text.
 * These implementations are intentionally conservative and avoid any / reassignable vars.
 */
export function extractPriceFromText(original: unknown): number | null {
  const text = String(original ?? "");
  // common price fragments like "1,234.56" or "1.234,56" — we prioritize dot-as-decimal
  const m = text.match(/((\d{1,3}(?:[.,]\d{3})+)|\d+)([.,]\d+)?/);
  if (!m) return null;
  const raw = m[0];
  // normalize thousands separators and decimal marker: if both dot and comma exist, assume comma thousands
  const normalized = raw.includes(",") && raw.includes(".")
    ? raw.replace(/,/g, "")
    : raw.replace(/,/g, ".");
  const num = Number(normalized);
  return Number.isFinite(num) ? num : null;
}

/**
 * Extract plain text from a DOM selector safely (server-safe no-op if DOM not present)
 */
export function extractTextFromSelector(selector: string, container?: Document | null): string | null {
  if (typeof document === "undefined" && !container) return null;
  const doc = container ?? document;
  const el = doc.querySelector(selector);
  return el ? (el.textContent ?? "").trim() : null;
}

/**
 * Normalize a price string to a number (strips currency symbols)
 */
export function parsePriceString(priceStr: string): number | null {
  const cleaned = priceStr.replace(/[^\d.,-]/g, "").trim();
  if (!cleaned) return null;
  const replaced = cleaned.includes(",") && !cleaned.includes(".") ? cleaned.replace(/\./g, "") : cleaned.replace(/,/g, "");
  const v = Number(replaced);
  return Number.isFinite(v) ? v : null;
}
