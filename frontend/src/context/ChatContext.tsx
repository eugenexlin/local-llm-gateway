import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { useAuth } from "./AuthContext";
import { useAPIKeys } from "./APIKeyContext";
import { ApiKey } from "../models/ApiKey";

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  thinking?: string;
  timestamp: number;
}

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

interface ChatContextType {
  conversations: Record<string, Conversation>;
  activeConversationId: string;
  activeConversation: Conversation | null;
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  lastUsage: TokenUsage | null;
  apiKeys: ApiKey[];
  apiKeyLoading: boolean;
  selectedKeyId: string;
  setSelectedApiKeyId: (id: string) => void;
  includeReasoningInContext: boolean;
  setIncludeReasoningInContext: (val: boolean) => void;
  sendMessage: (content: string) => Promise<void>;
  createConversation: () => void;
  switchConversation: (id: string) => void;
  deleteConversation: (id: string) => void;
  renameConversation: (id: string, title: string) => void;
  clearHistory: () => void;
  setError: (error: string | null) => void;
}

const pubUrl = import.meta.env.PUBLIC_URL || "";
const STORAGE_CONVERSATIONS_KEY = "llm_conversations";
const STORAGE_ACTIVE_KEY_KEY = "llm_active_conversation_id";
const STORAGE_REASONING_KEY = "llm_include_reasoning_in_context";

const ChatContext = createContext<ChatContextType | null>(null);

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

function truncateTitle(title: string, maxLength: number = 40): string {
  if (title.length <= maxLength) return title;
  const truncated = title.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(" ");
  return lastSpace > 20 ? truncated.slice(0, lastSpace) + "..." : truncated + "...";
}

export function ChatProvider({ children }: { children: ReactNode }) {
  useAuth();
  
  const { apiKeys, apiKeyLoading, selectedKeyId, setSelectedApiKeyId } = useAPIKeys();

  const [conversations, setConversations] = useState<Record<string, Conversation>>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_CONVERSATIONS_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  const [activeConversationId, setActiveConversationIdState] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_ACTIVE_KEY_KEY) || "";
    } catch {
      return "";
    }
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUsage, setLastUsage] = useState<TokenUsage | null>(null);
  const [includeReasoningInContext, setIncludeReasoningInContextState] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_REASONING_KEY);
      return stored === "true";
    } catch {
      return false;
    }
  });

  const activeConversation = conversations[activeConversationId] || null;
  const messages = activeConversation?.messages || [];

  useEffect(() => {
    if (Object.keys(conversations).length > 0) {
      try {
        localStorage.setItem(STORAGE_CONVERSATIONS_KEY, JSON.stringify(conversations));
      } catch {
        // Storage full or unavailable
      }
    }
  }, [conversations]);

  useEffect(() => {
    if (activeConversationId) {
      try {
        localStorage.setItem(STORAGE_ACTIVE_KEY_KEY, activeConversationId);
      } catch {
        // Storage unavailable
      }
    }
  }, [activeConversationId]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_REASONING_KEY, String(includeReasoningInContext));
    } catch {
      // Storage unavailable
    }
  }, [includeReasoningInContext]);

  const setIncludeReasoningInContext = useCallback((val: boolean) => {
    setIncludeReasoningInContextState(val);
  }, []);

  const createConversation = useCallback(() => {
    const id = generateId();
    const newConversation: Conversation = {
      id,
      title: "New Chat",
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setConversations((prev) => ({
      ...prev,
      [id]: newConversation,
    }));
    setActiveConversationIdState(id);
    setLastUsage(null);
  }, []);

  const switchConversation = useCallback((id: string) => {
    setActiveConversationIdState(id);
    setLastUsage(null);
  }, []);

  const deleteConversation = useCallback((id: string) => {
    setConversations((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    if (activeConversationId === id) {
      const remaining = Object.keys(conversations).filter((k) => k !== id);
      if (remaining.length > 0) {
        setActiveConversationIdState(remaining[0]);
      } else {
        setActiveConversationIdState("");
      }
      setLastUsage(null);
    }
  }, [activeConversationId, conversations]);

  const renameConversation = useCallback((id: string, title: string) => {
    setConversations((prev) => {
      const conv = prev[id];
      if (!conv) return prev;
      return {
        ...prev,
        [id]: {
          ...conv,
          title,
          updatedAt: Date.now(),
        },
      };
    });
  }, []);

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

      let convId = activeConversationId;
      
      // If no active conversation, create one
      if (!convId || !conversations[convId]) {
        convId = generateId();
        const newConversation: Conversation = {
          id: convId,
          title: truncateTitle(content.trim(), 35),
          messages: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        setConversations((prev) => ({
          ...prev,
          [convId]: newConversation,
        }));
        setActiveConversationIdState(convId);
      }

      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: "",
        timestamp: Date.now(),
      };

      setConversations((prev) => {
        const conv = prev[convId];
        if (!conv) return prev;
        const shouldAutoName = conv.title === "New Chat" && conv.messages.length === 0;
        return {
          ...prev,
          [convId]: {
            ...conv,
            title: shouldAutoName ? truncateTitle(content.trim(), 35) : conv.title,
            messages: [...conv.messages, userMessage, assistantMessage],
            updatedAt: Date.now(),
          },
        };
      });

      setIsLoading(true);
      setError(null);

      const conversationHistory = [...(conversations[convId]?.messages || []), userMessage];

      try {
        const formatMessages = (msgs: typeof conversationHistory) => {
          return msgs.map((m) => {
            if (m.role === "assistant" && m.thinking && includeReasoningInContext) {
              return {
                role: m.role as const,
                content: `<think>${m.thinking}</think>${m.content}`,
              };
            }
            return {
              role: m.role as const,
              content: m.content,
            };
          });
        };

        const response = await fetch(`${pubUrl}/api/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            key_id: selectedKeyId,
            model: "default",
            messages: formatMessages(conversationHistory),
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
        let usageParsed = false;

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

            // Parse usage data
            if (!usageParsed && data.includes('"usage"')) {
              try {
                const parsed = JSON.parse(data);
                const usage = parsed.usage;
                if (usage) {
                  setLastUsage({
                    promptTokens: usage.prompt_tokens || 0,
                    completionTokens: usage.completion_tokens || 0,
                    totalTokens: usage.total_tokens || 0,
                  });
                  usageParsed = true;
                }
              } catch {
                // Not a usage line, continue
              }
            }

            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta;
              if (!delta) continue;

              const reasoning = delta.reasoning || delta.reasoning_content;
              const content = delta.content;

              if (reasoning || content) {
                setConversations((prev) => {
                  const conv = prev[convId];
                  if (!conv) return prev;
                  const updatedMessages = [...conv.messages];
                  const lastIdx = updatedMessages.length - 1;
                  const msg = updatedMessages[lastIdx];

                  let newContent = msg.content;
                  let newThinking = msg.thinking || "";

                  if (content) {
                    const thinkStart = content.indexOf("<think>");
                    const thinkEnd = content.lastIndexOf("</think>");

                    if (thinkStart !== -1 && thinkEnd !== -1 && thinkEnd > thinkStart) {
                      const beforeThinking = content.slice(0, thinkStart);
                      const thinkingContent = content.slice(
                        thinkStart + 7,
                        thinkEnd
                      );
                      const afterThinking = content.slice(thinkEnd + 8);

                      if (beforeThinking) {
                        newContent = newContent + beforeThinking;
                      }
                      if (thinkingContent) {
                        newThinking = newThinking + thinkingContent;
                      }
                      if (afterThinking) {
                        newContent = newContent + afterThinking;
                      }
                    } else {
                      newContent = newContent + content;
                    }
                  }

                  if (reasoning) {
                    newThinking = newThinking + reasoning;
                  }

                  updatedMessages[lastIdx] = {
                    ...msg,
                    content: newContent,
                    thinking: newThinking || undefined,
                  };
                  return {
                    ...prev,
                    [convId]: {
                      ...conv,
                      messages: updatedMessages,
                      updatedAt: Date.now(),
                    },
                  };
                });
              }
            } catch {
              // Skip malformed JSON
            }
          }
        }

        // Finalize the message
        setConversations((prev) => {
          const conv = prev[convId];
          if (!conv) return prev;
          const updatedMessages = [...conv.messages];
          const lastIdx = updatedMessages.length - 1;
          updatedMessages[lastIdx] = {
            ...updatedMessages[lastIdx],
            content: updatedMessages[lastIdx].content,
          };
          return {
            ...prev,
            [convId]: {
              ...conv,
              messages: updatedMessages,
              updatedAt: Date.now(),
            },
          };
        });
      } catch (e: any) {
        setError(e.message || "Failed to send message");
        setConversations((prev) => {
          const conv = prev[convId];
          if (!conv) return prev;
          const updatedMessages = [...conv.messages];
          const lastIdx = updatedMessages.length - 1;
          if (
            updatedMessages[lastIdx]?.role === "assistant" &&
            !updatedMessages[lastIdx].content
          ) {
            updatedMessages[lastIdx] = {
              ...updatedMessages[lastIdx],
              content: "Sorry, I encountered an error. Please try again.",
            };
          }
          return {
            ...prev,
            [convId]: {
              ...conv,
              messages: updatedMessages,
              updatedAt: Date.now(),
            },
          };
        });
      } finally {
        setIsLoading(false);
      }
    },
    [messages, isLoading, selectedKeyId, activeConversationId, conversations],
  );

  const clearHistory = useCallback(() => {
    if (activeConversationId) {
      deleteConversation(activeConversationId);
    }
  }, [activeConversationId, deleteConversation]);

  return (
    <ChatContext.Provider
      value={{
        conversations,
        activeConversationId,
        activeConversation,
        messages,
        isLoading,
        error,
        lastUsage,
        apiKeys,
        apiKeyLoading,
        selectedKeyId: selectedKeyId,
        setSelectedApiKeyId,
        includeReasoningInContext,
        setIncludeReasoningInContext,
        sendMessage,
        createConversation,
        switchConversation,
        deleteConversation,
        renameConversation,
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
