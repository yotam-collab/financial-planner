import { describe, it, expect } from 'vitest';
import { simulate, calcMonthlyMortgagePayment, remainingMortgageBalance, findEarliestRetirementAge } from './simulator';
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
