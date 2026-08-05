import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Copy, Check, Clock, Layers, ChevronUp, ChevronDown, Swords, History, ExternalLink, X, Archive, RotateCcw, AlertTriangle, Loader2, Search, Lock, Eye } from 'lucide-react';
import { draftService } from '../services/draftService';
import type { DraftPreset, DraftTurn, TurnPlayer, TurnAction, TurnTarget, BanMode, DraftRoom } from '../services/draftService';
import { AOE4_MAPS } from '../data/aoe4Maps';

export function AdminDraftPresetTab() {
  const [presets, setPresets] = useState<DraftPreset[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPreset, setEditingPreset] = useState<Partial<DraftPreset> | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [mapSearchQuery, setMapSearchQuery] = useState('');

  // In-button saving state
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Custom Premium Delete Confirmation Modal State
  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: 'preset' | 'room';
    id: string;
    title: string;
  } | null>(null);

  // Draft History State
  const [historyPreset, setHistoryPreset] = useState<DraftPreset | null>(null);
  const [historyRooms, setHistoryRooms] = useState<DraftRoom[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showArchivedFilter, setShowArchivedFilter] = useState(false);

  useEffect(() => {
    loadPresets();
  }, []);

  const loadPresets = async () => {
    setLoading(true);
    try {
      const data = await draftService.getPresets();
      setPresets(data);
    } catch (err) {
      console.error('Error loading presets:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenHistory = async (preset: DraftPreset) => {
    setHistoryPreset(preset);
    setLoadingHistory(true);
    try {
      const rooms = await draftService.getRoomsByPresetId(preset.id);
      setHistoryRooms(rooms);
    } catch (err) {
      console.error('Error loading history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleToggleArchiveRoom = async (roomId: string, currentArchivedState: boolean) => {
    const success = await draftService.archiveRoom(roomId, !currentArchivedState);
    if (success && historyPreset) {
      const rooms = await draftService.getRoomsByPresetId(historyPreset.id);
      setHistoryRooms(rooms);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirm) return;

    if (deleteConfirm.type === 'preset') {
      try {
        await draftService.deletePreset(deleteConfirm.id);
        setDeleteConfirm(null);
        loadPresets();
      } catch (err) {
        console.error('Failed to delete preset:', err);
      }
    } else if (deleteConfirm.type === 'room') {
      const roomIdToDelete = deleteConfirm.id;
      setDeleteConfirm(null);
      setHistoryRooms(prev => prev.filter(r => r.id !== roomIdToDelete));
      
      await draftService.deleteRoom(roomIdToDelete);
      if (historyPreset) {
        const rooms = await draftService.getRoomsByPresetId(historyPreset.id);
        setHistoryRooms(rooms.filter(r => r.id !== roomIdToDelete));
      }
    }
  };

  const handleCreateNew = () => {
    setEditingPreset({
      id: '',
      title: 'Nuovo Preset BO3',
      description: 'Preset per BO3 con 1 Ban e 3 Pick per giocatore',
      scope: 'civs',
      is_active: true,
      map_pool: [...AOE4_MAPS],
      turns: [
        { step: 1, player: 'HOST', action: 'BAN', target: 'CIV', amount: 1, timeLimit: 30 },
        { step: 2, player: 'GUEST', action: 'BAN', target: 'CIV', amount: 1, timeLimit: 30 },
        { step: 3, player: 'HOST', action: 'PICK', target: 'CIV', amount: 1, timeLimit: 30 },
        { step: 4, player: 'GUEST', action: 'PICK', target: 'CIV', amount: 1, timeLimit: 30 },
        { step: 5, player: 'GUEST', action: 'PICK', target: 'CIV', amount: 1, timeLimit: 30 },
        { step: 6, player: 'HOST', action: 'PICK', target: 'CIV', amount: 1, timeLimit: 30 },
      ]
    });
  };

  const handleSavePreset = async () => {
    if (!editingPreset || !editingPreset.title) return;
    setIsSaving(true);
    try {
      await draftService.savePreset(editingPreset);
      setIsSaving(false);
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        setEditingPreset(null);
        loadPresets();
      }, 1500);
    } catch (err) {
      console.error('Failed to save preset:', err);
      setIsSaving(false);
    }
  };

  const handleCopyLink = (presetId: string) => {
    const url = `${window.location.origin}/draft/preset/${presetId}`;
    navigator.clipboard.writeText(url);
    setCopiedId(presetId);
    setTimeout(() => setCopiedId(null), 3000);
  };

  const addTurn = () => {
    if (!editingPreset) return;
    const turns = editingPreset.turns || [];
    const nextStep = turns.length + 1;
    const lastPlayer = turns.length > 0 ? turns[turns.length - 1].player : 'GUEST';
    const nextPlayer: TurnPlayer = lastPlayer === 'HOST' ? 'GUEST' : 'HOST';

    setEditingPreset({
      ...editingPreset,
      turns: [
        ...turns,
        {
          step: nextStep,
          player: nextPlayer,
          action: 'PICK',
          target: editingPreset.scope === 'maps' ? 'MAP' : 'CIV',
          amount: 1,
          timeLimit: 30
        }
      ]
    });
  };

  const removeTurn = (index: number) => {
    if (!editingPreset) return;
    const turns = [...(editingPreset.turns || [])];
    turns.splice(index, 1);
    const reindexed = turns.map((t, i) => ({ ...t, step: i + 1 }));
    setEditingPreset({ ...editingPreset, turns: reindexed });
  };

  const updateTurn = (index: number, updates: Partial<DraftTurn>) => {
    if (!editingPreset) return;
    const turns = [...(editingPreset.turns || [])];
    turns[index] = { ...turns[index], ...updates };
    setEditingPreset({ ...editingPreset, turns });
  };

  const moveTurn = (index: number, direction: 'up' | 'down') => {
    if (!editingPreset) return;
    const turns = [...(editingPreset.turns || [])];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= turns.length) return;

    const temp = turns[index];
    turns[index] = turns[targetIndex];
    turns[targetIndex] = temp;

    const reindexed = turns.map((t, i) => ({ ...t, step: i + 1 }));
    setEditingPreset({ ...editingPreset, turns: reindexed });
  };

  // Filter rooms by archived state
  const filteredRooms = historyRooms.filter(r => showArchivedFilter ? !!r.is_archived : !r.is_archived);

  return (
    <div className="space-y-6 font-sans">
      
      {/* Premium Custom Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
          <div className="bg-[#0b101e] border border-red-500/50 rounded-3xl p-6 sm:p-8 max-w-md w-full text-center space-y-5 shadow-[0_0_50px_rgba(239,68,68,0.25)] my-auto animate-in fade-in zoom-in-95">
            <div className="w-16 h-16 bg-red-950/60 border border-red-500/50 rounded-2xl flex items-center justify-center mx-auto text-red-400">
              <AlertTriangle size={32} />
            </div>
            <div>
              <h3 className="text-xl font-extrabold text-white tracking-tight">
                {deleteConfirm.type === 'preset' ? 'Eliminare il Preset?' : 'Eliminare Stanza dallo Storico?'}
              </h3>
              <p className="text-sm text-slate-300 mt-2">
                Sei sicuro di voler eliminare definitivamente <strong className="text-white">"{deleteConfirm.title}"</strong>?
              </p>
              <p className="text-xs text-red-400 mt-1 font-semibold">
                Questa azione è irreversibile.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl font-bold text-sm transition-all border border-slate-700"
              >
                Annulla
              </button>
              <button
                onClick={handleConfirmDelete}
                className="py-3 px-4 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white rounded-2xl font-extrabold text-sm shadow-lg shadow-red-950/50 transition-all flex items-center justify-center gap-2"
              >
                <Trash2 size={16} />
                <span>CONFERMA</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header section - Metallic Silver Styling */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#0d1222]/80 p-5 rounded-2xl border border-slate-700/50 backdrop-blur-xl shadow-xl">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2 tracking-wide">
            <Swords className="text-slate-300" size={22} />
            Gestione Draft
          </h2>
          <p className="text-sm text-slate-400 mt-0.5">
            Crea e personalizza i flussi di Pick, Ban e Snipe. Una volta salvato, copia il link del preset ed incollalo nei regolamenti o nei post per i giocatori!
          </p>
        </div>
        <button
          onClick={handleCreateNew}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-slate-200 via-slate-300 to-slate-100 hover:from-white hover:to-slate-200 text-black font-extrabold rounded-xl transition-all shadow-[0_0_20px_rgba(255,255,255,0.15)] shrink-0"
        >
          <Plus size={18} />
          Crea Nuovo Preset
        </button>
      </div>

      {/* Draft History Modal */}
      {historyPreset && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#0b101e] border border-slate-700/60 rounded-3xl p-6 sm:p-8 max-w-4xl w-full space-y-6 shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-800 shrink-0">
              <div>
                <h3 className="text-xl font-extrabold text-white flex items-center gap-2">
                  <History className="text-cyan-400" size={22} />
                  Storico Draft: {historyPreset.title}
                </h3>
                <p className="text-xs text-slate-400">Gestisci e archivia lo storico dei draft creati da questo preset</p>
              </div>

              {/* Filter & Close */}
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  onClick={() => setShowArchivedFilter(!showArchivedFilter)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                    showArchivedFilter
                      ? 'bg-purple-950/60 border-purple-500 text-purple-300'
                      : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                  }`}
                >
                  <Archive size={14} />
                  <span>{showArchivedFilter ? 'Mostra Attivi' : 'Mostra Archivio'}</span>
                </button>
                <button
                  onClick={() => setHistoryPreset(null)}
                  className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {loadingHistory ? (
                <div className="py-12 text-center text-slate-400">
                  Caricamento storico...
                </div>
              ) : filteredRooms.length === 0 ? (
                <div className="py-12 text-center text-slate-400 bg-slate-950/40 rounded-2xl border border-slate-800">
                  {showArchivedFilter
                    ? 'Nessun draft archiviato per questo preset.'
                    : 'Nessun draft attivo presente nello storico per questo preset.'}
                </div>
              ) : (
                filteredRooms.map((room) => {
                  const state = room.state || { hostPicks: [], guestPicks: [] };
                  const isArchived = !!room.is_archived;
                  return (
                    <div
                      key={room.id}
                      className={`p-4 rounded-2xl border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all ${
                        isArchived ? 'bg-slate-950/30 border-slate-800/60 opacity-70' : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-white text-base">
                            🔴 {room.host_name} <span className="text-slate-500 font-normal">vs</span> 🔵 {room.guest_name}
                          </span>
                          <span className={`text-[10px] uppercase font-black px-2 py-0.5 rounded-md border ${
                            room.status === 'completed'
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                              : room.status === 'in_progress'
                              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                              : 'bg-slate-800 text-slate-400 border-slate-700'
                          }`}>
                            {room.status}
                          </span>
                          {isArchived && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 bg-purple-500/20 text-purple-300 rounded border border-purple-500/40">
                              ARCHIVIATO
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400">
                          Data: {new Date(room.created_at || Date.now()).toLocaleString('it-IT')} • ID Stanza: <strong className="text-slate-200">{room.id}</strong>
                        </p>
                        <div className="flex flex-wrap gap-1 text-[11px] pt-1">
                          <span className="text-red-400 font-bold">P1:</span> {state.hostPicks?.join(', ') || 'Nessun pick'}
                          <span className="text-slate-600 px-1">•</span>
                          <span className="text-blue-400 font-bold">P2:</span> {state.guestPicks?.join(', ') || 'Nessun pick'}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                        <a
                          href={`/draft/room/${room.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition-all"
                        >
                          <ExternalLink size={14} />
                          <span>Apri Stanza</span>
                        </a>

                        <button
                          onClick={() => handleToggleArchiveRoom(room.id, isArchived)}
                          className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors"
                          title={isArchived ? 'Ripristina dall\'archivio' : 'Archivia questo draft'}
                        >
                          {isArchived ? <RotateCcw size={16} /> : <Archive size={16} />}
                        </button>

                        <button
                          onClick={() => setDeleteConfirm({ type: 'room', id: room.id, title: `${room.host_name} vs ${room.guest_name}` })}
                          className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl transition-colors"
                          title="Elimina dal database"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Editor Panel */}
      {editingPreset && (
        <div className="bg-[#090d1a]/95 border border-slate-600/50 p-6 rounded-3xl shadow-2xl space-y-6 backdrop-blur-2xl">
          <div className="flex justify-between items-center pb-4 border-b border-slate-800">
            <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Edit2 size={18} className="text-cyan-400" />
              {editingPreset.id ? 'Modifica Preset' : 'Crea Nuovo Preset'}
            </h3>
            <button
              onClick={() => setEditingPreset(null)}
              className="text-slate-400 hover:text-white px-3.5 py-1.5 bg-slate-800/60 hover:bg-slate-800 rounded-xl text-sm font-semibold transition-colors"
            >
              Annulla
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                Titolo Preset (es. BO3 Finale Torneo)
              </label>
              <input
                type="text"
                value={editingPreset.title || ''}
                onChange={(e) => setEditingPreset({ ...editingPreset, title: e.target.value })}
                placeholder="Es. BO3 Tornei Italia"
                className="w-full bg-slate-950/80 border border-slate-700/60 rounded-xl px-4 py-2.5 text-white font-medium focus:border-cyan-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                Ambito del Draft
              </label>
              <select
                value={editingPreset.scope || 'civs'}
                onChange={(e) => {
                  const newScope = e.target.value as any;
                  const currentPool = editingPreset.map_pool;
                  const nextPool = (currentPool && currentPool.length > 0) ? currentPool : [...AOE4_MAPS];
                  setEditingPreset({ ...editingPreset, scope: newScope, map_pool: nextPool });
                }}
                className="w-full bg-[#090d16] border border-slate-700/80 rounded-xl pl-4 pr-10 py-2.5 text-white font-medium focus:border-cyan-400 focus:outline-none cursor-pointer"
              >
                <option value="civs" className="bg-[#090d16] text-white py-1.5">⚔️ Solo Civiltà</option>
                <option value="maps" className="bg-[#090d16] text-white py-1.5">🗺️ Solo Mappe</option>
                <option value="both" className="bg-[#090d16] text-white py-1.5">⚔️🗺️ Civiltà e Mappe</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
              Descrizione o Note (Opzionale)
            </label>
            <input
              type="text"
              value={editingPreset.description || ''}
              onChange={(e) => setEditingPreset({ ...editingPreset, description: e.target.value })}
              placeholder="Es. 1 Ban per parte, poi 3 Pick alternati per BO3"
              className="w-full bg-slate-950/80 border border-slate-700/60 rounded-xl px-4 py-2.5 text-slate-300 text-sm focus:border-cyan-400 focus:outline-none"
            />
          </div>

          {/* Map Pool Selector (When scope is maps or both) */}
          {(editingPreset.scope === 'maps' || editingPreset.scope === 'both') && (
            <div className="space-y-3 pt-2">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                  🗺️ Pool Mappe del Draft ({editingPreset.map_pool?.length || 0} mappe selezionate)
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingPreset({ ...editingPreset, map_pool: [...AOE4_MAPS] })}
                    className="text-[11px] font-bold text-cyan-400 hover:underline"
                  >
                    Seleziona Tutte
                  </button>
                  <span className="text-slate-600">•</span>
                  <button
                    type="button"
                    onClick={() => setEditingPreset({ ...editingPreset, map_pool: [] })}
                    className="text-[11px] font-bold text-slate-400 hover:underline"
                  >
                    Deseleziona Tutte
                  </button>
                </div>
              </div>

              {/* Premium Search Bar for Maps */}
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-cyan-400" size={16} />
                <input
                  type="text"
                  value={mapSearchQuery}
                  onChange={(e) => setMapSearchQuery(e.target.value)}
                  placeholder="Cerca mappa per nome..."
                  className="w-full bg-slate-950/90 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder:text-slate-500 font-bold focus:border-cyan-400 focus:outline-none shadow-inner"
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

              {/* Square Map Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 max-h-80 overflow-y-auto p-2.5 bg-slate-950/60 rounded-2xl border border-slate-800 no-scrollbar">
                {AOE4_MAPS.filter(m => m.toLowerCase().includes(mapSearchQuery.toLowerCase())).map((mapName) => {
                  const isSelected = editingPreset.map_pool?.includes(mapName);
                  return (
                    <button
                      key={mapName}
                      type="button"
                      onClick={() => {
                        const current = editingPreset.map_pool || [];
                        const next = isSelected
                          ? current.filter(m => m !== mapName)
                          : [...current, mapName];
                        setEditingPreset({ ...editingPreset, map_pool: next });
                      }}
                      className={`group relative aspect-[4/3] overflow-hidden rounded-2xl border flex flex-col justify-end transition-all duration-200 text-center ${
                        isSelected
                          ? 'border-cyan-400 ring-2 ring-cyan-400/50 shadow-lg shadow-cyan-950/50 scale-[1.02]'
                          : 'border-slate-800/80 hover:border-slate-600 opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img
                        src={`/maps/${mapName}.png`}
                        onError={(e) => { (e.target as any).src = '/header-bg.png'; }}
                        alt={mapName}
                        className={`absolute inset-0 w-full h-full object-cover transition-transform duration-300 ${
                          isSelected ? 'group-hover:scale-105' : 'grayscale group-hover:grayscale-0'
                        }`}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent pointer-events-none" />
                      <span className={`relative z-10 text-xs sm:text-sm font-black px-1.5 py-1.5 leading-tight drop-shadow-[0_2px_4px_rgba(0,0,0,1)] line-clamp-2 w-full ${
                        isSelected ? 'text-white' : 'text-slate-200'
                      }`}>
                        {mapName}
                      </span>
                      {isSelected && (
                        <div className="absolute top-1.5 right-1.5 bg-cyan-500 text-black rounded-full p-1 shadow-md">
                          <Check size={12} className="stroke-[3]" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Turn Sequence Builder */}
          <div className="space-y-4 pt-2">
            <div className="flex justify-between items-center">
              <h4 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <Layers size={16} className="text-cyan-400" />
                Sequenza Turni (Totale: {editingPreset.turns?.length || 0} turni)
              </h4>
              <button
                onClick={addTurn}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow"
              >
                <Plus size={14} /> Aggiungi Turno
              </button>
            </div>

            <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1 no-scrollbar">
              {editingPreset.turns?.map((turn, idx) => (
                <div
                  key={idx}
                  className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 bg-slate-950/60 p-3 rounded-2xl border border-slate-800 hover:border-slate-700 transition-all"
                >
                  <span className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-extrabold text-sm text-cyan-400 shrink-0">
                    #{turn.step}
                  </span>

                  {/* Player select */}
                  <select
                    value={turn.player}
                    onChange={(e) => {
                      const newPlayer = e.target.value as TurnPlayer;
                      const updates: Partial<DraftTurn> = { player: newPlayer };
                      if (newPlayer === 'ADMIN') {
                        updates.action = 'AUTO_PICK_LAST_MAP';
                        updates.target = 'MAP';
                      } else if (turn.action === 'AUTO_PICK_LAST_MAP' || turn.action === 'REVEAL_BANS' || turn.action === 'REVEAL_PICKS' || turn.action === 'REVEAL_ALL') {
                        updates.action = 'PICK';
                      }
                      updateTurn(idx, updates);
                    }}
                    className={`bg-[#090d16] border rounded-xl pl-3 pr-8 py-1.5 text-xs font-bold cursor-pointer ${
                      turn.player === 'HOST'
                        ? 'text-red-400 border-red-500/40'
                        : turn.player === 'GUEST'
                        ? 'text-blue-400 border-blue-500/40'
                        : 'text-amber-400 border-amber-500/40 font-black'
                    }`}
                  >
                    <option value="HOST" className="bg-[#090d16] text-red-400 py-1">🔴 Host (Player 1)</option>
                    <option value="GUEST" className="bg-[#090d16] text-blue-400 py-1">🔵 Guest (Player 2)</option>
                    <option value="ADMIN" className="bg-[#090d16] text-amber-400 py-1">👑 Admin / Sistema</option>
                  </select>

                  {/* Action select */}
                  <select
                    value={turn.action}
                    onChange={(e) => updateTurn(idx, { action: e.target.value as TurnAction })}
                    className={`bg-[#090d16] border rounded-xl pl-3 pr-8 py-1.5 text-xs font-bold cursor-pointer ${
                      turn.action === 'BAN'
                        ? 'text-red-400 border-red-500/40'
                        : turn.action === 'SNIPE'
                        ? 'text-purple-400 border-purple-500/40'
                        : turn.action === 'PICK'
                        ? 'text-emerald-400 border-emerald-500/40'
                        : 'text-amber-400 border-amber-500/40 font-black'
                    }`}
                  >
                    {turn.player === 'ADMIN' ? (
                      <>
                        <option value="AUTO_PICK_LAST_MAP" className="bg-[#090d16] text-amber-400 py-1">🗺️ Auto Pick Ultima Mappa</option>
                        <option value="REVEAL_BANS" className="bg-[#090d16] text-cyan-400 py-1">👁️ Rivelare Tutti i Ban</option>
                        <option value="REVEAL_PICKS" className="bg-[#090d16] text-emerald-400 py-1">👁️ Rivelare Tutti i Pick</option>
                        <option value="REVEAL_ALL" className="bg-[#090d16] text-purple-400 py-1">👁️ Rivelare Tutto (Ban & Pick)</option>
                      </>
                    ) : (
                      <>
                        <option value="BAN" className="bg-[#090d16] text-red-400 py-1">🚫 BANNA</option>
                        <option value="PICK" className="bg-[#090d16] text-emerald-400 py-1">✅ PICCA</option>
                        <option value="SNIPE" className="bg-[#090d16] text-purple-400 py-1">🎯 SNIPE</option>
                      </>
                    )}
                  </select>

                  {/* Target select */}
                  <select
                    value={turn.target}
                    onChange={(e) => updateTurn(idx, { target: e.target.value as TurnTarget })}
                    className="bg-[#090d16] border border-slate-700/80 rounded-xl pl-3 pr-8 py-1.5 text-xs font-bold text-slate-200 cursor-pointer"
                  >
                    <option value="CIV" className="bg-[#090d16] text-slate-200 py-1">⚔️ Civiltà</option>
                    <option value="MAP" className="bg-[#090d16] text-slate-200 py-1">🗺️ Mappa</option>
                  </select>

                  {/* Ban Mode select (only for BAN action) */}
                  {turn.action === 'BAN' && (
                    <select
                      value={turn.banMode || 'GLOBAL'}
                      onChange={(e) => updateTurn(idx, { banMode: e.target.value as BanMode })}
                      className="bg-[#090d16] border border-red-500/50 rounded-xl pl-2.5 pr-8 py-1.5 text-xs font-bold text-red-300 cursor-pointer"
                      title="Tipo di Ban"
                    >
                      <option value="GLOBAL" className="bg-[#090d16] text-red-300 py-1">🌐 Ban Globale (gban)</option>
                      <option value="EXCLUSIVE" className="bg-[#090d16] text-red-300 py-1">🔒 Esclusivo (eban)</option>
                      <option value="NONEXCLUSIVE" className="bg-[#090d16] text-red-300 py-1">🔓 Non Esclusivo (nban)</option>
                    </select>
                  )}

                  {/* Is Hidden toggle button (for BAN or PICK) */}
                  {(turn.action === 'BAN' || turn.action === 'PICK') && (
                    <button
                      type="button"
                      onClick={() => updateTurn(idx, { isHidden: !turn.isHidden })}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
                        turn.isHidden
                          ? 'bg-purple-950/70 border-purple-500 text-purple-300 ring-1 ring-purple-500/50'
                          : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
                      }`}
                      title="Se attivo, la scelta rimane nascosta all'avversario fino al turno di Rivelazione (Reveal)"
                    >
                      {turn.isHidden ? <Lock size={13} className="text-purple-400" /> : <Eye size={13} />}
                      <span>{turn.isHidden ? 'Nascosto' : 'Visibile'}</span>
                    </button>
                  )}

                  {/* Timer info */}
                  <div className="flex items-center gap-1 bg-slate-900 px-2.5 py-1 rounded-xl border border-slate-800 text-xs text-slate-300">
                    <Clock size={12} className="text-cyan-400" />
                    <span>30s</span>
                  </div>

                  {/* Ordering & Delete */}
                  <div className="flex items-center gap-1 ml-auto shrink-0">
                    <button
                      disabled={idx === 0}
                      onClick={() => moveTurn(idx, 'up')}
                      className="p-1 hover:bg-slate-800 text-slate-400 disabled:opacity-20 rounded-lg"
                    >
                      <ChevronUp size={16} />
                    </button>
                    <button
                      disabled={idx === (editingPreset.turns?.length || 1) - 1}
                      onClick={() => moveTurn(idx, 'down')}
                      className="p-1 hover:bg-slate-800 text-slate-400 disabled:opacity-20 rounded-lg"
                    >
                      <ChevronDown size={16} />
                    </button>
                    <button
                      onClick={() => removeTurn(idx)}
                      className="p-1.5 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                      title="Rimuovi turno"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              onClick={() => setEditingPreset(null)}
              className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-sm"
            >
              Annulla
            </button>
            <button
              onClick={handleSavePreset}
              disabled={isSaving}
              className={`px-6 py-2.5 rounded-xl font-extrabold text-sm shadow-lg transition-all flex items-center gap-2 ${
                saveSuccess
                  ? 'bg-emerald-600 text-white shadow-emerald-900/40'
                  : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white'
              }`}
            >
              {isSaving ? (
                <>
                  <Loader2 className="animate-spin" size={16} />
                  <span>Salvataggio...</span>
                </>
              ) : saveSuccess ? (
                <>
                  <Check size={16} />
                  <span>✓ Salvato con Successo!</span>
                </>
              ) : (
                <span>Salva Preset</span>
              )}
            </button>
          </div>
        </div>
      )}

      {/* List of presets */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full py-12 text-center text-slate-400 font-medium">
            Caricamento preset...
          </div>
        ) : presets.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-400 bg-slate-900/40 rounded-2xl border border-slate-800">
            Nessun preset di draft creato finora. Clicca su <strong>"Crea Nuovo Preset"</strong> per iniziare!
          </div>
        ) : (
          presets.map((preset) => (
            <div
              key={preset.id}
              className="bg-[#0b101d]/80 border border-slate-800 hover:border-slate-600 p-5 rounded-2xl flex flex-col justify-between transition-all group backdrop-blur-md shadow-lg"
            >
              <div>
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-slate-100 text-lg group-hover:text-cyan-400 transition-colors">
                    {preset.title}
                  </h3>
                  <span className="text-[10px] uppercase font-extrabold px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                    {preset.scope === 'civs' ? '⚔️ Civs' : preset.scope === 'maps' ? '🗺️ Maps' : '⚔️🗺️ Both'}
                  </span>
                </div>
                {preset.description && (
                  <p className="text-xs text-slate-400 mb-3 line-clamp-2">
                    {preset.description}
                  </p>
                )}

                <div className="flex items-center gap-4 text-xs text-slate-400 py-2 border-y border-slate-800/80 my-3">
                  <div>
                    <span className="text-slate-200 font-bold">{preset.turns?.length || 0}</span> Turni
                  </div>
                  <div>
                    <span className="text-slate-200 font-bold">30s</span> Timer / turno
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopyLink(preset.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition-all shadow"
                    title="Copia link preset per regolamento"
                  >
                    {copiedId === preset.id ? (
                      <>
                        <Check size={14} className="text-emerald-400" />
                        <span>✓ Copiato!</span>
                      </>
                    ) : (
                      <>
                        <Copy size={14} />
                        <span>Copia Link Preset</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => handleOpenHistory(preset)}
                    className="flex items-center gap-1 px-3 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 rounded-xl text-xs font-bold transition-all"
                    title="Storico delle stanze giocate"
                  >
                    <History size={14} />
                    <span>Storico</span>
                  </button>
                </div>

                <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/60">
                  <button
                    onClick={() => setEditingPreset({
                      ...preset,
                      map_pool: (preset.map_pool && preset.map_pool.length > 0) ? preset.map_pool : [...AOE4_MAPS]
                    })}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-slate-800/40 hover:bg-slate-800 text-slate-300 rounded-lg text-xs font-semibold transition-colors"
                  >
                    <Edit2 size={14} />
                    <span>Modifica</span>
                  </button>

                  <button
                    onClick={() => setDeleteConfirm({ type: 'preset', id: preset.id, title: preset.title })}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-xs font-semibold transition-colors"
                  >
                    <Trash2 size={14} />
                    <span>Elimina</span>
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
