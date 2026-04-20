import { useEffect } from 'react';
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

export function DetailModal({ year: y, config, onClose }: Props) {
  // ESC to close
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

  const totalIncome = y.monthlyZinukIncome + y.monthlyAltIncome + y.monthlyPensionIncome;
  const cashSurplus = totalIncome - y.monthlyExpenses; // actual cashflow (no 4%)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 overflow-y-auto"
      style={{ background: 'rgba(15, 23, 42, 0.55)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        className="widget-card-static w-full max-w-3xl fade-up my-auto"
        onClick={e => e.stopPropagation()}
        style={{ background: 'rgba(255, 255, 255, 0.97)' }}
      >
        {/* Header with gradient */}
        <div className={`relative bg-gradient-to-l ${phaseColor} px-6 md:px-8 py-6 md:py-7 rounded-t-[2rem] overflow-hidden`}>
          <div className="absolute top-0 left-10 w-32 h-32 bg-white/15 rounded-full blur-3xl float-anim" />
          <button
            onClick={onClose}
            className="absolute top-4 left-4 w-9 h-9 rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-md flex items-center justify-center text-white text-xl transition-colors"
            aria-label="סגור"
          >✕</button>
          <div className="relative z-10">
            <p className="text-white/80 text-[11px] font-bold uppercase tracking-[0.25em] mb-2">פירוט שנתי מלא</p>
            <div className="flex items-baseline gap-4 flex-wrap">
              <span className="font-display num text-5xl md:text-6xl font-extrabold text-white leading-none">{y.calendarYear ?? y.age}</span>
              <div className="flex flex-col gap-0.5">
                <span className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-white/25 text-white w-fit`}>
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
        <div className="px-5 md:px-8 py-6 md:py-8 space-y-6">
          {/* Monthly breakdown */}
          <section>
            <h3 className="font-display text-lg md:text-xl font-extrabold text-slate-900 mb-3">תזרים חודשי</h3>
            <div className="bg-white/60 rounded-2xl border border-white/70 divide-y divide-slate-200/50">
              {y.monthlyZinukIncome > 0 && <MoneyRow label="הכנסה מזינוק (נטו)" value={y.monthlyZinukIncome} dotColor="bg-indigo-500" />}
              {y.monthlyAltIncome > 0 && <MoneyRow label="הכנסה חלופית (נטו)" value={y.monthlyAltIncome} dotColor="bg-emerald-500" />}
              {y.monthlyPensionIncome > 0 && <MoneyRow label="קצבת פנסיה" value={y.monthlyPensionIncome} dotColor="bg-amber-500" />}
              <MoneyRow label="סה״כ הכנסה בפועל" value={totalIncome} dotColor="bg-violet-500" highlight />
              <MoneyRow label="4% מהתיק (פוטנציאלי)" value={y.monthly4pctWithdrawal} dotColor="bg-indigo-600" muted />
              <MoneyRow label="הוצאות" value={-y.monthlyExpenses} dotColor="bg-rose-500" highlight expense />
              <div className={`px-4 md:px-5 py-4 flex items-center justify-between ${cashSurplus >= 0 ? 'bg-emerald-50/60' : 'bg-rose-50/60'}`}>
                <span className="font-display text-base md:text-lg font-extrabold text-slate-900">תזרים מזומנים</span>
                <span className={`num font-display text-xl md:text-2xl font-extrabold ${cashSurplus >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {cashSurplus >= 0 ? '+' : ''}{fmt(cashSurplus)} ₪
                </span>
              </div>
              <div className={`px-4 md:px-5 py-3 flex items-center justify-between ${y.monthlyBalance >= 0 ? 'bg-emerald-100/60' : 'bg-rose-100/60'}`}>
                <span className="text-sm font-bold text-slate-700">יתרה חודשית (כולל 4% כפוטנציאל)</span>
                <span className={`num font-bold ${y.monthlyBalance >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {y.monthlyBalance >= 0 ? '+' : ''}{fmt(y.monthlyBalance)} ₪
                </span>
              </div>
            </div>
          </section>

          {/* Portfolio */}
          <section>
            <h3 className="font-display text-lg md:text-xl font-extrabold text-slate-900 mb-3">שווי נקי</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <PortCard label="תיק נזיל" value={y.liquidPortfolio} color="indigo" />
              <PortCard label="נדל״ן (הון)" value={y.homeEquity} color="emerald" empty={y.homeEquity === 0} />
              <PortCard label="פנסיה (נעולה)" value={y.pension} color="amber" empty={y.pension === 0} />
              <PortCard label="שווי נקי" value={y.netWorth} color="violet" bold />
            </div>
          </section>

          {/* Real values (today) */}
          <section>
            <h3 className="font-display text-lg md:text-xl font-extrabold text-slate-900 mb-3">בערכים של היום (ריאלי)</h3>
            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 md:p-5 grid grid-cols-2 md:grid-cols-3 gap-4">
              <RealStat label="תיק נזיל" value={y.real.liquidPortfolio} />
              {y.real.homeEquity > 0 && <RealStat label="נדל״ן" value={y.real.homeEquity} />}
              {y.real.pension > 0 && <RealStat label="פנסיה" value={y.real.pension} />}
              <RealStat label="שווי נקי" value={y.real.netWorth} bold />
              <RealStat label="יתרה חודשית" value={y.real.monthlyBalance} sign />
              <RealStat label="4% חודשי" value={y.real.monthly4pctWithdrawal} />
            </div>
          </section>

          {/* Housing */}
          {y.housingStatus === 'owning' && (
            <section>
              <h3 className="font-display text-lg md:text-xl font-extrabold text-slate-900 mb-3">בית</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <MiniStat label="שווי בית" value={fmt(y.homeValue) + ' ₪'} />
                <MiniStat label="הון עצמי" value={fmt(y.homeEquity) + ' ₪'} />
                <MiniStat label="יתרת משכנתא" value={fmt(y.mortgageBalance) + ' ₪'} />
                <MiniStat label="תשלום חודשי" value={fmt(y.monthlyMortgagePayment) + ' ₪'} />
              </div>
            </section>
          )}

          {/* Info rows */}
          <section className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-white/50 rounded-xl px-4 py-3 border border-white/70">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">תרחיש</p>
              <p className="font-semibold text-slate-800">
                {config.housePurchaseYear === null ? 'ללא קניית בית' :
                 config.housePurchaseYear === 1 ? 'קנייה מיידית' :
                 `קנייה בגיל ${config.startAge + config.housePurchaseYear - 1}`}
              </p>
            </div>
            <div className="bg-white/50 rounded-xl px-4 py-3 border border-white/70">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">שנת סימולציה</p>
              <p className="font-semibold text-slate-800 num">{y.year} / {config.endAge - config.startAge + 1}</p>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="px-5 md:px-8 py-4 border-t border-white/60 flex justify-end bg-white/30 rounded-b-[2rem]">
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

function MoneyRow({ label, value, dotColor, highlight, muted, expense }: {
  label: string; value: number; dotColor: string; highlight?: boolean; muted?: boolean; expense?: boolean;
}) {
  return (
    <div className={`px-4 md:px-5 py-2.5 flex items-center justify-between ${highlight ? 'bg-slate-50/50' : ''} ${muted ? 'opacity-70' : ''}`}>
      <span className="flex items-center gap-2.5">
        <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
        <span className={`${highlight ? 'font-bold text-slate-900' : 'text-slate-700'} text-sm md:text-base`}>{label}</span>
      </span>
      <span className={`num text-sm md:text-base ${highlight ? 'font-bold' : 'font-semibold'} ${expense ? 'text-rose-600' : 'text-slate-900'}`} style={{ fontVariantNumeric: 'tabular-nums' }}>
        {value >= 0 ? '' : ''}{fmt(value)} ₪
      </span>
    </div>
  );
}

function PortCard({ label, value, color, bold, empty }: { label: string; value: number; color: string; bold?: boolean; empty?: boolean }) {
  if (empty) return null;
  const bg = color === 'indigo' ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
    : color === 'emerald' ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
    : color === 'amber' ? 'bg-amber-50 border-amber-200 text-amber-700'
    : color === 'violet' ? 'bg-violet-50 border-violet-200 text-violet-700'
    : 'bg-slate-50 border-slate-200 text-slate-700';
  return (
    <div className={`rounded-2xl border px-4 py-3 ${bg}`}>
      <p className="text-xs font-bold uppercase tracking-wider mb-1 opacity-80">{label}</p>
      <p className={`num font-display ${bold ? 'text-xl md:text-2xl font-extrabold' : 'text-lg md:text-xl font-bold'}`} style={{ fontVariantNumeric: 'tabular-nums' }}>
        {fmtK(value)} ₪
      </p>
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
    <div className="bg-white/60 rounded-xl px-3 py-2.5 border border-white/70">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="num text-sm md:text-base font-bold text-slate-900 mt-1" style={{ fontVariantNumeric: 'tabular-nums' }}>{value}</p>
    </div>
  );
}
