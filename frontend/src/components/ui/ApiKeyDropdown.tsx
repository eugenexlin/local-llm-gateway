import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Typography, Menu, MenuItem, Divider } from "@mui/material";
import KeyIcon from "@mui/icons-material/Key";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import type { ApiKey } from "../../models/ApiKey";

interface ApiKeyDropdownProps {
  apiKeys: ApiKey[];
  selectedKeyId: string;
  onSelectKey: (id: string) => void;
  onNavigate?: () => void;
  variant?: "default" | "compact";
  sx?: Record<string, any>;
}

const ApiKeyDropdown: React.FC<ApiKeyDropdownProps> = ({
  apiKeys,
  selectedKeyId,
  onSelectKey,
  variant = "default",
  sx,
  onNavigate,
}) => {
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const activeKeys = apiKeys.filter((k) => k.is_active);
  const selectedKey = apiKeys.find((k) => k.id === selectedKeyId);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleSelectKey = (id: string) => {
    onSelectKey(id);
    handleMenuClose();
  };

  return (
    <>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          px: variant === "compact" ? 1.5 : 1.5,
          py: variant === "compact" ? 1 : 1,
          bgcolor: "#f8fafc",
          borderRadius: 1,
          cursor: activeKeys.length > 0 ? "pointer" : "default",
          "&:hover": activeKeys.length > 0 ? { bgcolor: "#ffffff" } : {},
          ...sx,
        }}
        onClick={activeKeys.length > 0 ? handleMenuOpen : undefined}
      >
        <Box
          sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}
        >
          <KeyIcon
            sx={{ fontSize: 16, color: selectedKey ? "#8b5cf6" : "#94a3b8" }}
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
          <KeyboardArrowDownIcon sx={{ fontSize: 18, color: "#94a3b8" }} />
        )}
      </Box>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
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
            handleMenuClose();
            onNavigate();
            navigate("/api-keys");
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
    </>
  );
};

export default ApiKeyDropdown;
