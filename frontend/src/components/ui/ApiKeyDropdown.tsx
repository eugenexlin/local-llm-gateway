import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FormControl,
  Select,
  MenuItem,
  Typography,
  Box,
  Divider,
  Menu,
} from "@mui/material";
import KeyIcon from "@mui/icons-material/Key";
import type { ApiKey } from "../../models/ApiKey";
import { halfFadeColor } from "../../utils/styles";

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
  sx,
  onNavigate,
}) => {
  const navigate = useNavigate();
  const [manageAnchor, setManageAnchor] = useState<null | HTMLElement>(null);

  const activeKeys = apiKeys.filter((k) => k.is_active);
  const selectedKey = apiKeys.find((k) => k.id === selectedKeyId);

  const renderValue = () => (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
      <KeyIcon
        sx={{
          fontSize: 18,
          color: selectedKey ? "#8b5cf6" : halfFadeColor,
          flexShrink: 0,
        }}
      />
      <Typography
        variant="body2"
        sx={{
          fontSize: "0.8125rem",
          color: selectedKey
            ? "color-mix(in oklab, var(--mui-palette-primary-main) 50%, var(--mui-palette-text-primary))"
            : halfFadeColor,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {selectedKey ? selectedKey.name : "No key selected"}
      </Typography>
    </Box>
  );

  return (
    <>
      <FormControl
        size="small"
        sx={{
          minWidth: 200,
          ...sx,
        }}
      >
        <Select
          value={selectedKeyId || ""}
          onChange={(e) => {
            if (e.target.value) {
              onSelectKey(e.target.value);
            }
          }}
          displayEmpty 
          disabled={activeKeys.length === 0}
          renderValue={renderValue}
          MenuProps={{
            PaperProps: {
              sx: {
                minWidth: 240,
                maxHeight: 320,
                border: "none",
                "& .MuiMenuItem-root": {
                  borderRadius: 0,
                },
              },
            },
          }}
          sx={{
            "& .MuiSelect-select": {
              display: "flex",
              alignItems: "center",
              gap: 1,
              py: 0.5,
              px: 1.5,
              minHeight: 32,
            },
          }}
        >
          {activeKeys.length === 0 ? (
            <MenuItem disabled sx={{ justifyContent: "center" }}>
              <Typography variant="body2" sx={{ color: halfFadeColor }}>
                No API keys found.
              </Typography>
            </MenuItem>
          ) : (
            activeKeys.map((key) => (
              <MenuItem
                key={key.id}
                value={key.id}
                sx={{
                  py: 1.25,
                  bgcolor:
                    selectedKeyId === key.id
                      ? "rgba(139, 92, 246, 0.06)"
                      : "transparent",
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
                        selectedKeyId === key.id ? "primary.main" : halfFadeColor,
                      flexShrink: 0,
                    }}
                  />
                  <Box sx={{ minWidth: 0 }}>
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 500,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {key.name}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{ color: halfFadeColor, fontFamily: "monospace" }}
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
          <Divider sx={{ my: 0.5 }} />
          <MenuItem
            onClick={(e) => {
              e.stopPropagation();
              setManageAnchor(e.currentTarget);
            }}
            sx={{
              color: "primary.main",
              fontSize: "0.8125rem",
              justifyContent: "center",
            }}
          >
            Manage API Keys
          </MenuItem>
        </Select>
      </FormControl>

      <Menu
        anchorEl={manageAnchor}
        open={Boolean(manageAnchor)}
        onClose={() => setManageAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        transformOrigin={{ vertical: "top", horizontal: "center" }}
        sx={{
          "& .MuiPaper-root": {
            minWidth: 200,
            boxShadow: "var(--mui-shadow-8)",
          },
        }}
      >
        <MenuItem
          onClick={() => {
            setManageAnchor(null);
            onNavigate?.();
            navigate("/api-keys");
          }}
          sx={{ fontSize: "0.8125rem" }}
        >
          Manage API Keys
        </MenuItem>
      </Menu>
    </>
  );
};

export default ApiKeyDropdown;
