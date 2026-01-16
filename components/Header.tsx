
import React from 'react';
import { AppRoute } from '../types';

interface HeaderProps {
  activeRoute: AppRoute;
  setActiveRoute: (route: AppRoute) => void;
}

const Header: React.FC<HeaderProps> = ({ activeRoute, setActiveRoute }) => {
  const routes = [AppRoute.EXPLORER, AppRoute.EXPORT_MANAGER, AppRoute.ANALYTICS, AppRoute.ARCHIVE];

  return (
    <header className="flex items-center justify-between border-b border-border-light bg-white px-6 py-3 z-50 shadow-sm">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3">
          <div className="size-8 bg-primary rounded flex items-center justify-center text-white">
            <span className="material-symbols-outlined font-bold">view_in_ar</span>
          </div>
          <h1 className="text-lg font-bold tracking-tight text-slate-800">SG 3D Export</h1>
        </div>
        
        <nav className="hidden md:flex items-center gap-6 ml-8">
          {routes.map((route) => (
            <button
              key={route}
              onClick={() => setActiveRoute(route)}
              className={`text-sm font-semibold transition-all pb-1 border-b-2 ${
                activeRoute === route 
                  ? 'border-primary text-primary' 
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              {route}
            </button>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative group">
          <input 
            type="text" 
            placeholder="Search coordinates..."
            className="bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-4 py-1.5 text-sm focus:ring-1 focus:ring-primary focus:border-primary w-64 outline-none transition-all text-slate-600"
          />
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
        </div>
        
        <div className="flex gap-2">
          <button className="p-2 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 transition-colors text-slate-600">
            <span className="material-symbols-outlined text-xl">settings</span>
          </button>
          <button className="p-2 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 transition-colors text-slate-600">
            <span className="material-symbols-outlined text-xl">help</span>
          </button>
          <div className="size-10 rounded-full border border-slate-200 overflow-hidden bg-cover bg-center cursor-pointer hover:opacity-80 transition-opacity" style={{ backgroundImage: "url('https://picsum.photos/100/100')" }}></div>
        </div>
      </div>
    </header>
  );
};

export default Header;
