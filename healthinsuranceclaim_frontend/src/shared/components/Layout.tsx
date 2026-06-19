import { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import {
  AppBar,
  Box,
  CssBaseline,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Avatar,
  Menu,
  MenuItem,
  Divider
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard,
  Assignment,
  Person,
  ExitToApp,
  PendingActions,
  Business,
  Notifications,
  People,
  Policy,
  SupervisorAccount
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';
import { ROUTES, USER_ROLE_LABELS } from '../utils/constants';
import { UserRole } from '../types';

const drawerWidth = 240;

const Layout = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleDrawerToggle = () => setMobileOpen(!mobileOpen);
  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => setAnchorEl(event.currentTarget);
  const handleProfileMenuClose = () => setAnchorEl(null);

  const handleLogout = () => {
    logout();
    navigate(ROUTES.LOGIN);
    handleProfileMenuClose();
  };

  const getMenuItems = () => {
    const baseItems = [
      { text: 'Dashboard', icon: <Dashboard />, path: ROUTES.DASHBOARD },
      { text: 'Notifications', icon: <Notifications />, path: ROUTES.NOTIFICATIONS }
    ];

    switch (user?.role) {
      case UserRole.Customer:
        return [
          ...baseItems,
          { text: 'My Claims', icon: <Assignment />, path: ROUTES.MY_CLAIMS }
        ];
      case UserRole.Hospital:
        return [
          ...baseItems,
          { text: 'Create Claim', icon: <Assignment />, path: ROUTES.CREATE_CLAIM }
        ];
      case UserRole.ClaimOfficer:
        return [
          ...baseItems,
          { text: 'All Claims', icon: <Assignment />, path: ROUTES.CLAIMS },
          { text: 'Pending Claims', icon: <PendingActions />, path: ROUTES.PENDING_CLAIMS }
        ];
      case UserRole.Admin:
        return [
          ...baseItems,
          { text: 'Users', icon: <People />, path: ROUTES.ADMIN_USERS },
          { text: 'Customers', icon: <Person />, path: ROUTES.ADMIN_CUSTOMERS },
          { text: 'Hospitals', icon: <Business />, path: ROUTES.ADMIN_HOSPITALS },
          { text: 'Policies', icon: <Policy />, path: ROUTES.ADMIN_POLICIES },
          { text: 'Claims', icon: <Assignment />, path: ROUTES.ADMIN_CLAIMS },
          { text: 'Claim Officers', icon: <SupervisorAccount />, path: ROUTES.ADMIN_OFFICERS }
        ];
      default:
        return baseItems;
    }
  };

  const drawer = (
    <Box sx={{ height: '100%', background: 'linear-gradient(180deg, #2c5aa0 0%, #00acc1 50%, #4dd0e1 100%)' }}>
      <Toolbar sx={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)' }}>
        <Typography variant="h6" noWrap sx={{ color: 'white', fontWeight: 700 }}>
          🏥 HealthCare+
        </Typography>
      </Toolbar>
      <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />
      <List sx={{ px: 2, pt: 2 }}>
        {getMenuItems().map((item) => (
          <ListItem key={item.text} disablePadding sx={{ mb: 1 }}>
            <ListItemButton 
              onClick={() => navigate(item.path)}
              sx={{
                borderRadius: 2,
                color: 'rgba(255,255,255,0.8)',
                '&:hover': {
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  color: 'white',
                  transform: 'translateX(4px)',
                  transition: 'all 0.2s ease'
                }
              }}
            >
              <ListItemIcon sx={{ color: 'inherit', minWidth: 40 }}>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} sx={{ '& .MuiTypography-root': { fontWeight: 500 } }} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar 
        position="fixed" 
        elevation={0}
        sx={{ 
          width: { sm: `calc(100% - ${drawerWidth}px)` }, 
          ml: { sm: `${drawerWidth}px` },
          backgroundColor: 'rgba(255,255,255,0.8)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(0,0,0,0.05)',
          color: 'text.primary'
        }}
      >
        <Toolbar>
          <IconButton color="inherit" edge="start" onClick={handleDrawerToggle} sx={{ mr: 2, display: { sm: 'none' } }}>
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap sx={{ flexGrow: 1 }}>
            {USER_ROLE_LABELS[user?.role as keyof typeof USER_ROLE_LABELS] || 'User'} Dashboard
          </Typography>
          <IconButton size="large" edge="end" onClick={handleProfileMenuOpen} color="inherit">
            <Avatar sx={{ width: 32, height: 32 }}>{user?.email.charAt(0).toUpperCase()}</Avatar>
          </IconButton>
          <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleProfileMenuClose}>
            <MenuItem onClick={() => { navigate(ROUTES.PROFILE); handleProfileMenuClose(); }}>
              <ListItemIcon><Person fontSize="small" /></ListItemIcon>
              Profile
            </MenuItem>
            <MenuItem onClick={handleLogout}>
              <ListItemIcon><ExitToApp fontSize="small" /></ListItemIcon>
              Logout
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>
      <Box component="nav" sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{ display: { xs: 'block', sm: 'none' }, '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth } }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{ display: { xs: 'none', sm: 'block' }, '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth } }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      <Box component="main" sx={{ flexGrow: 1, p: 3, width: { sm: `calc(100% - ${drawerWidth}px)` } }}>
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
};

export { Layout };
export default Layout;