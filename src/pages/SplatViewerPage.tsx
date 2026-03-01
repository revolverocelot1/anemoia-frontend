import React, { useState, useRef, Suspense, useCallback, useEffect, useMemo } from 'react';
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
import {
  Upload, Box, Grid3X3, Zap, Eye, ArrowRight,
  RotateCcw, Layers, ArrowUp, RefreshCw, HelpCircle, Settings2,
  Mouse, Keyboard, MonitorSmartphone, X
} from 'lucide-react';

// ══════════════════════════════════════════════
// Types
// ══════════════════════════════════════════════

type ViewerType = 'gaussian' | 'triangle';

/** Unified camera API that both Gaussian & Three.js renderers expose */
interface CameraAPI {
  resetView: () => void;
  frontView: () => void;
  sideView: () => void;
  topView: () => void;
  setAutoRotate: (enabled: boolean) => void;
  setFov: (fov: number) => void;
}

// ══════════════════════════════════════════════
// Quality Helpers
// ══════════════════════════════════════════════

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
};

// ══════════════════════════════════════════════
// Annotations
// ══════════════════════════════════════════════

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
                  onClick={(e) => { e.stopPropagation(); onDelete(annotation.id); }}
                  className="text-red-400 hover:text-red-300 transition-colors"
                  style={{ fontSize: '18px', lineHeight: '1' }}
                >×</button>
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

// ══════════════════════════════════════════════
// Measurement Tool
// ══════════════════════════════════════════════

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

  return (
    <>
      {points.map((point, i) => (
        <group key={i}>
          <mesh position={point}>
            <sphereGeometry args={[0.05, 16, 16]} />
            <meshStandardMaterial color="#00ff00" emissive="#00ff00" emissiveIntensity={0.5} />
          </mesh>
          <Html position={point} center>
            <div className="bg-black/80 text-green-400 px-2 py-1 rounded text-xs">P{i + 1}</div>
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
          <Line points={points} color="#00ff00" lineWidth={2} dashed dashScale={5} />
          <Html position={points[0].clone().add(points[1]).multiplyScalar(0.5)} center>
            <div className="bg-gradient-to-r from-green-900/90 to-green-800/90 text-green-400 px-3 py-2 rounded-lg text-sm font-medium backdrop-blur-sm border border-green-500/30">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-base">straighten</span>
                {distance} units
              </div>
              <button onClick={onClear} className="text-xs text-green-300 hover:text-green-200 mt-1">
                Clear measurement
              </button>
            </div>
          </Html>
        </>
      )}
    </>
  );
};

// ══════════════════════════════════════════════
// Camera Path Animation
// ══════════════════════════════════════════════

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
          <mesh position={point} onClick={() => setSelectedKeyframe(i)}>
            <boxGeometry args={[0.1, 0.1, 0.1]} />
            <meshStandardMaterial
              color="#ff00ff"
              emissive="#ff00ff"
              emissiveIntensity={selectedKeyframe === i ? 0.8 : 0.3}
            />
          </mesh>
          <Html position={point} center>
            <div className="bg-purple-900/80 text-purple-300 px-2 py-1 rounded text-xs">K{i + 1}</div>
          </Html>
        </group>
      ))}
      {path.length > 1 && (
        <Line points={path} color="#ff00ff" lineWidth={1} opacity={0.5} transparent />
      )}
    </>
  );
};

// ══════════════════════════════════════════════
// Loading Overlay
// ══════════════════════════════════════════════

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

// ══════════════════════════════════════════════
// Three.js Camera API Bridge
// (lives inside <Canvas> to access useThree)
// ══════════════════════════════════════════════

const ThreeJSCameraAPIBridge = ({
  orbitControlsRef,
  cameraAPIRef,
}: {
  orbitControlsRef: React.RefObject<any>;
  cameraAPIRef: React.MutableRefObject<CameraAPI | null>;
}) => {
  const { camera } = useThree();

  useEffect(() => {
    cameraAPIRef.current = {
      resetView: () => {
        camera.position.set(5, 5, 5);
        camera.lookAt(0, 0, 0);
        if (orbitControlsRef.current) {
          orbitControlsRef.current.target.set(0, 0, 0);
          orbitControlsRef.current.update();
        }
      },
      frontView: () => {
        camera.position.set(0, 0, 10);
        camera.lookAt(0, 0, 0);
        if (orbitControlsRef.current) {
          orbitControlsRef.current.target.set(0, 0, 0);
          orbitControlsRef.current.update();
        }
      },
      sideView: () => {
        camera.position.set(10, 0, 0);
        camera.lookAt(0, 0, 0);
        if (orbitControlsRef.current) {
          orbitControlsRef.current.target.set(0, 0, 0);
          orbitControlsRef.current.update();
        }
      },
      topView: () => {
        camera.position.set(0, 10, 0.01);
        camera.lookAt(0, 0, 0);
        if (orbitControlsRef.current) {
          orbitControlsRef.current.target.set(0, 0, 0);
          orbitControlsRef.current.update();
        }
      },
      setAutoRotate: (enabled: boolean) => {
        if (orbitControlsRef.current) {
          orbitControlsRef.current.autoRotate = enabled;
          orbitControlsRef.current.autoRotateSpeed = 2;
        }
      },
      setFov: (fov: number) => {
        if ((camera as THREE.PerspectiveCamera).isPerspectiveCamera) {
          (camera as THREE.PerspectiveCamera).fov = fov;
          (camera as THREE.PerspectiveCamera).updateProjectionMatrix();
        }
      },
    };

    return () => { cameraAPIRef.current = null; };
  }, [camera, orbitControlsRef, cameraAPIRef]);

  return null;
};

// ══════════════════════════════════════════════
// Enhanced Keyboard Camera Controls (Three.js)
// ══════════════════════════════════════════════

const EnhancedCameraControls = ({ orbitControlsRef }: { orbitControlsRef: React.RefObject<any> }) => {
  const { camera, gl } = useThree();
  const [moveSpeed] = useState(0.5);
  const [rotateSpeed] = useState(0.02);
  const [isShiftPressed, setIsShiftPressed] = useState(false);
  const [isControlPressed, setIsControlPressed] = useState(false);
  const [isAltPressed, setIsAltPressed] = useState(false);
  const [activeKeys, setActiveKeys] = useState(new Set<string>());

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      setActiveKeys(prev => new Set(prev).add(key));

      if (e.key === 'Shift') setIsShiftPressed(true);
      if (e.key === 'Control') setIsControlPressed(true);
      if (e.key === 'Alt') { setIsAltPressed(true); e.preventDefault(); }

      const cameraKeys = ['w', 'a', 's', 'd', 'q', 'e', 'r', 'f', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'z', 'x', 'c', ' '];
      if (cameraKeys.includes(key) || key === ' ') e.preventDefault();

      // Frame selected
      if (key === 'f' && !e.repeat) {
        if (orbitControlsRef.current) {
          orbitControlsRef.current.target.set(0, 0, 0);
          camera.position.set(5, 5, 5);
          camera.lookAt(0, 0, 0);
        }
      }

      // Numpad quick views
      switch (e.key) {
        case '1':
          if (e.location === 3) {
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

    const handleWheel = (e: WheelEvent) => {
      if (isControlPressed || isShiftPressed) e.preventDefault();
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

  useFrame(() => {
    const currentMoveSpeed = isShiftPressed ? moveSpeed * 3 : isControlPressed ? moveSpeed * 0.3 : moveSpeed;
    const currentRotateSpeed = isControlPressed ? rotateSpeed * 0.3 : isShiftPressed ? rotateSpeed * 2 : rotateSpeed;

    const forward = new THREE.Vector3();
    const right = new THREE.Vector3();
    const up = new THREE.Vector3(0, 1, 0);
    camera.getWorldDirection(forward);
    right.crossVectors(forward, up).normalize();

    if (activeKeys.has('w')) {
      if (isAltPressed) {
        camera.position.addScaledVector(forward, currentMoveSpeed);
      } else {
        const moveDir = forward.clone(); moveDir.y = 0; moveDir.normalize();
        camera.position.addScaledVector(moveDir, currentMoveSpeed);
      }
    }
    if (activeKeys.has('s')) {
      if (isAltPressed) {
        camera.position.addScaledVector(forward, -currentMoveSpeed);
      } else {
        const moveDir = forward.clone(); moveDir.y = 0; moveDir.normalize();
        camera.position.addScaledVector(moveDir, -currentMoveSpeed);
      }
    }
    if (activeKeys.has('a')) camera.position.addScaledVector(right, -currentMoveSpeed);
    if (activeKeys.has('d')) camera.position.addScaledVector(right, currentMoveSpeed);
    if (activeKeys.has('q') || activeKeys.has('pagedown')) camera.position.y -= currentMoveSpeed;
    if (activeKeys.has('e') || activeKeys.has('pageup')) camera.position.y += currentMoveSpeed;

    if (orbitControlsRef.current) {
      if (activeKeys.has('arrowleft')) orbitControlsRef.current.rotateLeft(currentRotateSpeed);
      if (activeKeys.has('arrowright')) orbitControlsRef.current.rotateLeft(-currentRotateSpeed);
      if (activeKeys.has('arrowup')) orbitControlsRef.current.rotateUp(currentRotateSpeed);
      if (activeKeys.has('arrowdown')) orbitControlsRef.current.rotateUp(-currentRotateSpeed);
    }

    if (activeKeys.has('home') || (activeKeys.has('r') && !isShiftPressed)) {
      camera.position.set(5, 5, 5);
      camera.lookAt(0, 0, 0);
      if (orbitControlsRef.current) orbitControlsRef.current.target.set(0, 0, 0);
    }

    if (orbitControlsRef.current && (activeKeys.has('a') || activeKeys.has('d') || activeKeys.has('w') || activeKeys.has('s'))) {
      if (isShiftPressed) {
        const moveVector = new THREE.Vector3();
        if (activeKeys.has('a')) moveVector.addScaledVector(right, -currentMoveSpeed);
        if (activeKeys.has('d')) moveVector.addScaledVector(right, currentMoveSpeed);
        if (activeKeys.has('w')) {
          const moveDir = forward.clone(); moveDir.y = 0; moveDir.normalize();
          moveVector.addScaledVector(moveDir, currentMoveSpeed);
        }
        if (activeKeys.has('s')) {
          const moveDir = forward.clone(); moveDir.y = 0; moveDir.normalize();
          moveVector.addScaledVector(moveDir, -currentMoveSpeed);
        }
        orbitControlsRef.current.target.add(moveVector);
      }
    }
  });

  return null;
};

// ══════════════════════════════════════════════
// Renderers
// ══════════════════════════════════════════════

const GaussianSplatRenderer = ({
  url,
  format,
  cameraAPIRef,
}: {
  url: string;
  format?: string;
  cameraAPIRef?: React.MutableRefObject<CameraAPI | null>;
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<SPLAT.WebGLRenderer | null>(null);
  const cameraObjRef = useRef<SPLAT.Camera | null>(null);
  const controlsObjRef = useRef<SPLAT.OrbitControls | null>(null);
  const sceneObjRef = useRef<SPLAT.Scene | null>(null);
  const autoRotateRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const { settings } = useViewerSettings();

  const settingsRef = useRef(settings);
  useEffect(() => { settingsRef.current = settings; }, [settings]);

  /** Apply FOV by updating the gsplat camera's focal lengths via public setters.
   *  The CameraData.fx / .fy setters auto-trigger _updateProjectionMatrix(). */
  const applyFov = useCallback((fov: number) => {
    if (!cameraObjRef.current) return;
    try {
      const data = cameraObjRef.current.data;
      if (!data) return;
      const fovRad = (Math.max(5, Math.min(120, fov)) * Math.PI) / 180;
      const w = data.width || 800;
      const h = data.height || 600;
      const newFx = (w / 2) / Math.tan(fovRad / 2);
      const newFy = (h / 2) / Math.tan(fovRad / 2);
      // Use public setters — they call _updateProjectionMatrix internally
      data.fx = newFx;
      data.fy = newFy;
    } catch (e) {
      console.warn('[applyFov] failed:', e);
    }
  }, []);

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
    let renderer: SPLAT.WebGLRenderer;
    try {
      renderer = new SPLAT.WebGLRenderer(canvas);
    } catch (e) {
      console.error('[GaussianSplatRenderer] WebGL init failed:', e);
      setError('WebGL initialization failed. Your browser may not support WebGL.');
      return;
    }
    sceneObjRef.current = scene;
    cameraObjRef.current = camera;
    rendererRef.current = renderer;

    // Track current spherical coordinates so we can do auto-rotate
    const spherical = { alpha: 0, beta: 0.15, radius: 5 };

    const createControls = (alpha: number, beta: number, radius: number) => {
      controlsObjRef.current?.dispose();

      // Store the new spherical coords
      spherical.alpha = alpha;
      spherical.beta = beta;
      spherical.radius = radius;

      const controls = new SPLAT.OrbitControls(
        camera, canvas,
        alpha, beta, radius,
        true, new SPLAT.Vector3(0, 0, 0)
      );
      controls.orbitSpeed = 1.5;
      controls.panSpeed = 1.0;
      controls.zoomSpeed = 2.0;
      controls.dampening = 0.12;
      controls.minZoom = 0.5;
      controls.maxZoom = 20;
      controlsObjRef.current = controls;

      // Force an immediate update so the camera position is set right away
      controls.update();

      return controls;
    };

    // Front view: alpha=0, beta=0.15 (slight downward tilt avoids axis-aligned sorting edge case)
    createControls(0, 0.15, 5);

    if (cameraAPIRef) {
      cameraAPIRef.current = {
        resetView: () => { createControls(0, 0.15, 5); },
        frontView: () => { createControls(0, 0.15, 5); },
        sideView: () => { createControls(-Math.PI / 2, 0.15, 5); },
        topView: () => { createControls(0, -(Math.PI / 2 - 0.01), 7); },
        setAutoRotate: (enabled: boolean) => { autoRotateRef.current = enabled; },
        setFov: (fov: number) => applyFov(fov),
      };
    }

    let animationFrameId: number;
    let frameCount = 0;

    /**
     * Auto-rotate: gsplat OrbitControls keeps desired alpha/beta/radius as
     * closure variables (not instance properties), so we can't poke them
     * directly.  Instead we synthesise a small horizontal mouse-drag on the
     * canvas each frame — the controls' internal mousemove handler modifies
     * the desired alpha for us, giving smooth orbit behaviour.
     */
    const syntheticDrag = (dx: number) => {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;

      // mousedown → mousemove → mouseup (left button)
      canvas.dispatchEvent(new MouseEvent('mousedown', {
        clientX: cx, clientY: cy, button: 0, bubbles: true,
      }));
      canvas.dispatchEvent(new MouseEvent('mousemove', {
        clientX: cx + dx, clientY: cy, button: 0, bubbles: true,
      }));
      window.dispatchEvent(new MouseEvent('mouseup', {
        clientX: cx + dx, clientY: cy, button: 0, bubbles: true,
      }));
    };

    const animate = () => {
      // Auto-rotate: drive the controls via synthetic drag
      if (autoRotateRef.current && controlsObjRef.current) {
        syntheticDrag(2);  // ~2px per frame ≈ smooth rotation
      }

      // First 5 frames: tiny nudge to kick-start dampening (fixes black screen on SwiftShader)
      if (frameCount < 5 && controlsObjRef.current) {
        syntheticDrag(0.1);
      }
      frameCount++;

      controlsObjRef.current?.update();
      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(animate);
    };

    (async () => {
      try {
        const isPly = format === '.ply' || url.includes('.ply') || !url.includes('.splat');
        console.log('[GaussianSplatRenderer] Loading:', url.substring(0, 60));

        if (isPly) {
          await SPLAT.PLYLoader.LoadAsync(url, scene, () => {});
        } else {
          await SPLAT.Loader.LoadAsync(url, scene, () => {});
        }

        console.log('[GaussianSplatRenderer] Scene loaded, starting animation');
        camera.data.setSize(canvas.width, canvas.height);
        animate();
      } catch (e) {
        console.error('Failed to load PLY:', e);
        const errorMessage = (e as Error).message;
        if (errorMessage.includes('Float32Array') || errorMessage.includes('Invalid vertex count')) {
          setError('Invalid PLY format: This file is not a valid Gaussian Splat.');
        } else if (errorMessage.includes('Invalid PLY header')) {
          setError('Invalid PLY header: The file does not have a valid PLY format header.');
        } else {
          setError(`Failed to load PLY file: ${errorMessage}`);
        }
      }
    })();

    return () => {
      cancelAnimationFrame(animationFrameId);
      controlsObjRef.current?.dispose();
      controlsObjRef.current = null;
      cameraObjRef.current = null;
      sceneObjRef.current = null;
      rendererRef.current = null;
      if (cameraAPIRef) cameraAPIRef.current = null;
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [url, format, applyFov]);

  // Apply background color
  useEffect(() => {
    if (canvasRef.current) {
      canvasRef.current.style.backgroundColor = settings.backgroundColor;
    }
  }, [settings.backgroundColor]);

  // Reactive FOV changes from settings (only after initial render)
  const initialRenderDone = useRef(false);
  useEffect(() => {
    if (!initialRenderDone.current) {
      initialRenderDone.current = true;
      return;
    }
    applyFov(settings.fov);
  }, [settings.fov, applyFov]);

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
  const { settings } = useViewerSettings();
  const meshRef = useRef<THREE.Mesh>(null);

  useEffect(() => {
    if (geom) geom.computeVertexNormals();
  }, [geom]);

  // Apply wireframe from settings
  useEffect(() => {
    if (meshRef.current && meshRef.current.material) {
      (meshRef.current.material as THREE.MeshStandardMaterial).wireframe = settings.wireframe;
    }
  }, [settings.wireframe]);

  return (
    <Bounds fit clip observe margin={1.2}>
      <Center>
        <mesh ref={meshRef} geometry={geom}>
          <meshStandardMaterial
            vertexColors
            side={THREE.DoubleSide}
            metalness={0.2}
            roughness={0.8}
            wireframe={settings.wireframe}
          />
        </mesh>
      </Center>
    </Bounds>
  );
};

// ══════════════════════════════════════════════
// Help Overlay
// ══════════════════════════════════════════════

const HelpOverlay = ({ onClose, viewerType }: { onClose: () => void; viewerType: 'gaussian' | 'triangle' | 'mesh' | null }) => {
  const isGaussian = viewerType === 'gaussian';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-6 pointer-events-auto"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-gradient-to-br from-gray-900 to-gray-950 rounded-2xl border border-cyan-500/20 
          shadow-2xl shadow-cyan-900/20 max-w-3xl w-full max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 sticky top-0 bg-gray-900/95 backdrop-blur-sm z-10 rounded-t-2xl">
          <h2 className="text-lg font-bold text-white flex items-center gap-3">
            <HelpCircle className="w-5 h-5 text-cyan-400" />
            3D Viewer Controls Guide
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-8">
          {/* Mouse Controls */}
          <section>
            <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Mouse className="w-4 h-4" />
              Mouse Controls
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <HelpItem
                keys="Left Click + Drag"
                action="Orbit / Rotate camera around the scene"
                icon="🖱️"
              />
              <HelpItem
                keys="Right Click + Drag"
                action="Pan camera (move left/right/up/down)"
                icon="🖱️"
              />
              <HelpItem
                keys="Scroll Wheel"
                action="Zoom in and out"
                icon="🔄"
              />
              <HelpItem
                keys="Middle Click + Drag"
                action="Pan camera (alternative)"
                icon="🖱️"
              />
            </div>
          </section>

          {/* Keyboard Controls */}
          {!isGaussian && (
            <section>
              <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Keyboard className="w-4 h-4" />
                Keyboard Controls
              </h3>
              <div className="space-y-4">
                {/* Movement */}
                <div>
                  <h4 className="text-xs text-gray-400 font-medium mb-2 uppercase tracking-wider">Movement</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <HelpItem keys="W / S" action="Move forward / backward" />
                    <HelpItem keys="A / D" action="Move left / right" />
                    <HelpItem keys="Q / E" action="Move down / up" />
                    <HelpItem keys="Alt + W/S" action="Move along view direction" />
                  </div>
                </div>

                {/* Rotation */}
                <div>
                  <h4 className="text-xs text-gray-400 font-medium mb-2 uppercase tracking-wider">Rotation</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <HelpItem keys="↑ ↓ ← →" action="Orbit camera around the target" />
                    <HelpItem keys="Arrow Keys" action="Rotate view up/down/left/right" />
                  </div>
                </div>

                {/* Quick Views */}
                <div>
                  <h4 className="text-xs text-gray-400 font-medium mb-2 uppercase tracking-wider">Quick Views</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <HelpItem keys="Numpad 1" action="Front view" />
                    <HelpItem keys="Numpad 3" action="Right side view" />
                    <HelpItem keys="Numpad 7" action="Top-down view" />
                    <HelpItem keys="F" action="Frame / focus on scene center" />
                  </div>
                </div>

                {/* Modifiers */}
                <div>
                  <h4 className="text-xs text-gray-400 font-medium mb-2 uppercase tracking-wider">Modifiers & Other</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <HelpItem keys="Shift" action="Fast movement + pan target" />
                    <HelpItem keys="Ctrl" action="Slow / precision movement" />
                    <HelpItem keys="R / Home" action="Reset camera to default" />
                    <HelpItem keys="Space" action="Play / pause animation" />
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Toolbar Buttons */}
          <section>
            <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Settings2 className="w-4 h-4" />
              Toolbar Buttons
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <HelpItem
                keys="Reset"
                action="Returns camera to default isometric position"
                icon={<RotateCcw className="w-3.5 h-3.5 text-cyan-400" />}
              />
              <HelpItem
                keys="Front"
                action="View the scene from directly in front"
                icon={<Box className="w-3.5 h-3.5 text-cyan-400" />}
              />
              <HelpItem
                keys="Side"
                action="View the scene from the right side"
                icon={<Layers className="w-3.5 h-3.5 text-cyan-400" />}
              />
              <HelpItem
                keys="Top"
                action="View the scene from directly above"
                icon={<ArrowUp className="w-3.5 h-3.5 text-cyan-400" />}
              />
              <HelpItem
                keys="Auto-Rotate"
                action="Continuously rotate around the scene"
                icon={<RefreshCw className="w-3.5 h-3.5 text-cyan-400" />}
              />
              <HelpItem
                keys="Settings ⚙"
                action="Open the viewer settings sidebar panel"
                icon={<Settings2 className="w-3.5 h-3.5 text-cyan-400" />}
              />
            </div>
          </section>

          {/* Settings Explained */}
          <section>
            <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <MonitorSmartphone className="w-4 h-4" />
              Settings Explained
            </h3>
            <div className="space-y-3">
              <HelpExplanation
                title="Exposure"
                desc="Controls the brightness of the rendered scene. Higher values make the scene brighter."
              />
              <HelpExplanation
                title="Wireframe"
                desc={isGaussian
                  ? "Not available for Gaussian Splats. Gaussian splats are rendered as projected 2D Gaussians — there are no polygon edges to visualize."
                  : "Renders the model as wireframe edges instead of solid surfaces. Useful for inspecting mesh topology."
                }
              />
              <HelpExplanation
                title="Background Color"
                desc="Changes the background color of the 3D viewport."
              />
              <HelpExplanation
                title="Quality (Low / Medium / High)"
                desc="Adjusts render resolution and anti-aliasing. Lower quality = better performance on older hardware."
              />
              {!isGaussian && (
                <>
                  <HelpExplanation
                    title="Grid"
                    desc="Toggles the reference grid visible on the ground plane. Helps judge scale and position."
                  />
                  <HelpExplanation
                    title="Axes"
                    desc="Shows X (red), Y (green), Z (blue) axis helper lines at the origin."
                  />
                </>
              )}
            </div>
          </section>

          {/* Shortcut Quick-Reference */}
          <section>
            <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Keyboard className="w-4 h-4" />
              Quick Reference
            </h3>
            <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/40">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-2 text-gray-400">
                  <kbd className="px-1.5 py-0.5 bg-gray-700 rounded text-[10px] text-gray-300 border border-gray-600 font-mono">H</kbd>
                  Toggle settings panel
                </div>
                <div className="flex items-center gap-2 text-gray-400">
                  <kbd className="px-1.5 py-0.5 bg-gray-700 rounded text-[10px] text-gray-300 border border-gray-600 font-mono">?</kbd>
                  Open this help guide
                </div>
                <div className="flex items-center gap-2 text-gray-400">
                  <kbd className="px-1.5 py-0.5 bg-gray-700 rounded text-[10px] text-gray-300 border border-gray-600 font-mono">Esc</kbd>
                  Close overlays
                </div>
              </div>
            </div>
          </section>
        </div>
      </motion.div>
    </motion.div>
  );
};

const HelpItem = ({ keys, action, icon }: { keys: string; action: string; icon?: React.ReactNode | string }) => (
  <div className="flex items-start gap-3 bg-gray-800/40 rounded-lg px-3 py-2.5 border border-gray-700/30">
    {icon && (
      <span className="shrink-0 mt-0.5">
        {typeof icon === 'string' ? <span className="text-sm">{icon}</span> : icon}
      </span>
    )}
    <div className="flex-1 min-w-0">
      <span className="text-xs font-mono text-cyan-300 bg-cyan-950/40 px-1.5 py-0.5 rounded border border-cyan-800/30">
        {keys}
      </span>
      <p className="text-xs text-gray-400 mt-1 leading-relaxed">{action}</p>
    </div>
  </div>
);

const HelpExplanation = ({ title, desc }: { title: string; desc: string }) => (
  <div className="bg-gray-800/30 rounded-lg px-4 py-3 border border-gray-700/30">
    <h5 className="text-sm font-medium text-gray-200 mb-1">{title}</h5>
    <p className="text-xs text-gray-400 leading-relaxed">{desc}</p>
  </div>
);

// ══════════════════════════════════════════════
// Viewer Toolbar (bottom bar)
// ══════════════════════════════════════════════

const ViewerToolbar = ({
  cameraAPIRef,
  autoRotate,
  onToggleAutoRotate,
  onToggleSettings,
  settingsOpen,
  onToggleHelp,
  viewerType,
}: {
  cameraAPIRef: React.MutableRefObject<CameraAPI | null>;
  autoRotate: boolean;
  onToggleAutoRotate: () => void;
  onToggleSettings: () => void;
  settingsOpen: boolean;
  onToggleHelp: () => void;
  viewerType: 'gaussian' | 'triangle' | 'mesh' | null;
}) => {
  const ToolbarButton = ({
    icon,
    label,
    onClick,
    active,
    tooltip,
  }: {
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
    active?: boolean;
    tooltip: string;
  }) => (
    <motion.button
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.92 }}
      onClick={onClick}
      title={tooltip}
      className={`flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-lg transition-all text-[10px] font-medium
        ${active
          ? 'bg-cyan-600/80 text-white shadow-lg shadow-cyan-500/20'
          : 'text-gray-400 hover:text-white hover:bg-white/10'
        }`}
    >
      {icon}
      <span>{label}</span>
    </motion.button>
  );

  return (
    <motion.div
      initial={{ y: 60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.2, type: 'spring', stiffness: 300, damping: 30 }}
      className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30 pointer-events-auto"
    >
      <div className="flex items-center gap-1 px-3 py-2 bg-gray-900/90 backdrop-blur-xl rounded-2xl 
        border border-gray-700/50 shadow-2xl shadow-black/50">
        {/* Camera Presets */}
        <div className="flex items-center gap-1 pr-2 border-r border-gray-700/50">
          <ToolbarButton
            icon={<RotateCcw className="w-4 h-4" />}
            label="Reset"
            onClick={() => cameraAPIRef.current?.resetView()}
            tooltip="Reset camera (R / Home)"
          />
          <ToolbarButton
            icon={<Box className="w-4 h-4" />}
            label="Front"
            onClick={() => cameraAPIRef.current?.frontView()}
            tooltip="Front view (Numpad 1)"
          />
          <ToolbarButton
            icon={<Layers className="w-4 h-4" />}
            label="Side"
            onClick={() => cameraAPIRef.current?.sideView()}
            tooltip="Side view (Numpad 3)"
          />
          <ToolbarButton
            icon={<ArrowUp className="w-4 h-4" />}
            label="Top"
            onClick={() => cameraAPIRef.current?.topView()}
            tooltip="Top view (Numpad 7)"
          />
        </div>

        {/* Auto-Rotate */}
        <div className="flex items-center gap-1 pr-2 border-r border-gray-700/50">
          <ToolbarButton
            icon={<RefreshCw className={`w-4 h-4 ${autoRotate ? 'animate-spin' : ''}`} />}
            label="Rotate"
            onClick={onToggleAutoRotate}
            active={autoRotate}
            tooltip="Toggle auto-rotation"
          />
        </div>

        {/* Settings & Help */}
        <div className="flex items-center gap-1">
          <ToolbarButton
            icon={<Settings2 className="w-4 h-4" />}
            label="Settings"
            onClick={onToggleSettings}
            active={settingsOpen}
            tooltip="Toggle settings panel (H)"
          />
          <ToolbarButton
            icon={<HelpCircle className="w-4 h-4" />}
            label="Help"
            onClick={onToggleHelp}
            tooltip="Open controls guide (?)"
          />
        </div>
      </div>
    </motion.div>
  );
};

// ══════════════════════════════════════════════
// Unified Renderer
// ══════════════════════════════════════════════

const UnifiedRenderer = ({
  fileType,
  fileUrl,
  onStatsUpdate,
}: {
  fileType: 'gaussian' | 'triangle' | 'mesh' | null;
  fileUrl: string | null;
  onStatsUpdate: (stats: any) => void;
}) => {
  const { settings } = useViewerSettings();

  // UI state
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [autoRotate, setAutoRotate] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [showAxes, setShowAxes] = useState(true);

  // Annotations & tools
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [selectedAnnotation, setSelectedAnnotation] = useState<string | null>(null);
  const [measurementMode, setMeasurementMode] = useState(false);
  const [measurementPoints, setMeasurementPoints] = useState<THREE.Vector3[]>([]);
  const [cameraPath, setCameraPath] = useState<THREE.Vector3[]>([]);
  const [isPlayingPath, setIsPlayingPath] = useState(false);

  // Camera API refs
  const cameraAPIRef = useRef<CameraAPI | null>(null);
  const orbitControlsRef = useRef<any>(null);

  // Keyboard shortcut handler for H / ? / Esc
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'h' || e.key === 'H') {
        setSettingsOpen(prev => !prev);
      }
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        setHelpOpen(prev => !prev);
      }
      if (e.key === 'Escape') {
        setHelpOpen(false);
        setSettingsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Auto-rotate sync
  const handleToggleAutoRotate = useCallback(() => {
    setAutoRotate(prev => {
      const next = !prev;
      cameraAPIRef.current?.setAutoRotate(next);
      return next;
    });
  }, []);

  // FOV sync — update camera when focal length / FOV changes in settings
  useEffect(() => {
    if (settings.fov && cameraAPIRef.current) {
      cameraAPIRef.current.setFov(settings.fov);
    }
  }, [settings.fov]);

  // Annotation handlers
  const handleAddAnnotation = (position: [number, number, number], text: string) => {
    setAnnotations(prev => [...prev, {
      id: Date.now().toString(),
      position,
      text,
      color: '#00d4ff',
      timestamp: new Date().toLocaleString(),
      author: 'Current User'
    }]);
  };

  const handleUpdateAnnotation = (id: string, position: [number, number, number]) => {
    setAnnotations(prev => prev.map(ann => ann.id === id ? { ...ann, position } : ann));
  };

  const handleDeleteAnnotation = (id: string) => {
    setAnnotations(prev => prev.filter(ann => ann.id !== id));
    if (selectedAnnotation === id) setSelectedAnnotation(null);
  };

  const handleMeasurementClick = useCallback((e: any) => {
    if (!measurementMode) return;
    if (measurementPoints.length < 2) {
      setMeasurementPoints(prev => [...prev, e.point]);
    }
  }, [measurementMode, measurementPoints]);

  if (!fileUrl || !fileType) return null;

  // ── Gaussian Splat Viewer ──
  if (fileType === 'gaussian') {
    return (
      <div className="relative w-full h-full overflow-hidden">
        <GaussianSplatRenderer url={fileUrl} format=".ply" cameraAPIRef={cameraAPIRef} />
        <HolographicStats />

        {/* Viewer Toolbar */}
        <ViewerToolbar
          cameraAPIRef={cameraAPIRef}
          autoRotate={autoRotate}
          onToggleAutoRotate={handleToggleAutoRotate}
          onToggleSettings={() => setSettingsOpen(prev => !prev)}
          settingsOpen={settingsOpen}
          onToggleHelp={() => setHelpOpen(prev => !prev)}
          viewerType={fileType}
        />

        {/* Settings Sidebar */}
        <SplatViewerControls
          open={settingsOpen}
          onToggle={() => setSettingsOpen(prev => !prev)}
          viewerType={fileType}
          onResetView={() => cameraAPIRef.current?.resetView()}
          onFrontView={() => cameraAPIRef.current?.frontView()}
          onSideView={() => cameraAPIRef.current?.sideView()}
          onTopView={() => cameraAPIRef.current?.topView()}
          onToggleAutoRotate={handleToggleAutoRotate}
          autoRotate={autoRotate}
        />

        {/* Help Overlay */}
        <AnimatePresence>
          {helpOpen && <HelpOverlay onClose={() => setHelpOpen(false)} viewerType={fileType} />}
        </AnimatePresence>
      </div>
    );
  }

  // ── Three.js Renderer (Triangle Splat / Mesh) ──
  return (
    <div className="relative w-full h-full overflow-hidden">
      <Canvas
        style={{ background: settings.backgroundColor }}
        camera={{ position: [0, 0, 5], fov: settings.fov ?? 60 }}
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

          {/* Lighting */}
          <ambientLight intensity={0.6} />
          <directionalLight
            position={[10, 20, 10]}
            intensity={1.2}
            castShadow={settings.quality !== 'Low'}
            shadow-mapSize={[2048, 2048]}
          />
          <directionalLight position={[-10, 10, -10]} intensity={0.5} color="#8888ff" />
          <hemisphereLight color="#ffffff" groundColor="#444444" intensity={0.4} />

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
                  setMeasurementPoints(prev => [...prev, point]);
                }
              }}
              onClear={() => setMeasurementPoints([])}
            />
          )}

          {/* Camera Path */}
          <CameraPathAnimation
            isPlaying={isPlayingPath}
            path={cameraPath}
            onUpdatePath={setCameraPath}
          />

          {/* Controls */}
          <OrbitControls ref={orbitControlsRef} makeDefault enableDamping dampingFactor={0.05} />
          <EnhancedCameraControls orbitControlsRef={orbitControlsRef} />

          {/* Camera API bridge (inside Canvas to access useThree) */}
          <ThreeJSCameraAPIBridge orbitControlsRef={orbitControlsRef} cameraAPIRef={cameraAPIRef} />
        </Suspense>

        <Environment preset={settings.quality === 'High' ? 'city' : 'sunset'} />
      </Canvas>

      <HolographicStats />

      {/* Viewer Toolbar */}
      <ViewerToolbar
        cameraAPIRef={cameraAPIRef}
        autoRotate={autoRotate}
        onToggleAutoRotate={handleToggleAutoRotate}
        onToggleSettings={() => setSettingsOpen(prev => !prev)}
        settingsOpen={settingsOpen}
        onToggleHelp={() => setHelpOpen(prev => !prev)}
        viewerType={fileType}
      />

      {/* Settings Sidebar */}
      <SplatViewerControls
        open={settingsOpen}
        onToggle={() => setSettingsOpen(prev => !prev)}
        viewerType={fileType}
        onResetView={() => cameraAPIRef.current?.resetView()}
        onFrontView={() => cameraAPIRef.current?.frontView()}
        onSideView={() => cameraAPIRef.current?.sideView()}
        onTopView={() => cameraAPIRef.current?.topView()}
        onToggleAutoRotate={handleToggleAutoRotate}
        autoRotate={autoRotate}
        showGrid={showGrid}
        onToggleGrid={() => setShowGrid(prev => !prev)}
        showAxes={showAxes}
        onToggleAxes={() => setShowAxes(prev => !prev)}
      />

      {/* Help Overlay */}
      <AnimatePresence>
        {helpOpen && <HelpOverlay onClose={() => setHelpOpen(false)} viewerType={fileType} />}
      </AnimatePresence>
    </div>
  );
};

// ══════════════════════════════════════════════
// Modern Toggle Component
// ══════════════════════════════════════════════

const ViewerToggle = ({ viewerType, onChange }: { viewerType: ViewerType; onChange: (type: ViewerType) => void }) => {
  const navigate = useNavigate();

  const handleViewerChange = (type: ViewerType) => {
    onChange(type);
    if (type === 'triangle') {
      navigate('/triangle-splatting');
    }
  };

  return (
    <div className="bg-gradient-to-r from-gray-900/90 to-black/90 p-1.5 rounded-2xl backdrop-blur-xl border border-gray-700/50 shadow-xl">
      <div className="relative flex">
        <motion.div
          className="absolute inset-0 h-full w-1/2 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-xl shadow-lg"
          animate={{ x: viewerType === 'gaussian' ? 0 : '100%' }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        />
        <button
          onClick={() => handleViewerChange('gaussian')}
          className={`relative z-10 px-8 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${viewerType === 'gaussian' ? 'text-white' : 'text-gray-400 hover:text-gray-200'}`}
        >
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-lg">blur_on</span>
            <span>Gaussian Splatting</span>
          </div>
        </button>
        <button
          onClick={() => handleViewerChange('triangle')}
          className={`relative z-10 px-8 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${viewerType === 'triangle' ? 'text-white' : 'text-gray-400 hover:text-gray-200'} flex items-center gap-2`}
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

// ══════════════════════════════════════════════
// Main Page
// ══════════════════════════════════════════════

const SplatViewerPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [splatUrl, setSplatUrl] = useState<string | null>(null);
  const [viewerType, setViewerType] = useState<ViewerType>('gaussian');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fileType, setFileType] = useState<'gaussian' | 'triangle' | 'mesh' | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [stats, setStats] = useState<any>({});
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [loadingFromStore, setLoadingFromStore] = useState(false);

  // Load file from IndexedDB if loadId is present
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
        .finally(() => { setLoadingFromStore(false); });
    }
  }, [searchParams]);

  // Unified file handler
  const handleFiles = useCallback(async (files: FileList | File[]) => {
    if (files.length === 0) return;
    const fileToProcess = files[0];

    if (splatUrl) URL.revokeObjectURL(splatUrl);
    setError(null);
    setStats({});

    const fileExt = fileToProcess.name.split('.').pop()?.toLowerCase();

    if (viewerType === 'gaussian') {
      if (fileExt !== 'ply') {
        setError('For Gaussian Splatting, please upload a .ply file');
        return;
      }
      const headerSlice = fileToProcess.slice(0, 1000);
      const headerText = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string || '');
        reader.readAsText(headerSlice);
      });
      const hasGaussianProperties = headerText.includes('f_dc_0') && headerText.includes('opacity');
      setFileType(hasGaussianProperties ? 'gaussian' : 'mesh');
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

  // Drag handlers
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); e.stopPropagation(); setIsDragging(false);
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
  };

  return (
    <div className="relative flex min-h-screen flex-col bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white">
      <Header />
      <NavigationBreadcrumb />
      <ViewerSettingsProvider>
        <main className="flex-1 flex flex-col p-6">
          <div className="container mx-auto max-w-7xl">
            {/* Title */}
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

            {/* Viewer */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
            >
              <CardGlass className="h-[75vh] overflow-hidden relative bg-gradient-to-br from-gray-900/50 to-black/50 border border-cyan-900/20">
                <AnimatePresence mode="wait">
                  {!fileUrl ? (
                    /* ── Upload Zone ── */
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
                      <div className={`w-full h-full flex flex-col items-center justify-center text-center transition-all ${isDragging ? 'bg-gradient-to-br from-cyan-900/20 to-blue-900/20 border-2 border-cyan-500 border-dashed rounded-lg' : ''}`}>
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
                              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute -top-2 -right-2 bg-cyan-500 rounded-full p-1">
                                <ArrowRight size={20} className="text-white" />
                              </motion.div>
                            )}
                          </motion.div>

                          <div>
                            <h3 className="text-2xl font-semibold text-gray-200 mb-2">
                              {isDragging ? "Release to upload!" : `Upload ${viewerType === 'gaussian' ? 'Gaussian Splat' : 'Triangle Splat'} File`}
                            </h3>
                            <p className="text-gray-400">
                              Drag & drop your {viewerType === 'gaussian' ? '.ply' : '.tsf, .off, or .ply'} file here
                            </p>
                          </div>

                          <div className="flex items-center w-full">
                            <div className="flex-grow border-t border-gray-700" />
                            <span className="flex-shrink mx-4 text-gray-500 text-sm uppercase tracking-wider">or</span>
                            <div className="flex-grow border-t border-gray-700" />
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
                    /* ── Active Viewer ── */
                    <motion.div key="renderer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full h-full">
                      <UnifiedRenderer fileType={fileType} fileUrl={fileUrl} onStatsUpdate={handleStatsUpdate} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardGlass>
            </motion.div>

            {/* File Info */}
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

            {/* Error */}
            {error && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-4">
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

            {/* Feature Cards */}
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

          {/* Custom scrollbar styles (used inside sidebar) */}
          <style>{`
            .custom-scrollbar::-webkit-scrollbar {
              width: 6px;
            }
            .custom-scrollbar::-webkit-scrollbar-track {
              background: transparent;
            }
            .custom-scrollbar::-webkit-scrollbar-thumb {
              background: rgba(6, 182, 212, 0.3);
              border-radius: 3px;
            }
            .custom-scrollbar::-webkit-scrollbar-thumb:hover {
              background: rgba(6, 182, 212, 0.5);
            }
          `}</style>
        </main>
      </ViewerSettingsProvider>
      <Footer />
    </div>
  );
};

export default SplatViewerPage;
