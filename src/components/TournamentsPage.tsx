/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchTournament } from '../services/startgg';
import { fetchChallongeTournament } from '../services/challonge';
import type { StartGGTournament } from '../services/startgg';
import { Trophy, Calendar, Users, ArrowRight, Loader2, Plus, Link as LinkIcon, X, CheckCircle2, Edit2, Save, Trash2, Image as ImageIcon } from 'lucide-react';
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
    setErrorDetails(null);
    try {
      const { data: dbTournaments, error: dbError } = await supabase
        .from('tournaments')
        .select('*')
        .order('created_at', { ascending: false });

      if (dbError) console.error("Supabase error:", dbError);

      const allConfigs: TournamentConfig[] = [...TOURNAMENTS];
      if (dbTournaments) {
        dbTournaments.forEach(db => {
          const existingIdx = allConfigs.findIndex(c => c.slug === db.slug);
          const configObj: TournamentConfig = {
            slug: db.slug,
            source: (db.source as 'startgg' | 'challonge') || 'challonge',
            organizer: db.organizer || 'Admin',
            directLink: db.direct_link || undefined,
            period: db.period || undefined,
            bannerUrl: db.banner_url || undefined,
            status: db.status || 'Concluso',
            podium: db.podium || undefined
          };

          if (existingIdx !== -1) {
            allConfigs[existingIdx] = { ...allConfigs[existingIdx], ...configObj };
          } else {
            allConfigs.push(configObj);
          }
        });
      }

      const results = await Promise.all(allConfigs.map(async config => {
        try {
          if (config.slug === 'gyunrhoc') {
            return {
              id: 'gyunrhoc',
              name: "Torneo degli scudi d'oro",
              slug: config.slug,
              images: [],
              events: [],
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
          }

          let tournamentData: any = null;
          if (config.source === 'startgg') {
            tournamentData = await fetchTournament(config.slug);
          } else if (config.source === 'challonge' && !config.slug.startsWith('tb-')) {
            tournamentData = await fetchChallongeTournament(config.slug);
          }

          if (tournamentData) {
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

          if (config.slug && (config.directLink || config.slug.startsWith('tb-'))) {
             const isTB = config.slug.startsWith('tb-');
             return {
                id: config.slug,
                name: isTB ? `Torneo TourneyBot #${config.slug.replace('tb-', '')}` : `Torneo ${config.slug.toUpperCase()}`,
                slug: config.slug,
                images: [],
                events: [],
                config: { 
                  ...config, 
                  directLink: config.directLink || (isTB ? `https://tourneybot.gg/tourneys/${config.slug.replace('tb-', '')}` : undefined)
                }
              } as any;
          }
          return null;
        } catch (e) {
          return { id: config.slug, name: `Torneo ${config.slug}`, slug: config.slug, images: [], events: [], config } as any;
        }
      }));

      setTournaments(results.filter(t => t !== null));
    } catch (err: any) {
      setErrorDetails(`Errore: ${err.message || 'Errore caricamento.'}`);
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
    setIsSubmitting(true);
    try {
      let source: 'startgg' | 'challonge' = 'challonge';
      let slug = '';
      if (url.includes('start.gg')) {
        source = 'startgg';
        const match = url.match(/\/(tournament|t)\/([^/]+)/);
        if (match) slug = match[2];
      } else if (url.includes('challonge.com')) {
        const parts = url.split('/').map(p => p.trim()).filter(p => p && p !== 'it');
        slug = parts[parts.length - 1];
      } else if (url.includes('tourneybot.gg')) {
        const match = url.match(/\/tourneys\/(\d+)/);
        slug = match ? `tb-${match[1]}` : `tb-${Date.now()}`;
      } else {
        const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
        slug = urlObj.pathname.split('/').filter(Boolean).pop() || `ext-${Date.now()}`;
      }

      const { error } = await supabase.from('tournaments').insert({
        slug, source, organizer: user?.name || 'Admin', period: 'In corso', direct_link: url
      });
      if (error) throw error;
      toast.success('Torneo aggiunto!');
      setShowAddModal(false);
      setNewUrl('');
      loadTournaments();
    } catch (err: any) {
      toast.error(`Errore: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

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
      toast.success('Dati salvati!');
      setShowEditModal(false);
      loadTournaments();
    } catch (err: any) {
      toast.error(`Errore: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTournament = async (slug: string) => {
    if (!window.confirm('Eliminare questo torneo dall\'indice?')) return;
    try {
      const { error } = await supabase.from('tournaments').delete().eq('slug', slug);
      if (error) throw error;
      toast.success('Torneo rimosso.');
      loadTournaments();
    } catch (err: any) {
      toast.error(`Errore: ${err.message}`);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <Loader2 className="w-12 h-12 text-yellow-500 animate-spin" />
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 animate-in fade-in duration-700">
      <div className="flex justify-between items-center mb-12">
        <h1 className="text-4xl font-black text-white uppercase tracking-tighter">Tornei Aoeitalia</h1>
        {isAdmin && (
          <button onClick={() => setShowAddModal(true)} className="px-6 py-3 bg-white text-black font-black rounded-xl hover:scale-105 transition-transform flex items-center gap-2 shadow-xl">
            <Plus size={20} strokeWidth={3} /> AGGIUNGI
          </button>
        )}
      </div>

      {errorDetails && (
        <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-2xl mb-12 text-center">
          <p className="text-red-500 text-sm font-bold uppercase mb-1">Errore di Caricamento</p>
          <p className="text-gray-400 text-xs italic">{errorDetails}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {tournaments.map(t => {
          const banner = t.config.bannerUrl || t.images?.[0]?.url || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=2070&auto=format&fit=crop';
          const status = t.config.status || 'Concluso';
          const podium = t.config.podium || t.events?.[0]?.standings?.nodes || [];

          return (
            <div key={t.id} className="glass rounded-3xl overflow-hidden border border-white/5 flex flex-col group hover:border-yellow-500/30 transition-all duration-300">
               <div className="h-48 relative overflow-hidden cursor-pointer" onClick={() => t.config.directLink ? window.open(t.config.directLink, '_blank') : navigate(`/tornei/${t.slug}`)}>
                  <img src={banner} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={t.name} />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0d1424] to-transparent" />
                  <div className="absolute top-4 right-4">
                    <span className={clsx(
                      "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest backdrop-blur-md border shadow-lg",
                      status === 'In corso' ? "bg-yellow-500/20 border-yellow-500 text-yellow-500" : 
                      status === 'Programmato' ? "bg-blue-500/20 border-blue-500 text-blue-400" :
                      "bg-red-500/10 border-red-500/20 text-red-500/80"
                    )}>
                      {status === 'In corso' && <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 inline-block mr-1.5 animate-pulse" />}
                      {status}
                    </span>
                  </div>
               </div>
               <div className="p-6 flex flex-col flex-grow bg-[#121620]">
                  <span className="text-[9px] font-bold text-yellow-500/50 uppercase mb-1">Organizzato da {t.config.organizer}</span>
                  <h3 className="text-xl font-bold text-white mb-4 line-clamp-1 group-hover:text-yellow-500/80 transition-colors">{t.name}</h3>
                  <div className="flex flex-col gap-2 mb-6 text-gray-400 text-xs">
                     <div className="flex items-center gap-2"><Calendar size={14} className="text-yellow-500/40" /> {t.config.period || 'Data da definire'}</div>
                     <div className="flex items-center gap-2"><Users size={14} className="text-yellow-500/40" /> Age of Empires IV</div>
                  </div>

                  {podium.length > 0 && (
                    <div className="mb-6 p-3 rounded-2xl bg-white/[0.02] border border-white/5">
                      <p className="text-[8px] font-bold text-gray-500 uppercase tracking-widest mb-2 border-b border-white/5 pb-1">Risultati Finali</p>
                      <div className="space-y-1">
                        {podium.slice(0, 3).map((s: any, idx: number) => (
                          <div key={idx} className="flex justify-between text-[11px] items-center">
                            <span className="text-gray-300 truncate max-w-[140px]"> {['🥇','🥈','🥉'][idx]} {s.entrant?.name || '---'}</span>
                            <span className="text-white/20 font-black italic uppercase text-[9px]">{idx === 0 ? 'WINNER' : `${idx+1}°`}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mt-auto flex gap-2">
                    <button 
                      onClick={() => t.config.directLink ? window.open(t.config.directLink, '_blank') : navigate(`/tornei/${t.slug}`)} 
                      className="flex-grow py-3 bg-white/5 hover:bg-white/10 rounded-xl text-white text-[10px] font-black uppercase transition-all tracking-widest flex items-center justify-center gap-2 group/det"
                    >
                      Dettagli <ArrowRight size={12} className="group-hover/det:translate-x-1 transition-transform" />
                    </button>
                    {isAdmin && (
                      <button 
                        onClick={() => {
                          setEditingTournament(t);
                          setEditForm({
                            organizer: t.config.organizer || '',
                            period: t.config.period || '',
                            bannerUrl: t.config.bannerUrl || '',
                            status: t.config.status || 'Concluso',
                            podium: t.config.podium || (t.events?.[0]?.standings?.nodes || [])
                          });
                          setShowEditModal(true);
                        }} 
                        className="p-3 bg-white/5 hover:bg-white/10 rounded-xl text-yellow-500 transition-all border border-white/5 hover:border-yellow-500/30"
                      >
                        <Edit2 size={16} />
                      </button>
                    )}
                  </div>
               </div>
            </div>
          );
        })}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#121620] border border-white/10 p-8 rounded-3xl w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center mb-6 text-yellow-500">
              <div className="flex items-center gap-2"><Trophy size={24} /><h2 className="text-xl font-bold uppercase tracking-tighter">Nuovo Torneo</h2></div>
              <X className="cursor-pointer text-gray-500 hover:text-white transition-colors" onClick={() => setShowAddModal(false)} />
            </div>
            <div className="space-y-4">
              <div className="relative">
                <LinkIcon size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                <input 
                  type="text" value={newUrl} onChange={e => setNewUrl(e.target.value)}
                  placeholder="Link Start.gg o Challonge"
                  className="w-full bg-black/40 border border-white/10 p-4 pl-12 rounded-xl text-white focus:border-yellow-500 outline-none transition-colors"
                />
              </div>
              <div className="p-3 rounded-xl bg-yellow-500/5 border border-yellow-500/10 flex gap-3">
                <CheckCircle2 size={16} className="text-yellow-500 shrink-0 mt-0.5" />
                <p className="text-[10px] text-gray-400 leading-tight">Verranno estratti automaticamente banner e statistiche dal link fornito.</p>
              </div>
              <button onClick={handleAddTournament} disabled={isSubmitting} className="w-full py-4 bg-yellow-500 text-black font-black rounded-xl active:scale-95 transition-all text-xs tracking-widest">
                {isSubmitting ? 'ANALISI IN CORSO...' : 'CONFERMA INSERIMENTO'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditModal && editingTournament && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md overflow-y-auto">
          <div className="bg-[#121620] border border-white/10 p-8 rounded-3xl w-full max-w-2xl my-auto shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="flex justify-between mb-8 text-yellow-500">
              <div className="flex items-center gap-2"><Edit2 size={24} /><h2 className="text-xl font-bold uppercase tracking-tighter">Modifica Torneo</h2></div>
              <X className="cursor-pointer text-gray-500 hover:text-white transition-colors" onClick={() => setShowEditModal(false)} />
            </div>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] text-gray-500 font-bold uppercase ml-1">Organizzatore</label>
                  <input type="text" value={editForm.organizer} onChange={e => setEditForm({...editForm, organizer: e.target.value})} className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-white outline-none focus:border-yellow-500 transition-colors" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-gray-500 font-bold uppercase ml-1">Periodo</label>
                  <input type="text" value={editForm.period} onChange={e => setEditForm({...editForm, period: e.target.value})} className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-white outline-none focus:border-yellow-500 transition-colors" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-gray-500 font-bold uppercase ml-1">Banner URL</label>
                <div className="relative">
                  <ImageIcon size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input type="text" value={editForm.bannerUrl} onChange={e => setEditForm({...editForm, bannerUrl: e.target.value})} placeholder="https://... o /immagine.png" className="w-full bg-black/40 border border-white/10 p-3 pl-10 rounded-xl text-white outline-none focus:border-yellow-500 transition-colors" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] text-gray-500 font-bold uppercase ml-1">Stato Torneo</label>
                <div className="flex gap-2">
                  {['Programmato', 'In corso', 'Concluso'].map(s => (
                    <button key={s} onClick={() => setEditForm({...editForm, status: s})} className={clsx("flex-grow py-2 rounded-lg border text-[10px] font-black uppercase transition-all", editForm.status === s ? "bg-yellow-500/20 border-yellow-500 text-yellow-500" : "bg-white/5 border-white/10 text-gray-500 hover:border-white/20")}>{s}</button>
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] text-gray-500 font-bold uppercase ml-1">Podio Personalizzato</label>
                  <button 
                    onClick={() => {
                      if (editForm.podium.length < 3) {
                        setEditForm({...editForm, podium: [...editForm.podium, {placement: editForm.podium.length + 1, entrant: {name: ''}}]});
                      }
                    }} 
                    className="text-yellow-500 text-[10px] font-bold hover:underline" 
                    hidden={editForm.podium.length >= 3}
                  >
                    + AGGIUNGI
                  </button>
                </div>
                {editForm.podium.map((p, i) => (
                  <div key={i} className="flex gap-2 items-center bg-black/20 p-2 rounded-xl border border-white/5">
                    <span className="text-sm w-6 text-center">{['🥇','🥈','🥉'][i] || `${i+1}°`}</span>
                    <input type="text" value={p.entrant?.name || ''} onChange={e => {
                      const np = [...editForm.podium]; np[i] = {...p, entrant: {name: e.target.value}}; setEditForm({...editForm, podium: np});
                    }} placeholder={`Nome ${i+1}° classificato`} className="flex-grow bg-transparent border-none text-white text-sm outline-none" />
                    <button onClick={() => setEditForm({...editForm, podium: editForm.podium.filter((_, idx) => idx !== i)})} className="p-1.5 text-red-500/50 hover:text-red-500 transition-colors"><Trash2 size={14}/></button>
                  </div>
                ))}
              </div>
              <div className="flex gap-4 pt-4 border-t border-white/5">
                <button onClick={handleUpdateTournament} disabled={isSubmitting} className="flex-grow py-4 bg-yellow-500 text-black font-black rounded-xl flex items-center justify-center gap-2 hover:bg-yellow-400 transition-all text-xs tracking-widest">
                  {isSubmitting ? <Loader2 className="animate-spin" size={16}/> : <Save size={16}/>} SALVA MODIFICHE
                </button>
                <button onClick={() => handleDeleteTournament(editingTournament.slug)} className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl hover:bg-red-500/20 transition-all"><Trash2 size={20}/></button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
