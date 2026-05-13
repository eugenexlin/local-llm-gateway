import React, { useState, useEffect } from "react";
import {
  Box,
  Drawer,
  Divider,
  Typography,
  Avatar,
  useMediaQuery,
  useTheme,
  Tooltip,
  IconButton,
} from "@mui/material";
import DashboardIcon from "@mui/icons-material/Dashboard";
import KeyIcon from "@mui/icons-material/Key";
import MonitorHeartIcon from "@mui/icons-material/MonitorHeart";
import ChatIcon from "@mui/icons-material/Chat";
import MenuIcon from "@mui/icons-material/Menu";
import LogoutIcon from "@mui/icons-material/Logout";
import SettingsIcon from "@mui/icons-material/Settings";
import KeyboardArrowLeftIcon from "@mui/icons-material/KeyboardArrowLeft";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import ConversationList from "../chat/ConversationSidebar";
import SettingsDialog from "./SettingsDialog";
import {
  sharedFabStyle,
  sharedGlassStyle,
  sidebarItemBase,
  sidebarIconContainer,
} from "../../utils/styles";

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

  const ui = theme.custom.ui;

  const [collapsed, setCollapsed] = useState(() => {
    const stored = localStorage.getItem("drawer-collapsed");
    if (stored !== null) return stored === "true";
    return false;
  });

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

  const [settingsOpen, setSettingsOpen] = useState(false);

  const menuItems = [
    { text: "Dashboard", icon: <DashboardIcon />, path: "/dashboard" },
    { text: "Server Stats", icon: <MonitorHeartIcon />, path: "/server-stats" },
    { text: "API Keys", icon: <KeyIcon />, path: "/api-keys" },
    { text: "Chat", icon: <ChatIcon />, path: "/chat" },
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
      {/* Header - fixed top */}
      <Box
        id="drawer-header"
        sx={{
          p: 1,
          display: "flex",
          alignContent: "center",
          flexShrink: 0,
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
      {/* Middle section - scrollable */}
      <Box
        sx={{
          flex: 1,
          overflow: "auto",
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
        }}
      >
        {menuItems.map((item, i) => (
          <Box
            key={i + " " + item.text}
            onClick={(e) => {
              e.stopPropagation();
              if (isMobile || isMedium) {
                setCollapsed(true);
              }
              setTimeout(() => {
                navigate(item.path);
              }, 1);
            }}
            sx={{
              ...sidebarItemBase,
              backgroundColor:
                location.pathname === item.path ? ui.activeBg : "transparent",
              "&:hover": { backgroundColor: ui.hoverBg },
            }}
          >
            <Box
              sx={{
                ...sidebarIconContainer,
                color:
                  location.pathname === item.path ? ui.activeColor : "inherit",
              }}
            >
              {item.icon}
            </Box>
            {showLabels && (
              <Typography
                sx={{
                  whiteSpace: "nowrap",
                  fontSize: "0.875rem",
                }}
              >
                {item.text}
              </Typography>
            )}
          </Box>
        ))}
        <Divider />
        {/* Conversation list - only show when drawer is expanded */}
        {showLabels && (
          <ConversationList
            onSuggestClose={() => {
              if (isMobile || isMedium) {
                setCollapsed(true);
              }
            }}
            highlightActive={location.pathname === "/chat"}
            onConversationSelect={(_convId) => {
              setTimeout(() => {
                navigate("/chat");
              }, 1);
            }}
          />
        )}
      </Box>
      {/* Footer - fixed bottom */}
      <Box sx={{ flexShrink: 0 }}>
        <Divider />
        <Box
          onClick={(e) => {
            e.stopPropagation();
            setSettingsOpen(true);
          }}
          sx={{
            ...sidebarItemBase,
            "&:hover": { backgroundColor: ui.hoverBg },
          }}
        >
          <Box
            sx={{
              ...sidebarIconContainer,
              color: "inherit",
            }}
          >
            <SettingsIcon />
          </Box>
          {showLabels && (
            <Typography sx={{ whiteSpace: "nowrap", fontSize: "0.875rem" }}>
              Settings
            </Typography>
          )}
        </Box>
        <Divider />
        <Box
          onClick={(e) => {
            e.stopPropagation();
            handleLogout();
          }}
          sx={{
            ...sidebarItemBase,
            "&:hover": { backgroundColor: ui.hoverBg },
          }}
        >
          <Box
            sx={{
              ...sidebarIconContainer,
              color: "inherit",
            }}
          >
            <LogoutIcon />
          </Box>
          {showLabels && (
            <Typography sx={{ whiteSpace: "nowrap", fontSize: "0.875rem" }}>
              Logout
            </Typography>
          )}
        </Box>
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
      <SettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </Box>
  );

  const collapseToggleButton = (
    <Box
      sx={{
        ...sharedFabStyle,
        ...sharedGlassStyle,
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
          open={!collapsed}
          onClose={handleCollapsedToggle}
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
          {collapseToggleButton}
        </Drawer>
        <Box
          sx={{
            ...sharedFabStyle,
            ...sharedGlassStyle,
            top: 8,
            left: 8,
          }}
        >
          <Tooltip title="Navigation">
            <IconButton
              sx={{ width: 40, height: 40 }}
              onClick={handleCollapsedToggle}
            >
              <MenuIcon />
            </IconButton>
          </Tooltip>
        </Box>
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
