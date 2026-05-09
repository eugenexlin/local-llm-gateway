import React, { useRef, useEffect } from "react";
import {
  Box,
  TextField,
  IconButton,
  InputAdornment,
  Typography,
  Tooltip,
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import { useChat } from "../../context/ChatContext";
import { sharedGlassStyle } from "../../utils/styles";
import SettingsIcon from "@mui/icons-material/Settings";
import ListAltIcon from "@mui/icons-material/ListAlt";
import NoteAddIcon from "@mui/icons-material/NoteAdd";

interface ChatInputProps {
  onSettingsClick: () => void;
  onConversationListClick: () => void;
  scrollToUserMessage: (direction: "next" | "prev") => void;
}

const ChatInput: React.FC<ChatInputProps> = (props: ChatInputProps) => {
  const {
    sendMessage,
    isLoading,
    selectedKeyId,
    inputContent,
    setInputContent,
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputContent(e.target.value);
  };

  return (
    <Box
      sx={{
        position: "sticky",
        bottom: 0,
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
          Please select an API key above to start chatting
        </Typography>
      )}

      <TextField
        fullWidth
        multiline
        maxRows={6}
        value={inputContent}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder={
          selectedKeyId ? "Type a message..." : "Select an API key to chat"
        }
        disabled={isLoading || !selectedKeyId}
        variant="outlined"
        size="small"
        inputProps={{ ref: textareaRef as any }}
        sx={{
          "& .MuiOutlinedInput-root": {
            borderRadius: 3,
            "& fieldset": {
              borderColor: "#e2e8f0",
            },
            "&:hover fieldset": {
              borderColor: "#cbd5e1",
            },
            "&.Mui-focused fieldset": {
              borderColor: "#8b5cf6",
            },
          },
        }}
        slotProps={{
          input: {
            sx: {
              ...sharedGlassStyle,
              backgroundColor: "rgba(255,255,255,0.4)",
            },
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  onClick={handleSubmit}
                  disabled={!inputContent.trim() || isLoading}
                  sx={{
                    color:
                      inputContent.trim() && !isLoading
                        ? "primary.main"
                        : "#94a3b8",
                  }}
                >
                  <SendIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ),
          },
        }}
      />
      {/* Navigation Controls */}
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
          <Tooltip title="Conversations">
            <IconButton
              sx={{ width: 40, height: 40 }}
              onClick={() => {
                props.onConversationListClick();
              }}
            >
              <ListAltIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Settings">
            <IconButton
              sx={{ width: 40, height: 40 }}
              onClick={() => {
                props.onSettingsClick();
              }}
            >
              <SettingsIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
    </Box>
  );
};

export default ChatInput;
