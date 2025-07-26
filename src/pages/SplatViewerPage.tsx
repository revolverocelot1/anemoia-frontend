import { useState, useRef, Suspense, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Canvas, useLoader, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Environment, Html, useProgress, Center, Bounds, Line, PivotControls, Grid, TransformControls, PerspectiveCamera } from '@react-three/drei';
import * as SPLAT from 'gsplat';
import * as THREE from 'three';
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader.js';

import { loadTSF } from '../viewers/triangle/loader';
import { createTriangleSplattingMaterial, TriangleSplattingMaterialOptions } from '../viewers/triangle/triangleSplattingMaterial';
import { loadOFF, OFFGeometry, OFFStats } from '../viewers/triangle/offLoader';
import { ViewerSettingsProvider, useViewerSettings, QualitySetting } from '../viewers/ViewerSettingsContext';
import SplatViewerControls from '../components/SplatViewerControls';
import CardGlass from '../components/CardGlass';
import Header from '../components/Header';
import Footer from '../components/Footer';
import HolographicStats from '../components/HolographicStats';
import EnhancedButton from '../components/EnhancedButton';
import NavigationBreadcrumb from '../components/NavigationBreadcrumb';

// Add viewer type
type ViewerType = 'gaussian' | 'triangle';

// Enhanced Camera Control Component with Keyboard Support
const EnhancedCameraControls = () => {
  const { camera, gl } = useThree();
  const [moveSpeed, setMoveSpeed] = useState(0.5);
  const [rotateSpeed, setRotateSpeed] = useState(0.02);
  const [isShiftPressed, setIsShiftPressed] = useState(false);
  const [isControlPressed, setIsControlPressed] = useState(false);
  const [activeKeys, setActiveKeys] = useState(new Set<string>());

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      setActiveKeys(prev => new Set(prev).add(e.key.toLowerCase()));
      if (e.key === 'Shift') setIsShiftPressed(true);
      if (e.key === 'Control') setIsControlPressed(true);
      
      // Prevent default for camera control keys
      const cameraKeys = ['w', 'a', 's', 'd', 'q', 'e', 'r', 'f', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'];
      if (cameraKeys.includes(e.key.toLowerCase())) {
        e.preventDefault();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      setActiveKeys(prev => {
        const newKeys = new Set(prev);
        newKeys.delete(e.key.toLowerCase());
        return newKeys;
      });
      if (e.key === 'Shift') setIsShiftPressed(false);
      if (e.key === 'Control') setIsControlPressed(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useFrame(() => {
    const currentMoveSpeed = isShiftPressed ? moveSpeed * 2 : moveSpeed;
    const currentRotateSpeed = isControlPressed ? rotateSpeed * 0.5 : rotateSpeed;
    
    // Movement controls (W, A, S, D, Q, E)
    if (activeKeys.has('w')) camera.translateZ(-currentMoveSpeed);
    if (activeKeys.has('s')) camera.translateZ(currentMoveSpeed);
    if (activeKeys.has('a')) camera.translateX(-currentMoveSpeed);
    if (activeKeys.has('d')) camera.translateX(currentMoveSpeed);
    if (activeKeys.has('q')) camera.translateY(-currentMoveSpeed);
    if (activeKeys.has('e')) camera.translateY(currentMoveSpeed);
    
    // Rotation controls (Arrow keys)
    if (activeKeys.has('arrowleft')) camera.rotation.y += currentRotateSpeed;
    if (activeKeys.has('arrowright')) camera.rotation.y -= currentRotateSpeed;
    if (activeKeys.has('arrowup')) camera.rotation.x += currentRotateSpeed;
    if (activeKeys.has('arrowdown')) camera.rotation.x -= currentRotateSpeed;
    
    // Reset camera (R key)
    if (activeKeys.has('r')) {
      camera.position.set(0, 0, 5);
      camera.rotation.set(0, 0, 0);
    }
    
    // Focus on origin (F key)
    if (activeKeys.has('f')) {
      camera.lookAt(0, 0, 0);
    }
  });

  return (
    <Html fullscreen>
      <div className="absolute bottom-4 left-4 bg-gradient-to-br from-gray-900/95 to-black/95 p-4 rounded-xl backdrop-blur-xl border border-gray-700/50 shadow-2xl text-xs max-w-xs">
        <h4 className="text-sm font-semibold text-gray-300 mb-2 flex items-center gap-2">
          <span className="material-symbols-outlined text-base">keyboard</span>
          Camera Controls
        </h4>
        <div className="grid grid-cols-2 gap-2 text-gray-400">
          <div><kbd className="px-1 py-0.5 bg-gray-800 rounded">W/S</kbd> Forward/Back</div>
          <div><kbd className="px-1 py-0.5 bg-gray-800 rounded">A/D</kbd> Left/Right</div>
          <div><kbd className="px-1 py-0.5 bg-gray-800 rounded">Q/E</kbd> Down/Up</div>
          <div><kbd className="px-1 py-0.5 bg-gray-800 rounded">↑↓←→</kbd> Rotate</div>
          <div><kbd className="px-1 py-0.5 bg-gray-800 rounded">R</kbd> Reset</div>
          <div><kbd className="px-1 py-0.5 bg-gray-800 rounded">F</kbd> Focus</div>
          <div className="col-span-2"><kbd className="px-1 py-0.5 bg-gray-800 rounded">Shift</kbd> Speed boost</div>
          <div className="col-span-2"><kbd className="px-1 py-0.5 bg-gray-800 rounded">Ctrl</kbd> Precise rotation</div>
        </div>
      </div>
    </Html>
  );
};

// --- Quality Mapping ---
const qualityToResolution = (quality: QualitySetting, parent: HTMLElement) => {
  const { clientWidth, clientHeight } = parent;
  switch (quality) {
    case 'Low': return { width: clientWidth * 0.5, height: clientHeight * 0.5 };
    case 'Medium': return { width: clientWidth * 0.75, height: clientHeight * 0.75 };
    case 'High': return { width: clientWidth, height: clientHeight };
    default: return { width: clientWidth, height: clientHeight };
  }
};

const qualityToDPR = (quality: QualitySetting): [number, number] => {
  switch (quality) {
    case 'Low': return [0.5, 0.75];
    case 'Medium': return [0.75, 1.5];
    case 'High': return [1, 2];
    default: return [1, 2];
  }
}

// --- Enhanced Annotations System ---
interface Annotation {
  id: string;
  position: [number, number, number];
  text: string;
  color: string;
  timestamp: string;
  author?: string;
}

const AnnotationMarker = ({ annotation, onUpdate, onDelete, isSelected, onSelect }: { 
  annotation: Annotation; 
  onUpdate: (id: string, position: [number, number, number]) => void;
  onDelete: (id: string) => void;
  isSelected: boolean;
  onSelect: (id: string) => void;
}) => {
  const [hovered, setHovered] = useState(false);
  
  return (
    <PivotControls
      anchor={[0, 0, 0]}
      onDrag={(worldMatrix) => {
        const position = new THREE.Vector3();
        position.setFromMatrixPosition(worldMatrix);
        onUpdate(annotation.id, [position.x, position.y, position.z]);
      }}
      visible={isSelected}
      scale={0.5}
      depthTest={false}
    >
      <group position={annotation.position}>
        <mesh
          onPointerOver={() => setHovered(true)}
          onPointerOut={() => setHovered(false)}
          onClick={(e) => {
            e.stopPropagation();
            onSelect(annotation.id);
          }}
        >
          <sphereGeometry args={[0.1, 16, 16]} />
          <meshStandardMaterial 
            color={annotation.color} 
            emissive={annotation.color}
            emissiveIntensity={hovered || isSelected ? 0.5 : 0.2}
          />
        </mesh>
        <Html
          position={[0, 0.3, 0]}
          center
          style={{
            background: `linear-gradient(135deg, rgba(0, 0, 0, 0.9), rgba(0, 0, 0, 0.8))`,
            padding: '8px 12px',
            borderRadius: '8px',
            fontSize: '12px',
            whiteSpace: 'nowrap',
            pointerEvents: hovered || isSelected ? 'auto' : 'none',
            border: `1px solid ${annotation.color}40`,
            boxShadow: `0 4px 12px ${annotation.color}20`,
            backdropFilter: 'blur(10px)',
            minWidth: '150px'
          }}
        >
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between gap-4">
              <span className="font-medium" style={{ color: annotation.color }}>{annotation.text}</span>
              {(hovered || isSelected) && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(annotation.id);
                  }}
                  className="text-red-400 hover:text-red-300 transition-colors"
                  style={{ fontSize: '18px', lineHeight: '1' }}
                >
                  ×
                </button>
              )}
            </div>
            {(hovered || isSelected) && (
              <>
                <div className="text-xs text-gray-400">{annotation.timestamp}</div>
                {annotation.author && <div className="text-xs text-gray-500">by {annotation.author}</div>}
              </>
            )}
          </div>
        </Html>
      </group>
    </PivotControls>
  );
};

// --- Enhanced Measurement Tool ---
const MeasurementTool = ({ points, onAddPoint, onClear }: { 
  points: THREE.Vector3[];
  onAddPoint: (point: THREE.Vector3) => void;
  onClear: () => void;
}) => {
  const { camera, scene } = useThree();
  const [hoveredPoint, setHoveredPoint] = useState<THREE.Vector3 | null>(null);
  
  const distance = points.length === 2 
    ? points[0].distanceTo(points[1]).toFixed(3)
    : null;
  
  const handlePointerMove = useCallback((e: any) => {
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(e.pointer, camera);
    const intersects = raycaster.intersectObjects(scene.children, true);
    
    if (intersects.length > 0) {
      setHoveredPoint(intersects[0].point);
    }
  }, [camera, scene]);
  
  return (
    <>
      {points.map((point, i) => (
        <group key={i}>
          <mesh position={point}>
            <sphereGeometry args={[0.05, 16, 16]} />
            <meshStandardMaterial color="#00ff00" emissive="#00ff00" emissiveIntensity={0.5} />
          </mesh>
          <Html position={point} center>
            <div className="bg-black/80 text-green-400 px-2 py-1 rounded text-xs">
              P{i + 1}
            </div>
          </Html>
        </group>
      ))}
      
      {hoveredPoint && points.length < 2 && (
        <mesh position={hoveredPoint}>
          <sphereGeometry args={[0.03, 16, 16]} />
          <meshBasicMaterial color="#00ff00" opacity={0.5} transparent />
        </mesh>
      )}
      
      {points.length === 2 && (
        <>
          <Line
            points={points}
            color="#00ff00"
            lineWidth={2}
            dashed
            dashScale={5}
          />
          <Html position={points[0].clone().add(points[1]).multiplyScalar(0.5)} center>
            <div className="bg-gradient-to-r from-green-900/90 to-green-800/90 text-green-400 px-3 py-2 rounded-lg text-sm font-medium backdrop-blur-sm border border-green-500/30">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-base">straighten</span>
                {distance} units
              </div>
              {points.length === 2 && (
                <button
                  onClick={onClear}
                  className="text-xs text-green-300 hover:text-green-200 mt-1"
                >
                  Clear measurement
                </button>
              )}
            </div>
          </Html>
        </>
      )}
    </>
  );
};

// --- Camera Path Animation ---
const CameraPathAnimation = ({ isPlaying, path, onUpdatePath }: { 
  isPlaying: boolean; 
  path: THREE.Vector3[];
  onUpdatePath: (path: THREE.Vector3[]) => void;
}) => {
  const { camera } = useThree();
  const [progress, setProgress] = useState(0);
  const [selectedKeyframe, setSelectedKeyframe] = useState<number | null>(null);
  
  useFrame((_, delta) => {
    if (!isPlaying || path.length < 2) return;
    
    setProgress((prev) => {
      const next = prev + delta * 0.1;
      if (next >= 1) return 0;
      return next;
    });
    
    const curve = new THREE.CatmullRomCurve3(path);
    const point = curve.getPoint(progress);
    camera.position.lerp(point, 0.1);
    camera.lookAt(0, 0, 0);
  });
  
  return (
    <>
      {path.map((point, i) => (
        <group key={i}>
          {selectedKeyframe === i && (
            <TransformControls
              object={new THREE.Object3D()}
              position={point}
              onObjectChange={(e: any) => {
                const newPath = [...path];
                newPath[i] = e?.target.object.position.clone();
                onUpdatePath(newPath);
              }}
            />
          )}
          <mesh 
            position={point}
            onClick={() => setSelectedKeyframe(i)}
          >
            <boxGeometry args={[0.1, 0.1, 0.1]} />
            <meshStandardMaterial 
              color={selectedKeyframe === i ? "#ff00ff" : "#ff00ff"} 
              emissive="#ff00ff"
              emissiveIntensity={selectedKeyframe === i ? 0.8 : 0.3}
            />
          </mesh>
          <Html position={point} center>
            <div className="bg-purple-900/80 text-purple-300 px-2 py-1 rounded text-xs">
              K{i + 1}
            </div>
          </Html>
        </group>
      ))}
      {path.length > 1 && (
        <Line
          points={path}
          color="#ff00ff"
          lineWidth={1}
          opacity={0.5}
          transparent
        />
      )}
    </>
  );
};

// --- Loading Overlay ---
const Loader = () => {
  const { progress } = useProgress();
  return (
    <Html center>
      <div className="text-white text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-gradient-to-br from-blue-900/80 to-purple-900/80 p-8 rounded-2xl backdrop-blur-xl border border-blue-500/20"
        >
          <div className="w-16 h-16 mx-auto mb-4 relative">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 rounded-full border-4 border-blue-500 border-t-transparent"
            />
          </div>
          <div className="text-3xl font-bold mb-2">{Math.round(progress)}%</div>
          <div className="text-sm text-blue-300">Loading 3D Model...</div>
        </motion.div>
      </div>
    </Html>
  );
};

// --- Enhanced Renderer Components ---

const GaussianSplatRenderer = ({ url }: { url: string}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);
  const { settings } = useViewerSettings();

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    
    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      if (parent) {
        const { width, height } = qualityToResolution(settings.quality, parent);
        canvas.width = width;
        canvas.height = height;
        canvas.style.width = '100%';
        canvas.style.height = '100%';
      }
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const scene = new SPLAT.Scene();
    const camera = new SPLAT.Camera();
    const renderer = new SPLAT.WebGLRenderer(canvas);
    const controls = new SPLAT.OrbitControls(camera, canvas);

    let animationFrameId: number;
    const animate = () => {
      controls.update();
      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(animate);
    };

    (async () => {
      try {
      await SPLAT.Loader.LoadAsync(url, scene, () => {});
      animate();
      } catch (e) {
        console.error('Failed to load PLY:', e);
        const errorMessage = (e as Error).message;
        if (errorMessage.includes('Float32Array')) {
          setError('Invalid PLY format: This file is not a valid Gaussian Splat.');
        } else {
          setError(`Failed to load PLY file: ${errorMessage}`);
        }
      }
    })();

    return () => {
      cancelAnimationFrame(animationFrameId);
      controls.dispose();
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [url, settings.quality]);

  if (error) {
    return <div className="text-red-400 p-4 text-center">{error}</div>;
  }

  return <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />;
};

const TriangleSplatRenderer = ({ url, onStatsUpdate }: { url: string; onStatsUpdate: (stats: any) => void }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const { settings } = useViewerSettings();
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;
    
    const loadFile = async () => {
      try {
        let geometry, stats;
        
        if (url.endsWith('.off')) {
          const { loadOFF } = await import('../viewers/triangle/offLoader');
          const result = await loadOFF(url, (loaded, total) => {
            onStatsUpdate({ loadingProgress: total ? (loaded / total) * 100 : 0 });
          });
          geometry = result.geometry;
          stats = result.stats;
        } else {
          const result = await loadTSF(url, (loaded, total) => {
      onStatsUpdate({ loadingProgress: total ? (loaded / total) * 100 : 0 });
          });
          geometry = result.geometry;
          stats = result.stats;
        }
        
      if (!mounted) return;
        
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
        
      if (meshRef.current) {
        meshRef.current.geometry = geom;
        setLoaded(true);
      }
      onStatsUpdate({ ...stats, loaded: true });
      } catch (e) {
        onStatsUpdate({ error: (e as Error).message });
      }
    };
    
    loadFile();

    return () => { mounted = false; };
  }, [url, onStatsUpdate]);

  useEffect(() => {
    if (meshRef.current && loaded) {
      meshRef.current.material = createTriangleSplattingMaterial({
        hasVertexColors: true,
        wireframe: settings.wireframe,
        exposure: settings.exposure
      });
    }
  }, [settings.exposure, settings.wireframe, loaded]);

  return (
    <>
      <mesh ref={meshRef} />
      {loaded && meshRef.current && (
        <Bounds fit clip observe margin={1.2}>
          <Center>
            <primitive object={meshRef.current} />
          </Center>
        </Bounds>
      )}
    </>
  );
};


const MeshRenderer = ({ url }: { url: string }) => {
  const geom = useLoader(PLYLoader, url);
  
  useEffect(() => {
    if (geom) {
      geom.computeVertexNormals();
    }
  }, [geom]);

  return (
    <Bounds fit clip observe margin={1.2}>
      <Center>
        <mesh geometry={geom}>
          <meshStandardMaterial vertexColors side={THREE.DoubleSide} metalness={0.2} roughness={0.8} />
    </mesh>
      </Center>
    </Bounds>
  );
};


const UnifiedRenderer = ({ fileType, fileUrl, onStatsUpdate }: { 
  fileType: 'gaussian' | 'triangle' | 'mesh' | null; 
  fileUrl: string | null; 
  onStatsUpdate: (stats: any) => void; 
}) => {
  const { settings } = useViewerSettings();
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [selectedAnnotation, setSelectedAnnotation] = useState<string | null>(null);
  const [measurementMode, setMeasurementMode] = useState(false);
  const [measurementPoints, setMeasurementPoints] = useState<THREE.Vector3[]>([]);
  const [cameraPath, setCameraPath] = useState<THREE.Vector3[]>([]);
  const [isPlayingPath, setIsPlayingPath] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [showAxes, setShowAxes] = useState(true);
  const [cameraMode, setCameraMode] = useState<'orbit' | 'fly' | 'first-person'>('orbit');
  
  const handleAddAnnotation = (position: [number, number, number], text: string) => {
    const newAnnotation: Annotation = {
      id: Date.now().toString(),
      position,
      text,
      color: '#00d4ff',
      timestamp: new Date().toLocaleString(),
      author: 'Current User'
    };
    setAnnotations([...annotations, newAnnotation]);
  };
  
  const handleUpdateAnnotation = (id: string, position: [number, number, number]) => {
    setAnnotations(annotations.map(ann => 
      ann.id === id ? { ...ann, position } : ann
    ));
  };
  
  const handleDeleteAnnotation = (id: string) => {
    setAnnotations(annotations.filter(ann => ann.id !== id));
    if (selectedAnnotation === id) {
      setSelectedAnnotation(null);
    }
  };
  
  const handleMeasurementClick = useCallback((e: any) => {
    if (!measurementMode) return;
    
    const point = e.point;
    if (measurementPoints.length < 2) {
      setMeasurementPoints([...measurementPoints, point]);
    }
  }, [measurementMode, measurementPoints]);
  
  const handleClearMeasurement = () => {
    setMeasurementPoints([]);
  };
  
  const handleAddKeyframe = (camera: THREE.Camera) => {
    setCameraPath([...cameraPath, camera.position.clone()]);
  };
  
  const handleExportScene = () => {
    // Export functionality would go here
    console.log('Exporting scene with annotations:', annotations);
  };
  
  if (!fileUrl || !fileType) return null;

  if (fileType === 'gaussian') {
    return (
      <>
        <GaussianSplatRenderer url={fileUrl} />
        <HolographicStats />
        {/* Enhanced UI overlay */}
        <div className="absolute top-4 right-4 flex flex-col gap-2">
          <motion.div
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="bg-gradient-to-br from-gray-900/90 to-black/90 p-4 rounded-xl backdrop-blur-xl border border-gray-700/50 shadow-2xl"
          >
            <h3 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-base">tune</span>
              Scene Tools
            </h3>
            
            <div className="space-y-2">
              <button
                onClick={() => {
                  const text = prompt('Enter annotation text:');
                  if (text) handleAddAnnotation([0, 0, 0], text);
                }}
                className="w-full bg-gradient-to-r from-blue-600/80 to-blue-700/80 hover:from-blue-500 hover:to-blue-600 px-3 py-2 rounded-lg text-sm backdrop-blur flex items-center gap-2 transition-all"
              >
                <span className="material-symbols-outlined text-base">add_location</span>
                Add Annotation
              </button>
              
              <button
                onClick={() => setMeasurementMode(!measurementMode)}
                className={`w-full px-3 py-2 rounded-lg text-sm backdrop-blur flex items-center gap-2 transition-all ${
                  measurementMode 
                    ? 'bg-gradient-to-r from-green-600/80 to-green-700/80' 
                    : 'bg-gradient-to-r from-gray-600/80 to-gray-700/80 hover:from-gray-500 hover:to-gray-600'
                }`}
              >
                <span className="material-symbols-outlined text-base">straighten</span>
                {measurementMode ? 'Exit Measure' : 'Measure Distance'}
              </button>
              
              <button
                onClick={() => alert('Camera path recording coming soon!')}
                className="w-full bg-gradient-to-r from-purple-600/80 to-purple-700/80 hover:from-purple-500 hover:to-purple-600 px-3 py-2 rounded-lg text-sm backdrop-blur flex items-center gap-2 transition-all"
              >
                <span className="material-symbols-outlined text-base">videocam</span>
                Record Path
              </button>
              
              <button
                onClick={handleExportScene}
                className="w-full bg-gradient-to-r from-orange-600/80 to-orange-700/80 hover:from-orange-500 hover:to-orange-600 px-3 py-2 rounded-lg text-sm backdrop-blur flex items-center gap-2 transition-all"
              >
                <span className="material-symbols-outlined text-base">download</span>
                Export Scene
              </button>
            </div>
          </motion.div>
          
          {annotations.length > 0 && (
            <motion.div
              initial={{ x: 100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="bg-gradient-to-br from-gray-900/90 to-black/90 p-4 rounded-xl backdrop-blur-xl border border-gray-700/50 shadow-2xl max-w-xs"
            >
              <h3 className="text-sm font-medium text-gray-300 mb-2">Annotations ({annotations.length})</h3>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {annotations.map(ann => (
                  <div
                    key={ann.id}
                    onClick={() => setSelectedAnnotation(ann.id)}
                    className={`p-2 rounded cursor-pointer text-xs transition-all ${
                      selectedAnnotation === ann.id 
                        ? 'bg-blue-900/50 border border-blue-500/50' 
                        : 'bg-gray-800/50 hover:bg-gray-700/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span style={{ color: ann.color }}>{ann.text}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteAnnotation(ann.id);
                        }}
                        className="text-red-400 hover:text-red-300"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </>
    );
  }

  return (
    <>
      <Canvas 
        style={{ background: settings.backgroundColor }}
        camera={{ position: [0, 0, 5], fov: 60 }}
        shadows={settings.quality !== 'Low'}
        gl={{ 
          preserveDrawingBuffer: true, 
          antialias: settings.quality !== 'Low',
          alpha: true,
          powerPreference: "high-performance"
        }}
        dpr={qualityToDPR(settings.quality)}
        onClick={handleMeasurementClick}
      >
        <Suspense fallback={<Loader />}>
          {fileType === 'triangle' && <TriangleSplatRenderer url={fileUrl} onStatsUpdate={onStatsUpdate} />}
          {fileType === 'mesh' && <MeshRenderer url={fileUrl} />}
          
          {/* Enhanced Lighting */}
          <ambientLight intensity={0.6} />
          <directionalLight 
            position={[10, 20, 10]} 
            intensity={1.2} 
            castShadow={settings.quality !== 'Low'}
            shadow-mapSize={[2048, 2048]}
          />
          <directionalLight 
            position={[-10, 10, -10]} 
            intensity={0.5} 
            color="#8888ff"
          />
          <hemisphereLight 
            color="#ffffff" 
            groundColor="#444444" 
            intensity={0.4} 
          />
          
          {/* Grid and Axes */}
          {showGrid && (
            <Grid 
              args={[100, 100]} 
              cellSize={1} 
              cellThickness={0.5} 
              cellColor="#444444" 
              sectionSize={10} 
              sectionThickness={1} 
              sectionColor="#666666" 
              fadeDistance={100} 
              fadeStrength={1} 
              followCamera={false} 
              infiniteGrid={false}
            />
          )}
          
          {showAxes && <axesHelper args={[50]} />}
          
          {/* Annotations */}
          {annotations.map(annotation => (
            <AnnotationMarker
              key={annotation.id}
              annotation={annotation}
              onUpdate={handleUpdateAnnotation}
              onDelete={handleDeleteAnnotation}
              isSelected={selectedAnnotation === annotation.id}
              onSelect={setSelectedAnnotation}
            />
          ))}
          
          {/* Measurement Tool */}
          {measurementMode && (
            <MeasurementTool
              points={measurementPoints}
              onAddPoint={(point) => {
                if (measurementPoints.length < 2) {
                  setMeasurementPoints([...measurementPoints, point]);
                }
              }}
              onClear={handleClearMeasurement}
            />
          )}
          
          {/* Camera Path */}
          <CameraPathAnimation 
            isPlaying={isPlayingPath} 
            path={cameraPath}
            onUpdatePath={setCameraPath}
          />
          
          {/* Camera Controls */}
          {cameraMode === 'orbit' && <OrbitControls makeDefault enableDamping dampingFactor={0.05} />}
          
          {/* Enhanced Keyboard Controls */}
          <EnhancedCameraControls />
        </Suspense>
        
        {/* Environment */}
        <Environment preset={settings.quality === 'High' ? 'city' : 'sunset'} />
      </Canvas>
      
      <HolographicStats />
      
      {/* Enhanced Professional UI Controls */}
      <div className="absolute top-4 right-4 flex flex-col gap-3">
        <motion.div
          initial={{ x: 100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="bg-gradient-to-br from-gray-900/95 to-black/95 p-5 rounded-xl backdrop-blur-xl border border-gray-700/50 shadow-2xl min-w-[250px]"
        >
          <h3 className="text-sm font-medium text-gray-300 mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-base">tune</span>
            Professional Tools
          </h3>
          
          <div className="space-y-3">
            {/* View Controls */}
            <div className="space-y-2">
              <label className="text-xs text-gray-400 uppercase tracking-wider">View Options</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowGrid(!showGrid)}
                  className={`flex-1 px-2 py-1 rounded text-xs transition-all ${
                    showGrid 
                      ? 'bg-blue-600/80 text-white' 
                      : 'bg-gray-700/80 text-gray-400 hover:bg-gray-600/80'
                  }`}
                >
                  Grid
                </button>
                <button
                  onClick={() => setShowAxes(!showAxes)}
                  className={`flex-1 px-2 py-1 rounded text-xs transition-all ${
                    showAxes 
                      ? 'bg-blue-600/80 text-white' 
                      : 'bg-gray-700/80 text-gray-400 hover:bg-gray-600/80'
                  }`}
                >
                  Axes
                </button>
              </div>
            </div>
            
            {/* Annotation Tools */}
            <EnhancedButton
              onClick={() => {
                const text = prompt('Enter annotation text:');
                if (text) handleAddAnnotation([0, 0, 0], text);
              }}
              variant="primary"
              size="sm"
              fullWidth
              icon={<span className="material-symbols-outlined text-base">add_location</span>}
            >
              Add Annotation
            </EnhancedButton>
            
            {/* Measurement Tools */}
            <EnhancedButton
              onClick={() => {
                setMeasurementMode(!measurementMode);
                if (!measurementMode) {
                  setMeasurementPoints([]);
                }
              }}
              variant={measurementMode ? "success" : "secondary"}
              size="sm"
              fullWidth
              icon={<span className="material-symbols-outlined text-base">straighten</span>}
            >
              {measurementMode ? 'Exit Measure Mode' : 'Measure Distance'}
            </EnhancedButton>
            
            {/* Camera Tools */}
            <div className="space-y-2">
              <button
                onClick={() => {
                  // Camera keyframe functionality will be added
                  alert('Add camera keyframe at current position');
                }}
                className="w-full bg-gradient-to-r from-purple-600/80 to-purple-700/80 hover:from-purple-500 hover:to-purple-600 px-3 py-2 rounded-lg text-sm backdrop-blur flex items-center gap-2 transition-all transform hover:scale-[1.02]"
              >
                <span className="material-symbols-outlined text-base">add_a_photo</span>
                Add Camera Keyframe
              </button>
              
              {cameraPath.length > 1 && (
                <button
                  onClick={() => setIsPlayingPath(!isPlayingPath)}
                  className="w-full bg-gradient-to-r from-pink-600/80 to-pink-700/80 hover:from-pink-500 hover:to-pink-600 px-3 py-2 rounded-lg text-sm backdrop-blur flex items-center gap-2 transition-all transform hover:scale-[1.02]"
                >
                  <span className="material-symbols-outlined text-base">
                    {isPlayingPath ? 'pause' : 'play_arrow'}
                  </span>
                  {isPlayingPath ? 'Pause' : 'Play'} Camera Path
                </button>
              )}
            </div>
            
            {/* Export Tools */}
            <div className="pt-2 border-t border-gray-700/50">
              <button
                onClick={handleExportScene}
                className="w-full bg-gradient-to-r from-orange-600/80 to-orange-700/80 hover:from-orange-500 hover:to-orange-600 px-3 py-2 rounded-lg text-sm backdrop-blur flex items-center gap-2 transition-all transform hover:scale-[1.02]"
              >
                <span className="material-symbols-outlined text-base">download</span>
                Export Scene Data
              </button>
            </div>
          </div>
        </motion.div>
        
        {/* Annotations List */}
        {annotations.length > 0 && (
          <motion.div
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-gray-900/95 to-black/95 p-4 rounded-xl backdrop-blur-xl border border-gray-700/50 shadow-2xl min-w-[250px]"
          >
            <h3 className="text-sm font-medium text-gray-300 mb-3 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span className="material-symbols-outlined text-base">location_on</span>
                Annotations ({annotations.length})
              </span>
              <button
                onClick={() => {
                  if (confirm('Clear all annotations?')) {
                    setAnnotations([]);
                    setSelectedAnnotation(null);
                  }
                }}
                className="text-xs text-red-400 hover:text-red-300"
              >
                Clear all
              </button>
            </h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {annotations.map(ann => (
                <motion.div
                  key={ann.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  onClick={() => setSelectedAnnotation(ann.id)}
                  className={`p-2 rounded-lg cursor-pointer text-xs transition-all ${
                    selectedAnnotation === ann.id 
                      ? 'bg-gradient-to-r from-blue-900/50 to-blue-800/50 border border-blue-500/50' 
                      : 'bg-gray-800/50 hover:bg-gray-700/50 border border-transparent'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="font-medium" style={{ color: ann.color }}>{ann.text}</div>
                      <div className="text-gray-500 text-[10px] mt-1">{ann.timestamp}</div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteAnnotation(ann.id);
                      }}
                      className="text-red-400 hover:text-red-300 text-lg leading-none"
                    >
                      ×
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
        
        {/* Measurement Results */}
        {measurementPoints.length > 0 && (
          <motion.div
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-green-900/95 to-green-800/95 p-4 rounded-xl backdrop-blur-xl border border-green-700/50 shadow-2xl min-w-[250px]"
          >
            <h3 className="text-sm font-medium text-green-300 mb-2 flex items-center gap-2">
              <span className="material-symbols-outlined text-base">straighten</span>
              Measurement
            </h3>
            <div className="text-xs text-green-200">
              {measurementPoints.length === 1 ? (
                <p>Click to add second point</p>
              ) : (
                <p>Distance: {measurementPoints[0].distanceTo(measurementPoints[1]).toFixed(3)} units</p>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </>
  );
};

// Enhanced Annotation System with improved UI
const AnnotationSystem = ({ onAnnotationSelect, selectedId }: { 
  onAnnotationSelect: (id: string | null) => void; 
  selectedId: string | null;
}) => {
  return null; // Placeholder for now, annotations are handled in UnifiedRenderer
};

// Main Component
const SplatViewerPage: React.FC = () => {
  const [splatUrl, setSplatUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [isDebugMode, setIsDebugMode] = useState(false);
  const [viewerType, setViewerType] = useState<ViewerType>('gaussian');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Missing state declarations
  const [fileType, setFileType] = useState<'gaussian' | 'triangle' | 'mesh' | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [stats, setStats] = useState<any>({});
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showLumaInput, setShowLumaInput] = useState(false);
  const [lumaUrl, setLumaUrl] = useState('');

  // Unified file handler
  const handleFiles = useCallback(async (files: FileList | File[]) => {
    if (files.length === 0) return;
    const fileToProcess = files[0];

    if (splatUrl) URL.revokeObjectURL(splatUrl);
    setError(null);
    setStats({});

    let determinedType: 'gaussian' | 'triangle' | 'mesh' | null = null;
    if (fileToProcess.name.endsWith('.ply')) {
      // Read the header to determine if it's gaussian or mesh
      const headerSlice = fileToProcess.slice(0, 1000);
      const headerText = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string || '');
        reader.readAsText(headerSlice);
      });
      const hasGaussianProperties = headerText.includes('f_dc_0') && headerText.includes('opacity');
      determinedType = hasGaussianProperties ? 'gaussian' : 'mesh';
    } else if (fileToProcess.name.endsWith('.tsf')) {
      determinedType = 'triangle';
    } else if (fileToProcess.name.endsWith('.off')) {
      determinedType = 'triangle';
    } else {
      setError('Unsupported file type. Please upload a .ply, .tsf, or .off file.');
      return;
    }
    
    setFileType(determinedType);
    setFile(fileToProcess);
    setFileUrl(URL.createObjectURL(fileToProcess));
  }, [splatUrl]);

  // Manual drag event handlers
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };
  
  const handleStatsUpdate = useCallback((newStats: any) => {
    setStats((prev: any) => ({ ...prev, ...newStats }));
  }, []);

  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  return (
    <div className="relative flex min-h-screen flex-col bg-gray-950 text-white">
      <Header />
      <NavigationBreadcrumb />
      <ViewerSettingsProvider>
        <main className="flex-1 flex flex-col items-center justify-center p-4 gap-4 relative">
          {/* Add Luma AI toggle button */}
          <div className="w-full max-w-4xl flex justify-between items-center mb-4">
            <h1 className="text-2xl md:text-3xl font-bold text-white">3D Splat Viewer</h1>
            <button
              onClick={() => setShowLumaInput(!showLumaInput)}
              className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all text-sm font-medium flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-base">
                {showLumaInput ? 'upload_file' : 'language'}
              </span>
              {showLumaInput ? 'Upload File' : 'Load from Luma'}
            </button>
          </div>

          <CardGlass className="w-full h-[70vh] flex-grow overflow-hidden flex items-center justify-center relative">
            <AnimatePresence mode="wait">
          {!splatUrl ? (
                showLumaInput ? (
                  // Luma AI URL input
                  <motion.div
                    key="luma-input"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="w-full max-w-md p-6"
                  >
              <div className="space-y-4">
                      <div className="text-center mb-6">
                        <span className="material-symbols-outlined text-6xl text-purple-400 mb-4 block">language</span>
                        <h3 className="text-xl font-semibold text-white mb-2">Load from Luma AI</h3>
                        <p className="text-gray-400 text-sm">
                          Import your Luma AI captures directly
                        </p>
                      </div>
                      <input
                        type="text"
                        placeholder="Enter Luma AI capture URL"
                        value={lumaUrl}
                        onChange={(e) => setLumaUrl(e.target.value)}
                        className="w-full px-4 py-3 bg-[#0a0a0a] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
                      />
                      <button
                        onClick={async () => {
                          if (lumaUrl) {
                            try {
                              // Extract capture ID from Luma URL
                              const captureId = lumaUrl.match(/capture\/([a-zA-Z0-9-]+)/)?.[1];
                              if (captureId) {
                                // Note: This is a placeholder - actual Luma API integration would require authentication
                                alert('Luma AI integration coming soon! For now, please download the PLY file from Luma and upload it.');
                                setShowLumaInput(false);
                              } else {
                                setError('Invalid Luma AI URL. Please use a valid capture URL.');
                              }
                            } catch (error) {
                              console.error('Error loading from Luma:', error);
                              setError('Failed to load from Luma AI. Please check the URL and try again.');
                            }
                          }
                        }}
                        disabled={!lumaUrl}
                        className="w-full px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
                      >
                        Load Splat
                      </button>
                      <p className="text-xs text-gray-500 text-center">
                        Example: https://lumalabs.ai/capture/abc123...
                      </p>
                    </div>
                  </motion.div>
                ) : (
                  // File upload interface
                  <motion.div
                    key="dropzone"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="w-full h-full"
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    <div className={`w-full h-full flex flex-col items-center justify-center text-center border-2 border-dashed transition-all rounded-lg ${isDragging ? 'border-blue-400 bg-blue-900/20' : 'border-gray-600'}`}>
                      <input
                        id="splat-file-upload"
                        type="file"
                        className="hidden"
                        accept=".ply,.tsf,.off"
                        onChange={(e) => handleFiles(e.target.files || [])}
                      />
                      <div className="space-y-4 flex flex-col items-center">
                        <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 1.5, repeat: Infinity }}>
                          <span className="material-symbols-outlined text-6xl text-blue-400">cloud_upload</span>
                        </motion.div>
                        <p className="text-xl text-gray-300">
                          {isDragging ? "Release to upload!" : "Drag & drop a file"}
                        </p>
                        <div className="flex items-center w-full max-w-xs">
                          <div className="flex-grow border-t border-gray-700"></div>
                          <span className="flex-shrink mx-4 text-gray-500 text-sm">OR</span>
                          <div className="flex-grow border-t border-gray-700"></div>
                        </div>
                        <label htmlFor="splat-file-upload" className="bg-blue-600 text-white font-bold py-3 px-8 rounded-lg hover:bg-blue-500 transition-all focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-75 cursor-pointer">
                          Select from Computer
                        </label>
              </div>
            </div>
                  </motion.div>
                )
              ) : (
                <motion.div key="renderer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full h-full">
                  <UnifiedRenderer fileType={fileType} fileUrl={fileUrl} onStatsUpdate={handleStatsUpdate} />
                </motion.div>
              )}
            </AnimatePresence>
          </CardGlass>
          
        {file && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
              className="w-full max-w-4xl"
          >
              <CardGlass className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-400">File</p>
                <p className="font-bold truncate">{file.name}</p>
              </div>
              <div>
                <p className="text-gray-400">Size</p>
                <p className="font-bold">{formatBytes(file.size)}</p>
              </div>
              <div>
                <p className="text-gray-400">Vertices</p>
                <p className="font-bold">{stats.vertexCount?.toLocaleString() || 'N/A'}</p>
              </div>
              <div>
                <p className="text-gray-400">Faces/Triangles</p>
                <p className="font-bold">{stats.faceCount?.toLocaleString() || 'N/A'}</p>
              </div>
            </div>
                {stats.loadingProgress > 0 && stats.loadingProgress < 100 && (
              <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
                <motion.div
                  className="bg-blue-500 h-2 rounded-full"
                      animate={{ width: `${stats.loadingProgress}%` }}
                />
              </div>
            )}
              </CardGlass>
          </motion.div>
        )}
        
          {error && (
            <motion.div initial={{opacity: 0}} animate={{opacity: 1}}>
              <CardGlass className="p-4 border border-red-500/20 bg-red-500/10">
                <div className="text-red-400 text-center">
                  <span className="material-symbols-outlined text-2xl mb-2 block">error</span>
                  {error}
                </div>
              </CardGlass>
            </motion.div>
          )}
          <SplatViewerControls />
      </main>
      </ViewerSettingsProvider>
      <Footer />
    </div>
  );
};

export default SplatViewerPage; 