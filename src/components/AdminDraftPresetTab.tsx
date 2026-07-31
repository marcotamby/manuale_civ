import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Copy, Check, Sparkles, Clock, Layers, ChevronUp, ChevronDown } from 'lucide-react';
import { draftService } from '../services/draftService';
import type { DraftPreset, DraftTurn, TurnPlayer, TurnAction, TurnTarget } from '../services/draftService';
import { Toast } from './Toast';

export function AdminDraftPresetTab() {
  const [presets, setPresets] = useState<DraftPreset[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPreset, setEditingPreset] = useState<Partial<DraftPreset> | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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

  const handleCreateNew = () => {
    setEditingPreset({
      id: '',
      title: 'Nuovo Preset BO3',
      description: 'Preset per BO3 con 1 Ban e 3 Pick per giocatore',
      scope: 'civs',
      is_active: true,
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
    try {
      await draftService.savePreset(editingPreset);
      setToastMessage('Preset salvato con successo!');
      setEditingPreset(null);
      loadPresets();
    } catch (err) {
      console.error('Failed to save preset:', err);
      setToastMessage('Errore durante il salvataggio del preset.');
    }
  };

  const handleDeletePreset = async (id: string) => {
    if (!window.confirm('Sei sicuro di voler eliminare questo preset?')) return;
    try {
      await draftService.deletePreset(id);
      setToastMessage('Preset eliminato.');
      loadPresets();
    } catch (err) {
      console.error('Failed to delete preset:', err);
    }
  };

  const handleCopyLink = (presetId: string) => {
    const url = `${window.location.origin}/draft/preset/${presetId}`;
    navigator.clipboard.writeText(url);
    setCopiedId(presetId);
    setToastMessage('Link del Preset copiato! Incollalo nel regolamento o nei post.');
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

  return (
    <div className="space-y-6">
      {toastMessage && (
        <Toast
          message={toastMessage}
          type="success"
          isVisible={!!toastMessage}
          onClose={() => setToastMessage(null)}
        />
      )}

      {/* Header section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gray-900/60 p-4 rounded-xl border border-white/10 backdrop-blur-md">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Sparkles className="text-yellow-500" size={22} />
            Gestione Preset Draft (Captain's Mode)
          </h2>
          <p className="text-sm text-gray-400">
            Crea e personalizza i flussi di Pick & Ban. Una volta creati, copia il link del preset ed incollalo nel regolamento o nei post per far avviare le stanze ai player!
          </p>
        </div>
        <button
          onClick={handleCreateNew}
          className="flex items-center gap-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-lg transition-all shadow-[0_0_15px_rgba(212,175,55,0.3)] shrink-0"
        >
          <Plus size={18} />
          Crea Nuovo Preset
        </button>
      </div>

      {/* Editor Modal / Panel */}
      {editingPreset && (
        <div className="bg-gray-900/90 border border-yellow-500/40 p-6 rounded-2xl shadow-2xl space-y-6 backdrop-blur-xl">
          <div className="flex justify-between items-center pb-4 border-b border-white/10">
            <h3 className="text-lg font-bold text-yellow-400 flex items-center gap-2">
              <Edit2 size={18} />
              {editingPreset.id ? 'Modifica Preset' : 'Crea Nuovo Preset'}
            </h3>
            <button
              onClick={() => setEditingPreset(null)}
              className="text-gray-400 hover:text-white px-3 py-1 bg-white/5 rounded-lg text-sm"
            >
              Annulla
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-300 uppercase mb-1">
                Titolo Preset (es. BO3 Finale Torneo)
              </label>
              <input
                type="text"
                value={editingPreset.title || ''}
                onChange={(e) => setEditingPreset({ ...editingPreset, title: e.target.value })}
                placeholder="Es. BO3 Tornei Italia"
                className="w-full bg-black/60 border border-white/20 rounded-lg px-3 py-2 text-white font-medium focus:border-yellow-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-300 uppercase mb-1">
                Ambito del Draft
              </label>
              <select
                value={editingPreset.scope || 'civs'}
                onChange={(e) => setEditingPreset({ ...editingPreset, scope: e.target.value as any })}
                className="w-full bg-black/60 border border-white/20 rounded-lg px-3 py-2 text-white font-medium focus:border-yellow-500 focus:outline-none"
              >
                <option value="civs">⚔️ Solo Civiltà</option>
                <option value="maps">🗺️ Solo Mappe</option>
                <option value="both">⚔️🗺️ Civiltà e Mappe</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-300 uppercase mb-1">
              Descrizione o Note (Opzionale)
            </label>
            <input
              type="text"
              value={editingPreset.description || ''}
              onChange={(e) => setEditingPreset({ ...editingPreset, description: e.target.value })}
              placeholder="Es. 1 Ban per parte, poi 3 Pick alternati per BO3"
              className="w-full bg-black/60 border border-white/20 rounded-lg px-3 py-2 text-gray-300 text-sm focus:border-yellow-500 focus:outline-none"
            />
          </div>

          {/* Turn Sequence Builder */}
          <div className="space-y-4 pt-2">
            <div className="flex justify-between items-center">
              <h4 className="text-sm font-bold text-gray-200 uppercase tracking-wider flex items-center gap-2">
                <Layers size={16} className="text-yellow-500" />
                Sequenza Turni (Totale: {editingPreset.turns?.length || 0} turni)
              </h4>
              <button
                onClick={addTurn}
                className="px-3 py-1.5 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 border border-yellow-500/40 rounded-lg text-xs font-bold flex items-center gap-1 transition-all"
              >
                <Plus size={14} /> Aggiungi Turno
              </button>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {editingPreset.turns?.map((turn, idx) => (
                <div
                  key={idx}
                  className="flex flex-wrap sm:flex-nowrap items-center gap-2 bg-black/40 p-3 rounded-xl border border-white/10 hover:border-white/20 transition-all"
                >
                  <span className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center font-bold text-sm text-yellow-400 shrink-0">
                    #{turn.step}
                  </span>

                  {/* Player select */}
                  <select
                    value={turn.player}
                    onChange={(e) => updateTurn(idx, { player: e.target.value as TurnPlayer })}
                    className={`bg-black/60 border rounded-lg px-2.5 py-1.5 text-xs font-bold ${
                      turn.player === 'HOST'
                        ? 'text-red-400 border-red-500/40'
                        : 'text-blue-400 border-blue-500/40'
                    }`}
                  >
                    <option value="HOST">🔴 Host (Player 1)</option>
                    <option value="GUEST">🔵 Guest (Player 2)</option>
                  </select>

                  {/* Action select */}
                  <select
                    value={turn.action}
                    onChange={(e) => updateTurn(idx, { action: e.target.value as TurnAction })}
                    className={`bg-black/60 border rounded-lg px-2.5 py-1.5 text-xs font-bold ${
                      turn.action === 'BAN'
                        ? 'text-red-400 border-red-500/40'
                        : 'text-emerald-400 border-emerald-500/40'
                    }`}
                  >
                    <option value="BAN">🚫 BANNA</option>
                    <option value="PICK">✅ PICCA</option>
                  </select>

                  {/* Target select */}
                  <select
                    value={turn.target}
                    onChange={(e) => updateTurn(idx, { target: e.target.value as TurnTarget })}
                    className="bg-black/60 border border-white/20 rounded-lg px-2.5 py-1.5 text-xs font-bold text-gray-200"
                  >
                    <option value="CIV">⚔️ Civiltà</option>
                    <option value="MAP">🗺️ Mappa</option>
                  </select>

                  {/* Timer select */}
                  <div className="flex items-center gap-1 bg-black/60 px-2 py-1 rounded-lg border border-white/10 text-xs text-gray-300">
                    <Clock size={12} className="text-yellow-500" />
                    <span>30 sec</span>
                  </div>

                  {/* Ordering & Delete */}
                  <div className="flex items-center gap-1 ml-auto shrink-0">
                    <button
                      disabled={idx === 0}
                      onClick={() => moveTurn(idx, 'up')}
                      className="p-1 hover:bg-white/10 text-gray-400 disabled:opacity-30 rounded"
                    >
                      <ChevronUp size={16} />
                    </button>
                    <button
                      disabled={idx === (editingPreset.turns?.length || 1) - 1}
                      onClick={() => moveTurn(idx, 'down')}
                      className="p-1 hover:bg-white/10 text-gray-400 disabled:opacity-30 rounded"
                    >
                      <ChevronDown size={16} />
                    </button>
                    <button
                      onClick={() => removeTurn(idx)}
                      className="p-1 hover:bg-red-500/20 text-red-400 rounded"
                      title="Rimuovi turno"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
            <button
              onClick={() => setEditingPreset(null)}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg font-bold text-sm"
            >
              Annulla
            </button>
            <button
              onClick={handleSavePreset}
              className="px-6 py-2 bg-yellow-500 hover:bg-yellow-400 text-black rounded-lg font-bold text-sm shadow-lg transition-all"
            >
              Salva Preset
            </button>
          </div>
        </div>
      )}

      {/* List of presets */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full py-12 text-center text-gray-400">
            Caricamento preset...
          </div>
        ) : presets.length === 0 ? (
          <div className="col-span-full py-12 text-center text-gray-400 bg-gray-900/40 rounded-xl border border-white/10">
            Nessun preset di draft creato finora. Clicca su <strong>"Crea Nuovo Preset"</strong> per iniziare!
          </div>
        ) : (
          presets.map((preset) => (
            <div
              key={preset.id}
              className="bg-gray-900/70 border border-white/10 hover:border-yellow-500/40 p-5 rounded-2xl flex flex-col justify-between transition-all group backdrop-blur-md"
            >
              <div>
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-white text-lg group-hover:text-yellow-400 transition-colors">
                    {preset.title}
                  </h3>
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                    {preset.scope === 'civs' ? '⚔️ Civs' : preset.scope === 'maps' ? '🗺️ Maps' : '⚔️🗺️ Both'}
                  </span>
                </div>
                {preset.description && (
                  <p className="text-xs text-gray-400 mb-3 line-clamp-2">
                    {preset.description}
                  </p>
                )}

                <div className="flex items-center gap-4 text-xs text-gray-400 py-2 border-y border-white/5 my-3">
                  <div>
                    <span className="text-white font-bold">{preset.turns?.length || 0}</span> Turni
                  </div>
                  <div>
                    <span className="text-white font-bold">30s</span> Timer / turno
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={() => handleCopyLink(preset.id)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded-xl text-xs font-bold transition-all"
                  title="Copia link preset per regolamento"
                >
                  {copiedId === preset.id ? (
                    <>
                      <Check size={14} className="text-emerald-400" />
                      <span>Copiato!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={14} />
                      <span>Copia Link Preset</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => setEditingPreset(preset)}
                  className="p-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl transition-all"
                  title="Modifica preset"
                >
                  <Edit2 size={16} />
                </button>

                <button
                  onClick={() => handleDeletePreset(preset.id)}
                  className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl transition-all"
                  title="Elimina preset"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
