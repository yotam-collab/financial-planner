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
  /** Monthly rental income from a sub-unit in the home (נטו, today's values) */
  rentalIncomeFromUnit: number;
  /** Monthly income from solar panels (נטו, today's values) */
  solarIncome: number;
}

export interface MarketConfig {
  realReturnRate: number;
  inflationRate: number;
  realHomeAppreciation: number;
  pensionConversionFactor: number;
}

export interface ScenarioConfig {
  /** Calendar year the simulation starts (default 2026) */
  simulationStartYear: number;
  /** Yotam's birth year/month (for display + age calc) */
  yotamBirthYear: number;
  yotamBirthMonth: number;
  /** Hadas's birth year/month */
  hadasBirthYear: number;
  hadasBirthMonth: number;

  startAge: number;
  endAge: number;
  /** Year (1-based) to buy a house, or null = never buy */
  housePurchaseYear: number | null;
  /** Yotam's age at which zinuk (business) ends and post-zinuk income begins */
  zinukEndAge: number;
  /** Yotam's age at which pension annuity begins (60-67) */
  pensionStartAge: number;
  /** Hadas's current age at simulation start */
  hadasAge: number;
  /** Hadas's age at which pension annuity begins (60-65) */
  hadasPensionStartAge: number;
  /** Yotam's age at full retirement — no more earned income */
  fullRetirementAge: number;
  /** Hadas's age at full retirement — no more earned income */
  hadasFullRetirementAge: number;
  assets: AssetConfig;
  income: IncomeConfig;
  expenses: ExpenseConfig;
  house: HouseConfig;
  market: MarketConfig;
}

export interface YearResult {
  year: number;
  age: number;          // Yotam's age (primary)
  calendarYear: number; // Actual calendar year (e.g. 2026)
  yotamAge: number;     // Same as age; explicit alias
  hadasAge: number;     // Hadas's age in this year
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
  monthlyRentalIncomeFromUnit: number;
  monthlySolarIncome: number;
  // Per-person income breakdown for detail view
  yotamMonthlyIncome: number;   // Yotam's current earned income this year
  hadasMonthlyIncome: number;   // Hadas's current earned income this year
  yotamPensionPayoutMonthly: number;  // Yotam's portion of pension annuity
  hadasPensionPayoutMonthly: number;  // Hadas's portion of pension annuity
  // Housing detail
  monthlyNonHousingExpense: number;
  monthlyHousingExpense: number;
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
    monthlyBalance: number;
    monthlySustainableIncome: number;
  };
}

export interface SimulationResult {
  years: YearResult[];
  earliestRetirementAge: number | null;
  depletionAge: number | null;
  scenarioLabel: string;
}
