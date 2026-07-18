import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ServerConfigItem, ServerHealthInfo } from '../types/metrics';

interface ServerContextType {
  serverConfig: ServerConfigItem[];
  healthMap: Record<string, ServerHealthInfo>;
}

const ServerContext = createContext<ServerContextType | null>(null);

interface ServerProviderProps {
  children: ReactNode;
}

export function ServerProvider({ children }: ServerProviderProps) {
  const [serverConfig, setServerConfig] = useState<ServerConfigItem[]>([]);
  const [healthMap, setHealthMap] = useState<Record<string, ServerHealthInfo>>({});

  useEffect(() => {
    const fetchServerConfig = async () => {
      try {
        const response = await fetch("/api/server-stats/config", {
          credentials: "include",
        });
        if (response.ok) {
          const data = await response.json();
          setServerConfig(data);
        }
      } catch (error) {
        console.error("Error fetching server config:", error);
      }
    };

    const fetchHealth = async () => {
      try {
        const response = await fetch("/api/server-stats/health", {
          credentials: "include",
        });
        if (response.ok) {
          const data: ServerHealthInfo[] = await response.json();
          const map: Record<string, ServerHealthInfo> = {};
          data.forEach(h => {
            map[h.name] = h;
          });
          setHealthMap(map);
        }
      } catch (error) {
        console.error("Error fetching server health:", error);
      }
    };

    fetchServerConfig();
    fetchHealth();
  }, []);

  return (
    <ServerContext.Provider value={{ serverConfig, healthMap }}>
      {children}
    </ServerContext.Provider>
  );
}

export function useServerContext() {
  const context = useContext(ServerContext);
  if (!context) {
    throw new Error('useServerContext must be used within a ServerProvider');
  }
  return context;
}