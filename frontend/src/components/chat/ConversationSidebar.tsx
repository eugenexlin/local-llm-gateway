import React, { useState, useRef } from "react";
import {
  Box,
  Typography,
  IconButton,
  ListItemButton,
  Menu,
  MenuItem,
  TextField,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import ChatIcon from "@mui/icons-material/Chat";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import ChatDots from "./ChatDots";
import { useChat, Conversation } from "../../context/ChatContext";

interface ConversationSidebarProps {
  onBack?: () => void;
}

const ConversationSidebar: React.FC<ConversationSidebarProps> = ({
  onBack,
}) => {
  const {
    conversations,
    activeConversationId,
    streamingConversationId,
    createConversation,
    switchConversation,
    deleteConversation,
    renameConversation,
  } = useChat();

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  const sortedConversations = Object.values(conversations).sort(
    (a, b) => b.updatedAt - a.updatedAt,
  );

  const handleNewChat = () => {
    createConversation();
    onBack?.();
  };

  const handleOpenMenu = (event: React.MouseEvent<HTMLElement>, id: string) => {
    setAnchorEl(event.currentTarget);
    setConfirmDeleteId(id);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
    setConfirmDeleteId(null);
  };

  const handleDelete = () => {
    if (confirmDeleteId) {
      deleteConversation(confirmDeleteId);
    }
    handleCloseMenu();
  };

  const handleStartEdit = (conv: Conversation) => {
    setEditingId(conv.id);
    setEditValue(conv.title);
    handleCloseMenu();
    setTimeout(() => {
      editInputRef.current?.focus();
      editInputRef.current?.select();
    }, 100);
  };

  const handleSaveEdit = () => {
    if (editingId && editValue.trim()) {
      renameConversation(editingId, editValue.trim());
    }
    setEditingId(null);
    setEditValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSaveEdit();
    } else if (e.key === "Escape") {
      setEditingId(null);
      setEditValue("");
    }
  };

  const formatTimeAgo = (timestamp: number): string => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return "just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <Box
      className="conversation-sidebar"
      sx={{
        width: onBack ? "100%" : 260,
        minWidth: onBack ? "100%" : 260,
        height: onBack ? "100%" : "100vh",
        bgcolor: "#f8fafc",
        borderRight: onBack ? "none" : "1px solid #e2e8f0",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <Box
        sx={{
          px: 2,
          py: 1.5,
          borderBottom: "1px solid #e2e8f0",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          {onBack && (
            <IconButton size="small" onClick={onBack} sx={{ color: "#64748b" }}>
              <ArrowBackIcon fontSize="small" />
            </IconButton>
          )}
          <Typography
            variant="body2"
            sx={{
              fontWeight: 600,
              color: "#475569",
              textTransform: "uppercase",
              letterSpacing: 0.05,
              fontSize: "0.6875rem",
            }}
          >
            Conversations
          </Typography>
        </Box>
        <IconButton
          size="small"
          onClick={handleNewChat}
          sx={{
            bgcolor: "primary.main",
            color: "white",
            width: 28,
            height: 28,
            "&:hover": {
              bgcolor: "primary.dark",
            },
          }}
          title="New chat"
        >
          <AddIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* Conversation List */}
      <Box
        sx={{
          flex: 1,
          overflow: "auto",
          py: 0.5,
        }}
      >
        {sortedConversations.length === 0 ? (
          <Box
            sx={{
              px: 2,
              py: 3,
              textAlign: "center",
            }}
          >
            <ChatIcon sx={{ color: "#cbd5e1", mb: 1 }} />
            <Typography
              variant="body2"
              sx={{ color: "#94a3b8", fontSize: "0.8125rem" }}
            >
              No conversations yet
            </Typography>
            <Typography
              variant="caption"
              sx={{ color: "#cbd5e1", fontSize: "0.6875rem" }}
            >
              Click + to start a new chat
            </Typography>
          </Box>
        ) : (
          sortedConversations.map((conv) => (
            <Box key={conv.id}>
              {editingId === conv.id ? (
                <Box
                  sx={{
                    px: 1.5,
                    py: 0.75,
                    display: "flex",
                    alignItems: "center",
                    bgcolor: "rgba(139, 92, 246, 0.06)",
                    borderRadius: 1,
                    mx: 1,
                    mb: 0.25,
                  }}
                >
                  <TextField
                    inputRef={editInputRef}
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onBlur={handleSaveEdit}
                    size="small"
                    fullWidth
                    autoFocus
                    sx={{
                      "& .MuiInputBase-root": {
                        fontSize: "0.8125rem",
                      },
                    }}
                  />
                </Box>
              ) : (
                <ListItemButton
                  onClick={() => {
                    switchConversation(conv.id);
                    onBack?.();
                  }}
                  sx={{
                    px: 1.5,
                    py: 1,
                    mb: 0.25,
                    borderRadius: 1,
                    bgcolor:
                      activeConversationId === conv.id
                        ? "rgba(139, 92, 246, 0.1)"
                        : "transparent",
                    "&:hover": {
                      bgcolor:
                        activeConversationId === conv.id
                          ? "rgba(139, 92, 246, 0.15)"
                          : "rgba(0, 0, 0, 0.04)",
                    },
                  }}
                >
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                      variant="body2"
                      sx={{
                        fontSize: "0.8125rem",
                        color:
                          activeConversationId === conv.id
                            ? "#8b5cf6"
                            : "#334155",
                        fontWeight:
                          activeConversationId === conv.id ? 600 : 400,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {conv.title}
                    </Typography>
                    <Box
                      sx={{
                        display: "flex",
                        color: "#94a3b8",
                        height: "16px",
                      }}
                    >
                      {streamingConversationId === conv.id ? (
                        <ChatDots size="6px" />
                      ) : (
                        <Typography
                          variant="caption"
                          sx={{
                            fontSize: "0.6875rem",
                          }}
                        >
                          {formatTimeAgo(conv.updatedAt)}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenMenu(e, conv.id);
                    }}
                    sx={{
                      ml: "auto",
                      color: "#94a3b8",
                      "&:hover": { color: "#475569" },
                      opacity: activeConversationId === conv.id ? 1 : 0,
                    }}
                  >
                    <MoreVertIcon fontSize="small" />
                  </IconButton>
                </ListItemButton>
              )}
            </Box>
          ))
        )}
      </Box>

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleCloseMenu}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        sx={{ "& .MuiPaper-root": { minWidth: 140 } }}
      >
        <MenuItem
          onClick={() => {
            const conv = Object.values(conversations).find(
              (c) => c.id === confirmDeleteId,
            );
            if (conv) handleStartEdit(conv);
          }}
          sx={{ gap: 1, fontSize: "0.8125rem" }}
        >
          <EditIcon fontSize="small" />
          Rename
        </MenuItem>
        <MenuItem
          onClick={handleDelete}
          sx={{
            gap: 1,
            fontSize: "0.8125rem",
            color: "#dc2626",
            "&:hover": { bgcolor: "rgba(220, 38, 38, 0.06)" },
          }}
        >
          <DeleteIcon fontSize="small" />
          Delete
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default ConversationSidebar;
