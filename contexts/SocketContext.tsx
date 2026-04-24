'use client';

import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  connectionError: Error | null;
  joinPaymentRoom: (transactionId: string) => void;
  leavePaymentRoom: (transactionId: string) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

interface SocketProviderProps {
  children: ReactNode;
}

export function SocketProvider({ children }: SocketProviderProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<Error | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Check if polling is forced via environment variable
    const forcePolling = process.env.NEXT_PUBLIC_FORCE_POLLING === 'true';
    if (forcePolling) {
      console.log('🔌 Polling forced via environment variable, skipping websocket initialization');
      setIsConnected(false);
      setConnectionError(new Error('Polling forced'));
      return;
    }

    // Initialize socket connection
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://splendid-starlink.onrender.com';
    const socketUrl = apiUrl.replace(/^http/, 'ws'); // Convert http to ws

    socketRef.current = io(`${socketUrl}/payments`, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });

    const socket = socketRef.current;

    socket.on('connect', () => {
      console.log('🔌 Connected to payment WebSocket');
      setIsConnected(true);
      setConnectionError(null);
    });

    socket.on('disconnect', () => {
      console.log('🔌 Disconnected from payment WebSocket');
      setIsConnected(false);
    });

    socket.on('connect_error', (error) => {
      console.error('🔌 WebSocket connection error:', error);
      setIsConnected(false);
      setConnectionError(error instanceof Error ? error : new Error(String(error)));
    });

    // Cleanup on unmount
    return () => {
      socket.disconnect();
    };
  }, []);

  const joinPaymentRoom = (transactionId: string) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('join-payment-room', { transactionId });
    }
  };

  const leavePaymentRoom = (transactionId: string) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('leave-payment-room', { transactionId });
    }
  };

  const value: SocketContextType = {
    socket: socketRef.current,
    isConnected,
    connectionError,
    joinPaymentRoom,
    leavePaymentRoom,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}