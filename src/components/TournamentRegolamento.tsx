import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { Loader2, ArrowLeft, BookOpen, Shield, Edit2 } from 'lucide-react';
import { useAuth } from './AuthContext';

export function TournamentRegolamento() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [tournament, setTournament] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { canManageTournaments } = useAuth();

  useEffect(() => {
    async function loadTournament() {
      if (!slug) return;
      setLoading(true);
      try {
        // Handle Start.gg slugs that might be split by the router
        const fullSlug = window.location.pathname.includes('/tournament/') 
          ? `tournament/${slug}` 
          : slug;

        const { data, error: dbError } = await supabase
          .from('tournaments')
          .select('*')
          .eq('slug', fullSlug)
          .single();

        if (dbError) throw dbError;
        
        if (!data || !data.has_regolamento) {
          setError("Regolamento non disponibile per questo torneo.");
          return;
        }

        setTournament(data);
      } catch (err: any) {
        console.error("Error loading regulation:", err);
        setError(err.message || "Errore nel caricamento del regolamento.");
      } finally {
        setLoading(false);
      }
    }
    loadTournament();
  }, [slug]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0a0a0b]">
        <Loader2 className="w-12 h-12 text-blue-400 animate-spin" />
        <p className="text-gray-500 mt-4 font-serif italic uppercase tracking-widest text-xs">Caricamento Regolamento...</p>
      </div>
    );
  }

  if (error || !tournament) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0a0a0b] px-4">
        <div className="glass p-8 rounded-3xl border border-red-500/20 max-w-lg w-full text-center">
          <Shield className="w-16 h-16 text-red-500/40 mx-auto mb-6" />
          <h2 className="text-2xl font-black text-white uppercase mb-2">Accesso Negato</h2>
          <p className="text-gray-400 mb-8 italic">{error || "Il torneo non esiste o non ha un regolamento definito."}</p>
          <button 
            onClick={() => navigate('/tornei')} 
            className="w-full py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-white font-black uppercase text-xs tracking-widest transition-all"
          >
            Torna alla lista
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent text-gray-200 pt-6 pb-12 md:pt-10 md:pb-16">
      {/* Back Button - Moved to far left for better layout */}
      <div className="max-w-6xl mx-auto px-4 mb-6">
        <button 
          onClick={() => navigate('/tornei')}
          className="flex items-center gap-2 px-4 py-2 glass rounded-xl text-gray-200 hover:text-white transition-all group text-sm font-bold uppercase tracking-widest border border-white/5 hover:border-white/20 w-fit"
        >
          <ArrowLeft size={16} className="transition-transform duration-300 ease-in-out group-hover:-translate-x-[2px]" />
          Torna ai Tornei
        </button>
      </div>

      <div className="max-w-5xl mx-auto px-4">
        {/* Torn Paper Header matching the new style */}
        <div className="relative group p-8 md:p-12 overflow-hidden mb-8">
          {/* Organic 'Torn Book Page' Effect */}
          <div className="absolute inset-0 -z-10 pointer-events-none">
            <div 
              className="absolute inset-0 bg-black/60 backdrop-blur-xl" 
              style={{ 
                clipPath: 'polygon(0% 2%, 15% 0%, 45% 3%, 75% 1%, 99% 2%, 97% 35%, 100% 65%, 98% 99%, 75% 97%, 45% 100%, 15% 96%, 0% 98%, 2% 50%)',
                backgroundImage: 'radial-gradient(circle at 30% 50%, rgba(255,255,255,0.02) 0%, transparent 60%)',
              }} 
            />
          </div>

          <div className="flex flex-col items-center text-center">
            <div className="flex flex-col items-center gap-2 text-yellow-500/80 mb-4">
              <div className="p-2.5 bg-yellow-500/10 rounded-full border border-yellow-500/20 mb-1">
                <BookOpen size={20} />
              </div>
              <span className="text-[11px] font-black uppercase tracking-[0.5em] ml-[0.5em]">Regolamento Ufficiale</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-sackers font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-slate-400 tracking-tighter leading-tight drop-shadow-[0_0_20px_rgba(255,255,255,0.15)]">
              {tournament.name || tournament.slug}
            </h1>
          </div>
        </div>

        {/* Content Section */}
        <div className="relative z-10 pb-24">
        <div className="glass rounded-[2rem] border border-white/10 overflow-hidden shadow-2xl relative">
          {/* Quick Edit Button - Shortcut to TournamentsPage */}
          {canManageTournaments && (
            <button 
              onClick={() => navigate(`/tornei?edit=${tournament.slug}&target=regolamento`)}
              className="absolute top-6 right-6 p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-yellow-500 hover:text-yellow-400 transition-all z-20 shadow-xl group"
              title="Modifica regolamento"
            >
              <Edit2 size={18} className="transition-transform group-hover:scale-110" />
            </button>
          )}

          {/* Regulation Text */}
          <div className="p-6 md:p-10 bg-[#0d1117]/50">
            <div className="prose prose-invert prose-slate max-w-none 
              prose-h2:border-b prose-h2:border-white/10 prose-h2:pb-4 prose-h2:mt-8 first:prose-h2:mt-0 prose-h2:text-slate-200
              prose-p:text-gray-300 prose-p:leading-relaxed prose-p:text-lg
              prose-li:text-gray-300
              prose-strong:text-white
              prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline
              font-sans
              [&>*:first-child]:mt-0
            ">
              <div 
                className="regulation-content"
                dangerouslySetInnerHTML={{ 
                  __html: tournament.regolamento_content 
                    ? (tournament.regolamento_content.includes('<') 
                        ? tournament.regolamento_content 
                        : tournament.regolamento_content.replace(/\n/g, '<br/>'))
                    : '' 
                }} 
              />
            </div>
          </div>

          {/* Minimal Footer */}
          <div className="bg-white/[0.02] border-t border-white/10 p-4 text-center">
            <p className="text-[9px] text-gray-600 font-medium uppercase tracking-[0.2em]">Fine Regolamento</p>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
