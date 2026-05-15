import React, { useRef, useEffect, useCallback } from "react";
import { Box, Typography } from "@mui/material";
import ChatMessage from "./ChatMessage";
import ChatDots from "./ChatDots";
import { useChat } from "../../context/ChatContext";

interface ChatMessageListProps {
  onMobileClose?: () => void;
  highlightIndex?: number | null;
}

const ChatMessageList: React.FC<ChatMessageListProps> = (
  props: ChatMessageListProps,
) => {
  const {
    messages,
    isLoading,
    streamingConversationId,
    activeConversation,
    createConversation,
    scrollState,
  } = useChat();
  const { highlightIndex } = props;
  const isAtBottomRef = useRef(true);
  const prevMessagesLengthRef = useRef(0);

  const handleScroll = useCallback(() => {
    const el = document.getElementById("main-content");
    if (!el) return;
    const threshold = 30;
    isAtBottomRef.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < threshold;

    // because we want to target the element in the middle of screen calculate it
    const userMessageIndices = messages
      .map((msg, idx) => (msg.role === "user" ? idx : -1))
      .filter((idx) => idx !== -1);
    if (userMessageIndices.length === 0) return;

    let closestIndex = -1;
    let minDistance = Infinity;
    const elRect = el.getBoundingClientRect();

    const parentTop = elRect.top / 2; // this is basically the height of the top bar to be subtracted
    const targetOffset = el.clientHeight / 2 + 3; // plus few pixel to tie break so that seeking to the next number surely
    for (let i = 0; i < userMessageIndices.length; i++) {
      const msgIdx = userMessageIndices[i];
      const child = el.querySelector(`[data-index="${msgIdx}"]`) as HTMLElement;
      if (child) {
        const childRect = child.getBoundingClientRect();
        const distance = targetOffset - (childRect.top - parentTop);
        if (distance >= 0 && distance < minDistance) {
          minDistance = distance;
          closestIndex = msgIdx;
        }
      }
    }
    if (closestIndex !== -1) {
      scrollState.targetMessageIndex = closestIndex;
    }
  }, [messages]);

  useEffect(() => {
    const el = document.getElementById("main-content");
    if (!el) return;
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  useEffect(() => {
    const el = document.getElementById("main-content");
    if (!el) return;

    const prevLen = prevMessagesLengthRef.current;
    const currLen = messages.length;

    if (prevLen === 0 && currLen > 0) {
      el.scrollTop = el.scrollHeight;
      prevMessagesLengthRef.current = currLen;
      return;
    }

    if (isAtBottomRef.current) {
      el.scrollTop = el.scrollHeight;
    }

    prevMessagesLengthRef.current = currLen;
  }, [messages, isLoading]);

  const handleEmptyStateClick = () => {
    if (activeConversation && activeConversation.messages.length === 0) {
      // Already have a conversation, just focus input
    } else {
      createConversation();
    }
    props.onMobileClose?.();
  };

  return (
    <Box
      sx={{
        flex: 1,
        overflow: "visible",
        position: "relative",
      }}
    >
      {messages.length === 0 ? (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
            p: { xs: 2, sm: 4 },
            textAlign: "center",
          }}
          onClick={handleEmptyStateClick}
        >
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              bgcolor: "rgba(139, 92, 246, 0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              mb: 2,
            }}
          >
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#8b5cf6"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </Box>
          <Typography
            variant="h6"
            sx={{ color: "#475569", fontWeight: 600, mb: 1 }}
          >
            Start a conversation
          </Typography>
          <Typography variant="body2" sx={{ color: "#94a3b8", maxWidth: 280 }}>
            Type a message to chat with the LLM.
          </Typography>
        </Box>
      ) : (
        <>
          {messages.map((msg, idx) => (
            <Box key={idx} data-index={idx} data-role={msg.role}>
              <ChatMessage
                index={idx}
                message={msg}
                isStreaming={
                  streamingConversationId === activeConversation?.id &&
                  idx === messages.length - 1 &&
                  msg.role === "assistant"
                }
                isHighlighted={idx === highlightIndex}
              />
            </Box>
          ))}
          {streamingConversationId === activeConversation?.id &&
            messages.length > 0 &&
            messages[messages.length - 1].role === "user" && (
              <Box
                sx={{
                  px: { xs: 1, sm: 2 },
                  display: "flex",
                  justifyContent: "flex-start",

                  mb: 1.5,
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    gap: 0.5,
                    px: 2,
                    py: 1.25,
                    bgcolor: "#f1f5f9",
                    borderRadius: "16px 16px 16px 4px",
                  }}
                >
                  <ChatDots />
                </Box>
              </Box>
            )}
        </>
      )}
    </Box>
  );
};

export default ChatMessageList;
