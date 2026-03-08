import { useState } from 'react';
import { useCivData } from './CivContext';
import type { Unit } from '../data/aoe4Data';
import { UnitGrid } from './UnitGrid';
import { TechTree } from './TechTree';
import { MatchupsTable } from './MatchupsTable';
import { EditSuggestionForm } from './EditSuggestionForm';
import { AdminCivEditorModal } from './AdminCivEditorModal';
import { useAuth } from './AuthContext';
import type { Civilization } from '../data/aoe4Data';
import { Shield, Sword, Zap, Map, BarChart2, Edit, ChevronDown, ChevronUp, Play, ChevronRight } from 'lucide-react';
type Tab = 'caratteristiche' | 'units' | 'buildorders' | 'matchups' | 'video' | 'proponi' | 'admin-edit';

// Initial data is now handled in Supabase database

interface CivViewProps {
  civId: string;
  onSelectUnit: (unit: Unit) => void;
}

export function CivView({ civId, onSelectUnit }: CivViewProps) {
  const { civilizations: civilizationsData, refreshCivs } = useCivData();
  const [activeTab, setActiveTab] = useState<Tab>('caratteristiche');
  const [activeAge, setActiveAge] = useState<1|2|3|4>(1);
  const [unitView, setUnitView] = useState<'units' | 'techtree'>('units');
  const [localCivs, setLocalCivs] = useState<Record<string, Civilization>>({});
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const { isAdmin } = useAuth();

  const baseCiv = civilizationsData.find(c => c.id === civId);
  const civ = baseCiv ? (localCivs[civId] || baseCiv) : undefined;

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'caratteristiche', label: 'Caratteristiche', icon: <Shield size={16} /> },
    { id: 'units', label: 'Unità & Landmarks', icon: <Sword size={16} /> },
    { id: 'buildorders', label: 'Build Orders', icon: <Map size={16} /> },
    { id: 'matchups', label: 'Matchups', icon: <BarChart2 size={16} /> },
    { id: 'video', label: 'Video Guida', icon: <Play size={16} /> },
    { id: 'proponi', label: 'Proponi Modifica', icon: <Edit size={16} /> },
  ];

  if (!civ) return <div className="text-gray-400 p-8">Civiltà non trovata.</div>;

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Civ Hero Header */}
      <div className="relative px-6 pt-8 pb-6 glass border-b border-[#D4AF37]/20 overflow-hidden">
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
              <span className={`text-xs font-bold px-3 py-1 rounded-full border ${
                civ.difficulty === 'Facile' ? 'text-green-400 border-green-500/40 bg-green-500/10' :
                civ.difficulty === 'Medio' ? 'text-yellow-400 border-yellow-500/40 bg-yellow-500/10' :
                'text-red-400 border-red-500/40 bg-red-500/10'
              }`}>
                {civ.difficulty}
              </span>
              {isAdmin && (
                <div className="flex gap-2 items-center bg-purple-500/10 px-3 py-1.5 rounded-xl border border-purple-500/30">
                  <span className="text-[10px] font-bold text-purple-300 uppercase tracking-wider">
                    Admin
                  </span>
                  <button 
                    onClick={() => setIsEditorOpen(true)}
                    className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 shadow-lg shadow-purple-600/20 active:scale-95"
                  >
                    <Edit size={14} /> Modifica Backend
                  </button>
                </div>
              )}
            </div>
            <p className="text-gray-300 max-w-2xl leading-relaxed">{civ.shortDescription}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="relative sticky top-0 bg-[var(--color-brand-dark)] z-10 border-b border-[#D4AF37]/15">
        <div className="px-4 overflow-x-auto no-scrollbar flex gap-0 min-w-max relative">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-yellow-500 text-yellow-400'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
        
        {/* Mobile Scroll Indicator */}
        <div className="md:hidden absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-[var(--color-brand-dark)] to-transparent pointer-events-none flex items-center justify-end pr-2">
          <ChevronRight size={16} className="text-yellow-500/70 animate-pulse" />
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-4 md:p-8">

        {/* === CARATTERISTICHE === */}
        {activeTab === 'caratteristiche' && (
          <div className="space-y-8 max-w-4xl">
            <section>
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Zap className="text-yellow-500" size={20} />
                Bonus Passivi
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {civ.passiveBonuses.map((bonus, idx) => (
                  <div key={idx} className="flex items-start gap-3 glass p-4 rounded-xl border border-white/5 hover:border-yellow-500/30 transition-colors">
                    <Zap size={18} className="text-yellow-500 mt-1 shrink-0" />
                    <p className="text-sm text-gray-300 leading-relaxed">{bonus}</p>
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
                  {civ.uniqueUnits.length > 0 && (
                    <li>Accesso a unità uniche: <strong className="text-green-400">{civ.uniqueUnits.map(u => u.name).join(', ')}</strong></li>
                  )}
                  {civ.technologies.length > 0 && (
                    <li>Tecnologie esclusive: <strong className="text-green-400">{civ.technologies.map(t => t.name).join(', ')}</strong></li>
                  )}
                  <li className="text-gray-400 italic">Vedi sezione Unità & Landmarks per i dettagli specifici.</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <ChevronDown className="text-red-400" size={20} />
                Punti di Debolezza
              </h2>
              <div className="glass p-5 rounded-xl border border-red-500/20 text-gray-300 text-sm italic">
                <p className="text-gray-400">Informazioni di debolezza specifiche saranno aggiunte dalla community tramite "Proponi Modifica".</p>
              </div>
            </section>

            {isAdmin && (
              <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-xl text-sm text-purple-300 flex items-center gap-3">
                < Shield size={20} className="shrink-0" />
                <span>🛡️ <strong>Admin:</strong> Puoi modificare direttamente i contenuti di questa sezione nella tab "Modifica (Admin)".</span>
              </div>
            )}
          </div>
        )}

        {/* === UNITS & LANDMARKS === */}
        {activeTab === 'units' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex gap-2 glass rounded-2xl p-1.5 w-fit">
                {[1, 2, 3, 4].map((age) => (
                  <button
                    key={age}
                    className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all duration-300 ${
                      activeAge === age
                        ? 'bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)] scale-105'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                    onClick={() => setActiveAge(age as 1|2|3|4)}
                  >
                    Age {"I II III IV".split(" ")[age - 1]}
                  </button>
                ))}
              </div>

              <div className="flex gap-2 glass rounded-2xl p-1.5">
                <button
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${unitView === 'units' ? 'bg-blue-600/50 text-white border border-blue-500/30' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                  onClick={() => setUnitView('units')}
                >
                  Unità & Tecnologie
                </button>
                <button
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${unitView === 'techtree' ? 'bg-blue-600/50 text-white border border-blue-500/30' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                  onClick={() => setUnitView('techtree')}
                >
                  Tech Tree
                </button>
              </div>
            </div>

            {unitView === 'units' ? (
              <UnitGrid
                civId={civId}
                age={activeAge}
                onSelectUnit={onSelectUnit}
              />
            ) : (
              <TechTree civId={civId} />
            )}
          </div>
        )}

        {/* === BUILD ORDERS === */}
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
                {civ.buildOrders.map((bo) => (
                  <div key={bo.id} className="glass p-6 rounded-2xl border border-white/5 hover:border-yellow-500/30 transition-all group">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-xl font-bold text-white group-hover:text-yellow-400 transition-colors">{bo.title}</h3>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        bo.difficulty === 'Easy' ? 'text-green-400 border-green-400/30' : 
                        bo.difficulty === 'Medium' ? 'text-yellow-400 border-yellow-400/30' : 
                        'text-red-400 border-red-400/30'
                      }`}>
                        {bo.difficulty}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400 mb-6 line-clamp-2">{bo.description}</p>
                    
                    <div className="space-y-3">
                      {bo.steps.slice(0, 3).map((step, sIdx) => (
                        <div key={sIdx} className="flex gap-3 text-xs">
                          <span className="text-yellow-500 font-mono w-8 shrink-0">{step.time || '--:--'}</span>
                          <span className="text-gray-300">{step.action}</span>
                        </div>
                      ))}
                      {bo.steps.length > 3 && (
                        <p className="text-[10px] text-gray-500 italic mt-2">+ altri {bo.steps.length - 3} passaggi...</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="glass p-10 rounded-3xl border border-yellow-500/20 text-center flex flex-col items-center">
                <div className="w-16 h-16 bg-yellow-500/10 rounded-full flex items-center justify-center mb-4 border border-yellow-500/20">
                  <Map size={32} className="text-yellow-500" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Build Orders in arrivo</h3>
                <p className="text-sm text-gray-500 max-w-sm">I build order per questa civiltà saranno aggiunti presto dai contributori della community.</p>
                <button 
                  onClick={() => setActiveTab('proponi')}
                  className="mt-6 px-8 py-3 bg-yellow-600/10 hover:bg-yellow-600/20 border border-yellow-500/30 rounded-xl text-sm text-yellow-500 font-bold transition-all"
                >
                  Proponi un Build Order →
                </button>
              </div>
            )}
          </div>
        )}

        {/* === MATCHUPS === */}
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

        {/* === VIDEO === */}
        {activeTab === 'video' && (
          <div className="max-w-4xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">
                  <Play className="text-red-500" size={24} />
                  Video Guida & Gameplay
                </h2>
                <p className="text-sm text-gray-400">Tutorial e partite commentate da <span className="text-red-400 font-bold">marcotamby_aoe</span>.</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {civ.videos && civ.videos.length > 0 ? (
                civ.videos.map((vidId, index) => {
                  // If the ID is actually a full URL, extract the ID
                  let finalId = vidId;
                  try {
                    if (vidId.includes('youtube.com') || vidId.includes('youtu.be')) {
                      const url = new URL(vidId);
                      finalId = url.searchParams.get('v') || url.pathname.slice(1) || vidId;
                    }
                  } catch(e) {}
                  
                  return (
                    <a 
                      key={`${finalId}-${index}`} 
                      href={`https://www.youtube.com/watch?v=${finalId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group relative block aspect-video w-full rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-black transition-transform hover:scale-105 hover:border-red-500/50 hover:shadow-[0_0_20px_rgba(239,68,68,0.3)]"
                    >
                      <img 
                        src={`https://img.youtube.com/vi/${finalId}/maxresdefault.jpg`} 
                        alt="Video Thumbnail"
                        className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                        onError={(e) => {
                          // Fallback to hqdefault if maxresdefault doesn't exist
                          (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${finalId}/hqdefault.jpg`;
                        }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-16 h-12 bg-red-600/90 rounded-2xl flex items-center justify-center group-hover:bg-red-500 transition-colors shadow-lg">
                          <Play size={24} fill="currentColor" className="text-white ml-1" />
                        </div>
                      </div>
                    </a>
                  );
                })
              ) : (
                <div className="glass p-12 rounded-3xl border border-white/5 text-center flex flex-col items-center">
                  <Play size={48} className="text-gray-600 mb-4" />
                  <h3 className="text-lg font-bold text-gray-400 mb-2">Video non ancora disponibili</h3>
                  <p className="text-sm text-gray-500">Stiamo preparando delle guide video dedicate a questa civiltà.</p>
                </div>
              )}
            </div>

            <div className="flex justify-center mt-4">
              <a 
                href="https://www.youtube.com/@marcotamby_aoe" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-red-600/20"
              >
                <Play size={18} fill="currentColor" />
                Visita il Canale YouTube
              </a>
            </div>
          </div>
        )}

        {/* === PROPONI MODIFICA === */}
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
