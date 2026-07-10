import { Box, IconButton, Tooltip, FormControl, InputLabel, Select, MenuItem, Chip } from "@mui/material";
import ChatMessageList from "../chat/ChatMessageList";
import ChatSetupModal from "../chat/ChatSetupModal";
import ChatInput from "../chat/ChatInput";
import { useChat } from "../../context/ChatContext";
import { useState, useCallback } from "react";
import { sharedGlassStyle } from "../../utils/styles";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";

export const ChatLayout = () => {
  const { messages, selectedKeyId, scrollState, apiKeys, setSelectedApiKeyId, chatSettings, setChatSettings, availableModels } = useChat();
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
      {messages.length > 0 && (
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
            <Tooltip title="Next User Message">
              <IconButton
                sx={{ width: 40, height: 40 }}
                onClick={() => scrollToUserMessage("next")}
              >
                <KeyboardArrowDownIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Previous User Message">
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
        {/* padding for input box overlap */}
        <Box
          sx={{
            flex: 0,
            minHeight: "32px",
          }}
        ></Box>
        <Box
          sx={{
            flex: 1,
            display: "flex",
            flexDirection: "row",
            justifyContent: "center",
          }}
        >
          {/* main chat window */}
          <ChatMessageList highlightIndex={highlightIndex} />
        </Box>

        {/* padding for input box overlap */}
        <Box
          sx={{
            flex: 0,
            minHeight: "32px",
          }}
        ></Box>
      </Box>

      {/* Setup modal overlay */}
      {!selectedKeyId && (
        <ChatSetupModal
          open={true}
          apiKeys={apiKeys}
          selectedKeyId={selectedKeyId}
          onSelectKey={setSelectedApiKeyId}
        />
      )}
      {/* Model selector */}
      {availableModels.length > 1 && (
        <Box sx={{ px: 2, py: 1, display: "flex", justifyContent: "center" }}>
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>Model</InputLabel>
            <Select
              value={chatSettings.selectedModel}
              label="Model"
              onChange={(e) => setChatSettings({ selectedModel: e.target.value })}
              renderValue={(value) => (
                <Chip label={value} size="small" color="primary" variant="outlined" />
              )}
            >
              {availableModels.map((model) => (
                <MenuItem key={model} value={model}>
                  {model}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      )}
      {/* Input TODO */}
      <ChatInput scrollToUserMessage={scrollToUserMessage} />
    </Box>
  );
};
