import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';

interface BreadcrumbItem {
  label: string;
  path: string;
  icon?: string;
}

const NavigationBreadcrumb: React.FC = () => {
  const location = useLocation();
  const pathSegments = location.pathname.split('/').filter(Boolean);

  const routeLabels: Record<string, string> = {
    'splat-viewer': '3D Splat Viewer',
    'landing': 'Overview',
    'upscaler': 'AI Upscaler',
    'ascii-video': 'ASCII Video Converter',
    'depth-map': 'Depth Map Generator',
    'image-comparison': 'Image Comparison',
    'face-swap': 'Face Swap',
    'background-remover': 'Background Remover',
    'subtitle-editor': 'Subtitle Editor',
    'pose-estimation': 'Pose Estimation',
    'triangle-splatting': 'Triangle Splatting',
    'anime-gallery': 'Anime Gallery',
    'doom': 'DOOM Game',
    'settings': 'Settings',
    'account': 'Account',
    'faq': 'FAQ',
    'support': 'Support',
  };

  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    const items: BreadcrumbItem[] = [
      { label: 'Home', path: '/', icon: 'home' }
    ];

    let currentPath = '';
    pathSegments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      const label = routeLabels[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);
      
      items.push({
        label,
        path: currentPath,
        icon: index === 0 ? 'folder' : undefined
      });
    });

    return items;
  };

  const breadcrumbs = generateBreadcrumbs();

  if (breadcrumbs.length <= 1) return null;

  return (
    <motion.nav
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-r from-gray-900/50 to-black/50 backdrop-blur-sm border-b border-gray-800/50 px-6 md:px-10 lg:px-20 xl:px-40 py-3"
    >
      <ol className="flex items-center space-x-2 text-sm">
        {breadcrumbs.map((item, index) => (
          <li key={item.path} className="flex items-center">
            {index > 0 && (
              <span className="material-symbols-outlined text-gray-600 text-base mx-2">
                chevron_right
              </span>
            )}
            
            {index === breadcrumbs.length - 1 ? (
              <span className="text-gray-300 font-medium flex items-center gap-1">
                {item.icon && (
                  <span className="material-symbols-outlined text-base">
                    {item.icon}
                  </span>
                )}
                {item.label}
              </span>
            ) : (
              <Link
                to={item.path}
                className="text-gray-500 hover:text-gray-300 transition-colors flex items-center gap-1 group"
              >
                {item.icon && (
                  <span className="material-symbols-outlined text-base group-hover:text-cyan-400">
                    {item.icon}
                  </span>
                )}
                <span className="group-hover:text-cyan-400">{item.label}</span>
              </Link>
            )}
          </li>
        ))}
      </ol>
    </motion.nav>
  );
};

export default NavigationBreadcrumb; 