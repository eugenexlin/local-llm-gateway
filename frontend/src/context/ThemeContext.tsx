import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { ThemeProvider as MuiThemeProvider, CssBaseline } from '@mui/material';
import { getTheme } from '../theme';
import { getItem, setItem, getLastUserId } from '../utils/storage';

type ThemeMode = 'light' | 'dark';

interface ThemeContextValue {
  mode: ThemeMode;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function loadInitialTheme(userId: string | null): ThemeMode {
  try {
    if (userId) {
      const stored = getItem(userId, 'theme') as ThemeMode | null;
      if (stored === 'light' || stored === 'dark') return stored;
    }
    
    const lastUserId = getLastUserId();
    if (lastUserId && lastUserId !== userId) {
      const stored = getItem(lastUserId, 'theme') as ThemeMode | null;
      if (stored === 'light' || stored === 'dark') return stored;
    }
    
    return 'light';
  } catch {
    return 'light';
  }
}

export function ThemeContextProvider({ userId, children }: { userId: string | null; children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>(() => loadInitialTheme(userId));
  const userIdRef = useRef(userId);
  userIdRef.current = userId;

  const theme = getTheme(mode);

  useEffect(() => {
    if (userIdRef.current) {
      setItem(userIdRef.current, 'theme', mode);
    }
  }, [mode]);

  useEffect(() => {
    setMode(loadInitialTheme(userId));
  }, [userId]);

  const toggleTheme = useCallback(() => {
    setMode((prev) => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  return (
    <ThemeContext.Provider value={{ mode, toggleTheme }}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
}

export function useThemeContext() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useThemeContext must be used within ThemeContextProvider');
  return ctx;
}
