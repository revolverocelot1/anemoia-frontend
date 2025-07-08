import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

const usePerformanceStats = () => {
  const [stats, setStats] = useState({ fps: 0, ms: 0 });
  const frameCount = useRef(0);
  const lastTime = useRef(performance.now());
  const animationFrameId = useRef<number | null>(null);

  useEffect(() => {
    const loop = (now: number) => {
      frameCount.current++;
      const delta = now - lastTime.current;

      if (delta >= 500) {
        setStats({
          fps: Math.round((frameCount.current * 1000) / delta),
          ms: delta / frameCount.current,
        });
        lastTime.current = now;
        frameCount.current = 0;
      }
      animationFrameId.current = requestAnimationFrame(loop);
    };
    animationFrameId.current = requestAnimationFrame(loop);
    
    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, []);

  return stats;
};

const HolographicStats = () => {
  const stats = usePerformanceStats();

  if (!stats) return null;

  const { fps, ms } = stats;

  const flickerAnimation = {
    opacity: [1, 0.9, 1, 0.85, 0.95, 1],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      repeatType: 'reverse' as const,
    },
  };

  return (
    <div style={{
      position: 'absolute',
      top: '16px',
      left: '16px',
      zIndex: 100,
      pointerEvents: 'none'
    }}>
      <motion.div
        animate={flickerAnimation}
        style={{
          fontFamily: "'Orbitron', sans-serif",
          color: '#00d9ff',
          textShadow: '0 0 4px #00d9ff, 0 0 8px #00d9ff',
          padding: '12px',
          backgroundColor: 'rgba(0, 40, 50, 0.4)',
          border: '1px solid rgba(0, 217, 255, 0.25)',
          borderRadius: '8px',
          backdropFilter: 'blur(3px)',
          width: '130px',
          textAlign: 'left',
          fontSize: '14px',
          lineHeight: '1.2'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={{ opacity: 0.7 }}>FPS</span>
          <span style={{ fontSize: '18px', fontWeight: 'bold' }}>{fps}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '6px' }}>
          <span style={{ opacity: 0.7 }}>MS</span>
          <span style={{ fontWeight: 'bold' }}>{ms.toFixed(1)}</span>
        </div>
        <div style={{
          height: '1px',
          background: 'linear-gradient(to right, transparent, rgba(0, 217, 255, 0.3), transparent)',
          margin: '8px 0'
        }}></div>
        <div style={{
          textAlign: 'center',
          fontSize: '10px',
          opacity: 0.6,
          letterSpacing: '1px',
          textTransform: 'uppercase',
        }}>
          PERF-MONITOR
        </div>
      </motion.div>
    </div>
  );
};

export default HolographicStats; 