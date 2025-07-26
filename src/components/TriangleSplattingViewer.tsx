import React, { useRef, useEffect, useState, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stats, Grid, Html, Center, TransformControls, Line, Text } from '@react-three/drei';
import * as THREE from 'three';
import { loadOFF, OFFGeometry, OFFStats } from '../viewers/triangle/offLoader';
import { TriangleSplattingMaterialOptions } from '../viewers/triangle/triangleSplattingMaterial';

interface TriangleSplattingMeshProps {
  url: string;
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
  onStatsUpdate, 
  materialOptions = {},
  showMeasurements = false,
  onMeasure
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [geometry, setGeometry] = useState<OFFGeometry | null>(null);
  const [stats, setStats] = useState<OFFStats | null>(null);
  const [measurementPoints, setMeasurementPoints] = useState<THREE.Vector3[]>([]);
  const { camera, scene, raycaster, pointer } = useThree();

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);

    loadOFF(url, (loaded, total) => {
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
    })
    .then(({ geometry: geom, stats: st }) => {
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
    })
    .catch(err => {
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
    });

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
      
      // Use a standard Three.js material instead of custom shader
      meshRef.current.material = new THREE.MeshPhongMaterial({
        vertexColors: geometry.hasColors,
        wireframe: materialOptions.wireframe || false,
        side: THREE.DoubleSide,
        shininess: 30,
        specular: new THREE.Color(0x222222),
        emissive: new THREE.Color(0x000000),
        color: new THREE.Color(0xffffff),
      });
    }
  }, [geometry, materialOptions]);

  useFrame(({ clock }) => {
    if (meshRef.current && materialOptions.wireframe !== undefined) {
      const material = meshRef.current.material as THREE.MeshPhongMaterial;
      material.wireframe = materialOptions.wireframe;
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
  className?: string;
  onStatsUpdate?: (stats: OFFStats) => void;
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
  className = '',
  onStatsUpdate,
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

  if (!url) {
    return (
      <div className={`flex items-center justify-center h-full bg-gradient-to-br from-gray-900 via-black to-gray-900 ${className}`}>
        <div className="text-center">
          <div className="text-6xl mb-4">🔺</div>
          <div className="text-gray-400 text-xl">No .off file selected</div>
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
        camera={{ position: [5, 5, 5], fov: 60, near: 0.1, far: 10000 }}
        gl={{ 
          antialias: true, 
          alpha: false,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: exposure
        }}
      >
        <Suspense fallback={null}>
          <TriangleSplattingMesh 
            url={url} 
            onStatsUpdate={onStatsUpdate}
            materialOptions={materialOptions}
            showMeasurements={showMeasurements}
            onMeasure={onMeasure}
          />
        </Suspense>

        {/* Lighting setup for MeshPhongMaterial */}
        <ambientLight intensity={0.6} color={new THREE.Color(0.6, 0.65, 0.75)} />
        <directionalLight
          position={[10, 20, 10]}
          intensity={1.0}
          color={new THREE.Color(1.0, 0.98, 0.9)}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />
        <directionalLight
          position={[-10, 10, -10]}
          intensity={0.5}
          color={new THREE.Color(0.4, 0.5, 0.7)}
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
      <div className="absolute bottom-4 left-4 bg-black/80 backdrop-blur-md text-cyan-400 px-4 py-3 rounded-lg text-sm border border-cyan-900/50">
        <div className="font-bold mb-2">Professional Controls:</div>
        <div>🖱️ Left Click + Drag: Rotate</div>
        <div>🖱️ Right Click + Drag: Pan</div>
        <div>🖱️ Scroll: Zoom</div>
        {showMeasurements && <div>🖱️ Click: Place measurement points</div>}
        <div>⌨️ W: Toggle Wireframe</div>
      </div>

      {/* Research Tools Badge */}
      <div className="absolute top-4 right-4 bg-gradient-to-r from-purple-900/80 to-blue-900/80 backdrop-blur-md text-white px-4 py-2 rounded-full text-xs border border-purple-500/30">
        <span className="font-semibold">Research Mode</span> • Triangle Splatting v2.0
      </div>
    </div>
  );
};

export default TriangleSplattingViewer; 