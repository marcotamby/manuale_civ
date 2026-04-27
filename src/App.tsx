// Manual Build Trigger - 2026-04-23 12:00 - VERCEL PRO ACTIVE
// Triggering build - UI removal verification
import { useState, useEffect, useRef } from 'react';
import { Home as HomeIcon } from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { UnitDetailModal } from './components/UnitDetailModal';
import { Home } from './components/Home';
import { CivView } from './components/CivView';
import { AdminBOEditorModal } from './components/AdminBOEditorModal';
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
import { AdminOverlayModal } from './components/AdminOverlayModal';
import { PrivacyPage } from './components/PrivacyPage';
import { FAQPage } from './components/FAQPage';
import { MobileFooter } from './components/MobileFooter';
import { DesktopFooter } from './components/DesktopFooter';
import { TournamentsPage } from './components/TournamentsPage';
import { TournamentDetail } from './components/TournamentDetail';
import { TournamentRegolamento } from './components/TournamentRegolamento';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { usePresence } from './components/PresenceContext';

function App() {
  const navigate = useNavigate();
  const location = useLocation();

  const isHome = location.pathname === '/';
  const isCompare = location.pathname.startsWith('/compare');
  const isCiv = location.pathname.startsWith('/civ/');

  const selectedCivMatch = location.pathname.match(/^\/civ\/([^/]+)/);
  const selectedCivId = selectedCivMatch ? selectedCivMatch[1] : '';
  const { civilizations: civilizationsData, loading, error, refreshCivs, updateCivLocally, updateGlobalUnitLocally } = useCivData();

  const isFaq = location.pathname === '/faq';
  const isTournaments = location.pathname.includes('/tornei');
  
  const currentPage = isHome ? 'home' : isCompare ? 'compare' : isCiv ? 'civ' : isFaq ? 'faq' : isTournaments ? 'tornei' : 'home';

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAdminDashboardOpen, setIsAdminDashboardOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isAdminOverlayOpen, setIsAdminOverlayOpen] = useState(false);
  const [isCivEditorOpen, setIsCivEditorOpen] = useState(false);
  const [civEditorConfig, setCivEditorConfig] = useState<{ section?: string; id?: string }>({});
  const [isBOEditorOpen, setIsBOEditorOpen] = useState(false);
  const [boEditorTarget, setBOEditorTarget] = useState<{ civId: string; index: number | null }>({ civId: '', index: null });

  // Expose methods via window in a controlled way inside useEffect
  useEffect(() => {
    if (typeof window === 'undefined') return;

    (window as any).openProfileModal = () => setIsProfileModalOpen(true);
    (window as any).openCivEditor = (section?: string, id?: string) => {
      setCivEditorConfig({ section, id });
      setIsCivEditorOpen(true);
    };
    (window as any).openBOEditor = (civId: string, index: number | null) => {
      setBOEditorTarget({ civId, index });
      setIsBOEditorOpen(true);
    };
    (window as any).openAdminOverlay = () => navigate('/admin/overlays');
    (window as any).closeAllModals = () => {
      setIsProfileModalOpen(false);
      setIsAdminDashboardOpen(false);
      setIsAdminOverlayOpen(false);
      setIsCivEditorOpen(false);
      setCivEditorConfig({});
      setIsBOEditorOpen(false);
      setIsSidebarOpen(false);
      if (location.pathname.startsWith('/admin/overlays')) navigate('/');
    };
  }, []); // State setters are stable, so empty dep array is fine

  useEffect(() => {
    if (location.pathname.startsWith('/admin/overlays')) {
      setIsAdminOverlayOpen(true);
    } else {
      setIsAdminOverlayOpen(false);
    }
  }, [location.pathname]);

  const { isAdmin, isAuthenticated, isStreamer, favorites, isLoginModalOpen, loginModalMessage, closeLoginModal } = useAuth();
  const { updateActivity } = usePresence();
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [compareIds, setCompareIds] = useState<string[]>([]);

  // Track activity globally
  useEffect(() => {
    // Track everyone for global counts
    if (isCiv && selectedCivId) {
      updateActivity({ type: 'viewing', civId: selectedCivId });
    } else {
      updateActivity({ type: 'viewing', section: currentPage });
    }
  }, [currentPage, selectedCivId]);

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

  const handleSelectCiv = (civId: string, tab?: string) => {
    // Check if we are currently on a civ page and have a tab
    const currentTab = location.pathname.startsWith('/civ/') ? location.pathname.split('/')[3] : undefined;
    const activeTab = tab || currentTab;

    if (activeTab) {
      navigate(`/civ/${civId}/${activeTab}`);
    } else {
      navigate(`/civ/${civId}`);
    }
    setIsSidebarOpen(false);
  };

  const handleCompare = (civIds: string[]) => {
    setCompareIds(civIds);
    navigate('/compare');
  };

  const civIndex = civilizationsData.findIndex((c) => c.id === selectedCivId);
  const prevCiv = civilizationsData.length > 0 ? civilizationsData[(civIndex - 1 + civilizationsData.length) % civilizationsData.length] : null;
  const nextCiv = civilizationsData.length > 0 ? civilizationsData[(civIndex + 1) % civilizationsData.length] : null;

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--color-brand-dark)] text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
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
        isHome={isHome}
        searchQuery=""
        setSearchQuery={() => { }}
        activeFilter="Tutte"
        setActiveFilter={() => { }}
        onOpenAdminDashboard={() => setIsAdminDashboardOpen(true)}
        onOpenAdminOverlay={() => navigate('/admin/overlays')}
      />

      {/* Global Homepage Extended Background - Desktop Only */}
      { (isHome || isTournaments || isFaq || isCiv) && (
        <div 
          className="fixed top-0 left-0 right-0 h-[280px] md:h-[600px] lg:h-[800px] z-0 pointer-events-none block bg-contain md:bg-cover bg-no-repeat bg-top"
          style={{ 
            backgroundImage: `url('/header-bg.png')`,
            opacity: 0.35,
            maskImage: `linear-gradient(to bottom, black 40%, transparent 100%), linear-gradient(to right, transparent, black 10%, black 90%, transparent)`,
            WebkitMaskImage: `linear-gradient(to bottom, black 40%, transparent 100%), linear-gradient(to right, transparent, black 10%, black 90%, transparent)`,
            maskComposite: 'intersect',
            WebkitMaskComposite: 'source-in'
          }}
        ></div>
      )}

      <div className="flex-1 flex flex-row overflow-hidden relative">
        {(currentPage !== 'home' || isSidebarOpen) && (
          <Sidebar
            selectedCiv={selectedCivId}
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

                {!location.pathname.includes('/tornei') && !location.pathname.includes('/tournament/') && (
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
                )}

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
                <Route path="/civ/:civId" element={<CivView civId={selectedCivId} onSelectUnit={setSelectedUnit} />} />
                <Route path="/civ/:civId/:tab" element={<CivView civId={selectedCivId} onSelectUnit={setSelectedUnit} />} />
                <Route path="/compare" element={<CompareView civIds={compareIds} onClose={() => navigate('/')} />} />
                <Route path="/privacy" element={<PrivacyPage />} />
                <Route path="/faq" element={<FAQPage />} />
                <Route path="/tornei" element={<TournamentsPage />} />
                <Route path="/tornei/:slug" element={<TournamentDetail />} />
                <Route path="/tornei/:slug/regolamento" element={<TournamentRegolamento />} />
                <Route path="/tornei/tournament/:slug" element={<TournamentDetail />} />
                <Route path="/tornei/tournament/:slug/regolamento" element={<TournamentRegolamento />} />
                <Route path="/admin/overlays" element={<Home onSelectCiv={handleSelectCiv} onCompareCivs={handleCompare} />} />
                <Route path="/admin/overlays/:overlayId" element={<Home onSelectCiv={handleSelectCiv} onCompareCivs={handleCompare} />} />
                <Route path="/admin/overlays/:overlayId/:tab" element={<Home onSelectCiv={handleSelectCiv} onCompareCivs={handleCompare} />} />
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

      <DesktopFooter />
      <MobileFooter />
      <CookieBanner />
      <LoginModal isOpen={isLoginModalOpen} onClose={closeLoginModal} message={loginModalMessage} />
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

      {isAuthenticated && (isAdmin || isStreamer) && (
        <AdminOverlayModal
          isOpen={isAdminOverlayOpen}
          onClose={() => {
            setIsAdminOverlayOpen(false);
            if (location.pathname.startsWith('/admin/overlays')) navigate('/');
          }}
        />
      )}

      {isCivEditorOpen && civilizationsData.find(c => c.id === selectedCivId) && (
        <AdminCivEditorModal
          civ={civilizationsData.find(c => c.id === selectedCivId)!}
          isOpen={isCivEditorOpen}
          initialSection={civEditorConfig.section}
          initialId={civEditorConfig.id}
          onClose={() => {
            setIsCivEditorOpen(false);
            setCivEditorConfig({});
          }}
          onSave={(updatedCiv, updatedGlobalUnits) => {
            if (updateCivLocally) updateCivLocally(updatedCiv);
            if (updateGlobalUnitLocally && updatedGlobalUnits) {
              updatedGlobalUnits.forEach(gu => updateGlobalUnitLocally(gu));
            }
            refreshCivs();
          }}
        />
      )}

      {isBOEditorOpen && civilizationsData.find(c => c.id === boEditorTarget.civId) && (
        <AdminBOEditorModal
          civ={civilizationsData.find(c => c.id === boEditorTarget.civId)!}
          isOpen={isBOEditorOpen}
          boIndex={boEditorTarget.index}
          onClose={() => setIsBOEditorOpen(false)}
          onSave={(updatedBOs) => {
            const civ = civilizationsData.find(c => c.id === boEditorTarget.civId);
            if (civ) {
              updateCivLocally({ ...civ, buildOrders: updatedBOs });
            }
          }}
        />
      )}
      <Toaster position="bottom-right" toastOptions={{
        style: {
          background: '#1a1c23',
          color: '#fff',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '16px',
        },
      }} />
    </div>
  );
}

export default App;
