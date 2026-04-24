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
    <div className="fixed bottom-20 sm:bottom-24 left-1/2 -translate-x-1/2 sm:left-auto sm:translate-x-0 sm:right-4 z-50 animate-in slide-in-from-bottom-10 sm:slide-in-from-right-10 fade-in duration-700 w-[calc(100%-32px)] sm:w-64">
      <div className="glass-premium p-3 sm:p-8 rounded-[2rem] border border-slate-400/40 shadow-[0_10px_50px_rgba(0,0,0,0.5),0_0_20px_rgba(148,163,184,0.1)] relative overflow-hidden group">
        {/* Decorative background silver glow */}
        <div className="absolute top-0 right-0 w-24 h-24 bg-slate-400/10 blur-3xl rounded-full -mr-12 -mt-12 animate-pulse"></div>
        
        <button 
          onClick={handleDismiss}
          className="absolute top-1 right-1 p-1.5 text-gray-500 hover:text-white transition-colors z-10 sm:top-4 sm:right-4"
        >
          <X size={14} />
        </button>

        <div className="flex items-center sm:flex-col gap-2 sm:gap-5 pr-8 sm:pr-0">
          <div className="w-9 h-9 sm:w-16 sm:h-16 rounded-full bg-slate-500/20 border border-slate-400/30 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(148,163,184,0.2)]">
            <Heart size={20} className="text-slate-300 fill-slate-300/20 group-hover:scale-110 transition-transform sm:w-8 sm:h-8" />
          </div>
          
          <div className="flex-1 min-w-0 pr-2 sm:pr-0 sm:text-center">
            <div className="flex items-center sm:justify-center gap-1.5 mb-1">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Community</span>
              <div className="h-1 w-1 rounded-full bg-slate-600"></div>
              <Users size={10} className="text-gray-500" />
            </div>
            
            <p className="text-[11px] sm:text-sm text-gray-200 leading-tight">
              <span className="font-bold text-white text-base sm:block sm:text-lg">{favoriteCount} {favoriteCount === 1 ? 'utente' : 'utenti'}</span> 
              <span className="sm:text-xs text-gray-400 font-medium">hanno scelto i </span>
              <span className="text-slate-200 font-bold sm:text-xs">{civName}</span>! 
            </p>
          </div>

          <button
            onClick={handleFollow}
            className="flex items-center gap-1 sm:gap-2 px-2.5 sm:px-5 py-1.5 sm:py-3 bg-slate-700/30 hover:bg-slate-700/50 border border-slate-500/40 rounded-xl text-[10px] sm:text-xs font-black text-slate-200 transition-all active:scale-95 shrink-0 shadow-sm sm:w-full justify-center mt-2 sm:mt-0"
          >
            <Bell size={12} className="shrink-0" />
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
