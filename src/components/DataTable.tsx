import { useState } from 'react';
import type { SimulationResult } from '../lib/types';

interface Props {
  result: SimulationResult;
  onExportJSON: () => void;
}

export function DataTable({ result, onExportJSON }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  const exportCSV = () => {
    const headers = ['שנה', 'גיל', 'תיק נזיל', 'פנסיה', 'הון נדל"ן', 'שווי נקי', 'תזרים שנתי', 'שלב'];
    const rows = result.years.map(y => [
      y.year,
      y.age,
      y.liquidPortfolio,
      y.pension,
      y.homeEquity,
      y.netWorth,
      y.annualCashflow,
      y.isWorking ? 'עובד' : 'פרש',
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `financial-plan-${result.scenarioLabel}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="glass-card overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-5 flex items-center justify-between text-right cursor-pointer hover:bg-white/30 transition-colors"
      >
        <h3 className="text-base font-bold text-slate-800">פירוט שנתי</h3>
        <div className="flex items-center gap-3">
          {isOpen && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); onExportJSON(); }}
                className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-white/50 text-slate-600 hover:bg-white/80 border border-white/60 transition-colors"
              >
                ייצוא JSON
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); exportCSV(); }}
                className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-white/50 text-slate-600 hover:bg-white/80 border border-white/60 transition-colors"
              >
                ייצוא CSV
              </button>
            </>
          )}
          <svg
            className={`w-5 h-5 text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {isOpen && (
        <div className="px-5 pb-5 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-slate-200/50">
                <th className="py-3 px-3 text-right text-xs font-bold text-slate-500">שנה</th>
                <th className="py-3 px-3 text-right text-xs font-bold text-slate-500">גיל</th>
                <th className="py-3 px-3 text-right text-xs font-bold text-slate-500">תיק נזיל</th>
                <th className="py-3 px-3 text-right text-xs font-bold text-slate-500">פנסיה</th>
                <th className="py-3 px-3 text-right text-xs font-bold text-slate-500">הון נדל״ן</th>
                <th className="py-3 px-3 text-right text-xs font-bold text-slate-500">שווי נקי</th>
                <th className="py-3 px-3 text-right text-xs font-bold text-slate-500">תזרים שנתי</th>
                <th className="py-3 px-3 text-right text-xs font-bold text-slate-500">שלב</th>
              </tr>
            </thead>
            <tbody>
              {result.years.map(y => (
                <tr key={y.year} className="border-b border-slate-100/50 hover:bg-indigo-50/30 transition-colors">
                  <td className="py-2.5 px-3 font-semibold text-slate-800">{2026 + y.year - 1}</td>
                  <td className="py-2.5 px-3 num text-slate-600">{y.age}</td>
                  <td className={`py-2.5 px-3 num font-medium ${y.isDepleted ? 'text-red-500' : 'text-slate-700'}`}>
                    {y.isDepleted ? 'אזל' : fmtNum(y.liquidPortfolio)}
                  </td>
                  <td className="py-2.5 px-3 num text-slate-600">{fmtNum(y.pension)}</td>
                  <td className="py-2.5 px-3 num text-slate-600">{y.homeEquity > 0 ? fmtNum(y.homeEquity) : '—'}</td>
                  <td className="py-2.5 px-3 num font-bold text-slate-800">{fmtNum(y.netWorth)}</td>
                  <td className={`py-2.5 px-3 num font-medium ${y.annualCashflow >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                    {y.annualCashflow >= 0 ? '+' : ''}{fmtNum(y.annualCashflow)}
                  </td>
                  <td className="py-2.5 px-3">
                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      y.isWorking
                        ? 'bg-emerald-100/60 text-emerald-600'
                        : y.monthlyPensionPayout > 0
                          ? 'bg-indigo-100/60 text-indigo-600'
                          : 'bg-amber-100/60 text-amber-600'
                    }`}>
                      {y.isWorking ? 'עובד' : y.monthlyPensionPayout > 0 ? 'פרש + קצבה' : 'פרש'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function fmtNum(v: number): string {
  return Math.round(v).toLocaleString('he-IL');
}
