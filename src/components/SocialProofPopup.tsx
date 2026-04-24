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
    <div className="fixed bottom-20 sm:bottom-24 left-1/2 -translate-x-1/2 sm:left-auto sm:translate-x-0 sm:right-4 z-50 animate-in slide-in-from-bottom-10 sm:slide-in-from-right-10 fade-in duration-700 w-[calc(100%-32px)] sm:w-56">
      <div className="glass-premium p-3 sm:p-6 rounded-[2rem] border border-slate-400/30 shadow-[0_10px_50px_rgba(0,0,0,0.6),0_0_20px_rgba(30,58,138,0.1)] relative overflow-hidden group">
        {/* Decorative background glows */}
        <div className="absolute top-0 right-0 w-20 h-20 bg-blue-600/10 blur-3xl rounded-full -mr-10 -mt-10 animate-pulse"></div>
        <div className="absolute bottom-0 left-0 w-16 h-16 bg-slate-400/5 blur-2xl rounded-full -ml-8 -mb-8"></div>
        
        <button 
          onClick={handleDismiss}
          className="absolute top-1 right-1 p-1.5 text-gray-500 hover:text-white transition-colors z-20 sm:top-3.5 sm:right-3.5"
        >
          <X size={22} className="sm:w-5.5 sm:h-5.5" />
        </button>

        <div className="flex items-center sm:flex-col gap-3 sm:gap-4 pr-10 sm:pr-0">
          <div className="w-9 h-9 sm:w-14 sm:h-14 rounded-full bg-blue-500/10 border border-blue-400/20 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(37,99,235,0.1)] relative sm:static">
            <Heart size={20} className="text-blue-300 fill-blue-300/10 group-hover:scale-110 transition-transform sm:w-7 sm:h-7" />
          </div>
          
          <div className="flex-1 min-w-0 pr-2 sm:pr-0 sm:w-full">
            <div className="relative h-4 mb-1 flex items-center justify-center">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Community</span>
              <div className="hidden sm:flex items-center gap-1.5 absolute right-0">
                <div className="h-1 w-1 rounded-full bg-blue-600/50"></div>
                <Users size={10} className="text-blue-500/50" />
              </div>
            </div>
            
            <div className="sm:text-center space-y-0.5">
              <p className="text-white font-bold text-base sm:text-lg leading-none">
                {favoriteCount} {favoriteCount === 1 ? 'persona' : 'persone'}
              </p>
              <p className="text-[11px] sm:text-[11px] text-gray-400 font-medium leading-tight">
                {favoriteCount === 1 ? ' ha scelto ' : ' hanno scelto '}
                {(() => {
                  const n = civName.toLowerCase();
                  if (/^[aeiou]/.test(n) || n.startsWith('z') || n.startsWith('ps') || n.startsWith('gn') || (n.startsWith('s') && !/^[aeiou]/.test(n[1]))) {
                    return 'gli ';
                  }
                  return 'i ';
                })()}
                <span className="text-blue-200 font-bold">{civName}</span>! 
              </p>
            </div>
          </div>

          <button
            onClick={handleFollow}
            className="relative flex items-center justify-center px-2.5 sm:px-5 py-1.5 sm:py-2.5 bg-blue-700/20 hover:bg-blue-700/40 border border-blue-500/30 rounded-xl text-[10px] sm:text-xs font-black text-blue-200 transition-all active:scale-95 shrink-0 shadow-sm sm:w-full mt-2 sm:mt-0 overflow-hidden"
          >
            <Bell size={12} className="shrink-0 sm:absolute sm:left-3" />
            <span className="sm:w-full text-center">SEGUI QUESTA CIV!</span>
          </button>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .glass-premium {
          background: linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(10, 15, 30, 0.9) 100%);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
        }
      `}} />
    </div>
  );
}
