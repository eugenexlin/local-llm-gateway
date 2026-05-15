import React, { useRef, useEffect, useState } from "react";
import {
  Box,
  Typography,
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
  useTheme,
} from "@mui/material";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { ChatMessageItem, useChat } from "../../context/ChatContext";
import ChatDots from "./ChatDots";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import CallSplitIcon from "@mui/icons-material/CallSplit";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import RevertWarningDialog from "./RevertWarningDialog";

interface ChatMessageProps {
  message: ChatMessageItem;
  isStreaming: boolean;
  index: number;
  isHighlighted?: boolean;
}

const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  isStreaming,
  index,
  isHighlighted,
}) => {
  const isUser = message.role === "user";
  const isStreamingResponse = !isUser && isStreaming;
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const thinkingRef = useRef<HTMLDivElement>(null);
  const { chatSettings, forkConversation } = useChat();

  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [showRevertDialog, setShowRevertDialog] = useState(false);
  const [showTokenView, setShowTokenView] = useState<"prompt" | "completion">(
    "completion",
  );
  const [liveElapsed, setLiveElapsed] = useState(0);
  const theme = useTheme();

  const [activateHighlight, setActivateHighlight] = useState<boolean>(false);

  const triggerHighlightAction = isHighlighted && !activateHighlight;
  if (triggerHighlightAction) {
    setTimeout(() => {
      setActivateHighlight(true);
    }, 100);
  }
  const resetHighlightAction = !isHighlighted && activateHighlight;
  if (resetHighlightAction) {
    setActivateHighlight(false);
  }

  useEffect(() => {
    if (isStreaming && message.thinking && thinkingRef.current) {
      thinkingRef.current.scrollTop = thinkingRef.current.scrollHeight;
    }
  }, [message.thinking, isStreaming]);

  useEffect(() => {
    if (!isStreaming || !message.streamStartMs) return;
    const interval = setInterval(() => {
      setLiveElapsed((Date.now() - message.streamStartMs!) / 1000);
    }, 250);
    return () => clearInterval(interval);
  }, [isStreaming, message.streamStartMs]);

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
    setShowRevertDialog(true);
  };

  const handleForkClick = () => {
    handleCloseMenu();
    forkConversation(index);
  };

  const handleRevertDialogClose = () => {
    setShowRevertDialog(false);
  };

  const formatTokenStat = (
    tokens: number,
    seconds: number | undefined,
    isLive = false,
  ) => {
    const elapsed = isLive && liveElapsed > 0 ? liveElapsed : seconds;
    const tps = elapsed && elapsed > 0 ? (tokens / elapsed).toFixed(1) : "—";
    const sec = elapsed !== undefined ? `${elapsed.toFixed(1)}` : "—";
    return `${tokens} tokens · ${sec}s · ${tps} t/s`;
  };

  const isMobile =
    theme.breakpoints.values.sm > 0 &&
    window.innerWidth < theme.breakpoints.values.sm;

  const renderContent = (content: string) => {
    if (chatSettings.displayMode === "monospace") {
      return (
        <Box
          sx={{
            fontFamily: '"Fira Code", "Cascadia Code", "Consolas", monospace',
            fontSize: "0.8125rem",
            lineHeight: 1.5,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {content}
        </Box>
      );
    }

    return (
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={{
          pre: ({ children }) => (
            <Box
              sx={{
                bgcolor: "color-mix(in oklab, currentColor 20%, transparent);",
                borderRadius: 1,
                p: 1.5,
                my: 1,
                position: "relative",
                overflow: "auto",
              }}
            >
              {children}
            </Box>
          ),
          code: ({ className, children, ...props }) => {
            const match = /language-(\w+)/.exec(className || "");
            const lang = match ? match[1] : "";
            const text = String(children).replace(/\n$/, "");

            if (lang) {
              return (
                <Box>
                  <Typography
                    variant="caption"
                    sx={{
                      position: "absolute",
                      top: 4,
                      right: 8,
                      textTransform: "uppercase",
                    }}
                  >
                    {lang}
                  </Typography>
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
                    }}
                  >
                    <code className={className} {...props}>
                      {text}
                    </code>
                  </Box>
                </Box>
              );
            }

            return (
              <code className={className} {...props}>
                {children}
              </code>
            );
          },
          p: ({ children }) => (
            <Typography
              variant="body2"
              sx={{
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                mb: 0.5,
              }}
            >
              {children}
            </Typography>
          ),
          table: ({ children }) => (
            <Box
              sx={{
                overflow: "auto",
                my: 1,
                border: "1px solid var(--mui-palette-divider)",
                borderRadius: 1,
              }}
            >
              <table
                style={{
                  borderCollapse: "collapse",
                  width: "100%",
                  fontSize: "0.8125rem",
                }}
              >
                {children}
              </table>
            </Box>
          ),
          th: ({ children }) => (
            <th
              style={{
                padding: "6px 12px",
                border: "1px solid var(--mui-palette-divider)",
                backgroundColor:
                  "color-mix(in oklab, var(--mui-palette-text-primary) 8%, var(--mui-palette-background-paper))",
                fontWeight: 600,
                textAlign: "left",
                color: "var(--mui-palette-text-primary)",
              }}
            >
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td
              style={{
                padding: "6px 12px",
                border: "1px solid var(--mui-palette-divider)",
                fontSize: "0.8125rem",
                color: "var(--mui-palette-text-primary)",
              }}
            >
              {children}
            </td>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    );
  };

  const renderThinking = (content: string) => {
    if (chatSettings.thinkingDisplayMode === "monospace") {
      return (
        <Box
          ref={thinkingRef}
          sx={{
            p: 1.5,
            fontSize: "0.8125rem",
            color: "primary.main",
            maxHeight: 300,
            overflow: "auto",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            fontFamily: '"Fira Code", "Cascadia Code", "Consolas", monospace',
            lineHeight: 1.5,
          }}
        >
          {content}
        </Box>
      );
    }

    return (
      <Box
        ref={thinkingRef}
        sx={{
          p: 1.5,
          fontSize: "0.8125rem",
          color: "primary.main",
          maxHeight: 300,
          overflow: "auto",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          lineHeight: 1.5,
        }}
      >
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeRaw]}
          components={{
            p: ({ children }) => (
              <Typography
                variant="body2"
                sx={{
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  mb: 0.5,
                }}
              >
                {children}
              </Typography>
            ),
            code: ({ children }) => (
              <code
                style={{
                  fontFamily:
                    '"Fira Code", "Cascadia Code", "Consolas", monospace',
                  fontSize: "inherit",
                  backgroundColor: "rgba(139, 92, 246, 0.1)",
                  borderRadius: 0.5,
                  padding: 0.5,
                }}
              >
                {children}
              </code>
            ),
            pre: ({ children }) => (
              <Box
                sx={{
                  bgcolor: "rgba(139, 92, 246, 0.08)",
                  borderRadius: 1,
                  p: 1.5,
                  my: 0.5,
                  overflow: "auto",
                }}
              >
                {children}
              </Box>
            ),
          }}
        >
          {content}
        </ReactMarkdown>
      </Box>
    );
  };

  const vertButton = (
    <Box
      sx={{
        display: { xs: "flex", sm: "none" },
        alignItems: "center",
      }}
    >
      <Tooltip title="Actions">
        <IconButton
          size="small"
          onClick={handleActionClick}
          sx={{
            color: "#94a3b8",
            p: 0.5,
            "&:hover": { bgcolor: "rgba(0,0,0,0.04)" },
          }}
        >
          <MoreVertIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Box>
  );

  const timestampBlock = (timestamp: string) => (
    <Typography variant="caption">{timestamp}</Typography>
  );
  const actionButtons = (
    <Box
      sx={{
        display: { xs: "none", sm: "flex" },
        alignItems: "center",
        gap: 0.25,
      }}
    >
      <Tooltip title="Copy">
        <IconButton
          size="small"
          onClick={handleCopy}
          sx={{
            color: "#94a3b8",
            "&:hover": { bgcolor: "rgba(0,0,0,0.04)" },
          }}
        >
          <ContentCopyIcon fontSize="inherit" />
        </IconButton>
      </Tooltip>
      {!isUser && (
        <Tooltip title="Fork">
          <IconButton
            size="small"
            onClick={handleForkClick}
            sx={{
              color: "#94a3b8",
              "&:hover": { bgcolor: "rgba(0,0,0,0.04)" },
            }}
          >
            <CallSplitIcon fontSize="inherit" />
          </IconButton>
        </Tooltip>
      )}
      {isUser && (
        <Tooltip title="Revert">
          <IconButton
            size="small"
            onClick={handleRevertClick}
            sx={{
              color: "#94a3b8",
              "&:hover": { bgcolor: "rgba(0,0,0,0.04)" },
            }}
          >
            <RestartAltIcon fontSize="inherit" />
          </IconButton>
        </Tooltip>
      )}
    </Box>
  );

  const timestamp = new Date(message.timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: isUser ? "flex-end" : "flex-start",
        mb: 1.5,
        position: "relative",
      }}
    >
      <Box
        sx={{
          maxWidth: "100%",
          minWidth: 40,
          position: "relative",
        }}
      >
        {chatSettings.showThinkingBlocks && !isUser && message.thinking && (
          <Box
            sx={{
              mb: 1,
              minWidth: "240px",
              borderRadius: "8px",
              bgcolor:
                "color-mix(in oklab, var(--mui-palette-primary-dark) 16%, var(--mui-palette-background-default))",
              overflow: "hidden",
              border: "1px solid var(--mui-palette-primary-main)",
            }}
          >
            <details open={!chatSettings.defaultThinkingCollapsed}>
              <summary
                style={{
                  cursor: "pointer",
                  fontSize: "0.8rem",
                  color: "var(--mui-palette-primary-main)",
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
                      bgcolor: "primary.main",
                      display: "inline-block",
                    }}
                  />
                  Thinking
                </Box>
              </summary>
              {renderThinking(message.thinking)}
            </details>
          </Box>
        )}
        <Box
          sx={{
            py: 1,
            px: { xs: 1.5, sm: 2 },
            borderRadius: isUser
              ? { xs: "16px 16px 4px 16px", sm: "16px 16px 4px 16px" }
              : { xs: "16px 16px 16px 4px", sm: "16px 16px 16px 4px" },
            bgcolor: isUser ? "primary.main" : "transparent",
            color: isUser
              ? "white"
              : "color-mix(in oklab, currentColor 80%, transparent)",
            transition: "box-shadow 1s ease-out, filter 1s ease-out",
            ...(triggerHighlightAction
              ? {
                  boxShadow: `0px 0px 6px 2px ${theme.palette.secondary.main}, inset 0px 0px 4px 2px ${theme.palette.background.default}`,
                  filter: "brightness(140%)",
                  transition: "unset",
                }
              : {}),
          }}
        >
          {renderContent(message.content)}

          {isStreamingResponse && <ChatDots />}
        </Box>

        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: isUser ? "right" : "left",
            gap: 0.5,
            mt: 0.5,
            color: "#94a3b8",
            px: 0.5,
          }}
        >
          {isUser ? (
            <>
              {/* User message: timestamp first, then buttons on the right */}
              {timestampBlock(timestamp)}
              {actionButtons}
              {vertButton}
            </>
          ) : (
            <>
              {/* Assistant message: buttons on the left, then timestamp */}

              {actionButtons}
              {vertButton}
              {timestampBlock(timestamp)}
              {message.completionTokens !== undefined &&
                message.completionTokens > 0 && (
                  <>
                    {isMobile ? (
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
                      >
                        <Box
                          sx={{
                            display: "inline-flex",
                            bgcolor:
                              "color-mix(in oklab, var(--mui-palette-common-onBackground) 10%, transparent)",
                            borderRadius: "8px",
                            boxShadow: "inset 1px 1px 2px rgba(0,0,0,0.4)",
                            p: "2px",
                          }}
                        >
                          <Tooltip title="Prompt Tokens">
                            <IconButton
                              size="small"
                              onClick={() => setShowTokenView("prompt")}
                              sx={{
                                bgcolor:
                                  showTokenView === "prompt"
                                    ? "var(--mui-palette-background-default)"
                                    : "transparent",
                                color:
                                  showTokenView === "prompt"
                                    ? "#8b5cf6"
                                    : "rgba(127,127,127,0.8)",
                                boxShadow:
                                  showTokenView === "prompt"
                                    ? "1px 1px 2px rgba(0,0,0,0.4)"
                                    : "transparent",
                                borderRadius: "6px",
                                p: 0.35,
                                minWidth: 22,
                                "&:hover": {
                                  bgcolor:
                                    showTokenView === "prompt"
                                      ? "var(--mui-palette-background-paper)"
                                      : "rgba(255,255,255,0.04)",
                                },
                              }}
                            >
                              <MenuBookIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Completion Tokens">
                            <IconButton
                              size="small"
                              onClick={() => setShowTokenView("completion")}
                              sx={{
                                bgcolor:
                                  showTokenView === "completion"
                                    ? "var(--mui-palette-background-default)"
                                    : "transparent",
                                color:
                                  showTokenView === "completion"
                                    ? "#8b5cf6"
                                    : "rgba(127,127,127,0.8)",
                                boxShadow:
                                  showTokenView === "completion"
                                    ? "1px 1px 2px rgba(0,0,0,0.4)"
                                    : "transparent",
                                borderRadius: "6px",
                                p: 0.35,
                                minWidth: 22,
                                "&:hover": {
                                  bgcolor:
                                    showTokenView === "completion"
                                      ? "var(--mui-palette-background-paper)"
                                      : "rgba(255,255,255,0.04)",
                                },
                              }}
                            >
                              <AutoAwesomeIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                        <Typography variant="caption" sx={{ color: "#94a3b8" }}>
                          {showTokenView === "prompt"
                            ? formatTokenStat(
                                message.promptTokens ?? 0,
                                message.promptSeconds,
                              )
                            : formatTokenStat(
                                message.completionTokens ?? 0,
                                message.completionSeconds,
                                isStreaming,
                              )}
                        </Typography>
                      </Box>
                    ) : (
                      <Typography
                        variant="caption"
                        sx={{
                          color: "#94a3b8",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "8px",
                          marginLeft: "8px",
                        }}
                      >
                        <Tooltip title="Prompt Tokens">
                          <MenuBookIcon
                            fontSize="small"
                            sx={{ color: "#94a3b8" }}
                          />
                        </Tooltip>

                        {formatTokenStat(
                          message.promptTokens ?? 0,
                          message.promptSeconds,
                        )}
                        <Tooltip title="Completion Tokens">
                          <AutoAwesomeIcon
                            fontSize="small"
                            sx={{ color: "#94a3b8" }}
                          />
                        </Tooltip>
                        {formatTokenStat(
                          message.completionTokens ?? 0,
                          message.completionSeconds,
                          isStreaming,
                        )}
                      </Typography>
                    )}
                  </>
                )}
            </>
          )}
        </Box>
      </Box>

      <div ref={messagesEndRef} />

      {/* Mobile menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleCloseMenu}
        onClick={(e) => e.stopPropagation()}
      >
        <MenuItem onClick={handleCopy}>
          <ContentCopyIcon fontSize="small" sx={{ mr: 1 }} />
          Copy
        </MenuItem>
        {!isUser && (
          <MenuItem onClick={handleForkClick}>
            <CallSplitIcon fontSize="small" sx={{ mr: 1 }} />
            Fork
          </MenuItem>
        )}
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
