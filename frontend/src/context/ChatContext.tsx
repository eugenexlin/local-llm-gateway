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

export interface ChatSettings {
  showThinkingBlocks: boolean;
  defaultThinkingCollapsed: boolean;
}

export interface ChatMessageItem {
  role: "user" | "assistant" | "system";
  content: string;
  thinking?: string;
  timestamp: number;
}

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessageItem[];
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
  setSelectedApiKeyId: (id: string) => void;
  messages: ChatMessageItem[];
  isLoading: boolean;
  streamingConversationId: string | null;
  error: string | null;
  lastUsage: TokenUsage | null;
  apiKeys: ApiKey[];
  apiKeyLoading: boolean;
  selectedKeyId: string;
  inputContent: string;
  setInputContent: (content: string) => void;
  includeReasoningInContext: boolean;
  setIncludeReasoningInContext: (b: boolean) => void;
  chatSettings: ChatSettings;
  setChatSettings: (settings: Partial<ChatSettings>) => void;
  sendMessage: (content: string) => void;
  revertToMessage: (index: number) => void;
  forkConversation: (index: number) => string;
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
const STORAGE_SETTINGS_KEY = "llm_chat_settings";

const ChatContext = createContext<ChatContextType | null>(null);

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

function truncateTitle(title: string, maxLength: number = 40): string {
  if (title.length <= maxLength) return title;
  const truncated = title.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(" ");
  return lastSpace > 20
    ? truncated.slice(0, lastSpace) + "..."
    : truncated + "...";
}

export function ChatProvider({ children }: { children: ReactNode }) {
  useAuth();

  const { apiKeys, apiKeyLoading, selectedKeyId, setSelectedApiKeyId } =
    useAPIKeys();

  const [conversations, setConversations] = useState<
    Record<string, Conversation>
  >(() => {
    try {
      const stored = localStorage.getItem(STORAGE_CONVERSATIONS_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  const [activeConversationId, setActiveConversationIdState] = useState<string>(
    () => {
      try {
        return localStorage.getItem(STORAGE_ACTIVE_KEY_KEY) || "";
      } catch {
        return "";
      }
    },
  );

  const [streamingConversationId, setStreamingConversationId] = useState<
    string | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const isLoading = streamingConversationId !== null;
  const [lastUsage, setLastUsage] = useState<TokenUsage | null>(null);
  const [includeReasoningInContext, setIncludeReasoningInContextState] =
    useState<boolean>(() => {
      try {
        const stored = localStorage.getItem(STORAGE_REASONING_KEY);
        return stored === "true";
      } catch {
        return false;
      }
    });

  const [chatSettings, setChatSettingsState] = useState<ChatSettings>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_SETTINGS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          showThinkingBlocks: parsed.showThinkingBlocks ?? true,
          defaultThinkingCollapsed: parsed.defaultThinkingCollapsed ?? false,
        };
      }
    } catch {
      // ignore
    }
    return {
      showThinkingBlocks: true,
      defaultThinkingCollapsed: false,
    };
  });

  const [inputContent, setInputContentState] = useState("");
  const setInputContent = useCallback((content: string) => {
    setInputContentState(content);
  }, []);

  const revertToMessage = useCallback(
    (index: number) => {
      setConversations((prev) => {
        const conv = prev[activeConversationId];
        if (!conv) return prev;

        // Find the last user message at or before the target index
        let endIndex = -1;
        for (let i = index; i >= 0; i--) {
          if (conv.messages[i]?.role === "user") {
            endIndex = i;
            break;
          }
        }

        // If no user message found, just keep up to the target index
        if (endIndex === -1) {
          endIndex = index;
        }

        const updatedMessages = conv.messages.slice(0, endIndex);
        return {
          ...prev,
          [activeConversationId]: {
            ...conv,
            messages: updatedMessages,
            updatedAt: Date.now(),
          },
        };
      });
    },
    [activeConversationId, setConversations],
  );

  const forkConversation = useCallback(
    (index: number) => {
      let forkedId = "";
      setConversations((prev) => {
        const conv = prev[activeConversationId];
        if (!conv) return prev;

        // Find the last assistant message at or before the target index
        let endIndex = -1;
        for (let i = index; i >= 0; i--) {
          if (conv.messages[i]?.role === "assistant") {
            endIndex = i;
            break;
          }
        }

        if (endIndex === -1) endIndex = index;

        const forkedMessages = conv.messages.slice(0, endIndex + 1);
        forkedId = generateId();

        const forkedConversation: Conversation = {
          id: forkedId,
          title: `Fork of ${conv.title}`,
          messages: forkedMessages,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        setLastUsage(null);

        return {
          ...prev,
          [forkedId]: forkedConversation,
        };
      });
      setActiveConversationIdState(forkedId);
      return forkedId;
    },
    [setConversations],
  );

  const activeConversation = conversations[activeConversationId] || null;
  const messages = activeConversation?.messages || [];

  useEffect(() => {
    if (Object.keys(conversations).length > 0) {
      try {
        localStorage.setItem(
          STORAGE_CONVERSATIONS_KEY,
          JSON.stringify(conversations),
        );
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
      localStorage.setItem(
        STORAGE_REASONING_KEY,
        String(includeReasoningInContext),
      );
    } catch {
      // Storage unavailable
    }
  }, [includeReasoningInContext]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_SETTINGS_KEY, JSON.stringify(chatSettings));
    } catch {
      // Storage unavailable
    }
  }, [chatSettings]);

  const setIncludeReasoningInContext = useCallback((val: boolean) => {
    setIncludeReasoningInContextState(val);
  }, []);

  const setChatSettings = useCallback((partial: Partial<ChatSettings>) => {
    setChatSettingsState((prev) => ({ ...prev, ...partial }));
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

  const deleteConversation = useCallback(
    (id: string) => {
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
    },
    [activeConversationId, conversations],
  );

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

      const userMessage: ChatMessageItem = {
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

      const assistantMessage: ChatMessageItem = {
        role: "assistant",
        content: "",
        timestamp: Date.now(),
      };

      setConversations((prev) => {
        const conv = prev[convId];
        if (!conv) return prev;
        const shouldAutoName =
          conv.title === "New Chat" && conv.messages.length === 0;
        return {
          ...prev,
          [convId]: {
            ...conv,
            title: shouldAutoName
              ? truncateTitle(content.trim(), 35)
              : conv.title,
            messages: [...conv.messages, userMessage, assistantMessage],
            updatedAt: Date.now(),
          },
        };
      });

      setStreamingConversationId(convId);
      setError(null);

      const conversationHistory = [
        ...(conversations[convId]?.messages || []),
        userMessage,
      ];

      try {
        const formatMessages = (msgs: typeof conversationHistory) => {
          return msgs.map((m) => {
            if (
              m.role === "assistant" &&
              m.thinking &&
              includeReasoningInContext
            ) {
              return {
                role: m.role,
                content: `<think>${m.thinking}</think>${m.content}`,
              };
            }
            return {
              role: m.role,
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

                    if (
                      thinkStart !== -1 &&
                      thinkEnd !== -1 &&
                      thinkEnd > thinkStart
                    ) {
                      const beforeThinking = content.slice(0, thinkStart);
                      const thinkingContent = content.slice(
                        thinkStart + 7,
                        thinkEnd,
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
        setStreamingConversationId(null);
      }
    },
    [
      messages,
      streamingConversationId,
      selectedKeyId,
      activeConversationId,
      conversations,
    ],
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
        streamingConversationId,
        error,
        lastUsage,
        apiKeys,
        apiKeyLoading,
        selectedKeyId: selectedKeyId,
        setSelectedApiKeyId,
        includeReasoningInContext,
        setIncludeReasoningInContext,
        chatSettings,
        setChatSettings,
        inputContent,
        setInputContent,
        revertToMessage,
        forkConversation,
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
