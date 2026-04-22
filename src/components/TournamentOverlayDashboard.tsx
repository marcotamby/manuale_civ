import { useState, useEffect } from 'react';
import { Save, Timer as TimerIcon, Map as MapIcon, Trophy, MousePointer2, RefreshCcw, Plus, Minus, Check, AlertCircle, X } from 'lucide-react';
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

  const CivDropdown = ({ value, onChange, size = "md" }: { value: string, onChange: (val: string) => void, size?: "sm" | "md" }) => {
    const selectedCiv = civilizationsData.find(c => c.id === value);
    const isSm = size === "sm";
    
    return (
      <div className="relative group">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full bg-[#0a0f1a] border border-white/10 rounded-xl pl-12 pr-4 ${isSm ? 'py-2.5 text-[11px]' : 'py-3.5 text-sm'} text-white focus:border-[#D4AF37]/50 outline-none transition-all cursor-pointer appearance-none font-bold uppercase tracking-wider`}
        >
          <option value="">{isSm ? 'CIV' : 'SELEZIONA CIVILTA\''}</option>
          {civilizationsData.map(civ => (
            <option key={civ.id} value={civ.id} className="bg-[#0a0f1a]">
              {civ.name.toUpperCase()}
            </option>
          ))}
        </select>
        {selectedCiv ? (
          <img 
            src={`/civs/${selectedCiv.flag}`} 
            alt="" 
            className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${isSm ? 'w-5 h-5' : 'w-6 h-6'} rounded-md object-cover border border-white/10 shadow-sm pointer-events-none`}
          />
        ) : (
          <Trophy className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" size={isSm ? 14 : 18} />
        )}
      </div>
    );
  };

  const renderMatchInputs = (matchId: string, label: string) => {
    const match = state.bracket[matchId] || { p1: '', p2: '', p1Civ: '', p2Civ: '', w: 0 };
    
    const updateMatch = (field: string, val: any) => {
      setState({
        ...state,
        bracket: {
          ...state.bracket,
          [matchId]: { ...match, [field]: val }
        }
      });
    };

    return (
      <div className="bg-black/50 border border-white/10 rounded-3xl p-5 space-y-4 shadow-2xl relative group hover:border-[#D4AF37]/30 transition-all">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-black text-[#D4AF37] uppercase tracking-[0.2em] opacity-60">{label}</span>
        </div>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="relative">
              <input
                type="text"
                value={match.p1}
                onChange={(e) => updateMatch('p1', e.target.value)}
                placeholder="PLAYER A"
                className="w-full bg-[#0d111a] border border-white/10 rounded-xl pl-4 pr-12 py-3 text-sm text-white outline-none focus:border-yellow-500/30 font-black uppercase"
              />
              <button 
                onClick={() => updateMatch('w', match.w === 1 ? 0 : 1)}
                className={`absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black transition-all ${match.w === 1 ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/30' : 'bg-white/5 text-gray-600 hover:text-white'}`}
              >
                W
              </button>
            </div>
            <CivDropdown size="sm" value={match.p1Civ} onChange={(val) => updateMatch('p1Civ', val)} />
          </div>

          <div className="flex items-center gap-2 justify-center opacity-20">
            <div className="h-[1px] flex-1 bg-white"></div>
            <span className="text-[8px] font-black">VS</span>
            <div className="h-[1px] flex-1 bg-white"></div>
          </div>

          <div className="space-y-2">
            <div className="relative">
              <input
                type="text"
                value={match.p2}
                onChange={(e) => updateMatch('p2', e.target.value)}
                placeholder="PLAYER B"
                className="w-full bg-[#0d111a] border border-white/10 rounded-xl pl-4 pr-12 py-3 text-sm text-white outline-none focus:border-yellow-500/30 font-black uppercase"
              />
              <button 
                onClick={() => updateMatch('w', match.w === 2 ? 0 : 2)}
                className={`absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black transition-all ${match.w === 2 ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/30' : 'bg-white/5 text-gray-600 hover:text-white'}`}
              >
                W
              </button>
            </div>
            <CivDropdown size="sm" value={match.p2Civ} onChange={(val) => updateMatch('p2Civ', val)} />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-[#05080f] font-inter">
      {/* Top Action Bar */}
      <div className="flex items-center justify-between p-6 bg-black/40 border-b border-white/10 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className={`flex items-center gap-2 px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-lg ${isSaving ? 'bg-gray-800 text-gray-500' : showSuccess ? 'bg-green-600 text-white shadow-green-500/20' : 'bg-yellow-500 text-black hover:bg-yellow-400 shadow-yellow-500/20'}`}
          >
            {isSaving ? <RefreshCcw size={14} className="animate-spin" /> : <Save size={14} />}
            {isSaving ? 'Sincronizzando...' : showSuccess ? 'Configurato!' : 'Configura'}
          </button>
          
          <div className="flex items-center gap-2">
            {!showResetConfirm ? (
              <button
                onClick={() => setShowResetConfirm(true)}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-red-600/10 border border-red-600/30 text-red-500 hover:bg-red-600 hover:text-white transition-all font-black text-xs uppercase tracking-widest"
              >
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
        </div>

        <div className="flex gap-1 bg-black/60 p-1.5 rounded-2xl border border-white/5 shadow-inner">
          <button
            onClick={() => setActiveTab('match')}
            className={`px-10 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'match' ? 'bg-white/10 text-white shadow-xl border border-white/10' : 'text-gray-500 hover:text-white'}`}
          >
            Match Attivo
          </button>
          <button
            onClick={() => setActiveTab('bracket')}
            className={`px-10 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'bracket' ? 'bg-white/10 text-white shadow-xl border border-white/10' : 'text-gray-500 hover:text-white'}`}
          >
            Tabellone
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-8 bg-gradient-to-b from-transparent to-black/20">
        {activeTab === 'match' ? (
          <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="grid grid-cols-2 gap-8">
              {/* Player 1 Row */}
              <div className="bg-[#0a0f1a] border border-white/10 rounded-3xl p-8 space-y-6 shadow-2xl hover:border-[#D4AF37]/20 transition-all">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black text-[#D4AF37] uppercase tracking-widest opacity-60">Giocatore Sinistra (P1)</label>
                  <div className="flex items-center bg-black/60 rounded-xl p-1 border border-white/10">
                    <button onClick={() => setState({...state, p1: {...state.p1, score: Math.max(0, state.p1.score - 1)}})} className="w-10 h-10 flex items-center justify-center hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-all"><Minus size={18}/></button>
                    <span className="w-12 text-center font-black text-yellow-500 text-2xl">{state.p1.score}</span>
                    <button onClick={() => setState({...state, p1: {...state.p1, score: state.p1.score + 1}})} className="w-10 h-10 flex items-center justify-center hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-all"><Plus size={18}/></button>
                  </div>
                </div>
                <input
                  type="text"
                  value={state.p1.name}
                  onChange={(e) => setState({ ...state, p1: { ...state.p1, name: e.target.value } })}
                  placeholder="NOME GIOCATORE"
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-5 text-xl text-white focus:border-[#D4AF37]/50 outline-none transition-all font-black uppercase tracking-wider shadow-inner"
                />
                <CivDropdown value={state.p1.civId} onChange={(val) => setState({ ...state, p1: { ...state.p1, civId: val } })} />
              </div>

              {/* Player 2 Row */}
              <div className="bg-[#0a0f1a] border border-white/10 rounded-3xl p-8 space-y-6 shadow-2xl hover:border-[#D4AF37]/20 transition-all">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black text-[#D4AF37] uppercase tracking-widest opacity-60">Giocatore Destra (P2)</label>
                  <div className="flex items-center bg-black/60 rounded-xl p-1 border border-white/10">
                    <button onClick={() => setState({...state, p2: {...state.p2, score: Math.max(0, state.p2.score - 1)}})} className="w-10 h-10 flex items-center justify-center hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-all"><Minus size={18}/></button>
                    <span className="w-12 text-center font-black text-yellow-500 text-2xl">{state.p2.score}</span>
                    <button onClick={() => setState({...state, p2: {...state.p2, score: state.p2.score + 1}})} className="w-10 h-10 flex items-center justify-center hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-all"><Plus size={18}/></button>
                  </div>
                </div>
                <input
                  type="text"
                  value={state.p2.name}
                  onChange={(e) => setState({ ...state, p2: { ...state.p2, name: e.target.value } })}
                  placeholder="NOME GIOCATORE"
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-5 text-xl text-white focus:border-[#D4AF37]/50 outline-none transition-all font-black uppercase tracking-wider shadow-inner"
                />
                <CivDropdown value={state.p2.civId} onChange={(val) => setState({ ...state, p2: { ...state.p2, civId: val } })} />
              </div>
            </div>

            {/* Config & Widgets */}
            <div className="grid grid-cols-3 gap-8">
              <div className="bg-[#0a0f1a] border border-white/10 rounded-3xl p-7 space-y-4 shadow-xl">
                <label className="text-[10px] font-black text-[#D4AF37] uppercase tracking-widest opacity-60">Mappa Corrente</label>
                <div className="relative group">
                  <MapIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-[#D4AF37]/40" size={18} />
                  <select
                    value={state.map}
                    onChange={(e) => setState({ ...state, map: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 rounded-xl pl-12 pr-12 py-4 text-sm text-white focus:border-[#D4AF37]/50 outline-none font-black uppercase appearance-none cursor-pointer"
                  >
                    {AOE4_MAPS.map(m => <option key={m} value={m} className="bg-slate-950">{m.toUpperCase()}</option>)}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">▼</div>
                </div>
              </div>

              <div className="bg-[#0a0f1a] border border-white/10 rounded-3xl p-7 space-y-4 shadow-xl">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black text-[#D4AF37] uppercase tracking-widest opacity-60">Timer Overlay</label>
                  <div 
                    onClick={() => setState({ ...state, timer: { ...state.timer, active: !state.timer.active, timestamp: Date.now() } })}
                    className={`w-12 h-6 rounded-full relative cursor-pointer transition-all ${state.timer.active ? 'bg-cyan-500 shadow-lg shadow-cyan-500/20' : 'bg-white/10'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${state.timer.active ? 'left-7' : 'left-1'}`}></div>
                  </div>
                </div>
                <div className="flex gap-3 items-center bg-black/40 rounded-xl p-3 border border-white/5 shadow-inner">
                  <TimerIcon size={18} className="text-cyan-500/50" />
                  <input type="number" value={state.timer.min} onChange={(e) => setState({...state, timer: {...state.timer, min: parseInt(e.target.value)||0}})} className="w-12 bg-transparent text-center font-black text-white text-lg" />
                  <span className="text-gray-600 font-black">:</span>
                  <input type="number" value={state.timer.sec} onChange={(e) => setState({...state, timer: {...state.timer, sec: parseInt(e.target.value)||0}})} className="w-12 bg-transparent text-center font-black text-white text-lg" />
                </div>
              </div>

              <div className="bg-[#0a0f1a] border border-white/10 rounded-3xl p-7 space-y-4 shadow-xl">
                <label className="text-[10px] font-black text-[#D4AF37] uppercase tracking-widest opacity-60">Casters Status</label>
                <div className="space-y-3">
                  {state.casters.map((c: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-4 bg-black/40 p-3 rounded-xl border border-white/5 hover:border-yellow-500/20 transition-all group">
                      <div 
                        onClick={() => {
                          const nc = [...state.casters];
                          nc[idx].active = !nc[idx].active;
                          setState({...state, casters: nc});
                        }}
                        className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center cursor-pointer transition-all ${c.active ? 'bg-yellow-500 border-yellow-500 shadow-lg shadow-yellow-500/20' : 'border-white/10 group-hover:border-white/30'}`}
                      >
                        {c.active && <Check size={14} className="text-black font-black" />}
                      </div>
                      <input 
                        type="text" 
                        value={c.name} 
                        onChange={(e) => {
                          const nc = [...state.casters];
                          nc[idx].name = e.target.value;
                          setState({...state, casters: nc});
                        }}
                        placeholder={`Nome Caster ${idx+1}`}
                        className="flex-1 bg-transparent text-xs font-black text-white outline-none placeholder:text-gray-700"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-[1500px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-16 pb-32">
            <div className="grid grid-cols-3 gap-20 items-stretch">
              {/* QUARTERS */}
              <div className="space-y-12 flex flex-col justify-between">
                <h4 className="text-center text-[11px] font-black text-[#D4AF37] uppercase tracking-[0.5em] pb-3 border-b-2 border-[#D4AF37]/20 mb-8">Quarti di Finale</h4>
                {renderMatchInputs('q1', 'Match #01')}
                {renderMatchInputs('q2', 'Match #02')}
                {renderMatchInputs('q3', 'Match #03')}
                {renderMatchInputs('q4', 'Match #04')}
              </div>

              {/* SEMIS */}
              <div className="flex flex-col justify-around py-32">
                <h4 className="text-center text-[11px] font-black text-[#D4AF37] uppercase tracking-[0.5em] pb-3 border-b-2 border-[#D4AF37]/20 mb-8">Semifinali</h4>
                <div className="space-y-64">
                  {renderMatchInputs('s1', 'Semifinale Nord')}
                  {renderMatchInputs('s2', 'Semifinale Sud')}
                </div>
              </div>

              {/* FINAL */}
              <div className="flex flex-col justify-center">
                <h4 className="text-center text-[11px] font-black text-[#D4AF37] uppercase tracking-[0.5em] pb-3 border-b-2 border-[#D4AF37]/20 mb-8">Gran Finale</h4>
                <div className="p-3 bg-yellow-500/5 rounded-[48px] border-2 border-yellow-500/20 shadow-2xl shadow-yellow-500/10">
                  {renderMatchInputs('f', 'Finalissima Oro')}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
