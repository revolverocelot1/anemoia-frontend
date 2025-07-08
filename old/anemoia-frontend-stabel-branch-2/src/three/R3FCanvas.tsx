import { Canvas } from '@react-three/fiber';
import { Suspense, useEffect, useState } from 'react';
import SolarSystemBackground from './SolarSystemBackground';

const R3FCanvas = () => {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    console.log('R3FCanvas mounted and rendering');
    console.log('Available backgrounds:', {
      SolarSystemBackground: !!SolarSystemBackground,
    });
    
    // Check if modules are properly loaded
    try {
      if (!Canvas) {
        throw new Error('Canvas component not loaded');
      }
      
      // Add a small delay to ensure modules are ready
      setTimeout(() => {
        setIsReady(true);
      }, 100);
    } catch (e: any) {
      console.error('R3FCanvas initialization error:', e);
      setError(e.message);
    }
    
    return () => console.log('R3FCanvas unmounted');
  }, []);

  if (error) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black text-red-500">
        <div className="text-center">
          <p>3D Background Error:</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!isReady) {
    return <div className="fixed inset-0 bg-black" />;
  }

  return (
    <Canvas
      camera={{ position: [15, 10, 25], fov: 60 }}
      style={{ 
        width: '100%',
        height: '100%',
        position: 'fixed',
        top: 0,
        left: 0,
        background: 'radial-gradient(ellipse at center, #000511 0%, #000000 100%)',
      }}
      gl={{
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
      }}
      onCreated={(state) => {
        console.log('Canvas created, WebGL context:', state.gl);
        // Get WebGL info through the context
        const glContext = state.gl.getContext();
        if (glContext) {
          console.log('WebGL version:', glContext.getParameter(glContext.VERSION));
          console.log('WebGL renderer:', glContext.getParameter(glContext.RENDERER));
          console.log('WebGL vendor:', glContext.getParameter(glContext.VENDOR));
        }
      }}
      onError={(error: any) => {
        console.error('R3F Canvas error:', error);
        setError(error?.message || error?.toString() || 'Unknown canvas error');
      }}
    >
      <Suspense fallback={null}>
        <SolarSystemBackground />
      </Suspense>
    </Canvas>
  );
};

export default R3FCanvas; 