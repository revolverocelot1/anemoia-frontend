import { useEffect, useRef } from 'react';

const Simple3DTest = () => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    // Direct Three.js test without React Three Fiber
    const THREE = (window as any).THREE;
    
    if (!THREE) {
      console.error('THREE.js not available');
      return;
    }

    console.log('Creating basic Three.js scene');

    // Create scene
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer();
    
    renderer.setSize(200, 200);
    mountRef.current.appendChild(renderer.domElement);

    // Create a cube
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true });
    const cube = new THREE.Mesh(geometry, material);
    scene.add(cube);

    camera.position.z = 5;

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      cube.rotation.x += 0.01;
      cube.rotation.y += 0.01;
      renderer.render(scene, camera);
    };

    animate();

    // Cleanup
    return () => {
      mountRef.current?.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, []);

  return (
    <div className="fixed bottom-4 left-4 bg-black p-2 rounded border border-green-500 z-[9998]">
      <div className="text-green-400 text-xs mb-1">Three.js Test:</div>
      <div ref={mountRef} />
    </div>
  );
};

export default Simple3DTest; 