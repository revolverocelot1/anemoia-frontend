import { useRef, useMemo, useState, useEffect } from 'react';
import { useFrame, useThree, extend } from '@react-three/fiber';
import * as THREE from 'three';
import { shaderMaterial } from '@react-three/drei';

// Custom shader for planets with atmospheric glow
const PlanetMaterial = shaderMaterial(
  {
    time: 0,
    color: new THREE.Color(0x00d4ff),
    emissive: new THREE.Color(0x0066ff),
    atmosphereColor: new THREE.Color(0x00ffff),
    fresnelBias: 0.1,
    fresnelScale: 1.0,
    fresnelPower: 4.0,
  },
  // Vertex shader
  `
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec2 vUv;
    varying vec3 vViewPosition;
    
    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      vViewPosition = -mvPosition.xyz;
      vPosition = position;
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  // Fragment shader
  `
    uniform float time;
    uniform vec3 color;
    uniform vec3 emissive;
    uniform vec3 atmosphereColor;
    uniform float fresnelBias;
    uniform float fresnelScale;
    uniform float fresnelPower;
    
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec2 vUv;
    varying vec3 vViewPosition;
    
    // Noise function for surface details
    float noise(vec3 p) {
      vec3 i = floor(p);
      vec3 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      
      float n = dot(i, vec3(1.0, 57.0, 113.0));
      return mix(
        mix(
          mix(sin(n), sin(n + 1.0), f.x),
          mix(sin(n + 57.0), sin(n + 58.0), f.x),
          f.y
        ),
        mix(
          mix(sin(n + 113.0), sin(n + 114.0), f.x),
          mix(sin(n + 170.0), sin(n + 171.0), f.x),
          f.y
        ),
        f.z
      );
    }
    
    void main() {
      vec3 viewDirection = normalize(vViewPosition);
      vec3 normal = normalize(vNormal);
      
      // Fresnel effect for atmosphere
      float fresnel = fresnelBias + fresnelScale * pow(1.0 + dot(viewDirection, normal), fresnelPower);
      
      // Animated surface pattern
      float pattern = noise(vPosition * 5.0 + time * 0.1);
      pattern = smoothstep(0.0, 1.0, pattern);
      
      // Base color with pattern
      vec3 finalColor = mix(color, emissive, pattern * 0.5);
      
      // Add atmospheric glow
      finalColor += atmosphereColor * fresnel * 0.8;
      
      // Rim lighting
      float rim = 1.0 - max(0.0, dot(viewDirection, normal));
      finalColor += atmosphereColor * pow(rim, 2.0) * 0.5;
      
      gl_FragColor = vec4(finalColor, 1.0);
    }
  `
);

extend({ PlanetMaterial });

// Planet data with Prime Intellect aesthetic
interface CelestialBody {
  id: string;
  name: string;
  type: 'planet' | 'star' | 'station';
  size: number;
  distance: number;
  speed: number;
  color: THREE.Color;
  emissive: THREE.Color;
  atmosphereColor: THREE.Color;
  detail: number;
  rings?: boolean;
  moons?: number;
}

const celestialBodies: CelestialBody[] = [
  {
    id: 'prime-core',
    name: 'Prime Core',
    type: 'star',
    size: 2.5,
    distance: 0,
    speed: 0.1,
    color: new THREE.Color(0xffffff),
    emissive: new THREE.Color(0x00d4ff),
    atmosphereColor: new THREE.Color(0x00ffff),
    detail: 64,
  },
  {
    id: 'compute-1',
    name: 'Compute Node Alpha',
    type: 'planet',
    size: 0.8,
    distance: 6,
    speed: 1.2,
    color: new THREE.Color(0x1a1a2e),
    emissive: new THREE.Color(0x16213e),
    atmosphereColor: new THREE.Color(0x0f3460),
    detail: 32,
    moons: 2,
  },
  {
    id: 'data-nexus',
    name: 'Data Nexus',
    type: 'planet',
    size: 1.2,
    distance: 10,
    speed: 0.8,
    color: new THREE.Color(0x0f3460),
    emissive: new THREE.Color(0x533483),
    atmosphereColor: new THREE.Color(0xe94560),
    detail: 32,
    rings: true,
  },
  {
    id: 'neural-cluster',
    name: 'Neural Cluster',
    type: 'station',
    size: 0.6,
    distance: 14,
    speed: 0.6,
    color: new THREE.Color(0x533483),
    emissive: new THREE.Color(0xc06ff0),
    atmosphereColor: new THREE.Color(0xff00ff),
    detail: 32,
  },
  {
    id: 'quantum-relay',
    name: 'Quantum Relay',
    type: 'planet',
    size: 0.4,
    distance: 18,
    speed: 0.4,
    color: new THREE.Color(0x00d4ff),
    emissive: new THREE.Color(0x00ffff),
    atmosphereColor: new THREE.Color(0xffffff),
    detail: 24,
  },
];

// Interactive planet component
const InteractivePlanet = ({ body, onHover, onSelect }: {
  body: CelestialBody;
  onHover: (body: CelestialBody | null) => void;
  onSelect: (body: CelestialBody) => void;
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
      }
    }
    
    // Hover effect
    if (hovered && meshRef.current) {
      meshRef.current.scale.lerp(
        new THREE.Vector3(1.1, 1.1, 1.1).multiplyScalar(body.size),
        0.1
      );
    } else if (meshRef.current) {
      meshRef.current.scale.lerp(
        new THREE.Vector3(1, 1, 1).multiplyScalar(body.size),
        0.1
      );
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
        <icosahedronGeometry args={[1, body.detail]} />
        {/* @ts-ignore - custom shader material */}
        <planetMaterial
          ref={materialRef}
          color={body.color}
          emissive={body.emissive}
          atmosphereColor={body.atmosphereColor}
          fresnelBias={0.1}
          fresnelScale={1.0}
          fresnelPower={hovered ? 2.0 : 4.0}
        />
      </mesh>
      
      {/* Rings */}
      {body.rings && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[body.distance, 0, 0]}>
          <ringGeometry args={[body.size * 1.5, body.size * 2.5, 64]} />
          <meshBasicMaterial
            color={body.atmosphereColor}
            opacity={0.3}
            transparent
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
      
      {/* Moons */}
      {body.moons && Array.from({ length: body.moons }).map((_, i) => (
        <mesh
          key={i}
          position={[
            body.distance + Math.cos(i * Math.PI) * body.size * 2,
            0,
            Math.sin(i * Math.PI) * body.size * 2
          ]}
        >
          <icosahedronGeometry args={[body.size * 0.2, 8]} />
          <meshBasicMaterial color={body.atmosphereColor} />
        </mesh>
      ))}
      
      {/* Orbital path */}
      {body.distance > 0 && (
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[body.distance - 0.05, body.distance + 0.05, 128]} />
          <meshBasicMaterial
            color={body.atmosphereColor}
            opacity={hovered ? 0.3 : 0.1}
            transparent
          />
        </mesh>
      )}
    </group>
  );
};

// Connection lines between planets
const ConnectionNetwork = ({ bodies, activeBody }: {
  bodies: CelestialBody[];
  activeBody: CelestialBody | null;
}) => {
  const linesRef = useRef<THREE.Group>(null!);
  
  useFrame((state) => {
    if (linesRef.current) {
      linesRef.current.rotation.y = state.clock.elapsedTime * 0.01;
    }
  });
  
  const connections = useMemo(() => {
    const lines: JSX.Element[] = [];
    bodies.forEach((body1, i) => {
      bodies.slice(i + 1).forEach((body2) => {
        const opacity = activeBody && (activeBody.id === body1.id || activeBody.id === body2.id) ? 0.5 : 0.1;
        lines.push(
          <line key={`${body1.id}-${body2.id}`}>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                args={[new Float32Array([
                  body1.distance, 0, 0,
                  body2.distance, 0, 0
                ]), 3]}
                count={2}
              />
            </bufferGeometry>
            <lineBasicMaterial color={0x00d4ff} opacity={opacity} transparent />
          </line>
        );
      });
    });
    return lines;
  }, [bodies, activeBody]);
  
  return <group ref={linesRef}>{connections}</group>;
};

// Particle field for depth
const ParticleField = ({ count = 5000 }: { count?: number }) => {
  const particlesRef = useRef<THREE.Points>(null!);
  
  const [positions, colors] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    
    for (let i = 0; i < count * 3; i += 3) {
      const r = 30 + Math.random() * 70;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      
      pos[i] = r * Math.sin(phi) * Math.cos(theta);
      pos[i + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i + 2] = r * Math.cos(phi);
      
      // Color variation
      const intensity = Math.random() * 0.5 + 0.5;
      col[i] = 0;
      col[i + 1] = intensity * 0.8;
      col[i + 2] = intensity;
    }
    
    return [pos, col];
  }, [count]);
  
  useFrame((state) => {
    if (particlesRef.current) {
      particlesRef.current.rotation.y = state.clock.elapsedTime * 0.005;
      particlesRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.003) * 0.1;
    }
  });
  
  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.2}
        vertexColors
        transparent
        opacity={0.6}
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
  const [hoveredBody, setHoveredBody] = useState<CelestialBody | null>(null);
  const [selectedBody, setSelectedBody] = useState<CelestialBody | null>(null);
  const [zoom, setZoom] = useState(1);
  
  // Mouse-based camera movement
  useFrame(() => {
    if (groupRef.current) {
      // Smooth rotation based on mouse position
      const targetRotationX = mouse.y * 0.3;
      const targetRotationY = mouse.x * 0.3;
      
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
    
    // Camera zoom based on selection
    const targetZoom = selectedBody ? 0.5 : zoom;
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, 25 / targetZoom, 0.05);
  });
  
  // Mouse wheel zoom
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      setZoom((prev) => Math.max(0.5, Math.min(2, prev + e.deltaY * -0.001)));
    };
    
    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => window.removeEventListener('wheel', handleWheel);
  }, []);
  
  return (
    <>
      {/* Main lighting */}
      <ambientLight intensity={0.05} />
      <pointLight position={[0, 0, 0]} intensity={2} color={0x00d4ff} />
      
      {/* Background particles */}
      <ParticleField />
      
      {/* Solar system group */}
      <group ref={groupRef}>
        {/* Connection network */}
        <ConnectionNetwork bodies={celestialBodies} activeBody={hoveredBody} />
        
        {/* Celestial bodies */}
        {celestialBodies.map((body) => (
          <InteractivePlanet
            key={body.id}
            body={body}
            onHover={setHoveredBody}
            onSelect={setSelectedBody}
          />
        ))}
      </group>
      
      {/* UI overlay for hovered planet */}
      {hoveredBody && (
        <div
          style={{
            position: 'fixed',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(0, 0, 0, 0.8)',
            border: '1px solid #00d4ff',
            borderRadius: '8px',
            padding: '12px 24px',
            color: '#00d4ff',
            fontFamily: 'monospace',
            fontSize: '14px',
            pointerEvents: 'none',
            backdropFilter: 'blur(10px)',
          }}
        >
          <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{hoveredBody.name}</div>
          <div style={{ opacity: 0.7, fontSize: '12px' }}>Type: {hoveredBody.type}</div>
        </div>
      )}
      
      {/* Fog for depth */}
      <fog attach="fog" args={['#000511', 30, 100]} />
    </>
  );
};

export default PrimeIntellectBackground; 