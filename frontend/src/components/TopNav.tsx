import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  Avatar,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import DashboardIcon from "@mui/icons-material/Dashboard";
import KeyIcon from "@mui/icons-material/Key";
import MonitorHeartIcon from "@mui/icons-material/MonitorHeart";
import LogoutIcon from "@mui/icons-material/Logout";

const TopNav: React.FC<{ onMenuClick: () => void }> = ({ onMenuClick }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const isActive = (path: string) => location.pathname === path;

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const navigateTo = (path: string) => {
    navigate(path);
    handleMenuClose();
  };

  return (
    <AppBar
      position="sticky"
      color="default"
      elevation={1}
      sx={{
        boxShadow: 1,
        bgcolor: "background.paper",
        backgroundImage: "none",
        width: "100%",
        left: 0,
        right: 0,
      }}
      id="top-navigation-appbar"
    >
      <Toolbar
        id="top-navigation-toolbar"
        sx={{ minHeight: 64, paddingLeft: "8px", paddingRight: "8px" }}
      >
        <IconButton
          color="inherit"
          edge="start"
          onClick={onMenuClick}
          sx={{ margin: 0, marginRight: "8px", display: { sm: "inline-flex" } }}
        >
          <MenuIcon />
        </IconButton>

        <Typography
          variant="h6"
          noWrap
          component="div"
          sx={{
            display: { xs: "none", sm: "block" },
            cursor: "pointer",
            "&:hover": { color: "primary.main" },
          }}
          onClick={() => navigateTo("/")}
        >
          LLM Gateway
        </Typography>

        <Typography
          variant="h6"
          noWrap
          component="div"
          sx={{
            display: { xs: "block", sm: "none" },
            cursor: "pointer",
            "&:hover": { color: "primary.main" },
          }}
          onClick={() => navigateTo("/")}
        >
          LLM Gateway
        </Typography>

        <div style={{ flexGrow: 1 }} />

        <div style={{ display: "flex", alignItems: "center", gap: 1 }}>
          <IconButton
            color={isActive("/dashboard") ? "primary" : "inherit"}
            onClick={() => navigateTo("/dashboard")}
            sx={{ display: { xs: "none", sm: "inline-flex" } }}
          >
            <DashboardIcon />
          </IconButton>
          <IconButton
            color={isActive("/api-keys") ? "primary" : "inherit"}
            onClick={() => navigateTo("/api-keys")}
            sx={{ display: { xs: "none", sm: "inline-flex" } }}
          >
            <KeyIcon />
          </IconButton>
          <IconButton
            color={isActive("/server-stats") ? "primary" : "inherit"}
            onClick={() => navigateTo("/server-stats")}
            sx={{ display: { xs: "none", sm: "inline-flex" } }}
          >
            <MonitorHeartIcon />
          </IconButton>

          <IconButton
            color="inherit"
            onClick={handleMenuOpen}
            size="small"
            sx={{ ml: 1 }}
          >
            <Avatar sx={{ width: 32, height: 32, bgcolor: "primary.main" }}>
              {user?.name?.charAt(0).toUpperCase()}
            </Avatar>
          </IconButton>

          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
            anchorOrigin={{
              vertical: "bottom",
              horizontal: "right",
            }}
            transformOrigin={{
              vertical: "top",
              horizontal: "right",
            }}
          >
            <MenuItem onClick={() => navigateTo("/api-keys")}>
              <KeyIcon fontSize="small" sx={{ mr: 1 }} />
              API Keys
            </MenuItem>
            <MenuItem onClick={handleLogout}>
              <LogoutIcon fontSize="small" sx={{ mr: 1 }} />
              Logout
            </MenuItem>
          </Menu>
        </div>
      </Toolbar>
    </AppBar>
  );
};

export default TopNav;
