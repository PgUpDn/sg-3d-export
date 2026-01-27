import React, { useState, useEffect, useCallback } from 'react';
import DeckGL from '@deck.gl/react';
import { GeoJsonLayer } from '@deck.gl/layers';
import { Map } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';

// Singapore center coordinates
const INITIAL_VIEW_STATE = {
  longitude: 103.8198,
  latitude: 1.3521,
  zoom: 11,
  pitch: 45,
  bearing: 0
};

// Free map style
const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';

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
  const [buildings, setBuildings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewState, setViewState] = useState(INITIAL_VIEW_STATE);
  const [stats, setStats] = useState({ count: 0, loaded: false });

  // Get API base URL
  const getApiBaseUrl = () => {
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      return 'http://localhost:8000';
    }
    return 'https://52.203.122.189.nip.io';
  };

  // Fetch building data
  const fetchBuildings = useCallback(async () => {
    if (!backendAvailable) {
      setError('Backend not available');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Limit to 30000 buildings for performance (still ~10MB)
      const response = await fetch(`${getApiBaseUrl()}/api/buildings/geojson?limit=30000`, {
        signal: AbortSignal.timeout(60000) // 60 second timeout
      });
      if (!response.ok) throw new Error('Failed to fetch buildings');
      
      const data = await response.json();
      setBuildings(data);
      setStats({ count: data.features.length, loaded: true });
      setLoading(false);
    } catch (err: any) {
      console.error('Error fetching buildings:', err);
      setError(err.message || 'Request timed out');
      setLoading(false);
    }
  }, [backendAvailable]);

  useEffect(() => {
    fetchBuildings();
  }, [fetchBuildings]);

  // Create the 3D buildings layer
  const layers = buildings ? [
    new GeoJsonLayer({
      id: 'buildings-3d',
      data: buildings,
      extruded: true,
      wireframe: false,
      opacity: 0.8,
      getElevation: (f: any) => f.properties.height || 10,
      getFillColor: (f: any) => {
        // Color based on height
        const height = f.properties.height || 10;
        if (height > 100) return [59, 130, 246, 200]; // Blue for tall
        if (height > 50) return [16, 185, 129, 200];  // Green for medium
        return [99, 102, 241, 200]; // Indigo for short
      },
      getLineColor: [80, 80, 80],
      lineWidthMinPixels: 1,
      pickable: true,
      autoHighlight: true,
      highlightColor: [255, 200, 0, 200],
    })
  ] : [];

  return (
    <div className="relative w-full h-full">
      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 bg-white/80 z-50 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm font-semibold text-slate-600">Loading 3D buildings...</p>
          </div>
        </div>
      )}

      {/* Error message */}
      {error && !loading && (
        <div className="absolute inset-0 bg-white/90 z-50 flex items-center justify-center">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md text-center">
            <div className="text-4xl mb-3">⚠️</div>
            <h3 className="text-red-800 font-bold mb-2">Error Loading Buildings</h3>
            <p className="text-red-600 text-sm mb-1">{error}</p>
            <p className="text-red-400 text-xs mb-4">API: {getApiBaseUrl()}</p>
            <button 
              onClick={fetchBuildings}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Stats panel */}
      <div className="absolute top-4 left-4 z-40 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg p-4 border border-slate-200">
        <h3 className="font-bold text-slate-800 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">apartment</span>
          Singapore 3D Buildings
        </h3>
        <div className="mt-2 text-sm text-slate-600">
          <p><span className="font-semibold">{stats.count.toLocaleString()}</span> buildings loaded</p>
        </div>
        <div className="mt-3 flex gap-2 text-xs">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-indigo-500"></span>
            &lt;50m
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-green-500"></span>
            50-100m
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-blue-500"></span>
            &gt;100m
          </span>
        </div>
      </div>

      {/* View controls */}
      <div className="absolute bottom-8 left-4 z-40 flex flex-col gap-2">
        <button 
          onClick={() => setViewState(v => ({ ...v, pitch: Math.min(v.pitch + 10, 80) }))}
          className="size-10 bg-white border border-slate-200 rounded-lg flex items-center justify-center hover:bg-slate-50 shadow-md"
          title="Increase pitch"
        >
          <span className="material-symbols-outlined">expand_less</span>
        </button>
        <button 
          onClick={() => setViewState(v => ({ ...v, pitch: Math.max(v.pitch - 10, 0) }))}
          className="size-10 bg-white border border-slate-200 rounded-lg flex items-center justify-center hover:bg-slate-50 shadow-md"
          title="Decrease pitch"
        >
          <span className="material-symbols-outlined">expand_more</span>
        </button>
        <button 
          onClick={() => setViewState(v => ({ ...v, bearing: v.bearing + 15 }))}
          className="size-10 bg-white border border-slate-200 rounded-lg flex items-center justify-center hover:bg-slate-50 shadow-md"
          title="Rotate"
        >
          <span className="material-symbols-outlined">rotate_right</span>
        </button>
        <button 
          onClick={() => setViewState(INITIAL_VIEW_STATE)}
          className="size-10 bg-white border border-slate-200 rounded-lg flex items-center justify-center hover:bg-slate-50 shadow-md"
          title="Reset view"
        >
          <span className="material-symbols-outlined">restart_alt</span>
        </button>
      </div>

      {/* Pitch indicator */}
      <div className="absolute bottom-8 right-4 z-40 bg-white/95 backdrop-blur-sm rounded-lg shadow-md px-3 py-2 border border-slate-200">
        <div className="text-xs text-slate-500">Pitch: {viewState.pitch.toFixed(0)}°</div>
        <div className="text-xs text-slate-500">Bearing: {viewState.bearing.toFixed(0)}°</div>
      </div>

      {/* DeckGL Map */}
      <DeckGL
        viewState={viewState}
        onViewStateChange={({ viewState: newViewState }: any) => setViewState(newViewState)}
        controller={true}
        layers={layers}
        getTooltip={({ object }: any) => object && {
          html: `<div class="p-2 bg-white rounded shadow-lg">
            <div class="font-bold text-slate-800">Building</div>
            <div class="text-sm text-slate-600">Height: ${object.properties.height?.toFixed(1) || 'N/A'}m</div>
          </div>`,
          style: {
            backgroundColor: 'transparent',
            border: 'none'
          }
        }}
      >
        <Map
          mapStyle={MAP_STYLE}
          attributionControl={false}
        />
      </DeckGL>
    </div>
  );
};

export default Explorer3D;
