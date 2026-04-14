import type { SimulationResult } from '../lib/types';

interface Props {
  result: SimulationResult;
}

export function SummaryCard({ result }: Props) {
  const { earliestRetirementAge, years } = result;

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

  // Get pension payout
  const pensionYear = years.find(y => y.monthlyPensionPayout > 0);

  return (
    <div className="glass-card overflow-hidden">
      <div className={`bg-gradient-to-l ${colorClass} p-5 md:p-12 relative overflow-hidden`}>
        <div className="absolute inset-0 opacity-10" style={{
          background: 'radial-gradient(circle at 15% 50%, white, transparent 50%), radial-gradient(circle at 85% 30%, white, transparent 40%)'
        }} />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 md:gap-8">
          <div>
            <h2 className="text-white/80 text-base md:text-xl font-bold mb-1 md:mb-2">הגיל המוקדם ביותר לסגירת העסק</h2>
            <div className="text-5xl md:text-7xl font-black text-white tracking-tight num">
              {earliestRetirementAge ?? '—'}
            </div>
            <p className="text-white/60 mt-2 text-sm md:text-base font-medium leading-relaxed max-w-md">
              {earliestRetirementAge
                ? `בגיל ${earliestRetirementAge} ההכנסה ברת-הקיימא (4% מהתיק + הכנסה חלופית${earliestRetirementAge >= 60 ? ' + קצבת פנסיה' : ''}) מכסה את ההוצאות`
                : 'לא ניתן לסגור את העסק עם הפרמטרים הנוכחיים'}
            </p>
          </div>

          <div className="flex gap-4 md:gap-10 flex-wrap">
            {retYear && (
              <div className="text-center">
                <div className="text-xl md:text-3xl font-black text-white num">
                  {Math.round(retYear.monthlySustainableIncome).toLocaleString('he-IL')}
                </div>
                <div className="text-white/60 text-xs md:text-sm mt-1 font-medium">הכנסה חודשית ברת-קיימא</div>
              </div>
            )}
            {retYear && (
              <div className="text-center">
                <div className="text-xl md:text-3xl font-black text-white num">
                  {Math.round(retYear.monthlyExpenses).toLocaleString('he-IL')}
                </div>
                <div className="text-white/60 text-xs md:text-sm mt-1 font-medium">הוצאות חודשיות</div>
              </div>
            )}
            {pensionYear && (
              <div className="text-center">
                <div className="text-xl md:text-3xl font-black text-white num">
                  {pensionYear.monthlyPensionPayout.toLocaleString('he-IL')}
                </div>
                <div className="text-white/60 text-xs md:text-sm mt-1 font-medium">קצבה חודשית (מגיל 60)</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
