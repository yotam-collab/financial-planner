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

  // Status color
  const statusColor =
    earliestRetirementAge === null ? 'text-[#8a2d3a]'
    : earliestRetirementAge <= 55 ? 'text-[#3d6e5c]'
    : earliestRetirementAge <= 62 ? 'text-[#b87333]'
    : 'text-[#8a2d3a]';

  const statusLabel =
    earliestRetirementAge === null ? 'לא בר-השגה'
    : earliestRetirementAge <= 55 ? 'מצוין'
    : earliestRetirementAge <= 62 ? 'סביר'
    : 'מאוחר';

  return (
    <article className="ledger-card px-6 md:px-10 py-6 md:py-8 fade-rise">
      {/* Eyebrow row */}
      <div className="flex items-center justify-between mb-5 md:mb-6">
        <div className="flex items-center gap-3">
          <span className="eyebrow">תרחיש</span>
          <span className="serif text-base md:text-lg font-medium text-[#1a1c28]">{scenarioLabel}</span>
        </div>
        <div className={`flex items-center gap-2 ${statusColor}`}>
          <span className="w-1 h-1 rounded-full bg-current" />
          <span className="eyebrow !text-current">{statusLabel}</span>
        </div>
      </div>

      {/* Main headline + age */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 md:gap-8 mb-6 md:mb-8">
        <div className="flex-1">
          <h2 className="serif text-2xl md:text-3xl lg:text-4xl font-medium leading-tight text-[#1a1c28] max-w-xl">
            סגירת העסק אפשרית
            <br />
            <span className="text-[#8a8695]">מגיל</span>
          </h2>
        </div>
        <div className="flex items-baseline gap-3 md:gap-4">
          <span className={`num-display text-[88px] md:text-[120px] lg:text-[144px] leading-[0.85] ${statusColor}`}>
            {earliestRetirementAge ?? '—'}
          </span>
        </div>
      </div>

      {/* Ornamental divider */}
      <div className="rule-ornament mb-6 md:mb-8">
        <svg width="10" height="10" viewBox="0 0 10 10" className="flex-shrink-0">
          <path d="M5 0 L6 4 L10 5 L6 6 L5 10 L4 6 L0 5 L4 4 Z" fill="currentColor" opacity="0.6" />
        </svg>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-5 md:gap-x-8 md:gap-y-0">
        {retYear && (
          <Stat
            label={`הכנסה · גיל ${earliestRetirementAge}`}
            value={Math.round(retYear.monthlySustainableIncome).toLocaleString('he-IL')}
            suffix="₪"
          />
        )}
        {retYear && (
          <Stat
            label={`הוצאות · גיל ${earliestRetirementAge}`}
            value={Math.round(retYear.monthlyExpenses).toLocaleString('he-IL')}
            suffix="₪"
          />
        )}
        {currentYear && (
          <Stat
            label="שווי נקי · היום"
            value={fmtCompact(currentYear.netWorth)}
            suffix="₪"
          />
        )}
        {finalYear && (
          <Stat
            label={`שווי נקי · גיל ${finalYear.age}`}
            value={fmtCompact(finalYear.netWorth)}
            suffix="₪"
          />
        )}
      </div>

      {/* Pension footer */}
      {pensionYear && (
        <div className="mt-6 md:mt-8 pt-5 border-t border-[#e8dfc8] flex flex-col md:flex-row md:items-baseline md:justify-between gap-2">
          <p className="text-sm md:text-base text-[#4a4755]">
            <span className="serif italic text-[#8a6f36]">קצבת פנסיה משולבת</span> מתחילה בגיל {pensionYear.age}
          </p>
          <p className="num font-semibold text-[#1a1c28] text-base md:text-lg">
            {pensionYear.monthlyPensionPayout.toLocaleString('he-IL')}
            <span className="text-[#8a8695] font-normal text-sm">
              {' '}₪/חודש
            </span>
          </p>
        </div>
      )}
    </article>
  );
}

function Stat({ label, value, suffix }: { label: string; value: string; suffix?: string }) {
  return (
    <div>
      <div className="eyebrow mb-1.5 md:mb-2">{label}</div>
      <div className="flex items-baseline gap-1.5">
        <span className="num-display text-[28px] md:text-[36px] lg:text-[42px] leading-none text-[#1a1c28]" style={{ fontVariationSettings: "'opsz' 72, 'wght' 500, 'SOFT' 30" }}>
          {value}
        </span>
        {suffix && <span className="text-sm md:text-base text-[#8a8695] font-medium">{suffix}</span>}
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
