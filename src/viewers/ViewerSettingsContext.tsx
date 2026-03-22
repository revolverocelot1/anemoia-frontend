import { createContext, useContext, useState, ReactNode, useMemo, useCallback } from 'react';

export type QualitySetting = 'Low' | 'Medium' | 'High';

export interface ViewerSettings {
  exposure: number;
  wireframe: boolean;
  backgroundColor: string; // hex
  quality: QualitySetting;
  fov: number; // Field of view in degrees (inversely related to focal length)
}

const defaultSettings: ViewerSettings = {
  exposure: 1.0,
  wireframe: false,
  backgroundColor: '#000000',
  quality: 'High',
  fov: 60,
};

interface ViewerSettingsContextProps {
  settings: ViewerSettings;
  update: (partial: Partial<ViewerSettings>) => void;
  setQuality: (quality: QualitySetting) => void;
}

const ViewerSettingsContext = createContext<ViewerSettingsContextProps | undefined>(undefined);

export const ViewerSettingsProvider = ({ children }: { children: ReactNode }) => {
  const [settings, setSettings] = useState<ViewerSettings>(() => {
    try {
      const stored = localStorage.getItem('viewerSettings');
      if (stored) {
        const parsed = JSON.parse(stored);
        // Exclude 'fov' from localStorage — it's model-specific and should
        // always start at the default (60°), then be overridden by model metadata.
        const { fov: _discardedFov, ...rest } = parsed;
        return { ...defaultSettings, ...rest };
      }
      return defaultSettings;
    } catch {
      return defaultSettings;
    }
  });

  const update = useCallback((partial: Partial<ViewerSettings>) => {
    setSettings((prev) => {
      const changedKeys = Object.entries(partial) as Array<[keyof ViewerSettings, ViewerSettings[keyof ViewerSettings]]>;
      if (changedKeys.length === 0 || changedKeys.every(([key, value]) => prev[key] === value)) {
        return prev;
      }
      const updated = { ...prev, ...partial };
      // Persist to localStorage but exclude fov (model-specific, not session-persistent)
      const { fov: _fov, ...persistable } = updated;
      localStorage.setItem('viewerSettings', JSON.stringify(persistable));
      return updated;
    });
  }, []);

  const setQuality = useCallback((quality: QualitySetting) => {
    update({ quality });
  }, [update]);

  const value = useMemo(() => ({ settings, update, setQuality }), [settings, update, setQuality]);

  return <ViewerSettingsContext.Provider value={value}>{children}</ViewerSettingsContext.Provider>;
};

export const useViewerSettings = () => {
  const ctx = useContext(ViewerSettingsContext);
  if (!ctx) throw new Error('useViewerSettings must be inside ViewerSettingsProvider');
  return ctx;
}; 