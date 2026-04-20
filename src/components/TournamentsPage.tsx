import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { fetchTournament } from '../services/startgg';
import { fetchChallongeTournament } from '../services/challonge';
import type { StartGGTournament } from '../services/startgg';
import { Trophy, Calendar, Users, ArrowRight, Loader2, Terminal } from 'lucide-react';
import { clsx } from 'clsx';
interface TournamentConfig {
  slug: string;
  source: 'startgg' | 'challonge';
  organizer: string;
  directLink?: string;
  period?: string;
}

const TOURNAMENTS: TournamentConfig[] = [
  { slug: 'torneo-1v1-2026', source: 'startgg', organizer: 'marcotamby', period: 'Gennaio - Febbraio 2026' },
  { slug: 'gyunrhoc', source: 'challonge', organizer: 'Kani', period: 'Marzo 2026' }
];

export function TournamentsPage() {
  const location = useLocation();
  const [tournaments, setTournaments] = useState<(StartGGTournament & { config: TournamentConfig })[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const isDebugMode = new URLSearchParams(location.search).get('debug') === 'true';

  const addDebugLog = (msg: string) => {
    setDebugLogs(prev => [...prev, `${new Date().toLocaleTimeString()} - ${msg}`]);
  };

  const runDebugAPI = async () => {
    addDebugLog('Avvio test manuale...');
    try {
      const data = await fetchTournament('torneo-1v1-2026');
      if (data) addDebugLog(`SUCCESSO: Trovato ${data.name}`);
      else addDebugLog('ERRORE: Risposta NULL dal server.');
    } catch (err: any) {
      addDebugLog(`ERRORE CRITICO: ${err.message}`);
    }
  };
  const navigate = useNavigate();

  useEffect(() => {
    async function loadTournaments() {
      setLoading(true);
      setErrorDetails(null);
      try {
        const results = await Promise.all(TOURNAMENTS.map(async config => {
          try {
            if (config.source === 'startgg') {
              const res = await fetchTournament(config.slug);
              return res ? { ...res, config } : null;
            } else if (config.source === 'challonge') {
              const res = await fetchChallongeTournament(config.slug);
              if (res) {
                return {
                  id: res.id,
                  name: res.attributes.name,
                  slug: config.slug,
                  images: [],
                  events: [],
                  config
                } as any;
              } else {
                // Fallback robusto: se l'API blocca l'accesso ai tornei dei collaboratori (limite OAuth v2),
                // forziamo la sua comparsa manuale nella UI per non far sparire l'evento.
                if (config.slug === 'gyunrhoc' || config.slug === '17624499') {
                  return {
                    id: 'gyunrhoc',
                    name: "Torneo degli scudi d'oro",
                    slug: config.slug,
                    images: [{ url: '/vetro_oro.png' }], // Immagine custom Inserita dall'utente
                    events: [{ 
                      name: 'Torneo 3v3', 
                      videogame: { name: 'Age of Empires IV' },
                      standings: {
                        nodes: [
                          { entrant: { name: 'Va bene tutto' } },
                          { entrant: { name: 'Scarsicomelammerda' } },
                          { entrant: { name: 'Cerbero' } }
                        ]
                      }
                    }],
                    config: { ...config, directLink: 'https://challonge.com/it/gyunrhoc' }
                  } as any;
                }
              }
            }
            return null;
          } catch (e: any) {
            console.error(`Error fetching tournament ${config.slug}:`, e);
            return null;
          }
        }));
        const filtered = results.filter((t): t is (StartGGTournament & { config: TournamentConfig }) => t !== null);
        setTournaments(filtered);
      } catch (err: any) {
        console.error("General loading error:", err);
        setErrorDetails(`Dettaglio Errore: ${err.message || 'Errore di rete o di risposta del server.'}`);
      }
      setLoading(false);
    }
    loadTournaments();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-12 h-12 text-yellow-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 md:py-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col mb-12">
        <h1 className="text-3xl md:text-5xl font-inter font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-200 to-amber-600 mb-4 uppercase tracking-tighter">
          Tornei di Aoeitalia
        </h1>
        <p className="text-gray-400 font-serif italic text-base md:text-lg max-w-2xl">
          Segui le competizioni ufficiali di Aoeitalia.
        </p>
        <div className="h-1 w-24 bg-gradient-to-r from-yellow-500/50 to-transparent mt-6"></div>
      </div>

      {errorDetails && (
        <div className="glass p-8 rounded-2xl border border-red-500/20 mb-8 text-center animate-in zoom-in duration-300">
          <p className="text-red-400 mb-2 font-bold uppercase tracking-widest text-xs">Errore di Caricamento</p>
          <p className="text-gray-300 text-sm mb-4">{errorDetails}</p>
          <div className="text-[10px] text-gray-500 font-mono p-3 bg-black/30 rounded border border-white/5">
            LOG: ensure VITE_STARTGG_TOKEN is set in Vercel Settings
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {tournaments.map((tournament) => {
          const banner = tournament.images?.find(img => img.type === 'banner')?.url || 
                         tournament.images?.[0]?.url || 
                         'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=2070&auto=format&fit=crop';
          
          return (
            <div 
              key={tournament.id}
              onClick={() => {
                if ((tournament.config as any).directLink) {
                  window.open((tournament.config as any).directLink, '_blank');
                } else {
                  navigate(`/tornei/${tournament.slug}`);
                }
              }}
              className="group relative cursor-pointer"
            >
              {/* Card Container */}
              <div className="glass rounded-2xl overflow-hidden border border-yellow-500/20 hover:border-yellow-500/50 transition-all duration-500 hover:shadow-[0_0_30px_rgba(212,175,55,0.15)] group-hover:-translate-y-2">
                
                {/* Image Section */}
                <div className="h-40 md:h-48 relative overflow-hidden bg-gray-900">
                  <img 
                    src={banner} 
                    alt={tournament.name || 'Torneo'} 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=2070&auto=format&fit=crop';
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0d1424] to-transparent"></div>
                  
                  {/* Status Badge */}
                  <div className="absolute top-4 right-4 flex flex-col items-end gap-2 z-20">
                    <div className="px-3 py-1 rounded-full bg-yellow-500/20 backdrop-blur-md border border-yellow-500/30 text-yellow-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500"></span>
                      </span>
                      Informazioni Disponibili
                    </div>
                    <div className="px-3 py-1 rounded-full bg-red-500/10 backdrop-blur-md border border-red-500/20 text-red-500/80 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 shadow-lg">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500/80"></span>
                      Concluso
                    </div>
                  </div>
                </div>

                {/* Content Section */}
                {/* Aggiunto bg-[#121620] z-10 flex-grow e -mt-[1px] per coprire il gap di 1px causato dal subpixel rendering in fase di scaling immagine */}
                <div className="p-6 relative z-10 bg-[#121620] -mt-[1px] flex flex-col flex-grow">
                  <div className="flex items-center gap-2 text-yellow-500/60 mb-2">
                    <Trophy size={14} />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#D4AF37]">organizzato da {tournament.config.organizer}</span>
                  </div>
                  
                  <h3 className="text-xl font-bold text-white mb-4 group-hover:text-yellow-400 transition-colors truncate">
                    {tournament.name || 'Torneo AoE4'}
                  </h3>

                  <div className="space-y-3 mb-6">
                    <div className="flex items-center gap-3 text-gray-400 text-sm font-medium">
                      <Calendar size={16} className="text-yellow-500/40" />
                      <span>{tournament.config.period || tournament.events?.[0]?.name || 'Evento AoE4'}</span>
                    </div>
                    <div className="flex items-center gap-3 text-gray-400 text-sm font-medium">
                      <Users size={16} className="text-yellow-500/40" />
                      <span>{tournament.events?.[0]?.videogame?.name || 'Age of Empires IV'}</span>
                    </div>
                  </div>

                  {/* Podium Section */}
                  {tournament.events?.[0]?.standings?.nodes && tournament.events[0].standings.nodes.length > 0 && (
                    <div className="mb-6 p-4 rounded-xl bg-white/[0.02] border border-white/5 animate-in slide-in-from-top-2 duration-500">
                      <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-3 border-b border-white/5 pb-2">Risultati Finali</p>
                      <div className="space-y-2">
                        {tournament.events[0].standings.nodes.map((standing, idx) => {
                          const medals = ['🥇', '🥈', '🥉'];
                          return (
                            <div key={idx} className="flex items-center justify-between group/standing">
                              <div className="flex items-center gap-2">
                                <span className="text-sm leading-none">{medals[idx]}</span>
                                <span className={clsx(
                                  "text-xs font-bold transition-colors",
                                  idx === 0 ? "text-yellow-100" : "text-gray-400"
                                )}>
                                  {standing.entrant.name}
                                </span>
                              </div>
                              <span className="text-[10px] font-black text-white/20 group-hover/standing:text-white/40 transition-colors uppercase italic">{idx === 0 ? 'Winner' : `${idx + 1}nd`}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      if ((tournament.config as any).directLink) {
                        window.open((tournament.config as any).directLink, '_blank');
                      } else {
                        navigate(`/tornei/${tournament.slug}?source=${tournament.config.source}&organizer=${tournament.config.organizer}`);
                      }
                    }}
                    className="w-full py-3 bg-yellow-600/10 hover:bg-yellow-600/20 border border-yellow-500/30 rounded-xl text-yellow-500 font-bold uppercase text-xs tracking-widest transition-all flex items-center justify-center gap-2 group/btn"
                  >
                    Dettagli e Tabellone
                    <ArrowRight size={14} className="transition-transform group-hover/btn:translate-x-1" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {/* Placeholder for "Proponi Torneo" or similar */}
        <div className="flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed border-white/5 bg-white/[0.02] text-center group hover:border-white/10 transition-colors">
          <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Trophy className="text-gray-500" />
          </div>
          <h4 className="text-gray-400 font-bold uppercase tracking-widest text-sm mb-2">Nuovo Torneo?</h4>
          <p className="text-gray-600 text-xs italic">Presto nuovi eventi ufficiali!</p>
        </div>
        {/* Debug Panel (Solo se ?debug=true nell'URL) */}
        {isDebugMode && (
          <div className="mt-20 p-6 glass border border-yellow-500/30 rounded-3xl animate-in fade-in slide-in-from-bottom-5 duration-500">
            <div className="flex items-center gap-3 mb-6 text-yellow-500">
              <Terminal size={24} />
              <h2 className="text-xl font-cinzel font-bold uppercase tracking-widest">Dashboard di Diagnostica</h2>
            </div>
            
            <button 
              onClick={runDebugAPI}
              className="mb-6 px-6 py-2 bg-yellow-500 text-black font-black uppercase text-[10px] tracking-widest rounded-xl hover:bg-yellow-400 transition-all"
            >
              Test Connessione Start.gg
            </button>

            <div className="bg-black/60 p-4 rounded-xl border border-white/5 font-mono text-[10px] space-y-1 max-h-60 overflow-y-auto elegant-scrollbar">
              {debugLogs.map((log, i) => (
                <p key={i} className={log.includes('ERRORE') ? 'text-red-400' : 'text-gray-400'}>{log}</p>
              ))}
              {debugLogs.length === 0 && <p className="text-gray-600 italic">Pronto per il test. Clicca il tasto sopra.</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
