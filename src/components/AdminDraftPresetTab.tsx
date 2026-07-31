import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Copy, Check, Clock, Layers, ChevronUp, ChevronDown, Swords } from 'lucide-react';
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
                onChange={(e) => setEditingPreset({ ...editingPreset, scope: e.target.value as any })}
                className="w-full bg-slate-950/80 border border-slate-700/60 rounded-xl px-4 py-2.5 text-white font-medium focus:border-cyan-400 focus:outline-none"
              >
                <option value="civs">⚔️ Solo Civiltà</option>
                <option value="maps">🗺️ Solo Mappe</option>
                <option value="both">⚔️🗺️ Civiltà e Mappe</option>
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
                    onChange={(e) => updateTurn(idx, { player: e.target.value as TurnPlayer })}
                    className={`bg-slate-900 border rounded-xl px-3 py-1.5 text-xs font-bold ${
                      turn.player === 'HOST'
                        ? 'text-red-400 border-red-500/40'
                        : 'text-blue-400 border-blue-500/40'
                    }`}
                  >
                    <option value="HOST">🔴 Host (Player 1)</option>
                    <option value="GUEST">🔵 Guest (Player 2)</option>
                  </select>

                  {/* Action select (BAN / PICK / SNIPE) */}
                  <select
                    value={turn.action}
                    onChange={(e) => updateTurn(idx, { action: e.target.value as TurnAction })}
                    className={`bg-slate-900 border rounded-xl px-3 py-1.5 text-xs font-bold ${
                      turn.action === 'BAN'
                        ? 'text-red-400 border-red-500/40'
                        : turn.action === 'SNIPE'
                        ? 'text-purple-400 border-purple-500/40'
                        : 'text-emerald-400 border-emerald-500/40'
                    }`}
                  >
                    <option value="BAN">🚫 BANNA</option>
                    <option value="PICK">✅ PICCA</option>
                    <option value="SNIPE">🎯 SNIPPA</option>
                  </select>

                  {/* Target select */}
                  <select
                    value={turn.target}
                    onChange={(e) => updateTurn(idx, { target: e.target.value as TurnTarget })}
                    className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-200"
                  >
                    <option value="CIV">⚔️ Civiltà</option>
                    <option value="MAP">🗺️ Mappa</option>
                  </select>

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
              className="px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl font-extrabold text-sm shadow-lg transition-all"
            >
              Salva Preset
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

              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={() => handleCopyLink(preset.id)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition-all shadow"
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
                  className="p-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors"
                  title="Modifica preset"
                >
                  <Edit2 size={16} />
                </button>

                <button
                  onClick={() => handleDeletePreset(preset.id)}
                  className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl transition-colors"
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
