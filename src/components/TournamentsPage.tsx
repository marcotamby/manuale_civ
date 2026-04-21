import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchTournament } from '../services/startgg';
import { fetchChallongeTournament } from '../services/challonge';
import type { StartGGTournament } from '../services/startgg';
import { Trophy, Calendar, Users, ArrowRight, Loader2, Plus, Link as LinkIcon, X, CheckCircle2 } from 'lucide-react';
import { clsx } from 'clsx';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabaseClient';
import { toast } from 'react-hot-toast';
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
  const { isAdmin, user } = useAuth();
  const [tournaments, setTournaments] = useState<(StartGGTournament & { config: TournamentConfig })[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const navigate = useNavigate();

  const loadTournaments = async () => {
    setLoading(true);
    try {
      // 1. Fetch from Supabase
      const { data: dbTournaments, error: dbError } = await supabase
        .from('tournaments')
        .select('*')
        .order('created_at', { ascending: false });

      if (dbError) throw dbError;

      // 2. Combine with hardcoded ones (ensuring no duplicates)
      const allConfigs: TournamentConfig[] = [...TOURNAMENTS];
      dbTournaments?.forEach(db => {
        if (!allConfigs.some(c => c.slug === db.slug)) {
          allConfigs.push({
            slug: db.slug,
            source: db.source as 'startgg' | 'challonge',
            organizer: db.organizer,
            directLink: db.direct_link,
            period: db.period
          });
        }
      });

      const results = await Promise.all(allConfigs.map(async config => {
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
                config: { ...config, directLink: config.directLink || `https://challonge.com/it/${config.slug}` }
              } as any;
            } else if (config.slug === 'gyunrhoc') {
              return {
                id: 'gyunrhoc',
                name: "Torneo degli scudi d'oro",
                slug: config.slug,
                images: [{ url: '/vetro_oro.png' }],
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
          return null;
        } catch (e) {
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
  };

  useEffect(() => {
    loadTournaments();
  }, []);

  const handleAddTournament = async () => {
    if (!newUrl) return;
    setIsSubmitting(true);
    try {
      let source: 'startgg' | 'challonge' | null = null;
      let slug = '';

      if (newUrl.includes('start.gg')) {
        source = 'startgg';
        const parts = newUrl.split('/tournament/');
        if (parts.length > 1) slug = parts[1].split('/')[0];
      } else if (newUrl.includes('challonge.com')) {
        source = 'challonge';
        const parts = newUrl.split('/');
        slug = parts[parts.length - 1];
        if (slug === '') slug = parts[parts.length - 2];
      }

      if (!source || !slug) {
        toast.error('URL non valido. Inserisci un link di Start.gg o Challonge.');
        setIsSubmitting(false);
        return;
      }

      const { error } = await supabase.from('tournaments').insert({
        slug,
        source,
        organizer: user?.name || 'Admin',
        period: 'In corso'
      });

      if (error) throw error;

      toast.success('Torneo aggiunto con successo!');
      setShowAddModal(false);
      setNewUrl('');
      loadTournaments();
    } catch (err: any) {
      toast.error(`Errore: ${err.message}`);
    }
    setIsSubmitting(false);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-12 h-12 text-yellow-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 md:py-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6">
        <div>
          <h1 className="text-3xl md:text-5xl font-inter font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-200 to-amber-600 mb-4 uppercase tracking-tighter">
            Tornei di Aoeitalia
          </h1>
          <p className="text-gray-400 font-serif italic text-base md:text-lg max-w-2xl">
            Segui le competizioni ufficiali di Aoeitalia.
          </p>
          <div className="h-1 w-24 bg-gradient-to-r from-yellow-500/50 to-transparent mt-6"></div>
        </div>

        {isAdmin && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-3 px-6 py-4 bg-gradient-to-b from-slate-100 to-gray-400 font-black text-black rounded-2xl hover:from-white hover:to-gray-300 transition-all hover:scale-[1.05] shadow-[0_0_20px_rgba(255,255,255,0.1)] uppercase text-xs tracking-widest active:scale-[0.98]"
          >
            <Plus size={20} strokeWidth={3} />
            Aggiungi Torneo
          </button>
        )}
      </div>

      {/* Modal Aggiungi Torneo */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-12">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowAddModal(false)} />
          <div className="relative w-full max-w-lg glass rounded-3xl border border-white/10 shadow-2xl overflow-hidden animate-in zoom-in duration-300">
            <div className="p-8">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3 text-yellow-500">
                  <Trophy size={28} />
                  <h2 className="text-2xl font-inter font-black uppercase tracking-tighter">Inserisci Torneo</h2>
                </div>
                <button onClick={() => setShowAddModal(false)} className="text-gray-500 hover:text-white transition-colors">
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-gray-400 text-[10px] font-black uppercase tracking-widest mb-2 ml-1">Link Torneo (Start.gg o Challonge)</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-4 flex items-center text-gray-500 group-focus-within:text-yellow-500 transition-colors">
                      <LinkIcon size={18} />
                    </div>
                    <input
                      type="text"
                      value={newUrl}
                      onChange={(e) => setNewUrl(e.target.value)}
                      placeholder="https://www.start.gg/tournament/..."
                      className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white text-sm focus:outline-none focus:border-yellow-500/50 focus:ring-4 focus:ring-yellow-500/5 transition-all"
                    />
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-yellow-500/5 border border-yellow-500/10">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 size={18} className="text-yellow-500 mt-0.5" />
                    <div>
                      <p className="text-yellow-100 text-xs font-bold mb-1">Cosa succede dopo?</p>
                      <p className="text-gray-400 text-[10px] leading-relaxed">
                        Il sistema analizzerà il link, estrarrà i dati del torneo e lo renderà visibile a tutti gli utenti del sito con tabelloni e statistiche aggiornate.
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleAddTournament}
                  disabled={isSubmitting || !newUrl}
                  className="w-full py-4 bg-gradient-to-b from-slate-100 to-gray-400 disabled:opacity-50 disabled:grayscale hover:from-white hover:to-gray-300 text-black font-black uppercase text-xs tracking-widest rounded-2xl transition-all shadow-[0_10px_20px_rgba(255,255,255,0.05)] flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Analisi in corso...
                    </>
                  ) : (
                    'Conferma Inserimento'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
      </div>
    </div>

  );
}
