import type { SimulationResult } from '../lib/types';

interface Props {
  result: SimulationResult;
}

export function SummaryCard({ result }: Props) {
  const { earliestRetirementAge, years, scenarioLabel } = result;

  const colorClass = earliestRetirementAge === null
    ? 'from-red-500 to-rose-600'
    : earliestRetirementAge <= 55
      ? 'from-emerald-500 to-teal-600'
      : earliestRetirementAge <= 62
        ? 'from-amber-400 to-orange-500'
        : 'from-red-500 to-rose-600';

  // Get data at retirement age
  const retYear = earliestRetirementAge
    ? years.find(y => y.age === earliestRetirementAge)
    : null;

  // Current year data (year 1)
  const currentYear = years[0];

  // Final year data
  const finalYear = years[years.length - 1];

  // Pension year (first year with payout)
  const pensionYear = years.find(y => y.monthlyPensionPayout > 0);

  return (
    <div className="glass-card overflow-hidden">
      <div className={`bg-gradient-to-l ${colorClass} p-6 md:p-12 relative overflow-hidden`}>
        <div className="absolute inset-0 opacity-10" style={{
          background: 'radial-gradient(circle at 15% 50%, white, transparent 50%), radial-gradient(circle at 85% 30%, white, transparent 40%)'
        }} />

        <div className="relative z-10 flex flex-col items-center text-center gap-6 md:gap-8">
          {/* Main headline */}
          <div>
            <p className="text-white/60 text-xs md:text-sm font-semibold uppercase tracking-wide mb-2">{scenarioLabel}</p>
            <h2 className="text-white/80 text-base md:text-xl lg:text-2xl font-bold mb-2 md:mb-3">הגיל המוקדם ביותר לסגירת העסק</h2>
            <div className="text-6xl md:text-8xl lg:text-9xl font-black text-white tracking-tight num leading-none">
              {earliestRetirementAge ?? '—'}
            </div>
            <p className="text-white/70 mt-3 md:mt-4 text-sm md:text-base lg:text-lg font-medium leading-relaxed max-w-2xl mx-auto">
              {earliestRetirementAge
                ? `בגיל ${earliestRetirementAge} ההכנסה ברת-הקיימא מכסה את ההוצאות`
                : 'לא ניתן לסגור את העסק עם הפרמטרים הנוכחיים'}
            </p>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8 w-full max-w-4xl">
            {retYear && (
              <div className="text-center">
                <div className="text-xl md:text-3xl lg:text-4xl font-black text-white num">
                  {Math.round(retYear.monthlySustainableIncome).toLocaleString('he-IL')}
                </div>
                <div className="text-white/60 text-xs md:text-sm lg:text-base mt-1 font-medium">
                  הכנסה חודשית<br />בגיל {earliestRetirementAge}
                </div>
              </div>
            )}
            {retYear && (
              <div className="text-center">
                <div className="text-xl md:text-3xl lg:text-4xl font-black text-white num">
                  {Math.round(retYear.monthlyExpenses).toLocaleString('he-IL')}
                </div>
                <div className="text-white/60 text-xs md:text-sm lg:text-base mt-1 font-medium">
                  הוצאות חודשיות<br />בגיל {earliestRetirementAge}
                </div>
              </div>
            )}
            {currentYear && (
              <div className="text-center">
                <div className="text-xl md:text-3xl lg:text-4xl font-black text-white num">
                  {fmtK(currentYear.netWorth)}
                </div>
                <div className="text-white/60 text-xs md:text-sm lg:text-base mt-1 font-medium">
                  שווי נקי<br />היום
                </div>
              </div>
            )}
            {finalYear && (
              <div className="text-center">
                <div className="text-xl md:text-3xl lg:text-4xl font-black text-white num">
                  {fmtK(finalYear.netWorth)}
                </div>
                <div className="text-white/60 text-xs md:text-sm lg:text-base mt-1 font-medium">
                  שווי נקי<br />בגיל {finalYear.age}
                </div>
              </div>
            )}
          </div>

          {pensionYear && (
            <p className="text-white/50 text-xs md:text-sm">
              קצבת פנסיה משולבת מגיל {pensionYear.age}:{' '}
              <span className="num font-bold text-white/80">
                {pensionYear.monthlyPensionPayout.toLocaleString('he-IL')} ₪/חודש
              </span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function fmtK(v: number): string {
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
  return String(Math.round(v));
}
