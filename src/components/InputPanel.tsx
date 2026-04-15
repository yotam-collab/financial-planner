import { useState } from 'react';
import type { ScenarioConfig } from '../lib/types';
import type { ScenarioType } from '../hooks/useFinancialState';
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
  scenario: ScenarioType;
  onChange: (updater: (prev: ScenarioConfig) => ScenarioConfig) => void;
}

function Section({ title, icon, defaultOpen = false, children }: {
  title: string; icon: string; defaultOpen?: boolean; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`rounded-2xl border transition-all duration-300 ${open ? 'border-slate-200/60 bg-white/20' : 'border-transparent bg-white/10'}`}>
      <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-3 px-4 py-3 text-right cursor-pointer">
        <span className="text-xl">{icon}</span>
        <span className="text-base font-bold text-slate-700 flex-1">{title}</span>
        <svg className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && <div className="px-4 pb-4 space-y-3">{children}</div>}
    </div>
  );
}

function NumInput({ label, value, onChange, step = 1000, suffix = '₪', note, rec }: {
  label: string; value: number; onChange: (v: number) => void;
  step?: number; suffix?: string; note?: string; rec?: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <label className="text-sm text-slate-600 font-medium flex-shrink-0">{label}</label>
        <div className="flex items-center gap-1 bg-white/60 rounded-lg px-2.5 py-1.5 border border-white/70">
          <input type="number" value={value ?? 0} onChange={e => onChange(Number(e.target.value) || 0)} step={step}
            className="w-24 text-sm font-semibold text-slate-800 bg-transparent outline-none text-left" />
          <span className="text-xs text-slate-400">{suffix}</span>
        </div>
      </div>
      {rec && <p className="text-xs text-indigo-500 mt-0.5 mr-0.5">💡 המלצה: {rec}</p>}
      {note && <p className="text-xs text-slate-400 mt-0.5 mr-0.5">{note}</p>}
    </div>
  );
}

function SliderInput({ label, value, onChange, min, max, step = 1, displayValue, note, rec }: {
  label: string; value: number; onChange: (v: number) => void;
  min: number; max: number; step?: number; displayValue: string; note?: string; rec?: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-sm text-slate-600 font-medium">{label}</label>
        <span className="text-sm font-bold text-indigo-600 num">{displayValue}</span>
      </div>
      <input type="range" value={value} onChange={e => onChange(Number(e.target.value))}
        min={min} max={max} step={step}
        className="w-full h-1.5 bg-slate-200 rounded-full appearance-none cursor-pointer accent-indigo-600" />
      {rec && <p className="text-xs text-indigo-500 mt-0.5">💡 המלצה: {rec}</p>}
      {note && <p className="text-xs text-slate-400 mt-0.5">{note}</p>}
    </div>
  );
}

export function InputPanel({ config, scenario, onChange }: Props) {
  const update = (path: string, value: number) => {
    onChange(prev => {
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

  return (
    <div className="glass-card p-5 text-right lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto space-y-3">
      <div className="flex items-center gap-3 pb-3 border-b border-slate-200/40">
        <img src={`${import.meta.env.BASE_URL}profile.jpeg`} alt="" className="w-12 h-12 rounded-xl object-cover shadow" />
        <div>
          <h2 className="text-lg font-bold text-slate-800">פרמטרים</h2>
          <p className="text-xs text-slate-400">יותם והדס · כל השדות ניתנים לעריכה</p>
        </div>
      </div>

      {/* ═══ שלבי חיים ═══ */}
      <Section title="שלבי חיים" icon="🔄" defaultOpen={true}>
        <SliderInput label="סגירת זינוק" value={config.zinukEndAge}
          onChange={v => onChange(prev => ({ ...prev, zinukEndAge: v }))}
          min={config.startAge} max={config.fullRetirementAge}
          displayValue={`גיל ${config.zinukEndAge}`}
          note="מעבר מהכנסה עסקית להכנסה חלופית" />
        <NumInput label="הכנסה חלופית (נטו)" value={config.income.monthlyNetAltIncome}
          onChange={v => update('income.monthlyNetAltIncome', v)} step={1000}
          note="הכנסה חודשית משותפת אחרי סגירת הזינוק"
          rec="15,000-20,000 ₪ — עבודה חלקית" />
        <SliderInput label="תחילת קצבת יותם" value={config.pensionStartAge}
          onChange={v => onChange(prev => ({ ...prev, pensionStartAge: v }))}
          min={60} max={67} displayValue={`גיל ${config.pensionStartAge}`}
          rec="גיל 60 — מינימום חוקי לגברים" />
        <SliderInput label="תחילת קצבת הדס" value={config.hadasPensionStartAge}
          onChange={v => onChange(prev => ({ ...prev, hadasPensionStartAge: v }))}
          min={60} max={65} displayValue={`גיל ${config.hadasPensionStartAge} (הדס בת ${config.hadasAge + config.hadasPensionStartAge - config.hadasAge})`}
          rec="גיל 62-65 — גיל פרישה לנשים" />
        <SliderInput label="פרישה מלאה" value={config.fullRetirementAge}
          onChange={v => onChange(prev => ({ ...prev, fullRetirementAge: v }))}
          min={config.zinukEndAge} max={85} displayValue={`גיל ${config.fullRetirementAge}`}
          note="מגיל זה — רק 4% מהתיק + קצבאות פנסיה" />
      </Section>

      {/* ═══ הכנסות — יותם ═══ */}
      <Section title="יותם — הכנסה ופנסיה" icon="👨‍💼">
        <NumInput label="הכנסה נטו חודשית" value={config.income.yotamMonthlyNetIncome}
          onChange={v => update('income.yotamMonthlyNetIncome', v)} step={5000}
          note={`ברוטו: ~${estimateGross(config.income.yotamMonthlyNetIncome).toLocaleString('he-IL')} ₪`}
          rec="65,000 ₪ — שכיר בחברה בע״מ, 100K ברוטו" />
        <NumInput label="הפקדה חודשית לפנסיה" value={config.income.yotamMonthlyPensionContribution}
          onChange={v => update('income.yotamMonthlyPensionContribution', v)} step={100}
          rec="5,645 ₪ — תקרת הפקדה לשכיר (6%+6.5%+6%)"
          note="עובד 6% + מעסיק 6.5% + פיצויים 6%" />
        <NumInput label="יתרת פנסיה נוכחית" value={config.assets.yotamPension}
          onChange={v => update('assets.yotamPension', v)} step={50000}
          note="נעולה עד גיל פרישה → קצבה חודשית (מקדם 216)" />
      </Section>

      {/* ═══ הכנסות — הדס ═══ */}
      <Section title="הדס — הכנסה ופנסיה" icon="👩‍💼">
        <NumInput label="הכנסה נטו חודשית" value={config.income.hadasMonthlyNetIncome}
          onChange={v => update('income.hadasMonthlyNetIncome', v)} step={1000}
          note={`ברוטו: ~${estimateGross(config.income.hadasMonthlyNetIncome).toLocaleString('he-IL')} ₪ · עצמאית, בת ${config.hadasAge}`}
          rec="22,000 ₪ — עצמאית ~30K ברוטו" />
        <NumInput label="הפקדה חודשית לפנסיה" value={config.income.hadasMonthlyPensionContribution}
          onChange={v => update('income.hadasMonthlyPensionContribution', v)} step={100}
          rec="1,170 ₪ — חובת הפקדה לעצמאית (4.45%+12.55%)"
          note="על הכנסה עד שכר ממוצע במשק" />
        <NumInput label="יתרת פנסיה נוכחית" value={config.assets.hadasPension}
          onChange={v => update('assets.hadasPension', v)} step={50000}
          note={`בת ${config.hadasAge} — עוד ${config.hadasPensionStartAge - config.hadasAge} שנים לפנסיה`} />
      </Section>

      {/* ═══ נכסים ═══ */}
      <Section title="נכסים משותפים" icon="💰">
        <NumInput label="תיק נזיל" value={config.assets.liquidPortfolio}
          onChange={v => update('assets.liquidPortfolio', v)} step={50000}
          rec="1,770,000 ₪ — USD + קרנות + money market" />
        <NumInput label="קה״ש" value={config.assets.kerenHishtalmut}
          onChange={v => update('assets.kerenHishtalmut', v)} step={10000}
          note={`נזילה בגיל ${config.assets.kerenHishtalmutLiquidAge} · רווחים פטורים ממס`}
          rec="200,000 ₪" />
        <NumInput label="תמורת דירה (נטו)" value={config.assets.apartmentNetProceeds}
          onChange={v => update('assets.apartmentNetProceeds', v)} step={50000}
          rec="1,180,000 ₪ — אור עקיבא, פטור ממס שבח (דירה יחידה)" />
      </Section>

      {/* ═══ בית ═══ */}
      {(scenario === 'buyNow' || scenario === 'buyLater') && (
        <Section title="קניית בית" icon="🏠">
          {scenario === 'buyLater' && config.housePurchaseYear !== null && (
            <SliderInput label="שנת קנייה" value={config.housePurchaseYear}
              onChange={v => update('housePurchaseYear', v)}
              min={2} max={20} displayValue={`גיל ${config.startAge + config.housePurchaseYear - 1}`} />
          )}
          <NumInput label="מחיר (ערכי היום)" value={config.house.priceToday}
            onChange={v => update('house.priceToday', v)} step={100000}
            rec="4,800,000 ₪ — בית בפרדס חנה" />
          <NumInput label="שיפוץ" value={config.house.renovationCost}
            onChange={v => update('house.renovationCost', v)} step={10000}
            rec="200,000 ₪ — נטו אחרי מה שעובר דרך העסק" />
          <SliderInput label="LTV משכנתא" value={Math.round(config.house.mortgageLTV * 100)}
            onChange={v => update('house.mortgageLTV', v / 100)}
            min={30} max={75} displayValue={`${Math.round(config.house.mortgageLTV * 100)}%`}
            note={`משכנתא: ${mortAmt.toLocaleString('he-IL')} ₪ · חודשי: ${mortPay.toLocaleString('he-IL')} ₪`}
            rec="60% — מקסימום מומלץ ללא ביטוח נוסף" />
          <NumInput label="ריבית" value={Math.round(config.house.mortgageRate * 1000) / 10}
            onChange={v => update('house.mortgageRate', v / 100)} step={0.1} suffix="%"
            rec="4.5-5.5% — ריבית ממוצעת משוקללת (פריים+קבועה+מדד)" />
          <NumInput label="תקופה" value={config.house.mortgageTerm}
            onChange={v => update('house.mortgageTerm', v)} step={1} suffix="שנים"
            rec="25 שנים — מקסימום מותר" />
        </Section>
      )}

      {/* ═══ הוצאות וחיסכון ═══ */}
      <Section title="הוצאות וחיסכון" icon="📊">
        <NumInput label="הוצאות (ללא דיור)" value={config.expenses.monthlyNonHousingExpenses}
          onChange={v => update('expenses.monthlyNonHousingExpenses', v)} step={1000}
          rec="22,000 ₪ — משפחה עם 4 ילדים (מזון, רכב, ביטוח, חוגים)" />
        <NumInput label="שכ״ד" value={config.expenses.monthlyRent}
          onChange={v => update('expenses.monthlyRent', v)} step={500}
          rec="11,000 ₪ — מחיר שוק לבית בפרדס חנה" />
        <NumInput label="חיסכון חודשי (שוכר)" value={config.income.monthlyLiquidContributionRenting}
          onChange={v => update('income.monthlyLiquidContributionRenting', v)} step={1000}
          rec="17,000 ₪ — עודף אחרי הוצאות+שכירות+פנסיה" />
        <NumInput label="חיסכון חודשי (בעלים)" value={config.income.monthlyLiquidContributionOwning}
          onChange={v => update('income.monthlyLiquidContributionOwning', v)} step={1000}
          rec="10,000 ₪ — פחות בגלל תשלום משכנתא" />
      </Section>

      {/* ═══ הנחות שוק ═══ */}
      <Section title="הנחות שוק" icon="📈">
        <SliderInput label="תשואה ריאלית" value={Math.round(config.market.realReturnRate * 100)}
          onChange={v => update('market.realReturnRate', v / 100)}
          min={3} max={10} displayValue={`${Math.round(config.market.realReturnRate * 100)}%`}
          rec="6% — ממוצע ארוך-טווח תיק מפוזר (מניות+אג״ח)" />
        <SliderInput label="אינפלציה" value={Math.round(config.market.inflationRate * 100 * 10) / 10}
          onChange={v => update('market.inflationRate', v / 100)}
          min={1} max={6} step={0.5} displayValue={`${(config.market.inflationRate * 100).toFixed(1)}%`}
          rec="2.5% — יעד בנק ישראל 1-3%, בפועל 2.0% (פב׳ 2026)" />
        <SliderInput label="עליית מחירי דיור (ריאלי)" value={Math.round(config.market.realHomeAppreciation * 100)}
          onChange={v => update('market.realHomeAppreciation', v / 100)}
          min={0} max={5} displayValue={`${Math.round(config.market.realHomeAppreciation * 100)}%`}
          rec="2% — ממוצע ארוך-טווח בישראל" />
      </Section>
    </div>
  );
}
