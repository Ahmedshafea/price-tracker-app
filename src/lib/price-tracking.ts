// في ملف src/lib/price-tracking.ts
import { db } from '@/lib/db';
import ZAI from 'z-ai-web-dev-sdk';
import { scrapeProduct, ScrapedProductData } from './scraper';
import { pricingStrategyService } from './pricing-strategy';
import axios from 'axios';
import { normalizeCurrency } from './extractors';

export class PriceTrackingService {
  private zai: typeof ZAI | null;
  constructor() { this.zai = null; }
  private async initializeZAI() {
    if (!this.zai) { this.zai = await ZAI.create(); }
    return this.zai;
  }
  // --- دوال Scraping والتحليل ---
  async scrapeProductData(url: string): Promise<ScrapedProductData | null> {
    try { return await scrapeProduct(url); } catch (error) {
      console.error('Error scraping product data:', error);
      return null;
    }
  }
  private determineStockStatus(originalText?: string): string {
    const text = originalText?.toLowerCase();
    if (!text) return 'UNKNOWN';
    if (text.includes('out of stock') || text.includes('غير متوفر') || text.includes('نفدت الكمية')) {
      return 'OUT_OF_STOCK';
    }
    return 'IN_STOCK';
  }
  // ⚠️ دالة جديدة ومحسنة لتحويل العملات
  private async convertPrice(from: string, to: string, amount: number): Promise<number> {
    const normalizedFrom = normalizeCurrency(from);
    const normalizedTo = normalizeCurrency(to);
    if (normalizedFrom === normalizedTo) {
      return amount;
    }
    try {
      const response = await axios.get(`https://open.er-api.com/v6/latest/${normalizedFrom}`);
      if (!response.data || !response.data.rates || !response.data.rates[normalizedTo]) {
        console.warn(`⚠️ Currency not supported: ${from} -> ${to}. Returning original amount.`);
        return amount;
      }
      const rate = response.data.rates[normalizedTo];
      return amount * rate;
    } catch (error) {
      console.error(`Error converting currency ${from} -> ${to}:`, error);
      return amount;
    }
  }

  async scrapeAndSaveProduct(productId: string, url: string) {
      try {
          const scrapedData = await this.scrapeProductData(url);
          if (scrapedData && 'title' in scrapedData) {
              await db.product.update({
                  where: { id: productId },
                  data: {
                      name: scrapedData.title,
                      currentPrice: scrapedData.price || 0,
                      currency: scrapedData.currency || 'USD',
                      imageUrl: scrapedData.image,
                  },
              });
          }
      } catch (error) {
          console.error(`Failed to scrape and save product ${productId}:`, error);
      }
  }

  async addProductFromUrl(url: string, userId: string) {
    try {
        const scrapedData: ScrapedProductData | null = await this.scrapeProductData(url);
        if (!scrapedData || !scrapedData.title) { // ⚠️ Check if title is present
          console.log("Scraped result:", scrapedData);
          throw new Error('Failed to scrape product data or title is missing');
        }
        const productsToCreate = scrapedData.variants && scrapedData.variants.length > 0
            ? scrapedData.variants
            : [scrapedData];
        const createdProducts = [];
        for (const productData of productsToCreate) {
            const product = await db.product.create({
                data: {
                    name: productData.title || 'Unknown Product', // ⚠️ Provide a fallback name
                    currentPrice: productData.price || 0,
                    currency: productData.currency || 'USD',
                    imageUrl: productData.image,
                    productUrl: url,
                    userId,
                },
            });
            createdProducts.push(product);
        }
        return { success: true, products: createdProducts, scrapedData };
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('Error adding product from URL:', errorMessage);
        return { success: false, error: errorMessage };
    }
  }
async addCompetitorProduct(productId: string, url: string) {
    try {
      const scrapedData: ScrapedProductData | null = await this.scrapeProductData(url);
      if (!scrapedData) {
        throw new Error('Failed to scrape competitor product data');
      }
      const competitorsToCreate = scrapedData.variants && scrapedData.variants.length > 0
        ? scrapedData.variants
        : [scrapedData];
      const createdCompetitors = [];
      for (const competitorData of competitorsToCreate) {
        const competitor = await db.competitorProduct.create({
          data: {
            name: competitorData.title || 'Unknown Competitor',
            url,
            currentPrice: competitorData.price || 0,
            currency: competitorData.currency || 'USD',
            imageUrl: competitorData.image,
            productId,
          },
        });
        createdCompetitors.push(competitor);
      }
      return { success: true, competitors: createdCompetitors };
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('Error adding competitor product:', errorMessage);
        return { success: false, error: errorMessage };
    }
  }
  async deleteCompetitorProduct(competitorId: string) {
    try {
      await db.competitorProduct.delete({
        where: { id: competitorId },
      });
      return { success: true };
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('Error deleting competitor product:', errorMessage);
        return { success: false, error: errorMessage };
    }
  }
  async trackSingleCompetitor(competitor: { id: string; url: string; productId: string; currentPrice: number | null; currency?: string }): Promise<{ priceChanged: boolean }> {
    let priceChanged = false;
    try {
      const scrapedData = await this.scrapeProductData(competitor.url);
      const mainProduct = await db.product.findUnique({ where: { id: competitor.productId } });
      if (!mainProduct) return { priceChanged: false };
      if (!scrapedData || scrapedData.price === null) return { priceChanged: false };
      const convertedPrice = await this.convertPrice(scrapedData.currency || 'USD', mainProduct.currency, scrapedData.price || 0);
      if (convertedPrice !== competitor.currentPrice) {
        priceChanged = true;
      }
      await db.competitorProduct.update({
        where: { id: competitor.id },
        data: {
          currentPrice: convertedPrice,
          name: scrapedData.title || competitor.name,
          updatedAt: new Date(),
          currency: mainProduct.currency, // ⚠️ حفظ العملة الموحدة
        },
      });
      return { priceChanged };
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Error tracking competitor ${competitor.id}:`, errorMessage);
        return { priceChanged: false };
    }
  }
  async applyPricingStrategies(product: { id: string; currentPrice: number | null; currency: string; cost: number | null }) {
    const productData = await db.product.findUnique({
      where: { id: product.id },
      include: {
        competitors: true,
        strategies: {
          where: { isActive: true },
          include: { strategy: true },
        },
      },
    });
    if (!productData || productData.strategies.length === 0) {
      return;
    }
    const activeStrategy = productData.strategies[0];
    const strategyConfig = JSON.parse(activeStrategy.strategy.config);
    const competitorsWithPrices = productData.competitors.filter(c => c.currentPrice !== null);
    if (productData.currentPrice === null) {
      console.warn(`Main product ${productData.id} has no price. Cannot apply pricing strategy.`);
      return;
    }
    if (competitorsWithPrices.length === 0) {
      console.warn(`No competitor prices available for product ${productData.id}. Cannot apply pricing strategy.`);
      return;
    }
    const recommendedPriceResult = pricingStrategyService.calculateRecommendedPrice(
      { price: productData.currentPrice.toNumber(), currency: productData.currency, cost: productData.cost?.toNumber() || null },
      competitorsWithPrices,
      strategyConfig
    );
    if (recommendedPriceResult) {
      await db.productStrategy.update({
        where: { id: activeStrategy.id },
        data: {
          recommendedPrice: recommendedPriceResult.recommendedPrice,
        },
      });
    }
  }
}
const priceTrackingService = new PriceTrackingService();
export { priceTrackingService };