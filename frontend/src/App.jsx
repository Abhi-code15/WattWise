import React from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';

import Navbar from './components/Navbar';
import AlertBanner from './components/AlertBanner';

import Landing from './pages/Landing';
import Login from './pages/Login';
import WardenOverview from './pages/warden/WardenOverview';
import FloorMap from './pages/warden/FloorMap';
import RoomMonitoring from './pages/warden/RoomMonitoring';
import AlertsCenter from './pages/warden/AlertsCenter';
import Analytics from './pages/warden/Analytics';
import MeterManagement from './pages/warden/MeterManagement';
import SimulatorControl from './pages/warden/SimulatorControl';
import Settings from './pages/warden/Settings';

import StudentDashboard from './pages/student/StudentDashboard';

function ProtectedLayout({ allowedRoles }) {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center text-slate-500 dark:text-slate-400 text-sm">
        Authenticating session...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return <Navigate to={user?.role === 'WARDEN' ? '/warden' : '/student'} replace />;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col text-slate-900 dark:text-slate-100 transition-colors duration-200">
      <Navbar />
      <AlertBanner />
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        <Outlet />
      </main>
      <footer className="border-t border-slate-200 dark:border-slate-850 py-6 text-center text-xs text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-950">
        WattWise &copy; 2026 • Simulated IoT Telemetry Engine • Designed for Hostel Energy Intelligence
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SocketProvider>
          <Routes>
            {/* Public Landing & Marketing Page */}
            <Route path="/" element={<Landing />} />
            <Route path="/landing" element={<Landing />} />
            <Route path="/login" element={<Login />} />

            {/* Warden Protected Routes */}
            <Route element={<ProtectedLayout allowedRoles={['WARDEN']} />}>
              <Route path="/warden" element={<WardenOverview />} />
              <Route path="/warden/floors" element={<FloorMap />} />
              <Route path="/warden/rooms" element={<RoomMonitoring />} />
              <Route path="/warden/alerts" element={<AlertsCenter />} />
              <Route path="/warden/analytics" element={<Analytics />} />
              <Route path="/warden/meters" element={<MeterManagement />} />
              <Route path="/warden/simulator" element={<SimulatorControl />} />
              <Route path="/warden/settings" element={<Settings />} />
            </Route>

            {/* Student Protected Routes */}
            <Route element={<ProtectedLayout allowedRoles={['STUDENT', 'WARDEN']} />}>
              <Route path="/student" element={<StudentDashboard />} />
            </Route>

            {/* Fallback to Landing */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </SocketProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
