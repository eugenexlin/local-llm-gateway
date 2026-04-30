import React from 'react';
import { Drawer, Box, useMediaQuery, useTheme } from '@mui/material';
import ChatHeader from './ChatHeader';
import ChatMessageList from './ChatMessageList';
import ChatInput from './ChatInput';

interface ChatDrawerProps {
  open: boolean;
  onClose: () => void;
}

const ChatDrawer: React.FC<ChatDrawerProps> = ({ open, onClose }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  if (isMobile) {
    return (
      <Drawer
        anchor="bottom"
        open={open}
        onClose={onClose}
        sx={{
          '& .MuiDrawer-paper': {
            height: '100vh',
            maxHeight: '100vh',
            boxSizing: 'border-box',
            p: 0,
          },
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
          <ChatHeader onClose={onClose} />
          <ChatMessageList />
          <ChatInput />
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
          width: 420,
          boxSizing: 'border-box',
          border: 'none',
          boxShadow: '-4px 0 24px rgba(0, 0, 0, 0.1)',
          zIndex: 1200,
        },
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        <ChatHeader onClose={onClose} />
        <ChatMessageList />
        <ChatInput />
      </Box>
    </Drawer>
  );
};

export default ChatDrawer;
