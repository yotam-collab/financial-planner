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
    <div className="widget-card overflow-hidden">
      {/* The hero's sunset sky continues behind the year */}
      <div className="sunset-sky px-6 md:px-12 pt-8 md:pt-11 pb-10 md:pb-14">
        <div className="flex flex-col items-center text-center gap-3 md:gap-4">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className={`pulse-glow absolute inline-flex h-full w-full rounded-full ${statusDot}`} />
              <span className={`relative inline-flex rounded-full h-2 w-2 ${statusDot}`} />
            </span>
            <p className="text-white/85 text-sm md:text-base font-medium">{scenarioLabel}</p>
          </div>

          <h2 className="font-display text-2xl md:text-3xl lg:text-4xl font-bold text-white leading-tight">
            השנה המוקדמת ביותר לחופש כלכלי
          </h2>

          {/* Calendar year, set in the display serif */}
          <div dir="ltr" className="font-display text-[104px] md:text-[150px] lg:text-[184px] font-black text-white leading-[0.85] drop-shadow-[0_4px_24px_rgba(20,10,45,0.45)]">
            {retYear?.calendarYear ?? '—'}
          </div>

          {retYear && (
            <>
              <p className="text-white text-base md:text-lg font-medium drop-shadow-[0_1px_6px_rgba(20,10,45,0.5)]">
                יותם בן <span className="num font-bold">{retYear.yotamAge}</span>
                <span className="mx-2 md:mx-3 text-white/50">|</span>
                הדס בת <span className="num font-bold">{retYear.hadasAge}</span>
              </p>
              <p className="text-white/90 text-sm md:text-base max-w-xl drop-shadow-[0_1px_6px_rgba(20,10,45,0.5)]">
                ההכנסה ברת-הקיימא מכסה את ההוצאות משנה זו ואילך
              </p>
            </>
          )}
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-slate-200">
        {retYear && (
          <Stat
            label={`הכנסה חודשית בגיל ${earliestRetirementAge}`}
            value={Math.round(retYear.monthlySustainableIncome).toLocaleString('he-IL')}
            suffix="₪"
          />
        )}
        {retYear && (
          <Stat
            label={`הוצאות חודשיות בגיל ${earliestRetirementAge}`}
            value={Math.round(retYear.monthlyExpenses).toLocaleString('he-IL')}
            suffix="₪"
          />
        )}
        {currentYear && (
          <Stat
            label="שווי נקי היום"
            value={fmtCompact(currentYear.netWorth)}
            suffix="₪"
          />
        )}
        {finalYear && (
          <Stat
            label={`שווי נקי בגיל ${finalYear.age}`}
            value={fmtCompact(finalYear.netWorth)}
            suffix="₪"
          />
        )}
      </div>

      {pensionYear && (
        <div className="border-t border-slate-200 px-6 md:px-12 py-3 md:py-4 flex flex-wrap items-baseline justify-between gap-2 bg-slate-50">
          <p className="text-sm md:text-base text-slate-700 font-medium">
            <span className="font-display font-bold text-slate-900">קצבת פנסיה משולבת</span>
            {' '}מגיל {pensionYear.age}
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

function Stat({ label, value, suffix }: { label: string; value: string; suffix?: string }) {
  return (
    <div className="px-5 md:px-8 py-5 md:py-6">
      <p className="text-xs md:text-sm font-medium text-slate-500 mb-1.5">{label}</p>
      <div className="flex items-baseline gap-1.5">
        <span className="num text-2xl md:text-3xl lg:text-4xl font-extrabold text-slate-900 leading-none">
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
