import { useState, useEffect } from 'react';
import { Save, Plus, Minus, Trash2, User, Mic, Timer as TimerIcon, Map as MapIcon, ChevronDown, ShieldCheck, Link2, Loader2, CheckCircle2, AlertCircle, ArrowLeftRight } from 'lucide-react';
import { civilizationsData } from '../data/aoe4Data';
import { AOE4_MAPS } from '../data/aoe4Maps';
import { overlayService } from '../services/overlayService';
import type { OverlayState } from '../services/overlayService';
import { fetchDraft } from '../utils/draftImporter';

interface AoE4MatchDashboardProps {
  onError: (msg: string) => void;
}

const DEFAULT_STATE: OverlayState = {
  t1: { name: '', score: 0, players: ['', '', ''], active: false },
  t2: { name: '', score: 0, players: ['', '', ''], active: true },
  maps: [
    { name: 'Dry Arabia', status: 'active', winner: 0, t1civs: [], t2civs: [] }
  ],
  casters: [
    { name: '', active: false },
    { name: '', active: false }
  ],
  timer: { active: false, startTime: null }
};

export function AoE4MatchDashboard({ onError }: AoE4MatchDashboardProps) {
  const [state, setState] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isConfirmingReset, setIsConfirmingReset] = useState(false);
  const [showResetSuccess, setShowResetSuccess] = useState(false);
  const [draftCivUrl, setDraftCivUrl] = useState('');
  const [isDraftCivLoading, setIsDraftCivLoading] = useState(false);
  const [draftCivStatus, setDraftCivStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [draftMapUrl, setDraftMapUrl] = useState('');
  const [isDraftMapLoading, setIsDraftMapLoading] = useState(false);
  const [draftMapStatus, setDraftMapStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [mapDraftUrls, setMapDraftUrls] = useState<Record<number, string>>({});

  useEffect(() => {
    console.log('Loading initial overlay state...');
    overlayService.getOverlayState('aoe4-match').then(savedState => {
      if (savedState) {
        // Normalizzazione dati aggressiva: assicura array di stringhe valide
        const normalizedMaps = (savedState.maps || []).map(m => {
          const cleanCivs = (list: any) => 
            (Array.isArray(list) ? list : [])
            .map(item => String(item).trim())
            .filter(item => {
              // Mantieni solo se corrisponde a un ID o Nome di una civiltà valida
              return civilizationsData.some(c => 
                c.id.toLowerCase() === item.toLowerCase() || 
                c.name.toLowerCase() === item.toLowerCase()
              );
            });

          return {
            ...m,
            t1civs: cleanCivs(m.t1civs),
            t2civs: cleanCivs(m.t2civs)
          };
        });
        
        const normalizedState = {
          ...DEFAULT_STATE,
          ...savedState,
          t1: {
            ...(savedState.t1 || DEFAULT_STATE.t1),
            name: (savedState.t1?.name === 'Team A' || !savedState.t1?.name) ? '' : savedState.t1.name
          },
          t2: {
            ...(savedState.t2 || DEFAULT_STATE.t2),
            name: (savedState.t2?.name === 'Team B' || !savedState.t2?.name) ? '' : savedState.t2.name
          },
          maps: normalizedMaps
        };
        
        console.log('State normalized and cleaned:', normalizedState);
        setState(normalizedState);
      } else {
        console.warn('No state found in DB, using default.');
        setState(DEFAULT_STATE);
      }
    });
  }, []);

  const resetMatch = async () => {
    setIsSaving(true);
    try {
      await overlayService.updateOverlayState('aoe4-match', DEFAULT_STATE);
      setState(DEFAULT_STATE);
      setIsConfirmingReset(false);
      setShowResetSuccess(true);
      setTimeout(() => setShowResetSuccess(false), 3000);
    } catch (error: any) {
      onError(`Errore durante il reset: ${error.message || 'Errore generico'}`);
    } finally {
      setIsSaving(false);
    }
  };

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
    setState((prev: any) => {
      if (!prev) return prev;
      return {
        ...prev,
        [team]: { ...prev[team], [field]: value }
      };
    });
  };

  const handleDraftCivImport = async () => {
    if (!draftCivUrl.trim()) return;
    setIsDraftCivLoading(true);
    setDraftCivStatus(null);
    try {
      const draft = await fetchDraft(draftCivUrl);
      
      setState((prev: any) => {
        if (!prev) return prev;
        const newState = { ...prev };

        if (draft.nameHost) newState.t1.name = draft.nameHost;
        if (draft.nameGuest) newState.t2.name = draft.nameGuest;

        if (draft.hostPlayers.some((p: string) => p)) {
          newState.t1.players = [
            draft.hostPlayers[0] || '',
            draft.hostPlayers[1] || '',
            draft.hostPlayers[2] || ''
          ];
        }
        if (draft.guestPlayers.some((p: string) => p)) {
          newState.t2.players = [
            draft.guestPlayers[0] || '',
            draft.guestPlayers[1] || '',
            draft.guestPlayers[2] || ''
          ];
        }

        return newState;
      });

      setDraftCivStatus({
        type: 'success',
        message: `Nomi team e giocatori importati!`
      });
    } catch (err: any) {
      setDraftCivStatus({
        type: 'error',
        message: err.message || 'Errore durante l\'importazione delle civiltà.'
      });
    } finally {
      setIsDraftCivLoading(false);
    }
  };

  const handleDraftMapImport = async () => {
    if (!draftMapUrl.trim()) return;
    setIsDraftMapLoading(true);
    setDraftMapStatus(null);
    try {
      const draft = await fetchDraft(draftMapUrl);
      
      setState((prev: any) => {
        if (!prev) return prev;
        const newState = { ...prev };

        if (draft.maps.length > 0) {
          const newMaps = [...newState.maps];
          draft.maps.forEach((mapName: string, i: number) => {
            if (i < newMaps.length) {
              newMaps[i] = { ...newMaps[i], name: mapName };
            } else {
              newMaps.push({
                name: mapName,
                status: 'pending',
                winner: 0,
                t1civs: [],
                t2civs: []
              });
            }
          });
          newState.maps = newMaps;
        }

        return newState;
      });

      setDraftMapStatus({
        type: 'success',
        message: `Mappe importate: ${draft.maps.join(', ')}`
      });
    } catch (err: any) {
      setDraftMapStatus({
        type: 'error',
        message: err.message || 'Errore durante l\'importazione delle mappe.'
      });
    } finally {
      setIsDraftMapLoading(false);
    }
  };

  const handleSwapTeams = () => {
    setState((prev: any) => {
      if (!prev) return prev;
      return {
        ...prev,
        t1: { ...prev.t1, name: prev.t2.name, players: prev.t2.players },
        t2: { ...prev.t2, name: prev.t1.name, players: prev.t1.players }
      };
    });
    setDraftCivStatus({
      type: 'success',
      message: 'Team invertiti! Controlla i campi e salva.'
    });
  };

  const handleMapDraftImport = async (mIdx: number) => {
    const url = mapDraftUrls[mIdx];
    if (!url || !url.trim()) return;
    try {
      const draft = await fetchDraft(url);
      setState((prev: any) => {
        if (!prev) return prev;
        const newMaps = [...prev.maps];
        
        newMaps[mIdx] = {
          ...newMaps[mIdx],
          t1civs: draft.hostPicks.slice(0, 3),
          t2civs: draft.guestPicks.slice(0, 3)
        };
        
        if (draft.maps.length > 0) {
          newMaps[mIdx].name = draft.maps[0];
        }
        
        return { ...prev, maps: newMaps };
      });
      setMapDraftUrls(prev => ({ ...prev, [mIdx]: '' }));
    } catch (err: any) {
      onError(`Errore importazione civiltà game ${mIdx + 1}: ${err.message || 'Errore generico'}`);
    }
  };

  const updatePlayer = (team: 't1' | 't2', index: number, value: string) => {
    setState((prev: any) => {
      if (!prev) return prev;
      const players = [...prev[team]!.players];
      players[index] = value;
      return {
        ...prev,
        [team]: { ...prev[team], players }
      };
    });
  };

  const addMap = () => {
    setState((prev: any) => {
      if (!prev) return prev;
      const newMap = {
        name: 'Dry Arabia',
        status: 'active',
        winner: 0,
        t1civs: [],
        t2civs: []
      };
      return { ...prev, maps: [...(prev.maps || []), newMap] };
    });
  };

  const updateMap = (index: number, field: string, value: any) => {
    setState((prev: any) => {
      if (!prev) return prev;
      const maps = [...(prev.maps || [])];
      maps[index] = { ...maps[index], [field]: value };
      return { ...prev, maps };
    });
  };

  const toggleCiv = (mapIndex: number, team: 't1' | 't2', civId: string, civName: string) => {
    setState((prev: any) => {
      if (!prev) return prev;
      const maps = [...(prev.maps || [])];
      const teamKey = team === 't1' ? 't1civs' : 't2civs';
      const currentCivs = maps[mapIndex][teamKey] || [];
      let newCivs = [...currentCivs];
      
      // Controllo universale (ID o Nome)
      const isSelected = newCivs.some(val => 
        String(val).toLowerCase().trim() === civId.toLowerCase().trim() || 
        String(val).toLowerCase().trim() === civName.toLowerCase().trim()
      );

      if (isSelected) {
        // Rimuovi tutte le occorrenze (sia ID che Nome per pulizia)
        newCivs = newCivs.filter(val => 
          String(val).toLowerCase().trim() !== civId.toLowerCase().trim() && 
          String(val).toLowerCase().trim() !== civName.toLowerCase().trim()
        );
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

  if (!state) return null;
  return (
    <div className="space-y-8 pb-12">
      {/* Universal Reset & Sync Quick Actions */}
      <div className="flex justify-between items-center bg-white/5 border border-white/10 rounded-2xl p-4 mb-4">
        <div className="flex items-center gap-4">
          <h2 className="text-sm font-black text-white uppercase tracking-widest hidden sm:block">Configurazione Match</h2>
          
          {!isConfirmingReset && !showResetSuccess ? (
            <button
              onClick={() => setIsConfirmingReset(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-red-600/20 border border-red-500/30 text-red-500 rounded-lg text-[10px] font-black uppercase hover:bg-red-500 hover:text-white transition-all whitespace-nowrap"
            >
              <Trash2 size={14} /> Reset Campi
            </button>
          ) : showResetSuccess ? (
            <div className="flex items-center gap-2 text-green-500 animate-in fade-in zoom-in duration-300">
              <ShieldCheck size={14} />
              <span className="text-[10px] font-black uppercase tracking-widest text-green-400">Reset Completato!</span>
            </div>
          ) : (
            <div className="flex items-center gap-3 animate-in fade-in slide-in-from-left-2 duration-300 whitespace-nowrap">
              <span className="text-[10px] font-black text-red-400 uppercase tracking-widest">Sei sicuro?</span>
              <button
                onClick={resetMatch}
                className="px-4 py-1.5 bg-red-600 text-white rounded-lg text-[10px] font-black uppercase hover:bg-red-500 transition-all border border-red-400 shadow-lg shadow-red-900/40"
              >
                Sì
              </button>
              <button
                onClick={() => setIsConfirmingReset(false)}
                className="px-4 py-1.5 bg-white/5 text-gray-400 rounded-lg text-[10px] font-black uppercase hover:bg-white/10 transition-all border border-white/10"
              >
                Annulla
              </button>
            </div>
          )}
        </div>
        <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest text-right">
          Sincronizza per rendere le modifiche live
        </div>
      </div>

      {/* Double Draft Import Box */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Box 1: Civ */}
        <div className="bg-gradient-to-r from-emerald-500/5 via-[#0a0f1a] to-emerald-500/5 border border-emerald-500/20 rounded-3xl p-6 shadow-2xl shadow-emerald-500/5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
              <Link2 className="text-emerald-400" size={16} />
            </div>
            <div>
              <label className="text-[12px] font-black text-emerald-400 uppercase tracking-widest block">Importa Draft Civiltà (3v3)</label>
              <span className="text-[9px] text-gray-500 font-medium">Importa nomi dei team e dei giocatori</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={draftCivUrl}
              onChange={(e) => { setDraftCivUrl(e.target.value); setDraftCivStatus(null); }}
              placeholder="https://aoe2cm.net/draft/xxxxx"
              className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-emerald-500/50 outline-none transition-all font-medium tracking-wide shadow-inner placeholder:text-gray-600"
            />
            <button
              onClick={handleDraftCivImport}
              disabled={isDraftCivLoading || !draftCivUrl.trim()}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-lg whitespace-nowrap ${
                isDraftCivLoading
                  ? 'bg-gray-800 text-gray-500 cursor-wait'
                  : !draftCivUrl.trim()
                    ? 'bg-gray-800/50 text-gray-600 cursor-not-allowed'
                    : 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-emerald-500/20 hover:shadow-emerald-500/40'
              }`}
            >
              {isDraftCivLoading ? <Loader2 size={14} className="animate-spin" /> : <Link2 size={14} />}
              {isDraftCivLoading ? 'Caricamento...' : 'Importa'}
            </button>
          </div>
          {draftCivStatus && (
            <div className={`mt-3 flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold animate-in fade-in slide-in-from-top-2 duration-300 ${
              draftCivStatus.type === 'success'
                ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                : 'bg-red-500/10 border border-red-500/20 text-red-400'
            }`}>
              {draftCivStatus.type === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
              <span className="flex-1">{draftCivStatus.message}</span>
              {draftCivStatus.type === 'success' && (
                <button
                  onClick={handleSwapTeams}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 hover:text-amber-300 transition-all font-black text-[10px] uppercase tracking-widest whitespace-nowrap ml-auto"
                  title="Inverti Team"
                >
                  <ArrowLeftRight size={12} />
                  Inverti Team
                </button>
              )}
            </div>
          )}
        </div>

        {/* Box 2: Mappe */}
        <div className="bg-gradient-to-r from-blue-500/5 via-[#0a0f1a] to-blue-500/5 border border-blue-500/20 rounded-3xl p-6 shadow-2xl shadow-blue-500/5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
              <MapIcon className="text-blue-400" size={16} />
            </div>
            <div>
              <label className="text-[12px] font-black text-blue-400 uppercase tracking-widest block">Importa Draft Mappe (3v3)</label>
              <span className="text-[9px] text-gray-500 font-medium">Importa l'elenco delle mappe previste per il match</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={draftMapUrl}
              onChange={(e) => { setDraftMapUrl(e.target.value); setDraftMapStatus(null); }}
              placeholder="https://aoe2cm.net/draft/xxxxx"
              className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500/50 outline-none transition-all font-medium tracking-wide shadow-inner placeholder:text-gray-600"
            />
            <button
              onClick={handleDraftMapImport}
              disabled={isDraftMapLoading || !draftMapUrl.trim()}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-lg whitespace-nowrap ${
                isDraftMapLoading
                  ? 'bg-gray-800 text-gray-500 cursor-wait'
                  : !draftMapUrl.trim()
                    ? 'bg-gray-800/50 text-gray-600 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-500 shadow-blue-500/20 hover:shadow-blue-500/40'
              }`}
            >
              {isDraftMapLoading ? <Loader2 size={14} className="animate-spin" /> : <Link2 size={14} />}
              {isDraftMapLoading ? 'Caricamento...' : 'Importa'}
            </button>
          </div>
          {draftMapStatus && (
            <div className={`mt-3 flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold animate-in fade-in slide-in-from-top-2 duration-300 ${
              draftMapStatus.type === 'success'
                ? 'bg-blue-500/10 border border-blue-500/20 text-blue-400'
                : 'bg-red-500/10 border border-red-500/20 text-red-400'
            }`}>
              {draftMapStatus.type === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
              <span className="flex-1">{draftMapStatus.message}</span>
            </div>
          )}
        </div>
      </div>

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
                    value={state[teamKey]!.name}
                    placeholder={teamKey === 't1' ? 'Team A' : 'Team B'}
                    onChange={(e) => updateTeam(teamKey, 'name', e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-yellow-500/50 outline-none transition-colors placeholder:text-gray-600"
                  />
                </div>
                <div className="w-24">
                  <label className="text-[10px] text-gray-500 uppercase mb-1 block">Score</label>
                  <div className="flex items-center bg-black/40 border border-white/10 rounded-lg overflow-hidden">
                    <button 
                      onClick={() => updateTeam(teamKey, 'score', Math.max(0, state[teamKey]!.score - 1))}
                      className="p-2 hover:bg-white/5 text-gray-400"
                    ><Minus size={14} /></button>
                    <input
                      type="number"
                      value={state[teamKey]!.score}
                      onChange={(e) => updateTeam(teamKey, 'score', parseInt(e.target.value) || 0)}
                      className="w-full bg-transparent text-center text-sm text-white font-bold outline-none"
                    />
                    <button 
                      onClick={() => updateTeam(teamKey, 'score', state[teamKey]!.score + 1)}
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
                      value={state[teamKey]!.players[idx] || ''}
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
          <div className="flex gap-2">
            <button
              onClick={addMap}
              className="flex items-center gap-2 px-3 py-1.5 bg-yellow-500/10 border border-yellow-500/30 text-yellow-500 rounded-lg text-[10px] font-bold uppercase hover:bg-yellow-500/20 transition-all"
            >
              <Plus size={14} /> Aggiungi Game
            </button>
          </div>
        </div>

        <div className="space-y-6">
          {state.maps!.map((map: any, mIdx: number) => (
            <div key={mIdx} className="bg-black/20 border border-white/5 rounded-2xl p-6 relative group/map">
              <button
                onClick={() => setState((prev: any) => prev ? ({ ...prev, maps: prev.maps!.filter((_: any, i: number) => i !== mIdx) }) : prev)}
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
                      className="w-full bg-black/40 border border-white/10 rounded-lg pl-8 pr-10 py-2 text-sm text-white focus:border-yellow-500/50 outline-none transition-all cursor-pointer hover:bg-black/60 appearance-none"
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
                        {w === 0 ? 'Nessuno' : w === 1 ? 'Sinistra' : 'Destra'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Civs Selection */}
                <div className="col-span-2 grid grid-cols-2 gap-4">
                  {['t1', 't2'].map((team) => {
                    const tKey = team as 't1' | 't2';
                    const currentMapState = state.maps![mIdx];
                    const selectedCivs = currentMapState[tKey === 't1' ? 't1civs' : 't2civs'] || [];
                    
                    return (
                      <div key={team}>
                        <label className="text-[10px] text-gray-500 uppercase mb-2 block">
                          Civ {tKey === 't1' ? 'Team Sinistra' : 'Team Destra'} ({selectedCivs.length}/3)
                        </label>
                        <div className="grid grid-cols-6 gap-2 bg-black/40 p-3 rounded-xl border border-white/5">
                          {civilizationsData.map((civ) => {
                            // Confronto ultra-robusto per evitare problemi con dati Supabase (ID o Nome)
                            const isSelected = (selectedCivs || []).some((id: string) => 
                              String(id).toLowerCase().trim() === civ.id.toLowerCase().trim() ||
                              String(id).toLowerCase().trim() === civ.name.toLowerCase().trim()
                            );
                            
                            return (
                              <button
                                key={`${mIdx}-${tKey}-${civ.id}`}
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  toggleCiv(mIdx, tKey, civ.id, civ.name);
                                }}
                                title={civ.name}
                                className={`w-full aspect-square rounded-full border-2 transition-all overflow-hidden cursor-pointer relative z-30 ${
                                  isSelected
                                    ? 'border-yellow-500 scale-110 shadow-[0_0_20px_rgba(212,175,55,0.6)] ring-2 ring-yellow-500/50'
                                    : 'border-white/5 opacity-60 grayscale-[40%] hover:opacity-100 hover:grayscale-0 hover:border-white/20'
                                }`}
                              >
                                <img src={civ.flag} alt={civ.name} className="w-full h-full object-cover pointer-events-none" />
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Inline Map Draft Import */}
              <div className="mt-6 pt-4 border-t border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Link2 size={14} className="text-emerald-400" />
                  <span className="text-[10px] font-black text-emerald-400 uppercase tracking-wider">Importa Civiltà Match per questo Game</span>
                </div>
                <div className="flex items-center gap-2 flex-1 max-w-md">
                  <input
                    type="text"
                    value={mapDraftUrls[mIdx] || ''}
                    onChange={(e) => setMapDraftUrls(prev => ({ ...prev, [mIdx]: e.target.value }))}
                    placeholder="Incolla link draft AoE2CM (es. Game 2)..."
                    className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-emerald-500/40"
                  />
                  <button
                    onClick={() => handleMapDraftImport(mIdx)}
                    disabled={!mapDraftUrls[mIdx] || !mapDraftUrls[mIdx].trim()}
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-800 disabled:text-gray-600 text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-all animate-in fade-in"
                  >
                    Importa
                  </button>
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
            {state.casters!.map((caster: any, cIdx: number) => (
              <div key={cIdx} className="flex items-center gap-4">
                <input
                  type="checkbox"
                  checked={caster.active}
                  onChange={(e) => {
                    setState((prev: any) => {
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
                      setState((prev: any) => {
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
                onChange={(e) => setState((prev: any) => prev ? ({ ...prev, timer: { ...prev.timer, active: e.target.checked, timestamp: Date.now() } }) : prev)}
                className="w-4 h-4 rounded border-white/10 bg-black/40 text-yellow-500 focus:ring-yellow-500"
              />
              <span className="text-sm text-gray-300 font-bold uppercase">Attiva Timer</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={state.timer.min}
                onChange={(e) => setState((prev: any) => prev ? ({ ...prev, timer: { ...prev.timer, min: parseInt(e.target.value) || 0, timestamp: Date.now() } }) : prev)}
                className="w-16 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-center text-sm text-white font-bold outline-none"
              />
              <span className="text-gray-500 font-bold">m</span>
              <input
                type="number"
                value={state.timer.sec}
                onChange={(e) => setState((prev: any) => prev ? ({ ...prev, timer: { ...prev.timer, sec: parseInt(e.target.value) || 0, timestamp: Date.now() } }) : prev)}
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
