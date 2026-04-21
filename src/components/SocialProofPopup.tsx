import { useState, useEffect } from 'react';
import { Heart, X, Users, Bell } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './AuthContext';

interface SocialProofPopupProps {
  civId: string;
  civName: string;
  onFollow: () => void;
}

export function SocialProofPopup({ civId, civName, onFollow }: SocialProofPopupProps) {
  const { favorites } = useAuth();
  const [isVisible, setIsVisible] = useState(false);
  const [favoriteCount, setFavoriteCount] = useState<number | null>(null);

  useEffect(() => {
    // Determine if we should show the popup
    const alreadyFavorited = favorites.includes(civId);
    const sessionDismissed = sessionStorage.getItem(`social_proof_dismissed_${civId}`);
    
    if (alreadyFavorited || sessionDismissed) {
      setIsVisible(false);
      return;
    }

    // Fetch favorite count
    const fetchFavoriteCount = async () => {
      try {
        const { count, error } = await supabase
          .from('user_favorites')
          .select('*', { count: 'exact', head: true })
          .eq('civ_id', civId);

        if (!error && count !== null) {
          setFavoriteCount(count);
          // Show popup after a delay
          const timer = setTimeout(() => setIsVisible(true), 3000);
          return () => clearTimeout(timer);
        }
      } catch (err) {
        console.error('Error fetching favorite count:', err);
      }
    };

    fetchFavoriteCount();
  }, [civId, favorites]);

  const handleDismiss = () => {
    setIsVisible(false);
    sessionStorage.setItem(`social_proof_dismissed_${civId}`, 'true');
  };

  const handleFollow = () => {
    onFollow();
    setIsVisible(false);
    sessionStorage.setItem(`social_proof_dismissed_${civId}`, 'true');
  };

  if (!isVisible || favoriteCount === null || favoriteCount < 1) return null;

  return (
    <div className="fixed bottom-20 sm:bottom-24 left-1/2 -translate-x-1/2 sm:left-auto sm:translate-x-0 sm:right-4 z-50 animate-in slide-in-from-bottom-10 sm:slide-in-from-right-10 fade-in duration-700 w-[calc(100%-32px)] sm:w-auto sm:max-w-md">
      <div className="glass-premium p-3 sm:p-5 rounded-2xl border border-slate-400/40 shadow-[0_10px_40px_rgba(0,0,0,0.4),0_0_20px_rgba(148,163,184,0.15)] relative overflow-hidden group">
        {/* Decorative background silver glow */}
        <div className="absolute top-0 right-0 w-16 h-16 bg-slate-400/10 blur-2xl rounded-full -mr-8 -mt-8 animate-pulse"></div>
        
        <button 
          onClick={handleDismiss}
          className="absolute top-1 right-1 p-1.5 text-gray-500 hover:text-white transition-colors z-10 sm:top-2 sm:right-3"
        >
          <X size={14} />
        </button>

        <div className="flex items-center gap-2 sm:gap-6 pr-8 sm:pr-10">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-slate-500/20 border border-slate-400/30 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(148,163,184,0.2)]">
            <Heart size={18} className="text-slate-300 fill-slate-300/20 group-hover:scale-110 transition-transform" />
          </div>
          
          <div className="flex-1 min-w-0 pr-2 sm:pr-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Community</span>
              <div className="h-1 w-1 rounded-full bg-slate-600"></div>
              <Users size={10} className="text-gray-500" />
            </div>
            
            <p className="text-[11px] sm:text-sm text-gray-200 leading-tight">
              <span className="font-bold text-white">{favoriteCount} {favoriteCount === 1 ? 'utente' : 'utenti'}</span> hanno scelto i <span className="text-slate-200 font-bold">{civName}</span>! 
            </p>
          </div>

          <button
            onClick={handleFollow}
            className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 bg-slate-700/30 hover:bg-slate-700/50 border border-slate-500/40 rounded-xl text-[10px] sm:text-[11px] font-black text-slate-200 transition-all active:scale-95 shrink-0 shadow-sm"
          >
            <Bell size={11} className="shrink-0" />
            <span>SEGUI QUESTA CIV!</span>
          </button>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .glass-premium {
          background: rgba(15, 20, 35, 0.85);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
        }
      `}} />
    </div>
  );
}
