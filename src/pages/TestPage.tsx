import React, { useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Box } from '@react-three/drei';
import * as THREE from 'three';
import Header from '../components/Header';
import Footer from '../components/Footer';

const TestPage: React.FC = () => {
  const [moduleStatus, setModuleStatus] = useState({
    three: false,
    r3f: false,
    drei: false,
    error: null as string | null,
  });

  useEffect(() => {
    // Check if modules are loaded
    try {
      setModuleStatus({
        three: !!THREE && !!THREE.BoxGeometry,
        r3f: !!(window as any).__R3F__,
        drei: !!Box,
        error: null,
      });
    } catch (e: any) {
      setModuleStatus(prev => ({ ...prev, error: e.message }));
    }
  }, []);

  return (
    <div className="relative flex size-full min-h-screen flex-col" style={{ backgroundColor: '#0a0a0a' }}>
      <div className="layout-container flex h-full grow flex-col">
        <Header />
        
        <main className="px-40 flex flex-1 justify-center py-5">
          <div className="layout-content-container flex flex-col w-[960px] max-w-[960px] py-5 max-w-[960px] flex-1">
            <h1 className="text-white text-4xl font-black leading-tight tracking-[-0.033em] pb-3 pt-6">Test Page</h1>
            
            {/* Module Status */}
            <div className="bg-gray-900 p-4 rounded-lg mb-4">
              <h2 className="text-white text-xl mb-3">Module Loading Status:</h2>
              <div className="space-y-2">
                <div className={moduleStatus.three ? 'text-green-400' : 'text-red-400'}>
                  Three.js: {moduleStatus.three ? '✓ Loaded' : '✗ Not Loaded'}
                </div>
                <div className={moduleStatus.r3f ? 'text-green-400' : 'text-red-400'}>
                  React Three Fiber: {moduleStatus.r3f ? '✓ Loaded' : '✗ Not Loaded'}
                </div>
                <div className={moduleStatus.drei ? 'text-green-400' : 'text-red-400'}>
                  Drei: {moduleStatus.drei ? '✓ Loaded' : '✗ Not Loaded'}
                </div>
                {moduleStatus.error && (
                  <div className="text-red-400">Error: {moduleStatus.error}</div>
                )}
              </div>
            </div>

            {/* Simple Three.js Canvas Test */}
            <div className="bg-gray-900 p-4 rounded-lg">
              <h2 className="text-white text-xl mb-3">Three.js Canvas Test:</h2>
              <div style={{ height: '400px', width: '100%' }}>
                <Canvas camera={{ position: [0, 0, 5] }}>
                  <ambientLight intensity={0.5} />
                  <pointLight position={[10, 10, 10]} />
                  <Box args={[1, 1, 1]}>
                    <meshStandardMaterial color="hotpink" />
                  </Box>
                </Canvas>
              </div>
            </div>
          </div>
        </main>
        
        <Footer />
      </div>
    </div>
  );
};

export default TestPage; 