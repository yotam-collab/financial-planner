/** All monetary values are in ILS (nominal) unless noted otherwise */

export interface AssetConfig {
  liquidPortfolio: number;
  yotamPension: number;
  hadasPension: number;
  kerenHishtalmut: number;
  kerenHishtalmutLiquidAge: number;
  apartmentNetProceeds: number;
  usRealEstateNonProducing: number;
  usRealEstateProducing: number;
  usRealEstateProducingYieldRate: number;
  usRealEstateProducingSellYear: number;
  usRealEstateProducingSellMultiplier: number;
}

export interface IncomeConfig {
  // Yotam — during zinuk (salaried from own company) and post-zinuk (consulting/alt)
  yotamNetIncomeZinuk: number;
  yotamNetIncomePostZinuk: number;
  yotamMonthlyPensionContribution: number;
  // Hadas — self-employed, may continue working post-zinuk
  hadasNetIncomeZinuk: number;
  hadasNetIncomePostZinuk: number;
  hadasMonthlyPensionContribution: number;
  // Household liquid savings (derived from total income minus expenses)
  monthlyLiquidContributionRenting: number;
  monthlyLiquidContributionOwning: number;
}

export interface ExpenseConfig {
  monthlyNonHousingExpenses: number;
  monthlyRent: number;
}

export interface HouseConfig {
  priceToday: number;
  renovationCost: number;
  purchaseTaxRate: number;
  closingCosts: number;
  mortgageLTV: number;
  mortgageRate: number;
  mortgageTerm: number;
}

export interface MarketConfig {
  realReturnRate: number;
  inflationRate: number;
  realHomeAppreciation: number;
  pensionConversionFactor: number;
}

export interface ScenarioConfig {
  startAge: number;
  endAge: number;
  /** Year (1-based) to buy a house, or null = never buy */
  housePurchaseYear: number | null;
  /** Yotam's age at which zinuk (business) ends and post-zinuk income begins */
  zinukEndAge: number;
  /** Yotam's age at which pension annuity begins (60-67) */
  pensionStartAge: number;
  /** Hadas's current age */
  hadasAge: number;
  /** Hadas's age at which pension annuity begins (60-65) */
  hadasPensionStartAge: number;
  /** Yotam's age at full retirement — no more earned income at all */
  fullRetirementAge: number;
  assets: AssetConfig;
  income: IncomeConfig;
  expenses: ExpenseConfig;
  house: HouseConfig;
  market: MarketConfig;
}

export interface YearResult {
  year: number;
  age: number;
  phase: 'zinuk' | 'altIncome' | 'retired';
  isWorking: boolean;
  housingStatus: 'renting' | 'owning';
  liquidPortfolio: number;
  pension: number;
  monthlyPensionPayout: number;
  homeEquity: number;
  mortgageBalance: number;
  monthlyMortgagePayment: number;
  homeValue: number;
  netWorth: number;
  annualIncome: number;
  annualExpenses: number;
  annualHousingCost: number;
  annualCashflow: number;
  isDepleted: boolean;

  monthlyZinukIncome: number;
  monthly4pctWithdrawal: number;
  monthlyPensionIncome: number;
  monthlyAltIncome: number;
  monthlySustainableIncome: number;
  monthlyBalance: number;
  isFullyRetired: boolean;
  monthlyExpenses: number;

  real: {
    liquidPortfolio: number;
    pension: number;
    homeEquity: number;
    netWorth: number;
    annualIncome: number;
    annualExpenses: number;
    annualCashflow: number;
    monthly4pctWithdrawal: number;
  };
}

export interface SimulationResult {
  years: YearResult[];
  earliestRetirementAge: number | null;
  depletionAge: number | null;
  scenarioLabel: string;
}
