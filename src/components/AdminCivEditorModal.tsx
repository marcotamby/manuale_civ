import { useState } from 'react';
import { Download, Save, X, Loader2, Play, Map, Plus, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
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

  if (!isOpen) return null;

  const handleDownload = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(editedCiv, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `${civ.id}_updated.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

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
          technologies: editedCiv.technologies,
          landmarks: editedCiv.landmarks
        })
        .eq('id', civ.id);

      if (error) throw error;
      
      alert('Modifiche salvate con successo nel database!');
      onSave(editedCiv);
      onClose();
    } catch (err) {
      console.error('Error saving civilization:', err);
      alert('Errore durante il salvataggio.');
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
    newArr[index] = { ...newArr[index], [key]: value };
    
    // Convert numbers for stats or age
    if (['attack', 'armor', 'speed', 'health'].includes(key)) {
        newArr[index].stats = { ...newArr[index].stats, [key]: Number(value) };
        delete newArr[index][key];
    } else if (key === 'age') {
        newArr[index][key] = Number(value);
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
                  onChange={e => setEditedCiv({...editedCiv, name: e.target.value})}
                  className="w-full bg-black/40 border border-gray-600 rounded-lg px-4 py-2 text-white focus:border-purple-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-300 mb-1">Difficoltà</label>
                <select 
                  value={editedCiv.difficulty}
                  onChange={e => setEditedCiv({...editedCiv, difficulty: e.target.value as any})}
                  className="w-full bg-black/40 border border-gray-600 rounded-lg px-4 py-2 text-white focus:border-purple-500 transition-colors"
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
                  onChange={e => setEditedCiv({...editedCiv, shortDescription: e.target.value})}
                  rows={4}
                  className="w-full bg-black/40 border border-gray-600 rounded-lg px-4 py-2 text-white focus:border-purple-500 transition-colors resize-y"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-300 mb-1 flex items-center gap-2">
                  <Play size={16} className="text-red-500" />
                  Video IDs (YouTube)
                </label>
                <textarea 
                  value={editedCiv.videos?.join(', ') || ''}
                  onChange={e => setEditedCiv({...editedCiv, videos: e.target.value.split(',').map(v => v.trim()).filter(Boolean)})}
                  placeholder="ID1, ID2, ID3..."
                  rows={2}
                  className="w-full bg-black/40 border border-gray-600 rounded-lg px-4 py-2 text-sm text-white focus:border-purple-500 transition-colors"
                />
              </div>
            </div>

            <div className="space-y-4">
              <label className="block text-sm font-bold text-gray-300 mb-1">Bonus Passivi</label>
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
                        setEditedCiv({...editedCiv, passiveBonuses: nb});
                      }}
                      className="p-2 h-fit bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/40"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
              <button 
                onClick={() => setEditedCiv({...editedCiv, passiveBonuses: [...editedCiv.passiveBonuses, 'Nuovo Bonus...']})}
                className="w-full py-2 bg-white/5 border border-dashed border-gray-500 text-gray-400 rounded-lg hover:bg-white/10 hover:text-white transition-all text-sm font-bold mt-2"
              >
                + Aggiungi Bonus
              </button>
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
                  {(editedCiv.uniqueUnits || []).map((u, idx) => (
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

              {/* Tecnologie */}
              <div className="bg-black/30 border border-green-500/30 rounded-xl p-4">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-bold text-green-400 flex items-center gap-2"><span className="text-xl">🧬</span> Tecnologie</h4>
                  <button onClick={() => addToArray('technologies', { id: 'new-tech', name: 'Nuova Tech', age: 2, building: 'Blacksmith', description: '' })} className="text-xs bg-green-600 hover:bg-green-500 text-white px-2 py-1 rounded flex items-center gap-1">
                    <Plus size={14} /> Aggiungi
                  </button>
                </div>
                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {(editedCiv.technologies || []).map((t, idx) => (
                    <div key={idx} className="bg-black/50 border border-gray-700 rounded-lg p-3 relative group">
                      <button onClick={() => removeFromArray('technologies', idx)} className="absolute top-2 right-2 text-gray-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trash2 size={16} />
                      </button>
                      <div className="grid grid-cols-12 gap-2 mb-2">
                        <input type="text" value={t.name} onChange={e => updateArrayField('technologies', idx, 'name', e.target.value)} placeholder="Nome Tecnologia" className="col-span-6 bg-gray-800 text-white text-sm rounded px-2 py-1 border border-gray-600" />
                        <input type="text" value={t.building} onChange={e => updateArrayField('technologies', idx, 'building', e.target.value)} placeholder="Edificio" className="col-span-4 bg-gray-800 text-white text-sm rounded px-2 py-1 border border-gray-600" />
                        <input type="number" min="1" max="4" value={t.age} onChange={e => updateArrayField('technologies', idx, 'age', e.target.value)} title="Age" className="col-span-2 bg-gray-800 text-white text-sm rounded px-1 py-1 text-center border border-gray-600" />
                      </div>
                      <textarea value={t.description} onChange={e => updateArrayField('technologies', idx, 'description', e.target.value)} placeholder="Descrizione" rows={2} className="bg-gray-800 text-white text-xs rounded px-2 py-1 border border-gray-600 w-full resize-none" />
                    </div>
                  ))}
                  {(!editedCiv.technologies || editedCiv.technologies.length === 0) && <p className="text-gray-500 text-sm italic text-center py-4">Nessuna tecnologia</p>}
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
                  {(editedCiv.landmarks || []).map((l, idx) => (
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
                  <h4 className="font-bold text-yellow-400 flex items-center gap-2"><Map size={18}/> Build Orders</h4>
                  <button onClick={() => addToArray('buildOrders', { id: 'new-buildorder', title: 'Nuovo Build Order', difficulty: 'Medium', description: '', steps: [] })} className="text-xs bg-yellow-600 hover:bg-yellow-500 text-white px-2 py-1 rounded flex items-center gap-1">
                    <Plus size={14} /> Aggiungi
                  </button>
                </div>
                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {(editedCiv.buildOrders || []).map((bo, idx) => (
                    <div key={idx} className="bg-black/50 border border-gray-700 rounded-lg p-3 relative group">
                      <button onClick={() => removeFromArray('buildOrders', idx)} className="absolute top-2 right-2 text-gray-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                        <Trash2 size={16} />
                      </button>
                      <div className="grid grid-cols-3 gap-2 mb-2 pr-6">
                        <input type="text" value={bo.title} onChange={e => updateArrayField('buildOrders', idx, 'title', e.target.value)} placeholder="Titolo" className="col-span-2 bg-gray-800 text-white text-sm rounded px-2 py-1 border border-gray-600" />
                        <select value={bo.difficulty} onChange={e => updateArrayField('buildOrders', idx, 'difficulty', e.target.value)} className="col-span-1 bg-gray-800 text-white text-xs rounded px-1 py-1 border border-gray-600">
                          <option value="Easy">Easy</option><option value="Medium">Medium</option><option value="Advanced">Advanced</option>
                        </select>
                      </div>
                      <textarea value={bo.description} onChange={e => updateArrayField('buildOrders', idx, 'description', e.target.value)} placeholder="Descrizione Strategia" rows={2} className="bg-gray-800 text-white text-xs rounded px-2 py-1 border border-gray-600 w-full resize-none mb-2" />
                      
                      {/* Steps (Simplified handling via raw text to keep it usable without infinite nesting) */}
                      <label className="text-xs text-gray-400 font-bold block mb-1">Passaggi (Formato Testo: Minuto - Azione, uno per riga)</label>
                      <textarea 
                        value={bo.steps.map(s => `${s.time || ''} - ${s.action}`).join('\n')}
                        onChange={e => {
                          const rawLines = e.target.value.split('\n');
                          const mappedSteps = rawLines.map(line => {
                            const [timePart, ...actionParts] = line.split('-');
                            return { time: timePart.trim(), action: actionParts.join('-').trim() || timePart.trim() }; // basic parsing
                          }).filter(s => s.action);
                          updateArrayField('buildOrders', idx, 'steps', mappedSteps);
                        }}
                        placeholder="0:00 - Coda villici&#10;0:30 - Costruisci Casa" 
                        rows={4} 
                        className="bg-gray-900 text-yellow-300 font-mono text-xs rounded px-2 py-1 border border-gray-600 w-full resize-y" 
                      />
                    </div>
                  ))}
                  {(!editedCiv.buildOrders || editedCiv.buildOrders.length === 0) && <p className="text-gray-500 text-sm italic text-center py-4">Nessun build order</p>}
                </div>
              </div>

            </div>
          </div>
        </div>

        <div className="p-6 border-t border-purple-500/20 bg-black/40 flex justify-between items-center gap-4">
          <button 
            onClick={handleDownload}
            className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold flex items-center gap-2 transition-all border border-white/5"
          >
            <Download size={18} />
            Scarica JSON
          </button>

          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="px-8 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-purple-600/30 transition-all disabled:opacity-50"
          >
            {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            {isSaving ? 'Salvataggio...' : 'Salva nel Database'}
          </button>
        </div>
      </div>
    </div>
  );
}
