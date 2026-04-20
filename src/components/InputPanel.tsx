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

const SECTION_COLORS: Record<string, { bg: string; text: string; icon: string }> = {
  indigo: { bg: 'bg-indigo-100/80', text: 'text-indigo-600', icon: 'text-indigo-600' },
  violet: { bg: 'bg-violet-100/80', text: 'text-violet-600', icon: 'text-violet-600' },
  pink: { bg: 'bg-pink-100/80', text: 'text-pink-600', icon: 'text-pink-600' },
  emerald: { bg: 'bg-emerald-100/80', text: 'text-emerald-600', icon: 'text-emerald-600' },
  amber: { bg: 'bg-amber-100/80', text: 'text-amber-600', icon: 'text-amber-600' },
  rose: { bg: 'bg-rose-100/80', text: 'text-rose-600', icon: 'text-rose-600' },
};

function Section({ title, icon, color = 'indigo', defaultOpen = false, children }: {
  title: string; icon: string; color?: keyof typeof SECTION_COLORS; defaultOpen?: boolean; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const c = SECTION_COLORS[color];
  return (
    <div className={`rounded-2xl transition-all duration-300 ${open ? 'bg-white/40 ring-1 ring-white/60' : 'bg-transparent'}`}>
      <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-3 px-4 py-3.5 text-right cursor-pointer group">
        <span className={`w-10 h-10 rounded-xl ${c.bg} flex items-center justify-center text-xl flex-shrink-0 transition-transform group-hover:scale-110`}>
          {icon}
        </span>
        <span className="font-display text-base md:text-lg font-bold text-slate-900 flex-1">
          {title}
        </span>
        <svg className={`w-4 h-4 ${c.icon} transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && <div className="px-4 pb-4 space-y-4">{children}</div>}
    </div>
  );
}

function NumInput({ label, value, onChange, step = 1000, suffix = '₪', note, rec }: {
  label: string; value: number; onChange: (v: number) => void;
  step?: number; suffix?: string; note?: string; rec?: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-1">
        <label className="text-sm md:text-[15px] text-slate-700 font-semibold flex-shrink-0">{label}</label>
        <div className="flex items-center gap-1 bg-white/70 rounded-xl px-3 py-1.5 border border-white/70 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-400/20 transition-all">
          <input
            type="number" value={value ?? 0}
            onChange={e => onChange(Number(e.target.value) || 0)}
            step={step}
            className="num w-24 md:w-28 text-sm md:text-base font-bold text-slate-900 bg-transparent outline-none text-left"
          />
          <span className="text-xs text-slate-400 font-medium">{suffix}</span>
        </div>
      </div>
      {rec && <p className="text-[11px] md:text-xs text-indigo-500 mt-0.5 mr-1 font-medium">💡 {rec}</p>}
      {note && <p className="text-[11px] md:text-xs text-slate-400 mt-0.5 mr-1 italic">{note}</p>}
    </div>
  );
}

function SliderInput({ label, value, onChange, min, max, step = 1, displayValue, note, rec }: {
  label: string; value: number; onChange: (v: number) => void;
  min: number; max: number; step?: number; displayValue: string; note?: string; rec?: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm md:text-[15px] text-slate-700 font-semibold">{label}</label>
        <span className="num font-display text-sm md:text-base font-bold gradient-text">{displayValue}</span>
      </div>
      <input type="range" value={value} onChange={e => onChange(Number(e.target.value))}
        min={min} max={max} step={step} />
      {rec && <p className="text-[11px] md:text-xs text-indigo-500 mt-1.5 mr-1 font-medium">💡 {rec}</p>}
      {note && <p className="text-[11px] md:text-xs text-slate-400 mt-0.5 mr-1 italic">{note}</p>}
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
    <div className="widget-card-static p-5 md:p-6 space-y-1 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto w-full">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 mb-2 border-b border-white/60">
        <div className="relative">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 via-violet-500 to-pink-500 p-0.5 float-anim">
            <img
              src={`${import.meta.env.BASE_URL}profile.jpeg`}
              alt=""
              className="w-full h-full rounded-2xl object-cover"
            />
          </div>
        </div>
        <div>
          <h2 className="font-display text-lg md:text-xl font-extrabold text-slate-900 leading-tight">פרמטרים</h2>
          <p className="text-xs text-slate-500 font-medium">יותם והדס</p>
        </div>
      </div>

      <Section title="שלבי חיים" icon="🔄" color="indigo" defaultOpen={true}>
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
          note="רק 4% מהתיק + קצבאות פנסיה" />
      </Section>

      <Section title="קניית בית" icon="🏠" color="violet" defaultOpen={true}>
        <SliderInput label="שנת קנייה"
          value={housePurchaseSliderValue}
          onChange={setHousePurchaseYear}
          min={0} max={30}
          displayValue={housePurchaseDisplayValue}
          note="0 = לא לקנות · 1 = מיידית · 2+ = בעתיד" />

        {config.housePurchaseYear !== null && (
          <>
            <NumInput label="מחיר (ערכי היום)" value={config.house.priceToday}
              onChange={v => update('house.priceToday', v)} step={100000}
              rec="4,800,000 ₪ — בית בפרדס חנה" />
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

      <Section title="יותם — הכנסה ופנסיה" icon="👨‍💼" color="indigo">
        <NumInput label="נטו לפני זינוק" value={config.income.yotamNetIncomeZinuk}
          onChange={v => update('income.yotamNetIncomeZinuk', v)} step={1000}
          note={`ברוטו: ~${estimateGross(config.income.yotamNetIncomeZinuk).toLocaleString('he-IL')} ₪`} />
        <NumInput label="נטו אחרי זינוק" value={config.income.yotamNetIncomePostZinuk}
          onChange={v => update('income.yotamNetIncomePostZinuk', v)} step={1000}
          note={config.income.yotamNetIncomePostZinuk > 0 ? `ברוטו: ~${estimateGross(config.income.yotamNetIncomePostZinuk).toLocaleString('he-IL')} ₪` : 'ללא הכנסה'} />
        <NumInput label="הפקדה לפנסיה" value={config.income.yotamMonthlyPensionContribution}
          onChange={v => update('income.yotamMonthlyPensionContribution', v)} step={100}
          rec="תקרת שכיר: 5,645 ₪" />
        <NumInput label="יתרת פנסיה" value={config.assets.yotamPension}
          onChange={v => update('assets.yotamPension', v)} step={50000}
          note={`נעולה עד גיל ${config.pensionStartAge}`} />
      </Section>

      <Section title="הדס — הכנסה ופנסיה" icon="👩‍💼" color="pink">
        <NumInput label="נטו לפני זינוק" value={config.income.hadasNetIncomeZinuk}
          onChange={v => update('income.hadasNetIncomeZinuk', v)} step={1000}
          note={`עצמאית בת ${config.hadasAge} · ברוטו: ~${estimateGross(config.income.hadasNetIncomeZinuk).toLocaleString('he-IL')} ₪`} />
        <NumInput label="נטו אחרי זינוק" value={config.income.hadasNetIncomePostZinuk}
          onChange={v => update('income.hadasNetIncomePostZinuk', v)} step={1000}
          note={config.income.hadasNetIncomePostZinuk > 0 ? `ברוטו: ~${estimateGross(config.income.hadasNetIncomePostZinuk).toLocaleString('he-IL')} ₪` : 'ללא הכנסה'} />
        <NumInput label="הפקדה לפנסיה" value={config.income.hadasMonthlyPensionContribution}
          onChange={v => update('income.hadasMonthlyPensionContribution', v)} step={100}
          rec="חובת עצמאית: 1,170 ₪" />
        <NumInput label="יתרת פנסיה" value={config.assets.hadasPension}
          onChange={v => update('assets.hadasPension', v)} step={50000}
          note={`עוד ${config.hadasPensionStartAge - config.hadasAge} שנים לפנסיה`} />
      </Section>

      <Section title="נכסים משותפים" icon="💎" color="emerald">
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

      <Section title="הוצאות" icon="📊" color="rose">
        <NumInput label="הוצאות (ללא דיור)" value={config.expenses.monthlyNonHousingExpenses}
          onChange={v => update('expenses.monthlyNonHousingExpenses', v)} step={1000}
          rec="30,000 ₪ — משפחה עם 4 ילדים" />
        <NumInput label="שכר דירה" value={config.expenses.monthlyRent}
          onChange={v => update('expenses.monthlyRent', v)} step={500}
          rec="9,500 ₪ — מחיר שוק בפרדס חנה" />
      </Section>

      <Section title="הנחות שוק" icon="📈" color="amber">
        <SliderInput label="תשואה ריאלית" value={Math.round(config.market.realReturnRate * 100)}
          onChange={v => update('market.realReturnRate', v / 100)}
          min={3} max={10} displayValue={`${Math.round(config.market.realReturnRate * 100)}%`}
          rec="6% — ממוצע ארוך-טווח" />
        <SliderInput label="אינפלציה" value={Math.round(config.market.inflationRate * 100 * 10) / 10}
          onChange={v => update('market.inflationRate', v / 100)}
          min={1} max={6} step={0.5} displayValue={`${(config.market.inflationRate * 100).toFixed(1)}%`}
          rec="2.5% — יעד בנק ישראל" />
        <SliderInput label="עליית מחירי דיור" value={Math.round(config.market.realHomeAppreciation * 100)}
          onChange={v => update('market.realHomeAppreciation', v / 100)}
          min={0} max={5} displayValue={`${Math.round(config.market.realHomeAppreciation * 100)}%`}
          rec="2% — ריאלי, ארוך-טווח" />
      </Section>
    </div>
  );
}
