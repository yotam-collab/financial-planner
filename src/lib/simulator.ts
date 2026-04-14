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

/**
 * 3 life phases:
 * 1. ZINUK: business (zinuk) income, contributing to pension + liquid. Until zinukEndAge.
 * 2. ALT INCOME: alternative income. From zinukEndAge to fullRetirementAge.
 * 3. RETIRED: no earned income. Only 4% from liquid + pension annuity (from 60).
 */
function runCore(config: ScenarioConfig): YearResult[] {
  const { startAge, endAge, housePurchaseYear, zinukEndAge, pensionStartAge, fullRetirementAge, assets, income, expenses, house, market } = config;
  const totalYears = endAge - startAge + 1;
  const results: YearResult[] = [];

  let liquid = assets.liquidPortfolio + assets.apartmentNetProceeds;
  let pensionBal = assets.pension;
  let keren = assets.kerenHishtalmut;
  let kerenMerged = false;
  let ownsHome = false;
  let homeVal = 0, mortBal = 0, mortPayment = 0, mortPrincipal = 0, mortStartYear = 0;
  let pensionActive = false, pensionPayout = 0;

  const nomRet = (1 + market.realReturnRate) * (1 + market.inflationRate) - 1;
  const nomHA = (1 + market.realHomeAppreciation) * (1 + market.inflationRate) - 1;

  for (let yi = 0; yi < totalYears; yi++) {
    const year = yi + 1;
    const age = startAge + yi;
    const ye = yi;

    // Determine phase
    let phase: 'zinuk' | 'altIncome' | 'retired';
    if (age < zinukEndAge) phase = 'zinuk';
    else if (age < fullRetirementAge) phase = 'altIncome';
    else phase = 'retired';

    const isWorking = phase === 'zinuk';

    const nomRent = inflate(expenses.monthlyRent, market.inflationRate, ye);
    const nomNH = inflate(expenses.monthlyNonHousingExpenses, market.inflationRate, ye);
    const nomAlt = phase === 'altIncome' ? inflate(income.monthlyNetAltIncome, market.inflationRate, ye) : 0;
    const nomPC = inflate(income.monthlyPensionContribution, market.inflationRate, ye);
    const nomLR = inflate(income.monthlyLiquidContributionRenting, market.inflationRate, ye);
    const nomLO = inflate(income.monthlyLiquidContributionOwning, market.inflationRate, ye);

    // Windfalls
    if (year === 1) liquid += assets.usRealEstateNonProducing;
    if (year <= assets.usRealEstateProducingSellYear)
      liquid += assets.usRealEstateProducing * assets.usRealEstateProducingYieldRate;
    if (year === assets.usRealEstateProducingSellYear)
      liquid += assets.usRealEstateProducing * assets.usRealEstateProducingSellMultiplier;

    if (!kerenMerged && age >= assets.kerenHishtalmutLiquidAge) {
      liquid += keren; keren = 0; kerenMerged = true;
    }

    // House
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

    // Pension at 60
    if (age >= pensionStartAge && !pensionActive) {
      pensionActive = true;
      pensionPayout = calcMonthlyPensionPayout(pensionBal, market.pensionConversionFactor);
    }

    // Monthly calcs
    const mHousing = ownsHome ? mortPayment : nomRent;
    const mExp = nomNH + mHousing;
    const m4pct = Math.max(0, liquid * 0.04 / 12);
    // Zinuk income for the current phase
    const mZinuk = phase === 'zinuk' ? inflate(income.monthlyNetBusinessIncome, market.inflationRate, ye) : 0;
    // Total sustainable/actual income for this phase
    const mSustainable = mZinuk + m4pct + pensionPayout + nomAlt;

    // Actual income for cashflow
    let mInc: number;
    if (phase === 'zinuk') mInc = inflate(income.monthlyNetBusinessIncome, market.inflationRate, ye);
    else if (phase === 'altIncome') mInc = nomAlt;
    else mInc = 0;
    if (pensionActive) mInc += pensionPayout;

    // Cashflow
    let cf: number;
    if (phase === 'zinuk') {
      pensionBal += nomPC * 12;
      const lc = (ownsHome ? nomLO : nomLR) * 12;
      liquid += lc;
      cf = lc;
    } else {
      const gap = (mExp - mInc) * 12;
      if (gap > 0) { liquid -= gap; cf = -gap; }
      else { liquid += Math.abs(gap); cf = Math.abs(gap); }
    }

    // Growth
    if (liquid > 0) liquid *= (1 + nomRet);
    if (!pensionActive) pensionBal *= (1 + nomRet);
    if (!kerenMerged) keren *= (1 + nomRet);

    if (ownsHome) {
      // Don't appreciate in the purchase year itself
      if (year > mortStartYear) homeVal *= (1 + nomHA);
      const ysp = year - mortStartYear; // 0-indexed: 0 = purchase year
      mortBal = ysp < house.mortgageTerm ? remainingMortgageBalance(mortPrincipal, house.mortgageRate, house.mortgageTerm, ysp) : 0;
      if (ysp >= house.mortgageTerm) mortPayment = 0;
    }

    const hEq = ownsHome ? Math.max(0, homeVal - mortBal) : 0;
    const dep = liquid <= 0;
    if (dep) liquid = 0;
    const pNW = pensionActive ? 0 : pensionBal;
    const kNW = kerenMerged ? 0 : keren;
    const nw = liquid + pNW + kNW + hEq;

    results.push({
      year, age, phase, isWorking,
      housingStatus: ownsHome ? 'owning' : 'renting',
      liquidPortfolio: Math.round(liquid), pension: Math.round(pNW),
      monthlyPensionPayout: Math.round(pensionPayout),
      homeEquity: Math.round(hEq), mortgageBalance: Math.round(mortBal),
      monthlyMortgagePayment: Math.round(mortPayment), homeValue: Math.round(homeVal),
      netWorth: Math.round(nw),
      annualIncome: Math.round(mInc * 12), annualExpenses: Math.round(mExp * 12),
      annualHousingCost: Math.round(mHousing * 12), annualCashflow: Math.round(cf),
      isDepleted: dep,
      monthlyZinukIncome: Math.round(mZinuk),
      monthly4pctWithdrawal: Math.round(m4pct),
      monthlyPensionIncome: Math.round(pensionPayout),
      monthlyAltIncome: Math.round(nomAlt),
      monthlySustainableIncome: Math.round(mSustainable),
      monthlyBalance: Math.round(mSustainable - mExp),
      monthlyExpenses: Math.round(mExp),
      isFullyRetired: phase === 'retired',
      real: {
        liquidPortfolio: Math.round(deflate(liquid, market.inflationRate, ye)),
        pension: Math.round(deflate(pNW, market.inflationRate, ye)),
        homeEquity: Math.round(deflate(hEq, market.inflationRate, ye)),
        netWorth: Math.round(deflate(nw, market.inflationRate, ye)),
        annualIncome: Math.round(deflate(mInc * 12, market.inflationRate, ye)),
        annualExpenses: Math.round(deflate(mExp * 12, market.inflationRate, ye)),
        annualCashflow: Math.round(deflate(cf, market.inflationRate, ye)),
      },
    });
  }
  return results;
}

/**
 * Find earliest age where quitting zinuk is viable.
 * For each possible quit age, run the sim with zinuk ending at that age,
 * then check: does the post-zinuk sustainable income (4% + alt + pension) cover expenses?
 * We check the FIRST post-zinuk year — if it works there, portfolio should grow.
 */
export function findEarliestRetirementAge(config: ScenarioConfig): number | null {
  for (let quitAge = config.startAge; quitAge <= config.endAge; quitAge++) {
    const c: ScenarioConfig = { ...config, zinukEndAge: quitAge };
    const years = runCore(c);
    // Check the year right after quitting zinuk
    const postQuit = years.find(y => y.age === quitAge && y.phase !== 'zinuk');
    if (postQuit && postQuit.monthlySustainableIncome >= postQuit.monthlyExpenses) {
      return quitAge;
    }
  }
  return null;
}

export function simulate(config: ScenarioConfig): SimulationResult {
  const earliestRetirementAge = findEarliestRetirementAge(config);
  const years = runCore(config);
  const dep = years.find(y => y.isDepleted && y.phase !== 'zinuk');

  const { housePurchaseYear: hpy, startAge } = config;
  const label = hpy === null ? 'שכירות לצמיתות' : hpy === 1 ? 'קנייה מיידית' : `קנייה בגיל ${startAge + hpy - 1}`;

  return { years, earliestRetirementAge, depletionAge: dep?.age ?? null, scenarioLabel: label };
}

export function sensitivityAnalysis(
  baseConfig: ScenarioConfig,
  parameter: 'realReturnRate' | 'inflationRate' | 'monthlyNetAltIncome',
  deltas: number[],
): { delta: number; earliestAge: number | null }[] {
  return deltas.map(delta => {
    const c = structuredClone(baseConfig);
    if (parameter === 'realReturnRate') c.market.realReturnRate += delta;
    else if (parameter === 'inflationRate') c.market.inflationRate += delta;
    else { c.income.monthlyNetAltIncome += delta; c.income.monthlyGrossAltIncome += delta / 0.75; }
    return { delta, earliestAge: findEarliestRetirementAge(c) };
  });
}
