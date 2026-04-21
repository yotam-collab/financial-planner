import { useState } from 'react';
import type { ScenarioConfig } from '../lib/types';
import { calcMonthlyMortgagePayment, calcPurchaseTax } from '../lib/simulator';
import { HelpTooltip } from './HelpTooltip';
import { ExpenseSimulatorModal } from './ExpenseSimulatorModal';

const VAT_RATE = 0.18;

function fmtK(v: number): string {
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`;
  if (Math.abs(v) >= 1_000) return `${Math.round(v / 1_000)}K`;
  return String(Math.round(v));
}

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

function NumInput({ label, value, onChange, step = 1000, suffix = '₪', note, rec, help }: {
  label: string; value: number; onChange: (v: number) => void;
  step?: number; suffix?: string; note?: string; rec?: string; help?: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-1">
        <label className="text-sm md:text-[15px] text-slate-800 font-semibold flex-shrink-0 flex items-center gap-1.5">
          {label}
          {help && <HelpTooltip text={help} />}
        </label>
        <div
          className="flex items-center gap-1 rounded-xl px-3 py-1.5 border border-indigo-200/60 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-400/25 transition-all"
          style={{ background: '#ffffff' }}
        >
          <input
            type="number" value={value ?? 0}
            onChange={e => onChange(Number(e.target.value) || 0)}
            step={step}
            className="num w-24 md:w-28 text-sm md:text-base font-bold outline-none text-left"
            style={{ background: 'transparent', color: '#0f172a' }}
          />
          <span className="text-xs font-medium" style={{ color: '#64748b' }}>{suffix}</span>
        </div>
      </div>
      {rec && <p className="text-[11px] md:text-xs text-indigo-600 mt-0.5 mr-1 font-medium">💡 {rec}</p>}
      {note && <p className="text-[11px] md:text-xs text-slate-500 mt-0.5 mr-1 italic">{note}</p>}
    </div>
  );
}

function ClosingCostsPanel({ config, update }: {
  config: ScenarioConfig;
  update: (path: string, value: number) => void;
}) {
  const price = config.house.priceToday;
  const lawyerRate = config.house.lawyerFeeRate ?? 0;
  const brokerRate = config.house.brokerFeeRate ?? 0;
  const otherClosing = config.house.otherClosingCosts ?? 0;

  const purchaseTax = calcPurchaseTax(price);
  const purchaseTaxEffectiveRate = price > 0 ? (purchaseTax / price) * 100 : 0;
  const lawyerFee = price * lawyerRate * (1 + VAT_RATE);
  const brokerFee = price * brokerRate * (1 + VAT_RATE);
  const totalClosing = purchaseTax + lawyerFee + brokerFee + otherClosing;
  const totalPct = price > 0 ? (totalClosing / price) * 100 : 0;

  return (
    <div className="pt-3 mt-2 border-t border-white/70">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-600 flex items-center gap-1.5">
          💰 הוצאות נלוות לקנייה
          <HelpTooltip text="כל העלויות מעבר למחיר הבית: מס רכישה (מדרגתי לפי חוק), עו״ד (~0.5% + מע״מ), מתווך (עד 2% + מע״מ), והוצאות נוספות (טאבו, שמאי, הובלה). סה״כ: 4-6% מהמחיר בדירה יחידה." />
        </p>
        <span className="text-[11px] font-bold text-violet-700 bg-violet-100 px-2 py-0.5 rounded-full">
          סה״כ <span className="num">{fmtK(totalClosing)} ₪</span> · {totalPct.toFixed(1)}%
        </span>
      </div>

      {/* Purchase tax — auto, display only */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <label className="text-sm md:text-[15px] text-slate-800 font-semibold flex items-center gap-1.5">
            מס רכישה <span className="text-[11px] font-normal text-violet-600">(חישוב אוטומטי)</span>
            <HelpTooltip text="מס רכישה בישראל לדירה יחידה (2026) — מדרגתי: 0% עד 1.98M, 3.5% עד 2.35M, 5% עד 6.05M, 8% עד 20.18M, 10% מעל. חישוב אוטומטי מהמחיר. לדירה שנייה/משקיעים: 8% על כל הסכום." />
          </label>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-500">({purchaseTaxEffectiveRate.toFixed(2)}%)</span>
            <span className="num text-sm md:text-base font-bold text-violet-700" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {Math.round(purchaseTax).toLocaleString('he-IL')} ₪
            </span>
          </div>
        </div>
      </div>

      {/* Lawyer fee — slider % */}
      <SliderInput
        label="שכר טרחת עו״ד"
        value={Math.round(lawyerRate * 1000) / 10}
        onChange={v => update('house.lawyerFeeRate', v / 100)}
        min={0} max={1.5} step={0.1}
        displayValue={`${(lawyerRate * 100).toFixed(1)}% · ${fmtK(lawyerFee)} ₪`}
        rec="0.5% + מע״מ — סטנדרט שוק (0.5-1%)"
        note={`${(lawyerRate * 100).toFixed(1)}% × ${fmtK(price)} + 18% מע״מ = ${Math.round(lawyerFee).toLocaleString('he-IL')} ₪`}
        help="שכר טרחת עו״ד קונה. שוק: 0.5-1% + מע״מ. סטנדרט: 0.5% לעסקה פשוטה. בעסקה מורכבת (קבלן, ירושה): 0.75-1%. מקביל — עו״ד מוכר על חשבון המוכר. עלויות נוספות כלולות: אגרות, טאבו — לרוב נכללות." />

      {/* Broker fee — slider % */}
      <SliderInput
        label="דמי תיווך"
        value={Math.round(brokerRate * 1000) / 10}
        onChange={v => update('house.brokerFeeRate', v / 100)}
        min={0} max={2.5} step={0.1}
        displayValue={brokerRate === 0 ? 'ללא מתווך' : `${(brokerRate * 100).toFixed(1)}% · ${fmtK(brokerFee)} ₪`}
        rec="עד 2% + מע״מ (תקרה בחוק) · 0 אם ישירות מול מוכר"
        note={brokerRate === 0 ? 'קנייה ישירות מבעלים — אין דמי תיווך' : `${(brokerRate * 100).toFixed(1)}% × ${fmtK(price)} + 18% מע״מ = ${Math.round(brokerFee).toLocaleString('he-IL')} ₪`}
        help="דמי תיווך לרוכש. תקרה בחוק: 2% + מע״מ. מקובל: 1-2% (לפי שווי ומו״מ). בעסקאות ישירות או דרך מוכר בלבד: 0%. לעתים אפשר לסגור ל-1% או דמי תיווך קבועים. המוכר משלם לרוב את חלקו בנפרד." />

      {/* Other closing costs — manual */}
      <NumInput
        label="הוצאות נוספות (קבוע)"
        value={otherClosing}
        onChange={v => update('house.otherClosingCosts', v)} step={1000}
        rec="~15,000 ₪ — טאבו + שמאי + הובלה + ביטוחים"
        note="טאבו ~1.5K · שמאי ~3K · ביטוח משכנתא ~2K · הובלה ~8K"
        help="הוצאות קבועות שאינן תלויות במחיר הבית: רישום בטאבו (~1,500 ₪), שמאי למשכנתא (~2,500-3,500 ₪), ביטוח חיים ומבנה לבנק (~2,000 ₪ שנה ראשונה), הובלה וריהוט ראשוני (~5,000-15,000 ₪). סה״כ מקובל 12-20K ₪." />
    </div>
  );
}

function SliderInput({ label, value, onChange, min, max, step = 1, displayValue, note, rec, help }: {
  label: string; value: number; onChange: (v: number) => void;
  min: number; max: number; step?: number; displayValue: string; note?: string; rec?: string; help?: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm md:text-[15px] text-slate-700 font-semibold flex items-center gap-1.5">
          {label}
          {help && <HelpTooltip text={help} />}
        </label>
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

  const [expenseSimOpen, setExpenseSimOpen] = useState(false);

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
        <SliderInput label="הפסקת הכנסה מזינוק" value={config.zinukEndAge}
          onChange={v => setConfig(prev => ({ ...prev, zinukEndAge: v, fullRetirementAge: Math.max(prev.fullRetirementAge, v) }))}
          min={config.startAge} max={65}
          displayValue={`גיל ${config.zinukEndAge} · ${(config.simulationStartYear ?? 2026) + config.zinukEndAge - config.startAge}`}
          note="מעבר מהכנסת זינוק להכנסה חלופית"
          help="הגיל שבו סוגרים את העסק הנוכחי ועוברים להכנסה חלופית. 'זינוק' = שלב ההכנסה הגבוהה. בישראל גיל פרישה-מוקדמת נפוץ 55-62. אחרי סגירה ההכנסה מוחלפת ל'הכנסה חלופית' (ייעוץ/עבודה חלקית)." />
        <SliderInput label="תחילת קצבת יותם" value={config.pensionStartAge}
          onChange={v => setConfig(prev => ({ ...prev, pensionStartAge: v }))}
          min={60} max={67}
          displayValue={`גיל ${config.pensionStartAge} · ${(config.simulationStartYear ?? 2026) + config.pensionStartAge - config.startAge}`}
          rec="גיל 60 — מינימום חוקי לגברים"
          help="גיל תחילת קצבה חודשית. בישראל מגיל 60 מותר (גברים). דחייה עד 67 מגדילה את הקצבה כי ממשיכים לצבור + תוחלת חיים קצרה יותר. מקדם המרה ≈216: קצבה=יתרה÷216. משיכה לפני 60 = קנס 35% מס." />
        <SliderInput label="תחילת קצבת הדס" value={config.hadasPensionStartAge}
          onChange={v => setConfig(prev => ({ ...prev, hadasPensionStartAge: v }))}
          min={60} max={65}
          displayValue={`גיל ${config.hadasPensionStartAge} · ${(config.simulationStartYear ?? 2026) + config.hadasPensionStartAge - config.hadasAge}`}
          rec="גיל 62-65 — גיל פרישה לנשים"
          help="גיל פרישה רשמי לנשים עולה בהדרגה ל-65 (עד 2032). קצבה מחושבת לפי יתרה÷216. לנשים תוחלת חיים ארוכה יותר → קצבה חודשית לרוב נמוכה יותר לאותה יתרה." />
        <SliderInput label="פרישה מלאה — יותם" value={config.fullRetirementAge}
          onChange={v => setConfig(prev => ({ ...prev, fullRetirementAge: v }))}
          min={config.zinukEndAge} max={85}
          displayValue={`גיל ${config.fullRetirementAge} · ${(config.simulationStartYear ?? 2026) + config.fullRetirementAge - config.startAge}`}
          note="יותם מפסיק להרוויח · עובר ל-4% + פנסיה"
          help="הגיל שבו יותם מפסיק לחלוטין להרוויח הכנסה מעבודה. מגיל זה ההכנסה היא רק מקצבת פנסיה + 4% מהתיק הנזיל. חוק: גיל פרישה חובה 67 לגברים." />
        <SliderInput label="פרישה מלאה — הדס" value={config.hadasFullRetirementAge}
          onChange={v => setConfig(prev => ({ ...prev, hadasFullRetirementAge: v }))}
          min={config.hadasPensionStartAge} max={85}
          displayValue={`גיל ${config.hadasFullRetirementAge} · ${(config.simulationStartYear ?? 2026) + config.hadasFullRetirementAge - config.hadasAge}`}
          note="הדס מפסיקה להרוויח"
          help="הגיל שבו הדס מפסיקה לחלוטין לעבוד. חוק: גיל פרישה חובה לנשים עולה מ-62 ל-65 בהדרגה עד 2032." />
      </Section>

      <Section title="קניית בית" icon="🏠" color="violet" defaultOpen={true}>
        <SliderInput label="שנת קנייה"
          value={housePurchaseSliderValue}
          onChange={setHousePurchaseYear}
          min={0} max={30}
          displayValue={housePurchaseDisplayValue}
          note="0 = לא לקנות · 1 = מיידית · 2+ = בעתיד"
          help="באיזו שנה לקנות בית. 0 = נשארים שוכרים. לפני הקנייה כל הכסף הולך להשקעות (ריבית דריבית). עם הקנייה — מקדמה יוצאת מהתיק הנזיל, אבל הון עצמי בנדל״ן נצבר. המחיר צמוד למדד — ב-2040 בית של 4.8M₪ היום יעלה ~6.4M₪." />

        {config.housePurchaseYear !== null && (
          <>
            <NumInput label="מחיר (ערכי היום)" value={config.house.priceToday}
              onChange={v => update('house.priceToday', v)} step={100000}
              rec="4,800,000 ₪ — בית בפרדס חנה"
              help="מחיר הבית בערכי היום (לפני אינפלציה). המערכת מצמידה למדד לשנת הקנייה. בית 5 חד׳ בפרדס חנה ~4.5-5.5M₪ (2026). ת״א/מרכז: +50-100%. עלויות נלוות (מס רכישה, עו״ד, מתווך, שמאי) מחושבות אוטומטית למטה." />
            <NumInput label="שיפוץ" value={config.house.renovationCost}
              onChange={v => update('house.renovationCost', v)} step={10000}
              help="עלות שיפוץ נטו — אחרי מה שעובר דרך העסק. שיפוץ עמוק: 150-300K₪. שיפוץ בינוני: 80-150K₪. מוצמד למדד לשנת הקנייה. משולם מהתיק הנזיל (מקטין אותו)." />
            <SliderInput label="LTV משכנתא" value={Math.round(config.house.mortgageLTV * 100)}
              onChange={v => update('house.mortgageLTV', v / 100)}
              min={30} max={75} displayValue={`${Math.round(config.house.mortgageLTV * 100)}%`}
              note={`משכנתא: ${mortAmt.toLocaleString('he-IL')} ₪ · חודשי: ${mortPay.toLocaleString('he-IL')} ₪`}
              help="אחוז מימון (Loan-to-Value). חוק: דירה יחידה עד 75%, דירה שנייה עד 70%, משקיעים עד 50%. LTV גבוה = משכנתא גדולה = יותר מינוף. מתחת ל-60% אין חובת ביטוח חיים נוסף." />
            <NumInput label="ריבית" value={Math.round(config.house.mortgageRate * 1000) / 10}
              onChange={v => update('house.mortgageRate', v / 100)} step={0.1} suffix="%"
              rec="5.0-5.5% — ריבית משוקללת (פריים ~5.5%, קל״צ ~5.2%, צמודה ~3.5%+מדד)"
              note="בנק ישראל: ריבית בנק 4% · פריים=BOI+1.5%"
              help="ריבית שנתית משוקללת. משכנתא ישראלית = תמהיל 3 מסלולים (חובה לפחות 1/3 קבוע): פריים (צמוד לבנק ישראל), קל״צ (קבועה לא צמודה), צמודה למדד. ריבית כלכלית אמיתית = קל״צ ~5.2%. ההשפעה קריטית: 1% הפרש = עשרות אלפי ₪ לאורך חיי המשכנתא." />
            <NumInput label="תקופה" value={config.house.mortgageTerm}
              onChange={v => update('house.mortgageTerm', v)} step={1} suffix="שנים"
              help="אורך המשכנתא בשנים. מקסימום חוקי: 30 שנים. 25 שנים = איזון טוב: תשלום חודשי סביר + ריבית כוללת נמוכה. 30 שנים = תשלום חודשי נמוך אבל משלמים הרבה יותר ריבית. 15-20 שנים = חסכון משמעותי בריבית, אבל תשלום חודשי כבד." />

            {/* Closing costs — auto-computed */}
            <ClosingCostsPanel config={config} update={update} />

            {/* Passive income from home */}
            <div className="pt-3 mt-2 border-t border-white/70">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-600 mb-2">
                💡 הכנסות נוספות מהבית
              </p>
            </div>
            <NumInput label="השכרת יחידת דיור (חודשי, נטו)"
              value={config.house.rentalIncomeFromUnit}
              onChange={v => update('house.rentalIncomeFromUnit', v)} step={500}
              rec="3,000-5,000 ₪ — יחידת דיור בפרדס חנה"
              note="0 = אין יחידה להשכיר · מוצמד למדד"
              help="הכנסה מהשכרת יחידה נפרדת בבית (מרתף, קומה, וכו׳). פטור ממס עד ~5,654 ₪/חודש (2026). מעל — מס 10%. נטו = אחרי עלויות אחזקה (תיקונים, בלאי). מוצמד למדד כל שנה. מגדיל משמעותית את ה-ROI של הבית." />
            <NumInput label="הכנסה מסולארי (חודשי, נטו)"
              value={config.house.solarIncome}
              onChange={v => update('house.solarIncome', v)} step={100}
              rec="500-1,500 ₪ — מערכת סולארית ביתית"
              note="0 = אין מערכת · נטו אחרי דמי אחזקה"
              help="הכנסה ממכירת חשמל מפאנלים סולאריים (נטו מונה/צריכה עצמית). מערכת ביתית 7-10 kWp: ~800-1,500 ₪/חודש. תעריף FiT מובטח ל-25 שנים. עלות התקנה 30-50K₪ — ה-ROI ~6-9 שנים. נטו = אחרי דמי אחזקה (~5%/שנה)." />
          </>
        )}
      </Section>

      <Section title="יותם — הכנסה ופנסיה" icon="👨‍💼" color="indigo">
        <NumInput label="נטו לפני זינוק" value={config.income.yotamNetIncomeZinuk}
          onChange={v => update('income.yotamNetIncomeZinuk', v)} step={1000}
          note={`ברוטו: ~${estimateGross(config.income.yotamNetIncomeZinuk).toLocaleString('he-IL')} ₪`}
          help="הכנסה חודשית נטו בשלב הזינוק — אחרי מס הכנסה, ביטוח לאומי, ובריאות. זו ההכנסה הזמינה לצריכה/חסכון. יחס נטו/ברוטו: ~75% בשכר נמוך-בינוני, ~65% בשכר גבוה, ~55% בשכר מאוד גבוה (מדרגות מס)." />
        <NumInput label="נטו אחרי זינוק" value={config.income.yotamNetIncomePostZinuk}
          onChange={v => update('income.yotamNetIncomePostZinuk', v)} step={1000}
          note={config.income.yotamNetIncomePostZinuk > 0 ? `ברוטו: ~${estimateGross(config.income.yotamNetIncomePostZinuk).toLocaleString('he-IL')} ₪` : 'ללא הכנסה'}
          help="הכנסה נטו חודשית אחרי סגירת העסק — בד״כ ייעוץ/עבודת שכיר חלקית/פרויקטים. זו תקופת המעבר לפני פרישה מלאה. 0 = ללא הכנסה כלל. מעבר מ-22K ל-15K נטו = ירידה של ~32%." />
        <NumInput label="הפקדה לפנסיה" value={config.income.yotamMonthlyPensionContribution}
          onChange={v => update('income.yotamMonthlyPensionContribution', v)} step={100}
          rec="תקרת שכיר: 5,645 ₪"
          help="הפקדה חודשית כוללת לפנסיה. שכיר בישראל: 6% עובד + 6.5% תגמולים + 6% מעביד = 18.5% מהשכר. תקרה סטטוטורית: 5,645 ₪/חודש (2026). מעל התקרה — אין הטבת מס. ההפקדה מצטברת בקרן ומגדילה את יתרת הפנסיה." />
        <NumInput label="יתרת פנסיה" value={config.assets.yotamPension}
          onChange={v => update('assets.yotamPension', v)} step={50000}
          note={`נעולה עד גיל ${config.pensionStartAge}`}
          help="יתרה נוכחית בקרן פנסיה/ביטוח מנהלים. נעולה עד גיל 60 (משיכה מוקדמת = קנס 35% מס + מיסים על רווחים). מגיל 60 אפשר קצבה חודשית לכל החיים: יתרה ÷ 216 (מקדם המרה). דוגמה: 800K ₪ → 3,704 ₪/חודש; 2M ₪ → 9,259 ₪/חודש." />
      </Section>

      <Section title="הדס — הכנסה ופנסיה" icon="👩‍💼" color="pink">
        <NumInput label="נטו לפני זינוק" value={config.income.hadasNetIncomeZinuk}
          onChange={v => update('income.hadasNetIncomeZinuk', v)} step={1000}
          note={`עצמאית בת ${config.hadasAge} · ברוטו: ~${estimateGross(config.income.hadasNetIncomeZinuk).toLocaleString('he-IL')} ₪`}
          help="הכנסה נטו חודשית מעסק עצמאי. עצמאית משלמת: מס הכנסה שולי, ביטוח לאומי ~17% (מחצית השכר הממוצע ומעלה), בריאות, פנסיה חובה. נטו = אחרי כל אלה. היחס נטו/ברוטו לעצמאי גבוה מעט משכיר (אין חלק מעביד בביטוח לאומי)." />
        <NumInput label="נטו אחרי זינוק" value={config.income.hadasNetIncomePostZinuk}
          onChange={v => update('income.hadasNetIncomePostZinuk', v)} step={1000}
          note={config.income.hadasNetIncomePostZinuk > 0 ? `ברוטו: ~${estimateGross(config.income.hadasNetIncomePostZinuk).toLocaleString('he-IL')} ₪` : 'ללא הכנסה'}
          help="הכנסה נטו חודשית אחרי הורדת היקף העסק — עבודה חלקית, ייעוץ, פרויקטים. 0 = הפסקה מלאה. שלב מעבר לפני פרישה מלאה — מאפשר לגדל את התיק מבלי לשחוק אותו." />
        <NumInput label="הפקדה לפנסיה" value={config.income.hadasMonthlyPensionContribution}
          onChange={v => update('income.hadasMonthlyPensionContribution', v)} step={100}
          rec="חובת עצמאית: 1,170 ₪"
          help="הפקדה חודשית לפנסיה. חובת עצמאית (2017 ואילך): 4.45% על חצי השכר הממוצע במשק, 12.55% מעל. בד״כ ~1,170 ₪/חודש בתחילת הדרך, עד 2,500+ ₪ בעסקים גדולים. עצמאית משלמת הכל מעצמה (אין חלק מעביד)." />
        <NumInput label="יתרת פנסיה" value={config.assets.hadasPension}
          onChange={v => update('assets.hadasPension', v)} step={50000}
          note={`עוד ${config.hadasPensionStartAge - config.hadasAge} שנים לפנסיה`}
          help="יתרת פנסיה של הדס. נעולה עד גיל פרישה לנשים (עולה בהדרגה ל-65 עד 2032). קצבה חודשית = יתרה ÷ 216. לנשים תוחלת חיים ~5 שנים ארוכה יותר → קצבה חודשית מעט נמוכה יותר לאותה יתרה במחירים שונים של מקדם המרה." />
      </Section>

      <Section title="נכסים משותפים" icon="💎" color="emerald">
        <NumInput label="תיק נזיל" value={config.assets.liquidPortfolio}
          onChange={v => update('assets.liquidPortfolio', v)} step={50000}
          rec="USD + קרנות + money market"
          help="סך הכסף הזמין לשימוש מיידי ללא קנסות: מניות, ETF, קרנות, מט״ח, מזומן, money market. זה התיק שעליו חל כלל ה-4% (משיכה שנתית בת-קיימא). גדל כל שנה בתשואה ריאלית (ברירת מחדל: 6% אחרי מס)." />
        <NumInput label="קרן השתלמות" value={config.assets.kerenHishtalmut}
          onChange={v => update('assets.kerenHishtalmut', v)} step={10000}
          note={`נזילה בגיל ${config.assets.kerenHishtalmutLiquidAge}`}
          help="חסכון מס-דחוי. אחרי 6 שנים — רווחים פטורים ממס רווח הון (25%). תקרת הפקדה עם הטבת מס: שכיר 18,854 ₪/שנה, עצמאי 20,520 ₪ (2026). אחרי תקופת הנעילה נזילה ומצטרפת לתיק הנזיל." />
        <NumInput label="תמורת דירה (נטו)" value={config.assets.apartmentNetProceeds}
          onChange={v => update('assets.apartmentNetProceeds', v)} step={50000}
          rec="אור עקיבא · פטור ממס שבח"
          help="נטו ממכירת דירה קיימת — אחרי מס שבח/פטור ועלויות מכירה. פטור על דירה יחידה (סעיף 49(ב)): פטור מלא אם אין דירה אחרת בבעלות 18 חודשים אחורה. נכנס לתיק הנזיל בשנה 1 של הסימולציה." />
      </Section>

      <Section title="הוצאות" icon="📊" color="rose">
        <NumInput label="הוצאות (ללא דיור)" value={config.expenses.monthlyNonHousingExpenses}
          onChange={v => update('expenses.monthlyNonHousingExpenses', v)} step={1000}
          rec="22,000-26,000 ₪ — משפחה של 6 upper-middle (למ״ס 2023, מעודכן 2026)"
          note="כולל: אוכל, רכב, חוגים, ביטוחים, חופשות · לא כולל חסכונות"
          help="הוצאות חודשיות ללא דיור (שכ״ד/משכנתא/אחזקת בית). לפי למ״ס 2023: ממוצע משק בית ישראלי 14,823 ₪ (3.1 נפשות). למשפחה של 6 × מכפיל 1.65 ≈ 24.5K ₪. upper-middle עם 4 ילדים: 22-26K מאוזן, 28-33K נדיב. כולל: אוכל, רכב+דלק, חינוך+חוגים, חופשות, ביטוחים, טלפון/אינטרנט, בריאות. לא כולל: חסכון/השקעה (זה עובר לתיק)." />

        {/* Simulator button */}
        <button
          onClick={() => setExpenseSimOpen(true)}
          className="w-full mt-1 px-4 py-3 rounded-xl bg-gradient-to-l from-rose-500 to-pink-500 text-white text-sm md:text-base font-semibold shadow-md hover:shadow-lg hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2"
        >
          <span>🧮</span>
          <span>סימולטור הוצאות אישי</span>
          <span className="text-[11px] font-normal opacity-80">— חישוב מפורט לפי קטגוריות</span>
        </button>
        <p className="text-[11px] text-slate-500 mt-1 mr-1 italic">
          כלי עזר — לא מעדכן את המכוון למעלה אוטומטית
        </p>

        <NumInput label="שכר דירה" value={config.expenses.monthlyRent}
          onChange={v => update('expenses.monthlyRent', v)} step={500}
          rec="9,500 ₪ — מחיר שוק בפרדס חנה"
          help="שכר דירה חודשי לפני קניית בית. מוצמד למדד. פרדס חנה 5 חד׳: 8-10K ₪ (2026). ת״א מרכז: 12-18K ₪. כולל ועד בית סביר, לא כולל חניה/מחסן נפרדים. אם קונים בית, מוחלף בהוצאות משכנתא + אחזקה." />
      </Section>

      {/* Expense Simulator Modal */}
      {expenseSimOpen && (
        <ExpenseSimulatorModal
          onClose={() => setExpenseSimOpen(false)}
          currentValue={config.expenses.monthlyNonHousingExpenses}
        />
      )}

      <Section title="הנחות שוק" icon="📈" color="amber">
        <SliderInput label="תשואה ריאלית" value={Math.round(config.market.realReturnRate * 100)}
          onChange={v => update('market.realReturnRate', v / 100)}
          min={3} max={10} displayValue={`${Math.round(config.market.realReturnRate * 100)}%`}
          rec="6% — ממוצע ארוך-טווח"
          help="תשואה שנתית אחרי אינפלציה ואחרי מס. S&P 500 ארוך-טווח (100 שנה): 10% נומינלי / ~7% ריאלי לפני מס, ~5-6% אחרי מס. תיק מגוון (60/40 מניות/אג״ח): ~4-5% ריאלי. 6% = הנחה אופטימית-סבירה לתיק מניות מגוון. ירידה ל-4% → צריך 50% יותר הון לאותה פרישה." />
        <SliderInput label="אינפלציה" value={Math.round(config.market.inflationRate * 100 * 10) / 10}
          onChange={v => update('market.inflationRate', v / 100)}
          min={1} max={6} step={0.5} displayValue={`${(config.market.inflationRate * 100).toFixed(1)}%`}
          rec="2.5% — יעד בנק ישראל"
          help="שיעור עליית מחירים שנתי. יעד בנק ישראל: 1-3% (אמצע ~2%). ב-2022 הגיעה ל-5%, ב-2024-2025 חזרה ל-2.5-3%. ממוצע ארוך-טווח בישראל: ~2.5%. משפיעה על הכנסות, הוצאות, ומחיר בית (כולם מוצמדים למדד). כוח קנייה יורד חצי תוך ~28 שנים ב-2.5%." />
        <SliderInput label="עליית מחירי דיור" value={Math.round(config.market.realHomeAppreciation * 100)}
          onChange={v => update('market.realHomeAppreciation', v / 100)}
          min={0} max={5} displayValue={`${Math.round(config.market.realHomeAppreciation * 100)}%`}
          rec="2% — ריאלי, ארוך-טווח"
          help="עליית מחיר נדל״ן ריאלית (מעבר לאינפלציה). ארוך-טווח בישראל: 1.5-2.5% ריאלי. העשור האחרון (2014-2024): ~4% ריאלי — חריג. מחיר נומינלי = ריאלי + אינפלציה (לדוגמה 2% + 2.5% = 4.5% עליה נומינלית). נחשב מקדם חשוב להחלטת קנייה/שכירות." />
      </Section>

      <HappinessSection config={config} update={update} setConfig={setConfig} />
    </div>
  );
}

/** Happiness preferences — 7 weighted dimensions + kids birth years + presets */
function HappinessSection({ config, update, setConfig }: {
  config: ScenarioConfig;
  update: (path: string, value: number) => void;
  setConfig: (updater: (prev: ScenarioConfig) => ScenarioConfig) => void;
}) {
  const h = config.happiness ?? {
    weightTimeWithKids: 18, weightFamilyVacations: 11, weightFinancialCalm: 16,
    weightOwnHome: 11, weightPersonalDevelopment: 11, weightCommunityImpact: 10,
    weightTorahStudy: 13, weightFamilyExpansion: 10,
    oldestChildBirthYear: 2018, youngestChildBirthYear: 2026,
  };

  const sum = h.weightTimeWithKids + h.weightFamilyVacations + h.weightFinancialCalm +
              h.weightOwnHome + h.weightPersonalDevelopment + h.weightCommunityImpact +
              h.weightTorahStudy + h.weightFamilyExpansion;

  // Current year to show kids' ages inline
  const simStart = config.simulationStartYear ?? 2026;
  const oldestAgeNow = simStart - h.oldestChildBirthYear;
  const youngestAgeNow = simStart - h.youngestChildBirthYear;

  const pct = (w: number) => sum > 0 ? Math.round((w / sum) * 100) : 0;

  const applyPreset = (preset: 'family' | 'balanced' | 'spiritual' | 'freedom') => {
    const presets: Record<typeof preset, Partial<ScenarioConfig['happiness']>> = {
      family: {
        weightTimeWithKids: 24, weightFamilyVacations: 16, weightFinancialCalm: 14,
        weightOwnHome: 14, weightPersonalDevelopment: 6, weightCommunityImpact: 6,
        weightTorahStudy: 8, weightFamilyExpansion: 12,
      },
      balanced: {
        weightTimeWithKids: 12, weightFamilyVacations: 12, weightFinancialCalm: 13,
        weightOwnHome: 12, weightPersonalDevelopment: 13, weightCommunityImpact: 12,
        weightTorahStudy: 14, weightFamilyExpansion: 12,
      },
      spiritual: {
        weightTimeWithKids: 14, weightFamilyVacations: 7, weightFinancialCalm: 10,
        weightOwnHome: 8, weightPersonalDevelopment: 14, weightCommunityImpact: 18,
        weightTorahStudy: 22, weightFamilyExpansion: 7,
      },
      freedom: {
        weightTimeWithKids: 14, weightFamilyVacations: 14, weightFinancialCalm: 23,
        weightOwnHome: 18, weightPersonalDevelopment: 11, weightCommunityImpact: 6,
        weightTorahStudy: 7, weightFamilyExpansion: 7,
      },
    };
    const p = presets[preset];
    setConfig(prev => ({ ...prev, happiness: { ...prev.happiness, ...p } }));
  };

  return (
    <Section title="מדד אושר — העדפות" icon="😊" color="pink">
      {/* Presets */}
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-pink-600 mb-2">
          🎯 מה הכי חשוב לנו
        </p>
        <div className="grid grid-cols-2 gap-1.5">
          <PresetChip label="משפחה" onClick={() => applyPreset('family')} />
          <PresetChip label="איזון" onClick={() => applyPreset('balanced')} />
          <PresetChip label="רוחני-קהילתי" onClick={() => applyPreset('spiritual')} />
          <PresetChip label="חופש כלכלי" onClick={() => applyPreset('freedom')} />
        </div>
      </div>

      {/* Kids birth years */}
      <div className="pt-3 mt-2 border-t border-white/70">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-pink-600 mb-2">
          👶 שנות לידה
        </p>
      </div>
      <NumInput label="הבן/בת הבכור/ה" value={h.oldestChildBirthYear}
        onChange={v => update('happiness.oldestChildBirthYear', v)} step={1} suffix=""
        note={`גיל ${oldestAgeNow} ב-${simStart}`}
        help="שנת הלידה של הילד/ה המבוגר/ת. משמש לחישוב 'זמן עם הילדים' ו'חופשות משפחתיות' — עקומת הצרכים מהורה יורדת עם הגיל (שיא 5-10, יורד משמעותית אחרי 17)." />
      <NumInput label="הבן/בת הצעיר/ה" value={h.youngestChildBirthYear}
        onChange={v => update('happiness.youngestChildBirthYear', v)} step={1} suffix=""
        note={`גיל ${youngestAgeNow} ב-${simStart}`}
        help="שנת הלידה של הילד/ה הצעיר/ה. כשהילד הצעיר מגיע ל-18 'בית משפחתי' מתחיל להידלדל (יעזבו ללימודים/צבא)." />

      {/* Weights */}
      <div className="pt-3 mt-2 border-t border-white/70">
        <div className="flex items-baseline justify-between mb-2">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-pink-600">
            ⚖️ משקולות (נורמלי לאחוזים)
          </p>
          <span className="text-[10px] text-slate-500 font-semibold">סה״כ: <span className="num">{sum}</span></span>
        </div>
      </div>

      <HappinessWeight label="זמן עם הילדים" emoji="👨‍👩‍👧‍👦" value={h.weightTimeWithKids}
        percent={pct(h.weightTimeWithKids)}
        onChange={v => update('happiness.weightTimeWithKids', v)}
        help="המדד מחשב: עקומת הצרכים של הילדים לגיל (שיא 5-10, יורד אחרי 17) × זמינות ההורה. במודל שלך: זינוק 70% (המנכ״לית מנהלת יום-יום, עובד בעיקר מהבית), חלופי 55% (יותר עבודה אישית ישירה), פרישה 90%." />
      <HappinessWeight label="הרחבת המשפחה" emoji="🍼" value={h.weightFamilyExpansion}
        percent={pct(h.weightFamilyExpansion)}
        onChange={v => update('happiness.weightFamilyExpansion', v)}
        help="היתכנות להביא ילד נוסף בשנה נתונה. 4 רכיבים: (א) גיל האם — חלון פוריות (40% ממשקל המדד): עד 30 שיא, יורד 90→75→55→35→15 בגילאי 30-45. (ב) מרווח מהתינוק האחרון (25%): שיא 2-4 שנים. (ג) יציבות כלכלית (18%). (ד) פניות של ההורים (12%). המדד יירד משמעותית כשהדס מעל 43, וזה העיקר." />
      <HappinessWeight label="חופשות משפחתיות" emoji="✈️" value={h.weightFamilyVacations}
        percent={pct(h.weightFamilyVacations)}
        onChange={v => update('happiness.weightFamilyVacations', v)}
        help="חוויות משותפות עם המשפחה. דורש: כסף פנוי (יתרה חיובית), וילדים שעדיין בבית, וגמישות לצאת לחופשה. בזינוק גמישות 75 (המנכ״לית מחזיקה את העסק), חלופי 60 (קשה יותר להיעלם מעבודת ייעוץ אישית), פרישה 95. Dunn & Norton: הוצאה על חוויות מייצרת יותר אושר מחפצים." />
      <HappinessWeight label="רוגע כלכלי" emoji="💎" value={h.weightFinancialCalm}
        percent={pct(h.weightFinancialCalm)}
        onChange={v => update('happiness.weightFinancialCalm', v)}
        help="שקט נפשי מהמצב הכלכלי. 3 רכיבים: (1) היתרה החודשית חיובית; (2) תקופת חירום — 2 שנות הוצאות בתיק הנזיל = מקסימום; (3) מרווח נוחות מעבר ליתרה אפס. Stevenson & Wolfers: עד רמה מסוימת כסף קונה רוגע." />
      <HappinessWeight label="בית משלנו" emoji="🏠" value={h.weightOwnHome}
        percent={pct(h.weightOwnHome)}
        onChange={v => update('happiness.weightOwnHome', v)}
        help="שייכות ויציבות הדיור. בשכירות: 10. בבעלות: 40 + 60×(הון עצמי/שווי). דירה משוחררת ממשכנתא = 100. בהקשר הישראלי ('הבית הוא החלום') זה גורם משמעותי." />
      <HappinessWeight label="זמן להתפתחות אישית" emoji="📚" value={h.weightPersonalDevelopment}
        percent={pct(h.weightPersonalDevelopment)}
        onChange={v => update('happiness.weightPersonalDevelopment', v)}
        help="זמן ללמידה, תחביבים, וטיפוח עצמי. במודל שלך: זינוק +20 (יש זמן אבל עומס מנטלי של אחריות), חלופי +15 (פחות זמן אבל פוקוס טוב יותר), פרישה +35 (שיא — זמן ופוקוס מרביים). Dunn/Gilchrist/Norton: זמן חופשי יקר יותר מכסף מעל רמה בסיסית." />
      <HappinessWeight label="קהילה והשפעה" emoji="🤝" value={h.weightCommunityImpact}
        percent={pct(h.weightCommunityImpact)}
        onChange={v => update('happiness.weightCommunityImpact', v)}
        help="זמן להתנדבות, עזרה לאחרים, השפעה בקהילה. במודל שלך: זינוק +18 (ימי עבודה מהבית מאפשרים), חלופי +15, פרישה +30. שיא אזרחי-קהילתי בגילאים 55-80. מחקרים: התנדבות מקושרת ל-20-30% עלייה ברווחת חיים." />
      <HappinessWeight label="לימוד תורה" emoji="📖" value={h.weightTorahStudy}
        percent={pct(h.weightTorahStudy)}
        onChange={v => update('happiness.weightTorahStudy', v)}
        help="זמן ללימוד תורה וערכים רוחניים. במודל שלך: זינוק +18 (זמן מפוזר אבל קיים), חלופי +15, פרישה +45 (שיא קלאסי — מסורת 'לימוד בזקנה'). בונוס גיל 65+, ללא קנס גיל." />
    </Section>
  );
}

function HappinessWeight({ label, emoji, value, percent, onChange, help }: {
  label: string; emoji: string; value: number; percent: number;
  onChange: (v: number) => void; help: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm md:text-[15px] text-slate-700 font-semibold flex items-center gap-1.5">
          <span>{emoji}</span>
          <span>{label}</span>
          <HelpTooltip text={help} />
        </label>
        <span className="flex items-baseline gap-1.5">
          <span className="num font-display text-sm font-bold text-slate-900">{value}</span>
          <span className="text-[10px] text-pink-600 font-bold num">· {percent}%</span>
        </span>
      </div>
      <input
        type="range"
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        min={0}
        max={30}
        step={1}
      />
    </div>
  );
}

function PresetChip({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-2 text-xs md:text-sm font-semibold rounded-xl bg-white border border-pink-200 text-pink-700 hover:bg-pink-50 hover:border-pink-400 transition-all"
    >
      {label}
    </button>
  );
}
