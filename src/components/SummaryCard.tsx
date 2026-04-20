import type { SimulationResult } from '../lib/types';

interface Props {
  result: SimulationResult;
}

export function SummaryCard({ result }: Props) {
  const { earliestRetirementAge, years, scenarioLabel } = result;

  const colorClass = earliestRetirementAge === null
    ? 'from-red-500 via-rose-500 to-rose-600'
    : earliestRetirementAge <= 55
      ? 'from-emerald-500 via-emerald-500 to-teal-600'
      : earliestRetirementAge <= 62
        ? 'from-amber-400 via-orange-400 to-orange-500'
        : 'from-red-500 via-rose-500 to-rose-600';

  const retYear = earliestRetirementAge
    ? years.find(y => y.age === earliestRetirementAge)
    : null;
  const currentYear = years[0];
  const finalYear = years[years.length - 1];
  const pensionYear = years.find(y => y.monthlyPensionPayout > 0);

  return (
    <div className={`rounded-3xl overflow-hidden bg-gradient-to-l ${colorClass} shadow-lg shadow-emerald-900/10 relative`}>
      {/* Subtle light accent */}
      <div className="absolute inset-0 opacity-[0.15] pointer-events-none" style={{
        background: 'radial-gradient(ellipse 60% 80% at 15% 50%, white, transparent 70%)'
      }} />
      {/* Grain texture for depth */}
      <div className="absolute inset-0 opacity-[0.04] pointer-events-none mix-blend-overlay" style={{
        backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")"
      }} />

      <div className="relative z-10 flex flex-col md:flex-row md:items-stretch">
        {/* ─── Age section (left) ─── */}
        <div className="px-5 md:px-8 py-5 md:py-6 flex flex-col justify-center md:min-w-[320px]">
          <div className="flex items-center gap-2 mb-2">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white/60 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white/80"></span>
            </span>
            <span className="text-white/70 text-[11px] md:text-xs font-semibold uppercase tracking-[0.2em]">
              {scenarioLabel}
            </span>
          </div>

          <div className="flex items-baseline gap-3 md:gap-4">
            <div className="text-5xl md:text-6xl lg:text-7xl font-black text-white tracking-tight num leading-none">
              {earliestRetirementAge ?? '—'}
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-white/90 text-xs md:text-sm font-bold leading-tight">סגירת עסק</span>
              <span className="text-white/50 text-[10px] md:text-xs font-medium">גיל מינימלי</span>
            </div>
          </div>

          {earliestRetirementAge && (
            <p className="text-white/60 text-xs md:text-sm mt-2.5 md:mt-3 font-medium leading-snug">
              הכנסה ברת-קיימא ≥ הוצאות מגיל זה ואילך
            </p>
          )}
          {!earliestRetirementAge && (
            <p className="text-white/60 text-xs md:text-sm mt-2.5 md:mt-3 font-medium leading-snug">
              לא ניתן לסגור את העסק עם הפרמטרים הנוכחיים
            </p>
          )}
        </div>

        {/* ─── Divider ─── */}
        <div className="hidden md:block w-px bg-gradient-to-b from-transparent via-white/25 to-transparent" />
        <div className="md:hidden h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />

        {/* ─── Stats grid (right) ─── */}
        <div className="flex-1 grid grid-cols-2 md:grid-cols-4">
          {retYear && (
            <Stat
              value={Math.round(retYear.monthlySustainableIncome).toLocaleString('he-IL')}
              label={`הכנסה · גיל ${earliestRetirementAge}`}
            />
          )}
          {retYear && (
            <Stat
              value={Math.round(retYear.monthlyExpenses).toLocaleString('he-IL')}
              label={`הוצאות · גיל ${earliestRetirementAge}`}
              withBorder
            />
          )}
          {currentYear && (
            <Stat
              value={fmtK(currentYear.netWorth)}
              label="שווי נקי · היום"
              withBorder
            />
          )}
          {finalYear && (
            <Stat
              value={fmtK(finalYear.netWorth)}
              label={`שווי נקי · גיל ${finalYear.age}`}
              withBorder
            />
          )}
        </div>
      </div>

      {pensionYear && (
        <div className="relative z-10 px-5 md:px-8 py-2 md:py-2.5 bg-black/10 border-t border-white/10 flex items-center justify-between">
          <span className="text-white/60 text-[11px] md:text-xs font-medium">
            קצבת פנסיה משולבת מגיל {pensionYear.age}
          </span>
          <span className="text-white num font-bold text-sm md:text-base">
            {pensionYear.monthlyPensionPayout.toLocaleString('he-IL')} ₪<span className="text-white/50 text-xs font-medium">/חודש</span>
          </span>
        </div>
      )}
    </div>
  );
}

function Stat({ value, label, withBorder }: { value: string; label: string; withBorder?: boolean }) {
  return (
    <div className={`
      px-3 md:px-5 py-4 md:py-6 text-center md:text-right
      ${withBorder ? 'border-t md:border-t-0 md:border-r border-white/15' : ''}
    `}>
      <div className="text-lg md:text-xl lg:text-2xl font-black text-white num leading-none tracking-tight">
        {value}
      </div>
      <div className="text-white/60 text-[10px] md:text-xs mt-1.5 md:mt-2 font-semibold uppercase tracking-wider">
        {label}
      </div>
    </div>
  );
}

function fmtK(v: number): string {
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
  return String(Math.round(v));
}
