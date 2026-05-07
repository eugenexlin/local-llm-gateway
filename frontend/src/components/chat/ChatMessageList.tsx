import React, { useRef, useEffect, useCallback } from "react";
import { Box, Typography, IconButton, Tooltip } from "@mui/material";
import ChatMessage from "./ChatMessage";
import ChatDots from "./ChatDots";
import { useChat } from "../../context/ChatContext";
import NavigateBeforeIcon from "@mui/icons-material/NavigateBefore";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";

interface ChatMessageListProps {
  onMobileClose?: () => void;
  pageMode?: boolean;
}

// distance from which we will base the direction we go relative to the previous set scroll position
// this is to not deal with the dumb crud of exact matching calculation
// for example you get set to some location
// then you scroll down like 50 units,
// and then you click previous on the arrow keys, you should go back to original
// or you click next, and the you should go to next
const DISTANCE_FOR_PROXIMITY_LOGIC = 10;

const ChatMessageList: React.FC<ChatMessageListProps> = ({ onMobileClose, pageMode }) => {
  const {
    messages,
    isLoading,
    streamingConversationId,
    activeConversation,
    createConversation,
  } = useChat();
  const scrollRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);
  const prevMessagesLengthRef = useRef(0);

  const targetMessageIndex = useRef<number>(-1);

  // keep track of last programatic scroll position and move again if it didnt change.
  const previousScrollTop = useRef<number>(-1);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const threshold = 30;
    isAtBottomRef.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < threshold;

    // because we want to target the element in the middle of screen calculate it
    const children = Array.from(el.children) as HTMLElement[];
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
      const child = children.find(
        (c) => c.getAttribute("data-index") === msgIdx.toString(),
      );
      if (child) {
        const childRect = child.getBoundingClientRect();
        const distance =
          targetOffset - (childRect.top - parentTop);
        if (distance >= 0 && distance < minDistance) {
          minDistance = distance;
          closestIndex = msgIdx;
        }
      }
    }
    if (closestIndex !== -1) {
      targetMessageIndex.current = closestIndex;
    }
  }, [messages]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  useEffect(() => {
    const el = scrollRef.current;
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
    onMobileClose?.();
  };

  const scrollToUserMessage = (direction: "next" | "prev") => {
    if (!scrollRef.current) return;

    const el = scrollRef.current;
    const currentTop = el.scrollTop;
    const children = Array.from(el.children) as HTMLElement[];

    const userMessageIndices = messages
      .map((msg, idx) => (msg.role === "user" ? idx : -1))
      .filter((idx) => idx !== -1);

    if (userMessageIndices.length === 0) return;

    let targetIndexInArray = -1;
    const currentIndexInArray = userMessageIndices.indexOf(
      targetMessageIndex.current,
    );

    // try proximity
    if (
      Math.abs(currentTop - previousScrollTop.current) <
      DISTANCE_FOR_PROXIMITY_LOGIC
    ) {
      // ok it turns out the math might be perfect and work fine for now.
    }

    if (direction === "next") {
      targetIndexInArray = currentIndexInArray + 1;
    } else {
      if (currentTop != previousScrollTop.current) {
        // focus the current target
        targetIndexInArray = currentIndexInArray;
      } else {
        targetIndexInArray = currentIndexInArray - 1;
      }
    }
    if (targetIndexInArray < 0) {
      targetIndexInArray = 0;
    }

    if (targetIndexInArray >= userMessageIndices.length) {
      // scroll to end
      el.scrollTo(0, el.scrollHeight);
    } else {
      targetMessageIndex.current = userMessageIndices[targetIndexInArray];
      const targetChild = children.find(
        (c) =>
          c.getAttribute("data-index") ===
          targetMessageIndex.current.toString(),
      );
      if (targetChild) {
        // WARNING you must not use animation, or you have to update the timeout.
        targetChild.scrollIntoView({ behavior: "instant", block: "center" });
        setTimeout(() => {
          previousScrollTop.current = el.scrollTop;
        }, 50);
      }
    }
  };

  return (
    <Box
      ref={scrollRef}
      sx={{
        flex: 1,
        overflow: "auto",
        bgcolor: "#f8fafc",
        position: "relative",
      }}
    >
      {/* Navigation Controls */}
      {messages.length > 0 && (
        <Box
          sx={{
            position: "sticky",
            top: 0,
            zIndex: 10,
            display: "flex",
            justifyContent: "center",
            gap: 1,
            py: 1,
            px: pageMode ? { xs: 2, sm: 4, md: 6 } : { xs: 1, sm: 2 },
            bgcolor: "rgba(248, 250, 252, 0.8)",
            backdropFilter: "blur(4px)",
          }}
        >
          <Tooltip title="Previous User Message">
            <IconButton
              size="small"
              onClick={() => scrollToUserMessage("prev")}
            >
              <NavigateBeforeIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Next User Message">
            <IconButton
              size="small"
              onClick={() => scrollToUserMessage("next")}
            >
              <NavigateNextIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      )}

      {messages.length === 0 ? (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
            px: { xs: 2, sm: 4 },
            textAlign: "center",
            cursor: "pointer",
          }}
          onClick={handleEmptyStateClick}
        >
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: 3,
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
            Select an API key above, then type a message to chat with the LLM.
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
                  pageMode={pageMode}
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
