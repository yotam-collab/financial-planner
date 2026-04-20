import { useState } from 'react';
import type { ScenarioConfig } from '../lib/types';
import { calcMonthlyMortgagePayment } from '../lib/simulator';

function estimateGross(monthlyNet: number): number {
  const a = monthlyNet * 12;
  let g: number;
  if (a <= 120_000) g = a / 0.82;
  else if (a <= 300_000) g = a / 0.72;
  else if (a <= 500_000) g = a / 0.65;
  else if (a <= 800_000) g = a / 0.58;
  else g = a / 0.52;
  return Math.round(g / 12);
}

interface Props {
  config: ScenarioConfig;
  setConfig: (updater: (prev: ScenarioConfig) => ScenarioConfig) => void;
}

function Section({ title, number, defaultOpen = false, children }: {
  title: string; number: string; defaultOpen?: boolean; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-t border-[#e8dfc8] first:border-t-0">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-3 py-4 text-right cursor-pointer group">
        <span className="num text-xs font-semibold text-[#a68a4d] w-6">{number}</span>
        <span className="serif text-base md:text-lg font-medium text-[#1a1c28] flex-1 group-hover:text-[#8a6f36] transition-colors">
          {title}
        </span>
        <svg className={`w-4 h-4 text-[#a68a4d] transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && <div className="pb-5 space-y-4">{children}</div>}
    </div>
  );
}

function NumInput({ label, value, onChange, step = 1000, suffix = '₪', note, rec }: {
  label: string; value: number; onChange: (v: number) => void;
  step?: number; suffix?: string; note?: string; rec?: string;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 mb-1.5">
        <label className="text-sm md:text-[15px] text-[#1a1c28] font-medium flex-shrink-0">{label}</label>
        <div className="flex items-baseline gap-1 border-b border-[#c9bd9e] pb-0.5 focus-within:border-[#a68a4d] transition-colors">
          <input
            type="number" value={value ?? 0}
            onChange={e => onChange(Number(e.target.value) || 0)}
            step={step}
            className="num text-base md:text-lg font-medium text-[#1a1c28] bg-transparent outline-none text-left w-24 md:w-28"
            style={{ fontVariantNumeric: 'tabular-nums' }}
          />
          <span className="text-xs md:text-sm text-[#8a8695]">{suffix}</span>
        </div>
      </div>
      {rec && <p className="text-[11px] md:text-xs text-[#8a6f36] mt-0.5 leading-tight">{rec}</p>}
      {note && <p className="text-[11px] md:text-xs text-[#8a8695] mt-0.5 leading-tight italic">{note}</p>}
    </div>
  );
}

function SliderInput({ label, value, onChange, min, max, step = 1, displayValue, note, rec }: {
  label: string; value: number; onChange: (v: number) => void;
  min: number; max: number; step?: number; displayValue: string; note?: string; rec?: string;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <label className="text-sm md:text-[15px] text-[#1a1c28] font-medium">{label}</label>
        <span className="num serif text-base md:text-lg font-medium text-[#8a6f36]">{displayValue}</span>
      </div>
      <input type="range" value={value} onChange={e => onChange(Number(e.target.value))}
        min={min} max={max} step={step} className="w-full" />
      {rec && <p className="text-[11px] md:text-xs text-[#8a6f36] mt-1.5 leading-tight">{rec}</p>}
      {note && <p className="text-[11px] md:text-xs text-[#8a8695] mt-1 leading-tight italic">{note}</p>}
    </div>
  );
}

export function InputPanel({ config, setConfig }: Props) {
  const update = (path: string, value: number) => {
    setConfig(prev => {
      const next = structuredClone(prev);
      const parts = path.split('.');
      let obj: any = next;
      for (let i = 0; i < parts.length - 1; i++) obj = obj[parts[i]];
      obj[parts[parts.length - 1]] = value;
      return next;
    });
  };

  const mortAmt = Math.round(config.house.priceToday * config.house.mortgageLTV);
  const mortPay = Math.round(calcMonthlyMortgagePayment(mortAmt, config.house.mortgageRate, config.house.mortgageTerm));

  const housePurchaseSliderValue = config.housePurchaseYear ?? 0;
  const setHousePurchaseYear = (v: number) => {
    setConfig(prev => ({ ...prev, housePurchaseYear: v === 0 ? null : v }));
  };
  const housePurchaseDisplayValue = housePurchaseSliderValue === 0
    ? 'לא לקנות'
    : housePurchaseSliderValue === 1
      ? 'מיידית'
      : `גיל ${config.startAge + housePurchaseSliderValue - 1}`;

  return (
    <div className="ledger-card px-5 md:px-6 py-5 md:py-6 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto fade-rise">
      <div className="flex items-start justify-between pb-4 border-b-2 border-[#e8dfc8] mb-2">
        <div>
          <p className="eyebrow mb-1">פרמטרים</p>
          <h2 className="serif text-xl md:text-2xl font-medium text-[#1a1c28]">לוח בקרה</h2>
        </div>
        <img
          src={`${import.meta.env.BASE_URL}profile.jpeg`}
          alt=""
          className="w-11 h-11 md:w-12 md:h-12 rounded-full object-cover border-2 border-[#a68a4d]/30"
        />
      </div>

      <Section title="שלבי חיים" number="I" defaultOpen={true}>
        <SliderInput label="סגירת זינוק" value={config.zinukEndAge}
          onChange={v => setConfig(prev => ({ ...prev, zinukEndAge: v }))}
          min={config.startAge} max={config.fullRetirementAge}
          displayValue={`גיל ${config.zinukEndAge}`}
          note="מעבר מהכנסת זינוק להכנסה חלופית" />
        <SliderInput label="תחילת קצבת יותם" value={config.pensionStartAge}
          onChange={v => setConfig(prev => ({ ...prev, pensionStartAge: v }))}
          min={60} max={67} displayValue={`גיל ${config.pensionStartAge}`}
          rec="גיל 60 — מינימום חוקי לגברים" />
        <SliderInput label="תחילת קצבת הדס" value={config.hadasPensionStartAge}
          onChange={v => setConfig(prev => ({ ...prev, hadasPensionStartAge: v }))}
          min={60} max={65}
          displayValue={`גיל ${config.hadasPensionStartAge} · עוד ${config.hadasPensionStartAge - config.hadasAge} שנים`}
          rec="גיל 62-65 — גיל פרישה לנשים" />
        <SliderInput label="פרישה מלאה" value={config.fullRetirementAge}
          onChange={v => setConfig(prev => ({ ...prev, fullRetirementAge: v }))}
          min={config.zinukEndAge} max={85} displayValue={`גיל ${config.fullRetirementAge}`}
          note="רק 4% מהתיק + קצבאות פנסיה מגיל זה" />
      </Section>

      <Section title="קניית בית" number="II" defaultOpen={true}>
        <SliderInput label="שנת קנייה"
          value={housePurchaseSliderValue}
          onChange={setHousePurchaseYear}
          min={0} max={30}
          displayValue={housePurchaseDisplayValue}
          note="0 = לא לקנות, 1 = מיידית, 2+ = בעתיד" />

        {config.housePurchaseYear !== null && (
          <>
            <NumInput label="מחיר (ערכי היום)" value={config.house.priceToday}
              onChange={v => update('house.priceToday', v)} step={100000}
              rec="בית בפרדס חנה · 4,800,000 ₪" />
            <NumInput label="שיפוץ" value={config.house.renovationCost}
              onChange={v => update('house.renovationCost', v)} step={10000} />
            <SliderInput label="LTV משכנתא" value={Math.round(config.house.mortgageLTV * 100)}
              onChange={v => update('house.mortgageLTV', v / 100)}
              min={30} max={75} displayValue={`${Math.round(config.house.mortgageLTV * 100)}%`}
              note={`משכנתא: ${mortAmt.toLocaleString('he-IL')} ₪ · חודשי: ${mortPay.toLocaleString('he-IL')} ₪`} />
            <NumInput label="ריבית" value={Math.round(config.house.mortgageRate * 1000) / 10}
              onChange={v => update('house.mortgageRate', v / 100)} step={0.1} suffix="%" />
            <NumInput label="תקופה" value={config.house.mortgageTerm}
              onChange={v => update('house.mortgageTerm', v)} step={1} suffix="שנים" />
          </>
        )}
      </Section>

      <Section title="יותם — הכנסה ופנסיה" number="III">
        <NumInput label="נטו לפני סגירת זינוק" value={config.income.yotamNetIncomeZinuk}
          onChange={v => update('income.yotamNetIncomeZinuk', v)} step={1000}
          note={`ברוטו: ~${estimateGross(config.income.yotamNetIncomeZinuk).toLocaleString('he-IL')} ₪`} />
        <NumInput label="נטו אחרי סגירת זינוק" value={config.income.yotamNetIncomePostZinuk}
          onChange={v => update('income.yotamNetIncomePostZinuk', v)} step={1000}
          note={config.income.yotamNetIncomePostZinuk > 0 ? `ברוטו: ~${estimateGross(config.income.yotamNetIncomePostZinuk).toLocaleString('he-IL')} ₪` : 'ללא הכנסה'} />
        <NumInput label="הפקדה לפנסיה" value={config.income.yotamMonthlyPensionContribution}
          onChange={v => update('income.yotamMonthlyPensionContribution', v)} step={100}
          rec="תקרת שכיר: 5,645 ₪" />
        <NumInput label="יתרת פנסיה" value={config.assets.yotamPension}
          onChange={v => update('assets.yotamPension', v)} step={50000}
          note={`נעולה עד גיל ${config.pensionStartAge}`} />
      </Section>

      <Section title="הדס — הכנסה ופנסיה" number="IV">
        <NumInput label="נטו לפני סגירת זינוק" value={config.income.hadasNetIncomeZinuk}
          onChange={v => update('income.hadasNetIncomeZinuk', v)} step={1000}
          note={`ברוטו: ~${estimateGross(config.income.hadasNetIncomeZinuk).toLocaleString('he-IL')} ₪ · עצמאית בת ${config.hadasAge}`} />
        <NumInput label="נטו אחרי סגירת זינוק" value={config.income.hadasNetIncomePostZinuk}
          onChange={v => update('income.hadasNetIncomePostZinuk', v)} step={1000}
          note={config.income.hadasNetIncomePostZinuk > 0 ? `ברוטו: ~${estimateGross(config.income.hadasNetIncomePostZinuk).toLocaleString('he-IL')} ₪` : 'ללא הכנסה'} />
        <NumInput label="הפקדה לפנסיה" value={config.income.hadasMonthlyPensionContribution}
          onChange={v => update('income.hadasMonthlyPensionContribution', v)} step={100}
          rec="חובת עצמאית: 1,170 ₪" />
        <NumInput label="יתרת פנסיה" value={config.assets.hadasPension}
          onChange={v => update('assets.hadasPension', v)} step={50000}
          note={`עוד ${config.hadasPensionStartAge - config.hadasAge} שנים לפנסיה`} />
      </Section>

      <Section title="נכסים משותפים" number="V">
        <NumInput label="תיק נזיל" value={config.assets.liquidPortfolio}
          onChange={v => update('assets.liquidPortfolio', v)} step={50000}
          rec="USD + קרנות + money market" />
        <NumInput label="קרן השתלמות" value={config.assets.kerenHishtalmut}
          onChange={v => update('assets.kerenHishtalmut', v)} step={10000}
          note={`נזילה בגיל ${config.assets.kerenHishtalmutLiquidAge}`} />
        <NumInput label="תמורת דירה (נטו)" value={config.assets.apartmentNetProceeds}
          onChange={v => update('assets.apartmentNetProceeds', v)} step={50000}
          rec="אור עקיבא · פטור ממס שבח" />
      </Section>

      <Section title="הוצאות" number="VI">
        <NumInput label="הוצאות (ללא דיור)" value={config.expenses.monthlyNonHousingExpenses}
          onChange={v => update('expenses.monthlyNonHousingExpenses', v)} step={1000}
          rec="משפחה עם 4 ילדים · 30,000 ₪" />
        <NumInput label="שכר דירה" value={config.expenses.monthlyRent}
          onChange={v => update('expenses.monthlyRent', v)} step={500}
          rec="מחיר שוק בפרדס חנה · 9,500 ₪" />
      </Section>

      <Section title="הנחות שוק" number="VII">
        <SliderInput label="תשואה ריאלית" value={Math.round(config.market.realReturnRate * 100)}
          onChange={v => update('market.realReturnRate', v / 100)}
          min={3} max={10} displayValue={`${Math.round(config.market.realReturnRate * 100)}%`}
          rec="6% — ממוצע ארוך-טווח תיק מפוזר" />
        <SliderInput label="אינפלציה" value={Math.round(config.market.inflationRate * 100 * 10) / 10}
          onChange={v => update('market.inflationRate', v / 100)}
          min={1} max={6} step={0.5} displayValue={`${(config.market.inflationRate * 100).toFixed(1)}%`}
          rec="יעד בנק ישראל 1-3% · בפועל 2.0%" />
        <SliderInput label="עליית מחירי דיור (ריאלי)" value={Math.round(config.market.realHomeAppreciation * 100)}
          onChange={v => update('market.realHomeAppreciation', v / 100)}
          min={0} max={5} displayValue={`${Math.round(config.market.realHomeAppreciation * 100)}%`}
          rec="ממוצע ארוך-טווח · 2%" />
      </Section>
    </div>
  );
}
