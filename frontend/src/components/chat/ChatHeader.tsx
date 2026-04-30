import React, { useState } from "react";
import {
  Box,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  Chip,
  Divider,
  Button,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import KeyIcon from "@mui/icons-material/Key";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import { useChat } from "../../context/ChatContext";

interface ChatHeaderProps {
  onClose: () => void;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({ onClose }) => {
  const {
    selectedKeyId,
    setSelectedApiKeyId,
    apiKeys,
    apiKeyLoading,
    clearHistory,
    error,
  } = useChat();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  const activeKeys = apiKeys.filter((k) => k.is_active);

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

  const handleClearHistory = () => {
    clearHistory();
    setConfirmClear(false);
  };

  const getKeyInfoById = (targetId: string) => {
    return apiKeys.find((k) => k.id == targetId);
  };

  const selectedKey = getKeyInfoById(selectedKeyId);

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
          gap: 1.5,
          flex: 1,
          minWidth: 0,
        }}
      >
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: 2,
            bgcolor: "rgba(139, 92, 246, 0.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <svg
            width="20"
            height="20"
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

        <Box sx={{ minWidth: 0 }}>
          <Typography
            variant="h6"
            sx={{
              fontSize: "1rem",
              fontWeight: 600,
              color: "#1e293b",
              lineHeight: 1.2,
            }}
          >
            Chat
          </Typography>

          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.75,
              cursor: apiKeyLoading ? "default" : "pointer",
              mt: 0.25,
              "&:hover": apiKeyLoading ? undefined : { opacity: 0.8 },
            }}
            onClick={
              !apiKeyLoading && activeKeys.length > 0
                ? handleKeyMenuOpen
                : undefined
            }
          >
            <KeyIcon
              sx={{ fontSize: 14, color: selectedKey ? "#8b5cf6" : "#94a3b8" }}
            />
            <Typography
              variant="body2"
              sx={{
                color: selectedKey ? "#475569" : "#94a3b8",
                fontSize: "0.75rem",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                maxWidth: 160,
              }}
            >
              {apiKeyLoading
                ? "Loading keys..."
                : selectedKey
                  ? selectedKey.name
                  : "No API key selected"}
            </Typography>
            {activeKeys.length > 0 && !apiKeyLoading && (
              <KeyboardArrowDownIcon sx={{ fontSize: 16, color: "#94a3b8" }} />
            )}
          </Box>
        </Box>
      </Box>

      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
        {error && (
          <Chip
            label="Error"
            size="small"
            sx={{
              bgcolor: "rgba(239, 68, 68, 0.1)",
              color: "#dc2626",
              fontSize: "0.6875rem",
              height: 22,
              mr: 0.5,
            }}
          />
        )}

        {confirmClear ? (
          <Box
            sx={{ display: "flex", alignItems: "center", gap: 0.5, mr: 0.5 }}
          >
            <Typography variant="caption" sx={{ color: "#64748b" }}>
              Clear?
            </Typography>
            <Button
              size="small"
              onClick={handleClearHistory}
              sx={{ fontSize: "0.6875rem", px: 1, color: "#dc2626" }}
            >
              Yes
            </Button>
            <Button
              size="small"
              onClick={() => setConfirmClear(false)}
              sx={{ fontSize: "0.6875rem", px: 1, color: "#64748b" }}
            >
              No
            </Button>
          </Box>
        ) : (
          <IconButton
            size="medium"
            onClick={() => setConfirmClear(true)}
            sx={{ color: "#94a3b8", "&:hover": { color: "#dc2626" } }}
            title="Clear chat history"
          >
            <DeleteForeverIcon fontSize="medium" />
          </IconButton>
        )}

        <IconButton size="medium" onClick={onClose} sx={{ color: "#64748b" }}>
          <CloseIcon fontSize="medium" />
        </IconButton>
      </Box>

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
                      selectedKeyId === key.name ? "primary.main" : "#94a3b8",
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
                {selectedKeyId === key.name && (
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
