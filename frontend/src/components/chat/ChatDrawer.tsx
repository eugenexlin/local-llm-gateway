import React, { useEffect, useState } from "react";
import { Drawer, Box, useMediaQuery, useTheme } from "@mui/material";
import ChatHeader from "./ChatHeader";
import ChatMessageList from "./ChatMessageList";
import ChatInput from "./ChatInput";
import ConversationSidebar from "./ConversationSidebar";
import { useLocation, useNavigate } from "react-router-dom";

interface ChatDrawerProps {
  open: boolean;
  onClose: () => void;
}

const ChatDrawer: React.FC<ChatDrawerProps> = ({ open, onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleToggleSidebar = () => {
    setSidebarOpen((prev) => !prev);
  };


  const handleSidebarOpen = () => {
    navigate(location.pathname, { state: {...location.state,  mobileSidebarOpen: true }, replace: false });
  };
  const handleSidebarClose = () => {
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      // If no history exists, go to a logical parent or home page
      navigate(location.pathname, { state: {...location.state,  mobileSidebarOpen: false }, replace: true });
    }
  };

  if (isMobile) {
    return (
      <Drawer
        anchor="right"
        open={open}
        onClose={onClose}
        sx={{
          "& .MuiDrawer-paper": {
            width: "100vw",
            height: "100dvh",
            maxHeight: "100dvh",
            boxSizing: "border-box",
            p: 0,
            overflow: "hidden",
          },
        }}
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            height: "100dvh",
            overflow: "hidden",
          }}
        >
          {location.state?.mobileSidebarOpen ? (
            <Box
              sx={{
                width: "100%",
                height: "100%",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <ConversationSidebar onBack={handleSidebarClose} />
            </Box>
          ) : (
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                height: "100%",
                flex: 1,
                overflow: "hidden",
              }}
            >
              <ChatHeader
                onClose={onClose}
                onOpenSidebar={handleSidebarOpen}
              />
              <ChatMessageList onMobileClose={onClose} />
              <ChatInput />
            </Box>
          )}
        </Box>
      </Drawer>
    );
  }

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      sx={{
        "& .MuiDrawer-paper": {
          width: sidebarOpen ? "calc(260px + 70vw)" : "70vw",
          minWidth: sidebarOpen ? 400 : 300,
          boxSizing: "border-box",
          border: "none",
          boxShadow: "-4px 0 24px rgba(0, 0, 0, 0.1)",
          zIndex: 1200,
        },
      }}
    >
      <Box sx={{ display: "flex", height: "100vh" }}>
        {sidebarOpen && <ConversationSidebar />}
        <Box
          sx={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            minWidth: 0,
          }}
        >
          <ChatHeader onClose={onClose} onToggleSidebar={handleToggleSidebar} />
          <ChatMessageList />
          <ChatInput />
        </Box>
      </Box>
    </Drawer>
  );
};

export default ChatDrawer;
