/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchTournament } from '../services/startgg';
import { fetchChallongeTournament } from '../services/challonge';
import type { StartGGTournament } from '../services/startgg';
import { Trophy, Calendar, Users, ArrowRight, Loader2, Plus, Link as LinkIcon, X, CheckCircle2, Edit2, Save, Trash2, Image as ImageIcon, ChevronDown, Upload, BookOpen, AlignLeft, AlignCenter, AlignRight, AlignJustify } from 'lucide-react';
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
  name?: string;
  type?: string;
  hasRegolamento?: boolean;
  regolamentoContent?: string;
}

const TOURNAMENTS: TournamentConfig[] = [
  { slug: 'torneo-1v1-2026', source: 'startgg', organizer: 'marcotamby', period: 'Gennaio - Febbraio 2026' },
  { slug: 'gyunrhoc', source: 'challonge', organizer: 'Kani', period: 'Marzo 2026' }
];

export function TournamentsPage() {
  const { canManageTournaments, user } = useAuth();
  const [tournaments, setTournaments] = useState<(StartGGTournament & { config: TournamentConfig })[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const [editingTournament, setEditingTournament] = useState<any>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [editForm, setEditForm] = useState({
    organizer: '',
    period: '',
    bannerUrl: '',
    status: 'Concluso',
    name: '',
    type: '1v1',
    podium: [] as any[],
    hasRegolamento: false,
    regolamentoContent: ''
  });
  const [isUploading, setIsUploading] = useState(false);
  
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
      
      // DEBUG CLOUD: Log raw DB data to help identify persistence issues
      console.log("DB Tournaments:", dbTournaments);

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
            podium: db.podium || undefined,
            name: db.name || undefined,
            type: db.type || '1v1',
            hasRegolamento: db.has_regolamento || false,
            regolamentoContent: db.regolamento_content || ''
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
                type: config.type || '3v3', // Default to 3v3 for Scudi d'oro unless DB says otherwise
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
        slug, source, organizer: user?.name || 'Admin', period: 'In corso', direct_link: url, type: '1v1'
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

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Immagine troppo grande (max 5MB)');
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `tournament-${Date.now()}.${fileExt}`;
      const filePath = `tournaments/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('civilizations')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('civilizations')
        .getPublicUrl(filePath);

      setEditForm(prev => ({ ...prev, bannerUrl: publicUrl }));
      toast.success('Immagine caricata!');
    } catch (error: any) {
      console.error('Error uploading banner:', error);
      toast.error(`Errore: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleUpdateTournament = async () => {
    if (!editingTournament) return;
    setIsSubmitting(true);
    setSaveStatus('saving');
    try {
      // First, check if the tournament already exists in the DB
      const { data: existing } = await supabase
        .from('tournaments')
        .select('id')
        .eq('slug', editingTournament.slug)
        .single();

      const tournamentData = {
        slug: editingTournament.slug,
        source: editingTournament.config.source || 'challonge',
        name: editForm.name,
        organizer: editForm.organizer,
        period: editForm.period,
        banner_url: editForm.bannerUrl,
        status: editForm.status,
        podium: editForm.podium,
        type: editForm.type,
        has_regolamento: editForm.hasRegolamento,
        regolamento_content: editForm.regolamentoContent,
        updated_at: new Date().toISOString()
      };

      let error;
      if (existing) {
        // Update existing record
        const { error: updateError } = await supabase
          .from('tournaments')
          .update(tournamentData)
          .eq('slug', editingTournament.slug);
        error = updateError;
      } else {
        // Insert new record
        const { error: insertError } = await supabase
          .from('tournaments')
          .insert(tournamentData);
        error = insertError;
      }
      
      if (error) throw error;
      
      setSaveStatus('saved');
      setTimeout(() => {
        setSaveStatus('idle');
      }, 3000);
    } catch (err: any) {
      toast.error(`Errore: ${err.message}`);
      setSaveStatus('idle');
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
    <div className="max-w-7xl mx-auto px-4 py-8 md:py-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6">
        <div>
          <h1 className="text-3xl md:text-5xl font-inter font-black text-transparent bg-clip-text bg-gradient-to-b from-slate-200 via-gray-400 to-slate-500 mb-4 uppercase tracking-tighter">
            Tornei Aoeitalia
          </h1>
          <p className="text-gray-400 font-serif italic text-base md:text-lg max-w-2xl">
            Segui le competizioni ufficiali di Aoeitalia.
          </p>
          <div className="h-1 w-24 bg-gradient-to-r from-gray-500/50 to-transparent mt-6"></div>
        </div>

        {canManageTournaments && (
          <button 
            onClick={() => setShowAddModal(true)} 
            className="flex items-center gap-3 px-6 py-4 bg-gradient-to-b from-slate-100 to-gray-400 font-black text-black rounded-2xl hover:from-white hover:to-gray-300 transition-all hover:scale-[1.05] shadow-[0_0_20px_rgba(255,255,255,0.1)] uppercase text-xs tracking-widest active:scale-[0.98]"
          >
            <Plus size={20} strokeWidth={3} />
            Aggiungi Torneo
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
            <div key={t.id} className="relative z-10 hover:z-50 group">
              <div 
                className="glass rounded-3xl overflow-hidden border border-white/5 flex flex-col transition-all duration-500 hover:border-white/80 hover:shadow-[0_30px_60px_rgba(0,0,0,0.8)] hover:-translate-y-1 hover:scale-[1.05] [transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)] [backface-visibility:hidden] [transform-style:preserve-3d]"
              >
                <div className="h-48 relative overflow-hidden cursor-pointer" onClick={() => t.config.directLink ? window.open(t.config.directLink, '_blank') : navigate(`/tornei/${t.slug}`)}>
                    <img src={banner} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" alt={t.name} />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0d1424] to-transparent" />
                    
                    {/* Status Badges Overlay */}
                    <div className="absolute top-4 right-4 flex flex-col items-end gap-2 z-20">
                      <div className="px-3 py-1 rounded-full bg-yellow-500/20 backdrop-blur-md border border-yellow-500/30 text-yellow-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg scale-90 md:scale-100">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500"></span>
                        </span>
                        Informazioni Disponibili
                      </div>

                       <div className={clsx(
                        "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest backdrop-blur-md border shadow-lg flex items-center gap-2",
                        status === 'In corso' ? "bg-green-500/10 border-green-500/30 text-green-400" : 
                        status === 'Programmato' ? "bg-blue-500/10 border-blue-500/30 text-blue-400" :
                        "bg-red-500/10 border-red-500/30 text-red-400"
                      )}>
                        {status === 'In corso' && <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block mr-0.5 animate-pulse" />}
                        {status === 'Concluso' && <span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block mr-0.5" />}
                        {status === 'Programmato' && <Calendar size={10} className="mr-0.5 text-blue-400" />}
                        {status}
                      </div>
                    </div>
                </div>

                <div className="p-6 flex flex-col flex-grow bg-[#121620] relative z-10 -mt-px">
                    <span className="text-xs font-bold text-yellow-500/50 uppercase mb-1 tracking-widest">Organizzato da {t.config.organizer}</span>
                    <h3 className="text-2xl font-black text-white mb-4 line-clamp-1 group-hover:text-yellow-400 transition-colors uppercase tracking-tight">
                      {t.config.name || t.name}
                    </h3>
                    
                    <div className="flex flex-col gap-3 mb-6 text-gray-300 text-sm font-medium">
                      <div className="flex items-center gap-3">
                        <Calendar size={18} className="text-yellow-500/40" /> 
                        <span>{t.config.period || 'Data da definire'}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Users size={18} className="text-yellow-500/40" /> 
                        <span>Age of Empires IV - <strong className="text-yellow-500/80">{t.config.type || '1v1'}</strong></span>
                      </div>
                    </div>

                    {podium.length > 0 && (
                      <div className="mb-6 p-4 rounded-2xl bg-white/[0.03] border border-white/5 shadow-inner">
                        <div className="h-px w-full bg-gradient-to-r from-transparent via-white/20 to-transparent mb-4"></div>
                        <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-3 border-b border-white/5 pb-2">Risultati Finali</p>
                        <div className="space-y-2">
                          {podium.slice(0, 3).map((s: any, idx: number) => (
                            <div key={idx} className="flex justify-between text-sm items-center group/standing">
                              <div className="flex items-center gap-3">
                                <span className="text-lg">{['🥇','🥈','🥉'][idx]}</span>
                                <span className={clsx(
                                  "font-bold transition-colors truncate max-w-[140px]",
                                  idx === 0 ? "text-yellow-100" : "text-gray-400"
                                )}>
                                  {s.entrant?.name || '---'}
                                </span>
                              </div>
                              <span className="text-white/40 font-black italic uppercase text-[9px] group-hover/standing:text-white/80 transition-colors">{idx === 0 ? 'WINNER' : `${idx+1}° PLACE`}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="mt-auto flex items-center gap-2 pt-4 border-t border-white/5 h-16">
                        {t.config.hasRegolamento && (
                          <button 
                            onClick={() => navigate(`/tornei/${t.slug}/regolamento`)} 
                            className="flex-grow h-full bg-blue-950/40 hover:bg-blue-900/60 border border-blue-500/30 rounded-2xl text-blue-400 text-[10px] font-black uppercase transition-all tracking-wider flex items-center justify-center gap-2 group/reg shadow-lg active:scale-95"
                          >
                            Regolamento <BookOpen size={14} className="group-hover/reg:scale-110 transition-transform" />
                          </button>
                        )}
                        <button 
                          onClick={() => t.config.directLink ? window.open(t.config.directLink, '_blank') : navigate(`/tornei/${t.slug}`)} 
                          className={clsx(
                            "flex-grow h-full bg-white/5 hover:bg-white/10 rounded-2xl text-white font-black uppercase transition-all tracking-wider flex items-center justify-center gap-2 group/det shadow-lg active:scale-95",
                            t.config.hasRegolamento ? "text-[10px]" : "text-xs"
                          )}
                        >
                          Tabellone <ArrowRight size={14} className="group-hover/det:translate-x-1 transition-transform" />
                        </button>
                        {canManageTournaments && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingTournament(t);
                              setEditForm({
                                organizer: t.config.organizer || '',
                                period: t.config.period || '',
                                bannerUrl: t.config.bannerUrl || '',
                                status: t.config.status || 'Concluso',
                                name: t.config.name || t.name || '',
                                type: t.config.type || '1v1',
                                podium: t.config.podium || (t.events?.[0]?.standings?.nodes || []),
                                hasRegolamento: t.config.hasRegolamento || false,
                                regolamentoContent: t.config.regolamentoContent || ''
                              });
                              setShowEditModal(true);
                            }} 
                            className="w-14 h-full bg-white/5 hover:bg-white/10 rounded-2xl text-blue-400 transition-all border border-white/5 hover:border-blue-500/30 active:scale-95 shadow-lg flex items-center justify-center shrink-0"
                          >
                            <Edit2 size={20} />
                          </button>
                        )}
                    </div>
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
              <button 
                onClick={handleAddTournament} 
                disabled={isSubmitting} 
                className="w-full py-4 bg-gradient-to-b from-slate-100 to-gray-400 text-black font-black rounded-xl active:scale-95 transition-all text-[10px] tracking-widest shadow-xl"
              >
                {isSubmitting ? 'ANALISI IN CORSO...' : 'CONFERMA INSERIMENTO'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditModal && editingTournament && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md overflow-y-auto">
          <div className="bg-[#121620] border border-white/10 p-8 rounded-3xl w-full max-w-2xl my-auto shadow-2xl animate-in zoom-in-95 duration-300">
               <div className="flex items-center gap-2">
                 <Edit2 size={24} className="text-blue-400"/>
                 <h2 className="text-xl font-bold uppercase tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-slate-200 to-slate-500">Modifica Torneo</h2>
               </div>
               <X 
                  className="cursor-pointer text-gray-500 hover:text-white transition-colors" 
                  onClick={() => { 
                    const hasChanges = JSON.stringify(editForm) !== JSON.stringify({
                      name: editingTournament.config.name || '',
                      period: editingTournament.config.period || '',
                      bannerUrl: editingTournament.config.bannerUrl || '',
                      type: editingTournament.config.type || '1v1',
                      status: editingTournament.status || 'Programmato',
                      hasRegolamento: editingTournament.config.hasRegolamento || false,
                      regolamentoContent: editingTournament.config.regolamentoContent || '',
                      directLink: editingTournament.config.directLink || ''
                    });

                    if (!hasChanges) {
                      setShowEditModal(false); 
                      loadTournaments(); 
                    } else {
                      setConfirmClose(true);
                    }
                  }} 
                />
             </div>

             <div className="relative">
               {confirmClose && (
                 <div className="absolute inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xl rounded-3xl animate-in fade-in duration-300 -m-8">
                   <div className="bg-[#1a1f2e] border border-white/10 p-8 rounded-[2rem] max-w-sm text-center shadow-2xl scale-100 animate-in zoom-in-95">
                     <AlertCircle size={48} className="mx-auto mb-4 text-yellow-500" />
                     <h3 className="text-xl font-bold text-white mb-2 uppercase tracking-tighter">Attenzione!</h3>
                     <p className="text-sm text-gray-400 mb-6">Hai delle modifiche non salvate. Sei sicuro di voler uscire e perdere tutto?</p>
                     <div className="flex gap-3">
                       <button 
                         onClick={() => setConfirmClose(false)}
                         className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all"
                       >
                         No, resta qui
                       </button>
                       <button 
                         onClick={() => { setShowEditModal(false); setConfirmClose(false); loadTournaments(); }}
                         className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-lg shadow-red-500/20 transition-all"
                       >
                         Sì, esci
                       </button>
                     </div>
                   </div>
                 </div>
               )}
            <div className="space-y-6">
              <div className="space-y-1">
                <label className="text-[10px] text-gray-500 font-bold uppercase ml-1">Titolo Personalizzato</label>
                <input type="text" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} placeholder="Es: Torneo degli scudi d'oro" className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-white outline-none focus:border-yellow-500 transition-colors" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] text-gray-500 font-bold uppercase ml-1">Tipologia</label>
                  <div className="relative">
                    <select 
                      value={editForm.type} 
                      onChange={e => setEditForm({...editForm, type: e.target.value})} 
                      className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-white outline-none focus:border-yellow-500 transition-colors appearance-none cursor-pointer"
                    >
                      {['1v1', '2v2', '3v3', '4v4', 'FFA', 'Mod'].map(opt => (
                        <option key={opt} value={opt} className="bg-[#121620]">{opt}</option>
                      ))}
                    </select>
                    <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-gray-500 font-bold uppercase ml-1">Organizzatore</label>
                  <input type="text" value={editForm.organizer} onChange={e => setEditForm({...editForm, organizer: e.target.value})} className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-white outline-none focus:border-yellow-500 transition-colors" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-gray-500 font-bold uppercase ml-1">Periodo</label>
                <input type="text" value={editForm.period} onChange={e => setEditForm({...editForm, period: e.target.value})} className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-white outline-none focus:border-yellow-500 transition-colors" />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-gray-500 font-bold uppercase ml-1">Banner Immagine</label>
                <div className="flex gap-2 items-stretch h-12">
                  <div className="relative flex-1 h-full">
                    <ImageIcon size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input 
                      type="text" 
                      value={editForm.bannerUrl} 
                      onChange={e => setEditForm({...editForm, bannerUrl: e.target.value})} 
                      placeholder="Link immagine o carica file"
                      className="w-full h-full bg-black/40 border border-white/10 px-3 pl-10 rounded-xl text-white outline-none focus:border-yellow-500 transition-colors text-xs" 
                    />
                  </div>
                  <label className={`cursor-pointer flex items-center justify-center rounded-xl border border-white/10 bg-black/40 hover:bg-white/5 transition-colors w-12 h-full shrink-0 ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                    <input 
                      type="file" 
                      className="hidden" 
                      accept="image/*"
                      onChange={handleBannerUpload}
                    />
                    {isUploading ? (
                      <Loader2 size={20} className="text-yellow-500 animate-spin" />
                    ) : (
                      <Upload size={20} className="text-gray-400" />
                    )}
                  </label>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] text-gray-500 font-bold uppercase ml-1">Stato Torneo</label>
                 <div className="flex gap-2 text-center">
                   {['Programmato', 'In corso', 'Concluso'].map(s => (
                     <button 
                       key={s} 
                       onClick={() => setEditForm({...editForm, status: s})} 
                       className={clsx(
                         "flex-grow py-3 rounded-xl border text-[10px] font-black uppercase transition-all tracking-wider", 
                         editForm.status === s 
                           ? s === 'In corso' ? "bg-green-500/10 border-green-500 text-green-400" :
                             s === 'Programmato' ? "bg-blue-500/10 border-blue-500 text-blue-400" :
                             "bg-red-500/10 border-red-500 text-red-400"
                           : "bg-white/5 border-white/10 text-gray-500 hover:border-white/20"
                       )}
                     >
                       {s}
                     </button>
                   ))}
                 </div>
               </div>

               <div className="space-y-4 p-4 rounded-2xl bg-white/5 border border-white/10">
                 <div className="flex items-center justify-between">
                   <div className="flex items-center gap-3">
                     <BookOpen size={20} className="text-slate-400" />
                     <div>
                       <p className="text-xs font-bold text-white uppercase tracking-tight">Regolamento</p>
                     </div>
                   </div>
                   <label className="relative inline-flex items-center cursor-pointer">
                     <input 
                       type="checkbox" 
                       className="sr-only peer" 
                       checked={editForm.hasRegolamento} 
                       onChange={e => setEditForm({...editForm, hasRegolamento: e.target.checked})} 
                     />
                     <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-gray-400 after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-400 peer-checked:after:bg-white"></div>
                   </label>
                 </div>

                 {editForm.hasRegolamento && (
                   <WYSIWYGEditor 
                     initialValue={editForm.regolamentoContent} 
                     onChange={(html) => setEditForm({ ...editForm, regolamentoContent: html })} 
                   />
                 )}
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
                    className="text-yellow-500 text-[10px] font-black hover:underline" 
                    hidden={editForm.podium.length >= 3}
                  >
                    + AGGIUNGI RIGA
                  </button>
                </div>
                {editForm.podium.map((p, i) => (
                  <div key={i} className="flex gap-2 items-center bg-black/20 p-3 rounded-2xl border border-white/5">
                    <span className="text-base w-8 text-center">{['🥇','🥈','🥉'][i] || `${i+1}°`}</span>
                    <input type="text" value={p.entrant?.name || ''} onChange={e => {
                      const np = [...editForm.podium]; np[i] = {...p, entrant: {name: e.target.value}}; setEditForm({...editForm, podium: np});
                    }} placeholder={`Nome ${i+1}° classificato`} className="flex-grow bg-transparent border-none text-white text-sm outline-none" />
                    <button onClick={() => setEditForm({...editForm, podium: editForm.podium.filter((_, idx) => idx !== i)})} className="p-2 text-red-500/50 hover:text-red-500 transition-colors"><Trash2 size={16}/></button>
                  </div>
                ))}
              </div>
               <div className="flex gap-4 pt-6 border-t border-white/5">
                 <button 
                   onClick={handleUpdateTournament} 
                   disabled={isSubmitting} 
                   className={clsx(
                     "flex-grow py-4 rounded-2xl flex items-center justify-center gap-3 transition-all text-xs font-black uppercase tracking-widest shadow-xl",
                     saveStatus === 'saved' ? "bg-green-500 text-white" : "bg-gradient-to-b from-slate-100 to-slate-400 text-black hover:brightness-110"
                   )}
                 >
                   {saveStatus === 'saving' ? <Loader2 className="animate-spin" size={18}/> : 
                    saveStatus === 'saved' ? <CheckCircle2 size={18}/> : <Save size={18}/>} 
                   {saveStatus === 'saving' ? 'SALVATAGGIO...' : 
                    saveStatus === 'saved' ? 'SALVATO!' : 'SALVA MODIFICHE'}
                 </button>
                 <button onClick={() => handleDeleteTournament(editingTournament.slug)} className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl hover:bg-red-500/20 transition-all shadow-lg"><Trash2 size={24}/></button>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function WYSIWYGEditor({ initialValue, onChange }: { initialValue: string, onChange: (html: string) => void }) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [activeStyles, setActiveStyles] = useState({ 
    bold: false, italic: false, underline: false,
    alignLeft: false, alignCenter: false, alignRight: false, alignJustify: false,
    font: 'Inter',
    h2: false
  });

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== initialValue) {
      editorRef.current.innerHTML = initialValue || '';
    }
  }, []);

  const checkActiveStyles = () => {
    const block = document.queryCommandValue('formatBlock');
    setActiveStyles({
      // Headings are naturally bold, but we only want the button blue if there's explicit <b>/<strong>/style bold
      bold: document.queryCommandState('bold') && !(block === 'h2' || block === 'H2'),
      italic: document.queryCommandState('italic'),
      underline: document.queryCommandState('underline'),
      alignLeft: document.queryCommandState('justifyLeft'),
      alignCenter: document.queryCommandState('justifyCenter'),
      alignRight: document.queryCommandState('justifyRight'),
      alignJustify: document.queryCommandState('justifyFull'),
      font: document.queryCommandValue('fontName').replace(/['"]/g, '') || 'Inter',
      h2: block === 'h2' || block === 'H2'
    });
  };

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  return (
    <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex flex-wrap gap-2 mb-1 p-2 bg-black/60 rounded-2xl border border-white/10 sticky top-0 z-20 backdrop-blur-md shadow-xl">
        <div className="flex items-center gap-1 pr-2 border-r border-white/10">
          {[
            { cmd: 'bold', label: 'B', title: 'Grassetto', active: activeStyles.bold, className: 'font-bold' },
            { cmd: 'italic', label: 'I', title: 'Corsivo', active: activeStyles.italic, className: 'italic font-serif' },
            { cmd: 'underline', label: 'U', title: 'Sottolineato', active: activeStyles.underline, className: 'underline' }
          ].map(tool => (
            <button 
              key={tool.cmd}
              onMouseDown={(e) => { e.preventDefault(); document.execCommand(tool.cmd, false); checkActiveStyles(); }} 
              className={clsx(
                "p-2 rounded-lg transition-all w-10 h-10 flex items-center justify-center",
                tool.active ? "bg-blue-500 text-white shadow-lg scale-110" : "hover:bg-white/10 text-white"
              )} 
              title={tool.title}
            >
              <span className={tool.className}>{tool.label}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 px-2 border-r border-white/10">
          {[
            { cmd: 'justifyLeft', icon: AlignLeft, active: activeStyles.alignLeft },
            { cmd: 'justifyCenter', icon: AlignCenter, active: activeStyles.alignCenter },
            { cmd: 'justifyRight', icon: AlignRight, active: activeStyles.alignRight },
            { cmd: 'justifyFull', icon: AlignJustify, active: activeStyles.alignJustify }
          ].map(tool => (
            <button 
              key={tool.cmd}
              onMouseDown={(e) => { e.preventDefault(); document.execCommand(tool.cmd, false); checkActiveStyles(); }} 
              className={clsx(
                "p-2 rounded-lg transition-all",
                tool.active ? "bg-blue-500 text-white shadow-lg scale-110" : "text-slate-300 hover:text-white hover:bg-white/10"
              )}
            >
              <tool.icon size={18}/>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 px-2 border-r border-white/10 relative group/font">
          <select 
            value={activeStyles.font}
            onChange={(e) => { 
              document.execCommand('fontName', false, e.target.value); 
              checkActiveStyles();
            }}
            className="bg-white/10 border border-white/20 rounded-xl text-[10px] py-2 px-3 text-white outline-none focus:border-blue-500/50 cursor-pointer hover:bg-white/20 transition-all font-black uppercase tracking-widest appearance-none pr-8 min-w-[120px]"
          >
            <option value="Inter" className="bg-[#121620]">INTER</option>
            <option value="Playfair Display" className="bg-[#121620]">SERIF</option>
            <option value="Roboto Mono" className="bg-[#121620]">MONO</option>
            <option value="Outfit" className="bg-[#121620]">MODERN</option>
          </select>
          <ChevronDown size={12} className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-400 pointer-events-none" />
        </div>

        <div className="flex items-center gap-1 px-2 border-r border-white/10">
          <button 
            onMouseDown={(e) => { 
              e.preventDefault(); 
              const isH2 = document.queryCommandValue('formatBlock') === 'h2' || document.queryCommandValue('formatBlock') === 'H2';
              document.execCommand('formatBlock', false, isH2 ? 'p' : 'h2');
              checkActiveStyles();
              handleInput();
            }} 
            className={clsx(
              "p-2 rounded-lg font-black text-[10px] px-4 transition-all uppercase tracking-tighter",
              activeStyles.h2 ? "bg-blue-500 text-white shadow-lg scale-110" : "hover:bg-white/10 text-white"
            )} 
            title="Titolo Grande"
          >
            TITOLO H2
          </button>
        </div>

        <div className="relative group/emoji">
          <button className="p-2 hover:bg-white/10 rounded-lg text-lg flex items-center justify-center w-10 h-10 transition-transform hover:scale-110 active:scale-95">😀</button>
          <div className="absolute bottom-full left-0 mb-4 p-4 bg-[#0d1117]/95 border border-white/10 rounded-[2rem] hidden group-hover/emoji:grid grid-cols-5 gap-3 z-[100] shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-3xl animate-in fade-in slide-in-from-bottom-4 duration-300 border-b-blue-500 w-[280px]">
            {['🏆','🎮','⚔️','🏰','🎖️','🥇','🥈','🥉','📜','⚖️','📢','🔴','🟢','🔵','⭐','🔥','⚡','💎','🛡️','👑'].map(emoji => (
              <button 
                key={emoji}
                onMouseDown={(e) => { e.preventDefault(); document.execCommand('insertText', false, emoji); handleInput(); }}
                className="w-10 h-10 flex items-center justify-center hover:bg-white/20 rounded-2xl text-2xl transition-all hover:scale-125"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      </div>
      
      <div 
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onMouseUp={checkActiveStyles}
        onKeyUp={checkActiveStyles}
        onFocus={checkActiveStyles}
        onPaste={(e) => {
          e.preventDefault();
          const html = e.clipboardData.getData('text/html');
          const text = e.clipboardData.getData('text/plain');
          
          if (html) {
            // Super-Clean Whitelist Sanitizer
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            
            const sanitize = (node: Node): string => {
              if (node.nodeType === Node.TEXT_NODE) return node.textContent || '';
              if (node.nodeType !== Node.ELEMENT_NODE) return '';
              
              const el = node as HTMLElement;
              const tag = el.tagName.toLowerCase();
              const innerHTML = Array.from(el.childNodes).map(sanitize).join('');
              
              // Block tags we want to keep
              if (tag === 'h2') return `<h2 style="font-weight: 800; font-size: 2rem; margin-top: 1.5rem; margin-bottom: 0.75rem; font-family: Outfit, sans-serif; line-height: 1.2; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 0.5rem; display: block;">${innerHTML}</h2>`;
              if (tag === 'p') return `<p style="margin-top: 0.75rem; margin-bottom: 0.75rem; line-height: 1.6; display: block;">${innerHTML}</p>`;
              if (tag === 'ul') return `<ul style="list-style-type: disc; margin-left: 1.5rem; margin-bottom: 1rem;">${innerHTML}</ul>`;
              if (tag === 'ol') return `<ol style="list-style-type: decimal; margin-left: 1.5rem; margin-bottom: 1rem;">${innerHTML}</ol>`;
              if (tag === 'li') return `<li>${innerHTML}</li>`;
              if (tag === 'br') return '<br>';
              
              // Table support
              if (tag === 'table') return `<table style="width: 100%; border-collapse: collapse; margin-bottom: 1rem; border: 1px solid rgba(255,255,255,0.1);">${innerHTML}</table>`;
              if (tag === 'tr') return `<tr>${innerHTML}</tr>`;
              if (tag === 'td') return `<td style="border: 1px solid rgba(255,255,255,0.1); padding: 8px; text-align: left;">${innerHTML}</td>`;
              if (tag === 'th') return `<th style="border: 1px solid rgba(255,255,255,0.1); padding: 8px; text-align: left; background: rgba(255,255,255,0.05); font-weight: bold;">${innerHTML}</th>`;
              
              // Inline tags we want to keep
              let result = innerHTML;
              const style = el.style;
              
              // ONLY apply bold/italic to inline elements or if it's a semantic tag
              const isInline = ['span', 'b', 'strong', 'i', 'em', 'u', 'a'].includes(tag);
              const isBold = ['b', 'strong'].includes(tag) || (isInline && (style.fontWeight === 'bold' || parseInt(style.fontWeight) >= 600));
              const isItalic = ['i', 'em'].includes(tag) || (isInline && style.fontStyle === 'italic');
              const isUnderline = tag === 'u' || (isInline && style.textDecoration.includes('underline'));
              
              if (isBold) result = `<b>${result}</b>`;
              if (isItalic) result = `<i>${result}</i>`;
              if (isUnderline) result = `<u>${result}</u>`;
              
              return result;
            };

            const cleanedHTML = Array.from(doc.body.childNodes).map(sanitize).join('');
            
            // AGGRESSIVE RESET: Use removeFormat and force normal weight
            // This clears any browser-level bold inheritance from the cursor context
            document.execCommand('removeFormat', false);
            
            // Wrap in a container that explicitly kills any inherited bold
            const finalHTML = `<div style="font-weight: 400 !important; color: white !important;">${cleanedHTML}</div>`;
            document.execCommand('insertHTML', false, finalHTML);
          } else {
            document.execCommand('insertText', false, text);
          }
          handleInput();
        }}
        className="w-full bg-black/40 border border-white/10 p-8 rounded-[2rem] text-white text-base outline-none focus:border-blue-500/40 transition-all min-h-[450px] overflow-y-auto shadow-inner text-left regulation-editor-content"
        style={{ textAlign: 'left' }}
      />
      <p className="text-[9px] text-gray-500 italic px-4">Modifica il testo sopra. Clicca sui tasti per applicare lo stile alla selezione.</p>
    </div>
  );
}
