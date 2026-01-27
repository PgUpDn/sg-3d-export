import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import XYZ from 'ol/source/XYZ';
import { fromLonLat, toLonLat } from 'ol/proj';
import 'ol/ol.css';

// Singapore bounds and constants
const SINGAPORE_CENTER: [number, number] = [103.8198, 1.3521];
const ORIGIN_LAT = 1.3082727;
const ORIGIN_LON = 103.8858564;
const ORIGIN_X = 13729.22656;
const ORIGIN_Y = -6342.60645;

// Convert lat/lon to Blender coordinates
function latlonToBlender(lat: number, lon: number): [number, number] {
  const deltaLat = lat - ORIGIN_LAT;
  const deltaLon = lon - ORIGIN_LON;
  const y = deltaLat * 111132 + ORIGIN_Y;
  const x = deltaLon * (111320 * Math.cos(ORIGIN_LAT * Math.PI / 180)) + ORIGIN_X;
  return [x, y];
}

// Convert Blender coordinates to lat/lon
function blenderToLatlon(x: number, y: number): [number, number] {
  const deltaX = x - ORIGIN_X;
  const deltaY = y - ORIGIN_Y;
  const deltaLat = deltaY / 111132;
  const deltaLon = deltaX / (111320 * Math.cos(ORIGIN_LAT * Math.PI / 180));
  const lat = ORIGIN_LAT + deltaLat;
  const lon = ORIGIN_LON + deltaLon;
  return [lat, lon];
}

interface Building {
  id: string;
  lat: number;
  lon: number;
  blender_x: number;
  blender_y: number;
  height: number;
}

interface Explorer3DRealProps {
  backendAvailable: boolean;
}

const Explorer3DReal: React.FC<Explorer3DRealProps> = ({ backendAvailable }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const threeContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const buildingsGroupRef = useRef<THREE.Group | null>(null);
  const loadedBuildingsRef = useRef<Set<string>>(new Set());
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({ loaded: 0, total: 0 });
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('3d');
  const [loadingProgress, setLoadingProgress] = useState(0);

  const getApiBaseUrl = () => {
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      return 'http://localhost:8000';
    }
    return 'https://52.203.122.189.nip.io';
  };

  // Initialize Three.js scene
  const initThreeJS = useCallback(() => {
    if (!threeContainerRef.current) return;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(
      45,
      threeContainerRef.current.clientWidth / threeContainerRef.current.clientHeight,
      1,
      100000
    );
    // Position camera above Singapore
    const [centerX, centerY] = latlonToBlender(1.35, 103.82);
    camera.position.set(centerX, centerY - 5000, 3000);
    camera.lookAt(centerX, centerY, 0);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(threeContainerRef.current.clientWidth, threeContainerRef.current.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    threeContainerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = true;
    controls.minDistance = 100;
    controls.maxDistance = 50000;
    controls.maxPolarAngle = Math.PI / 2;
    controlsRef.current = controls;

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5000, 5000, 5000);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    // Ground plane (Singapore area)
    const groundGeo = new THREE.PlaneGeometry(50000, 50000);
    const groundMat = new THREE.MeshLambertMaterial({ 
      color: 0x8fbc8f,
      transparent: true,
      opacity: 0.3
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = 0;
    ground.position.set(centerX, centerY, -1);
    scene.add(ground);

    // Buildings group
    const buildingsGroup = new THREE.Group();
    scene.add(buildingsGroup);
    buildingsGroupRef.current = buildingsGroup;

    // Grid helper
    const gridHelper = new THREE.GridHelper(50000, 100, 0x888888, 0xcccccc);
    gridHelper.rotation.x = Math.PI / 2;
    gridHelper.position.set(centerX, centerY, 0);
    scene.add(gridHelper);

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Handle resize
    const handleResize = () => {
      if (!threeContainerRef.current || !cameraRef.current || !rendererRef.current) return;
      const width = threeContainerRef.current.clientWidth;
      const height = threeContainerRef.current.clientHeight;
      cameraRef.current.aspect = width / height;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(width, height);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Initialize OpenLayers map
  const initMap = useCallback(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = new Map({
      target: mapContainerRef.current,
      layers: [
        new TileLayer({
          source: new XYZ({
            url: 'https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
            attributions: '© OpenStreetMap © CARTO'
          })
        })
      ],
      view: new View({
        center: fromLonLat(SINGAPORE_CENTER),
        zoom: 12
      })
    });

    mapRef.current = map;
  }, []);

  // Load buildings from backend
  const loadBuildings = useCallback(async () => {
    if (!backendAvailable || !buildingsGroupRef.current) {
      setError('Backend not available');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Get buildings in Singapore area
      const bounds = {
        lat_min: 1.20,
        lat_max: 1.48,
        lon_min: 103.60,
        lon_max: 104.05
      };

      const response = await fetch(
        `${getApiBaseUrl()}/api/buildings/viewport?` +
        `lat_min=${bounds.lat_min}&lat_max=${bounds.lat_max}&` +
        `lon_min=${bounds.lon_min}&lon_max=${bounds.lon_max}&limit=10000`
      );

      if (!response.ok) throw new Error('Failed to fetch buildings');

      const data = await response.json();
      setStats({ loaded: 0, total: data.count });

      // Load batch STL (merged buildings)
      const stlResponse = await fetch(
        `${getApiBaseUrl()}/api/buildings/batch-stl?` +
        `lat_min=${bounds.lat_min}&lat_max=${bounds.lat_max}&` +
        `lon_min=${bounds.lon_min}&lon_max=${bounds.lon_max}&limit=50000`
      );

      if (!stlResponse.ok) throw new Error('Failed to fetch STL data');

      const stlArrayBuffer = await stlResponse.arrayBuffer();
      
      // Parse STL
      const loader = new STLLoader();
      const geometry = loader.parse(stlArrayBuffer);

      // Create mesh with material
      const material = new THREE.MeshPhongMaterial({
        color: 0x4a90d9,
        specular: 0x111111,
        shininess: 50,
        flatShading: true
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      
      // Position at origin (STL is already in Blender coordinates)
      mesh.rotation.x = 0;
      
      buildingsGroupRef.current.add(mesh);

      // Center camera on buildings
      geometry.computeBoundingBox();
      const box = geometry.boundingBox;
      if (box && cameraRef.current && controlsRef.current) {
        const center = new THREE.Vector3();
        box.getCenter(center);
        
        const size = new THREE.Vector3();
        box.getSize(size);
        
        cameraRef.current.position.set(
          center.x,
          center.y - size.y,
          Math.max(size.x, size.y) * 0.8
        );
        controlsRef.current.target.set(center.x, center.y, center.z);
        controlsRef.current.update();
      }

      setStats({ loaded: data.count, total: data.count });
      setLoading(false);

    } catch (err: any) {
      console.error('Error loading buildings:', err);
      setError(err.message);
      setLoading(false);
    }
  }, [backendAvailable]);

  // Initialize on mount
  useEffect(() => {
    const cleanup = initThreeJS();
    initMap();
    loadBuildings();

    return () => {
      if (cleanup) cleanup();
      if (rendererRef.current && threeContainerRef.current) {
        threeContainerRef.current.removeChild(rendererRef.current.domElement);
        rendererRef.current.dispose();
      }
      if (mapRef.current) {
        mapRef.current.setTarget(undefined);
      }
    };
  }, [initThreeJS, initMap, loadBuildings]);

  // Reset view
  const resetView = () => {
    if (!cameraRef.current || !controlsRef.current || !buildingsGroupRef.current) return;
    
    const box = new THREE.Box3().setFromObject(buildingsGroupRef.current);
    const center = new THREE.Vector3();
    box.getCenter(center);
    
    const size = new THREE.Vector3();
    box.getSize(size);
    
    cameraRef.current.position.set(
      center.x,
      center.y - size.y * 0.5,
      Math.max(size.x, size.y) * 0.6
    );
    controlsRef.current.target.set(center.x, center.y, center.z);
    controlsRef.current.update();
  };

  // Top-down view
  const topDownView = () => {
    if (!cameraRef.current || !controlsRef.current || !buildingsGroupRef.current) return;
    
    const box = new THREE.Box3().setFromObject(buildingsGroupRef.current);
    const center = new THREE.Vector3();
    box.getCenter(center);
    
    const size = new THREE.Vector3();
    box.getSize(size);
    
    cameraRef.current.position.set(center.x, center.y, Math.max(size.x, size.y) * 1.2);
    cameraRef.current.up.set(0, 1, 0);
    controlsRef.current.target.set(center.x, center.y, 0);
    controlsRef.current.update();
  };

  return (
    <div className="relative w-full h-full bg-slate-100">
      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 bg-white/90 z-50 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="text-lg font-semibold text-slate-700">Loading 3D Building Models...</p>
            <p className="text-sm text-slate-500">
              {stats.total > 0 ? `${stats.loaded.toLocaleString()} / ${stats.total.toLocaleString()} buildings` : 'Fetching data...'}
            </p>
          </div>
        </div>
      )}

      {/* Error display */}
      {error && !loading && (
        <div className="absolute inset-0 bg-white/95 z-50 flex items-center justify-center">
          <div className="bg-red-50 border border-red-200 rounded-xl p-8 max-w-md text-center">
            <span className="material-symbols-outlined text-5xl text-red-400 mb-4">error</span>
            <h3 className="text-red-800 font-bold text-lg mb-2">Failed to Load Buildings</h3>
            <p className="text-red-600 text-sm mb-4">{error}</p>
            <button 
              onClick={loadBuildings}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Stats panel */}
      <div className="absolute top-4 left-4 z-40 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg p-4 border border-slate-200">
        <h3 className="font-bold text-slate-800 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">view_in_ar</span>
          Singapore 3D Buildings
        </h3>
        <div className="mt-2 text-sm text-slate-600 space-y-1">
          <p><span className="font-semibold">{stats.loaded.toLocaleString()}</span> buildings loaded</p>
          <p className="text-xs text-slate-400">Real STL models from Blender</p>
        </div>
        
        {/* View mode toggle */}
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => setViewMode('3d')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              viewMode === '3d' 
                ? 'bg-primary text-white' 
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            3D View
          </button>
          <button
            onClick={() => setViewMode('2d')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              viewMode === '2d' 
                ? 'bg-primary text-white' 
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            2D Map
          </button>
        </div>
      </div>

      {/* View controls */}
      <div className="absolute bottom-8 left-4 z-40 flex flex-col gap-2">
        <button 
          onClick={resetView}
          className="size-10 bg-white border border-slate-200 rounded-lg flex items-center justify-center hover:bg-slate-50 shadow-md"
          title="Reset view"
        >
          <span className="material-symbols-outlined">restart_alt</span>
        </button>
        <button 
          onClick={topDownView}
          className="size-10 bg-white border border-slate-200 rounded-lg flex items-center justify-center hover:bg-slate-50 shadow-md"
          title="Top-down view"
        >
          <span className="material-symbols-outlined">map</span>
        </button>
      </div>

      {/* Three.js container */}
      <div 
        ref={threeContainerRef}
        className={`absolute inset-0 ${viewMode === '3d' ? 'block' : 'hidden'}`}
      />

      {/* OpenLayers map container */}
      <div 
        ref={mapContainerRef}
        className={`absolute inset-0 ${viewMode === '2d' ? 'block' : 'hidden'}`}
      />
    </div>
  );
};

export default Explorer3DReal;
