import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const SimpleBackground = () => {
  const meshRef = useRef<THREE.Mesh>(null!);
  const groupRef = useRef<THREE.Group>(null!);

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += delta * 0.2;
      meshRef.current.rotation.y += delta * 0.3;
    }
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.1;
    }
  });

  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} color="#00d4ff" />
      <pointLight position={[-10, -10, -10]} intensity={0.5} color="#ff00ff" />
      
      <group ref={groupRef}>
        {/* Central animated cube */}
        <mesh ref={meshRef} position={[0, 0, 0]}>
          <boxGeometry args={[2, 2, 2]} />
          <meshStandardMaterial 
            color="#00d4ff" 
            emissive="#0066ff"
            emissiveIntensity={0.5}
            wireframe
          />
        </mesh>
        
        {/* Orbiting spheres */}
        {[...Array(8)].map((_, i) => {
          const angle = (i / 8) * Math.PI * 2;
          const radius = 5;
          return (
            <mesh
              key={i}
              position={[
                Math.cos(angle) * radius,
                Math.sin(i * 0.5) * 2,
                Math.sin(angle) * radius
              ]}
            >
              <sphereGeometry args={[0.5, 16, 16]} />
              <meshStandardMaterial
                color={`hsl(${i * 45}, 100%, 50%)`}
                emissive={`hsl(${i * 45}, 100%, 30%)`}
                emissiveIntensity={0.5}
              />
            </mesh>
          );
        })}
      </group>
      
      {/* Grid floor */}
      <gridHelper args={[20, 20, '#0088ff', '#004466']} position={[0, -3, 0]} />
    </>
  );
};

export default SimpleBackground; 