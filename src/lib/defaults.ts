import type { ScenarioConfig, AssetConfig, IncomeConfig, ExpenseConfig, HouseConfig, MarketConfig } from './types';

export const DEFAULT_ASSETS: AssetConfig = {
  liquidPortfolio: 1_770_000,
  pension: 800_000,
  kerenHishtalmut: 200_000,
  kerenHishtalmutLiquidAge: 47,
  apartmentNetProceeds: 1_180_000,
  usRealEstateNonProducing: 365_000,
  usRealEstateProducing: 290_000,
  usRealEstateProducingYieldRate: 0.06,
  usRealEstateProducingSellYear: 4,
  usRealEstateProducingSellMultiplier: 2,
};

export const DEFAULT_INCOME: IncomeConfig = {
  monthlyGrossBusinessIncome: 100_000,
  monthlyNetBusinessIncome: 65_000,
  monthlyPensionContribution: 3_200,
  monthlyLiquidContributionRenting: 17_000,
  monthlyLiquidContributionOwning: 10_000,
  monthlyGrossAltIncome: 20_000,
  monthlyNetAltIncome: 15_000,
};

export const DEFAULT_EXPENSES: ExpenseConfig = {
  monthlyNonHousingExpenses: 22_000,
  monthlyRent: 11_000,
};

export const DEFAULT_HOUSE: HouseConfig = {
  priceToday: 4_800_000,
  renovationCost: 200_000,
  purchaseTaxRate: 0.03,
  closingCosts: 130_000,
  mortgageLTV: 0.60,
  mortgageRate: 0.05,
  mortgageTerm: 25,
};

export const DEFAULT_MARKET: MarketConfig = {
  realReturnRate: 0.06,
  inflationRate: 0.03,
  realHomeAppreciation: 0.02,
  pensionConversionFactor: 220,
};

export function createBuyNowConfig(): ScenarioConfig {
  return {
    startAge: 44, endAge: 85,
    housePurchaseYear: 1,
    zinukEndAge: 52,
    pensionStartAge: 60,
    fullRetirementAge: 67,
    assets: { ...DEFAULT_ASSETS },
    income: { ...DEFAULT_INCOME },
    expenses: { ...DEFAULT_EXPENSES },
    house: { ...DEFAULT_HOUSE },
    market: { ...DEFAULT_MARKET },
  };
}

export function createRentForeverConfig(): ScenarioConfig {
  return {
    startAge: 44, endAge: 85,
    housePurchaseYear: null,
    zinukEndAge: 52,
    pensionStartAge: 60,
    fullRetirementAge: 67,
    assets: { ...DEFAULT_ASSETS },
    income: { ...DEFAULT_INCOME },
    expenses: { ...DEFAULT_EXPENSES },
    house: { ...DEFAULT_HOUSE },
    market: { ...DEFAULT_MARKET },
  };
}

export function createBuyLaterConfig(buyAtAge: number = 52): ScenarioConfig {
  return {
    startAge: 44, endAge: 85,
    housePurchaseYear: buyAtAge - 44 + 1,
    zinukEndAge: 52,
    pensionStartAge: 60,
    fullRetirementAge: 67,
    assets: { ...DEFAULT_ASSETS },
    income: { ...DEFAULT_INCOME },
    expenses: { ...DEFAULT_EXPENSES },
    house: { ...DEFAULT_HOUSE },
    market: { ...DEFAULT_MARKET },
  };
}
