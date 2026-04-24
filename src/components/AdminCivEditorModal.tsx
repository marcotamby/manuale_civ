import { useState, useEffect, useRef } from 'react';
import { Save, X, Loader2, Play, Map, Plus, Trash2, CheckCircle, Clock, Zap, ChevronUp, ChevronDown, Info, Cog, Edit, AlertTriangle, Upload, MousePointer2, MoveVertical } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { YouTubePickerModal } from './YouTubePickerModal';
import { Toast } from './Toast';
import type { ToastType } from './Toast';
import { useCivData } from './CivContext';
import { useAuth } from './AuthContext';
import { usePresence } from './PresenceContext';
import type { Civilization } from '../data/aoe4Data';

interface AdminCivEditorModalProps {
  civ: Civilization;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedCiv: Civilization, updatedGlobalUnits: any[]) => void;
  initialSection?: string;
  initialId?: string;
}

export function AdminCivEditorModal({ civ, isOpen, onClose, onSave, initialSection, initialId }: AdminCivEditorModalProps) {
  const { globalUnits } = useCivData();
  const { user } = useAuth();
  const { updateActivity, activeAdmins } = usePresence();
  const [editedCiv, setEditedCiv] = useState<Civilization>(civ);
  const [editedGlobalUnits, setEditedGlobalUnits] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaveSuccess, setIsSaveSuccess] = useState(false);
  const [isYoutubePickerOpen, setIsYoutubePickerOpen] = useState(false);
  const [toast, setToast] = useState<{ isVisible: boolean; message: string; type: ToastType }>({
    isVisible: false,
    message: '',
    type: 'success'
  });
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);


  // Refs for scrolling
  const sectionRefs = {
    bonuses: useRef<HTMLDivElement>(null),
    strengths: useRef<HTMLDivElement>(null),
    weaknesses: useRef<HTMLDivElement>(null),
    units: useRef<HTMLDivElement>(null),
    landmarks: useRef<HTMLDivElement>(null),
    buildorders: useRef<HTMLDivElement>(null),
    global: useRef<HTMLDivElement>(null)
  };

  // Sync state with props when modal opens or civ changes
  useEffect(() => {
    if (isOpen) {
      updateActivity({ 
        type: 'editing', 
        civId: civ.id, 
        section: initialSection || 'all' 
      });

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
      setEditedGlobalUnits(globalUnits);

      // Handle initial section scrolling
      if (initialSection) {
        setTimeout(() => {
          const ref = (sectionRefs as any)[initialSection.toLowerCase()];
          if (ref?.current) {
            ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            // If we have an ID (e.g. for a specific Build Order), try to find and highlight it
            if (initialId && initialSection === 'buildorders') {
               setTimeout(() => {
                 const boElement = document.getElementById(`admin-bo-${initialId}`);
                 if (boElement) {
                   boElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                   boElement.classList.add('ring-2', 'ring-yellow-500', 'bg-yellow-500/20');
                   setTimeout(() => boElement.classList.remove('ring-2', 'ring-yellow-500', 'bg-yellow-500/20'), 3000);
                 }
               }, 500);
            } else {
              // Highlight the section briefly
              ref.current.classList.add('ring-2', 'ring-yellow-500', 'bg-yellow-500/10');
              setTimeout(() => {
                ref.current?.classList.remove('ring-2', 'ring-yellow-500', 'bg-yellow-500/10');
              }, 2000);
            }
          }
        }, 300);
      }
    } else {
      // Small delay to avoid race conditions with CivView's viewing state
      // When the modal closes, we want to go back to "viewing" (which is handled by CivView's effect if still on page)
      // or "idle" if the view is gone.
    }
  }, [civ, isOpen, globalUnits, initialSection]);

  // Handle closing Presence state
  useEffect(() => {
    if (!isOpen) {
      // Explicitly reset to idle when modal closes
      // The CivView's useEffect will catch up if we are still there
      updateActivity({ type: 'idle' });
    }
  }, [isOpen]);

  const otherAdminsEditing = activeAdmins ? Object.values(activeAdmins).filter(
    a => a?.user?.email && user?.email && 
    a.user.email.toLowerCase() !== user.email.toLowerCase() && 
    a.activity?.type === 'editing' && 
    a.activity?.civId === civ.id
  ) : [];

  const getYoutubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  if (!isOpen) return null;

  const handleSave = async () => {
    try {
      setIsSaving(true);

      const { error: civError } = await supabase
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
          strengths: editedCiv.strengths?.filter((s: string) => s.trim() !== '') || [],
          weaknesses: editedCiv.weaknesses?.filter((s: string) => s.trim() !== '') || []
        })
        .eq('id', civ.id);

      if (civError) throw civError;

      // Save Global Units changes
      for (const gu of editedGlobalUnits) {
        const { error: guError } = await supabase
          .from('global_units')
          .update({
            name: gu.name,
            type: gu.type,
            age: gu.age,
            stats: gu.stats,
            strengths: gu.strengths,
            weaknesses: gu.weaknesses,
            description: gu.description,
            image_id: gu.imageId
          })
          .eq('id', gu.id);
        if (guError) throw guError;
      }

      setIsSaveSuccess(true);

      onSave({
        ...editedCiv,
        strengths: editedCiv.strengths?.filter((s: string) => s.trim() !== '') || [],
        weaknesses: editedCiv.weaknesses?.filter((s: string) => s.trim() !== '') || []
      }, editedGlobalUnits);

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
    setEditedCiv(prev => {
      const newBonuses = [...prev.passiveBonuses];
      newBonuses[index] = value;
      return { ...prev, passiveBonuses: newBonuses };
    });
  };
  const updateArrayField = <T extends keyof Civilization>(field: T, index: number, key: string | { [key: string]: any }, value?: any) => {
    setEditedCiv(prev => {
      const newArr = [...(prev[field] as any[])];
      
      if (typeof key === 'object') {
        newArr[index] = { ...newArr[index], ...key };
      } else {
        if (['attack', 'armor', 'speed', 'health'].includes(key)) {
          newArr[index] = {
            ...newArr[index],
            stats: { ...(newArr[index].stats || {}), [key]: Number(value) }
          };
        } else {
          newArr[index] = { ...newArr[index], [key]: key === 'age' ? Number(value) : value };
        }
      }

      return { ...prev, [field]: newArr };
    });
  };


  const removeFromArray = <T extends keyof Civilization>(field: T, index: number) => {
    const newArr = [...(editedCiv[field] as any[])];
    newArr.splice(index, 1);
    setEditedCiv({ ...editedCiv, [field]: newArr });
  };

  const addToArray = <T extends keyof Civilization>(field: T, item: any) => {
    setEditedCiv({ ...editedCiv, [field]: [...(editedCiv[field] as any[] || []), item] });
  };

  const updateGlobalUnit = (index: number, key: string, value: any) => {
    const newArr = [...editedGlobalUnits];
    if (['attack', 'armor', 'speed', 'health'].includes(key)) {
      newArr[index] = {
        ...newArr[index],
        stats: { ...(newArr[index].stats || {}), [key]: Number(value) }
      };
    } else if (key === 'strengths' || key === 'weaknesses') {
      newArr[index] = { ...newArr[index], [key]: value.split('\n').filter((s: string) => s.trim() !== '') };
    } else {
      newArr[index] = { ...newArr[index], [key]: key === 'age' ? Number(value) : value };
    }
    setEditedGlobalUnits(newArr);
  };

  return (
    <div className="fixed inset-0 z-[5000] flex items-center justify-center p-2 md:p-4 bg-black/80 backdrop-blur-md shadow-2xl overflow-y-auto">
      <div className="bg-[#1a1c23] border border-purple-500/50 rounded-2xl w-full max-w-5xl h-fit max-h-none md:max-h-[90vh] my-auto overflow-hidden shadow-[0_0_50px_rgba(168,85,247,0.2)] flex flex-col animate-in fade-in zoom-in duration-200">

        <div className="p-6 border-b border-purple-500/20 flex justify-between items-center bg-purple-500/5">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <span className="text-yellow-500">
                {initialSection ? `Modifica ${initialSection === 'global' ? 'Unità' : initialSection.charAt(0).toUpperCase() + initialSection.slice(1)}:` : 'Admin Editor:'}
              </span> {civ.name}
            </h2>
            <p className="text-xs text-gray-400 mt-1">Le modifiche apportate qui verranno salvate istantaneamente nel database (live per tutti).</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors p-2 bg-white/5 rounded-lg hover:bg-white/10">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {otherAdminsEditing.length > 0 && (
            <div className="bg-red-500/20 border border-red-500/50 p-4 rounded-xl flex items-start gap-4 animate-pulse">
              <AlertTriangle className="text-red-500 shrink-0" size={24} />
              <div>
                <h4 className="text-red-400 font-bold text-sm">ATTENZIONE: Altri admin stanno modificando questa civiltà</h4>
                <div className="mt-2 space-y-1">
                  {otherAdminsEditing.map(a => {
                    if (!a?.user?.email || !a?.user?.name) return null;
                    return (
                      <div key={a.user.email} className="flex items-center gap-2 text-xs text-red-300">
                        <div className="w-4 h-4 rounded-full bg-red-600 flex items-center justify-center text-[8px] font-bold text-white">
                          {a.user.name.charAt(0)}
                        </div>
                        <span className="font-semibold">{a.user.name}</span>
                        <span className="opacity-70">sta modificando la sezione: <b className="text-red-200">{a.activity?.section === 'all' ? 'Tutte' : a.activity?.section}</b></span>
                      </div>
                    );
                  })}
                </div>
                <p className="text-[10px] text-red-400/80 mt-2 italic">Rischio di sovrascrittura dati: coordina le modifiche per evitare perdite di informazioni.</p>
              </div>
            </div>
          )}

          {(!initialSection || initialSection === 'bonuses') && (
            <div ref={sectionRefs.bonuses} className="bg-black/30 border border-yellow-500/20 rounded-xl p-5 space-y-4">
              <label className="block text-sm font-bold text-yellow-500 uppercase tracking-widest mb-1 flex items-center gap-2">
                <Zap size={16} /> Bonus
              </label>
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {editedCiv.passiveBonuses.map((bonus: string, idx: number) => (
                  <div key={idx} className="flex gap-2">
                    <textarea
                      value={bonus}
                      onChange={e => handleBonusChange(idx, e.target.value)}
                      rows={2}
                      placeholder="Nuovo Bonus..."
                      className="w-full bg-black/40 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:border-yellow-500 transition-colors"
                    />
                    <button
                      onClick={() => {
                        const nb = [...editedCiv.passiveBonuses];
                        nb.splice(idx, 1);
                        setEditedCiv({ ...editedCiv, passiveBonuses: nb });
                      }}
                      className="p-2 h-fit bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/40 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setEditedCiv({ ...editedCiv, passiveBonuses: [...editedCiv.passiveBonuses, ''] })}
                className="w-full py-2 bg-yellow-500/10 border border-dashed border-yellow-500/30 text-yellow-500/70 rounded-lg hover:bg-yellow-500/20 hover:text-yellow-500 transition-all text-xs font-bold mt-2"
              >
                + Aggiungi Bonus
              </button>
            </div>
          )}

          {(!initialSection || initialSection === 'strengths') && (
            <div ref={sectionRefs.strengths} className="bg-black/30 border border-green-500/20 rounded-xl p-5">
              <label className="block text-sm font-bold text-green-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                <ChevronUp size={16} /> Punti di Forza
              </label>
              <textarea
                value={editedCiv.strengths?.join('\n') || ''}
                onChange={e => {
                  const values = e.target.value.split('\n');
                  setEditedCiv({ ...editedCiv, strengths: values });
                }}
                rows={4}
                placeholder="Inserisci un punto di forza per riga..."
                className="w-full bg-black/40 border border-gray-600 rounded-lg px-4 py-3 text-white focus:border-green-500 transition-colors resize-y text-sm"
              />
            </div>
          )}

          {(!initialSection || initialSection === 'weaknesses') && (
            <div ref={sectionRefs.weaknesses} className="bg-black/30 border border-red-500/20 rounded-xl p-5">
              <label className="block text-sm font-bold text-red-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                <ChevronDown size={16} /> Punti Deboli
              </label>
              <textarea
                value={editedCiv.weaknesses?.join('\n') || ''}
                onChange={e => {
                  const values = e.target.value.split('\n');
                  setEditedCiv({ ...editedCiv, weaknesses: values });
                }}
                rows={4}
                placeholder="Inserisci un punto debole per riga..."
                className="w-full bg-black/40 border border-gray-600 rounded-lg px-4 py-3 text-white focus:border-red-500 transition-colors resize-y text-sm"
              />
            </div>
          )}

          {!initialSection && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-white/5">
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 flex items-center gap-2">
                    <Info size={12} /> Nome Civiltà
                  </label>
                  <input
                    type="text"
                    value={editedCiv.name}
                    onChange={e => setEditedCiv({ ...editedCiv, name: e.target.value })}
                    className="w-full bg-black/40 border border-gray-600 rounded-lg px-4 py-2 text-white focus:border-purple-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 flex items-center gap-2">
                    <Cog size={12} /> Difficoltà
                  </label>
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
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 flex items-center gap-2">
                    <Info size={12} /> Descrizione Breve
                  </label>
                  <textarea
                    value={editedCiv.shortDescription}
                    onChange={e => setEditedCiv({ ...editedCiv, shortDescription: e.target.value })}
                    rows={4}
                    className="w-full bg-black/40 border border-gray-600 rounded-lg px-4 py-2 text-white focus:border-purple-500 transition-colors resize-y text-sm"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-end mb-1.5">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 flex items-center gap-2">
                      <Play size={12} className="text-red-500" /> YouTube
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsYoutubePickerOpen(true)}
                      className="text-[9px] bg-red-600/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded flex items-center gap-1 hover:bg-red-600/40 transition-all font-bold uppercase tracking-tighter"
                    >
                      Sfoglia Canale
                    </button>
                  </div>
                  <textarea
                    value={editedCiv.videos?.join(', ') || ''}
                    onChange={e => {
                      const rawValues = e.target.value.split(',').map(v => v.trim()).filter(Boolean);
                      const parsedIds = rawValues.map(val => {
                        if (val.includes('youtube.com/watch?v=')) {
                          return val.split('v=')[1]?.split('&')[0] || val;
                        } else if (val.includes('youtu.be/')) {
                          return val.split('youtu.be/')[1]?.split('?')[0] || val;
                        }
                        return val;
                      });
                      setEditedCiv({ ...editedCiv, videos: parsedIds });
                    }}
                    placeholder="ID video separati da virgola..."
                    rows={2}
                    className="w-full bg-black/40 border border-gray-600 rounded-lg px-4 py-2 text-xs text-white focus:border-red-500 transition-colors"
                  />
                </div>
              </div>
              <div className="bg-yellow-500/5 rounded-xl border border-yellow-500/10 p-5 flex flex-col items-center justify-center text-center">
                 <Edit size={32} className="text-yellow-500/30 mb-3" />
                 <p className="text-xs text-gray-400 max-w-[200px]">Utilizza i tasti di modifica sulle singole unità per un editing più preciso e focalizzato.</p>
              </div>
            </div>
          )}

          <div className="pt-6 border-t border-white/10">
            {(!initialSection || ['units', 'landmarks', 'buildorders', 'global'].includes(initialSection.toLowerCase())) && (
               <h3 className="text-sm font-black text-gray-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
                 Editor Strutturato
                 <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent"></div>
               </h3>
            )}

            <div className={`grid grid-cols-1 ${!initialSection ? 'lg:grid-cols-2' : ''} gap-8`}>

              {/* Unità Uniche */}
              <div ref={sectionRefs.units} className="bg-black/30 border border-blue-500/30 rounded-xl p-4">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-bold text-blue-400 flex items-center gap-2"><span className="text-xl">⚔️</span> Unità Uniche</h4>
                  <button onClick={() => addToArray('uniqueUnits', { id: `unit-${Date.now()}`, name: '', type: 'Infantry', age: 2, stats: { attack: 0, armor: 0, speed: 1, health: 100 }, strengths: [], weaknesses: [], description: '' })} className="text-xs bg-blue-600 hover:bg-blue-500 text-white px-2 py-1 rounded flex items-center gap-1">
                    <Plus size={14} /> Aggiungi
                  </button>
                </div>
                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {(editedCiv.uniqueUnits || []).map((u: any, idx: number) => (
                    <div key={idx} className={`bg-black/50 border border-gray-700 rounded-lg p-3 relative group transition-all duration-500 ${initialId === u.id ? 'ring-2 ring-blue-500 bg-blue-500/10' : ''}`}>
                      <button onClick={() => removeFromArray('uniqueUnits', idx)} className="absolute top-2 right-2 text-gray-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trash2 size={16} />
                      </button>
                      <div className="grid grid-cols-2 gap-2 mb-2">
                        <input type="text" value={u.name} onChange={e => updateArrayField('uniqueUnits', idx, 'name', e.target.value)} placeholder="Nuova Unità..." className="bg-gray-800 text-white text-sm rounded px-2 py-1 border border-gray-600 w-full" />
                        <input type="text" value={u.imageId || ''} onChange={e => updateArrayField('uniqueUnits', idx, 'imageId', e.target.value)} placeholder="Image URL o ID (es: archer-2)" className="bg-gray-800 text-blue-300 text-sm rounded px-2 py-1 border border-gray-600 w-full" />
                      </div>
                      <div className="grid grid-cols-2 gap-2 mb-2">
                        <select value={u.type} onChange={e => updateArrayField('uniqueUnits', idx, 'type', e.target.value)} className="bg-gray-800 text-white text-sm rounded px-2 py-1 border border-gray-600 w-full">
                          <option value="Infantry">Infantry</option><option value="Cavalry">Cavalry</option><option value="Ranged">Ranged</option><option value="Siege">Siege</option><option value="Religious">Religious</option><option value="Worker">Worker</option>
                        </select>
                        <div className="grid grid-cols-5 gap-1">
                          <input type="number" min="1" max="4" value={u.age} onChange={e => updateArrayField('uniqueUnits', idx, 'age', e.target.value)} title="Age" className="bg-gray-800 text-white text-xs rounded px-1 py-1 text-center border border-gray-600" />
                          <input type="number" value={u.stats?.attack || 0} onChange={e => updateArrayField('uniqueUnits', idx, 'attack', e.target.value)} title="Attack" className="bg-gray-800 text-red-300 text-xs rounded px-1 py-1 text-center border border-gray-600" />
                          <input type="number" value={u.stats?.armor || 0} onChange={e => updateArrayField('uniqueUnits', idx, 'armor', e.target.value)} title="Armor" className="bg-gray-800 text-gray-300 text-xs rounded px-1 py-1 text-center border border-gray-600" />
                          <input type="number" value={u.stats?.health || 0} onChange={e => updateArrayField('uniqueUnits', idx, 'health', e.target.value)} title="Health" className="bg-gray-800 text-green-300 text-xs rounded px-1 py-1 text-center border border-gray-600" />
                          <input type="number" step="0.1" value={u.stats?.speed || 0} onChange={e => updateArrayField('uniqueUnits', idx, 'speed', e.target.value)} title="Speed" className="bg-gray-800 text-blue-300 text-xs rounded px-1 py-1 text-center border border-gray-600" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mb-2">
                        <textarea value={u.strengths?.join('\n') || ''} onChange={e => updateArrayField('uniqueUnits', idx, 'strengths', e.target.value.split('\n'))} placeholder="Forti contro (uno per riga)" rows={2} className="bg-gray-800 text-green-300 text-[10px] rounded px-2 py-1 border border-gray-600 w-full resize-none" />
                        <textarea value={u.weaknesses?.join('\n') || ''} onChange={e => updateArrayField('uniqueUnits', idx, 'weaknesses', e.target.value.split('\n'))} placeholder="Deboli contro (uno per riga)" rows={2} className="bg-gray-800 text-red-300 text-[10px] rounded px-2 py-1 border border-gray-600 w-full resize-none" />
                      </div>
                      <textarea value={u.description} onChange={e => updateArrayField('uniqueUnits', idx, 'description', e.target.value)} placeholder="Descrizione" rows={2} className="bg-gray-800 text-white text-xs rounded px-2 py-1 border border-gray-600 w-full resize-none" />
                    </div>
                  ))}
                  {(!editedCiv.uniqueUnits || editedCiv.uniqueUnits.length === 0) && <p className="text-gray-500 text-sm italic text-center py-4">Nessuna unità unica</p>}
                </div>
              </div>


              {/* Landmarks */}
              <div ref={sectionRefs.landmarks} className="bg-black/30 border border-purple-500/30 rounded-xl p-4">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-bold text-purple-400 flex items-center gap-2"><span className="text-xl">🏛️</span> Landmarks</h4>
                  <button onClick={() => addToArray('landmarks', { id: `landmark-${Date.now()}`, name: '', age: 2, type: 'Economic', description: '' })} className="text-xs bg-purple-600 hover:bg-purple-500 text-white px-2 py-1 rounded flex items-center gap-1">
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
                        <input type="text" value={l.name} onChange={e => updateArrayField('landmarks', idx, 'name', e.target.value)} placeholder="Nuovo Landmark..." className="col-span-5 bg-gray-800 text-white text-sm rounded px-2 py-1 border border-gray-600" />
                        <input type="text" value={l.imageId || ''} onChange={e => updateArrayField('landmarks', idx, 'imageId', e.target.value)} placeholder="Image ID" className="col-span-3 bg-gray-800 text-blue-300 text-xs rounded px-2 py-1 border border-gray-600" />
                        <select value={l.type} onChange={e => updateArrayField('landmarks', idx, 'type', e.target.value)} className="col-span-3 bg-gray-800 text-white text-xs rounded px-1 py-1 border border-gray-600">
                          <option value="Military">Military</option><option value="Economic">Economic</option><option value="Defensive">Defensive</option><option value="Religious">Religious</option><option value="Technology">Technology</option>
                        </select>
                        <input type="number" min="1" max="4" value={l.age} onChange={e => updateArrayField('landmarks', idx, 'age', e.target.value)} title="Age" className="col-span-1 bg-gray-800 text-white text-sm rounded px-1 py-1 text-center border border-gray-600" />
                      </div>
                      <textarea value={l.description} onChange={e => updateArrayField('landmarks', idx, 'description', e.target.value)} placeholder="Descrizione" rows={2} className="bg-gray-800 text-white text-xs rounded px-2 py-1 border border-gray-600 w-full resize-none" />
                    </div>
                  ))}
                  {(!editedCiv.landmarks || editedCiv.landmarks.length === 0) && <p className="text-gray-500 text-sm italic text-center py-4">Nessun landmark</p>}
                </div>
                {/* Build Orders */}
              <div ref={sectionRefs.buildorders} className="bg-black/30 border border-yellow-500/30 rounded-xl p-4">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-bold text-yellow-400 flex items-center gap-2"><Map size={18} /> Build Orders</h4>
                  <button 
                    onClick={() => (window as any).openBOEditor?.(editedCiv.id, null)} 
                    className="text-xs bg-yellow-600 hover:bg-yellow-500 text-white px-3 py-1.5 rounded-lg flex items-center gap-1 font-bold shadow-lg shadow-yellow-600/20 transition-all"
                  >
                    <Plus size={14} /> Aggiungi Nuovo
                  </button>
                </div>
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {(editedCiv.build_orders || editedCiv.buildOrders || []).map((bo: any, idx: number) => (
                    <div key={idx} id={`admin-bo-${bo.id}`} className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-center justify-between group hover:border-yellow-500/30 transition-all">
                      <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded-lg bg-yellow-500/10 flex items-center justify-center border border-yellow-500/20">
                            <Zap size={14} className="text-yellow-500" />
                         </div>
                         <div>
                            <span className="text-sm font-bold text-white block leading-tight">{bo.title || 'Senza Titolo'}</span>
                            <span className="text-[10px] text-gray-500 uppercase font-black tracking-widest">{bo.difficulty === 1 ? 'Facile' : bo.difficulty === 3 ? 'Difficile' : 'Medio'}</span>
                         </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => (window as any).openBOEditor?.(editedCiv.id, idx)}
                          className="p-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg border border-blue-500/30 transition-all"
                          title="Modifica"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm('Sei sicuro di voler eliminare questo Build Order?')) {
                              const newBOs = [...(editedCiv.build_orders || editedCiv.buildOrders || [])];
                              newBOs.splice(idx, 1);
                              setEditedCiv({ ...editedCiv, build_orders: newBOs });
                            }
                          }}
                          className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg border border-red-500/30 transition-all"
                          title="Elimina"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                  {(!editedCiv.build_orders || (editedCiv.build_orders || []).length === 0) && (editedCiv.buildOrders?.length === 0 || !editedCiv.buildOrders) && (
                    <div className="text-center py-8 border-2 border-dashed border-white/5 rounded-xl">
                       <Map size={24} className="text-gray-700 mx-auto mb-2 opacity-20" />
                       <p className="text-gray-600 text-[10px] font-bold uppercase tracking-widest">Nessun Build Order presente</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
              </div>

            </div>

            {/* Global Units section added at the end of Structured Data */}
            <div ref={sectionRefs.global} className="mt-8 pt-6 border-t border-yellow-500/20">
              <h4 className="font-bold text-gray-400 flex items-center gap-2 mb-4"><span className="text-xl">🌍</span> Unità Comuni (Comuni a tutte le Civ)</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar p-1">
                {editedGlobalUnits.map((gu: any, idx: number) => (
                  <div key={gu.id} className={`bg-black/40 border border-gray-700/50 rounded-xl p-4 transition-all duration-500 ${initialId === gu.id ? 'ring-2 ring-yellow-500 bg-yellow-500/10' : ''}`}>
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-sm font-bold text-white">{gu.name}</span>
                      <span className="text-[10px] text-gray-500 uppercase">{gu.id}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mb-2">
                       <input type="text" value={gu.imageId || ''} onChange={e => updateGlobalUnit(idx, 'imageId', e.target.value)} placeholder="Image URL o ID" className="bg-gray-800 text-blue-300 text-[10px] rounded px-2 py-1 border border-gray-600 w-full" />
                       <div className="grid grid-cols-5 gap-1">
                          <input type="number" min="1" max="4" value={gu.age} onChange={e => updateGlobalUnit(idx, 'age', e.target.value)} title="Age" className="bg-gray-800 text-white text-xs rounded px-1 py-1 text-center border border-gray-600" />
                          <input type="number" value={gu.stats?.attack || 0} onChange={e => updateGlobalUnit(idx, 'attack', e.target.value)} title="Attack" className="bg-gray-800 text-red-300 text-xs rounded px-1 py-1 text-center border border-gray-600" />
                          <input type="number" value={gu.stats?.armor || 0} onChange={e => updateGlobalUnit(idx, 'armor', e.target.value)} title="Armor" className="bg-gray-800 text-gray-300 text-xs rounded px-1 py-1 text-center border border-gray-600" />
                          <input type="number" value={gu.stats?.health || 0} onChange={e => updateGlobalUnit(idx, 'health', e.target.value)} title="Health" className="bg-gray-800 text-green-300 text-xs rounded px-1 py-1 text-center border border-gray-600" />
                          <input type="number" step="0.1" value={gu.stats?.speed || 0} onChange={e => updateGlobalUnit(idx, 'speed', e.target.value)} title="Speed" className="bg-gray-800 text-blue-300 text-xs rounded px-1 py-1 text-center border border-gray-600" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <textarea value={gu.strengths?.join('\n') || ''} onChange={e => updateGlobalUnit(idx, 'strengths', e.target.value)} placeholder="Forti contro" rows={2} className="bg-gray-800 text-green-300 text-[10px] rounded px-2 py-1 border border-gray-600 w-full resize-none" />
                      <textarea value={gu.weaknesses?.join('\n') || ''} onChange={e => updateGlobalUnit(idx, 'weaknesses', e.target.value)} placeholder="Deboli contro" rows={2} className="bg-gray-800 text-red-300 text-[10px] rounded px-2 py-1 border border-gray-600 w-full resize-none" />
                    </div>
                    <textarea value={gu.description} onChange={e => updateGlobalUnit(idx, 'description', e.target.value)} placeholder="Descrizione" rows={2} className="bg-gray-800 text-white text-[10px] rounded px-2 py-1 border border-gray-600 w-full resize-none" />
                  </div>
                ))}
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
