import { createTheme } from '@mui/material/styles';

export function getTheme(mode: 'light' | 'dark') {
  const isDark = mode === 'dark';

  const theme = createTheme({
    cssVariables: true,
    palette: {
      mode,
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
        default: isDark ? '#121212' : '#f5f5f5',
        paper: isDark ? '#1e1e1e' : '#ffffff',
      },
    },
    typography: {
      fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    },
    custom: {
      ui: {
        hoverBg: isDark ? 'rgba(139, 92, 246, 0.12)' : 'rgba(139, 92, 246, 0.04)',
        activeBg: isDark ? 'rgba(139, 92, 246, 0.2)' : 'rgba(139, 92, 246, 0.08)',
        activeColor: '#8b5cf6',
        textPrimary: isDark ? '#e2e8f0' : '#334155',
        textSecondary: isDark ? '#64748b' : '#94a3b8',
        textMuted: isDark ? '#475569' : '#cbd5e1',
        borderColor: isDark ? '#2d2d2d' : '#e0e0e0',
        editBg: isDark ? 'rgba(139, 92, 246, 0.15)' : 'rgba(139, 92, 246, 0.06)',
        deleteColor: '#dc2626',
        deleteHoverBg: isDark ? 'rgba(220, 38, 38, 0.15)' : 'rgba(220, 38, 38, 0.06)',
      },
    },
    components: {
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundColor: isDark ? '#1e1e1e' : '#ffffff',
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: isDark ? '#1e1e1e' : '#ffffff',
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
          },
        },
      },
    },
  });

  return theme;
}

const theme = getTheme('light');
export default theme;
