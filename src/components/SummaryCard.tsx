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

  // How early freedom arrives, shown as the colour of the status dot
  const statusDot = earliestRetirementAge === null
    ? 'bg-rose-400'
    : earliestRetirementAge <= 55
      ? 'bg-emerald-400'
      : earliestRetirementAge <= 62
        ? 'bg-amber-400'
        : 'bg-rose-400';

  return (
    // Results strip: the year is one result among the others; the chart below is the centre of the page
    <div className="widget-card overflow-hidden grid grid-cols-1 lg:grid-cols-[minmax(17rem,1fr)_3fr]">
      <div className="sunset-sky px-5 md:px-7 py-5 md:py-6 flex flex-col justify-center gap-1.5">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className={`pulse-glow absolute inline-flex h-full w-full rounded-full ${statusDot}`} />
            <span className={`relative inline-flex rounded-full h-2 w-2 ${statusDot}`} />
          </span>
          <p className="text-white/85 text-sm font-medium">{scenarioLabel}</p>
        </div>
        <h2 className="text-white text-base md:text-lg font-semibold leading-snug">
          השנה המוקדמת ביותר לחופש כלכלי
        </h2>
        <div className="flex items-baseline gap-4 flex-wrap">
          <span dir="ltr" className="font-display text-4xl md:text-5xl font-black text-white leading-none drop-shadow-[0_2px_12px_rgba(20,10,45,0.45)]">
            {retYear?.calendarYear ?? '—'}
          </span>
          {retYear && (
            <p className="text-white text-base font-medium drop-shadow-[0_1px_6px_rgba(20,10,45,0.5)]">
              יותם בן <span className="num font-bold">{retYear.yotamAge}</span>
              <span className="mx-2 text-white/50">|</span>
              הדס בת <span className="num font-bold">{retYear.hadasAge}</span>
            </p>
          )}
        </div>
      </div>

      {/* gap-px over a tinted background draws the hairlines between cells */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-px bg-slate-200">
        {retYear && (
          <Stat
            label={`הכנסה חודשית בגיל ${earliestRetirementAge}`}
            value={Math.round(retYear.monthlySustainableIncome).toLocaleString('he-IL')}
          />
        )}
        {retYear && (
          <Stat
            label={`הוצאות חודשיות בגיל ${earliestRetirementAge}`}
            value={Math.round(retYear.monthlyExpenses).toLocaleString('he-IL')}
          />
        )}
        {currentYear && <Stat label="שווי נקי היום" value={fmtCompact(currentYear.netWorth)} />}
        {finalYear && <Stat label={`שווי נקי בגיל ${finalYear.age}`} value={fmtCompact(finalYear.netWorth)} />}
        {pensionYear && (
          <Stat
            label={`קצבת פנסיה חודשית מגיל ${pensionYear.age}`}
            value={pensionYear.monthlyPensionPayout.toLocaleString('he-IL')}
            className="col-span-2 xl:col-span-1"
          />
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, className = '' }: { label: string; value: string; className?: string }) {
  return (
    <div className={`bg-white px-5 md:px-6 py-4 md:py-5 flex flex-col justify-center ${className}`}>
      <p className="text-sm md:text-base font-medium text-slate-500 mb-1.5 md:min-h-[3em]">{label}</p>
      <div className="flex items-baseline gap-1.5">
        <span className="num text-2xl md:text-3xl font-extrabold text-slate-900 leading-none">{value}</span>
        <span className="text-slate-500 font-semibold text-base">₪</span>
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
