import React, { useState, useEffect } from "react";
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Typography,
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
import KeyboardArrowLeftIcon from "@mui/icons-material/KeyboardArrowLeft";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { sharedFabStyle, sharedGlassStyle } from "../../utils/styles";

const drawerWidth = 300;
const collapsedWidth = 56; // 40 + 8 + 8

interface DrawerNavigationProps {
  onMarginChange: (margin: string) => void;
}

const DrawerNavigation: React.FC<DrawerNavigationProps> = ({
  onMarginChange,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isMedium = useMediaQuery(theme.breakpoints.between("sm", "md"));
  const { user, logout } = useAuth();

  const [collapsed, setCollapsed] = useState(() => {
    const stored = localStorage.getItem("drawer-collapsed");
    if (stored !== null) return stored === "true";
    return false;
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (isMedium) {
      setCollapsed(true);
    }
  }, [isMedium]);

  useEffect(() => {
    let margin = "0px";
    if (isMobile) {
      // no margin
    } else if (isMedium) {
      margin = `${collapsedWidth}px`;
    } else {
      margin = collapsed ? `${collapsedWidth}px` : `${drawerWidth}px`;
    }
    onMarginChange(margin);
  }, [collapsed, isMobile, isMedium, onMarginChange]);

  useEffect(() => {
    localStorage.setItem("drawer-collapsed", String(collapsed));
  }, [collapsed]);

  const handleMobileToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleCollapsedToggle = () => {
    setCollapsed(!collapsed);
  };

  const handleOpenIfCollapsed = () => {
    if (collapsed) {
      setCollapsed(false);
    }
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

  const showLabels = !collapsed || isMobile;

  const drawerContent = (
    <Box
      sx={{
        width: "100%",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        height: "100%",
      }}
    >
      <Box
        id="drawer-header"
        sx={{
          p: 1,
          display: "flex",
          alignContent: "center",
        }}
      >
        <Box sx={{ pr: "8px" }}>
          <img
            src="/favicon.svg"
            alt="LLM Gateway"
            style={{ width: "40px", height: "40px", display: "block" }}
          />
        </Box>
        {showLabels && (
          <Typography
            variant="h6"
            noWrap
            sx={{ whiteSpace: "nowrap", height: "40px", lineHeight: "40px" }}
          >
            LLM Gateway
          </Typography>
        )}
      </Box>
      <Divider />
      <Box sx={{ flex: 1 }}>
        <List disablePadding>
          {menuItems.map((item) => (
            <ListItem
              key={item.text}
              onClick={(e) => {
                e.stopPropagation();
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
              alignItems="center"
            >
              <ListItemIcon
                sx={{
                  height: "27px",
                  color:
                    location.pathname === item.path
                      ? "primary.main"
                      : "inherit",
                }}
              >
                {item.icon}
              </ListItemIcon>
              {showLabels && (
                <ListItemText
                  sx={{
                    whiteSpace: "nowrap",
                    height: "24px",
                    lineHeight: "24px",
                  }}
                  primary={item.text}
                />
              )}
            </ListItem>
          ))}
        </List>
      </Box>
      <Box sx={{ mt: "auto" }}>
        <Divider />
        <ListItem
          onClick={(e) => {
            e.stopPropagation();
            handleLogout();
          }}
          sx={{
            cursor: "pointer",
            "&:hover": { backgroundColor: "rgba(33, 150, 243, 0.04)" },
          }}
        >
          <ListItemIcon sx={{ color: "inherit", minWidth: 36 }}>
            <LogoutIcon />
          </ListItemIcon>
          {showLabels && <ListItemText primary="Logout" />}
        </ListItem>
        <Divider />
        <Box
          sx={{
            p: 1,
            display: "flex",
            alignItems: "center",
            gap: 1,
          }}
        >
          <Avatar sx={{ width: 40, height: 40, bgcolor: "primary.main" }}>
            {user?.name?.charAt(0).toUpperCase()}
          </Avatar>
          {showLabels && (
            <Box>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 500,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  height: "20px",
                  lineHeight: "20px",
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
                    height: "20px",
                    lineHeight: "20px",
                  }}
                >
                  {user.email}
                </Typography>
              )}
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );

  const collapseToggleButton = (
    <Box
      sx={{
        ...sharedFabStyle,
        background: "transparent",
        position: "absolute",
        top: 8,
        right: 8,
        width: 36,
        height: 36,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        borderRadius: "50%",
        zIndex: 1,
        pointerEvents: collapsed ? "none" : undefined,
        opacity: collapsed ? 0 : 1,
        transition: "opacity 0.2s ease",
        "&:hover": { bgcolor: "action.hover" },
      }}
      onClick={() => {
        handleCollapsedToggle();
      }}
    >
      <KeyboardArrowLeftIcon fontSize="small" />
    </Box>
  );

  let result = <></>;

  if (isMobile) {
    result = (
      <>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleMobileToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            width: drawerWidth,
            transition: "width 0.3s ease",
            display: { xs: "block", sm: "none" },
          }}
          slotProps={{
            paper: {
              sx: {
                width: "100%",
                position: "absolute",
              },
            },
          }}
          id="temporary-drawer"
        >
          {drawerContent}
        </Drawer>
        <Fab
          size="small"
          onClick={handleMobileToggle}
          sx={{
            ...sharedFabStyle,
            ...sharedGlassStyle,
            top: 8,
            left: 8,
          }}
          aria-label="menu"
        >
          <MenuIcon />
        </Fab>
      </>
    );
  } else if (isMedium) {
    result = (
      <>
        <Drawer
          variant="temporary"
          open={!collapsed}
          onClose={() => {
            handleCollapsedToggle();
          }}
          ModalProps={{ keepMounted: true }}
          sx={{
            width: drawerWidth,
          }}
          slotProps={{
            paper: {
              sx: {
                width: "100%",
                position: "absolute",
              },
            },
          }}
        >
          {drawerContent}
          {collapseToggleButton}
        </Drawer>
        <Drawer
          variant={"persistent"}
          open={true}
          ModalProps={{ keepMounted: true }}
          onClick={handleOpenIfCollapsed}
          sx={{
            position: "relative",
            width: collapsedWidth,
          }}
          slotProps={{
            paper: {
              sx: {
                width: "100%",
                position: "absolute",
              },
            },
          }}
        >
          {drawerContent}
        </Drawer>
      </>
    );
  } else {
    result = (
      <Drawer
        variant="permanent"
        sx={{
          flexShrink: 0,
          position: "relative",
          width: collapsed ? collapsedWidth : drawerWidth,
          transition: "width 0.2s ease",
          "& .MuiDrawer-paper": {
            width: "100%",
            boxSizing: "border-box",
            borderRight: collapsed ? "none" : "1px solid #e0e0e0",
            height: "100%",
            overflowX: "hidden",
          },
          "@media (max-width:599px)": {
            display: "none",
          },
        }}
        slotProps={{
          paper: {
            sx: {
              width: "100%",
              position: "absolute",
            },
          },
        }}
        onClick={handleOpenIfCollapsed}
        open
        id="permanent-drawer"
      >
        {drawerContent}
        {collapseToggleButton}
      </Drawer>
    );
  }

  return (
    <>
      <Box sx={{ display: "flex", flex: 1 }} id="dashboard-content-wrapper">
        {result}
      </Box>
    </>
  );
};

export default DrawerNavigation;
