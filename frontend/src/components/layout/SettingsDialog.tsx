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
  Tabs,
  Tab,
  Menu,
  MenuItem,
  TextField,
  FormControl,
  InputLabel,
  Select,
} from "@mui/material";
import { DEFAULT_SYSTEM_PROMPT } from "../../utils/constants";
import KeyIcon from "@mui/icons-material/Key";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import { useChat } from "../../context/ChatContext";
import { useThemeContext } from "../../context/ThemeContext";

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
}

const SettingsDialog: React.FC<SettingsDialogProps> = ({ open, onClose }) => {
  const {
    apiKeys,
    selectedKeyId,
    setSelectedApiKeyId,
    chatSettings,
    setChatSettings,
    includeReasoningInContext,
    setIncludeReasoningInContext,
  } = useChat();

  const { mode, toggleTheme } = useThemeContext();

  const [activeTab, setActiveTab] = useState(0);
  const [keyMenuAnchor, setKeyMenuAnchor] = useState<null | HTMLElement>(null);

  const activeKeys = apiKeys.filter((k) => k.is_active);
  const selectedKey = apiKeys.find((k) => k.id == selectedKeyId);

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

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      onClick={(e) => {
        // this prevents the nav drawer from opening if the click event propogates all the way up
        e.stopPropagation();
      }}
    >
      <Typography
        variant="h6"
        sx={{
          px: 2,
          py: 1,
        }}
      >
        Settings
      </Typography>
      <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          sx={{ borderBottom: 1, borderColor: "divider" }}
        >
          <Tab label="General" />
          <Tab label="Chat" />
        </Tabs>
      </Box>
      <DialogContent dividers>
        {/* General Tab */}
        {activeTab === 0 && (
          <Box sx={{ py: 2 }}>
            <Box sx={{ mb: 3 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={mode === "dark"}
                    onChange={() => toggleTheme()}
                    size="small"
                  />
                }
                label="Dark mode"
                sx={{ mb: 1 }}
              />
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ ml: 3.5 }}
              >
                Switch between light and dark theme
              </Typography>
            </Box>
          </Box>
        )}

        {/* Chat Tab */}
        {activeTab === 1 && (
          <Box sx={{ py: 2 }}>
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
                  "&:hover":
                    activeKeys.length > 0 ? { bgcolor: "#ffffff" } : {},
                }}
                onClick={activeKeys.length > 0 ? handleKeyMenuOpen : undefined}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    minWidth: 0,
                  }}
                >
                  <KeyIcon
                    sx={{
                      fontSize: 16,
                      color: selectedKey ? "#8b5cf6" : "#94a3b8",
                    }}
                  />
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
                  <KeyboardArrowDownIcon
                    sx={{ fontSize: 18, color: "#94a3b8" }}
                  />
                )}
              </Box>
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* Reasoning toggle */}
            <Box sx={{ mb: 3 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={includeReasoningInContext ?? false}
                    onChange={(e) =>
                      setIncludeReasoningInContext?.(e.target.checked)
                    }
                    size="small"
                  />
                }
                label="Send reasoning to model"
                sx={{ mb: 1 }}
              />
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ ml: 3.5 }}
              >
                Include thinking steps in subsequent messages
              </Typography>
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* Thinking blocks toggles */}
            <Box sx={{ mb: 3 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={chatSettings.showThinkingBlocks}
                    onChange={(e) =>
                      setChatSettings({
                        ...chatSettings,
                        showThinkingBlocks: e.target.checked,
                      })
                    }
                    size="small"
                  />
                }
                label="Show thinking blocks"
                sx={{ mb: 1 }}
              />
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ ml: 3.5 }}
              >
                Display reasoning/thinking content from assistant messages
              </Typography>
            </Box>

            <Divider sx={{ my: 2 }} />

            <Box sx={{ mb: 2 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={chatSettings.defaultThinkingCollapsed}
                    onChange={(e) =>
                      setChatSettings({
                        ...chatSettings,
                        defaultThinkingCollapsed: e.target.checked,
                      })
                    }
                    size="small"
                  />
                }
                label="Collapse thinking blocks by default"
                sx={{ mb: 1 }}
              />
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ ml: 3.5 }}
              >
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
                  value={chatSettings.displayMode}
                  onChange={(e) =>
                    setChatSettings({
                      ...chatSettings,
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
                  value={chatSettings.thinkingDisplayMode}
                  onChange={(e) =>
                    setChatSettings({
                      ...chatSettings,
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
                value={chatSettings.systemPrompt}
                onChange={(e) =>
                  setChatSettings({
                    ...chatSettings,
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
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 0.5, ml: 0 }}
              >
                The system prompt is sent with every request. It controls how the model behaves.
              </Typography>
            </Box>
          </Box>
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

export default SettingsDialog;
