// في ملف src/lib/pricing-strategy.ts

export interface StrategyConfig {
  strategyType: 'lower' | 'higher' | 'match'
  competitorType: 'cheapest' | 'most_expensive' | 'average'
  adjustmentType: 'fixed' | 'percent'
  adjustmentValue: number
  minPriceConstraint?: { type: 'fixed' | 'percent'; value: number } | null;
  maxPriceConstraint?: { type: 'fixed' | 'percent'; value: number } | null;
}

export interface PricingStrategyResult {
  recommendedPrice: number
  appliedStrategy: string
  competitorPrice: number
}

export class PricingStrategyService {
  /**
   * Calculate recommended price based on strategy
   */
  calculateRecommendedPrice(
    mainProduct: { price: number | null; currency: string; cost: number | null },
    competitors: Array<{ currentPrice: number | null }>,
    strategy: StrategyConfig
  ): PricingStrategyResult | null {
    if (!competitors || competitors.length === 0 || mainProduct.price === null || mainProduct.cost === null) {
      // يجب وجود تكلفة المنتج لحساب الشروط
      return null;
    }

    const toNumberSafe = (val: unknown): number | null => {
      if (val === null || val === undefined) return null;
      if (typeof (val as any)?.toNumber === "function") {
        return (val as any).toNumber();
      }
      const n = Number(val as unknown as number);
      return Number.isFinite(n) ? n : null;
    };

    const validCompetitorPrices = competitors
      .map((comp) => toNumberSafe(comp.currentPrice))
      .filter((n): n is number => n !== null);

    if (validCompetitorPrices.length === 0) {
      return null
    }

    const { strategyType, competitorType, adjustmentType, adjustmentValue } = strategy

    // Calculate base price based on competitor type
    let basePrice: number
    switch (competitorType) {
      case 'cheapest':
        basePrice = Math.min(...validCompetitorPrices)
        break
      case 'most_expensive':
        basePrice = Math.max(...validCompetitorPrices)
        break
      case 'average':
      default:
        const sum = validCompetitorPrices.reduce((a, b) => a + b, 0)
        basePrice = sum / validCompetitorPrices.length
        break
    }

    // Apply strategy and adjustment
    let recommendedPrice: number
    let strategyDescription: string

    switch (strategyType) {
      case 'lower':
        if (adjustmentType === 'fixed') {
          recommendedPrice = basePrice - adjustmentValue
          strategyDescription = `Undercut by ${mainProduct.currency} ${adjustmentValue.toFixed(2)}`
        } else { // percent
          recommendedPrice = basePrice * (1 - adjustmentValue / 100)
          strategyDescription = `Undercut by ${adjustmentValue}%`
        }
        break

      case 'higher':
        if (adjustmentType === 'fixed') {
          recommendedPrice = basePrice + adjustmentValue
          strategyDescription = `Premium by ${mainProduct.currency} ${adjustmentValue.toFixed(2)}`
        } else { // percent
          recommendedPrice = basePrice * (1 + adjustmentValue / 100)
          strategyDescription = `Premium by ${adjustmentValue}%`
        }
        break

      case 'match':
      default:
        recommendedPrice = basePrice
        strategyDescription = 'Match competitor price'
        break
    }

    // Ensure price is not negative
    recommendedPrice = Math.max(0, recommendedPrice)

    // ⚠️ تطبيق شروط السعر الجديدة
    if (strategy.minPriceConstraint && mainProduct.cost !== null) {
        let minPrice = 0;
        if (strategy.minPriceConstraint.type === 'fixed') {
            minPrice = mainProduct.cost + strategy.minPriceConstraint.value;
        } else { // percent
            minPrice = mainProduct.cost * (1 + strategy.minPriceConstraint.value / 100);
        }
        recommendedPrice = Math.max(recommendedPrice, minPrice);
    }
    
    if (strategy.maxPriceConstraint && mainProduct.cost !== null) {
        let maxPrice = 0;
        if (strategy.maxPriceConstraint.type === 'fixed') {
            maxPrice = mainProduct.cost + strategy.maxPriceConstraint.value;
        } else { // percent
            maxPrice = mainProduct.cost * (1 + strategy.maxPriceConstraint.value / 100);
        }
        recommendedPrice = Math.min(recommendedPrice, maxPrice);
    }
    
    return {
      recommendedPrice: parseFloat(recommendedPrice.toFixed(2)),
      appliedStrategy: strategyDescription,
      competitorPrice: basePrice
    }
  }
}

export const pricingStrategyService = new PricingStrategyService()