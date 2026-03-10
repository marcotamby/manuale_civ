import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCivData } from './CivContext';
import type { Unit } from '../data/aoe4Data';
import { UnitGrid } from './UnitGrid';
import { TechTree } from './TechTree';
import { MatchupsTable } from './MatchupsTable';
import { EditSuggestionForm } from './EditSuggestionForm';
import { AdminCivEditorModal } from './AdminCivEditorModal';
import { useAuth } from './AuthContext';
import type { Civilization } from '../data/aoe4Data';
import { Shield, Sword, Zap, Map, BarChart2, Edit, ChevronDown, ChevronUp, Play, ChevronRight, Clock } from 'lucide-react';
import { ResourceText } from './ResourceText';

type Tab = 'caratteristiche' | 'units' | 'buildorders' | 'matchups' | 'video' | 'proponi' | 'admin-edit';

interface CivViewProps {
  civId: string;
  onSelectUnit: (unit: Unit) => void;
}

export function CivView({ civId, onSelectUnit }: CivViewProps) {
  const { civilizations: civilizationsData, refreshCivs } = useCivData();
  const { tab } = useParams<{ tab?: string }>();
  const navigate = useNavigate();

  const validTabs: Tab[] = ['caratteristiche', 'units', 'buildorders', 'matchups', 'video', 'proponi', 'admin-edit'];
  const activeTab: Tab = (validTabs.includes(tab as Tab)) ? (tab as Tab) : 'caratteristiche';
  const [activeAge, setActiveAge] = useState<1 | 2 | 3 | 4>(() => {
    return (Number(sessionStorage.getItem('activeAge')) as 1 | 2 | 3 | 4) || 1;
  });
  const [unitView, setUnitView] = useState<'units' | 'techtree'>(() => {
    return (sessionStorage.getItem('unitView') as 'units' | 'techtree') || 'units';
  });

  const handleTabChange = (newTab: Tab) => {
    navigate(`/civ/${civId}/${newTab}`);
  };

  const handleAgeChange = (age: number) => {
    setActiveAge(age as 1 | 2 | 3 | 4);
    sessionStorage.setItem('activeAge', age.toString());
  };

  const handleUnitViewChange = (view: 'units' | 'techtree') => {
    setUnitView(view);
    sessionStorage.setItem('unitView', view);
  };

  const [localCivs, setLocalCivs] = useState<Record<string, Civilization>>({});
  const [expandedBOs, setExpandedBOs] = useState<Set<string>>(new Set());
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const { isAdmin } = useAuth();

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 2);
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, []);

  const baseCiv = civilizationsData.find(c => c.id === civId);
  const civ = baseCiv ? (localCivs[civId] || baseCiv) : undefined;

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'caratteristiche', label: 'Caratteristiche', icon: <Shield size={16} /> },
    { id: 'units', label: 'Unità & Landmarks', icon: <Sword size={16} /> },
    { id: 'buildorders', label: 'Build Orders', icon: <Map size={16} /> },
    { id: 'matchups', label: 'Matchups', icon: <BarChart2 size={16} /> },
    { id: 'video', label: 'Video Guide', icon: <Play size={16} /> },
    { id: 'proponi', label: 'Proponi Modifica', icon: <Edit size={16} /> },
  ];

  if (!civ) return <div className="text-gray-400 p-8">Civiltà non trovata.</div>;

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden w-full civ-view-container">
      {/* Civ Hero Header */}
      <div className="relative px-6 pt-8 pb-6 border-b border-white/5 overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <img src={civ.flag} alt="" className="w-full h-full object-cover blur-2xl scale-150" />
        </div>
        <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <img
            src={civ.flag}
            alt={civ.name}
            className="w-24 h-24 object-contain drop-shadow-[0_0_20px_rgba(212,175,55,0.3)] shrink-0"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap mb-2">
              <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600">
                {civ.name}
              </h1>
              <span className={`text-xs font-bold px-3 py-1 rounded-full border ${civ.difficulty === 'Facile' ? 'text-green-400 border-green-500/40 bg-green-500/10' :
                civ.difficulty === 'Medio' ? 'text-yellow-400 border-yellow-500/40 bg-yellow-500/10' :
                  'text-red-400 border-red-400/30 bg-red-500/10'
                }`}>
                {civ.difficulty}
              </span>
              {isAdmin && (
                <div className="flex gap-2 items-center bg-white/5 px-2 py-1 rounded-lg border border-white/10">
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">
                    Admin
                  </span>
                  <button
                    onClick={() => setIsEditorOpen(true)}
                    className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white text-[10px] font-bold rounded flex items-center gap-1 transition-all active:scale-95"
                  >
                    <Edit size={12} /> Modifica
                  </button>
                </div>
              )}
            </div>
            <p className="text-gray-300 max-w-2xl leading-relaxed">{civ.shortDescription}</p>
          </div>
        </div>
      </div>

      <div className="relative sticky top-0 bg-[var(--color-brand-dark)] z-10 border-b border-[#D4AF37]/15 w-full">
        <div
          ref={scrollContainerRef}
          onScroll={checkScroll}
          className="px-4 overflow-x-auto flex flex-nowrap gap-0 relative w-full no-scrollbar"
        >
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex items-center gap-2 px-5 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === tab.id
                ? 'border-yellow-500 text-yellow-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
                }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {canScrollRight && (
          <div className="md:hidden absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-[var(--color-brand-dark)] to-transparent pointer-events-none flex items-center justify-end pr-2">
            <ChevronRight size={16} className="text-yellow-500/70 animate-pulse" />
          </div>
        )}
      </div>

      <div className="p-4 md:p-8">
        {activeTab === 'caratteristiche' && (
          <div className="space-y-8 max-w-4xl">
            <section>
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Zap className="text-yellow-500" size={20} />
                Bonus
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {civ.passiveBonuses.map((bonus, idx) => (
                  <div key={idx} className="flex items-start gap-3 glass p-4 rounded-xl border border-white/5 hover:border-yellow-500/30 transition-colors text-sm text-gray-300 leading-relaxed">
                    <Zap size={18} className="text-yellow-500 mt-1 shrink-0" />
                    <ResourceText text={bonus} />
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <ChevronUp className="text-green-400" size={20} />
                Punti di Forza
              </h2>
              <div className="glass p-5 rounded-xl border border-green-500/20 text-gray-300 text-sm leading-relaxed">
                <ul className="space-y-3 list-disc list-inside">
                  {civ.strengths && civ.strengths.length > 0 ? (
                    civ.strengths.map((str, idx) => (
                      <li key={idx}><strong className="text-green-400">{str}</strong></li>
                    ))
                  ) : (
                    <>
                      {civ.uniqueUnits.length > 0 && (
                        <li>Accesso a unità uniche: <strong className="text-green-400">{civ.uniqueUnits.map(u => u.name).join(', ')}</strong></li>
                      )}
                      {civ.technologies.length > 0 && (
                        <li>Tecnologie esclusive: <strong className="text-green-400">{civ.technologies.map(t => t.name).join(', ')}</strong></li>
                      )}
                      <li className="text-gray-400 italic">Vedi sezione Unità & Landmarks per i dettagli specifici.</li>
                    </>
                  )}
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <ChevronDown className="text-red-400" size={20} />
                Punti Deboli
              </h2>
              <div className="glass p-5 rounded-xl border border-red-500/20 text-gray-300 text-sm leading-relaxed">
                {civ.weaknesses && civ.weaknesses.length > 0 ? (
                  <ul className="space-y-3 list-disc list-inside">
                    {civ.weaknesses.map((wk, idx) => (
                      <li key={idx}><strong className="text-red-400">{wk}</strong></li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-400 italic">I punti deboli specifici saranno aggiunti dalla community tramite "Proponi Modifica".</p>
                )}
              </div>
            </section>
          </div>
        )}

        {activeTab === 'units' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex gap-2 glass rounded-2xl p-1.5 w-fit">
                {[1, 2, 3, 4].map((age) => (
                  <button
                    key={age}
                    className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all duration-300 ${activeAge === age
                      ? 'bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)] scale-105'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                      }`}
                    onClick={() => handleAgeChange(age)}
                  >
                    Age {"I II III IV".split(" ")[age - 1]}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 glass rounded-2xl p-1.5">
                <button
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${unitView === 'units' ? 'bg-blue-600/50 text-white border border-blue-500/30' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                  onClick={() => handleUnitViewChange('units')}
                >
                  Unità & Tecnologie
                </button>
                <button
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${unitView === 'techtree' ? 'bg-blue-600/50 text-white border border-blue-500/30' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                  onClick={() => handleUnitViewChange('techtree')}
                >
                  Tech Tree
                </button>
              </div>
            </div>
            {unitView === 'units' ? (
              <UnitGrid civId={civId} age={activeAge} onSelectUnit={onSelectUnit} />
            ) : (
              <TechTree civId={civId} />
            )}
          </div>
        )}

        {activeTab === 'buildorders' && (
          <div className="max-w-4xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
              <h2 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">
                <Map className="text-yellow-500" size={24} />
                Build Orders
              </h2>
              <p className="text-sm text-gray-400">Strategie ottimizzate per dominare la partita.</p>
            </div>

            {civ.buildOrders && civ.buildOrders.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {civ.buildOrders.map((bo) => {
                  const isExpanded = expandedBOs.has(bo.id);
                  return (
                    <div key={bo.id} className={`glass p-6 rounded-2xl border border-white/5 transition-all group h-fit`}>
                      <div className="flex justify-between items-start mb-4">
                        <h3 className="text-xl font-bold text-white group-hover:text-yellow-400 transition-colors">{bo.title}</h3>
                      </div>

                      <div className={`text-sm text-gray-400 mb-6 ${isExpanded ? '' : 'line-clamp-2'}`}>
                        <ResourceText text={bo.description} />
                      </div>

                      {isExpanded && bo.steps && bo.steps.length > 0 && (
                        <div className="space-y-4 mb-6 animate-in slide-in-from-top-2 duration-300">
                          {bo.steps.map((step, sIdx) => (
                            <div key={sIdx} className="flex flex-col gap-1">
                              <div className="flex gap-3 text-[13px] leading-relaxed">
                                {step.time && (
                                  <span className="text-yellow-500 font-mono w-10 shrink-0 font-bold flex items-center gap-1">
                                    <Clock size={10} /> {step.time}
                                  </span>
                                )}
                                <ResourceText text={step.action} className="text-gray-200 font-medium" />
                              </div>
                              {step.note && (
                                <div className="ml-13 pl-3 border-l border-white/10">
                                  <ResourceText text={step.note} className="text-[11px] text-gray-500 italic" />
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      <button
                        onClick={() => {
                          const newExpanded = new Set(expandedBOs);
                          if (isExpanded) newExpanded.delete(bo.id);
                          else newExpanded.add(bo.id);
                          setExpandedBOs(newExpanded);
                        }}
                        className="flex items-center gap-2 text-xs font-bold text-yellow-500/80 hover:text-yellow-400 transition-colors"
                      >
                        {isExpanded ? (
                          <>
                            <ChevronUp size={14} /> Chiudi dettagli
                          </>
                        ) : (
                          <>
                            <ChevronDown size={14} /> Mostra dettagli strategia
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="glass p-10 rounded-3xl border border-yellow-500/20 text-center flex flex-col items-center">
                <div className="w-16 h-16 bg-yellow-500/10 rounded-full flex items-center justify-center mb-4 border border-yellow-500/20">
                  <Map size={32} className="text-yellow-500" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Build Orders in arrivo</h3>
                <p className="text-sm text-gray-500 max-w-sm">I build order per questa civiltà saranno aggiunti presto dai contributori della community.</p>
                <button
                  onClick={() => handleTabChange('proponi')}
                  className="mt-6 px-8 py-3 bg-yellow-600/10 hover:bg-yellow-600/20 border border-yellow-500/30 rounded-xl text-sm text-yellow-500 font-bold transition-all"
                >
                  Proponi un Build Order →
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'matchups' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">
                <BarChart2 className="text-blue-400" size={24} />
                Matchup Live (1v1)
              </h2>
              <p className="text-sm text-gray-400">Statistiche aggiornate in tempo reale tramite le API di AoE4World.</p>
            </div>
            <MatchupsTable selectedCiv={civId} />
          </div>
        )}

        {activeTab === 'video' && (
          <div className="w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row md:items-center gap-6 mb-2">
              <div className="flex flex-col">
                <h2 className="text-3xl font-bold text-white flex items-center gap-3">
                  <Play className="text-red-500" size={32} />
                  Video Guide & Gameplay
                </h2>
                <p className="text-gray-400 mt-1">Tutorial e partite commentate da <span className="text-red-500 font-bold">marcotamby_aoe</span>.</p>
              </div>
              <a
                href="https://www.youtube.com/@marcotamby_aoe"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-6 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-[11px] uppercase tracking-wider font-extrabold transition-all shadow-lg shadow-red-600/20 hover:scale-105 active:scale-95 self-start md:self-center"
              >
                <Play size={14} fill="currentColor" />
                VISITA IL CANALE YOUTUBE
              </a>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {civ.videos && civ.videos.length > 0 ? (
                civ.videos.map((vidId, index) => {
                  let finalId = vidId.trim();
                  if (finalId.includes('youtube.com') || finalId.includes('youtu.be')) {
                    try {
                      const url = new URL(finalId);
                      finalId = url.searchParams.get('v') || url.pathname.slice(1) || finalId;
                    } catch (e) { }
                  }
                  return (
                    <div key={`${finalId}-${index}`} className="flex flex-col h-full">
                      <a
                        href={`https://www.youtube.com/watch?v=${finalId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group relative block aspect-video w-full rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-black transition-transform hover:scale-105 hover:border-red-500/50 hover:shadow-[0_0_20px_rgba(239,68,68,0.3)]"
                      >
                        <img
                          src={`https://img.youtube.com/vi/${finalId}/maxresdefault.jpg`}
                          alt="Video Thumbnail"
                          className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                          onLoad={(e) => {
                            const target = e.target as HTMLImageElement;
                            if (target.naturalWidth === 120 && target.naturalHeight === 90) {
                              target.src = `https://img.youtube.com/vi/${finalId}/hqdefault.jpg`;
                            }
                          }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-12 h-9 bg-red-600/90 rounded-2xl flex items-center justify-center group-hover:bg-red-500 transition-colors shadow-lg">
                            <Play size={18} fill="currentColor" className="text-white ml-0.5" />
                          </div>
                        </div>
                      </a>
                    </div>
                  );
                })
              ) : (
                <div className="glass p-8 rounded-2xl border border-white/5 text-center flex flex-col items-center justify-center aspect-video max-w-[300px] bg-black/20">
                  <Play size={32} className="text-gray-600 mb-3" />
                  <h3 className="text-base font-bold text-gray-400 mb-1">Video in arrivo</h3>
                  <p className="text-xs text-gray-500 px-4 leading-tight">Guide dedicate in fase di preparazione.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'proponi' && (
          <div className="max-w-xl">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <Edit className="text-blue-400" size={24} />
              Proponi Modifiche
            </h2>
            <EditSuggestionForm civName={civ.name} />
          </div>
        )}
      </div>

      {civ && isAdmin && (
        <AdminCivEditorModal
          civ={civ}
          isOpen={isEditorOpen}
          onClose={() => setIsEditorOpen(false)}
          onSave={(updatedCiv) => {
            setLocalCivs(prev => ({ ...prev, [civId]: updatedCiv }));
            refreshCivs();
          }}
        />
      )}
    </div>
  );
}
