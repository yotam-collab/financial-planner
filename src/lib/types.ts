/** All monetary values are in ILS (nominal) unless noted otherwise */

export interface AssetConfig {
  liquidPortfolio: number;
  pension: number;
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
  monthlyGrossBusinessIncome: number;
  monthlyNetBusinessIncome: number;
  monthlyPensionContribution: number;
  monthlyLiquidContributionRenting: number;
  monthlyLiquidContributionOwning: number;
  monthlyGrossAltIncome: number;
  monthlyNetAltIncome: number;
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
  /** מקדם המרה — monthly payout = balance / mekaddem (~200) */
  pensionConversionFactor: number;
}

export interface ScenarioConfig {
  startAge: number;
  endAge: number;
  /** Year (relative to start, 1-based) in which to buy a house. null = never buy */
  housePurchaseYear: number | null;
  /** Age at which zinuk (business) income stops and alt income begins */
  zinukEndAge: number;
  /** Age at which pension annuity begins (60-67 in Israel) */
  pensionStartAge: number;
  /** Age at which user fully retires — no earned income, only 4% + pension */
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
  /** Phase: 'zinuk' | 'altIncome' | 'retired' */
  phase: 'zinuk' | 'altIncome' | 'retired';
  isWorking: boolean;
  housingStatus: 'renting' | 'owning';
  liquidPortfolio: number;
  /** Locked pension balance (0 after age 60 when converted to annuity) */
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

  // ─── Monthly breakdown (for the main chart) ───
  /** Monthly zinuk (business) income — only during zinuk phase */
  monthlyZinukIncome: number;
  /** Monthly 4% sustainable withdrawal from liquid portfolio */
  monthly4pctWithdrawal: number;
  /** Monthly pension annuity payout */
  monthlyPensionIncome: number;
  /** Monthly alternative income (post-business) */
  monthlyAltIncome: number;
  /** Total monthly sustainable income = 4% + pension + alt income (or just 4% + pension if fully retired) */
  monthlySustainableIncome: number;
  /** יתרה חודשית = sustainable income - expenses. Positive = surplus, negative = deficit */
  monthlyBalance: number;
  /** Is this person fully retired (no alt income)? */
  isFullyRetired: boolean;
  /** Monthly expenses (housing + non-housing, inflation-adjusted) */
  monthlyExpenses: number;

  real: {
    liquidPortfolio: number;
    pension: number;
    homeEquity: number;
    netWorth: number;
    annualIncome: number;
    annualExpenses: number;
    annualCashflow: number;
  };
}

export interface SimulationResult {
  years: YearResult[];
  /** Earliest age at which sustainable income >= expenses */
  earliestRetirementAge: number | null;
  depletionAge: number | null;
  scenarioLabel: string;
}
