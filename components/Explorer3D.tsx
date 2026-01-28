import React, { useEffect, useState, useCallback } from 'react';
import Map from 'react-map-gl/maplibre';
import DeckGL from '@deck.gl/react';
import { ColumnLayer } from '@deck.gl/layers';
import 'maplibre-gl/dist/maplibre-gl.css';

const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

// Singapore center
const INITIAL_VIEW_STATE = {
  longitude: 103.8198,
  latitude: 1.3521,
  zoom: 11,
  pitch: 45,
  bearing: -20,
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

interface Explorer3DProps {
  backendAvailable: boolean;
}

const Explorer3D: React.FC<Explorer3DProps> = ({ backendAvailable }) => {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewState, setViewState] = useState(INITIAL_VIEW_STATE);
  const [heightScale, setHeightScale] = useState(3);
  const [showMap, setShowMap] = useState(true);

  // Fetch buildings from API
  const fetchBuildings = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const API_URL = getApiBaseUrl();
      const response = await fetch(`${API_URL}/api/buildings/all?limit=30000`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.buildings && Array.isArray(data.buildings)) {
        setBuildings(data.buildings);
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

  // Create deck.gl layer
  const layers = [
    new ColumnLayer({
      id: 'buildings-layer',
      data: buildings,
      diskResolution: 6,
      radius: 25,
      extruded: true,
      pickable: true,
      elevationScale: heightScale,
      getPosition: (d: Building) => [d.lon, d.lat],
      getElevation: (d: Building) => d.height,
      getFillColor: (d: Building) => {
        // Color based on height - cyan to orange gradient
        const h = Math.min(d.height / 150, 1);
        return [
          Math.floor(14 + h * 240),   // R: 14-254
          Math.floor(165 - h * 100),  // G: 165-65
          Math.floor(164 - h * 140),  // B: 164-24
          220
        ];
      },
      updateTriggers: {
        getElevation: heightScale
      }
    })
  ];

  // Tooltip for building info
  const getTooltip = ({ object }: { object?: Building }) => {
    if (!object) return null;
    return {
      html: `
        <div style="padding: 8px; font-family: 'Space Grotesk', sans-serif;">
          <div style="font-weight: 600; color: #0891b2;">Building</div>
          <div style="font-size: 12px; color: #64748b; margin-top: 4px;">
            Height: ${object.height.toFixed(1)}m
          </div>
          <div style="font-size: 11px; color: #94a3b8; margin-top: 2px;">
            ${object.lat.toFixed(6)}, ${object.lon.toFixed(6)}
          </div>
        </div>
      `,
      style: {
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        border: '1px solid #e2e8f0'
      }
    };
  };

  const resetView = () => {
    setViewState(INITIAL_VIEW_STATE);
  };

  const zoomIn = () => {
    setViewState(prev => ({ ...prev, zoom: prev.zoom + 0.5 }));
  };

  const zoomOut = () => {
    setViewState(prev => ({ ...prev, zoom: prev.zoom - 0.5 }));
  };

  // Calculate stats
  let maxHeight = 0, minHeight = Infinity, avgHeight = 0;
  if (buildings.length > 0) {
    let sum = 0;
    for (const b of buildings) {
      if (b.height > maxHeight) maxHeight = b.height;
      if (b.height < minHeight) minHeight = b.height;
      sum += b.height;
    }
    avgHeight = sum / buildings.length;
  }

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
            <p className="text-slate-500 text-xs mb-4">API: {getApiBaseUrl()}</p>
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
      <div className="absolute top-4 left-4 z-40 bg-slate-800/95 backdrop-blur-sm rounded-xl shadow-2xl p-4 border border-slate-700 min-w-[200px]">
        <h3 className="font-bold text-white flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">location_city</span>
          Singapore 3D Buildings
        </h3>
        <div className="mt-3 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Buildings loaded</span>
            <span className="font-semibold text-primary">{buildings.length.toLocaleString()}</span>
          </div>
          {buildings.length > 0 && (
            <>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Max height</span>
                <span className="font-semibold text-orange-400">
                  {maxHeight.toFixed(0)}m
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Avg height</span>
                <span className="font-semibold text-cyan-400">
                  {avgHeight.toFixed(0)}m
                </span>
              </div>
            </>
          )}
        </div>
        
        {/* View mode toggle */}
        <div className="mt-4 pt-3 border-t border-slate-700">
          <label className="flex items-center gap-2 cursor-pointer">
            <input 
              type="checkbox" 
              checked={showMap} 
              onChange={(e) => setShowMap(e.target.checked)}
              className="rounded border-slate-500 bg-slate-700"
            />
            <span className="text-xs text-slate-300">Show base map</span>
          </label>
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
          onClick={() => setViewState(prev => ({ ...prev, pitch: prev.pitch === 0 ? 45 : 0 }))}
          className="size-10 bg-slate-800 border border-slate-700 text-white rounded-lg flex items-center justify-center hover:bg-slate-700 shadow-lg transition-colors"
          title="Toggle 3D/2D"
        >
          <span className="material-symbols-outlined">{viewState.pitch > 0 ? '3d_rotation' : 'map'}</span>
        </button>
      </div>

      {/* Height scale control */}
      <div className="absolute bottom-8 right-4 z-40 bg-slate-800/95 backdrop-blur-sm rounded-xl shadow-2xl px-4 py-3 border border-slate-700 w-56">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-300">Height Scale</span>
          <span className="text-xs font-bold text-primary">{heightScale}x</span>
        </div>
        <input
          type="range"
          min="1"
          max="10"
          step="0.5"
          value={heightScale}
          onChange={(e) => setHeightScale(Number(e.target.value))}
          className="w-full accent-primary"
        />
        <div className="flex justify-between text-[10px] text-slate-500 mt-1">
          <span>1x</span>
          <span>10x</span>
        </div>
      </div>

      {/* Backend status indicator */}
      <div className="absolute top-4 right-4 z-40">
        <div className={`bg-slate-800/95 backdrop-blur-sm border px-3 py-2 rounded-lg flex items-center gap-2 shadow-lg ${
          backendAvailable ? 'border-green-500/30' : 'border-orange-500/30'
        }`}>
          <span className={`size-2 rounded-full ${backendAvailable ? 'bg-green-500' : 'bg-orange-400'}`}></span>
          <span className="text-xs font-semibold text-slate-300">
            {backendAvailable ? 'API Connected' : 'API Offline'}
          </span>
        </div>
      </div>

      {/* DeckGL Map */}
      <DeckGL
        viewState={viewState}
        onViewStateChange={({ viewState: newViewState }) => setViewState(newViewState as typeof INITIAL_VIEW_STATE)}
        controller={true}
        layers={!loading && !error ? layers : []}
        getTooltip={getTooltip}
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
