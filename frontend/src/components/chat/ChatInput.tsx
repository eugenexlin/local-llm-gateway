import React, { useRef, useEffect } from "react";
import {
  Box,
  TextField,
  IconButton,
  Typography,
  Tooltip,
  Chip,
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import StopIcon from "@mui/icons-material/Stop";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import { useChat } from "../../context/ChatContext";
import { sharedFrostGlassStyle, sharedGlassStyle } from "../../utils/styles";
import { formatTokenCount } from "../../utils/format";

interface ChatInputProps {
  onConversationListClick?: () => void;
  scrollToUserMessage: (direction: "next" | "prev") => void;
}

const ChatInput: React.FC<ChatInputProps> = (props: ChatInputProps) => {
  const {
    sendMessage,
    isLoading,
    selectedKeyId,
    inputContent,
    setInputContent,
    estimatedContextTokens,
    abortCurrentRequest,
  } = useChat();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        Math.min(textareaRef.current.scrollHeight, window.innerHeight / 3) +
        "px";
    }
  }, [inputContent]);

  const handleSubmit = async () => {
    if (!inputContent.trim() || isLoading) return;
    const message = inputContent.trim();
    setInputContent("");
    await sendMessage(message);
  };

  const handleClear = () => {
    setInputContent("");
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === "Escape" && isLoading) {
      e.preventDefault();
      abortCurrentRequest();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputContent(e.target.value);
  };

  const hasContent = inputContent.trim().length > 0;
  const canSend = hasContent && !isLoading;

  const contextPct =
    estimatedContextTokens > 0 ? (estimatedContextTokens / 128000) * 100 : 0;
  const contextBgColor =
    contextPct > 90
      ? "rgba(239, 68, 68, 0.1)"
      : contextPct > 70
        ? "rgba(245, 158, 11, 0.1)"
        : "rgba(139, 92, 246, 0.1)";
  const contextColor =
    contextPct > 90 ? "#dc2626" : contextPct > 70 ? "#d97706" : "#8b5cf6";

  return (
    <Box
      sx={{
        ...sharedFrostGlassStyle,
        backdropFilter: "blur(12px)",
        position: "sticky",
        bottom: 0,
        borderRadius: "16px",
        display: "flex",
        flexDirection: "column",
        gap: 1,
        p: 1,
        boxShadow:
          "0px 0px 0px 1px color-mix(in oklab, var(--mui-palette-primary-contrastText) 40%, transparent)",
        "&:hover": {
          boxShadow:
            "0px 0px 3px 1px color-mix(in oklab, var(--mui-palette-primary-contrastText) 50%, transparent)",
        },
        "&:active": {
          boxShadow: "0px 0px 0px 2px var(--mui-palette-primary-light)",
        },
        "&:focus-within": {
          boxShadow: "0px 0px 0px 2px var(--mui-palette-primary-light)",
        },
      }}
      onClick={() => {
        textareaRef.current?.focus();
      }}
    >
      {!selectedKeyId && (
        <Typography
          variant="caption"
          sx={{
            display: "block",
            mb: 1,
            color: "#f59e0b",
            px: 1,
          }}
        >
          Select an API key to start chatting (popup will appear)
        </Typography>
      )}

      <Box
        sx={{
          display: "flex",
          flexDirection: "row",
        }}
      >
        {/* Textarea */}
        <TextField
          fullWidth
          multiline
          maxRows={6}
          value={inputContent}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          inputRef={textareaRef}
          placeholder={
            selectedKeyId ? "Type a message..." : "Select an API key to chat"
          }
          disabled={!selectedKeyId}
          size="small"
          sx={{
            "& fieldset": { border: "none" },
          }}
        />
        {/* Clear button - top right of textarea area */}
        {hasContent && (
          <Box
            sx={{
              flex: 0,
            }}
          >
            <Tooltip title="Clear text">
              <IconButton
                sx={{
                  ...sharedGlassStyle,
                  width: 40,
                  height: 40,
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleClear();
                }}
              >
                <CloseIcon />
              </IconButton>
            </Tooltip>
          </Box>
        )}
      </Box>

      <Box
        sx={{
          display: "flex",
          flexDirection: "row",
          position: "relative",
        }}
      >
        {/* Plus button - bottom left */}

        <Box
          sx={{
            flex: 1,
          }}
        >
          <Tooltip title="Attach file">
            <IconButton
              sx={{
                ...sharedGlassStyle,
                width: 40,
                height: 40,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <AddIcon />
            </IconButton>
          </Tooltip>
        </Box>
        {/* Context chip - left of send button */}
        {estimatedContextTokens > 0 && (
          <Chip
            label={`${formatTokenCount(estimatedContextTokens)} / ${formatTokenCount(128000)}`}
            size="small"
            sx={{
              position: "absolute",
              bottom: 6,
              right: 48,
              bgcolor: contextBgColor,
              color: contextColor,
              fontSize: "0.625rem",
              height: 22,
              fontWeight: 600,
              letterSpacing: 0.02,
            }}
            title={`Estimated context: ${estimatedContextTokens} tokens (of 128k max)`}
          />
        )}

        {/* Send/Abort button - bottom right */}
        <Box
          sx={{
            bottom: 8,
            right: 8,
          }}
        >
          <Tooltip title={isLoading ? "Stop generating" : "Send message"}>
            <IconButton
              sx={{
                ...sharedGlassStyle,
                width: 40,
                height: 40,
              }}
              onClick={(e) => {
                e.stopPropagation();
                if (isLoading) {
                  abortCurrentRequest();
                } else {
                  handleSubmit();
                }
              }}
            >
              {isLoading ? <StopIcon /> : <SendIcon />}
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
    </Box>
  );
};

export default ChatInput;
