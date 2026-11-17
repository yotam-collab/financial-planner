import { describe, it, expect } from 'vitest';
import {
  simulate, calcMonthlyMortgagePayment, remainingMortgageBalance, findEarliestRetirementAge,
  calcPurchaseTax, calcMonthlyRentTax, mekaddemForStartAge, calcMonthlyPensionTax,
} from './simulator';
import { createDefaultConfig } from './defaults';

describe('calcMonthlyMortgagePayment', () => {
  it('calculates correct payment', () => {
    const p = calcMonthlyMortgagePayment(1_000_000, 0.05, 25);
    expect(p).toBeGreaterThan(5_800);
    expect(p).toBeLessThan(5_900);
  });
  it('zero principal returns 0', () => { expect(calcMonthlyMortgagePayment(0, 0.05, 25)).toBe(0); });
  it('zero rate works', () => { expect(calcMonthlyMortgagePayment(300_000, 0, 25)).toBe(1_000); });
});

describe('remainingMortgageBalance', () => {
  it('full at year 0', () => { expect(remainingMortgageBalance(1_000_000, 0.05, 25, 0)).toBeCloseTo(1_000_000, 0); });
  it('zero after full term', () => { expect(remainingMortgageBalance(1_000_000, 0.05, 25, 25)).toBe(0); });
  it('decreases', () => {
    expect(remainingMortgageBalance(1_000_000, 0.05, 25, 5))
      .toBeGreaterThan(remainingMortgageBalance(1_000_000, 0.05, 25, 10));
  });
});

describe('3-phase model', () => {
  it('phase transitions: zinuk → altIncome → retired', () => {
    const c = createDefaultConfig();
    c.zinukEndAge = 50;
    c.fullRetirementAge = 65;
    // Hadas is 9 years younger — she must also be fully retired for phase='retired'.
    // At Yotam 70 Hadas is 61, so her retirement age must be ≤ 61.
    c.hadasFullRetirementAge = 60;
    const r = simulate(c);
    expect(r.years.find(y => y.age === 45)!.phase).toBe('zinuk');
    expect(r.years.find(y => y.age === 55)!.phase).toBe('altIncome');
    expect(r.years.find(y => y.age === 70)!.phase).toBe('retired');
  });

  it('uses different income in zinuk vs post-zinuk', () => {
    const r = simulate(createDefaultConfig());
    const zinukYear = r.years.find(y => y.phase === 'zinuk')!;
    const altYear = r.years.find(y => y.phase === 'altIncome')!;
    // Zinuk income should be higher (65K+22K vs 10K+22K)
    expect(zinukYear.monthlyZinukIncome).toBeGreaterThan(altYear.monthlyAltIncome);
  });

  it('no earned income during retired phase', () => {
    const r = simulate(createDefaultConfig());
    const retiredYear = r.years.find(y => y.phase === 'retired')!;
    expect(retiredYear.monthlyZinukIncome).toBe(0);
    expect(retiredYear.monthlyAltIncome).toBe(0);
  });
});

describe('monthlyBalance', () => {
  it('eventually crosses zero (positive balance)', () => {
    const r = simulate(createDefaultConfig());
    const positive = r.years.find(y => y.monthlyBalance > 0);
    expect(positive).toBeDefined();
  });
});

describe('Default scenario: Buy Now', () => {
  it('runs without errors', () => {
    const r = simulate(createDefaultConfig());
    expect(r.years).toHaveLength(52);
    expect(r.scenarioLabel).toBe('קנייה מיידית');
  });
  it('owns from year 1', () => {
    expect(simulate(createDefaultConfig()).years[0].housingStatus).toBe('owning');
  });
});

describe('Rent Forever scenario', () => {
  it('never owns', () => {
    const c = createDefaultConfig();
    c.housePurchaseYear = null;
    simulate(c).years.forEach(y => {
      expect(y.housingStatus).toBe('renting');
    });
  });
  it('label is "ללא קניית בית"', () => {
    const c = createDefaultConfig();
    c.housePurchaseYear = null;
    expect(simulate(c).scenarioLabel).toBe('ללא קניית בית');
  });
});

describe('Buy Later scenario', () => {
  it('rents then owns', () => {
    const c = createDefaultConfig();
    c.housePurchaseYear = 9; // buy at age 52
    const r = simulate(c);
    expect(r.years[0].housingStatus).toBe('renting');
    expect(r.years[8].housingStatus).toBe('owning');
  });
});

describe('Dual Pension', () => {
  it('separate pensions for Yotam and Hadas', () => {
    const y = simulate(createDefaultConfig()).years[0];
    expect(y.pension).toBeGreaterThan(0); // combined pension NW
  });
  it('Yotam pension activates at the chosen start age (default 67)', () => {
    const r = simulate(createDefaultConfig());
    expect(r.years.find(y => y.age === 66)!.yotamPensionPayoutMonthly).toBe(0);
    expect(r.years.find(y => y.age === 67)!.yotamPensionPayoutMonthly).toBeGreaterThan(0);
  });
  it('Hadas pension activates when Hadas reaches 65', () => {
    // Hadas is 36 when Yotam is 44 → she turns 65 when Yotam is 73.
    const r = simulate(createDefaultConfig());
    expect(r.years.find(y => y.age === 72)!.hadasPensionPayoutMonthly).toBe(0);
    expect(r.years.find(y => y.age === 73)!.hadasPensionPayoutMonthly).toBeGreaterThan(0);
  });
});

describe('Edge cases', () => {
  it('depletion handled gracefully', () => {
    const c = createDefaultConfig();
    c.expenses.monthlyNonHousingExpenses = 100_000;
    c.income.yotamNetIncomePostZinuk = 0;
    c.income.hadasNetIncomePostZinuk = 0;
    const r = simulate(c);
    expect(r.years).toHaveLength(52);
    r.years.filter(y => y.isDepleted).forEach(y => expect(y.liquidPortfolio).toBe(0));
  });

  it('keren merges at 47', () => {
    const r = simulate(createDefaultConfig());
    const jump = r.years.find(y => y.age === 47)!.liquidPortfolio - r.years.find(y => y.age === 46)!.liquidPortfolio;
    expect(jump).toBeGreaterThan(200_000);
  });
});

describe('2026 accuracy audit', () => {
  it('legacy US real-estate fields inject NOTHING (were invisible windfalls)', () => {
    const c1 = createDefaultConfig();
    const c2 = createDefaultConfig();
    c2.assets.usRealEstateNonProducing = 1_000_000;
    c2.assets.usRealEstateProducing = 1_000_000;
    c2.assets.usRealEstateProducingYieldRate = 0.5;
    c2.assets.usRealEstateProducingSellYear = 2;
    c2.assets.usRealEstateProducingSellMultiplier = 3;
    const r1 = simulate(c1), r2 = simulate(c2);
    expect(r2.years[0].liquidPortfolio).toBe(r1.years[0].liquidPortfolio);
    expect(r2.years[5].liquidPortfolio).toBe(r1.years[5].liquidPortfolio);
  });

  it('pension annuity is CPI-indexed after activation (~28% over 10y at 2.5%)', () => {
    const r = simulate(createDefaultConfig());
    // 68→78: both after retirement age, so the tax treatment is the same in both years
    const at68 = r.years.find(y => y.age === 68)!.yotamPensionPayoutMonthly;
    const at78 = r.years.find(y => y.age === 78)!.yotamPensionPayoutMonthly;
    const ratio = at78 / at68;
    expect(ratio).toBeGreaterThan(1.26);
    expect(ratio).toBeLessThan(1.30);
  });

  it('mekaddem is age-dependent (Menora 2025/26 calibration)', () => {
    expect(mekaddemForStartAge(216, 60)).toBeCloseTo(220.7, 1);
    expect(mekaddemForStartAge(216, 61)).toBe(216);
    expect(mekaddemForStartAge(216, 67)).toBeCloseTo(187.8, 1);
  });

  it('deferring pension start raises the monthly payout', () => {
    const c1 = createDefaultConfig(); c1.pensionStartAge = 60;
    const c2 = createDefaultConfig(); c2.pensionStartAge = 67;
    const p1 = simulate(c1).years.find(y => y.age === 67)!.yotamPensionPayoutMonthly;
    const p2 = simulate(c2).years.find(y => y.age === 67)!.yotamPensionPayoutMonthly;
    expect(p2).toBeGreaterThan(p1);
  });

  it('rent tax: 0 below ceiling; best route above it', () => {
    expect(calcMonthlyRentTax(5_000, 5_654)).toBe(0);
    // 6,200 → partial-exemption route: taxable 1,092 × 35% ≈ 382 (beats 10% = 620)
    expect(calcMonthlyRentTax(6_200, 5_654)).toBeCloseTo(382.2, 0);
    // 11,000 → partial route explodes; flat 10% (1,100) wins
    expect(calcMonthlyRentTax(11_000, 5_654)).toBeCloseTo(1_100, 0);
  });

  it('purchase tax: progressive single-home brackets (2026, frozen)', () => {
    expect(calcPurchaseTax(1_900_000)).toBe(0);
    // 4.8M: 368,295×3.5% + 2,452,960×5% ≈ 135,538
    expect(Math.round(calcPurchaseTax(4_800_000))).toBe(135_538);
  });

  it('pension contributions stop once the annuity is active', () => {
    const c = createDefaultConfig();
    c.housePurchaseYear = null;
    c.assets.orAkivaKeep = false;
    c.income.hadasNetIncomeZinuk = 0;
    c.income.hadasNetIncomePostZinuk = 0;
    c.income.hadasMonthlyPensionContribution = 0;
    c.pensionStartAge = 60;
    const r = simulate(c);
    // Age 62: pension active (60+), still earning alt income → NO deduction from net
    const y62 = r.years.find(y => y.age === 62)!;
    const expected62 = y62.yotamMonthlyIncome + y62.monthlyPensionIncome + y62.monthly4pctWithdrawal;
    expect(Math.abs(y62.monthlySustainableIncome - expected62)).toBeLessThanOrEqual(3);
    // Age 55: pension NOT active → alt-income deduction at the zinuk rate applies
    const y55 = r.years.find(y => y.age === 55)!;
    const rate = c.income.yotamMonthlyPensionContribution / c.income.yotamNetIncomeZinuk;
    const expected55 = y55.yotamMonthlyIncome * (1 - rate) + y55.monthly4pctWithdrawal;
    expect(Math.abs(y55.monthlySustainableIncome - expected55)).toBeLessThanOrEqual(3);
  });

  it('withdrawal rate is configurable and scales the reference line', () => {
    const c33 = createDefaultConfig(); c33.market.withdrawalRate = 0.033;
    const c40 = createDefaultConfig(); c40.market.withdrawalRate = 0.04;
    const w33 = simulate(c33).years[0].monthly4pctWithdrawal;
    const w40 = simulate(c40).years[0].monthly4pctWithdrawal;
    expect(w33 / w40).toBeCloseTo(0.825, 2);
  });

  it('Or Akiva rent above exemption ceiling is taxed in the cashflow', () => {
    const base = createDefaultConfig();
    base.housePurchaseYear = null;
    base.assets.orAkivaKeep = true;
    base.assets.orAkivaMonthlyMortgage = 0;
    base.assets.orAkivaMortgageBalance = 0;
    base.assets.orAkivaMonthlyExpenses = 0;
    const below = structuredClone(base);
    below.assets.orAkivaMonthlyRent = 5_000;   // under ceiling → untaxed
    const above = structuredClone(base);
    above.assets.orAkivaMonthlyRent = 6_200;   // over ceiling → ~382 tax
    const sBelow = simulate(below).years[0].monthlySustainableIncome;
    const sAbove = simulate(above).years[0].monthlySustainableIncome;
    // Gross diff is 1,200; net diff must be ~1,200 - 382 ≈ 818
    expect(sAbove - sBelow).toBeGreaterThan(750);
    expect(sAbove - sBelow).toBeLessThan(900);
  });
});

describe('Deep audit: taxes, allowances, mortgage timing', () => {
  it('early pension stacks on earned income: marginal income tax + Bituach Leumi', () => {
    // 10K pension over 20K gross: 5,100×31% + 4,900×35% + 10,000×11.96%
    expect(calcMonthlyPensionTax(10_000, 20_000, false, 2.25)).toBeCloseTo(4_492, 0);
  });
  it('pension within the exemption after retirement age is tax-free', () => {
    expect(calcMonthlyPensionTax(6_000, 0, true, 2.25)).toBe(0);
  });
  it('drawing pension at 60 while working nets less than the same pension at 67', () => {
    const c = createDefaultConfig(); c.pensionStartAge = 60;
    const r = simulate(c);
    const real = (age: number) => {
      const y = r.years.find(x => x.age === age)!;
      return y.yotamPensionPayoutMonthly / Math.pow(1.025, age - 44);
    };
    expect(real(60)).toBeLessThan(real(67) * 0.8);
  });
  it('old-age allowance: none before retirement age, both spouses once eligible', () => {
    const r = simulate(createDefaultConfig());
    expect(r.years.find(y => y.age === 66)!.monthlyOldAgeAllowance).toBe(0);
    const y67 = r.years.find(y => y.age === 67)!;
    const y80 = r.years.find(y => y.age === 80)!;
    expect(y67.monthlyOldAgeAllowance).toBeGreaterThan(0);
    // Hadas joins later → more than double Yotam's (CPI-adjusted) share
    expect(y80.monthlyOldAgeAllowance / Math.pow(1.025, 13)).toBeGreaterThan(y67.monthlyOldAgeAllowance * 1.9);
  });
  it('25-year mortgage is paid for exactly 25 years', () => {
    const r = simulate(createDefaultConfig()); // buys in year 1
    expect(r.years[23].mortgageBalance).toBeGreaterThan(0);
    expect(r.years[24].mortgageBalance).toBe(0);
    expect(r.years[25].monthlyHousingExpense).toBeLessThan(r.years[24].monthlyHousingExpense / 3);
  });
  it('a later purchase pays the appreciated price, not just CPI', () => {
    const c = createDefaultConfig();
    c.housePurchaseYear = 9;
    const y = simulate(c).years[8];
    expect(y.homeValue).toBeGreaterThan(c.house.priceToday * Math.pow(1.025, 8) * 1.15);
  });
  it('a purchase the portfolio cannot fund shows up as depletion, even during zinuk', () => {
    const c = createDefaultConfig();
    c.assets.liquidPortfolio = 0;
    c.assets.apartmentNetProceeds = 0;
    expect(simulate(c).depletionAge).toBe(44);
  });
  it('owner maintenance raises housing cost', () => {
    const c = createDefaultConfig();
    const base = simulate(c).years[0].monthlyHousingExpense;
    c.house.monthlyMaintenance = 0;
    expect(base - simulate(c).years[0].monthlyHousingExpense).toBe(1_500);
  });
});

describe('Equilibrium detection', () => {
  it('finds reasonable retirement age', () => {
    const age = findEarliestRetirementAge(createDefaultConfig());
    expect(age).not.toBeNull();
    expect(age!).toBeGreaterThanOrEqual(44);
    expect(age!).toBeLessThanOrEqual(80);
  });
  it('higher zinuk income → earlier retirement', () => {
    const c1 = createDefaultConfig(); c1.income.yotamNetIncomeZinuk = 40_000;
    const c2 = createDefaultConfig(); c2.income.yotamNetIncomeZinuk = 100_000;
    const age1 = findEarliestRetirementAge(c1);
    const age2 = findEarliestRetirementAge(c2);
    // Higher zinuk income → bigger liquid portfolio → earlier retirement
    expect(age2!).toBeLessThanOrEqual(age1!);
  });
  it('higher return → earlier retirement', () => {
    const c1 = createDefaultConfig(); c1.market.realReturnRate = 0.04;
    const c2 = createDefaultConfig(); c2.market.realReturnRate = 0.08;
    expect(findEarliestRetirementAge(c2)!).toBeLessThanOrEqual(findEarliestRetirementAge(c1)!);
  });
});
