import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "grapevine_seen_tooltips";

export function useFeatureTooltip(featureId: string) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const seen = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as string[];
    if (!seen.includes(featureId)) {
      const t = setTimeout(() => setVisible(true), 2000);
      return () => clearTimeout(t);
    }
  }, [featureId]);

  const dismiss = useCallback(() => {
    setVisible(false);
    const seen = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as string[];
    if (!seen.includes(featureId)) {
      seen.push(featureId);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seen));
    }
  }, [featureId]);

  return { visible, dismiss };
}
