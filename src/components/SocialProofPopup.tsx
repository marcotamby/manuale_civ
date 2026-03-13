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
    <div className="fixed bottom-20 sm:bottom-24 left-1/2 -translate-x-1/2 sm:left-auto sm:translate-x-0 sm:right-4 z-50 animate-in slide-in-from-bottom-10 sm:slide-in-from-right-10 fade-in duration-700 w-[calc(100%-32px)] sm:w-auto sm:max-w-xs">
      <div className="glass-premium p-3 sm:p-4 rounded-2xl border border-yellow-500/30 shadow-[0_10px_40px_rgba(0,0,0,0.4),0_0_20px_rgba(234,179,8,0.1)] relative overflow-hidden group">
        {/* Decorative background glow */}
        <div className="absolute top-0 right-0 w-16 h-16 bg-yellow-500/10 blur-2xl rounded-full -mr-8 -mt-8 animate-pulse"></div>
        
        <button 
          onClick={handleDismiss}
          className="absolute top-2 right-2 p-1 text-gray-500 hover:text-white transition-colors z-10"
        >
          <X size={14} />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-yellow-500/20 border border-yellow-500/30 flex items-center justify-center shrink-0">
            <Heart size={20} className="text-yellow-500 fill-yellow-500/20 group-hover:scale-110 transition-transform" />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-[10px] font-black text-yellow-500 uppercase tracking-widest">Community</span>
              <div className="h-1 w-1 rounded-full bg-gray-600"></div>
              <Users size={10} className="text-gray-500" />
            </div>
            
            <p className="text-xs sm:text-sm text-gray-200 leading-tight">
              <span className="font-bold text-white">{favoriteCount} {favoriteCount === 1 ? 'utente' : 'utenti'}</span> hanno scelto i <span className="text-yellow-400 font-bold">{civName}</span>! 
              <span className="hidden sm:inline text-[11px] text-gray-400 ml-2 italic">Seguila anche tu!</span>
            </p>
          </div>

          <button
            onClick={handleFollow}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-600/20 hover:bg-yellow-600/30 border border-yellow-500/40 rounded-xl text-[10px] font-black text-yellow-500 transition-all active:scale-95 shrink-0"
          >
            <Bell size={12} className="shrink-0" />
            <span className="hidden xs:inline">SEGUI</span>
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
