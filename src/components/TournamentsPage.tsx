/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchTournament } from '../services/startgg';
import { fetchChallongeTournament } from '../services/challonge';
import type { StartGGTournament } from '../services/startgg';
import { Trophy, Calendar, Users, ArrowRight, Loader2, Plus, Link as LinkIcon, X, CheckCircle2, Edit2, Save, Trash2, Image as ImageIcon, Award } from 'lucide-react';
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
  bannerUrl?: string;
  status?: string;
  podium?: any[];
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
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTournament, setEditingTournament] = useState<any>(null);
  const [editForm, setEditForm] = useState({
    organizer: '',
    period: '',
    bannerUrl: '',
    status: 'Concluso',
    podium: [] as any[]
  });
  
  const navigate = useNavigate();

  const loadTournaments = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch from Supabase
      const { data: dbTournaments, error: dbError } = await supabase
        .from('tournaments')
        .select('*')
        .order('created_at', { ascending: false });

      if (dbError) {
        console.error("Supabase error:", dbError);
        // Don't throw, just log and continue with hardcoded
      }

      // 2. Combine with hardcoded ones (ensuring no duplicates)
      const allConfigs: TournamentConfig[] = [...TOURNAMENTS];
      if (dbTournaments) {
        dbTournaments.forEach(db => {
          if (db.slug && !allConfigs.some(c => c.slug === db.slug)) {
            allConfigs.push({
              slug: db.slug,
              source: (db.source as 'startgg' | 'challonge') || 'challonge',
              organizer: db.organizer || 'Admin',
              directLink: db.direct_link || undefined,
              period: db.period || undefined,
              bannerUrl: db.banner_url || undefined,
              status: db.status || 'Concluso',
              podium: db.podium || undefined
            });
          }
        });
      }

      const results = await Promise.all(allConfigs.map(async config => {
        try {
          let tournamentData: any = null;
          
          if (config.source === 'startgg') {
            tournamentData = await fetchTournament(config.slug);
          } else if (config.source === 'challonge') {
            // Se lo slug sembra un URL o un ID speciale per tourneybot, non chiamiamo l'API challonge
            if (config.slug && !config.slug.startsWith('tb-')) {
              tournamentData = await fetchChallongeTournament(config.slug);
            }
          }

          if (tournamentData) {
            // Mappatura normale per tornei che hanno risposto correttamente
            if (config.source === 'challonge') {
               return {
                id: tournamentData.id || config.slug,
                name: tournamentData.attributes?.name || `Torneo ${config.slug}`,
                slug: config.slug,
                images: [],
                events: [],
                config: { ...config, directLink: config.directLink || `https://challonge.com/it/${config.slug}` }
              } as any;
            }
            return { ...tournamentData, config };
          }

          // FALLBACK: Se non c'è risposta API ma c'è un link diretto (es. tourneybot o API down)
          if (config.slug && (config.directLink || config.slug.startsWith('tb-'))) {
             const isTB = config.slug.startsWith('tb-');
             const fallbackName = isTB
                ? `Torneo TourneyBot #${config.slug.replace('tb-', '')}`
                : `Torneo ${config.slug.toUpperCase()}`;
                
             return {
                id: config.slug,
                name: fallbackName,
                slug: config.slug,
                images: [],
                events: [],
                config: { 
                  ...config, 
                  directLink: config.directLink || (isTB ? `https://tourneybot.gg/tourneys/${config.slug.replace('tb-', '')}` : undefined)
                }
              } as any;
          }

          // Casi speciali hardcoded (es. gyunrhoc se non è ancora nel DB o se API fallisce)
                config: { 
                  ...config, 
                  directLink: 'https://challonge.com/it/gyunrhoc',
                  bannerUrl: config.bannerUrl || '/vetro_oro.png',
                  period: config.period || 'Marzo 2026',
                  podium: config.podium || [
                    { placement: 1, entrant: { name: 'Va bene tutto' } },
                    { placement: 2, entrant: { name: 'Scarsicomelammerda' } },
                    { placement: 3, entrant: { name: 'Cerbero' } }
                  ]
                }
              } as any;

          return null;
        } catch (e) {
          console.error(`Error processing tournament ${config.slug}:`, e);
          // Anche in caso di errore, se abbiamo uno slug, mostriamo la card di base
          if (config.slug) {
             return {
                id: config.slug,
                name: `Torneo ${config.slug}`,
                slug: config.slug,
                images: [],
                events: [],
                config
              } as any;
          }
          return null;
        }
      }));

      const filtered = results.filter((t): t is (StartGGTournament & { config: TournamentConfig }) => t !== null);
      setTournaments(filtered);
    } catch (err: any) {
      console.error("General loading error:", err);
      setErrorDetails(`Dettaglio Errore: ${err.message || 'Errore di caricamento dati.'}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTournaments();
  }, [loadTournaments]);

  const handleAddTournament = async () => {
    const url = newUrl.trim();
    if (!url) return;
    
    console.log("🚀 Avvio inserimento torneo. URL:", url);
    setIsSubmitting(true);
    
    try {
      let source: 'startgg' | 'challonge' | null = null;
      let slug = '';

      const isTB = url.includes('tourneybot.gg');
      const isStartGG = url.includes('start.gg');
      const isChallonge = url.includes('challonge.com');

      if (isStartGG) {
        source = 'startgg';
        const match = url.match(/\/(tournament|t)\/([^/]+)/);
        if (match) slug = match[2];
        console.log("📍 Rilevato Start.gg, slug estratto:", slug);
      } else if (isChallonge) {
        source = 'challonge';
        // Gestiamo URL tipo challonge.com/it/slug o challonge.com/slug
        const parts = url.split('/').map(p => p.trim()).filter(p => p && p !== 'it');
        slug = parts[parts.length - 1];
        console.log("📍 Rilevato Challonge, slug estratto:", slug);
      } else if (isTB) {
        source = 'challonge'; // Fallback per schema DB
        const match = url.match(/\/tourneys\/(\d+)/);
        slug = match ? `tb-${match[1]}` : `tb-${Date.now()}`;
        console.log("📍 Rilevato TourneyBot, slug creato:", slug);
      } else {
        source = 'challonge';
        const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
        slug = urlObj.pathname.split('/').filter(Boolean).pop() || `ext-${Date.now()}`;
        console.log("📍 Link generico, slug indovinato:", slug);
      }

      if (!slug) {
        toast.error('Impossibile estrarre lo slug del torneo.');
        setIsSubmitting(false);
        return;
      }

      console.log("💾 Salvataggio su Supabase...");
      const { error } = await supabase.from('tournaments').insert({
        slug,
        source,
        organizer: user?.name || 'Admin',
        period: 'In corso',
        direct_link: url // Salviamo sempre il link diretto originale
      });

      if (error) {
        console.error("❌ Errore Supabase:", error);
        throw error;
      }

      console.log("✅ Torneo aggiunto correttamente!");
      toast.success('Torneo aggiunto con successo!');
      setShowAddModal(false);
      setNewUrl('');
      loadTournaments();
    } catch (err: any) {
      console.error("💥 Eccezione durante l'invio:", err);
      toast.error(`Errore: ${err.message || 'Errore sconosciuto durante il salvataggio'}`);
    } finally {
      setIsSubmitting(false);
    }
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

              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  handleAddTournament();
                }}
                className="space-y-6"
              >
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
                      autoFocus
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
                  type="submit"
                  disabled={isSubmitting || !newUrl.trim()}
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
              </form>
            </div>
          </div>
        </div>
      )}

  const handleUpdateTournament = async () => {
    if (!editingTournament) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('tournaments')
        .update({
          organizer: editForm.organizer,
          period: editForm.period,
          banner_url: editForm.bannerUrl,
          status: editForm.status,
          podium: editForm.podium
        })
        .eq('slug', editingTournament.slug);

      if (error) throw error;

      toast.success('Torneo aggiornato correttamente!');
      setShowEditModal(false);
      loadTournaments();
    } catch (err: any) {
      console.error("Update error:", err);
      toast.error(`Errore: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTournament = async (slug: string) => {
    if (!window.confirm('Sei sicuro di voler eliminare questo torneo?')) return;
    try {
      const { error } = await supabase
        .from('tournaments')
        .delete()
        .eq('slug', slug);
      if (error) throw error;
      toast.success('Torneo rimosso.');
      loadTournaments();
    } catch (err: any) {
      toast.error(`Errore eliminazione: ${err.message}`);
    }
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

              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  handleAddTournament();
                }}
                className="space-y-6"
              >
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
                      autoFocus
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
                  type="submit"
                  disabled={isSubmitting || !newUrl.trim()}
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
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal Modifica Torneo */}
      {showEditModal && editingTournament && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 md:p-12 overflow-y-auto">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => setShowEditModal(false)} />
          <div className="relative w-full max-w-2xl glass rounded-3xl border border-white/10 shadow-2xl overflow-hidden animate-in zoom-in duration-300 my-auto">
            <div className="p-8">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3 text-yellow-500">
                  <Edit2 size={28} />
                  <h2 className="text-2xl font-inter font-black uppercase tracking-tighter">Modifica Torneo</h2>
                </div>
                <button onClick={() => setShowEditModal(false)} className="text-gray-500 hover:text-white transition-colors">
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-500 text-[10px] font-black uppercase tracking-widest mb-2 ml-1">Organizzato Da</label>
                    <div className="relative">
                      <Users size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                      <input
                        type="text"
                        value={editForm.organizer}
                        onChange={(e) => setEditForm({ ...editForm, organizer: e.target.value })}
                        className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white text-sm focus:border-yellow-500/50 outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-gray-500 text-[10px] font-black uppercase tracking-widest mb-2 ml-1">Periodo (es: Marzo 2026)</label>
                    <div className="relative">
                      <Calendar size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                      <input
                        type="text"
                        value={editForm.period}
                        onChange={(e) => setEditForm({ ...editForm, period: e.target.value })}
                        className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white text-sm focus:border-yellow-500/50 outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-gray-500 text-[10px] font-black uppercase tracking-widest mb-2 ml-1">Immagine Banner (URL)</label>
                  <div className="relative">
                    <ImageIcon size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                      type="text"
                      value={editForm.bannerUrl}
                      placeholder="https://... o /immagine.png"
                      onChange={(e) => setEditForm({ ...editForm, bannerUrl: e.target.value })}
                      className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white text-sm focus:border-yellow-500/50 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-gray-500 text-[10px] font-black uppercase tracking-widest mb-2 ml-1">Stato Torneo</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['Programmato', 'In corso', 'Concluso'].map((s) => (
                      <button
                        key={s}
                        onClick={() => setEditForm({ ...editForm, status: s })}
                        className={clsx(
                          "py-2 px-3 rounded-xl border text-[10px] font-black uppercase tracking-tighter transition-all",
                          editForm.status === s 
                            ? "bg-yellow-500/20 border-yellow-500 text-yellow-500" 
                            : "bg-white/5 border-white/10 text-gray-500 hover:border-white/20"
                        )}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2 ml-1">
                    <label className="text-gray-500 text-[10px] font-black uppercase tracking-widest">Risultati Podium (Max 3)</label>
                    <button 
                      onClick={() => {
                        if (editForm.podium.length < 3) {
                          const newPodium = [...editForm.podium, { placement: editForm.podium.length + 1, entrant: { name: '' } }];
                          setEditForm({ ...editForm, podium: newPodium });
                        }
                      }}
                      className="text-[10px] text-yellow-500 font-bold hover:underline"
                    >
                      + Aggiungi Posizione
                    </button>
                  </div>
                  <div className="space-y-2">
                    {editForm.podium.map((p, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <span className="text-sm w-6">{['🥇', '🥈', '🥉'][idx] || `${idx+1}°`}</span>
                        <input
                          type="text"
                          value={p.entrant?.name || ''}
                          placeholder={`Nome ${idx+1}° Classificato`}
                          onChange={(e) => {
                            const newPodium = [...editForm.podium];
                            newPodium[idx] = { ...p, entrant: { name: e.target.value } };
                            setEditForm({ ...editForm, podium: newPodium });
                          }}
                          className="flex-grow bg-black/40 border border-white/10 rounded-xl py-2 px-4 text-white text-sm outline-none focus:border-yellow-500/50"
                        />
                        <button 
                          onClick={() => {
                            const newPodium = editForm.podium.filter((_, i) => i !== idx);
                            setEditForm({ ...editForm, podium: newPodium });
                          }}
                          className="p-2 text-red-500/50 hover:text-red-500"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    onClick={handleUpdateTournament}
                    disabled={isSubmitting}
                    className="flex-grow py-4 bg-gradient-to-b from-yellow-300 to-yellow-600 text-black font-black uppercase text-xs tracking-widest rounded-2xl flex items-center justify-center gap-2 hover:brightness-110"
                  >
                    {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                    Salva Modifiche
                  </button>
                  <button
                    onClick={() => handleDeleteTournament(editingTournament.slug)}
                    className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl hover:bg-red-500/20"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
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
          const banner = tournament.config.bannerUrl || 
                         tournament.images?.find(img => img.type === 'banner')?.url || 
                         tournament.images?.[0]?.url || 
                         'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=2070&auto=format&fit=crop';
          
          const status = tournament.config.status || 'Concluso';
          const podium = tournament.config.podium || tournament.events?.[0]?.standings?.nodes || [];

          return (
            <div 
              key={tournament.id}
              className="group relative"
            >
              <div className="glass rounded-2xl overflow-hidden border border-yellow-500/20 hover:border-yellow-500/50 transition-all duration-500 hover:shadow-[0_0_30px_rgba(212,175,55,0.15)] group-hover:-translate-y-2 flex flex-col h-full">
                
                {/* Image Section */}
                <div className="h-40 md:h-48 relative overflow-hidden bg-gray-900 cursor-pointer" onClick={() => {
                  if ((tournament.config as any).directLink) {
                    window.open((tournament.config as any).directLink, '_blank');
                  } else {
                    navigate(`/tornei/${tournament.slug}`);
                  }
                }}>
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
                    {status === 'In corso' ? (
                      <div className="px-3 py-1 rounded-full bg-yellow-500/20 backdrop-blur-md border border-yellow-500/30 text-yellow-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500"></span>
                        </span>
                        Live / In corso
                      </div>
                    ) : status === 'Programmato' ? (
                      <div className="px-3 py-1 rounded-full bg-blue-500/20 backdrop-blur-md border border-blue-500/30 text-blue-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg">
                        <Calendar size={10} />
                        Programmato
                      </div>
                    ) : (
                      <div className="px-3 py-1 rounded-full bg-red-500/10 backdrop-blur-md border border-red-500/20 text-red-500/80 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 shadow-lg">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500/80"></span>
                        Concluso
                      </div>
                    )}
                  </div>
                </div>

                {/* Content Section */}
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
                      <span>{tournament.config.period || tournament.events?.[0]?.name || 'Data da definire'}</span>
                    </div>
                    <div className="flex items-center gap-3 text-gray-400 text-sm font-medium">
                      <Users size={16} className="text-yellow-500/40" />
                      <span>{tournament.events?.[0]?.videogame?.name || 'Age of Empires IV'}</span>
                    </div>
                  </div>

                  {/* Podium Section */}
                  {podium.length > 0 && (
                    <div className="mb-6 p-4 rounded-xl bg-white/[0.02] border border-white/5 animate-in slide-in-from-top-2 duration-500">
                      <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-3 border-b border-white/5 pb-2">Risultati Finali</p>
                      <div className="space-y-2">
                        {podium.slice(0, 3).map((standing: any, idx: number) => {
                          const medals = ['🥇', '🥈', '🥉'];
                          return (
                            <div key={idx} className="flex items-center justify-between group/standing">
                              <div className="flex items-center gap-2">
                                <span className="text-sm leading-none">{medals[idx]}</span>
                                <span className={clsx(
                                  "text-xs font-bold transition-colors truncate max-w-[120px]",
                                  idx === 0 ? "text-yellow-100" : "text-gray-400"
                                )}>
                                  {standing.entrant?.name || '---'}
                                </span>
                              </div>
                              <span className="text-[10px] font-black text-white/20 group-hover/standing:text-white/40 transition-colors uppercase italic">{idx === 0 ? 'Winner' : `${idx + 1}°`}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="mt-auto pt-4 flex gap-2">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        if ((tournament.config as any).directLink) {
                          window.open((tournament.config as any).directLink, '_blank');
                        } else {
                          navigate(`/tornei/${tournament.slug}?source=${tournament.config.source}&organizer=${tournament.config.organizer}`);
                        }
                      }}
                      className="flex-grow py-3 bg-yellow-600/10 hover:bg-yellow-600/20 border border-yellow-500/30 rounded-xl text-yellow-500 font-bold uppercase text-xs tracking-widest transition-all flex items-center justify-center gap-2 group/btn"
                    >
                      Dettagli e Tabellone
                      <ArrowRight size={14} className="transition-transform group-hover/btn:translate-x-1" />
                    </button>
                    {isAdmin && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingTournament(tournament);
                          setEditForm({
                            organizer: tournament.config.organizer || '',
                            period: tournament.config.period || '',
                            bannerUrl: tournament.config.bannerUrl || '',
                            status: tournament.config.status || 'Concluso',
                            podium: tournament.config.podium || (tournament.events?.[0]?.standings?.nodes || [])
                          });
                          setShowEditModal(true);
                        }}
                        className="p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-gray-400 hover:text-white transition-all flex items-center justify-center"
                      >
                        <Edit2 size={16} />
                      </button>
                    )}
                  </div>
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
