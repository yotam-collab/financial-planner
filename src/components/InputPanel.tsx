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

/* ─── Collapsible section ─── */
function Section({ title, icon, color, defaultOpen = false, children }: {
  title: string; icon: string; color: string; defaultOpen?: boolean; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`rounded-2xl border transition-all duration-300 ${open ? `border-${color}-200/60 bg-${color}-50/20` : 'border-transparent bg-white/20'}`}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3 text-right cursor-pointer"
      >
        <span className="text-xl">{icon}</span>
        <span className="text-base font-bold text-slate-700 flex-1">{title}</span>
        <svg
          className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && <div className="px-4 pb-4 space-y-3">{children}</div>}
    </div>
  );
}

function NumInput({ label, value, onChange, step = 1000, suffix = '₪', note }: {
  label: string; value: number; onChange: (v: number) => void;
  step?: number; suffix?: string; note?: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <label className="text-sm text-slate-600 font-medium flex-shrink-0">{label}</label>
        <div className="flex items-center gap-1 bg-white/60 rounded-lg px-2.5 py-1.5 border border-white/70">
          <input
            type="number" value={value ?? 0}
            onChange={e => onChange(Number(e.target.value) || 0)}
            step={step}
            className="w-24 text-sm font-semibold text-slate-800 bg-transparent outline-none text-left"
          />
          <span className="text-xs text-slate-400">{suffix}</span>
        </div>
      </div>
      {note && <p className="text-xs text-slate-400 mt-0.5 mr-0.5">{note}</p>}
    </div>
  );
}

function SliderInput({ label, value, onChange, min, max, step = 1, displayValue, note }: {
  label: string; value: number; onChange: (v: number) => void;
  min: number; max: number; step?: number; displayValue: string; note?: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-sm text-slate-600 font-medium">{label}</label>
        <span className="text-sm font-bold text-indigo-600 num">{displayValue}</span>
      </div>
      <input
        type="range" value={value} onChange={e => onChange(Number(e.target.value))}
        min={min} max={max} step={step}
        className="w-full h-1.5 bg-slate-200 rounded-full appearance-none cursor-pointer accent-indigo-600"
      />
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
      {/* Header */}
      <div className="flex items-center gap-3 pb-3 border-b border-slate-200/40">
        <img src="/profile.jpeg" alt="" className="w-12 h-12 rounded-xl object-cover shadow" />
        <div>
          <h2 className="text-lg font-bold text-slate-800">פרמטרים</h2>
          <p className="text-xs text-slate-400">כל השדות ניתנים לעריכה</p>
        </div>
      </div>

      {/* ═══ 1. שלבי חיים ═══ */}
      <Section title="שלבי חיים" icon="🔄" color="indigo" defaultOpen={true}>
        <SliderInput
          label="סגירת זינוק"
          value={config.zinukEndAge}
          onChange={v => onChange(prev => ({ ...prev, zinukEndAge: v }))}
          min={config.startAge} max={config.fullRetirementAge}
          displayValue={`גיל ${config.zinukEndAge}`}
          note="מעבר מהכנסה עסקית להכנסה חלופית"
        />
        <NumInput
          label="הכנסה נטו מזינוק"
          value={config.income.monthlyNetBusinessIncome}
          onChange={v => update('income.monthlyNetBusinessIncome', v)}
          step={5000}
          note={`ברוטו: ~${estimateGross(config.income.monthlyNetBusinessIncome).toLocaleString('he-IL')} ₪`}
        />
        <NumInput
          label="הכנסה חלופית (נטו)"
          value={config.income.monthlyNetAltIncome}
          onChange={v => update('income.monthlyNetAltIncome', v)}
          step={1000}
          note="הכנסה חודשית אחרי סגירת הזינוק"
        />
        <SliderInput
          label="תחילת קצבת פנסיה"
          value={config.pensionStartAge}
          onChange={v => onChange(prev => ({ ...prev, pensionStartAge: v }))}
          min={60} max={67}
          displayValue={`גיל ${config.pensionStartAge}`}
          note="דחיית פנסיה מגדילה את הקצבה החודשית"
        />
        <SliderInput
          label="פרישה מלאה"
          value={config.fullRetirementAge}
          onChange={v => onChange(prev => ({ ...prev, fullRetirementAge: v }))}
          min={config.zinukEndAge} max={85}
          displayValue={`גיל ${config.fullRetirementAge}`}
          note="מגיל זה — רק 4% מהתיק + קצבת פנסיה"
        />
      </Section>

      {/* ═══ 2. נכסים נוכחיים ═══ */}
      <Section title="נכסים נוכחיים" icon="💰" color="emerald">
        <NumInput label="תיק נזיל" value={config.assets.liquidPortfolio} onChange={v => update('assets.liquidPortfolio', v)} step={50000} />
        <NumInput label="פנסיה (נעולה)" value={config.assets.pension} onChange={v => update('assets.pension', v)} step={50000}
          note="נעולה עד גיל 60 → קצבה חודשית" />
        <NumInput label="קה״ש" value={config.assets.kerenHishtalmut} onChange={v => update('assets.kerenHishtalmut', v)} step={10000}
          note={`נזילה בגיל ${config.assets.kerenHishtalmutLiquidAge}`} />
        <NumInput label="תמורת דירה (נטו)" value={config.assets.apartmentNetProceeds} onChange={v => update('assets.apartmentNetProceeds', v)} step={50000} />
      </Section>

      {/* ═══ 3. בית ═══ */}
      {(scenario === 'buyNow' || scenario === 'buyLater') && (
        <Section title="קניית בית" icon="🏠" color="violet">
          {scenario === 'buyLater' && config.housePurchaseYear !== null && (
            <SliderInput
              label="שנת קנייה"
              value={config.housePurchaseYear}
              onChange={v => update('housePurchaseYear', v)}
              min={2} max={20}
              displayValue={`גיל ${config.startAge + config.housePurchaseYear - 1}`}
            />
          )}
          <NumInput label="מחיר (ערכי היום)" value={config.house.priceToday} onChange={v => update('house.priceToday', v)} step={100000} />
          <NumInput label="שיפוץ" value={config.house.renovationCost} onChange={v => update('house.renovationCost', v)} step={10000} />
          <SliderInput
            label="LTV משכנתא"
            value={Math.round(config.house.mortgageLTV * 100)}
            onChange={v => update('house.mortgageLTV', v / 100)}
            min={30} max={75}
            displayValue={`${Math.round(config.house.mortgageLTV * 100)}%`}
            note={`משכנתא: ${mortAmt.toLocaleString('he-IL')} ₪ · חודשי: ${mortPay.toLocaleString('he-IL')} ₪`}
          />
          <NumInput label="ריבית" value={Math.round(config.house.mortgageRate * 1000) / 10} onChange={v => update('house.mortgageRate', v / 100)} step={0.1} suffix="%" />
          <NumInput label="תקופה" value={config.house.mortgageTerm} onChange={v => update('house.mortgageTerm', v)} step={1} suffix="שנים" />
        </Section>
      )}

      {/* ═══ 4. הוצאות וחיסכון ═══ */}
      <Section title="הוצאות וחיסכון" icon="📊" color="rose">
        <NumInput label="הוצאות חודשיות (ללא דיור)" value={config.expenses.monthlyNonHousingExpenses} onChange={v => update('expenses.monthlyNonHousingExpenses', v)} step={1000} />
        <NumInput label="שכ״ד" value={config.expenses.monthlyRent} onChange={v => update('expenses.monthlyRent', v)} step={500} />
        <NumInput label="הפקדה לפנסיה" value={config.income.monthlyPensionContribution} onChange={v => update('income.monthlyPensionContribution', v)} step={500} />
        <NumInput label="חיסכון חודשי (שוכר)" value={config.income.monthlyLiquidContributionRenting} onChange={v => update('income.monthlyLiquidContributionRenting', v)} step={1000} />
        <NumInput label="חיסכון חודשי (בעלים)" value={config.income.monthlyLiquidContributionOwning} onChange={v => update('income.monthlyLiquidContributionOwning', v)} step={1000} />
      </Section>

      {/* ═══ 5. הנחות שוק ═══ */}
      <Section title="הנחות שוק" icon="📈" color="amber">
        <SliderInput
          label="תשואה ריאלית"
          value={Math.round(config.market.realReturnRate * 100)}
          onChange={v => update('market.realReturnRate', v / 100)}
          min={3} max={10}
          displayValue={`${Math.round(config.market.realReturnRate * 100)}%`}
        />
        <SliderInput
          label="אינפלציה"
          value={Math.round(config.market.inflationRate * 100 * 10) / 10}
          onChange={v => update('market.inflationRate', v / 100)}
          min={1} max={6} step={0.5}
          displayValue={`${(config.market.inflationRate * 100).toFixed(1)}%`}
        />
        <SliderInput
          label="עליית מחירי דיור (ריאלי)"
          value={Math.round(config.market.realHomeAppreciation * 100)}
          onChange={v => update('market.realHomeAppreciation', v / 100)}
          min={0} max={5}
          displayValue={`${Math.round(config.market.realHomeAppreciation * 100)}%`}
        />
      </Section>
    </div>
  );
}
