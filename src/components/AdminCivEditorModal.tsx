import { useState } from 'react';
import { Download, Save, X, Loader2, Play, Map } from 'lucide-react';
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

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-white/5 font-mono text-xs">
            <div className="space-y-2">
              <label className="block font-bold text-gray-400 flex items-center gap-2">
                <Map size={14} className="text-yellow-500" /> Build Orders
              </label>
              <textarea 
                value={JSON.stringify(editedCiv.buildOrders || [], null, 2)}
                onChange={e => { try { setEditedCiv({...editedCiv, buildOrders: JSON.parse(e.target.value)}); } catch (err) {} }}
                rows={8}
                className="w-full bg-black/60 border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-yellow-500/50 transition-colors resize-none"
              />
            </div>
            <div className="space-y-2">
              <label className="block font-bold text-gray-400 flex items-center gap-2">
                <span className="text-blue-500">⚔️</span> Unità Uniche
              </label>
              <textarea 
                value={JSON.stringify(editedCiv.uniqueUnits || [], null, 2)}
                onChange={e => { try { setEditedCiv({...editedCiv, uniqueUnits: JSON.parse(e.target.value)}); } catch (err) {} }}
                rows={8}
                className="w-full bg-black/60 border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-blue-500/50 transition-colors resize-none"
              />
            </div>
            <div className="space-y-2">
              <label className="block font-bold text-gray-400 flex items-center gap-2">
                <span className="text-green-500">🧬</span> Tecnologie
              </label>
              <textarea 
                value={JSON.stringify(editedCiv.technologies || [], null, 2)}
                onChange={e => { try { setEditedCiv({...editedCiv, technologies: JSON.parse(e.target.value)}); } catch (err) {} }}
                rows={8}
                className="w-full bg-black/60 border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-green-500/50 transition-colors resize-none"
              />
            </div>
            <div className="space-y-2">
              <label className="block font-bold text-gray-400 flex items-center gap-2">
                <span className="text-purple-500">🏛️</span> Landmarks
              </label>
              <textarea 
                value={JSON.stringify(editedCiv.landmarks || [], null, 2)}
                onChange={e => { try { setEditedCiv({...editedCiv, landmarks: JSON.parse(e.target.value)}); } catch (err) {} }}
                rows={8}
                className="w-full bg-black/60 border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-purple-500/50 transition-colors resize-none"
              />
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
