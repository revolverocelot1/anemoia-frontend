import { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Trail, Float, Text, OrbitControls, Stars } from '@react-three/drei';

// Import useState
import { useState, useEffect } from 'react';

interface Planet {
  name: string;
  size: number;
  distance: number;
  speed: number;
  color: string;
  emissive: string;
  trail: boolean;
  rings?: boolean;
  moons?: number;
}

// All planets in our solar system with Star Wars-inspired names and styling
const planets: Planet[] = [
  { name: 'Mercuria', size: 0.2, distance: 4, speed: 2.0, color: '#8B7D7B', emissive: '#CD853F', trail: true },
  { name: 'Venusia', size: 0.4, distance: 6, speed: 1.8, color: '#FFA500', emissive: '#FF8C00', trail: true },
  { name: 'Terra Prime', size: 0.45, distance: 8, speed: 1.5, color: '#4169E1', emissive: '#1E90FF', trail: true, moons: 1 },
  { name: 'Marsis', size: 0.3, distance: 10, speed: 1.2, color: '#CD5C5C', emissive: '#B22222', trail: true, moons: 2 },
  { name: 'Jupitron', size: 1.2, distance: 15, speed: 0.8, color: '#DAA520', emissive: '#B8860B', trail: true, rings: true, moons: 4 },
  { name: 'Saturnia', size: 1.0, distance: 20, speed: 0.6, color: '#F0E68C', emissive: '#BDB76B', trail: true, rings: true, moons: 3 },
  { name: 'Uranova', size: 0.6, distance: 25, speed: 0.4, color: '#40E0D0', emissive: '#00CED1', trail: true, rings: true },
  { name: 'Neptus', size: 0.6, distance: 30, speed: 0.3, color: '#4682B4', emissive: '#0000CD', trail: true },
  { name: 'Plutonia', size: 0.15, distance: 35, speed: 0.2, color: '#DDA0DD', emissive: '#9370DB', trail: true }
];

const PlanetObject = ({ planet }: { planet: Planet }) => {
  const meshRef = useRef<THREE.Mesh>(null!);
  const groupRef = useRef<THREE.Group>(null!);
  const ringsRef = useRef<THREE.Mesh>(null!);
  const [hovered, setHovered] = useState(false);
  
  useEffect(() => {
    console.log(`Planet ${planet.name} mounted`);
    return () => console.log(`Planet ${planet.name} unmounted`);
  }, [planet.name]);
  
  useFrame((state) => {
    const time = state.clock.elapsedTime;
    
    // Orbital motion
    if (groupRef.current) {
      groupRef.current.rotation.y = time * planet.speed * 0.1;
    }
    
    // Planet rotation
    if (meshRef.current) {
      meshRef.current.rotation.y = time * 0.5;
      
      // Pulsing effect when hovered
      if (hovered) {
        const pulse = 1 + Math.sin(time * 3) * 0.1;
        meshRef.current.scale.setScalar(planet.size * pulse);
      } else {
        meshRef.current.scale.setScalar(planet.size);
      }
    }
    
    // Ring rotation
    if (ringsRef.current) {
      ringsRef.current.rotation.z = time * 0.2;
    }
  });
  
  // Generate moons
  const moons = useMemo(() => {
    if (!planet.moons) return [];
    return Array.from({ length: planet.moons }, (_, i) => ({
      id: i,
      distance: planet.size + 0.5 + i * 0.3,
      speed: 2 + i * 0.5,
      size: 0.05 + Math.random() * 0.05
    }));
  }, [planet.moons, planet.size]);
  
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
          
          {/* Rings */}
          {planet.rings && (
            <mesh ref={ringsRef} position={[planet.distance, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <ringGeometry args={[planet.size * 1.2, planet.size * 2, 64]} />
              <meshStandardMaterial
                color={planet.emissive}
                opacity={0.6}
                transparent
                side={THREE.DoubleSide}
                emissive={planet.emissive}
                emissiveIntensity={0.2}
              />
            </mesh>
          )}
          
          {/* Moons */}
          {moons.map((moon) => (
            <mesh key={moon.id} position={[planet.distance + moon.distance, 0, 0]}>
              <sphereGeometry args={[moon.size, 16, 16]} />
              <meshStandardMaterial
                color="#e0e0e0"
                emissive="#808080"
                emissiveIntensity={0.3}
              />
            </mesh>
          ))}
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
  const coronaRef = useRef<THREE.Mesh>(null!);
  
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
    
    if (coronaRef.current) {
      coronaRef.current.rotation.z = -time * 0.05;
      coronaRef.current.scale.setScalar(1.8 + Math.sin(time * 1.5) * 0.2);
    }
  });
  
  return (
    <>
      <mesh ref={sunRef}>
        <sphereGeometry args={[1.5, 32, 32]} />
        <meshBasicMaterial color="#ffd700" />
      </mesh>
      
      {/* Sun glow */}
      <mesh scale={2}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial
          color="#ffeb3b"
          transparent
          opacity={0.3}
          side={THREE.BackSide}
        />
      </mesh>
      
      {/* Corona effect */}
      <mesh ref={coronaRef} scale={1.8}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial
          color="#ff6347"
          transparent
          opacity={0.2}
          side={THREE.BackSide}
        />
      </mesh>
      
      {/* Dynamic point light */}
      <pointLight
        ref={lightRef}
        color="#ffd700"
        intensity={2}
        distance={100}
        decay={2}
      />
      
      {/* Additional rim light */}
      <pointLight
        color="#ff6347"
        intensity={1}
        distance={50}
        position={[0, 0, 0]}
      />
    </>
  );
};

const HolographicGrid = () => {
  const gridRef = useRef<THREE.Mesh>(null!);
  
  useFrame((state) => {
    if (gridRef.current) {
      const time = state.clock.elapsedTime;
      
      // Wave effect
      gridRef.current.position.y = -10 + Math.sin(time * 0.5) * 0.5;
      const material = gridRef.current.material as THREE.MeshBasicMaterial;
      material.opacity = 0.1 + Math.sin(time) * 0.05;
    }
  });
  
  return (
    <mesh ref={gridRef} position={[0, -10, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[100, 100, 50, 50]} />
      <meshBasicMaterial
        color="#00d4ff"
        wireframe
        transparent
        opacity={0.15}
      />
    </mesh>
  );
};

const SolarSystemBackground = () => {
  const groupRef = useRef<THREE.Group>(null!);
  const { gl, viewport } = useThree();
  const [performanceMode, setPerformanceMode] = useState<'high' | 'low'>(() => {
    // Initial performance mode based on environment
    const isDeployment = window.location.hostname !== 'localhost' && !window.location.hostname.includes('127.0.0.1');
    const isMobile = window.innerWidth < 768;
    return (isDeployment || isMobile) ? 'low' : 'high';
  });
  
  useEffect(() => {
    // Update performance mode based on viewport changes
    const isDeployment = window.location.hostname !== 'localhost' && !window.location.hostname.includes('127.0.0.1');
    const isMobile = viewport.width < 768;
    
    const newMode = (isDeployment || isMobile) ? 'low' : 'high';
    setPerformanceMode(newMode);
    console.log(`Solar System: Using ${newMode} performance mode`);
    
    console.log('SolarSystemBackground mounted', {
      renderer: gl,
      capabilities: gl.capabilities,
      maxTextureSize: gl.capabilities.maxTextureSize,
      precision: gl.capabilities.precision,
      webGLVersion: gl.capabilities.isWebGL2 ? 2 : 1,
      performanceMode: newMode,
      viewport: { width: viewport.width, height: viewport.height }
    });
    
    // Log render info
    const info = gl.info;
    console.log('WebGL render info:', {
      memory: info.memory,
      render: info.render,
      programs: info.programs?.length || 0,
    });
    
    return () => {
      console.log('SolarSystemBackground unmounted');
    };
  }, [gl, viewport]);
  
  // Slow rotation of the entire system
  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.0005;
    }
  });
  
  return (
    <>
      {/* Camera Controls */}
      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={10}
        maxDistance={100}
        autoRotate={true}
        autoRotateSpeed={0.5}
        zoomSpeed={0.8}
        panSpeed={0.5}
        rotateSpeed={0.5}
      />
      
      {/* Ambient lighting */}
      <ambientLight intensity={0.1} />
      
      {/* Star field background */}
      <Stars
        radius={100}
        depth={50}
        count={performanceMode === 'high' ? 5000 : 2000}
        factor={4}
        saturation={0}
        fade
        speed={1}
      />
      
      {/* Main solar system group */}
      <group ref={groupRef}>
        {/* Sun at center */}
        <Sun />
        
        {/* Planets */}
        {planets.map((planet) => (
          <PlanetObject 
            key={planet.name} 
            planet={{
              ...planet,
              trail: performanceMode === 'high' ? planet.trail : false
            }} 
          />
        ))}
      </group>
      
      {/* Holographic grid - only in high performance mode */}
      {performanceMode === 'high' && <HolographicGrid />}
      
      {/* Fog for depth */}
      <fog attach="fog" args={['#000511', 20, 100]} />
    </>
  );
};

export default SolarSystemBackground; 