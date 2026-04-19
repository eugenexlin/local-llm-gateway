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
  Alert,
} from "@mui/material";

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  cacheEnabled: boolean;
  onToggleCache: (enabled: boolean) => void;
  cacheSize: number;
  onPurge: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({
  open,
  onClose,
  cacheEnabled,
  onToggleCache,
  cacheSize,
  onPurge,
}) => {
  const [purgeConfirm, setPurgeConfirm] = useState(false);

  const formatSize = (size: number): string => {
    if (size === 0) return "0 entries";
    if (size < 1000) return `${size} entries`;
    if (size < 1000000) return `${(size / 1000).toFixed(1)}k entries`;
    return `${(size / 1000000).toFixed(1)}M entries`;
  };

  const handlePurge = () => {
    onPurge();
    setPurgeConfirm(false);
  };

  const handleClose = () => {
    setPurgeConfirm(false);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle>Graph Data Settings</DialogTitle>
      <DialogContent dividers sx={{ minWidth: 320 }}>
        <Box sx={{ mb: 3 }}>
          <FormControlLabel
            control={
              <Switch
                checked={cacheEnabled}
                onChange={(e) => onToggleCache(e.target.checked)}
                size="small"
              />
            }
            label="Cache data in memory"
            sx={{ mb: 1 }}
          />
          <Typography variant="body2" color="text.secondary" sx={{ ml: 3.5 }}>
            Stores fetched data points to speed up scrolling and navigation
          </Typography>
        </Box>

        <Divider sx={{ my: 2 }} />

        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Cached entries
          </Typography>
          <Typography variant="h6" sx={{ mt: 0.5 }}>
            {formatSize(cacheSize)}
          </Typography>
        </Box>

        {cacheSize > 0 && (
          <Box>
            {purgeConfirm ? (
              <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
                <Button
                  size="small"
                  variant="contained"
                  color="error"
                  onClick={handlePurge}
                >
                  Purge
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => setPurgeConfirm(false)}
                >
                  Cancel
                </Button>
              </Box>
            ) : (
              <Button
                size="small"
                variant="outlined"
                color="error"
                onClick={() => setPurgeConfirm(true)}
              >
                Purge Cache
              </Button>
            )}
          </Box>
        )}

        <Alert
          severity="info"
          variant="outlined"
          sx={{ mt: 2, fontSize: "12px" }}
        >
          Cache persists until page refresh or manual purge. Disabling cache
          will not clear existing entries.
        </Alert>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} variant="outlined">
          Done
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SettingsModal;
