import type { SimulationResult, YearResult } from '../lib/types';
import { formatCompact } from '../lib/format';

interface Props {
  result: SimulationResult;
}

type Tone = 'good' | 'warn' | 'bad';

const VERDICT: Record<Tone, string> = {
  good: 'bg-emerald-50 text-emerald-900',
  warn: 'bg-amber-50 text-amber-900',
  bad: 'bg-rose-50 text-rose-900',
};
const DOT: Record<Tone, string> = { good: 'bg-emerald-500', warn: 'bg-amber-500', bad: 'bg-rose-500' };

export function SummaryCard({ result }: Props) {
  const { earliestRetirementAge, earliestFullRetirementYear, depletionAge, years } = result;

  // The earliest possible exit: searched over every exit age, so the zinuk slider does not move it
  const earliest = earliestRetirementAge ? years.find(y => y.age === earliestRetirementAge) : null;
  const earliestFull = earliestFullRetirementYear
    ? years.find(y => y.calendarYear === earliestFullRetirementYear)
    : null;

  // Everything below describes the scenario chosen in the sliders
  const last = years[years.length - 1];
  const exit = years.find(y => y.phase !== 'zinuk') ?? last;
  const retired = years.find(y => y.isFullyRetired) ?? last;
  // Yotam's own slider. "Fully retired" above also waits for Hadas, which can be years later
  const yotamOut = years.find(y => y.phase !== 'zinuk' && y.yotamMonthlyIncome === 0) ?? last;
  // A row holds end-of-year values, so the balance on the day of the move is the previous row's
  const atStartOf = (row: typeof last) => years[years.indexOf(row) - 1] ?? row;
  const atExit = atStartOf(exit);
  const atYotamOut = atStartOf(yotamOut);

  const shortYears = years.filter(y => y.phase !== 'zinuk' && y.monthlyBalance < 0).length;
  const tone: Tone = depletionAge !== null ? 'bad' : shortYears > 0 ? 'warn' : 'good';
  const gap = earliest ? exit.age - earliest.age : null;

  const low = years.slice(years.indexOf(exit)).reduce((a, b) => (b.real.liquidPortfolio < a.real.liquidPortfolio ? b : a));
  const drawYears = years.filter(y => y.annualCashflow < 0);
  const drawn = -drawYears.reduce((sum, y) => sum + y.real.annualCashflow, 0);

  return (
    <div className="widget-card overflow-hidden grid grid-cols-1 lg:grid-cols-[minmax(17rem,1fr)_3fr]">
      <div className="sunset-sky px-5 md:px-7 py-5 md:py-6 flex flex-col justify-center gap-2 text-white">
        <h2 className="text-base md:text-lg font-semibold leading-snug">
          הכי מוקדם שאפשר לעזוב את זינוק
        </h2>
        {earliest ? (
          <div className="flex items-baseline gap-3 flex-wrap drop-shadow-[0_2px_10px_rgba(20,10,45,0.45)]">
            <span className="font-display text-4xl md:text-5xl font-black leading-none">
              גיל <span className="num">{earliest.age}</span>
            </span>
            <p className="text-base font-medium">
              שנת <span className="num font-bold">{earliest.calendarYear}</span>, הדס בת{' '}
              <span className="num font-bold">{earliest.hadasAge}</span>
            </p>
          </div>
        ) : (
          <p className="text-lg font-bold leading-snug">
            בנתונים האלה אין גיל שבו הכסף מספיק עד גיל <span className="num">{last.age}</span>
          </p>
        )}
        {earliestFull && (
          <p className="text-sm md:text-base font-medium drop-shadow-[0_1px_6px_rgba(20,10,45,0.5)]">
            פרישה מלאה של שניכם אפשרית משנת <span className="num font-bold">{earliestFull.calendarYear}</span>{' '}
            (יותם <span className="num">{earliestFull.yotamAge}</span>, הדס{' '}
            <span className="num">{earliestFull.hadasAge}</span>)
          </p>
        )}
        <p className="text-sm text-white/80 leading-snug">
          הגיל מחושב מההכנסות, ההוצאות והנכסים. המחוון ״סיום זינוק״ לא מזיז אותו, הוא משנה את שאר הנתונים כאן.
        </p>
      </div>

      <div className="flex flex-col">
        <p className={`flex items-start gap-2.5 px-5 md:px-6 py-3 text-base font-semibold leading-snug ${VERDICT[tone]}`}>
          <span className={`mt-2 h-2 w-2 shrink-0 rounded-full ${DOT[tone]}`} />
          <span>
            בחרת לעזוב את זינוק בגיל <span className="num">{exit.age}</span>
            {gap !== null && gap !== 0 && (
              <>
                {' '}(<span className="num">{Math.abs(gap)}</span> שנים {gap > 0 ? 'אחרי' : 'לפני'} המועד המוקדם ביותר)
              </>
            )}
            .{' '}
            {tone === 'bad' && (
              <>זה לא מחזיק: החסכונות הנזילים נגמרים בגיל <span className="num">{depletionAge}</span>. סכום שלילי הוא החוב שנצבר מאז.</>
            )}
            {tone === 'warn' && (
              <>
                החסכונות לא נגמרים, אבל ב-<span className="num">{shortYears}</span> שנים ההוצאות גבוהות ממה
                שהתיק יכול לממן לאורך זמן.
              </>
            )}
            {tone === 'good' && (
              <>זה מחזיק עד גיל <span className="num">{last.age}</span> בלי שנה אדומה.</>
            )}
          </span>
        </p>

        {/* gap-px over a tinted background draws the hairlines between cells */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-px bg-slate-200 border-y border-slate-200 flex-1">
          <Stat
            label={`תיק נזיל ביום שעוזבים את זינוק, גיל ${exit.age}`}
            value={formatCompact(atExit.real.liquidPortfolio)}
            sub={worthSub(atExit)}
          />
          <Stat
            label={`תיק נזיל ביום שיותם פורש, גיל ${yotamOut.age}`}
            value={formatCompact(atYotamOut.real.liquidPortfolio)}
            sub={worthSub(atYotamOut)}
          />
          <Stat
            label={`מאזן חודשי כששניכם בפרישה, יותם ${retired.age} והדס ${retired.hadasAge}`}
            value={Math.round(retired.real.monthlyBalance).toLocaleString('he-IL')}
            good={retired.real.monthlyBalance >= 0}
            sub={`הכנסה ${formatCompact(retired.real.monthlySustainableIncome)} מול הוצאות ${formatCompact(retired.real.annualExpenses / 12)}`}
          />
          <Stat
            label={`השפל של התיק הנזיל אחרי זינוק, גיל ${low.age}`}
            value={formatCompact(low.real.liquidPortfolio)}
            sub={
              drawYears.length
                ? `ב-${drawYears.length} שנים נמשך כסף מהחסכונות, ${formatCompact(drawn)} ₪ בסך הכל`
                : 'אין שנה שבה נמשך כסף מהחסכונות'
            }
          />
          <Stat
            label={`${last.liquidPortfolio < 0 ? 'חוב' : 'שווי נקי'} בגיל ${last.age}`}
            value={formatCompact(last.liquidPortfolio < 0 ? last.real.liquidPortfolio : last.real.netWorth)}
            sub={last.liquidPortfolio < 0 ? worthSub(last) : 'כולל פנסיה ונדל״ן'}
            className="col-span-2 md:col-span-2 xl:col-span-1"
          />
        </div>

        <p className="px-5 md:px-6 py-2.5 text-sm text-slate-500">
          הסכומים בערכי היום, אחרי ניכוי אינפלציה, לפי הבחירות במחוונים למטה.
        </p>
      </div>
    </div>
  );
}

// Debt is never netted against the house and the pension, so a year in debt gets no net worth
function worthSub(y: YearResult) {
  return y.liquidPortfolio < 0
    ? `חוב. לא מקוזז מנדל״ן ופנסיה בשווי ${formatCompact(y.real.homeEquity + y.real.pension)} ₪`
    : `שווי נקי ${formatCompact(y.real.netWorth)} ₪`;
}

function Stat({
  label, value, sub, good, className = '',
}: { label: string; value: string; sub: string; good?: boolean; className?: string }) {
  // Any negative amount is red, whichever stat it is
  const color = value.includes('-') ? 'text-rose-600' : good ? 'text-emerald-700' : 'text-slate-900';
  return (
    <div className={`bg-white px-5 md:px-6 py-4 flex flex-col ${className}`}>
      <p className="text-sm md:text-base font-medium text-slate-500 mb-1.5 md:min-h-[3em]">{label}</p>
      <div className={`flex items-baseline gap-1.5 ${color}`}>
        <span className="num text-2xl md:text-3xl font-extrabold leading-none">{value}</span>
        <span className="font-semibold text-base">₪</span>
      </div>
      <p className="text-sm text-slate-500 mt-1.5 leading-snug">{sub}</p>
    </div>
  );
}
