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

  // Load user from storage on mount
  useEffect(() => {
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
      const email = 'admin@localhost';
      const devUser = {
        name: 'Local Admin (Dev)',
        email,
        rank: localStorage.getItem(`auth_user_rank_${email}`) || localStorage.getItem('auth_user_rank') || 'Unranked',
        nickname: localStorage.getItem(`auth_user_nickname_${email}`) || localStorage.getItem('auth_user_nickname') || ''
      };
      setUser(devUser);
      checkRoles(devUser);
    }
  }, []);

  // Sync favorites when user changes (login/logout/switch)
  useEffect(() => {
    const userEmail = user?.email || 'guest';
    const favoritesKey = `aoe4_favorites_${userEmail}`;
    
    const saved = localStorage.getItem(favoritesKey);
    if (saved) {
      try {
        setFavorites(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse favorites', e);
        setFavorites([]);
      }
    } else {
      setFavorites([]);
    }
  }, [user?.email]);

  // Save favorites to localStorage when they change
  useEffect(() => {
    const userEmail = user?.email || 'guest';
    const favoritesKey = `aoe4_favorites_${userEmail}`;
    localStorage.setItem(favoritesKey, JSON.stringify(favorites));
  }, [favorites]); // Removed user?.email to prevent saving stale favorites during user switch

  const login = (userData: UserData) => {
    const email = userData.email?.toLowerCase() || 'guest';
    const savedRank = localStorage.getItem(`auth_user_rank_${email}`) || localStorage.getItem('auth_user_rank') || 'Unranked';
    const savedNickname = localStorage.getItem(`auth_user_nickname_${email}`) || localStorage.getItem('auth_user_nickname') || '';
    
    const enrichedUser = { ...userData, rank: savedRank, nickname: savedNickname };

    setIsAuthenticated(true);
    setUser(enrichedUser);
    localStorage.setItem('auth_user', JSON.stringify(enrichedUser));
    checkRoles(enrichedUser);

    // Migration: save back to per-user keys if using old global keys
    localStorage.setItem(`auth_user_rank_${email}`, savedRank);
    localStorage.setItem(`auth_user_nickname_${email}`, savedNickname);
  };

  const logout = () => {
    setIsAuthenticated(false);
    setIsAdmin(false);
    setIsSuperAdmin(false);
    setIsEditor(false);
    setUser(null);
    setFavorites([]); // Clear favorites state on logout
    localStorage.removeItem('auth_user');
    // We don't remove rank/nickname keys as they are per-user in localStorage
  };

  const updateRank = (rank: string) => {
    updateProfile({ rank });
  };

  const updateProfile = (data: { rank?: string; nickname?: string }) => {
    if (user) {
      const updatedUser = { ...user, ...data };
      const email = user.email?.toLowerCase() || 'guest';
      
      setUser(updatedUser);
      localStorage.setItem('auth_user', JSON.stringify(updatedUser));
      
      if (data.rank) {
        localStorage.setItem(`auth_user_rank_${email}`, data.rank);
        // Clear legacy global key
        localStorage.removeItem('auth_user_rank');
      }
      if (data.nickname !== undefined) {
        localStorage.setItem(`auth_user_nickname_${email}`, data.nickname);
        // Clear legacy global key
        localStorage.removeItem('auth_user_nickname');
      }
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
