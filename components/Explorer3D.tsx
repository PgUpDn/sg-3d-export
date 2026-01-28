import React, { useEffect, useState, useCallback, useMemo } from 'react';
import Map from 'react-map-gl/maplibre';
import DeckGL from '@deck.gl/react';
import { PolygonLayer } from '@deck.gl/layers';
import 'maplibre-gl/dist/maplibre-gl.css';

// Dark map style for better 3D effect
const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

// Singapore bounds
const SINGAPORE_BOUNDS = {
  minLat: 1.15,
  maxLat: 1.47,
  minLon: 103.60,
  maxLon: 104.05,
};

// Singapore center
const INITIAL_VIEW_STATE = {
  longitude: 103.8198,
  latitude: 1.3521,
  zoom: 11.5,
  pitch: 50,
  bearing: -10,
  minZoom: 10,
  maxZoom: 18,
};

// API URL
function getApiBaseUrl(): string {
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    return 'http://localhost:8000';
  }
  return 'https://52.203.122.189.nip.io';
}

interface Building {
  lat: number;
  lon: number;
  height: number;
  id: string;
}

interface BuildingPolygon {
  polygon: number[][];
  height: number;
  id: string;
  lat: number;
  lon: number;
  percentile: number;
}

interface Explorer3DProps {
  backendAvailable: boolean;
}

// Create rectangular building footprint from point
function createBuildingPolygon(lat: number, lon: number, height: number, id: string, percentile: number): BuildingPolygon {
  // Building footprint size based on height (taller buildings tend to be larger)
  const baseSize = 0.00015; // ~15m base
  const sizeMultiplier = Math.min(1 + (height / 200), 2); // Scale with height
  const size = baseSize * sizeMultiplier;
  
  // Add some randomness to make buildings look more natural
  const hash = id.split('_')[1] || '0';
  const seed = parseInt(hash, 10) || 0;
  const rotation = (seed % 45) * (Math.PI / 180); // Random rotation 0-45 degrees
  const aspectRatio = 0.6 + (seed % 40) / 100; // 0.6-1.0 aspect ratio
  
  const w = size;
  const h = size * aspectRatio;
  
  // Create rotated rectangle
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  
  const corners = [
    [-w/2, -h/2],
    [w/2, -h/2],
    [w/2, h/2],
    [-w/2, h/2],
  ];
  
  const polygon = corners.map(([dx, dy]) => [
    lon + (dx * cos - dy * sin),
    lat + (dx * sin + dy * cos),
  ]);
  polygon.push(polygon[0]); // Close the polygon
  
  return { polygon, height, id, lat, lon, percentile };
}

// Height-based color scheme using percentile (0-1) for better distribution
function getColorFromPercentile(percentile: number): [number, number, number, number] {
  // Color gradient: dark blue -> blue -> cyan -> green -> yellow -> orange -> red
  if (percentile < 0.15) {
    // Dark blue
    const t = percentile / 0.15;
    return [20, 40 + t * 40, 100 + t * 50, 200];
  } else if (percentile < 0.35) {
    // Blue to cyan
    const t = (percentile - 0.15) / 0.2;
    return [20 + t * 30, 80 + t * 100, 150 + t * 70, 210];
  } else if (percentile < 0.55) {
    // Cyan to green
    const t = (percentile - 0.35) / 0.2;
    return [50 + t * 50, 180 - t * 20, 220 - t * 100, 220];
  } else if (percentile < 0.75) {
    // Green to yellow
    const t = (percentile - 0.55) / 0.2;
    return [100 + t * 155, 160 + t * 60, 120 - t * 80, 230];
  } else if (percentile < 0.90) {
    // Yellow to orange
    const t = (percentile - 0.75) / 0.15;
    return [255, 220 - t * 100, 40 - t * 30, 240];
  } else {
    // Orange to red (top 10%)
    const t = (percentile - 0.90) / 0.10;
    return [255, 120 - t * 80, 10, 250];
  }
}

const Explorer3D: React.FC<Explorer3DProps> = ({ backendAvailable }) => {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewState, setViewState] = useState(INITIAL_VIEW_STATE);
  const [heightScale, setHeightScale] = useState(2);
  const [showMap, setShowMap] = useState(true);
  const [colorMode, setColorMode] = useState<'height' | 'uniform'>('height');

  // Fetch buildings from API
  const fetchBuildings = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const API_URL = getApiBaseUrl();
      const response = await fetch(`${API_URL}/api/buildings/all?limit=50000`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.buildings && Array.isArray(data.buildings)) {
        // Filter to Singapore bounds only
        const filteredBuildings = data.buildings.filter((b: Building) => 
          b.lat >= SINGAPORE_BOUNDS.minLat &&
          b.lat <= SINGAPORE_BOUNDS.maxLat &&
          b.lon >= SINGAPORE_BOUNDS.minLon &&
          b.lon <= SINGAPORE_BOUNDS.maxLon
        );
        setBuildings(filteredBuildings);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err: any) {
      console.error('Failed to fetch buildings:', err);
      setError(err.message || 'Failed to fetch buildings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBuildings();
  }, [fetchBuildings]);

  // Process buildings into polygons with percentile ranking
  const { buildingPolygons, maxHeight, stats } = useMemo(() => {
    if (buildings.length === 0) {
      return { 
        buildingPolygons: [], 
        maxHeight: 100, 
        stats: { min: 0, max: 0, avg: 0 }
      };
    }
    
    const heights = buildings.map(b => b.height);
    const max = Math.max(...heights);
    const min = Math.min(...heights);
    const avg = heights.reduce((a, b) => a + b, 0) / heights.length;
    
    // Sort buildings by height to calculate percentiles
    const sortedBuildings = [...buildings].sort((a, b) => a.height - b.height);
    const percentileMap = new Map<string, number>();
    sortedBuildings.forEach((b, index) => {
      percentileMap.set(b.id, index / sortedBuildings.length);
    });
    
    const polygons = buildings.map(b => 
      createBuildingPolygon(b.lat, b.lon, b.height, b.id, percentileMap.get(b.id) || 0.5)
    );
    
    return { 
      buildingPolygons: polygons, 
      maxHeight: max,
      stats: { min, max, avg }
    };
  }, [buildings]);


  // Create deck.gl layers
  const layers = useMemo(() => {
    if (buildingPolygons.length === 0) return [];

    return [
      // 3D Buildings
      new PolygonLayer({
        id: 'buildings-3d',
        data: buildingPolygons,
        extruded: true,
        wireframe: false,
        opacity: 0.9,
        getPolygon: (d: BuildingPolygon) => d.polygon,
        getElevation: (d: BuildingPolygon) => d.height * heightScale,
        getFillColor: (d: BuildingPolygon) => {
          if (colorMode !== 'height') {
            return [14, 165, 164, 200]; // Uniform teal color
          }
          return getColorFromPercentile(d.percentile);
        },
        getLineColor: [80, 80, 80, 50],
        getLineWidth: 1,
        pickable: true,
        material: {
          ambient: 0.4,
          diffuse: 0.6,
          shininess: 40,
          specularColor: [200, 200, 200],
        },
        updateTriggers: {
          getElevation: heightScale,
          getFillColor: colorMode,
        }
      }),
    ];
  }, [buildingPolygons, heightScale, colorMode]);

  // Tooltip for building info
  const getTooltip = useCallback(({ object }: { object?: BuildingPolygon }) => {
    if (!object) return null;
    return {
      html: `
        <div style="padding: 12px; font-family: 'Space Grotesk', sans-serif; min-width: 150px;">
          <div style="font-weight: 700; color: #0ea5a4; font-size: 14px; margin-bottom: 8px;">
            Building Info
          </div>
          <div style="display: grid; gap: 4px; font-size: 12px;">
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #64748b;">Height</span>
              <span style="color: #1e293b; font-weight: 600;">${object.height.toFixed(1)}m</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #64748b;">Latitude</span>
              <span style="color: #1e293b;">${object.lat.toFixed(5)}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #64748b;">Longitude</span>
              <span style="color: #1e293b;">${object.lon.toFixed(5)}</span>
            </div>
          </div>
        </div>
      `,
      style: {
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
        border: '1px solid #e2e8f0'
      }
    };
  }, []);

  const resetView = () => setViewState(INITIAL_VIEW_STATE);
  const zoomIn = () => setViewState(prev => ({ ...prev, zoom: Math.min(prev.zoom + 0.5, 18) }));
  const zoomOut = () => setViewState(prev => ({ ...prev, zoom: Math.max(prev.zoom - 0.5, 10) }));

  return (
    <div className="relative w-full h-full bg-slate-900">
      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 bg-slate-900/95 z-50 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
            <p className="text-lg font-semibold text-white">Loading Singapore Buildings...</p>
            <p className="text-sm text-slate-400">Fetching 3D building data</p>
          </div>
        </div>
      )}

      {/* Error message */}
      {error && !loading && (
        <div className="absolute inset-0 bg-slate-900/95 z-50 flex items-center justify-center">
          <div className="bg-slate-800 border border-red-500/30 rounded-2xl p-8 max-w-md text-center shadow-2xl">
            <div className="w-16 h-16 mx-auto mb-4 bg-red-500/20 rounded-full flex items-center justify-center">
              <span className="material-symbols-outlined text-3xl text-red-400">error</span>
            </div>
            <h3 className="text-red-400 font-bold text-lg mb-2">Failed to Load Buildings</h3>
            <p className="text-red-300 text-sm mb-4">{error}</p>
            <button 
              onClick={fetchBuildings}
              className="px-6 py-2 bg-primary text-white rounded-lg font-semibold hover:bg-primary/90 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Stats panel */}
      <div className="absolute top-4 left-4 z-40 bg-slate-800/95 backdrop-blur-sm rounded-xl shadow-2xl p-4 border border-slate-700 min-w-[220px]">
        <h3 className="font-bold text-white flex items-center gap-2 text-sm">
          <span className="material-symbols-outlined text-primary">location_city</span>
          Singapore 3D Buildings
        </h3>
        <div className="mt-3 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Buildings</span>
            <span className="font-bold text-primary">{buildings.length.toLocaleString()}</span>
          </div>
          {buildings.length > 0 && (
            <>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Max height</span>
                <span className="font-semibold text-orange-400">{stats.max.toFixed(0)}m</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Avg height</span>
                <span className="font-semibold text-cyan-400">{stats.avg.toFixed(0)}m</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Min height</span>
                <span className="font-semibold text-blue-400">{stats.min.toFixed(0)}m</span>
              </div>
            </>
          )}
        </div>
        
        {/* Height color legend */}
        {colorMode === 'height' && buildings.length > 0 && (
          <div className="mt-4 pt-3 border-t border-slate-700">
            <div className="text-xs text-slate-400 mb-2">Height (Percentile)</div>
            <div className="h-3 rounded-full overflow-hidden" style={{
              background: 'linear-gradient(to right, #142864, #32b4dc, #64c850, #ffdc00, #ff8c00, #ff3232)'
            }}></div>
            <div className="flex justify-between text-[10px] text-slate-500 mt-1">
              <span>Low</span>
              <span>50%</span>
              <span>High</span>
            </div>
          </div>
        )}
        
        {/* View options */}
        <div className="mt-4 pt-3 border-t border-slate-700 space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input 
              type="checkbox" 
              checked={showMap} 
              onChange={(e) => setShowMap(e.target.checked)}
              className="rounded border-slate-500 bg-slate-700 text-primary"
            />
            <span className="text-xs text-slate-300">Show base map</span>
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => setColorMode('height')}
              className={`flex-1 text-xs py-1.5 rounded-lg transition-colors ${
                colorMode === 'height' 
                  ? 'bg-primary text-white' 
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              By Height
            </button>
            <button
              onClick={() => setColorMode('uniform')}
              className={`flex-1 text-xs py-1.5 rounded-lg transition-colors ${
                colorMode === 'uniform' 
                  ? 'bg-primary text-white' 
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              Uniform
            </button>
          </div>
        </div>
      </div>

      {/* View controls */}
      <div className="absolute bottom-8 left-4 z-40 flex flex-col gap-2">
        <button
          onClick={zoomIn}
          className="size-10 bg-slate-800 border border-slate-700 text-white rounded-lg flex items-center justify-center hover:bg-slate-700 shadow-lg transition-colors"
          title="Zoom in"
        >
          <span className="material-symbols-outlined">add</span>
        </button>
        <button
          onClick={zoomOut}
          className="size-10 bg-slate-800 border border-slate-700 text-white rounded-lg flex items-center justify-center hover:bg-slate-700 shadow-lg transition-colors"
          title="Zoom out"
        >
          <span className="material-symbols-outlined">remove</span>
        </button>
        <div className="h-px w-full bg-slate-700 my-1" />
        <button
          onClick={resetView}
          className="size-10 bg-slate-800 border border-slate-700 text-white rounded-lg flex items-center justify-center hover:bg-slate-700 shadow-lg transition-colors"
          title="Reset view"
        >
          <span className="material-symbols-outlined">restart_alt</span>
        </button>
        <button
          onClick={() => setViewState(prev => ({ ...prev, pitch: prev.pitch === 0 ? 50 : 0 }))}
          className="size-10 bg-slate-800 border border-slate-700 text-white rounded-lg flex items-center justify-center hover:bg-slate-700 shadow-lg transition-colors"
          title="Toggle 3D/2D"
        >
          <span className="material-symbols-outlined">{viewState.pitch > 0 ? '3d_rotation' : 'map'}</span>
        </button>
      </div>

      {/* Height scale control */}
      <div className="absolute bottom-8 right-4 z-40 bg-slate-800/95 backdrop-blur-sm rounded-xl shadow-2xl px-4 py-3 border border-slate-700 w-56">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-300">Height Exaggeration</span>
          <span className="text-xs font-bold text-primary">{heightScale}x</span>
        </div>
        <input
          type="range"
          min="0.5"
          max="5"
          step="0.5"
          value={heightScale}
          onChange={(e) => setHeightScale(Number(e.target.value))}
          className="w-full accent-primary"
        />
        <div className="flex justify-between text-[10px] text-slate-500 mt-1">
          <span>0.5x</span>
          <span>5x</span>
        </div>
      </div>

      {/* Pitch indicator */}
      <div className="absolute top-4 right-4 z-40 bg-slate-800/95 backdrop-blur-sm border border-slate-700 px-3 py-2 rounded-lg flex items-center gap-3 shadow-lg">
        <div className="flex items-center gap-2">
          <span className={`size-2 rounded-full ${backendAvailable ? 'bg-green-500' : 'bg-orange-400'}`}></span>
          <span className="text-xs font-semibold text-slate-300">
            {backendAvailable ? 'API Connected' : 'API Offline'}
          </span>
        </div>
        <div className="w-px h-4 bg-slate-600"></div>
        <div className="text-xs text-slate-400">
          Pitch: {viewState.pitch.toFixed(0)}°
        </div>
      </div>

      {/* DeckGL Map */}
      <DeckGL
        viewState={viewState}
        onViewStateChange={({ viewState: newViewState }) => setViewState(newViewState as typeof INITIAL_VIEW_STATE)}
        controller={true}
        layers={!loading && !error ? layers : []}
        getTooltip={getTooltip}
        effects={[]}
      >
        {showMap && (
          <Map
            mapStyle={MAP_STYLE}
            attributionControl={false}
          />
        )}
      </DeckGL>
    </div>
  );
};

export default Explorer3D;
