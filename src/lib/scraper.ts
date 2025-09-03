// في ملف src/lib/scraper.ts
"use server";
import "server-only";

import { extractPrice, extractCurrency, extractImage } from "./extractors";
import puppeteer, { Page, Browser, HTTPRequest } from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import axios from 'axios';

export interface ScrapedProductData {
  title: string;
  price: number | null;
  currency: string | null;
  image: string | null;
  fullPrice: string;
  originalText: string | null;
  variants?: ScrapedProductData[];
}

type ScrapeError = { error: string; isScrapingError: true };

// دالة لاستخلاص المتغيرات من JSON-LD
async function extractJsonLdVariants(page: Page, title: string): Promise<ScrapedProductData[]> {
  const variants: ScrapedProductData[] = [];
  try {
    const jsonLdData = await page.evaluate(() => {
      const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
      for (const script of scripts) {
        try {
          const data = JSON.parse(script.textContent || "{}");
          if (data && data['@type'] === 'Product' && data.offers) {
            return data;
          }
        } catch {}
      }
      return null;
    });

    if (jsonLdData && jsonLdData.offers) {
      const offers = Array.isArray(jsonLdData.offers) ? jsonLdData.offers : [jsonLdData.offers];
      for (const offer of offers) {
        if (offer.name && offer.price && offer.priceCurrency) {
          variants.push({
            title: `${title} - ${offer.name.trim()}`,
            price: parseFloat(offer.price),
            currency: offer.priceCurrency,
            image: offer.image || jsonLdData.image,
            fullPrice: `${offer.price} ${offer.priceCurrency}`,
            originalText: null,
          });
        }
      }
    }
  } catch (e) {
    console.error("Error extracting variants from JSON-LD:", e);
  }
  return variants;
}

// دالة لاستخلاص المتغيرات من JavaScript Global Objects و CSS Selectors
async function extractVariants(page: Page, title: string): Promise<ScrapedProductData[]> {
    const variants: ScrapedProductData[] = [];
    try {
        const productData = await page.evaluate(() => {
            const candidateKeys = ['product', 'variants', 'shopify', 'dataLayer'];
            for (const key of candidateKeys) {
                if (window[key as keyof Window] && (window[key as keyof Window] as any).variants) {
                    return (window[key as keyof Window] as any);
                }
            }
            return null;
        });

        if (productData && productData.variants) {
            for (const variant of productData.variants) {
                if (variant.title && variant.price) {
                    variants.push({
                        title: `${title} - ${variant.title.trim()}`,
                        price: parseFloat(variant.price),
                        currency: variant.currency || 'USD',
                        image: variant.image?.src || null,
                        fullPrice: `${variant.price} ${variant.currency || 'USD'}`,
                        originalText: null,
                    });
                }
            }
            return variants;
        }
    } catch (e) {
        console.error("Error extracting variants from global JS objects:", e);
    }
    const variantSelectors = [
        '#product-variants', '.variant-selector', '.size-options', '.color-options',
        '[data-variant-id]', '[data-product-variant]', '[aria-label="Select color"]',
        '[aria-label="Select size"]',
    ];

    for (const selector of variantSelectors) {
        try {
            const variantElements = await page.$$(selector);
            if (variantElements.length > 0) {
                for (const element of variantElements) {
                    await element.click();
                    await page.waitForTimeout(1000);
                    const variantTitle = await page.evaluate(el => el.innerText || el.textContent, element) || 'Unknown Variant';
                    const priceData = await extractPrice(page);
                    const currencyData = await extractCurrency(page);
                    const imageData = await extractImage(page);
                    if (priceData.price !== null) {
                        variants.push({
                            title: `${title} - ${variantTitle.trim()}`,
                            price: priceData.price,
                            currency: currencyData.currency,
                            image: imageData.image,
                            fullPrice: `${priceData.price} ${currencyData.currency}`,
                            originalText: priceData.originalText,
                        });
                    }
                }
                return variants;
            }
        } catch (e) {
            console.error(`Error extracting variants with selector ${selector}:`, e);
            continue;
        }
    }
    return variants;
}

// دالة جديدة ومخصصة لمواقع Shopify
async function scrapeShopifyProductJson(url: string): Promise<ScrapedProductData[] | null> {
    try {
        const jsonUrl = `${url}.json`;
        const response = await axios.get(jsonUrl);
        const productData = response.data.product;
        if (!productData || !productData.variants) {
            return null;
        }
        const variants = productData.variants;
        const scrapedVariants: ScrapedProductData[] = [];
        for (const variant of variants) {
            if (variant.id && variant.title && variant.price) {
                let imageUrl = variant.featured_image?.src || productData.images[0]?.src || null;
                if (typeof imageUrl === 'object' && imageUrl !== null && (imageUrl as any).url) {
                    imageUrl = (imageUrl as any).url;
                }
                scrapedVariants.push({
                    title: `${productData.title} - ${variant.title.trim()}`,
                    price: parseFloat(variant.price),
                    currency: productData.currency || 'USD',
                    image: imageUrl,
                    fullPrice: `${variant.price} ${productData.currency || 'USD'}`,
                    originalText: variant.available ? 'In Stock' : 'Out of Stock',
                });
            }
        }
        return scrapedVariants.length > 0 ? scrapedVariants : null;
    } catch (e) {
        console.error("Error scraping Shopify product JSON:", e);
        return null;
    }
}

export async function scrapeProduct(url: string): Promise<ScrapedProductData | ScrapeError> {
  let browser: Browser | null = null;
  try {
    browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath() || "/usr/bin/chromium-browser",
    headless: chromium.headless,
});


    const page = await browser.newPage();
    await page.setDefaultNavigationTimeout(60000);
    await page.setDefaultTimeout(60000);
    await page.setRequestInterception(true);

    page.on("request", (req: HTTPRequest) => {
      const resourceType = req.resourceType();
      if (resourceType === "image" || resourceType === "stylesheet" || resourceType === "font") {
        req.abort();
      } else {
        req.continue();
      }
    });

    try {
      new URL(url);
    } catch (e) {
      return { error: `الرابط الذي أدخلته غير صحيح. يرجى التحقق من الرابط والمحاولة مرة أخرى.`, isScrapingError: true };
    }

    await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
    await page.setExtraHTTPHeaders({
      "accept-language": "en-US,en;q=0.9,ar;q=0.8",
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    });

    const isShopify = url.includes('/products/');
    if (isShopify) {
        console.log(`🔎 اكتشف متجر Shopify. جارٍ استخدام endpoint JSON...`);
        const shopifyVariants = await scrapeShopifyProductJson(url);
        if (shopifyVariants) {
            return {
                title: shopifyVariants[0].title.split(' - ')[0],
                price: shopifyVariants[0].price,
                currency: shopifyVariants[0].currency,
                image: shopifyVariants[0].image,
                fullPrice: shopifyVariants[0].fullPrice,
                originalText: shopifyVariants[0].originalText,
                variants: shopifyVariants,
            };
        }
    }
    
    console.log(`🔄 جارٍ تحميل: ${url}`);
    let pageLoaded = false;
    let attempts = 0;
    const maxAttempts = 3;

    while (!pageLoaded && attempts < maxAttempts) {
      attempts++;
      console.log(`📡 محاولة ${attempts}/${maxAttempts}`);
      try {
        const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
        if (!response || response.status() >= 400) { throw new Error(`خطأ في تحميل الصفحة، الكود: ${response ? response.status() : "لا يوجد"}`); }
        pageLoaded = true;
        console.log("✅ تم تحميل الصفحة بنجاح");
      } catch (error: any) {
        console.log(`❌ فشلت المحاولة ${attempts}: ${error.message}`);
        if (attempts === maxAttempts) { return { error: `فشل في الوصول إلى الرابط. قد يكون الرابط غير صحيح أو الموقع لا يستجيب. يرجى المحاولة لاحقاً.`, isScrapingError: true, }; }
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    console.log("⏳ انتظار المحتوى...");
    try {
      await page.waitForSelector('.price, [class*="price" i], [itemprop="price"], .amount, #prcIsum, .a-price, .prc', { timeout: 8000 });
      console.log("💰 تم العثور على عناصر السعر");
    } catch {
      console.log("⏰ انتظار إضافي للمحتوى...");
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }

    let title: string;
    try {
      const pageTitle = await page.title();
      title = pageTitle || "Unknown Product";
      console.log(`📄 العنوان: ${title}`);
    } catch {
      title = "❌ لم يتم العثور على العنوان";
    }
    
    console.log("💲 جارٍ استخراج البيانات...");
    const jsonLdVariants = await extractJsonLdVariants(page, title);
    if (jsonLdVariants.length > 0) {
      return {
        title: title, price: jsonLdVariants[0].price, currency: jsonLdVariants[0].currency,
        image: jsonLdVariants[0].image, fullPrice: jsonLdVariants[0].fullPrice, originalText: jsonLdVariants[0].originalText,
        variants: jsonLdVariants
      };
    }

    const variants = await extractVariants(page, title);
    if (variants.length > 0) {
      return {
        title: title, price: variants[0].price, currency: variants[0].currency,
        image: variants[0].image, fullPrice: variants[0].fullPrice, originalText: variants[0].originalText,
        variants: variants
      };
    }

    const priceData = await extractPrice(page);
    const currencyData = await extractCurrency(page);
    const imageData = await extractImage(page);
    
    let fullPriceText: string;
    if (priceData.price === null) {
      fullPriceText = "المنتج غير متوفر";
    } else {
      fullPriceText = currencyData.currency ? `${priceData.price.toLocaleString("en-US")} ${currencyData.currency}` : priceData.price.toLocaleString("en-US");
    }

    const result: ScrapedProductData = {
      title, price: priceData.price, currency: currencyData.currency,
      fullPrice: fullPriceText, originalText: priceData.originalText,
      image: imageData.image,
    };

    console.log(`💰 البيانات المستخرجة:`, result);
    return result;
  } catch (err: any) {
    console.error(`🚨 خطأ عام: ${err.message}`);
    return { error: `حدث خطأ غير متوقع أثناء معالجة طلبك. يرجى إرسال تقرير بالمشكلة لتتم معالجتها.`, isScrapingError: true, };
  } finally {
    if (browser) { await browser.close(); }
  }
}