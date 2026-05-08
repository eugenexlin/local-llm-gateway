import React, { useState } from "react";
import {
  Box,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  Chip,
  Divider,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import KeyIcon from "@mui/icons-material/Key";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import SettingsIcon from "@mui/icons-material/Settings";
import ChatSettingsModal from "./ChatSettingsModal";
import { useChat } from "../../context/ChatContext";

interface ChatHeaderProps {
  onClose: () => void;
  onToggleSidebar?: () => void;
  onOpenSidebar?: () => void;
}

const formatTokenCount = (count: number): string => {
  if (count >= 1000) {
    return (count / 1000).toFixed(1).replace(/\.0$/, "") + "k";
  }
  return count.toString();
};

const ChatHeader: React.FC<ChatHeaderProps> = ({ onClose, onToggleSidebar, onOpenSidebar }) => {
  const {
    conversations,
    activeConversationId,
    selectedKeyId,
    setSelectedApiKeyId,
    apiKeys,
    apiKeyLoading,
    lastUsage,
    includeReasoningInContext,
    setIncludeReasoningInContext,
    chatSettings,
    setChatSettings,
  } = useChat();

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const activeKeys = apiKeys.filter((k) => k.is_active);
  const activeConversation = conversations[activeConversationId];

  const handleKeyMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleKeyMenuClose = () => {
    setAnchorEl(null);
  };

  const handleSelectKey = (id: string) => {
    setSelectedApiKeyId(id);
    handleKeyMenuClose();
  };

  const handleSettingsOpen = () => {
    setSettingsOpen(true);
  };

  const handleSettingsClose = () => {
    setSettingsOpen(false);
  };

  const getKeyInfoById = (targetId: string) => {
    return apiKeys.find((k) => k.id == targetId);
  };

  const selectedKey = getKeyInfoById(selectedKeyId);

  const getTokenChip = (): React.ReactNode => {
    if (!lastUsage || lastUsage.totalTokens === 0) return null;

    const maxContext = 128000; // Default max context length
    const usagePercent = Math.round((lastUsage.totalTokens / maxContext) * 100);

    return (
      <Chip
        label={`${formatTokenCount(lastUsage.totalTokens)} / ${formatTokenCount(maxContext)}`}
        size="small"
        sx={{
          bgcolor: usagePercent > 90
            ? "rgba(239, 68, 68, 0.1)"
            : usagePercent > 70
            ? "rgba(245, 158, 11, 0.1)"
            : "rgba(139, 92, 246, 0.1)",
          color: usagePercent > 90
            ? "#dc2626"
            : usagePercent > 70
            ? "#d97706"
            : "#8b5cf6",
          fontSize: "0.625rem",
          height: 22,
          fontWeight: 600,
          letterSpacing: 0.02,
        }}
        title={`Prompt: ${lastUsage.promptTokens} | Completion: ${lastUsage.completionTokens} | Total: ${lastUsage.totalTokens}`}
      />
    );
  };

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        px: 2,
        py: 1.5,
        borderBottom: "1px solid #e2e8f0",
        bgcolor: "background.paper",
        minHeight: 64,
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          flex: 1,
          minWidth: 0,
        }}
      >
        {/* Sidebar toggle */}
        <IconButton
          size="small"
          onClick={() => onToggleSidebar?.() || onOpenSidebar?.()}
          sx={{
            color: "#64748b",
            mr: 0.5,
          }}
          title="Open conversations"
        >
          <MenuIcon fontSize="small" />
        </IconButton>

        {/* Chat icon */}
        <Box
          sx={{
            width: 32,
            height: 32,
            borderRadius: 2,
            bgcolor: "rgba(139, 92, 246, 0.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <svg
            width="16"
            height="16"
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

        {/* Conversation title */}
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography
            variant="body1"
            sx={{
              fontSize: "0.875rem",
              fontWeight: 600,
              color: "#1e293b",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {activeConversation?.title || "Chat"}
          </Typography>

          {/* API key selector */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.5,
              cursor: apiKeyLoading ? "default" : "pointer",
              mt: 0.125,
              "&:hover": apiKeyLoading ? undefined : { opacity: 0.8 },
            }}
            onClick={
              !apiKeyLoading && activeKeys.length > 0
                ? handleKeyMenuOpen
                : undefined
            }
          >
            <KeyIcon
              sx={{ fontSize: 12, color: selectedKey ? "#8b5cf6" : "#94a3b8" }}
            />
            <Typography
              variant="caption"
              sx={{
                color: selectedKey ? "#475569" : "#94a3b8",
                fontSize: "0.6875rem",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                maxWidth: 140,
              }}
            >
              {apiKeyLoading
                ? "Loading..."
                : selectedKey
                  ? selectedKey.name
                  : "No key selected"}
            </Typography>
            {activeKeys.length > 0 && !apiKeyLoading && (
              <KeyboardArrowDownIcon sx={{ fontSize: 14, color: "#94a3b8" }} />
            )}
          </Box>
        </Box>

        {/* Token usage chip */}
        {getTokenChip()}
      </Box>

      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, ml: 1 }}>
        <IconButton size="medium" onClick={handleSettingsOpen} sx={{ color: "#64748b" }}>
          <SettingsIcon fontSize="small" />
        </IconButton>
        <IconButton size="medium" onClick={onClose} sx={{ color: "#64748b" }}>
          <Box sx={{ fontSize: 18 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </Box>
        </IconButton>
      </Box>

      <ChatSettingsModal
        open={settingsOpen}
        onClose={handleSettingsClose}
        settings={chatSettings}
        onChange={setChatSettings}
        includeReasoningInContext={includeReasoningInContext}
        onToggleReasoning={setIncludeReasoningInContext}
      />

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleKeyMenuClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        sx={{ "& .MuiPaper-root": { minWidth: 240, maxHeight: 320 } }}
      >
        <Box sx={{ px: 2, py: 1, bgcolor: "#f8fafc" }}>
          <Typography
            variant="caption"
            sx={{
              color: "#64748b",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: 0.05,
            }}
          >
            Select API Key
          </Typography>
        </Box>
        <Divider />
        {activeKeys.length === 0 ? (
          <Box sx={{ px: 2, py: 2, textAlign: "center" }}>
            <Typography variant="body2" sx={{ color: "#94a3b8" }}>
              No API keys found. Create one in API Keys settings.
            </Typography>
          </Box>
        ) : (
          activeKeys.map((key) => (
            <MenuItem
              key={key.id}
              onClick={() => handleSelectKey(key.id)}
              sx={{
                py: 1.25,
                bgcolor:
                  selectedKeyId === key.id
                    ? "rgba(139, 92, 246, 0.06)"
                    : "transparent",
                borderRadius: 0,
                "&:hover": { bgcolor: "rgba(139, 92, 246, 0.04)" },
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                  flex: 1,
                  minWidth: 0,
                }}
              >
                <KeyIcon
                  sx={{
                    fontSize: 18,
                    color:
                      selectedKeyId === key.id ? "primary.main" : "#94a3b8",
                    flexShrink: 0,
                  }}
                />
                <Box sx={{ minWidth: 0 }}>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 500,
                      color: "#1e293b",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {key.name}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{ color: "#94a3b8", fontFamily: "monospace" }}
                  >
                    {key.id}
                  </Typography>
                </Box>
                {selectedKeyId === key.id && (
                  <Box
                    sx={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      bgcolor: "primary.main",
                      flexShrink: 0,
                    }}
                  />
                )}
              </Box>
            </MenuItem>
          ))
        )}
        <Divider />
        <MenuItem
          onClick={() => {
            handleKeyMenuClose();
            window.open("/api-keys", "_blank");
          }}
          sx={{
            color: "primary.main",
            fontSize: "0.8125rem",
            justifyContent: "center",
          }}
        >
          Manage API Keys
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default ChatHeader;
