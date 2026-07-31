import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Swords, Users, Shield, Clock, Eye, Check, X, RefreshCcw, Copy, Monitor, Trophy } from 'lucide-react';
import { draftService } from '../services/draftService';
import type { DraftRoom, DraftTurn } from '../services/draftService';
import { civilizationsData } from '../data/aoe4Data';
import { AOE4_MAPS } from '../data/aoe4Maps';
import { Toast } from './Toast';

type UserRole = 'HOST' | 'GUEST' | 'SPECTATOR';

export function DraftRoomPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();

  const [room, setRoom] = useState<DraftRoom | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<UserRole>(() => {
    return (sessionStorage.getItem(`draft_role_${roomId}`) as UserRole) || 'SPECTATOR';
  });

  const [timeLeft, setTimeLeft] = useState(30);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
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
      }
    } catch (err) {
      console.error('Error loading room:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectRole = (chosenRole: UserRole) => {
    setRole(chosenRole);
    if (roomId) {
      sessionStorage.setItem(`draft_role_${roomId}`, chosenRole);
    }
  };

  // Get current turn info
  const turns: DraftTurn[] = room?.preset?.turns || [];
  const currentTurn: DraftTurn | undefined = turns[room?.current_step || 0];

  const isHostTurn = currentTurn?.player === 'HOST';
  const isGuestTurn = currentTurn?.player === 'GUEST';
  const isMyTurn = (role === 'HOST' && isHostTurn) || (role === 'GUEST' && isGuestTurn);

  // List of already picked/banned civs and maps
  const state = room?.state || { hostPicks: [], guestPicks: [], hostBans: [], guestBans: [], mapPicks: [], mapBans: [] };
  const allUsedCivs = useMemo(() => [
    ...state.hostPicks,
    ...state.guestPicks,
    ...state.hostBans,
    ...state.guestBans
  ], [state]);

  const allUsedMaps = useMemo(() => [
    ...state.mapPicks,
    ...state.mapBans
  ], [state]);

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

  // Handle random action on timeout
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

  // Start Draft (Move status from waiting to in_progress)
  const handleStartDraft = async () => {
    if (!room) return;
    const updated = await draftService.updateRoom(room.id, {
      status: 'in_progress',
      current_step: 0
    });
    if (updated) setRoom(updated);
  };

  // Execute Pick or Ban action
  const executeAction = async (itemId: string) => {
    if (!room || !currentTurn) return;

    const nextState = { ...room.state };
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
    setToastMessage('Link della stanza copiato!');
    setTimeout(() => setCopiedLink(false), 3000);
  };

  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center text-gray-300 gap-3">
        <RefreshCcw className="animate-spin text-yellow-500" size={36} />
        <p className="font-semibold text-lg">Caricamento Stanza Draft...</p>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center text-center p-6">
        <h2 className="text-2xl font-bold text-red-400 mb-2">Stanza Non Trovata</h2>
        <p className="text-gray-400 mb-6">La stanza draft non esiste o è scaduta.</p>
        <button onClick={() => navigate('/')} className="px-6 py-2 bg-yellow-500 text-black font-bold rounded-xl">
          Torna alla Home
        </button>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isOverlayMode ? 'bg-black/95 text-white' : 'bg-transparent text-white'} p-3 sm:p-6 space-y-6 max-w-7xl mx-auto`}>
      {toastMessage && (
        <Toast
          message={toastMessage}
          type="success"
          isVisible={!!toastMessage}
          onClose={() => setToastMessage(null)}
        />
      )}

      {/* Role Selection Modal (No PIN, simple choice) */}
      {!role && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-yellow-500/40 rounded-3xl p-6 sm:p-8 max-w-md w-full text-center space-y-6 shadow-2xl">
            <div className="w-16 h-16 bg-yellow-500/10 border border-yellow-500/30 rounded-2xl flex items-center justify-center mx-auto text-yellow-400">
              <Users size={32} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Scegli il tuo Ruolo</h2>
              <p className="text-sm text-gray-400 mt-1">Stanza Match: <strong className="text-yellow-400">{room.title}</strong></p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => handleSelectRole('HOST')}
                className="w-full py-3.5 px-4 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/40 font-bold rounded-2xl flex items-center justify-between transition-all"
              >
                <span>🔴 Gioca come {room.host_name || 'Host (Player 1)'}</span>
                <Shield size={18} />
              </button>

              <button
                onClick={() => handleSelectRole('GUEST')}
                className="w-full py-3.5 px-4 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/40 font-bold rounded-2xl flex items-center justify-between transition-all"
              >
                <span>🔵 Gioca come {room.guest_name || 'Guest (Player 2)'}</span>
                <Shield size={18} />
              </button>

              <button
                onClick={() => handleSelectRole('SPECTATOR')}
                className="w-full py-3.5 px-4 bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 font-bold rounded-2xl flex items-center justify-between transition-all"
              >
                <span>👁️ Entra come Spettatore / Streamer</span>
                <Eye size={18} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Control Top Bar */}
      {!isOverlayMode && (
        <div className="flex flex-wrap justify-between items-center gap-3 bg-gray-900/60 p-3.5 rounded-2xl border border-white/10 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 uppercase tracking-wider">
              {room.title}
            </span>
            <span className="text-xs text-gray-400 hidden sm:inline">
              Ruolo attuale: <strong className={role === 'HOST' ? 'text-red-400' : role === 'GUEST' ? 'text-blue-400' : 'text-gray-300'}>{role}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyShareLink}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-200 rounded-xl text-xs font-bold border border-white/10 transition-all"
            >
              {copiedLink ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              <span>{copiedLink ? 'Copiato!' : 'Copia Link Stanza'}</span>
            </button>

            <button
              onClick={() => handleSelectRole(role === 'HOST' ? 'GUEST' : role === 'GUEST' ? 'SPECTATOR' : 'HOST')}
              className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl text-xs font-bold border border-white/10 transition-all"
            >
              Cambia Ruolo
            </button>

            <button
              onClick={() => setIsOverlayMode(!isOverlayMode)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 rounded-xl text-xs font-bold transition-all"
            >
              <Monitor size={14} />
              <span>Modalità Stream</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Status Header Banner */}
      <div className={`relative overflow-hidden rounded-3xl p-6 sm:p-8 border shadow-2xl transition-all ${
        room.status === 'completed'
          ? 'bg-gradient-to-r from-emerald-950/80 via-gray-900 to-emerald-950/80 border-emerald-500/50 shadow-[0_0_40px_rgba(16,185,129,0.2)]'
          : isMyTurn
          ? 'bg-gradient-to-r from-amber-950/90 via-gray-900 to-amber-950/90 border-yellow-500/80 shadow-[0_0_50px_rgba(212,175,55,0.4)] animate-pulse'
          : 'bg-gradient-to-r from-gray-900 via-gray-950 to-gray-900 border-white/10'
      }`}>
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">

          {/* Player 1 Host Badge */}
          <div className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${
            isHostTurn && room.status === 'in_progress' ? 'bg-red-500/20 border-red-500 ring-2 ring-red-500/50' : 'bg-black/40 border-white/5'
          }`}>
            <div className="w-12 h-12 rounded-xl bg-red-600/30 border border-red-500/50 flex items-center justify-center text-red-400 font-extrabold text-lg shrink-0">
              P1
            </div>
            <div>
              <span className="block text-[10px] font-bold text-red-400 uppercase tracking-widest">🔴 Host</span>
              <h3 className="text-lg font-bold text-white">{room.host_name}</h3>
              <div className="flex gap-1 mt-1">
                {state.hostPicks.map(id => (
                  <span key={id} className="text-[10px] px-1.5 py-0.5 bg-red-500/20 text-red-300 rounded border border-red-500/30 uppercase font-bold">
                    {id}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Center Status / Timer */}
          <div className="text-center space-y-2 max-w-md">
            {room.status === 'waiting' && (
              <div className="space-y-3">
                <span className="inline-block px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-xs font-bold uppercase tracking-wider">
                  Stanza Pronta
                </span>
                <h2 className="text-2xl font-bold text-white">In Attesa di Iniziare</h2>
                <button
                  onClick={handleStartDraft}
                  className="px-8 py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-extrabold rounded-2xl shadow-lg transition-all"
                >
                  AVVIA DRAFT MATCH
                </button>
              </div>
            )}

            {room.status === 'in_progress' && currentTurn && (
              <div className="space-y-3">
                <div className="flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-400">
                  <span>Step {room.current_step + 1} di {turns.length}</span>
                  <span>•</span>
                  <span className={currentTurn.player === 'HOST' ? 'text-red-400' : 'text-blue-400'}>
                    {currentTurn.player}
                  </span>
                </div>

                <h2 className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${
                  isMyTurn ? 'text-yellow-400 animate-bounce' : 'text-white'
                }`}>
                  {isMyTurn ? (
                    `⚡ É IL TUO TURNO! ${currentTurn.action === 'BAN' ? 'BANNA 1' : 'PICCA 1'} ${currentTurn.target}`
                  ) : (
                    `⏳ Turno di ${currentTurn.player === 'HOST' ? room.host_name : room.guest_name} (${currentTurn.action})`
                  )}
                </h2>

                {/* Timer Bar */}
                <div className="w-full max-w-xs mx-auto space-y-1">
                  <div className="flex justify-between items-center text-xs font-bold text-gray-300">
                    <span className="flex items-center gap-1"><Clock size={14} className="text-yellow-500" /> Timer</span>
                    <span className={timeLeft <= 5 ? 'text-red-400 font-extrabold text-sm' : 'text-yellow-400'}>{timeLeft}s</span>
                  </div>
                  <div className="w-full h-2.5 bg-black/60 rounded-full overflow-hidden border border-white/10">
                    <div
                      className={`h-full transition-all duration-1000 ${
                        timeLeft <= 5 ? 'bg-red-500' : timeLeft <= 10 ? 'bg-amber-400' : 'bg-emerald-400'
                      }`}
                      style={{ width: `${(timeLeft / 30) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            {room.status === 'completed' && (
              <div className="space-y-2">
                <Trophy className="mx-auto text-yellow-400" size={36} />
                <h2 className="text-2xl font-extrabold text-white">DRAFT COMPLETATO!</h2>
                <p className="text-xs text-gray-400">Tutti i turni sono stati effettuati con successo.</p>
              </div>
            )}
          </div>

          {/* Player 2 Guest Badge */}
          <div className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${
            isGuestTurn && room.status === 'in_progress' ? 'bg-blue-500/20 border-blue-500 ring-2 ring-blue-500/50' : 'bg-black/40 border-white/5'
          }`}>
            <div>
              <span className="block text-[10px] font-bold text-blue-400 uppercase tracking-widest text-right">🔵 Guest</span>
              <h3 className="text-lg font-bold text-white text-right">{room.guest_name}</h3>
              <div className="flex gap-1 mt-1 justify-end">
                {state.guestPicks.map(id => (
                  <span key={id} className="text-[10px] px-1.5 py-0.5 bg-blue-500/20 text-blue-300 rounded border border-blue-500/30 uppercase font-bold">
                    {id}
                  </span>
                ))}
              </div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-600/30 border border-blue-500/50 flex items-center justify-center text-blue-400 font-extrabold text-lg shrink-0">
              P2
            </div>
          </div>

        </div>
      </div>

      {/* Main Pick/Ban Grid for Civilizations */}
      {(!currentTurn || currentTurn.target === 'CIV') && (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-300 flex items-center gap-2">
              <Swords size={18} className="text-yellow-500" /> Civiltà di Age of Empires IV
            </h3>
            {isMyTurn && (
              <span className="text-xs font-bold text-yellow-400 animate-pulse">
                Clicca su una civiltà per confermare la tua scelta
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {civilizationsData.map((civ) => {
              const isHostPick = state.hostPicks.includes(civ.id);
              const isGuestPick = state.guestPicks.includes(civ.id);
              const isHostBan = state.hostBans.includes(civ.id);
              const isGuestBan = state.guestBans.includes(civ.id);
              const isUsed = isHostPick || isGuestPick || isHostBan || isGuestBan;

              const isClickable = isMyTurn && !isUsed && room.status === 'in_progress';

              return (
                <button
                  key={civ.id}
                  disabled={!isClickable}
                  onClick={() => executeAction(civ.id)}
                  className={`group relative overflow-hidden rounded-2xl border p-3 flex flex-col items-center justify-center gap-2 transition-all duration-300 aspect-square ${
                    isHostPick
                      ? 'bg-red-950/80 border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.4)]'
                      : isGuestPick
                      ? 'bg-blue-950/80 border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.4)]'
                      : isHostBan
                      ? 'bg-red-950/40 border-red-500/40 opacity-50 grayscale'
                      : isGuestBan
                      ? 'bg-blue-950/40 border-blue-500/40 opacity-50 grayscale'
                      : isClickable
                      ? 'bg-gray-900/80 border-white/20 hover:border-yellow-400 hover:scale-105 shadow-md cursor-pointer'
                      : 'bg-gray-900/40 border-white/5 opacity-60'
                  }`}
                >
                  <img
                    src={civ.flag}
                    alt={civ.name}
                    className="w-14 h-14 object-cover rounded-xl shadow-md group-hover:scale-110 transition-transform"
                  />
                  <span className="text-xs font-bold text-white text-center line-clamp-1">
                    {civ.name}
                  </span>

                  {/* Overlays */}
                  {isHostPick && (
                    <div className="absolute top-2 right-2 bg-red-600 text-white text-[10px] font-extrabold px-1.5 py-0.5 rounded shadow">
                      PICK (P1)
                    </div>
                  )}
                  {isGuestPick && (
                    <div className="absolute top-2 right-2 bg-blue-600 text-white text-[10px] font-extrabold px-1.5 py-0.5 rounded shadow">
                      PICK (P2)
                    </div>
                  )}
                  {(isHostBan || isGuestBan) && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px] flex flex-col items-center justify-center gap-1 text-red-400">
                      <X size={36} className="stroke-[3]" />
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-red-300">
                        BAN ({isHostBan ? 'P1' : 'P2'})
                      </span>
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
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-300 flex items-center gap-2">
              <Monitor size={18} className="text-yellow-500" /> Mappe di Age of Empires IV
            </h3>
            {isMyTurn && (
              <span className="text-xs font-bold text-yellow-400 animate-pulse">
                Clicca su una mappa per confermare la tua scelta
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {AOE4_MAPS.slice(0, 24).map((mapName) => {
              const isMapPicked = state.mapPicks.includes(mapName);
              const isMapBanned = state.mapBans.includes(mapName);
              const isUsed = isMapPicked || isMapBanned;
              const isClickable = isMyTurn && !isUsed && room.status === 'in_progress';

              return (
                <button
                  key={mapName}
                  disabled={!isClickable}
                  onClick={() => executeAction(mapName)}
                  className={`group relative overflow-hidden rounded-2xl border p-3 flex flex-col items-center justify-center gap-2 transition-all duration-300 ${
                    isMapPicked
                      ? 'bg-emerald-950/80 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.4)]'
                      : isMapBanned
                      ? 'bg-red-950/40 border-red-500/40 opacity-50 grayscale'
                      : isClickable
                      ? 'bg-gray-900/80 border-white/20 hover:border-yellow-400 hover:scale-105 cursor-pointer'
                      : 'bg-gray-900/40 border-white/5 opacity-60'
                  }`}
                >
                  <img
                    src={`/maps/${mapName}.png`}
                    onError={(e) => { (e.target as any).src = '/header-bg.png'; }}
                    alt={mapName}
                    className="w-full h-24 object-cover rounded-xl shadow-md"
                  />
                  <span className="text-xs font-bold text-white text-center">
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
