import { useState } from 'react';
import {
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Area, ComposedChart,
  Cell, Bar,
} from 'recharts';
import type { SimulationResult, ScenarioConfig } from '../lib/types';

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
  isBiColor: boolean;
  description: string;
}

// Palette tied to parchment/ink theme
const METRICS: Record<MetricType, MetricConfig> = {
  monthlyBalance: {
    label: 'יתרה חודשית',
    nominalKey: 'monthlyBalance',
    realKey: 'realMonthlyBalance',
    color: '#3d6e5c',      // sage (positive)
    colorSecondary: '#8a2d3a', // burgundy (negative)
    isBiColor: true,
    description: 'הכנסה ברת-קיימא פחות הוצאות',
  },
  sustainableIncome: {
    label: 'הכנסה ברת-קיימא',
    nominalKey: 'monthlySustainableIncome',
    realKey: 'realMonthlySustainableIncome',
    color: '#3a2e5c',      // plum
    isBiColor: false,
    description: 'הכנסה + 4% מהתיק + קצבת פנסיה',
  },
  fourPercent: {
    label: '4% מהתיק',
    nominalKey: 'monthly4pctWithdrawal',
    realKey: 'realMonthly4pctWithdrawal',
    color: '#4a5a8a',      // indigo ink
    isBiColor: false,
    description: 'משיכה חודשית בת-קיימא',
  },
  netWorth: {
    label: 'שווי נקי',
    nominalKey: 'netWorth',
    realKey: 'realNetWorth',
    color: '#a68a4d',      // brass
    isBiColor: false,
    description: 'תיק נזיל + פנסיה + הון בנדל״ן',
  },
};

function fmtK(v: number): string {
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
  return String(Math.round(v));
}

function ChartTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;

  const phaseLabel = d.phase === 'zinuk' ? 'זינוק'
    : d.phase === 'altIncome' ? 'הכנסה חלופית'
    : 'פרישה מלאה';
  const phaseColor = d.phase === 'zinuk' ? 'text-[#4a5a8a]'
    : d.phase === 'altIncome' ? 'text-[#3d6e5c]'
    : 'text-[#a68a4d]';

  return (
    <div className="ledger-card px-4 py-4 md:px-5 md:py-5 text-sm md:text-base shadow-xl max-w-[92vw] md:min-w-[340px]" dir="rtl" style={{ background: '#fdfaf2' }}>
      <div className="flex items-baseline justify-between mb-3 pb-2 border-b border-[#e8dfc8]">
        <div className="flex items-baseline gap-2">
          <span className="eyebrow">גיל</span>
          <span className="serif num text-xl md:text-2xl font-medium text-[#1a1c28]">{d.age}</span>
        </div>
        <span className={`eyebrow !text-current ${phaseColor}`}>{phaseLabel}</span>
      </div>

      <div className="space-y-1.5">
        {d.phase === 'zinuk' && d.monthlyZinukIncome > 0 && (
          <Row label="הכנסה מזינוק" value={d.monthlyZinukIncome} />
        )}
        {d.phase === 'altIncome' && d.monthlyAltIncome > 0 && (
          <Row label="הכנסה חלופית" value={d.monthlyAltIncome} />
        )}
        <Row label="4% מהתיק" value={d.monthly4pctWithdrawal} />
        {d.monthlyPensionIncome > 0 && (
          <Row label="קצבת פנסיה" value={d.monthlyPensionIncome} />
        )}
      </div>

      <div className="mt-3 pt-2 border-t border-[#e8dfc8] space-y-1.5">
        <Row label="סה״כ ברת-קיימא" value={d.monthlySustainableIncome} highlight color="text-[#3a2e5c]" />
        <Row label="הוצאות" value={d.monthlyExpenses} highlight color="text-[#8a2d3a]" />
      </div>

      <div className="mt-3 pt-3 border-t-2 border-[#c9bd9e]">
        <div className="flex items-baseline justify-between">
          <span className="serif text-base md:text-lg font-medium text-[#1a1c28]">יתרה</span>
          <span className={`num serif text-xl md:text-2xl font-semibold ${d.monthlyBalance >= 0 ? 'text-[#3d6e5c]' : 'text-[#8a2d3a]'}`}>
            {d.monthlyBalance >= 0 ? '+' : ''}{d.monthlyBalance?.toLocaleString('he-IL')} ₪
          </span>
        </div>
        <div className="flex items-baseline justify-between mt-1">
          <span className="eyebrow">בערכי היום</span>
          <span className={`num text-sm font-medium ${d.real?.monthlyBalance >= 0 ? 'text-[#3d6e5c]' : 'text-[#8a2d3a]'}`}>
            {d.real?.monthlyBalance >= 0 ? '+' : ''}{(d.real?.monthlyBalance || 0).toLocaleString('he-IL')} ₪
          </span>
        </div>
      </div>

      {/* Portfolio breakdown */}
      <div className="mt-4 pt-3 border-t border-[#e8dfc8]">
        <p className="eyebrow mb-2">התפלגות תיק · {d.netWorth?.toLocaleString('he-IL')} ₪</p>
        <div className="space-y-1 text-xs md:text-sm">
          <PortfolioRow label="השקעות" value={d.liquidPortfolio} color="#4a5a8a" total={d.netWorth} />
          {d.homeEquity > 0 && <PortfolioRow label="נדל״ן" value={d.homeEquity} color="#3d6e5c" total={d.netWorth} />}
          {d.pension > 0 && <PortfolioRow label="פנסיה" value={d.pension} color="#a68a4d" total={d.netWorth} />}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, highlight = false, color }: { label: string; value: number; highlight?: boolean; color?: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <span className={`${highlight ? 'font-semibold' : 'text-[#4a4755]'} ${color || ''}`}>{label}</span>
      <span className={`num font-medium ${color || 'text-[#1a1c28]'}`} style={{ fontVariantNumeric: 'tabular-nums' }}>
        {value?.toLocaleString('he-IL')} ₪
      </span>
    </div>
  );
}

function PortfolioRow({ label, value, color, total }: { label: string; value: number; color: string; total: number }) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <div className="flex items-center gap-2">
      <span className="flex-shrink-0 w-16 text-[#4a4755]">{label}</span>
      <div className="flex-1 h-1 bg-[#f4ede0] rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="num flex-shrink-0 w-24 text-left font-medium text-[#1a1c28]" style={{ fontVariantNumeric: 'tabular-nums' }}>
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

  const r = 14;
  const chartHeight = (height || 380);
  const avatarY = chartHeight - 6;
  const clipId = `av-clip-${Math.round(cx)}`;

  return (
    <svg style={{ overflow: 'visible' }}>
      <defs>
        <clipPath id={clipId}>
          <circle cx={cx} cy={avatarY} r={r} />
        </clipPath>
      </defs>
      <line x1={cx} y1={10} x2={cx} y2={avatarY - r - 3} stroke="#a68a4d" strokeWidth={1} strokeDasharray="3 3" opacity="0.6" />
      <circle cx={cx} cy={avatarY} r={r + 2} fill="#fdfaf2" />
      <image
        href={`${import.meta.env.BASE_URL}profile-small.jpeg`}
        x={cx - r} y={avatarY - r}
        width={r * 2} height={r * 2}
        clipPath={`url(#${clipId})`}
        preserveAspectRatio="xMidYMid slice"
      />
      <circle cx={cx} cy={avatarY} r={r + 1} fill="none" stroke="#a68a4d" strokeWidth={2} />
    </svg>
  );
}

export function ChartsPanel({ result, config }: Props) {
  const [metric, setMetric] = useState<MetricType>('monthlyBalance');
  const [showReal, setShowReal] = useState(false);

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
    <div className="ledger-card px-5 md:px-8 py-5 md:py-8 fade-rise">
      {/* Header */}
      <div className="pb-5 md:pb-6 border-b-2 border-[#e8dfc8] mb-5 md:mb-6">
        <div className="flex items-start justify-between gap-3 mb-4 md:mb-5">
          <div>
            <p className="eyebrow mb-1">לוח בקרה</p>
            <h2 className="serif text-xl md:text-2xl lg:text-3xl font-medium text-[#1a1c28] leading-tight">
              {metricCfg.label}
              {showReal && <span className="text-[#8a8695] italic text-base md:text-lg font-normal"> · בערכי היום</span>}
            </h2>
            <p className="text-sm text-[#4a4755] mt-1">{metricCfg.description}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="eyebrow hidden md:inline">ערכים</span>
            <button
              onClick={() => setShowReal(!showReal)}
              className={`relative w-11 h-6 rounded-full transition-colors ${showReal ? 'bg-[#a68a4d]' : 'bg-[#d9cfba]'}`}
            >
              <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-[#fdfaf2] shadow-sm transition-all ${showReal ? 'right-0.5' : 'right-5'}`} />
            </button>
            <span className="text-xs md:text-sm font-medium text-[#4a4755] w-14">
              {showReal ? 'היום' : 'נומינלי'}
            </span>
          </div>
        </div>

        {/* Metric tabs */}
        <div className="flex flex-wrap gap-x-1 gap-y-2">
          {(Object.keys(METRICS) as MetricType[]).map(m => (
            <button
              key={m}
              onClick={() => setMetric(m)}
              className={`px-3 md:px-4 py-1.5 text-sm md:text-[15px] font-medium transition-all duration-200 cursor-pointer border-b-2 -mb-0.5 ${
                metric === m
                  ? 'text-[#1a1c28] border-[#a68a4d]'
                  : 'text-[#8a8695] border-transparent hover:text-[#4a4755] hover:border-[#d9cfba]'
              }`}
            >
              {METRICS[m].label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={420}>
        <ComposedChart data={data} margin={{ top: 20, right: 10, left: 10, bottom: 0 }}>
          <defs>
            <linearGradient id="metricGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={metricCfg.color} stopOpacity={0.2} />
              <stop offset="100%" stopColor={metricCfg.color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="1 4" stroke="rgba(26, 28, 40, 0.1)" />
          <XAxis
            dataKey="age"
            tick={{ fontSize: 12, fill: '#8a8695', fontFamily: 'JetBrains Mono' }}
            tickLine={false}
            axisLine={{ stroke: '#d9cfba' }}
          />
          <YAxis
            tick={{ fontSize: 12, fill: '#8a8695', fontFamily: 'JetBrains Mono' }}
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
          <Tooltip content={<ChartTooltip />} cursor={<AvatarCursor />} />

          <ReferenceLine y={0} stroke="#1a1c28" strokeWidth={1} opacity={0.3} />

          <ReferenceLine
            x={config.zinukEndAge}
            stroke="#4a5a8a"
            strokeWidth={1}
            strokeDasharray="2 4"
            label={{ value: `סגירת זינוק (${config.zinukEndAge})`, position: 'top', fontSize: 11, fill: '#4a5a8a', fontWeight: 600 }}
          />
          {config.fullRetirementAge <= config.endAge && (
            <ReferenceLine
              x={config.fullRetirementAge}
              stroke="#a68a4d"
              strokeWidth={1}
              strokeDasharray="2 4"
              label={{ value: `פרישה מלאה (${config.fullRetirementAge})`, position: 'top', fontSize: 11, fill: '#a68a4d', fontWeight: 600 }}
            />
          )}
          {retAge && metric === 'monthlyBalance' && (
            <ReferenceLine
              x={retAge}
              stroke="#3d6e5c"
              strokeWidth={1.5}
              strokeDasharray="1 3"
              label={{ value: `נקודת איזון (${retAge})`, position: 'insideTopLeft', fontSize: 11, fill: '#3d6e5c', fontWeight: 700 }}
            />
          )}

          <Area type="monotone" dataKey={dataKey} fill="url(#metricGrad)" stroke="none" />
          <Bar dataKey={dataKey} radius={[2, 2, 0, 0]}>
            {data.map((entry, i) => {
              const value = (entry as any)[dataKey] ?? 0;
              const fill = metricCfg.isBiColor
                ? (value >= 0 ? metricCfg.color : metricCfg.colorSecondary || '#8a2d3a')
                : metricCfg.color;
              return <Cell key={i} fill={fill} fillOpacity={0.85} />;
            })}
          </Bar>
        </ComposedChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="mt-4 md:mt-5 pt-4 md:pt-5 border-t border-[#e8dfc8] flex flex-wrap gap-x-6 gap-y-2 text-xs md:text-sm text-[#4a4755]">
        <LegendItem color="#4a5a8a" dashed>סגירת זינוק</LegendItem>
        <LegendItem color="#a68a4d" dashed>פרישה מלאה</LegendItem>
        {metric === 'monthlyBalance' && <LegendItem color="#3d6e5c" dashed>נקודת איזון</LegendItem>}
      </div>
    </div>
  );
}

function LegendItem({ color, dashed, children }: { color: string; dashed?: boolean; children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-2">
      <svg width="20" height="3">
        <line x1="0" y1="1.5" x2="20" y2="1.5" stroke={color} strokeWidth="1.5" strokeDasharray={dashed ? '2 3' : undefined} />
      </svg>
      {children}
    </span>
  );
}
