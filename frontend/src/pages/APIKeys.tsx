import { useState, useEffect, FormEvent } from "react";
import { Key, ContentCopy, Delete, Add } from "@mui/icons-material";
import { useAuth } from "../context/AuthContext";
import MainLayout from "../components/MainLayout";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  Paper,
  CircularProgress,
  Stack,
  Chip,
  Checkbox,
  FormControlLabel,
} from "@mui/material";

interface ApiKey {
  id: string;
  name: string;
  description: string | null;
  api_key: string | null;
  created_at: string;
  user_id: string | null;
  is_active: number;
  revoked_at: string | null;
}

function APIKeys() {
  const { user } = useAuth();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [newKeyName, setNewKeyName] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showCreatedKeyDialog, setShowCreatedKeyDialog] = useState(false);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRevoked, setShowRevoked] = useState(false);

  useEffect(() => {
    if (user?.id) {
      fetchApiKeys();
    }
  }, [user]); // Removed showRevoked from dependency array to prevent re-fetching

  const fetchApiKeys = async () => {
    if (!user?.id) return;

    try {
      const response = await fetch(
        `/api/api-keys?user_id=${user.id}&show_revoked=true`,
      );
      if (response.ok) {
        const data = await response.json();
        setApiKeys(data.filter((key: ApiKey) => key.user_id === user.id));
      } else if (response.status === 403) {
        setApiKeys([]);
      }
    } catch (error) {
      console.error("Failed to fetch API keys:", error);
      setApiKeys([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateKey = async (e: FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim() || !user?.id) return;

    try {
      const response = await fetch("/api/api-keys", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: newKeyName, user_id: user.id }),
      });

      if (response.ok) {
        const data = await response.json();
        setApiKeys([{ ...data, api_key: data.api_key }, ...apiKeys]);
        setNewKeyName("");
        setShowForm(false);
        setCreatedKey(data.api_key);
        setShowCreatedKeyDialog(true);
      }
    } catch (error) {
      console.error("Failed to create API key:", error);
    }
  };

  const handleRevokeKey = async (keyId: string) => {
    if (!confirm("Are you sure you want to revoke this API key?")) return;

    try {
      const response = await fetch(
        `/api/api-keys/${keyId}?user_id=${user?.id}`,
        {
          method: "DELETE",
        },
      );

      if (response.ok) {
        setApiKeys(
          apiKeys.map((key) =>
            key.id === keyId ? { ...key, is_active: 1 } : key,
          ),
        );
      }
    } catch (error) {
      console.error("Failed to revoke API key:", error);
    }
  };

  const copyToClipboard = async (key: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(key);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = key;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleCloseCreatedKey = () => {
    setShowCreatedKeyDialog(false);
  };

  // Filter keys locally based on showRevoked state
  const displayedKeys = showRevoked
    ? apiKeys
    : apiKeys.filter((key) => key.is_active === 1);

  return (
    <MainLayout>
      <Box sx={{ bgcolor: "#f5f5f5", flexGrow: 1 }}>
        <Box sx={{ maxWidth: 1200, mx: "auto", px: { xs: 2, sm: 3 } }}>
          <Box sx={{ mt: 4, mb: 3 }}>
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              spacing={2}
            >
              <Box>
                <Typography variant="h5" component="h2">
                  API Keys
                </Typography>
              </Box>
              <Stack direction="row" spacing={2} alignItems="center">
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={showRevoked}
                      onChange={(e) => setShowRevoked(e.target.checked)}
                      size="small"
                      sx={{ ml: 1 }}
                    />
                  }
                  label="Show Revoked"
                />
                <Typography
                  variant="body2"
                  sx={{ color: "text.secondary" }}
                ></Typography>
                <Button
                  onClick={() => setShowForm(true)}
                  variant="contained"
                  startIcon={<Add />}
                  sx={{
                    bgcolor: "#1976d2",
                    "&:hover": { bgcolor: "#1565c0" },
                    textTransform: "none",
                    fontWeight: 500,
                  }}
                >
                  Create Key
                </Button>
              </Stack>
            </Stack>
          </Box>

          <Dialog
            open={showForm}
            onClose={() => setShowForm(false)}
            maxWidth="sm"
            fullWidth
          >
            <form onSubmit={handleCreateKey}>
              <DialogTitle>Create New API Key</DialogTitle>
              <DialogContent>
                <TextField
                  autoFocus
                  margin="dense"
                  id="keyName"
                  label="Key Name"
                  type="text"
                  fullWidth
                  variant="outlined"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="e.g., Production Key"
                  required
                />
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setShowForm(false)} color="primary">
                  Cancel
                </Button>
                <Button type="submit" color="primary" variant="contained">
                  Create API Key
                </Button>
              </DialogActions>
            </form>
          </Dialog>

          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
              <CircularProgress />
            </Box>
          ) : displayedKeys.length === 0 ? (
            <Paper sx={{ p: 6, textAlign: "center", bgcolor: "white" }}>
              <Key sx={{ fontSize: 48, color: "text.disabled", mb: 2 }} />
              <Typography
                variant="h6"
                component="h3"
                sx={{ fontWeight: 500, mb: 1 }}
              >
                No API keys
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Get started by creating a new API key.
              </Typography>
            </Paper>
          ) : (
            <Paper
              sx={{ borderRadius: 2, overflow: "hidden", bgcolor: "white" }}
            >
              {displayedKeys.map((key, index) => (
                <Box
                  key={key.id}
                  sx={{
                    p: 3,
                    borderBottom:
                      index < displayedKeys.length - 1
                        ? "1px solid #e0e0e0"
                        : "none",
                    "&:hover": { bgcolor: "#f5f5f5" },
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      flexWrap: "wrap",
                      gap: 2,
                    }}
                  >
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Stack
                        direction="row"
                        spacing={1}
                        alignItems="center"
                        sx={{ mb: 1 }}
                      >
                        <Typography
                          variant="body1"
                          sx={{
                            fontWeight: 500,
                            color: "#1976d2",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {key.name}
                        </Typography>
                        {!key.is_active && (
                          <Chip
                            label="Revoked"
                            size="small"
                            sx={{
                              fontSize: "11px",
                              bgcolor: "#ffebee",
                              color: "#c62828",
                              height: 20,
                            }}
                          />
                        )}
                      </Stack>
                      <Stack
                        direction="row"
                        spacing={1.5}
                        alignItems="center"
                        sx={{ mb: 1 }}
                      >
                        <Paper
                          variant="outlined"
                          sx={{
                            p: 0.75,
                            bgcolor: "#f5f5f5",
                            borderRadius: 1,
                            fontFamily: "monospace",
                            fontSize: "12px",
                            color: "#424242",
                          }}
                        >
                          {key.api_key
                            ? `${key.api_key.substring(0, 16)}...${key.api_key.slice(-8)}`
                            : "••••••••••••••••"}
                        </Paper>
                        <Chip
                          label={`Created: ${new Date(key.created_at).toLocaleDateString()}`}
                          size="small"
                          sx={{ fontSize: "12px" }}
                        />
                      </Stack>
                      <Chip
                        label={`ID: ${key.id}`}
                        size="small"
                        variant="outlined"
                        sx={{ fontSize: "11px", height: 20 }}
                      />
                    </Box>
                    <Stack direction="row" spacing={1}>
                      <Button
                        onClick={() =>
                          key.api_key && copyToClipboard(key.api_key)
                        }
                        disabled={!key.api_key}
                        variant="outlined"
                        size="small"
                        startIcon={copied ? <Key /> : <ContentCopy />}
                        sx={{
                          textTransform: "none",
                          minWidth: 70,
                          opacity: key.api_key ? 1 : 0.5,
                        }}
                      >
                        {copied ? "Copied!" : "Copy"}
                      </Button>
                      {key.is_active ? (
                        <Button
                          onClick={() => handleRevokeKey(key.id)}
                          variant="outlined"
                          size="small"
                          startIcon={<Delete />}
                          sx={{
                            color: "#d32f2f",
                            borderColor: "#d32f2f",
                            textTransform: "none",
                            "&:hover": {
                              borderColor: "#c62828",
                              bgcolor: "rgba(211, 47, 47, 0.04)",
                            },
                          }}
                        >
                          Revoke
                        </Button>
                      ) : (
                        <Chip
                          label="Revoked"
                          size="small"
                          sx={{
                            fontSize: "11px",
                            bgcolor: "#ffebee",
                            color: "#c62828",
                            height: 28,
                          }}
                        />
                      )}
                    </Stack>
                  </Box>
                </Box>
              ))}
            </Paper>
          )}

          <Dialog
            open={showCreatedKeyDialog}
            onClose={handleCloseCreatedKey}
            maxWidth="sm"
            fullWidth
          >
            <DialogTitle sx={{ fontWeight: 600 }}>Your API Key</DialogTitle>
            <DialogContent>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Copy this key now. You won't be able to see it again.
              </Typography>
              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  bgcolor: "#f5f5f5",
                  borderRadius: 1,
                  fontFamily: "monospace",
                  fontSize: "12px",
                  wordBreak: "break-all",
                  mb: 2,
                }}
              >
                {createdKey}
              </Paper>
            </DialogContent>
            <DialogActions>
              <Button
                onClick={handleCloseCreatedKey}
                sx={{ textTransform: "none" }}
              >
                Dismiss
              </Button>
              <Button
                onClick={() => {
                  if (createdKey) {
                    copyToClipboard(createdKey);
                    handleCloseCreatedKey();
                  }
                }}
                variant="contained"
                startIcon={copied ? <Key /> : null}
                sx={{
                  bgcolor: "#1976d2",
                  "&:hover": { bgcolor: "#1565c0" },
                  textTransform: "none",
                }}
              >
                {copied ? "Copied!" : "Copy Key"}
              </Button>
            </DialogActions>
          </Dialog>
        </Box>
      </Box>
    </MainLayout>
  );
}

export default APIKeys;
