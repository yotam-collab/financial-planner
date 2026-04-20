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
        {/* Hero Header */}
        <header className="relative overflow-hidden rounded-b-[2rem] md:rounded-b-[3rem] mb-4 md:mb-6">
          <img
            src={`${import.meta.env.BASE_URL}hero.png`}
            alt=""
            className="w-full h-36 md:h-64 lg:h-80 object-cover object-top"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          <div className="absolute bottom-0 inset-x-0 px-4 md:px-10 pb-4 md:pb-6 flex flex-col md:flex-row items-start md:items-end justify-between gap-3">
            <div>
              <h1 className="text-2xl md:text-4xl lg:text-5xl font-black text-white tracking-tight drop-shadow-lg">תכנון פיננסי</h1>
              <p className="text-sm md:text-base lg:text-lg text-white/70 font-medium mt-0.5">יותם והדס — מודל תרחישים אישי</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 rounded-xl text-sm lg:text-base font-semibold bg-white/20 text-white hover:bg-white/30 border border-white/30 transition-colors cursor-pointer backdrop-blur-sm"
              >
                ייבוא
              </button>
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
              <button
                onClick={exportJSON}
                className="px-4 py-2 rounded-xl text-sm lg:text-base font-semibold bg-white/20 text-white hover:bg-white/30 border border-white/30 transition-colors cursor-pointer backdrop-blur-sm"
              >
                ייצוא
              </button>
              <button
                onClick={resetToDefaults}
                className="px-4 py-2 rounded-xl text-sm lg:text-base font-semibold bg-red-500/30 text-red-200 hover:bg-red-500/40 border border-red-400/30 transition-colors cursor-pointer backdrop-blur-sm"
              >
                אפס
              </button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="px-4 md:px-10 pb-10 space-y-4 md:space-y-6">
          <SummaryCard result={result} />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-4 xl:col-span-3">
              <InputPanel config={config} setConfig={setConfig} />
            </div>

            <div className="lg:col-span-8 xl:col-span-9">
              <ChartsPanel result={result} config={config} />
            </div>
          </div>

          <DataTable result={result} onExportJSON={exportJSON} />
        </main>
      </div>
    </>
  );
}

export default App;
