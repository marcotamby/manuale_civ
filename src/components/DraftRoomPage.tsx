import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Swords, Users, Shield, Clock, Eye, Check, X, RefreshCcw, Copy, Monitor, Trophy, Target, Lock, Search, Loader2 } from 'lucide-react';
import { draftService } from '../services/draftService';
import type { DraftRoom, DraftTurn, TurnAction } from '../services/draftService';
import { civilizationsData } from '../data/aoe4Data';
import { AOE4_MAPS } from '../data/aoe4Maps';

type UserRole = 'HOST' | 'GUEST' | 'SPECTATOR';

export function DraftRoomPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();

  const [room, setRoom] = useState<DraftRoom | null>(null);
  const [loading, setLoading] = useState(true);
  const [mapSearchQuery, setMapSearchQuery] = useState('');

  // Read stored role for this specific room ID
  const [role, setRole] = useState<UserRole | null>(() => {
    return (sessionStorage.getItem(`draft_role_${roomId}`) as UserRole) || null;
  });

  const [joiningRole, setJoiningRole] = useState<UserRole | null>(null);
  const [joiningName, setJoiningName] = useState('');

  const [timeLeft, setTimeLeft] = useState(30);
  const [isOverlayMode, setIsOverlayMode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const adminProcessingRef = useRef<number | null>(null);

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
          setJoiningName(data.guest_name && data.guest_name !== 'Giocatore 2' ? data.guest_name : 'Giocatore 2');
        } else if (!data.state?.hostClaimed && data.state?.guestClaimed) {
          setJoiningRole('HOST');
          setJoiningName(data.host_name && data.host_name !== 'Giocatore 1' ? data.host_name : 'Giocatore 1');
        } else {
          setJoiningRole(null);
          setJoiningName('');
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
    mapBans: [],
    hostMapPicks: [],
    guestMapPicks: [],
    hostMapBans: [],
    guestMapBans: [],
    adminMapPicks: [],
    mapPool: []
  };

  const hostClaimed = !!state.hostClaimed;
  const guestClaimed = !!state.guestClaimed;
  const hostReady = !!state.hostReady;
  const guestReady = !!state.guestReady;

  // Turn details
  const turns: DraftTurn[] = room?.preset?.turns || [];
  const currentStep = room?.current_step || 0;
  const currentTurn: DraftTurn | undefined = turns[currentStep];

  const activeMapPool = useMemo(() => {
    if (state.mapPool && Array.isArray(state.mapPool) && state.mapPool.length > 0) {
      return state.mapPool;
    }
    return (room?.preset?.map_pool && room.preset.map_pool.length > 0)
      ? room.preset.map_pool
      : AOE4_MAPS;
  }, [room?.preset?.map_pool, state.mapPool]);

  // Compute final remaining active (non-sniped) civs for each player
  const hostFinalCivs = useMemo(() => {
    return (state.hostPicks || []).filter(id => !(state.hostSnipes || []).includes(id));
  }, [state.hostPicks, state.hostSnipes]);

  const guestFinalCivs = useMemo(() => {
    return (state.guestPicks || []).filter(id => !(state.guestSnipes || []).includes(id));
  }, [state.guestPicks, state.guestSnipes]);

  const isSingleCivMatchup = room?.status === 'completed' && hostFinalCivs.length === 1 && guestFinalCivs.length === 1;

  const hasAnimatedFinalVSRef = useRef(false);

  useEffect(() => {
    if (isSingleCivMatchup && !hasAnimatedFinalVSRef.current) {
      hasAnimatedFinalVSRef.current = true;
      const timer = setTimeout(() => {
        triggerFinalVSFlight(hostFinalCivs[0], guestFinalCivs[0]);
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [isSingleCivMatchup, hostFinalCivs, guestFinalCivs]);

  const triggerFinalVSFlight = (hostCivId: string, guestCivId: string) => {
    try {
      const hostStart = document.getElementById(`hpick-${hostCivId}`) || document.getElementById('host-pick-container');
      const guestStart = document.getElementById(`gpick-${guestCivId}`) || document.getElementById('guest-pick-container');
      const hostEnd = document.getElementById('final-matchup-p1');
      const guestEnd = document.getElementById('final-matchup-p2');

      const c1 = getCivObj(hostCivId);
      const c2 = getCivObj(guestCivId);

      if (hostStart && hostEnd && c1) {
        animateFlightBetween(hostStart, hostEnd, c1.flag, '#ef4444');
      }
      if (guestStart && guestEnd && c2) {
        animateFlightBetween(guestStart, guestEnd, c2.flag, '#3b82f6');
      }
    } catch (e) {
      console.error('Final VS Flight Error:', e);
    }
  };

  const animateFlightBetween = (startEl: HTMLElement, endEl: HTMLElement, imgSrc: string, borderColor: string) => {
    const startRect = startEl.getBoundingClientRect();
    const endRect = endEl.getBoundingClientRect();

    const flyer = document.createElement('div');
    flyer.style.position = 'fixed';
    flyer.style.zIndex = '999999';
    flyer.style.left = `${startRect.left}px`;
    flyer.style.top = `${startRect.top}px`;
    flyer.style.width = `${startRect.width}px`;
    flyer.style.height = `${startRect.height}px`;
    flyer.style.borderRadius = '1rem';
    flyer.style.overflow = 'hidden';
    flyer.style.pointerEvents = 'none';
    flyer.style.transition = 'all 0.9s cubic-bezier(0.16, 1, 0.3, 1)';
    flyer.style.boxShadow = `0 0 35px ${borderColor}, 0 0 15px ${borderColor}`;
    flyer.style.border = `3px solid ${borderColor}`;

    const img = document.createElement('img');
    img.src = imgSrc;
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.objectFit = 'cover';

    flyer.appendChild(img);
    document.body.appendChild(flyer);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        flyer.style.left = `${endRect.left}px`;
        flyer.style.top = `${endRect.top}px`;
        flyer.style.width = `${endRect.width}px`;
        flyer.style.height = `${endRect.height}px`;
        flyer.style.transform = 'scale(1.05)';
        flyer.style.opacity = '0.95';
      });
    });

    setTimeout(() => {
      if (flyer.parentNode) {
        flyer.parentNode.removeChild(flyer);
      }
    }, 920);
  };

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

  const hasRevealBans = useMemo(() => turns.some(t => t.action === 'REVEAL_BANS' || t.action === 'REVEAL_ALL'), [turns]);
  const hasRevealPicks = useMemo(() => turns.some(t => t.action === 'REVEAL_PICKS' || t.action === 'REVEAL_ALL'), [turns]);

  const isHostTurn = currentTurn?.player === 'HOST';
  const isGuestTurn = currentTurn?.player === 'GUEST';
  const isAdminTurn = currentTurn?.player === 'ADMIN';
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

  // Admin Turn Auto Execution Effect
  useEffect(() => {
    if (!room || room.status !== 'in_progress' || !currentTurn || currentTurn.player !== 'ADMIN') return;
    if (adminProcessingRef.current === room.current_step) return;

    adminProcessingRef.current = room.current_step;

    const timer = setTimeout(async () => {
      const nextState = {
        ...state,
        mapPicks: [...(state.mapPicks || [])],
        mapBans: [...(state.mapBans || [])],
        hostMapPicks: [...(state.hostMapPicks || [])],
        guestMapPicks: [...(state.guestMapPicks || [])],
        hostMapBans: [...(state.hostMapBans || [])],
        guestMapBans: [...(state.guestMapBans || [])],
        adminMapPicks: [...(state.adminMapPicks || [])]
      };
      let shouldUpdate = false;

      if (currentTurn.action === 'AUTO_PICK_LAST_MAP') {
        const used = [...(nextState.mapPicks || []), ...(nextState.mapBans || [])];
        const remaining = activeMapPool.filter(m => !used.includes(m));
        if (remaining.length > 0) {
          const mapToPick = remaining[0];
          nextState.mapPicks.push(mapToPick);
          nextState.adminMapPicks.push(mapToPick);
        }
        shouldUpdate = true;
      } else if (currentTurn.action === 'REVEAL_BANS') {
        nextState.revealedBans = true;
        shouldUpdate = true;
      } else if (currentTurn.action === 'REVEAL_PICKS') {
        nextState.revealedPicks = true;
        shouldUpdate = true;
      } else if (currentTurn.action === 'REVEAL_ALL') {
        nextState.revealedBans = true;
        nextState.revealedPicks = true;
        shouldUpdate = true;
      }

      if (shouldUpdate) {
        const nextStepIndex = room.current_step + 1;
        const isCompleted = nextStepIndex >= turns.length;
        const updated = await draftService.updateRoom(room.id, {
          state: nextState,
          current_step: isCompleted ? room.current_step : nextStepIndex,
          status: isCompleted ? 'completed' : 'in_progress'
        });
        if (updated) setRoom(updated);
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [room?.current_step, room?.status, currentTurn, activeMapPool, state, turns]);

  // Random action on timeout
  const handleAutoRandomAction = () => {
    if (!currentTurn || !room) return;

    if (currentTurn.target === 'CIV') {
      if (currentTurn.action === 'SNIPE') {
        const opponentPicks = currentTurn.player === 'HOST' ? state.guestPicks : state.hostPicks;
        if (opponentPicks && opponentPicks.length > 0) {
          const randomCivId = opponentPicks[Math.floor(Math.random() * opponentPicks.length)];
          executeAction(randomCivId);
        }
      } else {
        const available = civilizationsData.filter(c => !allUsedCivs.includes(c.id));
        if (available.length > 0) {
          const randomCiv = available[Math.floor(Math.random() * available.length)];
          executeAction(randomCiv.id);
        }
      }
    } else if (currentTurn.target === 'MAP') {
      const available = activeMapPool.filter(m => !allUsedMaps.includes(m));
      if (available.length > 0) {
        const randomMap = available[Math.floor(Math.random() * available.length)];
        executeAction(randomMap);
      }
    }
  };

  // Helper function to animate flying card/flag to target header slot
  const triggerFlyAnimation = (itemId: string, target: 'CIV' | 'MAP', player: 'HOST' | 'GUEST' | 'ADMIN', action: TurnAction) => {
    try {
      const cardId = target === 'CIV' ? `civ-card-${itemId}` : `map-card-${itemId}`;
      const startEl = document.getElementById(cardId);
      if (!startEl) return;

      let targetContainerId = '';
      if (player === 'HOST') {
        targetContainerId = action === 'BAN' ? 'guest-ban-container' : 'host-pick-container';
      } else if (player === 'GUEST') {
        targetContainerId = action === 'BAN' ? 'host-ban-container' : 'guest-pick-container';
      } else if (player === 'ADMIN') {
        targetContainerId = 'admin-map-container';
      }

      const targetEl = document.getElementById(targetContainerId);
      if (!targetEl) return;

      const startRect = startEl.getBoundingClientRect();
      const targetRect = targetEl.getBoundingClientRect();

      let imgSrc = '';
      if (target === 'CIV') {
        const c = civilizationsData.find(item => item.id === itemId);
        imgSrc = c ? c.flag : '';
      } else {
        imgSrc = `/maps/${itemId}.png`;
      }
      if (!imgSrc) return;

      const flyer = document.createElement('div');
      flyer.style.position = 'fixed';
      flyer.style.zIndex = '999999';
      flyer.style.left = `${startRect.left}px`;
      flyer.style.top = `${startRect.top}px`;
      flyer.style.width = `${startRect.width}px`;
      flyer.style.height = `${startRect.height}px`;
      flyer.style.borderRadius = '1rem';
      flyer.style.overflow = 'hidden';
      flyer.style.pointerEvents = 'none';
      flyer.style.transition = 'all 0.85s cubic-bezier(0.16, 1, 0.3, 1)';
      flyer.style.boxShadow = action === 'BAN'
        ? '0 0 30px rgba(239, 68, 68, 0.95), 0 0 12px rgba(239, 68, 68, 0.7)'
        : '0 0 30px rgba(16, 185, 129, 0.95), 0 0 12px rgba(16, 185, 129, 0.7)';
      flyer.style.border = action === 'BAN' ? '3px solid #ef4444' : '3px solid #10b981';

      const img = document.createElement('img');
      img.src = imgSrc;
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.objectFit = 'cover';
      if (action === 'BAN') {
        img.style.filter = 'grayscale(0.6)';
      }

      flyer.appendChild(img);
      document.body.appendChild(flyer);

      const isRightAligned = player === 'GUEST';
      const endX = isRightAligned
        ? Math.max(targetRect.left, targetRect.right - 50)
        : targetRect.left + Math.max(0, targetRect.width - 50);
      const endY = targetRect.top + Math.max(0, (targetRect.height - 44) / 2);

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          flyer.style.left = `${endX}px`;
          flyer.style.top = `${endY}px`;
          flyer.style.width = '44px';
          flyer.style.height = '44px';
          flyer.style.transform = action === 'BAN' ? 'scale(0.85) rotate(-12deg)' : 'scale(1) rotate(6deg)';
          flyer.style.opacity = '0.9';
        });
      });

      setTimeout(() => {
        if (flyer.parentNode) {
          flyer.parentNode.removeChild(flyer);
        }
      }, 880);
    } catch (e) {
      console.error('Fly animation error:', e);
    }
  };

  // Execute Pick, Ban, or Snipe action
  const executeAction = async (itemId: string) => {
    if (!room || !currentTurn) return;

    const player = currentTurn.player;
    const action = currentTurn.action;
    const target = currentTurn.target;

    triggerFlyAnimation(itemId, target, player, action);

    const banMode = currentTurn.banMode || 'GLOBAL';
    const isHidden = currentTurn.isHidden;

    const nextState = {
      ...state,
      hostPicks: [...(state.hostPicks || [])],
      guestPicks: [...(state.guestPicks || [])],
      hostBans: [...(state.hostBans || [])],
      guestBans: [...(state.guestBans || [])],
      hostSnipes: [...(state.hostSnipes || [])],
      guestSnipes: [...(state.guestSnipes || [])],
      mapPicks: [...(state.mapPicks || [])],
      mapBans: [...(state.mapBans || [])],
      hostMapPicks: [...(state.hostMapPicks || [])],
      guestMapPicks: [...(state.guestMapPicks || [])],
      hostMapBans: [...(state.hostMapBans || [])],
      guestMapBans: [...(state.guestMapBans || [])],
      adminMapPicks: [...(state.adminMapPicks || [])],
      banModes: { ...(state.banModes || {}) },
      hiddenPicks: [...(state.hiddenPicks || [])],
      hiddenBans: [...(state.hiddenBans || [])]
    };

    if (action === 'BAN') {
      nextState.banModes[itemId] = banMode;
      if (isHidden && !nextState.hiddenBans.includes(itemId)) {
        nextState.hiddenBans.push(itemId);
      }
    } else if (action === 'PICK' && isHidden && !nextState.hiddenPicks.includes(itemId)) {
      nextState.hiddenPicks.push(itemId);
    }

    if (target === 'CIV') {
      if (action === 'PICK') {
        if (player === 'HOST') nextState.hostPicks.push(itemId);
        else nextState.guestPicks.push(itemId);
      } else if (action === 'BAN') {
        if (player === 'HOST') nextState.guestBans.push(itemId);
        else nextState.hostBans.push(itemId);
      } else if (action === 'SNIPE') {
        if (player === 'HOST') {
          if (!nextState.guestSnipes.includes(itemId)) nextState.guestSnipes.push(itemId);
          if (!nextState.guestPicks.includes(itemId)) nextState.guestPicks.push(itemId);
        } else {
          if (!nextState.hostSnipes.includes(itemId)) nextState.hostSnipes.push(itemId);
          if (!nextState.hostPicks.includes(itemId)) nextState.hostPicks.push(itemId);
        }
      }
    } else if (target === 'MAP') {
      if (action === 'PICK') {
        nextState.mapPicks.push(itemId);
        if (player === 'HOST') {
          nextState.hostMapPicks.push(itemId);
        } else if (player === 'GUEST') {
          nextState.guestMapPicks.push(itemId);
        } else if (player === 'ADMIN') {
          nextState.adminMapPicks.push(itemId);
        }
      } else if (action === 'BAN') {
        nextState.mapBans.push(itemId);
        if (player === 'HOST') {
          nextState.hostMapBans.push(itemId);
        } else if (player === 'GUEST') {
          nextState.guestMapBans.push(itemId);
        }
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

  const executeAdminAction = async (action: TurnAction) => {
    if (!room || !currentTurn) return;

    const nextState = {
      ...state,
      hostPicks: [...(state.hostPicks || [])],
      guestPicks: [...(state.guestPicks || [])],
      hostBans: [...(state.hostBans || [])],
      guestBans: [...(state.guestBans || [])],
      mapPicks: [...(state.mapPicks || [])],
      mapBans: [...(state.mapBans || [])],
      adminMapPicks: [...(state.adminMapPicks || [])]
    };

    if (action === 'REVEAL_BANS') {
      nextState.revealedBans = true;
    } else if (action === 'REVEAL_PICKS') {
      nextState.revealedPicks = true;
    } else if (action === 'REVEAL_ALL') {
      nextState.revealedBans = true;
      nextState.revealedPicks = true;
    } else if (action === 'AUTO_PICK_LAST_MAP') {
      const remainingMaps = activeMapPool.filter(m => !nextState.mapPicks.includes(m) && !nextState.mapBans.includes(m));
      if (remainingMaps.length > 0) {
        nextState.mapPicks.push(remainingMaps[0]);
        nextState.adminMapPicks.push(remainingMaps[0]);
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

  // Auto-execute Admin turns (REVEAL_BANS, REVEAL_PICKS, REVEAL_ALL, AUTO_PICK_LAST_MAP) after 2.5s delay
  useEffect(() => {
    if (!isAdminTurn || room?.status !== 'in_progress' || !currentTurn) return;

    const isPrimaryClient = role === 'HOST' || (!state.hostClaimed && role === 'GUEST') || role === 'SPECTATOR';
    if (!isPrimaryClient) return;

    const timer = setTimeout(() => {
      executeAdminAction(currentTurn.action);
    }, 2500);

    return () => clearTimeout(timer);
  }, [isAdminTurn, room?.status, currentTurn, currentStep, role, state.hostClaimed]);

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
    <div className={`min-h-screen ${isOverlayMode ? 'bg-black/95 text-white' : 'bg-transparent text-white'} p-2.5 sm:p-5 space-y-4 sm:space-y-6 max-w-7xl mx-auto font-sans`}>
      
      {/* Floating Exit Button for Overlay/Stream Mode */}


      {/* Role Claim Modal */}
      {!role && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 bg-black/85 backdrop-blur-md overflow-y-auto">
          <div className="bg-[#0b101e] border border-slate-700/60 rounded-3xl p-5 sm:p-8 max-w-md w-[95%] text-center space-y-5 shadow-2xl my-auto max-h-[92vh] overflow-y-auto no-scrollbar">
            <div className="w-14 h-14 bg-slate-800 border border-slate-700 rounded-2xl flex items-center justify-center mx-auto text-cyan-400">
              <Users size={28} />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Scegli il tuo Ruolo in Stanza</h2>
              <p className="text-xs text-slate-400 mt-1">Stanza Match: <strong className="text-cyan-400">{room.title}</strong></p>
            </div>

            <div className="space-y-3">
              {/* Host option */}
              <button
                disabled={hostClaimed}
                onClick={() => {
                  setJoiningRole('HOST');
                  if (!joiningName || joiningName === 'Giocatore 2') {
                    setJoiningName(room.host_name && room.host_name !== 'Giocatore 1' ? room.host_name : 'Giocatore 1');
                  }
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
                  if (!joiningName || joiningName === 'Giocatore 1') {
                    setJoiningName(room.guest_name && room.guest_name !== 'Giocatore 2' ? room.guest_name : 'Giocatore 2');
                  }
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
            {joiningRole && joiningRole !== 'SPECTATOR' && (
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
              disabled={!joiningRole}
              className={`w-full py-3.5 font-extrabold text-sm rounded-2xl transition-all ${
                joiningRole
                  ? 'bg-slate-200 hover:bg-white text-black shadow-lg cursor-pointer'
                  : 'bg-slate-800/80 text-slate-500 border border-slate-700/60 cursor-not-allowed opacity-50'
              }`}
            >
              CONFERMA ED ENTRA IN STANZA
            </button>
          </div>
        </div>
      )}

      {/* Control Top Row - Clean Pill Buttons */}
      <div className="flex flex-wrap justify-between items-center gap-2 px-1 py-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-extrabold px-3 py-1.5 rounded-full bg-[#0b101e] text-cyan-300 border border-slate-700 uppercase tracking-wider">
            {room.title}
          </span>
          <span className="text-xs text-slate-400 hidden sm:inline">
            Ruolo: <strong className={role === 'HOST' ? 'text-red-400 font-bold' : role === 'GUEST' ? 'text-blue-400 font-bold' : 'text-slate-300'}>{role}</strong>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyShareLink}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#0b101e] hover:bg-slate-800 text-slate-200 rounded-xl text-xs font-bold border border-slate-700/80 transition-all shadow-md"
          >
            {copiedLink ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            <span>{copiedLink ? '✓ Copiato!' : 'Copia Link Stanza'}</span>
          </button>

          <button
            onClick={() => {
              sessionStorage.removeItem(`draft_role_${roomId}`);
              setRole(null);
            }}
            className="px-3.5 py-1.5 bg-[#0b101e] hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-bold border border-slate-700/80 transition-all shadow-md"
          >
            Cambia Ruolo
          </button>

          <button
            onClick={() => setIsOverlayMode(!isOverlayMode)}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-md border ${
              isOverlayMode
                ? 'bg-purple-600 hover:bg-purple-500 text-white border-purple-400'
                : 'bg-purple-950/60 hover:bg-purple-900/60 text-purple-300 border-purple-500/40'
            }`}
          >
            {isOverlayMode ? <X size={14} /> : <Monitor size={14} />}
            <span>{isOverlayMode ? 'Esci da Modalità Stream' : 'Modalità Stream'}</span>
          </button>
        </div>
      </div>

      {/* Main Status Header - No Background Boxes Behind Player Headers */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6 items-stretch">

        {/* Player 1 Host Header (Clean Floating Layout) */}
        <div className={`md:col-span-4 flex flex-col justify-between gap-3 p-1 sm:p-2 transition-all ${
          isHostTurn && room.status === 'in_progress' ? 'border-l-4 border-red-500 pl-3' : ''
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-extrabold text-base shrink-0 shadow-md ${
              hostClaimed
                ? 'bg-red-600/30 border border-red-500/50 text-red-400'
                : 'bg-slate-900 border border-slate-700/60 text-slate-500 opacity-60'
            }`}>
              P1
            </div>
            <div className="overflow-hidden">
              <div className="flex items-center gap-2">
                <span className="block text-[10px] font-extrabold text-red-400 uppercase tracking-widest">🔴 Host</span>
                {hostClaimed && hostReady && (
                  <span className="text-[9px] font-extrabold px-1.5 py-0.2 bg-emerald-500/20 text-emerald-400 rounded border border-emerald-500/40">READY</span>
                )}
                {!hostClaimed && (
                  <span className="text-[9px] font-extrabold px-1.5 py-0.2 bg-amber-500/20 text-amber-400 rounded border border-amber-500/40 animate-pulse">
                    ⌛ IN ATTESA
                  </span>
                )}
              </div>
              {/* Player Name Font */}
              <h3 className={`text-2xl sm:text-3xl font-extrabold truncate tracking-tight ${
                hostClaimed ? 'text-white' : 'text-slate-500 italic animate-pulse'
              }`}>
                {hostClaimed ? room.host_name : 'In attesa...'}
              </h3>
            </div>
          </div>

          {/* Picked / Banned / Sniped Flags Rows */}
          <div className="space-y-2.5 pt-2.5 border-t border-slate-800/80">
            {room.preset?.scope !== 'maps' && (
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold text-red-400 uppercase w-12 shrink-0">BAN</span>
                <div id="host-ban-container" className="flex flex-wrap gap-1.5 min-h-[44px] items-center">
                  {state.hostBans && state.hostBans.length > 0 ? (
                    state.hostBans.map(id => {
                      const isHidden = (hasRevealBans || state.hiddenBans?.includes(id)) && !state.revealedBans && role !== 'HOST';
                      const c = getCivObj(id);
                      return isHidden ? (
                        <div key={`hban-${id}`} title="Ban Nascosto (In attesa del turno reveal)" className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-slate-900 border border-slate-700 flex flex-col items-center justify-center text-slate-400 shadow-md animate-pop-in">
                          <Lock size={16} />
                        </div>
                      ) : (
                        <img key={`hban-${id}`} src={c.flag} alt={c.name} title={`BAN: ${c.name}`} className="w-10 h-10 sm:w-11 sm:h-11 object-cover rounded-xl border-2 border-red-500/60 opacity-70 grayscale shadow-md animate-pop-in" />
                      );
                    })
                  ) : (
                    <span className="text-xs text-slate-600 italic">-</span>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold text-emerald-400 uppercase w-12 shrink-0">PICK</span>
              <div id="host-pick-container" className="flex flex-wrap gap-1.5 min-h-[44px] items-center">
                {room.preset?.scope === 'maps' ? (
                  state.hostMapPicks && state.hostMapPicks.length > 0 ? (
                    state.hostMapPicks.map((mapName, idx) => (
                      <div key={`hmap-${idx}`} title={`PICK MAPPA: ${mapName}`} className="relative w-10 h-10 sm:w-11 sm:h-11 overflow-hidden rounded-xl border-2 border-emerald-500 shadow-md animate-pop-in">
                        <img src={`/maps/${mapName}.png`} onError={(e) => { (e.target as any).src = '/header-bg.png'; }} alt={mapName} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/30" />
                      </div>
                    ))
                  ) : (
                    <span className="text-xs text-slate-600 italic">-</span>
                  )
                ) : (
                  state.hostPicks && state.hostPicks.length > 0 ? (
                    state.hostPicks.map(id => {
                      const isHidden = (hasRevealPicks || state.hiddenPicks?.includes(id)) && !state.revealedPicks && role !== 'HOST';
                      const isSelfHidden = (hasRevealPicks || state.hiddenPicks?.includes(id)) && !state.revealedPicks && role === 'HOST';
                      const c = getCivObj(id);
                      const isSniped = state.hostSnipes?.includes(id);
                      return isHidden ? (
                        <div key={`hpick-${id}`} title="Pick Nascosto (In attesa della rivelazione)" className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-purple-950/80 border border-purple-500/60 flex items-center justify-center text-purple-400 shadow-md animate-pop-in">
                          <Lock size={16} />
                        </div>
                      ) : (
                        <div key={`hpick-${id}`} className={`relative w-10 h-10 sm:w-11 sm:h-11 overflow-hidden rounded-xl border-2 shadow-md animate-pop-in ${
                          isSniped ? 'border-red-500/80 shadow-red-950/50' : 'border-emerald-500 shadow-emerald-950/40'
                        }`}>
                          <img src={c.flag} alt={c.name} title={isSniped ? `SNIPED: ${c.name}` : `PICK: ${c.name}`} className={`w-full h-full object-cover ${isSniped ? 'grayscale opacity-50' : ''}`} />
                          {isSelfHidden && (
                            <div className="absolute top-0.5 right-0.5 bg-purple-900/90 text-purple-200 p-0.5 rounded-full shadow border border-purple-400/80 z-10" title="Scelta Segreta (Nascosta all'avversario)">
                              <Lock size={10} />
                            </div>
                          )}
                          {isSniped && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-[0.5px]">
                              <span className="bg-red-600/90 text-white text-[8px] font-black uppercase tracking-tighter px-1.5 py-0.5 rotate-[-25deg] shadow-lg border border-red-400/80 whitespace-nowrap">
                                SNIPED
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <span className="text-xs text-slate-600 italic">-</span>
                  )
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Center Status / Timer Column (No Background Box) */}
        <div className="md:col-span-4 flex flex-col items-center justify-center text-center p-2 space-y-3">
          {room.status === 'waiting' && (
            <div className="space-y-3">
              <span className="inline-block px-3 py-1 bg-[#0b101e] text-slate-300 border border-slate-700/80 rounded-full text-xs font-bold uppercase tracking-wider shadow-md">
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
                  className={`px-7 py-3 rounded-2xl font-extrabold text-xs tracking-wider uppercase transition-all shadow-lg ${
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
            <div className="space-y-3 w-full">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-center gap-2">
                <span>Step {room.current_step + 1} di {turns.length} • {currentTurn.player === 'ADMIN' ? '👑 Turno Admin' : currentTurn.player === 'HOST' ? '🔴 Turno Host' : '🔵 Turno Guest'}</span>
                {currentTurn.isHidden && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-purple-950/80 border border-purple-500/60 rounded-full text-purple-300 font-extrabold text-[10px] uppercase tracking-wider animate-pulse">
                    <Lock size={11} className="text-purple-400" /> Nascosto
                  </span>
                )}
              </div>

              <div className={`px-4 py-2 rounded-2xl border text-sm font-bold tracking-tight inline-block shadow-md ${
                isAdminTurn
                  ? 'bg-amber-950/60 text-amber-300 border-amber-500/50'
                  : isMyTurn
                  ? 'bg-slate-800 text-cyan-300 border-cyan-500/50'
                  : 'bg-[#090e1a] text-slate-300 border-slate-800'
              }`}>
                {isAdminTurn ? (
                  <span className="flex items-center gap-2 text-amber-300 font-extrabold animate-pulse">
                    <Loader2 size={16} className="animate-spin text-amber-400 shrink-0" />
                    <span>
                      {currentTurn.action === 'AUTO_PICK_LAST_MAP'
                        ? '🗺️ Selezione ultima mappa in corso...'
                        : currentTurn.action === 'REVEAL_BANS'
                        ? '🔮 Rivelazione ban in corso...'
                        : currentTurn.action === 'REVEAL_PICKS'
                        ? '🔮 Rivelazione pick in corso...'
                        : '🔮 Rivelazione ban e pick in corso...'}
                    </span>
                  </span>
                ) : isMyTurn ? (
                  `Il tuo Turno: ${
                    currentTurn.action === 'BAN'
                      ? 'Banna 1 civiltà/mappa'
                      : currentTurn.action === 'SNIPE'
                      ? 'Effettua 1 SNIPE tra i pick dell\'avversario'
                      : 'Seleziona 1 civiltà/mappa per te'
                  }${currentTurn.isHidden ? ' (🔒 Scelta Segreta)' : ''}`
                ) : (
                  `Turno di ${currentTurn.player === 'HOST' ? room.host_name : room.guest_name} (${currentTurn.action})${currentTurn.isHidden ? ' (🔒 Scelta Segreta)' : ''}`
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
            <div className="space-y-4 w-full text-center">
              {isSingleCivMatchup ? (
                <div className="pt-2 pb-1">
                  <div className="flex items-center justify-center gap-3 sm:gap-5">
                    {/* P1 Final Civ Card */}
                    {(() => {
                      const c1 = getCivObj(hostFinalCivs[0]);
                      return (
                        <div id="final-matchup-p1" className="relative w-36 sm:w-48 aspect-[4/3] rounded-2xl overflow-hidden border-2 border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.45)] group transition-all animate-in fade-in zoom-in-75 duration-700">
                          <img src={c1.flag} alt={c1.name} title={c1.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                        </div>
                      );
                    })()}

                    {/* Center VS Badge */}
                    <div className="flex items-center justify-center shrink-0">
                      <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-amber-500 via-red-500 to-cyan-500 p-[2px] shadow-[0_0_30px_rgba(251,191,36,0.7)] animate-pulse">
                        <div className="w-full h-full bg-[#0b101e] rounded-[14px] flex items-center justify-center text-amber-400 font-black text-lg sm:text-2xl tracking-tighter">
                          VS
                        </div>
                      </div>
                    </div>

                    {/* P2 Final Civ Card */}
                    {(() => {
                      const c2 = getCivObj(guestFinalCivs[0]);
                      return (
                        <div id="final-matchup-p2" className="relative w-36 sm:w-48 aspect-[4/3] rounded-2xl overflow-hidden border-2 border-blue-500 shadow-[0_0_30px_rgba(59,130,246,0.45)] group transition-all animate-in fade-in zoom-in-75 duration-700">
                          <img src={c2.flag} alt={c2.name} title={c2.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                        </div>
                      );
                    })()}
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Trophy className="mx-auto text-cyan-400" size={32} />
                  <h2 className="text-xl font-extrabold text-white tracking-tight">DRAFT COMPLETATO</h2>
                  <p className="text-xs text-slate-400">Tutti i turni del match sono stati effettuati.</p>
                </div>
              )}
            </div>
          )}

          {/* Admin / Decider Picked Map Display (Large Center Card) */}
          {state.adminMapPicks && state.adminMapPicks.length > 0 && (
            <div className="w-full pt-3 pb-1 flex flex-col items-center space-y-2 animate-in fade-in zoom-in-95">
              <span className="text-[11px] font-black uppercase tracking-widest text-amber-400 flex items-center gap-1.5 px-3.5 py-1 bg-amber-950/60 border border-amber-500/50 rounded-full shadow-lg shadow-amber-950/40">
                👑 MAPPA DECIDER / RIMANENTE (ADMIN)
              </span>
              <div id="admin-map-container" className="flex flex-wrap justify-center gap-3">
                {state.adminMapPicks.map((mapName, idx) => (
                  <div
                    key={`admin-map-${idx}`}
                    className="relative w-52 sm:w-64 aspect-[16/9] overflow-hidden rounded-2xl border-2 border-amber-400 shadow-[0_0_30px_rgba(251,191,36,0.35)] group transition-all animate-pop-in"
                  >
                    <img
                      src={`/maps/${mapName}.png`}
                      onError={(e) => { (e.target as any).src = '/header-bg.png'; }}
                      alt={mapName}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-transparent pointer-events-none" />
                    <div className="absolute bottom-2 left-2 right-2 text-center">
                      <span className="text-sm sm:text-base font-black text-white drop-shadow-[0_2px_6px_rgba(0,0,0,1)] line-clamp-1">
                        {mapName}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Player 2 Guest Header (Clean Floating Layout) */}
        <div className={`md:col-span-4 flex flex-col justify-between gap-3 p-1 sm:p-2 transition-all ${
          isGuestTurn && room.status === 'in_progress' ? 'border-r-4 border-blue-500 pr-3' : ''
        }`}>
          <div className="flex items-center justify-end gap-3 text-right">
            <div className="overflow-hidden">
              <div className="flex items-center justify-end gap-2">
                {!guestClaimed && (
                  <span className="text-[9px] font-extrabold px-1.5 py-0.2 bg-amber-500/20 text-amber-400 rounded border border-amber-500/40 animate-pulse">
                    ⌛ IN ATTESA
                  </span>
                )}
                {guestClaimed && guestReady && (
                  <span className="text-[9px] font-extrabold px-1.5 py-0.2 bg-emerald-500/20 text-emerald-400 rounded border border-emerald-500/40">READY</span>
                )}
                <span className="block text-[10px] font-extrabold text-blue-400 uppercase tracking-widest">🔵 Guest</span>
              </div>
              {/* Player Name Font */}
              <h3 className={`text-2xl sm:text-3xl font-extrabold truncate tracking-tight ${
                guestClaimed ? 'text-white' : 'text-slate-500 italic animate-pulse'
              }`}>
                {guestClaimed ? room.guest_name : 'In attesa...'}
              </h3>
            </div>
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-extrabold text-base shrink-0 shadow-md ${
              guestClaimed
                ? 'bg-blue-600/30 border border-blue-500/50 text-blue-400'
                : 'bg-slate-900 border border-slate-700/60 text-slate-500 opacity-60'
            }`}>
              P2
            </div>
          </div>

          {/* Picked / Banned / Sniped Flags Rows */}
          <div className="space-y-2.5 pt-2.5 border-t border-slate-800/80">
            {room.preset?.scope !== 'maps' && (
              <div className="flex items-center justify-end gap-2">
                <div id="guest-ban-container" className="flex flex-wrap gap-1.5 justify-end min-h-[44px] items-center">
                  {state.guestBans && state.guestBans.length > 0 ? (
                    state.guestBans.map(id => {
                      const isHidden = (hasRevealBans || state.hiddenBans?.includes(id)) && !state.revealedBans && role !== 'GUEST';
                      const c = getCivObj(id);
                      return isHidden ? (
                        <div key={`gban-${id}`} title="Ban Nascosto (In attesa del turno reveal)" className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-slate-900 border border-slate-700 flex flex-col items-center justify-center text-slate-400 shadow-md animate-pop-in">
                          <Lock size={16} />
                        </div>
                      ) : (
                        <img key={`gban-${id}`} src={c.flag} alt={c.name} title={`BAN: ${c.name}`} className="w-10 h-10 sm:w-11 sm:h-11 object-cover rounded-xl border-2 border-red-500/60 opacity-70 grayscale shadow-md animate-pop-in" />
                      );
                    })
                  ) : (
                    <span className="text-xs text-slate-600 italic">-</span>
                  )}
                </div>
                <span className="text-[10px] font-extrabold text-red-400 uppercase w-12 shrink-0 text-right">BAN</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2">
              <div id="guest-pick-container" className="flex flex-wrap gap-1.5 justify-end min-h-[44px] items-center">
                {room.preset?.scope === 'maps' ? (
                  state.guestMapPicks && state.guestMapPicks.length > 0 ? (
                    state.guestMapPicks.map((mapName, idx) => (
                      <div key={`gmap-${idx}`} title={`PICK MAPPA: ${mapName}`} className="relative w-10 h-10 sm:w-11 sm:h-11 overflow-hidden rounded-xl border-2 border-emerald-500 shadow-md animate-pop-in">
                        <img src={`/maps/${mapName}.png`} onError={(e) => { (e.target as any).src = '/header-bg.png'; }} alt={mapName} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/30" />
                      </div>
                    ))
                  ) : (
                    <span className="text-xs text-slate-600 italic">-</span>
                  )
                ) : (
                  state.guestPicks && state.guestPicks.length > 0 ? (
                    state.guestPicks.map(id => {
                      const isHidden = (hasRevealPicks || state.hiddenPicks?.includes(id)) && !state.revealedPicks && role !== 'GUEST';
                      const isSelfHidden = (hasRevealPicks || state.hiddenPicks?.includes(id)) && !state.revealedPicks && role === 'GUEST';
                      const c = getCivObj(id);
                      const isSniped = state.guestSnipes?.includes(id);
                      return isHidden ? (
                        <div key={`gpick-${id}`} title="Pick Nascosto (In attesa della rivelazione)" className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-purple-950/80 border border-purple-500/60 flex items-center justify-center text-purple-400 shadow-md animate-pop-in">
                          <Lock size={16} />
                        </div>
                      ) : (
                        <div key={`gpick-${id}`} className={`relative w-10 h-10 sm:w-11 sm:h-11 overflow-hidden rounded-xl border-2 shadow-md animate-pop-in ${
                          isSniped ? 'border-red-500/80 shadow-red-950/50' : 'border-emerald-500 shadow-emerald-950/40'
                        }`}>
                          <img src={c.flag} alt={c.name} title={isSniped ? `SNIPED: ${c.name}` : `PICK: ${c.name}`} className={`w-full h-full object-cover ${isSniped ? 'grayscale opacity-50' : ''}`} />
                          {isSelfHidden && (
                            <div className="absolute top-0.5 right-0.5 bg-purple-900/90 text-purple-200 p-0.5 rounded-full shadow border border-purple-400/80 z-10" title="Scelta Segreta (Nascosta all'avversario)">
                              <Lock size={10} />
                            </div>
                          )}
                          {isSniped && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-[0.5px]">
                              <span className="bg-red-600/90 text-white text-[8px] font-black uppercase tracking-tighter px-1.5 py-0.5 rotate-[-25deg] shadow-lg border border-red-400/80 whitespace-nowrap">
                                SNIPED
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <span className="text-xs text-slate-600 italic">-</span>
                  )
                )}
              </div>
              <span className="text-[10px] font-extrabold text-emerald-400 uppercase w-12 shrink-0 text-right">PICK</span>
            </div>
          </div>
        </div>

      </div>

      {/* Main Pick/Ban/Snipe Grid for Civilizations - 100% Mobile Optimized */}
      {(!currentTurn || currentTurn.target === 'CIV') && (
        <div className="space-y-3 pt-2">
          <div className="flex justify-between items-center px-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Swords size={16} className="text-cyan-400" /> Civiltà Disponibili
            </h3>
            {isMyTurn && room.status === 'in_progress' && (
              <span className="text-xs font-bold text-cyan-400 hidden sm:inline">
                {currentTurn?.action === 'SNIPE'
                  ? 'Clicca su una civiltà dell\'avversario per effettuare lo SNIPE'
                  : 'Clicca su una civiltà per selezionarla'}
              </span>
            )}
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-11 gap-2 sm:gap-2.5">
            {civilizationsData.map((civ) => {
              const isHostPick = state.hostPicks?.includes(civ.id);
              const isGuestPick = state.guestPicks?.includes(civ.id);
              const isHostBan = state.hostBans?.includes(civ.id);
              const isGuestBan = state.guestBans?.includes(civ.id);
              const isHostSnipe = state.hostSnipes?.includes(civ.id);
              const isGuestSnipe = state.guestSnipes?.includes(civ.id);
              const banMode = state.banModes?.[civ.id] || 'GLOBAL';

              const isSnipeTurn = currentTurn?.action === 'SNIPE';
              const action = currentTurn?.action;
              const activePlayer = currentTurn?.player;

              let isClickable = false;
              let isUsed = isHostPick || isGuestPick || isHostBan || isGuestBan || isHostSnipe || isGuestSnipe;

              if (isMyTurn && room.status === 'in_progress' && currentTurn) {
                if (action === 'SNIPE') {
                  isClickable = activePlayer === 'HOST' ? !!isGuestPick : !!isHostPick;
                } else if (action === 'PICK') {
                  if (isHostPick || isGuestPick || isHostSnipe || isGuestSnipe) {
                    isClickable = false;
                    isUsed = true;
                  } else if ((isHostBan || isGuestBan) && banMode === 'GLOBAL') {
                    isClickable = false;
                    isUsed = true;
                  } else {
                    const bannedByOpponent = activePlayer === 'HOST' ? isGuestBan : isHostBan;
                    if (bannedByOpponent) {
                      isClickable = false;
                      isUsed = true;
                    } else {
                      isClickable = true;
                      isUsed = false;
                    }
                  }
                } else if (action === 'BAN') {
                  if (isHostPick || isGuestPick || isHostSnipe || isGuestSnipe) {
                    isClickable = false;
                    isUsed = true;
                  } else if ((isHostBan || isGuestBan) && banMode === 'GLOBAL') {
                    isClickable = false;
                    isUsed = true;
                  } else {
                    const bannedBySelf = activePlayer === 'HOST' ? isHostBan : isGuestBan;
                    if (bannedBySelf && (banMode === 'EXCLUSIVE' || banMode === 'GLOBAL')) {
                      isClickable = false;
                      isUsed = true;
                    } else {
                      isClickable = true;
                      isUsed = false;
                    }
                  }
                }
              }

              return (
                <button
                  key={civ.id}
                  id={`civ-card-${civ.id}`}
                  type="button"
                  disabled={!isClickable}
                  onClick={() => executeAction(civ.id)}
                  className={`group relative overflow-hidden rounded-2xl border aspect-[4/3] w-full flex items-end justify-center transition-all duration-300 shadow-md ${
                    isSnipeTurn && isClickable
                      ? 'border-purple-500 ring-2 ring-purple-500/70 hover-bounce-card cursor-pointer animate-pulse'
                      : isUsed
                      ? 'border-slate-800/80 bg-slate-950/90 cursor-not-allowed'
                      : isClickable
                      ? 'border-slate-700/80 hover:border-cyan-400 hover-bounce-card cursor-pointer'
                      : 'border-slate-800/60 opacity-60'
                  }`}
                >
                  {/* Flag Image Fills Entire Card Area */}
                  <img
                    src={civ.flag}
                    alt={civ.name}
                    className={`absolute inset-0 w-full h-full object-cover transition-all duration-500 ${
                      isUsed && !(isSnipeTurn && isClickable) ? 'grayscale opacity-40' : 'group-hover:scale-110'
                    }`}
                  />

                  {/* Gradient Overlay for Legibility */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent pointer-events-none" />

                  {/* Civ Name Label Over Flag */}
                  <span className={`relative z-10 text-[10px] sm:text-xs font-bold px-1.5 py-0.5 mb-1 text-center drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] truncate w-full ${
                    isUsed && !(isSnipeTurn && isClickable) ? 'text-slate-400 line-through' : 'text-white'
                  }`}>
                    {civ.name}
                  </span>

                  {/* Overlays for Picked, Banned or Sniped */}
                  {!isSnipeTurn && isHostPick && (
                    <div className="absolute top-1.5 right-1.5 bg-red-600/90 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded shadow border border-red-400/50">
                      PICKED (P1)
                    </div>
                  )}
                  {!isSnipeTurn && isGuestPick && (
                    <div className="absolute top-1.5 right-1.5 bg-blue-600/90 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded shadow border border-blue-400/50">
                      PICKED (P2)
                    </div>
                  )}
                  {(isHostSnipe || isGuestSnipe) && (
                    <div className="absolute inset-0 bg-purple-950/75 flex flex-col items-center justify-center gap-0.5 text-purple-200 backdrop-blur-[1px]">
                      <Target size={24} className="stroke-[2.5]" />
                      <span className="text-[9px] font-extrabold uppercase tracking-wider">SNIPED</span>
                    </div>
                  )}
                  {(isHostBan || isGuestBan) && (
                    <div className="absolute inset-0 bg-black/65 flex flex-col items-center justify-center gap-0.5 text-red-400 backdrop-blur-[1px]">
                      <X size={26} className="stroke-[3]" />
                      <span className="text-[9px] font-extrabold uppercase tracking-wider">BANNED</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Pick/Ban Grid for Maps (Square Cards & Search Bar) */}
      {(!currentTurn || currentTurn.target === 'MAP') && (
        <div className="space-y-3 pt-2">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 px-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Monitor size={16} className="text-cyan-400" /> Mappe Disponibili ({activeMapPool.length})
            </h3>
            {isMyTurn && room.status === 'in_progress' && (
              <span className="text-xs font-bold text-cyan-400">
                Clicca su una mappa per selezionarla
              </span>
            )}
          </div>

          {/* Premium Map Search Bar */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-cyan-400" size={16} />
            <input
              type="text"
              value={mapSearchQuery}
              onChange={(e) => setMapSearchQuery(e.target.value)}
              placeholder="Cerca mappa per nome..."
              className="w-full bg-[#0b101e] border border-slate-700/80 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder:text-slate-500 font-bold focus:border-cyan-400 focus:outline-none shadow-md"
            />
            {mapSearchQuery && (
              <button
                type="button"
                onClick={() => setMapSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Map Grid with Larger Cards & Map Titles */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-3.5">
            {activeMapPool.filter(m => m.toLowerCase().includes(mapSearchQuery.toLowerCase())).map((mapName) => {
              const isMapPicked = state.mapPicks?.includes(mapName);
              const isMapBanned = state.mapBans?.includes(mapName);
              const banMode = state.banModes?.[mapName] || 'GLOBAL';
              const action = currentTurn?.action;
              const activePlayer = currentTurn?.player;

              let isUsed = isMapPicked || isMapBanned;
              let isClickable = false;

              if (isMyTurn && room.status === 'in_progress' && currentTurn) {
                if (action === 'PICK') {
                  if (isMapPicked) {
                    isClickable = false;
                    isUsed = true;
                  } else if (isMapBanned && banMode === 'GLOBAL') {
                    isClickable = false;
                    isUsed = true;
                  } else {
                    const bannedByOpponent = activePlayer === 'HOST'
                      ? state.guestMapBans?.includes(mapName)
                      : state.hostMapBans?.includes(mapName);
                    if (bannedByOpponent) {
                      isClickable = false;
                      isUsed = true;
                    } else {
                      isClickable = true;
                      isUsed = false;
                    }
                  }
                } else if (action === 'BAN') {
                  if (isMapPicked) {
                    isClickable = false;
                    isUsed = true;
                  } else if (isMapBanned && banMode === 'GLOBAL') {
                    isClickable = false;
                    isUsed = true;
                  } else {
                    const bannedBySelf = activePlayer === 'HOST'
                      ? state.hostMapBans?.includes(mapName)
                      : state.guestMapBans?.includes(mapName);
                    if (bannedBySelf && (banMode === 'EXCLUSIVE' || banMode === 'GLOBAL')) {
                      isClickable = false;
                      isUsed = true;
                    } else {
                      isClickable = true;
                      isUsed = false;
                    }
                  }
                }
              }

              return (
                <button
                  key={mapName}
                  id={`map-card-${mapName}`}
                  type="button"
                  disabled={!isClickable}
                  onClick={() => executeAction(mapName)}
                  className={`group relative aspect-[4/3] overflow-hidden rounded-2xl border flex flex-col justify-end transition-all duration-300 ${
                    isMapPicked
                      ? 'border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                      : isMapBanned
                      ? 'border-red-500/40 opacity-50 grayscale'
                      : isClickable
                      ? 'border-slate-700/80 hover:border-cyan-400 hover-bounce-card cursor-pointer shadow-md'
                      : 'border-slate-800/60 opacity-60'
                  }`}
                >
                  <img
                    src={`/maps/${mapName}.png`}
                    onError={(e) => { (e.target as any).src = '/header-bg.png'; }}
                    alt={mapName}
                    className={`absolute inset-0 w-full h-full object-cover transition-transform duration-300 ${
                      isUsed ? 'grayscale opacity-40' : 'group-hover:scale-105'
                    }`}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent pointer-events-none" />
                  <span className="relative z-10 text-xs sm:text-sm font-extrabold text-white px-1.5 py-1.5 text-center line-clamp-2 leading-tight drop-shadow-[0_2px_4px_rgba(0,0,0,1)] w-full">
                    {mapName}
                  </span>

                  {isMapPicked && (
                    <div className="absolute inset-0 bg-emerald-950/75 border-2 border-emerald-500 text-emerald-300 flex flex-col items-center justify-center gap-1 backdrop-blur-[1px]">
                      <Check size={28} className="stroke-[3]" />
                      <span className="text-xs font-black uppercase tracking-wider">PICKED</span>
                    </div>
                  )}
                  {isMapBanned && (
                    <div className="absolute inset-0 bg-black/75 flex flex-col items-center justify-center text-red-400 gap-1 backdrop-blur-[1px]">
                      <X size={28} className="stroke-[3]" />
                      <span className="text-xs font-black uppercase tracking-wider">BANNED</span>
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
