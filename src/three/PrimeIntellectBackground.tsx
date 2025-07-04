import { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { shaderMaterial } from '@react-three/drei';
import { extend } from '@react-three/fiber';

// Hyperspace Shader Material
const HyperspaceMaterial = shaderMaterial(
  {
    uTime: 0,
    uMouse: new THREE.Vector2(0.5, 0.5),
    uSpeed: 1.0,
    uIntensity: 1.0,
  },
  // Vertex shader
  `
    varying vec2 vUv;
    varying vec3 vPosition;
    
    void main() {
      vUv = uv;
      vPosition = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  // Fragment shader
  `
    uniform float uTime;
    uniform vec2 uMouse;
    uniform float uSpeed;
    uniform float uIntensity;
    varying vec2 vUv;
    varying vec3 vPosition;
    
    #define NUM_LAYERS 4.0
    
    mat2 rotate2d(float angle) {
      return mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
    }
    
    float star(vec2 uv, float flare) {
      float d = length(uv);
      float m = 0.02 / d;
      
      float rays = max(0.0, 1.0 - abs(uv.x * uv.y * 1000.0));
      m += rays * flare;
      m *= smoothstep(1.0, 0.2, d);
      
      return m;
    }
    
    float hash21(vec2 p) {
      p = fract(p * vec2(123.34, 456.21));
      p += dot(p, p + 45.32);
      return fract(p.x * p.y);
    }
    
    vec3 starLayer(vec2 uv, float time) {
      vec3 col = vec3(0.0);
      
      vec2 gv = fract(uv) - 0.5;
      vec2 id = floor(uv);
      
      for(int y = -1; y <= 1; y++) {
        for(int x = -1; x <= 1; x++) {
          vec2 offs = vec2(x, y);
          
          float n = hash21(id + offs);
          float size = fract(n * 345.32);
          float brightness = fract(n * 213.45) * 0.5 + 0.5;
          
          vec2 p = gv - offs - vec2(n, fract(n * 34.0)) + 0.5;
          
          float star = star(p, smoothstep(0.8, 1.0, size)) * brightness;
          
          vec3 color = vec3(1.0, 0.8, 0.6);
          if(n > 0.6) color = vec3(0.7, 0.9, 1.0);
          else if(n > 0.3) color = vec3(1.0, 0.7, 0.9);
          
          col += star * color;
        }
      }
      
      return col;
    }
    
    void main() {
      vec2 uv = (vUv - 0.5) * 2.0;
      vec2 mouse = (uMouse - 0.5) * 2.0;
      
      // Warp effect based on mouse
      float warp = length(mouse) * 0.5;
      uv *= 1.0 + warp * 0.2;
      
      // Rotate based on mouse position
      float rotation = atan(mouse.y, mouse.x) * 0.1;
      uv *= rotate2d(rotation);
      
      float time = uTime * uSpeed;
      
      vec3 col = vec3(0.0);
      
      // Multiple star layers moving at different speeds
      for(float i = 0.0; i < 1.0; i += 1.0 / NUM_LAYERS) {
        float depth = fract(i + time * 0.1);
        float scale = mix(20.0, 0.5, depth);
        float fade = depth * smoothstep(0.0, 0.5, depth);
        
        vec2 layerUv = uv * scale + vec2(time * (i + 1.0) * 0.2, 0.0);
        col += starLayer(layerUv, time) * fade;
      }
      
      // Hyperspace streaks
      float streaks = 0.0;
      vec2 streakUv = uv;
      streakUv.x *= 0.1;
      float id = floor(streakUv.y * 20.0);
      float n = hash21(vec2(id, 0.0));
      streakUv.y = fract(streakUv.y * 20.0) - 0.5;
      
      float x = streakUv.x - time * 2.0 * (n * 0.5 + 1.0);
      x = fract(x) - 0.5;
      float streak = smoothstep(0.0, 0.01, abs(streakUv.y) - 0.05);
      streak *= smoothstep(0.0, 0.01, abs(x) - 0.001);
      streak *= smoothstep(0.5, 0.0, abs(x));
      
      col += streak * vec3(0.5, 0.8, 1.0) * (n * 0.5 + 0.5);
      
      // Vignette and color adjustment
      float vignette = 1.0 - dot(vUv - 0.5, vUv - 0.5) * 2.0;
      col *= vignette;
      
      // Add blue tint
      col = mix(col, vec3(0.1, 0.2, 0.4), 0.3);
      
      // Brightness based on mouse distance from center
      float brightness = 1.0 + length(mouse) * 0.3;
      col *= brightness * uIntensity;
      
      gl_FragColor = vec4(col, 1.0);
    }
  `
);

// Star particles for additional depth
const StarField = ({ count = 1000 }) => {
  const mesh = useRef<THREE.Points>(null!);
  const mouseRef = useRef(new THREE.Vector2(0, 0));
  
  const particles = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 50;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 50;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 50;
      
      const color = new THREE.Color();
      color.setHSL(Math.random() * 0.2 + 0.5, 0.5, 0.8);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
      
      sizes[i] = Math.random() * 2;
    }
    
    return { positions, colors, sizes };
  }, [count]);
  
  useFrame((state) => {
    if (mesh.current) {
      mesh.current.rotation.x = state.clock.elapsedTime * 0.05;
      mesh.current.rotation.y = state.clock.elapsedTime * 0.03;
      
      // React to mouse
      const mouse = state.mouse;
      mouseRef.current.lerp(mouse, 0.1);
      mesh.current.rotation.z = mouseRef.current.x * 0.2;
    }
  });
  
  return (
    <points ref={mesh}>
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
        size={1}
        sizeAttenuation={true}
        vertexColors={true}
        transparent={true}
        opacity={0.8}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};

extend({ HyperspaceMaterial });

declare global {
  namespace JSX {
    interface IntrinsicElements {
      hyperspaceMaterial: any;
    }
  }
}

const HyperspaceBackground = () => {
  const meshRef = useRef<THREE.Mesh>(null!);
  const { viewport, mouse } = useThree();
  const mouseSmooth = useRef(new THREE.Vector2(0.5, 0.5));
  
  useFrame((state) => {
    if (meshRef.current) {
      const material = meshRef.current.material as any;
      
      // Smooth mouse movement
      mouseSmooth.current.x += ((mouse.x + 1) / 2 - mouseSmooth.current.x) * 0.1;
      mouseSmooth.current.y += ((mouse.y + 1) / 2 - mouseSmooth.current.y) * 0.1;
      
      material.uniforms.uTime.value = state.clock.elapsedTime;
      material.uniforms.uMouse.value.set(mouseSmooth.current.x, mouseSmooth.current.y);
      
      // Speed up on mouse movement
      const mouseSpeed = Math.sqrt(
        Math.pow(mouse.x - mouseSmooth.current.x, 2) + 
        Math.pow(mouse.y - mouseSmooth.current.y, 2)
      );
      material.uniforms.uSpeed.value = 1.0 + mouseSpeed * 10.0;
    }
  });
  
  return (
    <>
      {/* Main hyperspace effect */}
      <mesh ref={meshRef}>
        <planeGeometry args={[viewport.width * 2, viewport.height * 2]} />
        <hyperspaceMaterial transparent />
      </mesh>
      
      {/* Additional star particles */}
      <StarField count={500} />
      
      {/* Ambient lighting */}
      <ambientLight intensity={0.2} />
      <pointLight position={[0, 0, 5]} intensity={0.5} color="#4080ff" />
    </>
  );
};

export default HyperspaceBackground; 