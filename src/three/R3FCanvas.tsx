import { Canvas } from '@react-three/fiber';
import { Suspense } from 'react';
import PrimeIntellectBackground from './PrimeIntellectBackground';

const R3FCanvas = () => {
  return (
    <Canvas
      gl={{ 
        alpha: true, 
        antialias: true, 
        powerPreference: 'high-performance',
        // Force GPU usage
        failIfMajorPerformanceCaveat: false,
        preserveDrawingBuffer: true,
      }}
      camera={{ position: [0, 0, 5], fov: 75 }}
      style={{ 
        position: 'fixed', 
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 0, 
        pointerEvents: 'auto',
        background: '#000000'
      }}
      onCreated={({ gl }) => {
        // Force high-performance GPU
        const context = gl.getContext();
        const debugInfo = context.getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
          const vendor = context.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
          const renderer = context.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
          console.log('GPU Vendor:', vendor);
          console.log('GPU Renderer:', renderer);
        }
        // Set pixel ratio for sharp rendering
        gl.setPixelRatio(window.devicePixelRatio);
      }}
    >
      <Suspense fallback={null}>
        <PrimeIntellectBackground />
      </Suspense>
    </Canvas>
  );
};

export default R3FCanvas; 