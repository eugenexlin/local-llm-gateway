import React, { useState } from "react";
import { Box, useMediaQuery, useTheme, IconButton, Tooltip } from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import SettingsIcon from "@mui/icons-material/Settings";
import ConversationSidebar from "../components/chat/ConversationSidebar";
import ChatMessageList from "../components/chat/ChatMessageList";
import ChatInput from "../components/chat/ChatInput";
import ChatSettingsModal from "../components/chat/ChatSettingsModal";
import ChatSetupModal from "../components/chat/ChatSetupModal";
import { useChat } from "../context/ChatContext";

const ChatPage: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const { selectedKeyId } = useChat();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const handleToggleSidebar = () => {
    setSidebarOpen((prev) => !prev);
  };

  const handleMobileSidebarOpen = () => {
    setMobileSidebarOpen(true);
  };

  const handleMobileSidebarClose = () => {
    setMobileSidebarOpen(false);
  };

  return (
    <Box
      sx={{
        display: "flex",
        height: "100dvh",
        overflow: "hidden",
        bgcolor: "#f8fafc",
      }}
    >
      {/* Sidebar - desktop: always visible when sidebarOpen, mobile: conditional */}
      {(sidebarOpen || isMobile) && (
        <Box
          sx={{
            display: isMobile && !mobileSidebarOpen ? "none" : "block",
            width: 260,
            minWidth: 260,
            height: "100%",
          }}
        >
          <ConversationSidebar
            onBack={isMobile ? handleMobileSidebarClose : undefined}
          />
        </Box>
      )}

      {/* Chat area */}
      <Box
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          minWidth: 0,
          position: "relative",
        }}
      >
        {/* Breadcrumb bar */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            px: 2,
            py: 1,
            borderBottom: "1px solid #e2e8f0",
            bgcolor: "background.paper",
            minHeight: 48,
          }}
        >
          <Tooltip title={isMobile ? "Conversations" : "Toggle conversations"}>
            <IconButton
              size="small"
              onClick={isMobile ? handleMobileSidebarOpen : handleToggleSidebar}
              sx={{
                color: "#64748b",
                "&:hover": { bgcolor: "rgba(0,0,0,0.04)" },
              }}
            >
              <MenuIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          <Tooltip title="Settings">
            <IconButton
              size="small"
              onClick={() => setSettingsOpen(true)}
              sx={{
                color: "#64748b",
                "&:hover": { bgcolor: "rgba(0,0,0,0.04)" },
              }}
            >
              <SettingsIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Message list */}
        <ChatMessageList pageMode onMobileClose={handleMobileSidebarClose} />

        {/* Input */}
        <ChatInput pageMode />

        {/* Setup modal overlay */}
        {!selectedKeyId && <ChatSetupModal open={true} />}

        {/* Settings modal */}
        <ChatSettingsModal
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
        />
      </Box>
    </Box>
  );
};

export default ChatPage;
