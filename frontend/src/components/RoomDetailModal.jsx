import React, { useState, useEffect } from 'react';
import { 
  X, 
  Zap, 
  Activity, 
  User, 
  Clock, 
  AlertTriangle, 
  ShieldCheck, 
  Gauge, 
  DollarSign, 
  Flame, 
  WifiOff, 
  RotateCcw,
  RefreshCw
} from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts';
import { api } from '../services/api';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';

export default function RoomDetailModal({ roomId, onClose }) {
  const { user } = useAuth();
  const { liveReadings, subscribeRoom } = useSocket();

  const [roomData, setRoomData] = useState(null);
  const [readings, setReadings] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionMessage, setActionMessage] = useState(null);

  useEffect(() => {
    if (!roomId) return;

    subscribeRoom(roomId);

    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const [roomRes, readingsRes, summaryRes] = await Promise.all([
          api.get(`/rooms/${roomId}`),
          api.get(`/rooms/${roomId}/readings?limit=30`),
          api.get(`/rooms/${roomId}/summary`)
        ]);

        if (roomRes.success) setRoomData(roomRes.data);
        if (readingsRes.success) setReadings(readingsRes.data);
        if (summaryRes.success) setSummary(summaryRes.summary);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [roomId]);

  // Keep readings and live metrics updated from Socket.IO
  const live = roomData ? (liveReadings[roomData.device?.deviceUid] || liveReadings[roomData.roomCode] || liveReadings[roomData.id]) : null;
  const currentPowerW = live ? live.powerW : (roomData?.device?.lastPowerW || 0);
  const currentVoltageV = live ? live.voltageV : 230.0;
  const currentCurrentA = live ? live.currentA : ((currentPowerW / (230 * 0.9)).toFixed(2));
  const currentPF = live ? live.powerFactor : 0.90;
  const cumulativeEnergyKWh = live ? live.cumulativeEnergyKWh : (roomData?.device?.lastEnergyKWh || 0);

  // Update chart data dynamically when live reading arrives
  const chartData = [...readings].reverse().map((r, index) => ({
    time: new Date(r.eventTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    power: r.powerW
  }));

  if (live && chartData.length > 0) {
    chartData.push({
      time: 'Live',
      power: live.powerW
    });
  }

  // Warden Simulation Scenario Shortcut Trigger
  const triggerScenario = async (scenarioType, powerW) => {
    setActionMessage(null);
    try {
      const res = await api.post('/simulator/scenarios', {
        roomCode: roomData.roomCode,
        scenarioType,
        powerW,
        durationCycles: 15
      });
      if (res.success) {
        setActionMessage(`Triggered ${scenarioType} successfully`);
        setTimeout(() => setActionMessage(null), 4000);
      }
    } catch (err) {
      setActionMessage(`Error: ${err.message}`);
    }
  };

  if (!roomId) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex justify-end">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 h-full min-h-screen flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40">
          <div>
            <div className="flex items-center space-x-3">
              <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                {roomData?.displayName || roomId}
              </h2>
              <span className="px-2.5 py-1 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 font-mono text-xs font-bold border border-blue-500/20">
                {roomData?.roomCode}
              </span>
              <span className="px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium border border-slate-200 dark:border-slate-700">
                {roomData?.floor?.displayName || 'Floor'}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
              <span>Meter UID: <strong className="text-slate-700 dark:text-slate-300 font-mono">{roomData?.device?.deviceUid || 'None'}</strong></span>
              <span>•</span>
              <span>Threshold: <strong className="text-amber-500">{roomData?.highPowerThresholdW || 800}W</strong></span>
            </p>
          </div>

          <button 
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {loading && (
            <div className="flex items-center justify-center py-20 text-slate-400 text-sm">
              <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Loading room telemetry...
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-700 text-rose-200 text-sm">
              {error}
            </div>
          )}

          {!loading && !error && roomData && (
            <>
              {/* Telemetry KPI Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                
                {/* Real-Time Power */}
                <div className={`p-4 rounded-xl border ${
                  currentPowerW > roomData.highPowerThresholdW 
                    ? 'bg-rose-950/40 border-rose-600' 
                    : 'bg-slate-850 border-slate-800'
                }`}>
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Current Power</span>
                    <Zap className={`w-4 h-4 ${currentPowerW > roomData.highPowerThresholdW ? 'text-rose-400 animate-bounce' : 'text-amber-400'}`} />
                  </div>
                  <div className="mt-2 text-2xl font-black text-white font-mono flex items-baseline gap-1">
                    {currentPowerW.toFixed(1)} <span className="text-xs font-normal text-slate-400">W</span>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    {currentPowerW > roomData.highPowerThresholdW ? '⚠️ High Load Active' : 'Normal Load'}
                  </span>
                </div>

                {/* Voltage & Current */}
                <div className="p-4 rounded-xl bg-slate-850 border border-slate-800">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Grid Voltage</span>
                    <Activity className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div className="mt-2 text-2xl font-black text-white font-mono flex items-baseline gap-1">
                    {currentVoltageV} <span className="text-xs font-normal text-slate-400">V</span>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block font-mono">
                    Current: {currentCurrentA}A • PF: {currentPF}
                  </span>
                </div>

                {/* Today Energy */}
                <div className="p-4 rounded-xl bg-slate-850 border border-slate-800">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Today Energy</span>
                    <Gauge className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="mt-2 text-2xl font-black text-white font-mono flex items-baseline gap-1">
                    {summary?.todayEnergyKWh ?? '0.00'} <span className="text-xs font-normal text-slate-400">kWh</span>
                  </div>
                  <span className="text-[10px] text-emerald-400 mt-1 block">
                    Est. Cost: ₹{summary?.estimatedCostToday ?? '0.00'}
                  </span>
                </div>

                {/* Cumulative Energy */}
                <div className="p-4 rounded-xl bg-slate-850 border border-slate-800">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Cumulative Meter</span>
                    <DollarSign className="w-4 h-4 text-blue-400" />
                  </div>
                  <div className="mt-2 text-xl font-black text-white font-mono flex items-baseline gap-1 truncate">
                    {cumulativeEnergyKWh.toFixed(2)} <span className="text-xs font-normal text-slate-400">kWh</span>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Rate: ₹{summary?.tariffRate || 7.5}/kWh
                  </span>
                </div>

              </div>

              {/* Power Trend Chart */}
              <div className="p-4 rounded-xl bg-slate-850 border border-slate-800">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-blue-400" /> Live Power Profile (Watts)
                  </h3>
                  <span className="text-[10px] text-slate-400">Updated in Real Time</span>
                </div>

                <div className="h-44 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <XAxis dataKey="time" stroke="#475569" fontSize={10} tickLine={false} />
                      <YAxis stroke="#475569" fontSize={10} tickLine={false} domain={['auto', 'auto']} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="power" 
                        stroke="#38bdf8" 
                        strokeWidth={2} 
                        dot={false}
                        isAnimationActive={false} 
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Occupants & Assigned Students */}
              <div className="p-4 rounded-xl bg-slate-850 border border-slate-800">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <User className="w-4 h-4 text-indigo-400" /> Assigned Student Occupants
                </h3>
                {roomData.occupants?.length === 0 ? (
                  <p className="text-xs text-slate-400">No students currently assigned to this room.</p>
                ) : (
                  <div className="space-y-2">
                    {roomData.occupants.map(occ => (
                      <div key={occ.id} className="flex items-center justify-between p-2 rounded bg-slate-900 border border-slate-800 text-xs">
                        <span className="font-semibold text-white">{occ.name}</span>
                        <span className="text-slate-400 font-mono">{occ.email}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Active Alerts for Room */}
              {roomData.activeAlerts?.length > 0 && (
                <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-800/80">
                  <h3 className="text-xs font-bold text-rose-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-400" /> Active Alerts on this Room
                  </h3>
                  <div className="space-y-2">
                    {roomData.activeAlerts.map(alt => (
                      <div key={alt.id} className="p-2.5 rounded bg-rose-900/40 text-xs text-rose-200 border border-rose-800">
                        <div className="flex items-center justify-between font-semibold">
                          <span>{alt.alertType}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-600 text-white font-mono uppercase">
                            {alt.status}
                          </span>
                        </div>
                        <p className="mt-1 text-slate-300">{alt.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Warden Simulation Test Shortcuts */}
              {user?.role === 'WARDEN' && (
                <div className="p-4 rounded-xl bg-slate-850 border border-blue-900/40">
                  <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Flame className="w-4 h-4 text-amber-400" /> Warden Simulation Test Lab
                  </h3>
                  <p className="text-[11px] text-slate-400 mb-3">
                    Inject controlled telemetry scenarios into virtual meter <span className="font-mono text-slate-300">{roomData.device?.deviceUid}</span> to test the alert engine.
                  </p>

                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => triggerScenario('SUSTAINED_HIGH_POWER', 1450)}
                      className="px-2.5 py-2 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 text-xs font-semibold flex items-center justify-center gap-1 transition"
                    >
                      <Flame className="w-3.5 h-3.5" /> High Load (1450W)
                    </button>

                    <button
                      onClick={() => triggerScenario('OFFLINE')}
                      className="px-2.5 py-2 rounded-lg bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 text-xs font-semibold flex items-center justify-center gap-1 transition"
                    >
                      <WifiOff className="w-3.5 h-3.5" /> Disconnect Meter
                    </button>

                    <button
                      onClick={() => triggerScenario('RESTORE')}
                      className="px-2.5 py-2 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-semibold flex items-center justify-center gap-1 transition"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Restore Normal
                    </button>
                  </div>

                  {actionMessage && (
                    <div className="mt-2 text-xs text-cyan-300 p-2 rounded bg-cyan-950/40 border border-cyan-800">
                      {actionMessage}
                    </div>
                  )}
                </div>
              )}

              {/* Recent Telemetry Readings Table */}
              <div className="p-4 rounded-xl bg-slate-850 border border-slate-800">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-slate-400" /> Recent Telemetry Logs
                </h3>

                <div className="max-h-56 overflow-y-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-slate-900 text-slate-400 sticky top-0">
                      <tr>
                        <th className="py-1.5 px-2">Seq</th>
                        <th className="py-1.5 px-2">Time</th>
                        <th className="py-1.5 px-2">Power</th>
                        <th className="py-1.5 px-2">Voltage</th>
                        <th className="py-1.5 px-2">Current</th>
                        <th className="py-1.5 px-2">Energy</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-slate-300">
                      {readings.slice(0, 15).map(r => (
                        <tr key={r.id} className="hover:bg-slate-800/40">
                          <td className="py-1.5 px-2 text-slate-400">{r.sequenceNumber}</td>
                          <td className="py-1.5 px-2 text-slate-400">{new Date(r.eventTimestamp).toLocaleTimeString()}</td>
                          <td className={`py-1.5 px-2 font-bold ${r.powerW > roomData.highPowerThresholdW ? 'text-rose-400' : 'text-slate-200'}`}>
                            {r.powerW.toFixed(1)}W
                          </td>
                          <td className="py-1.5 px-2">{r.voltageV}V</td>
                          <td className="py-1.5 px-2">{r.currentA}A</td>
                          <td className="py-1.5 px-2 text-emerald-400">{r.cumulativeEnergyKWh.toFixed(3)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </>
          )}

        </div>

      </div>
    </div>
  );
}
