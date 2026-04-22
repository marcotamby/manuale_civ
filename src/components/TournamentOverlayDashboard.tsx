import { useState, useEffect } from 'react';
import { Save, Timer as TimerIcon, Map as MapIcon, Trophy, MousePointer2, RefreshCcw, Plus, Minus, Check } from 'lucide-react';
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
    if (window.confirm("Sicuro di voler resettare tutti i campi?")) {
      setState(DEFAULT_STATE);
    }
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
          {/* Player 1 Slot */}
          <div className="space-y-2">
            <div className="relative">
              <input
                type="text"
                value={match.p1}
                onChange={(e) => updateMatch('p1', e.target.value)}
                placeholder="NOME PLAYER"
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

          {/* Player 2 Slot */}
          <div className="space-y-2">
            <div className="relative">
              <input
                type="text"
                value={match.p2}
                onChange={(e) => updateMatch('p2', e.target.value)}
                placeholder="NOME PLAYER"
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
    <div className="flex flex-col h-full bg-[#05080f]">
      {/* Top Action Bar */}
      <div className="flex items-center justify-between p-6 bg-black/40 border-b border-white/10">
        <div className="flex gap-4">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${isSaving ? 'bg-gray-800 text-gray-500' : showSuccess ? 'bg-green-600 text-white' : 'bg-yellow-500 text-black hover:bg-yellow-400'}`}
          >
            {isSaving ? <RefreshCcw size={14} className="animate-spin" /> : <Save size={14} />}
            {isSaving ? 'Sincronizzando...' : showSuccess ? 'Configurato!' : 'Configura'}
          </button>
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-red-500/20 hover:border-red-500/30 transition-all font-black text-xs uppercase tracking-widest"
          >
            <RefreshCcw size={14} />
            Reset Campi
          </button>
        </div>

        <div className="flex gap-1 bg-black/40 p-1.5 rounded-2xl border border-white/5">
          <button
            onClick={() => setActiveTab('match')}
            className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'match' ? 'bg-white/10 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
          >
            Match Attivo
          </button>
          <button
            onClick={() => setActiveTab('bracket')}
            className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'bracket' ? 'bg-white/10 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
          >
            Tabellone
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
        {activeTab === 'match' ? (
          <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
            <div className="grid grid-cols-2 gap-8">
              {/* Player 1 Row */}
              <div className="bg-[#0a0f1a] border border-white/10 rounded-3xl p-8 space-y-6 shadow-2xl">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black text-[#D4AF37] uppercase tracking-widest opacity-60">Giocatore Sinistra (P1)</label>
                  <div className="flex items-center bg-black/40 rounded-xl p-1 border border-white/5">
                    <button onClick={() => setState({...state, p1: {...state.p1, score: Math.max(0, state.p1.score - 1)}})} className="w-8 h-8 flex items-center justify-center hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-all"><Minus size={14}/></button>
                    <span className="w-10 text-center font-black text-yellow-500 text-lg">{state.p1.score}</span>
                    <button onClick={() => setState({...state, p1: {...state.p1, score: state.p1.score + 1}})} className="w-8 h-8 flex items-center justify-center hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-all"><Plus size={14}/></button>
                  </div>
                </div>
                <input
                  type="text"
                  value={state.p1.name}
                  onChange={(e) => setState({ ...state, p1: { ...state.p1, name: e.target.value } })}
                  placeholder="NOME GIOCATORE"
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-lg text-white focus:border-[#D4AF37]/50 outline-none transition-all font-black uppercase tracking-wider shadow-inner"
                />
                <CivDropdown value={state.p1.civId} onChange={(val) => setState({ ...state, p1: { ...state.p1, civId: val } })} />
              </div>

              {/* Player 2 Row */}
              <div className="bg-[#0a0f1a] border border-white/10 rounded-3xl p-8 space-y-6 shadow-2xl">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black text-[#D4AF37] uppercase tracking-widest opacity-60">Giocatore Destra (P2)</label>
                  <div className="flex items-center bg-black/40 rounded-xl p-1 border border-white/5">
                    <button onClick={() => setState({...state, p2: {...state.p2, score: Math.max(0, state.p2.score - 1)}})} className="w-8 h-8 flex items-center justify-center hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-all"><Minus size={14}/></button>
                    <span className="w-10 text-center font-black text-yellow-500 text-lg">{state.p2.score}</span>
                    <button onClick={() => setState({...state, p2: {...state.p2, score: state.p2.score + 1}})} className="w-8 h-8 flex items-center justify-center hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-all"><Plus size={14}/></button>
                  </div>
                </div>
                <input
                  type="text"
                  value={state.p2.name}
                  onChange={(e) => setState({ ...state, p2: { ...state.p2, name: e.target.value } })}
                  placeholder="NOME GIOCATORE"
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-lg text-white focus:border-[#D4AF37]/50 outline-none transition-all font-black uppercase tracking-wider shadow-inner"
                />
                <CivDropdown value={state.p2.civId} onChange={(val) => setState({ ...state, p2: { ...state.p2, civId: val } })} />
              </div>
            </div>

            {/* Config & Widgets */}
            <div className="grid grid-cols-3 gap-8">
              <div className="bg-[#0a0f1a] border border-white/10 rounded-3xl p-6 space-y-4">
                <label className="text-[10px] font-black text-[#D4AF37] uppercase tracking-widest opacity-60">Mappa Corrente</label>
                <div className="relative group">
                  <MapIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-[#D4AF37]/40" size={18} />
                  <select
                    value={state.map}
                    onChange={(e) => setState({ ...state, map: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-sm text-white focus:border-[#D4AF37]/50 outline-none font-black uppercase"
                  >
                    {AOE4_MAPS.map(m => <option key={m} value={m} className="bg-slate-950">{m.toUpperCase()}</option>)}
                  </select>
                </div>
              </div>

              <div className="bg-[#0a0f1a] border border-white/10 rounded-3xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black text-[#D4AF37] uppercase tracking-widest opacity-60">Timer Overlay</label>
                  <div 
                    onClick={() => setState({ ...state, timer: { ...state.timer, active: !state.timer.active, timestamp: Date.now() } })}
                    className={`w-10 h-5 rounded-full relative cursor-pointer transition-all ${state.timer.active ? 'bg-cyan-500' : 'bg-white/10'}`}
                  >
                    <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${state.timer.active ? 'left-6' : 'left-1'}`}></div>
                  </div>
                </div>
                <div className="flex gap-2 items-center bg-black/40 rounded-xl p-2 border border-white/5">
                  <TimerIcon size={14} className="text-cyan-500/50" />
                  <input type="number" value={state.timer.min} onChange={(e) => setState({...state, timer: {...state.timer, min: parseInt(e.target.value)||0}})} className="w-10 bg-transparent text-center font-bold text-white text-sm" />
                  <span className="text-gray-600">:</span>
                  <input type="number" value={state.timer.sec} onChange={(e) => setState({...state, timer: {...state.timer, sec: parseInt(e.target.value)||0}})} className="w-10 bg-transparent text-center font-bold text-white text-sm" />
                </div>
              </div>

              <div className="bg-[#0a0f1a] border border-white/10 rounded-3xl p-6 space-y-4">
                <label className="text-[10px] font-black text-[#D4AF37] uppercase tracking-widest opacity-60">Casters Status</label>
                <div className="space-y-2">
                  {state.casters.map((c: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-3 bg-black/40 p-2 rounded-xl border border-white/5">
                      <div 
                        onClick={() => {
                          const nc = [...state.casters];
                          nc[idx].active = !nc[idx].active;
                          setState({...state, casters: nc});
                        }}
                        className={`w-4 h-4 rounded border flex items-center justify-center cursor-pointer transition-all ${c.active ? 'bg-yellow-500 border-yellow-500' : 'border-white/20'}`}
                      >
                        {c.active && <Check size={10} className="text-black" />}
                      </div>
                      <input 
                        type="text" 
                        value={c.name} 
                        onChange={(e) => {
                          const nc = [...state.casters];
                          nc[idx].name = e.target.value;
                          setState({...state, casters: nc});
                        }}
                        placeholder={`Caster ${idx+1}`}
                        className="flex-1 bg-transparent text-[11px] font-bold text-white outline-none"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-[1400px] mx-auto animate-in fade-in duration-500 space-y-12 pb-20">
             {/* Instruction Banner */}
             <div className="flex items-center gap-4 bg-yellow-500/10 border border-yellow-500/20 p-6 rounded-3xl">
              <div className="w-12 h-12 rounded-2xl bg-yellow-500/20 flex items-center justify-center text-yellow-500">
                <MousePointer2 size={24} />
              </div>
              <div>
                <h4 className="text-sm font-black text-white uppercase tracking-widest">Bracket Management</h4>
                <p className="text-xs text-gray-400 mt-1">Usa i tasti <span className="text-yellow-500 font-black">W</span> per definire i vincitori. Il tabellone è ora perfettamente simmetrico.</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-16 items-stretch">
              {/* QUARTERS */}
              <div className="space-y-8 flex flex-col justify-between">
                <h4 className="text-center text-[10px] font-black text-[#D4AF37] uppercase tracking-[0.4em] pb-2 border-b border-white/10 mb-4">Quarti di Finale</h4>
                {renderMatchInputs('q1', 'Match 1')}
                {renderMatchInputs('q2', 'Match 2')}
                {renderMatchInputs('q3', 'Match 3')}
                {renderMatchInputs('q4', 'Match 4')}
              </div>

              {/* SEMIS */}
              <div className="flex flex-col justify-around py-20">
                <h4 className="text-center text-[10px] font-black text-[#D4AF37] uppercase tracking-[0.4em] pb-2 border-b border-white/10 mb-4">Semifinali</h4>
                <div className="space-y-40">
                  {renderMatchInputs('s1', 'Semifinale 1')}
                  {renderMatchInputs('s2', 'Semifinale 2')}
                </div>
              </div>

              {/* FINAL */}
              <div className="flex flex-col justify-center">
                <h4 className="text-center text-[10px] font-black text-[#D4AF37] uppercase tracking-[0.4em] pb-2 border-b border-white/10 mb-4">Gran Finale</h4>
                <div className="p-2 bg-yellow-500/5 rounded-[40px] border border-yellow-500/20 shadow-2xl">
                  {renderMatchInputs('f', 'Finalissima')}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
