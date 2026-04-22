import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { Loader2, ArrowLeft, BookOpen, Shield, Clock, Info } from 'lucide-react';

export function TournamentRegolamento() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [tournament, setTournament] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadTournament() {
      if (!slug) return;
      setLoading(true);
      try {
        const { data, error: dbError } = await supabase
          .from('tournaments')
          .select('*')
          .eq('slug', slug)
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
        <Loader2 className="w-12 h-12 text-yellow-500 animate-spin" />
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
    <div className="min-h-screen bg-[#0a0a0b] text-gray-200">
      {/* Premium Header */}
      <div className="relative h-[300px] md:h-[400px] overflow-hidden">
        <img 
          src={tournament.banner_url || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=2070&auto=format&fit=crop'} 
          className="w-full h-full object-cover opacity-30 blur-sm scale-110" 
          alt="Tournament Banner"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0b] via-[#0a0a0b]/80 to-transparent"></div>
        
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
          <div className="flex items-center gap-3 text-yellow-500/80 mb-2">
            <BookOpen size={16} />
            <span className="text-[9px] font-black uppercase tracking-[0.3em]">Regolamento Ufficiale</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tighter leading-tight mb-4">
            {tournament.name || tournament.slug}
          </h1>
          <div className="h-1 w-16 bg-yellow-500/30 rounded-full"></div>
        </div>

        <button 
          onClick={() => navigate('/tornei')}
          className="absolute top-8 left-8 flex items-center gap-2 px-4 py-2 glass rounded-xl text-gray-400 hover:text-white transition-all group text-[10px] font-bold uppercase tracking-widest border border-white/5 hover:border-white/20"
        >
          <ArrowLeft size={14} className="transition-transform group-hover:-translate-x-1" />
          Indietro
        </button>
      </div>

      {/* Content Section */}
      <div className="max-w-4xl mx-auto px-4 pb-24 -mt-20 relative z-10">
        <div className="glass rounded-[2rem] border border-white/10 overflow-hidden shadow-2xl">
          {/* Regulation Text */}
          <div className="p-8 md:p-16 bg-[#0d1117]/50">
            <div className="prose prose-invert prose-slate max-w-none 
              prose-headings:font-black prose-headings:uppercase prose-headings:tracking-tight
              prose-h2:border-b prose-h2:border-white/10 prose-h2:pb-4 prose-h2:mt-12 prose-h2:text-slate-200
              prose-p:text-gray-300 prose-p:leading-relaxed prose-p:text-lg
              prose-li:text-gray-300
              prose-strong:text-white prose-strong:font-black
              prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline
              font-sans
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
  );
}
