interface ModelStatusIndicatorProps {
  modelName: string;
  status: 'ready' | 'downloading' | 'not-loaded';
  progress: number;
}

const ModelStatusIndicator = ({ modelName, status, progress }: ModelStatusIndicatorProps) => {
  return (
    <div className="flex flex-col space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[var(--text-primary)] font-medium">{modelName}</span>
        <div className="flex items-center space-x-2">
          {status === 'ready' && (
            <span className="material-symbols-outlined text-[var(--accent-color-1)]">check_circle</span>
          )}
          {status === 'downloading' && (
            <span className="text-[var(--text-secondary)] text-sm">{progress}%</span>
          )}
        </div>
      </div>
      {status === 'downloading' && (
        <div className="w-full bg-white bg-opacity-20 rounded-full h-1.5">
          <div 
            className="bg-[var(--primary-color)] h-1.5 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
};

export default ModelStatusIndicator; 