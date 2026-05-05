import { User } from 'lucide-react';
import { useAuth } from './AuthContext';
import { useCivData } from './CivContext';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Link, useLocation } from 'react-router-dom';
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
  isHome?: boolean;
}

export function Topbar({ onOpenAdminDashboard, onOpenAdminOverlay, isHome }: TopbarProps) {
  const { isAuthenticated, isAdmin, isSuperAdmin, isStreamer, user, logout, openLoginModal, favorites } = useAuth();
  const { civilizations } = useCivData();
  const { activeAdmins: _activeAdmins, onlineUserCount, usersByPage } = usePresence();
  const [pendingCount, setPendingCount] = useState(0);
  const [pendingQaCount, setPendingQaCount] = useState(0);
  const [notificationCount, setNotificationCount] = useState(0);
  const [qaUnreadCount, setQaUnreadCount] = useState(0);
  const [betUnreadCount, setBetUnreadCount] = useState(0);
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

  const fetchQaUnreadCount = async () => {
    if (!isAuthenticated || !user?.email) {
      setQaUnreadCount(0);
      return;
    }

    try {
      const { data: myQs } = await supabase
        .from('questions')
        .select('id, status')
        .eq('user_id', user.email);
      
      if (!myQs) return;

      const seenIds = JSON.parse(localStorage.getItem(`seenQaNotifs_${user.email.toLowerCase()}`) || '[]');
      let unread = 0;

      myQs.forEach(q => {
        if (q.status === 'approved' && !seenIds.includes(`appr_${q.id}`)) unread++;
      });

      const myQIds = myQs.map(q => q.id);
      if (myQIds.length > 0) {
        const { data: replies } = await supabase
          .from('answers')
          .select('id, question_id')
          .in('question_id', myQIds)
          .neq('user_id', user.email)
          .eq('status', 'approved');
        
        if (replies) {
          replies.forEach(r => {
            if (!seenIds.includes(`repl_${r.id}`)) unread++;
          });
        }
      }
      setQaUnreadCount(unread);
    } catch (e) {
      console.error('Error fetching Q&A notifications:', e);
    }
  };

  const fetchBetUnreadCount = async () => {
    if (!isAuthenticated || !user?.email) {
      setBetUnreadCount(0);
      return;
    }

    try {
      const email = user.email.toLowerCase().trim();
      
      // DEBUG: Vediamo TUTTE le notifiche esistenti per capire cosa c'è nel DB
      const { data: allNotifs, error: debugError } = await supabase
        .from('betting_notifications')
        .select('*')
        .limit(10);
      
      console.log('🚨 DEBUG - TUTTE LE NOTIFICHE NEL DB:', allNotifs);
      if (debugError) console.error('🚨 DEBUG - ERRORE DB:', debugError);

      const { count, error } = await supabase
        .from('betting_notifications')
        .select('*', { count: 'exact', head: true })
        .ilike('user_email', `%${email}%`)
        .eq('is_read', false); 
      
      console.log('📊 CONTEGGIO FINALE PER', email, ':', count);
      
      if (!error) {
        setBetUnreadCount(count || 0);
      } else {
        console.error('❌ NOTIFICATION ERROR:', error);
      }
    } catch (e) {
      console.error('Error fetching betting notifications:', e);
    }
  };

  const calculateNotifications = () => {
    if (!isAuthenticated || !user?.email) {
      setNotificationCount(0);
      return;
    }

    const lastSeenKey = `lastSeenCounts_${user.email.toLowerCase()}`;
    const rawData = localStorage.getItem(lastSeenKey);
    const lastSeenData = rawData ? JSON.parse(rawData) : {};
    
    let totalUnread = 0;
    if (favorites.length > 0) {
        favorites.forEach(favId => {
          const civ = civilizations.find(c => c.id === favId);
          if (civ) {
            const stored = lastSeenData[favId] || { bo: 0, video: 0 };
            const currentBO = civ.buildOrders?.length || 0;
            const currentVideo = civ.videos?.length || 0;
    
            const storedBO = typeof stored.bo === 'number' ? stored.bo : 0;
            const storedVideo = typeof stored.video === 'number' ? stored.video : 0;
    
            if (currentBO > storedBO) totalUnread += (currentBO - storedBO);
            if (currentVideo > storedVideo) totalUnread += (currentVideo - storedVideo);
          }
        });
    }
    
    setNotificationCount(totalUnread + qaUnreadCount + betUnreadCount);
  };

  useEffect(() => {
    fetchQaUnreadCount();
    fetchBetUnreadCount();
  }, [isAuthenticated, user?.email, user?.id, civilizations, refreshTrigger]);

  useEffect(() => {
    calculateNotifications();

    (window as any).refreshNotificationCount = () => {
      fetchPendingCount();
      fetchQaUnreadCount();
      fetchBetUnreadCount();
      setRefreshTrigger(prev => prev + 1);
    };

    return () => {
      (window as any).refreshNotificationCount = undefined;
    };
  }, [favorites, civilizations, isAuthenticated, user?.email, refreshTrigger, qaUnreadCount, betUnreadCount]);

  const location = useLocation();
  console.log('💎 TOPBAR RENDER - Notification Count:', notificationCount);
  const isSpecialPage = isHome || location.pathname.includes('/tornei') || location.pathname === '/faq' || location.pathname === '/privacy' || location.pathname.startsWith('/civ/') || location.pathname.startsWith('/compare');

  return (
    <div className="w-full flex flex-col shrink-0 z-[100] relative select-none">
      
      {/* 1. Desktop Utility Topbar (PC Only) */}
      <div className="hidden lg:flex h-12 w-full bg-[#070b14] border-b border-white/5 items-center justify-between px-20 z-[110] relative">
         {/* Left Side: Navigation & Social */}
         <div className="flex items-center gap-4">
            <a
              href="https://discord.gg/8Tx2YdXrEu"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-indigo-400 hover:text-indigo-300 transition-colors text-[13px] font-bold uppercase tracking-wider group"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.874.893.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.078.078 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.419-2.157 2.419zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.419-2.157 2.419z"/>
              </svg>
              Discord
            </a>
            <div className="w-px h-3 bg-white/10"></div>
            <Link to="/tornei" className="flex items-center gap-2 text-emerald-400 hover:text-emerald-300 transition-colors text-[13px] font-bold uppercase tracking-wider">
              <Trophy size={14} /> Tornei
            </Link>
            <div className="w-px h-3 bg-white/10"></div>
            <Link to="/faq" className="flex items-center gap-2 text-sky-400 hover:text-sky-300 transition-colors text-[13px] font-bold uppercase tracking-wider">
              <HelpCircle size={14} /> FAQ
            </Link>
            <div className="w-px h-3 bg-white/10"></div>
            <a href="https://ko-fi.com/marcotamby" target="_blank" className="flex items-center gap-2 text-rose-400 hover:text-rose-300 transition-colors text-[13px] font-bold uppercase tracking-wider">
              <Coffee size={14} /> Sostieni
            </a>
            {(isAdmin || isStreamer) && user?.email !== 'alessio.bella97@gmail.com' && (
              <>
                <div className="w-px h-3 bg-white/10"></div>
                <button onClick={onOpenAdminOverlay} className="flex items-center gap-2 text-fuchsia-400 hover:text-fuchsia-300 transition-colors text-[13px] font-bold uppercase tracking-wider">
                  <Monitor size={14} /> Stream
                </button>
              </>
            )}
         </div>

         {/* Right Side: Auth & Presence */}
         <div className="flex items-center gap-6">
            {/* Online Stats */}
            <div className="flex items-center gap-4 mr-2">
              {/* Users Online */}
              <div className="relative group cursor-help py-3">
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-slate-500 shadow-[0_0_8px_rgba(148,163,184,0.5)]"></div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{onlineUserCount} Online</span>
                </div>

                {/* Tooltip */}
                <div className="absolute top-full right-0 mt-0 w-56 bg-[#111827] border border-slate-500/30 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-300 transform translate-y-1 group-hover:translate-y-0 z-[200] overflow-hidden">
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

              {/* Admins Live */}
              {Object.keys(_activeAdmins).length > 0 && (isAdmin || isStreamer) && (
                <div className="relative group cursor-help py-3">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.5)] animate-pulse"></div>
                    <span className="text-[11px] font-bold text-yellow-500 uppercase tracking-widest">{Object.keys(_activeAdmins).length} Admin Live</span>
                  </div>

                  {/* Tooltip */}
                  <div className="absolute top-full right-0 mt-0 w-64 bg-[#111827] border border-yellow-500/30 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-all duration-300 transform translate-y-1 group-hover:translate-y-0 z-[200] overflow-hidden">
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
                                  <><span className="w-1 h-1 rounded-full bg-red-500 animate-pulse"></span> Editing: {activityCiv || '...'}</>
                                ) : admin.activity.type === 'viewing' ? (
                                  <><span className="w-1 h-1 rounded-full bg-blue-400"></span> Viewing: {activityCiv || '...'}</>
                                ) : (
                                  <><span className="w-1 h-1 rounded-full bg-gray-600"></span> Online</>
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

            {/* Sheep Balance (PC) */}
            {isAuthenticated && (
              <div className="flex items-center gap-2 bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20">
                <span className="text-[11px] font-black text-white">{user?.sheep_balance ?? 100}</span>
                <span className="text-xs">🐑</span>
              </div>
            )}

            {/* Profile / Auth */}
            {isAuthenticated ? (
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => {
                    (window as any).openProfileModal?.();
                    (window as any).clearNotifications?.();
                  }}
                  className="relative flex items-center gap-2 hover:opacity-80 transition-all group"
                >
                  <div className="w-7 h-7 rounded-full bg-yellow-500/10 flex items-center justify-center border border-yellow-500/30 overflow-hidden relative">
                    {user?.avatar_url ? <img src={user.avatar_url} alt="" className="w-full h-full object-cover" /> : <User size={14} className="text-yellow-500" />}
                  </div>
                  {notificationCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 z-50 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-red-600 text-[9px] font-bold text-white shadow-[0_0_10px_rgba(220,38,38,0.4)] ring-2 ring-[#0d1424]">
                      {notificationCount}
                    </span>
                  )}
                  <span className="text-[11px] font-bold text-white uppercase tracking-widest">{user?.nickname || 'Profilo'}</span>
                </button>

                {isAdmin && (
                  <button onClick={onOpenAdminDashboard} className="relative text-[11px] bg-yellow-500/10 text-yellow-500 border border-yellow-500/30 px-3 py-1 rounded-md font-black uppercase tracking-widest hover:bg-yellow-500 hover:text-black transition-all">
                    Pannello
                    {(pendingCount + pendingQaCount) > 0 && <span className="absolute -top-1 -right-1 flex h-3 w-3 items-center justify-center rounded-full bg-red-600 text-[8px] font-black text-white shadow-lg ring-1 ring-black">{pendingCount + pendingQaCount}</span>}
                  </button>
                )}

                <button onClick={() => setShowLogoutConfirm(true)} className="text-[11px] text-gray-500 hover:text-white transition-colors font-bold uppercase tracking-widest">
                  Esci
                </button>
              </div>
            ) : (
              <button onClick={() => openLoginModal()} className="text-[11px] bg-yellow-600/10 text-yellow-500 border border-yellow-500/30 px-4 py-1.5 rounded-lg font-bold uppercase tracking-widest hover:bg-yellow-500 hover:text-black transition-all">
                Accedi
              </button>
            )}
         </div>
      </div>

      {/* 2. Main Header (Title Row) */}
      <div className={`w-full ${isSpecialPage ? 'lg:bg-transparent lg:border-b-0 lg:shadow-none' : 'bg-[#0d1424]/80 backdrop-blur-md border-b border-yellow-500/20 shadow-[0_4px_20px_rgba(0,0,0,0.5)]'} flex flex-col items-center px-4 py-3 md:px-14 md:py-4 lg:px-20 lg:pt-6 lg:pb-0 z-[100] shrink-0 gap-3 md:gap-4 relative`}>
        
        {/* Dynamic Background Layer */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          <div 
            className={`absolute inset-0 ${isSpecialPage ? 'lg:hidden' : ''}`}
            style={{ 
              backgroundImage: `linear-gradient(to bottom, rgba(13, 20, 36, 0) 0%, #0d1424 100%), url('/header-bg.png')`,
              backgroundSize: 'cover',
              backgroundPosition: 'center 35%',
              opacity: 0.8 
            }}
          ></div>
        </div>

        {/* Decorative top border glow effect - Only for non-utility part on desktop or full on mobile */}
        <div className="lg:hidden absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-yellow-500/50 to-transparent z-10"></div>



      {/* Center Title Area */}
      <Link 
        to="/" 
        className="flex flex-col items-center justify-center text-center w-full order-1 lg:order-2 group cursor-pointer hover:opacity-95 transition-all pt-6 md:pt-1 pb-1 px-4 relative z-10"
      >
        <h2 className="text-[14px] md:text-[14px] font-bold text-slate-400 tracking-[0.7em] md:tracking-[0.5em] uppercase mb-1 whitespace-nowrap">
          <span className="bg-black/30 backdrop-blur-sm px-4 py-0.5 rounded-full md:bg-transparent md:backdrop-blur-none md:px-0">
            Age of Empires IV
          </span>
        </h2>
        
        <h1 className="text-4xl md:text-4xl lg:text-3xl xl:text-4xl 2xl:text-6xl font-sackers font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-slate-200 to-slate-400 drop-shadow-[0_4px_15px_rgba(255,255,255,0.15)] tracking-[0.1em] md:tracking-tighter leading-tight px-2 transition-all duration-300">
          <span className="block md:inline">Manuale</span>
          <span className="block md:inline md:ml-3">delle Civiltà</span>
        </h1>

        <div className="w-40 md:w-64 h-[1px] bg-gradient-to-r from-transparent via-sky-500/20 to-transparent mt-1 md:mt-3 mb-2 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-sky-400/60 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-in-out"></div>
        </div>
        
        <p className="text-[10px] md:text-xs text-slate-400 italic hidden md:block font-medium tracking-wide">
          Il portale italiano dedicato alle guide di AoE IV
        </p>
      </Link>

      {/* Auth / Right side */}
        {/* Mobile-only Auth / Right side - Hidden on Desktop */}
        <div className="lg:hidden flex items-center justify-between w-full order-3 min-w-0 relative z-10 py-4">
          {isAuthenticated ? (
            <>
              <div className="flex items-center gap-2">
                {/* 1. Pannello (Admin only) */}
                {isAdmin && (
                  <button 
                    onClick={onOpenAdminDashboard} 
                    className="h-10 px-3 bg-[#0d1424] rounded-xl border border-yellow-500/30 text-yellow-500 text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all shadow-lg"
                  >
                    Pannello
                  </button>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                {/* Sheep Balance (Mobile) */}
                <div className="flex items-center gap-1.5 bg-blue-500/10 px-2.5 py-1.5 rounded-xl border border-blue-500/20 shadow-lg">
                  <span className="text-[10px] font-black text-white leading-none">{user?.sheep_balance ?? 100}</span>
                  <span className="text-xs leading-none">🐑</span>
                </div>

                {/* 2. Profilo */}
                <button 
                  onClick={() => (window as any).openProfileModal?.()} 
                  className="w-10 h-10 bg-[#0d1424] rounded-xl border border-yellow-500/30 flex items-center justify-center active:scale-95 transition-transform shrink-0 shadow-lg"
                >
                  <User size={20} className="text-yellow-500" />
                </button>

                {/* 3. ESCI (Rightmost) */}
                <button 
                  onClick={() => setShowLogoutConfirm(true)}
                  className="h-10 px-4 bg-[#0d1424] rounded-xl border border-yellow-500/30 text-yellow-500 text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all shadow-lg"
                >
                  ESCI
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-end w-full">
              <button 
                onClick={() => openLoginModal()}
                className="h-10 px-6 bg-[#0d1424] rounded-xl border border-yellow-500/30 text-yellow-500 text-[11px] font-black uppercase tracking-widest active:scale-95 transition-all shadow-lg"
              >
                LOGIN
              </button>
            </div>
          )}
        </div>
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
