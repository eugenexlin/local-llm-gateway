import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#8b5cf6',
      light: '#a78bfa',
      dark: '#7c3aed',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#f59e0b',
      light: '#fbbf24',
      dark: '#d97706',
      contrastText: '#000000',
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  },
  shape: {
    borderRadius: 0,
  },
  custom: {
    ui: {
      hoverBg: 'rgba(139, 92, 246, 0.04)',
      activeBg: 'rgba(139, 92, 246, 0.08)',
      activeColor: '#8b5cf6',
      textPrimary: '#334155',
      textSecondary: '#94a3b8',
      textMuted: '#cbd5e1',
      borderColor: '#e0e0e0',
      editBg: 'rgba(139, 92, 246, 0.06)',
      deleteColor: '#dc2626',
      deleteHoverBg: 'rgba(220, 38, 38, 0.06)',
    },
  },
  components: {
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: '#ffffff',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#ffffff',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 0,
        },
      },
    },
  },
});

export default theme;
