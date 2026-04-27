import { useState, useEffect, useRef } from 'react';
import { Save, Timer as TimerIcon, Map as MapIcon, RefreshCcw, Plus, Minus, X, ChevronDown, Users, ShieldAlert, Target } from 'lucide-react';
import { civilizationsData } from '../data/aoe4Data';
import { AOE4_MAPS } from '../data/aoe4Maps';
import { overlayService } from '../services/overlayService';

interface TournamentOverlay2v2DashboardProps {
  overlayId: string;
  mode: 'low' | 'high';
  onError: (msg: string) => void;
}

const DEFAULT_STATE = {
  t1: { name: '', players: ['', ''], score: 0, draftCivs: [], bans: [] },
  t2: { name: '', players: ['', ''], score: 0, draftCivs: [], bans: [] },
  maps: [
    { name: 'Dry Arabia', t1Civs: ['', ''], t2Civs: ['', ''], winner: 0, isNext: true, t1Snipe: '', t2Snipe: '' },
    { name: 'Lipany', t1Civs: ['', ''], t2Civs: ['', ''], winner: 0, isNext: false, t1Snipe: '', t2Snipe: '' },
    { name: 'High View', t1Civs: ['', ''], t2Civs: ['', ''], winner: 0, isNext: false, t1Snipe: '', t2Snipe: '' }
  ],
  timer: { active: false, min: 5, sec: 0, timestamp: Date.now() },
  casters: [
    { name: '', active: false },
    { name: '', active: false }
  ],
  bracket: {
    title: 'TABELLONE TORNEO 2V2',
    teamCount: 8,
    phases: generatePhases(8)
  }
};

function generatePhases(count: number) {
  const phases = [];
  const roundNames = ['FINALE', 'SEMIFINALE', 'QUARTI DI FINALE', 'OTTAVI DI FINALE', 'SEDICESIMI DI FINALE'];
  
  let roundsNeeded = Math.ceil(Math.log2(count));
  
  for (let i = 0; i < roundsNeeded; i++) {
    const roundMatches = [];
    for (let j = 0; j < Math.pow(2, i); j++) {
      roundMatches.push({
        id: `r${i}-${j}`,
        t1: '', t2: '', 
        t1Players: ['', ''], t2Players: ['', ''], 
        t1Civs: [], t2Civs: [], 
        w: 0,
        t1Bye: false, t2Bye: false
      });
    }
    phases.unshift({
      name: roundNames[i] || `ROUND ${roundsNeeded - i}`,
      matches: roundMatches
    });
  }
  return phases;
}

export function TournamentOverlay2v2Dashboard({ overlayId, mode, onError }: TournamentOverlay2v2DashboardProps) {
  const [state, setState] = useState<any>(DEFAULT_STATE);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const isBracket = overlayId.includes('bracket');

  useEffect(() => {
    overlayService.getOverlayState(overlayId)
      .then(savedState => {
        if (savedState) {
          // Merge with default state to ensure all fields exist
          setState({
            ...DEFAULT_STATE,
            ...savedState,
            t1: { ...DEFAULT_STATE.t1, ...(savedState.t1 || {}) },
            t2: { ...DEFAULT_STATE.t2, ...(savedState.t2 || {}) },
            maps: (savedState.maps && savedState.maps.length > 0) ? savedState.maps : DEFAULT_STATE.maps,
            bracket: { ...DEFAULT_STATE.bracket, ...(savedState.bracket || {}) }
          });
        }
      })
      .catch(err => onError("Errore caricamento stato: " + err.message));
  }, [overlayId]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await overlayService.updateOverlayState(overlayId, state);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    } catch (err: any) {
      onError("Errore salvataggio: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setState(DEFAULT_STATE);
    setShowResetConfirm(false);
  };

  const CustomCivSelect = ({ value, onChange, isSm = false, showName = true, label = "" }: { value: string, onChange: (val: string) => void, isSm?: boolean, showName?: boolean, label?: string }) => {
    const [isOpen, setIsOpen] = useState(false);
    const selectedCiv = civilizationsData.find(c => c.id === value);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
          setIsOpen(false);
        }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
      <div className={`relative ${isSm ? (showName ? 'w-[140px]' : 'w-[45px]') : 'w-full'}`} ref={dropdownRef}>
        <div 
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-2 bg-[#0d111a] border border-white/10 rounded-lg cursor-pointer hover:border-blue-500/50 transition-all ${isSm ? 'px-1 py-1' : 'px-4 py-3'}`}
        >
          <div className={`flex-shrink-0 ${isSm ? 'w-8 h-5' : 'w-10 h-7'} rounded bg-black/40 overflow-hidden border border-white/10 shadow-inner`}>
             {selectedCiv ? (
               <img src={selectedCiv.flag} className="w-full h-full object-cover" />
             ) : (
               <div className="w-full h-full flex items-center justify-center text-gray-800 text-[10px] font-bold">?</div>
             )}
          </div>
          {showName && (
            <span className={`flex-1 font-black uppercase tracking-wider text-white truncate ${isSm ? 'text-[9px]' : 'text-xs'}`}>
              {selectedCiv ? selectedCiv.name : label || 'CIV'}
            </span>
          )}
          <ChevronDown className="text-gray-600" size={isSm ? 10 : 14} />
        </div>

        {isOpen && (
          <div className={`absolute z-[100] ${isSm ? 'right-0' : 'left-0'} mt-2 bg-[#0d111a] border border-white/20 rounded-xl shadow-2xl overflow-hidden max-h-64 overflow-y-auto elegant-scrollbar min-w-[180px] animate-in fade-in zoom-in-95 duration-150`}>
             <div 
                onClick={() => { onChange(''); setIsOpen(false); }}
                className="flex items-center gap-3 px-4 py-2 hover:bg-blue-600/10 transition-all cursor-pointer group border-b border-white/5"
              >
                <div className="w-8 h-5 rounded overflow-hidden border border-white/10 flex items-center justify-center bg-black/40">
                  <span className="text-gray-600 font-black text-[10px]">-</span>
                </div>
                <span className="text-[10px] font-black text-gray-500 group-hover:text-white uppercase tracking-widest">Nessuna</span>
              </div>
             {civilizationsData.map(civ => (
               <div 
                 key={civ.id}
                 onClick={() => { onChange(civ.id); setIsOpen(false); }}
                 className="flex items-center gap-3 px-4 py-2 hover:bg-blue-600/10 transition-all cursor-pointer group border-b border-white/5 last:border-0"
               >
                  <div className="w-8 h-5 rounded overflow-hidden border border-white/10 group-hover:border-blue-500/30 transition-all">
                    <img src={civ.flag} className="w-full h-full object-cover" />
                  </div>
                  <span className="text-[10px] font-black text-gray-400 group-hover:text-white uppercase tracking-widest">{civ.name}</span>
               </div>
             ))}
          </div>
        )}
      </div>
    );
  };

  const MapSelect = ({ value, onChange }: { value: string, onChange: (val: string) => void }) => {
    return (
      <div className="relative w-full">
        <select 
          value={value} 
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-[#0d111a] border border-white/10 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-blue-500/50 appearance-none cursor-pointer font-black uppercase tracking-widest"
        >
          {AOE4_MAPS.map(m => <option key={m} value={m}>{m.toUpperCase()}</option>)}
        </select>
        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-600" size={14} />
      </div>
    );
  };

  const MultiCivSelect = ({ values, onChange, max = 8, label = "Civ Pickate" }: { values: string[], onChange: (vals: string[]) => void, max?: number, label?: string }) => {
    return (
      <div className="space-y-3">
        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block">{label} ({values.length}/{max})</label>
        <div className="flex flex-wrap gap-2 p-3 bg-black/40 rounded-2xl border border-white/5 shadow-inner">
          {values.map((v, i) => (
            <div key={i} className="relative group">
              <div className="w-10 h-7 rounded border border-white/20 overflow-hidden">
                <img src={civilizationsData.find(c => c.id === v)?.flag} className="w-full h-full object-cover" />
              </div>
              <button 
                onClick={() => onChange(values.filter((_, idx) => idx !== i))}
                className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X size={10} />
              </button>
            </div>
          ))}
          {values.length < max && (
            <div className="relative">
              <CustomCivSelect 
                value="" 
                isSm={true} 
                showName={false} 
                onChange={(val) => val && onChange([...values, val])} 
              />
            </div>
          )}
        </div>
      </div>
    );
  };

  const updateBracketWinner = (phaseIdx: number, matchIdx: number, winner: number) => {
    const newPhases = [...state.bracket.phases];
    const match = newPhases[phaseIdx].matches[matchIdx];
    const newWinner = match.w === winner ? 0 : winner;
    match.w = newWinner;

    // Reset potential byes if manually setting winner
    if (winner === 1) match.t2Bye = false;
    if (winner === 2) match.t1Bye = false;

    // Propagation logic
    propagateWinner(newPhases, phaseIdx, matchIdx);
    setState({ ...state, bracket: { ...state.bracket, phases: newPhases } });
  };

  const toggleBye = (phaseIdx: number, matchIdx: number, teamIdx: number) => {
    const newPhases = [...state.bracket.phases];
    const match = newPhases[phaseIdx].matches[matchIdx];
    
    if (teamIdx === 1) {
      match.t1Bye = !match.t1Bye;
      if (match.t1Bye) { match.t2Bye = false; match.w = 1; }
      else if (match.w === 1) match.w = 0;
    } else {
      match.t2Bye = !match.t2Bye;
      if (match.t2Bye) { match.t1Bye = false; match.w = 2; }
      else if (match.w === 2) match.w = 0;
    }

    propagateWinner(newPhases, phaseIdx, matchIdx);
    setState({ ...state, bracket: { ...state.bracket, phases: newPhases } });
  };

  const propagateWinner = (phases: any[], phaseIdx: number, matchIdx: number) => {
    if (phaseIdx < phases.length - 1) {
      const match = phases[phaseIdx].matches[matchIdx];
      const nextPhase = phases[phaseIdx + 1];
      const nextMatchIdx = Math.floor(matchIdx / 2);
      const slot = matchIdx % 2 === 0 ? 't1' : 't2';
      const playerSlot = matchIdx % 2 === 0 ? 't1Players' : 't2Players';
      
      if (match.w > 0) {
        nextPhase.matches[nextMatchIdx][slot] = match.w === 1 ? match.t1 : match.t2;
        nextPhase.matches[nextMatchIdx][playerSlot] = match.w === 1 ? match.t1Players : match.t2Players;
      } else {
        nextPhase.matches[nextMatchIdx][slot] = '';
        nextPhase.matches[nextMatchIdx][playerSlot] = ['', ''];
      }
      // Recursive propagation for further rounds
      propagateWinner(phases, phaseIdx + 1, nextMatchIdx);
    }
  };

  const updateTeamCount = (count: number) => {
    if (!window.confirm("Cambiare il numero di team resetterà il tabellone. Continuare?")) return;
    setState({
      ...state,
      bracket: {
        ...state.bracket,
        teamCount: count,
        phases: generatePhases(count)
      }
    });
  };

  const renderMatchTab = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-top-4 duration-500">
      <div className="grid grid-cols-2 gap-8">
        {[1, 2].map(idx => {
          const t = idx === 1 ? state.t1 : state.t2;
          const tKey = idx === 1 ? 't1' : 't2';
          return (
            <div key={idx} className="bg-[#0a0f1a] border border-white/10 rounded-3xl p-6 space-y-6 shadow-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Users className="text-blue-400" size={18} />
                  <label className="text-[12px] font-black text-blue-400 uppercase tracking-widest">Team {idx}</label>
                </div>
                <div className="flex items-center bg-black/60 rounded-xl p-1 border border-white/10">
                  <button onClick={() => setState({...state, [tKey]: {...t, score: Math.max(0, t.score - 1)}})} className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded-lg text-gray-500"><Minus size={14}/></button>
                  <span className="w-10 text-center font-black text-blue-500 text-xl">{t.score}</span>
                  <button onClick={() => setState({...state, [tKey]: {...t, score: t.score + 1}})} className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded-lg text-gray-500"><Plus size={14}/></button>
                </div>
              </div>

              <input
                type="text"
                value={t.name}
                onChange={(e) => setState({ ...state, [tKey]: { ...t, name: e.target.value } })}
                placeholder="NOME TEAM"
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-lg text-white focus:border-blue-500/50 outline-none transition-all font-black uppercase tracking-wider shadow-inner"
              />

              <div className="grid grid-cols-2 gap-4">
                {t.players.map((p: string, pIdx: number) => (
                  <input
                    key={pIdx}
                    type="text"
                    value={p}
                    onChange={(e) => {
                      const newPlayers = [...t.players];
                      newPlayers[pIdx] = e.target.value;
                      setState({ ...state, [tKey]: { ...t, players: newPlayers } });
                    }}
                    placeholder={`GIOCATORE ${pIdx + 1}`}
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:border-blue-500/30 outline-none font-bold uppercase"
                  />
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                <MultiCivSelect 
                  values={t.draftCivs} 
                  onChange={(vals) => setState({...state, [tKey]: {...t, draftCivs: vals}})}
                  label="Civ Pickate (Bo3)"
                />
                {mode === 'high' && (
                  <MultiCivSelect 
                    values={t.bans} 
                    onChange={(vals) => setState({...state, [tKey]: {...t, bans: vals}})}
                    max={3}
                    label="Ban (VS Team Avversario)"
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-[#0a0f1a] border border-white/10 rounded-3xl p-8 shadow-2xl">
        <h4 className="text-[12px] font-black text-blue-400 uppercase tracking-widest mb-8 flex items-center gap-3">
          <MapIcon size={18} /> Mappe e Pick di Gioco
        </h4>
        
        <div className="space-y-12">
          {state.maps.map((map: any, mIdx: number) => (
            <div key={mIdx} className={`relative p-6 rounded-2xl border transition-all ${map.isNext ? 'bg-blue-500/5 border-blue-500/30 shadow-[0_0_30px_rgba(59,130,246,0.1)]' : 'bg-black/20 border-white/5'}`}>
              {map.isNext && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-blue-600 text-white text-[10px] font-black rounded-full shadow-lg animate-pulse">
                  PROSSIMO GAME
                </div>
              )}

              <div className="grid grid-cols-[1fr_2fr_1fr] items-center gap-8">
                {/* Team 1 Picks */}
                <div className="space-y-4">
                  <div className="text-[9px] font-black text-gray-500 uppercase tracking-widest text-center">Picks Team 1</div>
                  <div className="flex justify-center gap-3">
                    <CustomCivSelect isSm={true} value={map.t1Civs[0]} onChange={(val) => { const nm = [...state.maps]; nm[mIdx].t1Civs[0] = val; setState({...state, maps: nm}); }} />
                    <CustomCivSelect isSm={true} value={map.t1Civs[1]} onChange={(val) => { const nm = [...state.maps]; nm[mIdx].t1Civs[1] = val; setState({...state, maps: nm}); }} />
                  </div>
                  {mode === 'high' && (
                    <div className="flex flex-col items-center gap-1">
                      <div className="text-[8px] font-black text-red-400/60 uppercase tracking-widest">Sniperata</div>
                      <CustomCivSelect isSm={true} showName={false} value={map.t1Snipe} onChange={(val) => { const nm = [...state.maps]; nm[mIdx].t1Snipe = val; setState({...state, maps: nm}); }} />
                    </div>
                  )}
                </div>

                {/* Map Info */}
                <div className="flex flex-col items-center gap-4 border-x border-white/5 px-8">
                  <MapSelect value={map.name} onChange={(val) => { const nm = [...state.maps]; nm[mIdx].name = val; setState({...state, maps: nm}); }} />
                  
                  <div className="flex items-center gap-6">
                    <button 
                      onClick={() => { const nm = [...state.maps]; nm[mIdx].winner = nm[mIdx].winner === 1 ? 0 : 1; setState({...state, maps: nm}); }}
                      className={`px-4 py-1.5 rounded-lg text-[10px] font-black transition-all ${map.winner === 1 ? 'bg-blue-600 text-white shadow-lg' : 'bg-white/5 text-gray-600 hover:text-gray-400'}`}
                    >
                      WIN T1
                    </button>
                    <button 
                      onClick={() => { const nm = [...state.maps]; nm.forEach((m, i) => m.isNext = (i === mIdx)); setState({...state, maps: nm}); }}
                      className={`p-2 rounded-full transition-all ${map.isNext ? 'text-blue-400 bg-blue-400/10' : 'text-gray-700 hover:text-gray-500'}`}
                      title="Segna come prossimo game"
                    >
                      <RefreshCcw size={18} className={map.isNext ? 'animate-spin-slow' : ''} />
                    </button>
                    <button 
                      onClick={() => { const nm = [...state.maps]; nm[mIdx].winner = nm[mIdx].winner === 2 ? 0 : 2; setState({...state, maps: nm}); }}
                      className={`px-4 py-1.5 rounded-lg text-[10px] font-black transition-all ${map.winner === 2 ? 'bg-red-600 text-white shadow-lg' : 'bg-white/5 text-gray-600 hover:text-gray-400'}`}
                    >
                      WIN T2
                    </button>
                  </div>
                </div>

                {/* Team 2 Picks */}
                <div className="space-y-4">
                  <div className="text-[9px] font-black text-gray-500 uppercase tracking-widest text-center">Picks Team 2</div>
                  <div className="flex justify-center gap-3">
                    <CustomCivSelect isSm={true} value={map.t2Civs[0]} onChange={(val) => { const nm = [...state.maps]; nm[mIdx].t2Civs[0] = val; setState({...state, maps: nm}); }} />
                    <CustomCivSelect isSm={true} value={map.t2Civs[1]} onChange={(val) => { const nm = [...state.maps]; nm[mIdx].t2Civs[1] = val; setState({...state, maps: nm}); }} />
                  </div>
                  {mode === 'high' && (
                    <div className="flex flex-col items-center gap-1">
                      <div className="text-[8px] font-black text-red-400/60 uppercase tracking-widest">Sniperata</div>
                      <CustomCivSelect isSm={true} showName={false} value={map.t2Snipe} onChange={(val) => { const nm = [...state.maps]; nm[mIdx].t2Snipe = val; setState({...state, maps: nm}); }} />
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-8">
        <div className="bg-[#0a0f1a] border border-white/10 rounded-3xl p-6 shadow-xl space-y-4">
          <label className="text-[12px] font-black text-blue-400 uppercase tracking-widest flex items-center gap-2">
            <TimerIcon size={16} /> Timer
          </label>
          <div className="flex items-center justify-between p-4 bg-black/40 rounded-2xl border border-white/5">
            <div className="flex items-center gap-4">
               <input type="number" value={state.timer.min} onChange={(e) => setState({...state, timer: {...state.timer, min: parseInt(e.target.value)||0}})} className="w-12 bg-transparent text-center font-black text-white text-xl outline-none" />
               <span className="text-gray-700">:</span>
               <input type="number" value={state.timer.sec} onChange={(e) => setState({...state, timer: {...state.timer, sec: parseInt(e.target.value)||0}})} className="w-12 bg-transparent text-center font-black text-white text-xl outline-none" />
            </div>
            <button 
              onClick={() => setState({...state, timer: {...state.timer, active: !state.timer.active, timestamp: Date.now()}})}
              className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${state.timer.active ? 'bg-red-600 shadow-red-900/20' : 'bg-green-600 shadow-green-900/20'} shadow-lg`}
            >
              {state.timer.active ? 'STOP' : 'START'}
            </button>
          </div>
        </div>

        <div className="bg-[#0a0f1a] border border-white/10 rounded-3xl p-6 shadow-xl space-y-4">
          <label className="text-[12px] font-black text-blue-400 uppercase tracking-widest">Casters</label>
          <div className="grid grid-cols-2 gap-4">
            {state.casters.map((c: any, idx: number) => (
              <div key={idx} className="flex items-center gap-3 p-3 bg-black/40 rounded-xl border border-white/5">
                <input 
                  type="text" 
                  value={c.name} 
                  onChange={(e) => { const nc = [...state.casters]; nc[idx].name = e.target.value; setState({...state, casters: nc}); }} 
                  placeholder={`Caster ${idx+1}`} 
                  className="flex-1 min-w-0 bg-transparent text-xs font-bold text-white outline-none" 
                />
                <button 
                  onClick={() => { const nc = [...state.casters]; nc[idx].active = !nc[idx].active; setState({...state, casters: nc}); }}
                  className={`w-10 h-5 rounded-full relative transition-all ${c.active ? 'bg-blue-600' : 'bg-white/10'}`}
                >
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${c.active ? 'left-5.5' : 'left-0.5'}`} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderBracketTab = () => (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-[#0a0f1a] border border-white/10 rounded-3xl p-8 space-y-6 shadow-2xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between border-b border-white/5 pb-6 gap-6">
          <div className="space-y-1">
            <h4 className="text-[12px] font-black text-blue-400 uppercase tracking-[0.2em]">Configurazione Tabellone</h4>
            <p className="text-[10px] text-gray-500 font-medium">Gestisci i team e la progressione del torneo</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-4">
             <div className="flex flex-col gap-1.5">
               <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest px-1">Numero Team</label>
               <div className="flex bg-black/40 rounded-xl p-1 border border-white/10">
                 {[4, 8, 16, 32].map(c => (
                   <button 
                     key={c}
                     onClick={() => updateTeamCount(c)}
                     className={`px-4 py-1.5 rounded-lg text-[10px] font-black transition-all ${state.bracket.teamCount === c ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
                   >
                     {c}
                   </button>
                 ))}
               </div>
             </div>

             <div className="flex flex-col gap-1.5">
               <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest px-1">Titolo Overlay</label>
               <input 
                type="text" 
                value={state.bracket.title}
                onChange={(e) => setState({...state, bracket: {...state.bracket, title: e.target.value}})}
                placeholder="TITOLO TABELLONE"
                className="bg-black/60 border border-white/10 rounded-xl px-6 py-2.5 text-xs text-white font-black uppercase tracking-widest w-full lg:w-64 outline-none focus:border-blue-500/50"
              />
             </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {state.bracket.phases.map((phase: any, pIdx: number) => (
            <div key={pIdx} className="space-y-6">
              <div className="flex items-center gap-3 px-2">
                <div className="w-1.5 h-4 bg-blue-500 rounded-full" />
                <h5 className="text-[11px] font-black text-white uppercase tracking-[0.3em]">{phase.name}</h5>
              </div>
              
              <div className="space-y-6">
                {phase.matches.map((match: any, mIdx: number) => (
                  <div key={match.id} className="p-4 bg-black/40 border border-white/5 rounded-2xl space-y-4 hover:border-blue-500/20 transition-all shadow-xl group relative">
                    {/* Team 1 */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <input 
                          type="text" 
                          value={match.t1} 
                          onChange={(e) => { const np = [...state.bracket.phases]; np[pIdx].matches[mIdx].t1 = e.target.value; setState({...state, bracket: {...state.bracket, phases: np}}); }}
                          placeholder="TEAM 1"
                          className="flex-1 bg-black/40 border border-white/5 rounded-lg px-3 py-2 text-[11px] text-white font-black uppercase outline-none focus:border-blue-500/30"
                        />
                        <button 
                          onClick={() => updateBracketWinner(pIdx, mIdx, 1)}
                          className={`w-7 h-7 rounded-lg flex items-center justify-center text-[9px] font-black transition-all ${match.w === 1 ? 'bg-blue-600 text-white' : 'bg-white/5 text-gray-700 hover:text-white'}`}
                        >
                          W
                        </button>
                        <button 
                          onClick={() => toggleBye(pIdx, mIdx, 1)}
                          className={`px-2 py-1 rounded-lg text-[8px] font-black transition-all border ${match.t1Bye ? 'bg-yellow-600 border-yellow-400 text-white' : 'bg-white/5 border-white/5 text-gray-700 hover:text-yellow-500'}`}
                        >
                          BYE
                        </button>
                      </div>
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          value={match.t1Players[0]} 
                          onChange={(e) => { const np = [...state.bracket.phases]; np[pIdx].matches[mIdx].t1Players[0] = e.target.value; setState({...state, bracket: {...state.bracket, phases: np}}); }}
                          placeholder="P1"
                          className="flex-1 bg-black/20 border border-white/5 rounded-md px-2 py-1 text-[9px] text-gray-400 font-bold uppercase outline-none"
                        />
                        <input 
                          type="text" 
                          value={match.t1Players[1]} 
                          onChange={(e) => { const np = [...state.bracket.phases]; np[pIdx].matches[mIdx].t1Players[1] = e.target.value; setState({...state, bracket: {...state.bracket, phases: np}}); }}
                          placeholder="P2"
                          className="flex-1 bg-black/20 border border-white/5 rounded-md px-2 py-1 text-[9px] text-gray-400 font-bold uppercase outline-none"
                        />
                      </div>
                      <MultiCivSelect 
                        values={match.t1Civs} 
                        onChange={(vals) => { const np = [...state.bracket.phases]; np[pIdx].matches[mIdx].t1Civs = vals; setState({...state, bracket: {...state.bracket, phases: np}}); }}
                        max={6}
                        label="Civ Giocate"
                      />
                    </div>

                    <div className="flex items-center gap-3 py-1">
                      <div className="flex-1 h-[1px] bg-white/5" />
                      <span className="text-[8px] font-black text-gray-700 uppercase tracking-widest">VS</span>
                      <div className="flex-1 h-[1px] bg-white/5" />
                    </div>

                    {/* Team 2 */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <input 
                          type="text" 
                          value={match.t2} 
                          onChange={(e) => { const np = [...state.bracket.phases]; np[pIdx].matches[mIdx].t2 = e.target.value; setState({...state, bracket: {...state.bracket, phases: np}}); }}
                          placeholder="TEAM 2"
                          className="flex-1 bg-black/40 border border-white/5 rounded-lg px-3 py-2 text-[11px] text-white font-black uppercase outline-none focus:border-blue-500/30"
                        />
                        <button 
                          onClick={() => updateBracketWinner(pIdx, mIdx, 2)}
                          className={`w-7 h-7 rounded-lg flex items-center justify-center text-[9px] font-black transition-all ${match.w === 2 ? 'bg-red-600 text-white' : 'bg-white/5 text-gray-700 hover:text-white'}`}
                        >
                          W
                        </button>
                        <button 
                          onClick={() => toggleBye(pIdx, mIdx, 2)}
                          className={`px-2 py-1 rounded-lg text-[8px] font-black transition-all border ${match.t2Bye ? 'bg-yellow-600 border-yellow-400 text-white' : 'bg-white/5 border-white/5 text-gray-700 hover:text-yellow-500'}`}
                        >
                          BYE
                        </button>
                      </div>
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          value={match.t2Players[0]} 
                          onChange={(e) => { const np = [...state.bracket.phases]; np[pIdx].matches[mIdx].t2Players[0] = e.target.value; setState({...state, bracket: {...state.bracket, phases: np}}); }}
                          placeholder="P1"
                          className="flex-1 bg-black/20 border border-white/5 rounded-md px-2 py-1 text-[9px] text-gray-400 font-bold uppercase outline-none"
                        />
                        <input 
                          type="text" 
                          value={match.t2Players[1]} 
                          onChange={(e) => { const np = [...state.bracket.phases]; np[pIdx].matches[mIdx].t2Players[1] = e.target.value; setState({...state, bracket: {...state.bracket, phases: np}}); }}
                          placeholder="P2"
                          className="flex-1 bg-black/20 border border-white/5 rounded-md px-2 py-1 text-[9px] text-gray-400 font-bold uppercase outline-none"
                        />
                      </div>
                      <MultiCivSelect 
                        values={match.t2Civs} 
                        onChange={(vals) => { const np = [...state.bracket.phases]; np[pIdx].matches[mIdx].t2Civs = vals; setState({...state, bracket: {...state.bracket, phases: np}}); }}
                        max={6}
                        label="Civ Giocate"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col bg-[#05080f] font-inter">
      {/* Top Action Bar */}
      <div className="flex items-center justify-between p-6 bg-black/40 border-b border-white/10 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className={`flex items-center justify-center gap-2 px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-lg ${isSaving ? 'bg-gray-800 text-gray-500' : showSuccess ? 'bg-green-600 text-white shadow-green-500/20' : 'bg-blue-600 text-white hover:bg-blue-500 shadow-blue-500/20'}`}
          >
            {isSaving ? <RefreshCcw size={14} className="animate-spin" /> : <Save size={14} />}
            {isSaving ? 'Salvataggio...' : showSuccess ? 'Salvato!' : 'Salva Overlay'}
          </button>
          
          {!showResetConfirm ? (
            <button onClick={() => setShowResetConfirm(true)} className="p-3 rounded-xl bg-red-600/10 border border-red-600/30 text-red-500 hover:bg-red-600 hover:text-white transition-all">
              <RefreshCcw size={16} />
            </button>
          ) : (
            <div className="flex items-center gap-2 bg-red-600 p-1 rounded-xl shadow-lg animate-in zoom-in-95 duration-200">
              <button onClick={handleReset} className="bg-white text-red-600 px-4 py-2 rounded-lg font-black text-[10px] uppercase hover:bg-gray-100 transition-all">RESET</button>
              <button onClick={() => setShowResetConfirm(false)} className="bg-black/20 text-white w-8 h-8 flex items-center justify-center rounded-lg hover:bg-black/30"><X size={14}/></button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4 bg-yellow-500/10 border border-yellow-500/30 px-6 py-2.5 rounded-2xl shadow-lg shadow-yellow-500/5">
           {mode === 'high' ? <ShieldAlert className="text-yellow-500" size={18} /> : <Target className="text-yellow-500" size={18} />}
           <div className="flex flex-col">
             <span className="text-[10px] font-black text-white uppercase tracking-widest">{mode === 'high' ? 'High Elo' : 'Low Elo'}</span>
             <span className="text-[8px] font-bold text-yellow-500/60 uppercase tracking-tighter">Draft con {mode === 'high' ? 'Ban + Sniper' : 'Solo Pick'}</span>
           </div>
        </div>
      </div>

      <div className="p-8 pb-32">
        <div className="max-w-7xl mx-auto">
          {isBracket ? renderBracketTab() : renderMatchTab()}
        </div>
      </div>
    </div>
  );
}
