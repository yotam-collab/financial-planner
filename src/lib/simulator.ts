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

function bracketTax(amount: number, brackets: Array<{ upTo: number; rate: number }>): number {
  let tax = 0;
  let prevCap = 0;
  for (const br of brackets) {
    if (amount <= prevCap) break;
    tax += (Math.min(amount, br.upTo) - prevCap) * br.rate;
    prevCap = br.upTo;
  }
  return tax;
}

/** Compute total purchase tax in NIS using progressive single-home brackets. */
export function calcPurchaseTax(price: number): number {
  return bracketTax(price, PURCHASE_TAX_BRACKETS_SINGLE_HOME);
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

/**
 * Age-dependent annuity conversion factor (מקדם המרה) approximation.
 * Calibrated against Menora 2025/26 kranot-pensia-chadashot tables (married,
 * 60% survivor pension) — married men's and women's factors are nearly equal:
 *   age 60 ≈ 215-225, age 67 ≈ 186-188, slope ≈ 4.7 per year.
 * The configured base factor (default 216) is interpreted at anchor age 61;
 * the factor falls ~4.7 per year of later retirement (shorter payout period).
 *   base 216 → 60: 221, 61: 216, 64: 202, 67: 188.
 */
export function mekaddemForStartAge(base: number, startAge: number): number {
  const anchorAge = 61;
  const slopePerYear = 4.7;
  return Math.max(1, base - (startAge - anchorAge) * slopePerYear);
}

/**
 * Monthly income tax on residential rent (Israel), choosing the better of the
 * two legal routes when rent exceeds the exemption ceiling:
 *  - Partial-exemption route: adjusted ceiling = 2×ceiling − rent (floor 0);
 *    the excess above the adjusted ceiling is taxed at the marginal rate.
 *  - Flat 10% route (סעיף 122): 10% of the FULL rent, no deductions.
 * Below the ceiling → 0 tax.
 */
export function calcMonthlyRentTax(monthlyRent: number, ceilingNow: number, marginalRate = 0.35): number {
  if (monthlyRent <= ceilingNow) return 0;
  const adjustedCeiling = Math.max(0, 2 * ceilingNow - monthlyRent);
  const exemptRouteTax = Math.max(0, monthlyRent - adjustedCeiling) * marginalRate;
  const flatRouteTax = monthlyRent * 0.10;
  return Math.min(exemptRouteTax, flatRouteTax);
}

// ─── Tax on the pension annuity + old-age allowance (all in 2026 ₪/month; the sim
// deflates → computes → re-inflates, i.e. assumes the tables keep tracking CPI) ───
// 2026 income-tax brackets (20%/31% steps widened by the 2026 budget).
const INCOME_TAX_BRACKETS_2026 = [
  { upTo: 7_010, rate: 0.10 }, { upTo: 10_060, rate: 0.14 }, { upTo: 19_000, rate: 0.20 },
  { upTo: 25_100, rate: 0.31 }, { upTo: 46_690, rate: 0.35 }, { upTo: 60_130, rate: 0.47 },
  { upTo: Infinity, rate: 0.50 },
];
const CREDIT_POINT_2026 = 242;
// Bituach Leumi + health on a pension drawn BEFORE statutory retirement age.
// shortcut: reduced-band rate (4.3%) is an estimate, the full 11.96% is sourced; refine if early pension below ~7.7K matters.
const EARLY_PENSION_NI_2026 = [
  { upTo: 7_703, rate: 0.043 }, { upTo: 51_910, rate: 0.1196 }, { upTo: Infinity, rate: 0 },
];
// "קצבה מזכה" exemption from statutory retirement age: 67% × 9,430 (the 2028+ rate —
// nobody in this plan reaches retirement age before then).
const PENSION_EXEMPTION_2026 = 6_318;
/** Statutory retirement ages (men 67; women born 1970+ 65). */
export const STATUTORY_RETIREMENT_AGE = { yotam: 67, hadas: 65 };
/** Old-age allowance per person: 1,838 basic + 50% seniority supplement − ~123 health. */
export const OLD_AGE_ALLOWANCE_2026 = 2_634;

/** Rough net→gross for earned income (also shown as a hint in the input panel). */
export function estimateGross(monthlyNet: number): number {
  const a = monthlyNet * 12;
  let g: number;
  if (a <= 120_000) g = a / 0.82;
  else if (a <= 300_000) g = a / 0.72;
  else if (a <= 500_000) g = a / 0.65;
  else if (a <= 800_000) g = a / 0.58;
  else g = a / 0.52;
  return Math.round(g / 12);
}

/**
 * Monthly income tax + Bituach Leumi on a pension annuity, stacked ON TOP of the
 * person's earned gross (so it pays their marginal rate). 2026 ₪.
 * shortcut: ignores child credit points and severance-offset of the exemption, add if either applies.
 */
export function calcMonthlyPensionTax(
  pension: number, earnedGross: number, pastRetirementAge: boolean, creditPoints: number,
): number {
  if (pension <= 0) return 0;
  const incomeTax = (x: number) =>
    Math.max(0, bracketTax(x, INCOME_TAX_BRACKETS_2026) - creditPoints * CREDIT_POINT_2026);
  const taxable = pastRetirementAge ? Math.max(0, pension - PENSION_EXEMPTION_2026) : pension;
  const it = incomeTax(earnedGross + taxable) - incomeTax(earnedGross);
  const ni = pastRetirementAge ? 0
    : bracketTax(earnedGross + pension, EARLY_PENSION_NI_2026) - bracketTax(earnedGross, EARLY_PENSION_NI_2026);
  return it + ni;
}

/** Residential-rent tax exemption ceiling, ₪/month (2026, CPI-indexed in the sim). */
export const RENT_TAX_EXEMPTION_CEILING_2026 = 5_654;

export function inflate(base: number, rate: number, years: number): number {
  return base * Math.pow(1 + rate, years);
}

export function deflate(nominal: number, rate: number, years: number): number {
  return nominal / Math.pow(1 + rate, years);
}

/**
 * Happiness index — 8 components scored 0–100, weighted by user preferences.
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
  hadasAge: number;
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
  familyExpansion: number;
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

  // 8. Family expansion — viability of having another child this year.
  //    Four gating factors:
  //    (a) Mother's fertility age window (Hadas's age)
  //    (b) Spacing since youngest child (biological recovery + sibling gap norms)
  //    (c) Financial stability (another child = more expenses)
  //    (d) Parent time/energy availability
  // Sources: ACOG age-based fertility data; family-planning spacing norms (CDC/MoH 2-4y).
  const yearsSinceYoungest = input.calendarYear - h.youngestChildBirthYear;

  // (a) Mother's age factor — fertility window
  let motherAgeFactor: number;
  if (input.hadasAge < 30) motherAgeFactor = 100;
  else if (input.hadasAge < 35) motherAgeFactor = 90;
  else if (input.hadasAge < 38) motherAgeFactor = 75;
  else if (input.hadasAge < 40) motherAgeFactor = 55;
  else if (input.hadasAge < 43) motherAgeFactor = 35;
  else if (input.hadasAge < 45) motherAgeFactor = 15;
  else motherAgeFactor = 5;

  // (b) Spacing — ideal gap is 2-4 years since last baby
  let spacingFactor: number;
  if (yearsSinceYoungest < 0) spacingFactor = 0;         // youngest not yet born
  else if (yearsSinceYoungest === 0) spacingFactor = 25;  // just had a baby — recovery
  else if (yearsSinceYoungest === 1) spacingFactor = 55;
  else if (yearsSinceYoungest <= 4) spacingFactor = 100;  // ideal window
  else if (yearsSinceYoungest <= 7) spacingFactor = 80;
  else if (yearsSinceYoungest <= 10) spacingFactor = 55;
  else spacingFactor = 35;                                 // large gap, less typical

  // (c) Financial stability
  let financeFactor = 30;
  if (input.monthlyBalance >= 0) financeFactor += 25;
  if (input.monthlyBalance >= 3000) financeFactor += 25;
  if (input.monthlyBalance >= 8000) financeFactor += 20;

  // (d) Parent availability (same curve as "time with kids")
  const availabilityFactor = parentAvailability(input.phase);

  // Weighted composite — mother's age dominates since it's the hard biological constraint
  const familyExpansion = clamp0100(
    motherAgeFactor * 0.45 +
    spacingFactor * 0.25 +
    financeFactor * 0.18 +
    availabilityFactor * 0.12
  );

  // Composite — weighted sum, auto-normalized
  const weightSum =
    h.weightTimeWithKids + h.weightFamilyVacations + h.weightFinancialCalm +
    h.weightOwnHome + h.weightPersonalDevelopment +
    h.weightCommunityImpact + h.weightTorahStudy + h.weightFamilyExpansion;
  const total = weightSum > 0 ? Math.round(
    (timeWithKids * h.weightTimeWithKids +
     familyVacations * h.weightFamilyVacations +
     financialCalm * h.weightFinancialCalm +
     ownHome * h.weightOwnHome +
     personalDevelopment * h.weightPersonalDevelopment +
     communityImpact * h.weightCommunityImpact +
     torahStudy * h.weightTorahStudy +
     familyExpansion * h.weightFamilyExpansion) / weightSum
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
    familyExpansion,
  };
}

function runCore(config: ScenarioConfig): YearResult[] {
  const { startAge, endAge, housePurchaseYear, zinukEndAge, pensionStartAge,
    hadasAge, hadasPensionStartAge, fullRetirementAge, hadasFullRetirementAge,
    simulationStartYear,
    assets, income, expenses, house, market } = config;
  const totalYears = endAge - startAge + 1;
  const results: YearResult[] = [];

  // If keeping Or Akiva, the proceeds are NOT injected into liquid (we hold the
  // apartment instead). Otherwise, inject as before.
  let liquid = assets.liquidPortfolio + (assets.orAkivaKeep ? 0 : assets.apartmentNetProceeds);
  // Or Akiva apartment state — only meaningful if orAkivaKeep is true
  let orAkivaValue = assets.orAkivaKeep ? (assets.orAkivaCurrentValue ?? 0) : 0;
  let orAkivaMortBal = assets.orAkivaKeep ? (assets.orAkivaMortgageBalance ?? 0) : 0;
  let yotamPension = assets.yotamPension;
  let hadasPension = assets.hadasPension;
  // Per-person keren hishtalmut. Each becomes liquid at its own age and is
  // then merged into the main liquid portfolio.
  let yotamKeren = assets.yotamKerenHishtalmut ?? 0;
  let yotamKerenMerged = false;
  let hadasKeren = assets.hadasKerenHishtalmut ?? 0;
  let hadasKerenMerged = false;
  let ownsHome = false;
  let homeVal = 0, mortBal = 0, mortPayment = 0, mortPrincipal = 0, mortStartYear = 0;
  // Annuity state: base payout fixed at activation, then CPI-indexed each year
  // (kranot pensia chadashot pay מדד-linked annuities).
  let yotamPensionActive = false, yotamPensionPayoutBase = 0, yotamPensionStartYe = 0;
  let hadasPensionActive = false, hadasPensionPayoutBase = 0, hadasPensionStartYe = 0;

  const nomRet = (1 + market.realReturnRate) * (1 + market.inflationRate) - 1;
  const nomHA = (1 + market.realHomeAppreciation) * (1 + market.inflationRate) - 1;

  for (let yi = 0; yi < totalYears; yi++) {
    const year = yi + 1;
    const age = startAge + yi;
    const hadasCurrentAge = hadasAge + yi;
    const calendarYear = (simulationStartYear ?? 2026) + yi;
    const ye = yi;
    const cpi = Math.pow(1 + market.inflationRate, ye);

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

    // NOTE: legacy usRealEstate* windfall injections were REMOVED (2026-04 audit).
    // They silently added ~1M ₪ to liquid with no UI visibility. If US real estate
    // exists and is not already included in liquidPortfolio, model it explicitly.

    // Yotam's keren liquidates at his configured age (his ages = `age`)
    if (!yotamKerenMerged && age >= (assets.yotamKerenHishtalmutLiquidAge ?? Infinity)) {
      liquid += yotamKeren; yotamKeren = 0; yotamKerenMerged = true;
    }
    // Hadas's keren liquidates at her configured age (use her current age)
    if (!hadasKerenMerged && hadasCurrentAge >= (assets.hadasKerenHishtalmutLiquidAge ?? Infinity)) {
      liquid += hadasKeren; hadasKeren = 0; hadasKerenMerged = true;
    }

    // House purchase
    if (housePurchaseYear !== null && year === housePurchaseYear && !ownsHome) {
      // A later purchase pays the appreciated price (same growth an owned home gets).
      const p = house.priceToday * Math.pow(1 + nomHA, ye);
      // Progressive brackets, CPI-indexed from their 2026 level
      const purchaseTax = cpi * calcPurchaseTax(p / cpi);
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
      // Mother's contribution covers part of the price; fees and renovation stay ours.
      liquid -= (tot - m - inflate(house.motherContribution ?? 0, market.inflationRate, ye));
      ownsHome = true; homeVal = p; mortPrincipal = m; mortBal = m;
      mortPayment = calcMonthlyMortgagePayment(m, house.mortgageRate, house.mortgageTerm);
      mortStartYear = year;
    }

    // Pension annuity activation — age-dependent mekaddem, base fixed at activation
    if (age >= pensionStartAge && !yotamPensionActive) {
      yotamPensionActive = true;
      yotamPensionPayoutBase = calcMonthlyPensionPayout(
        yotamPension, mekaddemForStartAge(market.pensionConversionFactor, pensionStartAge));
      yotamPensionStartYe = ye;
    }
    if (hadasCurrentAge >= hadasPensionStartAge && !hadasPensionActive) {
      hadasPensionActive = true;
      hadasPensionPayoutBase = calcMonthlyPensionPayout(
        hadasPension, mekaddemForStartAge(market.pensionConversionFactor, hadasPensionStartAge));
      hadasPensionStartYe = ye;
    }

    // Annuities are CPI-indexed after activation (real value preserved)
    const yotamPensionGross = yotamPensionActive
      ? yotamPensionPayoutBase * Math.pow(1 + market.inflationRate, ye - yotamPensionStartYe)
      : 0;
    const hadasPensionGross = hadasPensionActive
      ? hadasPensionPayoutBase * Math.pow(1 + market.inflationRate, ye - hadasPensionStartYe)
      : 0;
    // Net of income tax + Bituach Leumi: a pension drawn while still working stacks on
    // the earned income; from statutory retirement age most of it is exempt.
    const yotamPastRet = age >= STATUTORY_RETIREMENT_AGE.yotam;
    const hadasPastRet = hadasCurrentAge >= STATUTORY_RETIREMENT_AGE.hadas;
    const yotamPensionPayout = yotamPensionGross - cpi * calcMonthlyPensionTax(
      yotamPensionGross / cpi, estimateGross(yotamIncome / cpi), yotamPastRet, 2.25);
    const hadasPensionPayout = hadasPensionGross - cpi * calcMonthlyPensionTax(
      hadasPensionGross / cpi, estimateGross(hadasIncome / cpi), hadasPastRet, 2.75);
    // Old-age allowance (CPI-linked, tax-exempt): from retirement age once work income
    // stops (income test), unconditionally from 70.
    const oldAgeEligible = (a: number, pastRet: boolean, earned: number) =>
      a >= 70 || (pastRet && earned === 0);
    const mOldAge = cpi * OLD_AGE_ALLOWANCE_2026 * (
      (oldAgeEligible(age, yotamPastRet, yotamIncome) ? 1 : 0) +
      (oldAgeEligible(hadasCurrentAge, hadasPastRet, hadasIncome) ? 1 : 0));
    const totalPensionPayout = yotamPensionPayout + hadasPensionPayout + mOldAge;

    // Monthly calcs
    // Owners also pay upkeep a renter doesn't (repairs, building insurance), CPI-linked.
    const mHousing = ownsHome ? mortPayment + cpi * (house.monthlyMaintenance ?? 0) : nomRent;
    const mExp = nomNH + mHousing;
    const mortPaid = ownsHome ? mortPayment : 0; // mortPayment is zeroed at the end of the final paying year
    // Sustainable-withdrawal reference (configurable; Morningstar 2025: ~3.0-3.3%
    // for a 40-year horizon, classic Bengen 4% for 30 years)
    const swr = market.withdrawalRate ?? 0.04;
    const m4pct = Math.max(0, liquid * swr / 12);

    const mZinuk = phase === 'zinuk' ? yotamIncome + hadasIncome : 0;
    const mAlt = phase === 'altIncome' ? yotamIncome + hadasIncome : 0;

    // Residential-rent tax exemption ceiling, CPI-indexed from its 2026 level
    const rentCeilingNom = inflate(RENT_TAX_EXEMPTION_CEILING_2026, market.inflationRate, ye);

    // ─── Passive income from owned home (sub-unit rental + solar) ───
    // Both are inflation-adjusted from today's values, only applicable when owning.
    // Sub-unit rent above the exemption ceiling is taxed (best legal route).
    // While the unit's rent is paid to Yotam's mother (in return for her contribution) it isn't family income.
    // shortcut: no repayment/ownership share for her and her tax on the rent is ignored, upgrade if the deal gets those terms
    const rentToMother = (house.motherContribution ?? 0) > 0 && year - mortStartYear < (house.motherRentYears ?? 0);
    const grossRentalUnit = ownsHome && !rentToMother ? inflate(house.rentalIncomeFromUnit ?? 0, market.inflationRate, ye) : 0;
    const nomRentalUnit = grossRentalUnit - calcMonthlyRentTax(grossRentalUnit, rentCeilingNom);
    const nomSolar = ownsHome ? inflate(house.solarIncome ?? 0, market.inflationRate, ye) : 0;

    // ─── Or Akiva apartment (when held) ───
    // Net monthly: rent (CPI) - rent tax (above exemption ceiling) - mortgage
    // (nominal-fixed, until end year) - expenses (CPI)
    let mOrAkivaNet = 0;
    if (assets.orAkivaKeep) {
      const oRent = inflate(assets.orAkivaMonthlyRent ?? 0, market.inflationRate, ye);
      const oRentTax = calcMonthlyRentTax(oRent, rentCeilingNom);
      const oExp = inflate(assets.orAkivaMonthlyExpenses ?? 0, market.inflationRate, ye);
      const mortgageActive = calendarYear < (assets.orAkivaMortgageEndYear ?? 0);
      const oMort = mortgageActive ? (assets.orAkivaMonthlyMortgage ?? 0) : 0;
      mOrAkivaNet = oRent - oRentTax - oMort - oExp;
    }
    const mHomePassive = nomRentalUnit + nomSolar + mOrAkivaNet;

    // ─── Pension contribution semantics ───
    // ZINUK phase:
    //   Yotam (salaried at his own company): תלוש "net" already deducts pension.
    //     `yotamIncome` is take-home AFTER pension → do NOT subtract `nomYPC`.
    //   Hadas (עוסק מורשה): "net" is BEFORE she pays her own pension. She sends
    //     the contribution to the fund herself, reducing spendable cashflow.
    //
    // ALT-INCOME (post-zinuk) phase:
    //   Both Yotam and Hadas are now self-employed (consulting / solo work).
    //   Both deduct pension from net at the SAME RATE they had in zinuk
    //   (= their personal "recommended" pension fraction). This scales the
    //   contribution proportionally to the lower post-zinuk income.
    const yotamPensionRateZinuk =
      income.yotamNetIncomeZinuk > 0
        ? income.yotamMonthlyPensionContribution / income.yotamNetIncomeZinuk
        : 0;
    const hadasPensionRateZinuk =
      income.hadasNetIncomeZinuk > 0
        ? income.hadasMonthlyPensionContribution / income.hadasNetIncomeZinuk
        : 0;

    // This year's pension contribution amounts (per person) and how much
    // comes out of net (vs. already-deducted-on-paycheck).
    // Once a person's annuity is active, contributions stop (previously they were
    // deducted from net but credited to a balance that no longer pays out — a leak).
    let yotamContribThisYear = 0;
    let yotamDeductFromNet = 0;
    if (yotamIncome > 0 && !yotamPensionActive) {
      if (phase === 'zinuk') {
        yotamContribThisYear = nomYPC;
        yotamDeductFromNet = 0; // already in תלוש math
      } else {
        // alt-income: scaled rate on post-zinuk net (which is now pre-pension)
        yotamContribThisYear = yotamIncome * yotamPensionRateZinuk;
        yotamDeductFromNet = yotamContribThisYear;
      }
    }
    let hadasContribThisYear = 0;
    let hadasDeductFromNet = 0;
    if (hadasIncome > 0 && !hadasPensionActive) {
      if (phase === 'zinuk') {
        hadasContribThisYear = nomHPC;
        hadasDeductFromNet = nomHPC; // עוסק מורשה pays out of net even in zinuk
      } else {
        hadasContribThisYear = hadasIncome * hadasPensionRateZinuk;
        hadasDeductFromNet = hadasContribThisYear;
      }
    }

    const yotamSpendable = Math.max(0, yotamIncome - yotamDeductFromNet);
    const hadasSpendable = Math.max(0, hadasIncome - hadasDeductFromNet);
    const totalSpendable = yotamSpendable + hadasSpendable;

    // Sustainable income = spendable income + pension annuity + home-passive + 4% (full picture)
    const mSustainable = totalSpendable + totalPensionPayout + mHomePassive + m4pct;

    // ─── Monthly balance shown in chart ───
    const mBalance = mSustainable - mExp;

    // ─── Actual cashflow to/from liquid ───
    // Includes spendable earned income + pension annuity + home passive - expenses.
    // For Hadas the pension contribution is already subtracted via `hadasSpendable`.
    // The withdrawal-rate line is REFERENCE only, not added (avoids double-counting
    // with compound growth).
    const actualCashflow = (totalSpendable + totalPensionPayout + mHomePassive - mExp) * 12;
    const cf = actualCashflow;

    // ─── Growth (mid-year flow convention) ───
    // Opening balances earn a full year; this year's flows arrive spread across the
    // year and earn ~half a year on average. (The old code gave flows a full year,
    // systematically overstating compounding.)
    const halfYearGrowth = 1 + nomRet / 2;
    // No clamp at 0 here: a purchase the portfolio can't fund must show up as depletion.
    liquid = liquid * (1 + nomRet) + actualCashflow * halfYearGrowth;
    if (!yotamPensionActive) {
      yotamPension = yotamPension * (1 + nomRet) + yotamContribThisYear * 12 * halfYearGrowth;
    }
    if (!hadasPensionActive) {
      hadasPension = hadasPension * (1 + nomRet) + hadasContribThisYear * 12 * halfYearGrowth;
    }
    if (!yotamKerenMerged) yotamKeren *= (1 + nomRet);
    if (!hadasKerenMerged) hadasKeren *= (1 + nomRet);

    if (ownsHome) {
      homeVal *= (1 + nomHA);
      const ysp = year - mortStartYear + 1; // years of payments made by this year's end
      mortBal = ysp < house.mortgageTerm ? remainingMortgageBalance(mortPrincipal, house.mortgageRate, house.mortgageTerm, ysp) : 0;
      if (ysp >= house.mortgageTerm) mortPayment = 0;
    }

    // Or Akiva: appreciate value, amortize mortgage (rough straight-line until end year).
    if (assets.orAkivaKeep) {
      orAkivaValue *= (1 + nomHA);
      if (calendarYear < (assets.orAkivaMortgageEndYear ?? 0)) {
        const yearsLeft = (assets.orAkivaMortgageEndYear ?? calendarYear) - calendarYear;
        // ~1/yearsLeft of the current balance counts as principal this year (approx).
        // Final year payment zeros out the balance.
        const principalThisYear = yearsLeft > 0 ? orAkivaMortBal / yearsLeft : orAkivaMortBal;
        orAkivaMortBal = Math.max(0, orAkivaMortBal - principalThisYear);
      } else {
        orAkivaMortBal = 0;
      }
    }

    const hEq = ownsHome ? Math.max(0, homeVal - mortBal) : 0;
    const orAkivaEq = assets.orAkivaKeep ? Math.max(0, orAkivaValue - orAkivaMortBal) : 0;
    // No reset to 0: a shortfall the portfolio can't cover stays on the books as debt,
    // so later surpluses repay it first instead of wealth rebuilding from a clean slate.
    // shortcut: debt compounds at the portfolio's return rate, upgrade to a loan rate if depleted scenarios need precision
    const dep = liquid <= 0;
    // An annuity in payment keeps a value instead of vanishing from net worth the year it
    // starts: the pot at activation, CPI-linked, written down to zero at the end of the plan.
    // shortcut: straight-line write-down, not an actuarial present value; upgrade if net worth after pension start needs precision
    const annuityValue = (pot: number, startYe: number) =>
      pot * Math.pow(1 + market.inflationRate, ye - startYe) * (totalYears - 1 - ye) / (totalYears - startYe);
    const yPenNW = yotamPensionActive ? annuityValue(yotamPension, yotamPensionStartYe) : yotamPension;
    const hPenNW = hadasPensionActive ? annuityValue(hadasPension, hadasPensionStartYe) : hadasPension;
    const totalPensionNW = yPenNW + hPenNW;
    const kNW = (yotamKerenMerged ? 0 : yotamKeren) + (hadasKerenMerged ? 0 : hadasKeren);
    const nw = liquid + totalPensionNW + kNW + hEq + orAkivaEq;

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
      monthlyMortgagePayment: Math.round(mortPaid), homeValue: Math.round(homeVal),
      netWorth: Math.round(nw),
      annualIncome: Math.round(mSustainable * 12),
      annualExpenses: Math.round(mExp * 12),
      annualHousingCost: Math.round(mHousing * 12), annualCashflow: Math.round(cf),
      isDepleted: dep,
      monthlyZinukIncome: Math.round(mZinuk),
      monthly4pctWithdrawal: Math.round(m4pct),
      monthlyPensionIncome: Math.round(totalPensionPayout),
      monthlyOldAgeAllowance: Math.round(mOldAge),
      monthlyAltIncome: Math.round(mAlt),
      monthlyRentalIncomeFromUnit: Math.round(nomRentalUnit),
      monthlySolarIncome: Math.round(nomSolar),
      monthlyOrAkivaNet: Math.round(mOrAkivaNet),
      monthlyPensionContribution: Math.round(yotamIncome + hadasIncome - totalSpendable),
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
      happinessFamilyExpansion: 0,
    });

    // Fill happiness scores for this year
    const last = results[results.length - 1];
    const scores = computeHappinessScores(
      {
        calendarYear: last.calendarYear,
        yotamAge: last.yotamAge,
        hadasAge: last.hadasAge,
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
        weightTimeWithKids: 18, weightFamilyVacations: 11, weightFinancialCalm: 16,
        weightOwnHome: 11, weightPersonalDevelopment: 11, weightCommunityImpact: 10,
        weightTorahStudy: 13, weightFamilyExpansion: 10,
        oldestChildBirthYear: 2018, youngestChildBirthYear: 2026,
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
    last.happinessFamilyExpansion = scores.familyExpansion;
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
    // Keep the invariant fullRetirementAge >= zinukEndAge (the UI enforces it too);
    // otherwise zinuk income would continue past the intended full-retirement age.
    const testConfig: ScenarioConfig = {
      ...config,
      zinukEndAge: quitAge,
      fullRetirementAge: Math.max(config.fullRetirementAge, quitAge),
    };
    const years = runCore(testConfig);
    // Post-zinuk years must have non-negative balance (matches chart)
    const postZinukYears = years.filter(y => y.phase !== 'zinuk');
    if (postZinukYears.length === 0) continue;
    if (postZinukYears.some(y => y.monthlyBalance < 0)) continue;
    // Also check portfolio doesn't deplete
    if (years.some(y => y.isDepleted)) continue;
    return quitAge;
  }
  return null;
}

/**
 * Find the earliest CALENDAR YEAR in which BOTH Yotam and Hadas can fully retire
 * (zero earned income from then on) and the plan remains sustainable.
 *
 * Criterion: when both fully retire in year Y (each at the age they happen to be),
 * every year from Y onward has monthlyBalance >= 0 AND the portfolio doesn't
 * deplete. Both must already be past their zinuk-end before they can fully retire.
 */
export function findEarliestFullRetirementYear(config: ScenarioConfig): number | null {
  const startYear = config.simulationStartYear ?? 2026;
  const lastYear = startYear + (config.endAge - config.startAge);
  for (let y = startYear; y <= lastYear; y++) {
    const offset = y - startYear;
    const yotamAgeAtY = config.startAge + offset;
    const hadasAgeAtY = config.hadasAge + offset;
    // Both must have already finished zinuk before fully retiring
    if (yotamAgeAtY < config.zinukEndAge) continue;
    const testConfig: ScenarioConfig = {
      ...config,
      fullRetirementAge: yotamAgeAtY,
      hadasFullRetirementAge: hadasAgeAtY,
    };
    const years = runCore(testConfig);
    const postFull = years.filter(yr => yr.calendarYear >= y);
    if (postFull.length === 0) continue;
    if (postFull.some(yr => yr.monthlyBalance < 0)) continue;
    if (years.some(yr => yr.isDepleted)) continue;
    return y;
  }
  return null;
}

export function simulate(config: ScenarioConfig): SimulationResult {
  const earliestRetirementAge = findEarliestRetirementAge(config);
  const earliestFullRetirementYear = findEarliestFullRetirementYear(config);
  const years = runCore(config);
  const dep = years.find(y => y.isDepleted);
  const { housePurchaseYear: hpy, startAge } = config;
  const label = hpy === null
    ? 'ללא קניית בית'
    : hpy === 1
      ? 'קנייה מיידית'
      : `קנייה בגיל ${startAge + hpy - 1}`;
  return {
    years,
    earliestRetirementAge,
    earliestFullRetirementYear,
    depletionAge: dep?.age ?? null,
    scenarioLabel: label,
  };
}
