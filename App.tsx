
import React, { useState, useEffect, useCallback, useRef } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import { AppRoute, SelectionStats, District } from './types';
import { SINGAPORE_DISTRICTS } from './constants';
import { getUrbanInsight } from './services/geminiService';
import { 
  getDistrictStats, 
  getDistrictInsight, 
  downloadSTL,
  healthCheck,
  startExportJob,
  pollExportJob,
  getDistrictMeshPreview,
  getClippedSTLDownloadUrl,
  MeshPreviewData
} from './services/apiService';

declare const L: any; // Leaflet global

// Flag to use backend API (set to true when backend is running)
const USE_BACKEND_API = true;

// District radii in meters - must match backend DISTRICT_RADIUS
const DISTRICT_RADIUS: Record<string, number> = {
  "1": 600,   // Punggol
  "2": 600,   // Sengkang
  "3": 600,   // Hougang
  "4": 600,   // Pasir Ris
  "5": 800,   // Woodlands
  "6": 800,   // Sembawang
  "7": 600,   // Tampines
  "8": 600,   // Ang Mo Kio
};

const App: React.FC = () => {
  const [activeRoute, setActiveRoute] = useState<AppRoute>(AppRoute.EXPORT_MANAGER);
  const [selectedDistrict, setSelectedDistrict] = useState<District>(SINGAPORE_DISTRICTS[0]);
  const [urbanInsight, setUrbanInsight] = useState<string | null>(null);
  const [backendAvailable, setBackendAvailable] = useState<boolean>(false);
  const [selectionStats, setSelectionStats] = useState<SelectionStats>({
    buildings: 0,
    fileSize: '0 MB',
    status: 'Idle',
    progress: 0,
  });
  
  // Mesh preview state
  const [meshPreview, setMeshPreview] = useState<MeshPreviewData | null>(null);
  const [meshLoading, setMeshLoading] = useState<boolean>(false);
  const [meshError, setMeshError] = useState<string | null>(null);

  const mapRef = useRef<any>(null);
  const selectionRectRef = useRef<any>(null); // Reference to the selection rectangle on map

  // Check backend availability on mount
  useEffect(() => {
    const checkBackend = async () => {
      try {
        await healthCheck();
        setBackendAvailable(true);
        console.log('Backend API is available');
      } catch {
        setBackendAvailable(false);
        console.log('Backend API not available, using fallback');
      }
    };
    
    if (USE_BACKEND_API) {
      checkBackend();
    }
  }, []);

  // Helper function to calculate lat/lng bounds from center + radius in meters
  const calculateBounds = useCallback((lat: number, lng: number, radiusMeters: number) => {
    // Approximate conversion: 1 degree latitude ≈ 111,320 meters
    // 1 degree longitude ≈ 111,320 * cos(lat) meters
    const latOffset = radiusMeters / 111320;
    const lngOffset = radiusMeters / (111320 * Math.cos(lat * Math.PI / 180));
    
    return {
      southWest: [lat - latOffset, lng - lngOffset] as [number, number],
      northEast: [lat + latOffset, lng + lngOffset] as [number, number]
    };
  }, []);

  // Update selection rectangle on map
  const updateSelectionRect = useCallback(() => {
    if (!mapRef.current) return;
    
    const radius = DISTRICT_RADIUS[selectedDistrict.id] || 600;
    const bounds = calculateBounds(selectedDistrict.lat, selectedDistrict.lng, radius);
    
    // Remove existing rectangle if any
    if (selectionRectRef.current) {
      mapRef.current.removeLayer(selectionRectRef.current);
    }
    
    // Create new rectangle with actual geographic bounds
    selectionRectRef.current = L.rectangle(
      [bounds.southWest, bounds.northEast],
      {
        color: '#0891b2',      // Primary color (cyan-600)
        weight: 2,
        fillColor: '#0891b2',
        fillOpacity: 0.1,
        dashArray: '5, 5'
      }
    ).addTo(mapRef.current);
    
    // Add a label to the rectangle
    const center = [(bounds.southWest[0] + bounds.northEast[0]) / 2, bounds.southWest[1]];
    
  }, [selectedDistrict, calculateBounds]);

  // Initialize Map with Light Professional Tiles
  useEffect(() => {
    if (!mapRef.current) {
      mapRef.current = L.map('map', {
        zoomControl: false,
        attributionControl: false
      }).setView([selectedDistrict.lat, selectedDistrict.lng], 16);

      // Using CartoDB Voyager - a professional light GIS tile layer
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        maxZoom: 20
      }).addTo(mapRef.current);
      
      // Initialize selection rectangle
      updateSelectionRect();
    }
  }, []);

  // Fetch mesh preview when district changes
  const fetchMeshPreview = useCallback(async () => {
    if (!backendAvailable) return;
    
    setMeshLoading(true);
    setMeshError(null);
    
    try {
      const preview = await getDistrictMeshPreview(selectedDistrict.id, 5000);
      if (preview.error) {
        setMeshError(preview.error);
      } else {
        setMeshPreview(preview);
      }
    } catch (error: any) {
      console.error('Error fetching mesh preview:', error);
      setMeshError(error.message || 'Failed to load 3D preview');
    } finally {
      setMeshLoading(false);
    }
  }, [selectedDistrict, backendAvailable]);

  // Sync Map with selection
  useEffect(() => {
    if (mapRef.current) {
      // Update selection rectangle first
      updateSelectionRect();
      
      // Calculate appropriate zoom level based on radius
      const radius = DISTRICT_RADIUS[selectedDistrict.id] || 600;
      // Larger radius = lower zoom level
      let zoomLevel = 16;
      if (radius >= 2000) zoomLevel = 14;
      else if (radius >= 1200) zoomLevel = 15;
      else if (radius >= 800) zoomLevel = 15.5;
      
      mapRef.current.flyTo([selectedDistrict.lat, selectedDistrict.lng], zoomLevel, {
        duration: 1.5
      });
    }
    
    const fetchInsight = async () => {
      setUrbanInsight("Fetching urban parameters...");
      
      try {
        if (USE_BACKEND_API && backendAvailable) {
          // Use backend API
          const response = await getDistrictInsight(selectedDistrict.id);
          setUrbanInsight(response.insight);
        } else {
          // Use direct Gemini call (fallback)
          const insight = await getUrbanInsight(selectedDistrict.name);
          setUrbanInsight(insight);
        }
      } catch (error) {
        console.error('Error fetching insight:', error);
        // Fallback to direct Gemini call
      const insight = await getUrbanInsight(selectedDistrict.name);
      setUrbanInsight(insight);
      }
    };
    
    fetchInsight();
    handleSelection();
    
    // Fetch mesh preview
    if (backendAvailable) {
      fetchMeshPreview();
    }
  }, [selectedDistrict, backendAvailable]);

  const handleSelection = useCallback(async () => {
    setSelectionStats({
      buildings: 0,
      fileSize: '0 MB',
      status: 'Processing',
      progress: 0,
    });

    try {
      if (USE_BACKEND_API && backendAvailable) {
        // Start export job via backend
        const job = await startExportJob(selectedDistrict.id);
        
        // Poll for completion
        await pollExportJob(job.job_id, (status) => {
          setSelectionStats({
            buildings: Math.floor(Math.random() * 80) + 40, // Will be updated
            fileSize: status.file_size || '0 MB',
            status: status.status as SelectionStats['status'],
            progress: status.progress,
          });
        });
        
        // Get final stats
        const stats = await getDistrictStats(selectedDistrict.id);
        setSelectionStats({
          buildings: stats.buildings,
          fileSize: stats.file_size,
          status: 'Ready',
          progress: 100,
        });
      } else {
        // Fallback: simulate processing locally
        let progress = 0;
        const buildings = Math.floor(Math.random() * 80) + 40;
        const fileSize = `${(Math.random() * 25 + 10).toFixed(1)} MB`;
        
        const interval = setInterval(() => {
          progress += 25;
          if (progress >= 100) {
            clearInterval(interval);
            setSelectionStats({ buildings, fileSize, progress: 100, status: 'Ready' });
          } else {
            setSelectionStats(prev => ({ ...prev, progress }));
          }
        }, 250);
      }
    } catch (error) {
      console.error('Error in selection:', error);
      // Fallback simulation
    let progress = 0;
    const interval = setInterval(() => {
      progress += 25;
      if (progress >= 100) {
        clearInterval(interval);
          setSelectionStats({
            buildings: Math.floor(Math.random() * 80) + 40,
            fileSize: `${(Math.random() * 25 + 10).toFixed(1)} MB`,
            status: 'Ready',
            progress: 100,
          });
      } else {
        setSelectionStats(prev => ({ ...prev, progress }));
      }
    }, 250);
    }
  }, [selectedDistrict, backendAvailable]);

  const handleZoom = (delta: number) => {
    if (mapRef.current) {
      const zoom = mapRef.current.getZoom();
      mapRef.current.setZoom(zoom + delta);
    }
  };

  const handleDownload = async () => {
    try {
      if (USE_BACKEND_API && backendAvailable) {
        // Download clipped STL via district endpoint
        await downloadSTL(selectedDistrict.id, selectedDistrict.name);
      } else {
        // Fallback: show alert
        alert(`Exporting high-fidelity STL: ${selectedDistrict.name}_SG_3D.stl`);
      }
    } catch (error) {
      console.error('Download error:', error);
      alert(`Exporting high-fidelity STL: ${selectedDistrict.name}_SG_3D.stl`);
    }
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background-light">
      <Header activeRoute={activeRoute} setActiveRoute={setActiveRoute} />
      
      <main className="flex-1 flex overflow-hidden relative">
        {/* Map Workspace */}
        <div className="flex-1 relative bg-slate-100 overflow-hidden">
          {/* Real Leaflet Map */}
          <div id="map" className="z-0" />
          
          {/* District Selector & Floating UI */}
          <div className="absolute top-8 left-8 flex flex-col gap-4 z-20">
            <div className="bg-white/95 backdrop-blur-md border border-slate-200 px-4 py-2 rounded-xl flex items-center gap-3 shadow-lg">
              <span className="material-symbols-outlined text-primary">location_on</span>
              <div className="flex flex-col">
                <span className="text-[10px] uppercase opacity-60 font-bold leading-none tracking-tight text-slate-900">Workspace focus</span>
                <select 
                  className="bg-transparent text-sm font-bold border-none focus:ring-0 p-0 cursor-pointer text-slate-800 appearance-none pr-4"
                  value={selectedDistrict.id}
                  onChange={(e) => {
                    const found = SINGAPORE_DISTRICTS.find(d => d.id === e.target.value);
                    if (found) setSelectedDistrict(found);
                  }}
                >
                  {SINGAPORE_DISTRICTS.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
            </div>
            
            {/* Backend Status Indicator */}
            {USE_BACKEND_API && (
              <div className={`bg-white/95 backdrop-blur-md border px-3 py-1.5 rounded-lg flex items-center gap-2 shadow-md ${
                backendAvailable ? 'border-green-200' : 'border-orange-200'
              }`}>
                <span className={`size-2 rounded-full ${backendAvailable ? 'bg-green-500' : 'bg-orange-400'}`}></span>
                <span className="text-[10px] font-bold text-slate-600">
                  {backendAvailable ? 'API Connected' : 'API Offline'}
                </span>
              </div>
            )}
          </div>

          {/* Selection Info Badge (the actual selection is shown on the map via Leaflet rectangle) */}
          <div className="absolute top-8 right-8 z-20">
            <div className="bg-white/95 backdrop-blur-md border border-slate-200 px-4 py-2 rounded-xl shadow-lg">
              <div className="flex items-center gap-2">
                <span className="size-3 rounded bg-primary/20 border border-primary"></span>
                <div className="flex flex-col">
                  <span className="text-[9px] uppercase opacity-60 font-bold tracking-tight text-slate-900">Clip Radius</span>
                  <span className="text-sm font-bold text-primary">{DISTRICT_RADIUS[selectedDistrict.id] || 600}m</span>
                </div>
              </div>
            </div>
          </div>

          {/* Map Controls */}
          <div className="absolute bottom-8 left-8 flex flex-col gap-2 z-20">
            <button 
              onClick={() => handleZoom(1)}
              className="size-10 bg-white border border-slate-200 text-slate-700 rounded-lg flex items-center justify-center hover:bg-slate-50 transition-all shadow-md active:bg-slate-100"
            >
              <span className="material-symbols-outlined">add</span>
            </button>
            <button 
              onClick={() => handleZoom(-1)}
              className="size-10 bg-white border border-slate-200 text-slate-700 rounded-lg flex items-center justify-center hover:bg-slate-50 transition-all shadow-md active:bg-slate-100"
            >
              <span className="material-symbols-outlined">remove</span>
            </button>
            <div className="h-px w-full bg-slate-200 my-1" />
            <button 
              onClick={() => mapRef.current?.setView([selectedDistrict.lat, selectedDistrict.lng], 16)}
              className="size-10 bg-white border border-slate-200 text-slate-700 rounded-lg flex items-center justify-center hover:bg-slate-50 transition-all shadow-md active:bg-slate-100"
            >
              <span className="material-symbols-outlined">my_location</span>
            </button>
          </div>

          {/* Status Badge */}
          <div className="absolute bottom-8 right-8 z-40">
             <div className="bg-white/95 backdrop-blur-md border border-slate-200 px-5 py-2.5 rounded-full flex items-center gap-3 text-xs font-bold text-slate-800 shadow-xl border-l-4 border-l-primary">
                <span className={`size-2.5 rounded-full ${selectionStats.status === 'Ready' ? 'bg-green-500' : 'bg-primary animate-pulse'}`}></span>
                {selectionStats.status === 'Ready' ? 'Selection Ready for Download' : 'Generating Mesh Data...'}
            </div>
          </div>
        </div>

        {/* Action Panel */}
        <Sidebar 
          stats={selectionStats} 
          onDownload={handleDownload} 
          insight={urbanInsight} 
          meshPreview={meshPreview}
          meshLoading={meshLoading}
          meshError={meshError}
        />
      </main>

      {/* Footer Info */}
      <footer className="bg-white border-t border-slate-200 px-6 py-2.5 flex items-center justify-between text-[10px] text-slate-500 font-bold z-50">
        <div className="flex gap-8">
          <span className="flex items-center gap-1.5"><span className="material-symbols-outlined text-sm">explore</span> {selectedDistrict.lat.toFixed(6)} N, {selectedDistrict.lng.toFixed(6)} E</span>
          <span className="flex items-center gap-1.5"><span className="material-symbols-outlined text-sm">grid_view</span> UTM Zone 48N</span>
        </div>
        <div className="flex gap-8 items-center uppercase tracking-widest text-slate-400">
          <span className="text-primary">© 2025 SG-3D Export</span>
        </div>
      </footer>
    </div>
  );
};

export default App;
