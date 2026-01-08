import React, { useState, useRef, Suspense, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Canvas, useLoader, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Environment, Html, useProgress, Center, Bounds, Line, PivotControls, Grid, TransformControls, PerspectiveCamera } from '@react-three/drei';
import * as SPLAT from 'gsplat';
import * as THREE from 'three';
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader.js';

import { loadTSF } from '../viewers/triangle/loader';
import { createTriangleSplattingMaterial, TriangleSplattingMaterialOptions } from '../viewers/triangle/triangleSplattingMaterial';
import { loadOFF, OFFGeometry, OFFStats } from '../viewers/triangle/offLoader';
import { PLYLoader as CustomPLYLoader } from '../viewers/triangle/plyLoader';
import { ViewerSettingsProvider, useViewerSettings, QualitySetting } from '../viewers/ViewerSettingsContext';
import SplatViewerControls from '../components/SplatViewerControls';
import CardGlass from '../components/CardGlass';
import Header from '../components/Header';
import Footer from '../components/Footer';
import HolographicStats from '../components/HolographicStats';
import EnhancedButton from '../components/EnhancedButton';
import NavigationBreadcrumb from '../components/NavigationBreadcrumb';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { sharpFileStore } from '../utils/sharpFileStore';
import { Upload, Box, Play, Pause, Settings, Grid3X3, Maximize2, Info, Zap, Eye, ArrowRight } from 'lucide-react';

// Add viewer type
type ViewerType = 'gaussian' | 'triangle';

// Enhanced Professional Camera Control Component
const EnhancedCameraControls = ({ orbitControlsRef }: { orbitControlsRef: React.RefObject<any> }) => {
  const { camera, gl, scene } = useThree();
  const [moveSpeed] = useState(0.5);
  const [rotateSpeed] = useState(0.02);
  const [isShiftPressed, setIsShiftPressed] = useState(false);
  const [isControlPressed, setIsControlPressed] = useState(false);
  const [isAltPressed, setIsAltPressed] = useState(false);
  const [activeKeys, setActiveKeys] = useState(new Set<string>());
  const [isPanning, setIsPanning] = useState(false);
  const pivotPoint = useRef(new THREE.Vector3());

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      setActiveKeys(prev => new Set(prev).add(key));
      
      // Modifier keys
      if (e.key === 'Shift') setIsShiftPressed(true);
      if (e.key === 'Control') setIsControlPressed(true);
      if (e.key === 'Alt') {
        setIsAltPressed(true);
        e.preventDefault();
      }
      
      // Prevent default for camera control keys
      const cameraKeys = ['w', 'a', 's', 'd', 'q', 'e', 'r', 'f', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'z', 'x', 'c', ' '];
      if (cameraKeys.includes(key) || key === ' ') {
        e.preventDefault();
      }

      // Frame selected (F key) - Focus on scene center
      if (key === 'f' && !e.repeat) {
        if (orbitControlsRef.current) {
          orbitControlsRef.current.target.set(0, 0, 0);
          camera.position.set(5, 5, 5);
          camera.lookAt(0, 0, 0);
        }
      }

      // Numpad quick views (like Blender)
      switch(e.key) {
        case '1':
          if (e.location === 3) { // Numpad
            camera.position.set(0, 0, 10);
            camera.lookAt(0, 0, 0);
            if (orbitControlsRef.current) orbitControlsRef.current.target.set(0, 0, 0);
          }
          break;
        case '3':
          if (e.location === 3) {
            camera.position.set(10, 0, 0);
            camera.lookAt(0, 0, 0);
            if (orbitControlsRef.current) orbitControlsRef.current.target.set(0, 0, 0);
          }
          break;
        case '7':
          if (e.location === 3) {
            camera.position.set(0, 10, 0);
            camera.lookAt(0, 0, 0);
            if (orbitControlsRef.current) orbitControlsRef.current.target.set(0, 0, 0);
          }
          break;
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
      if (e.key === 'Alt') setIsAltPressed(false);
    };

    // Mouse wheel for zoom (with modifiers)
    const handleWheel = (e: WheelEvent) => {
      if (isControlPressed || isShiftPressed) {
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    gl.domElement.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      gl.domElement.removeEventListener('wheel', handleWheel);
    };
  }, [camera, gl, isControlPressed, isShiftPressed, orbitControlsRef]);

  useFrame((_, delta) => {
    const currentMoveSpeed = isShiftPressed ? moveSpeed * 3 : isControlPressed ? moveSpeed * 0.3 : moveSpeed;
    const currentRotateSpeed = isControlPressed ? rotateSpeed * 0.3 : isShiftPressed ? rotateSpeed * 2 : rotateSpeed;
    
    // Get camera's forward and right vectors
    const forward = new THREE.Vector3();
    const right = new THREE.Vector3();
    const up = new THREE.Vector3(0, 1, 0);
    
    camera.getWorldDirection(forward);
    right.crossVectors(forward, up).normalize();
    
    // Professional 3D software-style movement
    if (activeKeys.has('w')) {
      if (isAltPressed) {
        // Alt+W: Move forward along view direction
        camera.position.addScaledVector(forward, currentMoveSpeed);
      } else {
        // W: Move forward on XZ plane
        const moveDir = forward.clone();
        moveDir.y = 0;
        moveDir.normalize();
        camera.position.addScaledVector(moveDir, currentMoveSpeed);
      }
    }
    if (activeKeys.has('s')) {
      if (isAltPressed) {
        camera.position.addScaledVector(forward, -currentMoveSpeed);
      } else {
        const moveDir = forward.clone();
        moveDir.y = 0;
        moveDir.normalize();
        camera.position.addScaledVector(moveDir, -currentMoveSpeed);
      }
    }
    if (activeKeys.has('a')) {
      camera.position.addScaledVector(right, -currentMoveSpeed);
    }
    if (activeKeys.has('d')) {
      camera.position.addScaledVector(right, currentMoveSpeed);
    }
    if (activeKeys.has('q') || activeKeys.has('pagedown')) {
      camera.position.y -= currentMoveSpeed;
    }
    if (activeKeys.has('e') || activeKeys.has('pageup')) {
      camera.position.y += currentMoveSpeed;
    }
    
    // Professional rotation controls
    if (orbitControlsRef.current) {
      // Orbit around target
      if (activeKeys.has('arrowleft')) {
        orbitControlsRef.current.rotateLeft(currentRotateSpeed);
      }
      if (activeKeys.has('arrowright')) {
        orbitControlsRef.current.rotateLeft(-currentRotateSpeed);
      }
      if (activeKeys.has('arrowup')) {
        orbitControlsRef.current.rotateUp(currentRotateSpeed);
      }
      if (activeKeys.has('arrowdown')) {
        orbitControlsRef.current.rotateUp(-currentRotateSpeed);
      }
    }
    
    // Reset camera (Home key or R)
    if (activeKeys.has('home') || (activeKeys.has('r') && !isShiftPressed)) {
      camera.position.set(5, 5, 5);
      camera.lookAt(0, 0, 0);
      if (orbitControlsRef.current) {
        orbitControlsRef.current.target.set(0, 0, 0);
      }
    }
    
    // Update orbit controls target when panning
    if (orbitControlsRef.current && (activeKeys.has('a') || activeKeys.has('d') || activeKeys.has('w') || activeKeys.has('s'))) {
      // Move the orbit target with the camera for consistent rotation
      if (isShiftPressed) {
        const moveVector = new THREE.Vector3();
        if (activeKeys.has('a')) moveVector.addScaledVector(right, -currentMoveSpeed);
        if (activeKeys.has('d')) moveVector.addScaledVector(right, currentMoveSpeed);
        if (activeKeys.has('w')) {
          const moveDir = forward.clone();
          moveDir.y = 0;
          moveDir.normalize();
          moveVector.addScaledVector(moveDir, currentMoveSpeed);
        }
        if (activeKeys.has('s')) {
          const moveDir = forward.clone();
          moveDir.y = 0;
          moveDir.normalize();
          moveVector.addScaledVector(moveDir, -currentMoveSpeed);
        }
        orbitControlsRef.current.target.add(moveVector);
      }
    }
  });

  const [showControls, setShowControls] = React.useState(true);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setShowControls(false);
    }, 8000); // Hide after 8 seconds

    return () => clearTimeout(timer);
  }, []);

  return (
    <Html fullscreen>
      <div 
        className={`absolute bottom-4 left-4 bg-gradient-to-br from-gray-900/95 to-black/95 p-4 rounded-xl backdrop-blur-xl border border-gray-700/50 shadow-2xl text-xs max-w-xs transition-all duration-500 ${showControls ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}
        onMouseEnter={() => setShowControls(true)}
      >
        <h4 className="text-sm font-semibold text-gray-300 mb-2 flex items-center gap-2">
          <span className="material-symbols-outlined text-base">keyboard</span>
          Professional 3D Controls
        </h4>
        <div className="space-y-3">
          {/* Movement */}
          <div>
            <h5 className="text-gray-400 font-medium mb-1">Movement</h5>
            <div className="grid grid-cols-2 gap-1.5 text-gray-500">
              <div><kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-[10px] border border-gray-700">W/S</kbd> Move Forward/Back</div>
              <div><kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-[10px] border border-gray-700">A/D</kbd> Move Left/Right</div>
              <div><kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-[10px] border border-gray-700">Q/E</kbd> Move Down/Up</div>
              <div><kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-[10px] border border-gray-700">Shift</kbd> Fast + Pan target</div>
            </div>
          </div>
          
          {/* Rotation */}
          <div>
            <h5 className="text-gray-400 font-medium mb-1">Rotation</h5>
            <div className="grid grid-cols-2 gap-1.5 text-gray-500">
              <div><kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-[10px] border border-gray-700">↑↓←→</kbd> Orbit camera</div>
              <div><kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-[10px] border border-gray-700">Mouse</kbd> Click + drag</div>
              <div><kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-[10px] border border-gray-700">Alt</kbd> + Drag to pan</div>
              <div><kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-[10px] border border-gray-700">Scroll</kbd> Zoom in/out</div>
            </div>
          </div>
          
          {/* Quick Views */}
          <div>
            <h5 className="text-gray-400 font-medium mb-1">Quick Views</h5>
            <div className="grid grid-cols-2 gap-1.5 text-gray-500">
              <div><kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-[10px] border border-gray-700">Num1</kbd> Front view</div>
              <div><kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-[10px] border border-gray-700">Num3</kbd> Side view</div>
              <div><kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-[10px] border border-gray-700">Num7</kbd> Top view</div>
              <div><kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-[10px] border border-gray-700">F</kbd> Frame selected</div>
            </div>
          </div>
          
          {/* Other */}
          <div>
            <h5 className="text-gray-400 font-medium mb-1">Modifiers</h5>
            <div className="space-y-1 text-gray-500">
              <div><kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-[10px] border border-gray-700">Shift</kbd> Fast movement / Pan with target</div>
              <div><kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-[10px] border border-gray-700">Ctrl</kbd> Slow/precise movement</div>
              <div><kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-[10px] border border-gray-700">R/Home</kbd> Reset camera</div>
              <div><kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-[10px] border border-gray-700">Space</kbd> Play/Pause animation</div>
            </div>
          </div>
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

const GaussianSplatRenderer = ({ url, format }: { url: string; format?: string }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<SPLAT.WebGLRenderer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { settings } = useViewerSettings();

  // Store current settings in refs for the animation loop
  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    
    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      if (parent) {
        const { width, height } = qualityToResolution(settingsRef.current.quality, parent);
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
    rendererRef.current = renderer;
    
    // Configure OrbitControls for frontal viewing of the scene
    const controls = new SPLAT.OrbitControls(
      camera, 
      canvas,
      -Math.PI / 2,   // alpha: -90° - looking from negative Z toward origin (front view)
      Math.PI / 2,    // beta: at horizon level
      3,              // radius: viewing distance
      true,           // enable keyboard controls
      new SPLAT.Vector3(0, 0, 0) // target: scene center
    );
    
    // Configure controls for smooth interaction
    controls.orbitSpeed = 1.5;
    controls.panSpeed = 1.0;
    controls.zoomSpeed = 2.0;
    controls.dampening = 0.1;
    controls.minZoom = 0.5;
    controls.maxZoom = 20;

    let animationFrameId: number;
    const animate = () => {
      controls.update();
      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(animate);
    };

    (async () => {
      try {
        // Determine which loader to use based on format or file extension
        const isPly = format === '.ply' || url.includes('.ply') || !url.includes('.splat');
        console.log('[GaussianSplatRenderer] Loading with PLYLoader:', isPly, 'URL:', url.substring(0, 50));
        
        // Use PLYLoader directly for PLY files to ensure proper parsing
        if (isPly) {
          await SPLAT.PLYLoader.LoadAsync(url, scene, () => {});
        } else {
          await SPLAT.Loader.LoadAsync(url, scene, () => {});
        }
        
        console.log('[GaussianSplatRenderer] Scene loaded, starting animation');
        animate();
      } catch (e) {
        console.error('Failed to load PLY:', e);
        const errorMessage = (e as Error).message;
        if (errorMessage.includes('Float32Array') || errorMessage.includes('Invalid vertex count')) {
          setError('Invalid PLY format: This file is not a valid Gaussian Splat. The PLY file may be missing required properties.');
        } else if (errorMessage.includes('Invalid PLY header')) {
          setError('Invalid PLY header: The file does not have a valid PLY format header.');
        } else {
          setError(`Failed to load PLY file: ${errorMessage}`);
        }
      }
    })();

    return () => {
      cancelAnimationFrame(animationFrameId);
      controls.dispose();
      rendererRef.current = null;
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [url, format]); // Removed settings.quality to prevent unnecessary reloads

  // Apply background color changes without reloading the scene
  useEffect(() => {
    if (canvasRef.current) {
      canvasRef.current.style.backgroundColor = settings.backgroundColor;
    }
  }, [settings.backgroundColor]);

  if (error) {
    return <div className="text-red-400 p-4 text-center">{error}</div>;
  }

  return (
    <canvas 
      ref={canvasRef} 
      style={{ 
        width: '100%', 
        height: '100%', 
        display: 'block',
        backgroundColor: settings.backgroundColor 
      }} 
    />
  );
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
      // Use optimized shader for better performance on Low/Medium quality
      if (settings.quality === 'Low' || settings.quality === 'Medium') {
        const { createOptimizedTriangleSplattingMaterial } = require('../viewers/triangle/triangleSplattingMaterial');
        meshRef.current.material = createOptimizedTriangleSplattingMaterial({
          hasVertexColors: true,
          wireframe: settings.wireframe,
          exposure: settings.exposure
        });
      } else {
        meshRef.current.material = createTriangleSplattingMaterial({
          hasVertexColors: true,
          wireframe: settings.wireframe,
          exposure: settings.exposure
        });
      }
    }
  }, [settings.exposure, settings.wireframe, settings.quality, loaded]);

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
  const orbitControlsRef = useRef<any>(null);
  
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
        <GaussianSplatRenderer url={fileUrl} format=".ply" />
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
          {cameraMode === 'orbit' && <OrbitControls ref={orbitControlsRef} makeDefault enableDamping dampingFactor={0.05} />}
          
          {/* Enhanced Keyboard Controls */}
          <EnhancedCameraControls orbitControlsRef={orbitControlsRef} />
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

// Modern Toggle Component with Navigation
const ViewerToggle = ({ viewerType, onChange }: { viewerType: ViewerType; onChange: (type: ViewerType) => void }) => {
  const navigate = useNavigate();
  
  const handleViewerChange = (type: ViewerType) => {
    onChange(type);
    if (type === 'triangle') {
      // Navigate to triangle splatting page
      navigate('/triangle-splatting');
    }
  };
  
  return (
    <div className="bg-gradient-to-r from-gray-900/90 to-black/90 p-1.5 rounded-2xl backdrop-blur-xl border border-gray-700/50 shadow-xl">
      <div className="relative flex">
        <motion.div
          className="absolute inset-0 h-full w-1/2 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-xl shadow-lg"
          animate={{
            x: viewerType === 'gaussian' ? 0 : '100%',
          }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        />
        <button
          onClick={() => handleViewerChange('gaussian')}
          className={`relative z-10 px-8 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
            viewerType === 'gaussian' 
              ? 'text-white' 
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-lg">blur_on</span>
            <span>Gaussian Splatting</span>
          </div>
        </button>
        <button
          onClick={() => handleViewerChange('triangle')}
          className={`relative z-10 px-8 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
            viewerType === 'triangle' 
              ? 'text-white' 
              : 'text-gray-400 hover:text-gray-200'
          } flex items-center gap-2`}
        >
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-lg">change_history</span>
            <span>Triangle Splatting</span>
            <ArrowRight size={16} className="ml-1" />
          </div>
        </button>
      </div>
    </div>
  );
};

// Main Component
const SplatViewerPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
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
  const [loadingFromStore, setLoadingFromStore] = useState(false);

  // Load file from IndexedDB if loadId is present (from SHARP generator)
  useEffect(() => {
    const loadId = searchParams.get('loadId');
    if (loadId) {
      setLoadingFromStore(true);
      sharpFileStore.get(loadId)
        .then((storedFile) => {
          if (storedFile) {
            console.log('[SplatViewerPage] Loading file from IndexedDB:', storedFile.filename);
            const url = URL.createObjectURL(storedFile.blob);
            setFileUrl(url);
            setFileType('gaussian');
            setFile(new File([storedFile.blob], storedFile.filename, { type: 'application/octet-stream' }));
            if (storedFile.metadata) {
              setStats({
                splatCount: storedFile.metadata.gaussianCount,
                focalLength: storedFile.metadata.focalLength
              });
            }
          } else {
            console.warn('[SplatViewerPage] No file found for loadId:', loadId);
            setError('The requested file was not found. It may have expired.');
          }
        })
        .catch((err) => {
          console.error('[SplatViewerPage] Failed to load from IndexedDB:', err);
          setError('Failed to load the generated file.');
        })
        .finally(() => {
          setLoadingFromStore(false);
        });
    }
  }, [searchParams]);

  // Unified file handler
  const handleFiles = useCallback(async (files: FileList | File[]) => {
    if (files.length === 0) return;
    const fileToProcess = files[0];

    if (splatUrl) URL.revokeObjectURL(splatUrl);
    setError(null);
    setStats({});

    // Check file extension based on viewer type
    const fileExt = fileToProcess.name.split('.').pop()?.toLowerCase();
    
    if (viewerType === 'gaussian') {
      if (fileExt !== 'ply') {
        setError('For Gaussian Splatting, please upload a .ply file');
        return;
      }
      // Read the header to check if it's actually a gaussian splat
      const headerSlice = fileToProcess.slice(0, 1000);
      const headerText = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string || '');
        reader.readAsText(headerSlice);
      });
      const hasGaussianProperties = headerText.includes('f_dc_0') && headerText.includes('opacity');
      if (hasGaussianProperties) {
        setFileType('gaussian');
      } else {
        // It's a regular PLY mesh, not a Gaussian splat
        setFileType('mesh');
      }
    } else if (viewerType === 'triangle') {
      if (!['tsf', 'off', 'ply'].includes(fileExt || '')) {
        setError('For Triangle Splatting, please upload a .tsf, .off, or .ply file');
        return;
      }
      setFileType('triangle');
    }
    
    setFile(fileToProcess);
    setFileUrl(URL.createObjectURL(fileToProcess));
  }, [splatUrl, viewerType]);

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
    <div className="relative flex min-h-screen flex-col bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white">
      <Header />
      <NavigationBreadcrumb />
      <ViewerSettingsProvider>
        <main className="flex-1 flex flex-col p-6">
          <div className="container mx-auto max-w-7xl">
            {/* Modern header with viewer type toggle */}
            <div className="mb-8 text-center">
              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-4xl lg:text-5xl font-bold mb-4 bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent animate-gradient"
              >
                3D Splat Viewer
              </motion.h1>
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-gray-400 text-lg max-w-3xl mx-auto mb-6"
              >
                Professional-grade 3D visualization for Gaussian and Triangle Splatting with advanced rendering tools
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="flex justify-center"
              >
                <ViewerToggle viewerType={viewerType} onChange={setViewerType} />
              </motion.div>
            </div>

            {/* Main viewer area */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
            >
              <CardGlass className="h-[75vh] overflow-hidden relative bg-gradient-to-br from-gray-900/50 to-black/50 border border-cyan-900/20">
                <AnimatePresence mode="wait">
                  {!fileUrl ? (
                    // Enhanced file upload interface
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
                      <div className={`w-full h-full flex flex-col items-center justify-center text-center transition-all ${
                        isDragging 
                          ? 'bg-gradient-to-br from-cyan-900/20 to-blue-900/20 border-2 border-cyan-500 border-dashed rounded-lg' 
                          : ''
                      }`}>
                        <input
                          id="splat-file-upload"
                          type="file"
                          className="hidden"
                          accept={viewerType === 'gaussian' ? '.ply' : '.tsf,.off,.ply'}
                          onChange={(e) => handleFiles(e.target.files || [])}
                        />
                        <div className="space-y-6 flex flex-col items-center max-w-lg">
                          <motion.div 
                            animate={{ 
                              y: isDragging ? -10 : [0, -10, 0],
                              scale: isDragging ? 1.1 : 1
                            }} 
                            transition={{ 
                              y: { duration: 2, repeat: Infinity },
                              scale: { duration: 0.2 }
                            }}
                            className={`relative ${isDragging ? 'text-cyan-400' : 'text-blue-400'}`}
                          >
                            <Upload size={80} />
                            {isDragging && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="absolute -top-2 -right-2 bg-cyan-500 rounded-full p-1"
                              >
                                <ArrowRight size={20} className="text-white" />
                              </motion.div>
                            )}
                          </motion.div>
                          
                          <div>
                            <h3 className="text-2xl font-semibold text-gray-200 mb-2">
                              {isDragging 
                                ? "Release to upload!" 
                                : `Upload ${viewerType === 'gaussian' ? 'Gaussian Splat' : 'Triangle Splat'} File`
                              }
                            </h3>
                            <p className="text-gray-400">
                              Drag & drop your {viewerType === 'gaussian' ? '.ply' : '.tsf, .off, or .ply'} file here
                            </p>
                          </div>
                          
                          <div className="flex items-center w-full">
                            <div className="flex-grow border-t border-gray-700"></div>
                            <span className="flex-shrink mx-4 text-gray-500 text-sm uppercase tracking-wider">or</span>
                            <div className="flex-grow border-t border-gray-700"></div>
                          </div>
                          
                          <motion.label 
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            htmlFor="splat-file-upload" 
                            className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold py-4 px-10 rounded-xl transition-all cursor-pointer shadow-lg hover:shadow-xl flex items-center gap-3"
                          >
                            <Upload size={20} />
                            Select from Computer
                          </motion.label>
                          
                          {/* Supported formats */}
                          <div className="text-xs text-gray-500 mt-4">
                            <p>Supported formats: {viewerType === 'gaussian' 
                              ? 'PLY (Gaussian Splat format with f_dc_0 and opacity properties)' 
                              : 'TSF, OFF, PLY (Triangle mesh formats)'
                            }</p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div 
                      key="renderer" 
                      initial={{ opacity: 0 }} 
                      animate={{ opacity: 1 }} 
                      className="w-full h-full"
                    >
                      <UnifiedRenderer fileType={fileType} fileUrl={fileUrl} onStatsUpdate={handleStatsUpdate} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardGlass>
            </motion.div>
            
            {/* File info and stats */}
            {file && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="mt-6"
              >
                <CardGlass className="p-6 bg-gradient-to-br from-gray-900/90 to-gray-800/90 border border-cyan-900/30">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div>
                      <p className="text-gray-400 text-sm mb-1">File Name</p>
                      <p className="font-semibold text-cyan-400 truncate">{file.name}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm mb-1">File Size</p>
                      <p className="font-semibold text-white">{formatBytes(file.size)}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm mb-1">Vertices</p>
                      <p className="font-semibold text-white">{stats.vertexCount?.toLocaleString() || 'Loading...'}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm mb-1">{fileType === 'gaussian' ? 'Splats' : 'Triangles'}</p>
                      <p className="font-semibold text-white">{stats.faceCount?.toLocaleString() || stats.splatCount?.toLocaleString() || 'Loading...'}</p>
                    </div>
                  </div>
                  
                  {stats.loadingProgress > 0 && stats.loadingProgress < 100 && (
                    <div className="mt-4">
                      <div className="flex justify-between text-xs text-gray-400 mb-1">
                        <span>Loading Progress</span>
                        <span>{Math.round(stats.loadingProgress)}%</span>
                      </div>
                      <div className="w-full bg-gray-700/50 rounded-full h-2 overflow-hidden">
                        <motion.div
                          className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full rounded-full"
                          animate={{ width: `${stats.loadingProgress}%` }}
                          transition={{ duration: 0.3 }}
                        />
                      </div>
                    </div>
                  )}
                </CardGlass>
              </motion.div>
            )}
            
            {/* Error display */}
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4"
              >
                <CardGlass className="p-6 border border-red-500/30 bg-gradient-to-br from-red-900/20 to-red-800/20">
                  <div className="flex items-center gap-3 text-red-400">
                    <span className="material-symbols-outlined text-3xl">error</span>
                    <div>
                      <p className="font-semibold">Error Loading File</p>
                      <p className="text-sm mt-1">{error}</p>
                    </div>
                  </div>
                </CardGlass>
              </motion.div>
            )}
            
            {/* Feature cards */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4"
            >
              <CardGlass className="p-5 bg-gradient-to-br from-cyan-900/20 to-blue-900/20 border border-cyan-900/30">
                <h4 className="text-cyan-400 font-semibold mb-2 flex items-center gap-2">
                  <Zap size={18} />
                  WebGL Accelerated
                </h4>
                <p className="text-sm text-gray-400">
                  Hardware-accelerated rendering with custom shaders for optimal performance
                </p>
              </CardGlass>

              <CardGlass className="p-5 bg-gradient-to-br from-purple-900/20 to-pink-900/20 border border-purple-900/30">
                <h4 className="text-purple-400 font-semibold mb-2 flex items-center gap-2">
                  <Eye size={18} />
                  Professional Tools
                </h4>
                <p className="text-sm text-gray-400">
                  Advanced measurement, annotation, and camera control tools for research
                </p>
              </CardGlass>

              <CardGlass className="p-5 bg-gradient-to-br from-green-900/20 to-emerald-900/20 border border-green-900/30">
                <h4 className="text-green-400 font-semibold mb-2 flex items-center gap-2">
                  <Grid3X3 size={18} />
                  Multiple Formats
                </h4>
                <p className="text-sm text-gray-400">
                  Support for Gaussian Splats (PLY) and Triangle Splats (TSF, OFF, PLY)
                </p>
              </CardGlass>
            </motion.div>
          </div>
          
          <SplatViewerControls />
        </main>
      </ViewerSettingsProvider>
      <Footer />
    </div>
  );
};

export default SplatViewerPage; 