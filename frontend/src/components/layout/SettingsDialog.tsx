import React, { useState } from "react";
import {
  Dialog,
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
  TextField,
  FormControl,
  Select,
  MenuItem,
  Alert,
  DialogTitle,
  DialogContentText,
} from "@mui/material";
import { DEFAULT_SYSTEM_PROMPT } from "../../utils/constants";
import { useChat } from "../../context/ChatContext";
import { useThemeContext } from "../../context/ThemeContext";
import ApiKeyDropdown from "../ui/ApiKeyDropdown";
import { halfFadeColor } from "../../utils/styles";
import DashboardSettings from "./DashboardSettings";

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
  const [aborting, setAborting] = useState(false);
  const [showAbortConfirm, setShowAbortConfirm] = useState(false);
  const [abortResult, setAbortResult] = useState<{ success: boolean; count: number } | null>(null);

  const handleAbortAll = async () => {
    setAborting(true);
    try {
      const response = await fetch("/api/server-stats/abort-all", {
        method: "POST",
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setAbortResult({ success: true, count: data.aborted });
      } else {
        setAbortResult({ success: false, count: 0 });
      }
    } catch {
      setAbortResult({ success: false, count: 0 });
    } finally {
      setAborting(false);
    }
  };

  const handleCloseAbortConfirm = () => {
    setShowAbortConfirm(false);
    setAbortResult(null);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      onClick={(e) => {
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
          <Tab label="Dashboard" />
          <Tab label="Chat" />
          <Tab label="Advanced" />
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

        {/* Dashboard Tab */}
        {activeTab === 1 && (
          <Box sx={{ py: 2 }}>
            <DashboardSettings />
          </Box>
        )}

        {/* Chat Tab */}
        {activeTab === 2 && (
          <Box sx={{ py: 2 }}>
            {/* API Key Selector */}
            <Box sx={{ mb: 3 }}>
              <Typography
                variant="caption"
                sx={{
                  color: halfFadeColor,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: 0.05,
                  display: "block",
                  mb: 0.5,
                }}
              >
                API Key
              </Typography>
              <ApiKeyDropdown
                apiKeys={apiKeys}
                selectedKeyId={selectedKeyId}
                onSelectKey={setSelectedApiKeyId}
                onNavigate={() => {
                  onClose();
                }}
              />
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
                  color: halfFadeColor,
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
                  color: halfFadeColor,
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
                      thinkingDisplayMode: e.target.value as
                        | "markdown"
                        | "monospace",
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
                  color: halfFadeColor,
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
                The system prompt is sent with every request. It controls how
                the model behaves.
              </Typography>
            </Box>
          </Box>
        )}

        {/* Advanced Tab */}
        {activeTab === 3 && (
          <Box sx={{ py: 2 }}>
            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Upstream timeout: {Math.round(3600000 / 60000)} minutes
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Active requests: {0}
              </Typography>
              <Alert severity="warning" sx={{ mb: 2 }}>
                This will immediately terminate all currently streaming requests to the upstream LLM server.
              </Alert>
              <Button
                fullWidth
                variant="contained"
                color="error"
                onClick={() => setShowAbortConfirm(true)}
                disabled={aborting}
              >
                Abort All Requests
              </Button>
            </Box>
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 2, pb: 2 }}>
        <Button onClick={onClose} variant="outlined">
          Done
        </Button>
      </DialogActions>

      {/* Abort confirmation dialog */}
      <Dialog
        open={showAbortConfirm}
        onClose={handleCloseAbortConfirm}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ color: "error.main" }}>
          Abort All Requests?
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            This will terminate all currently streaming requests to the upstream LLM server.
            This action cannot be undone.
          </DialogContentText>
          {abortResult && (
            <Alert severity={abortResult.success ? "success" : "error"} sx={{ mt: 1 }}>
              {abortResult.success
                ? `Successfully aborted ${abortResult.count} request(s).`
                : "Failed to abort requests. Please try again."}
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 2 }}>
          <Button onClick={handleCloseAbortConfirm} variant="outlined">
            Cancel
          </Button>
          <Button
            onClick={() => {
              handleAbortAll();
            }}
            variant="contained"
            color="error"
            disabled={aborting}
          >
            {aborting ? "Aborting..." : "Confirm Abort"}
          </Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  );
};

export default SettingsDialog;
