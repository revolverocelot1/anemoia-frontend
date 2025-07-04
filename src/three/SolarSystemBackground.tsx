import { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Trail, Float, Text } from '@react-three/drei';

interface Planet {
  name: string;
  size: number;
  distance: number;
  speed: number;
  color: string;
  emissive: string;
  trail: boolean;
}

const planets: Planet[] = [
  { name: 'Coruscant', size: 0.4, distance: 3, speed: 1.5, color: '#4a90e2', emissive: '#1e5ba8', trail: true },
  { name: 'Tatooine', size: 0.3, distance: 5, speed: 1.2, color: '#f4a460', emissive: '#d2691e', trail: true },
  { name: 'Hoth', size: 0.35, distance: 7, speed: 1, color: '#e0f7fa', emissive: '#4fc3f7', trail: true },
  { name: 'Endor', size: 0.25, distance: 9, speed: 0.8, color: '#4caf50', emissive: '#2e7d32', trail: true },
  { name: 'Mustafar', size: 0.3, distance: 11, speed: 0.6, color: '#ff5722', emissive: '#d84315', trail: true },
];

const PlanetObject = ({ planet }: { planet: Planet }) => {
  const meshRef = useRef<THREE.Mesh>(null!);
  const groupRef = useRef<THREE.Group>(null!);
  const { mouse } = useThree();
  const [hovered, setHovered] = useState(false);
  
  useFrame((state) => {
    const time = state.clock.elapsedTime;
    
    // Orbital motion
    groupRef.current.rotation.y = time * planet.speed * 0.1;
    
    // Planet rotation
    if (meshRef.current) {
      meshRef.current.rotation.y = time * 0.5;
      
      // Mouse interaction - planets react to cursor
      const mouseInfluence = 1 - Math.abs(mouse.x * mouse.y);
      meshRef.current.scale.setScalar(planet.size * (1 + mouseInfluence * 0.1));
    }
  });
  
  return (
    <group ref={groupRef}>
      <Trail
        width={planet.trail ? 2 : 0}
        length={20}
        color={new THREE.Color(planet.emissive)}
        attenuation={(t) => t * t}
      >
        <Float
          speed={2}
          rotationIntensity={0.5}
          floatIntensity={0.5}
        >
          <mesh
            ref={meshRef}
            position={[planet.distance, 0, 0]}
            onPointerOver={() => setHovered(true)}
            onPointerOut={() => setHovered(false)}
          >
            <sphereGeometry args={[planet.size, 32, 32]} />
            <meshStandardMaterial
              color={planet.color}
              emissive={planet.emissive}
              emissiveIntensity={hovered ? 0.8 : 0.4}
              roughness={0.3}
              metalness={0.6}
            />
          </mesh>
        </Float>
      </Trail>
      
      {/* Planet name on hover */}
      {hovered && (
        <Text
          position={[planet.distance, planet.size + 0.5, 0]}
          fontSize={0.3}
          color="#00d4ff"
          anchorX="center"
          anchorY="middle"
        >
          {planet.name}
        </Text>
      )}
      
      {/* Orbital ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[planet.distance - 0.02, planet.distance + 0.02, 64]} />
        <meshBasicMaterial
          color={planet.emissive}
          opacity={0.2}
          transparent
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
};

const Sun = () => {
  const sunRef = useRef<THREE.Mesh>(null!);
  const lightRef = useRef<THREE.PointLight>(null!);
  
  useFrame((state) => {
    const time = state.clock.elapsedTime;
    
    if (sunRef.current) {
      sunRef.current.rotation.y = time * 0.1;
      
      // Pulsing effect
      const pulse = Math.sin(time * 2) * 0.1 + 1;
      sunRef.current.scale.setScalar(pulse);
    }
    
    if (lightRef.current) {
      lightRef.current.intensity = 2 + Math.sin(time * 3) * 0.5;
    }
  });
  
  return (
    <>
      <mesh ref={sunRef}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial color="#ffd700" />
      </mesh>
      
      {/* Sun glow */}
      <mesh scale={1.5}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial
          color="#ffeb3b"
          transparent
          opacity={0.3}
          side={THREE.BackSide}
        />
      </mesh>
      
      {/* Dynamic point light */}
      <pointLight
        ref={lightRef}
        color="#ffd700"
        intensity={2}
        distance={50}
        decay={2}
      />
    </>
  );
};

const StarField = ({ count = 3000 }: { count?: number }) => {
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count * 3; i += 3) {
      const r = 50 + Math.random() * 50;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      
      pos[i] = r * Math.sin(phi) * Math.cos(theta);
      pos[i + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i + 2] = r * Math.cos(phi);
    }
    return pos;
  }, [count]);
  
  const starsRef = useRef<THREE.Points>(null!);
  
  useFrame((state) => {
    if (starsRef.current) {
      starsRef.current.rotation.y = state.clock.elapsedTime * 0.01;
      starsRef.current.rotation.x = state.clock.elapsedTime * 0.005;
    }
  });
  
  return (
    <points ref={starsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.1}
        color="#ffffff"
        transparent
        opacity={0.8}
        sizeAttenuation
      />
    </points>
  );
};

const HolographicGrid = () => {
  const gridRef = useRef<THREE.Mesh>(null!);
  const { mouse } = useThree();
  
  useFrame((state) => {
    if (gridRef.current) {
      const time = state.clock.elapsedTime;
      
      // Wave effect based on mouse position
      gridRef.current.rotation.x = -Math.PI / 2 + mouse.y * 0.1;
      gridRef.current.position.y = -5 + Math.sin(time * 0.5) * 0.2;
    }
  });
  
  return (
    <mesh ref={gridRef} position={[0, -5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[50, 50, 50, 50]} />
      <meshBasicMaterial
        color="#00d4ff"
        wireframe
        transparent
        opacity={0.2}
      />
    </mesh>
  );
};

// Import useState
import { useState } from 'react';

const SolarSystemBackground = () => {
  const groupRef = useRef<THREE.Group>(null!);
  const { mouse } = useThree();
  
  useFrame(() => {
    if (groupRef.current) {
      // Smooth camera follow mouse
      groupRef.current.rotation.x = THREE.MathUtils.lerp(
        groupRef.current.rotation.x,
        mouse.y * 0.1,
        0.05
      );
      groupRef.current.rotation.y = THREE.MathUtils.lerp(
        groupRef.current.rotation.y,
        mouse.x * 0.1,
        0.05
      );
    }
  });
  
  return (
    <>
      {/* Ambient lighting */}
      <ambientLight intensity={0.1} />
      
      {/* Star field background */}
      <StarField />
      
      {/* Main solar system group */}
      <group ref={groupRef}>
        {/* Sun at center */}
        <Sun />
        
        {/* Planets */}
        {planets.map((planet) => (
          <PlanetObject key={planet.name} planet={planet} />
        ))}
      </group>
      
      {/* Holographic grid */}
      <HolographicGrid />
      
      {/* Fog for depth */}
      <fog attach="fog" args={['#000511', 20, 100]} />
    </>
  );
};

export default SolarSystemBackground; 