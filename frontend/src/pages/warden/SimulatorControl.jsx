import React, { useState, useEffect } from 'react';
import { 
  Radio, 
  Play, 
  Pause, 
  Square, 
  FastForward, 
  Flame, 
  WifiOff, 
  RotateCcw, 
  Zap, 
  ShieldAlert, 
  CheckCircle2, 
  RefreshCw,
  Sliders
} from 'lucide-react';
import { api } from '../../services/api';

export default function SimulatorControl() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);

  // Scenario form state
  const [targetRoom, setTargetRoom] = useState('G024');
  const [scenarioType, setScenarioType] = useState('SUSTAINED_HIGH_POWER');
  const [targetPowerW, setTargetPowerW] = useState(1450);
  const [durationCycles, setDurationCycles] = useState(15);
  const [submittingScenario, setSubmittingScenario] = useState(false);

  const fetchStatus = async () => {
    try {
      const res = await api.get('/simulator/status');
      if (res.success) {
        setStatus(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleAction = async (action, body = {}) => {
    setMessage(null);
    try {
      const res = await api.post(`/simulator/${action}`, body);
      if (res.success) {
        setMessage({ type: 'success', text: res.message });
        setStatus(res.data || status);
        fetchStatus();
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  const handleTriggerScenario = async (e) => {
    e.preventDefault();
    setSubmittingScenario(true);
    setMessage(null);

    try {
      const res = await api.post('/simulator/scenarios', {
        roomCode: targetRoom,
        scenarioType,
        powerW: Number(targetPowerW),
        durationCycles: Number(durationCycles)
      });

      if (res.success) {
        setMessage({ type: 'success', text: res.message });
        fetchStatus();
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSubmittingScenario(false);
    }
  };

  const isRunning = status?.status === 'RUNNING';
  const isPaused = status?.status === 'PAUSED';

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            Virtual Smart-Meter Simulation Control Panel
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Deterministic IoT telemetry generator controlling 211 virtual energy meters and injection scenarios.
          </p>
        </div>

        {/* State Pill */}
        <div className="flex items-center space-x-2">
          <span className={`px-3 py-1.5 rounded-full text-xs font-mono font-bold uppercase flex items-center gap-2 border ${
            isRunning ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
            isPaused ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
            'bg-rose-500/20 text-rose-400 border border-rose-500/30'
          }`}>
            <span className={`w-2 h-2 rounded-full ${isRunning ? 'bg-emerald-400 animate-ping' : 'bg-rose-400'}`} />
            <span>Simulator State: {status?.status || 'UNKNOWN'}</span>
          </span>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-xl text-xs font-semibold flex items-center justify-between border ${
          message.type === 'success' 
            ? 'bg-emerald-950/60 border-emerald-700 text-emerald-200' 
            : 'bg-rose-950/60 border-rose-700 text-rose-200'
        }`}>
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Primary Simulator Controls Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
        
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Sliders className="w-4 h-4 text-blue-400" /> Simulation Engine Loop Controls
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Current Loop Interval: <strong className="text-white font-mono">{status?.intervalMs || 15000} ms</strong> • Devices: <strong className="text-white font-mono">{status?.totalDevices || 211} meters</strong>
            </p>
          </div>

          {/* Start / Pause / Resume / Stop Actions */}
          <div className="flex items-center space-x-2">
            {!isRunning ? (
              <button
                onClick={() => handleAction(isPaused ? 'resume' : 'start')}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 flex items-center gap-1.5 transition"
              >
                <Play className="w-4 h-4" />
                <span>{isPaused ? 'Resume Loop' : 'Start Simulator'}</span>
              </button>
            ) : (
              <button
                onClick={() => handleAction('pause')}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-lg shadow-amber-600/30 flex items-center gap-1.5 transition"
              >
                <Pause className="w-4 h-4" />
                <span>Pause Loop</span>
              </button>
            )}

            <button
              onClick={() => handleAction('stop')}
              className="px-4 py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 border border-rose-500/30 text-xs font-bold flex items-center gap-1.5 transition"
            >
              <Square className="w-4 h-4" />
              <span>Stop</span>
            </button>
          </div>
        </div>

        {/* Speed Adjustment Buttons */}
        <div>
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <FastForward className="w-4 h-4 text-amber-400" /> Telemetry Interval / Speed:
          </label>
          <div className="flex flex-wrap items-center gap-2">
            {[
              { label: '1 Second (High Speed / Test Mode)', ms: 1000 },
              { label: '5 Seconds (Accelerated)', ms: 5000 },
              { label: '15 Seconds (Default Realistic)', ms: 15000 },
              { label: '30 Seconds (Slow)', ms: 30000 }
            ].map((spd) => (
              <button
                key={spd.ms}
                onClick={() => handleAction('speed', { intervalMs: spd.ms })}
                className={`px-3 py-2 rounded-xl text-xs font-semibold transition border ${
                  status?.intervalMs === spd.ms
                    ? 'bg-blue-600 border-blue-500 text-white shadow-md shadow-blue-600/20'
                    : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                }`}
              >
                {spd.label}
              </button>
            ))}
          </div>
        </div>

      </div>

      {/* Scenario Injection Form */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div>
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Flame className="w-4 h-4 text-rose-400" /> Interactive Scenario Injection Lab
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Select a target room or facility to simulate electrical anomalies and test the alert engine.
          </p>
        </div>

        <form onSubmit={handleTriggerScenario} className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-2">
          
          {/* Target Room */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
              Target Room Code
            </label>
            <input
              type="text"
              value={targetRoom}
              onChange={(e) => setTargetRoom(e.target.value.toUpperCase())}
              placeholder="e.g. G024, S210, COMMON-MESS"
              required
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono uppercase focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Scenario Type */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
              Scenario Type
            </label>
            <select
              value={scenarioType}
              onChange={(e) => setScenarioType(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="SUSTAINED_HIGH_POWER">Sustained High Power (Alert Trigger)</option>
              <option value="SPIKE">Short Power Spike (1-2 cycles)</option>
              <option value="OFFLINE">Simulate Disconnection (Offline)</option>
              <option value="RESTORE">Restore Normal Telemetry</option>
            </select>
          </div>

          {/* Power (Watts) */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
              Injected Load (Watts)
            </label>
            <input
              type="number"
              value={targetPowerW}
              onChange={(e) => setTargetPowerW(e.target.value)}
              disabled={scenarioType === 'OFFLINE' || scenarioType === 'RESTORE'}
              min={100}
              max={10000}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-40"
            />
          </div>

          {/* Cycles / Duration */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
              Duration (Cycles)
            </label>
            <input
              type="number"
              value={durationCycles}
              onChange={(e) => setDurationCycles(e.target.value)}
              disabled={scenarioType === 'OFFLINE' || scenarioType === 'RESTORE'}
              min={1}
              max={100}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-40"
            />
          </div>

          {/* Submit & Reset Buttons */}
          <div className="sm:col-span-4 flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => handleAction('scenarios', { scenarioType: 'RESET_DEMO' })}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <RotateCcw className="w-4 h-4 text-slate-400" />
              <span>Reset All Scenarios (Default Baseline)</span>
            </button>

            <button
              type="submit"
              disabled={submittingScenario}
              className="px-6 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 flex items-center gap-1.5 transition disabled:opacity-50"
            >
              <Zap className="w-4 h-4" />
              <span>{submittingScenario ? 'Injecting...' : 'Inject Scenario'}</span>
            </button>
          </div>

        </form>

        {/* Active Scenarios List */}
        {status?.activeScenarios?.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-800">
            <span className="text-xs font-bold text-slate-300 uppercase">Currently Active Overrides:</span>
            <div className="flex flex-wrap gap-2 mt-2">
              {status.activeScenarios.map(sc => (
                <div key={sc.deviceUid} className="px-3 py-1.5 rounded-lg bg-rose-950/40 border border-rose-800 text-rose-300 text-xs font-mono flex items-center gap-2">
                  <span><strong>{sc.deviceUid}</strong>: {sc.scenario?.type} ({sc.scenario?.remainingCycles} cycles remaining)</span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
