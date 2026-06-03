import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { supabase } from '../lib/supabaseClient';

interface UserData {
  name: string | null;
  email?: string;
  avatar_url?: string | null;
  rank?: string;
  nickname?: string;
  sheep_balance?: number;
  id?: string;
  aoe4_profile_id?: string | null;
  selected_title?: string | null;
  unlocked_titles?: string[];
  selected_avatar_effect?: string | null;
  unlocked_avatar_effects?: string[];
  unlocked_services?: string[];
}

interface AuthContextType {
  isAuthenticated: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isEditor: boolean;
  isStreamer: boolean;
  canManageTournaments: boolean;
  canManageCivs: boolean;
  canManageBuildorders: boolean;
  canViewAdmin: boolean;
  user: UserData | null;
  favorites: string[];
  isLoginModalOpen: boolean;
  loginModalMessage: string | null;
  openLoginModal: (message?: string) => void;
  closeLoginModal: () => void;
  login: (userData: UserData, googleToken?: string) => void;
  logout: () => void;
  toggleFavorite: (civId: string) => void;
  updateRank: (rank: string) => void;
  updateProfile: (data: { 
    rank?: string; 
    nickname?: string; 
    avatar_url?: string | null; 
    aoe4_profile_id?: string | null;
    sheep_balance?: number;
    selected_title?: string | null;
    unlocked_titles?: string[];
    selected_avatar_effect?: string | null;
    unlocked_avatar_effects?: string[];
    unlocked_services?: string[];
  }) => void;
  refreshUser: () => Promise<void>;
  setUser: (user: UserData | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const mapAoe4RankToLocal = (aoe4Rank: string): string => {
  if (!aoe4Rank || aoe4Rank === 'unranked') return 'Unranked';
  const parts = aoe4Rank.split('_');
  const name = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
  const tier = parts[1];
  let roman = '';
  if (tier === '1') roman = 'I';
  else if (tier === '2') roman = 'II';
  else if (tier === '3') roman = 'III';
  return `${name} ${roman}`.trim();
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isEditor, setIsEditor] = useState(false);
  const [isStreamer, setIsStreamer] = useState(false);
  const [canManageTournaments, setCanManageTournaments] = useState(false);
  const [canManageCivs, setCanManageCivs] = useState(false);
  const [canManageBuildorders, setCanManageBuildorders] = useState(false);
  const [canViewAdmin, setCanViewAdmin] = useState(false);
  const [user, setUser] = useState<UserData | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [loginModalMessage, setLoginModalMessage] = useState<string | null>(null);

  const SUPER_ADMIN_EMAILS = ['marco.tamborrino.94@gmail.com'];
  const EDITOR_EMAILS = ['contattodisparta@gmail.com'];
  const STREAMER_EMAILS = ['cani.vincenzo@gmail.com', 'dadduedo@gmail.com', 'djalfredoneservice@gmail.com', 'contattodisparta@gmail.com'];

  const checkRoles = (userData: any) => {
    const email = userData.email?.toLowerCase();
    
    const isSA = email && SUPER_ADMIN_EMAILS.includes(email);
    const isEd = userData.role === 'admin' || userData.role === 'editor' || (email && EDITOR_EMAILS.includes(email));
    const isStr = userData.is_streamer || (email && STREAMER_EMAILS.includes(email));
    
    // Granular permissions
    // Admins and hardcoded SuperAdmins get everything
    // Others get what's in the DB flags
    const canT = isSA || !!userData.can_manage_tournaments;
    const canC = isSA || !!userData.can_manage_civs;
    const canB = isSA || !!userData.can_manage_buildorders;
    const canViewA = isSA || !!userData.can_view_admin;

    setIsSuperAdmin(!!isSA);
    setIsEditor(!!isEd);
    setIsStreamer(!!isStr);
    setIsAdmin(!!isSA || !!isEd || !!canViewA);
    setCanManageTournaments(canT);
    setCanManageCivs(canC);
    setCanManageBuildorders(canB);
    setCanViewAdmin(canViewA);
    
    console.log('🔐 Auth roles checked:', { 
      email, 
      role: userData.role, 
      isSA, 
      isEd, 
      permissions: { canT, canC, canB } 
    });
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

    // Development bypass: if running on localhost and not logged in, always enable admin features
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (isLocalhost && !storedUser) {
      console.log('🛡️ Local development detected: Admin bypass active.');
      setIsAdmin(true);
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
  }, [favorites]);

  const syncProfileWithSupabase = async (userEmail: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('nickname, rank, avatar_url, role, is_streamer, can_manage_tournaments, can_manage_civs, can_manage_buildorders, can_view_admin, sheep_balance, aoe4_profile_id, selected_title, unlocked_titles, selected_avatar_effect, unlocked_avatar_effects, unlocked_services')
        .ilike('email', userEmail)
        .maybeSingle();
      
      if (!error && data) {
        const email = userEmail.toLowerCase();
        let currentRank = data.rank || 'Unranked';
        const currentNickname = data.nickname || '';
        const currentAoe4Id = data.aoe4_profile_id || null;

        // Auto-sync rank from AoE4 World if profile ID is linked and not synced in this session
        if (currentAoe4Id && !sessionStorage.getItem('aoe4_rank_synced')) {
          sessionStorage.setItem('aoe4_rank_synced', 'true');
          try {
            const response = await fetch(`https://aoe4world.com/api/v0/players/${currentAoe4Id}`);
            if (response.ok) {
              const aoe4Data = await response.json();
              const rmSoloRank = aoe4Data.modes?.rm_solo?.rank_level;
              const rmTeamRank = aoe4Data.modes?.rm_team?.rank_level;
              const finalRankLevel = rmSoloRank && rmSoloRank !== 'unranked' ? rmSoloRank : rmTeamRank;
              if (finalRankLevel) {
                const mappedRank = mapAoe4RankToLocal(finalRankLevel);
                if (mappedRank !== currentRank) {
                  console.log(`🔄 Auto-syncing rank from AoE4 World on startup: ${currentRank} -> ${mappedRank}`);
                  currentRank = mappedRank;
                  // Update Supabase DB
                  await supabase
                    .from('profiles')
                    .update({ rank: mappedRank })
                    .eq('email', email);
                }
              }
            }
          } catch (apiErr) {
            console.error('Error auto-syncing with AoE4 World API on startup:', apiErr);
          }
        }
        
        const storedUser = localStorage.getItem('auth_user');
        if (storedUser) {
           const parsed = JSON.parse(storedUser);
           const updated = { 
             ...parsed, 
             rank: currentRank, 
             nickname: currentNickname, 
             role: data.role, 
             is_streamer: data.is_streamer,
             avatar_url: data.avatar_url || parsed.avatar_url,
             can_manage_tournaments: data.can_manage_tournaments,
             can_manage_civs: data.can_manage_civs,
             can_manage_buildorders: data.can_manage_buildorders,
             can_view_admin: data.can_view_admin,
             sheep_balance: data.sheep_balance ?? 100,
             aoe4_profile_id: currentAoe4Id,
             selected_title: data.selected_title || null,
             unlocked_titles: data.unlocked_titles || [],
             selected_avatar_effect: data.selected_avatar_effect || null,
             unlocked_avatar_effects: data.unlocked_avatar_effects || [],
             unlocked_services: data.unlocked_services || []
           };
           localStorage.setItem('auth_user', JSON.stringify(updated));
           localStorage.setItem(`auth_user_${email}`, JSON.stringify(updated));
           setUser(updated);
           checkRoles(updated);
        }
      } else {
        // Profile doesn't exist yet, create it with local values
        const email = userEmail.toLowerCase();
        let rank = localStorage.getItem(`auth_user_rank_${email}`) || localStorage.getItem('auth_user_rank') || 'Unranked';
        const nickname = localStorage.getItem(`auth_user_nickname_${email}`) || localStorage.getItem('auth_user_nickname') || '';
        const aoe4Id = localStorage.getItem(`auth_user_aoe4_id_${email}`) || null;

        // Auto-sync rank if profile ID is linked and not synced in this session
        if (aoe4Id && !sessionStorage.getItem('aoe4_rank_synced')) {
          sessionStorage.setItem('aoe4_rank_synced', 'true');
          try {
            const response = await fetch(`https://aoe4world.com/api/v0/players/${aoe4Id}`);
            if (response.ok) {
              const aoe4Data = await response.json();
              const rmSoloRank = aoe4Data.modes?.rm_solo?.rank_level;
              const rmTeamRank = aoe4Data.modes?.rm_team?.rank_level;
              const finalRankLevel = rmSoloRank && rmSoloRank !== 'unranked' ? rmSoloRank : rmTeamRank;
              if (finalRankLevel) {
                const mappedRank = mapAoe4RankToLocal(finalRankLevel);
                rank = mappedRank;
              }
            }
          } catch (apiErr) {
            console.error('Error auto-syncing new profile with AoE4 World API on startup:', apiErr);
          }
        }
        
        const { data: newProfile } = await supabase
          .from('profiles')
          .upsert({ 
            email, 
            nickname, 
            rank,
            avatar_url: user?.avatar_url || null,
            sheep_balance: 100,
            aoe4_profile_id: aoe4Id
          })
          .select()
          .maybeSingle();

        if (newProfile) {
          setUser(prev => prev ? ({ ...prev, sheep_balance: 100, rank }) : null);
        }
      }
    } catch (err) {
      console.error('Error syncing profile:', err);
    }
  };

  const syncFavoritesWithSupabase = async (userEmail: string) => {
    try {
      const { data, error } = await supabase
        .from('user_favorites')
        .select('civ_id')
        .eq('user_email', userEmail.toLowerCase());
      
      if (!error && data) {
        const dbFavorites = data.map(f => f.civ_id);
        const localEmail = userEmail.toLowerCase();
        const favoritesKey = `aoe4_favorites_${localEmail}`;
        const localFavorites = JSON.parse(localStorage.getItem(favoritesKey) || '[]');
        
        // Merge local and DB favorites
        const merged = Array.from(new Set([...localFavorites, ...dbFavorites]));
        
        // Update state and local storage
        setFavorites(merged);
        localStorage.setItem(favoritesKey, JSON.stringify(merged));

        // Sync local-only favorites back to DB
        const localOnly = localFavorites.filter((f: string) => !dbFavorites.includes(f));
        if (localOnly.length > 0) {
          await supabase
            .from('user_favorites')
            .insert(localOnly.map((civId: string) => ({
              user_email: localEmail,
              civ_id: civId
            })));
        }
      }
    } catch (err) {
      console.error('Error syncing favorites:', err);
    }
  };

  // Sync favorites on mount if user is already logged in
  useEffect(() => {
    if (isAuthenticated && user?.email) {
      syncFavoritesWithSupabase(user.email);
      syncProfileWithSupabase(user.email);
    }
  }, [isAuthenticated, !!user?.email]);

  const login = async (userData: UserData, googleToken?: string) => {
    const email = userData.email?.toLowerCase() || 'guest';
    const savedRank = localStorage.getItem(`auth_user_rank_${email}`) || localStorage.getItem('auth_user_rank') || 'Unranked';
    const savedNickname = localStorage.getItem(`auth_user_nickname_${email}`) || localStorage.getItem('auth_user_nickname') || '';
    const savedAoe4Id = localStorage.getItem(`auth_user_aoe4_id_${email}`) || null;
    const savedUser = localStorage.getItem(`auth_user_${email}`) || localStorage.getItem('auth_user');
    const parsedSavedUser = savedUser ? JSON.parse(savedUser) : null;
    
    // Prioritize previously saved user avatar if it exists (might be custom/DB)
    const finalAvatar = parsedSavedUser?.avatar_url || userData.avatar_url;

    const enrichedUser = { 
      ...userData, 
      rank: savedRank, 
      nickname: savedNickname, 
      avatar_url: finalAvatar,
      aoe4_profile_id: savedAoe4Id
    };

    setIsAuthenticated(true);
    setUser(enrichedUser);
    localStorage.setItem('auth_user', JSON.stringify(enrichedUser));
    localStorage.setItem(`auth_user_${email}`, JSON.stringify(enrichedUser));
    checkRoles(enrichedUser);

    // Migration: save back to per-user keys if using old global keys
    localStorage.setItem(`auth_user_rank_${email}`, savedRank);
    localStorage.setItem(`auth_user_nickname_${email}`, savedNickname);

    // Log into Supabase Auth if Google token is provided
    if (googleToken) {
      try {
        console.log('🔄 Logging into Supabase Auth with Google token...');
        localStorage.removeItem('supabase_auth_error');
        const { data, error } = await supabase.auth.signInWithIdToken({
          provider: 'google',
          token: googleToken,
        });
        if (error) {
          console.error('❌ Supabase Auth error:', error.message);
          localStorage.setItem('supabase_auth_error', error.message);
        } else {
          console.log('✅ Logged into Supabase Auth successfully:', data.user?.email);
          localStorage.removeItem('supabase_auth_error');
        }
      } catch (err: any) {
        console.error('❌ Failed to sign into Supabase Auth:', err);
        localStorage.setItem('supabase_auth_error', err.message || JSON.stringify(err));
      }
    }

    // Sync favorites and profile from Supabase
    if (userData.email) {
      await Promise.all([
        syncFavoritesWithSupabase(userData.email),
        syncProfileWithSupabase(userData.email)
      ]);
    }
  };

  const logout = () => {
    setIsAuthenticated(false);
    setIsAdmin(false);
    setIsSuperAdmin(false);
    setIsEditor(false);
    setIsStreamer(false);
    setCanManageTournaments(false);
    setCanManageCivs(false);
    setCanManageBuildorders(false);
    setCanViewAdmin(false);
    setUser(null);
    setFavorites([]); // Clear favorites state on logout
    localStorage.removeItem('auth_user');
    
    // Log out of Supabase Auth
    supabase.auth.signOut()
      .then(() => console.log('👋 Logged out of Supabase Auth successfully.'))
      .catch(err => console.error('❌ Error logging out of Supabase:', err));
  };

  const updateRank = (rank: string) => {
    updateProfile({ rank });
  };

  const updateProfile = (data: { 
    rank?: string; 
    nickname?: string; 
    avatar_url?: string | null; 
    aoe4_profile_id?: string | null;
    sheep_balance?: number;
    selected_title?: string | null;
    unlocked_titles?: string[];
    selected_avatar_effect?: string | null;
    unlocked_avatar_effects?: string[];
    unlocked_services?: string[];
  }) => {
    if (user) {
      const updatedUser = { ...user, ...data };
      const email = user.email?.toLowerCase() || 'guest';
      
      setUser(updatedUser);
      localStorage.setItem('auth_user', JSON.stringify(updatedUser));
      localStorage.setItem(`auth_user_${email}`, JSON.stringify(updatedUser));
      
      if (data.rank) {
        localStorage.setItem(`auth_user_rank_${email}`, data.rank);
        localStorage.removeItem('auth_user_rank');
      }
      if (data.nickname !== undefined) {
        localStorage.setItem(`auth_user_nickname_${email}`, data.nickname || '');
        localStorage.removeItem('auth_user_nickname');
      }
      if (data.aoe4_profile_id !== undefined) {
        if (data.aoe4_profile_id) {
          localStorage.setItem(`auth_user_aoe4_id_${email}`, data.aoe4_profile_id);
        } else {
          localStorage.removeItem(`auth_user_aoe4_id_${email}`);
        }
      }

      // Sync to Supabase
      if (user.email) {
        const payload: any = { 
          email: email, 
          nickname: updatedUser.nickname || '', 
          rank: updatedUser.rank || 'Unranked',
          avatar_url: updatedUser.avatar_url || null,
          aoe4_profile_id: updatedUser.aoe4_profile_id || null,
          updated_at: new Date().toISOString()
        };

        if (data.sheep_balance !== undefined) payload.sheep_balance = data.sheep_balance;
        if (data.selected_title !== undefined) payload.selected_title = data.selected_title;
        if (data.unlocked_titles !== undefined) payload.unlocked_titles = data.unlocked_titles;
        if (data.selected_avatar_effect !== undefined) payload.selected_avatar_effect = data.selected_avatar_effect;
        if (data.unlocked_avatar_effects !== undefined) payload.unlocked_avatar_effects = data.unlocked_avatar_effects;
        if (data.unlocked_services !== undefined) payload.unlocked_services = data.unlocked_services;

        supabase
          .from('profiles')
          .upsert(payload)
          .then(({ error }) => {
            if (error) console.error('Error syncing profile to DB:', error);
          });
      }
    }
  };

  const toggleFavorite = async (civId: string) => {
    const isAdding = !favorites.includes(civId);
    
    setFavorites(prev =>
      isAdding
        ? [...prev, civId]
        : prev.filter(id => id !== civId)
    );

    // Sync with Supabase if logged in
    if (user?.email) {
      const email = user.email.toLowerCase();
      if (isAdding) {
        await supabase
          .from('user_favorites')
          .insert({ user_email: email, civ_id: civId });
      } else {
        await supabase
          .from('user_favorites')
          .delete()
          .eq('user_email', email)
          .eq('civ_id', civId);
      }
    }
  };

  const openLoginModal = (message?: string) => {
    setLoginModalMessage(message || null);
    setIsLoginModalOpen(true);
  };
  const closeLoginModal = () => setIsLoginModalOpen(false);

  const refreshUser = async () => {
    if (user?.email) {
      await syncProfileWithSupabase(user.email);
    }
  };

  return (
    <AuthContext.Provider value={{
      isAuthenticated,
      isAdmin,
      isSuperAdmin,
      isEditor,
      isStreamer,
      canManageTournaments,
      canManageCivs,
      canManageBuildorders,
      canViewAdmin,
      user,
      favorites,
      isLoginModalOpen,
      loginModalMessage,
      openLoginModal,
      closeLoginModal,
      login,
      logout,
      toggleFavorite,
      updateRank,
      updateProfile,
      refreshUser,
      setUser
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
