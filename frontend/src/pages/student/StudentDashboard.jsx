import React, { useState, useEffect } from 'react';
import { 
  Zap, 
  Activity, 
  Gauge, 
  DollarSign, 
  TrendingUp, 
  Clock, 
  AlertTriangle, 
  ShieldCheck, 
  RefreshCw,
  Home,
  User,
  Calendar
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid 
} from 'recharts';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';

export default function StudentDashboard() {
  const { user } = useAuth();
  const { liveReadings, subscribeRoom } = useSocket();

  const assignedRoom = user?.assignedRooms?.[0];
  const roomId = assignedRoom?.roomId || assignedRoom?.roomCode || 'G024';

  const [roomData, setRoomData] = useState(null);
  const [readings, setReadings] = useState([]);
  const [summary, setSummary] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Time range selector
  const [timeRange, setTimeRange] = useState('24h');

  useEffect(() => {
    if (!roomId) return;
    subscribeRoom(roomId);

    async function loadStudentData() {
      setLoading(true);
      try {
        const [roomRes, readingsRes, summaryRes, alertsRes] = await Promise.all([
          api.get(`/rooms/${roomId}`),
          api.get(`/rooms/${roomId}/readings?limit=60`),
          api.get(`/rooms/${roomId}/summary`),
          api.get('/alerts')
        ]);

        if (roomRes.success) setRoomData(roomRes.data);
        if (readingsRes.success) setReadings(readingsRes.data);
        if (summaryRes.success) setSummary(summaryRes.summary);
        if (alertsRes.success) setAlerts(alertsRes.data);
      } catch (err) {
        console.error('Failed to load student room telemetry:', err);
      } finally {
        setLoading(false);
      }
    }

    loadStudentData();
    const interval = setInterval(loadStudentData, 15000);
    return () => clearInterval(interval);
  }, [roomId]);

  // Live real-time socket telemetry overrides
  const live = roomData ? (liveReadings[roomData.device?.deviceUid] || liveReadings[roomData.roomCode] || liveReadings[roomData.id]) : null;
  const currentPowerW = live ? live.powerW : (roomData?.device?.lastPowerW || 0);
  const voltageV = live ? live.voltageV : 230.0;
  const currentA = live ? live.currentA : ((currentPowerW / (230 * 0.9)).toFixed(2));
  const cumulativeKWh = live ? live.cumulativeEnergyKWh : (roomData?.device?.lastEnergyKWh || 0);

  const thresholdW = roomData?.highPowerThresholdW || 800.0;
  const isHighLoad = currentPowerW > thresholdW;

  // Budget calculations
  const monthlyBudget = roomData?.budget?.amount || 1200.0;
  const currentMonthCost = summary?.estimatedCostMonth || 0;
  const budgetPercent = Math.min(100, Math.round((currentMonthCost / monthlyBudget) * 100));

  // Chart preparation
  const chartPoints = [...readings].reverse().map(r => ({
    time: new Date(r.eventTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    power: r.powerW
  }));

  if (live && chartPoints.length > 0) {
    chartPoints.push({
      time: 'Live',
      power: live.powerW
    });
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
              My Assigned Room: <span className="text-blue-400 font-mono">{roomData?.roomCode || assignedRoom?.roomCode}</span>
            </h1>
            <span className="px-2.5 py-1 rounded bg-blue-500/10 text-blue-400 font-semibold text-xs border border-blue-500/20">
              {roomData?.floor?.displayName || 'Ground Floor'}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Personal energy consumption tracker, transparent tariff estimates, and threshold alerts for your room.
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs font-mono bg-slate-950 px-3.5 py-2 rounded-xl border border-slate-800">
          <span className="text-slate-400">Virtual Meter:</span>
          <strong className="text-slate-200">{roomData?.device?.deviceUid || 'Active'}</strong>
        </div>
      </div>

      {loading && !roomData ? (
        <div className="flex items-center justify-center py-24 text-slate-400 text-sm">
          <RefreshCw className="w-5 h-5 animate-spin mr-2 text-blue-500" /> Fetching your room's real-time telemetry...
        </div>
      ) : (
        <>
          {/* Real-time KPI Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            
            {/* Real-Time Power */}
            <div className={`p-5 rounded-2xl border transition shadow-xl ${
              isHighLoad 
                ? 'bg-rose-950/40 border-rose-600 alert-pulse' 
                : 'bg-slate-900 border-slate-800'
            }`}>
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-medium uppercase tracking-wide">Current Power</span>
                <Zap className={`w-4 h-4 ${isHighLoad ? 'text-rose-400 animate-bounce' : 'text-amber-400'}`} />
              </div>
              <div className="mt-2 text-3xl font-black text-white font-mono flex items-baseline gap-1">
                {currentPowerW.toFixed(1)} <span className="text-sm font-normal text-slate-400">W</span>
              </div>
              <div className="mt-2 text-[11px] text-slate-400">
                {isHighLoad ? (
                  <span className="text-rose-400 font-bold">⚠️ Exceeds {thresholdW}W threshold!</span>
                ) : (
                  <span className="text-emerald-400 font-medium">✓ Normal appliance load</span>
                )}
              </div>
            </div>

            {/* Today Energy */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-medium uppercase tracking-wide">Today's Usage</span>
                <Gauge className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="mt-2 text-3xl font-black text-white font-mono flex items-baseline gap-1">
                {summary?.todayEnergyKWh ?? '0.00'} <span className="text-sm font-normal text-slate-400">kWh</span>
              </div>
              <div className="mt-2 text-[11px] text-cyan-400">
                Est. Cost Today: ₹{summary?.estimatedCostToday ?? '0.00'}
              </div>
            </div>

            {/* Monthly Cumulative Energy */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-medium uppercase tracking-wide">Monthly Energy</span>
                <Calendar className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="mt-2 text-3xl font-black text-white font-mono flex items-baseline gap-1">
                {summary?.monthEnergyKWh ?? '0.00'} <span className="text-sm font-normal text-slate-400">kWh</span>
              </div>
              <div className="mt-2 text-[11px] text-slate-400 font-mono">
                Meter Total: {cumulativeKWh.toFixed(2)} kWh
              </div>
            </div>

            {/* Estimated Bill & Rate */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-medium uppercase tracking-wide">Month Projected Cost</span>
                <DollarSign className="w-4 h-4 text-blue-400" />
              </div>
              <div className="mt-2 text-3xl font-black text-white font-mono flex items-baseline gap-1">
                ₹{summary?.estimatedCostMonth ?? '0.00'}
              </div>
              <div className="mt-2 text-[11px] text-slate-400">
                Tariff: ₹{summary?.tariffRate || 7.50}/kWh
              </div>
            </div>

          </div>

          {/* Budget Progress Bar Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Monthly Energy Budget Tracker
                </span>
                <p className="text-[11px] text-slate-400">
                  Target allocation: ₹{monthlyBudget.toFixed(2)} / month
                </p>
              </div>
              <span className={`text-sm font-black font-mono ${
                budgetPercent > 90 ? 'text-rose-400' : budgetPercent > 70 ? 'text-amber-400' : 'text-emerald-400'
              }`}>
                {budgetPercent}% Used (₹{currentMonthCost} / ₹{monthlyBudget})
              </span>
            </div>

            <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-800 p-0.5">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  budgetPercent > 90 ? 'bg-rose-500' : budgetPercent > 70 ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${budgetPercent}%` }}
              />
            </div>
          </div>

          {/* Real-Time Power Consumption Graph */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Activity className="w-4 h-4 text-blue-400" /> Live Room Power Telemetry (Watts)
                </h3>
                <p className="text-[11px] text-slate-400">
                  Real-time power stream received directly from virtual meter {roomData?.device?.deviceUid}
                </p>
              </div>

              <div className="flex items-center space-x-1.5 text-xs bg-slate-950 p-1 rounded-lg border border-slate-800">
                {['24h', '7d', '30d'].map((range) => (
                  <button
                    key={range}
                    onClick={() => setTimeRange(range)}
                    className={`px-3 py-1 rounded-md font-semibold transition ${
                      timeRange === range ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {range.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-64 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartPoints} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="time" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} unit=" W" />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }} />
                  <Line 
                    type="monotone" 
                    dataKey="power" 
                    stroke="#38bdf8" 
                    strokeWidth={2.5} 
                    dot={false}
                    isAnimationActive={false} 
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Room Incidents & Alerts */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" /> Notifications & Incident History for Room {roomData?.roomCode}
            </h3>

            {alerts.length === 0 ? (
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 text-xs flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>No active alerts. Your room is operating within normal energy thresholds.</span>
              </div>
            ) : (
              <div className="space-y-2">
                {alerts.map(a => (
                  <div key={a.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs flex items-center justify-between">
                    <div>
                      <div className="font-bold text-white flex items-center gap-2">
                        <span>{a.alertType}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono uppercase ${
                          a.status === 'TRIGGERED' ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'
                        }`}>
                          {a.status}
                        </span>
                      </div>
                      <p className="text-slate-400 mt-0.5">{a.message}</p>
                    </div>
                    <span className="text-[10px] text-slate-500 whitespace-nowrap">
                      {new Date(a.triggeredAt).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

    </div>
  );
}
