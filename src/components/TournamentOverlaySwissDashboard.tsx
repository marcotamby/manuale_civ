/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
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
  Eye, 
  Layers, 
  Calendar, 
  ArrowUpDown, 
  Calculator,
  Copy
} from 'lucide-react';
import { civilizationsData } from '../data/aoe4Data';
import { overlayService } from '../services/overlayService';
import { fetchTournament, fetchPhaseGroups, fetchPhaseGroupSets } from '../services/startgg';
import type { StartGGTournament } from '../services/startgg';

interface TournamentOverlaySwissDashboardProps {
  onError: (msg: string) => void;
}

export interface SwissStandingPlayer {
  id: string;
  name: string;
  civId?: string;
  wins: number;
  losses: number;
  points: number;
  tieBreak?: number;
}

export interface SwissMatchItem {
  id: string;
  p1: { name: string; civId?: string; score: number };
  p2: { name: string; civId?: string; score: number };
  winner: 0 | 1 | 2; // 0 none/pending, 1 p1, 2 p2
}

const DEFAULT_STATE = {
  activeView: 'standings' as 'standings' | 'rounds',
  tournamentTitle: 'TORNEO AOE4 SVIZZERA',
  dayNumber: 1,
  totalRounds: 4,
  goldSlotsCount: 2,
  silverSlotsCount: 2,
  standings: [
    { id: '1', name: 'Giocatore 1', civId: 'french', wins: 0, losses: 0, points: 0, tieBreak: 0 },
    { id: '2', name: 'Giocatore 2', civId: 'english', wins: 0, losses: 0, points: 0, tieBreak: 0 },
    { id: '3', name: 'Giocatore 3', civId: 'hre', wins: 0, losses: 0, points: 0, tieBreak: 0 },
    { id: '4', name: 'Giocatore 4', civId: 'byzantines', wins: 0, losses: 0, points: 0, tieBreak: 0 },
    { id: '5', name: 'Giocatore 5', civId: 'rus', wins: 0, losses: 0, points: 0, tieBreak: 0 },
    { id: '6', name: 'Giocatore 6', civId: 'mongols', wins: 0, losses: 0, points: 0, tieBreak: 0 },
    { id: '7', name: 'Giocatore 7', civId: 'ottomans', wins: 0, losses: 0, points: 0, tieBreak: 0 },
    { id: '8', name: 'Giocatore 8', civId: 'chinese', wins: 0, losses: 0, points: 0, tieBreak: 0 }
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

export function TournamentOverlaySwissDashboard({ onError }: TournamentOverlaySwissDashboardProps) {
  const [state, setState] = useState(DEFAULT_STATE);
  const [activeTab, setActiveTab] = useState<'standings' | 'rounds' | 'startgg' | 'settings'>('standings');
  const [selectedRound, setSelectedRound] = useState<number>(1);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Start.gg integration states
  const [startggSlugInput, setStartggSlugInput] = useState('');
  const [startggLoading, setStartggLoading] = useState(false);
  const [startggTournamentData, setStartggTournamentData] = useState<StartGGTournament | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [selectedPhaseId, setSelectedPhaseId] = useState<string>('');
  const [startggStatus, setStartggStatus] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [isAutoSyncing, setIsAutoSyncing] = useState(false);

  // Load initial state from Supabase
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

  // Save State Helper
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
      name: `Nuovo Giocatore ${state.standings.length + 1}`,
      civId: 'english',
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

  // Recalculate standings automatically from rounds results
  const handleAutoCalculateStandings = () => {
    const playerStatsMap: Record<string, { name: string; civId?: string; wins: number; losses: number; points: number }> = {};

    // Initialize with existing players
    state.standings.forEach(p => {
      const cleanName = p.name.trim().toLowerCase();
      if (cleanName) {
        playerStatsMap[cleanName] = {
          name: p.name.trim(),
          civId: p.civId,
          wins: 0,
          losses: 0,
          points: 0
        };
      }
    });

    // Scan all 4 rounds
    for (let r = 1; r <= 4; r++) {
      const matches = state.rounds[r] || [];
      matches.forEach(m => {
        const p1Name = m.p1?.name?.trim();
        const p2Name = m.p2?.name?.trim();

        if (p1Name) {
          const k1 = p1Name.toLowerCase();
          if (!playerStatsMap[k1]) {
            playerStatsMap[k1] = { name: p1Name, civId: m.p1.civId, wins: 0, losses: 0, points: 0 };
          }
          if (m.p1.civId) playerStatsMap[k1].civId = m.p1.civId;
        }

        if (p2Name) {
          const k2 = p2Name.toLowerCase();
          if (!playerStatsMap[k2]) {
            playerStatsMap[k2] = { name: p2Name, civId: m.p2.civId, wins: 0, losses: 0, points: 0 };
          }
          if (m.p2.civId) playerStatsMap[k2].civId = m.p2.civId;
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
        civId: p.civId || 'english',
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
      // Extract clean slug
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
      // Fetch phase groups
      const groups = await fetchPhaseGroups(selectedPhaseId);
      if (groups.length === 0) {
        setStartggStatus({ type: 'error', message: 'Nessun gruppo o girone trovato in questa fase.' });
        return;
      }

      // Fetch sets for all phase groups
      const allSetsArrays = await Promise.all(
        groups.map(g => fetchPhaseGroupSets(g.id))
      );
      const allSets = allSetsArrays.flat();

      if (allSets.length === 0) {
        setStartggStatus({ type: 'info', message: 'Fase trovata ma nessun match generato ancora su Start.gg.' });
        return;
      }

      // Organize sets into 4 rounds
      const parsedRounds: Record<number, SwissMatchItem[]> = { 1: [], 2: [], 3: [], 4: [] };
      const playerStats: Record<string, { name: string; wins: number; losses: number; points: number }> = {};

      allSets.forEach(set => {
        // Round number in start.gg swiss is usually 1, 2, 3, 4
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

        // Tally player points
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

      // Build standings
      const syncedStandings: SwissStandingPlayer[] = Object.values(playerStats)
        .map((p, i) => ({
          id: `startgg_${i + 1}`,
          name: p.name,
          civId: 'english',
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
        message: `Sincronizzazione completata! ${allSets.length} match importati e classifica ricalcolata.`
      });
    } catch (err: any) {
      console.error('Error syncing start.gg:', err);
      setStartggStatus({ type: 'error', message: err.message || 'Errore durante l\'import dei match da Start.gg.' });
    } finally {
      setStartggLoading(false);
    }
  };

  // Auto-Sync loop if enabled
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
    <div className="flex flex-col h-full bg-[#0b0f19] text-white rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
      {/* Top Header Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-6 bg-gradient-to-r from-[#121829] to-[#0d121f] border-b border-white/10">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#D4AF37]/30 to-black border border-[#D4AF37]/50 flex items-center justify-center shadow-lg">
            <Trophy className="w-6 h-6 text-[#D4AF37]" />
          </div>
          <div>
            <h2 className="text-xl font-black uppercase tracking-wider text-white flex items-center gap-3">
              Dashboard Svizzera 4 Turni
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[#ffd700]">
                BO1
              </span>
            </h2>
            <p className="text-xs text-gray-400 font-medium mt-0.5">
              Gestione Classifica Live (Top 2 Oro, Top 3-4 Argento) & Tabellone Turni
            </p>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-3">
          {showSuccess && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-green-500/20 border border-green-500/40 text-green-400 text-xs font-bold animate-in fade-in">
              <CheckCircle2 size={16} /> Salvato su OBS!
            </div>
          )}

          <button
            onClick={() => handleSave()}
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-[#D4AF37] to-[#b8860b] text-black font-black text-xs uppercase tracking-wider rounded-xl hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-[#D4AF37]/20 disabled:opacity-50"
          >
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Salva Modifiche
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center px-6 border-b border-white/10 bg-[#080b13] gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('standings')}
          className={`flex items-center gap-2 px-5 py-3.5 border-b-2 text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${
            activeTab === 'standings'
              ? 'border-[#D4AF37] text-[#ffd700] bg-white/5'
              : 'border-transparent text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Trophy size={16} />
          1. Classifica Svizzera (Schermata A)
        </button>

        <button
          onClick={() => setActiveTab('rounds')}
          className={`flex items-center gap-2 px-5 py-3.5 border-b-2 text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${
            activeTab === 'rounds'
              ? 'border-[#D4AF37] text-[#ffd700] bg-white/5'
              : 'border-transparent text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Layers size={16} />
          2. Turni & Match (Schermata B)
        </button>

        <button
          onClick={() => setActiveTab('startgg')}
          className={`flex items-center gap-2 px-5 py-3.5 border-b-2 text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${
            activeTab === 'startgg'
              ? 'border-[#00d2ff] text-[#00d2ff] bg-white/5'
              : 'border-transparent text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Link2 size={16} />
          3. Sincronizzazione Start.gg
          {isAutoSyncing && (
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`flex items-center gap-2 px-5 py-3.5 border-b-2 text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${
            activeTab === 'settings'
              ? 'border-purple-400 text-purple-400 bg-white/5'
              : 'border-transparent text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Eye size={16} />
          4. Regia Stream & URL OBS
        </button>
      </div>

      {/* Main Tab Content */}
      <div className="flex-1 p-6 overflow-y-auto bg-[#070a12]">
        {/* =========================================================================
            TAB 1: CLASSIFICA (STANDINGS)
        ========================================================================== */}
        {activeTab === 'standings' && (
          <div className="space-y-6 max-w-6xl mx-auto">
            {/* Header info & quick actions */}
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Qualificati:</span>
                  <span className="text-xs font-black text-[#ffd700] px-2.5 py-1 rounded-lg bg-[#D4AF37]/15 border border-[#D4AF37]/30">
                    Top {state.goldSlotsCount} 👑 LEGA ORO
                  </span>
                  <span className="text-xs font-black text-[#cbd5e1] px-2.5 py-1 rounded-lg bg-slate-400/15 border border-slate-400/30">
                    3° e 4° 🛡️ LEGA ARGENTO
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleAutoCalculateStandings}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-400 font-bold text-xs rounded-xl transition-all"
                  title="Calcola vittorie e punti leggendo tutti i match dei 4 turni"
                >
                  <Calculator size={14} />
                  Calcola da Match
                </button>

                <button
                  onClick={handleSortStandings}
                  className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/15 text-white font-bold text-xs rounded-xl transition-all"
                  title="Ordina per Punti e Vittorie"
                >
                  <ArrowUpDown size={14} />
                  Ordina Classifica
                </button>

                <button
                  onClick={handleAddPlayer}
                  className="flex items-center gap-2 px-4 py-2 bg-[#D4AF37]/20 hover:bg-[#D4AF37]/30 border border-[#D4AF37]/40 text-[#ffd700] font-bold text-xs rounded-xl transition-all"
                >
                  <Plus size={14} />
                  Aggiungi Player
                </button>
              </div>
            </div>

            {/* Standings Table */}
            <div className="border border-white/10 rounded-2xl overflow-hidden bg-black/40 shadow-xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/10 bg-white/5 text-[11px] font-black uppercase tracking-wider text-gray-400">
                    <th className="py-3 px-4 w-16 text-center">Pos</th>
                    <th className="py-3 px-4">Nome Giocatore</th>
                    <th className="py-3 px-4 w-48">Civiltà Preferita</th>
                    <th className="py-3 px-4 w-24 text-center">Vittorie (W)</th>
                    <th className="py-3 px-4 w-24 text-center">Sconfitte (L)</th>
                    <th className="py-3 px-4 w-24 text-center">Punti</th>
                    <th className="py-3 px-4 w-28 text-center">Tie-Break</th>
                    <th className="py-3 px-4 w-36 text-center">Stato Qualifica</th>
                    <th className="py-3 px-4 w-16 text-center">Azioni</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {state.standings.map((player, idx) => {
                    const rank = idx + 1;
                    const isGold = rank <= (state.goldSlotsCount || 2);
                    const isSilver = rank > (state.goldSlotsCount || 2) && rank <= ((state.goldSlotsCount || 2) + (state.silverSlotsCount || 2));

                    return (
                      <tr 
                        key={player.id || idx}
                        className={`hover:bg-white/5 transition-colors ${
                          isGold ? 'bg-[#D4AF37]/5' : isSilver ? 'bg-slate-400/5' : ''
                        }`}
                      >
                        {/* Pos */}
                        <td className="py-3 px-4 text-center">
                          <div className={`w-8 h-8 rounded-lg mx-auto flex items-center justify-center font-black text-xs ${
                            isGold 
                              ? 'bg-[#D4AF37] text-black font-black shadow-md shadow-[#D4AF37]/30' 
                              : isSilver 
                              ? 'bg-slate-300 text-black font-black shadow-md shadow-slate-400/30' 
                              : 'bg-white/10 text-gray-300'
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
                            className="w-full bg-white/5 border border-white/10 focus:border-[#D4AF37] rounded-lg px-3 py-2 text-sm font-bold text-white placeholder-gray-600 focus:outline-none transition-all"
                          />
                        </td>

                        {/* Civ Dropdown */}
                        <td className="py-3 px-4">
                          <div className="relative">
                            <select
                              value={player.civId || ''}
                              onChange={(e) => handleUpdatePlayer(idx, 'civId', e.target.value)}
                              className="w-full appearance-none bg-white/5 border border-white/10 focus:border-[#D4AF37] rounded-lg pl-3 pr-10 py-2 text-xs font-semibold text-white focus:outline-none transition-all cursor-pointer truncate"
                            >
                              <option value="" className="bg-[#0b0f19] text-gray-400">Nessuna Civ</option>
                              {civilizationsData.map(c => (
                                <option key={c.id} value={c.id} className="bg-[#0b0f19] text-white">
                                  {c.name}
                                </option>
                              ))}
                            </select>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                              <ChevronDown size={14} />
                            </div>
                          </div>
                        </td>

                        {/* Wins */}
                        <td className="py-3 px-4 text-center">
                          <input
                            type="number"
                            min="0"
                            value={player.wins}
                            onChange={(e) => handleUpdatePlayer(idx, 'wins', parseInt(e.target.value) || 0)}
                            className="w-16 mx-auto text-center bg-white/5 border border-white/10 focus:border-green-500 rounded-lg py-1.5 text-sm font-black text-green-400 focus:outline-none"
                          />
                        </td>

                        {/* Losses */}
                        <td className="py-3 px-4 text-center">
                          <input
                            type="number"
                            min="0"
                            value={player.losses}
                            onChange={(e) => handleUpdatePlayer(idx, 'losses', parseInt(e.target.value) || 0)}
                            className="w-16 mx-auto text-center bg-white/5 border border-white/10 focus:border-red-500 rounded-lg py-1.5 text-sm font-black text-red-400 focus:outline-none"
                          />
                        </td>

                        {/* Points */}
                        <td className="py-3 px-4 text-center">
                          <input
                            type="number"
                            min="0"
                            value={player.points}
                            onChange={(e) => handleUpdatePlayer(idx, 'points', parseInt(e.target.value) || 0)}
                            className="w-16 mx-auto text-center bg-[#D4AF37]/10 border border-[#D4AF37]/30 focus:border-[#ffd700] rounded-lg py-1.5 text-sm font-black text-[#ffd700] focus:outline-none"
                          />
                        </td>

                        {/* TieBreak */}
                        <td className="py-3 px-4 text-center">
                          <input
                            type="number"
                            value={player.tieBreak ?? 0}
                            onChange={(e) => handleUpdatePlayer(idx, 'tieBreak', parseInt(e.target.value) || 0)}
                            className="w-20 mx-auto text-center bg-white/5 border border-white/10 focus:border-blue-500 rounded-lg py-1.5 text-sm font-bold text-gray-300 focus:outline-none"
                          />
                        </td>

                        {/* Status Badge */}
                        <td className="py-3 px-4 text-center">
                          {isGold ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#D4AF37]/20 border border-[#D4AF37]/50 text-[#ffd700]">
                              👑 Lega Oro
                            </span>
                          ) : isSilver ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-400/20 border border-slate-400/50 text-slate-200">
                              🛡️ Lega Argento
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold text-gray-500 bg-white/5 border border-white/5">
                              In Gara
                            </span>
                          )}
                        </td>

                        {/* Delete */}
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => handleRemovePlayer(idx)}
                            className="p-1.5 text-gray-500 hover:text-red-400 rounded-lg hover:bg-red-500/10 transition-colors"
                            title="Elimina giocatore"
                          >
                            <Trash2 size={16} />
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
          <div className="space-y-6 max-w-6xl mx-auto">
            {/* Round Subtabs */}
            <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4].map(r => (
                  <button
                    key={r}
                    onClick={() => setSelectedRound(r)}
                    className={`px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all ${
                      selectedRound === r
                        ? 'bg-[#D4AF37] text-black shadow-lg shadow-[#D4AF37]/20 scale-105'
                        : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    Turno {r} {state.rounds[r]?.length ? `(${state.rounds[r].length} match)` : ''}
                  </button>
                ))}
              </div>

              <button
                onClick={() => handleAddMatch(selectedRound)}
                className="flex items-center gap-2 px-4 py-2.5 bg-green-600/20 hover:bg-green-600/30 border border-green-500/40 text-green-400 font-bold text-xs rounded-xl transition-all"
              >
                <Plus size={14} />
                Aggiungi Match a Turno {selectedRound}
              </button>
            </div>

            {/* Matches list for selected round */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(state.rounds[selectedRound] || []).map((match, mIdx) => (
                <div
                  key={match.id || mIdx}
                  className="p-4 rounded-2xl bg-black/40 border border-white/10 hover:border-white/20 transition-all space-y-3 relative group"
                >
                  <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <span className="text-[11px] font-black uppercase tracking-wider text-gray-400">
                      Match #{mIdx + 1} (Turno {selectedRound})
                    </span>
                    <button
                      onClick={() => handleRemoveMatch(selectedRound, mIdx)}
                      className="text-gray-500 hover:text-red-400 transition-colors p-1"
                      title="Elimina match"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  {/* Player 1 Row */}
                  <div className={`p-3 rounded-xl border flex items-center gap-3 transition-all ${
                    match.winner === 1 
                      ? 'bg-green-500/10 border-green-500/40' 
                      : 'bg-white/5 border-white/5'
                  }`}>
                    <input
                      type="text"
                      value={match.p1?.name || ''}
                      onChange={(e) => handleUpdateMatch(selectedRound, mIdx, {
                        p1: { ...match.p1, name: e.target.value }
                      })}
                      placeholder="Player 1"
                      className="flex-1 bg-transparent text-sm font-black text-white focus:outline-none placeholder-gray-600 truncate"
                    />

                    {/* Civ Selector */}
                    <div className="relative w-36">
                      <select
                        value={match.p1?.civId || ''}
                        onChange={(e) => handleUpdateMatch(selectedRound, mIdx, {
                          p1: { ...match.p1, civId: e.target.value }
                        })}
                        className="w-full appearance-none bg-black/40 border border-white/10 rounded-lg pl-2 pr-8 py-1.5 text-xs text-gray-300 focus:outline-none truncate"
                      >
                        <option value="" className="bg-[#0b0f19] text-gray-500">Civ...</option>
                        {civilizationsData.map(c => (
                          <option key={c.id} value={c.id} className="bg-[#0b0f19] text-white">
                            {c.name}
                          </option>
                        ))}
                      </select>
                      <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400" />
                    </div>

                    <button
                      onClick={() => handleSetWinner(selectedRound, mIdx, match.winner === 1 ? 0 : 1)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                        match.winner === 1
                          ? 'bg-green-500 text-black shadow-md shadow-green-500/20'
                          : 'bg-white/10 text-gray-400 hover:text-white'
                      }`}
                    >
                      {match.winner === 1 ? '🏆 VINTO (1)' : 'VINCE P1'}
                    </button>
                  </div>

                  <div className="text-center text-[10px] font-black tracking-widest text-gray-500">VS</div>

                  {/* Player 2 Row */}
                  <div className={`p-3 rounded-xl border flex items-center gap-3 transition-all ${
                    match.winner === 2 
                      ? 'bg-green-500/10 border-green-500/40' 
                      : 'bg-white/5 border-white/5'
                  }`}>
                    <input
                      type="text"
                      value={match.p2?.name || ''}
                      onChange={(e) => handleUpdateMatch(selectedRound, mIdx, {
                        p2: { ...match.p2, name: e.target.value }
                      })}
                      placeholder="Player 2"
                      className="flex-1 bg-transparent text-sm font-black text-white focus:outline-none placeholder-gray-600 truncate"
                    />

                    {/* Civ Selector */}
                    <div className="relative w-36">
                      <select
                        value={match.p2?.civId || ''}
                        onChange={(e) => handleUpdateMatch(selectedRound, mIdx, {
                          p2: { ...match.p2, civId: e.target.value }
                        })}
                        className="w-full appearance-none bg-black/40 border border-white/10 rounded-lg pl-2 pr-8 py-1.5 text-xs text-gray-300 focus:outline-none truncate"
                      >
                        <option value="" className="bg-[#0b0f19] text-gray-500">Civ...</option>
                        {civilizationsData.map(c => (
                          <option key={c.id} value={c.id} className="bg-[#0b0f19] text-white">
                            {c.name}
                          </option>
                        ))}
                      </select>
                      <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400" />
                    </div>

                    <button
                      onClick={() => handleSetWinner(selectedRound, mIdx, match.winner === 2 ? 0 : 2)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                        match.winner === 2
                          ? 'bg-green-500 text-black shadow-md shadow-green-500/20'
                          : 'bg-white/10 text-gray-400 hover:text-white'
                      }`}
                    >
                      {match.winner === 2 ? '🏆 VINTO (1)' : 'VINCE P2'}
                    </button>
                  </div>
                </div>
              ))}

              {(!state.rounds[selectedRound] || state.rounds[selectedRound].length === 0) && (
                <div className="col-span-full py-16 text-center text-gray-500 border border-dashed border-white/10 rounded-2xl">
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
          <div className="space-y-6 max-w-3xl mx-auto bg-black/40 p-8 rounded-3xl border border-white/10">
            <div>
              <h3 className="text-lg font-black uppercase tracking-wider text-white flex items-center gap-2">
                <Link2 className="text-[#00d2ff]" size={20} />
                Connessione Diretta Start.gg
              </h3>
              <p className="text-xs text-gray-400 mt-1">
                Collega il torneo inserendo il link o lo slug di Start.gg per importare automaticamente i 4 turni svizzeri e la classifica in tempo reale.
              </p>
            </div>

            {/* Slug input */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-300">
                Link del Torneo o Slug Start.gg
              </label>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={startggSlugInput}
                  onChange={(e) => setStartggSlugInput(e.target.value)}
                  placeholder="es. https://www.start.gg/tournament/aoe4-swiss-cup/details oppure aoe4-swiss-cup"
                  className="flex-1 bg-white/5 border border-white/10 focus:border-[#00d2ff] rounded-xl px-4 py-3 text-sm font-semibold text-white focus:outline-none placeholder-gray-600"
                />
                <button
                  onClick={handleFetchStartggTournament}
                  disabled={startggLoading || !startggSlugInput.trim()}
                  className="px-6 py-3 bg-[#00d2ff] text-black font-black text-xs uppercase tracking-wider rounded-xl hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {startggLoading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCcw size={16} />}
                  Cerca Torneo
                </button>
              </div>
            </div>

            {/* Feedback message */}
            {startggStatus && (
              <div className={`p-4 rounded-xl flex items-center gap-3 text-xs font-bold border ${
                startggStatus.type === 'success' 
                  ? 'bg-green-500/10 border-green-500/30 text-green-400' 
                  : startggStatus.type === 'error'
                  ? 'bg-red-500/10 border-red-500/30 text-red-400'
                  : 'bg-blue-500/10 border-blue-500/30 text-blue-400'
              }`}>
                {startggStatus.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                {startggStatus.message}
              </div>
            )}

            {/* Event & Phase Selection */}
            {startggTournamentData && (
              <div className="space-y-4 pt-4 border-t border-white/10 animate-in fade-in">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Event selector */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-300">
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
                        className="w-full appearance-none bg-white/5 border border-white/10 rounded-xl pl-4 pr-10 py-3 text-sm font-bold text-white focus:outline-none"
                      >
                        {startggTournamentData.events.map(ev => (
                          <option key={ev.id} value={ev.id} className="bg-[#0b0f19] text-white">
                            {ev.name}
                          </option>
                        ))}
                      </select>
                      <ChevronDown size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400" />
                    </div>
                  </div>

                  {/* Phase selector */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-300">
                      Seleziona Fase / Bracket Svizzero
                    </label>
                    <div className="relative">
                      <select
                        value={selectedPhaseId}
                        onChange={(e) => setSelectedPhaseId(e.target.value)}
                        className="w-full appearance-none bg-white/5 border border-white/10 rounded-xl pl-4 pr-10 py-3 text-sm font-bold text-white focus:outline-none"
                      >
                        {startggTournamentData.events
                          .find(ev => ev.id === selectedEventId)
                          ?.phases.map(ph => (
                            <option key={ph.id} value={ph.id} className="bg-[#0b0f19] text-white">
                              {ph.name} ({ph.bracketType || 'Swiss'})
                            </option>
                          ))}
                      </select>
                      <ChevronDown size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400" />
                    </div>
                  </div>
                </div>

                {/* Sync Action Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-4 pt-4">
                  <div className="flex items-center gap-3">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isAutoSyncing}
                        onChange={(e) => setIsAutoSyncing(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                    </label>
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-300">
                      Auto-Sincronizza ogni 20 secondi
                    </span>
                  </div>

                  <button
                    onClick={handleSyncStartggNow}
                    disabled={startggLoading}
                    className="px-6 py-3 bg-green-600 hover:bg-green-500 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-green-900/30 flex items-center gap-2"
                  >
                    {startggLoading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCcw size={16} />}
                    Sincronizza Dati Ora
                  </button>
                </div>

                {state.startgg?.lastSyncedAt && (
                  <div className="text-[11px] text-gray-500 text-right">
                    Ultimo aggiornamento automatico: {state.startgg.lastSyncedAt}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            TAB 4: REGIA STREAM & IMPOSTAZIONI
        ========================================================================== */}
        {activeTab === 'settings' && (
          <div className="space-y-6 max-w-4xl mx-auto">
            {/* Stream Scene Switcher */}
            <div className="p-6 rounded-2xl bg-gradient-to-br from-purple-950/20 to-black border border-purple-500/30 space-y-4">
              <h3 className="text-sm font-black uppercase tracking-wider text-purple-400 flex items-center gap-2">
                <Eye size={18} />
                Regia Stream: Schermata Visibile su OBS
              </h3>
              <p className="text-xs text-gray-400">
                Scegli quale vista mostrare nella sorgente browser principale su OBS Studio in tempo reale.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  onClick={() => {
                    const newState = { ...state, activeView: 'standings' as const };
                    setState(newState);
                    handleSave(newState);
                  }}
                  className={`p-5 rounded-2xl border text-left flex items-center gap-4 transition-all ${
                    state.activeView === 'standings'
                      ? 'bg-[#D4AF37]/20 border-[#D4AF37] shadow-xl shadow-[#D4AF37]/10'
                      : 'bg-white/5 border-white/10 hover:bg-white/10'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black ${
                    state.activeView === 'standings' ? 'bg-[#D4AF37] text-black' : 'bg-white/10 text-gray-400'
                  }`}>
                    A
                  </div>
                  <div>
                    <div className="font-black text-sm text-white uppercase tracking-wider">Schermata Classifica</div>
                    <div className="text-xs text-gray-400 mt-0.5">Top 2 Oro, Top 3-4 Argento, Record W-L</div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    const newState = { ...state, activeView: 'rounds' as const };
                    setState(newState);
                    handleSave(newState);
                  }}
                  className={`p-5 rounded-2xl border text-left flex items-center gap-4 transition-all ${
                    state.activeView === 'rounds'
                      ? 'bg-[#00d2ff]/20 border-[#00d2ff] shadow-xl shadow-[#00d2ff]/10'
                      : 'bg-white/5 border-white/10 hover:bg-white/10'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black ${
                    state.activeView === 'rounds' ? 'bg-[#00d2ff] text-black' : 'bg-white/10 text-gray-400'
                  }`}>
                    B
                  </div>
                  <div>
                    <div className="font-black text-sm text-white uppercase tracking-wider">Schermata Turni</div>
                    <div className="text-xs text-gray-400 mt-0.5">Tabellone 4 Turni Bo1 con Match e Vincitori</div>
                  </div>
                </button>
              </div>
            </div>

            {/* General Info */}
            <div className="p-6 rounded-2xl bg-black/40 border border-white/10 space-y-4">
              <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                <Calendar size={18} className="text-[#D4AF37]" />
                Titolo & Giornata Torneo
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Titolo Torneo</label>
                  <input
                    type="text"
                    value={state.tournamentTitle}
                    onChange={(e) => setState({ ...state, tournamentTitle: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-bold text-white focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Giornata di Qualifica</label>
                  <div className="relative">
                    <select
                      value={state.dayNumber}
                      onChange={(e) => setState({ ...state, dayNumber: parseInt(e.target.value) || 1 })}
                      className="w-full appearance-none bg-white/5 border border-white/10 rounded-xl pl-4 pr-10 py-2.5 text-sm font-bold text-white focus:outline-none focus:border-[#D4AF37]"
                    >
                      <option value={1} className="bg-[#0b0f19]">Giornata 1</option>
                      <option value={2} className="bg-[#0b0f19]">Giornata 2</option>
                      <option value={3} className="bg-[#0b0f19]">Giornata 3</option>
                      <option value={4} className="bg-[#0b0f19]">Giornata 4</option>
                    </select>
                    <ChevronDown size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400" />
                  </div>
                </div>
              </div>
            </div>

            {/* OBS URLs Helper */}
            <div className="p-6 rounded-2xl bg-black/40 border border-white/10 space-y-4">
              <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                <Link2 size={18} className="text-[#00d2ff]" />
                Link Browser Source per OBS Studio
              </h3>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
                  <div>
                    <div className="text-xs font-bold text-white">Sorgente Unica Controllata da Dashboard</div>
                    <div className="text-[11px] text-gray-400">Cambia automaticamente tra Classifica e Turni quando clicchi sopra</div>
                  </div>
                  <button
                    onClick={() => copyUrl('/overlays/tournament-swiss/index.html')}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-xs font-bold text-white rounded-lg transition-all"
                  >
                    <Copy size={12} /> Copia Link
                  </button>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
                  <div>
                    <div className="text-xs font-bold text-yellow-400">Solo Schermata A (Classifica)</div>
                    <div className="text-[11px] text-gray-400">Resta sempre fissa sulla classifica</div>
                  </div>
                  <button
                    onClick={() => copyUrl('/overlays/tournament-swiss/index.html?view=standings')}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500/20 hover:bg-yellow-500/30 text-xs font-bold text-yellow-300 rounded-lg transition-all"
                  >
                    <Copy size={12} /> Copia Link
                  </button>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
                  <div>
                    <div className="text-xs font-bold text-blue-400">Solo Schermata B (Turni)</div>
                    <div className="text-[11px] text-gray-400">Resta sempre fissa sul tabellone dei 4 turni</div>
                  </div>
                  <button
                    onClick={() => copyUrl('/overlays/tournament-swiss/index.html?view=rounds')}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-xs font-bold text-blue-300 rounded-lg transition-all"
                  >
                    <Copy size={12} /> Copia Link
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
