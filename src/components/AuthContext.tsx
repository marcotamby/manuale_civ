import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

interface UserData {
  name: string | null;
  email?: string;
  picture?: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  isAdmin: boolean;
  user: UserData | null;
  favorites: string[];
  isLoginModalOpen: boolean;
  openLoginModal: () => void;
  closeLoginModal: () => void;
  login: (userData: UserData) => void;
  logout: () => void;
  toggleFavorite: (civId: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [user, setUser] = useState<UserData | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // Load favorites and check for development admin bypass
  useEffect(() => {
    const saved = localStorage.getItem('aoe4_favorites');
    if (saved) {
      try {
        setFavorites(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse favorites', e);
      }
    }

    // Persist login state
    const storedUser = localStorage.getItem('auth_user');
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        setUser(parsed);
        setIsAuthenticated(true);
        const adminEmails = ['marcotamby@gmail.com', 'marco.tamborrino.94@gmail.com'];
        if (parsed.name?.toLowerCase() === 'admin' || (parsed.email && adminEmails.includes(parsed.email))) {
          setIsAdmin(true);
        }
      } catch (e) {
        console.error('Failed to parse stored user', e);
      }
    }

    // Development bypass: if running on localhost, always enable admin features
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (isLocalhost) {
      console.log('🛡️ Local development detected: Admin bypass active.');
      setIsAdmin(true);
      setIsAuthenticated(true);
      setUser({ name: 'Local Admin (Dev)', email: 'admin@localhost' });
    }
  }, []);

  // Save favorites to localStorage when they change
  useEffect(() => {
    localStorage.setItem('aoe4_favorites', JSON.stringify(favorites));
  }, [favorites]);

  const login = (userData: UserData) => {
    setIsAuthenticated(true);
    setUser(userData);
    localStorage.setItem('auth_user', JSON.stringify(userData));
    const adminEmails = ['marcotamby@gmail.com', 'marco.tamborrino.94@gmail.com'];
    if (userData.name?.toLowerCase() === 'admin' || (userData.email && adminEmails.includes(userData.email))) {
      setIsAdmin(true);
    }
  };

  const logout = () => {
    setIsAuthenticated(false);
    setIsAdmin(false);
    setUser(null);
    localStorage.removeItem('auth_user');
  };

  const toggleFavorite = (civId: string) => {
    setFavorites(prev => 
      prev.includes(civId) 
        ? prev.filter(id => id !== civId) 
        : [...prev, civId]
    );
  };

  const openLoginModal = () => setIsLoginModalOpen(true);
  const closeLoginModal = () => setIsLoginModalOpen(false);

  return (
    <AuthContext.Provider value={{ 
      isAuthenticated, 
      isAdmin, 
      user, 
      favorites, 
      isLoginModalOpen,
      openLoginModal,
      closeLoginModal,
      login, 
      logout, 
      toggleFavorite 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
