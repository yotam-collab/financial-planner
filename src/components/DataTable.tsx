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
      y.year,
      y.age,
      y.phase === 'zinuk' ? 'זינוק' : y.phase === 'altIncome' ? 'חלופית' : 'פרישה',
      y.liquidPortfolio,
      y.pension,
      y.homeEquity,
      y.netWorth,
      y.monthlySustainableIncome,
      y.monthlyExpenses,
      y.monthlyBalance,
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
    <div className="ledger-card overflow-hidden fade-rise">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-5 md:px-8 py-4 md:py-5 flex items-center justify-between text-right cursor-pointer hover:bg-[#fcf7ec] transition-colors"
      >
        <div>
          <p className="eyebrow mb-1">נספח</p>
          <h3 className="serif text-lg md:text-xl font-medium text-[#1a1c28]">פירוט שנתי</h3>
        </div>
        <div className="flex items-center gap-3">
          {isOpen && (
            <div className="flex gap-2">
              <button
                onClick={(e) => { e.stopPropagation(); onExportJSON(); }}
                className="px-3 py-1.5 text-xs md:text-sm font-medium text-[#8a6f36] hover:text-[#1a1c28] border border-[#c9bd9e] hover:border-[#8a6f36] rounded transition-colors"
              >
                ייצוא JSON
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); exportCSV(); }}
                className="px-3 py-1.5 text-xs md:text-sm font-medium text-[#8a6f36] hover:text-[#1a1c28] border border-[#c9bd9e] hover:border-[#8a6f36] rounded transition-colors"
              >
                ייצוא CSV
              </button>
            </div>
          )}
          <svg
            className={`w-5 h-5 text-[#a68a4d] transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {isOpen && (
        <div className="px-5 md:px-8 pb-6 md:pb-8 overflow-x-auto">
          <table className="w-full text-sm md:text-[15px]">
            <thead>
              <tr className="border-b-2 border-[#c9bd9e]">
                <Th>שנה</Th>
                <Th>גיל</Th>
                <Th>שלב</Th>
                <Th align="left">תיק נזיל</Th>
                <Th align="left">פנסיה</Th>
                <Th align="left">נדל״ן</Th>
                <Th align="left">שווי נקי</Th>
                <Th align="left">יתרה</Th>
              </tr>
            </thead>
            <tbody>
              {result.years.map(y => (
                <tr key={y.year} className="border-b border-[#e8dfc8] hover:bg-[#fcf7ec] transition-colors">
                  <Td>{2026 + y.year - 1}</Td>
                  <Td mono>{y.age}</Td>
                  <Td>
                    <PhaseBadge phase={y.phase} hasPension={y.monthlyPensionPayout > 0} />
                  </Td>
                  <Td mono align="left" className={y.isDepleted ? 'text-[#8a2d3a]' : ''}>
                    {y.isDepleted ? 'אזל' : fmtNum(y.liquidPortfolio)}
                  </Td>
                  <Td mono align="left" className="text-[#4a4755]">{fmtNum(y.pension)}</Td>
                  <Td mono align="left" className="text-[#4a4755]">{y.homeEquity > 0 ? fmtNum(y.homeEquity) : '—'}</Td>
                  <Td mono align="left" className="font-semibold">{fmtNum(y.netWorth)}</Td>
                  <Td mono align="left" className={y.monthlyBalance >= 0 ? 'text-[#3d6e5c]' : 'text-[#8a2d3a]'}>
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
    <th className={`eyebrow py-3 px-3 !text-[#8a8695] font-semibold text-${align}`}>
      {children}
    </th>
  );
}

function Td({ children, mono, align = 'right', className = '' }: {
  children: React.ReactNode;
  mono?: boolean;
  align?: 'right' | 'left';
  className?: string;
}) {
  return (
    <td className={`py-2.5 md:py-3 px-3 ${mono ? 'num font-medium' : ''} text-${align} ${className}`}
      style={mono ? { fontVariantNumeric: 'tabular-nums' } : undefined}>
      {children}
    </td>
  );
}

function PhaseBadge({ phase, hasPension }: { phase: string; hasPension: boolean }) {
  const style =
    phase === 'zinuk' ? 'text-[#4a5a8a]'
    : phase === 'altIncome' ? 'text-[#3d6e5c]'
    : 'text-[#a68a4d]';
  const label =
    phase === 'zinuk' ? 'זינוק'
    : phase === 'altIncome' ? 'חלופית'
    : hasPension ? 'פרישה+פנסיה' : 'פרישה';
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs ${style}`}>
      <span className="w-1 h-1 rounded-full bg-current" />
      <span className="font-medium">{label}</span>
    </span>
  );
}

function fmtNum(v: number): string {
  return Math.round(v).toLocaleString('he-IL');
}
