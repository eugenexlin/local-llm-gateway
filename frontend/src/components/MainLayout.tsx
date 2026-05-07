import React, { useState, useEffect, useRef } from "react";
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Typography,
  Toolbar,
  Fab,
  Avatar,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import DashboardIcon from "@mui/icons-material/Dashboard";
import KeyIcon from "@mui/icons-material/Key";
import MonitorHeartIcon from "@mui/icons-material/MonitorHeart";
import ChatIcon from "@mui/icons-material/Chat";
import MenuIcon from "@mui/icons-material/Menu";
import LogoutIcon from "@mui/icons-material/Logout";
import { useNavigate, useLocation } from "react-router-dom";
import ChatFAB from "./chat/ChatFAB";
import ChatDrawer from "./chat/ChatDrawer";
import { useAuth } from "../context/AuthContext";
import { sharedFabStyle } from "../utils/styles";

const drawerWidth = 240;

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const menuItems = [
    { text: "Chat", icon: <ChatIcon />, path: "/chat" },
    { text: "Dashboard", icon: <DashboardIcon />, path: "/dashboard" },
    { text: "Server Stats", icon: <MonitorHeartIcon />, path: "/server-stats" },
    { text: "API Keys", icon: <KeyIcon />, path: "/api-keys" },
  ];

  const drawer = (
    <Box
      sx={{
        width: drawerWidth,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        height: "100%",
      }}
    >
      <Toolbar
        id="drawer-header"
        sx={{
          minHeight: 64,
          cursor: "pointer",
          paddingLeft: "8px",
          paddingRight: "8px",
        }}
        disableGutters={true}
        onClick={() => {
          navigate("/");
          setMobileOpen(false);
        }}
      >
        <Box sx={{ flexShrink: 0, pr: "8px" }}>
          <img
            src="/favicon.svg"
            alt="LLM Gateway"
            style={{ width: 40, height: 40 }}
          />
        </Box>
        <Typography
          variant="h6"
          noWrap
          sx={{ whiteSpace: "nowrap", flexShrink: 0, lineHeight: 1 }}
        >
          LLM Gateway
        </Typography>
      </Toolbar>
      <Divider />
      <Box sx={{ flex: 1 }}>
        <List>
          {menuItems.map((item) => (
            <ListItem
              key={item.text}
              onClick={() => {
                navigate(item.path);
                setMobileOpen(false);
              }}
              sx={{
                backgroundColor:
                  location.pathname === item.path
                    ? "rgba(33, 150, 243, 0.08)"
                    : "transparent",
                "&:hover": { backgroundColor: "rgba(33, 150, 243, 0.04)" },
              }}
            >
              <ListItemIcon
                sx={{
                  color:
                    location.pathname === item.path
                      ? "primary.main"
                      : "inherit",
                }}
              >
                {item.icon}
              </ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItem>
          ))}
        </List>
      </Box>
      <Box sx={{ mt: "auto" }}>
        <Divider />
        <ListItem
          onClick={handleLogout}
          sx={{
            cursor: "pointer",
            "&:hover": { backgroundColor: "rgba(33, 150, 243, 0.04)" },
          }}
        >
          <ListItemIcon sx={{ color: "inherit" }}>
            <LogoutIcon />
          </ListItemIcon>
          <ListItemText primary="Logout" />
        </ListItem>
        <Divider />
        <Box
          sx={{
            px: 2,
            py: 1.5,
            display: "flex",
            alignItems: "center",
            gap: 1.5,
          }}
        >
          <Avatar sx={{ width: 32, height: 32, bgcolor: "primary.main" }}>
            {user?.name?.charAt(0).toUpperCase()}
          </Avatar>
          <Box>
            <Typography
              variant="body2"
              sx={{
                fontWeight: 500,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {user?.name}
            </Typography>
            {user?.email && (
              <Typography
                variant="caption"
                sx={{
                  color: "text.secondary",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  display: "block",
                }}
              >
                {user.email}
              </Typography>
            )}
          </Box>
        </Box>
      </Box>
    </Box>
  );

  const handleChatOpen = () => {
    navigate(location.pathname, {
      state: { ...location.state, chatOpen: true },
      replace: false,
    });
  };
  const handleChatClose = () => {
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate(location.pathname, {
        state: { ...location.state, chatOpen: false },
        replace: true,
      });
    }
  };

  return (
    <>
      {isMobile && (
        <Fab
          size="small"
          onClick={handleDrawerToggle}
          sx={{
            ...sharedFabStyle,
            top: 12,
            left: 12,
          }}
          aria-label="menu"
        >
          <MenuIcon />
        </Fab>
      )}
      <ChatFAB
        open={location.state?.chatOpen}
        onClose={() => handleChatClose()}
        onOpen={() => handleChatOpen()}
      />
      <ChatDrawer
        open={location.state?.chatOpen}
        onClose={() => handleChatClose()}
      />
      <Box sx={{ display: "flex", flex: 1 }} id="dashboard-content-wrapper">
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: "none", sm: "block" },
            flexShrink: 0,
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: drawerWidth,
              borderRight: "1px solid #e0e0e0",
              height: "100%",
            },
          }}
          open
          id="permanent-drawer"
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: "block", sm: "none" },
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: drawerWidth,
            },
          }}
          id="temporary-drawer"
        >
          {drawer}
        </Drawer>
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: { xs: 1, sm: 2, md: 3 },
            ml: { sm: `${drawerWidth}px` },
            pt: { xs: 4, sm: 2 },
          }}
          id="main-content"
        >
          <Box
            sx={{ maxWidth: 1200, mx: "auto" }}
            id="content-centered-wrapper"
          >
            {children}
          </Box>
        </Box>
      </Box>
    </>
  );
};

export default MainLayout;
