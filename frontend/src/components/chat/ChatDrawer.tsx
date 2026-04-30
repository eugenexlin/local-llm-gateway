import React, { useState } from "react";
import { Drawer, Box, useMediaQuery, useTheme } from "@mui/material";
import ChatHeader from "./ChatHeader";
import ChatMessageList from "./ChatMessageList";
import ChatInput from "./ChatInput";
import ConversationSidebar from "./ConversationSidebar";

interface ChatDrawerProps {
  open: boolean;
  onClose: () => void;
}

const ChatDrawer: React.FC<ChatDrawerProps> = ({ open, onClose }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarView, setMobileSidebarView] = useState<'chat' | 'sidebar'>('chat');

  const handleToggleSidebar = () => {
    setSidebarOpen((prev) => !prev);
  };

  const handleOpenMobileSidebar = () => {
    setMobileSidebarView('sidebar');
  };

  const handleMobileSidebarBack = () => {
    setMobileSidebarView('chat');
  };

  if (isMobile) {
    return (
      <Drawer
        anchor="right"
        open={open}
        onClose={onClose}
        sx={{
          '& .MuiDrawer-paper': {
            width: '100vw',
            height: '100dvh',
            maxHeight: '100dvh',
            boxSizing: 'border-box',
            p: 0,
            overflow: 'hidden',
          },
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100dvh', overflow: 'hidden' }}>
          {mobileSidebarView === 'sidebar' ? (
            <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
              <ConversationSidebar onBack={handleMobileSidebarBack} />
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', flex: 1, overflow: 'hidden' }}>
              <ChatHeader onClose={onClose} onOpenSidebar={handleOpenMobileSidebar} />
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
        '& .MuiDrawer-paper': {
          width: sidebarOpen ? 'calc(260px + 70vw)' : '70vw',
          minWidth: sidebarOpen ? 400 : 300,
          boxSizing: 'border-box',
          border: 'none',
          boxShadow: '-4px 0 24px rgba(0, 0, 0, 0.1)',
          zIndex: 1200,
          transition: 'width 0.2s ease',
        },
      }}
    >
      <Box sx={{ display: 'flex', height: '100vh' }}>
        {sidebarOpen && (
          <ConversationSidebar />
        )}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
          <ChatHeader onClose={onClose} onToggleSidebar={handleToggleSidebar} />
          <ChatMessageList />
          <ChatInput />
        </Box>
      </Box>
    </Drawer>
  );
};

export default ChatDrawer;
