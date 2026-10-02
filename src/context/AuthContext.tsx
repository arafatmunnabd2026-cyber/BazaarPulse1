import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'customer' | 'vendor' | 'admin' | string;
  status?: string;
  phone?: string;
  saved_address?: any;
  savedAddress?: any;
  vendorId?: string;
  [key: string]: any;
}

export interface AuthContextType {
  authUser: UserProfile | null;
  authToken: string;
  isAuthenticated: boolean;
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  openLoginModal: () => void;
  closeLoginModal: () => void;
  login: (user: UserProfile, token?: string) => void;
  logout: () => void;
  setAuthUser: React.Dispatch<React.SetStateAction<UserProfile | null>>;
  setAuthToken: React.Dispatch<React.SetStateAction<string>>;
  updateUser: (updates: Partial<UserProfile>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USER_STORAGE_KEY = 'bazaarpulse_user';
const TOKEN_STORAGE_KEY = 'bazaarpulse_token';
const AUTH_EVENT_NAME = 'bazaarpulse_auth_sync';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 1. Synchronously read from localStorage for instant, zero-flicker auth state
  const [authUser, setAuthUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem(USER_STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      console.error('Failed to parse auth user from localStorage:', e);
      return null;
    }
  });

  const [authToken, setAuthToken] = useState<string>(() => {
    try {
      return localStorage.getItem(TOKEN_STORAGE_KEY) || '';
    } catch {
      return '';
    }
  });

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const openLoginModal = useCallback(() => setIsAuthModalOpen(true), []);
  const closeLoginModal = useCallback(() => setIsAuthModalOpen(false), []);

  // 2. Centralized Login handler
  const login = useCallback((user: UserProfile, token: string = '') => {
    setAuthUser(user);
    try {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
      if (token) {
        setAuthToken(token);
        localStorage.setItem(TOKEN_STORAGE_KEY, token);
      }
      window.dispatchEvent(new CustomEvent(AUTH_EVENT_NAME, { detail: { user, token } }));
    } catch (e) {
      console.error('Failed to persist auth state to localStorage:', e);
    }
  }, []);

  // 3. Centralized Logout handler
  const logout = useCallback(() => {
    setAuthUser(null);
    setAuthToken('');
    try {
      localStorage.removeItem(USER_STORAGE_KEY);
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      window.dispatchEvent(new CustomEvent(AUTH_EVENT_NAME, { detail: { user: null, token: '' } }));
    } catch (e) {
      console.error('Failed to clear auth state from localStorage:', e);
    }
  }, []);

  // 4. Update user profile information
  const updateUser = useCallback((updates: Partial<UserProfile>) => {
    setAuthUser(prev => {
      if (!prev) return null;
      const updated = { ...prev, ...updates };
      try {
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updated));
        window.dispatchEvent(new CustomEvent(AUTH_EVENT_NAME, { detail: { user: updated } }));
      } catch (e) {
        console.error('Failed to update user in localStorage:', e);
      }
      return updated;
    });
  }, []);

  // 5. Cross-tab and window event listener for seamless session synchronization
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === USER_STORAGE_KEY) {
        try {
          const newUser = e.newValue ? JSON.parse(e.newValue) : null;
          setAuthUser(newUser);
        } catch {
          setAuthUser(null);
        }
      }
      if (e.key === TOKEN_STORAGE_KEY) {
        setAuthToken(e.newValue || '');
      }
    };

    const handleCustomAuthSync = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        if ('user' in customEvent.detail) {
          setAuthUser(customEvent.detail.user);
        }
        if ('token' in customEvent.detail) {
          setAuthToken(customEvent.detail.token || '');
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener(AUTH_EVENT_NAME, handleCustomAuthSync);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener(AUTH_EVENT_NAME, handleCustomAuthSync);
    };
  }, []);

  const value: AuthContextType = {
    authUser,
    authToken,
    isAuthenticated: Boolean(authUser),
    isAuthModalOpen,
    setIsAuthModalOpen,
    openLoginModal,
    closeLoginModal,
    login,
    logout,
    setAuthUser,
    setAuthToken,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    // Graceful fallback to localStorage state if used outside AuthProvider
    try {
      const savedUser = localStorage.getItem(USER_STORAGE_KEY);
      const user = savedUser ? JSON.parse(savedUser) : null;
      const token = localStorage.getItem(TOKEN_STORAGE_KEY) || '';
      return {
        authUser: user,
        authToken: token,
        isAuthenticated: Boolean(user),
        isAuthModalOpen: false,
        setIsAuthModalOpen: () => {},
        openLoginModal: () => {},
        closeLoginModal: () => {},
        login: (u, t) => {
          localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(u));
          if (t) localStorage.setItem(TOKEN_STORAGE_KEY, t);
        },
        logout: () => {
          localStorage.removeItem(USER_STORAGE_KEY);
          localStorage.removeItem(TOKEN_STORAGE_KEY);
        },
        setAuthUser: () => {},
        setAuthToken: () => {},
        updateUser: () => {},
      };
    } catch {
      return {
        authUser: null,
        authToken: '',
        isAuthenticated: false,
        isAuthModalOpen: false,
        setIsAuthModalOpen: () => {},
        openLoginModal: () => {},
        closeLoginModal: () => {},
        login: () => {},
        logout: () => {},
        setAuthUser: () => {},
        setAuthToken: () => {},
        updateUser: () => {},
      };
    }
  }
  return context;
};
