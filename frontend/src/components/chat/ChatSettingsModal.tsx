import React, { useState } from "react";
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
  Menu,
  MenuItem,
  IconButton,
  TextField,
  FormControl,
  InputLabel,
  Select,
} from "@mui/material";
import { DEFAULT_SYSTEM_PROMPT } from "../../utils/constants";
import KeyIcon from "@mui/icons-material/Key";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import { ChatSettings } from "../../context/ChatContext";
import { useChat } from "../../context/ChatContext";

interface ChatSettingsModalProps {
  open: boolean;
  onClose: () => void;
  settings: Partial<ChatSettings>;
  onChange: (partial: Partial<ChatSettings>) => void;
  includeReasoningInContext?: boolean;
  onToggleReasoning?: (checked: boolean) => void;
}

const  ChatSettingsModal: React.FC<ChatSettingsModalProps> = ({
  open,
  onClose,
  settings,
  onChange,
  includeReasoningInContext,
  onToggleReasoning,
}) => {
  const {
    apiKeys,
    selectedKeyId,
    setSelectedApiKeyId,
  } = useChat();

  const [keyMenuAnchor, setKeyMenuAnchor] = useState<null | HTMLElement>(null);

  const activeKeys = apiKeys.filter((k) => k.is_active);

  const handleKeyMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setKeyMenuAnchor(event.currentTarget);
  };

  const handleKeyMenuClose = () => {
    setKeyMenuAnchor(null);
  };

  const handleSelectKey = (id: string) => {
    setSelectedApiKeyId(id);
    handleKeyMenuClose();
  };

  const selectedKey = apiKeys.find((k) => k.id == selectedKeyId);

  const isExternal = settings !== undefined && onChange !== undefined;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Chat Settings</DialogTitle>
      <DialogContent dividers sx={{ minWidth: 320 }}>
        {/* API Key Selector */}
        <Box sx={{ mb: 3 }}>
          <Typography
            variant="caption"
            sx={{
              color: "#64748b",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: 0.05,
              display: "block",
              mb: 0.5,
            }}
          >
            API Key
          </Typography>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              px: 1.5,
              py: 1,
              bgcolor: "#f8fafc",
              borderRadius: 1,
              cursor: activeKeys.length > 0 ? "pointer" : "default",
              "&:hover": activeKeys.length > 0 ? { bgcolor: "#ffffff" } : {},
            }}
            onClick={activeKeys.length > 0 ? handleKeyMenuOpen : undefined}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
              <KeyIcon sx={{ fontSize: 16, color: selectedKey ? "#8b5cf6" : "#94a3b8" }} />
              <Typography
                variant="body2"
                sx={{
                  fontSize: "0.8125rem",
                  color: selectedKey ? "#1e293b" : "#94a3b8",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {selectedKey ? selectedKey.name : "No key selected"}
              </Typography>
            </Box>
            {activeKeys.length > 0 && (
              <KeyboardArrowDownIcon sx={{ fontSize: 18, color: "#94a3b8" }} />
            )}
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Reasoning toggle */}
        {includeReasoningInContext !== undefined && onToggleReasoning && (
          <>
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
          </>
        )}

        {/* Thinking blocks toggles */}
        {isExternal && settings && onChange ? (
          <>
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

            <Divider sx={{ my: 2 }} />

            <Box sx={{ mb: 3 }}>
              <Typography
                variant="caption"
                sx={{
                  color: "#64748b",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: 0.05,
                  display: "block",
                  mb: 0.5,
                }}
              >
                Display Mode
              </Typography>
              <FormControl fullWidth size="small">
                <Select
                  value={settings.displayMode || "markdown"}
                  onChange={(e) =>
                    onChange({
                      ...settings,
                      displayMode: e.target.value as "markdown" | "monospace",
                    })
                  }
                  sx={{ fontSize: "0.8125rem" }}
                >
                  <MenuItem value="markdown">Markdown</MenuItem>
                  <MenuItem value="monospace">Monospace</MenuItem>
                </Select>
              </FormControl>
            </Box>

            <Divider sx={{ my: 2 }} />

            <Box sx={{ mb: 3 }}>
              <Typography
                variant="caption"
                sx={{
                  color: "#64748b",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: 0.05,
                  display: "block",
                  mb: 0.5,
                }}
              >
                Thinking Display Mode
              </Typography>
              <FormControl fullWidth size="small">
                <Select
                  value={settings.thinkingDisplayMode || "monospace"}
                  onChange={(e) =>
                    onChange({
                      ...settings,
                      thinkingDisplayMode: e.target.value as "markdown" | "monospace",
                    })
                  }
                  sx={{ fontSize: "0.8125rem" }}
                >
                  <MenuItem value="markdown">Markdown</MenuItem>
                  <MenuItem value="monospace">Monospace</MenuItem>
                </Select>
              </FormControl>
            </Box>

            <Divider sx={{ my: 2 }} />

            <Box sx={{ mb: 2 }}>
              <Typography
                variant="caption"
                sx={{
                  color: "#64748b",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: 0.05,
                  display: "block",
                  mb: 0.5,
                }}
              >
                System Prompt
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={4}
                value={settings.systemPrompt || DEFAULT_SYSTEM_PROMPT}
                onChange={(e) =>
                  onChange({
                    ...settings,
                    systemPrompt: e.target.value,
                  })
                }
                placeholder={DEFAULT_SYSTEM_PROMPT}
                sx={{
                  mt: 0.5,
                  fontSize: "0.8125rem",
                  "& .MuiInputBase-input": { fontSize: "0.8125rem" },
                }}
              />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, ml: 0 }}>
                The system prompt is sent with every request. It controls how the model behaves.
              </Typography>
            </Box>
          </>
        ) : (
          <>
            <Box sx={{ mb: 3 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={includeReasoningInContext ?? false}
                    onChange={(e) => onToggleReasoning?.(e.target.checked)}
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
                    checked={true}
                    onChange={(e) => {}}
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
                    checked={false}
                    onChange={(e) => {}}
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
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 2, pb: 2 }}>
        <Button onClick={onClose} variant="outlined">
          Done
        </Button>
      </DialogActions>

      {/* API Key Menu */}
      <Menu
        anchorEl={keyMenuAnchor}
        open={Boolean(keyMenuAnchor)}
        onClose={handleKeyMenuClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        sx={{ "& .MuiPaper-root": { minWidth: 240, maxHeight: 320 } }}
      >
        <Box sx={{ px: 2, py: 1, bgcolor: "#f8fafc" }}>
          <Typography
            variant="caption"
            sx={{
              color: "#64748b",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: 0.05,
            }}
          >
            Select API Key
          </Typography>
        </Box>
        <Divider />
        {activeKeys.length === 0 ? (
          <Box sx={{ px: 2, py: 2, textAlign: "center" }}>
            <Typography variant="body2" sx={{ color: "#94a3b8" }}>
              No API keys found. Create one in API Keys settings.
            </Typography>
          </Box>
        ) : (
          activeKeys.map((key) => (
            <MenuItem
              key={key.id}
              onClick={() => handleSelectKey(key.id)}
              sx={{
                py: 1.25,
                bgcolor:
                  selectedKeyId === key.id
                    ? "rgba(139, 92, 246, 0.06)"
                    : "transparent",
                borderRadius: 0,
                "&:hover": { bgcolor: "rgba(139, 92, 246, 0.04)" },
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                  flex: 1,
                  minWidth: 0,
                }}
              >
                <KeyIcon
                  sx={{
                    fontSize: 18,
                    color:
                      selectedKeyId === key.id ? "primary.main" : "#94a3b8",
                    flexShrink: 0,
                  }}
                />
                <Box sx={{ minWidth: 0 }}>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 500,
                      color: "#1e293b",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {key.name}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{ color: "#94a3b8", fontFamily: "monospace" }}
                  >
                    {key.id}
                  </Typography>
                </Box>
                {selectedKeyId === key.id && (
                  <Box
                    sx={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      bgcolor: "primary.main",
                      flexShrink: 0,
                    }}
                  />
                )}
              </Box>
            </MenuItem>
          ))
        )}
        <Divider />
        <MenuItem
          onClick={() => {
            handleKeyMenuClose();
            window.open("/api-keys", "_blank");
          }}
          sx={{
            color: "primary.main",
            fontSize: "0.8125rem",
            justifyContent: "center",
          }}
        >
          Manage API Keys
        </MenuItem>
      </Menu>
    </Dialog>
  );
};

export default ChatSettingsModal;
