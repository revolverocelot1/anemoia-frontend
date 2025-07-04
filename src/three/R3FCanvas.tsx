import { Canvas } from '@react-three/fiber';
import { Suspense } from 'react';
import PrimeIntellectBackground from './PrimeIntellectBackground';

const R3FCanvas = () => {
  return (
    <div className="fixed inset-0 w-full h-full -z-10">
      <Canvas
        camera={{ position: [0, 0, 40], fov: 60 }}
        style={{ 
          background: 'radial-gradient(ellipse at center, #000511 0%, #000000 100%)',
          width: '100%',
          height: '100%',
        }}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
        }}
      >
        <Suspense fallback={null}>
          <PrimeIntellectBackground />
        </Suspense>
      </Canvas>
    </div>
  );
};

export default R3FCanvas; 