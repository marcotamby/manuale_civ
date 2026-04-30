import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Shield, 
  Sword, 
  Info, 
  Zap, 
  ChevronUp, 
  ChevronDown, 
  Map, 
  BarChart2, 
  BookOpen, 
  Plus, 
  HelpCircle, 
  Play, 
  AlertTriangle,
  History,
  Target,
  Edit,
  Save,
  Trash2,
  Settings,
  Trophy,
  Users,
  Search,
  ExternalLink,
  MessageSquare,
  Hash,
  ArrowRight
} from 'lucide-react';
import { civilizationsData, Civilization } from '../data/aoe4Data';
import { BuildOrderView } from './BuildOrderView';
import { TournamentCard } from './TournamentCard';
import { MatchupsTable } from './MatchupsTable';
import { FAQSection } from './FAQSection';
import { BuildOrderEditor } from './BuildOrderEditor';
import { AdminCivEditorModal } from './AdminCivEditorModal';
import { useAuth } from './AuthContext';
import { useCivData } from './CivContext';
import { usePresence } from './PresenceContext';
import { supabase } from '../lib/supabaseClient';
import { VideoCard } from './VideoCard';
import { BuildOrderCard } from './BuildOrderCard';
import { BuildOrder } from '../data/aoe4Data';
import { Helmet } from 'react-helmet-async';
import { QASystem } from './QASystem';

interface CivViewProps {
  civId: string;
  onBack: () => void;
}

type Tab = 'caratteristiche' | 'units' | 'buildorders' | 'matchups' | 'video' | 'domande' | 'proponi' | 'admin-edit';

export function CivView({ civId, onBack }: CivViewProps) {
  const { user } = useAuth();
  const { civs, loading: civsLoading, reloadCivs } = useCivData();
  const { updateActivity } = usePresence();
  
  // Find current civ from context
  const civ = useMemo(() => civs.find(c => c.id === civId), [civs, civId]);
  
  const [activeTab, setActiveTab] = useState<Tab>('caratteristiche');
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editorSection, setEditorSection] = useState<string | undefined>(undefined);
  const [editorId, setEditorId] = useState<string | undefined>(undefined);
  const [isBOEditorOpen, setIsBOEditorOpen] = useState(false);
  const [editingBOIndex, setEditingBOIndex] = useState<number | null>(null);

  // Sync tab with URL if needed, or handle deep linking
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab') as Tab;
    if (tab && ['caratteristiche', 'units', 'buildorders', 'matchups', 'video', 'domande', 'proponi', 'admin-edit'].includes(tab)) {
      setActiveTab(tab);
    }
  }, []);

  // Update URL when tab changes
  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set('tab', activeTab);
    window.history.replaceState({}, '', url);
    
    // Update presence activity based on tab
    updateActivity({ 
      type: 'viewing', 
      civId: civId, 
      section: activeTab 
    });
  }, [activeTab, civId]);

  // Expose function to global scope so BuildOrderCard can call it
  useEffect(() => {
    (window as any).openCivEditor = (section?: string, id?: string) => {
      setEditorSection(section);
      setEditorId(id);
      setIsEditorOpen(true);
    };

    (window as any).openBOEditor = (civId: string, index: number | null) => {
      setEditingBOIndex(index);
      setIsBOEditorOpen(true);
    };

    return () => {
      delete (window as any).openCivEditor;
      delete (window as any).openBOEditor;
    };
  }, []);

  if (civsLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-4" />
        <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Caricamento civiltà...</p>
      </div>
    );
  }

  if (!civ) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
        <AlertTriangle className="text-yellow-500 mb-4" size={48} />
        <h2 className="text-2xl font-bold text-white mb-2">Civiltà non trovata</h2>
        <p className="text-gray-400 mb-6">La civiltà che stai cercando non esiste o è stata rimossa.</p>
        <button onClick={onBack} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg font-bold transition-all">
          Torna alla Home
        </button>
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'caratteristiche', label: 'Overview', icon: <Info size={16} /> },
    { id: 'units', label: 'Unità & Tech', icon: <Sword size={16} /> },
    { id: 'buildorders', label: 'Build Orders', icon: <Map size={16} /> },
    { id: 'matchups', label: 'Matchups', icon: <BarChart2 size={16} /> },
    { id: 'video', label: 'Video', icon: <Play size={16} /> },
    { id: 'domande', label: 'Q&A', icon: <MessageSquare size={16} /> },
  ];

  if (user?.email === 'admin@manualeciv.it' || user?.email === 'marcotamby@hotmail.it') {
    tabs.push({ id: 'admin-edit', label: 'Editor', icon: <Settings size={16} /> });
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8 animate-in fade-in duration-700">
      <Helmet>
        <title>{`${civ.name} - Guida Completa Age of Empires IV`}</title>
        <meta name="description" content={`Tutto sulla civiltà ${civ.name} di AoE4: Build Orders, Matchups, Unità Uniche e Video Guide strategiche.`} />
      </Helmet>

      {/* Header Section */}
      <div className="relative mb-12">
        <button 
          onClick={onBack}
          className="group flex items-center gap-2 text-gray-400 hover:text-white transition-all mb-6 bg-white/5 px-4 py-2 rounded-full border border-white/10 hover:bg-white/10"
        >
          <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm font-bold uppercase tracking-widest">Torna alle Civiltà</span>
        </button>

        <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
          <div className="relative group">
             <div className="absolute inset-0 bg-blue-500/20 blur-2xl group-hover:bg-blue-500/30 transition-all rounded-full" />
             <img 
               src={civ.flag} 
               alt={civ.name} 
               className="w-32 h-32 md:w-40 md:h-40 object-contain relative drop-shadow-[0_0_20px_rgba(212,175,55,0.3)] animate-in zoom-in duration-700" 
             />
          </div>
          
          <div className="flex-1 text-center md:text-left">
            <div className="flex flex-col md:flex-row md:items-center gap-4 mb-4">
              <h1 className="text-5xl md:text-6xl font-black text-white tracking-tighter drop-shadow-lg font-sackers uppercase italic">
                {civ.name}
              </h1>
              <div className={`px-4 py-1.5 rounded-full border text-sm font-black uppercase tracking-[0.2em] w-fit mx-auto md:mx-0 shadow-lg ${
                civ.difficulty === 'Facile' ? 'bg-green-500/10 text-green-400 border-green-500/30' :
                civ.difficulty === 'Medio' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30' :
                'bg-red-500/10 text-red-400 border-red-500/30'
              }`}>
                {civ.difficulty}
              </div>
            </div>
            
            <p className="text-lg md:text-xl text-gray-300 leading-relaxed max-w-3xl italic font-medium">
              "{civ.shortDescription}"
            </p>

            <div className="flex flex-wrap justify-center md:justify-start gap-3 mt-6">
              {civ.strengths?.slice(0, 3).map((strength, i) => (
                <div key={i} className="flex items-center gap-2 bg-green-500/10 text-green-400 px-3 py-1 rounded-lg border border-green-500/20 text-xs font-bold uppercase tracking-wide">
                  <ChevronUp size={14} /> {strength}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 mb-8 bg-black/40 p-1.5 rounded-2xl border border-white/10 backdrop-blur-sm overflow-x-auto no-scrollbar">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all whitespace-nowrap tracking-wide uppercase ${
              activeTab === tab.id 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 scale-105' 
                : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[500px]">
        {activeTab === 'caratteristiche' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Left Column: Bonuses */}
            <div className="lg:col-span-2 space-y-8">
              <div className="bg-black/40 border border-white/10 rounded-3xl p-8 backdrop-blur-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Zap size={120} />
                </div>
                <h3 className="text-2xl font-black text-white mb-6 uppercase tracking-widest flex items-center gap-3">
                  <Zap className="text-yellow-500" />
                  Caratteristiche & Bonus
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {civ.passiveBonuses.map((bonus, i) => (
                    <div key={i} className="flex gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-yellow-500/30 transition-all group/bonus">
                      <div className="w-8 h-8 rounded-lg bg-yellow-500/10 flex items-center justify-center shrink-0 border border-yellow-500/20">
                        <span className="text-yellow-500 font-black text-xs">{i + 1}</span>
                      </div>
                      <p className="text-sm text-gray-300 leading-relaxed group-hover/bonus:text-white transition-colors">{bonus}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* S.W.O.T. - Strengths & Weaknesses */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-green-500/5 border border-green-500/20 rounded-3xl p-8 backdrop-blur-sm">
                  <h3 className="text-xl font-black text-green-400 mb-6 uppercase tracking-widest flex items-center gap-3">
                    <ChevronUp size={24} /> Punti di Forza
                  </h3>
                  <ul className="space-y-4">
                    {civ.strengths?.map((s, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm text-gray-300">
                        <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-green-500 shrink-0 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="bg-red-500/5 border border-red-500/20 rounded-3xl p-8 backdrop-blur-sm">
                  <h3 className="text-xl font-black text-red-400 mb-6 uppercase tracking-widest flex items-center gap-3">
                    <ChevronDown size={24} /> Punti Deboli
                  </h3>
                  <ul className="space-y-4">
                    {civ.weaknesses?.map((w, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm text-gray-300">
                        <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-red-500 shrink-0 shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
                        {w}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Right Column: Mini-Landmarks / Quick Info */}
            <div className="space-y-6">
               <div className="bg-gradient-to-br from-blue-900/20 to-purple-900/20 border border-white/10 rounded-3xl p-8 backdrop-blur-sm text-center">
                  <Trophy className="text-yellow-500 mx-auto mb-4" size={40} />
                  <h4 className="text-xl font-black text-white uppercase tracking-widest mb-2">Meta Status</h4>
                  <p className="text-gray-400 text-sm mb-6">Analisi basata sull'attuale patch e statistiche globali.</p>
                  <div className="flex justify-center gap-4">
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-1">Pick Rate</span>
                      <span className="text-2xl font-black text-white">Alto</span>
                    </div>
                    <div className="w-px h-10 bg-white/10" />
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-1">Win Rate</span>
                      <span className="text-2xl font-black text-white">52.4%</span>
                    </div>
                  </div>
               </div>

               <div className="bg-black/40 border border-white/10 rounded-3xl p-8 backdrop-blur-sm">
                  <h4 className="text-lg font-black text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                    <History size={20} className="text-blue-400" /> Ultime Modifiche
                  </h4>
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                      <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest block mb-1">Patch 10.1.48</span>
                      <p className="text-xs text-gray-400">Ridotto il costo in risorse delle unità religiose del 10%.</p>
                    </div>
                    <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                      <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-1">Patch 9.2.12</span>
                      <p className="text-xs text-gray-400">Aumentata la velocità di costruzione dei Landmark del 5%.</p>
                    </div>
                  </div>
               </div>
            </div>
          </div>
        )}

        {activeTab === 'units' && (
          <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Unique Units Section */}
            <div>
              <div className="flex items-center gap-4 mb-8">
                <h2 className="text-3xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
                  <Sword className="text-blue-500" size={32} />
                  Unità Uniche
                </h2>
                <div className="h-px flex-1 bg-gradient-to-r from-blue-500/30 to-transparent"></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {civ.uniqueUnits.map((unit, i) => (
                  <div key={i} className="group bg-black/40 border border-white/10 rounded-3xl overflow-hidden hover:border-blue-500/50 transition-all duration-500 hover:shadow-[0_0_30px_rgba(59,130,246,0.1)]">
                    <div className="aspect-video relative overflow-hidden bg-gray-900">
                       <img 
                         src={unit.imageId ? (unit.imageId.startsWith('http') ? unit.imageId : `https://aoe4world.com/assets/units/${unit.imageId}.png`) : `https://via.placeholder.com/400x225?text=${unit.name}`} 
                         alt={unit.name} 
                         className="w-full h-full object-contain p-4 group-hover:scale-110 transition-transform duration-700"
                       />
                       <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/20 text-[10px] font-black text-white uppercase tracking-widest">
                         Età {unit.age === 1 ? 'I' : unit.age === 2 ? 'II' : unit.age === 3 ? 'III' : 'IV'}
                       </div>
                    </div>
                    <div className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h4 className="text-xl font-black text-white uppercase tracking-tighter mb-1">{unit.name}</h4>
                          <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">{unit.type}</span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-400 line-clamp-3 mb-6 leading-relaxed italic">"{unit.description}"</p>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                           <span className="text-[10px] font-black text-green-500 uppercase tracking-widest block">Punti di Forza</span>
                           <ul className="space-y-1">
                             {unit.strengths.slice(0, 2).map((s, idx) => (
                               <li key={idx} className="text-[10px] text-gray-400 flex items-center gap-1">
                                 <ChevronUp size={10} className="text-green-500" /> {s}
                               </li>
                             ))}
                           </ul>
                        </div>
                        <div className="space-y-2">
                           <span className="text-[10px] font-black text-red-500 uppercase tracking-widest block">Debole Contro</span>
                           <ul className="space-y-1">
                             {unit.weaknesses.slice(0, 2).map((w, idx) => (
                               <li key={idx} className="text-[10px] text-gray-400 flex items-center gap-1">
                                 <ChevronDown size={10} className="text-red-500" /> {w}
                               </li>
                             ))}
                           </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Landmarks Section */}
            <div>
              <div className="flex items-center gap-4 mb-8">
                <h2 className="text-3xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
                  <Shield className="text-purple-500" size={32} />
                  Landmarks Strategici
                </h2>
                <div className="h-px flex-1 bg-gradient-to-r from-purple-500/30 to-transparent"></div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {[2, 3, 4].map(age => (
                  <div key={age} className="space-y-4">
                    <h3 className="text-lg font-black text-purple-400 uppercase tracking-widest flex items-center gap-2 px-2">
                       Passaggio all'Età {age === 2 ? 'II' : age === 3 ? 'III' : 'IV'}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {civ.landmarks.filter(l => l.age === age).map((landmark, i) => (
                        <div key={i} className="bg-black/40 border border-white/10 rounded-3xl p-6 hover:border-purple-500/50 transition-all group">
                          <div className="flex items-center gap-4 mb-4">
                            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20 group-hover:scale-110 transition-transform">
                               <Shield className="text-purple-500" size={24} />
                            </div>
                            <div>
                               <h4 className="font-black text-white uppercase tracking-tighter text-sm">{landmark.name}</h4>
                               <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest">{landmark.type}</span>
                            </div>
                          </div>
                          <p className="text-xs text-gray-400 leading-relaxed italic">"{landmark.description}"</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'buildorders' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-4">
              <div>
                <h2 className="text-3xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
                  <Map className="text-yellow-500" size={32} />
                  Build Orders
                </h2>
                <p className="text-gray-400 mt-1">Piani d'azione dettagliati per dominare l'early game.</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 px-4 py-2 bg-yellow-500/10 border border-yellow-500/20 rounded-full text-xs font-bold text-yellow-500">
                  <Target size={14} /> {civ.buildOrders.length} Strategie Disponibili
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {civ.buildOrders.map((bo, i) => (
                <BuildOrderCard 
                  key={bo.id || i} 
                  bo={bo} 
                  civId={civId} 
                  onClick={() => {}} // Now handled by global state or link
                />
              ))}
              <div className="group bg-black/20 border-2 border-dashed border-white/5 rounded-3xl p-8 flex flex-col items-center justify-center text-center hover:border-blue-500/30 transition-all cursor-pointer">
                 <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                   <Plus className="text-gray-500 group-hover:text-blue-500" size={32} />
                 </div>
                 <h4 className="text-lg font-black text-gray-400 uppercase tracking-widest mb-2 group-hover:text-white transition-colors">Proponi una Build</h4>
                 <p className="text-xs text-gray-500 max-w-[200px]">Hai una strategia vincente? Condividila con la community.</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'matchups' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">
                <BarChart2 className="text-blue-400" size={24} />
                Matchup 1v1
              </h2>
              <p className="text-sm text-gray-400">Statistiche aggiornate in tempo reale</p>
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
                className="group flex items-center gap-3 bg-[#FF0000] hover:bg-[#CC0000] text-white px-6 py-3 rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-lg shadow-red-600/20 active:scale-95"
              >
                <Play fill="currentColor" size={20} />
                Canale YouTube
                <ExternalLink size={14} className="opacity-50 group-hover:translate-x-1 transition-transform" />
              </a>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {(civ.videos || []).length > 0 ? (
                (civ.videos || []).map((videoId) => (
                  <VideoCard key={videoId} videoId={videoId} />
                ))
              ) : (
                <div className="col-span-full py-20 text-center glass border border-white/5 rounded-3xl">
                   <Play size={48} className="text-gray-700 mx-auto mb-4 opacity-20" />
                   <h3 className="text-xl font-bold text-gray-500 uppercase tracking-widest">Nessun video disponibile</h3>
                   <p className="text-gray-600 text-sm mt-2">Torna presto per nuove guide e partite commentate!</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'domande' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
             <QASystem civId={civId} />
          </div>
        )}

        {activeTab === 'proponi' && (
          <div className="max-w-3xl mx-auto py-20 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="w-24 h-24 rounded-full bg-blue-500/10 border-2 border-dashed border-blue-500/30 flex items-center justify-center mx-auto mb-8">
                <HelpCircle className="text-blue-500" size={48} />
             </div>
             <h2 className="text-4xl font-black text-white uppercase tracking-tighter mb-4">Contribuisci alla Guida</h2>
             <p className="text-gray-400 text-lg leading-relaxed mb-10">
               Pensi che manchi qualcosa? Hai una strategia particolare per i <span className="text-blue-400 font-bold">{civ.name}</span> che vorresti condividere?
               Siamo sempre alla ricerca di nuovi contenuti per migliorare il Manuale delle Civiltà.
             </p>
             <button className="group bg-blue-600 hover:bg-blue-500 text-white px-10 py-4 rounded-2xl font-black text-lg uppercase tracking-widest transition-all shadow-xl shadow-blue-600/20 flex items-center gap-3 mx-auto">
                Invia Proposta
                <ArrowRight size={24} className="group-hover:translate-x-2 transition-transform" />
             </button>
          </div>
        )}

        {activeTab === 'admin-edit' && (
          <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-purple-500/30 rounded-3xl bg-purple-500/5 animate-in fade-in duration-500">
            <Settings className="text-purple-500 mb-6" size={64} />
            <h2 className="text-3xl font-bold text-white mb-2">Pannello Amministrazione</h2>
            <p className="text-gray-400 mb-8">Gestisci i dati della civiltà direttamente da qui.</p>
            <div className="flex gap-4">
              <button 
                onClick={() => setIsEditorOpen(true)}
                className="bg-purple-600 hover:bg-purple-500 text-white px-8 py-3 rounded-2xl font-black text-sm uppercase tracking-widest transition-all flex items-center gap-2 shadow-xl shadow-purple-600/30"
              >
                <Edit size={18} /> Apri Editor Civiltà
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Editor Modals */}
      <AdminCivEditorModal 
        civ={civ} 
        isOpen={isEditorOpen} 
        onClose={() => {
          setIsEditorOpen(false);
          setEditorSection(undefined);
          setEditorId(undefined);
        }}
        onSave={(updated) => {
          reloadCivs();
          setIsEditorOpen(false);
          setEditorSection(undefined);
          setEditorId(undefined);
        }}
        initialSection={editorSection}
        initialId={editorId}
      />

      {isBOEditorOpen && (
        <BuildOrderEditor
          civId={civId}
          boIndex={editingBOIndex}
          isOpen={isBOEditorOpen}
          onClose={() => {
            setIsBOEditorOpen(false);
            setEditingBOIndex(null);
          }}
          onSave={() => {
            reloadCivs();
            setIsBOEditorOpen(false);
            setEditingBOIndex(null);
          }}
        />
      )}
    </div>
  );
}
