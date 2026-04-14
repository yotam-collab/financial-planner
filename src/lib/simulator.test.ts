import { describe, it, expect } from 'vitest';
import { simulate, calcMonthlyMortgagePayment, remainingMortgageBalance, findEarliestRetirementAge } from './simulator';
import { createBuyNowConfig, createRentForeverConfig, createBuyLaterConfig } from './defaults';

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
    const c = createRentForeverConfig();
    c.zinukEndAge = 50;
    c.fullRetirementAge = 65;
    const r = simulate(c);
    expect(r.years.find(y => y.age === 45)!.phase).toBe('zinuk');
    expect(r.years.find(y => y.age === 55)!.phase).toBe('altIncome');
    expect(r.years.find(y => y.age === 70)!.phase).toBe('retired');
  });

  it('no alt income during zinuk phase', () => {
    const r = simulate(createRentForeverConfig());
    const zinukYear = r.years.find(y => y.phase === 'zinuk')!;
    expect(zinukYear.monthlyAltIncome).toBe(0);
  });

  it('no alt income during retired phase', () => {
    const c = createRentForeverConfig();
    c.fullRetirementAge = 60;
    const r = simulate(c);
    const retiredYear = r.years.find(y => y.phase === 'retired')!;
    expect(retiredYear.monthlyAltIncome).toBe(0);
  });

  it('alt income only in altIncome phase', () => {
    const c = createRentForeverConfig();
    c.zinukEndAge = 48;
    const r = simulate(c);
    const altYear = r.years.find(y => y.phase === 'altIncome')!;
    expect(altYear.monthlyAltIncome).toBeGreaterThan(0);
  });
});

describe('monthlyBalance', () => {
  it('equals sustainable income minus expenses', () => {
    const r = simulate(createRentForeverConfig());
    const y = r.years[10];
    // Both are rounded independently, so allow ±1 difference
    expect(Math.abs(y.monthlyBalance - (y.monthlySustainableIncome - y.monthlyExpenses))).toBeLessThanOrEqual(1);
  });

  it('eventually crosses zero (positive balance)', () => {
    const r = simulate(createRentForeverConfig());
    const positive = r.years.find(y => y.monthlyBalance > 0);
    expect(positive).toBeDefined();
  });
});

describe('Scenario 1: Buy Now', () => {
  it('runs without errors', () => {
    const r = simulate(createBuyNowConfig());
    expect(r.years).toHaveLength(42);
    expect(r.scenarioLabel).toBe('קנייה מיידית');
  });
  it('owns from year 1', () => {
    expect(simulate(createBuyNowConfig()).years[0].housingStatus).toBe('owning');
  });
  it('finds earliest retirement age', () => {
    const r = simulate(createBuyNowConfig());
    expect(r.earliestRetirementAge).not.toBeNull();
    expect(r.earliestRetirementAge!).toBeGreaterThanOrEqual(44);
  });
});

describe('Scenario 2: Rent Forever', () => {
  it('never owns', () => {
    simulate(createRentForeverConfig()).years.forEach(y => {
      expect(y.housingStatus).toBe('renting');
    });
  });
  it('higher liquid than buy-now', () => {
    const rent = simulate(createRentForeverConfig());
    const buy = simulate(createBuyNowConfig());
    expect(rent.years[4].liquidPortfolio).toBeGreaterThan(buy.years[4].liquidPortfolio);
  });
});

describe('Scenario 3: Buy Later', () => {
  it('rents then owns', () => {
    const r = simulate(createBuyLaterConfig(52));
    expect(r.years[0].housingStatus).toBe('renting');
    expect(r.years[8].housingStatus).toBe('owning');
  });
});

describe('Pension', () => {
  it('separate from liquid', () => {
    const y = simulate(createRentForeverConfig()).years[0];
    expect(y.pension).toBeGreaterThan(0);
  });
  it('activates at 60', () => {
    const r = simulate(createRentForeverConfig());
    expect(r.years.find(y => y.age === 59)!.monthlyPensionPayout).toBe(0);
    expect(r.years.find(y => y.age === 60)!.monthlyPensionPayout).toBeGreaterThan(0);
  });
  it('payout uses mekaddem 200', () => {
    const r = simulate(createRentForeverConfig());
    const p = r.years.find(y => y.age === 60)!.monthlyPensionPayout;
    expect(p).toBeGreaterThan(5_000);
    expect(p).toBeLessThan(50_000);
  });
});

describe('Edge cases', () => {
  it('depletion handled gracefully', () => {
    const c = createBuyNowConfig();
    c.expenses.monthlyNonHousingExpenses = 80_000;
    c.income.monthlyNetAltIncome = 2_000;
    const r = simulate(c);
    expect(r.years).toHaveLength(42);
    r.years.filter(y => y.isDepleted).forEach(y => expect(y.liquidPortfolio).toBe(0));
  });

  it('keren merges at 47', () => {
    const r = simulate(createRentForeverConfig());
    const jump = r.years.find(y => y.age === 47)!.liquidPortfolio - r.years.find(y => y.age === 46)!.liquidPortfolio;
    expect(jump).toBeGreaterThan(200_000);
  });
});

describe('Equilibrium detection', () => {
  it('finds reasonable retirement age', () => {
    const age = findEarliestRetirementAge(createRentForeverConfig());
    expect(age).not.toBeNull();
    expect(age!).toBeGreaterThanOrEqual(44);
    expect(age!).toBeLessThanOrEqual(65);
  });
  it('higher alt income → earlier', () => {
    const c1 = createRentForeverConfig(); c1.income.monthlyNetAltIncome = 10_000;
    const c2 = createRentForeverConfig(); c2.income.monthlyNetAltIncome = 25_000;
    expect(findEarliestRetirementAge(c2)!).toBeLessThanOrEqual(findEarliestRetirementAge(c1)!);
  });
  it('higher return → earlier', () => {
    const c1 = createRentForeverConfig(); c1.market.realReturnRate = 0.04;
    const c2 = createRentForeverConfig(); c2.market.realReturnRate = 0.08;
    expect(findEarliestRetirementAge(c2)!).toBeLessThanOrEqual(findEarliestRetirementAge(c1)!);
  });
});
