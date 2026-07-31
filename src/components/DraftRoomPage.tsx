import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Swords, Users, Shield, Clock, Eye, Check, X, RefreshCcw, Copy, Monitor, Trophy, Target, Lock } from 'lucide-react';
import { draftService } from '../services/draftService';
import type { DraftRoom, DraftTurn } from '../services/draftService';
import { civilizationsData } from '../data/aoe4Data';
import { AOE4_MAPS } from '../data/aoe4Maps';

type UserRole = 'HOST' | 'GUEST' | 'SPECTATOR';

export function DraftRoomPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();

  const [room, setRoom] = useState<DraftRoom | null>(null);
  const [loading, setLoading] = useState(true);

  // Read stored role for this specific room ID
  const [role, setRole] = useState<UserRole | null>(() => {
    return (sessionStorage.getItem(`draft_role_${roomId}`) as UserRole) || null;
  });

  const [joiningRole, setJoiningRole] = useState<UserRole>('GUEST');
  const [joiningName, setJoiningName] = useState('Giocatore 2');

  const [timeLeft, setTimeLeft] = useState(30);
  const [isOverlayMode, setIsOverlayMode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch room data & subscribe to Supabase Realtime updates
  useEffect(() => {
    if (!roomId) return;

    loadRoom(roomId);
    const unsubscribe = draftService.subscribeToRoom(roomId, (updatedRoom) => {
      setRoom(updatedRoom);
    });

    return () => {
      unsubscribe();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [roomId]);

  const loadRoom = async (id: string) => {
    setLoading(true);
    try {
      const data = await draftService.getRoom(id);
      if (data) {
        setRoom(data);
        if (data.state?.hostClaimed && !data.state?.guestClaimed) {
          setJoiningRole('GUEST');
        } else if (!data.state?.hostClaimed && data.state?.guestClaimed) {
          setJoiningRole('HOST');
        }
      }
    } catch (err) {
      console.error('Error loading room:', err);
    } finally {
      setLoading(false);
    }
  };

  const state = room?.state || {
    hostPicks: [],
    guestPicks: [],
    hostBans: [],
    guestBans: [],
    hostSnipes: [],
    guestSnipes: [],
    hostReady: false,
    guestReady: false,
    hostClaimed: false,
    guestClaimed: false,
    mapPicks: [],
    mapBans: []
  };

  const hostClaimed = !!state.hostClaimed;
  const guestClaimed = !!state.guestClaimed;
  const hostReady = !!state.hostReady;
  const guestReady = !!state.guestReady;

  // Claim Role & join room
  const handleConfirmRole = async () => {
    if (!room || !joiningRole) return;

    if (joiningRole === 'SPECTATOR') {
      setRole('SPECTATOR');
      if (roomId) sessionStorage.setItem(`draft_role_${roomId}`, 'SPECTATOR');
      return;
    }

    const nextState = { ...state };
    const updates: Partial<DraftRoom> = { state: nextState };

    if (joiningRole === 'HOST') {
      nextState.hostClaimed = true;
      updates.host_name = joiningName || room.host_name || 'Giocatore 1';
    } else if (joiningRole === 'GUEST') {
      nextState.guestClaimed = true;
      updates.guest_name = joiningName || room.guest_name || 'Giocatore 2';
    }

    const updated = await draftService.updateRoom(room.id, updates);
    if (updated) {
      setRoom(updated);
      setRole(joiningRole);
      if (roomId) sessionStorage.setItem(`draft_role_${roomId}`, joiningRole);
    }
  };

  // Turn details
  const turns: DraftTurn[] = room?.preset?.turns || [];
  const currentStep = room?.current_step || 0;
  const currentTurn: DraftTurn | undefined = turns[currentStep];

  const isHostTurn = currentTurn?.player === 'HOST';
  const isGuestTurn = currentTurn?.player === 'GUEST';
  const isMyTurn = (role === 'HOST' && isHostTurn) || (role === 'GUEST' && isGuestTurn);

  const allUsedCivs = useMemo(() => [
    ...(state.hostPicks || []),
    ...(state.guestPicks || []),
    ...(state.hostBans || []),
    ...(state.guestBans || []),
    ...(state.hostSnipes || []),
    ...(state.guestSnipes || [])
  ], [state]);

  const allUsedMaps = useMemo(() => [
    ...(state.mapPicks || []),
    ...(state.mapBans || [])
  ], [state]);

  // Map civ ID to civ object
  const getCivObj = (civId: string) => {
    return civilizationsData.find(c => c.id === civId) || { id: civId, name: civId, flag: '/flags/english.png' };
  };

  // Handle Ready Toggle
  const handleToggleReady = async () => {
    if (!room || !role) return;
    const nextState = { ...state };
    if (role === 'HOST') nextState.hostReady = !hostReady;
    if (role === 'GUEST') nextState.guestReady = !guestReady;

    const bothReady = nextState.hostReady && nextState.guestReady;

    const updated = await draftService.updateRoom(room.id, {
      state: nextState,
      status: bothReady ? 'in_progress' : room.status,
      current_step: bothReady ? 0 : room.current_step
    });

    if (updated) setRoom(updated);
  };

  // Timer Countdown logic (30 seconds per turn)
  useEffect(() => {
    if (!room || room.status !== 'in_progress' || !currentTurn) return;

    setTimeLeft(30);

    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          if (isMyTurn) {
            handleAutoRandomAction();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [room?.current_step, room?.status, isMyTurn]);

  // Random action on timeout
  const handleAutoRandomAction = () => {
    if (!currentTurn || !room) return;

    if (currentTurn.target === 'CIV') {
      const available = civilizationsData.filter(c => !allUsedCivs.includes(c.id));
      if (available.length > 0) {
        const randomCiv = available[Math.floor(Math.random() * available.length)];
        executeAction(randomCiv.id);
      }
    } else if (currentTurn.target === 'MAP') {
      const available = AOE4_MAPS.filter(m => !allUsedMaps.includes(m));
      if (available.length > 0) {
        const randomMap = available[Math.floor(Math.random() * available.length)];
        executeAction(randomMap);
      }
    }
  };

  // Execute Pick, Ban, or Snipe action
  const executeAction = async (itemId: string) => {
    if (!room || !currentTurn) return;

    const nextState = {
      ...state,
      hostPicks: [...(state.hostPicks || [])],
      guestPicks: [...(state.guestPicks || [])],
      hostBans: [...(state.hostBans || [])],
      guestBans: [...(state.guestBans || [])],
      hostSnipes: [...(state.hostSnipes || [])],
      guestSnipes: [...(state.guestSnipes || [])],
      mapPicks: [...(state.mapPicks || [])],
      mapBans: [...(state.mapBans || [])]
    };

    const player = currentTurn.player;
    const action = currentTurn.action;
    const target = currentTurn.target;

    if (target === 'CIV') {
      if (action === 'PICK') {
        if (player === 'HOST') nextState.hostPicks.push(itemId);
        else nextState.guestPicks.push(itemId);
      } else if (action === 'BAN') {
        if (player === 'HOST') nextState.hostBans.push(itemId);
        else nextState.guestBans.push(itemId);
      } else if (action === 'SNIPE') {
        if (player === 'HOST') nextState.hostSnipes.push(itemId);
        else nextState.guestSnipes.push(itemId);
      }
    } else if (target === 'MAP') {
      if (action === 'PICK') {
        nextState.mapPicks.push(itemId);
      } else if (action === 'BAN') {
        nextState.mapBans.push(itemId);
      }
    }

    const nextStepIndex = room.current_step + 1;
    const isCompleted = nextStepIndex >= turns.length;

    const updated = await draftService.updateRoom(room.id, {
      state: nextState,
      current_step: isCompleted ? room.current_step : nextStepIndex,
      status: isCompleted ? 'completed' : 'in_progress'
    });

    if (updated) {
      setRoom(updated);
    }
  };

  const handleCopyShareLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center text-slate-300 gap-3 font-sans">
        <RefreshCcw className="animate-spin text-cyan-400" size={36} />
        <p className="font-semibold text-lg">Caricamento Stanza Draft...</p>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center text-center p-6 font-sans">
        <h2 className="text-2xl font-bold text-red-400 mb-2">Stanza Non Trovata</h2>
        <p className="text-slate-400 mb-6">La stanza draft non esiste o è scaduta.</p>
        <button onClick={() => navigate('/')} className="px-6 py-2 bg-slate-200 text-black font-bold rounded-xl">
          Torna alla Home
        </button>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isOverlayMode ? 'bg-black/95 text-white' : 'bg-transparent text-white'} p-3 sm:p-6 space-y-6 max-w-7xl mx-auto font-sans`}>
      
      {/* Role Claim Modal (Centered vertically, no top cut-off) */}
      {!role && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
          <div className="bg-[#0b101e] border border-slate-700/60 rounded-3xl p-6 sm:p-8 max-w-md w-full text-center space-y-5 shadow-2xl my-auto max-h-[92vh] overflow-y-auto no-scrollbar">
            <div className="w-14 h-14 bg-slate-800 border border-slate-700 rounded-2xl flex items-center justify-center mx-auto text-cyan-400">
              <Users size={28} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight">Scegli il tuo Ruolo in Stanza</h2>
              <p className="text-xs text-slate-400 mt-1">Stanza Match: <strong className="text-cyan-400">{room.title}</strong></p>
            </div>

            <div className="space-y-3">
              {/* Host option */}
              <button
                disabled={hostClaimed}
                onClick={() => {
                  setJoiningRole('HOST');
                  setJoiningName(room.host_name || 'Giocatore 1');
                }}
                className={`w-full py-3.5 px-4 rounded-2xl border font-bold text-sm flex items-center justify-between transition-all ${
                  hostClaimed
                    ? 'bg-slate-900/50 border-slate-800 text-slate-500 opacity-60 cursor-not-allowed'
                    : joiningRole === 'HOST'
                    ? 'bg-red-600/30 border-red-500 text-white ring-2 ring-red-500/50'
                    : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border-slate-700'
                }`}
              >
                <span>🔴 Host: {hostClaimed ? `${room.host_name} (Occupato)` : 'Giocatore 1'}</span>
                {hostClaimed ? <Lock size={16} /> : <Shield size={18} className="text-red-400" />}
              </button>

              {/* Guest option */}
              <button
                disabled={guestClaimed}
                onClick={() => {
                  setJoiningRole('GUEST');
                  setJoiningName(room.guest_name || 'Giocatore 2');
                }}
                className={`w-full py-3.5 px-4 rounded-2xl border font-bold text-sm flex items-center justify-between transition-all ${
                  guestClaimed
                    ? 'bg-slate-900/50 border-slate-800 text-slate-500 opacity-60 cursor-not-allowed'
                    : joiningRole === 'GUEST'
                    ? 'bg-blue-600/30 border-blue-500 text-white ring-2 ring-blue-500/50'
                    : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border-slate-700'
                }`}
              >
                <span>🔵 Guest: {guestClaimed ? `${room.guest_name} (Occupato)` : 'Giocatore 2'}</span>
                {guestClaimed ? <Lock size={16} /> : <Shield size={18} className="text-blue-400" />}
              </button>

              {/* Spectator option */}
              <button
                onClick={() => setJoiningRole('SPECTATOR')}
                className={`w-full py-3.5 px-4 rounded-2xl border font-bold text-sm flex items-center justify-between transition-all ${
                  joiningRole === 'SPECTATOR'
                    ? 'bg-purple-600/30 border-purple-500 text-white ring-2 ring-purple-500/50'
                    : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border-slate-700'
                }`}
              >
                <span>👁️ Entra come Spettatore / Streamer</span>
                <Eye size={18} className="text-purple-400" />
              </button>
            </div>

            {/* Input name for joining player */}
            {joiningRole !== 'SPECTATOR' && (
              <div className="text-left space-y-1.5 pt-2">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Il tuo Nome in-game
                </label>
                <input
                  type="text"
                  value={joiningName}
                  onChange={(e) => setJoiningName(e.target.value)}
                  placeholder="Inserisci il tuo Nickname"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white font-bold text-sm focus:border-cyan-400 focus:outline-none"
                />
              </div>
            )}

            <button
              onClick={handleConfirmRole}
              className="w-full py-3.5 bg-slate-200 hover:bg-white text-black font-extrabold text-sm rounded-2xl shadow-lg transition-all"
            >
              CONFERMA ED ENTRA IN STANZA
            </button>
          </div>
        </div>
      )}

      {/* Control Top Bar */}
      {!isOverlayMode && (
        <div className="flex flex-wrap justify-between items-center gap-3 bg-[#0d1222]/80 p-3.5 rounded-2xl border border-slate-700/60 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-slate-800 text-cyan-300 border border-slate-700 uppercase tracking-wider">
              {room.title}
            </span>
            <span className="text-xs text-slate-400 hidden sm:inline">
              Ruolo attuale: <strong className={role === 'HOST' ? 'text-red-400 font-bold' : role === 'GUEST' ? 'text-blue-400 font-bold' : 'text-slate-300'}>{role}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyShareLink}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold border border-slate-700 transition-all"
            >
              {copiedLink ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              <span>{copiedLink ? '✓ Copiato!' : 'Copia Link Stanza'}</span>
            </button>

            <button
              onClick={() => {
                sessionStorage.removeItem(`draft_role_${roomId}`);
                setRole(null);
              }}
              className="px-3.5 py-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold border border-slate-700 transition-all"
            >
              Cambia Ruolo
            </button>

            <button
              onClick={() => setIsOverlayMode(!isOverlayMode)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-950/60 hover:bg-purple-900/60 text-purple-300 border border-purple-500/40 rounded-xl text-xs font-bold transition-all"
            >
              <Monitor size={14} />
              <span>Modalità Stream</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Status Header Banner - Clean Inter Font, Professional Layout */}
      <div className="relative overflow-hidden rounded-3xl p-6 sm:p-7 border border-slate-700/60 bg-[#0b101e] shadow-xl">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">

          {/* Player 1 Host Badge & Picked/Banned Flags (Style of aoe2cm.net) */}
          <div className={`md:col-span-4 flex flex-col gap-3 p-4 rounded-2xl border transition-all ${
            isHostTurn && room.status === 'in_progress' ? 'bg-red-500/10 border-red-500/60 ring-1 ring-red-500/40' : 'bg-slate-950/60 border-slate-800'
          }`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-600/30 border border-red-500/50 flex items-center justify-center text-red-400 font-extrabold text-sm shrink-0">
                P1
              </div>
              <div className="overflow-hidden">
                <div className="flex items-center gap-2">
                  <span className="block text-[10px] font-extrabold text-red-400 uppercase tracking-widest">🔴 Host</span>
                  {hostReady && <span className="text-[9px] font-extrabold px-1.5 py-0.2 bg-emerald-500/20 text-emerald-400 rounded border border-emerald-500/40">READY</span>}
                </div>
                <h3 className="text-base font-bold text-white truncate">{room.host_name}</h3>
              </div>
            </div>

            {/* Picked / Banned / Sniped Flags Rows under Name */}
            <div className="space-y-1.5 pt-1 border-t border-slate-800/80">
              {state.hostBans && state.hostBans.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-bold text-red-400 uppercase w-12 shrink-0">BAN</span>
                  <div className="flex flex-wrap gap-1">
                    {state.hostBans.map(id => {
                      const c = getCivObj(id);
                      return (
                        <img key={`hban-${id}`} src={c.flag} alt={c.name} title={`BAN: ${c.name}`} className="w-7 h-7 object-cover rounded-md border border-red-500/50 opacity-60 grayscale" />
                      );
                    })}
                  </div>
                </div>
              )}

              {state.hostPicks && state.hostPicks.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-bold text-emerald-400 uppercase w-12 shrink-0">PICK</span>
                  <div className="flex flex-wrap gap-1">
                    {state.hostPicks.map(id => {
                      const c = getCivObj(id);
                      return (
                        <img key={`hpick-${id}`} src={c.flag} alt={c.name} title={`PICK: ${c.name}`} className="w-8 h-8 object-cover rounded-lg border-2 border-emerald-500 shadow-md" />
                      );
                    })}
                  </div>
                </div>
              )}

              {state.hostSnipes && state.hostSnipes.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-bold text-purple-400 uppercase w-12 shrink-0">SNIPE</span>
                  <div className="flex flex-wrap gap-1">
                    {state.hostSnipes.map(id => {
                      const c = getCivObj(id);
                      return (
                        <img key={`hsnipe-${id}`} src={c.flag} alt={c.name} title={`SNIPE: ${c.name}`} className="w-7 h-7 object-cover rounded-md border border-purple-500/50 opacity-70" />
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Center Status / Timer (Sleek Professional Typography) */}
          <div className="md:col-span-4 text-center space-y-3">
            {room.status === 'waiting' && (
              <div className="space-y-3">
                <span className="inline-block px-3 py-1 bg-slate-800 text-slate-300 border border-slate-700 rounded-full text-xs font-bold uppercase tracking-wider">
                  In Attesa dei Giocatori
                </span>
                
                <div className="flex justify-center gap-3 py-1 text-xs font-bold">
                  <span className={hostReady ? 'text-emerald-400' : 'text-red-400'}>
                    🔴 Host: {hostReady ? 'PRONTO ✓' : 'NON PRONTO'}
                  </span>
                  <span className={guestReady ? 'text-emerald-400' : 'text-blue-400'}>
                    🔵 Guest: {guestReady ? 'PRONTO ✓' : 'NON PRONTO'}
                  </span>
                </div>

                {(role === 'HOST' || role === 'GUEST') && (
                  <button
                    onClick={handleToggleReady}
                    className={`px-6 py-2.5 rounded-xl font-bold text-xs tracking-wider uppercase transition-all shadow-md ${
                      (role === 'HOST' && hostReady) || (role === 'GUEST' && guestReady)
                        ? 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/30'
                    }`}
                  >
                    {(role === 'HOST' && hostReady) || (role === 'GUEST' && guestReady)
                      ? 'ANNULLA PRONTO'
                      : 'SONO PRONTO (Ready)'}
                  </button>
                )}
              </div>
            )}

            {room.status === 'in_progress' && currentTurn && (
              <div className="space-y-3">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Step {room.current_step + 1} di {turns.length} • Turno {currentTurn.player === 'HOST' ? 'Host' : 'Guest'}
                </div>

                <div className={`px-4 py-2 rounded-xl border text-sm font-bold tracking-tight inline-block ${
                  isMyTurn
                    ? 'bg-slate-800 text-cyan-300 border-cyan-500/50'
                    : 'bg-slate-900 text-slate-300 border-slate-800'
                }`}>
                  {isMyTurn ? (
                    `Il tuo Turno: ${currentTurn.action === 'BAN' ? 'Banna 1 civiltà' : currentTurn.action === 'SNIPE' ? 'Snippa 1 civiltà' : 'Seleziona 1 civiltà'}`
                  ) : (
                    `Turno di ${currentTurn.player === 'HOST' ? room.host_name : room.guest_name} (${currentTurn.action})`
                  )}
                </div>

                {/* Timer Bar */}
                <div className="w-full max-w-xs mx-auto space-y-1">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-400">
                    <span className="flex items-center gap-1"><Clock size={13} className="text-cyan-400" /> Tempo</span>
                    <span className={timeLeft <= 5 ? 'text-red-400 font-bold' : 'text-cyan-400'}>{timeLeft}s</span>
                  </div>
                  <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className={`h-full transition-all duration-1000 ${
                        timeLeft <= 5 ? 'bg-red-500' : timeLeft <= 10 ? 'bg-amber-400' : 'bg-cyan-400'
                      }`}
                      style={{ width: `${(timeLeft / 30) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            {room.status === 'completed' && (
              <div className="space-y-1.5">
                <Trophy className="mx-auto text-cyan-400" size={32} />
                <h2 className="text-xl font-bold text-white tracking-tight">DRAFT COMPLETATO</h2>
                <p className="text-xs text-slate-400">Tutti i turni del match sono stati effettuati.</p>
              </div>
            )}
          </div>

          {/* Player 2 Guest Badge & Picked/Banned Flags */}
          <div className={`md:col-span-4 flex flex-col gap-3 p-4 rounded-2xl border transition-all ${
            isGuestTurn && room.status === 'in_progress' ? 'bg-blue-500/10 border-blue-500/60 ring-1 ring-blue-500/40' : 'bg-slate-950/60 border-slate-800'
          }`}>
            <div className="flex items-center justify-end gap-3 text-right">
              <div className="overflow-hidden">
                <div className="flex items-center justify-end gap-2">
                  {guestReady && <span className="text-[9px] font-extrabold px-1.5 py-0.2 bg-emerald-500/20 text-emerald-400 rounded border border-emerald-500/40">READY</span>}
                  <span className="block text-[10px] font-extrabold text-blue-400 uppercase tracking-widest">🔵 Guest</span>
                </div>
                <h3 className="text-base font-bold text-white truncate">{room.guest_name}</h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-500/50 flex items-center justify-center text-blue-400 font-extrabold text-sm shrink-0">
                P2
              </div>
            </div>

            {/* Picked / Banned / Sniped Flags Rows under Name */}
            <div className="space-y-1.5 pt-1 border-t border-slate-800/80">
              {state.guestBans && state.guestBans.length > 0 && (
                <div className="flex items-center justify-end gap-2">
                  <div className="flex flex-wrap gap-1 justify-end">
                    {state.guestBans.map(id => {
                      const c = getCivObj(id);
                      return (
                        <img key={`gban-${id}`} src={c.flag} alt={c.name} title={`BAN: ${c.name}`} className="w-7 h-7 object-cover rounded-md border border-red-500/50 opacity-60 grayscale" />
                      );
                    })}
                  </div>
                  <span className="text-[9px] font-bold text-red-400 uppercase w-12 shrink-0 text-right">BAN</span>
                </div>
              )}

              {state.guestPicks && state.guestPicks.length > 0 && (
                <div className="flex items-center justify-end gap-2">
                  <div className="flex flex-wrap gap-1 justify-end">
                    {state.guestPicks.map(id => {
                      const c = getCivObj(id);
                      return (
                        <img key={`gpick-${id}`} src={c.flag} alt={c.name} title={`PICK: ${c.name}`} className="w-8 h-8 object-cover rounded-lg border-2 border-emerald-500 shadow-md" />
                      );
                    })}
                  </div>
                  <span className="text-[9px] font-bold text-emerald-400 uppercase w-12 shrink-0 text-right">PICK</span>
                </div>
              )}

              {state.guestSnipes && state.guestSnipes.length > 0 && (
                <div className="flex items-center justify-end gap-2">
                  <div className="flex flex-wrap gap-1 justify-end">
                    {state.guestSnipes.map(id => {
                      const c = getCivObj(id);
                      return (
                        <img key={`gsnipe-${id}`} src={c.flag} alt={c.name} title={`SNIPE: ${c.name}`} className="w-7 h-7 object-cover rounded-md border border-purple-500/50 opacity-70" />
                      );
                    })}
                  </div>
                  <span className="text-[9px] font-bold text-purple-400 uppercase w-12 shrink-0 text-right">SNIPE</span>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Main Pick/Ban/Snipe Grid for Civilizations - Full-Bleed Flag Cards (Max 2 Rows) */}
      {(!currentTurn || currentTurn.target === 'CIV') && (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Swords size={16} className="text-cyan-400" /> Civiltà Disponibili
            </h3>
            {isMyTurn && room.status === 'in_progress' && (
              <span className="text-xs font-bold text-cyan-400">
                Clicca su una civiltà per selezionare
              </span>
            )}
          </div>

          {/* Grid Layout: Max 2 Rows on Desktop (e.g. 10 to 12 civs per row) */}
          <div className="grid grid-cols-3 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-11 gap-2.5">
            {civilizationsData.map((civ) => {
              const isHostPick = state.hostPicks?.includes(civ.id);
              const isGuestPick = state.guestPicks?.includes(civ.id);
              const isHostBan = state.hostBans?.includes(civ.id);
              const isGuestBan = state.guestBans?.includes(civ.id);
              const isHostSnipe = state.hostSnipes?.includes(civ.id);
              const isGuestSnipe = state.guestSnipes?.includes(civ.id);

              const isUsed = isHostPick || isGuestPick || isHostBan || isGuestBan || isHostSnipe || isGuestSnipe;

              const isClickable = isMyTurn && !isUsed && room.status === 'in_progress';

              return (
                <button
                  key={civ.id}
                  type="button"
                  disabled={!isClickable}
                  onClick={() => executeAction(civ.id)}
                  className={`group relative overflow-hidden rounded-2xl border aspect-[4/3] w-full flex items-end justify-center transition-all duration-300 shadow-md ${
                    isUsed
                      ? 'border-slate-800/80 bg-slate-950/90 cursor-not-allowed'
                      : isClickable
                      ? 'border-slate-700/80 hover:border-cyan-400 hover:scale-105 cursor-pointer'
                      : 'border-slate-800/60 opacity-60'
                  }`}
                >
                  {/* Flag Image Fills Entire Card Area (Grayscale when used) */}
                  <img
                    src={civ.flag}
                    alt={civ.name}
                    className={`absolute inset-0 w-full h-full object-cover transition-all duration-500 ${
                      isUsed ? 'grayscale opacity-40' : 'group-hover:scale-110'
                    }`}
                  />

                  {/* Gradient Overlay for Legibility */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent pointer-events-none" />

                  {/* Civ Name Label Over Flag */}
                  <span className={`relative z-10 text-[10px] sm:text-xs font-bold px-1.5 py-0.5 mb-1 text-center drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] truncate w-full ${
                    isUsed ? 'text-slate-400 line-through' : 'text-white'
                  }`}>
                    {civ.name}
                  </span>

                  {/* Overlays for Picked, Banned or Sniped */}
                  {isHostPick && (
                    <div className="absolute top-1.5 right-1.5 bg-red-600/90 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded shadow border border-red-400/50">
                      PICKED (P1)
                    </div>
                  )}
                  {isGuestPick && (
                    <div className="absolute top-1.5 right-1.5 bg-blue-600/90 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded shadow border border-blue-400/50">
                      PICKED (P2)
                    </div>
                  )}
                  {(isHostSnipe || isGuestSnipe) && (
                    <div className="absolute inset-0 bg-purple-950/75 flex flex-col items-center justify-center gap-0.5 text-purple-200 backdrop-blur-[1px]">
                      <Target size={26} className="stroke-[2.5]" />
                      <span className="text-[9px] font-extrabold uppercase tracking-wider">SNIPED</span>
                    </div>
                  )}
                  {(isHostBan || isGuestBan) && (
                    <div className="absolute inset-0 bg-black/65 flex flex-col items-center justify-center gap-0.5 text-red-400 backdrop-blur-[1px]">
                      <X size={28} className="stroke-[3]" />
                      <span className="text-[9px] font-extrabold uppercase tracking-wider">BANNED</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Pick/Ban Grid for Maps */}
      {currentTurn && currentTurn.target === 'MAP' && (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Monitor size={16} className="text-cyan-400" /> Mappe Disponibili
            </h3>
            {isMyTurn && room.status === 'in_progress' && (
              <span className="text-xs font-bold text-cyan-400">
                Clicca su una mappa per selezionare
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {AOE4_MAPS.slice(0, 24).map((mapName) => {
              const isMapPicked = state.mapPicks?.includes(mapName);
              const isMapBanned = state.mapBans?.includes(mapName);
              const isUsed = isMapPicked || isMapBanned;
              const isClickable = isMyTurn && !isUsed && room.status === 'in_progress';

              return (
                <button
                  key={mapName}
                  type="button"
                  disabled={!isClickable}
                  onClick={() => executeAction(mapName)}
                  className={`group relative overflow-hidden rounded-2xl border p-3 flex flex-col items-center justify-center gap-2 transition-all duration-300 ${
                    isMapPicked
                      ? 'bg-emerald-950/80 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.4)]'
                      : isMapBanned
                      ? 'bg-red-950/40 border-red-500/40 opacity-50 grayscale'
                      : isClickable
                      ? 'bg-slate-900/90 border-slate-700 hover:border-cyan-400 hover:scale-105 cursor-pointer'
                      : 'bg-slate-950/40 border-slate-800 opacity-60'
                  }`}
                >
                  <img
                    src={`/maps/${mapName}.png`}
                    onError={(e) => { (e.target as any).src = '/header-bg.png'; }}
                    alt={mapName}
                    className="w-full h-24 object-cover rounded-xl shadow-md"
                  />
                  <span className="text-xs font-bold text-slate-100 text-center">
                    {mapName}
                  </span>

                  {isMapPicked && (
                    <div className="absolute top-2 right-2 bg-emerald-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded shadow">
                      PICKED
                    </div>
                  )}
                  {isMapBanned && (
                    <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-red-400">
                      <X size={36} className="stroke-[3]" />
                      <span className="text-[10px] font-extrabold">BANNED</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
