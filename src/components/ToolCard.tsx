import { motion, type Variants } from 'framer-motion';
import { Link } from 'react-router-dom';
import { BsLayers, BsPersonBoundingBox, BsArrowsAngleExpand, BsDice5, BsColumnsGap, BsTools } from 'react-icons/bs';
import IconDepthMap from './icons/IconDepthMap';
import IconPoseEstimation from './icons/IconPoseEstimation';
import IconAIUpscaler from './icons/IconAIUpscaler';
import IconSplatViewer from './icons/IconSplatViewer';
import IconImageComparison from './icons/IconImageComparison';
import IconVideoCaptionStudio from './icons/IconVideoCaptionStudio';
import IconFaceSwap from './icons/IconFaceSwap';

interface ToolCardProps {
  title: string;
  description: string;
  icon: string;
  accent: '1' | '2' | '3' | '4' | '5' | string;
  path: string;
  variants?: Variants;
}

const iconMap: Record<string, React.ComponentType<any>> = {
  layers: IconDepthMap,
  accessibility_new: IconPoseEstimation,
  zoom_in: IconAIUpscaler,
  compare_arrows: IconImageComparison,
  camera_invert: IconSplatViewer,
  subtitles: IconVideoCaptionStudio,
  face_retouching_natural: IconFaceSwap,
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