import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

export interface PromoAdProps {
  id: string;
  videoSrc: string;
  targetUrl: string;
  tagline: string;
  title: string;
  subtitle: string;
  ctaText: string;
  allowlist?: string[];
  blocklist?: string[];
}

const PromoAd: React.FC<PromoAdProps> = ({
  id,
  videoSrc,
  targetUrl,
  tagline,
  title,
  subtitle,
  ctaText,
  allowlist,
  blocklist
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const location = useLocation();

  // Check if we should show the ad based on path and dismiss state
  useEffect(() => {
    const dismissTimestamp = localStorage.getItem(`promo-dismissed-${id}`);
    let isDismissed = false;
    
    // If dismissed within the last 1 hour, don't show it
    if (dismissTimestamp) {
      const timeSinceDismissal = Date.now() - parseInt(dismissTimestamp, 10);
      if (timeSinceDismissal < 60 * 60 * 1000) {
        isDismissed = true;
      } else {
        localStorage.removeItem(`promo-dismissed-${id}`);
      }
    }

    // Determine if this ad is allowed on the current path
    const path = location.pathname;
    const isAllowed = allowlist 
      ? allowlist.includes(path) 
      : blocklist 
        ? !blocklist.includes(path) 
        : true;
    
    // Delay the appearance slightly
    if (isAllowed && !isDismissed) {
      const timer = setTimeout(() => setIsVisible(true), 500);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [location.pathname, id, allowlist, blocklist]);

  const handleDismiss = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsVisible(false);
    localStorage.setItem(`promo-dismissed-${id}`, Date.now().toString());
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          style={{ width: '320px', height: '220px' }}
          className="relative inline-block z-[40] rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.6)] group mb-4 last:mb-0"
        >
          {/* Ad Container linking to target URL */}
          <Link to={targetUrl} className="block relative w-full h-full cursor-pointer overflow-hidden rounded-2xl bg-black border border-white/10 group-hover:border-cyan-500/50 transition-colors duration-300">
            
            {/* Background Video */}
            <video 
              autoPlay 
              loop 
              muted 
              playsInline 
              className="absolute inset-0 w-full h-full object-cover opacity-60 mix-blend-screen scale-105 group-hover:scale-100 transition-transform duration-700"
            >
              <source src={videoSrc} type="video/mp4" />
            </video>

            {/* Gradient Overlay for text readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent pointer-events-none" />

            {/* Dismiss Button - Red Cross */}
            <button 
              onClick={handleDismiss}
              className="absolute -top-2 -right-2 z-30 w-7 h-7 flex items-center justify-center rounded-full bg-red-600 text-white shadow-lg border-2 border-white hover:bg-red-500 hover:scale-110 transition-all"
              aria-label="Dismiss Ad"
            >
              <span className="material-symbols-outlined text-[14px] font-bold">close</span>
            </button>

            {/* Content / Copy */}
            <div className="relative z-10 p-5 flex flex-col justify-end h-full">
              <div className="inline-block px-2 py-1 bg-cyan-500/20 border border-cyan-400/30 rounded text-[10px] font-bold tracking-widest text-cyan-300 uppercase mb-3 w-max backdrop-blur-md">
                {tagline}
              </div>
              <h3 className="text-white font-bold text-lg leading-tight mb-2 drop-shadow-md">
                {title}
              </h3>
              <p className="text-gray-300 text-xs font-light mb-4 drop-shadow-md">
                {subtitle}
              </p>
              
              <div className="flex items-center text-cyan-400 text-xs font-bold uppercase tracking-wider group-hover:text-cyan-300 transition-colors">
                {ctaText}
                <span className="material-symbols-outlined text-[14px] ml-1 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform">north_east</span>
              </div>
            </div>

            {/* Subtle pulse edge glow */}
            <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_20px_rgba(6,182,212,0.1)] group-hover:shadow-[inset_0_0_30px_rgba(6,182,212,0.3)] transition-shadow duration-500" />
          </Link>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PromoAd;
