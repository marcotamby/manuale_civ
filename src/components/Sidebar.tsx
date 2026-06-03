import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { useCivData } from './CivContext';
import { useAuth } from './AuthContext';
import { Home as HomeIcon, Heart, ChevronLeft, ChevronRight } from 'lucide-react';

interface SidebarProps {
  selectedCiv: string;
  onSelectCiv: (civId: string, tab?: string) => void;
  onSelectPage: (page: 'home' | 'civ' | 'compare' | 'faq' | 'tornei' | 'privacy' | 'classifica') => void;
  isOpen: boolean;
  onClose: () => void;
  onOpen?: () => void;
  currentPage: 'home' | 'civ' | 'compare' | 'faq' | 'tornei' | 'privacy' | 'classifica';
  currentTab?: string;
  hideOnMobile?: boolean;
}

export function Sidebar({ selectedCiv, onSelectCiv, onSelectPage, isOpen, onClose, onOpen, currentPage, currentTab, hideOnMobile }: SidebarProps) {
  const { favorites } = useAuth();
  const { civilizations: civilizationsData } = useCivData();
  const touchStartX = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diffX = touchEndX - touchStartX.current;

    // If swipe left and sidebar is open, close it
    if (diffX < -50 && isOpen) {
      onClose();
    }
    touchStartX.current = null;
  };
  
  const favoriteCivs = civilizationsData.filter(c => favorites.includes(c.id));

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && !window.location.pathname.includes('/tornei') && !window.location.pathname.includes('/tournament/') && (
        <div 
          className="md:hidden fixed inset-0 bg-black/50 z-20 transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Mobile Open Toggle Button (when closed) */}
      {!isOpen && !window.location.pathname.includes('/tornei') && !window.location.pathname.includes('/tournament/') && currentPage !== 'home' && (
        <button 
          onClick={onOpen}
          className="md:hidden fixed left-0 top-1/2 -translate-y-1/2 bg-black/80 border border-yellow-500/50 border-l-0 text-white p-1 rounded-r-lg z-20 shadow-[0_0_15px_rgba(212,175,55,0.4)]"
        >
          <ChevronRight size={20} />
        </button>
      )}

      {/* Sidebar Content */}
      <aside 
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className={`w-64 md:w-32 h-full flex flex-col py-6 px-4 md:px-3 lg:bg-transparent bg-black/90 backdrop-blur-xl border-r border-white/5 md:border-none transition-all duration-300 overflow-y-auto overflow-x-hidden no-scrollbar absolute top-0 bottom-0 left-0 md:static z-30
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        ${hideOnMobile ? 'hidden md:flex' : ''}
      `}>
        {/* Mobile Toggle Button (only when open to close it, or we rely on App.tsx topbar to open it) */}
        {!window.location.pathname.includes('/tornei') && !window.location.pathname.includes('/tournament/') && (
          <button 
            onClick={onClose}
            className="md:hidden absolute -right-4 top-1/2 bg-black/80 border border-yellow-500/50 text-white p-1 rounded-full z-50 shadow-[0_0_15px_rgba(212,175,55,0.4)]"
          >
            <ChevronLeft size={20} />
          </button>
        )}
        {/* Main Navigation - Hide on Home */}
        {currentPage !== 'home' && (
          <div className="flex flex-col gap-4 mb-4 shrink-0 w-full pr-1">
            <Link
              to="/"
              onClick={() => {
                onSelectPage('home');
                if (window.innerWidth < 768) onClose();
              }}
              title="Torna alla Home"
              className="w-full flex items-center md:justify-center gap-3 md:gap-0 p-2 md:p-0 aspect-none md:aspect-square rounded-xl bg-white/5 backdrop-blur-sm text-yellow-500 border border-white/10 hover:border-white/30 hover:bg-white/10 transition-all group"
            >
              <div className="w-10 h-10 flex items-center justify-center shrink-0">
                <HomeIcon size={24} className="md:w-8 md:h-8" />
              </div>
              <span className="text-sm font-bold text-white md:hidden uppercase tracking-wider truncate">
                Torna alla Home
              </span>
            </Link>
          </div>
        )}

        {/* Favorites Label */}
        {favoriteCivs.length > 0 && (
          <div className="mb-2 text-[10px] font-bold text-red-400 uppercase tracking-widest flex items-center gap-1 pl-2 md:pl-0">
            <Heart size={10} fill="currentColor" />
            <span className="md:inline">Preferiti</span>
          </div>
        )}

        {/* Favorites List - Stacked & Faded */}
        {favoriteCivs.length > 0 && (
          <div className="flex flex-col w-full mb-4 pr-1">
            {favoriteCivs.map((civ) => (
              <Link
                key={`fav-${civ.id}`}
                to={currentTab ? `/civ/${civ.id}/${currentTab}` : `/civ/${civ.id}`}
                onClick={() => {
                  onSelectCiv(civ.id, currentTab);
                  onSelectPage('civ');
                  if (window.innerWidth < 768) onClose();
                }}
                title={civ.name}
                className="w-full flex items-center md:flex-col md:justify-center gap-3 md:gap-0 p-2 md:p-0 aspect-none md:aspect-square shrink-0 relative overflow-hidden transition-all duration-300 hover:z-10 group mb-2 last:mb-0 rounded-xl md:rounded-md border border-transparent hover:border-white/30 hover:shadow-[0_0_15px_rgba(255,255,255,0.1)] md:hover:scale-115 md:hover:-translate-y-1 [transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)]"
              >
                <img 
                  src={civ.flag} 
                  alt={civ.name} 
                  className="w-10 h-10 md:w-full md:h-full object-cover rounded-lg md:rounded-none brightness-110 group-hover:brightness-125 transition-all duration-500 shrink-0" 
                />
                {/* Left edge fade - deep & soft - Desktop Only */}
                <div className="hidden md:block absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-[var(--color-brand-dark)] via-[var(--color-brand-dark)]/50 to-transparent pointer-events-none z-10" />
                <div className="hidden md:block absolute inset-x-0 bottom-0 h-4 bg-gradient-to-t from-[var(--color-brand-dark)] to-transparent pointer-events-none opacity-60" />
                <div className="hidden md:block absolute inset-0 opacity-0 group-hover:opacity-100 bg-gradient-to-t from-yellow-400/10 to-transparent transition-opacity" />
                
                {/* Label text: visible next to flag on mobile */}
                <span className="text-sm font-bold text-white md:hidden uppercase tracking-wider truncate">
                  {civ.name}
                </span>
              </Link>
            ))}
          </div>
        )}

        {currentPage !== 'home' && <div className="w-10 h-[1px] bg-white/10 mb-4 shrink-0" />}

        {/* Main List - Hide on Home */}
        {currentPage !== 'home' && (
          <nav className="flex flex-col w-full pb-28 md:pb-10 pr-1">
            {civilizationsData.map((civ) => (
              <Link
                key={civ.id}
                to={currentTab ? `/civ/${civ.id}/${currentTab}` : `/civ/${civ.id}`}
                onClick={() => {
                  onSelectCiv(civ.id, currentTab);
                  onSelectPage('civ');
                  if (window.innerWidth < 768) onClose();
                }}
                className={`group relative w-full flex items-center md:flex-col md:justify-center gap-3 md:gap-0 p-2 md:p-0 aspect-none md:aspect-square shrink-0 transition-all duration-500 overflow-hidden mb-2.5 last:mb-0 rounded-xl md:rounded-md border md:hover:scale-115 md:hover:-translate-y-1 [transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)]
                  ${selectedCiv === civ.id 
                    ? 'z-20 scale-[1.02] md:scale-105 shadow-[0_0_25px_rgba(255,255,255,0.1)] border-white/40 ring-1 ring-white/20 bg-white/5 md:bg-transparent' 
                    : 'z-0 border-transparent hover:border-white/30 hover:shadow-[0_0_15px_rgba(255,255,255,0.1)]'
                  }
                `}
              >
                <img 
                  src={civ.flag} 
                  alt={civ.name}
                  className={`w-10 h-10 md:w-full md:h-full object-cover rounded-lg md:rounded-none transition-all duration-700 shrink-0
                    ${selectedCiv === civ.id ? 'brightness-125' : 'brightness-90 group-hover:brightness-115 group-hover:scale-105'}
                  `}
                />
                {/* Left edge fade - deep & soft - Desktop Only */}
                <div className="hidden md:block absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-[var(--color-brand-dark)] via-[var(--color-brand-dark)]/50 to-transparent pointer-events-none z-10" />
                <div className="hidden md:block absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-[var(--color-brand-dark)]/80 to-transparent pointer-events-none" />
                
                {/* Label text: visible next to flag on mobile */}
                <span className="text-sm font-bold text-white md:hidden uppercase tracking-wider truncate">
                  {civ.name}
                </span>

                <span className="absolute left-full ml-4 px-3 py-1 bg-gray-900 border border-gray-700 text-white rounded-md text-sm whitespace-nowrap opacity-0 md:group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-lg font-medium">
                  {civ.name}
                </span>
              </Link>
            ))}
          </nav>
        )}
      </aside>
    </>
  );
}
