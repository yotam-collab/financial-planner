import { describe, it, expect } from 'vitest';
import {
  simulate, calcMonthlyMortgagePayment, remainingMortgageBalance, findEarliestRetirementAge,
  calcPurchaseTax, calcMonthlyRentTax, mekaddemForStartAge,
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
    expect(r.years).toHaveLength(42);
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
  it('Yotam pension activates at 60 (based on age)', () => {
    const r = simulate(createDefaultConfig());
    expect(r.years.find(y => y.age === 59)!.monthlyPensionPayout).toBe(0);
    expect(r.years.find(y => y.age === 60)!.monthlyPensionPayout).toBeGreaterThan(0);
  });
  it('Hadas pension activates when Hadas reaches 65', () => {
    // Hadas is 35 when Yotam is 44. Hadas turns 65 when Yotam is 74.
    const r = simulate(createDefaultConfig());
    const yotamAge73 = r.years.find(y => y.age === 73)!;
    const yotamAge74 = r.years.find(y => y.age === 74)!;
    // At Yotam 74, Hadas is 65 → her pension activates, total should jump
    expect(yotamAge74.monthlyPensionPayout).toBeGreaterThan(yotamAge73.monthlyPensionPayout);
  });
});

describe('Edge cases', () => {
  it('depletion handled gracefully', () => {
    const c = createDefaultConfig();
    c.expenses.monthlyNonHousingExpenses = 100_000;
    c.income.yotamNetIncomePostZinuk = 0;
    c.income.hadasNetIncomePostZinuk = 0;
    const r = simulate(c);
    expect(r.years).toHaveLength(42);
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
    const at60 = r.years.find(y => y.age === 60)!.yotamPensionPayoutMonthly;
    const at70 = r.years.find(y => y.age === 70)!.yotamPensionPayoutMonthly;
    const ratio = at70 / at60;
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
