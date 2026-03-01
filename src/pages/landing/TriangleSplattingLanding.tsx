




import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Zap, 
  Box, 
  Eye, 
  Database, 
  Cpu, 
  GitBranch,
  BarChart3,
  Layers,
  Globe,
  Download,
  FileSearch,
  Sparkles
} from 'lucide-react';
import AnimatedPage from '../../components/AnimatedPage';
import CardGlass from '../../components/CardGlass';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import * as THREE from 'three';

// Animated 3D background component
const TriangleBackground3D: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ 
      canvas: canvasRef.current, 
      alpha: true,
      antialias: true 
    });
    
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);

    // Create multiple floating triangular meshes
    const triangles: THREE.Mesh[] = [];
    const geometry = new THREE.TetrahedronGeometry(1, 0);
    
    for (let i = 0; i < 20; i++) {
      const material = new THREE.MeshPhongMaterial({
        color: new THREE.Color().setHSL(Math.random() * 0.1 + 0.5, 0.8, 0.5),
        wireframe: Math.random() > 0.5,
        transparent: true,
        opacity: 0.3 + Math.random() * 0.3
      });
      
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(
        (Math.random() - 0.5) * 40,
        (Math.random() - 0.5) * 40,
        (Math.random() - 0.5) * 40
      );
      mesh.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );
      mesh.scale.setScalar(0.5 + Math.random() * 1.5);
      
      triangles.push(mesh);
      scene.add(mesh);
    }

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 2);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0x00d4ff, 1);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);

    camera.position.z = 15;

    // Animation
    const animate = () => {
      requestAnimationFrame(animate);
      
      triangles.forEach((triangle, index) => {
        triangle.rotation.x += 0.002 * (index % 2 === 0 ? 1 : -1);
        triangle.rotation.y += 0.003 * (index % 3 === 0 ? 1 : -1);
        triangle.position.y += Math.sin(Date.now() * 0.001 + index) * 0.01;
      });
      
      renderer.render(scene, camera);
    };

    animate();

    // Handle resize
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none"
      style={{ opacity: 0.3 }}
    />
  );
};

const TriangleSplattingLanding: React.FC = () => {
  return (
    <AnimatedPage>
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-blue-900 text-white relative overflow-hidden">
        <TriangleBackground3D />
        
        <div className="relative z-10">
          <Header />
          
          {/* Hero Section */}
          <section className="relative py-20 px-4">
            <div className="container mx-auto text-center">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
              >
                <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent">
                  Triangle Splatting
                </h1>
                <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto">
                  State-of-the-art 3D reconstruction and visualization using triangle primitives for neural radiance fields
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link
                    to="/triangle-splatting"
                    className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 rounded-lg font-semibold text-lg transition-all transform hover:scale-105 shadow-lg inline-flex items-center gap-2"
                  >
                    <Box className="w-5 h-5" />
                    Launch Viewer
                  </Link>
                  <a
                    href="/tool-pages/triangle-splatting.html"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-8 py-4 bg-gray-800 hover:bg-gray-700 rounded-lg font-semibold text-lg transition-all transform hover:scale-105 shadow-lg inline-flex items-center gap-2"
                  >
                    <FileSearch className="w-5 h-5" />
                    Learn More
                  </a>
                </div>
              </motion.div>
            </div>
          </section>

          {/* Features Grid */}
          <section className="py-20 px-4">
            <div className="container mx-auto">
              <motion.h2
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                transition={{ duration: 0.8 }}
                className="text-4xl font-bold text-center mb-12"
              >
                Professional Features
              </motion.h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[
                  {
                    icon: Zap,
                    title: "GPU Accelerated",
                    description: "WebGL-powered rendering with custom GLSL shaders for real-time performance",
                    color: "from-yellow-500 to-orange-500"
                  },
                  {
                    icon: Database,
                    title: "Large Model Support",
                    description: "Efficiently handle millions of triangles with optimized memory management",
                    color: "from-green-500 to-emerald-500"
                  },
                  {
                    icon: Eye,
                    title: "Advanced Visualization",
                    description: "Professional-grade rendering with realistic lighting and material effects",
                    color: "from-blue-500 to-cyan-500"
                  },
                  {
                    icon: BarChart3,
                    title: "Analysis Tools",
                    description: "Built-in measurement tools and statistical analysis for research",
                    color: "from-purple-500 to-pink-500"
                  },
                  {
                    icon: Layers,
                    title: "Multi-Format Support",
                    description: "Import .OFF files with automatic color generation and optimization",
                    color: "from-red-500 to-rose-500"
                  },
                  {
                    icon: Globe,
                    title: "Web-Based",
                    description: "No installation required - runs entirely in your browser",
                    color: "from-indigo-500 to-blue-500"
                  }
                ].map((feature, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                  >
                    <CardGlass className="h-full p-6 hover:scale-105 transition-transform">
                      <div className={`w-12 h-12 rounded-lg bg-gradient-to-r ${feature.color} flex items-center justify-center mb-4`}>
                        <feature.icon className="w-6 h-6 text-white" />
                      </div>
                      <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                      <p className="text-gray-400">{feature.description}</p>
                    </CardGlass>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* Technical Specifications */}
          <section className="py-20 px-4 bg-black/30">
            <div className="container mx-auto">
              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                transition={{ duration: 0.8 }}
                className="max-w-4xl mx-auto"
              >
                <h2 className="text-4xl font-bold text-center mb-12">
                  Technical Specifications
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <CardGlass className="p-6">
                    <h3 className="text-2xl font-semibold mb-4 text-cyan-400">Rendering Engine</h3>
                    <ul className="space-y-2 text-gray-300">
                      <li className="flex items-start gap-2">
                        <Sparkles className="w-5 h-5 text-cyan-400 mt-0.5" />
                        <span>Three.js + WebGL 2.0 rendering pipeline</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Sparkles className="w-5 h-5 text-cyan-400 mt-0.5" />
                        <span>Custom GLSL shaders with ACES tone mapping</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Sparkles className="w-5 h-5 text-cyan-400 mt-0.5" />
                        <span>Physically-based lighting and materials</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Sparkles className="w-5 h-5 text-cyan-400 mt-0.5" />
                        <span>Real-time shadows and ambient occlusion</span>
                      </li>
                    </ul>
                  </CardGlass>
                  
                  <CardGlass className="p-6">
                    <h3 className="text-2xl font-semibold mb-4 text-purple-400">Research Features</h3>
                    <ul className="space-y-2 text-gray-300">
                      <li className="flex items-start gap-2">
                        <GitBranch className="w-5 h-5 text-purple-400 mt-0.5" />
                        <span>3D measurement and annotation tools</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <GitBranch className="w-5 h-5 text-purple-400 mt-0.5" />
                        <span>Export capabilities for analysis data</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <GitBranch className="w-5 h-5 text-purple-400 mt-0.5" />
                        <span>Color grading and exposure controls</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <GitBranch className="w-5 h-5 text-purple-400 mt-0.5" />
                        <span>Statistical model analysis</span>
                      </li>
                    </ul>
                  </CardGlass>
                </div>
              </motion.div>
            </div>
          </section>

          {/* Use Cases */}
          <section className="py-20 px-4">
            <div className="container mx-auto">
              <motion.h2
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                transition={{ duration: 0.8 }}
                className="text-4xl font-bold text-center mb-12"
              >
                Use Cases
              </motion.h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                {[
                  {
                    title: "Scientific Visualization",
                    description: "Visualize complex 3D datasets from simulations, scans, and reconstructions",
                    icon: Cpu
                  },
                  {
                    title: "Computer Graphics Research",
                    description: "Study and develop new rendering techniques for triangle-based representations",
                    icon: BarChart3
                  },
                  {
                    title: "3D Model Analysis",
                    description: "Analyze mesh quality, topology, and geometric properties",
                    icon: Database
                  }
                ].map((useCase, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                  >
                    <CardGlass className="h-full p-6 text-center">
                      <useCase.icon className="w-12 h-12 mx-auto mb-4 text-cyan-400" />
                      <h3 className="text-xl font-semibold mb-2">{useCase.title}</h3>
                      <p className="text-gray-400">{useCase.description}</p>
                    </CardGlass>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* Call to Action */}
          <section className="py-20 px-4">
            <div className="container mx-auto text-center">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="max-w-3xl mx-auto"
              >
                <h2 className="text-4xl font-bold mb-6">
                  Ready to Explore Triangle Splatting?
                </h2>
                <p className="text-xl text-gray-300 mb-8">
                  Experience professional-grade 3D visualization right in your browser
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link
                    to="/triangle-splatting"
                    className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 rounded-lg font-semibold text-lg transition-all transform hover:scale-105 shadow-lg inline-flex items-center gap-2"
                  >
                    <Box className="w-5 h-5" />
                    Start Visualizing
                  </Link>

                </div>
              </motion.div>
            </div>
          </section>
          
          <Footer />
        </div>
      </div>
    </AnimatedPage>
  );
};

export default TriangleSplattingLanding; 