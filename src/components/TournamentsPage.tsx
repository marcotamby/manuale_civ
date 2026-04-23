/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchTournament } from '../services/startgg';
import { fetchChallongeTournament, fetchChallongeData } from '../services/challonge';
import type { StartGGTournament } from '../services/startgg';
import { Calendar, Users, ArrowRight, Loader2, Plus, Link as LinkIcon, X, CheckCircle2, Edit2, Save, Trash2, Image as ImageIcon, ChevronDown, ChevronUp, Upload, BookOpen, AlignLeft, AlignCenter, AlignRight, AlignJustify, AlertCircle, Settings } from 'lucide-react';
import { clsx } from 'clsx';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabaseClient';
import { toast } from 'react-hot-toast';

interface TournamentConfig {
  slug: string;
  source: 'startgg' | 'challonge';
  organizer: string;
  directLink?: string;
  externalUrl?: string;
  period?: string;
  bannerUrl?: string;
  status?: string;
  podium?: any[];
  name?: string;
  type?: string;
  hasRegolamento?: boolean;
  regolamentoContent?: string;
  display_order?: number;
  created_at?: string;
  id?: string;
}

const TOURNAMENTS: TournamentConfig[] = [];

export function TournamentsPage() {
  const { canManageTournaments } = useAuth();
  const [tournaments, setTournaments] = useState<(StartGGTournament & { config: TournamentConfig })[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const [editingTournament, setEditingTournament] = useState<any>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [editForm, setEditForm] = useState({
    externalUrl: '',
    organizer: '',
    period: '',
    bannerUrl: '',
    status: 'Programmato',
    name: '',
    type: '1v1',
    podium: [] as any[],
    hasRegolamento: false,
    regolamentoContent: '',
    display_order: 0
  });
  const [isUploading, setIsUploading] = useState(false);
  const [isRegEditorExpanded, setIsRegEditorExpanded] = useState(false);
  const [bracketErrorId, setBracketErrorId] = useState<string | null>(null);
  
  const navigate = useNavigate();

  const loadTournaments = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setErrorDetails(null);
    try {
      const { data: dbTournaments, error: dbError } = await supabase
        .from('tournaments')
        .select('*')
        .order('created_at', { ascending: false });

      if (dbError) console.error("Supabase error:", dbError);
      
      // DEBUG CLOUD: Log raw DB data to help identify persistence issues
      console.log("DB Tournaments:", dbTournaments);

      const staticConfigs: TournamentConfig[] = [...TOURNAMENTS];
      const dbConfigs: TournamentConfig[] = [];

      if (dbTournaments) {
        dbTournaments.forEach(db => {
          const configObj: TournamentConfig = {
            slug: db.slug,
            source: (db.source as 'startgg' | 'challonge') || 'challonge',
            organizer: db.organizer || 'Admin',
            directLink: db.direct_link || undefined,
            externalUrl: db.direct_link || undefined,
            period: db.period || undefined,
            bannerUrl: db.banner_url || undefined,
            status: db.status || 'Concluso',
            podium: db.podium || undefined,
            name: db.name || undefined,
            type: db.type || '1v1',
            hasRegolamento: db.has_regolamento || false,
            regolamentoContent: db.regolamento_content || '',
            display_order: db.display_order || 0,
            created_at: db.created_at,
            id: db.id
          };
          dbConfigs.push(configObj);
        });
      }

      // Combine and sort by display_order then by created_at DESC
      const allConfigs = [...dbConfigs];
      
      // Add static ones if they aren't already in DB (by slug)
      staticConfigs.forEach(sc => {
        if (!allConfigs.some(ac => ac.slug === sc.slug)) {
          allConfigs.push(sc);
        }
      });

      // Sort: display_order first (higher first), then created_at (newer first)
      allConfigs.sort((a, b) => {
        if ((b.display_order || 0) !== (a.display_order || 0)) {
          return (b.display_order || 0) - (a.display_order || 0);
        }
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return dateB - dateA;
      });

      const results = await Promise.all(allConfigs.map(async config => {
        try {
          if (config.slug === 'gyunrhoc') {
            return {
              id: config.id || 'gyunrhoc',
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
                id: config.id || tournamentData.id || config.slug,
                name: tournamentData.attributes?.name || `Torneo ${config.slug}`,
                slug: config.slug,
                images: [],
                events: [],
                config: { ...config, directLink: config.directLink || `https://challonge.com/it/${config.slug}` }
              } as any;
            }
            return { ...tournamentData, config, id: config.id || tournamentData.id };
          }

          if (config.slug && (config.directLink || config.slug.startsWith('tb-'))) {
             const isTB = config.slug.startsWith('tb-');
             return {
                id: config.id || config.slug,
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

          // Fallback for manual tournaments without links or sync
          return {
            id: config.id || config.slug,
            name: config.name || `Torneo ${config.slug}`,
            slug: config.slug,
            images: [],
            events: [],
            config
          } as any;
        } catch (e) {
          return { id: config.id || config.slug, name: config.name || `Torneo ${config.slug}`, slug: config.slug, images: [], events: [], config } as any;
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

  const handleSyncFromUrl = async (url: string) => {
    let slug = '';
    let source = '';
    const cleanUrl = url.trim().toLowerCase();
    
    if (cleanUrl.includes('start.gg/tournament/')) {
      const parts = cleanUrl.split('start.gg/tournament/')[1].split('/');
      slug = parts[0];
      source = 'startgg';
    } else if (cleanUrl.includes('challonge.com/')) {
      const parts = cleanUrl.split('challonge.com/')[1].split('/');
      // If it's challonge.com/it/slug, parts[0] is 'it', parts[1] is slug
      slug = (parts[0].length === 2 && parts.length > 1) ? parts[1] : parts[0];
      source = 'challonge';
    } else if (cleanUrl && !cleanUrl.includes('.')) {
      // Fallback: treat as bare slug
      slug = cleanUrl;
      source = 'challonge'; // Default to challonge for bare slugs
    }

    setIsSubmitting(true);
    try {
      if (source === 'startgg') {
        const data = await fetchTournament(slug);
        if (data) {
          setEditForm(prev => ({
            ...prev,
            name: data.name || prev.name,
            bannerUrl: data.images?.find((img: any) => img.type === 'banner')?.url || prev.bannerUrl,
            podium: data.events?.[0]?.standings?.nodes || prev.podium,
            type: data.events?.[0]?.name?.includes('1v1') ? '1v1' : (data.events?.[0]?.name?.includes('2v2') ? '2v2' : 'Team'),
            externalUrl: url
          }));
          toast.success('Dati sincronizzati da Start.gg!');
        }
      } else if (source === 'challonge') {
        const [data, detailData] = await Promise.all([
          fetchChallongeTournament(slug),
          fetchChallongeData(slug)
        ]);
        
        if (data) {
          let podiumData = editForm.podium;
          if (detailData?.participants) {
            // Map participants with final_rank 1, 2, 3 to podium format
            const winners = detailData.participants
              .filter((p: any) => p.attributes.final_rank && p.attributes.final_rank <= 3)
              .sort((a: any, b: any) => (a.attributes.final_rank || 99) - (b.attributes.final_rank || 99))
              .map((p: any) => ({
                entrant: { name: p.attributes.name },
                placement: p.attributes.final_rank
              }));
            
            if (winners.length > 0) {
              podiumData = winners;
            }
          }

          setEditForm(prev => ({
            ...prev,
            name: data.attributes?.name || prev.name,
            podium: podiumData,
            externalUrl: url
          }));
          toast.success('Dati sincronizzati da Challonge!');
        }
      }
    } catch (err: any) {
      console.error('Sync error:', err);
      toast.error(`Errore sincronizzazione: ${err.message || 'Verifica il link o lo slug'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateTournament = async () => {
    setIsSubmitting(true);
    setSaveStatus('saving');
    try {
      let finalSlug = editingTournament?.slug;
      if (!finalSlug) {
        // Generate slug for new tournament
        if (editForm.externalUrl) {
          const url = editForm.externalUrl.toLowerCase();
          if (url.includes('start.gg/tournament/')) {
            finalSlug = editForm.externalUrl.split('start.gg/tournament/')[1].split('/')[0];
          } else if (url.includes('challonge.com/')) {
            finalSlug = editForm.externalUrl.split('challonge.com/')[1].split('/')[0];
          }
        }
        
        if (!finalSlug) {
          if (!editForm.name) {
            toast.error('Inserisci almeno il nome del torneo');
            setIsSubmitting(false);
            setSaveStatus('idle');
            return;
          }
          finalSlug = editForm.name.toLowerCase().trim().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
        }
      }

      const tournamentData = {
        slug: finalSlug,
        source: editForm.externalUrl.includes('challonge') ? 'challonge' : 'startgg',
        name: editForm.name,
        organizer: editForm.organizer,
        period: editForm.period,
        banner_url: editForm.bannerUrl,
        status: editForm.status,
        podium: editForm.podium,
        type: editForm.type,
        has_regolamento: editForm.hasRegolamento,
        regolamento_content: editForm.regolamentoContent,
        direct_link: editForm.externalUrl || null,
        display_order: editForm.display_order,
        updated_at: new Date().toISOString()
      };

      const { data: existing } = await supabase
        .from('tournaments')
        .select('id')
        .eq('slug', finalSlug)
        .single();

      if (!editingTournament && existing) {
        toast.error('Un torneo con questo URL o nome esiste già.');
        setIsSubmitting(false);
        setSaveStatus('idle');
        return;
      }

      const performUpsert = async (data: any) => {
        let upsertError;
        const currentId = editingTournament?.id;
        
        if (currentId && currentId.length > 20) {
          // Explicitly update by UUID if we have it
          const { error } = await supabase
            .from('tournaments')
            .update(data)
            .eq('id', currentId);
          upsertError = error;
        } else {
          // New tournament or no UUID, use upsert with slug conflict resolution
          const { error } = await supabase
            .from('tournaments')
            .upsert(data, { onConflict: 'slug' });
          upsertError = error;
        }

        if (upsertError) {
          if (upsertError.message.includes('display_order')) {
            const { display_order, ...safeData } = data;
            let retryError;
            if (currentId && currentId.length > 20) {
              const { error } = await supabase
                .from('tournaments')
                .update(safeData)
                .eq('id', currentId);
              retryError = error;
            } else {
              const { error } = await supabase
                .from('tournaments')
                .upsert(safeData, { onConflict: 'slug' });
              retryError = error;
            }
            if (retryError) throw retryError;
          } else {
            throw upsertError;
          }
        }
      };

      await performUpsert(tournamentData);
      
      setSaveStatus('saved');
      
      // Update local state to reflect saved changes, so 'X' button logic knows we are synced
      setEditingTournament((prev: any) => prev ? ({
        ...prev,
        name: editForm.name,
        status: editForm.status,
        config: {
          ...prev.config,
          name: editForm.name,
          organizer: editForm.organizer,
          period: editForm.period,
          bannerUrl: editForm.bannerUrl,
          status: editForm.status,
          type: editForm.type,
          podium: editForm.podium,
          hasRegolamento: editForm.hasRegolamento,
          regolamentoContent: editForm.regolamentoContent
        }
      }) : null);

      loadTournaments(true); // Silent refresh to avoid jump
      setTimeout(() => {
        setSaveStatus('idle');
      }, 2000);
    } catch (err: any) {
      toast.error(`Errore: ${err.message}`);
      setSaveStatus('idle');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTournament = async (id: string, slug: string) => {
    try {
      // If ID looks like a UUID (length > 20), use it. Otherwise use slug.
      const query = (id && id.length > 20) 
        ? supabase.from('tournaments').delete().eq('id', id)
        : supabase.from('tournaments').delete().eq('slug', slug);

      const { error } = await query;
      if (error) throw error;
      toast.success('Torneo rimosso.');
      setShowDeleteConfirm(false);
      setShowEditModal(false);
      loadTournaments();
    } catch (err: any) {
      toast.error(`Errore: ${err.message}`);
    }
  };

  const handleMoveTournament = async (index: number, direction: 'up' | 'down') => {
    const otherIndex = direction === 'up' ? index - 1 : index + 1;
    if (otherIndex < 0 || otherIndex >= tournaments.length) return;

    const current = tournaments[index];
    const other = tournaments[otherIndex];

    // Swap or adjust display_order
    let newCurrentOrder = (other.config?.display_order || 0);
    let newOtherOrder = (current.config?.display_order || 0);

    if (newCurrentOrder === newOtherOrder) {
      if (direction === 'up') {
        newCurrentOrder = newOtherOrder + 1;
      } else {
        newOtherOrder = newCurrentOrder + 1;
      }
    }

    try {
      const moveUpsert = async (tournament: any, newOrder: number) => {
        const config = tournament.config || {};
        const data: any = {
          slug: tournament.slug,
          source: config.source || 'challonge',
          name: config.name || tournament.name || tournament.slug,
          organizer: config.organizer || 'Admin',
          period: config.period || null,
          banner_url: config.bannerUrl || null,
          status: config.status || 'Concluso',
          podium: config.podium || null,
          type: config.type || '1v1',
          has_regolamento: config.hasRegolamento || false,
          regolamento_content: config.regolamentoContent || '',
          direct_link: config.directLink || null,
          display_order: newOrder,
          updated_at: new Date().toISOString()
        };

        // If ID is a valid UUID, use it
        if (config.id && config.id.length > 20) {
          data.id = config.id;
        }

        const { error } = await supabase.from('tournaments').upsert(data, { onConflict: 'slug' });
        if (error) {
          if (error.message.includes('display_order')) {
            toast.error('Errore: Devi prima attivare la colonna Ordinamento nel database');
            return false;
          }
          throw error;
        }
        return true;
      };

      const ok1 = await moveUpsert(current, newCurrentOrder);
      if (!ok1) return;

      const ok2 = await moveUpsert(other, newOtherOrder);
      if (!ok2) return;

      loadTournaments();
      toast.success('Ordine aggiornato');
    } catch (err: any) {
      toast.error('Errore durante l\'ordinamento');
      console.error('Reorder error:', err);
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
            onClick={() => {
              setEditingTournament(null);
              setEditForm({
                externalUrl: '',
                organizer: 'Manuale Civ',
                period: '',
                bannerUrl: '',
                status: 'Programmato',
                name: '',
                type: '1v1',
                podium: [],
                hasRegolamento: false,
                regolamentoContent: '',
                display_order: 0
              });
              setShowEditModal(true);
            }} 
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
        {tournaments.map((t, index) => {
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


                       <div 
                        className={clsx(
                          "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider backdrop-blur-md border shadow-lg flex items-center gap-2 transition-all",
                          status === 'In corso' ? "bg-green-500/40 border-green-500/60 text-green-400" : 
                          status === 'Programmato' ? "bg-slate-500/40 border-slate-300/60 text-slate-100" :
                          "bg-red-500/40 border-red-500/60 text-red-400"
                        )}
                        style={{ textShadow: '0 0 3px rgba(255,255,255,0.5), 0 0 6px rgba(0,0,0,0.8)' }}
                      >
                        {status === 'In corso' && <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block mr-0.5 animate-pulse" />}
                        {status === 'Concluso' && <span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block mr-0.5" />}
                        {status === 'Programmato' && <Calendar size={10} className="mr-0.5 text-slate-200" />}
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
                          onClick={() => {
                            if (t.config.directLink) {
                              window.open(t.config.directLink, '_blank');
                            } else if (t.events?.length > 0 || (t.config.source === 'challonge' && !t.config.slug.startsWith('tb-'))) {
                              navigate(`/tornei/${t.slug}`);
                            } else {
                              setBracketErrorId(t.id);
                              setTimeout(() => setBracketErrorId(null), 3000);
                            }
                          }} 
                          className={clsx(
                            "flex-grow h-full bg-white/5 hover:bg-white/10 rounded-2xl text-white font-black uppercase transition-all tracking-wider flex items-center justify-center gap-2 group/det shadow-lg active:scale-95",
                            t.config.hasRegolamento ? "text-[10px]" : "text-xs"
                          )}
                        >
                          {bracketErrorId === t.id ? (
                            <span className="text-red-400 font-black animate-pulse text-[10px] tracking-tight">
                              NON DISPONIBILE
                            </span>
                          ) : (
                            <>Tabellone <ArrowRight size={14} className="group-hover/det:translate-x-1 transition-transform" /></>
                          )}
                        </button>
                        {canManageTournaments && (
                          <div className="flex flex-col gap-1 h-full">
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleMoveTournament(index, 'up'); }}
                              className="w-8 flex-1 bg-white/5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-all flex items-center justify-center border border-white/5"
                            >
                              <ChevronUp size={14} />
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleMoveTournament(index, 'down'); }}
                              className="w-8 flex-1 bg-white/5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-all flex items-center justify-center border border-white/5"
                            >
                              <ChevronDown size={14} />
                            </button>
                          </div>
                        )}
                        {canManageTournaments && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingTournament(t);
                              setEditForm({
                                organizer: t.config?.organizer || '',
                                period: t.config?.period || '',
                                bannerUrl: t.config?.bannerUrl || '',
                                status: t.config?.status || 'Concluso',
                                name: t.config?.name || t.name || '',
                                type: t.config?.type || '1v1',
                                podium: t.config?.podium || (t.events?.[0]?.standings?.nodes || []),
                                hasRegolamento: t.config?.hasRegolamento || false,
                                regolamentoContent: t.config?.regolamentoContent || '',
                                externalUrl: t.config?.externalUrl || '',
                                display_order: t.config?.display_order || 0
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


      {showEditModal && (
        <div 
          className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget && saveStatus === 'saved') {
              setShowEditModal(false);
              loadTournaments();
            }
          }}
        >
          {confirmClose && (
            <div className="fixed inset-0 z-[120] flex items-start justify-center p-4 pt-32 bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-300">
              <div className="bg-[#1a1f2e] border border-white/10 p-8 rounded-[2rem] max-w-sm text-center shadow-2xl scale-100 animate-in zoom-in-95">
                <AlertCircle size={48} className="mx-auto mb-4 text-yellow-500" />
                <h3 className="text-xl font-bold text-white mb-2 uppercase tracking-tighter">Attenzione!</h3>
                <p className="text-sm text-gray-400 mb-6">Hai delle modifiche non salvate. Sei sicuro di voler uscire?</p>
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

          <div className="bg-[#121620] border border-white/10 p-8 rounded-3xl w-full max-w-2xl my-auto shadow-2xl animate-in zoom-in-95 duration-300 relative overflow-hidden">
            
            {/* Header */}
            <div className="flex justify-between items-center mb-8 text-slate-300">
              <div className="flex items-center gap-2">
                <Settings size={18} className="text-yellow-500" />
                <h2 className="text-xl font-black uppercase tracking-tighter text-white">
                  {editingTournament ? 'Gestione Torneo' : 'Nuovo Torneo'}
                </h2>
              </div>
              <div className="flex items-center gap-4">
                {saveStatus === 'saving' && <Loader2 className="w-4 h-4 animate-spin text-yellow-500" />}
                <X 
                  id="close-modal-btn"
                  className="cursor-pointer text-gray-500 hover:text-white transition-colors" 
                  onClick={() => { 
                    const initialData = {
                      name: editingTournament?.config?.name || editingTournament?.name || '',
                      organizer: editingTournament?.config?.organizer || '',
                      period: editingTournament?.config?.period || '',
                      bannerUrl: editingTournament?.config?.bannerUrl || '',
                      type: editingTournament?.config?.type || '1v1',
                      status: editingTournament?.config?.status || 'Concluso',
                      hasRegolamento: editingTournament?.config?.hasRegolamento || false,
                      regolamentoContent: editingTournament?.config?.regolamentoContent || '',
                      podium: editingTournament?.config?.podium || (editingTournament?.events?.[0]?.standings?.nodes || [])
                    };

                    const currentData = {
                      name: editForm.name,
                      organizer: editForm.organizer,
                      period: editForm.period,
                      bannerUrl: editForm.bannerUrl,
                      type: editForm.type,
                      status: editForm.status,
                      hasRegolamento: editForm.hasRegolamento,
                      regolamentoContent: editForm.regolamentoContent,
                      podium: editForm.podium
                    };

                    if (JSON.stringify(initialData) === JSON.stringify(currentData)) {
                      setShowEditModal(false); 
                      loadTournaments(); 
                    } else {
                      setConfirmClose(true);
                    }
                  }} 
                />
              </div>
            </div>

            {/* Body */}
            <div className="relative">
              {/* URL Sync Section */}
              <div className="mb-8 p-6 bg-white/[0.02] border border-white/5 rounded-2xl">
                <label className="block text-[10px] font-black text-yellow-500 uppercase tracking-widest mb-3">Sincronizzazione Automatica</label>
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <LinkIcon size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input 
                      type="text" 
                      value={editForm.externalUrl}
                      onChange={(e) => setEditForm({ ...editForm, externalUrl: e.target.value })}
                      placeholder="Link Start.gg o Challonge..."
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 pl-12 text-white text-sm focus:border-yellow-500/50 outline-none transition-all"
                    />
                  </div>
                  <button 
                    onClick={() => handleSyncFromUrl(editForm.externalUrl)}
                    disabled={isSubmitting || !editForm.externalUrl}
                    className="px-6 bg-yellow-500 hover:bg-yellow-400 text-black rounded-xl font-black uppercase text-[10px] tracking-widest transition-all disabled:opacity-50 shadow-lg shadow-yellow-500/10"
                  >
                    {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : 'Sincronizza'}
                  </button>
                </div>
                <p className="mt-3 text-[9px] text-gray-500 italic flex items-center gap-2">
                  <AlertCircle size={10} />
                  Inserisci il link del torneo per autocompilare Nome, Banner e Podio.
                </p>
              </div>

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
                  <label className="text-[10px] text-gray-500 font-bold uppercase ml-1">Priorità Visualizzazione (più alto = prima)</label>
                  <input 
                    type="number" 
                    value={editForm.display_order} 
                    onChange={e => setEditForm({...editForm, display_order: parseInt(e.target.value) || 0})}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-xs outline-none focus:border-yellow-500 transition-colors"
                    placeholder="0"
                  />
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
                    <div className="space-y-4">
                      <button 
                        type="button"
                        onClick={() => setIsRegEditorExpanded(!isRegEditorExpanded)}
                        className="w-full py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 transition-all flex items-center justify-center gap-2"
                      >
                        {isRegEditorExpanded ? 'Riduci Editor' : 'Espandi Editor per Modificare'} 
                        <ChevronDown size={14} className={clsx("transition-transform", isRegEditorExpanded && "rotate-180")} />
                      </button>
                      
                      {isRegEditorExpanded && (
                        <div className="animate-in fade-in zoom-in-95 duration-300">
                          <WYSIWYGEditor 
                            initialValue={editForm.regolamentoContent} 
                            onChange={(html) => setEditForm({ ...editForm, regolamentoContent: html })} 
                          />
                        </div>
                      )}
                    </div>
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
                    type="button"
                    onClick={handleUpdateTournament} 
                    disabled={isSubmitting} 
                    className={clsx(
                      "flex-grow py-4 rounded-2xl flex items-center justify-center gap-3 transition-all text-xs font-black uppercase tracking-widest shadow-xl",
                      saveStatus === 'saved' ? "bg-green-600 text-white shadow-[0_0_20px_rgba(34,197,94,0.4)]" : "bg-gradient-to-b from-slate-100 to-slate-400 text-black hover:brightness-110"
                    )}
                  >
                    {saveStatus === 'saving' ? <Loader2 className="animate-spin" size={18}/> : 
                     saveStatus === 'saved' ? <CheckCircle2 size={18}/> : <Save size={18}/>} 
                    {saveStatus === 'saving' ? 'SALVATAGGIO...' : 
                     saveStatus === 'saved' ? 'SALVATO!' : 
                     editingTournament ? 'SALVA MODIFICHE' : 'CREA TORNEO'}
                  </button>
                  {editingTournament && (
                    <button 
                      type="button"
                      onClick={() => setShowDeleteConfirm(true)} 
                      className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl hover:bg-red-500/20 transition-all shadow-lg"
                    >
                      <Trash2 size={24}/>
                    </button>
                  )}
                </div>

                {showDeleteConfirm && (
                  <div className="absolute inset-0 z-[130] flex items-center justify-center p-6 bg-[#0d1424]/90 backdrop-blur-sm rounded-[2.5rem] animate-in fade-in zoom-in-95 duration-200">
                    <div className="text-center max-w-xs">
                      <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-500/20">
                        <Trash2 className="text-red-500" size={40} />
                      </div>
                      <h3 className="text-2xl font-sackers font-black text-white mb-3 uppercase tracking-tighter">Elimina Torneo</h3>
                      <p className="text-gray-400 text-sm mb-8 leading-relaxed font-medium">
                        Sei sicuro di voler rimuovere definitivamente questo torneo? L'azione non è reversibile.
                      </p>
                      <div className="flex flex-col gap-3">
                        <button 
                          onClick={() => handleDeleteTournament(editingTournament?.id || '', editingTournament?.slug || '')}
                          className="w-full py-4 bg-red-600 hover:bg-red-500 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-red-900/20 transition-all active:scale-95"
                        >
                          Conferma Eliminazione
                        </button>
                        <button 
                          onClick={() => setShowDeleteConfirm(false)}
                          className="w-full py-4 bg-white/5 hover:bg-white/10 text-gray-400 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all"
                        >
                          Annulla
                        </button>
                      </div>
                    </div>
                  </div>
                )}
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
    if (typeof document === 'undefined') return;
    const block = document.queryCommandValue('formatBlock');
    
    let isH2 = block === 'h2' || block === 'H2';
    if (!isH2) {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        let node: Node | null = selection.anchorNode;
        while (node && node !== editorRef.current) {
          if (node.nodeName === 'H2') {
            isH2 = true;
            break;
          }
          node = node.parentNode;
        }
      }
    }

    setActiveStyles({
      bold: document.queryCommandState('bold') && !isH2,
      italic: document.queryCommandState('italic'),
      underline: document.queryCommandState('underline'),
      alignLeft: document.queryCommandState('justifyLeft'),
      alignCenter: document.queryCommandState('justifyCenter'),
      alignRight: document.queryCommandState('justifyRight'),
      alignJustify: document.queryCommandState('justifyFull'),
      font: (document.queryCommandValue('fontName') || 'Inter').replace(/['"]/g, ''),
      h2: isH2
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
              const isH2 = activeStyles.h2;
              document.execCommand('formatBlock', false, isH2 ? 'p' : 'h2');
              setTimeout(() => {
                checkActiveStyles();
                handleInput();
              }, 10);
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
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            
            const sanitize = (node: Node): string => {
              if (node.nodeType === Node.TEXT_NODE) return node.textContent || '';
              if (node.nodeType !== Node.ELEMENT_NODE) return '';
              
              const el = node as HTMLElement;
              const tag = el.tagName.toLowerCase();
              const innerHTML = Array.from(el.childNodes).map(sanitize).join('');
              
              if (tag === 'h2') return `<h2>${innerHTML}</h2>`;
              if (tag === 'p') return `<p>${innerHTML}</p>`;
              if (tag === 'ul') return `<ul>${innerHTML}</ul>`;
              if (tag === 'ol') return `<ol>${innerHTML}</ol>`;
              if (tag === 'li') return `<li>${innerHTML}</li>`;
              if (tag === 'br') return '<br>';
              if (tag === 'table') return `<table>${innerHTML}</table>`;
              if (tag === 'tr') return `<tr>${innerHTML}</tr>`;
              if (tag === 'td') return `<td>${innerHTML}</td>`;
              if (tag === 'th') return `<th>${innerHTML}</th>`;
              
              let result = innerHTML;
              const style = el.style;
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
            document.execCommand('removeFormat', false);
            document.execCommand('insertHTML', false, cleanedHTML);
          } else {
            document.execCommand('insertText', false, text);
          }
          handleInput();
        }}
        className="w-full bg-black/40 border border-white/10 p-8 rounded-[2rem] text-white text-base outline-none focus:border-blue-500/40 transition-all min-h-[450px] overflow-y-auto shadow-inner text-left regulation-editor-content"
        style={{ textAlign: 'left' }}
      ></div>
      <p className="text-[9px] text-gray-500 italic px-4">Modifica il testo sopra. Clicca sui tasti per applicare lo stile alla selezione.</p>
    </div>
  );
}
