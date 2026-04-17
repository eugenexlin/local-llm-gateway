import React, { useState, useEffect } from "react";
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Checkbox,
  Typography,
  Stack,
  FormControlLabel,
} from "@mui/material";
import type { User } from "../context/AuthContext";

interface UserOption {
  id: string;
  email: string;
  name: string;
}

interface ApiKeyOption {
  id: string;
  name: string;
  is_active: number;
  revoked_at: string | null;
}

interface UserFilterProps {
  currentUser: User | null;
  selectedUserId: string | null;
  onUserChange: (userId: string | null) => void;
  selectedApiKeyId: string | null;
  onApiKeyChange: (apiKeyId: string | null) => void;
  loading?: boolean;
}

const UserFilter: React.FC<UserFilterProps> = ({
  currentUser,
  selectedUserId,
  onUserChange,
  selectedApiKeyId,
  onApiKeyChange,
  loading = false,
}) => {
  const [users, setUsers] = useState<UserOption[]>([]);
  const [apiKeys, setApiKeys] = useState<ApiKeyOption[]>([]);
  const [fetchingUsers, setFetchingUsers] = useState(false);
  const [showRevoked, setShowRevoked] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setFetchingUsers(true);
        const response = await fetch("/api/metrics/users");
        if (response.ok) {
          const data = await response.json();
          setUsers(data);
        }
      } catch (error) {
        console.error("Error fetching users:", error);
      } finally {
        setFetchingUsers(false);
      }
    };
    fetchUsers();
  }, []);

  useEffect(() => {
    // Only fetch API keys if selected user matches current user
    if (
      selectedUserId &&
      selectedUserId !== "all" &&
      currentUser?.id === selectedUserId
    ) {
      const fetchApiKeys = async () => {
        try {
          const response = await fetch(
            `/api/metrics/users/${selectedUserId}/api-keys?show_revoked=${showRevoked}`,
          );
          if (response.ok) {
            const data = await response.json();
            setApiKeys(data);
          } else if (response.status === 403) {
            // User doesn't own these API keys
            setApiKeys([]);
          }
        } catch (error) {
          console.error("Error fetching API keys:", error);
          setApiKeys([]);
        }
      };
      fetchApiKeys();
    } else {
      setApiKeys([]);
    }
  }, [selectedUserId, currentUser?.id, showRevoked]);

  const handleUserChange = (event: any) => {
    const userId = event.target.value;
    onUserChange(userId);
    if (userId === "all") {
      onApiKeyChange(null);
    }
  };

  const handleApiKeyChange = (event: any) => {
    const apiKeyId = event.target.value;
    onApiKeyChange(apiKeyId ? apiKeyId : null);
  };

  const currentUserOption = currentUser
    ? {
        id: currentUser.id,
        email: currentUser.email.toLowerCase().trim(),
        name: currentUser.name,
      }
    : null;

  const selectedUser = users.find((u) => u.id === selectedUserId);

  // Check if current user is already in the users list to avoid duplicates
  const currentUserInUsers = users.some((u) => u.id === currentUserOption?.id);

  return (
    <Box
      sx={{ display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap" }}
    >
      <FormControl size="small" sx={{ minWidth: 200 }}>
        <InputLabel>User</InputLabel>
        <Select
          value={selectedUserId || "all"}
          label="User"
          onChange={handleUserChange}
          disabled={loading || fetchingUsers}
          renderValue={(value) => {
            if (value === "all") {
              return (
                <Chip
                  label="All Users"
                  size="small"
                  color="primary"
                  variant="outlined"
                />
              );
            }
            const user = users.find((u) => u.id === value);
            const currentUserMatch = currentUserOption?.id === value;
            const currentUserByEmail = currentUserOption
              ? users.find((u) => u.email === currentUserOption.email)
              : undefined;

            // Check if selected by current user's email (in case ID mismatch)
            const userByEmailMatch =
              currentUserOption &&
              users.some(
                (u) => u.id === value && u.email === currentUserOption.email,
              );

            if (user) {
              return (
                <Chip
                  label={user.name || user.email}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
              );
            } else if (currentUserMatch && currentUserOption) {
              return (
                <Chip
                  label={currentUserOption.name || currentUserOption.email}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
              );
            } else if (userByEmailMatch) {
              const matchedUser = users.find((u) => u.id === value);
              return matchedUser ? (
                <Chip
                  label={matchedUser.name || matchedUser.email}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
              ) : null;
            } else {
              return (
                <Chip
                  label="All Users"
                  size="small"
                  color="primary"
                  variant="outlined"
                />
              );
            }
          }}
        >
          <MenuItem value="all">
            <Chip
              label="All Users"
              size="small"
              color="primary"
              variant="outlined"
            />
          </MenuItem>
          {currentUserOption && !currentUserInUsers && (
            <MenuItem value={currentUserOption.id}>
              <Chip
                label={currentUserOption.name || currentUserOption.email}
                size="small"
                variant="filled"
              />
            </MenuItem>
          )}
          {users.map((user) => (
            <MenuItem key={user.id} value={user.id}>
              <Chip
                label={user.name || user.email}
                size="small"
                variant="outlined"
              />
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {selectedUserId && selectedUserId !== "all" && (
        <Stack direction="row" spacing={1} alignItems="center">
          {apiKeys.length > 0 && (
            <FormControlLabel
              control={
                <Checkbox
                  checked={showRevoked}
                  onChange={(e) => setShowRevoked(e.target.checked)}
                  size="medium"
                  sx={{ ml: 1 }}
                />
              }
              label="Show Revoked API Keys"
            />
          )}
        </Stack>
      )}

      {selectedUserId && selectedUserId !== "all" && currentUser?.id === selectedUserId && (
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>API Key</InputLabel>
          <Select
            value={selectedApiKeyId || ""}
            label="API Key"
            onChange={handleApiKeyChange}
            disabled={loading}
            renderValue={(value) => {
              if (!value) {
                return (
                  <Chip
                    label="All Keys"
                    size="small"
                    color="secondary"
                    variant="outlined"
                  />
                );
              }
              const key = apiKeys.find((k) => k.id === value);
              return key ? (
                <Chip
                  label={`${key.name} (${key.id.substring(0, 8)}...)`}
                  size="small"
                  color="secondary"
                  variant="outlined"
                />
              ) : null;
            }}
          >
            <MenuItem value="">
              <Chip
                label="All Keys"
                size="small"
                color="secondary"
                variant="outlined"
              />
            </MenuItem>
            {apiKeys.map((key) => (
              <MenuItem key={key.id} value={key.id}>
                <Stack
                  direction="row"
                  spacing={1}
                  alignItems="center"
                  sx={{ flexWrap: "wrap" }}
                >
                  <span>{key.name}</span>
                  {!key.is_active && (
                    <Chip
                      label="Revoked"
                      size="small"
                      sx={{
                        fontSize: "10px",
                        bgcolor: "#ffebee",
                        color: "#c62828",
                        height: 18,
                        ml: 0.5,
                      }}
                    />
                  )}
                  <Typography component="span" sx={{ color: "text.secondary", fontSize: "12px" }}>
                    ({key.id.substring(0, 8)}...)
                  </Typography>
                </Stack>
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}
    </Box>
  );
};

export default UserFilter;
