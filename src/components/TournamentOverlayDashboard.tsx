import { useState, useEffect } from 'react';
import { Save, Mic, Timer as TimerIcon, Map as MapIcon, Trophy, Check } from 'lucide-react';
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
    q1: { p1: '', p2: '', w: 0 },
    q2: { p1: '', p2: '', w: 0 },
    q3: { p1: '', p2: '', w: 0 },
    q4: { p1: '', p2: '', w: 0 },
    s1: { p1: '', p2: '', w: 0 },
    s2: { p1: '', p2: '', w: 0 },
    f: { p1: '', p2: '', w: 0 }
  }
};

export function TournamentOverlayDashboard({ onError }: TournamentOverlayDashboardProps) {
  const [state, setState] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'match' | 'bracket'>('match');

  useEffect(() => {
    overlayService.getOverlayState('tournament-1v1-bracket').then(savedState => {
      if (savedState) {
        setState({ ...DEFAULT_STATE, ...savedState });
      } else {
        setState(DEFAULT_STATE);
      }
    });
  }, []);

  const handleSave = async () => {
    if (!state) return;
    setIsSaving(true);
    try {
      await overlayService.updateOverlayState('tournament-1v1-bracket', state);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error: any) {
      onError(`Errore salvataggio: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const updateBracket = (matchId: string, field: string, value: any) => {
    setState((prev: any) => ({
      ...prev,
      bracket: {
        ...prev.bracket,
        [matchId]: { ...prev.bracket[matchId], [field]: value }
      }
    }));
  };

  if (!state) return <div className="p-8 text-center text-gray-500 italic">Inizializzazione dashboard...</div>;

  return (
    <div className="space-y-6">
      {/* Tab Selector */}
      <div className="flex gap-2 p-1 bg-black/40 border border-white/5 rounded-xl w-fit mx-auto mb-6">
        <button
          onClick={() => setActiveTab('match')}
          className={`px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'match' ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/20' : 'text-gray-500 hover:text-white'}`}
        >
          Match Attivo
        </button>
        <button
          onClick={() => setActiveTab('bracket')}
          className={`px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'bracket' ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/20' : 'text-gray-500 hover:text-white'}`}
        >
          Tabellone Torneo
        </button>
      </div>

      {activeTab === 'match' ? (
        <div className="animate-in fade-in slide-in-from-top-2 duration-300 space-y-6">
          <div className="grid grid-cols-2 gap-6">
            {/* Player 1 */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <label className="text-[10px] font-black text-yellow-500 uppercase tracking-widest mb-4 block">Giocatore 1 (Sinistra)</label>
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] text-gray-500 uppercase mb-1 block">Nome</label>
                  <input
                    type="text"
                    value={state.p1.name}
                    onChange={(e) => setState({ ...state, p1: { ...state.p1, name: e.target.value } })}
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-yellow-500/50 outline-none"
                    placeholder="Nome Giocatore"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] text-gray-500 uppercase mb-1 block">Score</label>
                    <input
                      type="number"
                      value={state.p1.score}
                      onChange={(e) => setState({ ...state, p1: { ...state.p1, score: parseInt(e.target.value) || 0 } })}
                      className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white text-center font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 uppercase mb-1 block">Civiltà</label>
                    <select
                      value={state.p1.civId}
                      onChange={(e) => setState({ ...state, p1: { ...state.p1, civId: e.target.value } })}
                      className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                    >
                      <option value="">Nessuna</option>
                      {civilizationsData.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Player 2 */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <label className="text-[10px] font-black text-yellow-500 uppercase tracking-widest mb-4 block">Giocatore 2 (Destra)</label>
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] text-gray-500 uppercase mb-1 block">Nome</label>
                  <input
                    type="text"
                    value={state.p2.name}
                    onChange={(e) => setState({ ...state, p2: { ...state.p2, name: e.target.value } })}
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-yellow-500/50 outline-none"
                    placeholder="Nome Giocatore"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] text-gray-500 uppercase mb-1 block">Score</label>
                    <input
                      type="number"
                      value={state.p2.score}
                      onChange={(e) => setState({ ...state, p2: { ...state.p2, score: parseInt(e.target.value) || 0 } })}
                      className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white text-center font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 uppercase mb-1 block">Civiltà</label>
                    <select
                      value={state.p2.civId}
                      onChange={(e) => setState({ ...state, p2: { ...state.p2, civId: e.target.value } })}
                      className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                    >
                      <option value="">Nessuna</option>
                      {civilizationsData.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <MapIcon size={16} className="text-yellow-500" />
              <label className="text-[10px] font-black text-yellow-500 uppercase tracking-widest block">Mappa Match Attuale</label>
            </div>
            <select
              value={state.map}
              onChange={(e) => setState({ ...state, map: e.target.value })}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-lg font-bold outline-none focus:border-yellow-500/50"
            >
              {AOE4_MAPS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>
      ) : (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-6">
          {/* Bracket Management */}
          <div className="grid grid-cols-3 gap-6 items-start">
            {/* Quarters */}
            <div className="space-y-4">
              <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-4 text-center">Quarti di Finale</h4>
              {['q1', 'q2', 'q3', 'q4'].map((rid) => (
                <div key={rid} className="p-3 bg-white/5 border border-white/10 rounded-xl space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Player 1"
                      value={state.bracket[rid].p1}
                      onChange={(e) => updateBracket(rid, 'p1', e.target.value)}
                      className="flex-1 bg-black/40 border border-white/5 rounded px-2 py-1 text-[10px] text-white"
                    />
                    <button onClick={() => updateBracket(rid, 'w', state.bracket[rid].w === 1 ? 0 : 1)} className={`p-1 rounded ${state.bracket[rid].w === 1 ? 'bg-yellow-500 text-black' : 'bg-white/5 text-gray-600'}`}><Check size={12} /></button>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Player 2"
                      value={state.bracket[rid].p2}
                      onChange={(e) => updateBracket(rid, 'p2', e.target.value)}
                      className="flex-1 bg-black/40 border border-white/5 rounded px-2 py-1 text-[10px] text-white"
                    />
                    <button onClick={() => updateBracket(rid, 'w', state.bracket[rid].w === 2 ? 0 : 2)} className={`p-1 rounded ${state.bracket[rid].w === 2 ? 'bg-yellow-500 text-black' : 'bg-white/5 text-gray-600'}`}><Check size={12} /></button>
                  </div>
                </div>
              ))}
            </div>

            {/* Semis */}
            <div className="space-y-4 pt-12">
              <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-4 text-center">Semifinali</h4>
              {['s1', 's2'].map((rid) => (
                <div key={rid} className="p-4 bg-white/5 border border-white/10 rounded-xl space-y-3 my-12">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Semifinalista 1"
                      value={state.bracket[rid].p1}
                      onChange={(e) => updateBracket(rid, 'p1', e.target.value)}
                      className="flex-1 bg-black/40 border border-white/5 rounded px-2 py-1 text-xs text-white"
                    />
                    <button onClick={() => updateBracket(rid, 'w', state.bracket[rid].w === 1 ? 0 : 1)} className={`p-1 rounded ${state.bracket[rid].w === 1 ? 'bg-yellow-500 text-black' : 'bg-white/5 text-gray-600'}`}><Check size={12} /></button>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Semifinalista 2"
                      value={state.bracket[rid].p2}
                      onChange={(e) => updateBracket(rid, 'p2', e.target.value)}
                      className="flex-1 bg-black/40 border border-white/5 rounded px-2 py-1 text-xs text-white"
                    />
                    <button onClick={() => updateBracket(rid, 'w', state.bracket[rid].w === 2 ? 0 : 2)} className={`p-1 rounded ${state.bracket[rid].w === 2 ? 'bg-yellow-500 text-black' : 'bg-white/5 text-gray-600'}`}><Check size={12} /></button>
                  </div>
                </div>
              ))}
            </div>

            {/* Final */}
            <div className="space-y-4 pt-36">
              <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-4 text-center">Gran Finale</h4>
              <div className="p-6 bg-yellow-500/5 border border-yellow-500/30 rounded-2xl space-y-4 shadow-xl">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Finalista 1"
                    value={state.bracket.f.p1}
                    onChange={(e) => updateBracket('f', 'p1', e.target.value)}
                    className="flex-1 bg-black/60 border border-yellow-500/20 rounded px-3 py-2 text-sm text-white font-bold"
                  />
                  <button onClick={() => updateBracket('f', 'w', state.bracket.f.w === 1 ? 0 : 1)} className={`px-2 rounded ${state.bracket.f.w === 1 ? 'bg-yellow-500 text-black' : 'bg-white/10 text-gray-400'}`}><Trophy size={16} /></button>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Finalista 2"
                    value={state.bracket.f.p2}
                    onChange={(e) => updateBracket('f', 'p2', e.target.value)}
                    className="flex-1 bg-black/60 border border-yellow-500/20 rounded px-3 py-2 text-sm text-white font-bold"
                  />
                  <button onClick={() => updateBracket('f', 'w', state.bracket.f.w === 2 ? 0 : 2)} className={`px-2 rounded ${state.bracket.f.w === 2 ? 'bg-yellow-500 text-black' : 'bg-white/10 text-gray-400'}`}><Trophy size={16} /></button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Casters & Timer (Always visible) */}
      <div className="grid grid-cols-2 gap-6 border-t border-white/5 pt-6">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <label className="text-[10px] font-black text-yellow-500 uppercase tracking-widest mb-4 block">Casters</label>
          <div className="space-y-4">
            {state.casters.map((caster: any, idx: number) => (
              <div key={idx} className="flex items-center gap-4">
                <input
                  type="checkbox"
                  checked={caster.active}
                  onChange={(e) => {
                    const newCasters = [...state.casters];
                    newCasters[idx].active = e.target.checked;
                    setState({ ...state, casters: newCasters });
                  }}
                  className="w-4 h-4 rounded border-white/10 bg-black/40 text-yellow-500"
                />
                <div className="flex-1 relative">
                  <Mic size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="text"
                    value={caster.name}
                    onChange={(e) => {
                      const newCasters = [...state.casters];
                      newCasters[idx].name = e.target.value;
                      setState({ ...state, casters: newCasters });
                    }}
                    placeholder={`Caster ${idx + 1}`}
                    className="w-full bg-black/40 border border-white/10 rounded-lg pl-8 pr-3 py-2 text-sm text-white"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <label className="text-[10px] font-black text-yellow-500 uppercase tracking-widest mb-4 block">Timer</label>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={state.timer.active}
                onChange={(e) => setState({ ...state, timer: { ...state.timer, active: e.target.checked, timestamp: Date.now() } })}
                className="w-4 h-4 rounded border-white/10 bg-black/40 text-yellow-500"
              />
              <span className="text-sm text-gray-300 font-bold uppercase">Attiva Timer</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={state.timer.min}
                onChange={(e) => setState({ ...state, timer: { ...state.timer, min: parseInt(e.target.value) || 0, timestamp: Date.now() } })}
                className="w-16 bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-center text-sm text-white font-bold"
              />
              <span className="text-gray-500 font-bold">m</span>
              <input
                type="number"
                value={state.timer.sec}
                onChange={(e) => setState({ ...state, timer: { ...state.timer, sec: parseInt(e.target.value) || 0, timestamp: Date.now() } })}
                className="w-16 bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-center text-sm text-white font-bold"
              />
              <span className="text-gray-500 font-bold">s</span>
            </div>
            <TimerIcon size={24} className={state.timer.active ? 'text-yellow-500 animate-pulse' : 'text-gray-700'} />
          </div>
        </div>
      </div>

      {/* Global Save Button */}
      <div className="flex justify-center pt-8">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className={`flex items-center gap-3 px-12 py-5 rounded-2xl font-black text-xl uppercase tracking-wider transition-all transform hover:scale-105 active:scale-95 ${
            isSaving 
              ? 'bg-gray-700 text-gray-400 cursor-not-allowed' 
              : showSuccess
                ? 'bg-green-600 text-white shadow-green-500/30'
                : 'bg-yellow-500 text-black hover:bg-yellow-400 shadow-yellow-500/30'
          }`}
        >
          <Save size={24} className={isSaving ? 'animate-spin' : ''} />
          {isSaving ? 'Sincronizzazione...' : showSuccess ? 'Overlay Sincronizzato' : 'Sincronizza Overlay'}
        </button>
      </div>
    </div>
  );
}
