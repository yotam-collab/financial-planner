import type { ScenarioConfig, AssetConfig, IncomeConfig, ExpenseConfig, HouseConfig, MarketConfig } from './types';

export const DEFAULT_ASSETS: AssetConfig = {
  liquidPortfolio: 1_770_000,
  yotamPension: 800_000,
  hadasPension: 200_000,
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
  // Yotam — salaried at own company, 100K gross → ~65K net during zinuk
  yotamNetIncomeZinuk: 65_000,
  // Post-zinuk: consulting/part-time work
  yotamNetIncomePostZinuk: 10_000,
  // Yotam pension: 6%+6.5%+6% capped at max deposit = 5,645
  yotamMonthlyPensionContribution: 5_645,
  // Hadas — self-employed, ~30K gross → ~22K net
  hadasNetIncomeZinuk: 22_000,
  // Hadas continues working post-zinuk (she's 43 when Yotam closes zinuk at 52)
  hadasNetIncomePostZinuk: 22_000,
  // Self-employed mandatory pension (4.45% + 12.55% on avg wage)
  hadasMonthlyPensionContribution: 1_170,
  monthlyLiquidContributionRenting: 17_000,
  monthlyLiquidContributionOwning: 10_000,
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
  inflationRate: 0.025,
  realHomeAppreciation: 0.02,
  pensionConversionFactor: 216,
};

export function createDefaultConfig(): ScenarioConfig {
  return {
    startAge: 44,
    endAge: 85,
    housePurchaseYear: 1, // default: buy immediately; set to null to never buy
    zinukEndAge: 52,
    pensionStartAge: 60,
    hadasAge: 35,
    hadasPensionStartAge: 65,
    fullRetirementAge: 67,
    assets: { ...DEFAULT_ASSETS },
    income: { ...DEFAULT_INCOME },
    expenses: { ...DEFAULT_EXPENSES },
    house: { ...DEFAULT_HOUSE },
    market: { ...DEFAULT_MARKET },
  };
}
