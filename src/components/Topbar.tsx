import { User } from 'lucide-react';
import { useAuth } from './AuthContext';
import { useCivData } from './CivContext';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Link } from 'react-router-dom';
import { RANK_ICONS } from './ProfileModal';
import { Coffee, Radio as _Radio, HelpCircle, LogOut, Trophy, Monitor } from 'lucide-react';
import { usePresence } from './PresenceContext';

export type FilterType = 'Tutte' | 'Fanteria' | 'Cavalleria' | 'Arcieri' | 'Assedio';

interface TopbarProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  activeFilter: string;
  setActiveFilter: (f: FilterType) => void;
  onOpenAdminDashboard?: () => void;
  onOpenAdminOverlay?: () => void;
}

export function Topbar({ onOpenAdminDashboard, onOpenAdminOverlay }: TopbarProps) {
  const { isAuthenticated, isAdmin, isSuperAdmin, isStreamer, user, logout, openLoginModal, favorites } = useAuth();
  const { civilizations } = useCivData();
  const { activeAdmins: _activeAdmins, onlineUserCount, usersByPage } = usePresence();
  const [pendingCount, setPendingCount] = useState(0);
  const [pendingQaCount, setPendingQaCount] = useState(0);
  const [notificationCount, setNotificationCount] = useState(0);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const fetchPendingCount = async () => {
    try {
      // Fetch suggestions count (for all admins who can manage content)
      if (isAdmin) {
        const { count, error } = await supabase
          .from('suggestions')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending');
        if (!error) setPendingCount(count || 0);
      }

      // Fetch Q&A count (for all admins)
      const { count: qCount, error: qError } = await supabase
        .from('questions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');
      
      const { count: aCount, error: aError } = await supabase
        .from('answers')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      if (!qError && !aError) {
        setPendingQaCount((qCount || 0) + (aCount || 0));
      }
    } catch (err) {
      console.error('Error fetching pending counts:', err);
    }
  };

  useEffect(() => {
    if (isAuthenticated && isAdmin) {
      fetchPendingCount();

      // Real-time subscription to suggestions (all admins)
      let suggestionChannel: any;
      if (isAdmin) {
        suggestionChannel = supabase
          .channel('suggestions-count')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'suggestions' }, () => fetchPendingCount())
          .subscribe();
      }

      // Real-time subscription to Q&A (all admins)
      const qaChannel = supabase
        .channel('qa-count')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'questions' }, () => fetchPendingCount())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'answers' }, () => fetchPendingCount())
        .subscribe();

      return () => {
        if (suggestionChannel) supabase.removeChannel(suggestionChannel);
        supabase.removeChannel(qaChannel);
      };
    }
  }, [isAuthenticated, isAdmin, isSuperAdmin]);

  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const calculateNotifications = () => {
    if (!isAuthenticated || !user?.email || favorites.length === 0) {
      setNotificationCount(0);
      return;
    }

    const lastSeenKey = `lastSeenCounts_${user.email}`;
    const rawData = localStorage.getItem(lastSeenKey);
    const lastSeenData = rawData ? JSON.parse(rawData) : {};
    
    let totalUnread = 0;
    favorites.forEach(favId => {
      const civ = civilizations.find(c => c.id === favId);
      if (civ) {
        const stored = lastSeenData[favId] || { bo: 0, video: 0 };
        const currentBO = civ.buildOrders?.length || 0;
        const currentVideo = civ.videos?.length || 0;

        // Ensure we compare with numbers and handle potential missing properties in 'stored'
        const storedBO = typeof stored.bo === 'number' ? stored.bo : 0;
        const storedVideo = typeof stored.video === 'number' ? stored.video : 0;

        if (currentBO > storedBO) totalUnread += (currentBO - storedBO);
        if (currentVideo > storedVideo) totalUnread += (currentVideo - storedVideo);
      }
    });

    setNotificationCount(totalUnread);
  };

  useEffect(() => {
    calculateNotifications();

    (window as any).refreshNotificationCount = () => {
      fetchPendingCount();
      setRefreshTrigger(prev => prev + 1);
    };

    return () => {
      (window as any).refreshNotificationCount = undefined;
    };
  }, [favorites, civilizations, isAuthenticated, user?.email, refreshTrigger]);

  return (
    <div className="w-full bg-gradient-to-r from-[#0d1424] via-[#1a1c32] to-[#0d1424] border-b border-yellow-500/20 flex flex-col lg:grid lg:grid-cols-[1fr_auto_1fr] items-center px-4 py-2.5 md:px-14 md:py-4 lg:py-5 z-[100] shrink-0 gap-3 md:gap-4 shadow-[0_4px_20px_rgba(0,0,0,0.5)] relative overflow-hidden">
      
      {/* Background Image Layer with Fade-out edges */}
      <div 
        className="absolute inset-0 z-0 pointer-events-none"
        style={{ 
          backgroundImage: `url('/header-bg.png')`,
          backgroundSize: 'auto 100%',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          maskImage: 'linear-gradient(to right, transparent, black 15%, black 85%, transparent)',
          WebkitMaskImage: 'linear-gradient(to right, transparent, black 15%, black 85%, transparent)',
          opacity: 0.5
        }}
      ></div>

      {/* Decorative top border glow effect */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-yellow-500/50 to-transparent z-10"></div>




      {/* Left container for social links */}
      <div className="hidden md:flex flex-wrap 2xl:flex-nowrap items-center justify-center lg:justify-start gap-1.5 2xl:gap-3 order-2 lg:order-1 min-w-0 w-full lg:max-w-[380px] 2xl:max-w-none relative z-10">
        <a
          href="https://discord.gg/8Tx2YdXrEu"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-3 py-2 glass rounded-lg border border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/20 transition-all text-[11px] xl:text-[13px] font-bold uppercase tracking-wider group active:scale-95 duration-300"
          title="Unisci al Discord di Aoeitalia"
        >
          <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.874.893.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.419-2.157 2.419zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.419-2.157 2.419z"/>
          </svg>
          <span className="hidden sm:inline">Discord</span>
        </a>
        <Link
          to="/faq"
          className="flex items-center gap-2 px-3 py-2 glass rounded-lg border border-sky-500/30 text-sky-400 hover:bg-sky-500/20 transition-all text-[11px] xl:text-[13px] font-bold uppercase tracking-wider group active:scale-95 duration-300"
        >
          <HelpCircle size={14} />
          <span className="hidden sm:inline">FAQ</span>
        </Link>
        <a
          href="https://ko-fi.com/marcotamby"
          target="_blank"
          className="flex items-center gap-2 px-3 py-2 glass rounded-lg border border-rose-500/30 text-rose-400 hover:bg-rose-500/20 transition-all text-[11px] xl:text-[13px] font-bold uppercase tracking-wider group active:scale-95 duration-300"
        >
          <Coffee size={14} />
          <span className="hidden sm:inline">Sostieni</span>
        </a>
        <Link
          to="/tornei"
          className="flex items-center gap-2 px-3 py-2 glass rounded-lg border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 transition-all text-[11px] xl:text-[13px] font-bold uppercase tracking-wider group active:scale-95 duration-300"
        >
          <Trophy size={14} />
          <span className="hidden sm:inline">Tornei</span>
        </Link>
        {(isAdmin || isStreamer) && user?.email !== 'alessio.bella97@gmail.com' && (
          <button
            onClick={onOpenAdminOverlay}
            className="flex items-center gap-2 px-3 py-2 glass rounded-lg border border-fuchsia-500/30 text-fuchsia-400 hover:bg-fuchsia-500/20 transition-all text-[11px] xl:text-[13px] font-bold uppercase tracking-wider group active:scale-95 duration-300"
            title="Gestione Overlay Stream"
          >
            <Monitor size={14} />
            <span className="hidden sm:inline">Stream</span>
          </button>
        )}
      </div>

      {/* Center Title Area */}
      <Link 
        to="/" 
        className="flex flex-col items-center justify-center text-center w-full order-1 lg:order-2 group cursor-pointer hover:opacity-95 transition-all py-1 px-4 relative z-10"
      >
        <h2 className="text-[10px] md:text-[14px] font-bold text-slate-500 tracking-[0.5em] uppercase mb-1 whitespace-nowrap">
          Age of Empires IV
        </h2>
        
        <h1 className="text-2xl md:text-4xl lg:text-3xl xl:text-4xl 2xl:text-6xl font-sackers font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-slate-200 to-slate-400 drop-shadow-[0_4px_15px_rgba(255,255,255,0.15)] tracking-tight leading-tight px-2 transition-all duration-300">
          Manuale delle Civiltà
        </h1>

        <div className="w-40 md:w-64 h-[1px] bg-gradient-to-r from-transparent via-sky-500/20 to-transparent mt-1 md:mt-3 mb-2 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-sky-400/60 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-in-out"></div>
        </div>
        
        <p className="text-[10px] md:text-xs text-slate-400 italic hidden md:block font-medium tracking-wide">
          Il portale italiano dedicato alle guide di AoE IV
        </p>
      </Link>

      {/* Auth / Right side */}
      <div className="flex items-center justify-center lg:justify-end order-3 min-w-0 relative z-10">
        {isAuthenticated ? (
          <div className="flex flex-col items-end gap-4 md:translate-y-1">
            <div className="flex items-center gap-3 md:gap-4 font-sans">
              <button
                onClick={() => {
                  (window as any).openProfileModal?.();
                  (window as any).clearNotifications?.();
                }}
                className="relative flex items-center gap-3 text-yellow-500 hover:opacity-80 transition-all group shrink-0 hover:scale-110 hover:-translate-y-1 duration-300 [transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)]"
                title="Il Tuo Profilo"
              >
                <div className="w-10 h-10 rounded-full bg-yellow-500/10 flex items-center justify-center border border-yellow-500/30 group-hover:border-yellow-500/60 transition-colors overflow-hidden relative">
                  {user?.avatar_url ? (
                    <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                  ) : user?.rank && user.rank !== 'Unranked' ? (
                    <img src={RANK_ICONS[user.rank]} alt={user.rank} className="w-7 h-7 object-contain" />
                  ) : (
                    <User size={18} />
                  )}
                </div>
                {notificationCount > 0 && (
                  <span className="absolute -top-1 -right-1 z-10 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[9px] font-black text-white shadow-[0_0_10px_rgba(220,38,38,0.5)] group-hover:scale-110 transition-transform ring-2 ring-[#0d1424]">
                    {notificationCount}
                  </span>
                )}
                <div className="flex flex-col text-left">
                  <span className="font-bold hidden md:block text-xs leading-none text-white/90 uppercase tracking-widest">Il Tuo Profilo</span>
                  <span className="text-[10px] text-yellow-600 font-bold uppercase tracking-widest leading-none mt-1">{isAdmin || isSuperAdmin ? 'Owner' : isStreamer ? 'Streamer' : 'Utente'}</span>
                </div>
              </button>

              {isAdmin && (
                <button
                  onClick={onOpenAdminDashboard}
                  className="relative text-[12px] md:text-sm text-yellow-500 hover:text-white transition-all border border-yellow-500/20 px-4 py-2.5 rounded-lg hover:bg-yellow-500/10 font-bold tracking-widest uppercase flex items-center gap-2 shrink-0 hover:scale-110 hover:-translate-y-1 duration-300 [transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)]"
                >
                  Pannello
                  {(pendingCount + pendingQaCount) > 0 && (
                    <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white shadow-lg animate-bounce ring-1 ring-[#0d1424]">
                      {pendingCount + pendingQaCount}
                    </span>
                  )}
                </button>
              )}

              <button
                onClick={() => setShowLogoutConfirm(true)}
                className="text-[12px] md:text-sm text-gray-400 hover:text-white transition-colors border border-white/10 px-4 py-2.5 rounded-lg hover:bg-white/5 font-bold tracking-widest uppercase shrink-0"
              >
                Esci
              </button>
            </div>

            {/* Presence Indicators (Stacked below buttons) */}
            <div className="flex items-center gap-2">
              {/* Users Online */}
              <div className="relative group z-[101]">
                <div className="hidden md:flex items-center gap-2 px-2.5 py-1.5 bg-slate-500/10 rounded-full border border-slate-500/30 shadow-[0_0_10px_rgba(148,163,184,0.1)] shrink-0 whitespace-nowrap cursor-help transition-all group-hover:bg-slate-500/20 group-hover:border-slate-500/50">
                  <div className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-slate-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-slate-500"></span>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                    {onlineUserCount} {onlineUserCount === 1 ? 'UTENTE' : 'UTENTI'} ONLINE
                  </span>
                </div>

                {/* Users Presence Tooltip */}
                <div className="absolute top-full right-0 mt-2 w-56 bg-[#111827] border border-slate-500/30 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-300 transform translate-y-2 group-hover:translate-y-0 z-[200] overflow-hidden">
                  <div className="p-3 border-b border-white/10 bg-slate-500/5">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Community Online</h4>
                  </div>
                  <div className="p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-gray-500 uppercase">Totale</span>
                      <span className="text-xs font-black text-white">{onlineUserCount}</span>
                    </div>
                    {Object.entries(usersByPage).map(([page, count]) => {
                      if (page === 'other' || count === 0) return null;
                      const civName = civilizations.find(c => c.id === page)?.name;
                      return (
                        <div key={page} className="flex items-center justify-between text-[10px]">
                          <span className="text-gray-400 truncate pr-2 uppercase font-medium">{civName || page}</span>
                          <span className="text-slate-400 font-bold">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Admin Live indicator */}
              {Object.keys(_activeAdmins).length > 0 && (isAdmin || isStreamer) && (
                <div className="relative group z-[101]">
                  <div className="hidden md:flex items-center gap-2 px-2.5 py-1.5 bg-yellow-500/10 rounded-full border border-yellow-500/30 shadow-[0_0_10px_rgba(212,175,55,0.1)] shrink-0 whitespace-nowrap cursor-help transition-all group-hover:bg-yellow-500/20 group-hover:border-yellow-500/50">
                    <div className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-yellow-500"></span>
                    </div>
                    <span className="text-[10px] font-bold text-yellow-500 uppercase tracking-widest leading-none">
                      {Object.keys(_activeAdmins).length} {Object.keys(_activeAdmins).length === 1 ? 'Admin' : 'Admins'} LIVE
                    </span>
                  </div>

                  {/* Presence Tooltip */}
                  <div className="absolute top-full right-0 mt-2 w-64 bg-[#111827] border border-yellow-500/30 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-all duration-300 transform translate-y-2 group-hover:translate-y-0 z-[200] overflow-hidden">
                    <div className="p-3 border-b border-white/10 bg-yellow-500/5">
                      <h4 className="text-[10px] font-black text-yellow-500 uppercase tracking-[0.2em]">Staff Online</h4>
                    </div>
                    <div className="p-2 space-y-1 max-h-60 overflow-y-auto custom-scrollbar">
                      {Object.values(_activeAdmins).map((admin, idx) => {
                        const activityCiv = admin.activity?.civId 
                          ? civilizations.find(c => c.id === admin.activity.civId)?.name 
                          : admin.activity?.section 
                            ? admin.activity.section.charAt(0).toUpperCase() + admin.activity.section.slice(1)
                            : null;
                        
                        return (
                          <div key={idx} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors">
                            <div className="w-8 h-8 rounded-full border border-yellow-500/20 overflow-hidden bg-yellow-500/5 shrink-0">
                              {admin.user.avatar ? (
                                <img src={admin.user.avatar || undefined} alt={admin.user.name || ''} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <User size={14} className="text-yellow-500/50" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-white truncate uppercase tracking-tighter">
                                {admin.user.nickname || admin.user.name}
                              </p>
                              <p className="text-[10px] text-gray-400 truncate flex items-center gap-1.5 font-medium italic">
                                {admin.activity.type === 'editing' ? (
                                  <><span className="w-1 h-1 rounded-full bg-red-500 animate-pulse"></span> In modifica: {activityCiv || '...'} {admin.activity.section && admin.activity.section !== 'all' ? <span className="opacity-60">({admin.activity.section})</span> : ''}</>
                                ) : admin.activity.type === 'viewing' ? (
                                  <><span className="w-1 h-1 rounded-full bg-blue-400"></span> Visualizza: {activityCiv || '...'}</>
                                ) : (
                                  <><span className="w-1 h-1 rounded-full bg-gray-600"></span> Attivo</>
                                )}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <button
            onClick={() => openLoginModal()}
            className="flex items-center gap-2 px-6 py-2 bg-yellow-600/10 hover:bg-yellow-600/20 text-yellow-500 font-bold rounded-lg border border-yellow-500/30 transition-all shadow-[0_0_15px_rgba(212,175,55,0.1)] hover:shadow-[0_0_20px_rgba(212,175,55,0.2)] uppercase text-xs tracking-widest hover:scale-110 hover:-translate-y-1 duration-300 [transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)]"
          >
            <User size={14} />
            Accedi
          </button>
        )}
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#1a1c23] border border-red-500/30 p-8 rounded-3xl max-w-sm w-full shadow-2xl animate-in zoom-in duration-300 text-center">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/20">
              <LogOut className="text-red-500" size={32} />
            </div>
            <h3 className="text-xl font-bold text-white mb-2 uppercase tracking-tight">Esci dall'Account</h3>
            <p className="text-sm text-gray-400 mb-8 leading-relaxed">
              Sei sicuro di voler uscire? Dovrai effettuare nuovamente l'accesso per interagire con la community.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 px-4 py-2.5 border border-white/10 text-gray-400 rounded-xl hover:bg-white/5 transition-colors font-bold text-xs uppercase"
              >
                Annulla
              </button>
              <button
                onClick={() => {
                  logout();
                  setShowLogoutConfirm(false);
                }}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl transition-all font-bold text-xs uppercase shadow-lg shadow-red-600/20 flex items-center justify-center gap-2"
              >
                Esci Ora
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
