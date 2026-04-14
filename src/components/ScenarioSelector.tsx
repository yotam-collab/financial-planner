import type { ScenarioType } from '../hooks/useFinancialState';

const TABS: { key: ScenarioType; label: string }[] = [
  { key: 'buyNow', label: 'קנייה מיידית' },
  { key: 'rentForever', label: 'שכירות לצמיתות' },
  { key: 'buyLater', label: 'שכירות + קנייה מאוחרת' },
];

interface Props {
  active: ScenarioType;
  onChange: (s: ScenarioType) => void;
  showComparison: boolean;
  onToggleComparison: () => void;
}

export function ScenarioSelector({ active, onChange, showComparison, onToggleComparison }: Props) {
  return (
    <div className="flex flex-wrap gap-1.5 md:gap-2">
      {TABS.map(tab => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={`px-3 md:px-6 py-2 md:py-3 rounded-xl md:rounded-2xl text-xs md:text-sm font-semibold transition-all duration-300 cursor-pointer border ${
            active === tab.key && !showComparison
              ? 'bg-gradient-to-l from-indigo-600 to-violet-500 text-white shadow-lg shadow-indigo-600/20 border-transparent'
              : 'bg-white/40 text-slate-500 hover:bg-white/70 hover:text-slate-700 border-transparent'
          }`}
        >
          {tab.label}
        </button>
      ))}
      <button
        onClick={onToggleComparison}
        className={`px-6 py-3 rounded-2xl text-sm font-semibold transition-all duration-300 cursor-pointer border mr-auto ml-0 ${
          showComparison
            ? 'bg-gradient-to-l from-indigo-600 to-violet-500 text-white shadow-lg shadow-indigo-600/20 border-transparent'
            : 'bg-indigo-50/60 text-indigo-600 hover:bg-indigo-100/80 border-transparent'
        }`}
      >
        השוואת תרחישים
      </button>
    </div>
  );
}
