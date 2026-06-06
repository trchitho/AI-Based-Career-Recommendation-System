import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuth } from './AuthContext';

interface SocketContextType {
  ws: WebSocket | null;
  connected: boolean;
}

const SocketContext = createContext<SocketContextType>({ ws: null, connected: false });

export const useSocket = () => useContext(SocketContext);

interface SocketProviderProps {
  children: ReactNode;
}

export const SocketProvider = ({ children }: SocketProviderProps) => {
  const { user } = useAuth();
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!user) {
      if (ws) {
        ws.close();
        setWs(null);
        setConnected(false);
      }
      return;
    }

    // Get token from localStorage
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    // Initialize native WebSocket connection to FastAPI endpoint
    const API_ORIGIN = import.meta.env.DEV
      ? 'http://127.0.0.1:8000'
      : (import.meta.env.VITE_API_URL || window.location.origin).replace(/\/$/, '');
    const WS_BASE = API_ORIGIN.replace(/^http/, 'ws');
    const url = `${WS_BASE}/ws/notifications?token=${encodeURIComponent(token)}`;

    try {
      const sock = new WebSocket(url);

      sock.onopen = () => {
        setConnected(true);
        console.log('WebSocket connected');
      };

      sock.onclose = () => {
        setConnected(false);
        // Silently handle close - this is expected if WS endpoint doesn't exist
      };

      sock.onerror = (error) => {
        setConnected(false);
        // Silently handle error - WS is optional feature
        console.debug('WebSocket connection failed (optional feature)');
      };

      setWs(sock);

      // Cleanup on unmount
      return () => {
        sock.close();
      };
    } catch (error) {
      // Silently fail if WebSocket not available
      console.debug('WebSocket not available (optional feature)');
    }
  }, [user]);

  return (
    <SocketContext.Provider value={{ ws, connected }}>
      {children}
    </SocketContext.Provider>
  );
};
