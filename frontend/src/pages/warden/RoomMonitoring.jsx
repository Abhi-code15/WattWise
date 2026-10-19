import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  ArrowUpDown, 
  Zap, 
  AlertTriangle, 
  ExternalLink,
  Building,
  RefreshCw
} from 'lucide-react';
import { api } from '../../services/api';
import { useSocket } from '../../context/SocketContext';
import RoomDetailModal from '../../components/RoomDetailModal';

export default function RoomMonitoring() {
  const { liveReadings } = useSocket();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoomId, setSelectedRoomId] = useState(null);

  const [floorFilter, setFloorFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('power'); // 'power', 'code'

  useEffect(() => {
    async function loadAllRooms() {
      setLoading(true);
      try {
        const [gRes, sRes, tRes] = await Promise.all([
          api.get('/floors/GROUND/rooms'),
          api.get('/floors/SECOND/rooms'),
          api.get('/floors/THIRD/rooms')
        ]);
        const combined = [
          ...(gRes.rooms || []),
          ...(sRes.rooms || []),
          ...(tRes.rooms || [])
        ];
        setRooms(combined);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadAllRooms();
  }, []);

  const filteredRooms = rooms.filter(r => {
    const live = liveReadings[r.device?.deviceUid] || liveReadings[r.roomCode] || liveReadings[r.id];
    const powerW = live ? live.powerW : (r.device?.lastPowerW || 0);
    const isHigh = powerW > r.highPowerThresholdW;
    const isAlert = r.activeAlertsCount > 0;
    const isOffline = r.device?.status === 'OFFLINE';

    // Search
    if (search) {
      const q = search.toLowerCase();
      const codeMatch = r.roomCode.toLowerCase().includes(q);
      const nameMatch = r.displayName.toLowerCase().includes(q);
      const occMatch = r.occupants?.some(o => o.name?.toLowerCase().includes(q));
      if (!codeMatch && !nameMatch && !occMatch) return false;
    }

    // Floor
    if (floorFilter !== 'ALL') {
      if (floorFilter === 'GROUND' && !r.roomCode.startsWith('G') && !r.roomCode.startsWith('COMMON') && !r.roomCode.startsWith('GROUND') && !r.roomCode.startsWith('STAIRWELL')) return false;
      if (floorFilter === 'SECOND' && !r.roomCode.startsWith('S') && !r.roomCode.startsWith('SECOND')) return false;
      if (floorFilter === 'THIRD' && !r.roomCode.startsWith('T') && !r.roomCode.startsWith('THIRD')) return false;
    }

    // Status
    if (statusFilter === 'HIGH') return isHigh;
    if (statusFilter === 'ALERT') return isAlert;
    if (statusFilter === 'OFFLINE') return isOffline;
    if (statusFilter === 'NORMAL') return !isHigh && !isAlert && !isOffline;

    return true;
  });

  const sortedRooms = [...filteredRooms].sort((a, b) => {
    const powerA = (liveReadings[a.device?.deviceUid] || liveReadings[a.roomCode] || liveReadings[a.id])?.powerW ?? (a.device?.lastPowerW || 0);
    const powerB = (liveReadings[b.device?.deviceUid] || liveReadings[b.roomCode] || liveReadings[b.id])?.powerW ?? (b.device?.lastPowerW || 0);

    if (sortBy === 'power') return powerB - powerA;
    return a.roomCode.localeCompare(b.roomCode);
  });

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Hostel Rooms Live Monitor
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time telemetry, loads, and status across all 211 monitored rooms & shared facilities.
          </p>
        </div>
      </div>

      {/* Filter and Control Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search room code or occupant..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Floor filter */}
          <select
            value={floorFilter}
            onChange={(e) => setFloorFilter(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none"
          >
            <option value="ALL">All Floors</option>
            <option value="GROUND">Ground Floor</option>
            <option value="SECOND">Second Floor</option>
            <option value="THIRD">Third Floor</option>
          </select>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="NORMAL">Normal Load</option>
            <option value="HIGH">High Consumption</option>
            <option value="ALERT">Active Alert</option>
            <option value="OFFLINE">Offline Meter</option>
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none"
          >
            <option value="power">Sort: Power (Highest First)</option>
            <option value="code">Sort: Room Code</option>
          </select>
        </div>

      </div>

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-400 text-sm">
            <RefreshCw className="w-5 h-5 animate-spin mr-2 text-blue-500" /> Loading rooms telemetry table...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 uppercase font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Room Code</th>
                  <th className="py-3 px-4">Display Name</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Meter UID</th>
                  <th className="py-3 px-4">Current Power</th>
                  <th className="py-3 px-4">Threshold</th>
                  <th className="py-3 px-4">Occupants</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {sortedRooms.map(r => {
                  const live = liveReadings[r.device?.deviceUid] || liveReadings[r.roomCode] || liveReadings[r.id];
                  const powerW = live ? live.powerW : (r.device?.lastPowerW || 0);
                  const isHigh = powerW > r.highPowerThresholdW;
                  const isAlert = r.activeAlertsCount > 0;
                  const isOffline = r.device?.status === 'OFFLINE';

                  return (
                    <tr 
                      key={r.id} 
                      onClick={() => setSelectedRoomId(r.id)}
                      className="hover:bg-slate-850/60 transition cursor-pointer"
                    >
                      <td className="py-3 px-4 font-mono font-bold text-white">
                        {r.roomCode}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-200">
                        {r.displayName}
                      </td>
                      <td className="py-3 px-4 text-slate-400">
                        {r.roomType === 'RESIDENTIAL' ? 'Residential' : 'Shared Facility'}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-400">
                        {r.device?.deviceUid || 'None'}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold">
                        <span className={`px-2 py-0.5 rounded ${
                          isAlert ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40' :
                          isHigh ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' :
                          isOffline ? 'bg-slate-800 text-slate-500' :
                          'text-emerald-400'
                        }`}>
                          {isOffline ? 'OFFLINE' : `${powerW.toFixed(1)} W`}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-400">
                        {r.highPowerThresholdW} W
                      </td>
                      <td className="py-3 px-4 text-slate-400">
                        {r.occupants?.length > 0 ? r.occupants.map(o => o.name).join(', ') : 'None'}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          isAlert ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse' :
                          isHigh ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' :
                          isOffline ? 'bg-slate-800 text-slate-400' :
                          'bg-emerald-500/20 text-emerald-400'
                        }`}>
                          {isAlert ? 'ALERT ACTIVE' : isHigh ? 'HIGH CONSUMPTION' : isOffline ? 'OFFLINE' : 'NORMAL'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button className="text-blue-400 hover:text-blue-300 font-semibold flex items-center justify-end gap-1 ml-auto">
                          <span>Details</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedRoomId && (
        <RoomDetailModal
          roomId={selectedRoomId}
          onClose={() => setSelectedRoomId(null)}
        />
      )}

    </div>
  );
}
