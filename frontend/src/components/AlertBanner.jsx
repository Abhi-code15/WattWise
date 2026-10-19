import React from 'react';
import { AlertTriangle, X, ShieldAlert, Radio } from 'lucide-react';
import { useSocket } from '../context/SocketContext';

export default function AlertBanner() {
  const { latestAlert, clearLatestAlert } = useSocket();

  if (!latestAlert) return null;

  const isCritical = latestAlert.severity === 'CRITICAL';

  return (
    <aside 
      aria-label="Real-time alert banner" 
      className={`relative z-40 border-b px-4 py-3 shadow-lg transition-all ${
        isCritical 
          ? 'bg-rose-950/90 border-rose-600 text-rose-100 alert-pulse' 
          : 'bg-amber-950/90 border-amber-600 text-amber-100'
      }`}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className={`p-1.5 rounded-lg ${isCritical ? 'bg-rose-600/30 text-rose-400' : 'bg-amber-600/30 text-amber-400'}`}>
            <AlertTriangle className="w-5 h-5 animate-bounce" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-sm tracking-wide uppercase">
                {latestAlert.type?.replace(/_/g, ' ')}
              </span>
              <span className="text-xs px-2 py-0.5 rounded bg-black/30 font-mono">
                {latestAlert.roomCode || 'Facility'}
              </span>
              <span className="text-xs opacity-75">
                {new Date(latestAlert.triggeredAt).toLocaleTimeString()}
              </span>
            </div>
            <p className="text-xs mt-0.5 opacity-90 line-clamp-1">
              {latestAlert.message}
            </p>
          </div>
        </div>

        <button
          onClick={clearLatestAlert}
          className="p-1 rounded-md hover:bg-black/20 text-slate-300 hover:text-white transition"
          title="Dismiss banner"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
}
