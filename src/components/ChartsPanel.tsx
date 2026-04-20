import { useState } from 'react';
import {
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Area, ComposedChart,
  Cell, Bar,
} from 'recharts';
import type { SimulationResult, ScenarioConfig, YearResult } from '../lib/types';
import { DetailModal } from './DetailModal';

interface Props {
  result: SimulationResult;
  config: ScenarioConfig;
}

type MetricType = 'monthlyBalance' | 'sustainableIncome' | 'fourPercent' | 'netWorth';

interface MetricConfig {
  label: string;
  nominalKey: string;
  realKey: string;
  color: string;
  colorSecondary?: string;
  gradientId: string;
  isBiColor: boolean;
  description: string;
  emoji: string;
}

const METRICS: Record<MetricType, MetricConfig> = {
  monthlyBalance: {
    label: 'יתרה חודשית',
    nominalKey: 'monthlyBalance',
    realKey: 'realMonthlyBalance',
    color: '#10b981',
    colorSecondary: '#f43f5e',
    gradientId: 'grad-balance',
    isBiColor: true,
    description: 'הכנסה ברת-קיימא פחות הוצאות',
    emoji: '⚖️',
  },
  sustainableIncome: {
    label: 'הכנסה ברת-קיימא',
    nominalKey: 'monthlySustainableIncome',
    realKey: 'realMonthlySustainableIncome',
    color: '#7c3aed',
    gradientId: 'grad-sustain',
    isBiColor: false,
    description: 'הכנסה + 4% + פנסיה',
    emoji: '💎',
  },
  fourPercent: {
    label: '4% מהתיק',
    nominalKey: 'monthly4pctWithdrawal',
    realKey: 'realMonthly4pctWithdrawal',
    color: '#4f46e5',
    gradientId: 'grad-4pct',
    isBiColor: false,
    description: 'משיכה חודשית בת-קיימא',
    emoji: '💰',
  },
  netWorth: {
    label: 'שווי נקי',
    nominalKey: 'netWorth',
    realKey: 'realNetWorth',
    color: '#f59e0b',
    gradientId: 'grad-worth',
    isBiColor: false,
    description: 'תיק + פנסיה + נדל״ן',
    emoji: '🏆',
  },
};

function fmtK(v: number): string {
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
  return String(Math.round(v));
}

function makeChartTooltip(showReal: boolean) {
  return function ChartTooltip({ active, payload }: any) {
    if (!active || !payload?.length) return null;
    const d = payload[0]?.payload;
    if (!d) return null;

    const phaseLabel = d.phase === 'zinuk' ? 'זינוק'
      : d.phase === 'altIncome' ? 'חלופית'
      : 'פרישה';
    const phaseColor = d.phase === 'zinuk' ? 'bg-indigo-100 text-indigo-700'
      : d.phase === 'altIncome' ? 'bg-emerald-100 text-emerald-700'
      : 'bg-amber-100 text-amber-700';

    // Pick primary / secondary value based on toggle
    const pick = (nominal: number | undefined, real: number | undefined) =>
      showReal ? (real ?? 0) : (nominal ?? 0);
    const pickSecondary = (nominal: number | undefined, real: number | undefined) =>
      showReal ? (nominal ?? 0) : (real ?? 0);

    const primaryLabel = showReal ? 'בערכי היום' : 'נומינלי';
    const secondaryLabel = showReal ? 'נומינלי' : 'בערכי היום';

    const balance = pick(d.monthlyBalance, d.real?.monthlyBalance);
    const balanceSecondary = pickSecondary(d.monthlyBalance, d.real?.monthlyBalance);

    return (
      <div className="widget-card-static p-4 md:p-5 shadow-2xl max-w-[92vw] md:min-w-[340px]" dir="rtl" style={{ background: 'rgba(255, 255, 255, 0.95)' }}>
        <div className="flex items-start justify-between mb-3 pb-3 border-b border-white/60">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="font-display num text-xl md:text-2xl font-extrabold text-slate-900">{d.calendarYear ?? d.age}</span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{primaryLabel}</span>
            </div>
            <div className="flex items-center gap-3 text-[11px] mt-1 text-slate-600">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                יותם · <span className="num font-semibold">{d.yotamAge ?? d.age}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-pink-500" />
                הדס · <span className="num font-semibold">{d.hadasAge ?? '—'}</span>
              </span>
            </div>
          </div>
          <span className={`text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${phaseColor}`}>
            {phaseLabel}
          </span>
        </div>

        <div className="space-y-1.5 text-sm">
          {d.phase === 'zinuk' && d.monthlyZinukIncome > 0 && (
            <RowDual label="הכנסה מזינוק" nominal={d.monthlyZinukIncome} showReal={showReal} infl={d.real?.monthly4pctWithdrawal && d.monthly4pctWithdrawal ? d.real.monthly4pctWithdrawal / d.monthly4pctWithdrawal : 1} dotColor="bg-indigo-500" />
          )}
          {d.phase === 'altIncome' && d.monthlyAltIncome > 0 && (
            <RowDual label="הכנסה חלופית" nominal={d.monthlyAltIncome} showReal={showReal} infl={d.real?.monthly4pctWithdrawal && d.monthly4pctWithdrawal ? d.real.monthly4pctWithdrawal / d.monthly4pctWithdrawal : 1} dotColor="bg-emerald-500" />
          )}
          <RowDual label="4% מהתיק" nominal={d.monthly4pctWithdrawal} real={d.real?.monthly4pctWithdrawal} showReal={showReal} dotColor="bg-indigo-600" />
          {d.monthlyPensionIncome > 0 && (
            <RowDual label="קצבת פנסיה" nominal={d.monthlyPensionIncome} showReal={showReal} infl={d.real?.monthly4pctWithdrawal && d.monthly4pctWithdrawal ? d.real.monthly4pctWithdrawal / d.monthly4pctWithdrawal : 1} dotColor="bg-amber-500" />
          )}
        </div>

        <div className="mt-3 pt-3 border-t border-white/60 space-y-1.5 text-sm">
          <RowDual label="סה״כ ברת-קיימא" nominal={d.monthlySustainableIncome} real={d.real?.monthlySustainableIncome} showReal={showReal} highlight dotColor="bg-violet-500" />
          <RowDual label="הוצאות" nominal={d.monthlyExpenses} showReal={showReal} infl={d.real?.monthly4pctWithdrawal && d.monthly4pctWithdrawal ? d.real.monthly4pctWithdrawal / d.monthly4pctWithdrawal : 1} highlight dotColor="bg-rose-500" />
        </div>

        <div className={`mt-3 pt-3 border-t-2 ${balance >= 0 ? 'border-emerald-200' : 'border-rose-200'}`}>
          <div className="flex items-baseline justify-between">
            <span className="font-display text-base md:text-lg font-extrabold text-slate-900">יתרה חודשית</span>
            <span className={`num font-display text-xl md:text-2xl font-extrabold ${balance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {balance >= 0 ? '+' : ''}{balance.toLocaleString('he-IL')} ₪
            </span>
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{secondaryLabel}</span>
            <span className={`num text-xs font-semibold ${balanceSecondary >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
              {balanceSecondary >= 0 ? '+' : ''}{balanceSecondary.toLocaleString('he-IL')} ₪
            </span>
          </div>
        </div>

        {/* Portfolio breakdown */}
        <div className="mt-4 pt-3 border-t border-white/60">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
            שווי נקי · <span className="num text-slate-900">{pick(d.netWorth, d.real?.netWorth).toLocaleString('he-IL')} ₪</span>
            <span className="text-[10px] text-slate-400 font-normal mr-1">({primaryLabel})</span>
          </p>
          <div className="space-y-2">
            <PortfolioBar label="השקעות" value={pick(d.liquidPortfolio, d.real?.liquidPortfolio)} color="indigo" total={pick(d.netWorth, d.real?.netWorth)} />
            {d.homeEquity > 0 && <PortfolioBar label="נדל״ן" value={pick(d.homeEquity, d.real?.homeEquity)} color="emerald" total={pick(d.netWorth, d.real?.netWorth)} />}
            {d.pension > 0 && <PortfolioBar label="פנסיה" value={pick(d.pension, d.real?.pension)} color="amber" total={pick(d.netWorth, d.real?.netWorth)} />}
          </div>
        </div>
      </div>
    );
  };
}

/** Row with primary value + small secondary (opposite mode) */
function RowDual({ label, nominal, real, showReal, infl, highlight, dotColor }: {
  label: string;
  nominal: number;
  real?: number;
  infl?: number;    // inflation ratio for deriving real when not stored
  showReal: boolean;
  highlight?: boolean;
  dotColor: string;
}) {
  const realValue = real ?? (infl != null ? Math.round(nominal * infl) : nominal);
  const primary = showReal ? realValue : nominal;
  const secondary = showReal ? nominal : realValue;

  return (
    <div className="flex items-center justify-between gap-3">
      <span className="flex items-center gap-2">
        <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
        <span className={highlight ? 'font-semibold text-slate-800' : 'text-slate-600'}>{label}</span>
      </span>
      <span className="text-left">
        <span className="num font-bold text-slate-900 block leading-tight" style={{ fontVariantNumeric: 'tabular-nums' }}>
          {primary.toLocaleString('he-IL')} ₪
        </span>
        <span className="num text-[10px] text-slate-400 leading-tight" style={{ fontVariantNumeric: 'tabular-nums' }}>
          {secondary.toLocaleString('he-IL')} ₪
        </span>
      </span>
    </div>
  );
}

function PortfolioBar({ label, value, color, total }: { label: string; value: number; color: string; total: number }) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex-shrink-0 w-14 text-xs font-semibold text-slate-600">{label}</span>
      <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
        <div className={`h-full rounded-full progress-${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="num flex-shrink-0 w-20 text-left text-xs font-bold text-slate-800" style={{ fontVariantNumeric: 'tabular-nums' }}>
        {fmtK(value)} ₪
      </span>
    </div>
  );
}

function AvatarCursor(props: any) {
  const { x, width, height, points } = props;
  let cx: number;
  if (points?.length) cx = points[0].x;
  else if (x != null) cx = x + (width || 0) / 2;
  else return null;

  const r = 16;
  const chartHeight = (height || 380);
  const avatarY = chartHeight - 8;
  const clipId = `av-${Math.round(cx)}`;

  return (
    <svg style={{ overflow: 'visible' }}>
      <defs>
        <clipPath id={clipId}>
          <circle cx={cx} cy={avatarY} r={r} />
        </clipPath>
        <linearGradient id={`brd-${Math.round(cx)}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#4f46e5" />
          <stop offset="50%" stopColor="#7c3aed" />
          <stop offset="100%" stopColor="#ec4899" />
        </linearGradient>
      </defs>
      <line x1={cx} y1={12} x2={cx} y2={avatarY - r - 4} stroke="url(#avatar-line-grad)" strokeWidth={1.5} strokeDasharray="4 4" opacity="0.6" />
      <circle cx={cx} cy={avatarY} r={r + 3} fill="white" />
      <image
        href={`${import.meta.env.BASE_URL}profile-small.jpeg`}
        x={cx - r} y={avatarY - r}
        width={r * 2} height={r * 2}
        clipPath={`url(#${clipId})`}
        preserveAspectRatio="xMidYMid slice"
      />
      <circle cx={cx} cy={avatarY} r={r + 1} fill="none" stroke={`url(#brd-${Math.round(cx)})`} strokeWidth={2.5} />
    </svg>
  );
}

export function ChartsPanel({ result, config }: Props) {
  const [metric, setMetric] = useState<MetricType>('monthlyBalance');
  const [showReal, setShowReal] = useState(false);
  const [selectedYear, setSelectedYear] = useState<YearResult | null>(null);

  const data = result.years.map(y => ({
    ...y,
    realMonthlyBalance: y.real.monthlyBalance,
    realMonthlySustainableIncome: y.real.monthlySustainableIncome,
    realMonthly4pctWithdrawal: y.real.monthly4pctWithdrawal,
    realNetWorth: y.real.netWorth,
  }));
  const retAge = result.earliestRetirementAge;
  const metricCfg = METRICS[metric];
  const dataKey = showReal ? metricCfg.realKey : metricCfg.nominalKey;

  return (
    <div className="widget-card-static p-5 md:p-8">
      {/* Hidden SVG defs for line gradient */}
      <svg width="0" height="0" className="absolute">
        <defs>
          <linearGradient id="avatar-line-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4f46e5" />
            <stop offset="100%" stopColor="#ec4899" />
          </linearGradient>
        </defs>
      </svg>

      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-5">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">{metricCfg.emoji}</span>
            <h3 className="font-display text-xl md:text-2xl lg:text-3xl font-extrabold text-slate-900 leading-tight">
              {metricCfg.label}
              {showReal && <span className="text-slate-400 font-bold text-base md:text-lg"> · ערכי היום</span>}
            </h3>
          </div>
          <p className="text-sm text-slate-500 font-medium">{metricCfg.description}</p>
        </div>

        {/* Real/Nominal toggle */}
        <button
          onClick={() => setShowReal(!showReal)}
          className="flex items-center gap-2 btn-glass px-3 md:px-4 py-2 text-xs md:text-sm"
        >
          <span className={`relative w-9 h-5 rounded-full transition-colors ${showReal ? 'bg-gradient-to-r from-indigo-500 to-violet-500' : 'bg-slate-300'}`}>
            <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${showReal ? 'right-0.5' : 'right-[18px]'}`} />
          </span>
          <span className="font-semibold text-slate-700">{showReal ? 'ריאלי' : 'נומינלי'}</span>
        </button>
      </div>

      {/* Metric tabs */}
      <div className="flex flex-wrap gap-2 mb-6 p-1 bg-white/40 rounded-2xl">
        {(Object.keys(METRICS) as MetricType[]).map(m => (
          <button
            key={m}
            onClick={() => setMetric(m)}
            className={`flex-1 min-w-[90px] md:min-w-[120px] px-3 md:px-4 py-2 md:py-2.5 rounded-xl text-sm md:text-[15px] font-bold transition-all duration-200 cursor-pointer ${
              metric === m
                ? 'bg-white text-slate-900 shadow-lg shadow-indigo-500/10'
                : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
            }`}
          >
            <span className="ml-1">{METRICS[m].emoji}</span>
            {METRICS[m].label}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div className="w-full">
        <ResponsiveContainer width="100%" height={420}>
          <ComposedChart
            data={data}
            margin={{ top: 30, right: 0, left: 0, bottom: 0 }}
            onClick={(e: any) => {
              if (e?.activePayload?.[0]?.payload) {
                const clicked = e.activePayload[0].payload as YearResult;
                setSelectedYear(clicked);
              }
            }}
            style={{ cursor: 'pointer' }}
          >
            <defs>
              <linearGradient id={metricCfg.gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={metricCfg.color} stopOpacity={0.35} />
                <stop offset="100%" stopColor={metricCfg.color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="2 4" stroke="rgba(79, 70, 229, 0.08)" vertical={false} />
            <XAxis
              dataKey="calendarYear"
              tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => fmtK(v)}
              width={60}
              mirror
              domain={[
                (dataMin: number) => Math.min(0, dataMin * 1.1),
                (dataMax: number) => Math.max(0, dataMax * 1.05),
              ]}
            />
            <Tooltip content={makeChartTooltip(showReal) as any} cursor={<AvatarCursor />} />

            <ReferenceLine y={0} stroke="#94a3b8" strokeWidth={1.5} opacity={0.5} />

            {(() => {
              const startY = config.simulationStartYear ?? 2026;
              const zinukYear = startY + (config.zinukEndAge - config.startAge);
              const fullRetYear = startY + (config.fullRetirementAge - config.startAge);
              const retYear = retAge != null ? startY + (retAge - config.startAge) : null;
              return (
                <>
                  <ReferenceLine
                    x={zinukYear}
                    stroke="#4f46e5"
                    strokeWidth={2}
                    strokeDasharray="6 4"
                    label={{ value: `סגירת זינוק (${zinukYear})`, position: 'top', fontSize: 12, fill: '#4f46e5', fontWeight: 700 }}
                  />
                  {config.fullRetirementAge <= config.endAge && (
                    <ReferenceLine
                      x={fullRetYear}
                      stroke="#f59e0b"
                      strokeWidth={2}
                      strokeDasharray="6 4"
                      label={{ value: `פרישה מלאה (${fullRetYear})`, position: 'top', fontSize: 12, fill: '#f59e0b', fontWeight: 700 }}
                    />
                  )}
                  {retYear != null && metric === 'monthlyBalance' && (
                    <ReferenceLine
                      x={retYear}
                      stroke="#10b981"
                      strokeWidth={2.5}
                      strokeDasharray="4 3"
                      label={{ value: `נקודת איזון (${retYear})`, position: 'insideTopLeft', fontSize: 12, fill: '#10b981', fontWeight: 800 }}
                    />
                  )}
                </>
              );
            })()}

            <Area type="monotone" dataKey={dataKey} fill={`url(#${metricCfg.gradientId})`} stroke="none" />
            <Bar dataKey={dataKey} radius={[6, 6, 0, 0]}>
              {data.map((entry, i) => {
                const value = (entry as any)[dataKey] ?? 0;
                const fill = metricCfg.isBiColor
                  ? (value >= 0 ? metricCfg.color : metricCfg.colorSecondary || '#f43f5e')
                  : metricCfg.color;
                return <Cell key={i} fill={fill} fillOpacity={0.85} />;
              })}
            </Bar>
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="mt-4 pt-4 border-t border-white/60 flex flex-wrap items-center justify-between gap-3 text-xs md:text-sm text-slate-600 font-medium">
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          <LegendItem color="#4f46e5">סגירת זינוק</LegendItem>
          <LegendItem color="#f59e0b">פרישה מלאה</LegendItem>
          {metric === 'monthlyBalance' && <LegendItem color="#10b981">נקודת איזון</LegendItem>}
        </div>
        <span className="text-[11px] md:text-xs text-slate-400 italic">💡 לחץ על נקודה בגרף לפירוט מלא</span>
      </div>

      {/* Detail modal */}
      {selectedYear && (
        <DetailModal year={selectedYear} config={config} onClose={() => setSelectedYear(null)} />
      )}
    </div>
  );
}

function LegendItem({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-2">
      <svg width="20" height="3">
        <line x1="0" y1="1.5" x2="20" y2="1.5" stroke={color} strokeWidth="2" strokeDasharray="4 3" />
      </svg>
      <span className="font-semibold">{children}</span>
    </span>
  );
}
