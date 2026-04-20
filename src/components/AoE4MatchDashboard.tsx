import { useState, useEffect } from 'react';
import { Save, Plus, Minus, Trash2, User, Mic, Timer as TimerIcon, Map as MapIcon, ChevronDown } from 'lucide-react';
import { civilizationsData } from '../data/aoe4Data';
import { AOE4_MAPS } from '../data/aoe4Maps';
import { overlayService } from '../services/overlayService';
import type { OverlayState } from '../services/overlayService';

interface AoE4MatchDashboardProps {
  onError: (msg: string) => void;
}

const DEFAULT_STATE: OverlayState = {
  t1: { name: 'Team A', score: 0, players: ['', '', ''], active: false },
  t2: { name: 'Team B', score: 0, players: ['', '', ''], active: true },
  maps: [
    { name: 'Dry Arabia', status: 'active', winner: 0, t1civs: [], t2civs: [] }
  ],
  casters: [
    { name: 'Caster 1', active: false },
    { name: 'Caster 2', active: true }
  ],
  timer: { active: true, startTime: null }
};

export function AoE4MatchDashboard({ onError }: AoE4MatchDashboardProps) {
  const [state, setState] = useState<OverlayState | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    console.log('Loading initial overlay state...');
    overlayService.getOverlayState('aoe4-match').then(savedState => {
      if (savedState) {
        console.log('State loaded from DB:', savedState);
        setState(savedState);
      } else {
        console.warn('No state found in DB, using default.');
        setState(DEFAULT_STATE);
      }
    });
  }, []);

    const [showSuccess, setShowSuccess] = useState(false);

    const handleSave = async () => {
      if (!state) return;
      setIsSaving(true);
      try {
        await overlayService.updateOverlayState('aoe4-match', state);
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
        // onSuccess rimosso come richiesto (basta il feedback del pulsante)
      } catch (error: any) {
        console.error('Errore Supabase completo:', error);
        onError(`Errore durante la sincronizzazione: ${error.message || 'Errore generico'}`);
      } finally {
        setIsSaving(false);
      }
    };

  const updateTeam = (team: 't1' | 't2', field: string, value: any) => {
    setState(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        [team]: { ...prev[team], [field]: value }
      };
    });
  };

  const updatePlayer = (team: 't1' | 't2', index: number, value: string) => {
    setState(prev => {
      if (!prev) return prev;
      const players = [...prev[team].players];
      players[index] = value;
      return {
        ...prev,
        [team]: { ...prev[team], players }
      };
    });
  };

  const addMap = () => {
    setState(prev => {
      if (!prev) return prev;
      const newMap = {
        name: 'Dry Arabia',
        status: 'active',
        winner: 0,
        t1civs: [],
        t2civs: []
      };
      return { ...prev, maps: [...prev.maps, newMap] };
    });
  };

  const updateMap = (index: number, field: string, value: any) => {
    setState(prev => {
      if (!prev) return prev;
      const maps = [...prev.maps];
      maps[index] = { ...maps[index], [field]: value };
      return { ...prev, maps };
    });
  };

  const toggleCiv = (mapIndex: number, team: 't1' | 't2', civId: string) => {
    setState(prev => {
      if (!prev) return prev;
      const maps = [...prev.maps];
      const teamKey = team === 't1' ? 't1civs' : 't2civs';
      const currentCivs = maps[mapIndex][teamKey] || [];
      let newCivs = [...currentCivs];
      
      if (newCivs.includes(civId)) {
        newCivs = newCivs.filter(id => id !== civId);
      } else if (newCivs.length < 3) {
        newCivs = [...newCivs, civId];
      }

      maps[mapIndex] = { 
        ...maps[mapIndex], 
        [teamKey]: newCivs 
      };
      
      return { ...prev, maps };
    });
  };

  if (!state) return <div className="p-8 text-center text-gray-500">Caricamento configurazione...</div>;

  return (
    <div className="space-y-8 pb-12">
      {/* Teams Section */}
      <div className="grid grid-cols-2 gap-6">
        {['t1', 't2'].map((t) => {
          const teamKey = t as 't1' | 't2';
          return (
            <div key={t} className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <label className="text-[10px] font-black text-yellow-500 uppercase tracking-widest mb-4 block">
                {teamKey === 't1' ? 'TEAM SINISTRA' : 'TEAM DESTRA'}
              </label>
              <div className="flex gap-4 mb-6">
                <div className="flex-1">
                  <label className="text-[10px] text-gray-500 uppercase mb-1 block">Nome Team</label>
                  <input
                    type="text"
                    value={state[teamKey].name}
                    onChange={(e) => updateTeam(teamKey, 'name', e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-yellow-500/50 outline-none transition-colors"
                  />
                </div>
                <div className="w-24">
                  <label className="text-[10px] text-gray-500 uppercase mb-1 block">Score</label>
                  <div className="flex items-center bg-black/40 border border-white/10 rounded-lg overflow-hidden">
                    <button 
                      onClick={() => updateTeam(teamKey, 'score', Math.max(0, state[teamKey].score - 1))}
                      className="p-2 hover:bg-white/5 text-gray-400"
                    ><Minus size={14} /></button>
                    <input
                      type="number"
                      value={state[teamKey].score}
                      onChange={(e) => updateTeam(teamKey, 'score', parseInt(e.target.value) || 0)}
                      className="w-full bg-transparent text-center text-sm text-white font-bold outline-none"
                    />
                    <button 
                      onClick={() => updateTeam(teamKey, 'score', state[teamKey].score + 1)}
                      className="p-2 hover:bg-white/5 text-gray-400"
                    ><Plus size={14} /></button>
                  </div>
                </div>
              </div>
              
              <label className="text-[10px] text-gray-500 uppercase mb-2 block">Giocatori (max 3)</label>
              <div className="space-y-2">
                {[0, 1, 2].map((idx) => (
                  <div key={idx} className="relative">
                    <User size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                      type="text"
                      placeholder={`Giocatore ${idx + 1}`}
                      value={state[teamKey].players[idx] || ''}
                      onChange={(e) => updatePlayer(teamKey, idx, e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-lg pl-8 pr-3 py-2 text-sm text-white focus:border-yellow-500/50 outline-none transition-colors"
                    />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Maps Section */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <label className="text-[10px] font-black text-yellow-500 uppercase tracking-widest block">
            MAPPE E GAME
          </label>
          <button
            onClick={addMap}
            className="flex items-center gap-2 px-3 py-1.5 bg-yellow-500/10 border border-yellow-500/30 text-yellow-500 rounded-lg text-[10px] font-bold uppercase hover:bg-yellow-500/20 transition-all"
          >
            <Plus size={14} /> Aggiungi Game
          </button>
        </div>

        <div className="space-y-6">
          {state.maps.map((map, mIdx) => (
            <div key={mIdx} className="bg-black/20 border border-white/5 rounded-2xl p-6 relative group/map">
              <button
                onClick={() => setState(prev => prev ? ({ ...prev, maps: prev.maps.filter((_, i) => i !== mIdx) }) : prev)}
                className="absolute top-4 right-4 p-2 text-gray-600 hover:text-red-500 transition-colors opacity-0 group-hover/map:opacity-100"
              >
                <Trash2 size={16} />
              </button>

              <div className="grid grid-cols-3 gap-8">
                {/* Map Info */}
                <div className="col-span-1">
                  <div className="flex items-center gap-2 mb-4">
                    <select
                      value={map.status}
                      onChange={(e) => updateMap(mIdx, 'status', e.target.value)}
                      className="bg-[#0f1423] border border-yellow-500/30 rounded-lg px-2 py-1 text-[10px] font-bold text-yellow-500 uppercase outline-none focus:border-yellow-500/60 cursor-pointer hover:bg-[#1a1c32] transition-all shadow-inner"
                    >
                      <option value="active" className="bg-[#0f1423]">PROSSIMO GAME</option>
                      <option value="played" className="bg-[#0f1423]">GIOCATA</option>
                    </select>
                  </div>
                  
                  <label className="text-[10px] text-gray-500 uppercase mb-1 block">Mappa</label>
                  <div className="relative mb-4">
                    <MapIcon size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                    <select
                      value={map.name}
                      onChange={(e) => updateMap(mIdx, 'name', e.target.value)}
                      className="w-full bg-[#0f1423] border border-white/10 rounded-lg pl-8 pr-10 py-2 text-sm text-white outline-none focus:border-yellow-500/50 cursor-pointer hover:bg-[#1a2035] transition-all appearance-none shadow-inner"
                    >
                      {AOE4_MAPS.map(mapName => (
                        <option key={mapName} value={mapName} className="bg-[#0f1423] text-gray-200">{mapName}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                  </div>

                  <label className="text-[10px] text-gray-500 uppercase mb-2 block">Vincitore</label>
                  <div className="flex gap-2">
                    {[0, 1, 2].map((w) => (
                      <button
                        key={w}
                        onClick={() => updateMap(mIdx, 'winner', w)}
                        className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase transition-all ${
                          map.winner === w 
                            ? 'bg-yellow-500 text-black' 
                            : 'bg-white/5 text-gray-500 border border-white/5 hover:bg-white/10'
                        }`}
                      >
                        {w === 0 ? 'Nessuno' : w === 1 ? 'Left' : 'Right'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Civs Selection */}
                <div className="col-span-2 grid grid-cols-2 gap-4">
                  {['t1', 't2'].map((team) => {
                    const tKey = team as 't1' | 't2';
                    const selectedCivs = map[tKey === 't1' ? 't1civs' : 't2civs'] || [];
                    return (
                      <div key={team}>
                        <label className="text-[10px] text-gray-500 uppercase mb-2 block">
                          Civ {tKey === 't1' ? 'Team Sinistra' : 'Team Destra'} ({selectedCivs.length}/3)
                        </label>
                        <div className="grid grid-cols-6 gap-2 bg-black/40 p-3 rounded-xl border border-white/5">
                          {civilizationsData.map((civ) => (
                            <button
                              key={civ.id}
                              onClick={() => toggleCiv(mIdx, tKey, civ.id)}
                              title={civ.name}
                              className={`w-full aspect-square rounded-full border-2 transition-all overflow-hidden ${
                                selectedCivs.includes(civ.id)
                                  ? 'border-yellow-500 scale-110 shadow-[0_0_20px_rgba(212,175,55,0.6)] z-10'
                                  : 'border-white/5 opacity-60 grayscale-[40%] hover:opacity-100 hover:grayscale-0 hover:border-white/20'
                              }`}
                            >
                              <img src={civ.flag} alt={civ.name} className="w-full h-full object-cover" />
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Casters & Timer */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <label className="text-[10px] font-black text-yellow-500 uppercase tracking-widest mb-4 block">
            CASTERS
          </label>
          <div className="space-y-4">
            {state.casters.map((caster, cIdx) => (
              <div key={cIdx} className="flex items-center gap-4">
                <input
                  type="checkbox"
                  checked={caster.active}
                  onChange={(e) => {
                    setState(prev => {
                      if (!prev) return prev;
                      const casters = [...prev.casters];
                      casters[cIdx] = { ...casters[cIdx], active: e.target.checked };
                      return { ...prev, casters };
                    });
                  }}
                  className="w-4 h-4 rounded border-white/10 bg-black/40 text-yellow-500 focus:ring-yellow-500"
                />
                <div className="flex-1 relative">
                  <Mic size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="text"
                    value={caster.name}
                    onChange={(e) => {
                      setState(prev => {
                        if (!prev) return prev;
                        const casters = [...prev.casters];
                        casters[cIdx] = { ...casters[cIdx], name: e.target.value };
                        return { ...prev, casters };
                      });
                    }}
                    placeholder={`Caster ${cIdx + 1}`}
                    className="w-full bg-black/40 border border-white/10 rounded-lg pl-8 pr-3 py-2 text-sm text-white outline-none"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <label className="text-[10px] font-black text-yellow-500 uppercase tracking-widest mb-4 block">
            TIMER
          </label>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={state.timer.active}
                onChange={(e) => setState(prev => prev ? ({ ...prev, timer: { ...prev.timer, active: e.target.checked, timestamp: Date.now() } }) : prev)}
                className="w-4 h-4 rounded border-white/10 bg-black/40 text-yellow-500 focus:ring-yellow-500"
              />
              <span className="text-sm text-gray-300 font-bold uppercase">Attiva Timer</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={state.timer.min}
                onChange={(e) => setState(prev => prev ? ({ ...prev, timer: { ...prev.timer, min: parseInt(e.target.value) || 0, timestamp: Date.now() } }) : prev)}
                className="w-16 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-center text-sm text-white font-bold outline-none"
              />
              <span className="text-gray-500 font-bold">m</span>
              <input
                type="number"
                value={state.timer.sec}
                onChange={(e) => setState(prev => prev ? ({ ...prev, timer: { ...prev.timer, sec: parseInt(e.target.value) || 0, timestamp: Date.now() } }) : prev)}
                className="w-16 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-center text-sm text-white font-bold outline-none"
              />
              <span className="text-gray-500 font-bold">s</span>
            </div>
            <TimerIcon size={24} className={state.timer.active ? 'text-yellow-500 animate-pulse' : 'text-gray-700'} />
          </div>
        </div>
      </div>

      {/* Global Save Button - In-line at the bottom */}
      <div className="flex justify-center pt-8 border-t border-white/5">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className={`flex items-center gap-3 px-12 py-5 rounded-2xl font-black text-xl uppercase tracking-wider shadow-2xl transition-all transform hover:scale-105 active:scale-95 ${
            isSaving 
              ? 'bg-gray-700 text-gray-400 cursor-not-allowed' 
              : 'bg-yellow-500 text-black hover:bg-yellow-400 shadow-yellow-500/30'
          }`}
        >
          <Save size={24} />
          {isSaving ? 'Sincronizzazione...' : showSuccess ? 'Sincronizzato! ✅' : 'Sincronizza Overlay'}
        </button>
      </div>
    </div>
  );
}
