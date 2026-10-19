import React, { useState, useEffect } from 'react';
import { Sliders, DollarSign, Shield, RefreshCw, CheckCircle2 } from 'lucide-react';
import { api } from '../../services/api';

export default function Settings() {
  const [tariff, setTariff] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  // Form states
  const [name, setName] = useState('');
  const [tariffType, setTariffType] = useState('FLAT_RATE');
  const [baseRate, setBaseRate] = useState(7.5);
  const [fixedCharge, setFixedCharge] = useState(50.0);

  useEffect(() => {
    async function loadTariff() {
      setLoading(true);
      try {
        const res = await api.get('/tariffs');
        if (res.success && res.activeTariff) {
          setTariff(res.activeTariff);
          setName(res.activeTariff.name);
          setTariffType(res.activeTariff.tariffType);
          setBaseRate(res.activeTariff.baseRatePerKWh);
          setFixedCharge(res.activeTariff.fixedCharge || 0);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadTariff();
  }, []);

  const handleSaveTariff = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const res = await api.post('/tariffs', {
        name,
        tariffType,
        baseRatePerKWh: Number(baseRate),
        fixedCharge: Number(fixedCharge),
        slabConfig: tariffType === 'SLAB' ? [
          { minKWh: 0, maxKWh: 100, rate: Number(baseRate) - 1.0 },
          { minKWh: 100, maxKWh: 300, rate: Number(baseRate) },
          { minKWh: 300, maxKWh: 999999, rate: Number(baseRate) + 1.5 }
        ] : undefined
      });

      if (res.success) {
        setTariff(res.data);
        setMessage('Tariff configuration successfully updated and effective immediately.');
      }
    } catch (err) {
      alert(`Failed to save: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
          Hostel Electricity Tariffs & System Configuration
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Configure per-unit electricity billing rates, fixed service charges, and automated alert parameters.
        </p>
      </div>

      {message && (
        <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-700 text-emerald-200 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-400 text-sm">
          <RefreshCw className="w-5 h-5 animate-spin mr-2 text-blue-500" /> Loading configuration...
        </div>
      ) : (
        <form onSubmit={handleSaveTariff} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          
          <div className="border-b border-slate-800 pb-4">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-400" /> Active Electricity Tariff Rule
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Defines how consumption kWh is converted into projected expenditure across dashboards.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Tariff Name */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                Tariff Scheme Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Model Type */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                Tariff Model
              </label>
              <select
                value={tariffType}
                onChange={(e) => setTariffType(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="FLAT_RATE">Flat Rate (Constant per kWh)</option>
                <option value="SLAB">Slab-Based Tiered Structure</option>
              </select>
            </div>

            {/* Base Rate */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                Base Rate per kWh (₹ INR)
              </label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                value={baseRate}
                onChange={(e) => setBaseRate(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">Default rate across all student rooms</span>
            </div>

            {/* Fixed Monthly Charge */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                Monthly Meter Fixed Charge (₹ INR)
              </label>
              <input
                type="number"
                step="1"
                min="0"
                value={fixedCharge}
                onChange={(e) => setFixedCharge(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">Standard standing grid infrastructure fee</span>
            </div>

          </div>

          <div className="pt-4 border-t border-slate-800 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 transition disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Apply Tariff Settings'}
            </button>
          </div>

        </form>
      )}

    </div>
  );
}
