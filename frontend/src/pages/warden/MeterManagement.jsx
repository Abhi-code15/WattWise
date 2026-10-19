import React, { useState, useEffect } from 'react';
import { 
  Cpu, 
  Search, 
  Filter, 
  Wifi, 
  WifiOff, 
  Clock, 
  RefreshCw,
  Zap,
  CheckCircle2
} from 'lucide-react';
import { api } from '../../services/api';

export default function MeterManagement() {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const fetchDevices = async () => {
    setLoading(true);
    try {
      const res = await api.get('/devices');
      if (res.success) {
        setDevices(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  const filtered = devices.filter(d => {
    if (search) {
      const q = search.toLowerCase();
      const uidMatch = d.deviceUid.toLowerCase().includes(q);
      const roomMatch = d.room?.roomCode?.toLowerCase().includes(q);
      const nameMatch = d.room?.displayName?.toLowerCase().includes(q);
      if (!uidMatch && !roomMatch && !nameMatch) return false;
    }

    if (statusFilter !== 'ALL' && d.status !== statusFilter) return false;

    return true;
  });

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            Smart Meter Inventory & Device Registry
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time operational status, heartbeat intervals, and telemetry health for all 211 virtual IoT energy meters.
          </p>
        </div>

        <button
          onClick={fetchDevices}
          className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-2 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh Registry
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        
        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search device UID (e.g. WW-G001)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Status Filter */}
        <div className="flex items-center space-x-2 text-xs">
          <span className="text-slate-400 font-semibold">Status:</span>
          {['ALL', 'ONLINE', 'STALE', 'OFFLINE'].map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg font-bold transition ${
                statusFilter === st
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

      </div>

      {/* Meters Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="flex items-center justify-center py-24 text-slate-400 text-sm">
            <RefreshCw className="w-5 h-5 animate-spin mr-2 text-blue-500" /> Querying device registry...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 uppercase font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Device UID</th>
                  <th className="py-3 px-4">Assigned Location</th>
                  <th className="py-3 px-4">Device Model</th>
                  <th className="py-3 px-4">Last Telemetry Power</th>
                  <th className="py-3 px-4">Cumulative Energy</th>
                  <th className="py-3 px-4">Seq #</th>
                  <th className="py-3 px-4">Last Seen</th>
                  <th className="py-3 px-4 text-right">Connectivity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filtered.map(d => (
                  <tr key={d.id} className="hover:bg-slate-850/50 transition">
                    
                    <td className="py-3 px-4 font-mono font-bold text-white flex items-center gap-2">
                      <Cpu className="w-3.5 h-3.5 text-blue-400" />
                      <span>{d.deviceUid}</span>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-200">
                        {d.room?.displayName || 'Unassigned'}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {d.room?.floor?.displayName || 'Shared Area'}
                      </div>
                    </td>

                    <td className="py-3 px-4 font-mono text-slate-400">
                      {d.configuration?.meterModel || 'VirtualSmartMeter-v1'}
                    </td>

                    <td className="py-3 px-4 font-mono font-bold">
                      <span className={d.status === 'OFFLINE' ? 'text-slate-500' : 'text-amber-400'}>
                        {d.lastPowerW !== null ? `${d.lastPowerW.toFixed(1)} W` : '0.0 W'}
                      </span>
                    </td>

                    <td className="py-3 px-4 font-mono text-emerald-400 font-bold">
                      {d.lastEnergyKWh !== null ? `${d.lastEnergyKWh.toFixed(3)} kWh` : '0.000'}
                    </td>

                    <td className="py-3 px-4 font-mono text-slate-400">
                      #{Number(d.lastSequence || 0)}
                    </td>

                    <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                      {d.lastSeenAt ? new Date(d.lastSeenAt).toLocaleTimeString() : 'Never'}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase font-mono ${
                        d.status === 'ONLINE' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                        d.status === 'STALE' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                        'bg-slate-800 text-slate-500 border border-slate-700'
                      }`}>
                        {d.status}
                      </span>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
