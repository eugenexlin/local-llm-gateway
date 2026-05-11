import { Box, IconButton, Tooltip, useMediaQuery } from "@mui/material";
import ChatMessageList from "../chat/ChatMessageList";
import ChatSetupModal from "../chat/ChatSetupModal";
import ChatInput from "../chat/ChatInput";
import { useChat } from "../../context/ChatContext";
import { useState, useCallback } from "react";
import { sharedGlassStyle } from "../../utils/styles";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import ChatSettingsModal from "../chat/ChatSettingsModal";
import ConversationList from "../chat/ConversationSidebar";
import theme from "../../theme";

interface ChatLayoutProps {}

export const ChatLayout = (props: ChatLayoutProps) => {
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const {
    messages,
    selectedKeyId,
    scrollState,
    chatSettings,
    setChatSettings,
    includeReasoningInContext,
    setIncludeReasoningInContext,
  } = useChat();
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isConversationListOpen, setIsConversationListOpen] =
    useState<boolean>(false);
  const [highlightIndex, setHighlightIndex] = useState<number | null>(null);

  const scrollToUserMessage = useCallback(
    (direction: "next" | "prev") => {
      const el = document.getElementById("main-content");
      if (!el) return;
      const elRect = el.getBoundingClientRect();
      const currentTop = el.scrollTop;

      const userMessageIndices = messages
        .map((msg, idx) => (msg.role === "user" ? idx : -1))
        .filter((idx) => idx !== -1);

      if (userMessageIndices.length === 0) return;

      let targetIndexInArray = -1;
      const currentIndexInArray = userMessageIndices.indexOf(
        scrollState.targetMessageIndex,
      );

      if (direction === "next") {
        targetIndexInArray = currentIndexInArray + 1;
      } else {
        if (currentTop != scrollState.previousScrollTop) {
          targetIndexInArray = currentIndexInArray;
        } else {
          targetIndexInArray = currentIndexInArray - 1;
        }
      }
      if (targetIndexInArray < 0) {
        targetIndexInArray = 0;
      }

      if (targetIndexInArray >= userMessageIndices.length) {
        el.scrollTo(0, el.scrollHeight + elRect.height);
        setHighlightIndex(-1);
      } else {
        const targetMsgIndex = userMessageIndices[targetIndexInArray];
        scrollState.targetMessageIndex = targetMsgIndex;
        setHighlightIndex(targetMsgIndex);
        const targetChild = el.querySelector(
          `[data-index="${scrollState.targetMessageIndex}"]`,
        ) as HTMLElement;
        if (targetChild) {
          targetChild.scrollIntoView({ behavior: "instant", block: "center" });
          setTimeout(() => {
            scrollState.previousScrollTop = el.scrollTop;
            setHighlightIndex(-1);
          }, 50);
        }
      }
    },
    [messages, scrollState],
  );

  return (
    <Box
      sx={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
      }}
    >
      {/* Navigation Controls */}
      {(!isMobile || !isConversationListOpen) && messages.length > 0 && (
        <Box
          sx={{
            position: "sticky",
            zIndex: 1200,
            top: 0,
            left: 0,
            right: 0,
            textAlign: "center",
            gap: 1,
          }}
        >
          <Box
            sx={{
              display: "inline-block",
              borderRadius: "20px",
              ...sharedGlassStyle,
            }}
          >
            <Tooltip title="Previous User Message">
              <IconButton
                sx={{ width: 40, height: 40 }}
                onClick={() => scrollToUserMessage("next")}
              >
                <KeyboardArrowDownIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Next User Message">
              <IconButton
                sx={{ width: 40, height: 40 }}
                onClick={() => scrollToUserMessage("prev")}
              >
                <KeyboardArrowUpIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      )}
      <Box
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        <Box
          sx={{
            flex: 1,
            display: "flex",
            flexDirection: "row",
            justifyContent: "center",
          }}
        >
          {isConversationListOpen && (
            <ConversationList
              isFullPage={isMobile}
              onBack={() => {
                setIsConversationListOpen(false);
              }}
            ></ConversationList>
          )}
          {/* main chat window */}
          {(!isMobile || !isConversationListOpen) && (
            <ChatMessageList highlightIndex={highlightIndex} />
          )}
        </Box>
      </Box>
      <ChatSettingsModal
        open={isSettingsOpen}
        onClose={() => {
          setIsSettingsOpen(false);
        }}
        onChange={setChatSettings}
        settings={chatSettings}
        includeReasoningInContext={includeReasoningInContext}
        onToggleReasoning={setIncludeReasoningInContext}
      ></ChatSettingsModal>

      {/* Setup modal overlay */}
      {!selectedKeyId && <ChatSetupModal open={true} />}
      {/* Input TODO */}
      <ChatInput
        onSettingsClick={() => {
          setIsSettingsOpen(true);
        }}
        onConversationListClick={() => {
          setIsConversationListOpen(!isConversationListOpen);
        }}
        scrollToUserMessage={scrollToUserMessage}
      />
    </Box>
  );
};
