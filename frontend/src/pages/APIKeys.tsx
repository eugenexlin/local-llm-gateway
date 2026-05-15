import { useState, useEffect, FormEvent, useRef } from "react";
import {
  Key,
  ContentCopy,
  Delete,
  Add,
  Edit,
  Save,
  Close,
} from "@mui/icons-material";
import { useAuth } from "../context/AuthContext";
import { useAPIKeys } from "../context/APIKeyContext";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  TextField,
  Typography,
  Box,
  Paper,
  CircularProgress,
  Stack,
  Chip,
  Checkbox,
  FormControlLabel,
  TextareaAutosize,
  useMediaQuery,
} from "@mui/material";
import { ApiKey } from "../models/ApiKey";
import theme from "../theme";

function APIKeys() {
  const { user } = useAuth();
  const {
    apiKeys,
    apiKeyLoading,
    fetchApiKeys,
    createKey,
    revokeKey,
    updateKey,
  } = useAPIKeys();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [newKeyName, setNewKeyName] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [copiedKeys, setCopiedKeys] = useState<Set<string>>(new Set());
  const [showCreatedKeyDialog, setShowCreatedKeyDialog] = useState(false);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [showRevoked, setShowRevoked] = useState(false);
  const [editingKeyId, setEditingKeyId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingDescription, setEditingDescription] = useState("");
  const [newKeyDescription, setNewKeyDescription] = useState("");
  const [saving, setSaving] = useState<string | null>(null);
  const editTextareaRef = useRef<HTMLTextAreaElement>(null);

  const CREATED_KEY_TAG = "CREATED_KEY_TAG";

  useEffect(() => {
    if (user?.id) {
      fetchApiKeys();
    }
  }, [user, fetchApiKeys]);

  const handleCreateKey = async (e: FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim() || !user?.id) return;

    const newKey = await createKey(newKeyName, newKeyDescription || undefined);
    if (newKey) {
      setNewKeyName("");
      setNewKeyDescription("");
      setShowForm(false);
      setCreatedKey(newKey.api_key);
      setShowCreatedKeyDialog(true);
    }
  };

  const handleRevokeKey = async (keyId: string, hasMetrics: boolean) => {
    const message = hasMetrics
      ? "Are you sure you want to revoke this API key? It will be disabled but retained for record-keeping."
      : "Are you sure you want to permanently delete this API key? This action cannot be undone. Key will be fully deleted if there is no usage tied to it.";

    if (!confirm(message)) return;

    await revokeKey(keyId);
  };

  const copyToClipboard = async (key: string, keyId?: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(key);
      } else {
        console.info("saving to clipboard with textarea");
        const textarea = document.createElement("textarea");
        textarea.value = key;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }

      if (keyId) {
        setCopiedKeys((prev) => {
          const next = new Set(prev);
          next.add(keyId);
          return next;
        });
        setTimeout(() => {
          setCopiedKeys((prev) => {
            const next = new Set(prev);
            next.delete(keyId);
            return next;
          });
        }, 2000);
      }
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  const handleStartEdit = (key: ApiKey) => {
    setEditingKeyId(key.id);
    setEditingName(key.name);
    setEditingDescription(key.description || "");
    setTimeout(() => {
      const nameInput = document.getElementById(`edit-name-${key.id}`);
      nameInput?.focus();
    }, 50);
  };

  const handleCancelEdit = () => {
    setEditingKeyId(null);
    setEditingName("");
    setEditingDescription("");
  };

  const handleSaveEdit = async (keyId: string) => {
    if (!editingName.trim()) return;
    setSaving(keyId);
    const result = await updateKey(
      keyId,
      editingName,
      editingDescription || undefined,
    );
    if (result) {
      handleCancelEdit();
    }
    setSaving(null);
  };

  const handleEditKeyDown = (e: React.KeyboardEvent, keyId: string) => {
    if (e.key === "Escape") {
      handleCancelEdit();
    } else if (e.key === "Enter" && e.shiftKey) {
      handleSaveEdit(keyId);
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
    <>
      <Box
        sx={{ textAlign: isMobile ? "center" : "start", paddingBottom: "16px" }}
      >
        <Typography variant="h5">API Keys</Typography>
      </Box>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
          flexWrap: "wrap",
          gap: 1,
        }}
      >
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
              sx={{ mb: 2 }}
            />
            <TextField
              margin="dense"
              id="keyDescription"
              label="Description (optional)"
              type="text"
              fullWidth
              variant="outlined"
              value={newKeyDescription}
              onChange={(e) =>
                setNewKeyDescription(e.target.value.slice(0, 512))
              }
              placeholder="e.g., Main production API key"
              inputProps={{ maxLength: 512 }}
              helperText={`${newKeyDescription.length}/512`}
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

      {apiKeyLoading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress />
        </Box>
      ) : displayedKeys.length === 0 ? (
        <Paper sx={{ p: 6, textAlign: "center", bgcolor: "background.paper" }}>
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
          sx={{
            borderRadius: 2,
            overflow: "hidden",
            bgcolor: "background.paper",
          }}
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
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: 2,
                }}
              >
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  {/* Header row with name and edit/save/cancel buttons */}
                  <Stack
                    direction="row"
                    spacing={1}
                    alignItems="center"
                    sx={{ mb: 1 }}
                  >
                    {editingKeyId === key.id ? (
                      <>
                        <TextField
                          id={`edit-name-${key.id}`}
                          value={editingName}
                          onChange={(e) =>
                            setEditingName(e.target.value.slice(0, 100))
                          }
                          onKeyDown={(e) =>
                            handleEditKeyDown(
                              e as unknown as React.KeyboardEvent,
                              key.id,
                            )
                          }
                          size="small"
                          fullWidth
                          variant="outlined"
                          autoFocus
                          inputProps={{ maxLength: 100 }}
                          sx={{ maxWidth: 400 }}
                        />
                        <Box
                          sx={{
                            flex: 1,
                          }}
                        ></Box>
                        <Stack direction="row" spacing={0.5}>
                          <IconButton
                            onClick={() => handleSaveEdit(key.id)}
                            disabled={saving === key.id || !editingName.trim()}
                            size="small"
                            sx={{ p: 0.5 }}
                            title="Save"
                          >
                            {saving === key.id ? (
                              <CircularProgress size={16} />
                            ) : (
                              <Save />
                            )}
                          </IconButton>
                          <IconButton
                            onClick={handleCancelEdit}
                            size="small"
                            sx={{ p: 0.5 }}
                            title="Cancel"
                          >
                            <Close />
                          </IconButton>
                        </Stack>
                      </>
                    ) : (
                      <>
                        <Typography
                          variant="body1"
                          sx={{
                            fontWeight: 500,
                            color: "#1976d2",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            flex: 1,
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
                        <Button
                          onClick={() => handleStartEdit(key)}
                          startIcon={<Edit />}
                          size="small"
                          sx={{
                            minWidth: 0,
                            p: 0.5,
                            color: "text.secondary",
                            "&:hover": {
                              color: "text.primary",
                              bgcolor: "transparent",
                            },
                          }}
                        >
                          Edit
                        </Button>
                      </>
                    )}
                  </Stack>

                  {/* Edit mode: description field */}
                  {editingKeyId === key.id ? (
                    <Stack direction="column" spacing={0.5} sx={{ mb: 2 }}>
                      <Typography
                        variant="caption"
                        sx={{
                          color: "text.secondary",
                          display: "block",
                          mb: 0.5,
                        }}
                      >
                        Description
                      </Typography>
                      <TextareaAutosize
                        ref={editTextareaRef}
                        minRows={1}
                        maxRows={5}
                        value={editingDescription}
                        onChange={(e) =>
                          setEditingDescription(e.target.value.slice(0, 512))
                        }
                        onKeyDown={(e) =>
                          handleEditKeyDown(
                            e as unknown as React.KeyboardEvent,
                            key.id,
                          )
                        }
                        placeholder="Enter description..."
                        style={{
                          width: "100%",
                          resize: "vertical",
                          padding: "8px",
                          border: "1px solid #ccc",
                          borderRadius: 4,
                          fontFamily: "inherit",
                          fontSize: "14px",
                        }}
                      />
                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        sx={{ mt: 0.5 }}
                      >
                        <Typography
                          variant="caption"
                          sx={{ color: "text.secondary" }}
                        >
                          Shift+Enter to save · Esc to cancel
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{ color: "text.secondary" }}
                        >
                          {editingDescription.length}/512
                        </Typography>
                      </Stack>
                    </Stack>
                  ) : (
                    <Typography
                      variant="body2"
                      sx={{
                        color: key.description
                          ? "text.primary"
                          : "text.secondary",
                        fontStyle: key.description ? "normal" : "italic",
                        mb: 1,
                      }}
                    >
                      {key.description || "No description"}
                    </Typography>
                  )}

                  {/* Key info row */}
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

                {/* Action buttons */}
                <Stack direction="row" spacing={1}>
                  <Button
                    onClick={() =>
                      key.api_key && copyToClipboard(key.api_key, key.id)
                    }
                    disabled={!key.api_key}
                    variant="outlined"
                    size="small"
                    startIcon={
                      copiedKeys.has(key.id) ? <Key /> : <ContentCopy />
                    }
                    sx={{
                      textTransform: "none",
                      minWidth: 70,
                      opacity: key.api_key ? 1 : 0.5,
                    }}
                  >
                    {copiedKeys.has(key.id) ? "Copied!" : "Copy"}
                  </Button>
                  {key.is_active ? (
                    <Button
                      onClick={() => handleRevokeKey(key.id, key.has_metrics)}
                      variant="outlined"
                      size="small"
                      startIcon={<Delete />}
                      sx={{
                        color: key.has_metrics ? "#d32f2f" : "#d32f2f",
                        borderColor: key.has_metrics ? "#d32f2f" : "#d32f2f",
                        textTransform: "none",
                        "&:hover": {
                          borderColor: "#c62828",
                          bgcolor: "rgba(211, 47, 47, 0.04)",
                        },
                      }}
                    >
                      {key.has_metrics ? "Revoke Key" : "Delete Key"}
                    </Button>
                  ) : (
                    <Button
                      onClick={() => handleRevokeKey(key.id, key.has_metrics)}
                      variant="outlined"
                      size="small"
                      startIcon={<Delete />}
                      disabled={key.has_metrics}
                      sx={{
                        color: "#d32f2f",
                        borderColor: "#d32f2f",
                        textTransform: "none",
                        "&:hover": {
                          borderColor: "#c62828",
                          bgcolor: "rgba(211, 47, 47, 0.04)",
                        },
                        "&.Mui-disabled": {
                          opacity: 0.5,
                          color: "#9e9e9e",
                          borderColor: "#9e9e9e",
                        },
                      }}
                      title={
                        key.has_metrics
                          ? "Cannot delete: This API key has usage metrics"
                          : ""
                      }
                    >
                      Delete Key
                    </Button>
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
              if (copiedKeys.has(CREATED_KEY_TAG)) {
                return;
              }
              if (createdKey) {
                copyToClipboard(createdKey, CREATED_KEY_TAG).then(() => {
                  setTimeout(() => handleCloseCreatedKey(), 300);
                });
              }
            }}
            variant="contained"
            startIcon={copiedKeys.has(CREATED_KEY_TAG) ? <Key /> : null}
            sx={{
              bgcolor: "#1976d2",
              "&:hover": { bgcolor: "#1565c0" },
              textTransform: "none",
            }}
          >
            {copiedKeys.has(CREATED_KEY_TAG) ? "Copied!" : "Copy Key"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default APIKeys;
