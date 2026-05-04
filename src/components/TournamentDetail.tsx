/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import { useSearchParams, useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { fetchTournament } from '../services/startgg';
import { fetchChallongeTournament, fetchChallongeData, mapChallongeToUnified } from '../services/challonge';
// I tipi vengono gestiti internamente come any per compatibilità Start.gg/Challonge
import { Loader2, ArrowLeft, Trophy, Users, Shield, ArrowRight } from 'lucide-react';
import { TournamentBracket } from './TournamentBracket';

export function TournamentDetail() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const eventParam = searchParams.get('event');
  const source = searchParams.get('source') || 'startgg';
  const organizer = searchParams.get('organizer') || 'marcotamby';
  
  const navigate = useNavigate();
  const [tournament, setTournament] = useState<any>(null);
  const [selectedPhase, setSelectedPhase] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [detailError, setDetailError] = useState<string | null>(null);

  useEffect(() => {
    async function loadTournament() {
      if (!slug) return;
      setLoading(true);
      setDetailError(null);
      try {
        // 1. Get metadata from our DB first
        const [baseSlug] = (slug || '').split('?');
        
        // Fetch DB info first and more reliably
        const { data: dbTournament } = await supabase
          .from('tournaments')
          .select('*')
          .or(`slug.ilike.${baseSlug.trim()},slug.ilike.${baseSlug.trim()}/`)
          .maybeSingle();

        const activeSource = dbTournament?.source || source;

        // 2. Try to fetch external data
        try {
          if (activeSource === 'challonge') {
            const [tData, dData] = await Promise.all([
              fetchChallongeTournament(slug),
              fetchChallongeData(slug)
            ]);
            
            if (tData && dData) {
              const unifiedPhase = {
                id: 'challonge-main',
                name: 'Tabellone',
                bracketType: tData.attributes.tournament_type === 'round robin' ? 'ROUND_ROBIN' : 'DOUBLE_ELIMINATION',
                rounds: mapChallongeToUnified(dData.matches, dData.participants)
              };
              setTournament({ ...tData, db: dbTournament });
              setSelectedPhase(unifiedPhase);
            }
          } else {
            const data = await fetchTournament(slug);
            if (data) {
              setTournament({ ...data, db: dbTournament });
              if (data.events && data.events.length > 0) {
                // Priorità 1: Parametro ?event= nell'URL
                let targetEvent = null;
                if (eventParam) {
                  targetEvent = data.events.find(e => 
                    e.slug?.toLowerCase().includes(eventParam.toLowerCase()) || 
                    e.name.toLowerCase().includes(eventParam.toLowerCase())
                  );
                }
                
                // Priorità 2: Cerca 1v1 o prendi il primo
                if (!targetEvent) {
                  targetEvent = data.events.find(e => e.name.toLowerCase().includes('1v1')) || data.events[0];
                }

                if (targetEvent.phases && targetEvent.phases.length > 0) {
                  setSelectedPhase(targetEvent.phases[0]);
                  
                  // Se l'utente non aveva specificato un evento nell'URL, lo aggiungiamo ora
                  if (!eventParam) {
                    const newParams = new URLSearchParams(window.location.search);
                    newParams.set('event', targetEvent.name.toLowerCase().replace(/[^a-z0-9]/g, '-'));
                    setSearchParams(newParams, { replace: true });
                  }
                }
              }
            } else if (dbTournament) {
               // Fallback to DB info if Start.gg fails
               setTournament({ name: dbTournament.name, db: dbTournament, events: [], images: [{ url: dbTournament.banner_url, type: 'banner' }] });
            }
          }
        } catch (fetchErr) {
          console.warn("External fetch failed, falling back to DB info:", fetchErr);
          if (dbTournament) {
            setTournament({ name: dbTournament.name, db: dbTournament, events: [], images: [{ url: dbTournament.banner_url, type: 'banner' }] });
          } else {
            throw fetchErr;
          }
        }
      } catch (err: any) {
        console.error("Detail load error:", err);
        setDetailError(err.message || "Impossibile caricare i dettagli del torneo.");
      }
      setLoading(false);
    }
    loadTournament();
  }, [slug]);

  // Auto-redirect for Challonge only (to preserve legacy behavior)
  useEffect(() => {
    const isChallonge = source === 'challonge' || tournament?.db?.source === 'challonge';
    if (!loading && !selectedPhase && tournament?.db?.direct_link && isChallonge) {
      window.location.replace(tournament.db.direct_link);
    }
  }, [loading, selectedPhase, tournament, source]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-12 h-12 text-blue-400 animate-spin" />
      </div>
    );
  }

  if (detailError) {
    return (
      <div className="text-center py-20 px-4">
        <div className="glass p-8 rounded-2xl border border-red-500/20 max-w-xl mx-auto">
          <h2 className="text-2xl font-cinzel text-red-400 mb-4">Errore Tecnico</h2>
          <p className="text-gray-400 mb-6 italic">{detailError}</p>
          <button 
            onClick={() => navigate('/tornei')} 
            className="px-6 py-2 bg-yellow-600/10 hover:bg-yellow-600/20 border border-yellow-500/30 rounded-xl text-yellow-500 font-bold uppercase text-xs tracking-widest transition-all"
          >
            Torna ai tornei
          </button>
        </div>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-cinzel text-red-400">Torneo non trovato</h2>
        <button onClick={() => navigate('/tornei')} className="mt-4 text-yellow-500 hover:underline">Torna alla lista</button>
      </div>
    );
  }

  const banner = source === 'challonge' 
    ? 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=2070&auto=format&fit=crop'
    : (tournament.images?.find((img: any) => img.type === 'banner')?.url || tournament.images?.[0]?.url || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=2070&auto=format&fit=crop');

  const profileImage = source === 'challonge'
    ? banner
    : (tournament.images?.find((img: any) => img.type === 'profile')?.url || 
       tournament.images?.find((img: any) => img.type !== 'banner')?.url || 
       banner);

  return (
    <div className="flex flex-col min-h-screen bg-[#0a0a0b]">
      {/* Hero Header */}
      <div className="relative h-[250px] md:h-[350px] overflow-hidden">
        <img src={banner} className="w-full h-full object-cover opacity-40 blur-sm scale-105" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0b] via-[#0a0a0b]/60 to-transparent"></div>
        
        <div className="absolute bottom-0 left-0 right-0 max-w-7xl mx-auto px-4 pb-8 md:pb-12">
          <button 
            onClick={() => navigate('/tornei')}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6 group text-sm uppercase tracking-widest font-bold"
          >
            <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-1" />
            Torna ai tornei
          </button>
          
          <div className="flex items-end gap-6">
            <div className="hidden md:block w-32 h-32 rounded-2xl glass border border-yellow-500/30 overflow-hidden shrink-0 shadow-2xl">
              <img src={profileImage} className="w-full h-full object-cover" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 text-yellow-500 mb-2">
                <Trophy size={18} />
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">organizzato da {organizer}</span>
              </div>
              <h1 className="text-4xl md:text-6xl font-sackers font-black text-white uppercase tracking-tighter leading-none mb-4">
                {source === 'challonge' ? tournament.attributes.name : tournament.name}
              </h1>
              <div className="flex flex-wrap gap-6 text-gray-400 text-sm font-medium mb-8">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full animate-pulse ${
                    (tournament.db?.status === 'Concluso') ? 'bg-red-500' : 
                    (tournament.db?.status === 'Programmato') ? 'bg-blue-500' : 
                    (tournament.db?.status === 'In corso') ? 'bg-green-500' :
                    (tournament.state === 3 || tournament.state === 'COMPLETED' ? 'bg-red-500' : 
                     (tournament.state === 1 || tournament.state === 'CREATED' ? 'bg-blue-500' : 'bg-green-500'))
                  }`}></span>
                  {tournament.db?.status || (tournament.state === 3 || tournament.state === 'COMPLETED' ? 'Concluso' : 
                   (tournament.state === 1 || tournament.state === 'CREATED' ? 'Programmato' : 'In corso'))}
                </div>
                <div className="flex items-center gap-2">
                  <Users size={16} />
                  {source === 'challonge' ? 'Challonge Tournament' : (tournament.events?.[0]?.videogame?.name || 'Age of Empires IV')}
                </div>
                <div className="flex items-center gap-2">
                  <Shield size={16} />
                  {source === 'challonge' ? 'Tabellone' : (tournament.events?.find((e: any) => e.phases?.some((p: any) => p.id === selectedPhase?.id))?.name || tournament.events?.[0]?.name || 'Evento')}
                </div>
              </div>

              {tournament.db?.direct_link && (
                <button 
                  onClick={() => window.open(tournament.db.direct_link, '_blank')}
                  className="flex items-center gap-3 px-10 py-4 bg-white/5 hover:bg-white/10 rounded-2xl text-white font-black uppercase text-[10px] tracking-[0.2em] transition-all border border-white/5 hover:border-white/20 active:scale-95 shadow-2xl group/external"
                >
                  Tabellone <ArrowRight size={16} className="group-hover/external:translate-x-1 transition-transform" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs / Phases Navigation */}
      {source !== 'challonge' && (
        <div className="sticky top-0 z-30 bg-[#0a0a0b]/80 backdrop-blur-xl border-b border-white/5">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-center gap-8 overflow-x-auto elegant-scrollbar pb-px">
               {tournament.events?.flatMap((e: any) => 
                 (e.phases || []).map((phase: any) => ({ ...phase, eventName: e.name }))
               ).map((phase: any) => {
                const hasMultipleEvents = (tournament.events?.length || 0) > 1;
                const hasMultiplePhases = (tournament.events?.find((e: any) => e.name === phase.eventName)?.phases?.length || 0) > 1;
                
                let label = phase.name;
                if (hasMultipleEvents) {
                  if (hasMultiplePhases) {
                    label = `${phase.eventName} - ${phase.name}`;
                  } else {
                    label = phase.eventName;
                  }
                }

                return (
                  <button
                    key={phase.id}
                    onClick={() => {
                      setSelectedPhase(phase);
                      // Aggiorna l'URL senza ricaricare la pagina
                      const newParams = new URLSearchParams(window.location.search);
                      newParams.set('event', phase.eventName.toLowerCase().replace(/[^a-z0-9]/g, '-'));
                      setSearchParams(newParams, { replace: true });
                    }}
                    className={`py-4 text-xs font-black uppercase tracking-[0.2em] whitespace-nowrap transition-all border-b-2 ${
                      selectedPhase?.id === phase.id 
                        ? 'border-yellow-500 text-yellow-500' 
                        : 'border-transparent text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-full overflow-hidden">
        {selectedPhase ? (
          <TournamentBracket phase={selectedPhase} />
        ) : (
          <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
            <div className="glass p-12 rounded-[3rem] border border-white/10 max-w-lg w-full shadow-2xl relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
              
              <div className="relative z-10">
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-8 border border-white/10">
                  <Trophy className="text-yellow-500/50" size={24} />
                </div>
                
                <h3 className="text-xl font-bold text-white uppercase tracking-tighter mb-4">Informazioni Torneo</h3>
                <p className="text-xs text-gray-400 mb-10 italic leading-relaxed px-6">
                  Per visualizzare il tabellone completo e i match in tempo reale, visita la pagina ufficiale del torneo.
                </p>
                
                {tournament.db?.direct_link ? (
                  <button 
                    onClick={() => window.open(tournament.db.direct_link, '_blank')}
                    className="flex items-center justify-center gap-3 w-full py-5 bg-white/5 hover:bg-white/10 rounded-2xl text-white font-black uppercase text-xs tracking-wider transition-all border border-white/10 shadow-lg active:scale-95 group/btn"
                  >
                    Tabellone <ArrowRight size={16} className="group-hover/btn:translate-x-1 transition-transform" />
                  </button>
                ) : (
                  <p className="text-yellow-500/50 text-[10px] font-black uppercase tracking-widest">Tabellone non ancora disponibile</p>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
