import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  FileText, 
  Filter, 
  ShieldAlert, 
  Search, 
  RefreshCw,
  X
} from 'lucide-react';
import { api } from '../../services/api';
import RoomDetailModal from '../../components/RoomDetailModal';

export default function AlertsCenter() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [selectedRoomId, setSelectedRoomId] = useState(null);

  // Modal for resolving or adding notes
  const [activeAlertModal, setActiveAlertModal] = useState(null); // { alert, mode: 'resolve'|'note' }
  const [modalText, setModalText] = useState('');
  const [modalSubmitting, setModalSubmitting] = useState(false);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      let query = '/alerts?limit=100';
      if (statusFilter !== 'ALL') query += `&status=${statusFilter}`;
      if (severityFilter !== 'ALL') query += `&severity=${severityFilter}`;
      const res = await api.get(query);
      if (res.success) {
        setAlerts(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 10000);
    return () => clearInterval(interval);
  }, [statusFilter, severityFilter]);

  const handleAcknowledge = async (alertId) => {
    try {
      await api.post(`/alerts/${alertId}/acknowledge`, {});
      fetchAlerts();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleModalSubmit = async (e) => {
    e.preventDefault();
    if (!activeAlertModal) return;

    setModalSubmitting(true);
    try {
      if (activeAlertModal.mode === 'resolve') {
        await api.post(`/alerts/${activeAlertModal.alert.id}/resolve`, { notes: modalText });
      } else {
        await api.post(`/alerts/${activeAlertModal.alert.id}/notes`, { notes: modalText });
      }
      setActiveAlertModal(null);
      setModalText('');
      fetchAlerts();
    } catch (err) {
      alert(err.message);
    } finally {
      setModalSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            Alerts & Incidents Management Center
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Monitor, investigate, acknowledge, and resolve energy anomalies and disconnected smart meters.
          </p>
        </div>

        <button
          onClick={fetchAlerts}
          className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-2 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh Feed
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-wrap items-center justify-between gap-4">
        
        {/* Status filters */}
        <div className="flex items-center space-x-1.5 overflow-x-auto text-xs">
          <span className="text-slate-400 mr-1 flex items-center gap-1 font-semibold">
            <Filter className="w-3.5 h-3.5" /> Status:
          </span>
          {['ALL', 'TRIGGERED', 'ACKNOWLEDGED', 'INVESTIGATING', 'RESOLVED'].map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg font-bold text-xs transition ${
                statusFilter === st
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        {/* Severity filters */}
        <div className="flex items-center space-x-2 text-xs">
          <span className="text-slate-400 font-semibold">Severity:</span>
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-slate-200 focus:outline-none"
          >
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="WARNING">Warning</option>
            <option value="INFO">Info</option>
          </select>
        </div>

      </div>

      {/* Alerts Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {loading && alerts.length === 0 ? (
          <div className="flex items-center justify-center py-24 text-slate-400 text-sm">
            <RefreshCw className="w-5 h-5 animate-spin mr-2 text-blue-500" /> Loading incident history...
          </div>
        ) : alerts.length === 0 ? (
          <div className="text-center py-20 text-slate-400 text-xs flex flex-col items-center">
            <CheckCircle className="w-10 h-10 text-emerald-500/40 mb-2" />
            <span className="font-semibold text-slate-300">No alerts matching filter criteria.</span>
            <span className="text-slate-500 mt-1">All monitored rooms are operating within normal electrical parameters.</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 uppercase font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Severity</th>
                  <th className="py-3 px-4">Room / Facility</th>
                  <th className="py-3 px-4">Incident Type</th>
                  <th className="py-3 px-4">Triggered Time</th>
                  <th className="py-3 px-4">Power Reading</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Assigned / Notes</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {alerts.map((alert) => (
                  <tr key={alert.id} className="hover:bg-slate-850/50 transition">
                    
                    {/* Severity */}
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase ${
                        alert.severity === 'CRITICAL' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                        alert.severity === 'WARNING' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                        'bg-blue-500/20 text-blue-400'
                      }`}>
                        {alert.severity}
                      </span>
                    </td>

                    {/* Room */}
                    <td className="py-3 px-4 font-mono font-bold text-white">
                      <button
                        onClick={() => alert.roomId && setSelectedRoomId(alert.roomId)}
                        className="hover:text-blue-400 underline underline-offset-2 flex items-center gap-1"
                      >
                        {alert.room?.roomCode || 'Shared Area'}
                      </button>
                    </td>

                    {/* Incident Type */}
                    <td className="py-3 px-4 font-semibold text-slate-200">
                      <div>{alert.alertType.replace(/_/g, ' ')}</div>
                      <div className="text-[11px] text-slate-400 font-normal line-clamp-1 mt-0.5">{alert.message}</div>
                    </td>

                    {/* Triggered Time */}
                    <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                      {new Date(alert.triggeredAt).toLocaleString()}
                    </td>

                    {/* Trigger Power */}
                    <td className="py-3 px-4 font-mono font-bold">
                      {alert.triggeringValue ? (
                        <span className="text-rose-400">{alert.triggeringValue.toFixed(1)} W</span>
                      ) : (
                        <span className="text-slate-400">Offline</span>
                      )}
                      {alert.thresholdValue && (
                        <div className="text-[10px] text-slate-500 font-normal">Limit: {alert.thresholdValue}W</div>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase font-mono ${
                        alert.status === 'TRIGGERED' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse' :
                        alert.status === 'ACKNOWLEDGED' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                        alert.status === 'INVESTIGATING' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' :
                        'bg-emerald-500/20 text-emerald-400'
                      }`}>
                        {alert.status}
                      </span>
                    </td>

                    {/* Notes */}
                    <td className="py-3 px-4 text-slate-400 max-w-xs">
                      {alert.investigationNotes ? (
                        <span className="line-clamp-2 text-[11px] font-mono bg-slate-950 p-1 rounded border border-slate-800">
                          {alert.investigationNotes}
                        </span>
                      ) : (
                        <span className="text-slate-600 italic">No notes</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end space-x-1.5">
                        {alert.status === 'TRIGGERED' && (
                          <button
                            onClick={() => handleAcknowledge(alert.id)}
                            className="px-2.5 py-1 rounded-md bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 text-[11px] font-semibold transition"
                          >
                            Acknowledge
                          </button>
                        )}

                        {alert.status !== 'RESOLVED' && (
                          <button
                            onClick={() => {
                              setActiveAlertModal({ alert, mode: 'resolve' });
                              setModalText('');
                            }}
                            className="px-2.5 py-1 rounded-md bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-[11px] font-semibold transition"
                          >
                            Resolve
                          </button>
                        )}

                        <button
                          onClick={() => {
                            setActiveAlertModal({ alert, mode: 'note' });
                            setModalText('');
                          }}
                          className="px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold transition"
                          title="Add Investigation Note"
                        >
                          <FileText className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Investigation Notes / Resolution Modal */}
      {activeAlertModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                {activeAlertModal.mode === 'resolve' ? 'Resolve Alert Incident' : 'Add Investigation Note'}
              </h3>
              <button 
                onClick={() => setActiveAlertModal(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-slate-300 bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
              <div><strong>Room:</strong> {activeAlertModal.alert.room?.roomCode}</div>
              <div><strong>Type:</strong> {activeAlertModal.alert.alertType}</div>
              <div><strong>Details:</strong> {activeAlertModal.alert.message}</div>
            </div>

            <form onSubmit={handleModalSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                  {activeAlertModal.mode === 'resolve' ? 'Resolution & Electrical Check Notes' : 'Investigation Note'}
                </label>
                <textarea
                  value={modalText}
                  onChange={(e) => setModalText(e.target.value)}
                  placeholder={activeAlertModal.mode === 'resolve' 
                    ? "e.g. Electrician inspected Room G024, confirmed heavy iron removed, load returned to normal." 
                    : "e.g. Warden called student to inspect room appliances..."
                  }
                  required={activeAlertModal.mode === 'note'}
                  rows={4}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveAlertModal(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalSubmitting}
                  className={`px-4 py-2 rounded-xl text-white text-xs font-bold transition shadow-md ${
                    activeAlertModal.mode === 'resolve'
                      ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'
                      : 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/30'
                  }`}
                >
                  {modalSubmitting ? 'Saving...' : activeAlertModal.mode === 'resolve' ? 'Confirm Resolution' : 'Save Note'}
                </button>
              </div>
            </form>

          </div>
        </div>
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
