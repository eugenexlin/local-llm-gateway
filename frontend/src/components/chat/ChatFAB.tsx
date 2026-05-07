import React, { useState, useEffect } from 'react';
import { Fab, Badge, Tooltip } from '@mui/material';
import ChatIcon from '@mui/icons-material/Chat';
import CloseIcon from '@mui/icons-material/Close';
import { useLocation } from 'react-router-dom';

interface ChatFABProps {
  open: boolean;
  onClose: () => void;
  onOpen: () => void;
}

const ChatFAB: React.FC<ChatFABProps> = ({ open, onClose, onOpen }) => {
  const location = useLocation();
  const [hasMessages, setHasMessages] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('llm_chat_history');
      setHasMessages(!!stored && stored !== '[]');
    } catch {
      setHasMessages(false);
    }
  }, []);

  const handleClick = () => {
    if (open) {
      onClose();
    } else {
      onOpen();
    }
  };

  const fabStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: 24,
    right: 24,
    zIndex: 1300,
    width: 56,
    height: 56,
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    transform: open ? 'rotate(90deg) scale(0.9)' : 'rotate(0deg) scale(1)',
    boxShadow: '0 4px 16px rgba(139, 92, 246, 0.35)',
  };

  if (open || location.pathname === '/chat') {
    return null;
  }

  return (
    <Tooltip title={hasMessages ? 'Continue chat' : 'Open chat'}>
      <Fab
        onClick={handleClick}
        sx={fabStyle}
        className="chat-fab"
      >
        <Badge
          color="error"
          variant="dot"
          invisible={!hasMessages}
          sx={{
            '& .MuiBadge-badge': {
              top: -2,
              right: -2,
            },
          }}
        >
          <ChatIcon />
        </Badge>
      </Fab>
    </Tooltip>
  );
};

export default ChatFAB;
