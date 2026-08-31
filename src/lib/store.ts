import { useEffect, useState } from "react";
import type { Rating, Results } from "./model";

const RESULTS_KEY = "nfl-predictor-results";
const OVERRIDES_KEY = "nfl-predictor-overrides";

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function usePersistentState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setValue(read(key, initial));
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    if (hydrated) window.localStorage.setItem(key, JSON.stringify(value));
  }, [key, value, hydrated]);

  return [value, setValue, hydrated] as const;
}

export function usePredictorStore() {
  const [results, setResults, resultsReady] = usePersistentState<Results>(RESULTS_KEY, {});
  const [overrides, setOverrides, overridesReady] = usePersistentState<Record<string, Rating>>(
    OVERRIDES_KEY,
    {},
  );

  const reset = () => {
    setResults({});
    setOverrides({});
  };

  return {
    results,
    setResults,
    overrides,
    setOverrides,
    reset,
    ready: resultsReady && overridesReady,
  };
}
