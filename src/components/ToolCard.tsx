import { motion, type Variants } from 'framer-motion';
import { Link } from 'react-router-dom';
import { BsLayers, BsPersonBoundingBox, BsArrowsAngleExpand, BsDice5, BsColumnsGap, BsTools } from 'react-icons/bs';

interface ToolCardProps {
  title: string;
  description: string;
  icon: string;
  accent: '1' | '2' | '3' | '4' | '5' | string;
  path: string;
  variants?: Variants;
}

const iconMap: Record<string, React.ComponentType<any>> = {
  layers: BsLayers,
  accessibility_new: BsPersonBoundingBox,
  zoom_in: BsArrowsAngleExpand,
  compare_arrows: BsColumnsGap,
  camera_invert: BsDice5,
  misc: BsTools,
};

const ToolCard = ({ title, description, icon, accent, path, variants }: ToolCardProps) => {
  const IconComp = iconMap[icon] || BsTools;

  return (
    <motion.div variants={variants}>
      <Link to={path} className="card h-full" data-accent={accent}>
        <div className="p-6 flex flex-col items-start text-left flex-1">
          <div className="icon-container" data-accent={accent}>
            <IconComp className="text-current w-8 h-8" />
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