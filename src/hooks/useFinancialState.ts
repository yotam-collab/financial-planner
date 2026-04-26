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

  // House schema migration: if saved is from old schema (no lawyerFeeRate field),
  // zero out the legacy closingCosts field to prevent double-counting with the new
  // auto-computed lawyer/broker/other fees.
  const savedHouse = saved.house as Partial<ScenarioConfig['house']> | undefined;
  const isOldHouseSchema = savedHouse && savedHouse.lawyerFeeRate === undefined;
  const mergedHouse = {
    ...defaults.house,
    ...(savedHouse ?? {}),
    ...(isOldHouseSchema ? { closingCosts: 0 } : {}),
  };

  // Assets schema migration: if saved is from old (shared kerenHishtalmut) schema
  // and the new per-person fields are absent, split the shared balance ~equally
  // (a sensible default; user can re-tune from the input panel).
  const savedAssets = saved.assets as Partial<ScenarioConfig['assets']> | undefined;
  const isOldAssetsSchema =
    savedAssets &&
    savedAssets.yotamKerenHishtalmut === undefined &&
    savedAssets.kerenHishtalmut !== undefined;
  let mergedAssets = { ...defaults.assets, ...(savedAssets ?? {}) };
  if (isOldAssetsSchema) {
    const sharedBalance = savedAssets.kerenHishtalmut ?? 0;
    const sharedAge = savedAssets.kerenHishtalmutLiquidAge ?? defaults.assets.yotamKerenHishtalmutLiquidAge;
    mergedAssets = {
      ...mergedAssets,
      yotamKerenHishtalmut: Math.round(sharedBalance * 0.6),
      hadasKerenHishtalmut: Math.round(sharedBalance * 0.4),
      yotamKerenHishtalmutLiquidAge: sharedAge,
      hadasKerenHishtalmutLiquidAge: defaults.assets.hadasKerenHishtalmutLiquidAge,
      kerenHishtalmut: 0, // legacy field zeroed so it doesn't double-count
    };
  }

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
    assets: mergedAssets,
    income: { ...defaults.income, ...saved.income },
    expenses: { ...defaults.expenses, ...saved.expenses },
    house: mergedHouse,
    market: { ...defaults.market, ...saved.market },
    happiness: { ...defaults.happiness, ...(saved.happiness ?? {}) },
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
