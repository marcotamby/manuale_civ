import { useState, useEffect, useRef } from 'react';
import { Save, Timer as TimerIcon, Map as MapIcon, Trophy, RefreshCcw, Plus, Minus, X, ChevronDown } from 'lucide-react';
import { civilizationsData } from '../data/aoe4Data';
import { AOE4_MAPS } from '../data/aoe4Maps';
import { overlayService } from '../services/overlayService';

interface TournamentOverlayDashboardProps {
  onError: (msg: string) => void;
}

const DEFAULT_STATE = {
  p1: { name: '', score: 0, civId: '' },
  p2: { name: '', score: 0, civId: '' },
  map: 'Dry Arabia',
  timer: { active: false, min: 10, sec: 0, timestamp: Date.now() },
  casters: [
    { name: '', active: false },
    { name: '', active: false }
  ],
  bracket: {
    q1: { p1: '', p2: '', p1Civ: '', p2Civ: '', w: 0 },
    q2: { p1: '', p2: '', p1Civ: '', p2Civ: '', w: 0 },
    q3: { p1: '', p2: '', p1Civ: '', p2Civ: '', w: 0 },
    q4: { p1: '', p2: '', p1Civ: '', p2Civ: '', w: 0 },
    s1: { p1: '', p2: '', p1Civ: '', p2Civ: '', w: 0 },
    s2: { p1: '', p2: '', p1Civ: '', p2Civ: '', w: 0 },
    f: { p1: '', p2: '', p1Civ: '', p2Civ: '', w: 0 }
  }
};

const OVERLAY_ID = "tournament-1v1-bracket";

export function TournamentOverlayDashboard({ onError }: TournamentOverlayDashboardProps) {
  const [state, setState] = useState<any>(DEFAULT_STATE);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'match' | 'bracket'>('match');
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  useEffect(() => {
    overlayService.getOverlayState(OVERLAY_ID)
      .then(savedState => {
        if (savedState) {
          setState({
            ...DEFAULT_STATE,
            ...savedState,
            bracket: { ...DEFAULT_STATE.bracket, ...(savedState.bracket || {}) }
          });
        }
      })
      .catch(err => onError("Errore caricamento stato: " + err.message));
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await overlayService.updateOverlayState(OVERLAY_ID, state);
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

  const CustomCivSelect = ({ value, onChange, isSm = false, showName = true }: { value: string, onChange: (val: string) => void, isSm?: boolean, showName?: boolean }) => {
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
      <div className={`relative ${isSm ? (showName ? 'w-[180px]' : 'w-[65px]') : 'w-full'}`} ref={dropdownRef}>
        <div 
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-2 bg-[#0d111a] border border-white/10 rounded-xl cursor-pointer hover:border-blue-500/50 transition-all ${isSm ? 'px-1.5 py-1.5' : 'px-5 py-4'}`}
        >
          <div className={`flex-shrink-0 ${isSm ? 'w-9 h-6' : 'w-10 h-7'} rounded bg-black/40 overflow-hidden border border-white/10 shadow-inner`}>
             {selectedCiv ? (
               <img src={selectedCiv.flag} className="w-full h-full object-cover" />
             ) : (
               <Trophy className="w-full h-full p-1 text-gray-800" />
             )}
          </div>
          {showName && (
            <span className={`flex-1 font-black uppercase tracking-wider text-white truncate ${isSm ? 'text-[10px]' : 'text-sm'}`}>
              {selectedCiv ? selectedCiv.name : (isSm ? 'CIV' : 'SELEZIONA CIVILTA\'')}
            </span>
          )}
          <ChevronDown className="text-gray-600" size={isSm ? 12 : 16} />
        </div>

        {isOpen && (
          <div className={`absolute z-[100] ${isSm ? 'right-0' : 'left-0'} mt-2 bg-[#0d111a] border border-white/20 rounded-2xl shadow-2xl overflow-hidden max-h-64 overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-150 min-w-[200px]`}>
             {civilizationsData.map(civ => (
               <div 
                 key={civ.id}
                 onClick={() => { onChange(civ.id); setIsOpen(false); }}
                 className="flex items-center gap-4 px-4 py-3 hover:bg-blue-600/10 transition-all cursor-pointer group border-b border-white/5 last:border-0"
               >
                  <div className="w-10 h-7 rounded overflow-hidden border border-white/10 group-hover:border-blue-500/30 transition-all shadow-md">
                    <img src={civ.flag} className="w-full h-full object-cover" />
                  </div>
                  <span className="text-xs font-black text-gray-400 group-hover:text-white uppercase tracking-widest">{civ.name}</span>
               </div>
             ))}
          </div>
        )}
      </div>
    );
  };

  const updateMatchWinner = (matchId: string, winnerIdx: number) => {
    const match = state.bracket[matchId];
    const newWinner = match.w === winnerIdx ? 0 : winnerIdx;
    
    let nextState = {
      ...state,
      bracket: {
        ...state.bracket,
        [matchId]: { ...match, w: newWinner }
      }
    };

    const propagationMap: Record<string, { target: string, slot: 1 | 2 }> = {
      'q1': { target: 's1', slot: 1 },
      'q2': { target: 's1', slot: 2 },
      'q3': { target: 's2', slot: 1 },
      'q4': { target: 's2', slot: 2 },
      's1': { target: 'f', slot: 1 },
      's2': { target: 'f', slot: 2 }
    };

    if (propagationMap[matchId]) {
      const { target, slot } = propagationMap[matchId];
      const targetMatch = nextState.bracket[target];
      if (newWinner > 0) {
        const winnerName = newWinner === 1 ? match.p1 : match.p2;
        const winnerCiv = newWinner === 1 ? match.p1Civ : match.p2Civ;
        nextState.bracket[target] = { ...targetMatch, [`p${slot}`]: winnerName, [`p${slot}Civ`]: winnerCiv };
      } else {
        nextState.bracket[target] = { ...targetMatch, [`p${slot}`]: '', [`p${slot}Civ`]: '' };
      }
    }
    setState(nextState);
  };

  const SaveButton = ({ className = "" }: { className?: string }) => (
    <button
      onClick={handleSave}
      disabled={isSaving}
      className={`flex items-center justify-center gap-2 px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-lg ${isSaving ? 'bg-gray-800 text-gray-500' : showSuccess ? 'bg-green-600 text-white shadow-green-500/20' : 'bg-blue-600 text-white hover:bg-blue-500 shadow-blue-500/20'} ${className}`}
    >
      {isSaving ? <RefreshCcw size={14} className="animate-spin" /> : <Save size={14} />}
      {isSaving ? 'Salvataggio...' : showSuccess ? 'Salvato!' : 'Salva'}
    </button>
  );

  const renderMatchInputs = (matchId: string, label: string) => {
    const match = state.bracket[matchId] || { p1: '', p2: '', p1Civ: '', p2Civ: '', w: 0 };
    
    return (
      <div className="bg-black/40 border border-white/10 rounded-2xl p-4 space-y-4 shadow-xl hover:border-blue-500/10 transition-all">
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest opacity-40">{label}</span>
        </div>
        
        <div className="space-y-3">
          {[1, 2].map(idx => {
            const pKey = `p${idx}`;
            const cKey = `p${idx}Civ`;
            return (
              <div key={idx} className="flex items-center gap-2.5">
                <input
                  type="text"
                  value={match[pKey]}
                  onChange={(e) => setState({ ...state, bracket: { ...state.bracket, [matchId]: { ...match, [pKey]: e.target.value } } })}
                  placeholder={`GIOCATORE ${idx === 1 ? 'A' : 'B'}`}
                  className="flex-1 bg-[#05080f] border border-white/5 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-blue-500/30 font-bold uppercase shadow-inner"
                />
                <button 
                  onClick={() => updateMatchWinner(matchId, idx)}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black transition-all ${match.w === idx ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/20' : 'bg-white/5 text-gray-600 hover:text-white'}`}
                >
                  W
                </button>
                <CustomCivSelect isSm={true} showName={false} value={match[cKey]} onChange={(val) => setState({ ...state, bracket: { ...state.bracket, [matchId]: { ...match, [cKey]: val } } })} />
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const TabButton = ({ active, label, onClick }: { active: boolean, label: string, onClick: () => void }) => (
    <button
      onClick={onClick}
      className={`px-12 py-3 rounded-xl text-[11px] font-black uppercase tracking-[0.2em] transition-all border ${
        active 
          ? 'bg-gradient-to-b from-white to-gray-400 text-black shadow-[0_0_25px_rgba(255,255,255,0.25)] border-white' 
          : 'bg-white/5 text-gray-500 border-white/5 hover:text-white hover:border-white/20 hover:bg-white/10'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="flex flex-col bg-[#05080f] font-inter">
      {/* Top Action Bar */}
      <div className="flex items-center justify-between p-6 bg-black/40 border-b border-white/10 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <SaveButton />
          {!showResetConfirm ? (
            <button onClick={() => setShowResetConfirm(true)} className="flex items-center gap-2 px-6 py-3 rounded-xl bg-red-600/10 border border-red-600/30 text-red-500 hover:bg-red-600 hover:text-white transition-all font-black text-xs uppercase tracking-widest">
              <RefreshCcw size={14} />
              Reset Campi
            </button>
          ) : (
            <div className="flex items-center gap-2 bg-red-600 p-1 rounded-xl shadow-lg animate-in zoom-in-95 duration-200">
              <span className="text-[10px] font-black text-white px-3 uppercase tracking-tighter">Sei sicuro?</span>
              <button onClick={handleReset} className="bg-white text-red-600 px-4 py-2 rounded-lg font-black text-[10px] uppercase hover:bg-gray-100 transition-all">SI, RESET</button>
              <button onClick={() => setShowResetConfirm(false)} className="bg-black/20 text-white w-8 h-8 flex items-center justify-center rounded-lg hover:bg-black/30"><X size={14}/></button>
            </div>
          )}
        </div>

        <div className="flex gap-2 bg-black/60 p-1.5 rounded-2xl border border-white/5 shadow-inner">
          <TabButton active={activeTab === 'match'} label="Match Attivo" onClick={() => setActiveTab('match')} />
          <TabButton active={activeTab === 'bracket'} label="Tabellone" onClick={() => setActiveTab('bracket')} />
        </div>
      </div>

      <div className="p-8 bg-gradient-to-b from-transparent to-black/20">
        {activeTab === 'match' ? (
          <div className="max-w-6xl mx-auto space-y-12 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="grid grid-cols-2 gap-8">
              {[1, 2].map(idx => {
                const p = idx === 1 ? state.p1 : state.p2;
                return (
                  <div key={idx} className="bg-[#0a0f1a] border border-white/10 rounded-3xl p-8 space-y-8 shadow-2xl hover:border-blue-500/20 transition-all">
                    <div className="flex items-center justify-between">
                      <label className="text-[13px] font-black text-blue-400 uppercase tracking-widest opacity-70">Giocatore {idx === 1 ? 'Sinistra (P1)' : 'Destra (P2)'}</label>
                      <div className="flex items-center bg-black/60 rounded-xl p-1 border border-white/10">
                        <button onClick={() => setState({...state, [idx === 1 ? 'p1' : 'p2']: {...p, score: Math.max(0, p.score - 1)}})} className="w-10 h-10 flex items-center justify-center hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-all"><Minus size={18}/></button>
                        <span className="w-12 text-center font-black text-blue-500 text-2xl">{p.score}</span>
                        <button onClick={() => setState({...state, [idx === 1 ? 'p1' : 'p2']: {...p, score: p.score + 1}})} className="w-10 h-10 flex items-center justify-center hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-all"><Plus size={18}/></button>
                      </div>
                    </div>
                    <input
                      type="text"
                      value={p.name}
                      onChange={(e) => setState({ ...state, [idx === 1 ? 'p1' : 'p2']: { ...p, name: e.target.value } })}
                      placeholder="NOME GIOCATORE"
                      className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-5 text-2xl text-white focus:border-blue-500/50 outline-none transition-all font-black uppercase tracking-wider shadow-inner"
                    />
                    <CustomCivSelect value={p.civId} onChange={(val) => setState({ ...state, [idx === 1 ? 'p1' : 'p2']: { ...p, civId: val } })} />
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-3 gap-8">
              <div className="bg-[#0a0f1a] border border-white/10 rounded-3xl p-8 space-y-4 shadow-xl">
                <label className="text-[13px] font-black text-blue-400 uppercase tracking-widest opacity-70 mb-6 block">Mappa Corrente</label>
                <div className="relative group"><MapIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-400/40" size={18} />
                  <select value={state.map} onChange={(e) => setState({ ...state, map: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-xl pl-12 pr-12 py-5 text-lg text-white focus:border-blue-500/50 outline-none font-black uppercase appearance-none cursor-pointer">{AOE4_MAPS.map(m => <option key={m} value={m} className="bg-slate-950">{m.toUpperCase()}</option>)}</select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500" size={20} /></div></div>
              <div className="bg-[#0a0f1a] border border-white/10 rounded-3xl p-8 space-y-4 shadow-xl">
                <div className="flex items-center justify-between mb-6">
                  <label className="text-[13px] font-black text-blue-400 uppercase tracking-widest opacity-70">Timer Overlay</label>
                  <div onClick={() => setState({ ...state, timer: { ...state.timer, active: !state.timer.active, timestamp: Date.now() } })} className={`w-12 h-6 rounded-full relative cursor-pointer transition-all ${state.timer.active ? 'bg-cyan-500 shadow-lg shadow-cyan-500/20' : 'bg-white/10'}`}><div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${state.timer.active ? 'left-7' : 'left-1'}`}></div></div></div>
                <div className="flex gap-3 items-center bg-black/40 rounded-xl p-4 border border-white/5 shadow-inner"><TimerIcon size={20} className="text-cyan-500/50" />
                  <input type="number" value={state.timer.min} onChange={(e) => setState({...state, timer: {...state.timer, min: parseInt(e.target.value)||0}})} className="w-16 bg-transparent text-center font-black text-white text-2xl" /><span className="text-gray-600 font-black">:</span>
                  <input type="number" value={state.timer.sec} onChange={(e) => setState({...state, timer: {...state.timer, sec: parseInt(e.target.value)||0}})} className="w-16 bg-transparent text-center font-black text-white text-2xl" /></div></div>
              <div className="bg-[#0a0f1a] border border-white/10 rounded-3xl p-8 space-y-4 shadow-xl">
                <label className="text-[13px] font-black text-blue-400 uppercase tracking-widest opacity-70 mb-6 block">Casters Status</label>
                <div className="space-y-4">{state.casters.map((c: any, idx: number) => (
                  <div key={idx} className="flex items-center gap-4 bg-black/40 p-4 rounded-xl border border-white/5 hover:border-blue-500/20 transition-all group overflow-hidden">
                    <input 
                      type="text" 
                      value={c.name} 
                      onChange={(e) => { const nc = [...state.casters]; nc[idx].name = e.target.value; setState({...state, casters: nc}); }} 
                      placeholder={`Nome Caster ${idx+1}`} 
                      className="flex-1 min-w-0 bg-transparent text-base font-black text-white outline-none placeholder:text-gray-700" 
                    />
                    <div 
                      onClick={() => { const nc = [...state.casters]; nc[idx].active = !nc[idx].active; setState({...state, casters: nc}); }}
                      className={`w-12 h-6 rounded-full relative cursor-pointer transition-all flex-shrink-0 ${c.active ? 'bg-cyan-500 shadow-lg shadow-cyan-500/20' : 'bg-white/10'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${c.active ? 'left-7' : 'left-1'}`}></div>
                    </div>
                  </div>))}</div></div>
            </div>
            <div className="flex justify-center pt-8"><SaveButton className="px-32 py-5 scale-110" /></div>
          </div>
        ) : (
          <div className="max-w-[1400px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-12">
            <div className="grid grid-cols-3 gap-12 items-stretch">
              <div className="space-y-4 flex flex-col justify-between">
                <h4 className="text-center text-[10px] font-black text-blue-400 uppercase tracking-[0.5em] pb-2 border-b border-blue-400/20 mb-4">Quarti di Finale</h4>
                {renderMatchInputs('q1', 'Match #01')}
                {renderMatchInputs('q2', 'Match #02')}
                {renderMatchInputs('q3', 'Match #03')}
                {renderMatchInputs('q4', 'Match #04')}
              </div>
              <div className="flex flex-col justify-around py-10">
                <h4 className="text-center text-[10px] font-black text-blue-400 uppercase tracking-[0.5em] pb-2 border-b border-blue-400/20 mb-4">Semifinale</h4>
                <div className="space-y-24">
                  {renderMatchInputs('s1', 'semifinale #01')}
                  {renderMatchInputs('s2', 'semifinale #02')}
                </div>
              </div>
              <div className="flex flex-col justify-center">
                <h4 className="text-center text-[11px] font-black text-yellow-500 uppercase tracking-[0.5em] pb-2 border-b border-yellow-500/20 mb-6">Finale</h4>
                {renderMatchInputs('f', 'Finale')}
              </div>
            </div>
            <div className="flex justify-center pt-12 border-t border-white/5"><SaveButton className="px-20 py-4" /></div>
          </div>
        )}
      </div>
    </div>
  );
}
