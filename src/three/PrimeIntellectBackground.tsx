import { useRef, useMemo, useState, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { OrbitControls, Text, Ring, Float, Trail, MeshDistortMaterial } from '@react-three/drei';

// Planet data with enhanced properties
const solarSystemData = [
  { 
    name: 'Mercury', 
    radius: 1.2, 
    distance: 12, 
    color: '#FF6B6B', 
    speed: 4.15, 
    info: 'Smallest planet, extreme temperatures',
    type: 'rocky',
    particles: '#FFA500',
    glowColor: '#FF4500'
  },
  { 
    name: 'Venus', 
    radius: 1.8, 
    distance: 18, 
    color: '#FFE66D', 
    speed: 1.62, 
    info: 'Toxic atmosphere, surface pressure',
    type: 'rocky',
    particles: '#FFD700',
    glowColor: '#FFA500'
  },
  { 
    name: 'Earth', 
    radius: 2.0, 
    distance: 25, 
    color: '#4ECDC4', 
    speed: 1.0, 
    info: 'Our home, 71% water, perfect for life',
    type: 'habitable',
    particles: '#00CED1',
    glowColor: '#00FFFF'
  },
  { 
    name: 'Mars', 
    radius: 1.5, 
    distance: 32, 
    color: '#FF6B6B', 
    speed: 0.53, 
    info: 'The Red Planet, future colony',
    type: 'rocky',
    particles: '#CD5C5C',
    glowColor: '#DC143C'
  },
  { 
    name: 'Jupiter', 
    radius: 4.5, 
    distance: 45, 
    color: '#A8DADC', 
    speed: 0.084, 
    info: 'Gas giant with Great Red Spot',
    type: 'gas',
    particles: '#F0E68C',
    glowColor: '#FFD700'
  },
  { 
    name: 'Saturn', 
    radius: 4.0, 
    distance: 58, 
    color: '#F1FAEE', 
    speed: 0.034, 
    info: 'Beautiful rings, 82 moons',
    type: 'gas',
    particles: '#FAFAD2',
    glowColor: '#F0E68C'
  },
  { 
    name: 'Uranus', 
    radius: 2.5, 
    distance: 70, 
    color: '#457B9D', 
    speed: 0.012, 
    info: 'Tilted planet, ice giant',
    type: 'ice',
    particles: '#4FD1C5',
    glowColor: '#00CED1'
  },
  { 
    name: 'Neptune', 
    radius: 2.3, 
    distance: 80, 
    color: '#1D3557', 
    speed: 0.006, 
    info: 'Windiest planet, deep blue',
    type: 'ice',
    particles: '#1E90FF',
    glowColor: '#0000FF'
  }
];

// Particle system for planet atmosphere
const PlanetParticles = ({ planet, count = 1000 }: { planet: typeof solarSystemData[0]; count?: number }) => {
  const ref = useRef<THREE.Points>(null!);
  
  const particles = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    
    const color = new THREE.Color(planet.particles);
    
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const radius = planet.radius + Math.random() * 2;
      
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);
      
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
      
      sizes[i] = Math.random() * 0.5 + 0.5;
    }
    
    return { positions, colors, sizes };
  }, [planet, count]);
  
  useFrame(() => {
    if (ref.current) {
      ref.current.rotation.y += 0.001;
      ref.current.rotation.x += 0.0005;
    }
  });
  
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[particles.positions, 3]}
        />
        <bufferAttribute
          attach="attributes-color"
          args={[particles.colors, 3]}
        />
        <bufferAttribute
          attach="attributes-size"
          args={[particles.sizes, 1]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.1}
        vertexColors
        transparent
        opacity={0.6}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};

// Enhanced Earth with continents and cities
const EarthPlanet = ({ planet }: { planet: typeof solarSystemData[0] }) => {
  const groupRef = useRef<THREE.Group>(null!);
  const [hovered, setHovered] = useState(false);
  const [clicked, setClicked] = useState(false);
  const { camera } = useThree();
  
  useFrame((state) => {
    if (groupRef.current) {
      const time = state.clock.elapsedTime;
      const angle = time * planet.speed * 0.1;
      groupRef.current.position.x = Math.cos(angle) * planet.distance;
      groupRef.current.position.z = Math.sin(angle) * planet.distance;
    }
  });
  
  const handleClick = () => {
    setClicked(!clicked);
    // Zoom to planet on click
    if (!clicked) {
      camera.lookAt(groupRef.current.position);
    }
  };
  
  return (
    <Float speed={2} rotationIntensity={0.2} floatIntensity={0.3}>
      <group ref={groupRef}>
        <Trail
          width={5}
          length={20}
          color={new THREE.Color(planet.glowColor)}
          attenuation={(t) => t * t}
        >
          <mesh
            onClick={handleClick}
            onPointerOver={() => {
              setHovered(true);
              document.body.style.cursor = 'pointer';
            }}
            onPointerOut={() => {
              setHovered(false);
              document.body.style.cursor = 'auto';
            }}
          >
            <sphereGeometry args={[planet.radius, 64, 64]} />
            <MeshDistortMaterial
              color={planet.color}
              emissive={planet.glowColor}
              emissiveIntensity={hovered ? 0.5 : 0.2}
              roughness={0.3}
              metalness={0.8}
              distort={0.2}
              speed={2}
            />
          </mesh>
        </Trail>
        
        {/* Continents layer */}
        <mesh>
          <sphereGeometry args={[planet.radius * 1.01, 64, 64]} />
          <meshStandardMaterial
            color="#228B22"
            transparent
            opacity={0.4}
            roughness={0.8}
          />
        </mesh>
        
        {/* Atmosphere */}
        <mesh scale={1.15}>
          <sphereGeometry args={[planet.radius, 64, 64]} />
          <meshStandardMaterial
            color="#87CEEB"
            transparent
            opacity={0.2}
            side={THREE.BackSide}
          />
        </mesh>
        
        {/* City lights */}
        <PlanetParticles planet={planet} count={500} />
        
        {/* Info display */}
        {(hovered || clicked) && (
          <group position={[0, planet.radius + 3, 0]}>
            <Text
              color="white"
              fontSize={1}
              fontWeight="bold"
              anchorX="center"
              anchorY="bottom"
              outlineWidth={0.1}
              outlineColor="black"
            >
              {planet.name}
            </Text>
            <Text
              color="#88ccff"
              fontSize={0.6}
              anchorX="center"
              anchorY="top"
              position={[0, -0.5, 0]}
              maxWidth={15}
            >
              {planet.info}
            </Text>
            {clicked && (
              <Text
                color="#FFD700"
                fontSize={0.4}
                anchorX="center"
                anchorY="top"
                position={[0, -1.2, 0]}
              >
                Population: 8 Billion • Satellites: 1 • Space Stations: 2
              </Text>
            )}
          </group>
        )}
      </group>
    </Float>
  );
};

// Gas giant planets with swirling atmosphere
const GasGiantPlanet = ({ planet }: { planet: typeof solarSystemData[0] }) => {
  const groupRef = useRef<THREE.Group>(null!);
  const atmosphereRef = useRef<THREE.Mesh>(null!);
  const [hovered, setHovered] = useState(false);
  
  useFrame((state) => {
    if (groupRef.current) {
      const time = state.clock.elapsedTime;
      const angle = time * planet.speed * 0.1;
      groupRef.current.position.x = Math.cos(angle) * planet.distance;
      groupRef.current.position.z = Math.sin(angle) * planet.distance;
    }
    
    if (atmosphereRef.current) {
      atmosphereRef.current.rotation.y += 0.003;
    }
  });
  
  return (
    <Float speed={1} rotationIntensity={0.1} floatIntensity={0.2}>
      <group ref={groupRef}>
        <mesh
          onPointerOver={() => {
            setHovered(true);
            document.body.style.cursor = 'pointer';
          }}
          onPointerOut={() => {
            setHovered(false);
            document.body.style.cursor = 'auto';
          }}
        >
          <sphereGeometry args={[planet.radius, 64, 64]} />
          <MeshDistortMaterial
            color={planet.color}
            emissive={planet.glowColor}
            emissiveIntensity={hovered ? 0.4 : 0.1}
            roughness={0.5}
            metalness={0.3}
            distort={0.3}
            speed={1}
          />
        </mesh>
        
        {/* Swirling atmosphere */}
        <mesh ref={atmosphereRef} scale={1.05}>
          <sphereGeometry args={[planet.radius, 32, 32]} />
          <meshStandardMaterial
            color={planet.particles}
            transparent
            opacity={0.3}
            wireframe
          />
        </mesh>
        
        {/* Saturn's rings */}
        {planet.name === 'Saturn' && (
          <>
            <Ring args={[planet.radius * 1.5, planet.radius * 2.5, 64, 8]} rotation={[Math.PI / 2, 0, 0]}>
              <meshStandardMaterial 
                color="#F0E68C" 
                transparent 
                opacity={0.8}
                side={THREE.DoubleSide}
                emissive="#FFD700"
                emissiveIntensity={0.2}
              />
            </Ring>
            <Ring args={[planet.radius * 1.8, planet.radius * 2.2, 64, 8]} rotation={[Math.PI / 2, 0, 0.1]}>
              <meshStandardMaterial 
                color="#FFE4B5" 
                transparent 
                opacity={0.6}
                side={THREE.DoubleSide}
              />
            </Ring>
          </>
        )}
        
        {/* Particle system */}
        <PlanetParticles planet={planet} count={planet.name === 'Jupiter' ? 2000 : 1500} />
        
        {/* Info */}
        {hovered && (
          <Text
            color="white"
            fontSize={1.2}
            fontWeight="bold"
            anchorX="center"
            position={[0, planet.radius + 2, 0]}
            outlineWidth={0.1}
            outlineColor="black"
          >
            {planet.name}
          </Text>
        )}
      </group>
    </Float>
  );
};

// Generic planet component
const HolographicPlanet = ({ planet }: { planet: typeof solarSystemData[0] }) => {
  const groupRef = useRef<THREE.Group>(null!);
  const [hovered, setHovered] = useState(false);
  
  useFrame((state) => {
    if (groupRef.current) {
      const time = state.clock.elapsedTime;
      const angle = time * planet.speed * 0.1;
      groupRef.current.position.x = Math.cos(angle) * planet.distance;
      groupRef.current.position.z = Math.sin(angle) * planet.distance;
    }
  });
  
  return (
    <Float speed={3} rotationIntensity={0.3} floatIntensity={0.4}>
      <group ref={groupRef}>
        <mesh
          onPointerOver={() => {
            setHovered(true);
            document.body.style.cursor = 'pointer';
          }}
          onPointerOut={() => {
            setHovered(false);
            document.body.style.cursor = 'auto';
          }}
        >
          <icosahedronGeometry args={[planet.radius, 2]} />
          <meshStandardMaterial
            color={planet.color}
            emissive={planet.glowColor}
            emissiveIntensity={hovered ? 0.6 : 0.2}
            wireframe
            transparent
            opacity={0.8}
          />
        </mesh>
        
        {/* Holographic effect */}
        <mesh scale={1.1}>
          <icosahedronGeometry args={[planet.radius, 1]} />
          <meshStandardMaterial
            color={planet.glowColor}
            transparent
            opacity={0.2}
            wireframe
          />
        </mesh>
        
        <PlanetParticles planet={planet} count={300} />
        
        {hovered && (
          <Text
            color="white"
            fontSize={0.8}
            fontWeight="bold"
            anchorX="center"
            position={[0, planet.radius + 1.5, 0]}
          >
            {planet.name}
          </Text>
        )}
      </group>
    </Float>
  );
};

// Interactive Sun
const InteractiveSun = () => {
  const sunRef = useRef<THREE.Mesh>(null!);
  const [hovered, setHovered] = useState(false);
  const [pulseScale, setPulseScale] = useState(1);
  
  useFrame((state) => {
    if (sunRef.current) {
      sunRef.current.rotation.y += 0.002;
      const time = state.clock.elapsedTime;
      const pulse = Math.sin(time * 2) * 0.1 + 1;
      setPulseScale(pulse);
    }
  });
  
  return (
    <Float speed={0.5} rotationIntensity={0.1} floatIntensity={0.2}>
      <group scale={pulseScale}>
        <mesh
          ref={sunRef}
          onPointerOver={() => {
            setHovered(true);
            document.body.style.cursor = 'pointer';
          }}
          onPointerOut={() => {
            setHovered(false);
            document.body.style.cursor = 'auto';
          }}
        >
          <icosahedronGeometry args={[4, 4]} />
          <MeshDistortMaterial
            color="#FDB813"
            emissive="#FF8C00"
            emissiveIntensity={hovered ? 2 : 1}
            roughness={0}
            metalness={0.2}
            distort={0.4}
            speed={2}
          />
        </mesh>
        
        {/* Sun corona */}
        <mesh scale={1.3}>
          <icosahedronGeometry args={[4, 2]} />
          <meshStandardMaterial
            color="#FFD700"
            transparent
            opacity={0.3}
            wireframe
          />
        </mesh>
        
        {/* Solar flares */}
        <pointLight position={[0, 0, 0]} intensity={3} color="#FFA500" />
        <pointLight position={[2, 0, 0]} intensity={1} color="#FF6347" />
        <pointLight position={[-2, 0, 0]} intensity={1} color="#FF6347" />
        
        {hovered && (
          <Text
            color="white"
            fontSize={1.5}
            fontWeight="bold"
            anchorX="center"
            position={[0, 6, 0]}
            outlineWidth={0.15}
            outlineColor="black"
          >
            The Sun
          </Text>
        )}
      </group>
    </Float>
  );
};

// Asteroid belt
const AsteroidBelt = () => {
  const asteroids = useMemo(() => {
    const points: { position: THREE.Vector3; size: number }[] = [];
    const beltRadius = 38;
    const beltWidth = 4;
    
    for (let i = 0; i < 500; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = beltRadius + (Math.random() - 0.5) * beltWidth;
      const y = (Math.random() - 0.5) * 2;
      
      points.push({
        position: new THREE.Vector3(
          Math.cos(angle) * radius,
          y,
          Math.sin(angle) * radius
        ),
        size: Math.random() * 0.3 + 0.1
      });
    }
    
    return points;
  }, []);
  
  return (
    <>
      {asteroids.map((asteroid, i) => (
        <mesh key={i} position={asteroid.position}>
          <dodecahedronGeometry args={[asteroid.size, 0]} />
          <meshStandardMaterial
            color="#8B7355"
            emissive="#CD853F"
            emissiveIntensity={0.1}
            roughness={0.9}
          />
        </mesh>
      ))}
    </>
  );
};

// Enhanced star field with nebula
const EnhancedStarField = () => {
  const starsRef = useRef<THREE.Points>(null!);
  
  const { positions, colors } = useMemo(() => {
    const count = 5000;
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    
    for (let i = 0; i < count; i++) {
      const r = 150 + Math.random() * 150;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);
      
      // Color variation
      const color = new THREE.Color();
      const colorChoice = Math.random();
      if (colorChoice < 0.3) {
        color.setHSL(0.6, 0.3, 0.8); // Blue stars
      } else if (colorChoice < 0.6) {
        color.setHSL(0.1, 0.3, 0.9); // Yellow stars
      } else {
        color.setHSL(0, 0, 1); // White stars
      }
      
      col[i * 3] = color.r;
      col[i * 3 + 1] = color.g;
      col[i * 3 + 2] = color.b;
    }
    
    return { positions: pos, colors: col };
  }, []);
  
  useFrame(() => {
    if (starsRef.current) {
      starsRef.current.rotation.y += 0.0001;
    }
  });
  
  return (
    <>
      <points ref={starsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[positions, 3]}
          />
          <bufferAttribute
            attach="attributes-color"
            args={[colors, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.8}
          vertexColors
          transparent
          opacity={0.8}
          sizeAttenuation={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
      
      {/* Nebula effect */}
      <mesh>
        <sphereGeometry args={[200, 32, 32]} />
        <meshStandardMaterial
          color="#4B0082"
          transparent
          opacity={0.02}
          side={THREE.BackSide}
        />
      </mesh>
    </>
  );
};

const PrimeIntellectBackground = () => {
  const controlsRef = useRef<any>(null);
  
  useEffect(() => {
    console.log('PrimeIntellectBackground mounted - Planets should be visible');
    return () => console.log('PrimeIntellectBackground unmounted');
  }, []);
  
  // Auto-rotate when not interacting
  useFrame(() => {
    if (controlsRef.current && !controlsRef.current.enabled) {
      controlsRef.current.autoRotate = true;
    }
  });
  
  return (
    <>
      {/* Enhanced controls */}
      <OrbitControls
        ref={controlsRef}
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        zoomSpeed={0.8}
        rotateSpeed={0.5}
        panSpeed={0.8}
        minDistance={5}
        maxDistance={150}
        autoRotate={true}
        autoRotateSpeed={0.5}
        makeDefault
      />
      
      {/* Lighting */}
      <ambientLight intensity={0.2} />
      <pointLight position={[0, 0, 0]} intensity={2} color="#FDB813" />
      
      {/* Star field and nebula */}
      <EnhancedStarField />
      
      {/* Sun */}
      <InteractiveSun />
      
      {/* Planets */}
      {solarSystemData.map((planet) => {
        if (planet.name === 'Earth') {
          return <EarthPlanet key={planet.name} planet={planet} />;
        } else if (planet.type === 'gas') {
          return <GasGiantPlanet key={planet.name} planet={planet} />;
        } else {
          return <HolographicPlanet key={planet.name} planet={planet} />;
        }
      })}
      
      {/* Asteroid belt */}
      <AsteroidBelt />
      
      {/* Orbital paths */}
      {solarSystemData.map((planet) => (
        <mesh key={`orbit-${planet.name}`} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[planet.distance - 0.2, planet.distance + 0.2, 128]} />
          <meshBasicMaterial 
            color={planet.glowColor} 
            transparent 
            opacity={0.1}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      ))}
    </>
  );
};

export default PrimeIntellectBackground; 