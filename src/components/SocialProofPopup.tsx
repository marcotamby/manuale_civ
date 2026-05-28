import { useState, useEffect } from 'react';
import { Heart, X, Users, Bell } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './AuthContext';

const getCivArticle = (name: string): string => {
  const articles: Record<string, string> = {
    'Abbasidi': 'gli ',
    'Ayyubidi': 'gli ',
    'Bizantini': 'i ',
    'Cinesi': 'i ',
    'Dinastia di Tughlaq': 'la ',
    'Eredità di Zhu Xi': "l'",
    'Francesi': 'i ',
    'Giapponesi': 'i ',
    "Giovanna d'Arco": '',
    'Inglesi': 'gli ',
    'Knights Templar': 'i ',
    'Lancaster': 'i ',
    'Macedoni': 'i ',
    'Maliani': 'i ',
    'Mongoli': 'i ',
    "Orda d'Oro": "l'",
    'Ordine del Drago': "l'",
    'Ottomani': 'gli ',
    'Rusiani': 'i ',
    'Sacro Romano Impero': 'il ',
    'Sengoku Daimyo': 'i ',
    'Sultanato di Delhi': 'il '
  };
  return articles[name] ?? 'gli ';
};

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
    let isMounted = true;
    let timer: any;

    // Determine if we should show the popup
    const alreadyFavorited = favorites.includes(civId);
    // Use sessionStorage so it can reappear in future visits (new sessions)
    const hasDismissed = sessionStorage.getItem(`social_proof_dismissed_${civId}`);
    
    if (alreadyFavorited || hasDismissed) {
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

        if (isMounted && !error && count !== null && count > 0) {
          setFavoriteCount(count);
          // Show popup after exactly 5 seconds
          timer = setTimeout(() => {
            if (isMounted) setIsVisible(true);
          }, 5000);
        }
      } catch (err) {
        console.error('Error fetching favorite count:', err);
      }
    };

    fetchFavoriteCount();

    return () => {
      isMounted = false;
      if (timer) clearTimeout(timer);
    };
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
    <div className="fixed bottom-[90px] sm:bottom-24 left-1/2 -translate-x-1/2 sm:left-auto sm:translate-x-0 sm:right-4 z-50 animate-in slide-in-from-bottom-10 sm:slide-in-from-right-10 fade-in duration-700 w-[calc(100%-48px)] sm:w-72">
      <div className="glass-premium p-2.5 sm:p-8 rounded-2xl sm:rounded-[2.5rem] border border-slate-400/30 shadow-[0_10px_50px_rgba(0,0,0,0.6),0_0_20px_rgba(30,58,138,0.1)] relative overflow-hidden group">
        {/* Decorative background glows */}
        <div className="absolute top-0 right-0 w-20 h-20 bg-blue-600/10 blur-3xl rounded-full -mr-10 -mt-10 animate-pulse"></div>
        
        <button 
          onClick={handleDismiss}
          className="absolute top-1 right-1 p-1 text-gray-500 hover:text-white transition-colors z-20 sm:top-3.5 sm:right-3.5"
        >
          <X size={16} className="sm:w-5 sm:h-5" />
        </button>

        <div className="flex items-center sm:flex-col gap-2.5 sm:gap-4 pr-6 sm:pr-0">
          <div className="w-8 h-8 sm:w-14 sm:h-14 rounded-full bg-blue-500/10 border border-blue-400/20 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(37,99,235,0.1)]">
            <Heart size={16} className="text-blue-300 fill-blue-300/10 sm:w-7 sm:h-7" />
          </div>
          
          <div className="flex-1 min-w-0 sm:w-full">
            <div className="flex items-center sm:justify-center gap-1.5 mb-0.5 sm:mb-1.5">
              <span className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Community</span>
              <Users size={8} className="text-slate-500 sm:w-2.5 sm:h-2.5" />
            </div>
            
            <div className="sm:text-center">
              <p className="text-white font-bold text-sm sm:text-lg leading-tight">
                {favoriteCount} {favoriteCount === 1 ? 'persona ha scelto' : 'persone hanno scelto'}
              </p>
              <p className="text-xs sm:text-lg text-gray-400 font-medium leading-tight mt-1 sm:mt-2">
                {getCivArticle(civName)}<span className="text-blue-200 font-bold">{civName}</span>! 
              </p>
            </div>
          </div>

          <button
            onClick={handleFollow}
            className="relative flex items-center justify-center px-3 sm:px-5 py-1.5 sm:py-2.5 bg-blue-700/20 hover:bg-blue-700/40 border border-blue-500/30 rounded-lg sm:rounded-xl text-[9px] sm:text-xs font-black text-blue-200 transition-all active:scale-95 shrink-0 sm:w-full"
          >
            <Bell size={14} className="mr-1.5 sm:absolute sm:left-4 sm:mr-0" />
            <span className="sm:w-full text-center">SEGUI!</span>
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
