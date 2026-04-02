import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: string;
  name: string;
  email: string;
  oauthProvider: string;
}

interface AuthContextType {
  user: User | null;
  login: (userData: User) => void;
  logout: () => void;
  loading: boolean;
  testLogin: () => void;
  handleOAuthLogin: (provider: string, email: string, name: string, oauthId: string | null) => void;
  getSessionToken: () => string | null;
}

const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export const generateSessionToken = (email: string): string => {
  return btoa(email);
};

export const validateSessionToken = (token: string): string | null => {
  try {
    const email = atob(token);
    if (email && email.includes('@')) {
      return email;
    }
    return null;
  } catch {
    return null;
  }
};

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const sessionToken = document.cookie.match(/session_token=([^;]+)/)?.[1];
      
      if (sessionToken) {
        const email = validateSessionToken(sessionToken);
        if (email) {
          const storedUser = localStorage.getItem('user');
          if (storedUser) {
            const parsedUser = JSON.parse(storedUser);
            if (parsedUser.email === email) {
              setUser(parsedUser);
            }
          }
        }
      }
      
      if (!user) {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
      }
    } catch (e) {
      console.error('Failed to parse stored user:', e);
      localStorage.removeItem('user');
    }
    setLoading(false);
  }, []);

  const login = (userData: User) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    document.cookie = 'session_token=; path=/; max-age=0';
  };

  const getSessionToken = (): string | null => {
    const match = document.cookie.match(/session_token=([^;]+)/);
    return match ? match[1] : null;
  };

  const testLogin = () => {
    const testUser: User = {
      id: 'test-user-001',
      name: 'Test User',
      email: 'test@llmfirewall.com',
      oauthProvider: 'test',
    };
    login(testUser);
  };

  const handleOAuthLogin = (provider: string, email: string, name: string, oauthId: string | null) => {
    const oauthUser: User = {
      id: oauthId || `oauth-${Date.now()}`,
      name,
      email,
      oauthProvider: provider,
    };
    login(oauthUser);
    const token = generateSessionToken(email);
    document.cookie = `session_token=${token}; path=/; max-age=86400`;
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, testLogin, handleOAuthLogin, getSessionToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
