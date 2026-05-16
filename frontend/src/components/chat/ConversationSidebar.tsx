import React, { useState, useRef } from "react";
import {
  Box,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  TextField,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import ChatIcon from "@mui/icons-material/Chat";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import ChatDots from "./ChatDots";
import { useChat, Conversation } from "../../context/ChatContext";
import { sidebarItemBase, sidebarIconContainer } from "../../utils/styles";

interface ConversationSidebarProps {
  onSuggestClose: () => void;
  highlightActive?: boolean;
  onConversationSelect?: (convId: string) => void;
  onNewConversation?: () => void;
}

const ConversationList: React.FC<ConversationSidebarProps> = (
  props: ConversationSidebarProps,
) => {
  const {
    conversations,
    activeConversationId,
    streamingConversationId,
    createConversation,
    switchConversation,
    deleteConversation,
    renameConversation,
  } = useChat();

 const sortedConversations = Object.values(conversations).sort(
    (a, b) => b.updatedAt - a.updatedAt,
  );

  const handleNewChat = () => {
    createConversation();
    props.onSuggestClose();
    props.onNewConversation?.();
  };

  const theme = useTheme();
  const ui = theme.custom.ui;

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

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
        width: "100%",
        minWidth: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Conversation List */}
      <Box
        sx={{
          flex: 1,
          overflow: "auto",
        }}
      >
        <Box
          onClick={handleNewChat}
          sx={{
            ...sidebarItemBase,
            paddingLeft: 3,
            "&:hover": { backgroundColor: ui.activeBg },
          }}
        >
          <Box
            sx={{
              ...sidebarIconContainer,
              color: ui.activeColor,
            }}
          >
            <AddCircleIcon fontSize="small" />
          </Box>
          <Typography
            sx={{
              fontSize: "0.875rem",
              color: ui.activeColor,
              fontWeight: 500,
              whiteSpace: "nowrap",
            }}
          >
            New Conversation
          </Typography>
        </Box>
        {sortedConversations.length === 0 ? (
          <Box
            sx={{
              px: 2,
              py: 3,
              textAlign: "center",
            }}
          >
            <ChatIcon sx={{ color: ui.textMuted, mb: 1 }} />
            <Typography
              variant="body2"
              sx={{ color: ui.textSecondary, fontSize: "0.875rem" }}
            >
              No conversations yet
            </Typography>
            <Typography
              variant="caption"
              sx={{ color: ui.textMuted, fontSize: "0.75rem" }}
            >
              Click "New Conversation" to start a chat
            </Typography>
          </Box>
        ) : (
          sortedConversations.map((conv) => (
            <Box key={conv.id}>
              {editingId === conv.id ? (
                <Box
                  sx={{
                    px: 1.5,
                    py: 1,
                    display: "flex",
                    alignItems: "center",
                    bgcolor: ui.editBg,
                    borderRadius: 0,
                    height: "50px",
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
                <Box
                  onClick={() => {
                    props.onConversationSelect?.(conv.id);
                    switchConversation(conv.id);
                    props.onSuggestClose();
                  }}
                  sx={{
                    ...sidebarItemBase,
                    paddingLeft: 3,
                    bgcolor:
                      props.highlightActive && activeConversationId === conv.id
                        ? ui.activeBg
                        : "transparent",
                    "&:hover": {
                      bgcolor:
                        props.highlightActive &&
                        activeConversationId === conv.id
                          ? ui.activeBg
                          : ui.hoverBg,
                    },
                  }}
                >
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                      variant="body2"
                      sx={{
                        fontSize: "0.875rem",
                        color:
                          props.highlightActive &&
                          activeConversationId === conv.id
                            ? ui.activeColor
                            : ui.textPrimary,
                        fontWeight:
                          props.highlightActive &&
                          activeConversationId === conv.id
                            ? 600
                            : 400,
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
                        color: ui.textSecondary,
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
                  {activeConversationId === conv.id && (
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenMenu(e, conv.id);
                      }}
                      sx={{
                        ml: "auto",
                        color: ui.textSecondary,
                        "&:hover": { color: ui.textPrimary },
                        opacity:
                          props.highlightActive &&
                          activeConversationId === conv.id
                            ? 1
                            : 0,
                      }}
                    >
                      <MoreVertIcon fontSize="small" />
                    </IconButton>
                  )}
                </Box>
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
          sx={{ gap: 1, fontSize: "0.875rem" }}
        >
          <EditIcon fontSize="small" />
          Rename
        </MenuItem>
        <MenuItem
          onClick={handleDelete}
          sx={{
            gap: 1,
            fontSize: "0.875rem",
            color: ui.deleteColor,
            "&:hover": { bgcolor: ui.deleteHoverBg },
          }}
        >
          <DeleteIcon fontSize="small" />
          Delete
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default ConversationList;
