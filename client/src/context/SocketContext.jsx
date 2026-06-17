import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext.jsx';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { user, getToken } = useAuth();
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [wasDisconnected, setWasDisconnected] = useState(false);

  useEffect(() => {
    if (!user) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    const token = getToken();
    const socket = io({
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30000,
      randomizationFactor: 0.5,
      timeout: 20000
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      setReconnecting(false);
      setReconnectAttempts(0);
      if (wasDisconnected) {
        setWasDisconnected(false);
      }
    });

    socket.on('disconnect', (reason) => {
      setConnected(false);
      if (reason !== 'io client disconnect') {
        setWasDisconnected(true);
      }
    });

    socket.on('reconnect_attempt', (attemptNumber) => {
      setReconnectAttempts(attemptNumber);
      setReconnecting(true);
    });

    socket.on('reconnect', () => {
      setConnected(true);
      setReconnecting(false);
      setReconnectAttempts(0);
    });

    socket.on('reconnect_failed', () => {
      setReconnecting(false);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
      setWasDisconnected(false);
    };
  }, [user, getToken]);

  const getSocket = useCallback(() => socketRef.current, []);

  const emit = useCallback((event, data, callback) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit(event, data, callback);
    } else if (callback) {
      callback({ success: false, error: '未连接到服务器' });
    }
  }, []);

  const on = useCallback((event, handler) => {
    if (socketRef.current) {
      socketRef.current.on(event, handler);
    }
  }, []);

  const off = useCallback((event, handler) => {
    if (socketRef.current) {
      socketRef.current.off(event, handler);
    }
  }, []);

  return (
    <SocketContext.Provider value={{
      socket: socketRef.current,
      connected,
      reconnecting,
      reconnectAttempts,
      wasDisconnected,
      setWasDisconnected,
      getSocket,
      emit,
      on,
      off
    }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket must be used within SocketProvider');
  return ctx;
}
