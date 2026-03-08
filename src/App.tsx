// Manual Build Trigger - 2026-03-09
import { useState, useEffect, useRef } from 'react';
import { Home as HomeIcon } from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { UnitDetailModal } from './components/UnitDetailModal';
import { Home } from './components/Home';
import { CivView } from './components/CivView';
import { CompareView } from './components/CompareView';
import { CookieBanner } from './components/CookieBanner';
import { useCivData } from './components/CivContext';
import type { Unit } from './data/aoe4Data';
import { useAuth } from './components/AuthContext';
import { LoginModal } from './components/LoginModal';

function App() {
  const [currentPage, setCurrentPage] = useState<'home' | 'civ' | 'compare'>(() => {
    const saved = sessionStorage.getItem('aoe4_currentPage');
    if (saved === 'home' || saved === 'civ' || saved === 'compare') return saved;
    return 'home';
  });
  const [selectedCiv, setSelectedCiv] = useState<string>(() => {
    return sessionStorage.getItem('aoe4_selectedCiv') || 'english';
  });

  useEffect(() => {
    sessionStorage.setItem('aoe4_currentPage', currentPage);
  }, [currentPage]);

  useEffect(() => {
    sessionStorage.setItem('aoe4_selectedCiv', selectedCiv);
    // Scroll to top on civ change - try multiple selectors for robustness
    const selectors = ['.main-content-area', '.civ-view-container'];
    selectors.forEach(selector => {
      const container = document.querySelector(selector);
      if (container) container.scrollTop = 0;
    });
    window.scrollTo(0, 0);
  }, [selectedCiv, currentPage]);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    // Only track if swipe starts near the left edge (e.g., first 40px)
    if (e.touches[0].clientX < 40) {
      touchStartX.current = e.touches[0].clientX;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diffX = touchEndX - touchStartX.current;

    // If swipe right and sidebar is closed, open it
    const canShowSidebar = currentPage !== 'home' || favorites.length > 0;
    if (diffX > 50 && !isSidebarOpen && canShowSidebar) {
      setIsSidebarOpen(true);
    }
    touchStartX.current = null;
  };
  const { favorites, isLoginModalOpen, closeLoginModal } = useAuth();
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const { civilizations: civilizationsData, loading, error } = useCivData();

  const handleSelectCiv = (civId: string) => {
    setSelectedCiv(civId);
    setCurrentPage('civ');
    setIsSidebarOpen(false);
  };

  const handleCompare = (civIds: string[]) => {
    setCompareIds(civIds);
    setCurrentPage('compare');
  };

  const civIndex = civilizationsData.findIndex((c) => c.id === selectedCiv);
  const prevCiv = civilizationsData.length > 0 ? civilizationsData[(civIndex - 1 + civilizationsData.length) % civilizationsData.length] : null;
  const nextCiv = civilizationsData.length > 0 ? civilizationsData[(civIndex + 1) % civilizationsData.length] : null;

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--color-brand-dark)] text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-400 font-medium">Caricamento truppe...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--color-brand-dark)] text-white">
        <div className="text-red-400">Errore di connessione al server: {error}</div>
      </div>
    );
  }

  return (
    <div 
      className="flex h-screen w-full overflow-hidden bg-[var(--color-brand-dark)] text-white font-sans"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {((currentPage !== 'home' || favorites.length > 0) && (currentPage !== 'home' || isSidebarOpen)) && (
        <Sidebar
          selectedCiv={selectedCiv}
          onSelectCiv={handleSelectCiv}
          onSelectPage={setCurrentPage}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          onOpen={() => setIsSidebarOpen(true)}
          currentPage={currentPage}
        />
      )}

      <main className="flex-1 flex flex-col relative overflow-hidden">
        <Topbar
          searchQuery=""
          setSearchQuery={() => {}}
          activeFilter="Tutte"
          setActiveFilter={() => {}}
        />

        <div className="flex-1 overflow-hidden flex flex-col">
          {currentPage !== 'home' && (
            <div className="flex items-center gap-3 px-4 md:px-6 py-2 shrink-0">
              <button
                onClick={() => setCurrentPage('home')}
                title="Dashboard"
                className="p-2 glass rounded-lg hover:bg-white/10 transition-colors text-yellow-500"
              >
                <HomeIcon size={20} />
              </button>

              <button
                onClick={() => setIsSidebarOpen(true)}
                className="md:hidden p-2 glass rounded-lg hover:bg-white/10 transition-colors"
                title="Apri Menu"
              >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="3" y1="12" x2="21" y2="12"></line>
                    <line x1="3" y1="6" x2="21" y2="6"></line>
                    <line x1="3" y1="18" x2="21" y2="18"></line>
                  </svg>
              </button>

              {currentPage === 'civ' && (
                <div className="flex items-center gap-2 ml-auto">
                  {prevCiv && (
                    <button
                      onClick={() => handleSelectCiv(prevCiv.id)}
                      title={prevCiv.name}
                      className="flex items-center gap-2 px-3 py-1.5 glass rounded-lg hover:bg-white/10 transition-colors group text-sm"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="19" y1="12" x2="5" y2="12"></line>
                        <polyline points="12 19 5 12 12 5"></polyline>
                      </svg>
                      <img src={prevCiv.flag} alt={prevCiv.name} className="w-5 h-5 object-contain opacity-70 group-hover:opacity-100 transition-opacity" />
                      <span className="hidden md:inline text-gray-400 group-hover:text-white transition-colors">{prevCiv.name}</span>
                    </button>
                  )}

                  {nextCiv && (
                    <button
                      onClick={() => handleSelectCiv(nextCiv.id)}
                      title={nextCiv.name}
                      className="flex items-center gap-2 px-3 py-1.5 glass rounded-lg hover:bg-white/10 transition-colors group text-sm"
                    >
                      <span className="hidden md:inline text-gray-400 group-hover:text-white transition-colors">{nextCiv.name}</span>
                      <img src={nextCiv.flag} alt={nextCiv.name} className="w-5 h-5 object-contain opacity-70 group-hover:opacity-100 transition-opacity" />
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                        <polyline points="12 5 19 12 12 19"></polyline>
                      </svg>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="flex-1 overflow-y-auto overflow-x-hidden w-full main-content-area elegant-scrollbar md:md-content-padding">
            {currentPage === 'home' && (
              <Home 
                onSelectCiv={handleSelectCiv} 
                onCompareCivs={handleCompare}
              />
            )}
            {currentPage === 'civ' && (
              <CivView civId={selectedCiv} onSelectUnit={setSelectedUnit} />
            )}
            {currentPage === 'compare' && (
              <CompareView civIds={compareIds} onClose={() => setCurrentPage('home')} />
            )}
          </div>
        </div>
      </main>

      {selectedUnit && (
        <UnitDetailModal
          unit={selectedUnit}
          onClose={() => setSelectedUnit(null)}
        />
      )}

      <CookieBanner />
      <LoginModal isOpen={isLoginModalOpen} onClose={closeLoginModal} />
    </div>
  );
}

export default App;
