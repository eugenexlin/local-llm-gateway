import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import type { MetricType } from "../types/metrics";
import { getItem, setItem } from "../utils/storage";
import { useAuth } from "./AuthContext";

export interface DashboardMetricsConfig {
  enabled: MetricType[];
  disabled: MetricType[];
}

export const ALL_METRICS: MetricType[] = [
  "total_tokens",
  "input_tokens",
  "output_tokens",
  "ttft_ms",
  "stream_duration_ms",
  "duration_ms",
  "tokens_per_sec",
  "input_tokens_per_sec",
  "output_tokens_per_sec",
  "requests",
];

const DEFAULT_CONFIG: DashboardMetricsConfig = {
  enabled: [
    "total_tokens",
    "input_tokens",
    "output_tokens",
    "input_tokens_per_sec",
    "output_tokens_per_sec",
    "requests",
  ],
  disabled: ["ttft_ms", "stream_duration_ms", "duration_ms", "tokens_per_sec"],
};

interface DashboardMetricsContextType {
  config: DashboardMetricsConfig;
  visibleMetrics: MetricType[];
  hideMetric: (metric: MetricType) => void;
  showMetric: (metric: MetricType) => void;
  reorderEnabled: (fromIndex: number, toIndex: number) => void;
  resetToDefault: () => void;
}

const DashboardMetricsContext =
  createContext<DashboardMetricsContextType | null>(null);

interface DashboardMetricsProviderProps {
  children: ReactNode;
}

export function DashboardMetricsProvider({
  children,
}: DashboardMetricsProviderProps) {
  const { user } = useAuth();
  const [config, setConfig] = useState<DashboardMetricsConfig>(() => {
    if (!user) return DEFAULT_CONFIG;
    const stored = getItem(user.id, "dashboard-metrics-config");
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return DEFAULT_CONFIG;
      }
    }
    return DEFAULT_CONFIG;
  });

  useEffect(() => {
    if (user) {
      setItem(user.id, "dashboard-metrics-config", JSON.stringify(config));
    }
  }, [config, user]);

  const hideMetric = useCallback((metric: MetricType) => {
    setConfig((prev) => ({
      enabled: prev.enabled.filter((m) => m !== metric),
      disabled: prev.disabled.includes(metric)
        ? prev.disabled
        : [...prev.disabled, metric],
    }));
  }, []);

  const showMetric = useCallback((metric: MetricType) => {
    setConfig((prev) => ({
      enabled: prev.enabled.includes(metric)
        ? prev.enabled
        : [...prev.enabled, metric],
      disabled: prev.disabled.filter((m) => m !== metric),
    }));
  }, []);

  const reorderEnabled = useCallback((fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    setConfig((prev) => {
      const newEnabled = [...prev.enabled];
      const [movedItem] = newEnabled.splice(fromIndex, 1);
      newEnabled.splice(toIndex, 0, movedItem);
      return { ...prev, enabled: newEnabled };
    });
  }, []);

  const resetToDefault = useCallback(() => {
    setConfig(DEFAULT_CONFIG);
  }, []);

  const visibleMetrics = config.enabled;

  return (
    <DashboardMetricsContext.Provider
      value={{
        config,
        visibleMetrics,
        hideMetric,
        showMetric,
        reorderEnabled,
        resetToDefault,
      }}
    >
      {children}
    </DashboardMetricsContext.Provider>
  );
}

export function useDashboardMetrics() {
  const context = useContext(DashboardMetricsContext);
  if (!context) {
    throw new Error(
      "useDashboardMetrics must be used within a DashboardMetricsProvider",
    );
  }
  return context;
}
