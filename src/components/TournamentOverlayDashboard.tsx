import { useState, useEffect } from 'react';
import { Save, Mic, Timer as TimerIcon, Map as MapIcon, Check, Trophy, MousePointer2 } from 'lucide-react';
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

  const CivDropdown = ({ value, onChange, size = "md" }: { value: string, onChange: (val: string) => void, size?: "sm" | "md" }) => {
    const selectedCiv = civilizationsData.find(c => c.id === value);
    const isSm = size === "sm";
    
    return (
      <div className="relative group">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full bg-[#0d111a] border border-white/10 rounded-xl pl-12 pr-4 ${isSm ? 'py-2 text-[11px]' : 'py-3 text-sm'} text-white focus:border-[#D4AF37]/50 outline-none transition-all cursor-pointer appearance-none font-bold`}
        >
          <option value="">{isSm ? 'CIV' : 'SELEZIONA CIVILTA\''}</option>
          {civilizationsData.map(civ => (
            <option key={civ.id} value={civ.id} className="bg-slate-900">
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
      <div className="bg-black/40 border border-white/10 rounded-2xl p-4 space-y-4 shadow-xl">
        <div className="flex items-center justify-between px-1">
          <span className="text-[11px] font-black text-[#D4AF37] uppercase tracking-widest">{label}</span>
          <div className="flex gap-1.5">
            <button 
              onClick={() => updateMatch('w', match.w === 1 ? 0 : 1)}
              className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black transition-all ${match.w === 1 ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/20' : 'bg-white/5 text-gray-500 hover:text-white border border-white/5'}`}
            >
              W
            </button>
            <button 
              onClick={() => updateMatch('w', match.w === 2 ? 0 : 2)}
              className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black transition-all ${match.w === 2 ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/20' : 'bg-white/5 text-gray-500 hover:text-white border border-white/5'}`}
            >
              W
            </button>
          </div>
        </div>
        
        <div className="space-y-3">
          <div className="space-y-1.5">
            <input
              type="text"
              value={match.p1}
              onChange={(e) => updateMatch('p1', e.target.value)}
              placeholder="Player 1"
              className="w-full bg-[#0d111a] border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-yellow-500/30 font-bold"
            />
            <CivDropdown size="sm" value={match.p1Civ} onChange={(val) => updateMatch('p1Civ', val)} />
          </div>
          <div className="h-[1px] bg-white/5 mx-2"></div>
          <div className="space-y-1.5">
            <input
              type="text"
              value={match.p2}
              onChange={(e) => updateMatch('p2', e.target.value)}
              placeholder="Player 2"
              className="w-full bg-[#0d111a] border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-yellow-500/30 font-bold"
            />
            <CivDropdown size="sm" value={match.p2Civ} onChange={(val) => updateMatch('p2Civ', val)} />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-8 space-y-8">
      {/* Tab Switcher */}
      <div className="flex gap-1 bg-black/40 p-1.5 rounded-2xl w-fit border border-white/10 mx-auto shadow-inner">
        <button
          onClick={() => setActiveTab('match')}
          className={`px-10 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'match' ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/20' : 'text-gray-500 hover:text-white'}`}
        >
          Match Attivo
        </button>
        <button
          onClick={() => setActiveTab('bracket')}
          className={`px-10 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'bracket' ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/20' : 'text-gray-500 hover:text-white'}`}
        >
          Tabellone Torneo
        </button>
      </div>

      <div className="min-h-[600px]">
        {activeTab === 'match' ? (
          <div className="animate-in fade-in slide-in-from-top-2 duration-300 space-y-8">
            <div className="grid grid-cols-2 gap-8">
              {/* Player 1 Row */}
              <div className="bg-[#161b2b] border border-[#D4AF37]/20 rounded-2xl p-6 space-y-4 shadow-xl">
                <label className="text-[10px] font-black text-[#D4AF37] uppercase tracking-widest px-1">Player 1 (Sinistra)</label>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={state.p1.name}
                    onChange={(e) => setState({ ...state, p1: { ...state.p1, name: e.target.value } })}
                    placeholder="NOME GIOCATORE"
                    className="flex-1 bg-[#0d111a] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-[#D4AF37]/50 outline-none transition-all font-bold"
                  />
                  <input
                    type="number"
                    value={state.p1.score}
                    onChange={(e) => setState({ ...state, p1: { ...state.p1, score: parseInt(e.target.value) || 0 } })}
                    className="w-20 bg-[#0d111a] border border-white/10 rounded-xl px-4 py-3 text-center text-sm text-[#D4AF37] font-black outline-none"
                  />
                </div>
                <CivDropdown value={state.p1.civId} onChange={(val) => setState({ ...state, p1: { ...state.p1, civId: val } })} />
              </div>

              {/* Player 2 Row */}
              <div className="bg-[#161b2b] border border-[#D4AF37]/20 rounded-2xl p-6 space-y-4 shadow-xl">
                <label className="text-[10px] font-black text-[#D4AF37] uppercase tracking-widest px-1">Player 2 (Destra)</label>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={state.p2.name}
                    onChange={(e) => setState({ ...state, p2: { ...state.p2, name: e.target.value } })}
                    placeholder="NOME GIOCATORE"
                    className="flex-1 bg-[#0d111a] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-[#D4AF37]/50 outline-none transition-all font-bold"
                  />
                  <input
                    type="number"
                    value={state.p2.score}
                    onChange={(e) => setState({ ...state, p2: { ...state.p2, score: parseInt(e.target.value) || 0 } })}
                    className="w-20 bg-[#0d111a] border border-white/10 rounded-xl px-4 py-3 text-center text-sm text-[#D4AF37] font-black outline-none"
                  />
                </div>
                <CivDropdown value={state.p2.civId} onChange={(val) => setState({ ...state, p2: { ...state.p2, civId: val } })} />
              </div>
            </div>

            {/* Map & Timer */}
            <div className="grid grid-cols-2 gap-8">
              <div className="bg-[#161b2b] border border-[#D4AF37]/20 rounded-2xl p-6 shadow-xl">
                <label className="text-[10px] font-black text-[#D4AF37] uppercase tracking-widest px-1 block mb-4">Configurazione Partita</label>
                <div className="space-y-4">
                  <div className="relative group">
                    <MapIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-[#D4AF37]/40 group-focus-within:text-[#D4AF37] transition-colors" size={18} />
                    <select
                      value={state.map}
                      onChange={(e) => setState({ ...state, map: e.target.value })}
                      className="w-full bg-[#0d111a] border border-white/10 rounded-xl pl-12 pr-4 py-3 text-sm text-white focus:border-[#D4AF37]/50 outline-none transition-all cursor-pointer appearance-none font-bold"
                    >
                      {AOE4_MAPS.map(m => <option key={m} value={m} className="bg-slate-900 text-white">{m.toUpperCase()}</option>)}
                    </select>
                  </div>
                  
                  <div className="flex gap-2 items-center bg-[#0d111a] border border-white/10 rounded-xl p-1 px-3 group focus-within:border-[#D4AF37]/50 transition-all">
                    <TimerIcon className="text-[#D4AF37]/40 group-focus-within:text-[#D4AF37] transition-colors" size={18} />
                    <input
                      type="number"
                      value={state.timer.min}
                      onChange={(e) => setState({ ...state, timer: { ...state.timer, min: parseInt(e.target.value) || 0 } })}
                      className="w-12 bg-transparent text-center text-sm text-white font-bold outline-none"
                    />
                    <span className="text-gray-600">:</span>
                    <input
                      type="number"
                      value={state.timer.sec}
                      onChange={(e) => setState({ ...state, timer: { ...state.timer, sec: parseInt(e.target.value) || 0 } })}
                      className="w-12 bg-transparent text-center text-sm text-white font-bold outline-none"
                    />
                    <button 
                      onClick={() => setState({ ...state, timer: { ...state.timer, active: !state.timer.active, timestamp: Date.now() } })}
                      className={`ml-auto px-6 py-2 rounded-lg text-[10px] font-black transition-all ${state.timer.active ? 'bg-red-500/20 text-red-500 border border-red-500/30' : 'bg-[#D4AF37] text-black'}`}
                    >
                      {state.timer.active ? 'FERMA TIMER' : 'AVVIA TIMER'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Casters */}
              <div className="bg-[#161b2b] border border-[#D4AF37]/20 rounded-2xl p-6 shadow-xl">
                <label className="text-[10px] font-black text-[#D4AF37] uppercase tracking-widest px-1 block mb-4">Commentatori (Casters)</label>
                <div className="space-y-3">
                  {state.casters.map((caster: any, idx: number) => (
                    <div key={idx} className="flex gap-2">
                      <div className="flex-1 relative">
                        <Mic size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                        <input
                          type="text"
                          value={caster.name}
                          onChange={(e) => {
                            const newCasters = [...state.casters];
                            newCasters[idx].name = e.target.value;
                            setState({ ...state, casters: newCasters });
                          }}
                          placeholder={`Nome Caster ${idx + 1}`}
                          className="w-full bg-[#0d111a] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:border-[#D4AF37]/50 outline-none"
                        />
                      </div>
                      <button
                        onClick={() => {
                          const newCasters = [...state.casters];
                          newCasters[idx].active = !newCasters[idx].active;
                          setState({ ...state, casters: newCasters });
                        }}
                        className={`px-4 rounded-xl text-[10px] font-black transition-all ${caster.active ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/20' : 'bg-white/5 text-gray-500'}`}
                      >
                        {caster.active ? 'LIVE' : 'OFF'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-10">
            {/* Instruction Banner */}
            <div className="flex items-center gap-4 bg-yellow-500/10 border border-yellow-500/30 p-5 rounded-2xl">
              <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center text-yellow-500 shadow-lg shadow-yellow-500/10">
                <MousePointer2 size={24} />
              </div>
              <div>
                <h4 className="text-sm font-black text-white uppercase tracking-wider">Gestione Vincitore</h4>
                <p className="text-xs text-gray-400 mt-1">Usa il tasto <span className="text-yellow-500 font-bold px-1.5 py-0.5 bg-yellow-500/10 rounded border border-yellow-500/20">W</span> per indicare chi ha vinto il match e farlo progredire.</p>
              </div>
            </div>

            {/* Bracket Management */}
            <div className="grid grid-cols-3 gap-10 items-start pb-10">
              <div className="space-y-6">
                <h4 className="text-xs font-black text-[#D4AF37] uppercase tracking-[0.3em] mb-6 text-center border-b border-white/10 pb-2">Quarti di Finale</h4>
                {renderMatchInputs('q1', 'Match 1')}
                {renderMatchInputs('q2', 'Match 2')}
                {renderMatchInputs('q3', 'Match 3')}
                {renderMatchInputs('q4', 'Match 4')}
              </div>
              <div className="space-y-6 pt-16">
                <h4 className="text-xs font-black text-[#D4AF37] uppercase tracking-[0.3em] mb-6 text-center border-b border-white/10 pb-2">Semifinali</h4>
                <div className="space-y-32">
                  {renderMatchInputs('s1', 'Semi 1')}
                  {renderMatchInputs('s2', 'Semi 2')}
                </div>
              </div>
              <div className="space-y-6 pt-64">
                <h4 className="text-xs font-black text-[#D4AF37] uppercase tracking-[0.3em] mb-6 text-center border-b border-white/10 pb-2">Gran Finale</h4>
                <div className="p-1.5 bg-yellow-500/5 border border-yellow-500/20 rounded-3xl shadow-2xl">
                  {renderMatchInputs('f', 'Finalissima')}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Global Save Button */}
      <div className="flex justify-center border-t border-white/10 pt-8">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className={`flex items-center gap-4 px-20 py-6 rounded-2xl font-black text-2xl uppercase tracking-wider transition-all transform hover:scale-105 active:scale-95 shadow-2xl ${
            isSaving 
              ? 'bg-gray-700 text-gray-400 cursor-not-allowed' 
              : showSuccess
                ? 'bg-green-600 text-white shadow-green-500/40'
                : 'bg-yellow-500 text-black hover:bg-yellow-400 shadow-yellow-500/40'
          }`}
        >
          <Save size={32} className={isSaving ? 'animate-spin' : ''} />
          {isSaving ? 'Sincronizzazione...' : showSuccess ? 'Overlay Sincronizzato' : 'Sincronizza Overlay'}
        </button>
      </div>
    </div>
  );
}
