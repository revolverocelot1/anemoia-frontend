import { motion } from 'framer-motion';

interface LoadingOverlayProps {
  message: string;
  progress?: number;
}

const LoadingOverlay = ({ message, progress }: LoadingOverlayProps) => {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-[var(--secondary-color)] p-8 rounded-xl shadow-2xl max-w-md w-full mx-4">
        <div className="flex flex-col items-center space-y-4">
          <motion.span
            className="material-symbols-outlined text-5xl text-[var(--primary-color)]"
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, ease: "linear", duration: 1 }}
          >
            autorenew
          </motion.span>
          <p className="text-[var(--text-primary)] text-lg font-medium text-center">{message}</p>
          {progress !== undefined && (
            <div className="w-full">
              <div className="w-full bg-white bg-opacity-20 rounded-full h-2.5">
                <div
                  className="bg-[var(--primary-color)] h-2.5 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoadingOverlay; 