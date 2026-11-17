import type { ScenarioConfig, AssetConfig, IncomeConfig, ExpenseConfig, HouseConfig, MarketConfig, HappinessConfig } from './types';

export const DEFAULT_ASSETS: AssetConfig = {
  liquidPortfolio: 2_105_000,
  yotamPension: 567_961,
  hadasPension: 183_889,
  // Per-person keren hishtalmut.
  yotamKerenHishtalmut: 106_603,
  yotamKerenHishtalmutLiquidAge: 47,
  hadasKerenHishtalmut: 70_400,
  hadasKerenHishtalmutLiquidAge: 38,
  // Legacy fields kept for migration only — see useFinancialState mergeConfig.
  kerenHishtalmut: 0,
  kerenHishtalmutLiquidAge: 47,
  apartmentNetProceeds: 1_180_000,
  // Or Akiva apartment — SOLD (11/2026); the keep path is dormant (UI removed). When keep=true,
  // values combine BOTH Mizrahi-Tefahot mortgages on the property (04/2026 docs):
  //   Original (tik 437264203): balance 472,187, monthly 4,479 (parts 6+7)
  //   Refinance (tik 442338257): balance 766,438, monthly 3,288 (part 1) + ~1,200 (part 2)
  //   User-reported total outstanding: ~1,040,000
  //   Combined monthly: ~7,800 (sum of the active monthly debits)
  //   End year: 2053 (the longest of the four parts)
  //   Current market value: 2,350,000 (user-provided)
  orAkivaKeep: false,
  orAkivaCurrentValue: 2_350_000,
  orAkivaMonthlyRent: 6_200,
  orAkivaMortgageBalance: 1_040_000,
  orAkivaMonthlyMortgage: 7_800,
  orAkivaMortgageEndYear: 2053,
  orAkivaMonthlyExpenses: 500,
  // DEPRECATED — ignored by the engine since the 2026-04 audit (they used to
  // inject invisible cash). Zeroed so no stale value ever resurfaces.
  usRealEstateNonProducing: 0,
  usRealEstateProducing: 0,
  usRealEstateProducingYieldRate: 0,
  usRealEstateProducingSellYear: 0,
  usRealEstateProducingSellMultiplier: 0,
};

export const DEFAULT_INCOME: IncomeConfig = {
  // Yotam — salaried at own company during zinuk, consulting/alt post-zinuk
  // Net is post-pension (תלוש already deducts the contribution)
  yotamNetIncomeZinuk: 30_000,
  yotamNetIncomePostZinuk: 15_000,
  yotamMonthlyPensionContribution: 5_529,
  // Hadas — עוסק מורשה. Net is BEFORE she sends her pension contribution.
  hadasNetIncomeZinuk: 23_000,
  hadasNetIncomePostZinuk: 10_000,
  hadasMonthlyPensionContribution: 4_075,
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
  // BOI cut to 3.5% (07/2026); new 25y blended mixes run ~4.7-5.0% nominal
  mortgageRate: 0.049,
  mortgageTerm: 25,
  rentalIncomeFromUnit: 3_400,
  solarIncome: 500,
  // ~0.4%/yr of value: repairs, roof/AC/solar upkeep, building insurance
  monthlyMaintenance: 1_500,
  motherContribution: 0,
  motherRentYears: 20,
};

export const DEFAULT_MARKET: MarketConfig = {
  // Real, after-tax. DMS Yearbook world equities ~5.2% real BEFORE tax since 1900;
  // Israel taxes 25% of REAL gains → ~4-5% real after tax for an equity-heavy mix.
  // 6% was optimistic; keep it available on the slider as an explicit upside case.
  realReturnRate: 0.045,
  inflationRate: 0.025,
  realHomeAppreciation: 0.02,
  // Interpreted at anchor age 61 (auto-adjusts ±4.7/yr by actual retirement age;
  // calibrated to Menora 2025/26 tables: 60→221, 67→188)
  pensionConversionFactor: 216,
  // Reference withdrawal rate. Bengen 4% = 30-year horizons; Morningstar 2025
  // recommends ~3.0-3.3% for 40-year horizons (retiring in early 50s).
  withdrawalRate: 0.04,
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
    endAge: 95, // covers Hadas to 87 (Yotam 95)
    housePurchaseYear: 1,
    zinukEndAge: 52,
    // 67 = statutory age: the annuity is ~tax-free then; drawn at 60 on top of work income ~45% goes to tax+BL
    pensionStartAge: 67,
    hadasAge: 36, // born 02/1990 → 36 for 11 months of 2026
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
