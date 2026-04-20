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
  shortLabel: string;
  nominalKey: string;
  realKey: string;
  color: string;
  colorSecondary?: string; // for bi-color (balance)
  isBiColor: boolean;
  description: string;
}

const METRICS: Record<MetricType, MetricConfig> = {
  monthlyBalance: {
    label: 'יתרה חודשית',
    shortLabel: 'יתרה',
    nominalKey: 'monthlyBalance',
    realKey: 'realMonthlyBalance',
    color: '#10b981',
    colorSecondary: '#f43f5e',
    isBiColor: true,
    description: 'הכנסה ברת-קיימא פחות הוצאות',
  },
  sustainableIncome: {
    label: 'סה״כ הכנסה ברת-קיימא',
    shortLabel: 'הכנסה',
    nominalKey: 'monthlySustainableIncome',
    realKey: 'realMonthlySustainableIncome',
    color: '#7c3aed',
    isBiColor: false,
    description: 'הכנסה בפועל + 4% מהתיק + קצבת פנסיה',
  },
  fourPercent: {
    label: '4% מהתיק',
    shortLabel: '4%',
    nominalKey: 'monthly4pctWithdrawal',
    realKey: 'realMonthly4pctWithdrawal',
    color: '#4f46e5',
    isBiColor: false,
    description: 'משיכה חודשית בת-קיימא של 4% שנתי מהתיק הנזיל',
  },
  netWorth: {
    label: 'שווי נקי',
    shortLabel: 'שווי',
    nominalKey: 'netWorth',
    realKey: 'realNetWorth',
    color: '#f59e0b',
    isBiColor: false,
    description: 'תיק נזיל + פנסיה נעולה + הון עצמי בנדל״ן',
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

  const phaseLabel = d.phase === 'zinuk' ? 'הכנסה מזינוק' : d.phase === 'altIncome' ? 'הכנסה חלופית' : 'פרישה מלאה';

  return (
    <div className="glass-card p-3 md:p-5 text-sm md:text-base lg:text-lg shadow-xl !rounded-xl max-w-[90vw] md:min-w-[320px]" dir="rtl">
      <div className="flex justify-between items-center mb-3">
        <span className="font-bold text-slate-800 text-lg md:text-xl">גיל {d.age}</span>
        <span className={`text-sm md:text-base font-semibold px-3 py-1 rounded-full ${
          d.phase === 'zinuk' ? 'bg-indigo-100 text-indigo-700' :
          d.phase === 'altIncome' ? 'bg-emerald-100 text-emerald-700' :
          'bg-amber-100 text-amber-700'
        }`}>{phaseLabel}</span>
      </div>
      <div className="space-y-2">
        {d.phase === 'zinuk' && d.monthlyZinukIncome > 0 && (
          <div className="flex justify-between">
            <span className="text-slate-500">הכנסה מזינוק</span>
            <span className="num font-bold">{d.monthlyZinukIncome?.toLocaleString('he-IL')} ₪</span>
          </div>
        )}
        {d.phase === 'altIncome' && d.monthlyAltIncome > 0 && (
          <div className="flex justify-between">
            <span className="text-slate-500">הכנסה חלופית</span>
            <span className="num font-bold">{d.monthlyAltIncome?.toLocaleString('he-IL')} ₪</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-slate-500">4% מהתיק</span>
          <span className="num font-bold">{d.monthly4pctWithdrawal?.toLocaleString('he-IL')} ₪</span>
        </div>
        {d.monthlyPensionIncome > 0 && (
          <div className="flex justify-between">
            <span className="text-slate-500">קצבת פנסיה</span>
            <span className="num font-bold">{d.monthlyPensionIncome?.toLocaleString('he-IL')} ₪</span>
          </div>
        )}
        <div className="flex justify-between border-t border-slate-200 pt-2">
          <span className="text-violet-600 font-semibold">סה״כ הכנסה ברת-קיימא</span>
          <span className="num font-bold text-violet-600">{d.monthlySustainableIncome?.toLocaleString('he-IL')} ₪</span>
        </div>
        <div className="flex justify-between">
          <span className="text-rose-500 font-semibold">הוצאות חודשיות</span>
          <span className="num font-bold text-rose-500">{d.monthlyExpenses?.toLocaleString('he-IL')} ₪</span>
        </div>
        <div className={`flex justify-between border-t border-slate-200 pt-2 text-lg md:text-xl ${d.monthlyBalance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
          <span className="font-bold">יתרה חודשית</span>
          <span className="num font-black">{d.monthlyBalance >= 0 ? '+' : ''}{d.monthlyBalance?.toLocaleString('he-IL')} ₪</span>
        </div>
        <div className="flex justify-between text-sm text-slate-400">
          <span>בערכים של היום</span>
          <span className="num font-semibold">{d.real?.monthlyBalance >= 0 ? '+' : ''}{(d.real?.monthlyBalance || 0).toLocaleString('he-IL')} ₪</span>
        </div>
      </div>
      <div className="border-t border-slate-200 mt-3 pt-3">
        <p className="text-sm lg:text-base font-bold text-slate-500 mb-2">התפלגות תיק (נומינלי)</p>
        <div className="space-y-1.5 text-sm lg:text-base">
          <div className="flex justify-between">
            <span className="text-indigo-600 font-medium">השקעות (נזיל)</span>
            <span className="num font-bold text-indigo-700">{d.liquidPortfolio?.toLocaleString('he-IL')} ₪</span>
          </div>
          {d.homeEquity > 0 && (
            <div className="flex justify-between">
              <span className="text-emerald-600 font-medium">נדל״ן (הון עצמי)</span>
              <span className="num font-bold text-emerald-700">{d.homeEquity?.toLocaleString('he-IL')} ₪</span>
            </div>
          )}
          {d.pension > 0 && (
            <div className="flex justify-between">
              <span className="text-amber-600 font-medium">פנסיה (נעולה)</span>
              <span className="num font-bold text-amber-700">{d.pension?.toLocaleString('he-IL')} ₪</span>
            </div>
          )}
          <div className="flex justify-between border-t border-slate-100 pt-1.5">
            <span className="text-slate-700 font-bold">שווי נקי</span>
            <span className="num font-black text-slate-800">{d.netWorth?.toLocaleString('he-IL')} ₪</span>
          </div>
        </div>
      </div>
      {d.real && (
        <div className="border-t border-slate-200 mt-3 pt-3">
          <p className="text-sm lg:text-base font-bold text-slate-400 mb-2">בערכים של היום (ריאלי)</p>
          <div className="space-y-1.5 text-sm lg:text-base text-slate-500">
            <div className="flex justify-between">
              <span>השקעות</span>
              <span className="num font-semibold">{d.real.liquidPortfolio?.toLocaleString('he-IL')} ₪</span>
            </div>
            {d.real.homeEquity > 0 && (
              <div className="flex justify-between">
                <span>נדל״ן</span>
                <span className="num font-semibold">{d.real.homeEquity?.toLocaleString('he-IL')} ₪</span>
              </div>
            )}
            {d.real.pension > 0 && (
              <div className="flex justify-between">
                <span>פנסיה</span>
                <span className="num font-semibold">{d.real.pension?.toLocaleString('he-IL')} ₪</span>
              </div>
            )}
            <div className="flex justify-between border-t border-slate-100 pt-1.5">
              <span className="font-bold text-slate-600">שווי נקי ריאלי</span>
              <span className="num font-bold text-slate-700">{d.real.netWorth?.toLocaleString('he-IL')} ₪</span>
            </div>
            {d.real.monthly4pctWithdrawal > 0 && (
              <div className="flex justify-between">
                <span>4% חודשי</span>
                <span className="num font-semibold">{d.real.monthly4pctWithdrawal?.toLocaleString('he-IL')} ₪</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function AvatarCursor(props: any) {
  const { x, width, height, points } = props;

  let cx: number;
  if (points?.length) {
    cx = points[0].x;
  } else if (x != null) {
    cx = x + (width || 0) / 2;
  } else {
    return null;
  }

  const r = 16;
  const chartHeight = (height || 380);
  const avatarY = chartHeight - 8;
  const clipId = `av-clip-${Math.round(cx)}`;

  return (
    <svg style={{ overflow: 'visible' }}>
      <defs>
        <clipPath id={clipId}>
          <circle cx={cx} cy={avatarY} r={r} />
        </clipPath>
      </defs>
      <line x1={cx} y1={10} x2={cx} y2={avatarY - r - 4} stroke="rgba(99,102,241,0.3)" strokeWidth={1.5} strokeDasharray="5 3" />
      <circle cx={cx} cy={avatarY} r={r + 2.5} fill="white" />
      <image
        href={`${import.meta.env.BASE_URL}profile-small.jpeg`}
        x={cx - r} y={avatarY - r}
        width={r * 2} height={r * 2}
        clipPath={`url(#${clipId})`}
        preserveAspectRatio="xMidYMid slice"
      />
      <circle cx={cx} cy={avatarY} r={r + 1} fill="none" stroke="#7c3aed" strokeWidth={2.5} />
    </svg>
  );
}

/** Resolve a nested dot-notation key from an object */
function resolveKey(obj: any, key: string): number {
  return key.split('.').reduce((acc, k) => acc?.[k], obj) ?? 0;
}

export function ChartsPanel({ result, config }: Props) {
  const [metric, setMetric] = useState<MetricType>('monthlyBalance');
  const [showReal, setShowReal] = useState(false);

  // Flatten real values so Recharts dataKey can find them (no dot-notation support)
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
    <div className="glass-card p-5 md:p-8">
      {/* ─── Metric selector ─── */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 mb-4 md:mb-6">
        <div className="flex flex-wrap gap-2">
          {(Object.keys(METRICS) as MetricType[]).map(m => (
            <button
              key={m}
              onClick={() => setMetric(m)}
              className={`px-3 md:px-4 py-1.5 md:py-2 rounded-xl text-sm md:text-base font-semibold transition-all duration-200 cursor-pointer ${
                metric === m
                  ? 'bg-gradient-to-l from-indigo-600 to-violet-500 text-white shadow-lg shadow-indigo-600/20'
                  : 'bg-white/40 text-slate-600 hover:bg-white/70 border border-white/50'
              }`}
            >
              {METRICS[m].label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowReal(!showReal)}
          className={`px-3 md:px-4 py-1.5 md:py-2 rounded-xl text-sm md:text-base font-semibold transition-all duration-200 cursor-pointer flex items-center gap-2 ${
            showReal
              ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
              : 'bg-white/40 text-slate-600 hover:bg-white/70 border border-white/50'
          }`}
        >
          <span className={`w-8 h-4 rounded-full relative transition-colors ${showReal ? 'bg-white/40' : 'bg-slate-300'}`}>
            <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${showReal ? 'right-0.5' : 'right-4'}`}></span>
          </span>
          {showReal ? 'ערכי היום' : 'ערכים נומינליים'}
        </button>
      </div>

      <div className="mb-4 md:mb-6">
        <h3 className="text-lg md:text-xl lg:text-2xl font-bold text-slate-800">
          {metricCfg.label} — {result.scenarioLabel}
          {showReal && <span className="text-slate-400 font-medium text-base md:text-lg"> (בערכי היום)</span>}
        </h3>
        <p className="text-sm md:text-base text-slate-400 mt-1">{metricCfg.description}</p>
      </div>

      <ResponsiveContainer width="100%" height={420}>
        <ComposedChart data={data} margin={{ top: 20, right: 10, left: 10, bottom: 0 }}>
          <defs>
            <linearGradient id="metricGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={metricCfg.color} stopOpacity={0.3} />
              <stop offset="100%" stopColor={metricCfg.color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
          <XAxis dataKey="age" tick={{ fontSize: 14, fill: '#94a3b8' }} tickLine={false} />
          <YAxis
            tick={{ fontSize: 14, fill: '#94a3b8' }}
            tickLine={false}
            tickFormatter={(v: number) => `${fmtK(v)}`}
            width={60}
            mirror
            domain={[
              (dataMin: number) => Math.min(0, dataMin * 1.1),
              (dataMax: number) => Math.max(0, dataMax * 1.05),
            ]}
          />
          <Tooltip content={<ChartTooltip />} cursor={<AvatarCursor />} />

          <ReferenceLine y={0} stroke="#94a3b8" strokeWidth={2} />

          <ReferenceLine
            x={config.zinukEndAge}
            stroke="#4f46e5"
            strokeWidth={2}
            strokeDasharray="8 4"
            label={{ value: `סגירת זינוק (${config.zinukEndAge})`, position: 'top', fontSize: 13, fill: '#4f46e5', fontWeight: 700 }}
          />
          {config.fullRetirementAge <= config.endAge && (
            <ReferenceLine
              x={config.fullRetirementAge}
              stroke="#f59e0b"
              strokeWidth={2}
              strokeDasharray="8 4"
              label={{ value: `פרישה מלאה (${config.fullRetirementAge})`, position: 'top', fontSize: 13, fill: '#f59e0b', fontWeight: 700 }}
            />
          )}
          {retAge && metric === 'monthlyBalance' && (
            <ReferenceLine
              x={retAge}
              stroke="#10b981"
              strokeWidth={2.5}
              strokeDasharray="6 4"
              label={{ value: `נקודת איזון (${retAge})`, position: 'insideTopLeft', fontSize: 13, fill: '#10b981', fontWeight: 700 }}
            />
          )}

          <Area type="monotone" dataKey={dataKey} fill="url(#metricGrad)" stroke="none" />
          <Bar dataKey={dataKey} radius={[3, 3, 0, 0]}>
            {data.map((entry, i) => {
              const value = resolveKey(entry, dataKey);
              const fill = metricCfg.isBiColor
                ? (value >= 0 ? metricCfg.color : metricCfg.colorSecondary || '#f43f5e')
                : metricCfg.color;
              return <Cell key={i} fill={fill} fillOpacity={0.7} />;
            })}
          </Bar>
        </ComposedChart>
      </ResponsiveContainer>

      <div className="text-sm md:text-base text-slate-500 mt-4 leading-relaxed">
        <p className="text-xs md:text-sm text-slate-400">
          הקו הכחול האנכי = סגירת זינוק · הקו הכתום = פרישה מלאה
          {metric === 'monthlyBalance' && ' · הקו הירוק = נקודת איזון'}
        </p>
      </div>
    </div>
  );
}
