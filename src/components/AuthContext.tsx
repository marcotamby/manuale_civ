import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

interface UserData {
  name: string | null;
  email?: string;
  picture?: string;
  rank?: string;
  nickname?: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isEditor: boolean;
  user: UserData | null;
  favorites: string[];
  isLoginModalOpen: boolean;
  openLoginModal: () => void;
  closeLoginModal: () => void;
  login: (userData: UserData) => void;
  logout: () => void;
  toggleFavorite: (civId: string) => void;
  updateRank: (rank: string) => void;
  updateProfile: (data: { rank?: string; nickname?: string }) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isEditor, setIsEditor] = useState(false);
  const [user, setUser] = useState<UserData | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  const SUPER_ADMIN_EMAILS = ['marcotamby@gmail.com', 'marco.tamborrino.94@gmail.com'];
  const EDITOR_EMAILS = ['alessio.bella97@gmail.com', 'contattodisparta@gmail.com'];

  const checkRoles = (userData: UserData) => {
    const email = userData.email?.toLowerCase();
    const name = userData.name?.toLowerCase();
    
    const isSA = (email && SUPER_ADMIN_EMAILS.includes(email)) || name === 'admin' || name?.includes('marcotamby');
    const isEd = email && EDITOR_EMAILS.includes(email);
    
    setIsSuperAdmin(!!isSA);
    setIsEditor(!!isEd);
    setIsAdmin(!!isSA || !!isEd);
    console.log('🔐 Auth roles checked:', { email, name, isSA, isEd, isAdmin: !!isSA || !!isEd });
  };

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
        checkRoles(parsed);
      } catch (e) {
        console.error('Failed to parse stored user', e);
      }
    }

    // Development bypass: if running on localhost, always enable admin features
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (isLocalhost) {
      console.log('🛡️ Local development detected: Admin bypass active.');
      setIsAdmin(true);
      setIsSuperAdmin(true);
      setIsAuthenticated(true);
      setUser({
        name: 'Local Admin (Dev)',
        email: 'admin@localhost',
        rank: localStorage.getItem('auth_user_rank') || 'Unranked',
        nickname: localStorage.getItem('auth_user_nickname') || ''
      });
    }
  }, []);

  // Save favorites to localStorage when they change
  useEffect(() => {
    localStorage.setItem('aoe4_favorites', JSON.stringify(favorites));
  }, [favorites]);

  const login = (userData: UserData) => {
    const savedRank = localStorage.getItem('auth_user_rank') || 'Unranked';
    const savedNickname = localStorage.getItem('auth_user_nickname') || '';
    const enrichedUser = { ...userData, rank: savedRank, nickname: savedNickname };

    setIsAuthenticated(true);
    setUser(enrichedUser);
    localStorage.setItem('auth_user', JSON.stringify(enrichedUser));
    checkRoles(enrichedUser);
  };

  const logout = () => {
    setIsAuthenticated(false);
    setIsAdmin(false);
    setIsSuperAdmin(false);
    setIsEditor(false);
    setUser(null);
    localStorage.removeItem('auth_user');
  };

  const updateRank = (rank: string) => {
    updateProfile({ rank });
  };

  const updateProfile = (data: { rank?: string; nickname?: string }) => {
    if (user) {
      const updatedUser = { ...user, ...data };
      setUser(updatedUser);
      localStorage.setItem('auth_user', JSON.stringify(updatedUser));
      if (data.rank) localStorage.setItem('auth_user_rank', data.rank);
      if (data.nickname !== undefined) localStorage.setItem('auth_user_nickname', data.nickname);
    }
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
      isSuperAdmin,
      isEditor,
      user,
      favorites,
      isLoginModalOpen,
      openLoginModal,
      closeLoginModal,
      login,
      logout,
      toggleFavorite,
      updateRank,
      updateProfile
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
