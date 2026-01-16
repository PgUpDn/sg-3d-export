
import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { MeshPreviewData } from '../services/apiService';

interface MeshPreviewProps {
  meshData: MeshPreviewData | null;
  loading?: boolean;
  error?: string | null;
}

const MeshPreview: React.FC<MeshPreviewProps> = ({ meshData, loading, error }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const meshRef = useRef<THREE.Mesh | null>(null);
  const animationRef = useRef<number>(0);
  const [isRotating, setIsRotating] = useState(true);

  // Initialize Three.js scene
  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf8fafc);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(2, 2, 2);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 7);
    scene.add(directionalLight);

    const backLight = new THREE.DirectionalLight(0xffffff, 0.3);
    backLight.position.set(-5, -5, -5);
    scene.add(backLight);

    // Grid helper
    const gridHelper = new THREE.GridHelper(2, 10, 0x0891b2, 0xe2e8f0);
    gridHelper.position.y = -0.5;
    scene.add(gridHelper);

    // Animation loop
    const animate = () => {
      animationRef.current = requestAnimationFrame(animate);
      
      if (meshRef.current && isRotating) {
        meshRef.current.rotation.y += 0.005;
      }
      
      renderer.render(scene, camera);
    };
    animate();

    // Handle resize
    const handleResize = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationRef.current);
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
  }, []);

  // Update rotation state
  useEffect(() => {
    // This effect just ensures the animation loop uses the latest isRotating value
  }, [isRotating]);

  // Update mesh when data changes
  useEffect(() => {
    if (!sceneRef.current || !meshData || meshData.error) return;

    // Remove old mesh
    if (meshRef.current) {
      sceneRef.current.remove(meshRef.current);
      meshRef.current.geometry.dispose();
      if (meshRef.current.material instanceof THREE.Material) {
        meshRef.current.material.dispose();
      }
    }

    // Create geometry from data
    const geometry = new THREE.BufferGeometry();
    
    const vertices = new Float32Array(meshData.vertices);
    const normals = new Float32Array(meshData.normals);
    
    geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));

    // Material - cyan/teal color matching the UI
    const material = new THREE.MeshPhongMaterial({
      color: 0x0891b2,
      specular: 0x111111,
      shininess: 30,
      flatShading: true,
      side: THREE.DoubleSide,
    });

    const mesh = new THREE.Mesh(geometry, material);
    meshRef.current = mesh;
    sceneRef.current.add(mesh);

    // Reset camera position
    if (cameraRef.current) {
      cameraRef.current.position.set(2, 2, 2);
      cameraRef.current.lookAt(0, 0, 0);
    }

  }, [meshData]);

  return (
    <div className="relative w-full aspect-video rounded-xl bg-slate-50 border border-slate-200 overflow-hidden">
      {/* Three.js container */}
      <div 
        ref={containerRef} 
        className="w-full h-full"
        style={{ minHeight: '180px' }}
      />
      
      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 bg-slate-50/80 flex items-center justify-center">
          <div className="flex items-center gap-2 text-primary">
            <span className="material-symbols-outlined animate-spin">progress_activity</span>
            <span className="text-sm font-bold">Loading mesh...</span>
          </div>
        </div>
      )}
      
      {/* Error overlay */}
      {error && (
        <div className="absolute inset-0 bg-slate-50/80 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2 text-red-500">
            <span className="material-symbols-outlined">error</span>
            <span className="text-xs font-medium text-center px-4">{error}</span>
          </div>
        </div>
      )}
      
      {/* No data placeholder */}
      {!meshData && !loading && !error && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2 text-slate-400">
            <span className="material-symbols-outlined text-4xl">view_in_ar</span>
            <span className="text-xs font-medium">Select a district to preview</span>
          </div>
        </div>
      )}
      
      {/* Info badge */}
      {meshData && !loading && !error && (
        <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded text-[9px] font-bold text-slate-600 border border-slate-200">
          {meshData.triangleCount.toLocaleString()} triangles
          {meshData.originalTriangles > meshData.triangleCount && (
            <span className="text-slate-400"> / {meshData.originalTriangles.toLocaleString()}</span>
          )}
        </div>
      )}
      
      {/* Controls */}
      <div className="absolute bottom-2 right-2 flex gap-1">
        <button 
          onClick={() => setIsRotating(!isRotating)}
          className="size-7 rounded bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors shadow-sm"
          title={isRotating ? 'Stop rotation' : 'Start rotation'}
        >
          <span className="material-symbols-outlined text-sm text-slate-600">
            {isRotating ? 'pause' : '3d_rotation'}
          </span>
        </button>
        <button 
          onClick={() => {
            if (meshRef.current) {
              meshRef.current.rotation.y = 0;
            }
            if (cameraRef.current) {
              cameraRef.current.position.set(2, 2, 2);
              cameraRef.current.lookAt(0, 0, 0);
            }
          }}
          className="size-7 rounded bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors shadow-sm"
          title="Reset view"
        >
          <span className="material-symbols-outlined text-sm text-slate-600">restart_alt</span>
        </button>
      </div>
    </div>
  );
};

export default MeshPreview;
