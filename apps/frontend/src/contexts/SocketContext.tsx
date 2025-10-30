import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { useAuth } from "./AuthContext";

interface SocketContextType {
  ws: WebSocket | null;
  connected: boolean;
}

const SocketContext = createContext<SocketContextType>({
  ws: null,
  connected: false,
});

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
    const token = localStorage.getItem("accessToken");
    if (!token) return;

    // Initialize native WebSocket connection to FastAPI endpoint
    const WS_BASE = import.meta.env.DEV
      ? "ws://localhost:8000"
      : window.location.origin.replace(/^http/, "ws");
    const url = `${WS_BASE}/ws/notifications?token=${encodeURIComponent(token)}`;
    const sock = new WebSocket(url);
    sock.onopen = () => {
      setConnected(true);
    };
    sock.onclose = () => {
      setConnected(false);
    };
    sock.onerror = () => {
      setConnected(false);
    };
    setWs(sock);

    // Cleanup on unmount
    return () => {
      sock.close();
    };
  }, [user]);

  return (
    <SocketContext.Provider value={{ ws, connected }}>
      {children}
    </SocketContext.Provider>
  );
};
