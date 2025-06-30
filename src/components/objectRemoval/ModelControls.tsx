interface ModelControlsProps {
  settings: {
    quality: 'fast' | 'balanced' | 'high';
    maskDilation: number;
    autoMask: boolean;
  };
  onSettingsChange: (settings: any) => void;
  disabled?: boolean;
}

const ModelControls = ({ settings, onSettingsChange, disabled = false }: ModelControlsProps) => {
  const handleQualityChange = (quality: 'fast' | 'balanced' | 'high') => {
    onSettingsChange({ ...settings, quality });
  };

  const handleMaskDilationChange = (maskDilation: number) => {
    onSettingsChange({ ...settings, maskDilation });
  };

  const handleAutoMaskToggle = () => {
    onSettingsChange({ ...settings, autoMask: !settings.autoMask });
  };

  return (
    <div className="space-y-6">
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-4">
        <h3 className="font-semibold text-[var(--text)] mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-sm">settings</span>
          Processing Settings
        </h3>

        {/* Quality Setting */}
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-[var(--text)] mb-2">
              Quality
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'fast', label: 'Fast', description: '~2s' },
                { id: 'balanced', label: 'Balanced', description: '~5s' },
                { id: 'high', label: 'High', description: '~10s' }
              ].map((option) => (
                <button
                  key={option.id}
                  onClick={() => handleQualityChange(option.id as any)}
                  disabled={disabled}
                  className={`
                    p-3 text-xs rounded-lg border transition-all
                    ${settings.quality === option.id
                      ? 'border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]'
                      : 'border-[var(--border)] bg-[var(--background)] text-[var(--text)] hover:border-[var(--primary)]/50'
                    }
                    disabled:opacity-50 disabled:cursor-not-allowed
                  `}
                >
                  <div className="font-medium">{option.label}</div>
                  <div className="text-[var(--text-secondary)]">{option.description}</div>
                </button>
              ))}
            </div>
            <p className="text-xs text-[var(--text-secondary)] mt-2">
              Higher quality produces better results but takes longer to process
            </p>
          </div>

          {/* Mask Dilation */}
          <div>
            <label className="block text-sm font-medium text-[var(--text)] mb-2">
              Mask Expansion: {settings.maskDilation}px
            </label>
            <input
              type="range"
              min="0"
              max="20"
              value={settings.maskDilation}
              onChange={(e) => handleMaskDilationChange(Number(e.target.value))}
              disabled={disabled}
              className="w-full h-2 bg-[var(--surface)] rounded-lg appearance-none cursor-pointer
                       slider:bg-[var(--primary)] disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <div className="flex justify-between text-xs text-[var(--text-secondary)] mt-1">
              <span>None</span>
              <span>Maximum</span>
            </div>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              Expands the mask to ensure complete object removal
            </p>
          </div>

          {/* Auto Mask */}
          <div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.autoMask}
                onChange={handleAutoMaskToggle}
                disabled={disabled}
                className="w-4 h-4 text-[var(--primary)] bg-[var(--background)] border-[var(--border)] 
                         rounded focus:ring-[var(--primary)] focus:ring-2 disabled:opacity-50"
              />
              <div className="flex-1">
                <div className="text-sm font-medium text-[var(--text)]">Smart Segmentation</div>
                <div className="text-xs text-[var(--text-secondary)]">
                  Automatically improve mask boundaries with AI
                </div>
              </div>
            </label>
          </div>
        </div>
      </div>

      {/* Model Information */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-4">
        <h3 className="font-semibold text-[var(--text)] mb-3 flex items-center gap-2">
          <span className="material-symbols-outlined text-sm">psychology</span>
          AI Models
        </h3>
        
        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-[var(--text-secondary)]">Segmentation:</span>
            <span className="text-[var(--text)] font-medium">MobileSAM</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[var(--text-secondary)]">Inpainting:</span>
            <span className="text-[var(--text)] font-medium">LaMa</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[var(--text-secondary)]">Processing:</span>
            <span className="text-green-600 font-medium">Local</span>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-[var(--border)]">
          <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
            <span className="material-symbols-outlined text-sm text-green-600">security</span>
            Your images are processed locally and never sent to any server
          </div>
        </div>
      </div>

      {/* Performance Stats */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 
                    border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-2">
          <span className="material-symbols-outlined text-sm">speed</span>
          Performance
        </h3>
        
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-blue-800 dark:text-blue-200">Model Size:</span>
            <span className="text-blue-900 dark:text-blue-100 font-medium">~15MB</span>
          </div>
          <div className="flex justify-between">
            <span className="text-blue-800 dark:text-blue-200">Memory Usage:</span>
            <span className="text-blue-900 dark:text-blue-100 font-medium">~200MB</span>
          </div>
          <div className="flex justify-between">
            <span className="text-blue-800 dark:text-blue-200">Avg. Processing:</span>
            <span className="text-blue-900 dark:text-blue-100 font-medium">3-8 seconds</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModelControls;