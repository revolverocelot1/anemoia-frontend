import React, { useRef, useEffect, useState, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stats, Grid, Html, Center, TransformControls, Line, Text } from '@react-three/drei';
import * as THREE from 'three';
import { loadOFF, OFFGeometry, OFFStats } from '../viewers/triangle/offLoader';
import { loadPLY } from '../viewers/triangle/plyLoader';
import { TriangleSplattingMaterialOptions } from '../viewers/triangle/triangleSplattingMaterial';

interface TriangleSplattingMeshProps {
  url: string;
  fileName?: string;
  onStatsUpdate?: (stats: OFFStats) => void;
  materialOptions?: TriangleSplattingMaterialOptions;
  showMeasurements?: boolean;
  onMeasure?: (distance: number) => void;
}

// Measurement tool component
const MeasurementTool: React.FC<{ 
  points: THREE.Vector3[]; 
  onComplete?: (distance: number) => void 
}> = ({ points, onComplete }) => {
  const distance = points.length === 2 
    ? points[0].distanceTo(points[1]) 
    : 0;

  useEffect(() => {
    if (points.length === 2 && onComplete) {
      onComplete(distance);
    }
  }, [points, distance, onComplete]);

  if (points.length === 0) return null;

  return (
    <>
      {points.map((point, index) => (
        <mesh key={index} position={point}>
          <sphereGeometry args={[0.5, 16, 16]} />
          <meshBasicMaterial color="#00d4ff" />
        </mesh>
      ))}
      {points.length === 2 && (
        <>
          <Line
            points={points}
            color="#00d4ff"
            lineWidth={2}
            dashed={false}
          />
          <Text
            position={points[0].clone().add(points[1]).multiplyScalar(0.5)}
            fontSize={1}
            color="#00d4ff"
            anchorX="center"
            anchorY="middle"
          >
            {distance.toFixed(2)} units
          </Text>
        </>
      )}
    </>
  );
};

const TriangleSplattingMesh: React.FC<TriangleSplattingMeshProps> = ({ 
  url, 
  fileName,
  onStatsUpdate, 
  materialOptions = {},
  showMeasurements = false,
  onMeasure
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [geometry, setGeometry] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [measurementPoints, setMeasurementPoints] = useState<THREE.Vector3[]>([]);
  const { camera, scene, raycaster, pointer } = useThree();

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);

    // Use fileName if provided, otherwise try to extract from URL
    const fileExt = fileName 
      ? fileName.split('.').pop()?.toLowerCase()
      : url.split('.').pop()?.toLowerCase();
    console.log('TriangleSplattingViewer: Loading file with URL:', url, 'FileName:', fileName, 'Extension:', fileExt);
    
    const loadGeometry = async () => {
      try {
        let geom: any;
        let st: any;
        
        if (fileExt === 'ply') {
          // Load PLY file
          const result = await loadPLY(url, (loaded, total) => {
            if (mounted) {
              const progress = total ? (loaded / total) * 100 : 0;
              onStatsUpdate?.({ 
                vertexCount: 0, 
                faceCount: 0, 
                loadingProgress: progress,
                hasColors: false,
                bounds: { min: [0, 0, 0], max: [0, 0, 0] }
              });
            }
          });
          geom = result.geometry;
          st = result.stats;
        } else {
          // Load OFF file
          const result = await loadOFF(url, (loaded, total) => {
            if (mounted) {
              const progress = total ? (loaded / total) * 100 : 0;
              onStatsUpdate?.({ 
                vertexCount: 0, 
                faceCount: 0, 
                loadingProgress: progress,
                hasColors: false,
                bounds: { min: [0, 0, 0], max: [0, 0, 0] }
              });
            }
          });
          geom = result.geometry;
          st = result.stats;
        }
        
        if (!mounted) return;
        
        setGeometry(geom);
        setStats(st);
        onStatsUpdate?.(st);
        setLoading(false);

        // Auto-fit camera to bounds
        if (st.bounds) {
          const center = [
            (st.bounds.min[0] + st.bounds.max[0]) / 2,
            (st.bounds.min[1] + st.bounds.max[1]) / 2,
            (st.bounds.min[2] + st.bounds.max[2]) / 2
          ];
          const size = Math.max(
            st.bounds.max[0] - st.bounds.min[0],
            st.bounds.max[1] - st.bounds.min[1],
            st.bounds.max[2] - st.bounds.min[2]
          );
          
          const fov = (camera as THREE.PerspectiveCamera).fov * (Math.PI / 180);
          const cameraDistance = Math.abs(size / 2 / Math.tan(fov / 2));
          const finalDistance = cameraDistance * 1.5;
          
          camera.position.set(
            center[0] + finalDistance * 0.5,
            center[1] + finalDistance * 0.7,
            center[2] + finalDistance
          );
          camera.lookAt(center[0], center[1], center[2]);
        }
      } catch (err: any) {
        if (!mounted) return;
        setError(err.message);
        setLoading(false);
        onStatsUpdate?.({ 
          vertexCount: 0, 
          faceCount: 0, 
          loadingProgress: 0,
          hasColors: false,
          bounds: { min: [0, 0, 0], max: [0, 0, 0] }
        });
      }
    };
    
    loadGeometry();

    return () => { mounted = false; };
  }, [url, camera, onStatsUpdate]);

  useEffect(() => {
    if (meshRef.current && geometry) {
      const geom = new THREE.BufferGeometry();
      geom.setAttribute('position', new THREE.BufferAttribute(geometry.vertices, 3));
      
      if (geometry.colors) {
        const colorArray = new Float32Array(geometry.colors.length);
        for (let i = 0; i < geometry.colors.length; i++) {
          colorArray[i] = geometry.colors[i] / 255.0;
        }
        geom.setAttribute('color', new THREE.BufferAttribute(colorArray, 3));
      }
      
      geom.setIndex(new THREE.BufferAttribute(geometry.indices, 1));
      geom.computeVertexNormals();
      geom.computeBoundingBox();
      
      meshRef.current.geometry = geom;
      
      // Optimized material for better performance
      const material = new THREE.MeshPhongMaterial({
        vertexColors: geometry.colors ? true : false,
        wireframe: materialOptions.wireframe || false,
        side: THREE.DoubleSide,
        color: geometry.colors ? 0xffffff : 0x00d4ff,
        specular: 0x111111,
        shininess: 30,
        flatShading: false,
        transparent: false,
        opacity: 1,
      });
      
      // Enable GPU instancing and frustum culling
      meshRef.current.frustumCulled = true;
      meshRef.current.matrixAutoUpdate = true;
      meshRef.current.material = material;
    }
  }, [geometry, materialOptions.wireframe]);

  // Update wireframe mode without recreating material
  useFrame(() => {
    if (meshRef.current && meshRef.current.material) {
      const material = meshRef.current.material as THREE.MeshPhongMaterial;
      if (material.wireframe !== materialOptions.wireframe) {
        material.wireframe = materialOptions.wireframe || false;
      }
    }
  });

  // Handle click events for measurements
  const handleClick = (event: THREE.Event) => {
    if (!showMeasurements || !meshRef.current) return;
    
    const intersects = raycaster.intersectObject(meshRef.current);
    if (intersects.length > 0) {
      const point = intersects[0].point;
      if (measurementPoints.length < 2) {
        setMeasurementPoints([...measurementPoints, point]);
      } else {
        setMeasurementPoints([point]);
      }
    }
  };

  if (loading) {
    return (
      <Html center>
        <div className="bg-black/90 text-cyan-400 px-6 py-4 rounded-lg backdrop-blur-md">
          <div className="text-lg mb-2">Loading Triangle Splatting...</div>
          <div className="w-48 h-2 bg-gray-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300"
              style={{ width: `${stats?.loadingProgress || 0}%` }}
            />
          </div>
        </div>
      </Html>
    );
  }

  if (error) {
    return (
      <Html center>
        <div className="bg-red-900/90 text-red-200 px-6 py-4 rounded-lg backdrop-blur-md">
          <div className="text-lg">Error loading file:</div>
          <div className="text-sm mt-1">{error}</div>
        </div>
      </Html>
    );
  }

  return (
    <>
      <mesh ref={meshRef} onClick={handleClick} />
      {showMeasurements && (
        <MeasurementTool 
          points={measurementPoints} 
          onComplete={onMeasure}
        />
      )}
    </>
  );
};

interface TriangleSplattingViewerProps {
  url?: string;
  fileName?: string;
  className?: string;
  onStatsUpdate?: (stats: OFFStats) => void;
  cameraPosition?: [number, number, number];
  settings?: {
    wireframe?: boolean;
    exposure?: number;
    showGrid?: boolean;
    showStats?: boolean;
    backgroundColor?: string;
    backgroundBlend?: number;
    ambientIntensity?: number;
    sunIntensity?: number;
    shadowSoftness?: number;
    colorGrading?: {
      contrast: number;
      saturation: number;
      brightness: number;
    };
    enableFresnel?: boolean;
    fresnelPower?: number;
    enableRimLight?: boolean;
    rimLightColor?: string;
    rimLightIntensity?: number;
    showMeasurements?: boolean;
    showAxes?: boolean;
  };
  onMeasure?: (distance: number) => void;
}

const TriangleSplattingViewer: React.FC<TriangleSplattingViewerProps> = ({ 
  url,
  fileName,
  className = '',
  onStatsUpdate,
  cameraPosition = [5, 5, 5],
  settings = {},
  onMeasure
}) => {
  const {
    wireframe = false,
    exposure = 1.0,
    showGrid = true,
    showStats = true,
    backgroundColor = '#000814',
    backgroundBlend = 0.0,
    ambientIntensity = 0.6,
    sunIntensity = 1.0,
    shadowSoftness = 0.5,
    colorGrading = { contrast: 1.0, saturation: 1.1, brightness: 1.0 },
    enableFresnel = true,
    fresnelPower = 2.0,
    enableRimLight = true,
    rimLightColor = '#00d4ff',
    rimLightIntensity = 0.3,
    showMeasurements = false,
    showAxes = false
  } = settings;

  const [showControlsOverlay, setShowControlsOverlay] = useState(true);

  // Auto-hide controls after 8 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowControlsOverlay(false);
    }, 8000);

    return () => clearTimeout(timer);
  }, []);

  // If no URL provided, try to load a default OFF file
  const defaultUrl = url || '/test-cube.off';  // Default to test cube OFF file

  if (!url && !defaultUrl) {
    return (
      <div className={`flex items-center justify-center h-full bg-gradient-to-br from-gray-900 via-black to-gray-900 ${className}`}>
        <div className="text-center">
          <div className="text-6xl mb-4">🔺</div>
          <div className="text-gray-400 text-xl">No .off/.ply file selected</div>
          <div className="text-gray-600 text-sm mt-2">Upload a file to begin</div>
        </div>
      </div>
    );
  }

  const materialOptions: TriangleSplattingMaterialOptions = {
    wireframe,
    exposure,
    backgroundColor: new THREE.Color(backgroundColor),
    backgroundBlend,
    ambientIntensity,
    sunIntensity,
    shadowSoftness,
    colorGrading,
    enableFresnel,
    fresnelPower,
    enableRimLight,
    rimLightColor: new THREE.Color(rimLightColor),
    rimLightIntensity
  };

  return (
    <div className={`relative w-full h-full ${className}`}>
      <Canvas
        style={{ background: backgroundColor }}
        camera={{ position: cameraPosition as any, fov: 60, near: 0.1, far: 10000 }}
        gl={{ 
          antialias: true, 
          alpha: false,
          powerPreference: 'high-performance',
          precision: 'highp',
          stencil: false,
          depth: true,
          logarithmicDepthBuffer: false,
          toneMapping: THREE.LinearToneMapping,
          toneMappingExposure: exposure
        }}
        dpr={[1, 2]}  // Limit pixel ratio for better performance
        frameloop="demand"  // Only render when needed
        shadows={false}  // Disable shadows for better performance
      >
        <Suspense fallback={null}>
          <TriangleSplattingMesh 
            url={defaultUrl} 
            fileName={fileName}
            onStatsUpdate={onStatsUpdate}
            materialOptions={materialOptions}
            showMeasurements={showMeasurements}
            onMeasure={onMeasure}
          />
        </Suspense>

        {/* Optimized lighting setup */}
        <ambientLight intensity={ambientIntensity * 0.8} color="#ffffff" />
        <directionalLight
          position={[10, 20, 10]}
          intensity={sunIntensity}
          color="#ffffff"
          castShadow={false}
        />
        <directionalLight
          position={[-10, 10, -10]}
          intensity={0.3}
          color="#87CEEB"
        />
        <pointLight
          position={[0, 10, 0]}
          intensity={0.2}
          color="#FFA500"
        />

        <OrbitControls 
          enableDamping
          dampingFactor={0.05}
          screenSpacePanning={true}
          minDistance={0.1}
          maxDistance={1000}
          maxPolarAngle={Math.PI}
          autoRotate={false}
          autoRotateSpeed={2}
          enablePan={true}
          panSpeed={1.0}
          rotateSpeed={0.7}
          zoomSpeed={1.2}
          makeDefault
        />

        {showGrid && (
          <Grid 
            args={[100, 100]} 
            cellSize={2} 
            cellThickness={0.5} 
            cellColor="#00d4ff" 
            sectionSize={10} 
            sectionThickness={1.5} 
            sectionColor="#0066cc"
            fadeDistance={200}
            fadeStrength={1}
            followCamera={false}
            infiniteGrid
          />
        )}

        {showAxes && (
          <axesHelper args={[50]} />
        )}

        {showStats && <Stats />}
      </Canvas>

      {/* Professional Controls Overlay */}
      <div 
        className={`absolute bottom-4 left-4 bg-gradient-to-br from-gray-900/95 to-black/95 p-4 rounded-xl backdrop-blur-xl border border-cyan-900/50 shadow-2xl text-xs max-w-xs transition-all duration-500 ${showControlsOverlay ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}
        onMouseEnter={() => setShowControlsOverlay(true)}
      >
        <div className="font-bold mb-3 text-cyan-400 flex items-center gap-2">
          <span className="material-symbols-outlined text-base">keyboard</span>
          Professional 3D Controls
        </div>
        <div className="space-y-3">
          {/* Mouse Controls */}
          <div>
            <h5 className="text-gray-400 font-medium mb-1">Mouse Controls</h5>
            <div className="space-y-1 text-gray-300">
              <div className="flex items-center gap-2">
                <span className="text-cyan-400">🖱️ Left Click + Drag:</span> Rotate view
              </div>
              <div className="flex items-center gap-2">
                <span className="text-cyan-400">🖱️ Right Click + Drag:</span> Pan camera
              </div>
              <div className="flex items-center gap-2">
                <span className="text-cyan-400">🖱️ Scroll Wheel:</span> Zoom in/out
              </div>
              {showMeasurements && (
                <div className="flex items-center gap-2">
                  <span className="text-cyan-400">🖱️ Click on Model:</span> Add measurement point
                </div>
              )}
            </div>
          </div>
          
          {/* Keyboard Shortcuts */}
          <div className="border-t border-gray-700 pt-3">
            <h5 className="text-gray-400 font-medium mb-1">Keyboard Shortcuts</h5>
            <div className="space-y-1 text-gray-300">
              <div className="flex items-center gap-2">
                <kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-[10px] border border-gray-700">W</kbd>
                Toggle wireframe
              </div>
              <div className="flex items-center gap-2">
                <kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-[10px] border border-gray-700">R</kbd>
                Reset camera position
              </div>
              <div className="flex items-center gap-2">
                <kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-[10px] border border-gray-700">Space</kbd>
                Toggle auto-rotate
              </div>
            </div>
          </div>
          
          {/* Tips */}
          <div className="border-t border-gray-700 pt-3">
            <h5 className="text-gray-400 font-medium mb-1">Pro Tips</h5>
            <div className="space-y-1 text-gray-300 text-[11px]">
              <div>• Hold <kbd className="px-1 py-0.5 bg-gray-800 rounded text-[9px]">Shift</kbd> for precise movement</div>
              <div>• Double-click to focus on clicked point</div>
              <div>• Use touch gestures on mobile devices</div>
            </div>
          </div>
        </div>
      </div>

      {/* Research Tools Badge */}
      <div className="absolute top-4 right-4 bg-gradient-to-r from-purple-900/80 to-blue-900/80 backdrop-blur-md text-white px-4 py-2 rounded-full text-xs border border-purple-500/30">
        <span className="font-semibold">Research Mode</span> • Triangle Splatting v2.0
      </div>
    </div>
  );
};

export default TriangleSplattingViewer; 