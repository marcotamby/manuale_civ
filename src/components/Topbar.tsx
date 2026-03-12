import { User } from 'lucide-react';
import { useAuth } from './AuthContext';
import { useCivData } from './CivContext';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Link } from 'react-router-dom';
import { RANK_ICONS } from './ProfileModal';

export type FilterType = 'Tutte' | 'Fanteria' | 'Cavalleria' | 'Arcieri' | 'Assedio';

interface TopbarProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  activeFilter: string;
  setActiveFilter: (f: FilterType) => void;
  onOpenAdminDashboard?: () => void;
}

export function Topbar({ onOpenAdminDashboard }: TopbarProps) {
  const { isAuthenticated, isAdmin, isSuperAdmin, user, logout, openLoginModal, favorites } = useAuth();
  const { civilizations } = useCivData();
  const [pendingCount, setPendingCount] = useState(0);
  const [notificationCount, setNotificationCount] = useState(0);

  const fetchPendingCount = async () => {
    try {
      const { count, error } = await supabase
        .from('suggestions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      if (error) throw error;
      setPendingCount(count || 0);
    } catch (err) {
      console.error('Error fetching pending suggestions count:', err);
    }
  };

  useEffect(() => {
    if (isAuthenticated && isSuperAdmin) {
      fetchPendingCount();

      // Real-time subscription to suggestions table
      const channel = supabase
        .channel('suggestions-count')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'suggestions'
        }, () => {
          fetchPendingCount();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [isAuthenticated, isSuperAdmin]);

  useEffect(() => {
    if (!isAuthenticated || favorites.length === 0) {
      setNotificationCount(0);
      return;
    }

    // Calculate total content items for current favorites
    const favCivs = civilizations.filter(c => favorites.includes(c.id));
    const currentTotalItems = favCivs.reduce((acc, civ) => {
      return acc + (civ.buildOrders?.length || 0) + (civ.videos?.length || 0);
    }, 0);

    // Get last seen total from localStorage
    const lastSeenKey = `lastSeenTotal_${user?.email}`;
    const lastSeenTotal = parseInt(localStorage.getItem(lastSeenKey) || '0');

    if (currentTotalItems > lastSeenTotal) {
      setNotificationCount(currentTotalItems - lastSeenTotal);
    } else {
      setNotificationCount(0);
    }

    // Function to clear notifications when profile is opened
    (window as any).clearNotifications = () => {
      localStorage.setItem(lastSeenKey, currentTotalItems.toString());
      setNotificationCount(0);
    };
  }, [favorites, civilizations, isAuthenticated, user?.email]);

  return (
    <div className="w-full bg-gradient-to-r from-[#0d1424] via-[#1a1c32] to-[#0d1424] border-b border-yellow-500/20 flex flex-col md:flex-row items-center justify-between px-4 py-4 md:px-10 md:py-5 z-10 shrink-0 gap-4 shadow-[0_4px_20px_rgba(0,0,0,0.5)] relative overflow-hidden">

      {/* Decorative top border glow effect */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-yellow-500/50 to-transparent"></div>

      {/* Left empty container for balancing the center on desktop */}
      <div className="hidden md:flex w-1/3 items-center justify-start"></div>

      {/* Center Title Area */}
      <Link to="/" className="flex flex-col items-center justify-center text-center w-full md:w-1/3 group cursor-pointer hover:opacity-90 transition-opacity">
        <h2 className="text-xs md:text-sm font-sackers font-bold text-yellow-500/90 tracking-[0.3em] uppercase mb-1 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
          Age of Empires IV
        </h2>
        <h1 className="text-3xl md:text-4xl font-sackers font-bold text-transparent bg-clip-text bg-gradient-to-b from-yellow-200 via-yellow-400 to-amber-600 drop-shadow-[0_0_15px_rgba(212,175,55,0.3)] tracking-tight">
          Manuale delle Civiltà
        </h1>
        <div className="flex items-center gap-3 mt-3 mb-2">
          <div className="h-px w-12 bg-gradient-to-r from-transparent to-yellow-500/50"></div>
          <div className="w-1.5 h-1.5 rotate-45 bg-yellow-500/60 transition-transform group-hover:rotate-[135deg] duration-500"></div>
          <div className="h-px w-12 bg-gradient-to-l from-transparent to-yellow-500/50"></div>
        </div>
        <p className="text-xs text-gray-400/90 italic hidden sm:block font-serif tracking-wider">
          Scegli la tua civiltà e domina il campo di battaglia
        </p>
      </Link>

      {/* Auth / Right side */}
      <div className="flex items-center justify-center md:justify-end w-full md:w-1/3 gap-4">
        {isAuthenticated ? (
          isAdmin ? (
            <div className="flex items-center gap-4 font-sans">
              <button
                onClick={() => {
                  (window as any).openProfileModal?.();
                  (window as any).clearNotifications?.();
                }}
                className="flex items-center gap-2 text-yellow-500 hover:opacity-80 transition-opacity group"
                title="Il Tuo Profilo"
              >
                <div className="w-8 h-8 rounded-full bg-yellow-500/10 flex items-center justify-center border border-yellow-500/30 group-hover:border-yellow-500/60 transition-colors overflow-hidden">
                  {user?.rank && user.rank !== 'Unranked' ? (
                    <img src={RANK_ICONS[user.rank]} alt={user.rank} className="w-6 h-6 object-contain" />
                  ) : (
                    <User size={16} />
                  )}
                </div>
                <div className="flex flex-col text-left">
                  <span className="font-medium hidden sm:block text-sm leading-none text-white/90">{user?.name}</span>
                  <span className="text-[10px] text-yellow-600 font-bold uppercase tracking-wider">{isSuperAdmin ? 'Admin' : 'Editor'}</span>
                </div>
              </button>
              {isSuperAdmin && (
                <button
                  onClick={onOpenAdminDashboard}
                  className="relative text-xs text-yellow-500 hover:text-white transition-colors border border-yellow-500/20 px-3 py-1.5 rounded hover:bg-yellow-500/10 font-sans tracking-wider uppercase flex items-center gap-1"
                >
                  Proposte
                  {pendingCount > 0 && (
                    <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white shadow-lg animate-bounce duration-500 ring-2 ring-[#0d1424]">
                      {pendingCount}
                    </span>
                  )}
                </button>
              )}              <button
                onClick={logout}
                className="text-xs text-gray-400 hover:text-white transition-colors border border-white/10 px-3 py-1.5 rounded hover:bg-white/5 font-sans tracking-wider uppercase"
              >
                Esci
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  (window as any).openProfileModal?.();
                  (window as any).clearNotifications?.();
                }}
                className="relative p-1 rounded-full bg-blue-600/10 border border-blue-500/30 text-blue-400 hover:bg-blue-600/20 hover:border-blue-500/50 transition-all group overflow-hidden"
                title="Il Tuo Profilo"
              >
                {user?.rank && user.rank !== 'Unranked' ? (
                  <img src={RANK_ICONS[user.rank]} alt={user.rank} className="w-8 h-8 object-contain drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]" />
                ) : (
                  <div className="w-8 h-8 flex items-center justify-center">
                    <User size={20} />
                  </div>
                )}
                {notificationCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[9px] font-bold text-white shadow-lg group-hover:scale-110 transition-transform ring-1 ring-[#0d1424]">
                    {notificationCount}
                  </span>
                )}
              </button>
              <button
                onClick={logout}
                className="text-xs text-gray-400 hover:text-white transition-colors border border-white/10 px-3 py-1.5 rounded hover:bg-white/5 font-sans tracking-wider uppercase"
              >
                Esci
              </button>
            </div>
          )
        ) : (
          <button
            onClick={openLoginModal}
            className="flex items-center gap-2 px-6 py-2 bg-yellow-600/10 hover:bg-yellow-600/20 text-yellow-500 font-bold rounded-lg border border-yellow-500/30 transition-all shadow-[0_0_15px_rgba(212,175,55,0.1)] hover:shadow-[0_0_20px_rgba(212,175,55,0.2)] uppercase text-xs tracking-widest"
          >
            <User size={14} />
            Accedi
          </button>
        )}
      </div>
    </div>
  );
}
