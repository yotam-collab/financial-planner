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
      <div className="paper-bg" />
      <div className="paper-grain" />

      <div className="relative z-10 min-h-screen">
        {/* ─── Hero Image (kept as-is) ─── */}
        <header className="relative overflow-hidden">
          <img
            src={`${import.meta.env.BASE_URL}hero.png`}
            alt=""
            className="w-full h-40 md:h-72 lg:h-[28rem] xl:h-[32rem] 2xl:h-[36rem] object-cover object-top"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#1a1c28] via-[#1a1c28]/30 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 px-4 md:px-10 pb-5 md:pb-8">
            <div className="max-w-[1280px] mx-auto flex flex-col md:flex-row items-start md:items-end justify-between gap-3 md:gap-4">
              <div>
                <p className="text-[#d9cfba] text-[11px] md:text-xs font-semibold uppercase tracking-[0.25em] mb-1.5 md:mb-2">
                  תכנון פיננסי · יותם והדס
                </p>
                <h1 className="serif text-3xl md:text-5xl lg:text-6xl font-medium text-white tracking-tight leading-none">
                  מודל תרחישים אישי
                </h1>
              </div>
              <div className="flex items-center gap-2">
                <TopButton onClick={() => fileInputRef.current?.click()}>ייבוא</TopButton>
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
                <TopButton onClick={exportJSON}>ייצוא</TopButton>
                <TopButton onClick={resetToDefaults} danger>אפס</TopButton>
              </div>
            </div>
          </div>
        </header>

        {/* ─── Main Content ─── */}
        <main className="max-w-[1280px] mx-auto px-4 md:px-8 py-8 md:py-12 space-y-8 md:space-y-10">
          <SummaryCard result={result} />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
            <div className="lg:col-span-4 xl:col-span-3 order-2 lg:order-1">
              <InputPanel config={config} setConfig={setConfig} />
            </div>
            <div className="lg:col-span-8 xl:col-span-9 order-1 lg:order-2">
              <ChartsPanel result={result} config={config} />
            </div>
          </div>

          <DataTable result={result} onExportJSON={exportJSON} />

          {/* ─── Footer ─── */}
          <footer className="pt-8 md:pt-12 border-t border-[#e8dfc8]">
            <div className="rule-ornament mb-6">
              <svg width="8" height="8" viewBox="0 0 10 10" className="flex-shrink-0">
                <circle cx="5" cy="5" r="2" fill="currentColor" opacity="0.5" />
              </svg>
            </div>
            <p className="text-center text-sm text-[#8a8695] serif italic">
              מודל פיננסי אישי · מבוסס על נתוני משתמש והנחות שוק · אינו תחליף לייעוץ מקצועי
            </p>
          </footer>
        </main>
      </div>
    </>
  );
}

function TopButton({ children, onClick, danger = false }: { children: React.ReactNode; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`
        px-3.5 md:px-4 py-1.5 md:py-2 text-xs md:text-sm font-medium
        rounded border backdrop-blur-sm transition-all duration-200
        ${danger
          ? 'bg-[#8a2d3a]/20 text-[#ffdede] hover:bg-[#8a2d3a]/40 border-[#ffdede]/20'
          : 'bg-white/10 text-white hover:bg-white/25 border-white/20'}
      `}
    >
      {children}
    </button>
  );
}

export default App;
