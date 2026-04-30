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

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
}

interface ChatContextType {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  apiKeys: ApiKey[];
  apiKeyLoading: boolean;
  selectedKeyId: string;
  setSelectedApiKeyId: (id: string) => void;
  sendMessage: (content: string) => Promise<void>;
  clearHistory: () => void;
  setError: (error: string | null) => void;
}

const pubUrl = import.meta.env.PUBLIC_URL || "";
const STORAGE_MESSAGES_KEY = "llm_chat_history";
const STORAGE_API_KEY_ID_KEY = "llm_selected_api_key_id";

const ChatContext = createContext<ChatContextType | null>(null);

export function ChatProvider({ children }: { children: ReactNode }) {
  useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_MESSAGES_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [selectedKeyId, setSelectedKeyIdState] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [apiKeyLoading, setApiKeyLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_API_KEY_ID_KEY);
    if (stored) {
      const found = apiKeys.find((k) => k.id === stored);
      if (found) {
        setSelectedKeyIdState(found.id);
      }
    }
  }, [apiKeys]);

  useEffect(() => {
    if (messages.length > 0) {
      try {
        localStorage.setItem(STORAGE_MESSAGES_KEY, JSON.stringify(messages));
      } catch {
        // Storage full or unavailable
      }
    }
  }, [messages]);

  useEffect(() => {
    const fetchApiKeys = async () => {
      try {
        const response = await fetch(`/api/api-keys`, {
          credentials: "include",
        });
        if (response.ok) {
          const keys = await response.json();
          setApiKeys(keys);

          const storedKey = localStorage.getItem(STORAGE_API_KEY_ID_KEY);
          if (storedKey) {
            const found = keys.find((k: any) => k.id === storedKey);
            if (found) {
              setSelectedKeyIdState(found.id);
            } else if (keys.length > 0) {
              setSelectedKeyIdState(keys[0].id);
            }
          } else if (keys.length > 0) {
            setSelectedKeyIdState(keys[0].id);
          }
        }
      } catch (e) {
        console.error("Failed to fetch API keys:", e);
      } finally {
        setApiKeyLoading(false);
      }
    };

    fetchApiKeys();
  }, []);

  const setSelectedApiKeyId = useCallback(
    (id: string) => {
      const found = apiKeys.find((k) => k.id === id);
      if (found) {
        setSelectedKeyIdState(found.id);
      }
      try {
        localStorage.setItem(STORAGE_API_KEY_ID_KEY, id);
      } catch {
        // Storage unavailable
      }
    },
    [apiKeys],
  );

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isLoading || !selectedKeyId) {
        return;
      }

      const userMessage: ChatMessage = {
        role: "user",
        content: content.trim(),
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);
      setError(null);

      const conversationHistory = [...messages, userMessage];

      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: "",
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      try {
        const response = await fetch(`${pubUrl}/api/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            key_id: selectedKeyId,
            model: "default",
            messages: conversationHistory.map((m) => ({
              role: m.role,
              content: m.content,
            })),
            stream: true,
            max_tokens: 4096,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.error?.message || `Request failed: ${response.status}`,
          );
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("Streaming not supported");
        }

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data: ")) continue;
            const data = trimmed.slice(6);
            if (data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta?.content;
              if (delta) {
                setMessages((prev) => {
                  const updated = [...prev];
                  const lastIdx = updated.length - 1;
                  updated[lastIdx] = {
                    ...updated[lastIdx],
                    content: updated[lastIdx].content + delta,
                  };
                  return updated;
                });
              }
            } catch {
              // Skip malformed JSON
            }
          }
        }

        // Finalize the message
        setMessages((prev) => {
          const updated = [...prev];
          const lastIdx = updated.length - 1;
          updated[lastIdx] = {
            ...updated[lastIdx],
            content: updated[lastIdx].content,
          };
          return updated;
        });
      } catch (e: any) {
        setError(e.message || "Failed to send message");
        setMessages((prev) => {
          const updated = [...prev];
          const lastIdx = updated.length - 1;
          if (
            updated[lastIdx]?.role === "assistant" &&
            !updated[lastIdx].content
          ) {
            updated[lastIdx] = {
              ...updated[lastIdx],
              content: "Sorry, I encountered an error. Please try again.",
            };
          }
          return updated;
        });
      } finally {
        setIsLoading(false);
      }
    },
    [messages, isLoading, selectedKeyId],
  );

  const clearHistory = useCallback(() => {
    setMessages([]);
    try {
      localStorage.removeItem(STORAGE_MESSAGES_KEY);
    } catch {
      // Storage unavailable
    }
  }, []);

  return (
    <ChatContext.Provider
      value={{
        messages,
        isLoading,
        error,
        apiKeys,
        apiKeyLoading,
        selectedKeyId: selectedKeyId,
        setSelectedApiKeyId,
        sendMessage,
        clearHistory,
        setError,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
}
