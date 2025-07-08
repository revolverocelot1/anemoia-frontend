import React from 'react';
import { FaceSwapConfig } from '../lib/FaceSwapEngine';

interface SettingsPanelProps {
  config: FaceSwapConfig;
  onConfigUpdate: (config: Partial<FaceSwapConfig>) => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  config,
  onConfigUpdate
}) => {
  return (
    <div className="settings-panel">
      <div className="settings-group">
        <label htmlFor="blending-mode">Blending Mode</label>
        <select
          id="blending-mode"
          value={config.blendingMode}
          onChange={(e) => onConfigUpdate({ blendingMode: e.target.value as any })}
        >
          <option value="seamless">Seamless Clone</option>
          <option value="poisson">Poisson Blending</option>
          <option value="alpha">Alpha Blending</option>
        </select>
      </div>

      <div className="settings-group">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={config.preserveExpression}
            onChange={(e) => onConfigUpdate({ preserveExpression: e.target.checked })}
          />
          Preserve Expression
        </label>
      </div>

      <div className="settings-group">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={config.enableEnhancement}
            onChange={(e) => onConfigUpdate({ enableEnhancement: e.target.checked })}
          />
          Enable Face Enhancement
        </label>
      </div>

      <div className="settings-group">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={config.useWebGL}
            onChange={(e) => onConfigUpdate({ useWebGL: e.target.checked })}
          />
          Use WebGL Acceleration
        </label>
      </div>
    </div>
  );
}; 