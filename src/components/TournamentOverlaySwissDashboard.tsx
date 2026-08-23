/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useRef } from 'react';
import { 
  Save, 
  Trophy, 
  RefreshCcw, 
  Plus, 
  Trash2, 
  ChevronDown, 
  Link2, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  Layers, 
  ArrowUpDown, 
  Calculator,
  Copy,
  Check,
  X
} from 'lucide-react';
import { overlayService } from '../services/overlayService';
import { fetchTournament, fetchPhaseGroups, fetchPhaseGroupSets } from '../services/startgg';
import type { StartGGTournament } from '../services/startgg';

interface TournamentOverlaySwissDashboardProps {
  onError: (msg: string) => void;
  onActivePathChange?: (path: string) => void;
}

export interface SwissStandingPlayer {
  id: string;
  name: string;
  wins: number;
  losses: number;
  points: number;
  tieBreak?: number;
}

export interface SwissMatchItem {
  id: string;
  p1: { name: string; civId?: string; score: number };
  p2: { name: string; civId?: string; score: number };
  winner: 0 | 1 | 2; // 0 none, 1 p1, 2 p2
}

const CIV_LIST = [
  { id: 'abbasid', name: 'Abbasidi', flag: '/civs/Abbasid Dynasty.webp' },
  { id: 'ayyubids', name: 'Ayyubidi', flag: '/civs/Ayyubids.webp' },
  { id: 'byzantines', name: 'Bizantini', flag: '/civs/Byzantines.webp' },
  { id: 'chinese', name: 'Cinesi', flag: '/civs/Chinese.webp' },
  { id: 'delhi', name: 'Sultanato di Delhi', flag: '/civs/Delhi Sultanate.webp' },
  { id: 'english', name: 'Inglesi', flag: '/civs/English.webp' },
  { id: 'french', name: 'Francesi', flag: '/civs/French.webp' },
  { id: 'goldenhorde', name: 'Orda d\'Oro', flag: '/civs/Golden Horde.webp' },
  { id: 'hre', name: 'Sacro Romano Impero (HRE)', flag: '/civs/Holy Roman Empire.webp' },
  { id: 'japanese', name: 'Giapponesi', flag: '/civs/Japanese.webp' },
  { id: 'jeannedarc', name: 'Jeanne d\'Arc', flag: '/civs/jeannedarc.webp' },
  { id: 'jin-dynasty', name: 'Dinastia Jin', flag: '/civs/Jin Dynasty.webp' },
  { id: 'lancaster', name: 'Casato di Lancaster', flag: '/civs/House of Lancaster.webp' },
  { id: 'macedonian', name: 'Dinastia Macedone', flag: '/civs/Macedonian Dynasty.webp' },
  { id: 'malians', name: 'Maliesi', flag: '/civs/Malians.webp' },
  { id: 'mongols', name: 'Mongoli', flag: '/civs/Mongols.webp' },
  { id: 'orderofthedragon', name: 'Ordine del Dragone', flag: '/civs/Order of the Dragon.webp' },
  { id: 'ottomans', name: 'Ottomani', flag: '/civs/Ottomans.webp' },
  { id: 'rus', name: 'Rus', flag: '/civs/Rus.webp' },
  { id: 'sengoku', name: 'Sengoku Daimyo', flag: '/civs/Sengoku Daimyo.webp' },
  { id: 'templar', name: 'Cavalieri Templari', flag: '/civs/Knights Templar.webp' },
  { id: 'tughlaq', name: 'Dinastia Tughlaq', flag: '/civs/Tughlaq Dynasty.webp' },
  { id: 'zhuxi', name: 'Eredità di Zhu Xi', flag: '/civs/Zhu Xis Legacy.webp' },
];

function CivDropdown({ value, onChange }: { value: string; onChange: (civId: string) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedCiv = CIV_LIST.find(c => c.id.toLowerCase() === (value || '').toLowerCase());

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div className="relative w-44 shrink-0" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-2 bg-black/60 hover:bg-black/80 border border-white/10 hover:border-cyan-500/40 rounded-xl px-2.5 py-1.5 text-xs text-white transition-all shadow-sm focus:outline-none"
      >
        <div className="flex items-center gap-2 min-w-0">
          {selectedCiv ? (
            <>
              <img 
                src={selectedCiv.flag} 
                alt={selectedCiv.name} 
                className="w-5 h-3.5 object-cover rounded-xs border border-white/20 shrink-0" 
              />
              <span className="truncate font-semibold text-gray-200">{selectedCiv.name}</span>
            </>
          ) : (
            <span className="text-gray-500 font-medium">Scegli Civ...</span>
          )}
        </div>
        <ChevronDown size={14} className={`text-cyan-400 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1.5 w-52 max-h-60 overflow-y-auto bg-[#0d1322] border border-cyan-500/30 rounded-2xl shadow-2xl z-50 p-1.5 space-y-1 custom-scrollbar animate-in fade-in zoom-in-95 duration-150">
          <button
            type="button"
            onClick={() => {
              onChange('');
              setIsOpen(false);
            }}
            className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              !value ? 'bg-cyan-500/20 text-cyan-300' : 'text-gray-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <X size={12} className="text-gray-500" />
            <span>Nessuna Civ</span>
          </button>

          {CIV_LIST.map((civ) => {
            const isSelected = civ.id.toLowerCase() === (value || '').toLowerCase();
            return (
              <button
                key={civ.id}
                type="button"
                onClick={() => {
                  onChange(civ.id);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  isSelected 
                    ? 'bg-gradient-to-r from-cyan-500/20 to-transparent border border-cyan-500/40 text-cyan-300' 
                    : 'text-gray-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <img src={civ.flag} alt={civ.name} className="w-5 h-3.5 object-cover rounded-xs border border-white/10 shrink-0" />
                  <span className="truncate">{civ.name}</span>
                </div>
                {isSelected && <Check size={12} className="text-cyan-400 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

const DEFAULT_STATE = {
  activeView: 'standings' as 'standings' | 'rounds',
  tournamentTitle: 'TORNEO AOE4 SVIZZERA',
  dayNumber: 1,
  totalRounds: 4,
  goldSlotsCount: 2,
  silverSlotsCount: 2,
  standings: [
    { id: '1', name: 'Giocatore 1', wins: 0, losses: 0, points: 0, tieBreak: 0 },
    { id: '2', name: 'Giocatore 2', wins: 0, losses: 0, points: 0, tieBreak: 0 },
    { id: '3', name: 'Giocatore 3', wins: 0, losses: 0, points: 0, tieBreak: 0 },
    { id: '4', name: 'Giocatore 4', wins: 0, losses: 0, points: 0, tieBreak: 0 },
    { id: '5', name: 'Giocatore 5', wins: 0, losses: 0, points: 0, tieBreak: 0 },
    { id: '6', name: 'Giocatore 6', wins: 0, losses: 0, points: 0, tieBreak: 0 },
    { id: '7', name: 'Giocatore 7', wins: 0, losses: 0, points: 0, tieBreak: 0 },
    { id: '8', name: 'Giocatore 8', wins: 0, losses: 0, points: 0, tieBreak: 0 }
  ] as SwissStandingPlayer[],
  rounds: {
    1: [
      { id: 'm1_1', p1: { name: 'Giocatore 1', civId: 'french', score: 0 }, p2: { name: 'Giocatore 2', civId: 'english', score: 0 }, winner: 0 },
      { id: 'm1_2', p1: { name: 'Giocatore 3', civId: 'hre', score: 0 }, p2: { name: 'Giocatore 4', civId: 'byzantines', score: 0 }, winner: 0 },
      { id: 'm1_3', p1: { name: 'Giocatore 5', civId: 'rus', score: 0 }, p2: { name: 'Giocatore 6', civId: 'mongols', score: 0 }, winner: 0 },
      { id: 'm1_4', p1: { name: 'Giocatore 7', civId: 'ottomans', score: 0 }, p2: { name: 'Giocatore 8', civId: 'chinese', score: 0 }, winner: 0 }
    ],
    2: [] as SwissMatchItem[],
    3: [] as SwissMatchItem[],
    4: [] as SwissMatchItem[]
  } as Record<number, SwissMatchItem[]>,
  startgg: {
    slug: '',
    eventId: '',
    phaseId: '',
    autoSync: false,
    syncInterval: 20,
    lastSyncedAt: ''
  }
};

const OVERLAY_ID = 'tournament-swiss';

export function TournamentOverlaySwissDashboard({ onError, onActivePathChange }: TournamentOverlaySwissDashboardProps) {
  const [state, setState] = useState(DEFAULT_STATE);
  const [activeTab, setActiveTab] = useState<'standings' | 'rounds' | 'startgg'>('standings');
  const [selectedRound, setSelectedRound] = useState<number>(1);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Sync active path with parent modal
  useEffect(() => {
    if (!onActivePathChange) return;
    if (activeTab === 'rounds') {
      onActivePathChange('/overlays/tournament-swiss/index.html?view=rounds');
    } else {
      onActivePathChange('/overlays/tournament-swiss/index.html?view=standings');
    }
  }, [activeTab, onActivePathChange]);

  const handleTabSwitch = (newTab: 'standings' | 'rounds' | 'startgg') => {
    setActiveTab(newTab);
    if (newTab === 'rounds') {
      const updated = { ...state, activeView: 'rounds' as const };
      setState(updated);
      handleSave(updated);
      onActivePathChange?.('/overlays/tournament-swiss/index.html?view=rounds');
    } else if (newTab === 'standings') {
      const updated = { ...state, activeView: 'standings' as const };
      setState(updated);
      handleSave(updated);
      onActivePathChange?.('/overlays/tournament-swiss/index.html?view=standings');
    }
  };

  // Start.gg states
  const [startggSlugInput, setStartggSlugInput] = useState('');
  const [startggLoading, setStartggLoading] = useState(false);
  const [startggTournamentData, setStartggTournamentData] = useState<StartGGTournament | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [selectedPhaseId, setSelectedPhaseId] = useState<string>('');
  const [startggStatus, setStartggStatus] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [isAutoSyncing, setIsAutoSyncing] = useState(false);

  // Load initial state
  useEffect(() => {
    overlayService.getOverlayState(OVERLAY_ID)
      .then(savedState => {
        if (savedState) {
          setState({
            ...DEFAULT_STATE,
            ...savedState,
            startgg: {
              ...DEFAULT_STATE.startgg,
              ...(savedState.startgg || {})
            }
          });
          if (savedState.startgg?.slug) {
            setStartggSlugInput(savedState.startgg.slug);
          }
          if (savedState.startgg?.eventId) {
            setSelectedEventId(savedState.startgg.eventId);
          }
          if (savedState.startgg?.phaseId) {
            setSelectedPhaseId(savedState.startgg.phaseId);
          }
          if (savedState.startgg?.autoSync) {
            setIsAutoSyncing(true);
          }
        }
      })
      .catch(err => {
        console.error('Error fetching Swiss overlay state:', err);
        onError('Impossibile caricare i dati dell\'overlay Svizzera.');
      });
  }, [onError]);

  // Save State
  const handleSave = async (customState?: typeof state) => {
    const stateToSave = customState || state;
    setIsSaving(true);
    try {
      await overlayService.updateOverlayState(OVERLAY_ID, stateToSave);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2500);
    } catch (err) {
      console.error('Error saving Swiss overlay state:', err);
      onError('Errore durante il salvataggio su Supabase.');
    } finally {
      setIsSaving(false);
    }
  };

  // --- TAB 1: STANDINGS HELPERS ---
  const handleAddPlayer = () => {
    const newPlayer: SwissStandingPlayer = {
      id: `p_${Date.now()}`,
      name: `Giocatore ${state.standings.length + 1}`,
      wins: 0,
      losses: 0,
      points: 0,
      tieBreak: 0
    };
    const newStandings = [...state.standings, newPlayer];
    const newState = { ...state, standings: newStandings };
    setState(newState);
    handleSave(newState);
  };

  const handleRemovePlayer = (index: number) => {
    const newStandings = state.standings.filter((_, i) => i !== index);
    const newState = { ...state, standings: newStandings };
    setState(newState);
    handleSave(newState);
  };

  const handleUpdatePlayer = (index: number, field: keyof SwissStandingPlayer, value: any) => {
    const newStandings = [...state.standings];
    newStandings[index] = { ...newStandings[index], [field]: value };
    const newState = { ...state, standings: newStandings };
    setState(newState);
  };

  const handleSortStandings = () => {
    const sorted = [...state.standings].sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.wins !== a.wins) return b.wins - a.wins;
      if (a.losses !== b.losses) return a.losses - b.losses;
      return (b.tieBreak || 0) - (a.tieBreak || 0);
    });
    const newState = { ...state, standings: sorted };
    setState(newState);
    handleSave(newState);
  };

  // --- TAB 2: ROUNDS & MATCHES HELPERS ---
  const handleAddMatch = (roundNum: number) => {
    const currentMatches = state.rounds[roundNum] || [];
    const newMatch: SwissMatchItem = {
      id: `m_${roundNum}_${Date.now()}`,
      p1: { name: '', civId: '', score: 0 },
      p2: { name: '', civId: '', score: 0 },
      winner: 0
    };
    const newState = {
      ...state,
      rounds: {
        ...state.rounds,
        [roundNum]: [...currentMatches, newMatch]
      }
    };
    setState(newState);
    handleSave(newState);
  };

  const handleRemoveMatch = (roundNum: number, matchIndex: number) => {
    const currentMatches = state.rounds[roundNum] || [];
    const updated = currentMatches.filter((_, i) => i !== matchIndex);
    const newState = {
      ...state,
      rounds: {
        ...state.rounds,
        [roundNum]: updated
      }
    };
    setState(newState);
    handleSave(newState);
  };

  const handleUpdateMatch = (roundNum: number, matchIndex: number, updatedFields: Partial<SwissMatchItem>) => {
    const currentMatches = [...(state.rounds[roundNum] || [])];
    currentMatches[matchIndex] = { ...currentMatches[matchIndex], ...updatedFields };
    const newState = {
      ...state,
      rounds: {
        ...state.rounds,
        [roundNum]: currentMatches
      }
    };
    setState(newState);
  };

  const handleSetWinner = (roundNum: number, matchIndex: number, winner: 0 | 1 | 2) => {
    const currentMatches = [...(state.rounds[roundNum] || [])];
    const match = { ...currentMatches[matchIndex] };
    match.winner = winner;
    match.p1 = { ...match.p1, score: winner === 1 ? 1 : 0 };
    match.p2 = { ...match.p2, score: winner === 2 ? 1 : 0 };
    currentMatches[matchIndex] = match;

    const newState = {
      ...state,
      rounds: {
        ...state.rounds,
        [roundNum]: currentMatches
      }
    };
    setState(newState);
    handleSave(newState);
  };

  const handleAutoCalculateStandings = () => {
    const playerStatsMap: Record<string, { name: string; wins: number; losses: number; points: number }> = {};

    state.standings.forEach(p => {
      const cleanName = p.name.trim().toLowerCase();
      if (cleanName) {
        playerStatsMap[cleanName] = {
          name: p.name.trim(),
          wins: 0,
          losses: 0,
          points: 0
        };
      }
    });

    for (let r = 1; r <= 4; r++) {
      const matches = state.rounds[r] || [];
      matches.forEach(m => {
        const p1Name = m.p1?.name?.trim();
        const p2Name = m.p2?.name?.trim();

        if (p1Name) {
          const k1 = p1Name.toLowerCase();
          if (!playerStatsMap[k1]) {
            playerStatsMap[k1] = { name: p1Name, wins: 0, losses: 0, points: 0 };
          }
        }

        if (p2Name) {
          const k2 = p2Name.toLowerCase();
          if (!playerStatsMap[k2]) {
            playerStatsMap[k2] = { name: p2Name, wins: 0, losses: 0, points: 0 };
          }
        }

        if (m.winner === 1 && p1Name && p2Name) {
          playerStatsMap[p1Name.toLowerCase()].wins += 1;
          playerStatsMap[p1Name.toLowerCase()].points += 1;
          playerStatsMap[p2Name.toLowerCase()].losses += 1;
        } else if (m.winner === 2 && p1Name && p2Name) {
          playerStatsMap[p2Name.toLowerCase()].wins += 1;
          playerStatsMap[p2Name.toLowerCase()].points += 1;
          playerStatsMap[p1Name.toLowerCase()].losses += 1;
        }
      });
    }

    const calculatedStandings: SwissStandingPlayer[] = Object.values(playerStatsMap)
      .map((p, idx) => ({
        id: `p_${idx + 1}`,
        name: p.name,
        wins: p.wins,
        losses: p.losses,
        points: p.points,
        tieBreak: 0
      }))
      .sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.wins !== a.wins) return b.wins - a.wins;
        return a.losses - b.losses;
      });

    const newState = { ...state, standings: calculatedStandings };
    setState(newState);
    handleSave(newState);
  };

  // --- TAB 3: START.GG INTEGRATION ---
  const handleFetchStartggTournament = async () => {
    if (!startggSlugInput.trim()) {
      setStartggStatus({ type: 'error', message: 'Inserisci un URL o slug di Start.gg valido.' });
      return;
    }

    setStartggLoading(true);
    setStartggStatus(null);

    try {
      let cleanSlug = startggSlugInput.trim();
      if (cleanSlug.includes('start.gg/')) {
        const parts = cleanSlug.split('start.gg/');
        const sub = parts[1].split('/')[1] ? `${parts[1].split('/')[0]}/${parts[1].split('/')[1]}` : parts[1];
        cleanSlug = sub.replace(/^tournament\//, '');
      }

      const tournament = await fetchTournament(cleanSlug);
      if (!tournament) {
        setStartggStatus({ type: 'error', message: 'Nessun torneo trovato con questo slug/link.' });
        return;
      }

      setStartggTournamentData(tournament);
      setStartggStatus({ 
        type: 'success', 
        message: `Torneo trovato: "${tournament.name}". Seleziona l'evento e la fase qui sotto.` 
      });

      if (tournament.events && tournament.events.length > 0) {
        setSelectedEventId(tournament.events[0].id);
        if (tournament.events[0].phases && tournament.events[0].phases.length > 0) {
          setSelectedPhaseId(tournament.events[0].phases[0].id);
        }
      }
    } catch (err: any) {
      console.error('Error fetching start.gg:', err);
      setStartggStatus({ type: 'error', message: err.message || 'Errore di connessione con start.gg' });
    } finally {
      setStartggLoading(false);
    }
  };

  const handleSyncStartggNow = async () => {
    if (!selectedPhaseId) {
      setStartggStatus({ type: 'error', message: 'Seleziona prima una fase del torneo.' });
      return;
    }

    setStartggLoading(true);
    try {
      const groups = await fetchPhaseGroups(selectedPhaseId);
      if (groups.length === 0) {
        setStartggStatus({ type: 'error', message: 'Nessun gruppo o girone trovato in questa fase.' });
        return;
      }

      const allSetsArrays = await Promise.all(
        groups.map(g => fetchPhaseGroupSets(g.id))
      );
      const allSets = allSetsArrays.flat();

      if (allSets.length === 0) {
        setStartggStatus({ type: 'info', message: 'Fase trovata ma nessun match generato ancora su Start.gg.' });
        return;
      }

      const parsedRounds: Record<number, SwissMatchItem[]> = { 1: [], 2: [], 3: [], 4: [] };
      const playerStats: Record<string, { name: string; wins: number; losses: number; points: number }> = {};

      allSets.forEach(set => {
        const roundNum = Math.min(Math.max(Math.abs(set.round || 1), 1), 4);

        const slot1 = set.slots?.[0];
        const slot2 = set.slots?.[1];

        const p1Name = slot1?.entrant?.name || '--';
        const p2Name = slot2?.entrant?.name || '--';

        const p1Score = slot1?.standing?.stats?.score?.value ?? 0;
        const p2Score = slot2?.standing?.stats?.score?.value ?? 0;

        let winner: 0 | 1 | 2 = 0;
        if (set.winnerId) {
          if (String(slot1?.entrant?.id) === String(set.winnerId)) winner = 1;
          else if (String(slot2?.entrant?.id) === String(set.winnerId)) winner = 2;
        } else if (p1Score > p2Score) {
          winner = 1;
        } else if (p2Score > p1Score) {
          winner = 2;
        }

        parsedRounds[roundNum].push({
          id: set.id,
          p1: { name: p1Name, civId: '', score: p1Score },
          p2: { name: p2Name, civId: '', score: p2Score },
          winner
        });

        [p1Name, p2Name].forEach(name => {
          if (name && name !== '--' && !playerStats[name.toLowerCase()]) {
            playerStats[name.toLowerCase()] = { name, wins: 0, losses: 0, points: 0 };
          }
        });

        if (winner === 1 && p1Name !== '--') {
          playerStats[p1Name.toLowerCase()].wins += 1;
          playerStats[p1Name.toLowerCase()].points += 1;
          if (p2Name !== '--') playerStats[p2Name.toLowerCase()].losses += 1;
        } else if (winner === 2 && p2Name !== '--') {
          playerStats[p2Name.toLowerCase()].wins += 1;
          playerStats[p2Name.toLowerCase()].points += 1;
          if (p1Name !== '--') playerStats[p1Name.toLowerCase()].losses += 1;
        }
      });

      const syncedStandings: SwissStandingPlayer[] = Object.values(playerStats)
        .map((p, i) => ({
          id: `startgg_${i + 1}`,
          name: p.name,
          wins: p.wins,
          losses: p.losses,
          points: p.points,
          tieBreak: 0
        }))
        .sort((a, b) => {
          if (b.points !== a.points) return b.points - a.points;
          if (b.wins !== a.wins) return b.wins - a.wins;
          return a.losses - b.losses;
        });

      const updatedState = {
        ...state,
        standings: syncedStandings.length > 0 ? syncedStandings : state.standings,
        rounds: parsedRounds,
        startgg: {
          slug: startggSlugInput.trim(),
          eventId: selectedEventId,
          phaseId: selectedPhaseId,
          autoSync: isAutoSyncing,
          syncInterval: 20,
          lastSyncedAt: new Date().toLocaleTimeString()
        }
      };

      setState(updatedState);
      await handleSave(updatedState);

      setStartggStatus({
        type: 'success',
        message: `Sincronizzazione completata! ${allSets.length} match importati.`
      });
    } catch (err: any) {
      console.error('Error syncing start.gg:', err);
      setStartggStatus({ type: 'error', message: err.message || 'Errore durante l\'import da Start.gg.' });
    } finally {
      setStartggLoading(false);
    }
  };

  // Auto-Sync
  useEffect(() => {
    if (!isAutoSyncing || !selectedPhaseId) return;
    const interval = setInterval(() => {
      handleSyncStartggNow();
    }, 20000);
    return () => clearInterval(interval);
  }, [isAutoSyncing, selectedPhaseId]);

  const copyUrl = (path: string) => {
    const fullUrl = `${window.location.origin}${path}`;
    navigator.clipboard.writeText(fullUrl);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-[#080c14] text-white rounded-2xl overflow-hidden border border-cyan-500/20 shadow-2xl">
      {/* Top Header Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 bg-gradient-to-r from-[#0d1424] via-[#090d18] to-[#0d1424] border-b border-white/10">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-cyan-500/20 to-slate-800 border border-cyan-400/40 flex items-center justify-center shadow-lg shadow-cyan-500/10">
            <Trophy className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h2 className="text-lg font-black uppercase tracking-wider text-white flex items-center gap-2.5">
              Dashboard Svizzera 4 Turni
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-cyan-500/15 border border-cyan-400/30 text-cyan-300">
                BO1
              </span>
            </h2>
            <p className="text-[11px] text-slate-400 font-medium">
              Gestione Classifica (Top 2 Oro, Top 3-4 Argento) & Tabellone Turni Bo1
            </p>
          </div>
        </div>

        {/* Header Title & Day Controls */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-xl px-3 py-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Titolo:</span>
            <input
              type="text"
              value={state.tournamentTitle || ''}
              onChange={(e) => setState({ ...state, tournamentTitle: e.target.value })}
              placeholder="TORNEO AOE4 SVIZZERA"
              className="bg-transparent text-xs font-black text-white focus:outline-none w-52 placeholder-slate-600 truncate"
            />
          </div>

          <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-xl px-3 py-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Giornata:</span>
            <select
              value={state.dayNumber || 1}
              onChange={(e) => setState({ ...state, dayNumber: parseInt(e.target.value) || 1 })}
              className="bg-transparent text-xs font-black text-cyan-300 focus:outline-none cursor-pointer"
            >
              <option value={1} className="bg-[#0b0f19] text-white">Giornata 1</option>
              <option value={2} className="bg-[#0b0f19] text-white">Giornata 2</option>
              <option value={3} className="bg-[#0b0f19] text-white">Giornata 3</option>
              <option value={4} className="bg-[#0b0f19] text-white">Giornata 4</option>
            </select>
          </div>

          {showSuccess && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/15 border border-cyan-400/30 text-cyan-300 text-xs font-bold animate-in fade-in">
              <CheckCircle2 size={15} /> Salvato!
            </div>
          )}

          <button
            onClick={() => handleSave()}
            disabled={isSaving}
            className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-cyan-500/20 active:scale-95 disabled:opacity-50"
          >
            {isSaving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            Salva
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center px-6 border-b border-white/10 bg-[#060910] gap-2 overflow-x-auto">
        <button
          onClick={() => handleTabSwitch('standings')}
          className={`flex items-center gap-2 px-5 py-3.5 border-b-2 text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${
            activeTab === 'standings'
              ? 'border-cyan-400 text-cyan-300 bg-cyan-500/5'
              : 'border-transparent text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Trophy size={15} />
          1. Classifica (Schermata A)
        </button>

        <button
          onClick={() => handleTabSwitch('rounds')}
          className={`flex items-center gap-2 px-5 py-3.5 border-b-2 text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${
            activeTab === 'rounds'
              ? 'border-cyan-400 text-cyan-300 bg-cyan-500/5'
              : 'border-transparent text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Layers size={15} />
          2. Turni & Match (Schermata B)
        </button>

        <button
          onClick={() => handleTabSwitch('startgg')}
          className={`flex items-center gap-2 px-5 py-3.5 border-b-2 text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${
            activeTab === 'startgg'
              ? 'border-cyan-400 text-cyan-300 bg-cyan-500/5'
              : 'border-transparent text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Link2 size={15} />
          3. Sincronizzazione Start.gg
          {isAutoSyncing && (
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
          )}
        </button>
      </div>

      {/* Main Tab Content */}
      <div className="flex-1 p-6 overflow-y-auto bg-[#050810] custom-scrollbar">
        {/* =========================================================================
            TAB 1: CLASSIFICA (STANDINGS)
        ========================================================================== */}
        {activeTab === 'standings' && (
          <div className="space-y-5 max-w-6xl mx-auto">
            {/* Quick OBS Link Banner */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-gradient-to-r from-cyan-950/30 via-slate-900/40 to-cyan-950/30 border border-cyan-500/25 shadow-lg">
              <div className="flex items-center gap-2.5">
                <span className="px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 text-[10px] font-black uppercase tracking-wider">
                  Link OBS Schermata A
                </span>
                <span className="text-xs text-slate-300 font-mono">
                  /overlays/tournament-swiss/index.html?view=standings
                </span>
              </div>
              <button
                onClick={() => copyUrl('/overlays/tournament-swiss/index.html?view=standings')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-300 text-xs font-black rounded-xl transition-all"
              >
                <Copy size={13} /> Copia Link Classifica
              </button>
            </div>

            {/* Actions Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/40 border border-white/10">
              <div className="flex items-center gap-3">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">Qualificati:</span>
                <span className="text-xs font-black text-slate-200 px-3 py-1 rounded-xl bg-slate-700/30 border border-slate-500/40 shadow-sm">
                  Top 2 👑 LEGA ORO
                </span>
                <span className="text-xs font-black text-cyan-300 px-3 py-1 rounded-xl bg-cyan-950/30 border border-cyan-500/40 shadow-sm">
                  3° e 4° 🛡️ LEGA ARGENTO
                </span>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  onClick={handleAutoCalculateStandings}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-400/30 text-cyan-300 font-black text-xs rounded-xl transition-all"
                  title="Calcola vittorie e punti leggendo tutti i match dei 4 turni"
                >
                  <Calculator size={13} />
                  Calcola da Match
                </button>

                <button
                  onClick={handleSortStandings}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-white/5 hover:bg-white/10 border border-white/15 text-slate-200 font-black text-xs rounded-xl transition-all"
                  title="Ordina per Punti e Vittorie"
                >
                  <ArrowUpDown size={13} />
                  Ordina
                </button>

                <button
                  onClick={handleAddPlayer}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white font-black text-xs rounded-xl transition-all shadow-md"
                >
                  <Plus size={13} />
                  Aggiungi Player
                </button>
              </div>
            </div>

            {/* Standings Table (Clean without Civ) */}
            <div className="border border-white/10 rounded-2xl overflow-hidden bg-black/40 shadow-2xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/10 bg-white/5 text-[11px] font-black uppercase tracking-wider text-slate-400">
                    <th className="py-3 px-4 w-16 text-center">Pos</th>
                    <th className="py-3 px-4">Nome Giocatore</th>
                    <th className="py-3 px-4 w-28 text-center">Vittorie (W)</th>
                    <th className="py-3 px-4 w-28 text-center">Sconfitte (L)</th>
                    <th className="py-3 px-4 w-28 text-center">Punti</th>
                    <th className="py-3 px-4 w-32 text-center">Tie-Break</th>
                    <th className="py-3 px-4 w-40 text-center">Destinazione</th>
                    <th className="py-3 px-4 w-16 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {state.standings.map((player, idx) => {
                    const rank = idx + 1;
                    const isGold = rank <= 2;
                    const isSilver = rank > 2 && rank <= 4;

                    return (
                      <tr 
                        key={player.id || idx}
                        className={`hover:bg-white/5 transition-colors ${
                          isGold ? 'bg-slate-800/20' : isSilver ? 'bg-cyan-950/15' : ''
                        }`}
                      >
                        {/* Pos */}
                        <td className="py-3 px-4 text-center">
                          <div className={`w-8 h-8 rounded-xl mx-auto flex items-center justify-center font-black text-xs ${
                            isGold 
                              ? 'bg-gradient-to-br from-slate-200 to-slate-400 text-black font-black shadow-md shadow-slate-400/20' 
                              : isSilver 
                              ? 'bg-gradient-to-br from-cyan-400 to-blue-500 text-black font-black shadow-md shadow-cyan-500/20' 
                              : 'bg-white/5 text-slate-400 border border-white/10'
                          }`}>
                            #{rank}
                          </div>
                        </td>

                        {/* Name */}
                        <td className="py-3 px-4">
                          <input
                            type="text"
                            value={player.name}
                            onChange={(e) => handleUpdatePlayer(idx, 'name', e.target.value)}
                            placeholder="Nome player"
                            className="w-full bg-black/40 border border-white/10 focus:border-cyan-400 rounded-xl px-3.5 py-2 text-sm font-bold text-white placeholder-slate-600 focus:outline-none transition-all"
                          />
                        </td>

                        {/* Wins */}
                        <td className="py-3 px-4 text-center">
                          <input
                            type="number"
                            min="0"
                            value={player.wins}
                            onChange={(e) => handleUpdatePlayer(idx, 'wins', parseInt(e.target.value) || 0)}
                            className="w-20 mx-auto text-center bg-black/40 border border-white/10 focus:border-emerald-400 rounded-xl py-2 text-sm font-black text-emerald-400 focus:outline-none"
                          />
                        </td>

                        {/* Losses */}
                        <td className="py-3 px-4 text-center">
                          <input
                            type="number"
                            min="0"
                            value={player.losses}
                            onChange={(e) => handleUpdatePlayer(idx, 'losses', parseInt(e.target.value) || 0)}
                            className="w-20 mx-auto text-center bg-black/40 border border-white/10 focus:border-rose-400 rounded-xl py-2 text-sm font-black text-rose-400 focus:outline-none"
                          />
                        </td>

                        {/* Points */}
                        <td className="py-3 px-4 text-center">
                          <input
                            type="number"
                            min="0"
                            value={player.points}
                            onChange={(e) => handleUpdatePlayer(idx, 'points', parseInt(e.target.value) || 0)}
                            className="w-20 mx-auto text-center bg-cyan-950/30 border border-cyan-500/40 focus:border-cyan-400 rounded-xl py-2 text-sm font-black text-cyan-300 focus:outline-none shadow-sm"
                          />
                        </td>

                        {/* TieBreak */}
                        <td className="py-3 px-4 text-center">
                          <input
                            type="number"
                            value={player.tieBreak ?? 0}
                            onChange={(e) => handleUpdatePlayer(idx, 'tieBreak', parseInt(e.target.value) || 0)}
                            className="w-24 mx-auto text-center bg-black/40 border border-white/10 focus:border-cyan-400 rounded-xl py-2 text-sm font-bold text-slate-300 focus:outline-none"
                          />
                        </td>

                        {/* Status Badge */}
                        <td className="py-3 px-4 text-center">
                          {isGold ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-200/15 border border-slate-300/40 text-slate-200">
                              👑 Lega Oro
                            </span>
                          ) : isSilver ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-cyan-500/15 border border-cyan-400/40 text-cyan-300">
                              🛡️ Lega Argento
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold text-slate-500 bg-white/5">
                              Non Qualificato
                            </span>
                          )}
                        </td>

                        {/* Delete */}
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => handleRemovePlayer(idx)}
                            className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition-colors"
                            title="Elimina giocatore"
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 2: TURNI & MATCH (4 TURNI BO1)
        ========================================================================== */}
        {activeTab === 'rounds' && (
          <div className="space-y-5 max-w-6xl mx-auto">
            {/* Quick OBS Link Banner */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-gradient-to-r from-cyan-950/30 via-slate-900/40 to-cyan-950/30 border border-cyan-500/25 shadow-lg">
              <div className="flex items-center gap-2.5">
                <span className="px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 text-[10px] font-black uppercase tracking-wider">
                  Link OBS Schermata B
                </span>
                <span className="text-xs text-slate-300 font-mono">
                  /overlays/tournament-swiss/index.html?view=rounds
                </span>
              </div>
              <button
                onClick={() => copyUrl('/overlays/tournament-swiss/index.html?view=rounds')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-300 text-xs font-black rounded-xl transition-all"
              >
                <Copy size={13} /> Copia Link Turni
              </button>
            </div>

            {/* Round Subtabs (Strictly Turno 1, Turno 2, Turno 3, Turno 4) */}
            <div className="flex items-center justify-between gap-4 p-3.5 rounded-2xl bg-slate-900/40 border border-white/10">
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4].map(r => (
                  <button
                    key={r}
                    onClick={() => setSelectedRound(r)}
                    className={`px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all ${
                      selectedRound === r
                        ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-black shadow-lg shadow-cyan-500/20'
                        : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    Turno {r}
                  </button>
                ))}
              </div>

              <button
                onClick={() => handleAddMatch(selectedRound)}
                className="flex items-center gap-2 px-4 py-2 bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-400/30 text-cyan-300 font-bold text-xs rounded-xl transition-all"
              >
                <Plus size={14} />
                Aggiungi Match
              </button>
            </div>

            {/* Matches List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(state.rounds[selectedRound] || []).map((match, mIdx) => (
                <div
                  key={match.id || mIdx}
                  className="p-4 rounded-2xl bg-slate-900/30 border border-white/10 hover:border-cyan-500/30 transition-all space-y-3 relative group"
                >
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                      Match #{mIdx + 1}
                    </span>
                    <button
                      onClick={() => handleRemoveMatch(selectedRound, mIdx)}
                      className="text-slate-500 hover:text-rose-400 transition-colors p-1"
                      title="Elimina match"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  {/* Player 1 Row */}
                  <div className={`p-3 rounded-xl border flex items-center gap-3 transition-all ${
                    match.winner === 1 
                      ? 'bg-emerald-500/15 border-emerald-500/40' 
                      : 'bg-black/40 border-white/5'
                  }`}>
                    <input
                      type="text"
                      value={match.p1?.name || ''}
                      onChange={(e) => handleUpdateMatch(selectedRound, mIdx, {
                        p1: { ...match.p1, name: e.target.value }
                      })}
                      placeholder="Player 1"
                      className="flex-1 bg-transparent text-sm font-black text-white focus:outline-none placeholder-slate-600 truncate"
                    />

                    {/* Custom Civ Flag Selector */}
                    <CivDropdown
                      value={match.p1?.civId || ''}
                      onChange={(civId) => handleUpdateMatch(selectedRound, mIdx, {
                        p1: { ...match.p1, civId }
                      })}
                    />

                    <button
                      onClick={() => handleSetWinner(selectedRound, mIdx, match.winner === 1 ? 0 : 1)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider shrink-0 transition-all ${
                        match.winner === 1
                          ? 'bg-emerald-400 text-black shadow-md shadow-emerald-500/20'
                          : 'bg-white/10 text-slate-400 hover:text-white'
                      }`}
                    >
                      {match.winner === 1 ? '🏆 VINTO' : 'VINCE'}
                    </button>
                  </div>

                  <div className="text-center text-[10px] font-black tracking-widest text-slate-600">VS</div>

                  {/* Player 2 Row */}
                  <div className={`p-3 rounded-xl border flex items-center gap-3 transition-all ${
                    match.winner === 2 
                      ? 'bg-emerald-500/15 border-emerald-500/40' 
                      : 'bg-black/40 border-white/5'
                  }`}>
                    <input
                      type="text"
                      value={match.p2?.name || ''}
                      onChange={(e) => handleUpdateMatch(selectedRound, mIdx, {
                        p2: { ...match.p2, name: e.target.value }
                      })}
                      placeholder="Player 2"
                      className="flex-1 bg-transparent text-sm font-black text-white focus:outline-none placeholder-slate-600 truncate"
                    />

                    {/* Custom Civ Flag Selector */}
                    <CivDropdown
                      value={match.p2?.civId || ''}
                      onChange={(civId) => handleUpdateMatch(selectedRound, mIdx, {
                        p2: { ...match.p2, civId }
                      })}
                    />

                    <button
                      onClick={() => handleSetWinner(selectedRound, mIdx, match.winner === 2 ? 0 : 2)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider shrink-0 transition-all ${
                        match.winner === 2
                          ? 'bg-emerald-400 text-black shadow-md shadow-emerald-500/20'
                          : 'bg-white/10 text-slate-400 hover:text-white'
                      }`}
                    >
                      {match.winner === 2 ? '🏆 VINTO' : 'VINCE'}
                    </button>
                  </div>
                </div>
              ))}

              {(!state.rounds[selectedRound] || state.rounds[selectedRound].length === 0) && (
                <div className="col-span-full py-16 text-center text-slate-500 border border-dashed border-white/10 rounded-2xl">
                  Nessun match inserito per il Turno {selectedRound}. Clicca "Aggiungi Match" o sincronizza da Start.gg!
                </div>
              )}
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 3: START.GG SYNC
        ========================================================================== */}
        {activeTab === 'startgg' && (
          <div className="space-y-5 max-w-3xl mx-auto bg-slate-900/30 p-7 rounded-3xl border border-white/10">
            <div>
              <h3 className="text-base font-black uppercase tracking-wider text-white flex items-center gap-2">
                <Link2 className="text-cyan-400" size={18} />
                Connessione Start.gg
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Collega il torneo inserendo il link o lo slug per importare i 4 turni e la classifica in tempo reale.
              </p>
            </div>

            {/* Slug input */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Link del Torneo o Slug Start.gg
              </label>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={startggSlugInput}
                  onChange={(e) => setStartggSlugInput(e.target.value)}
                  placeholder="es. https://www.start.gg/tournament/nome-torneo/details oppure nome-torneo"
                  className="flex-1 bg-black/40 border border-white/10 focus:border-cyan-400 rounded-xl px-4 py-2.5 text-sm font-semibold text-white focus:outline-none placeholder-slate-600"
                />
                <button
                  onClick={handleFetchStartggTournament}
                  disabled={startggLoading || !startggSlugInput.trim()}
                  className="px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-black font-black text-xs uppercase tracking-wider rounded-xl transition-all disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-cyan-500/20"
                >
                  {startggLoading ? <Loader2 size={15} className="animate-spin" /> : <RefreshCcw size={15} />}
                  Cerca Torneo
                </button>
              </div>
            </div>

            {/* Feedback message */}
            {startggStatus && (
              <div className={`p-3.5 rounded-xl flex items-center gap-2.5 text-xs font-bold border ${
                startggStatus.type === 'success' 
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                  : startggStatus.type === 'error'
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                  : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300'
              }`}>
                {startggStatus.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                {startggStatus.message}
              </div>
            )}

            {/* Event & Phase Selection */}
            {startggTournamentData && (
              <div className="space-y-4 pt-4 border-t border-white/10 animate-in fade-in">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Event selector */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      Seleziona Evento
                    </label>
                    <div className="relative">
                      <select
                        value={selectedEventId}
                        onChange={(e) => {
                          setSelectedEventId(e.target.value);
                          const ev = startggTournamentData.events.find(ev => ev.id === e.target.value);
                          if (ev && ev.phases && ev.phases.length > 0) {
                            setSelectedPhaseId(ev.phases[0].id);
                          }
                        }}
                        className="w-full appearance-none bg-black/40 border border-white/10 rounded-xl pl-4 pr-10 py-2.5 text-sm font-bold text-white focus:outline-none"
                      >
                        {startggTournamentData.events.map(ev => (
                          <option key={ev.id} value={ev.id} className="bg-[#0b0f19] text-white">
                            {ev.name}
                          </option>
                        ))}
                      </select>
                      <ChevronDown size={15} className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
                    </div>
                  </div>

                  {/* Phase selector */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      Seleziona Fase Svizzera
                    </label>
                    <div className="relative">
                      <select
                        value={selectedPhaseId}
                        onChange={(e) => setSelectedPhaseId(e.target.value)}
                        className="w-full appearance-none bg-black/40 border border-white/10 rounded-xl pl-4 pr-10 py-2.5 text-sm font-bold text-white focus:outline-none"
                      >
                        {startggTournamentData.events
                          .find(ev => ev.id === selectedEventId)
                          ?.phases.map(ph => (
                            <option key={ph.id} value={ph.id} className="bg-[#0b0f19] text-white">
                              {ph.name} ({ph.bracketType || 'Swiss'})
                            </option>
                          ))}
                      </select>
                      <ChevronDown size={15} className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-4 pt-4">
                  <div className="flex items-center gap-3">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isAutoSyncing}
                        onChange={(e) => setIsAutoSyncing(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-500"></div>
                    </label>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      Auto-Sincronizza ogni 20 secondi
                    </span>
                  </div>

                  <button
                    onClick={handleSyncStartggNow}
                    disabled={startggLoading}
                    className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-cyan-500/20 flex items-center gap-2"
                  >
                    {startggLoading ? <Loader2 size={15} className="animate-spin" /> : <RefreshCcw size={15} />}
                    Sincronizza Dati Ora
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
