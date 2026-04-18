import { useState, useEffect } from 'react';
import { useSearchParams, useParams, useNavigate } from 'react-router-dom';
import { fetchTournament } from '../services/startgg';
import { fetchChallongeTournament, fetchChallongeData, mapChallongeToUnified } from '../services/challonge';
// I tipi vengono gestiti internamente come any per compatibilità Start.gg/Challonge
import { Loader2, ArrowLeft, Trophy, Users, Shield } from 'lucide-react';
import { TournamentBracket } from './TournamentBracket';

export function TournamentDetail() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
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
        if (source === 'challonge') {
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
            setTournament(tData);
            setSelectedPhase(unifiedPhase);
          }
        } else {
          const data = await fetchTournament(slug);
          setTournament(data);
          if (data && data.events.length > 0) {
            const event1v1 = data.events.find(e => e.name.toLowerCase().includes('1v1')) || data.events[0];
            if (event1v1.phases.length > 0) {
              setSelectedPhase(event1v1.phases[0]);
            }
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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-12 h-12 text-yellow-500 animate-spin" />
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
    : (tournament.images.find((img: any) => img.type === 'banner')?.url || tournament.images[0]?.url);

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
              <img src={source === 'challonge' ? banner : (tournament.images.find((i: any) => i.type === 'profile')?.url || banner)} className="w-full h-full object-cover" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 text-yellow-500 mb-2">
                <Trophy size={18} />
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">organizzato da {organizer}</span>
              </div>
              <h1 className="text-4xl md:text-6xl font-sackers font-black text-white uppercase tracking-tighter leading-none mb-4">
                {source === 'challonge' ? tournament.attributes.name : tournament.name}
              </h1>
              <div className="flex flex-wrap gap-6 text-gray-400 text-sm font-medium">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                  Concluso
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
            </div>
          </div>
        </div>
      </div>

      {/* Tabs / Phases Navigation */}
      {source !== 'challonge' && (
        <div className="sticky top-0 z-30 bg-[#0a0a0b]/80 backdrop-blur-xl border-b border-white/5">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-center gap-8 overflow-x-auto elegant-scrollbar pb-px">
               {tournament.events?.flatMap((e: any) => e.phases || []).map((phase: any) => (
                <button
                  key={phase.id}
                  onClick={() => setSelectedPhase(phase)}
                  className={`py-4 text-xs font-black uppercase tracking-[0.2em] whitespace-nowrap transition-all border-b-2 ${
                    selectedPhase?.id === phase.id 
                      ? 'border-yellow-500 text-yellow-500' 
                      : 'border-transparent text-gray-500 hover:text-gray-300'
                  }`}
                >
                  {phase.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-full overflow-hidden">
        {selectedPhase ? (
          <TournamentBracket phase={selectedPhase} />
        ) : (
          <div className="text-center py-20 text-gray-500 font-serif italic">
            Seleziona una fase per vedere il tabellone
          </div>
        )}
      </main>
    </div>
  );
}
