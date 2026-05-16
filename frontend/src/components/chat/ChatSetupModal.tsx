import React from "react";
import {
  Box,
  Typography,
} from "@mui/material";
import KeyIcon from "@mui/icons-material/Key";
import { sharedFrostGlassStyle } from "../../utils/styles";
import type { ApiKey } from "../../models/ApiKey";
import ApiKeyDropdown from "../ui/ApiKeyDropdown";

interface ChatSetupModalProps {
  open: boolean;
  apiKeys: ApiKey[];
  selectedKeyId: string;
  onSelectKey: (id: string) => void;
}

const ChatSetupModal: React.FC<ChatSetupModalProps> = ({
  open,
  apiKeys,
  selectedKeyId,
  onSelectKey,
}) => {
  const activeKeys = apiKeys.filter((k) => k.is_active);
  const hasAvailableKeys = activeKeys.length > 0;
  const hasSelectedKey = !!selectedKeyId;

  if (!open) return null;

  return (
    <Box
      sx={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        ...sharedFrostGlassStyle,
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
          maxWidth: 400,
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

        {!hasSelectedKey && hasAvailableKeys ? (
          <>
            <Typography
              variant="h6"
              sx={{ fontWeight: 600,  mb: 0.5 }}
            >
              Select an API Key
            </Typography>
            <Typography
              variant="body2"
              sx={{ color: "color-mix(in oklab, var(--mui-palette-text-primary) 50%, var(--mui-palette-background-paper))", mb: 2, fontSize: "0.875rem" }}
            >
              Choose an API key to start chatting
            </Typography>

            <Box sx={{ mb: 2, justifyContent: "center", display: "flex" }}>
              <ApiKeyDropdown
                apiKeys={apiKeys}
                selectedKeyId={selectedKeyId}
                onSelectKey={onSelectKey}
              />
            </Box>

            <Typography
              variant="caption"
              sx={{ color: "color-mix(in oklab, var(--mui-palette-text-primary) 50%, var(--mui-palette-background-paper))", display: "block", mb: 2 }}
            >
              You can change this later in Settings
            </Typography>
          </>
        ) : !hasAvailableKeys ? (
          <>
            <Typography
              variant="h6"
              sx={{ fontWeight: 600, mb: 0.5 }}
            >
              No API Key Available
            </Typography>
            <Typography
              variant="body2"
              sx={{ color: "color-mix(in oklab, var(--mui-palette-text-primary) 50%, var(--mui-palette-background-paper))", mb: 3, fontSize: "0.875rem" }}
            >
              You need an API key to chat. Create one on the API Keys page.
            </Typography>
          </>
        ) : (
          <>
            <Typography
              variant="h6"
              sx={{ fontWeight: 600,  mb: 0.5 }}
            >
              API Key Selected
            </Typography>
            <Typography
              variant="body2"
              sx={{ color: "color-mix(in oklab, var(--mui-palette-text-primary) 50%, var(--mui-palette-background-paper))", mb: 2, fontSize: "0.875rem" }}
            >
              You can change this later in Settings
            </Typography>
          </>
        )}
      </Box>
    </Box>
  );
};

export default ChatSetupModal;
