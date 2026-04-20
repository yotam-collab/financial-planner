import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { YearResult, ScenarioConfig } from '../lib/types';

interface Props {
  year: YearResult;
  config: ScenarioConfig;
  onClose: () => void;
}

function fmtK(v: number): string {
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`;
  if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return String(Math.round(v));
}

function fmt(v: number): string {
  return Math.round(v).toLocaleString('he-IL');
}

export function DetailModal(props: Props) {
  // Use portal so modal escapes chart card's backdrop-filter containing block
  return createPortal(<DetailModalContent {...props} />, document.body);
}

function DetailModalContent({ year: y, config, onClose }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const phaseLabel = y.phase === 'zinuk' ? 'זינוק' : y.phase === 'altIncome' ? 'הכנסה חלופית' : 'פרישה מלאה';
  const phaseColor = y.phase === 'zinuk' ? 'from-indigo-500 to-violet-500'
    : y.phase === 'altIncome' ? 'from-emerald-500 to-teal-500'
    : 'from-amber-500 to-orange-500';

  // Totals
  const totalEarnedIncome = (y.yotamMonthlyIncome ?? 0) + (y.hadasMonthlyIncome ?? 0);
  const totalPassiveIncome = y.monthlyRentalIncomeFromUnit + y.monthlySolarIncome;
  const totalPension = y.monthlyPensionIncome;
  const totalAllIncome = totalEarnedIncome + totalPassiveIncome + totalPension;
  const cashSurplus = totalAllIncome - y.monthlyExpenses;

  const liquidTotal = y.liquidPortfolio;

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-start md:items-center justify-center p-3 md:p-8 overflow-y-auto fade-up"
      style={{ background: 'rgba(15, 23, 42, 0.72)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
      onClick={onClose}
      dir="rtl"
    >
      <div
        className="w-full max-w-4xl my-4 md:my-auto rounded-[2rem] border border-white/80 shadow-2xl"
        onClick={e => e.stopPropagation()}
        style={{ background: '#ffffff', boxShadow: '0 30px 80px -20px rgba(15, 23, 42, 0.5)' }}
      >
        {/* Header */}
        <div className={`relative bg-gradient-to-l ${phaseColor} px-5 md:px-8 py-5 md:py-7 rounded-t-[2rem] overflow-hidden`}>
          <div className="absolute top-0 left-10 w-32 h-32 bg-white/15 rounded-full blur-3xl float-anim" />
          <button
            onClick={onClose}
            className="absolute top-3 left-3 w-9 h-9 rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-md flex items-center justify-center text-white text-xl transition-colors"
            aria-label="סגור"
          >✕</button>
          <div className="relative z-10">
            <p className="text-white/80 text-[11px] font-bold uppercase tracking-[0.25em] mb-2">פירוט שנתי מלא</p>
            <div className="flex items-baseline gap-4 flex-wrap">
              <span className="font-display num text-5xl md:text-6xl font-extrabold text-white leading-none">{y.calendarYear ?? y.age}</span>
              <div className="flex flex-col gap-0.5">
                <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-white/25 text-white w-fit">
                  {phaseLabel}
                </span>
                <div className="flex gap-3 text-white/90 text-sm font-semibold mt-1">
                  <span>יותם · <span className="num">{y.yotamAge ?? y.age}</span></span>
                  <span>הדס · <span className="num">{y.hadasAge ?? '—'}</span></span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-4 md:px-8 py-5 md:py-8 space-y-5 md:space-y-7">
          {/* ─── Income Section ─── */}
          <section>
            <h3 className="font-display text-lg md:text-xl font-extrabold text-slate-900 mb-3 flex items-center gap-2">
              <span className="w-1 h-5 bg-emerald-500 rounded-full" />
              הכנסות חודשיות (בפועל)
            </h3>
            <div className="bg-white rounded-2xl border border-emerald-200 overflow-hidden shadow-sm">
              {/* Earned income */}
              {totalEarnedIncome > 0 && (
                <>
                  <SectionRow label="הכנסה מעבודה" value={totalEarnedIncome} dotColor="bg-emerald-500" />
                  {y.yotamMonthlyIncome > 0 && (
                    <SubRow label={y.phase === 'zinuk' ? 'יותם · זינוק' : 'יותם · חלופית'} value={y.yotamMonthlyIncome} />
                  )}
                  {y.hadasMonthlyIncome > 0 && (
                    <SubRow label={y.phase === 'zinuk' ? 'הדס · זינוק' : 'הדס · חלופית'} value={y.hadasMonthlyIncome} />
                  )}
                </>
              )}

              {/* Pension */}
              {totalPension > 0 && (
                <>
                  <SectionRow label="קצבת פנסיה" value={totalPension} dotColor="bg-amber-500" />
                  {y.yotamPensionPayoutMonthly > 0 && <SubRow label="יותם · קצבה" value={y.yotamPensionPayoutMonthly} />}
                  {y.hadasPensionPayoutMonthly > 0 && <SubRow label="הדס · קצבה" value={y.hadasPensionPayoutMonthly} />}
                </>
              )}

              {/* Passive from home */}
              {totalPassiveIncome > 0 && (
                <>
                  <SectionRow label="הכנסה פאסיבית מהבית" value={totalPassiveIncome} dotColor="bg-teal-500" />
                  {y.monthlyRentalIncomeFromUnit > 0 && <SubRow label="השכרת יחידת דיור" value={y.monthlyRentalIncomeFromUnit} />}
                  {y.monthlySolarIncome > 0 && <SubRow label="מערכת סולארית" value={y.monthlySolarIncome} />}
                </>
              )}

              {/* Total */}
              <div className="px-4 md:px-5 py-3.5 bg-emerald-50 border-t border-emerald-200 flex items-center justify-between">
                <span className="font-display text-base md:text-lg font-extrabold text-emerald-800">סה״כ הכנסה חודשית</span>
                <span className="num font-display text-xl md:text-2xl font-extrabold text-emerald-700" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {fmt(totalAllIncome)} ₪
                </span>
              </div>
            </div>
          </section>

          {/* ─── Expenses Section ─── */}
          <section>
            <h3 className="font-display text-lg md:text-xl font-extrabold text-slate-900 mb-3 flex items-center gap-2">
              <span className="w-1 h-5 bg-rose-500 rounded-full" />
              הוצאות חודשיות
            </h3>
            <div className="bg-white rounded-2xl border border-rose-200 overflow-hidden shadow-sm">
              <SectionRow label="הוצאות (ללא דיור)" value={y.monthlyNonHousingExpense} dotColor="bg-rose-500" />
              <SectionRow
                label={y.housingStatus === 'owning' ? `משכנתא · תשלום חודשי` : 'שכירות'}
                value={y.monthlyHousingExpense}
                dotColor="bg-rose-400"
              />
              <div className="px-4 md:px-5 py-3.5 bg-rose-50 border-t border-rose-200 flex items-center justify-between">
                <span className="font-display text-base md:text-lg font-extrabold text-rose-800">סה״כ הוצאות</span>
                <span className="num font-display text-xl md:text-2xl font-extrabold text-rose-700" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {fmt(y.monthlyExpenses)} ₪
                </span>
              </div>
            </div>
          </section>

          {/* ─── Cashflow Summary ─── */}
          <section>
            <div className={`rounded-2xl border-2 px-5 py-5 shadow-sm ${cashSurplus >= 0 ? 'border-emerald-400 bg-emerald-50' : 'border-rose-400 bg-rose-50'}`}>
              <div className="flex items-baseline justify-between mb-2">
                <span className="font-display text-lg md:text-xl font-extrabold text-slate-900">תזרים מזומנים בפועל</span>
                <span className={`num font-display text-2xl md:text-3xl font-extrabold ${cashSurplus >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {cashSurplus >= 0 ? '+' : ''}{fmt(cashSurplus)} ₪
                </span>
              </div>
              <p className="text-sm text-slate-600 leading-snug">
                {cashSurplus >= 0
                  ? `תזרים חיובי — ${fmt(cashSurplus * 12)} ₪/שנה מתווספים אוטומטית להשקעות`
                  : `תזרים שלילי — ${fmt(Math.abs(cashSurplus) * 12)} ₪/שנה נמשכים מהתיק הנזיל`}
              </p>
            </div>
          </section>

          {/* ─── Potential 4% Withdrawal ─── */}
          <section>
            <h3 className="font-display text-lg md:text-xl font-extrabold text-slate-900 mb-3 flex items-center gap-2">
              <span className="w-1 h-5 bg-indigo-500 rounded-full" />
              פוטנציאל משיכה · 4% מהתיק
            </h3>
            <div className="bg-indigo-50 rounded-2xl border border-indigo-200 px-5 py-4 shadow-sm">
              <div className="flex items-baseline justify-between mb-2">
                <span className="text-sm text-slate-700">
                  4% מ-<span className="num font-bold">{fmt(liquidTotal)} ₪</span> ÷ 12
                </span>
                <span className="num font-display text-lg md:text-xl font-bold text-indigo-700" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  = {fmt(y.monthly4pctWithdrawal)} ₪
                </span>
              </div>
              <p className="text-xs text-slate-500 leading-snug">
                זהו סכום תיאורטי שאפשר למשוך באופן בת-קיימא מהתיק. לא נוסף בפועל לתזרים — משמש כמדד לבדיקת היתכנות פרישה.
              </p>
            </div>
          </section>

          {/* ─── Sustainable Balance ─── */}
          <section>
            <div className={`rounded-2xl border px-5 py-4 shadow-sm ${y.monthlyBalance >= 0 ? 'border-emerald-300 bg-emerald-50' : 'border-rose-300 bg-rose-50'}`}>
              <div className="flex items-baseline justify-between">
                <span className="font-display text-base md:text-lg font-bold text-slate-800">יתרה חודשית (בר-קיימא)</span>
                <span className={`num font-display text-xl font-extrabold ${y.monthlyBalance >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {y.monthlyBalance >= 0 ? '+' : ''}{fmt(y.monthlyBalance)} ₪
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                = סה״כ הכנסה + 4% מהתיק − הוצאות
              </p>
            </div>
          </section>

          {/* ─── Portfolio / Net Worth ─── */}
          <section>
            <h3 className="font-display text-lg md:text-xl font-extrabold text-slate-900 mb-3 flex items-center gap-2">
              <span className="w-1 h-5 bg-violet-500 rounded-full" />
              שווי נקי · <span className="num">{fmt(y.netWorth)} ₪</span>
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <PortCard label="תיק נזיל" value={y.liquidPortfolio} color="indigo" total={y.netWorth} />
              {y.homeEquity > 0 && <PortCard label="נדל״ן (הון)" value={y.homeEquity} color="emerald" total={y.netWorth} />}
              {y.pension > 0 && <PortCard label="פנסיה (נעולה)" value={y.pension} color="amber" total={y.netWorth} />}
              <PortCard label="סה״כ" value={y.netWorth} color="violet" bold total={y.netWorth} hideBar />
            </div>
          </section>

          {/* ─── Real values ─── */}
          <section>
            <h3 className="font-display text-lg md:text-xl font-extrabold text-slate-900 mb-3 flex items-center gap-2">
              <span className="w-1 h-5 bg-slate-400 rounded-full" />
              בערכים של היום (ריאלי)
            </h3>
            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 md:p-5 grid grid-cols-2 md:grid-cols-3 gap-4">
              <RealStat label="תיק נזיל" value={y.real.liquidPortfolio} />
              {y.real.homeEquity > 0 && <RealStat label="נדל״ן" value={y.real.homeEquity} />}
              {y.real.pension > 0 && <RealStat label="פנסיה" value={y.real.pension} />}
              <RealStat label="שווי נקי" value={y.real.netWorth} bold />
              <RealStat label="יתרה חודשית" value={y.real.monthlyBalance} sign />
              <RealStat label="4% חודשי" value={y.real.monthly4pctWithdrawal} />
            </div>
          </section>

          {/* ─── Housing detail ─── */}
          {y.housingStatus === 'owning' && (
            <section>
              <h3 className="font-display text-lg md:text-xl font-extrabold text-slate-900 mb-3 flex items-center gap-2">
                <span className="w-1 h-5 bg-emerald-500 rounded-full" />
                פרטי הבית
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <MiniStat label="שווי הבית" value={fmt(y.homeValue) + ' ₪'} />
                <MiniStat label="הון עצמי" value={fmt(y.homeEquity) + ' ₪'} />
                <MiniStat label="יתרת משכנתא" value={fmt(y.mortgageBalance) + ' ₪'} />
                <MiniStat label="תשלום חודשי" value={fmt(y.monthlyMortgagePayment) + ' ₪'} />
              </div>
            </section>
          )}

          {/* ─── Scenario info ─── */}
          <section className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-slate-50 rounded-xl px-4 py-3 border border-slate-200">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">תרחיש</p>
              <p className="font-semibold text-slate-900">
                {config.housePurchaseYear === null ? 'ללא קניית בית' :
                 config.housePurchaseYear === 1 ? 'קנייה מיידית' :
                 `קנייה בגיל ${config.startAge + config.housePurchaseYear - 1}`}
              </p>
            </div>
            <div className="bg-slate-50 rounded-xl px-4 py-3 border border-slate-200">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">שנה בסימולציה</p>
              <p className="font-semibold text-slate-900 num">{y.year} / {config.endAge - config.startAge + 1}</p>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="px-5 md:px-8 py-4 border-t border-slate-200 flex justify-end bg-slate-50 rounded-b-[2rem]">
          <button
            onClick={onClose}
            className="btn-primary px-5 py-2 text-sm md:text-base"
          >
            סגור
          </button>
        </div>
      </div>
    </div>
  );
}

function SectionRow({ label, value, dotColor }: { label: string; value: number; dotColor: string }) {
  return (
    <div className="px-4 md:px-5 py-3 flex items-center justify-between border-b border-slate-100 last:border-b-0">
      <span className="flex items-center gap-2.5">
        <span className={`w-2 h-2 rounded-full ${dotColor}`} />
        <span className="font-bold text-slate-900 text-sm md:text-base">{label}</span>
      </span>
      <span className="num font-bold text-slate-900 text-sm md:text-base" style={{ fontVariantNumeric: 'tabular-nums' }}>
        {Math.round(value).toLocaleString('he-IL')} ₪
      </span>
    </div>
  );
}

function SubRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="px-4 md:px-5 py-2 flex items-center justify-between bg-slate-50 border-b border-slate-100 last:border-b-0">
      <span className="text-xs md:text-sm text-slate-600 pr-4">└ {label}</span>
      <span className="num text-xs md:text-sm text-slate-800 font-semibold" style={{ fontVariantNumeric: 'tabular-nums' }}>
        {Math.round(value).toLocaleString('he-IL')} ₪
      </span>
    </div>
  );
}

function PortCard({ label, value, color, bold, total, hideBar }: {
  label: string; value: number; color: string; bold?: boolean; total: number; hideBar?: boolean
}) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  const bg = color === 'indigo' ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
    : color === 'emerald' ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
    : color === 'amber' ? 'bg-amber-50 border-amber-200 text-amber-700'
    : color === 'violet' ? 'bg-violet-50 border-violet-200 text-violet-700'
    : 'bg-slate-50 border-slate-200 text-slate-700';
  const barBg = color === 'indigo' ? 'bg-indigo-500'
    : color === 'emerald' ? 'bg-emerald-500'
    : color === 'amber' ? 'bg-amber-500'
    : 'bg-violet-500';
  return (
    <div className={`rounded-2xl border px-4 py-3 ${bg}`}>
      <p className="text-xs font-bold uppercase tracking-wider mb-1 opacity-80">{label}</p>
      <p className={`num font-display ${bold ? 'text-xl md:text-2xl font-extrabold' : 'text-lg md:text-xl font-bold'} mb-2`} style={{ fontVariantNumeric: 'tabular-nums' }}>
        {fmtK(value)} ₪
      </p>
      {!hideBar && (
        <>
          <div className="h-1.5 bg-white/60 rounded-full overflow-hidden">
            <div className={`h-full ${barBg} rounded-full transition-all`} style={{ width: `${pct}%` }} />
          </div>
          <p className="text-[10px] font-bold opacity-60 mt-1 num" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {pct.toFixed(0)}%
          </p>
        </>
      )}
    </div>
  );
}

function RealStat({ label, value, bold, sign }: { label: string; value: number; bold?: boolean; sign?: boolean }) {
  return (
    <div>
      <p className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">{label}</p>
      <p className={`num ${bold ? 'text-base md:text-lg font-bold text-slate-900' : 'text-sm md:text-base font-semibold text-slate-700'}`} style={{ fontVariantNumeric: 'tabular-nums' }}>
        {sign && value >= 0 ? '+' : ''}{fmt(value)} ₪
      </p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-slate-50 rounded-xl px-3 py-2.5 border border-slate-200">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="num text-sm md:text-base font-bold text-slate-900 mt-1" style={{ fontVariantNumeric: 'tabular-nums' }}>{value}</p>
    </div>
  );
}
