import { useRef } from 'react';
import { useFinancialState } from './hooks/useFinancialState';
import { SummaryCard } from './components/SummaryCard';
import { InputPanel } from './components/InputPanel';
import { ChartsPanel } from './components/ChartsPanel';
import { DataTable } from './components/DataTable';

function App() {
  const { config, setConfig, result, resetToDefaults, exportJSON, importJSON } = useFinancialState();
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <div className="mesh-bg" />

      <div className="relative z-10 min-h-screen">
        {/* ─── Hero image (kept) ─── */}
        <header className="relative overflow-hidden rounded-b-[3rem] md:rounded-b-[4rem] mb-6 md:mb-10">
          <img
            src={`${import.meta.env.BASE_URL}hero.png`}
            alt=""
            className="w-full h-40 md:h-72 lg:h-[28rem] xl:h-[32rem] 2xl:h-[36rem] object-cover object-top"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/30 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 px-5 md:px-10 pb-6 md:pb-10">
            <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row items-start md:items-end justify-between gap-4">
              <div className="fade-up">
                <p className="text-white/70 text-[11px] md:text-xs font-bold uppercase tracking-[0.28em] mb-2 md:mb-3">
                  יותם והדס · תכנון פיננסי
                </p>
                <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-extrabold text-white leading-[0.95]">
                  מודל תרחישים
                </h1>
              </div>
              <div className="flex items-center gap-2 md:gap-3 fade-up" style={{ animationDelay: '0.1s' }}>
                <HeroButton onClick={() => fileInputRef.current?.click()}>ייבוא</HeroButton>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) importJSON(file);
                    e.target.value = '';
                  }}
                />
                <HeroButton onClick={exportJSON}>ייצוא</HeroButton>
                <HeroButton onClick={resetToDefaults} danger>אפס</HeroButton>
              </div>
            </div>
          </div>
        </header>

        {/* ─── Main bento ─── */}
        <main className="max-w-[1400px] mx-auto px-4 md:px-8 pb-12 md:pb-16">
          {/* Summary hero card */}
          <div className="fade-up" style={{ animationDelay: '0.15s' }}>
            <SummaryCard result={result} />
          </div>

          {/* Grid: Input + Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 md:gap-6 mt-5 md:mt-6">
            <div className="lg:col-span-4 xl:col-span-3 order-2 lg:order-1 fade-up" style={{ animationDelay: '0.25s' }}>
              <InputPanel config={config} setConfig={setConfig} />
            </div>
            <div className="lg:col-span-8 xl:col-span-9 order-1 lg:order-2 fade-up" style={{ animationDelay: '0.2s' }}>
              <ChartsPanel result={result} config={config} />
            </div>
          </div>

          {/* Data table */}
          <div className="mt-5 md:mt-6 fade-up" style={{ animationDelay: '0.3s' }}>
            <DataTable result={result} onExportJSON={exportJSON} />
          </div>

          {/* Footer */}
          <footer className="mt-10 md:mt-12 text-center">
            <p className="font-body text-sm text-slate-500">
              מודל פיננסי אישי · אינו תחליף לייעוץ מקצועי
            </p>
          </footer>
        </main>
      </div>
    </>
  );
}

function HeroButton({ children, onClick, danger = false }: {
  children: React.ReactNode; onClick: () => void; danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        px-4 md:px-5 py-2 md:py-2.5 text-xs md:text-sm font-semibold
        rounded-2xl backdrop-blur-md border transition-all duration-300
        ${danger
          ? 'bg-rose-500/30 text-white hover:bg-rose-500/50 border-rose-300/40'
          : 'bg-white/15 text-white hover:bg-white/30 border-white/25 hover:border-white/40'}
      `}
    >
      {children}
    </button>
  );
}

export default App;
