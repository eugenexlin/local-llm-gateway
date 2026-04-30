import React, { useState, useRef, useEffect } from 'react';
import { Box, TextField, IconButton, InputAdornment, Typography } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import { useChat } from '../../context/ChatContext';

const ChatInput: React.FC = () => {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { sendMessage, isLoading, selectedKeyId } = useChat();

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  }, [input]);

  const handleSubmit = async () => {
    if (!input.trim() || isLoading) return;
    const message = input.trim();
    setInput('');
    await sendMessage(message);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  };

  return (
    <Box
      sx={{
        p: 2,
        borderTop: '1px solid #e2e8f0',
        bgcolor: 'background.paper',
      }}
    >
      {!selectedKeyId && (
        <Typography
          variant="caption"
          sx={{
            display: 'block',
            mb: 1,
            color: '#f59e0b',
            px: 1,
          }}
        >
          Please select an API key above to start chatting
        </Typography>
      )}
      
      <TextField
        fullWidth
        multiline
        maxRows={6}
        value={input}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder={selectedKeyId ? "Type a message..." : "Select an API key to chat"}
        disabled={isLoading || !selectedKeyId}
        variant="outlined"
        size="small"
        inputProps={{ ref: textareaRef as any }}
        sx={{
          '& .MuiOutlinedInput-root': {
            borderRadius: 3,
            bgcolor: '#f8fafc',
            '& fieldset': {
              borderColor: '#e2e8f0',
            },
            '&:hover fieldset': {
              borderColor: '#cbd5e1',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#8b5cf6',
            },
          },
        }}
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                onClick={handleSubmit}
                disabled={!input.trim() || isLoading}
                sx={{
                  color: input.trim() && !isLoading ? 'primary.main' : '#94a3b8',
                }}
              >
                <SendIcon fontSize="small" />
              </IconButton>
            </InputAdornment>
          ),
        }}
      />
    </Box>
  );
};

export default ChatInput;
