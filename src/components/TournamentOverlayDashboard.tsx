import { useState, useEffect } from 'react';
import { Save, Mic, Timer as TimerIcon, Map as MapIcon, Trophy } from 'lucide-react';
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
          // Merge with default to ensure new fields exist
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

  const CivDropdown = ({ value, onChange }: { value: string, onChange: (val: string) => void }) => {
    const selectedCiv = civilizationsData.find(c => c.id === value);
    
    return (
      <div className="relative group">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-[#0d111a] border border-white/10 rounded-xl pl-12 pr-4 py-3 text-sm text-white focus:border-[#D4AF37]/50 outline-none transition-all cursor-pointer appearance-none font-bold"
        >
          <option value="">SELEZIONA CIVILTA'</option>
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
            className="absolute left-3.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-md object-cover border border-white/10 shadow-sm pointer-events-none"
          />
        ) : (
          <Trophy className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" size={18} />
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
      <div className="bg-black/30 border border-white/5 rounded-xl p-3 space-y-3">
        <div className="flex items-center justify-between px-1">
          <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">{label}</span>
          <div className="flex gap-1">
            <button 
              onClick={() => updateMatch('w', match.w === 1 ? 0 : 1)}
              className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-black transition-all ${match.w === 1 ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/20' : 'bg-white/5 text-gray-600 hover:text-white'}`}
            >
              W
            </button>
            <button 
              onClick={() => updateMatch('w', match.w === 2 ? 0 : 2)}
              className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-black transition-all ${match.w === 2 ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/20' : 'bg-white/5 text-gray-600 hover:text-white'}`}
            >
              W
            </button>
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={match.p1}
              onChange={(e) => updateMatch('p1', e.target.value)}
              placeholder="Player 1"
              className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-yellow-500/30"
            />
            <div className="w-24">
              <select
                value={match.p1Civ}
                onChange={(e) => updateMatch('p1Civ', e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-lg px-1 py-1.5 text-[10px] text-gray-400 outline-none"
              >
                <option value="">CIV</option>
                {civilizationsData.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={match.p2}
              onChange={(e) => updateMatch('p2', e.target.value)}
              placeholder="Player 2"
              className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-yellow-500/30"
            />
            <div className="w-24">
              <select
                value={match.p2Civ}
                onChange={(e) => updateMatch('p2Civ', e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-lg px-1 py-1.5 text-[10px] text-gray-400 outline-none"
              >
                <option value="">CIV</option>
                {civilizationsData.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-8 space-y-8">
      {/* Tab Switcher */}
      <div className="flex gap-1 bg-black/40 p-1 rounded-xl w-fit border border-white/5 mx-auto">
        <button
          onClick={() => setActiveTab('match')}
          className={`px-8 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'match' ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/20' : 'text-gray-500 hover:text-white'}`}
        >
          Match Attivo
        </button>
        <button
          onClick={() => setActiveTab('bracket')}
          className={`px-8 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'bracket' ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/20' : 'text-gray-500 hover:text-white'}`}
        >
          Tabellone Torneo
        </button>
      </div>

      <div className="min-h-[500px]">
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
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-6">
            {/* Bracket Management */}
            <div className="grid grid-cols-3 gap-6 items-start">
              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-[#C0C0C0] uppercase tracking-[0.2em] mb-4 text-center">Quarti di Finale</h4>
                {renderMatchInputs('q1', 'Match 1')}
                {renderMatchInputs('q2', 'Match 2')}
                {renderMatchInputs('q3', 'Match 3')}
                {renderMatchInputs('q4', 'Match 4')}
              </div>
              <div className="space-y-4 pt-12">
                <h4 className="text-[10px] font-black text-[#C0C0C0] uppercase tracking-[0.2em] mb-4 text-center">Semifinali</h4>
                <div className="space-y-24">
                  {renderMatchInputs('s1', 'Semi 1')}
                  {renderMatchInputs('s2', 'Semi 2')}
                </div>
              </div>
              <div className="space-y-4 pt-48">
                <h4 className="text-[10px] font-black text-[#C0C0C0] uppercase tracking-[0.2em] mb-4 text-center">Gran Finale</h4>
                <div className="p-1 bg-white/5 border border-white/10 rounded-2xl shadow-2xl">
                  {renderMatchInputs('f', 'Finalissima')}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Global Save Button */}
      <div className="flex justify-center border-t border-white/5 pt-8">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className={`flex items-center gap-3 px-16 py-5 rounded-2xl font-black text-xl uppercase tracking-wider transition-all transform hover:scale-105 active:scale-95 shadow-2xl ${
            isSaving 
              ? 'bg-gray-700 text-gray-400 cursor-not-allowed' 
              : showSuccess
                ? 'bg-green-600 text-white shadow-green-500/40'
                : 'bg-yellow-500 text-black hover:bg-yellow-400 shadow-yellow-500/40'
          }`}
        >
          <Save size={28} className={isSaving ? 'animate-spin' : ''} />
          {isSaving ? 'Sincronizzazione...' : showSuccess ? 'Overlay Sincronizzato' : 'Sincronizza Overlay'}
        </button>
      </div>
    </div>
  );
}
