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
      <Link to={path} className="card h-full block" data-accent={accent}>
        <div className="p-6 flex flex-col items-start text-left flex-1 h-full">
          <div className="icon-container mb-4" data-accent={accent}>
            <IconComp className="text-white w-8 h-8" style={{ width: '32px', height: '32px' }} />
          </div>
          <h3 className="text-xl font-bold mb-3 text-white">{title}</h3>
          <p className="text-base text-gray-300 flex-1 leading-relaxed">{description}</p>
          <div className="mt-4 pt-4 w-full">
            <div className="flex items-center text-sm font-medium text-cyan-400 hover:text-cyan-300 transition-colors">
              <span>Use Tool</span>
              <span className="material-symbols-outlined text-lg ml-1">arrow_forward</span>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

export default ToolCard; 