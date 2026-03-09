import { User } from 'lucide-react';
import { useAuth } from './AuthContext';

export type FilterType = 'Tutte' | 'Fanteria' | 'Cavalleria' | 'Arcieri' | 'Assedio';

interface TopbarProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  activeFilter: string;
  setActiveFilter: (f: FilterType) => void;
}

export function Topbar(_props: TopbarProps) {
  const { isAuthenticated, isAdmin, user, logout, openLoginModal } = useAuth();

  return (
    <div className="w-full bg-gradient-to-r from-[#0d1424] via-[#1a1c32] to-[#0d1424] border-b border-yellow-500/20 flex flex-col md:flex-row items-center justify-between px-4 py-4 md:px-10 md:py-5 z-10 shrink-0 gap-4 shadow-[0_4px_20px_rgba(0,0,0,0.5)] relative overflow-hidden">
      
      {/* Decorative top border glow effect */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-yellow-500/50 to-transparent"></div>

      {/* Left empty container for balancing the center on desktop */}
      <div className="hidden md:flex w-1/3 items-center justify-start"></div>

      {/* Center Title Area */}
      <div className="flex flex-col items-center justify-center text-center w-full md:w-1/3">
        <h2 className="text-xs md:text-sm font-cinzel font-semibold text-yellow-500/90 tracking-[0.2em] uppercase mb-1 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
          Age of Empires IV
        </h2>
        <h1 className="text-3xl md:text-4xl font-cinzel font-bold text-transparent bg-clip-text bg-gradient-to-b from-yellow-200 via-yellow-400 to-amber-600 drop-shadow-[0_0_15px_rgba(212,175,55,0.3)]">
          Manuale delle Civiltà
        </h1>
        <div className="flex items-center gap-3 mt-3 mb-2">
          <div className="h-px w-12 bg-gradient-to-r from-transparent to-yellow-500/50"></div>
          <div className="w-1.5 h-1.5 rotate-45 bg-yellow-500/60"></div>
          <div className="h-px w-12 bg-gradient-to-l from-transparent to-yellow-500/50"></div>
        </div>
        <p className="text-xs text-gray-400/90 italic hidden sm:block font-serif tracking-wider">
          Scegli la tua civiltà e domina il campo di battaglia
        </p>
      </div>

      {/* Auth / Right side */}
      <div className="flex items-center justify-center md:justify-end w-full md:w-1/3">
        {isAuthenticated && isAdmin ? (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-yellow-500">
              <div className="w-8 h-8 rounded-full bg-yellow-500/10 flex items-center justify-center border border-yellow-500/30">
                <User size={16} />
              </div>
              <div className="flex flex-col text-left">
                <span className="font-medium hidden sm:block text-sm leading-none text-white/90">{user?.name}</span>
                <span className="text-[10px] text-yellow-600 font-bold uppercase tracking-wider">Admin</span>
              </div>
            </div>
            <button 
              onClick={logout}
              className="text-xs text-gray-400 hover:text-white transition-colors border border-white/10 px-3 py-1.5 rounded hover:bg-white/5 font-cinzel tracking-wider uppercase"
            >
              Esci
            </button>
          </div>
        ) : (
          <button
            onClick={openLoginModal}
            title="Accesso Admin"
            className="text-gray-500/70 hover:text-yellow-500/90 transition-colors p-2 rounded hover:bg-yellow-500/10"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
