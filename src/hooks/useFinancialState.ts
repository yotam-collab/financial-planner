import { useState, useCallback, useEffect, useMemo } from 'react';
import type { ScenarioConfig, SimulationResult } from '../lib/types';
import { createBuyNowConfig, createRentForeverConfig, createBuyLaterConfig } from '../lib/defaults';
import { simulate } from '../lib/simulator';

export type ScenarioType = 'buyNow' | 'rentForever' | 'buyLater';

const STORAGE_KEY = 'financial-planner-state';

interface PersistedState {
  activeScenario: ScenarioType;
  buyNowConfig: ScenarioConfig;
  rentForeverConfig: ScenarioConfig;
  buyLaterConfig: ScenarioConfig;
}

function loadFromStorage(): PersistedState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveToStorage(state: PersistedState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage full or unavailable
  }
}

/** Merge saved config with defaults to handle new fields */
function mergeConfig(saved: Partial<ScenarioConfig> | undefined, defaults: ScenarioConfig): ScenarioConfig {
  if (!saved) return defaults;
  return {
    ...defaults,
    ...saved,
    zinukEndAge: saved.zinukEndAge ?? (saved as any).businessClosureYear ? defaults.startAge + ((saved as any).businessClosureYear ?? 8) - 1 : defaults.zinukEndAge,
    pensionStartAge: saved.pensionStartAge ?? defaults.pensionStartAge,
    fullRetirementAge: saved.fullRetirementAge ?? defaults.fullRetirementAge,
    assets: { ...defaults.assets, ...saved.assets },
    income: { ...defaults.income, ...saved.income },
    expenses: { ...defaults.expenses, ...saved.expenses },
    house: { ...defaults.house, ...saved.house },
    market: { ...defaults.market, ...saved.market },
  };
}

export function useFinancialState() {
  const saved = loadFromStorage();

  const [activeScenario, setActiveScenario] = useState<ScenarioType>(
    saved?.activeScenario ?? 'buyNow'
  );
  const [buyNowConfig, setBuyNowConfig] = useState<ScenarioConfig>(
    mergeConfig(saved?.buyNowConfig, createBuyNowConfig())
  );
  const [rentForeverConfig, setRentForeverConfig] = useState<ScenarioConfig>(
    mergeConfig(saved?.rentForeverConfig, createRentForeverConfig())
  );
  const [buyLaterConfig, setBuyLaterConfig] = useState<ScenarioConfig>(
    mergeConfig(saved?.buyLaterConfig, createBuyLaterConfig(52))
  );

  // Persist on change
  useEffect(() => {
    saveToStorage({ activeScenario, buyNowConfig, rentForeverConfig, buyLaterConfig });
  }, [activeScenario, buyNowConfig, rentForeverConfig, buyLaterConfig]);

  const activeConfig = useMemo(() => {
    switch (activeScenario) {
      case 'buyNow': return buyNowConfig;
      case 'rentForever': return rentForeverConfig;
      case 'buyLater': return buyLaterConfig;
    }
  }, [activeScenario, buyNowConfig, rentForeverConfig, buyLaterConfig]);

  const setActiveConfig = useCallback((updater: (prev: ScenarioConfig) => ScenarioConfig) => {
    // Helper: extract shared fields from a config (everything except housePurchaseYear)
    const extractShared = (c: ScenarioConfig) => ({
      startAge: c.startAge, endAge: c.endAge,
      zinukEndAge: c.zinukEndAge,
      pensionStartAge: c.pensionStartAge,
      fullRetirementAge: c.fullRetirementAge,
      assets: { ...c.assets }, income: { ...c.income },
      expenses: { ...c.expenses }, house: { ...c.house },
      market: { ...c.market },
    });

    // Apply update to active config, then propagate shared fields to others
    const allSetters = [setBuyNowConfig, setRentForeverConfig, setBuyLaterConfig];
    const activeIdx = activeScenario === 'buyNow' ? 0 : activeScenario === 'rentForever' ? 1 : 2;

    // Update active
    allSetters[activeIdx](prev => {
      const updated = updater(prev);
      // Also propagate to others
      const shared = extractShared(updated);
      for (let i = 0; i < 3; i++) {
        if (i !== activeIdx) {
          allSetters[i](otherPrev => ({
            ...otherPrev, ...shared,
            housePurchaseYear: otherPrev.housePurchaseYear, // keep scenario-specific
          }));
        }
      }
      return updated;
    });
  }, [activeScenario]);

  // Run simulations
  const activeResult = useMemo(() => simulate(activeConfig), [activeConfig]);

  const allResults = useMemo((): Record<ScenarioType, SimulationResult> => ({
    buyNow: simulate(buyNowConfig),
    rentForever: simulate(rentForeverConfig),
    buyLater: simulate(buyLaterConfig),
  }), [buyNowConfig, rentForeverConfig, buyLaterConfig]);

  const resetToDefaults = useCallback(() => {
    setBuyNowConfig(createBuyNowConfig());
    setRentForeverConfig(createRentForeverConfig());
    setBuyLaterConfig(createBuyLaterConfig(52));
    setActiveScenario('buyNow');
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const exportJSON = useCallback(() => {
    const data = { activeScenario, buyNowConfig, rentForeverConfig, buyLaterConfig };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `financial-plan-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [activeScenario, buyNowConfig, rentForeverConfig, buyLaterConfig]);

  const importJSON = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string) as PersistedState;
        if (data.buyNowConfig) setBuyNowConfig(data.buyNowConfig);
        if (data.rentForeverConfig) setRentForeverConfig(data.rentForeverConfig);
        if (data.buyLaterConfig) setBuyLaterConfig(data.buyLaterConfig);
        if (data.activeScenario) setActiveScenario(data.activeScenario);
      } catch {
        alert('קובץ לא תקין');
      }
    };
    reader.readAsText(file);
  }, []);

  return {
    activeScenario,
    setActiveScenario,
    activeConfig,
    setActiveConfig,
    activeResult,
    allResults,
    resetToDefaults,
    exportJSON,
    importJSON,
  };
}
