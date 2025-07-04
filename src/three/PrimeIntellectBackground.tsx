import { useRef, useMemo, useState, useEffect } from 'react';
import { useFrame, useThree, extend } from '@react-three/fiber';
import * as THREE from 'three';
import { shaderMaterial } from '@react-three/drei';

// Custom shader for wireframe planets with data points
const WireframePlanetMaterial = shaderMaterial(
  {
    time: 0,
    color: new THREE.Color(0x00d4ff),
    emissive: new THREE.Color(0x0066ff),
    dataIntensity: 1.0,
  },
  // Vertex shader
  `
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec2 vUv;
    
    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      vPosition = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  // Fragment shader
  `
    uniform float time;
    uniform vec3 color;
    uniform vec3 emissive;
    uniform float dataIntensity;
    
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec2 vUv;
    
    void main() {
      // Create grid pattern
      float grid = 0.0;
      float gridSize = 10.0;
      grid += step(0.95, fract(vUv.x * gridSize));
      grid += step(0.95, fract(vUv.y * gridSize));
      
      // Data points animation
      float dataPoints = 0.0;
      for(float i = 0.0; i < 5.0; i++) {
        vec2 center = vec2(
          sin(time * 0.3 + i * 1.234) * 0.5 + 0.5,
          cos(time * 0.2 + i * 2.345) * 0.5 + 0.5
        );
        float dist = distance(vUv, center);
        dataPoints += smoothstep(0.1, 0.0, dist) * dataIntensity;
      }
      
      vec3 finalColor = mix(color, emissive, grid + dataPoints);
      finalColor += emissive * dataPoints * 0.5;
      
      gl_FragColor = vec4(finalColor, grid + dataPoints * 0.5 + 0.3);
    }
  `
);

extend({ WireframePlanetMaterial });

// Real solar system data
interface SolarBody {
  id: string;
  name: string;
  type: 'star' | 'planet' | 'dwarf';
  size: number; // Relative size for visual appeal
  distance: number; // AU scaled for scene
  speed: number; // Orbital period factor
  color: THREE.Color;
  emissive: THREE.Color;
  actualSize: number; // Real diameter in km
  orbitalPeriod: number; // Days
  dataPoints?: number;
}

const solarBodies: SolarBody[] = [
  {
    id: 'sun',
    name: 'Sun',
    type: 'star',
    size: 3,
    distance: 0,
    speed: 0.05,
    color: new THREE.Color(0xffd700),
    emissive: new THREE.Color(0xffaa00),
    actualSize: 1391000,
    orbitalPeriod: 0,
    dataPoints: 50,
  },
  {
    id: 'mercury',
    name: 'Mercury',
    type: 'planet',
    size: 0.4,
    distance: 4,
    speed: 4.15,
    color: new THREE.Color(0x8c7853),
    emissive: new THREE.Color(0xd2691e),
    actualSize: 4879,
    orbitalPeriod: 88,
  },
  {
    id: 'venus',
    name: 'Venus',
    type: 'planet',
    size: 0.7,
    distance: 6,
    speed: 1.62,
    color: new THREE.Color(0xffc649),
    emissive: new THREE.Color(0xff8c00),
    actualSize: 12104,
    orbitalPeriod: 225,
  },
  {
    id: 'earth',
    name: 'Earth',
    type: 'planet',
    size: 0.7,
    distance: 8,
    speed: 1,
    color: new THREE.Color(0x4169e1),
    emissive: new THREE.Color(0x00bfff),
    actualSize: 12742,
    orbitalPeriod: 365,
    dataPoints: 30,
  },
  {
    id: 'mars',
    name: 'Mars',
    type: 'planet',
    size: 0.5,
    distance: 10,
    speed: 0.53,
    color: new THREE.Color(0xcd5c5c),
    emissive: new THREE.Color(0xff4500),
    actualSize: 6779,
    orbitalPeriod: 687,
  },
  {
    id: 'jupiter',
    name: 'Jupiter',
    type: 'planet',
    size: 1.5,
    distance: 14,
    speed: 0.084,
    color: new THREE.Color(0xdaa520),
    emissive: new THREE.Color(0xffa500),
    actualSize: 139820,
    orbitalPeriod: 4333,
    dataPoints: 20,
  },
  {
    id: 'saturn',
    name: 'Saturn',
    type: 'planet',
    size: 1.3,
    distance: 18,
    speed: 0.034,
    color: new THREE.Color(0xf4a460),
    emissive: new THREE.Color(0xffd700),
    actualSize: 116460,
    orbitalPeriod: 10759,
  },
  {
    id: 'uranus',
    name: 'Uranus',
    type: 'planet',
    size: 0.9,
    distance: 22,
    speed: 0.012,
    color: new THREE.Color(0x4fd1c5),
    emissive: new THREE.Color(0x00ffff),
    actualSize: 50724,
    orbitalPeriod: 30687,
  },
  {
    id: 'neptune',
    name: 'Neptune',
    type: 'planet',
    size: 0.9,
    distance: 26,
    speed: 0.006,
    color: new THREE.Color(0x4169e1),
    emissive: new THREE.Color(0x0000ff),
    actualSize: 49244,
    orbitalPeriod: 60190,
  },
];

// Wireframe planet component
const WireframePlanet = ({ body, onHover, onSelect }: {
  body: SolarBody;
  onHover: (body: SolarBody | null) => void;
  onSelect: (body: SolarBody) => void;
}) => {
  const meshRef = useRef<THREE.Mesh>(null!);
  const groupRef = useRef<THREE.Group>(null!);
  const materialRef = useRef<any>(null!);
  const [hovered, setHovered] = useState(false);
  
  useFrame((state) => {
    const time = state.clock.elapsedTime;
    
    // Orbital motion
    if (body.distance > 0) {
      groupRef.current.rotation.y = time * body.speed * 0.1;
    }
    
    // Planet rotation
    if (meshRef.current) {
      meshRef.current.rotation.y = time * 0.2;
      
      // Update shader uniforms
      if (materialRef.current) {
        materialRef.current.time = time;
        materialRef.current.dataIntensity = hovered ? 2.0 : 1.0;
      }
    }
  });
  
  return (
    <group ref={groupRef}>
      <mesh
        ref={meshRef}
        position={[body.distance, 0, 0]}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          onHover(body);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          setHovered(false);
          onHover(null);
          document.body.style.cursor = 'default';
        }}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(body);
        }}
      >
        <sphereGeometry args={[body.size, 32, 16]} />
        <meshBasicMaterial
          color={body.emissive}
          wireframe
          transparent
          opacity={hovered ? 0.8 : 0.4}
        />
      </mesh>
      
      {/* Data visualization layer */}
      <mesh position={[body.distance, 0, 0]} scale={1.05}>
        <sphereGeometry args={[body.size, 16, 8]} />
        {/* @ts-ignore - custom shader material */}
        <wireframePlanetMaterial
          ref={materialRef}
          color={body.color}
          emissive={body.emissive}
          transparent
          side={THREE.DoubleSide}
        />
      </mesh>
      
      {/* Saturn's rings */}
      {body.id === 'saturn' && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[body.distance, 0, 0]}>
          <ringGeometry args={[body.size * 1.5, body.size * 2.5, 64]} />
          <meshBasicMaterial
            color={body.emissive}
            opacity={0.3}
            transparent
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
      
      {/* Orbital path */}
      {body.distance > 0 && (
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[body.distance - 0.05, body.distance + 0.05, 128]} />
          <meshBasicMaterial
            color={body.emissive}
            opacity={hovered ? 0.5 : 0.2}
            transparent
          />
        </mesh>
      )}
    </group>
  );
};

// Data stream visualization
const DataStreams = ({ bodies }: { bodies: SolarBody[] }) => {
  const linesRef = useRef<THREE.Group>(null!);
  
  useFrame((state) => {
    if (linesRef.current) {
      linesRef.current.rotation.y = state.clock.elapsedTime * 0.01;
    }
  });
  
  return (
    <group ref={linesRef}>
      {bodies.map((body, i) => {
        if (!body.dataPoints || i >= bodies.length - 1) return null;
        
        return Array.from({ length: body.dataPoints }).map((_, j) => {
          const angle = (j / (body.dataPoints || 1)) * Math.PI * 2;
          const nextBody = bodies[i + 1];
          
          return (
            <line key={`${body.id}-stream-${j}`}>
              <bufferGeometry>
                <bufferAttribute
                  attach="attributes-position"
                  args={[new Float32Array([
                    body.distance + Math.cos(angle) * body.size,
                    Math.sin(angle) * body.size,
                    0,
                    nextBody.distance,
                    0,
                    0
                  ]), 3]}
                  count={2}
                />
              </bufferGeometry>
              <lineBasicMaterial
                color={body.emissive}
                opacity={0.1}
                transparent
              />
            </line>
          );
        });
      }).flat().filter(Boolean)}
    </group>
  );
};

// Enhanced particle field
const DataParticleField = ({ count = 10000 }: { count?: number }) => {
  const particlesRef = useRef<THREE.Points>(null!);
  
  const [positions, colors, sizes] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const siz = new Float32Array(count);
    
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const r = 5 + Math.random() * 100;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      
      pos[i3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i3 + 2] = r * Math.cos(phi);
      
      // Color based on distance
      const intensity = 1 - (r - 5) / 95;
      col[i3] = 0;
      col[i3 + 1] = intensity * 0.8;
      col[i3 + 2] = intensity;
      
      siz[i] = Math.random() * 0.5 + 0.1;
    }
    
    return [pos, col, siz];
  }, [count]);
  
  useFrame((state) => {
    if (particlesRef.current) {
      particlesRef.current.rotation.y = state.clock.elapsedTime * 0.002;
      
      // Pulsing effect
      const scale = 1 + Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
      particlesRef.current.scale.setScalar(scale);
    }
  });
  
  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
        <bufferAttribute attach="attributes-size" args={[sizes, 1]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.2}
        vertexColors
        transparent
        opacity={0.4}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};

// Main component
const PrimeIntellectBackground = () => {
  const groupRef = useRef<THREE.Group>(null!);
  const { camera, mouse } = useThree();
  const [hoveredBody, setHoveredBody] = useState<SolarBody | null>(null);
  const [selectedBody, setSelectedBody] = useState<SolarBody | null>(null);
  const [zoom, setZoom] = useState(1);
  
  // Enhanced mouse interaction
  useFrame(() => {
    if (groupRef.current) {
      // Full rotation based on mouse position
      const targetRotationX = mouse.y * Math.PI * 0.5;
      const targetRotationY = mouse.x * Math.PI;
      
      groupRef.current.rotation.x = THREE.MathUtils.lerp(
        groupRef.current.rotation.x,
        targetRotationX,
        0.05
      );
      groupRef.current.rotation.y = THREE.MathUtils.lerp(
        groupRef.current.rotation.y,
        targetRotationY,
        0.05
      );
    }
    
    // Camera zoom
    const targetZoom = selectedBody ? 0.3 : zoom;
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, 40 / targetZoom, 0.05);
  });
  
  // Mouse wheel zoom
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      setZoom((prev) => Math.max(0.1, Math.min(3, prev + e.deltaY * -0.001)));
    };
    
    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => window.removeEventListener('wheel', handleWheel);
  }, []);
  
  return (
    <>
      {/* Ambient lighting */}
      <ambientLight intensity={0.1} />
      
      {/* Sun lighting */}
      <pointLight position={[0, 0, 0]} intensity={3} color={0xffd700} />
      
      {/* Background particles */}
      <DataParticleField />
      
      {/* Solar system group */}
      <group ref={groupRef}>
        {/* Data streams between planets */}
        <DataStreams bodies={solarBodies} />
        
        {/* Solar bodies */}
        {solarBodies.map((body) => (
          <WireframePlanet
            key={body.id}
            body={body}
            onHover={setHoveredBody}
            onSelect={setSelectedBody}
          />
        ))}
      </group>
      
      {/* Info overlay */}
      {hoveredBody && (
        <div
          style={{
            position: 'fixed',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(0, 0, 0, 0.9)',
            border: '1px solid #00d4ff',
            borderRadius: '8px',
            padding: '16px 24px',
            color: '#00d4ff',
            fontFamily: 'monospace',
            fontSize: '14px',
            pointerEvents: 'none',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 0 20px rgba(0, 212, 255, 0.5)',
          }}
        >
          <div style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '16px' }}>
            {hoveredBody.name}
          </div>
          <div style={{ opacity: 0.8, fontSize: '12px' }}>
            <div>Diameter: {hoveredBody.actualSize.toLocaleString()} km</div>
            <div>Orbital Period: {hoveredBody.orbitalPeriod} days</div>
            <div>Distance from Sun: {hoveredBody.distance} AU</div>
          </div>
        </div>
      )}
      
      {/* Fog for depth */}
      <fog attach="fog" args={['#000511', 50, 200]} />
    </>
  );
};

export default PrimeIntellectBackground; 