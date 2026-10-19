import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { token, isAuthenticated } = useAuth();
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [liveReadings, setLiveReadings] = useState({}); // key: roomId or deviceUid -> reading
  const [latestAlert, setLatestAlert] = useState(null);

  useEffect(() => {
    if (!isAuthenticated || !token) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    const socketInstance = io('/', {
      auth: { token },
      reconnectionAttempts: 10,
      reconnectionDelay: 2000
    });

    socketInstance.on('connect', () => {
      console.log('⚡ Socket connected to WattWise gateway:', socketInstance.id);
      setIsConnected(true);
    });

    socketInstance.on('disconnect', () => {
      console.log('⚠️ Socket disconnected');
      setIsConnected(false);
    });

    socketInstance.on('meter:reading', (reading) => {
      setLiveReadings(prev => ({
        ...prev,
        [reading.deviceUid]: reading,
        ...(reading.roomId ? { [reading.roomId]: reading } : {}),
        ...(reading.roomCode ? { [reading.roomCode]: reading } : {})
      }));
    });

    socketInstance.on('alert:created', (alert) => {
      console.warn('🚨 Real-time alert received:', alert);
      setLatestAlert(alert);
    });

    socketInstance.on('alert:updated', (updated) => {
      console.log('ℹ️ Alert updated:', updated);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [token, isAuthenticated]);

  const subscribeRoom = (roomId) => {
    if (socket && isConnected) {
      socket.emit('subscribe:room', { roomId });
    }
  };

  return (
    <SocketContext.Provider value={{
      socket,
      isConnected,
      liveReadings,
      latestAlert,
      subscribeRoom,
      clearLatestAlert: () => setLatestAlert(null)
    }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}
