import {
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Area, ComposedChart,
  Legend, Cell, Bar, Line, LineChart,
} from 'recharts';
import type { SimulationResult, ScenarioConfig } from '../lib/types';
import type { ScenarioType } from '../hooks/useFinancialState';

interface Props {
  result: SimulationResult;
  showComparison: boolean;
  allResults: Record<ScenarioType, SimulationResult>;
  config: ScenarioConfig;
}

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
    <div className="glass-card p-3 md:p-5 text-sm md:text-base shadow-xl !rounded-xl max-w-[90vw] md:min-w-[280px]" dir="rtl">
      <div className="flex justify-between items-center mb-3">
        <span className="font-bold text-slate-800 text-lg">גיל {d.age}</span>
        <span className={`text-sm font-semibold px-3 py-1 rounded-full ${
          d.phase === 'zinuk' ? 'bg-indigo-100 text-indigo-700' :
          d.phase === 'altIncome' ? 'bg-emerald-100 text-emerald-700' :
          'bg-amber-100 text-amber-700'
        }`}>{phaseLabel}</span>
      </div>
      <div className="space-y-2 text-base">
        {d.monthlyZinukIncome > 0 && (
          <div className="flex justify-between">
            <span className="text-slate-500">הכנסה מזינוק</span>
            <span className="num font-bold">{d.monthlyZinukIncome?.toLocaleString('he-IL')} ₪</span>
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
        {d.monthlyAltIncome > 0 && (
          <div className="flex justify-between">
            <span className="text-slate-500">הכנסה חלופית</span>
            <span className="num font-bold">{d.monthlyAltIncome?.toLocaleString('he-IL')} ₪</span>
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
        <div className={`flex justify-between border-t border-slate-200 pt-2 text-lg ${d.monthlyBalance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
          <span className="font-bold">יתרה חודשית</span>
          <span className="num font-black">{d.monthlyBalance >= 0 ? '+' : ''}{d.monthlyBalance?.toLocaleString('he-IL')} ₪</span>
        </div>
      </div>
      {/* ─── Portfolio breakdown ─── */}
      <div className="border-t border-slate-200 mt-3 pt-3">
        <p className="text-sm font-bold text-slate-500 mb-2">התפלגות תיק (נומינלי)</p>
        <div className="space-y-1.5 text-sm">
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
      {/* ─── Real (today's money) ─── */}
      {d.real && (
        <div className="border-t border-slate-200 mt-3 pt-3">
          <p className="text-sm font-bold text-slate-400 mb-2">בערכים של היום (ריאלי)</p>
          <div className="space-y-1.5 text-sm text-slate-500">
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
          </div>
        </div>
      )}
    </div>
  );
}

/** Custom tooltip cursor: vertical line + profile photo circle at top */
function AvatarCursor(props: any) {
  // Recharts passes different props depending on chart type
  // For Bar in ComposedChart: x, y, width, height (bar dimensions)
  // For Line: points array
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
  // Place avatar at the bottom of the chart, on the X-axis line
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

export function ChartsPanel({ result, showComparison, allResults, config }: Props) {
  if (showComparison) {
    return <ComparisonChart allResults={allResults} />;
  }

  const data = result.years;
  const retAge = result.earliestRetirementAge;

  return (
    <div className="glass-card p-6 md:p-8">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-3">
        <h3 className="text-xl font-bold text-slate-800">יתרה חודשית — {result.scenarioLabel}</h3>
        <p className="text-sm text-slate-400">הכנסה ברת-קיימא (4% + פנסיה + חלופית) פחות הוצאות</p>
      </div>
      <ResponsiveContainer width="100%" height={420}>
        <ComposedChart data={data} margin={{ top: 20, right: 10, left: 10, bottom: 0 }}>
          <defs>
            <linearGradient id="posGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="negGrad" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.15} />
              <stop offset="100%" stopColor="#f43f5e" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="avatarBorder" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#4f46e5" />
              <stop offset="50%" stopColor="#7c3aed" />
              <stop offset="100%" stopColor="#ec4899" />
            </linearGradient>
            <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.2" />
            </filter>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
          <XAxis dataKey="age" tick={{ fontSize: 14, fill: '#94a3b8' }} tickLine={false} />
          <YAxis
            tick={{ fontSize: 14, fill: '#94a3b8' }}
            tickLine={false}
            tickFormatter={(v: number) => `${fmtK(v)}`}
            width={60}
            mirror
          />
          <Tooltip content={<ChartTooltip />} cursor={<AvatarCursor />} />

          {/* Zero line */}
          <ReferenceLine y={0} stroke="#94a3b8" strokeWidth={2} />

          {/* Phase markers */}
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
          {retAge && (
            <ReferenceLine
              x={retAge}
              stroke="#10b981"
              strokeWidth={2.5}
              strokeDasharray="6 4"
              label={{ value: `נקודת איזון (${retAge})`, position: 'insideTopLeft', fontSize: 13, fill: '#10b981', fontWeight: 700 }}
            />
          )}

          {/* The single line: monthly balance */}
          <Area type="monotone" dataKey="monthlyBalance" fill="url(#posGrad)" stroke="none" />
          <Bar dataKey="monthlyBalance" radius={[3, 3, 0, 0]}>
            {data.map((entry, i) => (
              <Cell
                key={i}
                fill={entry.monthlyBalance >= 0 ? '#10b981' : '#f43f5e'}
                fillOpacity={0.6}
              />
            ))}
          </Bar>
        </ComposedChart>
      </ResponsiveContainer>
      <p className="text-base text-slate-500 mt-5 leading-relaxed">
        <strong className="text-emerald-600">ירוק</strong> = הכנסה ברת-קיימא עולה על הוצאות (אפשר לסגור את העסק).
        <strong className="text-rose-500 mr-2"> אדום</strong> = גירעון (צריך הכנסה נוספת).
        הקו הכחול = סגירת זינוק. הקו הכתום = פרישה מלאה.
      </p>
    </div>
  );
}

function ComparisonChart({ allResults }: { allResults: Record<ScenarioType, SimulationResult> }) {
  const maxLen = Math.max(
    allResults.buyNow.years.length,
    allResults.rentForever.years.length,
    allResults.buyLater.years.length,
  );

  const data = Array.from({ length: maxLen }, (_, i) => ({
    age: allResults.buyNow.years[i]?.age ?? 44 + i,
    buyNow: allResults.buyNow.years[i]?.monthlyBalance ?? 0,
    rentForever: allResults.rentForever.years[i]?.monthlyBalance ?? 0,
    buyLater: allResults.buyLater.years[i]?.monthlyBalance ?? 0,
  }));

  return (
    <div className="glass-card p-6 md:p-8">
      <h3 className="text-xl font-bold text-slate-800 mb-5">השוואת יתרה חודשית — כל התרחישים</h3>
      <ResponsiveContainer width="100%" height={420}>
        <LineChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
          <XAxis dataKey="age" tick={{ fontSize: 14, fill: '#94a3b8' }} tickLine={false} />
          <YAxis tick={{ fontSize: 14, fill: '#94a3b8' }} tickLine={false} tickFormatter={fmtK} width={60} mirror />
          <Tooltip formatter={(v: any) => `${Math.round(Number(v) || 0).toLocaleString('he-IL')} ₪`} />
          <Legend />
          <ReferenceLine y={0} stroke="#94a3b8" strokeWidth={2} />
          <Line type="monotone" dataKey="buyNow" stroke="#4f46e5" strokeWidth={3} dot={false} name="קנייה מיידית" />
          <Line type="monotone" dataKey="rentForever" stroke="#10b981" strokeWidth={3} dot={false} name="שכירות לצמיתות" />
          <Line type="monotone" dataKey="buyLater" stroke="#f59e0b" strokeWidth={3} dot={false} name="קנייה מאוחרת" />
        </LineChart>
      </ResponsiveContainer>
      <div className="mt-5 flex flex-wrap gap-8 text-base font-bold">
        <span className="text-indigo-600">קנייה מיידית: גיל {allResults.buyNow.earliestRetirementAge ?? '—'}</span>
        <span className="text-emerald-600">שכירות: גיל {allResults.rentForever.earliestRetirementAge ?? '—'}</span>
        <span className="text-amber-600">קנייה מאוחרת: גיל {allResults.buyLater.earliestRetirementAge ?? '—'}</span>
      </div>
    </div>
  );
}
