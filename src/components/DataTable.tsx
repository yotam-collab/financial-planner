import { useState } from 'react';
import type { SimulationResult } from '../lib/types';

interface Props {
  result: SimulationResult;
  onExportJSON: () => void;
}

export function DataTable({ result, onExportJSON }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  const exportCSV = () => {
    const headers = ['שנה', 'גיל', 'שלב', 'תיק נזיל', 'פנסיה', 'הון נדל"ן', 'שווי נקי', 'הכנסה', 'הוצאות', 'יתרה'];
    const rows = result.years.map(y => [
      y.year, y.age,
      y.phase === 'zinuk' ? 'זינוק' : y.phase === 'altIncome' ? 'חלופית' : 'פרישה',
      y.liquidPortfolio, y.pension, y.homeEquity, y.netWorth,
      y.monthlySustainableIncome, y.monthlyExpenses, y.monthlyBalance,
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
    <div className="widget-card-static overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-5 md:px-8 py-5 md:py-6 flex items-center justify-between text-right cursor-pointer hover:bg-white/40 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span aria-hidden="true" className="w-11 h-11 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-xl">
            📋
          </span>
          <div>
            <h3 className="font-display text-lg md:text-xl font-extrabold text-slate-900 leading-tight">פירוט שנתי</h3>
            <p className="text-xs md:text-sm text-slate-500 font-medium">{result.years.length} שנים · גיל {result.years[0]?.age} - {result.years[result.years.length - 1]?.age}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isOpen && (
            <div className="flex gap-2">
              <button
                onClick={(e) => { e.stopPropagation(); onExportJSON(); }}
                className="btn-glass px-3 py-1.5 text-xs md:text-sm text-slate-700"
              >
                JSON
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); exportCSV(); }}
                className="btn-glass px-3 py-1.5 text-xs md:text-sm text-slate-700"
              >
                CSV
              </button>
            </div>
          )}
          <svg
            className={`w-5 h-5 text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {isOpen && (
        <div className="px-5 md:px-8 pb-6 md:pb-8 overflow-x-auto">
          <table className="w-full text-sm md:text-[15px]">
            <thead>
              <tr className="border-b-2 border-white/70">
                <Th>שנה</Th>
                <Th>גיל</Th>
                <Th>שלב</Th>
                <Th align="left">תיק נזיל</Th>
                <Th align="left">פנסיה</Th>
                <Th align="left">נדל״ן</Th>
                <Th align="left">שווי נקי</Th>
                <Th align="left">יתרה חודשית</Th>
              </tr>
            </thead>
            <tbody>
              {result.years.map((y, i) => (
                <tr key={y.year} className={`border-b border-white/40 hover:bg-white/50 transition-colors ${i % 2 === 0 ? 'bg-white/20' : ''}`}>
                  <Td className="text-slate-600">{2026 + y.year - 1}</Td>
                  <Td mono className="text-slate-900 font-bold">{y.age}</Td>
                  <Td>
                    <PhaseBadge phase={y.phase} hasPension={y.monthlyPensionPayout > 0} />
                  </Td>
                  <Td mono align="left" className={y.isDepleted ? 'text-rose-500 font-bold' : 'text-slate-700'}>
                    {y.isDepleted ? 'אזל' : fmtNum(y.liquidPortfolio)}
                  </Td>
                  <Td mono align="left" className="text-slate-600">{fmtNum(y.pension)}</Td>
                  <Td mono align="left" className="text-slate-600">{y.homeEquity > 0 ? fmtNum(y.homeEquity) : '—'}</Td>
                  <Td mono align="left" className="text-slate-900 font-bold">{fmtNum(y.netWorth)}</Td>
                  <Td mono align="left" className={`font-bold ${y.monthlyBalance >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                    {y.monthlyBalance >= 0 ? '+' : ''}{fmtNum(y.monthlyBalance)}
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Th({ children, align = 'right' }: { children: React.ReactNode; align?: 'right' | 'left' }) {
  return (
    <th className={`py-3 px-3 text-${align} text-[10px] md:text-xs font-bold uppercase tracking-[0.12em] text-slate-500`}>
      {children}
    </th>
  );
}

function Td({ children, mono, align = 'right', className = '' }: {
  children: React.ReactNode; mono?: boolean; align?: 'right' | 'left'; className?: string;
}) {
  return (
    <td className={`py-3 px-3 text-${align} ${mono ? 'num' : ''} ${className}`}
      style={mono ? { fontVariantNumeric: 'tabular-nums' } : undefined}>
      {children}
    </td>
  );
}

function PhaseBadge({ phase, hasPension }: { phase: string; hasPension: boolean }) {
  const style = phase === 'zinuk' ? 'bg-indigo-100 text-indigo-700'
    : phase === 'altIncome' ? 'bg-emerald-100 text-emerald-700'
    : hasPension ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700';
  const label = phase === 'zinuk' ? 'זינוק'
    : phase === 'altIncome' ? 'חלופית'
    : hasPension ? 'פרישה + פנסיה' : 'פרישה';
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] md:text-xs font-bold px-2.5 py-1 rounded-full ${style}`}>
      <span className="w-1 h-1 rounded-full bg-current" />
      {label}
    </span>
  );
}

function fmtNum(v: number): string {
  return Math.round(v).toLocaleString('he-IL');
}
