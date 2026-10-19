import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Download, 
  TrendingUp, 
  Layers, 
  Award, 
  DollarSign, 
  Calendar,
  RefreshCw,
  FileSpreadsheet
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  Cell 
} from 'recharts';
import { api } from '../../services/api';

export default function Analytics() {
  const [overview, setOverview] = useState(null);
  const [topRooms, setTopRooms] = useState([]);
  const [floorStats, setFloorStats] = useState([]);
  const [tariff, setTariff] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    async function loadAnalytics() {
      setLoading(true);
      try {
        const [ovRes, roomsRes, floorsRes, tariffRes] = await Promise.all([
          api.get('/analytics/overview'),
          api.get('/analytics/rooms?limit=10'),
          api.get('/analytics/floors'),
          api.get('/tariffs')
        ]);

        if (ovRes.success) setOverview(ovRes.data);
        if (roomsRes.success) setTopRooms(roomsRes.data);
        if (floorsRes.success) setFloorStats(floorsRes.data);
        if (tariffRes.success) setTariff(tariffRes.activeTariff);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadAnalytics();
  }, []);

  const handleExportCSV = async () => {
    setDownloading(true);
    try {
      const blob = await api.get('/analytics/export/csv?limit=2000');
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `wattwise-energy-telemetry-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(`Export failed: ${err.message}`);
    } finally {
      setDownloading(false);
    }
  };

  const floorColors = ['#3b82f6', '#8b5cf6', '#06b6d4'];

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            Energy Consumption & Cost Analytics
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Hostel-wide electrical data intelligence, floor comparisons, room rankings, and telemetry exports.
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          disabled={downloading}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 flex items-center gap-2 transition disabled:opacity-50"
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>{downloading ? 'Generating CSV...' : 'Export Telemetry CSV'}</span>
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24 text-slate-400 text-sm">
          <RefreshCw className="w-5 h-5 animate-spin mr-2 text-blue-500" /> Computing energy models & trends...
        </div>
      ) : (
        <>
          {/* Key Analytics KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-xs text-slate-400 font-medium">Hostel Total Power Load</span>
              <div className="mt-2 text-2xl font-black text-white font-mono">
                {overview?.summary?.currentTotalPowerKW} kW
              </div>
              <span className="text-[11px] text-amber-400 mt-1 block">
                Across 211 Virtual Meters
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-xs text-slate-400 font-medium">Daily Cumulative Energy</span>
              <div className="mt-2 text-2xl font-black text-white font-mono">
                {overview?.summary?.todayTotalEnergyKWh} kWh
              </div>
              <span className="text-[11px] text-cyan-400 mt-1 block">
                Integrated from midnight
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-xs text-slate-400 font-medium">Projected Cost Today</span>
              <div className="mt-2 text-2xl font-black text-white font-mono">
                ₹{overview?.summary?.estimatedCostToday}
              </div>
              <span className="text-[11px] text-emerald-400 mt-1 block">
                Tariff: ₹{overview?.summary?.tariffRate}/kWh
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-xs text-slate-400 font-medium">Active Tariffs & Slabs</span>
              <div className="mt-2 text-lg font-bold text-white truncate">
                {tariff?.name || 'Standard Hostel Tariff'}
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block font-mono">
                Type: {tariff?.tariffType || 'FLAT'}
              </span>
            </div>

          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Floor Power Comparison */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <Layers className="w-4 h-4 text-blue-400" /> Floor Power Demand Comparison (kW)
                </h3>
              </div>

              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={floorStats} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="displayName" stroke="#64748b" fontSize={11} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={11} tickLine={false} unit=" kW" />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }} />
                    <Bar dataKey="currentPowerKW" radius={[6, 6, 0, 0]}>
                      {floorStats.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={floorColors[index % floorColors.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800 text-center text-xs">
                {floorStats.map((f, i) => (
                  <div key={f.id} className="p-2 rounded bg-slate-950 font-mono">
                    <div className="text-slate-400 text-[10px]">{f.displayName}</div>
                    <div className="font-bold text-white mt-0.5">{f.currentPowerKW} kW</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Consuming Rooms Ranking */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-400" /> Top Electrical Loads (Rooms & Facilities)
                </h3>
                <span className="text-[10px] text-slate-400">Live Watts</span>
              </div>

              <div className="max-h-64 overflow-y-auto divide-y divide-slate-800">
                {topRooms.map((room, rank) => (
                  <div key={room.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-3">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] ${
                        rank === 0 ? 'bg-amber-500 text-black' :
                        rank === 1 ? 'bg-slate-300 text-black' :
                        rank === 2 ? 'bg-amber-700 text-white' :
                        'bg-slate-800 text-slate-400'
                      }`}>
                        {rank + 1}
                      </span>
                      <div>
                        <div className="font-bold text-white flex items-center gap-1.5">
                          <span>{room.displayName}</span>
                          <span className="font-mono text-[10px] text-blue-400">({room.roomCode})</span>
                        </div>
                        <div className="text-[10px] text-slate-400">{room.floor}</div>
                      </div>
                    </div>

                    <div className="text-right font-mono">
                      <div className="font-bold text-white text-sm">
                        {room.currentPowerW.toFixed(1)} W
                      </div>
                      <span className="text-[10px] text-slate-400">{room.status}</span>
                    </div>
                  </div>
                ))}
              </div>

            </div>

          </div>
        </>
      )}

    </div>
  );
}
