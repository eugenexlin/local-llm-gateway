import React, { useRef, useEffect, useCallback } from 'react';
import { Box, Typography } from '@mui/material';
import ChatMessage from './ChatMessage';
import ChatDots from './ChatDots';
import { useChat } from '../../context/ChatContext';

interface ChatMessageListProps {
  onMobileClose?: () => void;
}

const ChatMessageList: React.FC<ChatMessageListProps> = ({ onMobileClose }) => {
  const { messages, isLoading, streamingConversationId, activeConversation, createConversation } = useChat();
  const scrollRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);
  const prevMessagesLengthRef = useRef(0);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const threshold = 80;
    isAtBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const prevLen = prevMessagesLengthRef.current;
    const currLen = messages.length;

    if (prevLen === 0 && currLen > 0) {
      el.scrollTop = el.scrollHeight;
      prevMessagesLengthRef.current = currLen;
      return;
    }

    if (isAtBottomRef.current) {
      el.scrollTop = el.scrollHeight;
    }

    prevMessagesLengthRef.current = currLen;
  }, [messages, isLoading]);

  const handleEmptyStateClick = () => {
    if (activeConversation && activeConversation.messages.length === 0) {
      // Already have a conversation, just focus input
    } else {
      createConversation();
    }
    onMobileClose?.();
  };

  return (
    <Box
      ref={scrollRef}
      sx={{
        flex: 1,
        overflow: 'auto',
        py: 1,
        bgcolor: '#f8fafc',
      }}
    >
      {messages.length === 0 ? (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            px: { xs: 2, sm: 4 },
            textAlign: 'center',
            cursor: 'pointer',
          }}
          onClick={handleEmptyStateClick}
        >
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: 3,
              bgcolor: 'rgba(139, 92, 246, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mb: 2,
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </Box>
          <Typography variant="h6" sx={{ color: '#475569', fontWeight: 600, mb: 1 }}>
            Start a conversation
          </Typography>
          <Typography variant="body2" sx={{ color: '#94a3b8', maxWidth: 280 }}>
            Select an API key above, then type a message to chat with the LLM.
          </Typography>
        </Box>
      ) : (
        <>
          {messages.map((msg, idx) => (
            <ChatMessage
              key={idx}
              message={msg}
              isStreaming={streamingConversationId === activeConversation?.id && idx === messages.length - 1 && msg.role === 'assistant'}
            />
          ))}
          {streamingConversationId === activeConversation?.id && messages.length > 0 && messages[messages.length - 1].role === 'user' && (
            <Box sx={{ px: { xs: 1, sm: 2 }, display: 'flex', justifyContent: 'flex-start', mb: 1.5 }}>
              <Box sx={{ display: 'flex', gap: 0.5, px: 2, py: 1.25, bgcolor: '#f1f5f9', borderRadius: '16px 16px 16px 4px' }}>
                <ChatDots />
              </Box>
            </Box>
          )}
        </>
      )}
    </Box>
  );
};

export default ChatMessageList;
