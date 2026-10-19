import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Zap, 
  Shield, 
  Activity, 
  Building2, 
  Cpu, 
  AlertTriangle, 
  Layers, 
  ArrowRight, 
  Sliders, 
  CheckCircle2, 
  Radio, 
  Lock, 
  BarChart3, 
  Database, 
  Clock, 
  DollarSign, 
  Flame, 
  HelpCircle, 
  ChevronDown, 
  Play, 
  Sparkles,
  ExternalLink,
  Laptop,
  Wind,
  Lightbulb,
  Tv,
  Coffee,
  Check,
  TrendingDown,
  Info,
  User,
  Users,
  Wrench,
  Gauge,
  Bell,
  RefreshCw
} from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';
import { useTheme } from '../context/ThemeContext';

export default function Landing() {
  const { isDark } = useTheme();

  // ----------------------------------------------------
  // 1. Interactive Live Appliance Playground State
  // ----------------------------------------------------
  const [appliances, setAppliances] = useState([
    { id: 'lights', name: 'LED Ceiling & Desk Lights', watts: 35, active: true, icon: Lightbulb, category: 'Base Load' },
    { id: 'fan', name: 'Ceiling Fan (Speed 4)', watts: 75, active: true, icon: Wind, category: 'Base Load' },
    { id: 'laptops', name: 'Dual Laptops & Chargers', watts: 140, active: true, icon: Laptop, category: 'Electronics' },
    { id: 'monitor', name: 'External Desk Display', watts: 65, active: false, icon: Tv, category: 'Electronics' },
    { id: 'geyser', name: 'Immersion Water Rod (High Load)', watts: 1500, active: false, icon: Flame, category: 'Restricted' },
    { id: 'iron', name: 'Electric Clothes Iron (High Load)', watts: 1100, active: false, icon: Zap, category: 'Restricted' },
    { id: 'kettle', name: 'Electric Tea Kettle', watts: 1200, active: false, icon: Coffee, category: 'Restricted' }
  ]);

  const [consecutiveCount, setConsecutiveCount] = useState(0);
  const [selectedFloorTab, setSelectedFloorTab] = useState('GROUND');
  const [openFaq, setOpenFaq] = useState(0);
  const [roleTab, setRoleTab] = useState('WARDEN');

  // Interactive Room Inspector state
  const [inspectedRoom, setInspectedRoom] = useState({
    id: 'G024',
    name: 'Aryan Patel',
    watts: 1450,
    voltage: 230.1,
    status: 'EXCEEDED',
    todayKwh: 4.82,
    floor: 'Ground Floor'
  });

  // Interactive Tariff Calculator state
  const [monthlyKwh, setMonthlyKwh] = useState(135);

  // Live Telemetry Ticker simulated packets
  const [telemetryFeed, setTelemetryFeed] = useState([
    { id: 1042, deviceId: 'WW-G024', watts: 1450.2, v: 230.1, a: 6.98, status: 'HIGH_LOAD' },
    { id: 1041, deviceId: 'WW-S212', watts: 165.4, v: 229.8, a: 0.81, status: 'NORMAL' },
    { id: 1040, deviceId: 'WW-T308', watts: 210.0, v: 230.5, a: 1.02, status: 'NORMAL' },
    { id: 1039, deviceId: 'WW-COMMON-MESS', watts: 4200.0, v: 231.0, a: 20.2, status: 'NORMAL' },
  ]);

  // Compute live playground metrics
  const activeWatts = appliances.filter(a => a.active).reduce((sum, a) => sum + a.watts, 0);
  const voltage = 230.2;
  const powerFactor = 0.90;
  const currentAmps = activeWatts > 0 ? (activeWatts / (voltage * powerFactor)).toFixed(2) : '0.00';
  const hourlyCostINR = ((activeWatts * 7.50) / 1000).toFixed(2);
  const isHighPower = activeWatts > 800;

  // Preset triggers for user convenience
  const applyPreset = (preset) => {
    if (preset === 'study') {
      setAppliances(prev => prev.map(a => ({
        ...a,
        active: a.id === 'lights' || a.id === 'fan' || a.id === 'laptops'
      })));
    } else if (preset === 'overload') {
      setAppliances(prev => prev.map(a => ({
        ...a,
        active: a.id === 'lights' || a.id === 'fan' || a.id === 'geyser'
      })));
    } else if (preset === 'extreme') {
      setAppliances(prev => prev.map(a => ({
        ...a,
        active: true
      })));
    } else if (preset === 'vacant') {
      setAppliances(prev => prev.map(a => ({
        ...a,
        active: false
      })));
    }
  };

  // Simulate consecutive reading increments in playground
  useEffect(() => {
    let timer;
    if (isHighPower) {
      timer = setInterval(() => {
        setConsecutiveCount(prev => (prev < 10 ? prev + 1 : 10));
      }, 1000);
    } else {
      setConsecutiveCount(0);
    }
    return () => clearInterval(timer);
  }, [isHighPower]);

  // Live telemetry feed ticker
  useEffect(() => {
    const feedInterval = setInterval(() => {
      setTelemetryFeed(prev => {
        const nextId = prev[0].id + 1;
        const randomRoom = `WW-G0${Math.floor(Math.random() * 59) + 1}`;
        const randomW = Math.floor(120 + Math.random() * 260);
        const newPacket = {
          id: nextId,
          deviceId: randomRoom,
          watts: randomW,
          v: (229.5 + Math.random()).toFixed(1),
          a: (randomW / (230 * 0.9)).toFixed(2),
          status: 'NORMAL'
        };
        return [newPacket, ...prev.slice(0, 3)];
      });
    }, 2800);
    return () => clearInterval(feedInterval);
  }, []);

  const toggleAppliance = (id) => {
    setAppliances(prev => prev.map(a => a.id === id ? { ...a, active: !a.active } : a));
  };

  // Calculate Slab Tariff values
  const calculateBill = (kwh) => {
    const fixedCharge = 50.0;
    let energyCharge = 0;
    let slab1Cost = 0;
    let slab2Cost = 0;
    let slab3Cost = 0;

    if (kwh <= 100) {
      slab1Cost = kwh * 6.50;
      energyCharge = slab1Cost;
    } else if (kwh <= 200) {
      slab1Cost = 100 * 6.50;
      slab2Cost = (kwh - 100) * 8.00;
      energyCharge = slab1Cost + slab2Cost;
    } else {
      slab1Cost = 100 * 6.50;
      slab2Cost = 100 * 8.00;
      slab3Cost = (kwh - 200) * 10.50;
      energyCharge = slab1Cost + slab2Cost + slab3Cost;
    }
    const total = fixedCharge + energyCharge;
    return {
      fixedCharge,
      slab1Cost,
      slab2Cost,
      slab3Cost,
      energyCharge,
      total: total.toFixed(2)
    };
  };

  const billBreakdown = calculateBill(monthlyKwh);

  const faqs = [
    {
      q: "Does WattWise require physical smart meters to be tested and demonstrated?",
      a: "No. WattWise is powered by a high-fidelity, deterministic Virtual Smart-Meter Simulator managing 211 concurrent meters. It models real electrical AC parameters (Active Power, Voltage, Current, and Power Factor) and ingests readings via standard HTTP REST APIs with Zod schema validation, identical to how physical edge gateways communicate in production."
    },
    {
      q: "How does the 10-consecutive-reading high-load rule work?",
      a: "To eliminate false positives from momentary motor inrush or surge currents (such as when turning on a fan, motor startup, or plugging in a heavy laptop adapter), an alert is only triggered if room power remains above the configured threshold (e.g. 800W) for 10 consecutive 15-second cycles (~150 seconds or 2.5 minutes). A single normal reading resets the counter, guaranteeing zero false accusations."
    },
    {
      q: "How is student privacy protected between roommates and peers?",
      a: "WattWise implements strict backend-enforced Role-Based Access Control (RBAC). Students can only query telemetry and view alerts for their assigned room through authenticated JWT tokens and scoped Socket.IO rooms. Querying or streaming another room's readings returns an explicit 403 Forbidden error."
    },
    {
      q: "What happens when a meter disconnects or stops transmitting?",
      a: "The backend's surveillance heartbeat marks devices as STALE after 45 seconds without telemetry, and OFFLINE after 90 seconds. A disconnected meter generates an OFFLINE_METER incident for hostel electricians, rather than falsely assuming an offline room uses zero watts."
    },
    {
      q: "How is the tiered slab tariff calculated for hostel residents?",
      a: "WattWise provides transparent tiered billing: Tier 1 (0–100 kWh @ ₹6.50/kWh), Tier 2 (101–200 kWh @ ₹8.00/kWh), and Tier 3 (201+ kWh @ ₹10.50/kWh), plus a ₹50.00 monthly meter maintenance charge. Students can view real-time itemized cost projections in their portal to avoid spilling into expensive higher tiers."
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 selection:bg-blue-600 selection:text-white transition-colors duration-300 antialiased">
      
      {/* ---------------------------------------------------- */}
      {/* 1. Glassmorphic Navigation Bar */}
      {/* ---------------------------------------------------- */}
      <nav className="sticky top-0 z-50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/20 ring-1 ring-blue-500/30">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-black tracking-tight flex items-center gap-1.5">
                  WattWise
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold border border-blue-500/20">
                    Hostel A
                  </span>
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">IoT Energy Intelligence</span>
              </div>
            </div>

            {/* Nav links */}
            <div className="hidden lg:flex items-center space-x-7 text-xs font-semibold text-slate-600 dark:text-slate-300">
              <a href="#playground" className="hover:text-blue-600 dark:hover:text-white transition">Simulator Playground</a>
              <a href="#floors" className="hover:text-blue-600 dark:hover:text-white transition">3-Floor Topology</a>
              <a href="#calculator" className="hover:text-blue-600 dark:hover:text-white transition">Tariff Calculator</a>
              <a href="#features" className="hover:text-blue-600 dark:hover:text-white transition">Platform Pillars</a>
              <a href="#architecture" className="hover:text-blue-600 dark:hover:text-white transition">Architecture</a>
              <a href="#faq" className="hover:text-blue-600 dark:hover:text-white transition">FAQ</a>
            </div>

            {/* Right Controls */}
            <div className="flex items-center space-x-3">
              <ThemeToggle />

              <Link
                to="/login"
                className="text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-white px-3 py-2 rounded-xl transition"
              >
                Sign In
              </Link>

              <Link
                to="/warden"
                className="hidden sm:inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/25 transition-all duration-200 hover:-translate-y-0.5"
              >
                <span>Launch Portal</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

          </div>
        </div>
      </nav>

      {/* ---------------------------------------------------- */}
      {/* 2. Hero Section with Live Telemetry Signal */}
      {/* ---------------------------------------------------- */}
      <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-28">
        
        {/* Subtle grid pattern background */}
        <div className="absolute inset-0 bg-grid-pattern-light dark:bg-grid-pattern-dark opacity-70 pointer-events-none" />
        
        {/* Ambient radial glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[340px] bg-gradient-to-tr from-blue-500/15 via-indigo-500/10 to-cyan-400/15 rounded-full blur-3xl pointer-events-none -z-10 animate-float-slow" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center max-w-3xl mx-auto space-y-6">
            
            {/* Pill Eyebrow */}
            <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-slate-700 dark:text-slate-300 font-medium">Deterministic Smart Meter Engine</span>
              <span className="text-slate-300 dark:text-slate-600">•</span>
              <span className="text-blue-600 dark:text-blue-400 font-mono font-bold">211 Virtual Meters Active</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-950 dark:text-white leading-[1.12]">
              Precision Energy Intelligence for Student Hostels.
            </h1>

            {/* Subtitle */}
            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 leading-relaxed font-normal max-w-2xl mx-auto">
              Sub-metering across <strong>200 rooms</strong> and <strong>11 shared facilities</strong> in WattWise Hostel A. Powered by a 10-cycle anomaly guard, transparent slab tariffs, and authenticated real-time WebSockets.
            </p>

            {/* Action Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                to="/warden"
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-xl shadow-blue-600/25 flex items-center justify-center gap-2 transition-all duration-200 hover:-translate-y-0.5"
              >
                <Shield className="w-4 h-4" />
                <span>Explore Warden Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <a
                href="#playground"
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 font-bold text-sm shadow-sm flex items-center justify-center gap-2 transition"
              >
                <Radio className="w-4 h-4 text-amber-500 animate-pulse" />
                <span>Test Interactive Simulator</span>
              </a>
            </div>

            {/* Quick Demo Credentials Bar */}
            <div className="pt-3 flex flex-wrap items-center justify-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Quick Test Credentials:</span>
              <Link 
                to="/login"
                className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 hover:bg-blue-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 font-mono text-blue-600 dark:text-blue-400 font-semibold shadow-xs transition"
              >
                Chief Warden Sharma (Hostel-wide)
              </Link>
              <Link 
                to="/login"
                className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 hover:bg-emerald-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 font-mono text-emerald-600 dark:text-emerald-400 font-semibold shadow-xs transition"
              >
                Student Aryan Patel (Room G024)
              </Link>
            </div>

          </div>

          {/* Hero Live Mockup Visual Card */}
          <div className="mt-12 max-w-5xl mx-auto rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-2xl p-5 sm:p-6 backdrop-blur-xl transition-all">
            
            {/* Window chrome header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-200 dark:border-slate-800 gap-2">
              <div className="flex items-center space-x-2">
                <span className="w-3 h-3 rounded-full bg-rose-500/80" />
                <span className="w-3 h-3 rounded-full bg-amber-500/80" />
                <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
                <span className="ml-2 text-xs font-mono font-bold text-slate-500 dark:text-slate-400">
                  hostel-a.wattwise.local • 3 Floors • 200 Monitored Rooms
                </span>
              </div>
              <div className="flex items-center space-x-2 text-xs font-mono">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-bold text-emerald-600 dark:text-emerald-400">TELEMETRY INGESTION 143/s</span>
              </div>
            </div>

            {/* Quick Hero Telemetry Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80">
                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Total Monitored Meters</span>
                <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono mt-0.5">211 Meters</div>
                <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">60 Ground • 70 Second • 70 Third</span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80">
                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Instantaneous Power</span>
                <div className="text-xl sm:text-2xl font-black text-amber-500 font-mono mt-0.5">68.4 kW</div>
                <span className="text-[10px] text-slate-500">Autonomous 15s interval</span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80">
                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Today's Consumption</span>
                <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">824.5 kWh</div>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400">Trapezoidal integration</span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80">
                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Active Incident Status</span>
                <div className="text-xl sm:text-2xl font-black text-rose-500 font-mono mt-0.5">1 Triggered</div>
                <span className="text-[10px] text-rose-500 font-semibold">Room G024 High Load</span>
              </div>
            </div>

            {/* Live Ingestion Stream Ticker inside the Hero Card */}
            <div className="mt-4 p-3 rounded-xl bg-slate-100/70 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-850">
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 pb-2 border-b border-slate-200 dark:border-slate-800">
                <span className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300">
                  <Activity className="w-3.5 h-3.5 text-blue-500 animate-pulse" />
                  Live Ingestion Stream (POST /api/v1/telemetry/readings)
                </span>
                <span className="text-emerald-600 dark:text-emerald-400">HTTP 201 Created</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 pt-2">
                {telemetryFeed.map(item => (
                  <div key={item.id} className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-800 dark:text-slate-200">{item.deviceId}</div>
                      <div className="text-[10px] text-slate-400">{item.v}V • {item.a}A</div>
                    </div>
                    <div className="text-right">
                      <div className={`font-black ${item.status === 'HIGH_LOAD' ? 'text-rose-500' : 'text-blue-600 dark:text-blue-400'}`}>
                        {item.watts}W
                      </div>
                      <div className="text-[9px] text-slate-400">#{item.id}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* ---------------------------------------------------- */}
      {/* 3. Interactive Live Appliance Playground Section */}
      {/* ---------------------------------------------------- */}
      <section id="playground" className="py-16 sm:py-24 bg-white dark:bg-slate-900/60 border-y border-slate-200 dark:border-slate-800/80 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto mb-10">
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-xs font-bold uppercase mb-3">
              <Radio className="w-3.5 h-3.5 animate-pulse" />
              <span>Interactive Telemetry Simulator</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-950 dark:text-white tracking-tight">
              Test Room G024's Virtual Smart Meter Live
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
              Toggle residential appliances or choose quick presets below. Observe how active power, AC current, power factor, and the 10-reading anomaly guard react in real time.
            </p>

            {/* Quick Presets */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <span className="text-xs font-bold text-slate-500 mr-1">Quick Presets:</span>
              <button
                onClick={() => applyPreset('study')}
                className="px-3 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition"
              >
                Study Mode (250W)
              </button>
              <button
                onClick={() => applyPreset('overload')}
                className="px-3 py-1 rounded-lg text-xs font-semibold bg-rose-100 dark:bg-rose-950/60 hover:bg-rose-200 dark:hover:bg-rose-900/80 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 transition"
              >
                Water Heater Breach (1610W)
              </button>
              <button
                onClick={() => applyPreset('extreme')}
                className="px-3 py-1 rounded-lg text-xs font-semibold bg-amber-100 dark:bg-amber-950/60 hover:bg-amber-200 dark:hover:bg-amber-900/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 transition"
              >
                All Appliances On (4115W)
              </button>
              <button
                onClick={() => applyPreset('vacant')}
                className="px-3 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 transition"
              >
                Room Vacant (0W)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Left: Appliance Switchboard (7 cols) */}
            <div className="lg:col-span-7 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-blue-500" /> Room Appliance Load Switchboard
                  </h3>
                  <span className="text-[11px] text-slate-500">Click switches to activate or disconnect appliances</span>
                </div>
                <button
                  onClick={() => applyPreset('study')}
                  className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Reset Baseline
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {appliances.map(app => {
                  const Icon = app.icon;
                  const isRestricted = app.category === 'Restricted';

                  return (
                    <button
                      key={app.id}
                      onClick={() => toggleAppliance(app.id)}
                      className={`p-3 rounded-xl border text-left transition-all duration-200 flex items-center justify-between ${
                        app.active
                          ? isRestricted
                            ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-400 dark:border-rose-600 shadow-md shadow-rose-500/10'
                            : 'bg-blue-50 dark:bg-blue-950/40 border-blue-400 dark:border-blue-600 shadow-md shadow-blue-500/10'
                          : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`p-2.5 rounded-xl transition ${
                          app.active
                            ? isRestricted ? 'bg-rose-500 text-white' : 'bg-blue-600 text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                        }`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900 dark:text-slate-100">{app.name}</div>
                          <div className="text-[10px] text-slate-500 font-mono">+{app.watts} Watts • {app.category}</div>
                        </div>
                      </div>

                      <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition ${
                        app.active 
                          ? isRestricted ? 'bg-rose-600 border-rose-600 text-white' : 'bg-blue-600 border-blue-600 text-white'
                          : 'border-slate-300 dark:border-slate-700 bg-transparent'
                      }`}>
                        {app.active && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="text-[11px] text-slate-500 pt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 border-t border-slate-200 dark:border-slate-800">
                <span>* High-load appliances exceed the hostel's standard 800W ceiling.</span>
                <span className="font-mono text-slate-700 dark:text-slate-300 font-semibold">Nominal Voltage: 230V ± 1%</span>
              </div>
            </div>

            {/* Right: Simulated Smart Meter Dial & Real-time Evaluation (5 cols) */}
            <div className="lg:col-span-5 space-y-4">
              
              {/* Virtual Meter Card */}
              <div className={`p-6 rounded-2xl border transition-all duration-300 shadow-xl ${
                isHighPower 
                  ? 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-400 dark:border-rose-700 alert-pulse' 
                  : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400">VIRTUAL METER</span>
                    <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 font-mono text-xs font-bold">
                      WW-G024
                    </span>
                  </div>
                  <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase font-mono tracking-wide ${
                    isHighPower 
                      ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30' 
                      : 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                  }`}>
                    {isHighPower ? 'THRESHOLD EXCEEDED' : 'NORMAL LOAD'}
                  </span>
                </div>

                {/* Big Watts Ticker */}
                <div className="mt-4">
                  <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Active Power Draw</span>
                  <div className="text-4xl sm:text-5xl font-black font-mono tracking-tight text-slate-900 dark:text-white flex items-baseline gap-2 mt-0.5">
                    {activeWatts} <span className="text-lg font-normal text-slate-500">Watts</span>
                  </div>
                </div>

                {/* Gauge Bar */}
                <div className="mt-4 space-y-1.5">
                  <div className="flex justify-between text-[10px] font-mono text-slate-500">
                    <span>0W</span>
                    <span className="font-bold text-amber-500">Limit: 800W</span>
                    <span>3000W</span>
                  </div>
                  <div className="w-full h-3 bg-slate-200 dark:bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-300 dark:border-slate-800">
                    <div 
                      className={`h-full rounded-full transition-all duration-300 ${
                        isHighPower ? 'bg-rose-500 shadow-sm shadow-rose-500/50' : 'bg-emerald-500 shadow-sm shadow-emerald-500/50'
                      }`}
                      style={{ width: `${Math.min(100, (activeWatts / 2500) * 100)}%` }}
                    />
                  </div>
                </div>

                {/* Live AC Parameters */}
                <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 text-center font-mono">
                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850">
                    <span className="text-[10px] text-slate-400">Current (A)</span>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5">{currentAmps} A</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850">
                    <span className="text-[10px] text-slate-400">PF</span>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5">{powerFactor}</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850">
                    <span className="text-[10px] text-slate-400">Cost/Hr</span>
                    <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">₹{hourlyCostINR}</div>
                  </div>
                </div>

                {/* Consecutive Reading Anomaly Rule Simulation */}
                <div className="mt-4 p-3.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-700 dark:text-slate-300">10-Cycle Sustained Anomaly Rule:</span>
                    <span className={`font-mono ${consecutiveCount >= 10 ? 'text-rose-500 font-black' : 'text-slate-500'}`}>
                      {consecutiveCount} / 10 Cycles
                    </span>
                  </div>

                  <div className="grid grid-cols-10 gap-1">
                    {Array.from({ length: 10 }).map((_, idx) => (
                      <div 
                        key={idx}
                        className={`h-2.5 rounded-sm transition-all duration-300 ${
                          idx < consecutiveCount
                            ? consecutiveCount >= 10 ? 'bg-rose-500' : 'bg-amber-400'
                            : 'bg-slate-200 dark:bg-slate-800'
                        }`}
                      />
                    ))}
                  </div>

                  {consecutiveCount >= 10 ? (
                    <div className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1.5 pt-1">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>Alert Incident Generated: High Power sustained for ~150s.</span>
                    </div>
                  ) : isHighPower ? (
                    <div className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                      High load detected. Awaiting {10 - consecutiveCount} more cycles before confirming breach.
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-500">
                      Normal power load. Rule counter idle at 0.
                    </div>
                  )}
                </div>

              </div>

            </div>

          </div>

        </div>
      </section>

      {/* ---------------------------------------------------- */}
      {/* 4. Three-Floor Interactive Campus Layout Section */}
      {/* ---------------------------------------------------- */}
      <section id="floors" className="py-16 sm:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-8 gap-4">
          <div>
            <div className="inline-flex items-center space-x-1.5 text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-2">
              <Layers className="w-4 h-4" />
              <span>Campus Building Topology</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-950 dark:text-white tracking-tight">
              WattWise Hostel A Floor Schematic
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Select floors to explore rooms, click any room to inspect telemetry, and view shared facilities.
            </p>
          </div>

          {/* Floor selection buttons */}
          <div className="flex items-center space-x-2 bg-white dark:bg-slate-900 p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            {[
              { code: 'GROUND', label: 'Ground Floor', badge: '60 Rooms + Mess' },
              { code: 'SECOND', label: 'Second Floor', badge: '70 Rooms' },
              { code: 'THIRD', label: 'Third Floor', badge: '70 Rooms' }
            ].map(tab => (
              <button
                key={tab.code}
                onClick={() => setSelectedFloorTab(tab.code)}
                className={`px-3.5 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
                  selectedFloorTab === tab.code
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                  selectedFloorTab === tab.code ? 'bg-blue-800 text-blue-200' : 'bg-slate-100 dark:bg-slate-800'
                }`}>
                  {tab.badge}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Floor Schematic Preview Card & Interactive Inspector */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Floor Grid (8 cols) */}
          <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Interactive Room Matrix ({selectedFloorTab === 'GROUND' ? 'G001–G060' : selectedFloorTab === 'SECOND' ? 'S201–S270' : 'T301–T370'})
              </span>
              <span className="text-[11px] text-slate-400">Click any room to inspect</span>
            </div>

            {/* Shared Facilities for Ground Floor */}
            {selectedFloorTab === 'GROUND' && (
              <div className="space-y-2">
                <span className="text-[11px] font-bold uppercase text-slate-500">Shared Monitored Areas</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                  {[
                    { code: 'COMMON-MESS', name: 'Mess Hall', watts: 4200 },
                    { code: 'COMMON-CANTEEN', name: 'Canteen', watts: 2150 },
                    { code: 'COMMON-WARDEN', name: 'Warden Office', watts: 820 },
                    { code: 'COMMON-TV-HALL', name: 'TV Hall', watts: 1450 },
                    { code: 'GROUND-WASHROOM', name: 'Washrooms', watts: 450 },
                    { code: 'GROUND-CORRIDOR', name: 'Corridors', watts: 680 },
                    { code: 'STAIRWELL', name: 'Stairwell', watts: 240 }
                  ].map(fac => (
                    <button
                      key={fac.code}
                      onClick={() => setInspectedRoom({
                        id: fac.code,
                        name: fac.name,
                        watts: fac.watts,
                        voltage: 230.4,
                        status: fac.watts > 2500 ? 'HEAVY_COMMON_LOAD' : 'NORMAL',
                        todayKwh: (fac.watts * 0.018).toFixed(1),
                        floor: 'Ground Shared'
                      })}
                      className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-left hover:border-blue-500 transition"
                    >
                      <div className="text-[10px] font-mono text-blue-600 dark:text-blue-400 font-bold truncate">{fac.code}</div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white truncate">{fac.name}</div>
                      <div className="text-xs font-mono font-black text-slate-700 dark:text-slate-200 mt-1">{fac.watts}W</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Residential Room Grid */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase text-slate-500">
                Residential Rooms
              </span>

              <div className="grid grid-cols-6 sm:grid-cols-10 md:grid-cols-12 gap-1.5">
                {Array.from({ length: selectedFloorTab === 'GROUND' ? 60 : 70 }).map((_, idx) => {
                  const roomNum = selectedFloorTab === 'GROUND' 
                    ? `G${String(idx + 1).padStart(3, '0')}`
                    : selectedFloorTab === 'SECOND'
                      ? `S${201 + idx}`
                      : `T${301 + idx}`;

                  const isG024 = roomNum === 'G024';
                  const isSelected = inspectedRoom.id === roomNum;
                  const estimatedWatts = isG024 ? 1450 : 120 + ((idx * 17) % 320);

                  return (
                    <button
                      key={roomNum}
                      onClick={() => setInspectedRoom({
                        id: roomNum,
                        name: isG024 ? 'Aryan Patel' : `Resident Student #${idx + 1}`,
                        watts: estimatedWatts,
                        voltage: (229.8 + (idx % 3) * 0.3).toFixed(1),
                        status: isG024 ? 'EXCEEDED' : 'NORMAL',
                        todayKwh: (estimatedWatts * 0.0035 + 1.2).toFixed(2),
                        floor: selectedFloorTab === 'GROUND' ? 'Ground Floor' : selectedFloorTab === 'SECOND' ? 'Second Floor' : 'Third Floor'
                      })}
                      className={`p-2 rounded-lg border text-center transition cursor-pointer ${
                        isSelected
                          ? 'ring-2 ring-blue-500 border-blue-500 bg-blue-50 dark:bg-blue-950/60'
                          : isG024
                            ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-500 text-rose-600 dark:text-rose-300 font-bold'
                            : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800/80 text-slate-700 dark:text-slate-300 hover:border-blue-400'
                      }`}
                    >
                      <div className="text-[10px] font-mono font-bold">{roomNum}</div>
                      <div className="text-[9px] font-mono text-slate-400">
                        {estimatedWatts}W
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Right: Live Room Inspector Panel (4 cols) */}
          <div className="lg:col-span-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <Gauge className="w-4 h-4 text-blue-500" /> Room Telemetry Inspector
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase font-mono ${
                inspectedRoom.status === 'EXCEEDED' ? 'bg-rose-500/20 text-rose-600' : 'bg-emerald-500/20 text-emerald-600'
              }`}>
                {inspectedRoom.status}
              </span>
            </div>

            <div>
              <span className="text-[10px] text-slate-500 uppercase font-semibold">Inspected Room Unit</span>
              <div className="text-2xl font-black text-slate-900 dark:text-white font-mono mt-0.5 flex items-center justify-between">
                <span>Room {inspectedRoom.id}</span>
                <span className="text-xs font-normal text-slate-400">{inspectedRoom.floor}</span>
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1.5 mt-1">
                <User className="w-3.5 h-3.5 text-blue-500" />
                <span>Assigned: <strong>{inspectedRoom.name}</strong></span>
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 gap-2 pt-2">
              <div className="p-3 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase">Live Power</span>
                <div className={`text-lg font-black font-mono ${inspectedRoom.watts > 800 ? 'text-rose-500' : 'text-slate-900 dark:text-white'}`}>
                  {inspectedRoom.watts} W
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase">AC Voltage</span>
                <div className="text-lg font-black font-mono text-slate-900 dark:text-white">
                  {inspectedRoom.voltage} V
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase">Today's Energy</span>
                <div className="text-lg font-black font-mono text-emerald-600 dark:text-emerald-400">
                  {inspectedRoom.todayKwh} kWh
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase">Est. Mo. Cost</span>
                <div className="text-lg font-black font-mono text-slate-900 dark:text-white">
                  ₹{(inspectedRoom.todayKwh * 30 * 7.5).toFixed(0)}
                </div>
              </div>
            </div>

            <div className="pt-2">
              <Link
                to={`/warden/rooms?room=${inspectedRoom.id}`}
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-blue-600/20 transition"
              >
                <span>View Full Telemetry Log in Console</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>

          </div>

        </div>
      </section>

      {/* ---------------------------------------------------- */}
      {/* 5. Interactive Slab Tariff & Cost Calculator */}
      {/* ---------------------------------------------------- */}
      <section id="calculator" className="py-16 sm:py-24 bg-white dark:bg-slate-900/40 border-y border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto mb-12">
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-bold uppercase mb-3">
              <DollarSign className="w-3.5 h-3.5" />
              <span>Transparent Hostel Energy Pricing</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-950 dark:text-white tracking-tight">
              Interactive Slab Tariff Calculator
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
              Drag the monthly consumption slider below to inspect how tiered tariff slabs and fixed standing charges are computed for each hostel room.
            </p>
          </div>

          <div className="max-w-4xl mx-auto bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl">
            
            {/* Range Slider */}
            <div className="space-y-3 pb-6 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400">
                  Simulated Monthly Consumption:
                </span>
                <span className="text-2xl font-black font-mono text-blue-600 dark:text-blue-400">
                  {monthlyKwh} kWh
                </span>
              </div>
              <input
                type="range"
                min="30"
                max="350"
                step="5"
                value={monthlyKwh}
                onChange={(e) => setMonthlyKwh(Number(e.target.value))}
                className="w-full h-2.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <div className="flex justify-between text-[11px] font-mono text-slate-400">
                <span>30 kWh (Low/Vacant)</span>
                <span>100 kWh (Tier 1 Cap)</span>
                <span>200 kWh (Tier 2 Cap)</span>
                <span>350 kWh (Heavy Load)</span>
              </div>
            </div>

            {/* Bill Breakdown Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-6">
              <div className="p-4 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850">
                <span className="text-[10px] text-slate-400 uppercase font-bold">Tier 1 (0–100 kWh)</span>
                <div className="text-xs text-slate-500 mt-0.5">@ ₹6.50 / kWh</div>
                <div className="text-lg font-black font-mono text-slate-900 dark:text-white mt-1">
                  ₹{billBreakdown.slab1Cost.toFixed(2)}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850">
                <span className="text-[10px] text-slate-400 uppercase font-bold">Tier 2 (101–200 kWh)</span>
                <div className="text-xs text-slate-500 mt-0.5">@ ₹8.00 / kWh</div>
                <div className="text-lg font-black font-mono text-slate-900 dark:text-white mt-1">
                  ₹{billBreakdown.slab2Cost.toFixed(2)}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850">
                <span className="text-[10px] text-slate-400 uppercase font-bold">Tier 3 (201+ kWh)</span>
                <div className="text-xs text-slate-500 mt-0.5">@ ₹10.50 / kWh</div>
                <div className="text-lg font-black font-mono text-slate-900 dark:text-white mt-1">
                  ₹{billBreakdown.slab3Cost.toFixed(2)}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850">
                <span className="text-[10px] text-slate-400 uppercase font-bold">Fixed Meter Charge</span>
                <div className="text-xs text-slate-500 mt-0.5">Monthly standing fee</div>
                <div className="text-lg font-black font-mono text-slate-900 dark:text-white mt-1">
                  ₹{billBreakdown.fixedCharge.toFixed(2)}
                </div>
              </div>
            </div>

            {/* Total Highlight */}
            <div className="mt-6 p-4 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold text-blue-900 dark:text-blue-200">
                  Total Monthly Room Energy Assessment:
                </span>
                <div className="text-xs text-blue-700 dark:text-blue-300">
                  Itemized electricity bill including tiered slab rates and maintenance charge.
                </div>
              </div>
              <div className="text-3xl font-black font-mono text-blue-600 dark:text-blue-400">
                ₹{billBreakdown.total}
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* ---------------------------------------------------- */}
      {/* 6. Key Architecture & Platform Pillars (Bento Grid) */}
      {/* ---------------------------------------------------- */}
      <section id="features" className="py-16 sm:py-24 bg-slate-100/60 dark:bg-slate-900/40 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-black text-slate-950 dark:text-white tracking-tight">
              Engineered for Precision & Operational Clarity
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
              Built from first principles for reliability, reproducible testing, and zero false accusations.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* Pillar 1 */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4">
                <Clock className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">10-Cycle Anomaly Guard</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                Prevents false alarms from transient motor spikes by demanding 10 consecutive readings above limit (~2.5 minutes) before triggering an alert.
              </p>
            </div>

            {/* Pillar 2 */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4">
                <DollarSign className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Transparent Tariff Slabs</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                Supports flat rates or tiered slab tariffs with fixed standing charges. Calculates projected monthly bills with complete transparency.
              </p>
            </div>

            {/* Pillar 3 */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center mb-4">
                <Activity className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Heartbeat Surveillance</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                Automated detection distinguishes stale telemetry (&gt;45s) from confirmed offline devices (&gt;90s). Never falsely assumes an offline room uses zero watts.
              </p>
            </div>

            {/* Pillar 4 */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-4">
                <Lock className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Privacy by Architecture</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                Students are cryptographically isolated to their assigned room telemetry. Wardens retain whole-hostel visibility without leaking peer student metrics.
              </p>
            </div>

          </div>

        </div>
      </section>

      {/* ---------------------------------------------------- */}
      {/* 7. Technical Architecture Flow */}
      {/* ---------------------------------------------------- */}
      <section id="architecture" className="py-16 sm:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
            System Architecture
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-950 dark:text-white tracking-tight mt-1">
            End-to-End Telemetry Pipeline
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
            The simulator connects through the identical ingestion interface that physical smart meters will use in production.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {[
            { step: '01', title: 'Virtual Smart Meters', desc: '211 meters calculate V, I, pf & trapezoidal kWh every 15s', icon: Cpu },
            { step: '02', title: 'Ingestion API', desc: 'POST /api/v1/telemetry/readings with Zod schema validation', icon: Sliders },
            { step: '03', title: 'PostgreSQL Store', desc: 'Relational persistence with composite deduplication keys', icon: Database },
            { step: '04', title: 'Alert Engine', desc: 'Evaluates consecutive threshold violations & disconnects', icon: AlertTriangle },
            { step: '05', title: 'Socket.IO Gateway', desc: 'Dispatches real-time events to authorized client rooms', icon: Activity }
          ].map(p => {
            const Icon = p.icon;
            return (
              <div key={p.step} className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">{p.step}</span>
                  <Icon className="w-4 h-4 text-slate-500" />
                </div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white mt-2">{p.title}</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">{p.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ---------------------------------------------------- */}
      {/* 8. FAQ Section */}
      {/* ---------------------------------------------------- */}
      <section id="faq" className="py-16 sm:py-24 bg-slate-100/50 dark:bg-slate-900/30 border-t border-slate-200 dark:border-slate-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-black text-slate-950 dark:text-white tracking-tight">
              Frequently Asked Questions
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Engineering specifications and domain architecture details.
            </p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, index) => (
              <div 
                key={index}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm transition"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === index ? -1 : index)}
                  className="w-full p-4 text-left flex items-center justify-between font-bold text-xs sm:text-sm text-slate-900 dark:text-white"
                >
                  <span>{faq.q}</span>
                  <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${openFaq === index ? 'rotate-180' : ''}`} />
                </button>
                {openFaq === index && (
                  <div className="px-4 pb-4 text-xs text-slate-600 dark:text-slate-400 leading-relaxed border-t border-slate-100 dark:border-slate-800 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------- */}
      {/* 9. Call To Action Footer */}
      {/* ---------------------------------------------------- */}
      <footer className="bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-850 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold shadow-md shadow-blue-600/30">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <span className="font-extrabold text-sm text-slate-900 dark:text-white">WattWise Platform</span>
              <p className="text-[11px] text-slate-500">Real-Time IoT Hostel Energy Intelligence</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <ThemeToggle />
            <Link
              to="/warden"
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow-md shadow-blue-600/25"
            >
              Launch Warden Portal
            </Link>
            <Link
              to="/student"
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-850 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold border border-slate-200 dark:border-slate-700 transition"
            >
              Student Portal (G024)
            </Link>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 pt-6 border-t border-slate-200 dark:border-slate-900 text-center text-xs text-slate-400">
          WattWise &copy; 2026 • Simulated IoT Telemetry Engine • Designed for Hostel Energy Intelligence
        </div>
      </footer>

    </div>
  );
}
