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
  const { isAuthenticated, isAdmin, user, logout } = useAuth();

  return (
    <div className="w-full glass border-b border-[#D4AF37]/20 flex flex-col md:flex-row items-start md:items-center justify-between p-4 md:px-10 md:py-4 z-10 shrink-0 gap-4">
      
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
        {isAuthenticated && isAdmin && (
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
        )}
      </div>
    </div>
  );
}
