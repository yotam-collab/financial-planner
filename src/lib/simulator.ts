import type { ScenarioConfig, YearResult, SimulationResult } from './types';

export function calcMonthlyMortgagePayment(principal: number, annualRate: number, termYears: number): number {
  if (principal <= 0) return 0;
  const r = annualRate / 12;
  const n = termYears * 12;
  if (r === 0) return principal / n;
  return principal * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

export function remainingMortgageBalance(principal: number, annualRate: number, termYears: number, yearsPaid: number): number {
  if (principal <= 0 || yearsPaid >= termYears) return 0;
  const r = annualRate / 12;
  const n = termYears * 12;
  const p = yearsPaid * 12;
  if (r === 0) return Math.max(0, principal * (1 - p / n));
  return Math.max(0, principal * (Math.pow(1 + r, n) - Math.pow(1 + r, p)) / (Math.pow(1 + r, n) - 1));
}

export function calcPurchaseTaxRate(price: number): number {
  return price < 5_500_000 ? 0.03 : 0.04;
}

export function calcMonthlyPensionPayout(balance: number, mekaddem: number): number {
  return mekaddem <= 0 ? 0 : balance / mekaddem;
}

export function inflate(base: number, rate: number, years: number): number {
  return base * Math.pow(1 + rate, years);
}

export function deflate(nominal: number, rate: number, years: number): number {
  return nominal / Math.pow(1 + rate, years);
}

function runCore(config: ScenarioConfig): YearResult[] {
  const { startAge, endAge, housePurchaseYear, zinukEndAge, pensionStartAge,
    hadasAge, hadasPensionStartAge, fullRetirementAge,
    assets, income, expenses, house, market } = config;
  const totalYears = endAge - startAge + 1;
  const results: YearResult[] = [];

  let liquid = assets.liquidPortfolio + assets.apartmentNetProceeds;
  let yotamPension = assets.yotamPension;
  let hadasPension = assets.hadasPension;
  let keren = assets.kerenHishtalmut;
  let kerenMerged = false;
  let ownsHome = false;
  let homeVal = 0, mortBal = 0, mortPayment = 0, mortPrincipal = 0, mortStartYear = 0;
  let yotamPensionActive = false, yotamPensionPayout = 0;
  let hadasPensionActive = false, hadasPensionPayout = 0;

  const nomRet = (1 + market.realReturnRate) * (1 + market.inflationRate) - 1;
  const nomHA = (1 + market.realHomeAppreciation) * (1 + market.inflationRate) - 1;

  for (let yi = 0; yi < totalYears; yi++) {
    const year = yi + 1;
    const age = startAge + yi;
    const hadasCurrentAge = hadasAge + yi;
    const ye = yi;

    let phase: 'zinuk' | 'altIncome' | 'retired';
    if (age < zinukEndAge) phase = 'zinuk';
    else if (age < fullRetirementAge) phase = 'altIncome';
    else phase = 'retired';

    const isWorking = phase === 'zinuk';

    // Inflation-adjusted monthly values
    const nomRent = inflate(expenses.monthlyRent, market.inflationRate, ye);
    const nomNH = inflate(expenses.monthlyNonHousingExpenses, market.inflationRate, ye);

    // Income per person per phase (actual current income)
    const yotamIncome = phase === 'zinuk'
      ? inflate(income.yotamNetIncomeZinuk, market.inflationRate, ye)
      : phase === 'altIncome'
        ? inflate(income.yotamNetIncomePostZinuk, market.inflationRate, ye)
        : 0;

    const hadasIncome = phase === 'zinuk'
      ? inflate(income.hadasNetIncomeZinuk, market.inflationRate, ye)
      : phase === 'altIncome'
        ? inflate(income.hadasNetIncomePostZinuk, market.inflationRate, ye)
        : 0;

    const nomYPC = inflate(income.yotamMonthlyPensionContribution, market.inflationRate, ye);
    const nomHPC = inflate(income.hadasMonthlyPensionContribution, market.inflationRate, ye);

    // Windfalls
    if (year === 1) liquid += assets.usRealEstateNonProducing;
    if (year <= assets.usRealEstateProducingSellYear)
      liquid += assets.usRealEstateProducing * assets.usRealEstateProducingYieldRate;
    if (year === assets.usRealEstateProducingSellYear)
      liquid += assets.usRealEstateProducing * assets.usRealEstateProducingSellMultiplier;

    if (!kerenMerged && age >= assets.kerenHishtalmutLiquidAge) {
      liquid += keren; keren = 0; kerenMerged = true;
    }

    // House purchase
    if (housePurchaseYear !== null && year === housePurchaseYear && !ownsHome) {
      const p = inflate(house.priceToday, market.inflationRate, ye);
      const tx = calcPurchaseTaxRate(p);
      const nomReno = inflate(house.renovationCost, market.inflationRate, ye);
      const nomClosing = inflate(house.closingCosts, market.inflationRate, ye);
      const tot = p + nomReno + p * tx + nomClosing;
      const m = p * house.mortgageLTV;
      liquid -= (tot - m);
      ownsHome = true; homeVal = p; mortPrincipal = m; mortBal = m;
      mortPayment = calcMonthlyMortgagePayment(m, house.mortgageRate, house.mortgageTerm);
      mortStartYear = year;
    }

    // Pension annuity activation
    if (age >= pensionStartAge && !yotamPensionActive) {
      yotamPensionActive = true;
      yotamPensionPayout = calcMonthlyPensionPayout(yotamPension, market.pensionConversionFactor);
    }
    if (hadasCurrentAge >= hadasPensionStartAge && !hadasPensionActive) {
      hadasPensionActive = true;
      hadasPensionPayout = calcMonthlyPensionPayout(hadasPension, market.pensionConversionFactor);
    }

    const totalPensionPayout = yotamPensionPayout + hadasPensionPayout;

    // Monthly calcs
    const mHousing = ownsHome ? mortPayment : nomRent;
    const mExp = nomNH + mHousing;
    const m4pct = Math.max(0, liquid * 0.04 / 12);

    const mZinuk = phase === 'zinuk' ? yotamIncome + hadasIncome : 0;
    const mAlt = phase === 'altIncome' ? yotamIncome + hadasIncome : 0;

    // Sustainable income = income + pension + 4% (full picture)
    const mSustainable = (yotamIncome + hadasIncome) + totalPensionPayout + m4pct;

    // ─── Monthly balance shown in chart ───
    // Balance = sustainable income - expenses (includes 4% as "usable money")
    // Positive = income + pension + 4% cover expenses with surplus
    // Negative = even with 4% withdrawal, not enough → eating into principal
    const mBalance = mSustainable - mExp;

    // ─── Pension contributions (separate from liquid cashflow) ───
    if (phase === 'zinuk') {
      yotamPension += nomYPC * 12;
      hadasPension += nomHPC * 12;
    } else if (phase === 'altIncome') {
      if (income.yotamNetIncomePostZinuk > 0) yotamPension += nomYPC * 12;
      if (income.hadasNetIncomePostZinuk > 0) hadasPension += nomHPC * 12;
    }

    // ─── Actual cashflow to/from liquid ───
    // Only income + pension - expenses actually moves money.
    // The 4% is a REFERENCE metric; the portfolio grows at nomRet (compound),
    // which implicitly includes the return that makes 4% sustainable.
    // No double-counting: the 4% is shown in balance but not ADDED to liquid.
    const actualCashflow = ((yotamIncome + hadasIncome) + totalPensionPayout - mExp) * 12;
    liquid += actualCashflow;
    const cf = actualCashflow;

    // Growth
    if (liquid > 0) liquid *= (1 + nomRet);
    if (!yotamPensionActive) yotamPension *= (1 + nomRet);
    if (!hadasPensionActive) hadasPension *= (1 + nomRet);
    if (!kerenMerged) keren *= (1 + nomRet);

    if (ownsHome) {
      if (year > mortStartYear) homeVal *= (1 + nomHA);
      const ysp = year - mortStartYear;
      mortBal = ysp < house.mortgageTerm ? remainingMortgageBalance(mortPrincipal, house.mortgageRate, house.mortgageTerm, ysp) : 0;
      if (ysp >= house.mortgageTerm) mortPayment = 0;
    }

    const hEq = ownsHome ? Math.max(0, homeVal - mortBal) : 0;
    const dep = liquid <= 0;
    if (dep) liquid = 0;
    const yPenNW = yotamPensionActive ? 0 : yotamPension;
    const hPenNW = hadasPensionActive ? 0 : hadasPension;
    const totalPensionNW = yPenNW + hPenNW;
    const kNW = kerenMerged ? 0 : keren;
    const nw = liquid + totalPensionNW + kNW + hEq;

    results.push({
      year, age, phase, isWorking,
      housingStatus: ownsHome ? 'owning' : 'renting',
      liquidPortfolio: Math.round(liquid),
      pension: Math.round(totalPensionNW),
      monthlyPensionPayout: Math.round(totalPensionPayout),
      homeEquity: Math.round(hEq), mortgageBalance: Math.round(mortBal),
      monthlyMortgagePayment: Math.round(mortPayment), homeValue: Math.round(homeVal),
      netWorth: Math.round(nw),
      annualIncome: Math.round(mSustainable * 12),
      annualExpenses: Math.round(mExp * 12),
      annualHousingCost: Math.round(mHousing * 12), annualCashflow: Math.round(cf),
      isDepleted: dep,
      monthlyZinukIncome: Math.round(mZinuk),
      monthly4pctWithdrawal: Math.round(m4pct),
      monthlyPensionIncome: Math.round(totalPensionPayout),
      // monthlyAltIncome represents "post-zinuk income if you quit" (for sustainability display)
      monthlyAltIncome: Math.round(mAlt),
      monthlySustainableIncome: Math.round(mSustainable),
      monthlyBalance: Math.round(mBalance),
      monthlyExpenses: Math.round(mExp),
      isFullyRetired: phase === 'retired',
      real: {
        liquidPortfolio: Math.round(deflate(liquid, market.inflationRate, ye)),
        pension: Math.round(deflate(totalPensionNW, market.inflationRate, ye)),
        homeEquity: Math.round(deflate(hEq, market.inflationRate, ye)),
        netWorth: Math.round(deflate(nw, market.inflationRate, ye)),
        annualIncome: Math.round(deflate(mSustainable * 12, market.inflationRate, ye)),
        annualExpenses: Math.round(deflate(mExp * 12, market.inflationRate, ye)),
        annualCashflow: Math.round(deflate(cf, market.inflationRate, ye)),
        monthly4pctWithdrawal: Math.round(deflate(m4pct, market.inflationRate, ye)),
        monthlyBalance: Math.round(deflate(mBalance, market.inflationRate, ye)),
        monthlySustainableIncome: Math.round(deflate(mSustainable, market.inflationRate, ye)),
      },
    });
  }
  return results;
}

/**
 * Find the earliest age at which quitting zinuk is sustainable.
 * Criterion: monthly balance (sustainable income - expenses) >= 0 in EVERY
 * post-zinuk year. This matches what the chart displays.
 * Also requires portfolio not to deplete.
 */
export function findEarliestRetirementAge(config: ScenarioConfig): number | null {
  for (let quitAge = config.startAge; quitAge <= config.endAge; quitAge++) {
    const testConfig: ScenarioConfig = { ...config, zinukEndAge: quitAge };
    const years = runCore(testConfig);
    // Post-zinuk years must have non-negative balance (matches chart)
    const postZinukYears = years.filter(y => y.phase !== 'zinuk');
    if (postZinukYears.length === 0) continue;
    if (postZinukYears.some(y => y.monthlyBalance < 0)) continue;
    // Also check portfolio doesn't deplete
    const depleted = years.some(y => y.isDepleted && y.phase !== 'zinuk');
    if (depleted) continue;
    return quitAge;
  }
  return null;
}

export function simulate(config: ScenarioConfig): SimulationResult {
  const earliestRetirementAge = findEarliestRetirementAge(config);
  const years = runCore(config);
  const dep = years.find(y => y.isDepleted && y.phase !== 'zinuk');
  const { housePurchaseYear: hpy, startAge } = config;
  const label = hpy === null
    ? 'ללא קניית בית'
    : hpy === 1
      ? 'קנייה מיידית'
      : `קנייה בגיל ${startAge + hpy - 1}`;
  return { years, earliestRetirementAge, depletionAge: dep?.age ?? null, scenarioLabel: label };
}
