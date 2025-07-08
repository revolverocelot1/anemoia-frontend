import { useViewerSettings, type QualitySetting } from '../viewers/ViewerSettingsContext';

const QualitySelector = () => {
  const { settings, setQuality } = useViewerSettings();
  const qualities: QualitySetting[] = ['Low', 'Medium', 'High'];

  return (
    <div>
      <h3 className="text-sm font-medium text-gray-400 mb-2">Quality</h3>
      <div className="flex space-x-2">
        {qualities.map((q) => (
          <button
            key={q}
            onClick={() => setQuality(q)}
            className={`flex-1 px-3 py-1.5 text-xs font-bold rounded-md transition-all duration-200 ${
              settings.quality === q
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/70'
            }`}
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
};

export default QualitySelector; 