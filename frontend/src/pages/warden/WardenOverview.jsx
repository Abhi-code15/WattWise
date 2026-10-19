import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Building2, 
  Cpu, 
  AlertTriangle, 
  Zap, 
  Gauge, 
  DollarSign, 
  Layers, 
  ArrowRight, 
  Radio, 
  Clock, 
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import { api } from '../../services/api';
import { useSocket } from '../../context/SocketContext';
import RoomDetailModal from '../../components/RoomDetailModal';

export default function WardenOverview() {
  const { liveReadings } = useSocket();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedRoomId, setSelectedRoomId] = useState(null);

  const fetchOverview = async () => {
    try {
      const res = await api.get('/analytics/overview');
      if (res.success) {
        setData(res.data);
      }
    } catch (err) {
      console.error('Failed to load overview:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
    const interval = setInterval(fetchOverview, 15000);
    return () => clearInterval(interval);
  }, []);

  // Compute live adjusted total power if socket readings arrive
  let currentKW = data?.summary?.currentTotalPowerKW || 0;
  // If we have live socket telemetry, calculate sum
  const liveCount = Object.keys(liveReadings).length;

  const floorColors = {
    GROUND: '#3b82f6',
    SECOND: '#8b5cf6',
    THIRD: '#06b6d4'
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner / Heading */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            Hostel Energy Intelligence Overview
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time telemetry and electrical load monitoring across all 3 floors & shared facilities.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Link
            to="/warden/simulator"
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-blue-400 text-xs font-bold border border-slate-700 flex items-center gap-1.5 transition"
          >
            <Radio className="w-4 h-4 animate-pulse text-amber-400" />
            <span>Simulator Console</span>
          </Link>
          <Link
            to="/warden/floors"
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 flex items-center gap-1.5 transition"
          >
            <span>Open Interactive Map</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {loading && !data ? (
        <div className="flex items-center justify-center py-24 text-slate-400 text-sm">
          <RefreshCw className="w-5 h-5 animate-spin mr-2 text-blue-500" /> Fetching hostel telemetry aggregates...
        </div>
      ) : (
        <>
          {/* High-Level Metric Stat Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4">
            
            {/* Total Monitored Rooms */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-medium">Monitored Rooms</span>
                <Building2 className="w-4 h-4 text-blue-400" />
              </div>
              <div className="mt-2 text-2xl font-black text-white font-mono">
                {data?.summary?.totalMonitoredRooms || 211}
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">
                200 Res. + 11 Shared
              </span>
            </div>

            {/* Online Meters */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-medium">Online Meters</span>
                <Cpu className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="mt-2 text-2xl font-black text-emerald-400 font-mono">
                {data?.summary?.onlineMeters || 0}
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">
                Offline: <strong className="text-rose-400">{data?.summary?.offlineMeters || 0}</strong>
              </span>
            </div>

            {/* Active Alerts */}
            <div className={`p-4 rounded-2xl border shadow-md ${
              (data?.summary?.activeAlertsCount || 0) > 0 
                ? 'bg-rose-950/30 border-rose-800' 
                : 'bg-slate-900 border-slate-800'
            }`}>
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-medium">Active Alerts</span>
                <AlertTriangle className={`w-4 h-4 ${(data?.summary?.activeAlertsCount || 0) > 0 ? 'text-rose-400 animate-bounce' : 'text-slate-400'}`} />
              </div>
              <div className={`mt-2 text-2xl font-black font-mono ${(data?.summary?.activeAlertsCount || 0) > 0 ? 'text-rose-400' : 'text-slate-300'}`}>
                {data?.summary?.activeAlertsCount || 0}
              </div>
              <Link to="/warden/alerts" className="text-[10px] text-rose-400 hover:underline mt-1 block font-semibold">
                Inspect Alerts &rarr;
              </Link>
            </div>

            {/* Current Total Power */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-medium">Total Power Load</span>
                <Zap className="w-4 h-4 text-amber-400" />
              </div>
              <div className="mt-2 text-2xl font-black text-white font-mono flex items-baseline gap-1">
                {currentKW} <span className="text-xs font-normal text-slate-400">kW</span>
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">
                {data?.summary?.currentTotalPowerW?.toLocaleString() || 0} Watts
              </span>
            </div>

            {/* Today Total Energy */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-medium">Today's Energy</span>
                <Gauge className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="mt-2 text-2xl font-black text-white font-mono flex items-baseline gap-1">
                {data?.summary?.todayTotalEnergyKWh || '0.00'} <span className="text-xs font-normal text-slate-400">kWh</span>
              </div>
              <span className="text-[10px] text-cyan-400 mt-1 block">
                Since midnight
              </span>
            </div>

            {/* Estimated Energy Cost */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-medium">Estimated Cost</span>
                <DollarSign className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="mt-2 text-2xl font-black text-white font-mono flex items-baseline gap-1">
                ₹{data?.summary?.estimatedCostToday || '0.00'}
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">
                Tariff: ₹{data?.summary?.tariffRate}/kWh
              </span>
            </div>

          </div>

          {/* Floor Breakdown & Real-Time Load Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Floor Cards */}
            <div className="lg:col-span-2 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-200 tracking-wide uppercase flex items-center gap-2">
                  <Layers className="w-4 h-4 text-blue-400" /> Floor Power Breakdown
                </h3>
                <span className="text-xs text-slate-400">Real-Time Sensor Telemetry</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {data?.floorBreakdown?.map((floor) => (
                  <div key={floor.floorCode} className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">{floor.displayName}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                        {floor.totalRooms} Rooms
                      </span>
                    </div>

                    <div className="mt-3">
                      <div className="text-xl font-black text-white font-mono">
                        {floor.powerKW} <span className="text-xs font-normal text-slate-400">kW</span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {floor.powerW.toLocaleString()} W load
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Online Meters:</span>
                      <span className="font-semibold text-emerald-400">{floor.onlineDevices} / {floor.totalRooms}</span>
                    </div>

                    <Link
                      to={`/warden/floors?floor=${floor.floorCode}`}
                      className="mt-3 block text-center py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-blue-400 text-xs font-semibold transition"
                    >
                      View Floor Map &rarr;
                    </Link>
                  </div>
                ))}
              </div>

              {/* Chart */}
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-300 uppercase">Power Distribution (kW)</span>
                </div>
                <div className="h-40 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data?.floorBreakdown || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <XAxis dataKey="displayName" stroke="#64748b" fontSize={11} tickLine={false} />
                      <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }} />
                      <Bar dataKey="powerKW" radius={[4, 4, 0, 0]}>
                        {data?.floorBreakdown?.map((entry) => (
                          <Cell key={entry.floorCode} fill={floorColors[entry.floorCode] || '#3b82f6'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

            </div>

            {/* Recent Incident Feed */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-200 tracking-wide uppercase flex items-center gap-2">
                  <Clock className="w-4 h-4 text-rose-400" /> Recent Incidents
                </h3>
                <Link to="/warden/alerts" className="text-xs text-blue-400 hover:underline">
                  All ({data?.summary?.activeAlertsCount || 0})
                </Link>
              </div>

              <div className="space-y-2.5 flex-1 overflow-y-auto">
                {data?.recentAlerts?.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-xs flex flex-col items-center">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500/50 mb-2" />
                    <span>No active alerts. All meters within safe operational thresholds.</span>
                  </div>
                ) : (
                  data?.recentAlerts?.map((alert) => (
                    <div 
                      key={alert.id}
                      onClick={() => alert.roomId && setSelectedRoomId(alert.roomId)}
                      className="p-3 rounded-xl bg-slate-850 hover:bg-slate-800 border border-slate-750 transition cursor-pointer group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-white group-hover:text-blue-400 transition">
                          {alert.room?.roomCode || 'Shared Area'}
                        </span>
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase font-semibold ${
                          alert.status === 'TRIGGERED' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                          alert.status === 'ACKNOWLEDGED' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                          'bg-emerald-500/20 text-emerald-400'
                        }`}>
                          {alert.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-1 line-clamp-2">
                        {alert.message}
                      </p>
                      <span className="text-[10px] text-slate-400 mt-1 block">
                        {new Date(alert.triggeredAt).toLocaleTimeString()} • Click to view room
                      </span>
                    </div>
                  ))
                )}
              </div>

            </div>

          </div>
        </>
      )}

      {/* Selected Room Modal */}
      {selectedRoomId && (
        <RoomDetailModal 
          roomId={selectedRoomId} 
          onClose={() => setSelectedRoomId(null)} 
        />
      )}

    </div>
  );
}
