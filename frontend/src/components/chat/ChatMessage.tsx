import React, { useRef, useEffect, useState } from "react";
import {
  Box,
  Typography,
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
} from "@mui/material";
import { keyframes } from "@emotion/react";
import {
  ChatMessage as ChatMessageType,
  useChat,
} from "../../context/ChatContext";
import ChatDots from "./ChatDots";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import RevertWarningDialog from "./RevertWarningDialog";

interface ChatMessageProps {
  message: ChatMessageType;
  isStreaming: boolean;
  index: number;
}

const waveRipple = keyframes`
  0%, 100% {
    transform: translateY(0) scale(1.1);
    opacity: 0.6;
  }
  50% {
    transform: translateY(40%) scale(1);
    opacity: 1;
  }
`;

const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  isStreaming,
  index,
}) => {
  const isUser = message.role === "user";
  const isStreamingResponse = !isUser && isStreaming;
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const thinkingRef = useRef<HTMLDivElement>(null);
  const { inputContent, revertToMessage, chatSettings } = useChat();

  const [showActions, setShowActions] = useState(false);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [showRevertDialog, setShowRevertDialog] = useState(false);

  useEffect(() => {
    if (isStreaming && message.thinking && thinkingRef.current) {
      thinkingRef.current.scrollTop = thinkingRef.current.scrollHeight;
    }
  }, [message.thinking, isStreaming]);

  const handleActionClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    handleCloseMenu();
  };

  const handleRevertClick = () => {
    handleCloseMenu();
    if (inputContent.trim()) {
      setShowRevertDialog(true);
    } else {
      revertToMessage(index);
    }
  };

  const handleRevertDialogClose = () => {
    setShowRevertDialog(false);
  };

  const renderContent = (content: string) => {
    const parts = content.split(/(```[\s\S]*?```)/g);

    return parts.map((part, index) => {
      if (part.startsWith("```") && part.endsWith("```")) {
        const codeContent = part.slice(3, -3);
        const newlineIdx = codeContent.indexOf("\n");
        if (newlineIdx !== -1) {
          const lang = codeContent.slice(0, newlineIdx).trim();
          const code = codeContent.slice(newlineIdx + 1);
          return (
            <Box
              key={index}
              sx={{
                bgcolor: "#1e1e2e",
                borderRadius: 1,
                p: 1.5,
                my: 1,
                position: "relative",
                overflow: "auto",
              }}
            >
              {lang && lang.match(/^[a-z]+$/i) && (
                <Typography
                  variant="caption"
                  sx={{
                    position: "absolute",
                    top: 4,
                    right: 8,
                    color: "#888",
                    textTransform: "uppercase",
                  }}
                >
                  {lang}
                </Typography>
              )}
              <Box
                component="pre"
                sx={{
                  m: 0,
                  fontSize: "0.8125rem",
                  fontFamily:
                    '"Fira Code", "Cascadia Code", "Consolas", monospace',
                  lineHeight: 1.5,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  color: "#cdd6f4",
                  "& code": { display: "block" },
                }}
              >
                <code>{code}</code>
              </Box>
            </Box>
          );
        }
      }

      if (part.includes("\n")) {
        return (
          <Box
            key={index}
            sx={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}
          >
            {part.split("\n").map((line, lineIdx) => (
              <React.Fragment key={lineIdx}>
                {lineIdx > 0 && <br />}
                {line}
              </React.Fragment>
            ))}
          </Box>
        );
      }

      return (
        <Box
          key={index}
          sx={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}
        >
          {part}
        </Box>
      );
    });
  };

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: isUser ? "flex-end" : "flex-start",
        mb: 1.5,
        px: { xs: 1, sm: 2 },
        position: "relative",
        "&:hover .message-actions": { opacity: 1 },
      }}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <Box
        sx={{
          maxWidth: "100%",
          minWidth: 40,
          position: "relative",
        }}
      >
        {/* Subtle Actions Button */}
        <Box
          className="message-actions"
          sx={{
            position: "absolute",
            top: -20,
            right: 0,
            zIndex: 10,
            opacity: 0,
            transition: "opacity 0.2s ease-in-out",
            display: "flex",
            gap: 0.5,
          }}
        >
          <Tooltip title="Actions">
            <IconButton
              size="small"
              onClick={handleActionClick}
              sx={{
                bgcolor: "background.paper",
                boxShadow: 1,
                "&:hover": { bgcolor: "#f1f5f9" },
              }}
            >
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  bgcolor: "#cbd5e1",
                }}
              />
            </IconButton>
          </Tooltip>
        </Box>

        {chatSettings.showThinkingBlocks && !isUser && message.thinking && (
          <Box
            sx={{
              mb: 1,
              borderRadius: "16px",
              bgcolor: "#f5f3ff",
              border: "2px solid #8b5cf6",
            }}
          >
            <details open={!chatSettings.defaultThinkingCollapsed}>
              <summary
                style={{
                  cursor: "pointer",
                  fontSize: "0.8rem",
                  color: "#6d28d9",
                  fontWeight: 600,
                  listStyle: "none",
                  marginTop: "4px",
                  marginBottom: "4px",
                }}
              >
                <Box
                  component="span"
                  sx={{
                    marginLeft: 2,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 0.5,
                  }}
                >
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      marginRight: 0.5,
                      borderRadius: "100%",
                      bgcolor: "#8b5cf6",
                      display: "inline-block",
                    }}
                  />
                  Thinking
                </Box>
              </summary>
              <Box
                ref={thinkingRef}
                sx={{
                  p: 1.5,
                  borderRadius: "0 0 16px 16px",
                  bgcolor: "#ede9fe",
                  fontSize: "0.8125rem",
                  color: "#3b0764",
                  maxHeight: 300,
                  overflow: "auto",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  fontFamily:
                    '"Fira Code", "Cascadia Code", "Consolas", monospace',
                  lineHeight: 1.5,
                }}
              >
                {message.thinking}
              </Box>
            </details>
          </Box>
        )}
        <Box
          sx={{
            px: { xs: 1, sm: 2 },
            py: { xs: 0.75, sm: 1.25 },
            borderRadius: isUser
              ? { xs: "16px 16px 4px 16px", sm: "16px 16px 4px 16px" }
              : { xs: "16px 16px 16px 4px", sm: "16px 16px 16px 4px" },
            bgcolor: isUser ? "primary.main" : "#f1f5f9",
            color: isUser ? "white" : "#1e293b",
            boxShadow: isUser
              ? "0 2px 8px rgba(139, 92, 246, 0.25)"
              : "0 1px 3px rgba(0,0,0,0.06)",
            cursor: "pointer",
          }}
          onClick={(e) => {
            // If it's a user message, we might want to show actions on click for mobile
            if (isUser) {
              setAnchorEl(e.currentTarget as any);
            }
          }}
        >
          {renderContent(message.content)}

          {isStreamingResponse && <ChatDots />}
        </Box>

        <Typography
          variant="caption"
          sx={{
            display: "block",
            mt: 0.5,
            color: "#94a3b8",
            px: 0.5,
          }}
        >
          {new Date(message.timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </Typography>
      </Box>

      <div ref={messagesEndRef} />

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleCloseMenu}
      >
        <MenuItem onClick={handleCopy}>
          <ContentCopyIcon fontSize="small" sx={{ mr: 1 }} />
          Copy
        </MenuItem>
        {isUser && (
          <MenuItem onClick={handleRevertClick}>
            <RestartAltIcon fontSize="small" sx={{ mr: 1 }} />
            Revert
          </MenuItem>
        )}
      </Menu>

      <RevertWarningDialog
        open={showRevertDialog}
        onClose={handleRevertDialogClose}
        messageContent={message.content}
        messageIndex={index}
      />
    </Box>
  );
};

export default ChatMessage;
