import type { ScenarioConfig, AssetConfig, IncomeConfig, ExpenseConfig, HouseConfig, MarketConfig, HappinessConfig } from './types';

export const DEFAULT_ASSETS: AssetConfig = {
  liquidPortfolio: 1_900_000,
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
  // Yotam — salaried at own company during zinuk, consulting/alt post-zinuk
  yotamNetIncomeZinuk: 22_000,
  yotamNetIncomePostZinuk: 15_000,
  // Yotam pension: 6%+6.5%+6% capped at max deposit = 5,645
  yotamMonthlyPensionContribution: 5_645,
  // Hadas — self-employed
  hadasNetIncomeZinuk: 25_000,
  hadasNetIncomePostZinuk: 10_000,
  // Self-employed mandatory pension (4.45% + 12.55% on avg wage)
  hadasMonthlyPensionContribution: 1_170,
  monthlyLiquidContributionRenting: 17_000,
  monthlyLiquidContributionOwning: 10_000,
};

export const DEFAULT_EXPENSES: ExpenseConfig = {
  monthlyNonHousingExpenses: 26_000,
  monthlyRent: 9_500,
};

export const DEFAULT_HOUSE: HouseConfig = {
  priceToday: 4_800_000,
  renovationCost: 200_000,
  // Legacy fields (auto-computed now, kept for migration)
  purchaseTaxRate: 0.03,
  closingCosts: 0,
  // Transaction fees (research-backed Israeli market standards, 2026)
  lawyerFeeRate: 0.005,   // 0.5% + מע"מ — שיעור שוק מקובל (0.5-1%)
  brokerFeeRate: 0.02,    // 2% + מע"מ — תקרה בחוק; 0 אם אין מתווך
  otherClosingCosts: 15_000, // טאבו ~1.5K + שמאי ~3K + ביטוחי משכנתא ~2K + הובלה ~7K
  mortgageLTV: 0.70,
  mortgageRate: 0.052,
  mortgageTerm: 25,
  rentalIncomeFromUnit: 3_400,
  solarIncome: 500,
};

export const DEFAULT_MARKET: MarketConfig = {
  realReturnRate: 0.06,
  inflationRate: 0.025,
  realHomeAppreciation: 0.02,
  pensionConversionFactor: 216,
};

export const DEFAULT_HAPPINESS: HappinessConfig = {
  // Weights — normalized at compute time. These defaults roughly balance the 8 dimensions
  // with slight emphasis on family & financial calm (core to the framing of this app).
  weightTimeWithKids: 18,
  weightFamilyVacations: 11,
  weightFinancialCalm: 16,
  weightOwnHome: 11,
  weightPersonalDevelopment: 11,
  weightCommunityImpact: 10,
  weightTorahStudy: 13,
  weightFamilyExpansion: 10,
  // Kids birth years: 4 children — 2018, 2020, 2023, 2026. We only track oldest &
  // youngest; middle two are interpolated through midpoint of the age range.
  oldestChildBirthYear: 2018,
  youngestChildBirthYear: 2026,
};

export function createDefaultConfig(): ScenarioConfig {
  return {
    simulationStartYear: 2026,
    yotamBirthYear: 1981,
    yotamBirthMonth: 12,
    hadasBirthYear: 1990,
    hadasBirthMonth: 2,

    startAge: 44,
    endAge: 85,
    housePurchaseYear: 1,
    zinukEndAge: 52,
    pensionStartAge: 60,
    hadasAge: 35,
    hadasPensionStartAge: 65,
    fullRetirementAge: 67,
    hadasFullRetirementAge: 67,
    assets: { ...DEFAULT_ASSETS },
    income: { ...DEFAULT_INCOME },
    expenses: { ...DEFAULT_EXPENSES },
    house: { ...DEFAULT_HOUSE },
    market: { ...DEFAULT_MARKET },
    happiness: { ...DEFAULT_HAPPINESS },
  };
}
