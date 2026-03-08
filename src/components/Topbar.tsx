import { User } from 'lucide-react';
import { useAuth } from './AuthContext';

export type FilterType = 'Tutte' | 'Fanteria' | 'Cavalleria' | 'Arcieri' | 'Assedio';

interface TopbarProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  activeFilter: string;
  setActiveFilter: (f: FilterType) => void;
}

export function Topbar({}: TopbarProps) {
  const { isAuthenticated, isAdmin, user, logout, openLoginModal } = useAuth();

  return (
    <div className="w-full glass border-b border-white/5 flex flex-col md:flex-row items-start md:items-center justify-between p-2 md:px-10 md:py-3 z-10 shrink-0 gap-4">
      
      <div className="flex items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600 mb-0.5">
            Manuale delle civiltà
          </h1>
          <h2 className="text-sm md:text-base font-bold text-gray-500 mb-1">
            Age of Empires IV
          </h2>
          <p className="text-xs md:text-sm text-gray-400 italic hidden sm:block">Scegli la tua civiltà e domina il campo di battaglia.</p>
        </div>
      </div>

      <div className="flex items-center ml-auto">
        {isAuthenticated && isAdmin ? (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-yellow-500">
              <div className="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center border border-yellow-500/50">
                <User size={16} />
              </div>
              <div className="flex flex-col">
                <span className="font-medium hidden sm:block text-sm leading-none">{user?.name}</span>
                <span className="text-[10px] text-yellow-600 font-bold uppercase tracking-wider">Admin</span>
              </div>
            </div>
            <button 
              onClick={logout}
              className="text-xs text-gray-500 hover:text-white transition-colors border border-white/10 px-3 py-1 rounded-lg hover:bg-white/5"
            >
              Esci
            </button>
          </div>
        ) : (
          <button
            onClick={openLoginModal}
            title="Accesso Admin"
            className="text-gray-500 hover:text-yellow-500 transition-colors p-2 rounded-lg hover:bg-white/5"
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
