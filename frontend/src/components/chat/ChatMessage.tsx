import React, { useRef, useEffect } from 'react';
import { Box, Typography, Avatar } from '@mui/material';
import { keyframes } from '@emotion/react';
import { ChatMessage as ChatMessageType } from '../../context/ChatContext';
import { useAuth } from '../../context/AuthContext';

interface ChatMessageProps {
  message: ChatMessageType;
  isStreaming: boolean;
}

const waveRipple = keyframes`
  0%, 100% {
    transform: translateY(0) scale(1.1);
    opacity: 0.6;
  }
  50% {
    transform: translateY(40%) scale(1);
    opacity: 1;
  }
`;

const ChatMessage: React.FC<ChatMessageProps> = ({ message, isStreaming }) => {
  const { user } = useAuth();
  const isUser = message.role === 'user';
  const isStreamingResponse = !isUser && isStreaming;
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const thinkingRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isStreaming && message.thinking && thinkingRef.current) {
      thinkingRef.current.scrollTop = thinkingRef.current.scrollHeight;
    }
  }, [message.thinking, isStreaming]);

  const renderContent = (content: string) => {
    const parts = content.split(/(```[\s\S]*?```)/g);
    
    return parts.map((part, index) => {
      if (part.startsWith('```') && part.endsWith('```')) {
        const codeContent = part.slice(3, -3);
        const newlineIdx = codeContent.indexOf('\n');
        if (newlineIdx !== -1) {
          const lang = codeContent.slice(0, newlineIdx).trim();
          const code = codeContent.slice(newlineIdx + 1);
          return (
            <Box
              key={index}
              sx={{
                bgcolor: '#1e1e2e',
                borderRadius: 1,
                p: 1.5,
                my: 1,
                position: 'relative',
                overflow: 'auto',
              }}
            >
              {lang && lang.match(/^[a-z]+$/i) && (
                <Typography
                  variant="caption"
                  sx={{
                    position: 'absolute',
                    top: 4,
                    right: 8,
                    color: '#888',
                    textTransform: 'uppercase',
                  }}
                >
                  {lang}
                </Typography>
              )}
              <Box
                component="pre"
                sx={{
                  m: 0,
                  fontSize: '0.8125rem',
                  fontFamily: '"Fira Code", "Cascadia Code", "Consolas", monospace',
                  lineHeight: 1.5,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  color: '#cdd6f4',
                  '& code': { display: 'block' }
                }}
              >
                <code>{code}</code>
              </Box>
            </Box>
          );
        }
      }
      
      if (part.includes('\n')) {
        return (
          <Box key={index} sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {part.split('\n').map((line, lineIdx) => (
              <React.Fragment key={lineIdx}>
                {lineIdx > 0 && <br />}
                {line}
              </React.Fragment>
            ))}
          </Box>
        );
      }
      
      return <Box key={index} sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{part}</Box>;
    });
  };

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        mb: 1.5,
        px: 2,
      }}
    >
      {!isUser && (
        <Avatar
          sx={{
            width: 32,
            height: 32,
            bgcolor: 'primary.main',
            fontSize: '0.875rem',
            mr: 1,
            mt: 0.5,
            flexShrink: 0,
          }}
        >
          AI
        </Avatar>
      )}
      
      <Box
        sx={{
          maxWidth: '80%',
          minWidth: 40,
        }}
      >
        {!isUser && message.thinking && (
          <Box
            sx={{
              mb: 1,
              px: 2,
              py: 1,
              borderRadius: { xs: '16px 16px 4px 16px', sm: '16px 16px 16px 4px' },
              bgcolor: '#f5f3ff',
              border: '2px solid #8b5cf6',
            }}
          >
            <details open>
              <summary
                style={{
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  color: '#6d28d9',
                  fontWeight: 600,
                  listStyle: 'none',
                  marginBottom: '4px',
                }}
              >
                <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#8b5cf6', display: 'inline-block' }} />
                  Thinking
                </Box>
              </summary>
              <Box
                ref={thinkingRef}
                sx={{
                  mt: 0.5,
                  p: 1.5,
                  bgcolor: '#ede9fe',
                  borderRadius: 1,
                  fontSize: '0.8125rem',
                  color: '#3b0764',
                  maxHeight: 300,
                  overflow: 'auto',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  fontFamily: '"Fira Code", "Cascadia Code", "Consolas", monospace',
                  lineHeight: 1.5,
                }}
              >
                {message.thinking}
              </Box>
            </details>
          </Box>
        )}
        <Box
          sx={{
            px: 2,
            py: 1.25,
            borderRadius: isUser ? { xs: '16px 16px 4px 16px', sm: '16px 16px 4px 16px' } : { xs: '16px 16px 16px 4px', sm: '16px 16px 16px 4px' },
            bgcolor: isUser ? 'primary.main' : '#f1f5f9',
            color: isUser ? 'white' : '#1e293b',
            boxShadow: isUser ? '0 2px 8px rgba(139, 92, 246, 0.25)' : '0 1px 3px rgba(0,0,0,0.06)',
          }}
        >
          {renderContent(message.content)}
          
          {isStreamingResponse && (
            <Box sx={{ ml: 0.5, display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
              <Box sx={{ 
                width: 7, 
                height: 7, 
                borderRadius: '50%', 
                bgcolor: '#8b5cf6',
                animation: `${waveRipple} 0.8s ease-in-out infinite`,
              }} />
              <Box sx={{ 
                width: 7, 
                height: 7, 
                borderRadius: '50%', 
                bgcolor: '#8b5cf6',
                animation: `${waveRipple} 0.8s ease-in-out infinite 0.15s`,
              }} />
              <Box sx={{ 
                width: 7, 
                height: 7, 
                borderRadius: '50%', 
                bgcolor: '#8b5cf6',
                animation: `${waveRipple} 0.8s ease-in-out infinite 0.3s`,
              }} />
            </Box>
          )}
        </Box>
        
        <Typography
          variant="caption"
          sx={{
            display: 'block',
            mt: 0.5,
            color: '#94a3b8',
            px: 0.5,
          }}
        >
          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Typography>
      </Box>
      
      {isUser && (
        <Avatar
          sx={{
            width: 32,
            height: 32,
            bgcolor: '#6366f1',
            fontSize: '0.875rem',
            ml: 1,
            mt: 0.5,
            flexShrink: 0,
          }}
        >
          {user?.name?.charAt(0).toUpperCase()}
        </Avatar>
      )}
      
      <div ref={messagesEndRef} />
    </Box>
  );
};

export default ChatMessage;
