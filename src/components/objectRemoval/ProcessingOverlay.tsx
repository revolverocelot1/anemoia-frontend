interface ProcessingOverlayProps {
  stage: 'segmenting' | 'removing' | 'finalizing' | null;
  progress: number;
}

const ProcessingOverlay = ({ stage, progress }: ProcessingOverlayProps) => {
  const getStageInfo = (currentStage: typeof stage) => {
    switch (currentStage) {
      case 'segmenting':
        return {
          title: 'Analyzing Image',
          description: 'AI is identifying objects and creating masks...',
          icon: 'psychology',
          color: 'text-blue-600'
        };
      case 'removing':
        return {
          title: 'Removing Objects',
          description: 'AI is intelligently filling masked areas...',
          icon: 'auto_fix_high',
          color: 'text-purple-600'
        };
      case 'finalizing':
        return {
          title: 'Finalizing Result',
          description: 'Applying final touches and optimizations...',
          icon: 'check_circle',
          color: 'text-green-600'
        };
      default:
        return {
          title: 'Processing',
          description: 'Please wait...',
          icon: 'hourglass_empty',
          color: 'text-gray-600'
        };
    }
  };

  const stageInfo = getStageInfo(stage);

  return (
    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 rounded-lg">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-8 max-w-sm w-full mx-4">
        <div className="text-center">
          {/* Progress Icon */}
          <div className="mb-6">
            <div className="relative w-20 h-20 mx-auto">
              {/* Background Circle */}
              <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="transparent"
                  className="text-gray-200 dark:text-gray-700"
                />
                {/* Progress Circle */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="transparent"
                  strokeDasharray={`${2 * Math.PI * 40}`}
                  strokeDashoffset={`${2 * Math.PI * 40 * (1 - progress / 100)}`}
                  className="text-blue-600 transition-all duration-300 ease-out"
                  strokeLinecap="round"
                />
              </svg>
              
              {/* Center Icon */}
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={`material-symbols-outlined text-2xl ${stageInfo.color}`}>
                  {stageInfo.icon}
                </span>
              </div>
            </div>
          </div>

          {/* Stage Information */}
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {stageInfo.title}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {stageInfo.description}
            </p>
          </div>

          {/* Progress Bar */}
          <div className="mb-4">
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${Math.max(progress, 5)}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              {Math.round(progress)}% complete
            </p>
          </div>

          {/* Stage Indicators */}
          <div className="flex justify-center space-x-4">
            {[
              { key: 'segmenting', label: 'Analyze', icon: 'psychology' },
              { key: 'removing', label: 'Remove', icon: 'auto_fix_high' },
              { key: 'finalizing', label: 'Finalize', icon: 'check_circle' }
            ].map((s, index) => {
              const isActive = s.key === stage;
              const isCompleted = stage && ['segmenting', 'removing', 'finalizing'].indexOf(stage) > index;
              
              return (
                <div key={s.key} className="flex flex-col items-center">
                  <div 
                    className={`
                      w-8 h-8 rounded-full flex items-center justify-center text-xs transition-all
                      ${isActive 
                        ? 'bg-blue-600 text-white' 
                        : isCompleted 
                        ? 'bg-green-600 text-white' 
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                      }
                    `}
                  >
                    <span className="material-symbols-outlined text-sm">
                      {isCompleted ? 'check' : s.icon}
                    </span>
                  </div>
                  <span className={`
                    text-xs mt-1 transition-colors
                    ${isActive 
                      ? 'text-blue-600 font-medium' 
                      : isCompleted 
                      ? 'text-green-600 font-medium' 
                      : 'text-gray-500'
                    }
                  `}>
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Estimated Time */}
          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <span className="material-symbols-outlined text-sm">schedule</span>
              <span>
                {stage === 'segmenting' && 'Estimated: 2-3 seconds'}
                {stage === 'removing' && 'Estimated: 3-5 seconds'} 
                {stage === 'finalizing' && 'Estimated: 1-2 seconds'}
                {!stage && 'Processing...'}
              </span>
            </div>
          </div>

          {/* Tips */}
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className="text-xs text-blue-800 dark:text-blue-200">
              💡 Tip: For faster processing, use smaller images or lower quality settings
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProcessingOverlay;