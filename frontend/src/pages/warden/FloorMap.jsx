import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Layers, 
  Search, 
  Filter, 
  Zap, 
  AlertTriangle, 
  Cpu, 
  Utensils, 
  Coffee, 
  Shield, 
  Tv, 
  Droplet, 
  Footprints, 
  MoveUp, 
  Building,
  RefreshCw,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { api } from '../../services/api';
import { useSocket } from '../../context/SocketContext';
import RoomDetailModal from '../../components/RoomDetailModal';

export default function FloorMap() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { liveReadings } = useSocket();

  const [activeFloorCode, setActiveFloorCode] = useState(() => searchParams.get('floor') || 'GROUND');
  const [floorData, setFloorData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL, NORMAL, HIGH, ALERT, OFFLINE

  const floors = [
    { code: 'GROUND', name: 'Ground Floor', count: '60 Rooms + Mess/Canteen' },
    { code: 'SECOND', name: 'Second Floor', count: '70 Rooms' },
    { code: 'THIRD', name: 'Third Floor', count: '70 Rooms' }
  ];

  const fetchFloorRooms = async (floorCode) => {
    setLoading(true);
    try {
      const res = await api.get(`/floors/${floorCode}/rooms`);
      if (res.success) {
        setFloorData(res);
      }
    } catch (err) {
      console.error('Failed to load floor rooms:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFloorRooms(activeFloorCode);
    setSearchParams({ floor: activeFloorCode });
  }, [activeFloorCode]);

  const handleFloorChange = (code) => {
    setActiveFloorCode(code);
  };

  // Separate residential rooms from shared facilities
  const allRooms = floorData?.rooms || [];
  const residentialRooms = allRooms.filter(r => r.roomType === 'RESIDENTIAL');
  const sharedFacilities = allRooms.filter(r => r.roomType !== 'RESIDENTIAL');

  // Filter residential rooms by search and status
  const filteredResidential = residentialRooms.filter(r => {
    const live = liveReadings[r.device?.deviceUid] || liveReadings[r.roomCode] || liveReadings[r.id];
    const powerW = live ? live.powerW : (r.device?.lastPowerW || 0);
    const isHigh = powerW > r.highPowerThresholdW;
    const isAlert = r.activeAlertsCount > 0;
    const isOffline = r.device?.status === 'OFFLINE';

    if (searchQuery && !r.roomCode.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }

    if (statusFilter === 'HIGH') return isHigh;
    if (statusFilter === 'ALERT') return isAlert;
    if (statusFilter === 'OFFLINE') return isOffline;
    if (statusFilter === 'NORMAL') return !isHigh && !isAlert && !isOffline;

    return true;
  });

  // Facility icon helper
  const getFacilityIcon = (type) => {
    switch (type) {
      case 'COMMON_MESS': return Utensils;
      case 'COMMON_CANTEEN': return Coffee;
      case 'COMMON_WARDEN': return Shield;
      case 'COMMON_TV_HALL': return Tv;
      case 'COMMON_WASHROOM': return Droplet;
      case 'COMMON_CORRIDOR': return Footprints;
      case 'COMMON_STAIRWELL': return MoveUp;
      default: return Building;
    }
  };

  // Compute live floor stats
  const totalFloorRooms = allRooms.length;
  let onlineCount = 0;
  let highLoadCount = 0;
  let totalFloorPowerW = 0;

  allRooms.forEach(r => {
    const live = liveReadings[r.device?.deviceUid] || liveReadings[r.roomCode] || liveReadings[r.id];
    const powerW = live ? live.powerW : (r.device?.lastPowerW || 0);
    const isOffline = r.device?.status === 'OFFLINE';

    if (!isOffline) onlineCount++;
    if (powerW > r.highPowerThresholdW) highLoadCount++;
    totalFloorPowerW += powerW;
  });

  return (
    <div className="space-y-6">
      
      {/* Floor Selector Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          
          {/* Floor Tabs */}
          <div className="flex items-center space-x-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
            {floors.map(f => (
              <button
                key={f.code}
                onClick={() => handleFloorChange(f.code)}
                className={`px-4 py-2.5 rounded-lg text-xs font-bold transition flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 ${
                  activeFloorCode === f.code
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <span>{f.name}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                  activeFloorCode === f.code ? 'bg-blue-800 text-blue-200' : 'bg-slate-800 text-slate-400'
                }`}>
                  {f.code === 'GROUND' ? '60 Rooms' : '70 Rooms'}
                </span>
              </button>
            ))}
          </div>

          {/* Floor Summary Stats */}
          <div className="flex items-center space-x-3 text-xs font-mono">
            <div className="px-3 py-1.5 rounded-lg bg-slate-850 border border-slate-750">
              <span className="text-slate-400">Total Load: </span>
              <strong className="text-white">{(totalFloorPowerW / 1000).toFixed(2)} kW</strong>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-slate-850 border border-slate-750">
              <span className="text-slate-400">Online: </span>
              <strong className="text-emerald-400">{onlineCount} / {totalFloorRooms}</strong>
            </div>
            {highLoadCount > 0 && (
              <div className="px-3 py-1.5 rounded-lg bg-rose-950/40 border border-rose-800 text-rose-300">
                <span>High: <strong>{highLoadCount}</strong></span>
              </div>
            )}
          </div>

        </div>

        {/* Filter & Search Bar */}
        <div className="mt-4 pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          
          {/* Status Filter Buttons */}
          <div className="flex items-center space-x-1.5 overflow-x-auto text-xs">
            <span className="text-slate-400 mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Filter:
            </span>
            {['ALL', 'NORMAL', 'HIGH', 'ALERT', 'OFFLINE'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-2.5 py-1 rounded-md font-semibold transition ${
                  statusFilter === status
                    ? 'bg-slate-700 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {status}
              </button>
            ))}
          </div>

          {/* Room Search */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search room (e.g. G024)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

        </div>
      </div>

      {loading && !floorData ? (
        <div className="flex items-center justify-center py-20 text-slate-400 text-sm">
          <RefreshCw className="w-5 h-5 animate-spin mr-2 text-blue-500" /> Loading floor schematic layout...
        </div>
      ) : (
        <>
          {/* Shared Facilities Section */}
          {sharedFacilities.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <Building className="w-4 h-4 text-cyan-400" /> Separately Monitored Shared Facilities ({sharedFacilities.length})
                </h3>
                <span className="text-[10px] text-slate-400">Click any facility to view live meter readings</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                {sharedFacilities.map((fac) => {
                  const Icon = getFacilityIcon(fac.roomType);
                  const live = liveReadings[fac.device?.deviceUid] || liveReadings[fac.roomCode] || liveReadings[fac.id];
                  const powerW = live ? live.powerW : (fac.device?.lastPowerW || 0);
                  const isHigh = powerW > fac.highPowerThresholdW;
                  const isOffline = fac.device?.status === 'OFFLINE';

                  return (
                    <div
                      key={fac.id}
                      onClick={() => setSelectedRoomId(fac.id)}
                      className={`p-3 rounded-xl border cursor-pointer transition hover:scale-[1.02] flex flex-col justify-between ${
                        isOffline ? 'bg-slate-900 border-slate-700 opacity-60' :
                        isHigh ? 'bg-rose-950/40 border-rose-600 hover:border-rose-400' :
                        'bg-slate-900 border-slate-800 hover:border-blue-500/60'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <Icon className={`w-4 h-4 ${isHigh ? 'text-rose-400 animate-bounce' : 'text-cyan-400'}`} />
                        <span className="text-[10px] font-mono text-slate-400">{fac.roomCode}</span>
                      </div>

                      <div className="mt-2">
                        <div className="text-xs font-bold text-white truncate" title={fac.displayName}>
                          {fac.displayName}
                        </div>
                        <div className="mt-1 text-sm font-black font-mono flex items-baseline gap-1 text-white">
                          {isOffline ? 'OFFLINE' : `${powerW.toFixed(0)}W`}
                        </div>
                      </div>

                      <div className="mt-2 text-[10px] text-slate-400 font-mono">
                        Limit: {fac.highPowerThresholdW}W
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Residential Rooms Interactive Grid */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-400" /> Residential Rooms ({filteredResidential.length} of {residentialRooms.length})
              </h3>
              <div className="flex items-center space-x-3 text-[11px] text-slate-400">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500/20 border border-emerald-500/50" /> Normal</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-amber-500/20 border border-amber-500/50" /> High Load</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-rose-500/30 border border-rose-500" /> Alert</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-slate-800 border border-slate-700" /> Offline</span>
              </div>
            </div>

            {/* The Grid: 60/70 rooms layout */}
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2 sm:gap-2.5">
              {filteredResidential.map((room) => {
                const live = liveReadings[room.device?.deviceUid] || liveReadings[room.roomCode] || liveReadings[room.id];
                const powerW = live ? live.powerW : (room.device?.lastPowerW || 0);
                const isHigh = powerW > room.highPowerThresholdW;
                const isAlert = room.activeAlertsCount > 0;
                const isOffline = room.device?.status === 'OFFLINE';

                return (
                  <button
                    key={room.id}
                    onClick={() => setSelectedRoomId(room.id)}
                    className={`p-2.5 rounded-xl border text-left transition relative group overflow-hidden ${
                      isAlert ? 'bg-rose-950/50 border-rose-500 ring-2 ring-rose-500/40 alert-pulse' :
                      isHigh ? 'bg-amber-950/30 border-amber-500 hover:border-amber-400' :
                      isOffline ? 'bg-slate-900 border-slate-700 opacity-60' :
                      'bg-slate-900 border-slate-800 hover:border-blue-500 hover:shadow-lg hover:shadow-blue-500/10'
                    }`}
                  >
                    {/* Top Row: Room Code & Status Pill */}
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-white tracking-tight">
                        {room.roomCode}
                      </span>
                      {isAlert ? (
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-400 animate-bounce" />
                      ) : (
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          isOffline ? 'bg-slate-500' :
                          isHigh ? 'bg-amber-400 animate-pulse' :
                          'bg-emerald-500'
                        }`} />
                      )}
                    </div>

                    {/* Watts Display */}
                    <div className="mt-1.5">
                      <div className={`text-sm font-black font-mono leading-none ${
                        isAlert ? 'text-rose-400' :
                        isHigh ? 'text-amber-400' :
                        isOffline ? 'text-slate-500' :
                        'text-slate-200'
                      }`}>
                        {isOffline ? 'OFFLINE' : `${powerW.toFixed(0)}W`}
                      </div>
                    </div>

                    {/* Occupant dot indicator */}
                    <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400">
                      <span>{room.occupants?.length > 0 ? `${room.occupants.length} Occ.` : 'Vacant'}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Selected Room Detail Drawer / Modal */}
      {selectedRoomId && (
        <RoomDetailModal
          roomId={selectedRoomId}
          onClose={() => setSelectedRoomId(null)}
        />
      )}

    </div>
  );
}
