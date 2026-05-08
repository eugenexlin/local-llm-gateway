import React, { useState, useEffect } from "react";
import { Fab, Badge, Tooltip } from "@mui/material";
import ChatIcon from "@mui/icons-material/Chat";
import CloseIcon from "@mui/icons-material/Close";
import { useLocation } from "react-router-dom";
import { sharedFabStyle, sharedGlassStyle } from "../../utils/styles";

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
      const stored = localStorage.getItem("llm_chat_history");
      setHasMessages(!!stored && stored !== "[]");
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

  if (location.pathname === "/chat") {
    return null;
  }

  return (
    <Tooltip title={hasMessages ? "Continue chat" : "Open chat"}>
      <Fab
        size="small"
        onClick={handleClick}
        sx={{
          ...sharedFabStyle,
          ...sharedGlassStyle,
          top: 8,
          right: 8,
          zIndex: open ? 1500 : undefined,
        }}
        className="chat-fab"
      >
        <Badge
          color="error"
          variant="dot"
          invisible={!hasMessages}
          sx={{
            "& .MuiBadge-badge": {
              top: -2,
              right: -2,
            },
          }}
        >
          {open ? <CloseIcon /> : <ChatIcon />}
        </Badge>
      </Fab>
    </Tooltip>
  );
};

export default ChatFAB;
