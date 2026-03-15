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
import { unitsList } from './data/aoe4Data';
import { useAuth } from './components/AuthContext';
import { LoginModal } from './components/LoginModal';
import { ProfileModal } from './components/ProfileModal';
import { AdminDashboardModal } from './components/AdminDashboardModal';
import { AdminCivEditorModal } from './components/AdminCivEditorModal';
import { PrivacyPage } from './components/PrivacyPage';
import { FAQPage } from './components/FAQPage';
import { MobileFooter } from './components/MobileFooter';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';

function App() {
  const navigate = useNavigate();
  const location = useLocation();

  const isHome = location.pathname === '/';
  const isCompare = location.pathname.startsWith('/compare');
  const isCiv = location.pathname.startsWith('/civ/');

  const selectedCivMatch = location.pathname.match(/^\/civ\/([^/]+)/);
  const selectedCiv = selectedCivMatch ? selectedCivMatch[1] : '';

  const isFaq = location.pathname === '/faq';

  const currentPage = isHome ? 'home' : isCompare ? 'compare' : isCiv ? 'civ' : isFaq ? 'faq' : 'home';

  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isCivEditorOpen, setIsCivEditorOpen] = useState(false);
  const [civEditorTarget, setCivEditorTarget] = useState<{ section?: string; id?: string }>({});

  // Expose methods via window on every render to ensure they are always present and up to date
  useEffect(() => {
    (window as any).openProfileModal = () => setIsProfileModalOpen(true);
    (window as any).openCivEditor = (section?: string, id?: string) => {
      setCivEditorTarget({ section, id });
      setIsCivEditorOpen(true);
    };
    (window as any).closeAllModals = () => {
      setIsProfileModalOpen(false);
      setIsAdminDashboardOpen(false);
      setIsCivEditorOpen(false);
      setIsSidebarOpen(false);
    };
  }, []); // Keep in empty dependency to avoid unnecessary re-assignments, 
          // but the state setters are stable so it's fine.

  // Re-assign explicitly to window to handle potential losses during navigations or hot-reloads
  if (typeof window !== 'undefined') {
    (window as any).openCivEditor = (section?: string, id?: string) => {
      setCivEditorTarget({ section, id });
      setIsCivEditorOpen(true);
    };
  }

  const prevPathRef = useRef(location.pathname);
  useEffect(() => {
    const prevPath = prevPathRef.current;
    const currentPath = location.pathname;

    // Skip scroll to top if we are just switching tabs inside the same civ
    const isCivPath = (path: string) => path.startsWith('/civ/');
    const getCivId = (path: string) => path.split('/')[2];
    
    const isSameCiv = isCivPath(prevPath) && isCivPath(currentPath) && getCivId(prevPath) === getCivId(currentPath);

    if (!isSameCiv) {
      // Scroll to top on route change
      const selectors = ['.main-content-area', '.civ-view-container'];
      selectors.forEach(selector => {
        const container = document.querySelector(selector);
        if (container) container.scrollTop = 0;
      });
      window.scrollTo(0, 0);
    }
    
    prevPathRef.current = currentPath;
  }, [location.pathname]);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAdminDashboardOpen, setIsAdminDashboardOpen] = useState(false);
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
    
    // Reset immediately to avoid multiple triggers
    const startX = touchStartX.current;
    touchStartX.current = null;

    // If swipe right and sidebar is closed, open it
    const canShowSidebar = currentPage !== 'home' || favorites.length > 0;
    if (diffX > 60 && startX < 50 && !isSidebarOpen && canShowSidebar) {
      setIsSidebarOpen(true);
    }
  };
  const { favorites, isLoginModalOpen, closeLoginModal, isAuthenticated, isAdmin } = useAuth();
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const { civilizations: civilizationsData, loading, error, refreshCivs } = useCivData();

  const handleSelectCiv = (civId: string) => {
    navigate(`/civ/${civId}`);
    setIsSidebarOpen(false);
  };

  const handleCompare = (civIds: string[]) => {
    setCompareIds(civIds);
    navigate('/compare');
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
      className="flex flex-col h-screen w-full bg-[#0a0a0b] text-white overflow-hidden selection:bg-yellow-500/30"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <Topbar
        searchQuery=""
        setSearchQuery={() => { }}
        activeFilter="Tutte"
        setActiveFilter={() => { }}
        onOpenAdminDashboard={() => setIsAdminDashboardOpen(true)}
      />

      <div className="flex-1 flex flex-row overflow-hidden relative">
        {((currentPage !== 'home' || favorites.length > 0) && (currentPage !== 'home' || isSidebarOpen)) && (
          <Sidebar
            selectedCiv={selectedCiv}
            onSelectCiv={handleSelectCiv}
            onSelectPage={(page) => {
              if (page === 'home') navigate('/');
              else if (page === 'compare') navigate('/compare');
              else if (page === 'faq') navigate('/faq');
            }}
            isOpen={isSidebarOpen}
            onClose={() => setIsSidebarOpen(false)}
            onOpen={() => setIsSidebarOpen(true)}
            currentPage={currentPage}
          />
        )}

        <main className="flex-1 flex flex-col relative overflow-hidden">
          <div className="flex-1 overflow-hidden flex flex-col">
            {currentPage !== 'home' && (
              <div className="flex items-center gap-3 px-4 md:pl-6 md:pr-[73px] py-2 shrink-0">
                <button
                  onClick={() => navigate('/')}
                  title="Dashboard"
                  className="md:hidden p-2 glass rounded-lg hover:bg-white/10 transition-colors text-yellow-500"
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

            <div className="flex-1 overflow-y-auto overflow-x-hidden w-full main-content-area elegant-scrollbar md:md-content-padding pb-20 md:pb-0">
              <Routes>
                <Route path="/" element={<Home onSelectCiv={handleSelectCiv} onCompareCivs={handleCompare} />} />
                <Route path="/civ/:civId" element={<CivView civId={selectedCiv} onSelectUnit={setSelectedUnit} />} />
                <Route path="/civ/:civId/:tab" element={<CivView civId={selectedCiv} onSelectUnit={setSelectedUnit} />} />
                <Route path="/compare" element={<CompareView civIds={compareIds} onClose={() => navigate('/')} />} />
                <Route path="/privacy" element={<PrivacyPage />} />
                <Route path="/faq" element={<FAQPage />} />
              </Routes>
            </div>
          </div>
        </main>
      </div>

      {selectedUnit && (
        <UnitDetailModal
          unit={selectedUnit}
          onClose={() => setSelectedUnit(null)}
          onEdit={(id) => {
            if ((window as any).openCivEditor) {
              const isGlobal = unitsList.some(u => u.id === id);
              (window as any).openCivEditor(isGlobal ? 'global-units' : 'units', id);
            }
          }}
        />
      )}

      <MobileFooter />
      <CookieBanner />
      <LoginModal isOpen={isLoginModalOpen} onClose={closeLoginModal} />
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        onSelectCiv={handleSelectCiv}
      />
      {isAuthenticated && isAdmin && (
        <AdminDashboardModal
          isOpen={isAdminDashboardOpen}
          onClose={() => setIsAdminDashboardOpen(false)}
        />
      )}

      {civilizationsData.length > 0 && isCivEditorOpen && (
        <AdminCivEditorModal
          civ={civilizationsData.find(c => c.id === selectedCiv) || civilizationsData[0]}
          isOpen={isCivEditorOpen}
          onClose={() => {
            setIsCivEditorOpen(false);
            setCivEditorTarget({});
          }}
          initialSection={civEditorTarget.section}
          initialId={civEditorTarget.id}
          onSave={() => {
            refreshCivs();
          }}
        />
      )}
    </div>
  );
}

export default App;
