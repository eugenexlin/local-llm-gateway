import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Switch,
  FormControlLabel,
  Typography,
  Box,
  Divider,
} from "@mui/material";
import { ChatSettings } from "../../context/ChatContext";

interface ChatSettingsModalProps {
  open: boolean;
  onClose: () => void;
  settings: ChatSettings;
  onChange: (partial: Partial<ChatSettings>) => void;
  includeReasoningInContext: boolean;
  onToggleReasoning: (checked: boolean) => void;
}

const ChatSettingsModal: React.FC<ChatSettingsModalProps> = ({
  open,
  onClose,
  settings,
  onChange,
  includeReasoningInContext,
  onToggleReasoning,
}) => {
  const handleClose = () => {
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle>Chat Settings</DialogTitle>
      <DialogContent dividers sx={{ minWidth: 320 }}>
        <Box sx={{ mb: 3 }}>
          <FormControlLabel
            control={
              <Switch
                checked={includeReasoningInContext}
                onChange={(e) => onToggleReasoning(e.target.checked)}
                size="small"
              />
            }
            label="Send reasoning to model"
            sx={{ mb: 1 }}
          />
          <Typography variant="body2" color="text.secondary" sx={{ ml: 3.5 }}>
            Include thinking steps in subsequent messages
          </Typography>
        </Box>

        <Divider sx={{ my: 2 }} />

        <Box sx={{ mb: 3 }}>
          <FormControlLabel
            control={
              <Switch
                checked={settings.showThinkingBlocks}
                onChange={(e) =>
                  onChange({ showThinkingBlocks: e.target.checked })
                }
                size="small"
              />
            }
            label="Show thinking blocks"
            sx={{ mb: 1 }}
          />
          <Typography variant="body2" color="text.secondary" sx={{ ml: 3.5 }}>
            Display reasoning/thinking content from assistant messages
          </Typography>
        </Box>

        <Divider sx={{ my: 2 }} />

        <Box sx={{ mb: 2 }}>
          <FormControlLabel
            control={
              <Switch
                checked={settings.defaultThinkingCollapsed}
                onChange={(e) =>
                  onChange({ defaultThinkingCollapsed: e.target.checked })
                }
                size="small"
              />
            }
            label="Collapse thinking blocks by default"
            sx={{ mb: 1 }}
          />
          <Typography variant="body2" color="text.secondary" sx={{ ml: 3.5 }}>
            Start thinking blocks in collapsed state
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} variant="outlined">
          Done
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ChatSettingsModal;
