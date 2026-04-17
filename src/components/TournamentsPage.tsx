import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchTournament, StartGGTournament } from '../services/startgg';
import { Trophy, Calendar, Users, ArrowRight, Loader2 } from 'lucide-react';

const FEATURED_SLUGS = ['torneo-1v1-2026'];

export function TournamentsPage() {
  const [tournaments, setTournaments] = useState<StartGGTournament[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function loadTournaments() {
      setLoading(true);
      const results = await Promise.all(FEATURED_SLUGS.map(slug => fetchTournament(slug)));
      setTournaments(results.filter((t): t is StartGGTournament => t !== null));
      setLoading(false);
    }
    loadTournaments();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-12 h-12 text-yellow-500 animate-spin" />
        <p className="text-gray-400 font-cinzel tracking-widest uppercase text-sm">Caricamento tornei...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 md:py-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col mb-12">
        <h1 className="text-4xl md:text-5xl font-cinzel font-bold text-transparent bg-clip-text bg-gradient-to-b from-yellow-200 to-amber-600 mb-4 uppercase tracking-tighter">
          Tornei Arena
        </h1>
        <p className="text-gray-400 font-serif italic text-lg max-w-2xl">
          Segui le competizioni ufficiali del Manuale Civ, dai gironi iniziali fino alle gloriose finali.
        </p>
        <div className="h-1 w-24 bg-gradient-to-r from-yellow-500/50 to-transparent mt-6"></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {tournaments.map((tournament) => {
          const banner = tournament.images.find(img => img.type === 'banner')?.url || tournament.images[0]?.url;
          
          return (
            <div 
              key={tournament.id}
              onClick={() => navigate(`/tornei/${tournament.slug}`)}
              className="group relative cursor-pointer"
            >
              {/* Card Container */}
              <div className="glass rounded-2xl overflow-hidden border border-yellow-500/20 hover:border-yellow-500/50 transition-all duration-500 hover:shadow-[0_0_30px_rgba(212,175,55,0.15)] group-hover:-translate-y-2">
                
                {/* Image Section */}
                <div className="h-48 relative overflow-hidden">
                  <img 
                    src={banner} 
                    alt={tournament.name} 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0d1424] to-transparent"></div>
                  
                  {/* Status Badge */}
                  <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-yellow-500/20 backdrop-blur-md border border-yellow-500/30 text-yellow-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500"></span>
                    </span>
                    Live / Concluso
                  </div>
                </div>

                {/* Content Section */}
                <div className="p-6">
                  <div className="flex items-center gap-2 text-yellow-500/60 mb-2">
                    <Trophy size={14} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Organizzato da Manuale Civ</span>
                  </div>
                  
                  <h3 className="text-xl font-cinzel font-bold text-white mb-4 group-hover:text-yellow-400 transition-colors">
                    {tournament.name}
                  </h3>

                  <div className="space-y-3 mb-6">
                    <div className="flex items-center gap-3 text-gray-400 text-sm font-medium">
                      <Calendar size={16} className="text-yellow-500/40" />
                      <span>Season 2026</span>
                    </div>
                    <div className="flex items-center gap-3 text-gray-400 text-sm font-medium">
                      <Users size={16} className="text-yellow-500/40" />
                      <span>{tournament.events[0]?.name || '1v1 Open'}</span>
                    </div>
                  </div>

                  <button className="w-full py-3 bg-yellow-600/10 hover:bg-yellow-600/20 border border-yellow-500/30 rounded-xl text-yellow-500 font-bold uppercase text-xs tracking-widest transition-all flex items-center justify-center gap-2 group/btn">
                    Vedi Tabellone
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
