import { useState, useEffect } from 'react';
import { Save, X, Loader2, Play, Map, Plus, Trash2, CheckCircle, Clock, FileText } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { YouTubePickerModal } from './YouTubePickerModal';
import { Toast } from './Toast';
import type { ToastType } from './Toast';
import type { Civilization } from '../data/aoe4Data';

interface AdminCivEditorModalProps {
  civ: Civilization;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedCiv: Civilization) => void;
}

export function AdminCivEditorModal({ civ, isOpen, onClose, onSave }: AdminCivEditorModalProps) {
  const [editedCiv, setEditedCiv] = useState<Civilization>(civ);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaveSuccess, setIsSaveSuccess] = useState(false);
  const [isYoutubePickerOpen, setIsYoutubePickerOpen] = useState(false);
  const [toast, setToast] = useState<{ isVisible: boolean; message: string; type: ToastType }>({
    isVisible: false,
    message: '',
    type: 'success'
  });

  // Sync state with props when modal opens or civ changes
  useEffect(() => {
    if (isOpen) {
      let defaultStrengths = civ.strengths || [];
      if (defaultStrengths.length === 0) {
        const generated = [];
        if (civ.uniqueUnits?.length > 0) {
          generated.push(`Accesso a unità uniche: ${civ.uniqueUnits.map(u => u.name).join(', ')}`);
        }
        if (generated.length > 0) {
          defaultStrengths = generated;
        }
      }

      setEditedCiv({
        ...civ,
        strengths: defaultStrengths
      });
    }
  }, [civ, isOpen]);

  const getYoutubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  if (!isOpen) return null;

  const handleSave = async () => {
    try {
      setIsSaving(true);

      const { error } = await supabase
        .from('civilizations')
        .update({
          name: editedCiv.name,
          difficulty: editedCiv.difficulty,
          short_description: editedCiv.shortDescription,
          passive_bonuses: editedCiv.passiveBonuses,
          videos: editedCiv.videos,
          build_orders: editedCiv.buildOrders,
          unique_units: editedCiv.uniqueUnits,
          landmarks: editedCiv.landmarks,
          strengths: editedCiv.strengths?.filter(s => s.trim() !== '') || [],
          weaknesses: editedCiv.weaknesses?.filter(s => s.trim() !== '') || []
        })
        .eq('id', civ.id);

      if (error) throw error;

      setIsSaveSuccess(true);

      onSave({
        ...editedCiv,
        strengths: editedCiv.strengths?.filter(s => s.trim() !== '') || [],
        weaknesses: editedCiv.weaknesses?.filter(s => s.trim() !== '') || []
      });

      setTimeout(() => {
        setIsSaveSuccess(false);
      }, 2000);

    } catch (err: any) {
      console.error('Error saving civilization:', err);
      setToast({
        isVisible: true,
        message: `Errore: ${err?.message || 'Errore nel salvataggio'}`,
        type: 'error'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleBonusChange = (index: number, value: string) => {
    const newBonuses = [...editedCiv.passiveBonuses];
    newBonuses[index] = value;
    setEditedCiv({ ...editedCiv, passiveBonuses: newBonuses });
  };

  const updateArrayField = <T extends keyof Civilization>(field: T, index: number, key: string, value: any) => {
    const newArr = [...(editedCiv[field] as any[])];

    if (key === 'steps' && field === 'buildOrders') {
      newArr[index] = { ...newArr[index], steps: value };
    } else if (key === 'updateStep' && field === 'buildOrders') {
      const { stepIndex, stepField, stepValue } = value;
      const steps = [...(newArr[index].steps || [])];
      steps[stepIndex] = { ...steps[stepIndex], [stepField === 'notes' ? 'note' : stepField]: stepValue };
      newArr[index] = { ...newArr[index], steps };
    } else if (key === 'addStep' && field === 'buildOrders') {
      const steps = [...(newArr[index].steps || []), { time: '', action: '', note: '' }];
      newArr[index] = { ...newArr[index], steps };
    } else if (key === 'removeStep' && field === 'buildOrders') {
      const steps = [...(newArr[index].steps || [])];
      steps.splice(value, 1);
      newArr[index] = { ...newArr[index], steps };
    } else if (['attack', 'armor', 'speed', 'health'].includes(key)) {
      newArr[index] = {
        ...newArr[index],
        stats: { ...(newArr[index].stats || {}), [key]: Number(value) }
      };
    } else {
      newArr[index] = { ...newArr[index], [key]: key === 'age' ? Number(value) : value };
    }

    setEditedCiv({ ...editedCiv, [field]: newArr });
  };

  const removeFromArray = <T extends keyof Civilization>(field: T, index: number) => {
    const newArr = [...(editedCiv[field] as any[])];
    newArr.splice(index, 1);
    setEditedCiv({ ...editedCiv, [field]: newArr });
  };

  const addToArray = <T extends keyof Civilization>(field: T, item: any) => {
    setEditedCiv({ ...editedCiv, [field]: [...(editedCiv[field] as any[] || []), item] });
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-[#1a1c23] border border-purple-500/50 rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden shadow-[0_0_50px_rgba(168,85,247,0.2)] flex flex-col animate-in fade-in zoom-in duration-200">

        <div className="p-6 border-b border-purple-500/20 flex justify-between items-center bg-purple-500/5">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <span className="text-purple-400">🛡️ Admin Editor:</span> {civ.name}
            </h2>
            <p className="text-xs text-gray-400 mt-1">Le modifiche apportate qui verranno salvate istantaneamente nel database (live per tutti).</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors p-2 bg-white/5 rounded-lg hover:bg-white/10">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-300 mb-1">Nome Civiltà</label>
                <input
                  type="text"
                  value={editedCiv.name}
                  onChange={e => setEditedCiv({ ...editedCiv, name: e.target.value })}
                  className="w-full bg-black/40 border border-gray-600 rounded-lg px-4 py-2 text-white focus:border-purple-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-300 mb-1">Difficoltà</label>
                <select
                  value={editedCiv.difficulty}
                  onChange={e => setEditedCiv({ ...editedCiv, difficulty: e.target.value as any })}
                  className="w-full bg-black/40 border border-gray-600 rounded-lg px-4 py-2 text-white focus:border-purple-500 transition-colors [&>option]:bg-[#1a1c23] [&>option]:text-white"
                >
                  <option value="Facile">Facile</option>
                  <option value="Medio">Medio</option>
                  <option value="Difficile">Difficile</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-300 mb-1">Descrizione Breve</label>
                <textarea
                  value={editedCiv.shortDescription}
                  onChange={e => setEditedCiv({ ...editedCiv, shortDescription: e.target.value })}
                  rows={4}
                  className="w-full bg-black/40 border border-gray-600 rounded-lg px-4 py-2 text-white focus:border-purple-500 transition-colors resize-y"
                />
              </div>



              <div>
                <div className="flex justify-between items-end mb-1">
                  <label className="text-sm font-bold text-gray-300 flex items-center gap-2">
                    <Play size={16} className="text-red-500" />
                    Video YouTube (Link o ID)
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsYoutubePickerOpen(true)}
                    className="text-[10px] bg-red-600 hover:bg-red-500 text-white px-2 py-1 rounded flex items-center gap-1 transition-all shadow-lg shadow-red-600/20 active:scale-95 z-10"
                  >
                    <Play size={10} fill="currentColor" /> Sfoglia Canale
                  </button>
                </div>
                <textarea
                  value={editedCiv.videos?.join(', ') || ''}
                  onChange={e => {
                    const rawValues = e.target.value.split(',').map(v => v.trim()).filter(Boolean);
                    const parsedIds = rawValues.map(val => {
                      // Extract ID from various YouTube URL formats
                      if (val.includes('youtube.com/watch?v=')) {
                        return val.split('v=')[1]?.split('&')[0] || val;
                      } else if (val.includes('youtu.be/')) {
                        return val.split('youtu.be/')[1]?.split('?')[0] || val;
                      }
                      return val;
                    });
                    setEditedCiv({ ...editedCiv, videos: parsedIds });
                  }}
                  placeholder="Incolla i link dei video separati da virgola..."
                  rows={3}
                  className="w-full bg-black/40 border border-gray-600 rounded-lg px-4 py-2 text-sm text-white focus:border-purple-500 transition-colors"
                />
                <p className="text-[10px] text-gray-500 mt-1 italic">Puoi incollare i link completi (es. youtube.com/watch?v=...) e verranno convertiti in ID automaticamente.</p>
              </div>
            </div>

            <div className="space-y-4">
              <label className="block text-sm font-bold text-gray-300 mb-1">Bonus</label>
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {editedCiv.passiveBonuses.map((bonus: string, idx: number) => (
                  <div key={idx} className="flex gap-2">
                    <textarea
                      value={bonus}
                      onChange={e => handleBonusChange(idx, e.target.value)}
                      rows={2}
                      className="w-full bg-black/40 border border-gray-600 rounded-lg px-3 py-1 text-sm text-white focus:border-purple-500 transition-colors"
                    />
                    <button
                      onClick={() => {
                        const nb = [...editedCiv.passiveBonuses];
                        nb.splice(idx, 1);
                        setEditedCiv({ ...editedCiv, passiveBonuses: nb });
                      }}
                      className="p-2 h-fit bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/40"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setEditedCiv({ ...editedCiv, passiveBonuses: [...editedCiv.passiveBonuses, 'Nuovo Bonus...'] })}
                className="w-full py-2 bg-white/5 border border-dashed border-gray-500 text-gray-400 rounded-lg hover:bg-white/10 hover:text-white transition-all text-sm font-bold mt-2"
              >
                + Aggiungi Bonus
              </button>

              <div className="pt-4 mt-6 border-t border-gray-600/30 space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-300 mb-1">Punti di Forza</label>
                  <textarea
                    value={editedCiv.strengths?.join('\n') || ''}
                    onChange={e => {
                      const values = e.target.value.split('\n');
                      setEditedCiv({ ...editedCiv, strengths: values });
                    }}
                    rows={4}
                    placeholder="Inserisci un punto di forza per riga..."
                    className="w-full bg-black/40 border border-gray-600 rounded-lg px-4 py-2 text-white focus:border-purple-500 transition-colors resize-y"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-300 mb-1">Punti Deboli</label>
                  <textarea
                    value={editedCiv.weaknesses?.join('\n') || ''}
                    onChange={e => {
                      const values = e.target.value.split('\n');
                      setEditedCiv({ ...editedCiv, weaknesses: values });
                    }}
                    rows={4}
                    placeholder="Inserisci un punto debole per riga..."
                    className="w-full bg-black/40 border border-gray-600 rounded-lg px-4 py-2 text-white focus:border-purple-500 transition-colors resize-y"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-purple-500/20">
            <h3 className="text-xl font-bold text-white mb-4">Dati Strutturati (Visual Editor)</h3>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* Unità Uniche */}
              <div className="bg-black/30 border border-blue-500/30 rounded-xl p-4">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-bold text-blue-400 flex items-center gap-2"><span className="text-xl">⚔️</span> Unità Uniche</h4>
                  <button onClick={() => addToArray('uniqueUnits', { id: 'new-unit', name: 'Nuova Unità', type: 'Infantry', age: 2, stats: { attack: 0, armor: 0, speed: 1, health: 100 }, strengths: [], weaknesses: [], description: '' })} className="text-xs bg-blue-600 hover:bg-blue-500 text-white px-2 py-1 rounded flex items-center gap-1">
                    <Plus size={14} /> Aggiungi
                  </button>
                </div>
                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {(editedCiv.uniqueUnits || []).map((u: any, idx: number) => (
                    <div key={idx} className="bg-black/50 border border-gray-700 rounded-lg p-3 relative group">
                      <button onClick={() => removeFromArray('uniqueUnits', idx)} className="absolute top-2 right-2 text-gray-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trash2 size={16} />
                      </button>
                      <div className="grid grid-cols-2 gap-2 mb-2">
                        <input type="text" value={u.name} onChange={e => updateArrayField('uniqueUnits', idx, 'name', e.target.value)} placeholder="Nome Unità" className="bg-gray-800 text-white text-sm rounded px-2 py-1 border border-gray-600 w-full" />
                        <select value={u.type} onChange={e => updateArrayField('uniqueUnits', idx, 'type', e.target.value)} className="bg-gray-800 text-white text-sm rounded px-2 py-1 border border-gray-600 w-full">
                          <option value="Infantry">Infantry</option><option value="Cavalry">Cavalry</option><option value="Ranged">Ranged</option><option value="Siege">Siege</option>
                        </select>
                      </div>
                      <div className="grid grid-cols-5 gap-1 mb-2">
                        <input type="number" min="1" max="4" value={u.age} onChange={e => updateArrayField('uniqueUnits', idx, 'age', e.target.value)} title="Age" className="bg-gray-800 text-white text-xs rounded px-1 py-1 text-center border border-gray-600" />
                        <input type="number" value={u.stats?.attack || 0} onChange={e => updateArrayField('uniqueUnits', idx, 'attack', e.target.value)} title="Attack" className="bg-gray-800 text-red-300 text-xs rounded px-1 py-1 text-center border border-gray-600" />
                        <input type="number" value={u.stats?.armor || 0} onChange={e => updateArrayField('uniqueUnits', idx, 'armor', e.target.value)} title="Armor" className="bg-gray-800 text-gray-300 text-xs rounded px-1 py-1 text-center border border-gray-600" />
                        <input type="number" value={u.stats?.health || 0} onChange={e => updateArrayField('uniqueUnits', idx, 'health', e.target.value)} title="Health" className="bg-gray-800 text-green-300 text-xs rounded px-1 py-1 text-center border border-gray-600" />
                        <input type="number" step="0.1" value={u.stats?.speed || 0} onChange={e => updateArrayField('uniqueUnits', idx, 'speed', e.target.value)} title="Speed" className="bg-gray-800 text-blue-300 text-xs rounded px-1 py-1 text-center border border-gray-600" />
                      </div>
                      <textarea value={u.description} onChange={e => updateArrayField('uniqueUnits', idx, 'description', e.target.value)} placeholder="Descrizione" rows={2} className="bg-gray-800 text-white text-xs rounded px-2 py-1 border border-gray-600 w-full resize-none" />
                    </div>
                  ))}
                  {(!editedCiv.uniqueUnits || editedCiv.uniqueUnits.length === 0) && <p className="text-gray-500 text-sm italic text-center py-4">Nessuna unità unica</p>}
                </div>
              </div>


              {/* Landmarks */}
              <div className="bg-black/30 border border-purple-500/30 rounded-xl p-4">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-bold text-purple-400 flex items-center gap-2"><span className="text-xl">🏛️</span> Landmarks</h4>
                  <button onClick={() => addToArray('landmarks', { id: 'new-landmark', name: 'Nuovo Landmark', age: 2, type: 'Economic', description: '' })} className="text-xs bg-purple-600 hover:bg-purple-500 text-white px-2 py-1 rounded flex items-center gap-1">
                    <Plus size={14} /> Aggiungi
                  </button>
                </div>
                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {(editedCiv.landmarks || []).map((l: any, idx: number) => (
                    <div key={idx} className="bg-black/50 border border-gray-700 rounded-lg p-3 relative group">
                      <button onClick={() => removeFromArray('landmarks', idx)} className="absolute top-2 right-2 text-gray-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trash2 size={16} />
                      </button>
                      <div className="grid grid-cols-12 gap-2 mb-2">
                        <input type="text" value={l.name} onChange={e => updateArrayField('landmarks', idx, 'name', e.target.value)} placeholder="Nome Landmark" className="col-span-6 bg-gray-800 text-white text-sm rounded px-2 py-1 border border-gray-600" />
                        <select value={l.type} onChange={e => updateArrayField('landmarks', idx, 'type', e.target.value)} className="col-span-4 bg-gray-800 text-white text-xs rounded px-1 py-1 border border-gray-600">
                          <option value="Military">Military</option><option value="Economic">Economic</option><option value="Defensive">Defensive</option><option value="Religious">Religious</option><option value="Technology">Technology</option>
                        </select>
                        <input type="number" min="2" max="4" value={l.age} onChange={e => updateArrayField('landmarks', idx, 'age', e.target.value)} title="Age" className="col-span-2 bg-gray-800 text-white text-sm rounded px-1 py-1 text-center border border-gray-600" />
                      </div>
                      <textarea value={l.description} onChange={e => updateArrayField('landmarks', idx, 'description', e.target.value)} placeholder="Descrizione" rows={2} className="bg-gray-800 text-white text-xs rounded px-2 py-1 border border-gray-600 w-full resize-none" />
                    </div>
                  ))}
                  {(!editedCiv.landmarks || editedCiv.landmarks.length === 0) && <p className="text-gray-500 text-sm italic text-center py-4">Nessun landmark</p>}
                </div>
              </div>

              {/* Build Orders */}
              <div className="bg-black/30 border border-yellow-500/30 rounded-xl p-4">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-bold text-yellow-400 flex items-center gap-2"><Map size={18} /> Build Orders</h4>
                  <button onClick={() => addToArray('buildOrders', { id: 'new-buildorder', title: 'Nuovo Build Order', difficulty: 'Medium', description: '', steps: [] })} className="text-xs bg-yellow-600 hover:bg-yellow-500 text-white px-2 py-1 rounded flex items-center gap-1">
                    <Plus size={14} /> Aggiungi
                  </button>
                </div>
                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {(editedCiv.buildOrders || []).map((bo: any, idx: number) => (
                    <div key={idx} className="bg-black/50 border border-gray-700 rounded-lg p-3 relative group">
                      <button onClick={() => removeFromArray('buildOrders', idx)} className="absolute top-2 right-2 text-gray-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                        <Trash2 size={16} />
                      </button>
                      <div className="grid grid-cols-3 gap-2 mb-2 pr-6">
                        <input type="text" value={bo.title} onChange={e => updateArrayField('buildOrders', idx, 'title', e.target.value)} placeholder="Titolo" className="col-span-3 bg-gray-800 text-white text-sm rounded px-2 py-1 border border-gray-600" />
                      </div>
                      <div className="mb-2">
                        <label className="text-[10px] text-gray-500 uppercase font-bold mb-1 block text-blue-400">Descrizione / Strategia</label>
                        <textarea
                          value={bo.description || ''}
                          onChange={e => updateArrayField('buildOrders', idx, 'description', e.target.value)}
                          placeholder="Descrizione obbligatoria della strategia..."
                          rows={3}
                          className="w-full bg-gray-900 border border-blue-500/20 rounded px-3 py-2 text-sm text-gray-200 focus:border-blue-500 outline-none h-24"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2 mb-2">
                        <div>
                          <label className="text-[10px] text-gray-500 uppercase font-bold mb-2 block text-yellow-500">Fonte / Link YouTube (Anteprima Auto)</label>
                          <input
                            type="text"
                            value={bo.source || ''}
                            onChange={e => updateArrayField('buildOrders', idx, 'source', e.target.value)}
                            placeholder="https://www.youtube.com/watch?v=..."
                            className="w-full bg-gray-800 text-yellow-400 text-sm rounded px-3 py-2 border border-gray-600 focus:border-yellow-500 outline-none"
                          />
                          {bo.source && getYoutubeId(bo.source) && (
                            <div className="mt-2 relative aspect-video w-full max-w-xs rounded-lg overflow-hidden border border-white/10 group">
                              <img
                                src={`https://img.youtube.com/vi/${getYoutubeId(bo.source)}/mqdefault.jpg`}
                                alt="Preview"
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 flex items-center justify-center bg-black/40 group-hover:bg-black/20 transition-all">
                                <Play size={24} className="text-white fill-white shadow-lg shadow-black/50" />
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] text-gray-500 uppercase font-bold mb-1 block">Nickname Autore</label>
                            <input
                              type="text"
                              value={bo.author_nickname || ''}
                              onChange={e => updateArrayField('buildOrders', idx, 'author_nickname', e.target.value)}
                              className="w-full bg-gray-800 text-blue-400 text-xs rounded px-2 py-1 border border-gray-600"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-gray-500 uppercase font-bold mb-1 block">Rank Autore</label>
                            <input
                              type="text"
                              value={bo.author_rank || ''}
                              onChange={e => updateArrayField('buildOrders', idx, 'author_rank', e.target.value)}
                              placeholder="Silver III"
                              className="w-full bg-gray-800 text-white text-xs rounded px-2 py-1 border border-gray-600"
                            />
                          </div>
                        </div>
                      </div>
                      {/* Steps (Structured handling) */}
                      <div className="mt-4 space-y-3">
                        <div className="flex items-center mb-1">
                          <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Passaggi Strategia</label>
                        </div>

                        <div className="space-y-2">
                          {(bo.steps || []).map((step: any, sIdx: number) => (
                            <div key={sIdx} className="bg-black/40 p-2 rounded border border-gray-700/50 group/step relative">
                              <button
                                onClick={() => updateArrayField('buildOrders', idx, 'removeStep', sIdx)}
                                className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover/step:opacity-100 transition-opacity z-10"
                              >
                                <X size={10} />
                              </button>

                              <div className="grid grid-cols-12 gap-2">
                                <div className="col-span-3">
                                  <div className="relative flex items-center">
                                    <Clock size={10} className="absolute left-2 text-gray-500" />
                                    <input
                                      type="text"
                                      placeholder="00:00"
                                      value={step.time || ''}
                                      onChange={(e) => updateArrayField('buildOrders', idx, 'updateStep', { stepIndex: sIdx, stepField: 'time', stepValue: e.target.value })}
                                      className="w-full bg-gray-900 border border-gray-700/50 rounded pl-7 pr-1 py-2 text-sm text-yellow-300 focus:border-blue-500 outline-none font-mono"
                                    />
                                  </div>
                                </div>
                                <div className="col-span-9">
                                  <textarea
                                    placeholder="Azione..."
                                    value={step.action || ''}
                                    onChange={(e) => updateArrayField('buildOrders', idx, 'updateStep', { stepIndex: sIdx, stepField: 'action', stepValue: e.target.value })}
                                    rows={1}
                                    className="w-full bg-gray-900 border border-gray-700/50 rounded px-2 py-2 text-sm text-white focus:border-blue-500 outline-none font-bold resize-y"
                                  />
                                </div>
                                <div className="col-span-12">
                                  <div className="relative">
                                    <textarea
                                      value={step.note || ''}
                                      onChange={e => {
                                        const newSteps = [...bo.steps];
                                        newSteps[sIdx].note = e.target.value;
                                        updateArrayField('buildOrders', idx, 'steps', newSteps);
                                      }}
                                      placeholder="Note passaggi..."
                                      className="w-full bg-gray-900 border border-gray-700 rounded px-2 pt-1 pb-6 text-[11px] text-gray-400 italic h-16 resize-y"
                                    />
                                    <FileText size={12} className="absolute left-2 bottom-2 text-gray-600" />
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}

                          {(!bo.steps || bo.steps.length === 0) && (
                            <p className="text-[10px] text-gray-500 italic text-center py-2 border border-dashed border-gray-700 rounded">Nessun passaggio definito</p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => updateArrayField('buildOrders', idx, 'addStep', null)}
                          className="mt-2 flex items-center gap-1 text-[10px] bg-blue-600/20 text-blue-400 px-2 py-1 rounded border border-blue-500/30 hover:bg-blue-600/40 transition-all font-bold"
                        >
                          <Plus size={10} /> Aggiungi Step
                        </button>
                      </div>
                    </div>
                  ))}
                  {(!editedCiv.buildOrders || editedCiv.buildOrders.length === 0) && <p className="text-gray-500 text-sm italic text-center py-4">Nessun build order</p>}
                </div>
              </div>

            </div>
          </div>
        </div>

        <div className="p-6 border-t border-purple-500/20 bg-black/40 flex justify-center items-center gap-4">

          <button
            onClick={handleSave}
            disabled={isSaving || isSaveSuccess}
            className={`px-8 py-3 text-white rounded-xl font-bold flex items-center gap-2 transition-all ${isSaving ? 'opacity-50 cursor-not-allowed' : ''
              } ${isSaveSuccess
                ? 'bg-green-500 shadow-[0_0_30px_rgba(34,197,94,0.8)] border border-green-400 scale-105 duration-300'
                : 'bg-purple-600 hover:bg-purple-500 shadow-lg shadow-purple-600/30'
              }`}
          >
            {isSaving ? (
              <Loader2 size={18} className="animate-spin" />
            ) : isSaveSuccess ? (
              <CheckCircle size={18} className="animate-in zoom-in duration-300" />
            ) : (
              <Save size={18} />
            )}
            {isSaving ? 'Salvataggio...' : isSaveSuccess ? 'Salvato con successo' : 'Salva nel Database'}
          </button>
        </div>
      </div>

      <YouTubePickerModal
        isOpen={isYoutubePickerOpen}
        onClose={() => setIsYoutubePickerOpen(false)}
        selectedIds={editedCiv.videos || []}
        onSelect={(videoIds) => {
          setEditedCiv({
            ...editedCiv,
            videos: videoIds
          });
        }}
      />

      <Toast
        isVisible={toast.isVisible}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ ...toast, isVisible: false })}
      />
    </div>
  );
}
