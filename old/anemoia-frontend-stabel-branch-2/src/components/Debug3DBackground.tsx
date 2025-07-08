import { useState, useEffect } from 'react';

const Debug3DBackground = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [debugInfo, setDebugInfo] = useState({
    webglSupported: false,
    webgl2Supported: false,
    canvasCount: 0,
    threejsLoaded: false,
    r3fLoaded: false,
    gpuInfo: '',
    errors: [] as string[],
    backgroundPref: localStorage.getItem('show3DBackground'),
    windowSize: { width: 0, height: 0 },
    performanceMode: '',
  });

  useEffect(() => {
    const checkWebGL = () => {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      // Need to use a different canvas for WebGL2 check to avoid conflict
      const canvas2 = document.createElement('canvas');
      const gl2 = canvas2.getContext('webgl2');
      
      let gpuInfo = 'Unknown';
      const contextToCheck = gl2 || gl;
      if (contextToCheck && (contextToCheck instanceof WebGLRenderingContext || contextToCheck instanceof WebGL2RenderingContext)) {
        const debugInfo = contextToCheck.getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
          gpuInfo = contextToCheck.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
        }
      }
      
      return {
        webglSupported: !!gl,
        webgl2Supported: !!gl2,
        gpuInfo,
      };
    };

    const checkLibraries = () => {
      return {
        threejsLoaded: typeof (window as any).THREE !== 'undefined',
        r3fLoaded: !!(window as any).__R3F__,
      };
    };

    const checkCanvases = () => {
      const canvases = document.querySelectorAll('canvas');
      return canvases.length;
    };

    const collectErrors = () => {
      const errors: string[] = [];
      
      // Check console for errors
      const originalError = console.error;
      console.error = function(...args) {
        errors.push(args.join(' '));
        originalError.apply(console, args);
      };

      // Restore after a delay
      setTimeout(() => {
        console.error = originalError;
      }, 5000);

      return errors;
    };

    // Collect debug info
    const webglInfo = checkWebGL();
    const libInfo = checkLibraries();
    
    setDebugInfo({
      ...webglInfo,
      ...libInfo,
      canvasCount: checkCanvases(),
      errors: collectErrors(),
      backgroundPref: localStorage.getItem('show3DBackground'),
      windowSize: { width: window.innerWidth, height: window.innerHeight },
      performanceMode: navigator.hardwareConcurrency ? `${navigator.hardwareConcurrency} cores` : 'Unknown',
    });

    // Re-check periodically
    const interval = setInterval(() => {
      setDebugInfo(prev => ({
        ...prev,
        canvasCount: checkCanvases(),
        ...checkLibraries(),
        backgroundPref: localStorage.getItem('show3DBackground'),
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const toggleBackground = () => {
    const current = localStorage.getItem('show3DBackground') === 'true';
    localStorage.setItem('show3DBackground', String(!current));
    window.location.reload();
  };

  const toggleSimpleMode = () => {
    const current = localStorage.getItem('debug3DSimple') === 'true';
    localStorage.setItem('debug3DSimple', String(!current));
    window.location.reload();
  };

  const runDeploymentTests = async () => {
    console.group('🚀 Deployment Tests for Render.com');
    
    // Test 1: WebGL Support
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    console.log('✓ WebGL Support:', !!gl);
    
    // Test 2: Three.js Loading
    console.log('✓ Three.js Loaded:', typeof (window as any).THREE !== 'undefined');
    
    // Test 3: React Three Fiber
    console.log('✓ R3F Available:', !!(window as any).__R3F__);
    
    // Test 4: GPU Detection
    try {
      const { detectGPU } = await import('../utils/gpuUtils');
      const gpuInfo = await detectGPU();
      console.log('✓ GPU Info:', gpuInfo);
    } catch (e) {
      console.error('✗ GPU Detection Failed:', e);
    }
    
    // Test 5: Check if we're on Render
    const isRender = window.location.hostname.includes('onrender.com');
    console.log('✓ Is Render Deploy:', isRender);
    
    // Test 6: Performance API
    console.log('✓ Performance API:', 'performance' in window);
    
    // Test 7: RequestAnimationFrame
    console.log('✓ RAF Available:', 'requestAnimationFrame' in window);
    
    console.groupEnd();
  };

  if (isCollapsed) {
    return (
      <button
        onClick={() => setIsCollapsed(false)}
        className="fixed bottom-4 right-4 bg-black/90 text-white px-3 py-2 rounded-lg text-xs font-mono z-[9999] hover:bg-black/80 transition-colors"
      >
        🐛 Debug
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 bg-black/90 text-white p-4 rounded-lg text-xs font-mono max-w-sm z-[9999] shadow-xl border border-gray-800">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-bold text-green-400">3D Background Debug</h3>
        <button 
          onClick={() => setIsCollapsed(true)}
          className="text-gray-400 hover:text-white transition-colors"
        >
          ✕
        </button>
      </div>
      <div className="space-y-1 max-h-64 overflow-y-auto">
        <div className={debugInfo.webglSupported ? 'text-green-400' : 'text-red-400'}>
          WebGL: {debugInfo.webglSupported ? '✓' : '✗'}
        </div>
        <div className={debugInfo.webgl2Supported ? 'text-green-400' : 'text-red-400'}>
          WebGL2: {debugInfo.webgl2Supported ? '✓' : '✗'}
        </div>
        <div className={debugInfo.threejsLoaded ? 'text-green-400' : 'text-red-400'}>
          Three.js: {debugInfo.threejsLoaded ? '✓' : '✗'}
        </div>
        <div className={debugInfo.r3fLoaded ? 'text-green-400' : 'text-red-400'}>
          React Three Fiber: {debugInfo.r3fLoaded ? '✓' : '✗'}
        </div>
        <div>Canvas Elements: {debugInfo.canvasCount}</div>
        <div className="text-xs text-gray-400 break-all">GPU: {debugInfo.gpuInfo}</div>
        <div>3D Enabled: {debugInfo.backgroundPref || 'null'}</div>
        <div>Simple Mode: {localStorage.getItem('debug3DSimple') || 'false'}</div>
        <div>Window: {debugInfo.windowSize.width}x{debugInfo.windowSize.height}</div>
        <div>Performance: {debugInfo.performanceMode}</div>
        
        {debugInfo.errors.length > 0 && (
          <div className="mt-2">
            <div className="text-red-400">Errors:</div>
            {debugInfo.errors.map((err, i) => (
              <div key={i} className="text-red-300 text-xs truncate">{err}</div>
            ))}
          </div>
        )}
        
        <div className="mt-3 flex flex-col gap-2">
          <button 
            onClick={toggleBackground}
            className="w-full px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded text-white transition-colors"
          >
            Toggle 3D: {debugInfo.backgroundPref === 'true' ? 'ON' : 'OFF'}
          </button>
          <button 
            onClick={toggleSimpleMode}
            className="w-full px-3 py-1.5 bg-purple-600 hover:bg-purple-700 rounded text-white transition-colors"
          >
            Simple Mode: {localStorage.getItem('debug3DSimple') === 'true' ? 'ON' : 'OFF'}
          </button>
        </div>
        <button
          onClick={runDeploymentTests}
          className="mt-2 px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs"
        >
          Run Deploy Tests
        </button>
      </div>
    </div>
  );
};

export default Debug3DBackground; 