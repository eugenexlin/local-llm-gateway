import React from "react";
import {
  Box,
  Typography,
  Button,
  IconButton,
} from "@mui/material";
import KeyIcon from "@mui/icons-material/Key";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { useNavigate } from "react-router-dom";

interface ChatSetupModalProps {
  open: boolean;
}

const ChatSetupModal: React.FC<ChatSetupModalProps> = ({ open }) => {
  const navigate = useNavigate();

  if (!open) return null;

  return (
    <Box
      sx={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        bgcolor: "rgba(248, 250, 252, 0.85)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
        pointerEvents: "auto",
      }}
    >
      <Box
        sx={{
          bgcolor: "background.paper",
          borderRadius: 3,
          p: 4,
          boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
          textAlign: "center",
          maxWidth: 360,
          width: "100%",
        }}
      >
        <Box
          sx={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            bgcolor: "rgba(139, 92, 246, 0.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            mx: "auto",
            mb: 2,
          }}
        >
          <KeyIcon sx={{ fontSize: 28, color: "#8b5cf6" }} />
        </Box>

        <Typography
          variant="h6"
          sx={{ fontWeight: 600, color: "#1e293b", mb: 1 }}
        >
          No API Key Selected
        </Typography>

        <Typography
          variant="body2"
          sx={{ color: "#64748b", mb: 3, fontSize: "0.875rem" }}
        >
          Select an API key in the API Keys page to start chatting
        </Typography>

        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          <Button
            variant="contained"
            onClick={() => navigate("/api-keys")}
            sx={{
              bgcolor: "#8b5cf6",
              "&:hover": { bgcolor: "#7c3aed" },
              textTransform: "none",
              fontWeight: 600,
              py: 1,
            }}
            endIcon={<OpenInNewIcon fontSize="small" />}
          >
            Go to API Keys
          </Button>

          <Button
            variant="outlined"
            onClick={() => {}}
            sx={{
              textTransform: "none",
              fontWeight: 500,
              py: 1,
              color: "#64748b",
              borderColor: "#e2e8f0",
            }}
          >
            Dismiss
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default ChatSetupModal;
