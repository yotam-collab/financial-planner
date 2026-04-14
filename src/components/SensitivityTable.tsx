import { useMemo } from 'react';
import type { ScenarioConfig } from '../lib/types';
import { sensitivityAnalysis } from '../lib/simulator';

interface Props {
  config: ScenarioConfig;
}

export function SensitivityTable({ config }: Props) {
  const returnSensitivity = useMemo(
    () => sensitivityAnalysis(config, 'realReturnRate', [-0.02, -0.01, 0, 0.01, 0.02]),
    [config]
  );

  const incomeSensitivity = useMemo(
    () => sensitivityAnalysis(config, 'monthlyNetAltIncome', [-4000, -2000, 0, 2000, 4000]),
    [config]
  );

  const deltas = ['-2%', '-1%', 'בסיס', '+1%', '+2%'];

  return (
    <div className="glass-card p-6">
      <h3 className="text-base font-bold text-slate-800 mb-4">ניתוח רגישות</h3>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200/50">
            <th className="py-2.5 px-3 text-right text-xs font-bold text-slate-500">פרמטר</th>
            {deltas.map(d => (
              <th key={d} className="py-2.5 px-3 text-right text-xs font-bold text-slate-500 num">{d}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-slate-100/50">
            <td className="py-2.5 px-3 font-semibold text-slate-700">תשואה ריאלית</td>
            {returnSensitivity.map((r, i) => (
              <td key={i} className={`py-2.5 px-3 num font-bold ${ageColor(r.earliestAge)}`}>
                {r.earliestAge ?? '—'}
              </td>
            ))}
          </tr>
          <tr>
            <td className="py-2.5 px-3 font-semibold text-slate-700">הכנסה חלופית</td>
            {incomeSensitivity.map((r, i) => (
              <td key={i} className={`py-2.5 px-3 num font-bold ${ageColor(r.earliestAge)}`}>
                {r.earliestAge ?? '—'}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
      <p className="text-xs text-slate-400 mt-3">* המספרים מייצגים את גיל הפרישה המוקדם ביותר</p>
    </div>
  );
}

function ageColor(age: number | null): string {
  if (age === null) return 'text-red-500';
  if (age <= 55) return 'text-emerald-600';
  if (age <= 62) return 'text-amber-500';
  return 'text-red-500';
}
