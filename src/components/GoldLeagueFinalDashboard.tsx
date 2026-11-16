import { useState, useEffect, useRef } from 'react';
import {
  Save,
  Trophy,
  RefreshCcw,
  Plus,
  Minus,
  X,
  ChevronDown,
  Link2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ArrowLeftRight,
  Timer as TimerIcon,
  Map as MapIcon,
  Upload,
  User,
  Sparkles,
  BarChart3,
  Radio,
  Eye,
  EyeOff,
  Tv
} from 'lucide-react';
import { civilizationsData } from '../data/aoe4Data';
import { AOE4_MAPS } from '../data/aoe4Maps';
import { overlayService } from '../services/overlayService';
import type { OverlayState, PlayerSkills } from '../services/overlayService';
import { fetchDraft } from '../utils/draftImporter';
import { supabase } from '../lib/supabaseClient';

const OVERLAY_ID = 'gold-league-final';

interface GoldLeagueFinalDashboardProps {
  onError: (msg: string) => void;
}

interface DraftCivEntry {
  civId: string;
  status: 'pick' | 'ban' | 'snipe' | 'played';
}

interface FinalMapEntry {
  name: string;
  p1Civ: string;
  p2Civ: string;
  winner: 0 | 1 | 2;
  isNext: boolean;
}

const COUNTRY_OPTIONS = [
  { code: 'ch', label: 'Svizzera (CH)' },
  { code: 'it', label: 'Italia (IT)' },
  { code: 'de', label: 'Germania (DE)' },
  { code: 'fr', label: 'Francia (FR)' },
  { code: 'gb', label: 'Regno Unito (GB)' },
  { code: 'es', label: 'Spagna (ES)' },
  { code: 'at', label: 'Austria (AT)' },
  { code: 'nl', label: 'Paesi Bassi (NL)' },
  { code: 'pl', label: 'Polonia (PL)' },
  { code: 'se', label: 'Svezia (SE)' },
  { code: 'us', label: 'Stati Uniti (US)' },
  { code: 'eu', label: 'Europa (EU)' },
  { code: 'none', label: 'Nessuna bandiera' }
];

const SKILL_CONFIG: { key: keyof PlayerSkills; label: string }[] = [
  { key: 'micro', label: 'Micro' },
  { key: 'macro', label: 'Macro' },
  { key: 'apm', label: 'APM' },
  { key: 'strategia', label: 'Strategia' },
  { key: 'creativita', label: 'Creatività' }
];

const DEFAULT_SKILLS: PlayerSkills = {
  micro: 8,
  macro: 8,
  apm: 8,
  strategia: 8,
  creativita: 8
};

const DEFAULT_STATE = {
  tournamentTitle: 'FINALE LEGA ORO',
  stageSubtitle: 'AGE OF EMPIRES IV • AOE ITALIA',
  dayText: 'GRAND FINAL',
  matchFormat: 'BEST OF 5',
  showLogo: true,
  minimapBrandTitle: 'AOE ITALIA • LEGA ORO',
  p1: {
    name: 'Chrysaor',
    score: 0,
    seed: '1',
    country: 'ch',
    photoUrl: '',
    civId: '',
    draftCivs: [] as DraftCivEntry[],
    skills: { ...DEFAULT_SKILLS }
  },
  p2: {
    name: 'Gattoratto',
    score: 0,
    seed: '2',
    country: 'it',
    photoUrl: '',
    civId: '',
    draftCivs: [] as DraftCivEntry[],
    skills: { ...DEFAULT_SKILLS }
  },
  maps: [
    { name: 'Dry Arabia', p1Civ: '', p2Civ: '', winner: 0, isNext: true },
    { name: 'Frisian Marshes', p1Civ: '', p2Civ: '', winner: 0, isNext: false },
    { name: 'Silk Road', p1Civ: '', p2Civ: '', winner: 0, isNext: false },
    { name: 'High View', p1Civ: '', p2Civ: '', winner: 0, isNext: false },
    { name: 'Lipany', p1Civ: '', p2Civ: '', winner: 0, isNext: false }
  ] as FinalMapEntry[],
  timer: { active: false, min: 5, sec: 0, timestamp: Date.now() },
  casters: [{ name: '', active: true }]
};

const STATUS_CYCLE: DraftCivEntry['status'][] = ['pick', 'played', 'ban', 'snipe'];

const STATUS_BADGE_MAP: Record<DraftCivEntry['status'], { label: string; cls: string }> = {
  pick: { label: 'PICK', cls: 'bg-amber-500/20 text-amber-300 border-amber-400/50' },
  played: { label: 'GIOCATA', cls: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/50' },
  ban: { label: 'BAN', cls: 'bg-red-500/20 text-red-300 border-red-400/50' },
  snipe: { label: 'SNIPE', cls: 'bg-orange-500/20 text-orange-300 border-orange-400/50' }
};

export function GoldLeagueFinalDashboard({ onError }: GoldLeagueFinalDashboardProps) {
  const [state, setState] = useState<typeof DEFAULT_STATE>(DEFAULT_STATE);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isLiveSyncing, setIsLiveSyncing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [uploadingPhotoFor, setUploadingPhotoFor] = useState<'p1' | 'p2' | null>(null);

  const [draftCivUrl, setDraftCivUrl] = useState('');
  const [isDraftCivLoading, setIsDraftCivLoading] = useState(false);
  const [draftCivStatus, setDraftCivStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [autoSyncCiv, setAutoSyncCiv] = useState(false);

  const [draftMapUrl, setDraftMapUrl] = useState('');
  const [isDraftMapLoading, setIsDraftMapLoading] = useState(false);
  const [draftMapStatus, setDraftMapStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [autoSyncMap, setAutoSyncMap] = useState(false);

  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;
  const p1PhotoRef = useRef<HTMLInputElement>(null);
  const p2PhotoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    overlayService
      .getOverlayState(OVERLAY_ID)
      .then((saved) => {
        if (saved && Object.keys(saved).length > 0) {
          setState((prev) => {
            const merged = {
              ...prev,
              ...saved,
              p1: {
                ...prev.p1,
                ...(saved.p1 || {}),
                skills: { ...DEFAULT_SKILLS, ...(saved.p1?.skills || {}) },
                draftCivs: Array.isArray(saved.p1?.draftCivs) ? (saved.p1!.draftCivs as DraftCivEntry[]) : []
              },
              p2: {
                ...prev.p2,
                ...(saved.p2 || {}),
                skills: { ...DEFAULT_SKILLS, ...(saved.p2?.skills || {}) },
                draftCivs: Array.isArray(saved.p2?.draftCivs) ? (saved.p2!.draftCivs as DraftCivEntry[]) : []
              },
              maps: Array.isArray(saved.maps) && saved.maps.length > 0 ? saved.maps : prev.maps,
              timer: { ...prev.timer, ...(saved.timer || {}) },
              casters: Array.isArray(saved.casters) && saved.casters.length > 0 ? saved.casters : prev.casters
            };
            stateRef.current = merged;
            return merged;
          });
        }
      })
      .catch((err) => onError('Errore caricamento stato Finale Lega Oro: ' + err.message))
      .finally(() => setIsLoading(false));
  }, [onError]);

  const pushState = (nextState: typeof DEFAULT_STATE, immediate = false) => {
    stateRef.current = nextState;
    setState(nextState);
    setIsLiveSyncing(true);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    const exec = async () => {
      setIsSaving(true);
      try {
        await overlayService.updateOverlayState(OVERLAY_ID, stateRef.current as unknown as OverlayState);
        setIsLiveSyncing(false);
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 1600);
      } catch (err: any) {
        setIsLiveSyncing(false);
        onError('Errore salvataggio live: ' + (err?.message || 'connessione fallita'));
      } finally {
        setIsSaving(false);
      }
    };

    if (immediate) {
      return exec();
    } else {
      debounceRef.current = setTimeout(exec, 260);
    }
  };

  useEffect(() => {
    if (!autoSyncCiv || !draftCivUrl.trim()) return;
    const interval = setInterval(() => {
      fetchDraft(draftCivUrl)
        .then((draft) => {
          setState((prev) => {
            const p1Entries: DraftCivEntry[] = [
              ...draft.hostPicks.map((civId) => ({ civId, status: 'pick' as const })),
              ...draft.hostBans.map((civId) => ({ civId, status: 'ban' as const }))
            ];
            const p2Entries: DraftCivEntry[] = [
              ...draft.guestPicks.map((civId) => ({ civId, status: 'pick' as const })),
              ...draft.guestBans.map((civId) => ({ civId, status: 'ban' as const }))
            ];

            const nextState: typeof DEFAULT_STATE = {
              ...prev,
              p1: {
                ...prev.p1,
                name: draft.nameHost || prev.p1.name,
                draftCivs: p1Entries.length > 0 ? p1Entries : prev.p1.draftCivs
              },
              p2: {
                ...prev.p2,
                name: draft.nameGuest || prev.p2.name,
                draftCivs: p2Entries.length > 0 ? p2Entries : prev.p2.draftCivs
              }
            };

            if (JSON.stringify(prev) !== JSON.stringify(nextState)) {
              overlayService.updateOverlayState(OVERLAY_ID, nextState as unknown as OverlayState).catch(console.error);
            }
            return nextState;
          });
        })
        .catch((err) => console.error('AutoSync Civ error:', err));
    }, 5000);
    return () => clearInterval(interval);
  }, [autoSyncCiv, draftCivUrl]);

  useEffect(() => {
    if (!autoSyncMap || !draftMapUrl.trim()) return;
    const interval = setInterval(() => {
      fetchDraft(draftMapUrl)
        .then((draft) => {
          if (draft.maps.length === 0) return;
          setState((prev) => {
            const newMaps = [...prev.maps];
            draft.maps.forEach((mapName, idx) => {
              if (idx < newMaps.length) {
                newMaps[idx] = { ...newMaps[idx], name: mapName };
              } else {
                newMaps.push({ name: mapName, p1Civ: '', p2Civ: '', winner: 0, isNext: false });
              }
            });
            const nextState = { ...prev, maps: newMaps };
            if (JSON.stringify(prev) !== JSON.stringify(nextState)) {
              overlayService.updateOverlayState(OVERLAY_ID, nextState as unknown as OverlayState).catch(console.error);
            }
            return nextState;
          });
        })
        .catch((err) => console.error('AutoSync Map error:', err));
    }, 5000);
    return () => clearInterval(interval);
  }, [autoSyncMap, draftMapUrl]);

  const handleDraftCivImport = async () => {
    if (!draftCivUrl.trim()) return;
    setIsDraftCivLoading(true);
    setDraftCivStatus(null);
    try {
      const draft = await fetchDraft(draftCivUrl);
      const p1Entries: DraftCivEntry[] = [
        ...draft.hostPicks.map((civId) => ({ civId, status: 'pick' as const })),
        ...draft.hostBans.map((civId) => ({ civId, status: 'ban' as const }))
      ];
      const p2Entries: DraftCivEntry[] = [
        ...draft.guestPicks.map((civId) => ({ civId, status: 'pick' as const })),
        ...draft.guestBans.map((civId) => ({ civId, status: 'ban' as const }))
      ];

      const nextState: typeof DEFAULT_STATE = {
        ...state,
        p1: {
          ...state.p1,
          name: draft.nameHost || state.p1.name,
          draftCivs: p1Entries.length > 0 ? p1Entries : state.p1.draftCivs
        },
        p2: {
          ...state.p2,
          name: draft.nameGuest || state.p2.name,
          draftCivs: p2Entries.length > 0 ? p2Entries : state.p2.draftCivs
        }
      };

      pushState(nextState, true);
      setDraftCivStatus({
        type: 'success',
        message: `Importati ${p1Entries.length} slot per ${nextState.p1.name} e ${p2Entries.length} per ${nextState.p2.name}.`
      });
    } catch (err: any) {
      setDraftCivStatus({
        type: 'error',
        message: err?.message || 'Errore importazione draft civiltà.'
      });
    } finally {
      setIsDraftCivLoading(false);
    }
  };

  const handleDraftMapImport = async () => {
    if (!draftMapUrl.trim()) return;
    setIsDraftMapLoading(true);
    setDraftMapStatus(null);
    try {
      const draft = await fetchDraft(draftMapUrl);
      if (draft.maps.length === 0) {
        setDraftMapStatus({ type: 'error', message: 'Nessuna mappa trovata nel link.' });
        return;
      }
      const newMaps = [...state.maps];
      draft.maps.forEach((mapName, idx) => {
        if (idx < newMaps.length) {
          newMaps[idx] = { ...newMaps[idx], name: mapName };
        } else {
          newMaps.push({ name: mapName, p1Civ: '', p2Civ: '', winner: 0, isNext: false });
        }
      });
      pushState({ ...state, maps: newMaps }, true);
      setDraftMapStatus({
        type: 'success',
        message: `Mappe importate: ${draft.maps.join(', ')}`
      });
    } catch (err: any) {
      setDraftMapStatus({
        type: 'error',
        message: err?.message || 'Errore importazione draft mappe.'
      });
    } finally {
      setIsDraftMapLoading(false);
    }
  };

  const prepareAvatarAsset = (file: File): Promise<{ blob: Blob; dataUrl: string; ext: string }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Impossibile leggere il file immagine.'));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error('Formato immagine non valido.'));
        img.onload = () => {
          const maxSide = 512;
          let { width, height } = img;
          if (width > maxSide || height > maxSide) {
            const ratio = Math.min(maxSide / width, maxSide / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Canvas non disponibile.'));
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/png');
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Conversione immagine fallita.'));
                return;
              }
              resolve({ blob, dataUrl, ext: 'png' });
            },
            'image/png',
            0.92
          );
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const handlePhotoUpload = async (playerKey: 'p1' | 'p2', file: File | undefined) => {
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) {
      onError('Immagine troppo grande (max 15MB).');
      return;
    }
    setUploadingPhotoFor(playerKey);
    try {
      const { blob, dataUrl, ext } = await prepareAvatarAsset(file);
      let finalPhotoUrl = '';

      try {
        const filePath = `overlay-avatars/${OVERLAY_ID}-${playerKey}-${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from('civilizations')
          .upload(filePath, blob, { contentType: 'image/png', cacheControl: '3600', upsert: true });

        if (!uploadErr) {
          const { data: { publicUrl } } = supabase.storage
            .from('civilizations')
            .getPublicUrl(filePath);
          finalPhotoUrl = publicUrl;
        } else {
          console.warn('Supabase storage avatar upload fallback to data URL:', uploadErr.message);
        }
      } catch (storageErr) {
        console.warn('Supabase storage unavailable, fallback to data URL:', storageErr);
      }

      if (!finalPhotoUrl) {
        finalPhotoUrl = dataUrl;
      }

      const latest = stateRef.current;
      await pushState(
        {
          ...latest,
          [playerKey]: {
            ...latest[playerKey],
            photoUrl: finalPhotoUrl
          }
        },
        true
      );
    } catch (err: any) {
      onError(`Errore caricamento foto giocatore: ${err?.message || 'caricamento fallito'}`);
    } finally {
      setUploadingPhotoFor(null);
    }
  };

  const handleSwapPlayers = () => {
    pushState(
      {
        ...state,
        p1: { ...state.p2 },
        p2: { ...state.p1 },
        maps: state.maps.map((m) => ({
          ...m,
          p1Civ: m.p2Civ,
          p2Civ: m.p1Civ,
          winner: m.winner === 1 ? 2 : m.winner === 2 ? 1 : 0
        }))
      },
      true
    );
  };

  const handleReset = () => {
    setShowResetConfirm(false);
    setAutoSyncCiv(false);
    setAutoSyncMap(false);
    setDraftCivUrl('');
    setDraftMapUrl('');
    setDraftCivStatus(null);
    setDraftMapStatus(null);
    pushState(DEFAULT_STATE, true);
  };

  const changeFormatCount = (count: number) => {
    const nextMaps = [...state.maps];
    while (nextMaps.length < count) {
      nextMaps.push({ name: 'Dry Arabia', p1Civ: '', p2Civ: '', winner: 0, isNext: false });
    }
    if (nextMaps.length > count) {
      nextMaps.length = count;
    }
    pushState(
      {
        ...state,
        matchFormat: `BEST OF ${count}`,
        maps: nextMaps
      },
      true
    );
  };

  const CivSelectCompact = ({
    value,
    onChange,
    label = 'Scegli Civ'
  }: {
    value: string;
    onChange: (val: string) => void;
    label?: string;
  }) => {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const selected = civilizationsData.find((c) => c.id === value);

    useEffect(() => {
      const outside = (e: MouseEvent) => {
        if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
      };
      document.addEventListener('mousedown', outside);
      return () => document.removeEventListener('mousedown', outside);
    }, []);

    return (
      <div className="relative w-full" ref={ref}>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="w-full flex items-center gap-2 bg-[#0d111a] border border-white/10 hover:border-amber-400/50 rounded-xl px-2.5 py-2 text-left transition-all"
        >
          <div className="w-7 h-5 rounded bg-black/50 border border-white/10 overflow-hidden shrink-0 flex items-center justify-center">
            {selected ? (
              <img src={selected.flag} alt={selected.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-[10px] text-gray-600 font-bold">?</span>
            )}
          </div>
          <span className="flex-1 text-[11px] font-bold uppercase tracking-wider text-white truncate">
            {selected ? selected.name : label}
          </span>
          <ChevronDown size={13} className="text-gray-500 shrink-0" />
        </button>

        {open && (
          <div className="absolute left-0 top-full mt-1.5 z-[1000] w-56 max-h-60 overflow-y-auto bg-[#0d1220] border border-amber-500/30 rounded-2xl shadow-2xl p-1.5 space-y-0.5 custom-scrollbar">
            <button
              type="button"
              onClick={() => {
                onChange('');
                setOpen(false);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[11px] font-bold text-gray-400 hover:bg-white/5 hover:text-white"
            >
              <X size={12} /> Nessuna
            </button>
            {civilizationsData.map((civ) => (
              <button
                key={civ.id}
                type="button"
                onClick={() => {
                  onChange(civ.id);
                  setOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[11px] font-bold text-gray-200 hover:bg-amber-500/15 hover:text-amber-200 text-left"
              >
                <img src={civ.flag} alt={civ.name} className="w-6 h-4 rounded-xs object-cover border border-white/10 shrink-0" />
                <span className="truncate uppercase tracking-wider">{civ.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center p-12 text-slate-400">
        <Loader2 className="animate-spin mr-3 text-amber-400" size={24} />
        Caricamento dashboard Finale Lega Oro...
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-[#060913] text-white rounded-3xl border border-amber-500/20 overflow-hidden shadow-2xl">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 bg-black/50 border-b border-white/10 backdrop-blur-md sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/25 to-yellow-600/10 border border-amber-400/40 flex items-center justify-center text-amber-300 shadow-lg">
            <Trophy size={20} />
          </div>
          <div>
            <h2 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
              Finale Lega Oro — Regia Live
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 flex items-center gap-1">
                <Radio size={11} className="animate-pulse text-emerald-400" />
                Live Sync
              </span>
            </h2>
            <p className="text-[11px] text-gray-400">
              Chrysaor vs Gattoratto • Tutte le modifiche si aggiornano in tempo reale su OBS.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isLiveSyncing ? (
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/15 border border-cyan-400/30 text-cyan-300 text-xs font-bold">
              <Loader2 size={13} className="animate-spin" /> Sync OBS...
            </span>
          ) : showSuccess ? (
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-xs font-bold">
              <CheckCircle2 size={14} /> Salvato Live
            </span>
          ) : null}

          <button
            type="button"
            onClick={handleSwapPlayers}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-black uppercase tracking-wider text-gray-200 transition-all"
            title="Inverti Giocatore Sinistra e Destra"
          >
            <ArrowLeftRight size={14} className="text-amber-400" />
            Inverti P1/P2
          </button>

          {!showResetConfirm ? (
            <button
              type="button"
              onClick={() => setShowResetConfirm(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-600/10 border border-red-500/30 text-red-400 hover:bg-red-600 hover:text-white text-xs font-black uppercase tracking-wider transition-all"
            >
              <RefreshCcw size={14} /> Reset
            </button>
          ) : (
            <div className="flex items-center gap-2 bg-red-600 px-2 py-1 rounded-xl">
              <span className="text-[10px] font-black px-2 uppercase">Confermi?</span>
              <button
                type="button"
                onClick={handleReset}
                className="bg-white text-red-600 px-3 py-1 rounded-lg text-[10px] font-black uppercase"
              >
                SI
              </button>
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="p-1 text-white hover:bg-black/20 rounded-lg"
              >
                <X size={14} />
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => pushState(state, true)}
            disabled={isSaving}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 via-yellow-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50"
          >
            {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Salva
          </button>
        </div>
      </div>

      {/* Main Scrollable Content */}
      <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
        {/* 1. Header Evento & Formato */}
        <div className="bg-[#0a1020] border border-amber-500/20 rounded-2xl p-5 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="text-[10px] font-black text-amber-400 uppercase tracking-widest block mb-1.5">
              Titolo Evento
            </label>
            <input
              type="text"
              value={state.tournamentTitle}
              onChange={(e) => pushState({ ...state, tournamentTitle: e.target.value })}
              className="w-full bg-black/50 border border-white/10 focus:border-amber-400/60 rounded-xl px-3.5 py-2.5 text-sm font-black uppercase text-white outline-none"
              placeholder="FINALE LEGA ORO"
            />
          </div>
          <div>
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">
              Sottotitolo Header
            </label>
            <input
              type="text"
              value={state.stageSubtitle}
              onChange={(e) => pushState({ ...state, stageSubtitle: e.target.value })}
              className="w-full bg-black/50 border border-white/10 focus:border-amber-400/60 rounded-xl px-3.5 py-2.5 text-xs font-bold uppercase text-white outline-none"
              placeholder="AGE OF EMPIRES IV • AOE ITALIA"
            />
          </div>
          <div>
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">
              Etichetta Match
            </label>
            <input
              type="text"
              value={state.dayText}
              onChange={(e) => pushState({ ...state, dayText: e.target.value })}
              className="w-full bg-black/50 border border-white/10 focus:border-amber-400/60 rounded-xl px-3.5 py-2.5 text-xs font-bold uppercase text-white outline-none"
              placeholder="GRAND FINAL"
            />
          </div>
          <div>
            <label className="text-[10px] font-black text-cyan-400 uppercase tracking-widest block mb-1.5">
              Formato Serie (Mappe)
            </label>
            <div className="grid grid-cols-3 gap-1.5 bg-black/50 p-1 rounded-xl border border-white/10">
              {[3, 5, 7].map((bo) => (
                <button
                  key={bo}
                  type="button"
                  onClick={() => changeFormatCount(bo)}
                  className={`py-2 rounded-lg text-xs font-black uppercase transition-all ${
                    state.maps.length === bo
                      ? 'bg-amber-500 text-black shadow-md'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  BO{bo}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 2. Giocatori, Bandiere, Seed, Foto & Skills (1-10) */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {(['p1', 'p2'] as const).map((key, idx) => {
            const player = state[key];
            const isP1 = key === 'p1';
            const accentBorder = isP1 ? 'border-amber-500/30' : 'border-rose-500/30';
            const accentText = isP1 ? 'text-amber-400' : 'text-rose-400';
            const accentRange = isP1 ? 'accent-amber-400' : 'accent-rose-500';
            const fileInputRef = isP1 ? p1PhotoRef : p2PhotoRef;

            return (
              <div
                key={key}
                className={`bg-[#0a1020] border ${accentBorder} rounded-3xl p-6 space-y-6 shadow-xl`}
              >
                {/* Header Card + Score */}
                <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm ${
                        isP1 ? 'bg-amber-500/20 text-amber-300' : 'bg-rose-500/20 text-rose-300'
                      }`}
                    >
                      P{idx + 1}
                    </div>
                    <div>
                      <div className={`text-xs font-black uppercase tracking-widest ${accentText}`}>
                        Giocatore {isP1 ? 'Sinistra' : 'Destra'}
                      </div>
                      <div className="text-[11px] text-gray-400">Profilo, Foto, Seed & Draft Civiltà</div>
                    </div>
                  </div>

                  {/* Score Counter */}
                  <div className="flex items-center gap-1.5 bg-black/60 border border-white/10 rounded-xl p-1">
                    <button
                      type="button"
                      onClick={() =>
                        pushState(
                          { ...state, [key]: { ...player, score: Math.max(0, (player.score || 0) - 1) } },
                          true
                        )
                      }
                      className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white"
                    >
                      <Minus size={14} />
                    </button>
                    <span className={`w-10 text-center text-2xl font-black ${accentText}`}>{player.score}</span>
                    <button
                      type="button"
                      onClick={() =>
                        pushState({ ...state, [key]: { ...player, score: (player.score || 0) + 1 } }, true)
                      }
                      className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>

                {/* Identity & Photo Row */}
                <div className="grid grid-cols-[100px_1fr] gap-4 items-start">
                  {/* Photo Upload */}
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-24 h-24 rounded-2xl bg-black/60 border-2 border-white/15 overflow-hidden flex items-center justify-center relative group">
                      {uploadingPhotoFor === key ? (
                        <Loader2 size={24} className="animate-spin text-amber-400" />
                      ) : player.photoUrl ? (
                        <img src={player.photoUrl} alt={player.name} className="w-full h-full object-cover object-top" />
                      ) : (
                        <User size={34} className="text-gray-600" />
                      )}
                      {player.photoUrl && (
                        <button
                          type="button"
                          onClick={() => pushState({ ...state, [key]: { ...player, photoUrl: '' } }, true)}
                          className="absolute top-1 right-1 w-6 h-6 bg-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Rimuovi foto"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingPhotoFor === key}
                      className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-black uppercase tracking-wider text-gray-300"
                    >
                      <Upload size={11} className="text-amber-400" />
                      Foto
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        handlePhotoUpload(key, e.target.files?.[0]);
                        e.target.value = '';
                      }}
                    />
                  </div>

                  {/* Name, Seed, Flag, Photo URL */}
                  <div className="space-y-3">
                    <div className="grid grid-cols-[1fr_100px] gap-2.5">
                      <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                          Nome Giocatore
                        </label>
                        <input
                          type="text"
                          value={player.name}
                          onChange={(e) => pushState({ ...state, [key]: { ...player, name: e.target.value } })}
                          className="w-full bg-black/50 border border-white/10 focus:border-amber-400/50 rounded-xl px-3.5 py-2 text-sm font-black uppercase text-white outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                          Seed #
                        </label>
                        <input
                          type="text"
                          value={player.seed}
                          onChange={(e) => pushState({ ...state, [key]: { ...player, seed: e.target.value } })}
                          placeholder="1"
                          className="w-full bg-black/50 border border-white/10 focus:border-amber-400/50 rounded-xl px-3 py-2 text-sm font-black text-center text-white outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                          Bandiera Nazione
                        </label>
                        <select
                          value={player.country}
                          onChange={(e) => pushState({ ...state, [key]: { ...player, country: e.target.value } }, true)}
                          className="w-full bg-[#0d1220] border border-white/10 focus:border-amber-400/50 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none"
                        >
                          {COUNTRY_OPTIONS.map((c) => (
                            <option key={c.code} value={c.code}>
                              {c.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                          URL Foto (opzionale)
                        </label>
                        <input
                          type="text"
                          value={player.photoUrl}
                          onChange={(e) => pushState({ ...state, [key]: { ...player, photoUrl: e.target.value } })}
                          placeholder="https://..."
                          className="w-full bg-black/50 border border-white/10 focus:border-amber-400/50 rounded-xl px-3 py-2 text-xs text-gray-200 outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Skills Editor (1 - 10) */}
                <div className="bg-black/40 border border-white/10 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase tracking-widest text-white flex items-center gap-2">
                      <BarChart3 size={14} className={accentText} />
                      Skills Giocatore (1 - 10)
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {SKILL_CONFIG.map((sk) => {
                      const val = player.skills?.[sk.key] ?? 5;
                      return (
                        <div key={sk.key} className="grid grid-cols-[95px_1fr_44px] items-center gap-3">
                          <span className="text-xs font-bold uppercase tracking-wider text-gray-300">
                            {sk.label}
                          </span>
                          <input
                            type="range"
                            min={1}
                            max={10}
                            step={0.5}
                            value={val}
                            onChange={(e) => {
                              const nextVal = parseFloat(e.target.value);
                              pushState({
                                ...state,
                                [key]: {
                                  ...player,
                                  skills: { ...player.skills, [sk.key]: nextVal }
                                }
                              });
                            }}
                            className={`w-full cursor-pointer ${accentRange}`}
                          />
                          <div className="bg-black/60 border border-white/10 rounded-lg py-1 text-center text-xs font-black text-white">
                            {val}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Draft Civs Section */}
                <div className="bg-black/40 border border-white/10 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase tracking-widest text-white flex items-center gap-2">
                      <Sparkles size={14} className={accentText} />
                      Draft Civiltà (clicca un badge per cambiare stato)
                    </span>
                    <span className="text-[10px] text-gray-500 font-bold">
                      {player.draftCivs.length} civ
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2.5">
                    {player.draftCivs.map((entry, cIdx) => {
                      const civ = civilizationsData.find((c) => c.id === entry.civId);
                      const badge = STATUS_BADGE_MAP[entry.status || 'pick'];
                      return (
                        <div
                          key={`${entry.civId}-${cIdx}`}
                          className="relative group flex flex-col items-center gap-1 bg-black/60 border border-white/10 rounded-xl p-1.5"
                        >
                          <div className="w-11 h-7 rounded-md overflow-hidden border border-white/20">
                            {civ && <img src={civ.flag} alt={civ.name} className="w-full h-full object-cover" />}
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const nextIdx = (STATUS_CYCLE.indexOf(entry.status || 'pick') + 1) % STATUS_CYCLE.length;
                              const nextDraft = [...player.draftCivs];
                              nextDraft[cIdx] = { ...entry, status: STATUS_CYCLE[nextIdx] };
                              pushState({ ...state, [key]: { ...player, draftCivs: nextDraft } }, true);
                            }}
                            className={`px-1.5 py-0.5 rounded text-[8px] font-black border ${badge.cls}`}
                            title="Clicca per cambiare tra PICK, GIOCATA, BAN, SNIPE"
                          >
                            {badge.label}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const nextDraft = player.draftCivs.filter((_, i) => i !== cIdx);
                              pushState({ ...state, [key]: { ...player, draftCivs: nextDraft } }, true);
                            }}
                            className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X size={10} />
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  <div className="w-56">
                    <CivSelectCompact
                      value=""
                      label="+ Aggiungi Civ al Draft"
                      onChange={(civId) => {
                        if (!civId) return;
                        pushState(
                          {
                            ...state,
                            [key]: {
                              ...player,
                              draftCivs: [...player.draftCivs, { civId, status: 'pick' }]
                            }
                          },
                          true
                        );
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 3. Importa Draft AoE2CM (Civiltà & Mappe) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-[#0a1020] border border-emerald-500/20 rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2 text-emerald-400">
              <Link2 size={16} />
              <span className="text-xs font-black uppercase tracking-widest">Importa Draft Civiltà (AoE2CM)</span>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={draftCivUrl}
                onChange={(e) => {
                  setDraftCivUrl(e.target.value);
                  setDraftCivStatus(null);
                }}
                placeholder="https://aoe2cm.net/draft/xxxxx"
                className="flex-1 bg-black/50 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-emerald-500/50"
              />
              <button
                type="button"
                onClick={handleDraftCivImport}
                disabled={isDraftCivLoading || autoSyncCiv || !draftCivUrl.trim()}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-800 disabled:text-gray-600 text-xs font-black uppercase tracking-wider"
              >
                {isDraftCivLoading ? 'Carico...' : autoSyncCiv ? 'Sync' : 'Importa'}
              </button>
            </div>
            <label className="flex items-center gap-2 text-[11px] font-bold text-gray-400 cursor-pointer">
              <input
                type="checkbox"
                checked={autoSyncCiv}
                onChange={(e) => setAutoSyncCiv(e.target.checked)}
                className="rounded bg-black/40 border-white/20 text-emerald-500"
              />
              Auto-sync live ogni 5s
            </label>
            {draftCivStatus && (
              <div
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold ${
                  draftCivStatus.type === 'success'
                    ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                    : 'bg-red-500/10 text-red-300 border border-red-500/20'
                }`}
              >
                {draftCivStatus.type === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                <span>{draftCivStatus.message}</span>
              </div>
            )}
          </div>

          <div className="bg-[#0a1020] border border-cyan-500/20 rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2 text-cyan-400">
              <MapIcon size={16} />
              <span className="text-xs font-black uppercase tracking-widest">Importa Draft Mappe (AoE2CM)</span>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={draftMapUrl}
                onChange={(e) => {
                  setDraftMapUrl(e.target.value);
                  setDraftMapStatus(null);
                }}
                placeholder="https://aoe2cm.net/draft/xxxxx"
                className="flex-1 bg-black/50 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-cyan-500/50"
              />
              <button
                type="button"
                onClick={handleDraftMapImport}
                disabled={isDraftMapLoading || autoSyncMap || !draftMapUrl.trim()}
                className="px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-800 disabled:text-gray-600 text-xs font-black uppercase tracking-wider"
              >
                {isDraftMapLoading ? 'Carico...' : autoSyncMap ? 'Sync' : 'Importa'}
              </button>
            </div>
            <label className="flex items-center gap-2 text-[11px] font-bold text-gray-400 cursor-pointer">
              <input
                type="checkbox"
                checked={autoSyncMap}
                onChange={(e) => setAutoSyncMap(e.target.checked)}
                className="rounded bg-black/40 border-white/20 text-cyan-500"
              />
              Auto-sync live ogni 5s
            </label>
            {draftMapStatus && (
              <div
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold ${
                  draftMapStatus.type === 'success'
                    ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/20'
                    : 'bg-red-500/10 text-red-300 border border-red-500/20'
                }`}
              >
                {draftMapStatus.type === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                <span>{draftMapStatus.message}</span>
              </div>
            )}
          </div>
        </div>

        {/* 4. Draft Mappe Best of 5 (Rombi Isometrici) */}
        <div className="bg-[#0a1020] border border-amber-500/20 rounded-3xl p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black text-amber-400 uppercase tracking-widest flex items-center gap-2">
              <MapIcon size={16} />
              Mappe del Match ({state.matchFormat})
            </h4>
            <span className="text-[11px] text-gray-400">
              Visualizzate al centro come rombi isometrici stile EGCTV
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {state.maps.map((m, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-2xl border space-y-3 transition-all ${
                  m.isNext
                    ? 'bg-cyan-500/10 border-cyan-400/50 shadow-lg shadow-cyan-500/10'
                    : 'bg-black/40 border-white/10'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase tracking-widest text-amber-300">
                    Game {idx + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const nextMaps = state.maps.map((item, i) => ({
                        ...item,
                        isNext: i === idx ? !item.isNext : false
                      }));
                      pushState({ ...state, maps: nextMaps }, true);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border transition-all ${
                      m.isNext
                        ? 'bg-cyan-500 text-black border-cyan-300'
                        : 'bg-white/5 text-gray-400 border-white/10 hover:text-white'
                    }`}
                  >
                    {m.isNext ? 'Prossimo Game ✓' : 'Segna Prossimo'}
                  </button>
                </div>

                <select
                  value={m.name}
                  onChange={(e) => {
                    const nextMaps = [...state.maps];
                    nextMaps[idx] = { ...m, name: e.target.value };
                    pushState({ ...state, maps: nextMaps }, true);
                  }}
                  className="w-full bg-[#0d1220] border border-white/10 rounded-xl px-3 py-2 text-xs font-black uppercase tracking-wider text-white outline-none focus:border-amber-400/50"
                >
                  <option value="">Seleziona Mappa...</option>
                  {AOE4_MAPS.map((mapName) => (
                    <option key={mapName} value={mapName}>
                      {mapName}
                    </option>
                  ))}
                </select>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="text-[9px] font-bold text-amber-300/80 uppercase mb-1 truncate">
                      Civ {state.p1.name || 'P1'}
                    </div>
                    <CivSelectCompact
                      value={m.p1Civ}
                      label="Civ P1"
                      onChange={(val) => {
                        const nextMaps = [...state.maps];
                        nextMaps[idx] = { ...m, p1Civ: val };
                        pushState({ ...state, maps: nextMaps }, true);
                      }}
                    />
                  </div>
                  <div>
                    <div className="text-[9px] font-bold text-rose-300/80 uppercase mb-1 truncate">
                      Civ {state.p2.name || 'P2'}
                    </div>
                    <CivSelectCompact
                      value={m.p2Civ}
                      label="Civ P2"
                      onChange={(val) => {
                        const nextMaps = [...state.maps];
                        nextMaps[idx] = { ...m, p2Civ: val };
                        pushState({ ...state, maps: nextMaps }, true);
                      }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      const nextMaps = [...state.maps];
                      nextMaps[idx] = { ...m, winner: m.winner === 1 ? 0 : 1 };
                      pushState({ ...state, maps: nextMaps }, true);
                    }}
                    className={`py-1.5 rounded-lg text-[10px] font-black uppercase truncate px-2 transition-all ${
                      m.winner === 1
                        ? 'bg-amber-500 text-black'
                        : 'bg-white/5 text-gray-400 hover:text-white'
                    }`}
                  >
                    Win {state.p1.name || 'P1'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const nextMaps = [...state.maps];
                      nextMaps[idx] = { ...m, winner: 0 };
                      pushState({ ...state, maps: nextMaps }, true);
                    }}
                    className={`py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${
                      m.winner === 0
                        ? 'bg-white/15 text-white'
                        : 'bg-white/5 text-gray-500 hover:text-white'
                    }`}
                  >
                    Reset Win
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const nextMaps = [...state.maps];
                      nextMaps[idx] = { ...m, winner: m.winner === 2 ? 0 : 2 };
                      pushState({ ...state, maps: nextMaps }, true);
                    }}
                    className={`py-1.5 rounded-lg text-[10px] font-black uppercase truncate px-2 transition-all ${
                      m.winner === 2
                        ? 'bg-rose-500 text-white'
                        : 'bg-white/5 text-gray-400 hover:text-white'
                    }`}
                  >
                    Win {state.p2.name || 'P2'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 5. Caster (In basso a sinistra), Timer & Logo AoE Italia (In basso a destra) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-8">
          {/* Singolo Caster */}
          <div className="bg-[#0a1020] border border-white/10 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-widest text-amber-400 flex items-center gap-2">
                <Tv size={15} /> Finestra Caster (Basso SX)
              </span>
              <button
                type="button"
                onClick={() => {
                  const caster = state.casters[0] || { name: '', active: false };
                  pushState({ ...state, casters: [{ ...caster, active: !caster.active }] }, true);
                }}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase flex items-center gap-1 border ${
                  state.casters[0]?.active
                    ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-300'
                    : 'bg-white/5 border-white/10 text-gray-500'
                }`}
              >
                {state.casters[0]?.active ? <Eye size={12} /> : <EyeOff size={12} />}
                {state.casters[0]?.active ? 'Attiva' : 'Nascosta'}
              </button>
            </div>
            <input
              type="text"
              value={state.casters[0]?.name || ''}
              onChange={(e) => {
                const caster = state.casters[0] || { name: '', active: true };
                pushState({ ...state, casters: [{ ...caster, name: e.target.value }] });
              }}
              placeholder="Nome Caster (es. Marcolino)"
              className="w-full bg-black/50 border border-white/10 focus:border-amber-400/50 rounded-xl px-4 py-2.5 text-sm font-black uppercase text-white outline-none"
            />
          </div>

          {/* Timer */}
          <div className="bg-[#0a1020] border border-white/10 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-widest text-cyan-400 flex items-center gap-2">
                <TimerIcon size={15} /> Timer Pre-Partita
              </span>
              <button
                type="button"
                onClick={() =>
                  pushState(
                    {
                      ...state,
                      timer: { ...state.timer, active: !state.timer.active, timestamp: Date.now() }
                    },
                    true
                  )
                }
                className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase border ${
                  state.timer.active
                    ? 'bg-cyan-500/20 border-cyan-400/40 text-cyan-300'
                    : 'bg-white/5 border-white/10 text-gray-500'
                }`}
              >
                {state.timer.active ? 'Attivo' : 'Spento'}
              </button>
            </div>
            <div className="flex items-center justify-center gap-3">
              <div className="flex items-center bg-black/60 border border-white/10 rounded-xl p-1">
                <button
                  type="button"
                  onClick={() =>
                    pushState({
                      ...state,
                      timer: { ...state.timer, min: Math.max(0, state.timer.min - 1), timestamp: Date.now() }
                    })
                  }
                  className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white"
                >
                  <Minus size={14} />
                </button>
                <span className="w-10 text-center font-black text-base">{String(state.timer.min).padStart(2, '0')}</span>
                <button
                  type="button"
                  onClick={() =>
                    pushState({
                      ...state,
                      timer: { ...state.timer, min: state.timer.min + 1, timestamp: Date.now() }
                    })
                  }
                  className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white"
                >
                  <Plus size={14} />
                </button>
              </div>
              <span className="font-black text-gray-500">:</span>
              <div className="flex items-center bg-black/60 border border-white/10 rounded-xl p-1">
                <button
                  type="button"
                  onClick={() =>
                    pushState({
                      ...state,
                      timer: { ...state.timer, sec: Math.max(0, state.timer.sec - 5), timestamp: Date.now() }
                    })
                  }
                  className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white"
                >
                  <Minus size={14} />
                </button>
                <span className="w-10 text-center font-black text-base">{String(state.timer.sec).padStart(2, '0')}</span>
                <button
                  type="button"
                  onClick={() =>
                    pushState({
                      ...state,
                      timer: { ...state.timer, sec: Math.min(59, state.timer.sec + 5), timestamp: Date.now() }
                    })
                  }
                  className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* Logo AoE Italia (Basso DX) */}
          <div className="bg-[#0a1020] border border-white/10 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-widest text-amber-400">
                Logo AoE Italia (Basso DX)
              </span>
              <button
                type="button"
                onClick={() => pushState({ ...state, showLogo: state.showLogo === false ? true : false }, true)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase flex items-center gap-1 border ${
                  state.showLogo !== false
                    ? 'bg-amber-500/20 border-amber-400/40 text-amber-300'
                    : 'bg-white/5 border-white/10 text-gray-500'
                }`}
              >
                {state.showLogo !== false ? <Eye size={12} /> : <EyeOff size={12} />}
                {state.showLogo !== false ? 'Visibile' : 'Nascosto'}
              </button>
            </div>
            <input
              type="text"
              value={state.minimapBrandTitle}
              onChange={(e) => pushState({ ...state, minimapBrandTitle: e.target.value })}
              placeholder="AOE ITALIA • LEGA ORO"
              className="w-full bg-black/50 border border-white/10 focus:border-amber-400/50 rounded-xl px-4 py-2.5 text-xs font-black uppercase text-white outline-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
