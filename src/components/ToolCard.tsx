import { Link } from 'react-router-dom';
import { motion, type Variants } from 'framer-motion';

// Create a motion-compatible Link component
const MotionLink = motion(Link);

interface ToolCardProps {
  title: string;
  description: string;
  icon: string;
  accent: '1' | '2' | '3' | '4' | string;
  path: string;
  variants?: Variants;
}

const ToolCard = ({ title, description, icon, accent, path, variants }: ToolCardProps) => {
  return (
    <motion.div variants={variants}>
      <Link to={path} className="card h-full" data-accent={accent}>
        <div className="p-6 flex flex-col items-start text-left flex-1">
          <div className="icon-container" data-accent={accent}>
            <span className="material-symbols-outlined text-2xl">{icon}</span>
          </div>
          <h3 className="text-lg font-bold mb-2 text-white">{title}</h3>
          <p className="text-sm text-[var(--text-secondary)] flex-1">{description}</p>
        </div>
        <div className="px-6 pb-4 mt-auto">
          <div className="flex items-center text-sm font-medium text-[var(--primary-color)]">
            <span>Use Tool</span>
            <span className="material-symbols-outlined text-lg ml-1">arrow_forward</span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

export default ToolCard; 