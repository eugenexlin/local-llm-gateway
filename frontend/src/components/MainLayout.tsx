import React, { useState } from "react";
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
} from "@mui/material";
import DashboardIcon from "@mui/icons-material/Dashboard";
import KeyIcon from "@mui/icons-material/Key";
import MonitorHeartIcon from "@mui/icons-material/MonitorHeart";
import { useNavigate, useLocation } from "react-router-dom";
import TopNav from "./TopNav";

const drawerWidth = 240;

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const menuItems = [
    { text: "Dashboard", icon: <DashboardIcon />, path: "/dashboard" },
    { text: "API Keys", icon: <KeyIcon />, path: "/api-keys" },
    { text: "Server Stats", icon: <MonitorHeartIcon />, path: "/server-stats" },
  ];

  const drawer = (
    <Box sx={{ width: drawerWidth, overflow: "hidden" }}>
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
        <Box sx={{ flexShrink: 0, color: "primary.main", pr: "8px" }}>
          <svg
            width="40"
            height="40"
            viewBox="0 0 32 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <polygon
              points="16,3 27.25,9.5 27.25,22.5 16,29 4.75,22.5 4.75,9.5"
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
            />
            <polygon
              points="16,8 22.93,12 22.93,20 16,24 9.07,20 9.07,12"
              stroke="currentColor"
              strokeWidth="1.5"
              fill="none"
            />
          </svg>
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
                  location.pathname === item.path ? "primary.main" : "inherit",
              }}
            >
              {item.icon}
            </ListItemIcon>
            <ListItemText primary={item.text} />
          </ListItem>
        ))}
      </List>
    </Box>
  );

  return (
    <>
      <TopNav onMenuClick={handleDrawerToggle} />
      <Box
        sx={{ display: "flex", flex: 1, bgcolor: "#f5f5f5" }}
        id="dashboard-content-wrapper"
      >
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
            p: { xs: 2, sm: 3 },
            ml: { sm: `${drawerWidth}px` },
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
