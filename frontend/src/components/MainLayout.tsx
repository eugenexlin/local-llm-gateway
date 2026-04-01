import React, { useState } from 'react';
import { Box, Drawer, List, ListItem, ListItemIcon, ListItemText, Divider, Typography, Toolbar } from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import KeyIcon from '@mui/icons-material/Key';
import BarChartIcon from '@mui/icons-material/BarChart';
import { useNavigate, useLocation } from 'react-router-dom';
import TopNav from './TopNav';

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
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/' },
    { text: 'API Keys', icon: <KeyIcon />, path: '/api-keys' },
    { text: 'Usage', icon: <BarChartIcon />, path: '/usage' },
  ];

  const drawer = (
    <Box sx={{ width: drawerWidth, overflow: 'hidden' }}>
      <Toolbar id="drawer-header" sx={{ minHeight: 64 }}>
        <Box
          component="span"
          sx={{
            width: 32,
            height: 32,
            bgcolor: 'primary.main',
            borderRadius: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 'bold',
            fontSize: '18px',
            flexShrink: 0
          }}
        >
          L
        </Box>
        <Typography 
          variant="h6" 
          noWrap 
          sx={{ whiteSpace: 'nowrap', flexShrink: 0, lineHeight: 1, ml: 1 }}
        >
          LLM Gateway
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        {menuItems.map((item) => (
          <ListItem
            button
            key={item.text}
            onClick={() => {
              navigate(item.path);
              setMobileOpen(false);
            }}
            sx={{
              backgroundColor: location.pathname === item.path ? 'rgba(33, 150, 243, 0.08)' : 'transparent',
              '&:hover': { backgroundColor: 'rgba(33, 150, 243, 0.04)' }
            }}
          >
            <ListItemIcon sx={{ color: location.pathname === item.path ? 'primary.main' : 'inherit' }}>
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
      <Box sx={{ display: 'flex', flex: 1, bgcolor: '#f5f5f5' }} id="dashboard-content-wrapper">
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            flexShrink: 0,
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth, borderRight: '1px solid #e0e0e0', height: '100%' },
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
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
          id="temporary-drawer"
        >
          {drawer}
        </Drawer>
        <Box
          component="main"
          sx={{ flexGrow: 1, p: { xs: 2, sm: 3 }, ml: { sm: `${drawerWidth}px` } }}
          id="main-content"
        >
          <Box sx={{ maxWidth: 1200, mx: 'auto' }} id="content-centered-wrapper">
            {children}
          </Box>
        </Box>
      </Box>
    </>
  );
};

export default MainLayout;
