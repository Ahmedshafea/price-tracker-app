import "server-only";

import { Page } from 'puppeteer';

const currencyMap: Record<string, string> = {
    'د.ع': 'IQD', 'دينار عراقي': 'IQD', 'دينار': 'IQD', 'Iraqi Dinar': 'IQD',
    'ج.م': 'EGP', 'جنيه': 'EGP', 'جنيه مصري': 'EGP', 'EGP': 'EGP',
    'ر.س': 'SAR', 'ريال': 'SAR', 'ريال سعودي': 'SAR', 'SAR': 'SAR',
    'د.إ': 'AED', 'درهم': 'AED', 'درهم إماراتي': 'AED', 'AED': 'AED',
    'د.ك': 'KWD', 'دينار كويتي': 'KWD', 'KWD': 'KWD',
    'ر.ق': 'QAR', 'ريال قطري': 'QAR', 'QAR': 'QAR',
    'ر.ع': 'OMR', 'ريال عماني': 'OMR', 'OMR': 'OMR',
    'د.ب': 'BHD', 'دينار بحريني': 'BHD', 'BHD': 'BHD',
    'ج.س': 'SDG', 'جنيه سوداني': 'SDG', 'SDG': 'SDG',
    'د.ل': 'LYD', 'دينار ليبي': 'LYD', 'LYD': 'LYD',
    'د.أ': 'JOD', 'دينار أردني': 'JOD', 'JOD': 'JOD',
    'ل.ل': 'LBP', 'ليرة لبنانية': 'LBP', 'LBP': 'LBP',
    'د.ت': 'TND', 'دينار تونسي': 'TND', 'TND': 'TND',
    'د.ج': 'DZD', 'دينار جزائري': 'DZD', 'DZD': 'DZD',
    'د.م': 'MAD', 'درهم مغربي': 'MAD', 'MAD': 'MAD',
    'ر.ي': 'YER', 'ريال يمني': 'YER', 'YER': 'YER',
    'ل.س': 'SYP', 'ليرة سورية': 'SYP', 'SYP': 'SYP',
    'ش.ص': 'SOS', 'شلن صومالي': 'SOS', 'SOS': 'SOS',
    'ج.ق': 'DJF', 'فرنك جيبوتي': 'DJF', 'DJF': 'DJF',
    'ك.ج': 'KMF', 'فرنك قمري': 'KMF', 'KMF': 'KMF',
    'م.أ': 'MRU', 'أوقية موريتانية': 'MRU', 'MRU': 'MRU',
    '$': 'USD', 'دولار أمريكي': 'USD', 'دولار': 'USD', 'USD': 'USD', 'Dollar': 'USD',
    '€': 'EUR', 'يورو': 'EUR', 'EUR': 'EUR', 'Euro': 'EUR',
    '£': 'GBP', 'جنيه استرليني': 'GBP', 'GBP': 'GBP',
    '¥': 'JPY', 'ين ياباني': 'JPY', 'JPY': 'JPY',
    'CHF': 'CHF', 'فرنك سويسري': 'CHF',
    'AUD': 'AUD', 'دولار أسترالي': 'AUD',
    'CAD': 'CAD', 'دولار كندي': 'CAD', 'C$': 'CAD',
    '₩': 'KRW', 'وُن كوري': 'KRW', 'KRW': 'KRW',
    'CNY': 'CNY', 'يوان صيني': 'CNY', 'RMB': 'CNY',
    'INR': 'INR', 'روبية هندية': 'INR',
    'RUB': 'RUB', 'روبل روسي': 'RUB'
};

export const normalizeCurrency = (currencySymbolOrCode: string): string => {
  if (!currencySymbolOrCode) return 'USD';
  const upperCaseInput = currencySymbolOrCode.toUpperCase();
  if (Object.values(currencyMap).includes(upperCaseInput)) {
    return upperCaseInput;
  }
  for (const [key, value] of Object.entries(currencyMap)) {
    if (currencySymbolOrCode.toLowerCase() === key.toLowerCase()) {
      return value;
    }
  }
  return upperCaseInput;
};


// دالة مخصصة لاستخلاص السعر فقط
export const extractPrice = async (page: Page): Promise<{ price: number | null; originalText: string | null }> => {
  //let extractedPrice: number | null = null;
  //let originalText: string | null = null;
  console.log("🔍 البحث عن السعر في Meta tags و JSON-LD...");
  const metaAndJsonPriceSelectors = [
    "meta[property='product:price:amount']",
    "meta[property='product:price']",
    "meta[itemprop='price']",
    "meta[name='price']",
    "meta[property='og:price:amount']",
  ];
  for (const selector of metaAndJsonPriceSelectors) {
    try {
      const priceValue = await page.$eval(selector, (el: Element) => (el as HTMLMetaElement).content);
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
      for (const script of scripts) {
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
  for (const selector of priceSelectors) {
    try {
      const elements = await page.$$(selector);
      for (const element of elements) {
        const text: string | null = await element.evaluate((el: Element) => el.innerText || el.textContent);
        if (text && isValidPrice(text)) {
          const parsed = parsePrice(text);
          if (parsed.price !== null) {
            return parsed;
          }
        }
      }
    } catch {}
  }
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
  console.log("❌ لم يتم العثور على أي سعر");
  return { price: null, originalText: null };
}

export const extractCurrency = async (page: Page): Promise<{ currency: string | null }> => {
  console.log("🔍 البحث عن العملة في Meta tags...");
  try {
    const currency = await page.$eval("meta[property='product:price:currency']", (el: Element) => (el as HTMLMetaElement).content);
    if (currency) {
      console.log(`✅ وجدت العملة في Meta: ${currency}`);
      return { currency: normalizeCurrency(currency) }; // Normalize the currency
    }
  } catch {}
  try {
    const currency = await page.$eval("meta[itemprop='priceCurrency']", (el: Element) => (el as HTMLMetaElement).content);
    if (currency) {
      console.log(`✅ وجدت العملة في Meta: ${currency}`);
      return { currency: normalizeCurrency(currency) }; // Normalize the currency
    }
  } catch {}
  console.log("🔍 البحث عن العملة في JSON-LD...");
  try {
    const currency = await page.evaluate(() => {
      const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
      for (const script of scripts) {
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
      return { currency: normalizeCurrency(currency) }; // Normalize the currency
    }
  } catch {}
  console.log("🔍 البحث عن العملة في CSS Selectors...");
  
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
  for (const selector of priceSelectors) {
    try {
      const elements = await page.$$(selector);
      for (const element of elements) {
        const text: string | null = await element.evaluate((el: Element) => el.innerText || el.textContent);
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
  console.log("⚠️ لم يتم العثور على عملة في البيانات المهيكلة أو CSS، جارٍ البحث في نص الصفحة...");
  const pageText: string = await page.evaluate(() => document.body.innerText || "");
  const allText = pageText.toLowerCase();
  for (const [key, value] of Object.entries(currencyMap)) {
    if (allText.includes(key.toLowerCase())) {
      console.log(`✅ وجدت العملة في نص الصفحة: ${value}`);
      return { currency: value };
    }
  }
  console.log("❌ لم يتم العثور على أي عملة");
  return { currency: null };
}



export const parsePrice = (priceText: string): { price: number | null; originalText: string } => {
  if (!priceText || typeof priceText !== 'string')
    return { price: null, originalText: priceText as string };
  const cleanText = priceText.toString().trim()
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/٬/g, ',')
    .replace(/٫/g, '.')
    .replace(/٠/g, '0').replace(/١/g, '1').replace(/٢/g, '2').replace(/٣/g, '3').replace(/٤/g, '4')
    .replace(/٥/g, '5').replace(/٦/g, '6').replace(/٧/g, '7').replace(/٨/g, '8').replace(/٩/g, '9');
  console.log(`🔍 تحليل النص: "${cleanText}"`);
  const priceMatch = cleanText.match(/(\d[\d,.]*)/);
  if (!priceMatch) {
    console.log("❌ لم يتم العثور على أي رقم للسعر");
    return { price: null, originalText: cleanText };
  }
  const priceStr = priceMatch[1];
  const normalized = priceStr.replace(/,/g, '');
  const priceNumber = parseFloat(normalized);
  if (isNaN(priceNumber) || priceNumber < 0.01 || priceNumber > 100000000) {
    console.log(`❌ رقم غير صحيح: ${priceNumber}`);
    return { price: null, originalText: cleanText };
  }
  const result = { price: priceNumber, originalText: cleanText };
  console.log(`✅ نتيجة تحليل السعر النهائية:`, result);
  return result;
}


// This function is now fine because "use server" at the top is removed.
export const isValidPrice = (priceText: string): boolean => {
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
  const cleanText = priceText.replace(/[\s,]/g, '').replace(/[٠-٩]/g, (d: string) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString());
  const numericValue = parseFloat(cleanText.replace(/٫/g, '.').replace(/[^\d.]/g, ''));
  if (isNaN(numericValue) || numericValue <= 0 || numericValue > 100000000) return false;
  return true;
}


export const extractImage = async (page: Page): Promise<{ image: string | null }> => {
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
      const imageUrl = await page.$eval(selector, (el: Element) => (el as HTMLImageElement).src || (el as HTMLMetaElement).content);
      if (imageUrl) {
        console.log(`✅ وجدت الصورة في ${selector}: ${imageUrl}`);
        return { image: imageUrl };
      }
    } catch {}
  }
  console.log("❌ لم يتم العثور على أي صورة");
  return { image: null };
}
