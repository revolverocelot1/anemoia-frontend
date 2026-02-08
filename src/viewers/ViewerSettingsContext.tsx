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
      return stored ? { ...defaultSettings, ...JSON.parse(stored) } : defaultSettings;
    } catch {
      return defaultSettings;
    }
  });

  const update = useCallback((partial: Partial<ViewerSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...partial };
      localStorage.setItem('viewerSettings', JSON.stringify(updated));
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