import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { useAuth } from "./AuthContext";
import { ApiKey } from "../models/ApiKey";
import { getItem, setItem, removeItem } from "../utils/storage";

interface APIKeyContextType {
  apiKeys: ApiKey[];
  apiKeyLoading: boolean;
  selectedKeyId: string;
  setSelectedApiKeyId: (id: string) => void;
  fetchApiKeys: () => Promise<void>;
  createKey: (
    name: string,
    description?: string | null,
  ) => Promise<ApiKey | null>;
  revokeKey: (keyId: string) => Promise<{ action: string } | null>;
  updateKey: (
    keyId: string,
    name: string,
    description?: string | null,
  ) => Promise<ApiKey | null>;
}

const STORAGE_API_KEY_ID_KEY = "llm_selected_api_key_id";

const APIKeyContext = createContext<APIKeyContextType | null>(null);

export function APIKeyProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [apiKeyLoading, setApiKeyLoading] = useState(true);
  const [selectedKeyId, setSelectedKeyIdState] = useState<string>(() => {
    try {
      if (!userId) return "";
      return getItem(userId, STORAGE_API_KEY_ID_KEY) || "";
    } catch {
      return "";
    }
  });

  useEffect(() => {
    fetchApiKeys();
  }, []);

  const fetchApiKeys = useCallback(async () => {
    try {
      const response = await fetch(`/api/api-keys`, {
        credentials: "include",
      });
      if (response.ok) {
        const keys = await response.json();
        setApiKeys(keys);

        if (userId) {
          const storedKey = getItem(userId, STORAGE_API_KEY_ID_KEY);
          if (storedKey) {
            const found = keys.find((k: any) => k.id === storedKey);
            if (found) {
              setSelectedKeyIdState(found.id);
            }
          }
        }
      }
    } catch (e) {
      console.error("Failed to fetch API keys:", e);
    } finally {
      setApiKeyLoading(false);
    }
  }, [userId]);

  const setSelectedApiKeyId = useCallback(
    (id: string) => {
      const found = apiKeys.find((k) => k.id === id);
      if (found) {
        setSelectedKeyIdState(found.id);
      }
      if (userId) {
        try {
          setItem(userId, STORAGE_API_KEY_ID_KEY, id);
        } catch {
          // Storage unavailable
        }
      }
    },
    [apiKeys, userId],
  );

  const createKey = useCallback(
    async (name: string, description?: string | null) => {
      try {
        const response = await fetch("/api/api-keys", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            name,
            description: description || null,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const newKey: ApiKey = { ...data, api_key: data.api_key };
          setApiKeys((prev) => [newKey, ...prev]);
          return newKey;
        }
      } catch (error) {
        console.error("Failed to create API key:", error);
      }
      return null;
    },
    [],
  );

  const revokeKey = useCallback(
    async (keyId: string) => {
      try {
        const response = await fetch(`/api/api-keys/${keyId}`, {
          method: "DELETE",
          credentials: "include",
        });

        if (response.ok) {
          const data = await response.json();
          const isCurrentlySelected = selectedKeyId === keyId;

          setApiKeys((prev) => {
            let updatedKeys: ApiKey[];
            if (data.action === "deleted") {
              updatedKeys = prev.filter((key) => key.id !== keyId);
            } else {
              updatedKeys = prev.map((key) =>
                key.id === keyId
                  ? {
                      ...key,
                      is_active: 0,
                      revoked_at: new Date().toISOString(),
                    }
                  : key,
              );
            }

            if (isCurrentlySelected) {
              setSelectedKeyIdState("");
              if (userId) {
                try {
                  removeItem(userId, STORAGE_API_KEY_ID_KEY);
                } catch {
                  // Storage unavailable
                }
              }
            }

            return updatedKeys;
          });
          return data;
        }
      } catch (error) {
        console.error("Failed to revoke API key:", error);
      }
      return null;
    },
    [selectedKeyId],
  );

  const updateKey = useCallback(
    async (keyId: string, name: string, description?: string | null) => {
      if (!name.trim()) return null;

      try {
        const response = await fetch(`/api/api-keys/${keyId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            name,
            description: description || null,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          setApiKeys((prev) =>
            prev.map((key) =>
              key.id === keyId
                ? { ...key, name: data.name, description: data.description }
                : key,
            ),
          );
          return { ...data, id: keyId } as ApiKey;
        }
      } catch (error) {
        console.error("Failed to save API key:", error);
      }
      return null;
    },
    [],
  );

  return (
    <APIKeyContext.Provider
      value={{
        apiKeys,
        apiKeyLoading,
        selectedKeyId,
        setSelectedApiKeyId,
        fetchApiKeys,
        createKey,
        revokeKey,
        updateKey,
      }}
    >
      {children}
    </APIKeyContext.Provider>
  );
}

export function useAPIKeys() {
  const context = useContext(APIKeyContext);
  if (!context) {
    throw new Error("useAPIKeys must be used within an APIKeyProvider");
  }
  return context;
}
