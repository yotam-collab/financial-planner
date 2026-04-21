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

/**
 * Progressive Israeli purchase tax brackets for a *single* home (דירה יחידה), 2026.
 * Source: רשות המסים — מדרגות מס רכישה לדירה יחידה (2025/26).
 * Brackets are updated annually per CPI; values below reflect ~2026 estimate.
 */
const PURCHASE_TAX_BRACKETS_SINGLE_HOME: Array<{ upTo: number; rate: number }> = [
  { upTo: 1_978_745, rate: 0 },
  { upTo: 2_347_040, rate: 0.035 },
  { upTo: 6_055_070, rate: 0.05 },
  { upTo: 20_183_565, rate: 0.08 },
  { upTo: Infinity, rate: 0.10 },
];

/** Compute total purchase tax in NIS using progressive single-home brackets. */
export function calcPurchaseTax(price: number): number {
  let tax = 0;
  let prevCap = 0;
  for (const br of PURCHASE_TAX_BRACKETS_SINGLE_HOME) {
    if (price <= prevCap) break;
    const inBracket = Math.min(price, br.upTo) - prevCap;
    tax += inBracket * br.rate;
    prevCap = br.upTo;
  }
  return tax;
}

/** Effective purchase tax rate (tax / price). */
export function calcPurchaseTaxRate(price: number): number {
  if (price <= 0) return 0;
  return calcPurchaseTax(price) / price;
}

/** VAT rate in Israel (2026) */
const VAT_RATE = 0.18;

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
 * Happiness index — 7 components scored 0–100, weighted by user preferences.
 *
 * Modeling philosophy: each component captures a life-satisfaction dimension that
 * emerges from the financial-plan state. Not a measurement of happiness itself —
 * a *structural* proxy that responds to timing choices (zinuk end, house, retirement).
 *
 * References consulted:
 *  - Stevenson & Wolfers (income & life satisfaction, 2008): runway & financial calm
 *  - Dunn/Gilchrist/Norton (time affluence > consumption, 2010): time-availability core
 *  - Dunn & Norton (experiential spending, 2013): family-vacations weighting
 *  - OECD Better Life Index methodology: multi-dimensional composite with user weights
 *  - Jewish-Israeli cultural specifics: Torah study & community framed as active time dimensions
 */

interface HappinessInput {
  calendarYear: number;
  yotamAge: number;
  phase: 'zinuk' | 'altIncome' | 'retired';
  monthlyBalance: number;
  monthlyExpenses: number;
  liquidPortfolio: number;
  housingStatus: 'renting' | 'owning';
  homeEquity: number;
  homeValue: number;
  isPensionActive: boolean;
}

interface HappinessScores {
  total: number;
  timeWithKids: number;
  familyVacations: number;
  financialCalm: number;
  ownHome: number;
  personalDevelopment: number;
  communityImpact: number;
  torahStudy: number;
}

function clamp0100(v: number): number {
  return Math.max(0, Math.min(100, Math.round(v)));
}

/** Kids' need-for-parent-time curve, peaks at 5-10 years old. */
function kidsNeedParentTime(avgAge: number): number {
  if (avgAge < 0) return 0;
  if (avgAge <= 2) return 80;
  if (avgAge <= 10) return 95;
  if (avgAge <= 14) return 75;
  if (avgAge <= 17) return 55;
  if (avgAge <= 22) return 35;
  if (avgAge <= 30) return 20;
  return 10;
}

/**
 * Yotam's actual working reality (not the classic "owner-operator always busy" trope):
 * - During zinuk he has a CEO managing day-to-day; works 1 day/week from office,
 *   few hours/day from home → relatively high family-time availability, though
 *   with mental load from oversight responsibilities.
 * - Post-zinuk (altIncome) he's more hands-on himself (consulting/solo work)
 *   → fewer at-home hours than in zinuk.
 * - Retirement: fully free.
 */
function parentAvailability(phase: 'zinuk' | 'altIncome' | 'retired'): number {
  return phase === 'zinuk' ? 70 : phase === 'altIncome' ? 55 : 90;
}

export function computeHappinessScores(
  input: HappinessInput,
  happiness: ScenarioConfig['happiness']
): HappinessScores {
  const h = happiness;

  const oldestKidAge = input.calendarYear - h.oldestChildBirthYear;
  const youngestKidAge = input.calendarYear - h.youngestChildBirthYear;
  const avgKidAge = (oldestKidAge + youngestKidAge) / 2;

  // 1. Time with kids — need × availability
  const timeWithKids = clamp0100(
    (kidsNeedParentTime(avgKidAge) * parentAvailability(input.phase)) / 100
  );

  // 2. Family vacations — money × time × kids-home
  const surplusFactor = clamp0100(
    input.monthlyBalance >= 5000 ? 90 :
    input.monthlyBalance >= 0 ? 50 + (input.monthlyBalance / 5000) * 40 :
    Math.max(0, 50 + (input.monthlyBalance / 2000) * 50)
  );
  const kidsHomeFactor = clamp0100(
    youngestKidAge <= 17 ? 100 :
    youngestKidAge <= 22 ? 100 - (youngestKidAge - 17) * 12 :
    Math.max(30, 100 - (youngestKidAge - 17) * 8)
  );
  // Vacation flexibility: zinuk > altIncome because CEO runs ops day-to-day.
  // Post-zinuk solo work is harder to step away from.
  const vacationTimeFactor =
    input.phase === 'zinuk' ? 75 : input.phase === 'altIncome' ? 60 : 95;
  const familyVacations = clamp0100(
    surplusFactor * 0.45 + kidsHomeFactor * 0.3 + vacationTimeFactor * 0.25
  );

  // 3. Financial calm — sustainability + runway + comfort
  let calm = 0;
  if (input.monthlyBalance >= 0) calm += 50;
  else calm += Math.max(0, 50 + (input.monthlyBalance / 1000) * 5);
  const runwayMonths =
    input.monthlyExpenses > 0 ? input.liquidPortfolio / input.monthlyExpenses : 0;
  calm += Math.min(30, (runwayMonths / 24) * 30); // 2-year runway → +30
  if (input.monthlyBalance > 0) {
    calm += Math.min(20, (input.monthlyBalance / 10000) * 20);
  }
  const financialCalm = clamp0100(calm);

  // 4. Own home — renting is stressful in Israel; equity adds security
  let ownHome = 10;
  if (input.housingStatus === 'owning') {
    const equityRatio = input.homeValue > 0 ? input.homeEquity / input.homeValue : 0;
    ownHome = 40 + 60 * equityRatio;
  }
  ownHome = clamp0100(ownHome);

  // 5. Personal development — time to learn + mental bandwidth.
  //   Zinuk: has time (CEO runs ops) but mental load → +20
  //   AltIncome: less time but clearer focus → +15
  //   Retired: maximum time AND focus → +35
  let pd = 10;
  if (input.phase === 'zinuk') pd += 20;
  else if (input.phase === 'altIncome') pd += 15;
  else pd += 35;
  if (input.monthlyBalance >= 0) pd += 25;
  if (input.isPensionActive) pd += 15;
  if (input.yotamAge > 75) pd -= (input.yotamAge - 75) * 2;
  const personalDevelopment = clamp0100(pd);

  // 6. Community impact — similar time/bandwidth logic, with a 55-80 civic peak.
  let ci = 15;
  if (input.phase === 'zinuk') ci += 18;       // at-home days enable community work
  else if (input.phase === 'altIncome') ci += 15;
  else ci += 30;
  if (input.monthlyBalance >= 0) ci += 20;
  if (input.yotamAge >= 55 && input.yotamAge <= 80) ci += 20;
  if (input.yotamAge > 82) ci -= (input.yotamAge - 82) * 3;
  const communityImpact = clamp0100(ci);

  // 7. Torah study — some time all phases; classic peak in retirement.
  //   Zinuk: fragmented time but present → +18
  //   AltIncome: less daily time → +15
  //   Retired: classic lifelong-learning peak → +45
  let ts = 15;
  if (input.phase === 'zinuk') ts += 18;
  else if (input.phase === 'altIncome') ts += 15;
  else ts += 45;
  if (input.monthlyBalance >= 0) ts += 15;
  if (input.yotamAge >= 65) ts += 10;
  const torahStudy = clamp0100(ts);

  // Composite — weighted sum, auto-normalized
  const weightSum =
    h.weightTimeWithKids + h.weightFamilyVacations + h.weightFinancialCalm +
    h.weightOwnHome + h.weightPersonalDevelopment +
    h.weightCommunityImpact + h.weightTorahStudy;
  const total = weightSum > 0 ? Math.round(
    (timeWithKids * h.weightTimeWithKids +
     familyVacations * h.weightFamilyVacations +
     financialCalm * h.weightFinancialCalm +
     ownHome * h.weightOwnHome +
     personalDevelopment * h.weightPersonalDevelopment +
     communityImpact * h.weightCommunityImpact +
     torahStudy * h.weightTorahStudy) / weightSum
  ) : 0;

  return {
    total: clamp0100(total),
    timeWithKids,
    familyVacations,
    financialCalm,
    ownHome,
    personalDevelopment,
    communityImpact,
    torahStudy,
  };
}

function runCore(config: ScenarioConfig): YearResult[] {
  const { startAge, endAge, housePurchaseYear, zinukEndAge, pensionStartAge,
    hadasAge, hadasPensionStartAge, fullRetirementAge, hadasFullRetirementAge,
    simulationStartYear,
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
    const calendarYear = (simulationStartYear ?? 2026) + yi;
    const ye = yi;

    // Phase label follows Yotam (primary). But each person's income
    // stops at their own respective full retirement age.
    let phase: 'zinuk' | 'altIncome' | 'retired';
    if (age < zinukEndAge) phase = 'zinuk';
    else if (age < fullRetirementAge || hadasCurrentAge < hadasFullRetirementAge) phase = 'altIncome';
    else phase = 'retired';

    const isWorking = phase === 'zinuk';

    // Inflation-adjusted monthly values
    const nomRent = inflate(expenses.monthlyRent, market.inflationRate, ye);
    const nomNH = inflate(expenses.monthlyNonHousingExpenses, market.inflationRate, ye);

    // Yotam's income: zinuk → post-zinuk → 0 at his full retirement
    let yotamIncome = 0;
    if (age < zinukEndAge) yotamIncome = inflate(income.yotamNetIncomeZinuk, market.inflationRate, ye);
    else if (age < fullRetirementAge) yotamIncome = inflate(income.yotamNetIncomePostZinuk, market.inflationRate, ye);

    // Hadas's income: zinuk (while Yotam in zinuk) → post-zinuk → 0 at HER full retirement
    let hadasIncome = 0;
    if (age < zinukEndAge) hadasIncome = inflate(income.hadasNetIncomeZinuk, market.inflationRate, ye);
    else if (hadasCurrentAge < hadasFullRetirementAge) hadasIncome = inflate(income.hadasNetIncomePostZinuk, market.inflationRate, ye);

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
      // Auto-compute purchase tax from progressive brackets
      const purchaseTax = calcPurchaseTax(p);
      const nomReno = inflate(house.renovationCost, market.inflationRate, ye);
      // Transaction fees — scale with price (price already inflates)
      const lawyerFee = p * (house.lawyerFeeRate ?? 0) * (1 + VAT_RATE);
      const brokerFee = p * (house.brokerFeeRate ?? 0) * (1 + VAT_RATE);
      const nomOtherClosing = inflate(house.otherClosingCosts ?? 0, market.inflationRate, ye);
      // Legacy field — fallback if new fields not set
      const nomLegacyClosing = inflate(house.closingCosts ?? 0, market.inflationRate, ye);
      const totalClosingAndFees = purchaseTax + lawyerFee + brokerFee + nomOtherClosing + nomLegacyClosing;
      const tot = p + nomReno + totalClosingAndFees;
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

    // ─── Passive income from owned home (sub-unit rental + solar) ───
    // Both are inflation-adjusted from today's values, only applicable when owning
    const nomRentalUnit = ownsHome ? inflate(house.rentalIncomeFromUnit ?? 0, market.inflationRate, ye) : 0;
    const nomSolar = ownsHome ? inflate(house.solarIncome ?? 0, market.inflationRate, ye) : 0;
    const mHomePassive = nomRentalUnit + nomSolar;

    // Sustainable income = income + pension + home-passive + 4% (full picture)
    const mSustainable = (yotamIncome + hadasIncome) + totalPensionPayout + mHomePassive + m4pct;

    // ─── Monthly balance shown in chart ───
    const mBalance = mSustainable - mExp;

    // ─── Pension contributions (separate from liquid cashflow) ───
    if (yotamIncome > 0) yotamPension += nomYPC * 12;
    if (hadasIncome > 0) hadasPension += nomHPC * 12;

    // ─── Actual cashflow to/from liquid ───
    // Includes earned income + pension annuity + home passive - expenses.
    // The 4% is REFERENCE only, not added (avoids double-counting with compound growth).
    const actualCashflow = ((yotamIncome + hadasIncome) + totalPensionPayout + mHomePassive - mExp) * 12;
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
      calendarYear,
      yotamAge: age,
      hadasAge: hadasCurrentAge,
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
      monthlyAltIncome: Math.round(mAlt),
      monthlyRentalIncomeFromUnit: Math.round(nomRentalUnit),
      monthlySolarIncome: Math.round(nomSolar),
      yotamMonthlyIncome: Math.round(yotamIncome),
      hadasMonthlyIncome: Math.round(hadasIncome),
      yotamPensionPayoutMonthly: Math.round(yotamPensionPayout),
      hadasPensionPayoutMonthly: Math.round(hadasPensionPayout),
      monthlyNonHousingExpense: Math.round(nomNH),
      monthlyHousingExpense: Math.round(mHousing),
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
      // Happiness placeholders — filled below
      happinessTotal: 0,
      happinessTimeWithKids: 0,
      happinessFamilyVacations: 0,
      happinessFinancialCalm: 0,
      happinessOwnHome: 0,
      happinessPersonalDevelopment: 0,
      happinessCommunityImpact: 0,
      happinessTorahStudy: 0,
    });

    // Fill happiness scores for this year
    const last = results[results.length - 1];
    const scores = computeHappinessScores(
      {
        calendarYear: last.calendarYear,
        yotamAge: last.yotamAge,
        phase: last.phase,
        monthlyBalance: last.monthlyBalance,
        monthlyExpenses: last.monthlyExpenses,
        liquidPortfolio: last.liquidPortfolio,
        housingStatus: last.housingStatus,
        homeEquity: last.homeEquity,
        homeValue: last.homeValue,
        isPensionActive: yotamPensionActive || hadasPensionActive,
      },
      config.happiness ?? {
        weightTimeWithKids: 20, weightFamilyVacations: 12, weightFinancialCalm: 18,
        weightOwnHome: 12, weightPersonalDevelopment: 12, weightCommunityImpact: 11,
        weightTorahStudy: 15, oldestChildBirthYear: 2014, youngestChildBirthYear: 2023,
      }
    );
    last.happinessTotal = scores.total;
    last.happinessTimeWithKids = scores.timeWithKids;
    last.happinessFamilyVacations = scores.familyVacations;
    last.happinessFinancialCalm = scores.financialCalm;
    last.happinessOwnHome = scores.ownHome;
    last.happinessPersonalDevelopment = scores.personalDevelopment;
    last.happinessCommunityImpact = scores.communityImpact;
    last.happinessTorahStudy = scores.torahStudy;
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
