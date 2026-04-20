import { useState, useCallback, useEffect, useMemo } from 'react';
import type { ScenarioConfig } from '../lib/types';
import { createDefaultConfig } from '../lib/defaults';
import { simulate } from '../lib/simulator';

const STORAGE_KEY = 'financial-planner-state-v2';

interface PersistedState {
  config: ScenarioConfig;
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
    // New fields — fall back to defaults if missing in saved state
    simulationStartYear: saved.simulationStartYear ?? defaults.simulationStartYear,
    yotamBirthYear: saved.yotamBirthYear ?? defaults.yotamBirthYear,
    yotamBirthMonth: saved.yotamBirthMonth ?? defaults.yotamBirthMonth,
    hadasBirthYear: saved.hadasBirthYear ?? defaults.hadasBirthYear,
    hadasBirthMonth: saved.hadasBirthMonth ?? defaults.hadasBirthMonth,
    hadasFullRetirementAge: saved.hadasFullRetirementAge ?? defaults.hadasFullRetirementAge,
    assets: { ...defaults.assets, ...saved.assets },
    income: { ...defaults.income, ...saved.income },
    expenses: { ...defaults.expenses, ...saved.expenses },
    house: { ...defaults.house, ...saved.house },
    market: { ...defaults.market, ...saved.market },
  };
}

export function useFinancialState() {
  const saved = loadFromStorage();

  const [config, setConfig] = useState<ScenarioConfig>(
    mergeConfig(saved?.config, createDefaultConfig())
  );

  useEffect(() => {
    saveToStorage({ config });
  }, [config]);

  const result = useMemo(() => simulate(config), [config]);

  const resetToDefaults = useCallback(() => {
    setConfig(createDefaultConfig());
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const exportJSON = useCallback(() => {
    const blob = new Blob([JSON.stringify({ config }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `financial-plan-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [config]);

  const importJSON = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string) as PersistedState;
        if (data.config) setConfig(mergeConfig(data.config, createDefaultConfig()));
      } catch {
        alert('קובץ לא תקין');
      }
    };
    reader.readAsText(file);
  }, []);

  return { config, setConfig, result, resetToDefaults, exportJSON, importJSON };
}
