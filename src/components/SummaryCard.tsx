import type { SimulationResult } from '../lib/types';

interface Props {
  result: SimulationResult;
}

export function SummaryCard({ result }: Props) {
  const { earliestRetirementAge, years, scenarioLabel } = result;

  const retYear = earliestRetirementAge
    ? years.find(y => y.age === earliestRetirementAge)
    : null;
  const currentYear = years[0];
  const finalYear = years[years.length - 1];
  const pensionYear = years.find(y => y.monthlyPensionPayout > 0);

  // Gradient based on retirement quality
  const gradient = earliestRetirementAge === null
    ? 'from-rose-500 via-rose-500 to-pink-600'
    : earliestRetirementAge <= 55
      ? 'from-emerald-500 via-teal-500 to-emerald-600'
      : earliestRetirementAge <= 62
        ? 'from-amber-400 via-orange-400 to-amber-500'
        : 'from-rose-500 via-pink-500 to-rose-600';

  return (
    <div className="widget-card overflow-hidden">
      {/* Top gradient band with huge age */}
      <div className={`relative bg-gradient-to-l ${gradient} px-6 md:px-12 py-8 md:py-12 overflow-hidden`}>
        {/* Floating light orbs */}
        <div className="absolute top-0 left-10 w-40 h-40 bg-white/20 rounded-full blur-3xl float-anim" />
        <div className="absolute bottom-0 right-20 w-32 h-32 bg-white/15 rounded-full blur-2xl float-anim" style={{ animationDelay: '1s' }} />

        <div className="relative z-10 flex flex-col items-center text-center gap-4 md:gap-5">
          {/* Eyebrow */}
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="pulse-glow absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
            </span>
            <p className="text-white/90 text-[11px] md:text-xs font-bold uppercase tracking-[0.28em]">
              {scenarioLabel}
            </p>
          </div>

          {/* Title */}
          <h2 className="font-display text-xl md:text-2xl lg:text-3xl font-extrabold text-white/90 leading-tight">
            השנה המוקדמת ביותר <span className="text-white/60 font-bold">לחופש כלכלי</span>
          </h2>

          {/* Huge centered number — calendar year */}
          <div className="font-display text-[96px] md:text-[140px] lg:text-[180px] font-extrabold text-white leading-[0.8] tracking-tighter num drop-shadow-[0_6px_28px_rgba(0,0,0,0.2)]">
            {retYear?.calendarYear ?? '—'}
          </div>

          {retYear && (
            <>
              {/* Ages sub-line */}
              <div className="flex items-center gap-4 md:gap-6 text-white/95 text-sm md:text-base font-semibold">
                <span className="flex items-baseline gap-1.5">
                  <span className="text-white/70 text-[11px] md:text-xs uppercase tracking-[0.18em] font-bold">יותם</span>
                  <span className="num font-display text-lg md:text-xl font-extrabold">{retYear.yotamAge}</span>
                </span>
                <span className="w-px h-4 md:h-5 bg-white/40" />
                <span className="flex items-baseline gap-1.5">
                  <span className="text-white/70 text-[11px] md:text-xs uppercase tracking-[0.18em] font-bold">הדס</span>
                  <span className="num font-display text-lg md:text-xl font-extrabold">{retYear.hadasAge}</span>
                </span>
              </div>

              <p className="text-white/80 text-sm md:text-base font-medium max-w-xl">
                ההכנסה ברת-הקיימא מכסה את ההוצאות משנה זו ואילך
              </p>
            </>
          )}
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-white/40">
        {retYear && (
          <Stat
            label={`הכנסה · גיל ${earliestRetirementAge}`}
            value={Math.round(retYear.monthlySustainableIncome).toLocaleString('he-IL')}
            suffix="₪"
            accent="violet"
          />
        )}
        {retYear && (
          <Stat
            label={`הוצאות · גיל ${earliestRetirementAge}`}
            value={Math.round(retYear.monthlyExpenses).toLocaleString('he-IL')}
            suffix="₪"
            accent="pink"
          />
        )}
        {currentYear && (
          <Stat
            label="שווי נקי · היום"
            value={fmtCompact(currentYear.netWorth)}
            suffix="₪"
            accent="indigo"
          />
        )}
        {finalYear && (
          <Stat
            label={`שווי נקי · גיל ${finalYear.age}`}
            value={fmtCompact(finalYear.netWorth)}
            suffix="₪"
            accent="emerald"
          />
        )}
      </div>

      {pensionYear && (
        <div className="border-t border-white/40 px-6 md:px-12 py-3 md:py-4 flex flex-wrap items-baseline justify-between gap-2 bg-white/40">
          <p className="text-sm md:text-base text-slate-700 font-medium">
            <span className="font-display font-bold text-slate-900">קצבת פנסיה משולבת</span>
            {' '}· מגיל {pensionYear.age}
          </p>
          <p className="num text-base md:text-lg font-bold text-slate-900">
            {pensionYear.monthlyPensionPayout.toLocaleString('he-IL')}
            <span className="text-slate-500 font-normal text-sm"> ₪/חודש</span>
          </p>
        </div>
      )}
    </div>
  );
}

const ACCENTS: Record<string, { dot: string; }> = {
  indigo: { dot: 'bg-indigo-500' },
  violet: { dot: 'bg-violet-500' },
  pink: { dot: 'bg-pink-500' },
  emerald: { dot: 'bg-emerald-500' },
  amber: { dot: 'bg-amber-500' },
};

function Stat({ label, value, suffix, accent = 'indigo' }: {
  label: string; value: string; suffix?: string; accent?: keyof typeof ACCENTS;
}) {
  const a = ACCENTS[accent];
  return (
    <div className="px-5 md:px-8 py-5 md:py-7">
      <div className="flex items-center gap-2 mb-2">
        <span className={`w-1.5 h-1.5 rounded-full ${a.dot}`} />
        <p className="text-[10px] md:text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">
          {label}
        </p>
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="font-display num text-2xl md:text-3xl lg:text-4xl font-extrabold text-slate-900 leading-none">
          {value}
        </span>
        {suffix && <span className="text-slate-500 font-semibold text-sm md:text-base">{suffix}</span>}
      </div>
    </div>
  );
}

function fmtCompact(v: number): string {
  if (Math.abs(v) >= 1_000_000) {
    const m = v / 1_000_000;
    return m >= 10 ? m.toFixed(0) + 'M' : m.toFixed(1) + 'M';
  }
  if (Math.abs(v) >= 1_000) return (v / 1_000).toFixed(0) + 'K';
  return String(Math.round(v));
}
