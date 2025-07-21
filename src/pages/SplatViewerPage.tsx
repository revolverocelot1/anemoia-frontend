import { useState, useRef, Suspense, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Canvas, useLoader, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Environment, Html, useProgress, Center, Bounds, Line, PivotControls } from '@react-three/drei';
import * as SPLAT from 'gsplat';
import * as THREE from 'three';
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader.js';

import { loadTSF } from '../viewers/triangle/loader';
import { createTriangleMaterial } from '../viewers/triangle/material';
import { ViewerSettingsProvider, useViewerSettings, QualitySetting } from '../viewers/ViewerSettingsContext';
import SplatViewerControls from '../components/SplatViewerControls';
import CardGlass from '../components/CardGlass';
import Header from '../components/Header';
import Footer from '../components/Footer';
import HolographicStats from '../components/HolographicStats';

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

// --- Annotations System ---
interface Annotation {
  id: string;
  position: [number, number, number];
  text: string;
  color: string;
}

const AnnotationMarker = ({ annotation, onUpdate, onDelete }: { 
  annotation: Annotation; 
  onUpdate: (id: string, position: [number, number, number]) => void;
  onDelete: (id: string) => void;
}) => {
  const [hovered, setHovered] = useState(false);
  
  return (
    <PivotControls
      anchor={[0, 0, 0]}
      onDrag={(worldMatrix) => {
        // Extract position from the world matrix
        const position = new THREE.Vector3();
        position.setFromMatrixPosition(worldMatrix);
        onUpdate(annotation.id, [position.x, position.y, position.z]);
      }}
      visible={hovered}
      scale={0.5}
    >
      <group position={annotation.position}>
        <mesh
          onPointerOver={() => setHovered(true)}
          onPointerOut={() => setHovered(false)}
        >
          <sphereGeometry args={[0.1, 16, 16]} />
          <meshBasicMaterial color={annotation.color} />
        </mesh>
        <Html
          position={[0, 0.3, 0]}
          center
          style={{
            background: 'rgba(0, 0, 0, 0.8)',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '12px',
            whiteSpace: 'nowrap',
            pointerEvents: hovered ? 'auto' : 'none'
          }}
        >
          <div className="flex items-center gap-2">
            <span>{annotation.text}</span>
            {hovered && (
              <button
                onClick={() => onDelete(annotation.id)}
                className="text-red-400 hover:text-red-300"
              >
                ×
              </button>
            )}
          </div>
        </Html>
      </group>
    </PivotControls>
  );
};

// --- Measurement Tool ---
const MeasurementTool = ({ points }: { 
  points: THREE.Vector3[];
}) => {
  const distance = points.length === 2 
    ? points[0].distanceTo(points[1]).toFixed(2)
    : null;
    
  return (
    <>
      {points.map((point, i) => (
        <mesh key={i} position={point}>
          <sphereGeometry args={[0.05, 16, 16]} />
          <meshBasicMaterial color="#00ff00" />
        </mesh>
      ))}
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
            <div className="bg-black/80 text-green-400 px-2 py-1 rounded text-sm">
              {distance} units
            </div>
          </Html>
        </>
      )}
    </>
  );
};

// --- Camera Path Animation ---
const CameraPathAnimation = ({ isPlaying, path }: { 
  isPlaying: boolean; 
  path: THREE.Vector3[];
}) => {
  const { camera } = useThree();
  const [progress, setProgress] = useState(0);
  
  useFrame((_, delta) => {
    if (!isPlaying || path.length < 2) return;
    
    setProgress((prev) => {
      const next = prev + delta * 0.1;
      if (next >= 1) return 0;
      return next;
    });
    
    // Interpolate camera position along path
    const curve = new THREE.CatmullRomCurve3(path);
    const point = curve.getPoint(progress);
    camera.position.lerp(point, 0.1);
    
    // Look at center
    camera.lookAt(0, 0, 0);
  });
  
  return (
    <>
      {path.map((point, i) => (
        <mesh key={i} position={point}>
          <boxGeometry args={[0.1, 0.1, 0.1]} />
          <meshBasicMaterial color="#ff00ff" />
        </mesh>
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
        <div className="text-2xl font-bold">{Math.round(progress)}%</div>
        <div className="text-sm">Loading...</div>
      </div>
    </Html>
  );
};

// --- Renderer Components ---

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

  useEffect(() => {
    let mounted = true;
    loadTSF(url, (loaded, total) => {
      onStatsUpdate({ loadingProgress: total ? (loaded / total) * 100 : 0 });
    }).then(({ geometry, stats }) => {
      if (!mounted) return;
      const geom = new THREE.BufferGeometry();
      geom.setAttribute('position', new THREE.BufferAttribute(geometry.vertices, 3));
      geom.setAttribute('color', new THREE.BufferAttribute(geometry.colors, 3, true));
      geom.setIndex(new THREE.BufferAttribute(geometry.indices, 1));
      if (meshRef.current) {
        meshRef.current.geometry = geom;
      }
      onStatsUpdate({ ...stats });
    }).catch(e => onStatsUpdate({ error: (e as Error).message }));

    return () => { mounted = false; };
  }, [url, onStatsUpdate]);

  useEffect(() => {
    if (meshRef.current) {
      meshRef.current.material = createTriangleMaterial(settings.exposure);
      (meshRef.current.material as THREE.ShaderMaterial).wireframe = settings.wireframe;
    }
  }, [settings.exposure, settings.wireframe]);

  return <mesh ref={meshRef} />;
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
  const [measurementMode, setMeasurementMode] = useState(false);
  const [measurementPoints] = useState<THREE.Vector3[]>([]);
  const [cameraPath] = useState<THREE.Vector3[]>([]);
  const [isPlayingPath, setIsPlayingPath] = useState(false);
  
  const handleAddAnnotation = (position: [number, number, number], text: string) => {
    const newAnnotation: Annotation = {
      id: Date.now().toString(),
      position,
      text,
      color: '#00d4ff'
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
  };
  
  if (!fileUrl || !fileType) return null;

  if (fileType === 'gaussian') {
    return (
      <>
        <GaussianSplatRenderer url={fileUrl} />
        <HolographicStats />
        {/* Annotation UI overlay */}
        <div className="absolute top-4 right-4 flex flex-col gap-2">
          <button
            onClick={() => {
              const text = prompt('Enter annotation text:');
              if (text) handleAddAnnotation([0, 0, 0], text);
            }}
            className="bg-blue-600/80 hover:bg-blue-500 px-3 py-2 rounded text-sm backdrop-blur"
          >
            Add Annotation
          </button>
          <button
            onClick={() => setMeasurementMode(!measurementMode)}
            className={`px-3 py-2 rounded text-sm backdrop-blur ${
              measurementMode ? 'bg-green-600/80' : 'bg-gray-600/80'
            }`}
          >
            {measurementMode ? 'Exit Measure' : 'Measure'}
          </button>
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
        gl={{ preserveDrawingBuffer: true, antialias: settings.quality !== 'Low' }}
        dpr={qualityToDPR(settings.quality)}
      >
        <Suspense fallback={<Loader />}>
          {fileType === 'triangle' && <TriangleSplatRenderer url={fileUrl} onStatsUpdate={onStatsUpdate} />}
          {fileType === 'mesh' && <MeshRenderer url={fileUrl} />}
          
          {/* Annotations */}
          {annotations.map(annotation => (
            <AnnotationMarker
              key={annotation.id}
              annotation={annotation}
              onUpdate={handleUpdateAnnotation}
              onDelete={handleDeleteAnnotation}
            />
          ))}
          
          {/* Measurement Tool */}
          {measurementMode && (
            <MeasurementTool
              points={measurementPoints}
            />
          )}
          
          {/* Camera Path */}
          <CameraPathAnimation isPlaying={isPlayingPath} path={cameraPath} />
        </Suspense>
        <ambientLight intensity={0.8} />
        <directionalLight position={[5, 10, 7.5]} intensity={1.5} castShadow={settings.quality !== 'Low'} />
        <OrbitControls makeDefault />
        <Environment preset="city" />
      </Canvas>
      <HolographicStats />
      
      {/* Enhanced UI Controls */}
      <div className="absolute top-4 right-4 flex flex-col gap-2">
        <button
          onClick={() => {
            const text = prompt('Enter annotation text:');
            if (text) handleAddAnnotation([0, 0, 0], text);
          }}
          className="bg-blue-600/80 hover:bg-blue-500 px-3 py-2 rounded text-sm backdrop-blur flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-base">add_location</span>
          Add Note
        </button>
        <button
          onClick={() => setMeasurementMode(!measurementMode)}
          className={`px-3 py-2 rounded text-sm backdrop-blur flex items-center gap-2 ${
            measurementMode ? 'bg-green-600/80' : 'bg-gray-600/80 hover:bg-gray-500/80'
          }`}
        >
          <span className="material-symbols-outlined text-base">straighten</span>
          {measurementMode ? 'Exit Measure' : 'Measure'}
        </button>
        <button
          onClick={() => {
            if (cameraPath.length < 10) {
              // Camera path functionality temporarily disabled
              alert('Camera path recording coming soon!');
            }
          }}
          className="bg-purple-600/80 hover:bg-purple-500 px-3 py-2 rounded text-sm backdrop-blur flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-base">add_a_photo</span>
          Add Keyframe
        </button>
        {cameraPath.length > 1 && (
          <button
            onClick={() => setIsPlayingPath(!isPlayingPath)}
            className="bg-pink-600/80 hover:bg-pink-500 px-3 py-2 rounded text-sm backdrop-blur flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-base">
              {isPlayingPath ? 'pause' : 'play_arrow'}
            </span>
            {isPlayingPath ? 'Pause' : 'Play'} Path
          </button>
        )}
      </div>
    </>
  );
};


// --- Main Page Component ---

const SplatViewerPage = () => {
  const [file, setFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [fileType, setFileType] = useState<'gaussian' | 'triangle' | 'mesh' | null>(null);
  const [stats, setStats] = useState<any>({});
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [lumaUrl, setLumaUrl] = useState('');
  const [showLumaInput, setShowLumaInput] = useState(false);

  // Unified file handler
  const handleFiles = useCallback(async (files: FileList | File[]) => {
    if (files.length === 0) return;
    const fileToProcess = files[0];

    if (fileUrl) URL.revokeObjectURL(fileUrl);
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
    } else {
      setError('Unsupported file type. Please upload a .ply or .tsf file.');
      return;
    }
    
    setFileType(determinedType);
    setFile(fileToProcess);
    setFileUrl(URL.createObjectURL(fileToProcess));
  }, [fileUrl]);

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
          {!fileUrl ? (
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
                        accept=".ply,.tsf"
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