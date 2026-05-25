import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { Loader2, ArrowLeft, Trophy, Calendar, Users, Play, Search, Video, ExternalLink } from 'lucide-react';
import { clsx } from 'clsx';
import { SEO } from './SEO';

function getYouTubeId(url: string): string | null {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

interface MatchVOD {
  id: string;
  title: string;
  url: string;
  round?: string;
  score?: string;
}

export function TournamentMatchesPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [tournament, setTournament] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRound, setSelectedRound] = useState('Tutti');
  
  // Playback State
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);

  useEffect(() => {
    async function loadTournament() {
      if (!slug) return;
      setLoading(true);
      setErrorMsg(null);
      try {
        const [baseSlug] = slug.split('?');
        const cleanSlug = baseSlug.trim().replace(/\/$/, '');
        
        const { data: dbTournament, error } = await supabase
          .from('tournaments')
          .select('*')
          .or(`slug.eq.${cleanSlug},slug.ilike.${cleanSlug},slug.ilike.%${cleanSlug}%`)
          .maybeSingle();

        if (error) throw error;

        if (dbTournament) {
          setTournament(dbTournament);
        } else {
          setErrorMsg("Torneo non trovato.");
        }
      } catch (err: any) {
        console.error("Error loading tournament matches:", err);
        setErrorMsg(err.message || "Errore durante il caricamento del torneo.");
      } finally {
        setLoading(false);
      }
    }
    loadTournament();
  }, [slug]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-12 h-12 text-red-500 animate-spin" />
      </div>
    );
  }

  if (errorMsg || !tournament) {
    return (
      <div className="text-center py-20 px-4">
        <div className="glass p-8 rounded-2xl border border-red-500/20 max-w-xl mx-auto">
          <h2 className="text-2xl font-cinzel text-red-400 mb-4">Torneo non trovato</h2>
          <p className="text-gray-400 mb-6 italic">{errorMsg || "Impossibile trovare i match per questo torneo."}</p>
          <button 
            onClick={() => navigate('/tornei')} 
            className="px-6 py-2 bg-red-600/10 hover:bg-red-600/20 border border-red-500/30 rounded-xl text-red-400 font-bold uppercase text-xs tracking-widest transition-all"
          >
            Torna ai tornei
          </button>
        </div>
      </div>
    );
  }

  const banner = tournament.banner_url || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=2070&auto=format&fit=crop';
  const vodList: MatchVOD[] = tournament.vods || [];
  
  // Extract all unique rounds for filtering
  const rounds = Array.from(new Set(vodList.map(v => v.round || '').filter(Boolean))).sort() as string[];

  // Filter VODs
  const filteredVods = vodList.filter(v => {
    const matchesSearch = v.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (v.round || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRound = selectedRound === 'Tutti' || v.round === selectedRound;
    return matchesSearch && matchesRound;
  });

  return (
    <div className="flex flex-col min-h-screen bg-[#0a0a0b] text-white">
      <SEO 
        title={`Video Match - ${tournament.name}`}
        description={`Guarda i video registrati dei match di ${tournament.name} su AoeItalia.`}
        image={banner}
      />
      
      {/* Hero Header */}
      <div className="relative h-[220px] md:h-[300px] overflow-hidden">
        <img 
          src={banner} 
          className="w-full h-full object-cover opacity-35 blur-sm scale-105" 
          style={{ objectPosition: `${tournament.banner_position_x || 50}% ${tournament.banner_position_y || 50}%` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0b] via-[#0a0a0b]/60 to-transparent"></div>
        
        <div className="absolute bottom-0 left-0 right-0 max-w-7xl mx-auto px-4 pb-6 md:pb-10">
          <div className="flex flex-col gap-3 mb-6">
            <button 
              onClick={() => navigate('/tornei')}
              className="flex items-center gap-2 text-gray-400 hover:text-red-400 transition-all duration-300 ease-in-out hover:translate-x-[2px] group text-sm uppercase tracking-widest font-bold hover:drop-shadow-[0_0_8px_rgba(239,68,68,0.3)] w-fit"
            >
              <ArrowLeft size={16} className="transition-transform duration-300 ease-in-out group-hover:-translate-x-[2px]" />
              Torna ai tornei
            </button>
            
            {tournament.direct_link && (
              <button 
                onClick={() => window.open(tournament.direct_link, '_blank')}
                className="flex items-center gap-2 text-gray-400 hover:text-red-400 transition-all duration-300 ease-in-out hover:translate-x-[2px] group text-sm uppercase tracking-widest font-bold hover:drop-shadow-[0_0_8px_rgba(239,68,68,0.3)] w-fit animate-in fade-in slide-in-from-left-4 duration-500"
              >
                <ArrowLeft size={16} className="transition-transform duration-300 ease-in-out group-hover:-translate-x-[2px]" />
                Vai al tabellone
              </button>
            )}
          </div>
          
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 text-red-500 mb-2">
                <Trophy size={18} />
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">organizzato da {tournament.organizer || 'Admin'}</span>
              </div>
              <h1 className="text-3xl md:text-5xl font-inter font-black text-white uppercase tracking-tighter leading-none mb-3">
                {tournament.name} - Match Video
              </h1>
              <div className="flex flex-wrap gap-6 text-gray-400 text-xs font-semibold uppercase tracking-wider">
                <div className="flex items-center gap-2">
                  <Calendar size={14} className="text-red-500/50" />
                  {tournament.period || 'Data da definire'}
                </div>
                <div className="flex items-center gap-2">
                  <Users size={14} className="text-red-500/50" />
                  {tournament.type || '1v1'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 py-8 w-full flex-grow flex flex-col">
        
        {vodList.length === 0 ? (
          <div className="flex-grow flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-6 border border-white/5">
              <Video className="w-8 h-8 text-gray-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-400 mb-2 uppercase tracking-widest">Nessun video caricato</h3>
            <p className="text-gray-500 italic max-w-md mx-auto leading-relaxed">
              Non sono ancora stati caricati video per i match di questo torneo. Torna a trovarci più tardi!
            </p>
          </div>
        ) : (
          <div className="space-y-8 flex-grow">
            
            {/* Filters Bar */}
            <div className="glass p-4 rounded-2xl border border-white/5 flex flex-col md:flex-row gap-4 items-center justify-between">
              
              {/* Search input */}
              <div className="relative w-full md:max-w-md">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cerca match o giocatore..."
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 pl-12 text-white text-sm focus:border-red-500/50 outline-none transition-all placeholder:text-gray-500"
                />
              </div>

              {/* Round Filter */}
              {rounds.length > 0 && (
                <div className="flex items-center gap-3 w-full md:w-auto">
                  <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest whitespace-nowrap">Filtra Fase:</span>
                  <div className="flex gap-1 overflow-x-auto elegant-scrollbar pb-1 w-full md:w-auto">
                    <button
                      onClick={() => setSelectedRound('Tutti')}
                      className={clsx(
                        "px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap border",
                        selectedRound === 'Tutti'
                          ? "bg-red-600 text-white border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.25)]"
                          : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border-white/5"
                      )}
                    >
                      Tutte
                    </button>
                    {rounds.map(r => (
                      <button
                        key={r}
                        onClick={() => setSelectedRound(r)}
                        className={clsx(
                          "px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap border",
                          selectedRound === r
                            ? "bg-red-600 text-white border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.25)]"
                            : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border-white/5"
                        )}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* VODs Grid */}
            {filteredVods.length === 0 ? (
              <div className="text-center py-16 text-gray-500 italic">
                Nessun match corrisponde alla ricerca "{searchQuery}".
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredVods.map((vod) => {
                  const videoId = getYouTubeId(vod.url);
                  const isPlaying = playingVideoId === vod.id;
                  
                  return (
                    <div 
                      key={vod.id} 
                      className="glass flex flex-col rounded-3xl border border-white/5 overflow-hidden transition-all duration-300 hover:border-red-500/30 hover:shadow-[0_10px_30px_rgba(239,68,68,0.06)] group h-full"
                    >
                      {/* Video Player / Thumbnail Area */}
                      <div className="relative aspect-video w-full bg-black overflow-hidden flex items-center justify-center">
                        {videoId ? (
                          isPlaying ? (
                            <iframe
                              src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
                              title={vod.title}
                              frameBorder="0"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                              className="w-full h-full"
                            ></iframe>
                          ) : (
                            <div 
                              className="w-full h-full relative cursor-pointer group/thumb"
                              onClick={() => setPlayingVideoId(vod.id)}
                            >
                              {/* Video Cover */}
                              <img 
                                src={`https://img.youtube.com/vi/${videoId}/0.jpg`} 
                                alt={vod.title}
                                className="w-full h-full object-cover transition-transform duration-700 group-hover/thumb:scale-105"
                                onError={(e) => {
                                  // Fallback to high quality or default if maxres fails
                                  (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
                                }}
                              />
                              {/* Dark filter */}
                              <div className="absolute inset-0 bg-black/35 group-hover/thumb:bg-black/10 transition-colors" />
                              
                              {/* Big Play Button Overlay */}
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-16 h-16 rounded-full bg-black/80 hover:bg-red-600 hover:scale-110 text-white hover:text-white flex items-center justify-center transition-all duration-300 border border-white/10 hover:border-red-500 hover:shadow-[0_0_30px_rgba(220,38,38,0.45)]">
                                  <Play size={24} className="fill-current ml-1" />
                                </div>
                              </div>
                            </div>
                          )
                        ) : (
                          <div className="text-center p-4">
                            <Video className="w-12 h-12 text-gray-700 mx-auto mb-2" />
                            <p className="text-xs text-gray-500">Link video non valido</p>
                            {vod.url && (
                              <a 
                                href={vod.url} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="text-[10px] text-red-400 hover:underline mt-1 inline-block"
                              >
                                Apri esternamente <ExternalLink size={8} className="inline ml-1" />
                              </a>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Info Content */}
                      <div className="p-5 flex-grow flex flex-col bg-[#0d1017]/40">
                        <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
                          {vod.round && (
                            <span className="text-[9px] font-black uppercase text-red-400 bg-red-950/40 px-2.5 py-1 rounded-md border border-red-500/20 tracking-wider">
                              {vod.round}
                            </span>
                          )}
                          {vod.score && (
                            <span className="text-[10px] font-bold text-gray-400 tracking-wider">
                              Risultato: <strong className="text-white font-black">{vod.score}</strong>
                            </span>
                          )}
                        </div>

                        <h4 className="text-base font-bold text-slate-100 group-hover:text-red-400 transition-colors leading-snug uppercase tracking-tight line-clamp-2 select-text">
                          {vod.title}
                        </h4>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
