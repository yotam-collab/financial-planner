import { useRef, useState } from 'react';
import { useFinancialState } from './hooks/useFinancialState';
import { SummaryCard } from './components/SummaryCard';
import { InputPanel } from './components/InputPanel';
import { ChartsPanel } from './components/ChartsPanel';
import { DataTable } from './components/DataTable';
import { LoadingScreen } from './components/LoadingScreen';

function App() {
  const { config, setConfig, result, resetToDefaults, exportJSON, importJSON } = useFinancialState();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);

  return (
    <>
      {loading && <LoadingScreen onComplete={() => setLoading(false)} />}

      <div className="mesh-bg" />

      <div className="relative z-10 min-h-screen">
        {/* ─── Hero image (kept) ─── */}
        <header className="relative w-full overflow-hidden">
          <img
            src={`${import.meta.env.BASE_URL}hero.png`}
            alt=""
            className="w-full h-40 md:h-72 lg:h-[28rem] xl:h-[32rem] 2xl:h-[36rem] object-cover object-top"
          />
          {/* Dark gradient: stronger at bottom (where desktop title sits), subtle at top (mobile title) */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-slate-900/30 md:to-transparent" />

          {/* ─── Mobile: compact title at top-right ─── */}
          <div className="md:hidden absolute top-3 right-4 left-4 flex items-start justify-between gap-2 fade-up">
            <div>
              <p className="text-white/80 text-[9px] font-bold uppercase tracking-[0.22em] mb-0.5 drop-shadow">
                יותם והדס
              </p>
              <h1 className="font-display text-lg font-extrabold text-white leading-tight drop-shadow">
                תוכנית אושר משפחתית
              </h1>
            </div>
          </div>

          {/* ─── Mobile: buttons at bottom ─── */}
          <div className="md:hidden absolute bottom-3 right-4 left-4 flex items-center justify-end gap-1.5 fade-up" style={{ animationDelay: '0.1s' }}>
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

          {/* ─── Desktop: title + buttons at bottom ─── */}
          <div className="hidden md:block absolute inset-x-0 bottom-0 px-10 pb-10">
            <div className="mx-auto w-full flex flex-row items-end justify-between gap-4" style={{ maxWidth: '1920px' }}>
              <div className="fade-up">
                <p className="text-white/70 text-xs font-bold uppercase tracking-[0.28em] mb-3">
                  יותם והדס · תכנון פיננסי
                </p>
                <h1 className="font-display text-5xl lg:text-6xl font-extrabold text-white leading-[0.95]">
                  תוכנית אושר משפחתית
                </h1>
              </div>
              <div className="flex items-center gap-3 fade-up" style={{ animationDelay: '0.1s' }}>
                <HeroButton onClick={() => fileInputRef.current?.click()}>ייבוא</HeroButton>
                <HeroButton onClick={exportJSON}>ייצוא</HeroButton>
                <HeroButton onClick={resetToDefaults} danger>אפס</HeroButton>
              </div>
            </div>
          </div>
        </header>

        {/* ─── Main content ─── */}
        <main className="mx-auto w-full px-4 md:px-8 lg:px-12 py-6 md:py-10" style={{ maxWidth: '1920px' }}>
          <div className="space-y-5 md:space-y-6">
            {/* Summary */}
            <div className="fade-up" style={{ animationDelay: '0.15s' }}>
              <SummaryCard result={result} />
            </div>

            {/* Grid: chart (LEFT in RTL) + inputs (RIGHT in RTL) */}
            {/* In RTL: order-1 renders on RIGHT, order-2 on LEFT */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 md:gap-6">
              <div className="lg:col-span-4 xl:col-span-3 order-2 lg:order-1 fade-up min-w-0" style={{ animationDelay: '0.25s' }}>
                <InputPanel config={config} setConfig={setConfig} />
              </div>
              <div className="lg:col-span-8 xl:col-span-9 order-1 lg:order-2 fade-up min-w-0" style={{ animationDelay: '0.2s' }}>
                <ChartsPanel result={result} config={config} />
              </div>
            </div>

            {/* Data table */}
            <div className="fade-up" style={{ animationDelay: '0.3s' }}>
              <DataTable result={result} onExportJSON={exportJSON} />
            </div>

            {/* Footer */}
            <footer className="pt-8 md:pt-10 text-center">
              <p className="font-body text-sm text-slate-500">
                מודל פיננסי אישי · אינו תחליף לייעוץ מקצועי
              </p>
            </footer>
          </div>
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
        min-h-[36px] md:min-h-[40px] px-4 md:px-5 py-2 md:py-2.5 text-xs md:text-sm font-semibold
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
