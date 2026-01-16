
import React from 'react';
import { SelectionStats } from '../types';
import MeshPreview from './MeshPreview';
import { MeshPreviewData } from '../services/apiService';

interface SidebarProps {
  stats: SelectionStats;
  onDownload: () => void;
  insight: string | null;
  meshPreview?: MeshPreviewData | null;
  meshLoading?: boolean;
  meshError?: string | null;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  stats, 
  onDownload, 
  insight, 
  meshPreview,
  meshLoading,
  meshError 
}) => {
  return (
    <aside className="w-[420px] bg-white border-l border-slate-200 flex flex-col z-30 overflow-y-auto shadow-xl">
      <div className="p-6 space-y-8 flex-1">
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xl font-bold tracking-tight text-slate-900">Export Selection</h3>
            <span className="material-symbols-outlined text-slate-400 cursor-pointer hover:text-slate-600 transition-colors">close</span>
          </div>
          <p className="text-slate-500 text-sm font-medium">Review geometry clipping and metadata before final asset generation.</p>
        </div>

        {/* 3D Geometry Preview */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Geometry Preview</span>
            <span className="text-[10px] text-slate-400 uppercase font-bold">
              {meshPreview ? 'Live 3D' : 'Optimized Mesh'}
            </span>
          </div>
          
          <MeshPreview 
            meshData={meshPreview || null}
            loading={meshLoading}
            error={meshError}
          />
        </div>

        {/* Spatial Metadata */}
        <div className="space-y-4">
          <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Spatial Metadata</span>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex flex-col gap-1">
              <div className="flex items-center gap-2 text-slate-400">
                <span className="material-symbols-outlined text-sm">apartment</span>
                <span className="text-[10px] uppercase font-bold tracking-tight">Buildings</span>
              </div>
              <span className="text-lg font-bold text-slate-800">{stats.buildings}</span>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex flex-col gap-1">
              <div className="flex items-center gap-2 text-slate-400">
                <span className="material-symbols-outlined text-sm">database</span>
                <span className="text-[10px] uppercase font-bold tracking-tight">Est. Size</span>
              </div>
              <span className="text-lg font-bold text-slate-800">{stats.fileSize}</span>
            </div>
          </div>
        </div>

        {/* Urban Insight (AI Feature) */}
        {insight && (
          <div className="p-4 rounded-xl bg-cyan-50 border border-cyan-100 space-y-2">
             <div className="flex items-center gap-2 text-cyan-700">
                <span className="material-symbols-outlined text-sm">auto_awesome</span>
                <span className="text-[10px] uppercase font-bold tracking-tight">Urban Context</span>
              </div>
              <p className="text-xs text-cyan-900/70 font-medium leading-relaxed">
                {insight}
              </p>
          </div>
        )}

        {/* Processing Status */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Process Info</span>
            <span className="text-xs font-bold text-primary">{stats.progress}% {stats.status}</span>
          </div>
          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-300" 
              style={{ width: `${stats.progress}%` }}
            ></div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-4 pt-4">
          <button 
            onClick={onDownload}
            disabled={stats.status !== 'Ready'}
            className={`w-full py-4 font-bold rounded-xl flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-lg ${
              stats.status === 'Ready' 
                ? 'bg-primary text-white hover:opacity-95 shadow-cyan-200' 
                : 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none'
            }`}
          >
            <span className="material-symbols-outlined">download</span>
            <span className="text-base">Generate STL</span>
          </button>
        </div>
      </div>

      <div className="mt-auto p-6 border-t border-slate-100 bg-slate-50/50">
        <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase font-bold tracking-tight">
          <span>v4.2 PRO</span>
          <span>LAT: 1.2847</span>
          <span>LNG: 103.8597</span>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
