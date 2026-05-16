import React, { useState, useEffect, useRef } from "react";
import {
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Checkbox,
  Typography,
  Stack,
  FormControlLabel,
  ListItemText,
  Radio,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import type { User } from "../../context/AuthContext";

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
  selectedUserIds: string[];
  onUserChange: (userIds: string[]) => void;
  selectedApiKeyId: string | null;
  onApiKeyChange: (apiKeyId: string | null) => void;
  loading?: boolean;
}

const UserFilter: React.FC<UserFilterProps> = ({
  currentUser,
  selectedUserIds,
  onUserChange,
  selectedApiKeyId,
  onApiKeyChange,
  loading = false,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [users, setUsers] = useState<UserOption[]>([]);
  const [apiKeys, setApiKeys] = useState<ApiKeyOption[]>([]);
  const [fetchingUsers, setFetchingUsers] = useState(false);
  const [showRevoked, setShowRevoked] = useState(false);
  const prevSelectedRef = useRef<string[]>(selectedUserIds);
  const [tempSelectedUserIds, setTempSelectedUserIds] = useState<
    string[] | undefined
  >(undefined);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setFetchingUsers(true);
        const response = await fetch("/api/metrics/users", {
          credentials: "include",
        });
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

  const selectedUserId =
    selectedUserIds.length === 1 ? selectedUserIds[0] : null;

  useEffect(() => {
    if (
      selectedUserId &&
      selectedUserId !== "all" &&
      currentUser?.id === selectedUserId
    ) {
      const fetchApiKeys = async () => {
        try {
          const response = await fetch(
            `/api/metrics/users/${selectedUserId}/api-keys`,
            { credentials: "include" },
          );
          if (response.ok) {
            const data = await response.json();
            setApiKeys(data);
          } else if (response.status === 403) {
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
  }, [selectedUserId, currentUser?.id]);

  const handleUserChange = (event: any) => {
    const newValues: string[] = event.target.value;
    const prevValues = prevSelectedRef.current;

    const prevIncludesAll = prevValues.includes("all");
    const newIncludesAll = newValues.includes("all");

    let userIds: string[] = newValues;

    if (newIncludesAll) {
      if (!prevIncludesAll) {
        userIds = ["all", ...users.map((u) => u.id)];
      }
    } else {
      if (prevIncludesAll) {
        userIds = [];
      }
    }

    if (
      !users.every((u) => userIds.includes(u.id)) &&
      userIds.includes("all")
    ) {
      userIds = userIds.filter((u) => u !== "all");
    }

    prevSelectedRef.current = userIds;
    if (userIds.length !== 1) {
      onApiKeyChange(null);
    }
    setTempSelectedUserIds(userIds);
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

  const currentUserInUsers = users.some((u) => u.id === currentUserOption?.id);

  const tempOrActualSelectedUsers = tempSelectedUserIds || selectedUserIds;

  const showApiKeyFilter =
    selectedUserIds.length === 1 &&
    selectedUserIds[0] !== "all" &&
    currentUser?.id === selectedUserIds[0];

  const renderSelectedValue = (value: string[]) => {
    if (value.length === 0) {
      return "All Users";
    }
    if (value.length === 1 && value[0] === "all") {
      return (
        <Chip
          label="All Users"
          size="small"
          color="primary"
          variant="outlined"
        />
      );
    }
    if (value.length === 1) {
      const user = users.find((u) => u.id === value[0]);
      if (user) {
        return (
          <Chip
            label={user.name || user.email}
            size="small"
            color="primary"
            variant="outlined"
          />
        );
      }
    }
    return (
      <Stack direction="row" spacing={0.5} flexWrap="wrap">
        {value.map((uid) => {
          if (uid === "all") return null;
          const user = users.find((u) => u.id === uid);
          return user ? (
            <Chip
              key={uid}
              label={user.name || user.email}
              size="small"
              color="primary"
              variant="outlined"
            />
          ) : null;
        })}
      </Stack>
    );
  };

  return (
    <Grid container spacing={2} alignItems="center">
      <Grid size={{ xs: 12, sm: 6 }}>
        <FormControl size="small" sx={{ minWidth: 250, width: "100%" }}>
          <InputLabel>User</InputLabel>
          <Select
            value={tempOrActualSelectedUsers}
            label="User"
            onChange={handleUserChange}
            multiple
            disabled={loading || fetchingUsers}
            renderValue={renderSelectedValue}
            MenuProps={{
              PaperProps: {
                sx: { maxHeight: 400 },
              },
            }}
            onOpen={() => {
              setTempSelectedUserIds([...selectedUserIds]);
            }}
            onClose={() => {
              if (tempSelectedUserIds) {
                onUserChange(tempSelectedUserIds);
                setTempSelectedUserIds(undefined);
              }
            }}
          >
            <MenuItem value="all">
              <Checkbox
                checked={tempOrActualSelectedUsers.includes("all")}
                size="small"
              />
              <ListItemText primary="Select All" />
            </MenuItem>
            {currentUserOption && !currentUserInUsers && (
              <MenuItem value={currentUserOption.id}>
                <Checkbox
                  checked={tempOrActualSelectedUsers.includes(
                    currentUserOption.id,
                  )}
                  size="small"
                />
                <ListItemText
                  primary={currentUserOption.name || currentUserOption.email}
                />
              </MenuItem>
            )}
            {users.map((user) => (
              <MenuItem key={user.id} value={user.id}>
                <Checkbox
                  checked={tempOrActualSelectedUsers.includes(user.id)}
                  size="small"
                />
                <ListItemText primary={user.name || user.email} />
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>

      {showApiKeyFilter && currentUser?.id === selectedUserIds[0] && (
        <Grid size={{ xs: 12, sm: 6 }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <FormControl size="small" sx={{ flex: 1, minWidth: 120 }}>
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
                      <Typography
                        component="span"
                        sx={{ color: "text.secondary", fontSize: "12px" }}
                      >
                        ({key.id.substring(0, 8)}...)
                      </Typography>
                    </Stack>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControlLabel
              control={
                <Checkbox
                  checked={showRevoked}
                  onChange={(e) => setShowRevoked(e.target.checked)}
                  size="small"
                />
              }
              label="Show Revoked"
              sx={{ mr: 0.5, whiteSpace: "nowrap" }}
              slotProps={{
                typography: { variant: "body2", sx: { fontSize: "0.75rem" } },
              }}
            />
          </Stack>
        </Grid>
      )}
    </Grid>
  );
};

export default UserFilter;
