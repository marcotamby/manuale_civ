import { useState, useEffect } from 'react';
import { Save, X, Loader2, Play, Map, Plus, Clock, Zap, Upload, MousePointer2, MoveVertical, Shield, User, Star, Type, Youtube, CheckCircle2, ChevronUp, ChevronDown } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './AuthContext';
import { usePresence } from './PresenceContext';
import type { BuildOrder, Civilization } from '../data/aoe4Data';
import { toast } from 'react-hot-toast';

interface AdminBOEditorModalProps {
  civ: Civilization;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedBOs: BuildOrder[]) => void;
  boIndex: number | null; // null for new, number for edit
}

export function AdminBOEditorModal({ civ, isOpen, onClose, onSave, boIndex }: AdminBOEditorModalProps) {
  const { user } = useAuth();
  const { updateActivity } = usePresence();
  const [editedBO, setEditedBO] = useState<BuildOrder>({
    id: `bo-${Date.now()}`,
    title: '',
    difficulty: 2,
    description: '',
    steps: [],
    banner_url: '',
    banner_position: 50,
    author_nickname: user?.nickname || '',
    author_rank: user?.rank || '',
    source: '',
    map: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragState, setDragState] = useState<{ startY: number; startPos: number } | null>(null);

  // Sync state when opening
  useEffect(() => {
    if (isOpen) {
      if (boIndex !== null && civ.buildOrders?.[boIndex]) {
        setEditedBO({ ...civ.buildOrders[boIndex] });
      } else {
        setEditedBO({
          id: `bo-${Date.now()}`,
          title: '',
          difficulty: 2,
          description: '',
          steps: [],
          banner_url: '',
          banner_position: 50,
          author_nickname: user?.nickname || '',
          author_rank: user?.rank || '',
          source: '',
          map: ''
        });
      }
      updateActivity({ 
        type: 'editing', 
        civId: civ.id, 
        section: 'buildorders' 
      });
    }
  }, [isOpen, boIndex, civ.id]);

  // Handle Dragging logic for banner position
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragState) return;
      const deltaY = e.clientY - dragState.startY;
      const containerHeight = 120; // Approx height of preview
      const deltaPercent = (deltaY / containerHeight) * 100;
      let newPos = Math.max(0, Math.min(100, dragState.startPos - (deltaPercent * 0.5)));
      setEditedBO(prev => ({ ...prev, banner_position: Math.round(newPos) }));
    };

    const handleMouseUp = () => setDragState(null);

    if (dragState) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState]);

  const startDrag = (e: React.MouseEvent, currentPos: number) => {
    setDragState({ startY: e.clientY, startPos: currentPos });
  };

  const getYoutubeId = (url: string) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const handleSave = async () => {
    if (!editedBO.title) {
        toast.error("Il titolo è obbligatorio");
        return;
    }

    try {
      setIsSaving(true);
      const currentBOs = [...(civ.buildOrders || [])];
      
      if (boIndex !== null) {
        currentBOs[boIndex] = editedBO;
      } else {
        currentBOs.push(editedBO);
      }

      const { error } = await supabase
        .from('civilizations')
        .update({ build_orders: currentBOs })
        .eq('id', civ.id);

      if (error) throw error;

      setShowSuccess(true);
      setTimeout(() => {
        onSave(currentBOs);
        onClose();
        setShowSuccess(false);
      }, 1000);
    } catch (err: any) {
      console.error('Error saving Build Order:', err);
      toast.error(`Errore: ${err.message || 'Salvataggio fallito'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Immagine troppo grande (max 5MB)');
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${civ.id}-bo-${Date.now()}.${fileExt}`;
      const filePath = `build-orders/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('civilizations')
        .upload(filePath, file, { cacheControl: '3600', upsert: false });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('civilizations').getPublicUrl(filePath);
      setEditedBO(prev => ({ ...prev, banner_url: publicUrl }));
      toast.success('Immagine caricata!');
    } catch (error: any) {
      toast.error(`Errore caricamento: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const [draggedStepIndex, setDraggedStepIndex] = useState<number | null>(null);
  const [droppedIndex, setDroppedIndex] = useState<number | null>(null);

  const moveStep = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= editedBO.steps.length) return;
    const newSteps = [...editedBO.steps];
    const [movedStep] = newSteps.splice(fromIndex, 1);
    newSteps.splice(toIndex, 0, movedStep);
    setEditedBO(prev => ({ ...prev, steps: newSteps }));
    setDroppedIndex(toIndex);
    setTimeout(() => setDroppedIndex(null), 1000);
  };

  const handleDragStart = (index: number) => {
    setDraggedStepIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedStepIndex === null || draggedStepIndex === index) return;
    moveStep(draggedStepIndex, index);
    setDraggedStepIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedStepIndex(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[6000] flex items-center justify-center p-4 md:p-8 bg-black/90 backdrop-blur-xl animate-in fade-in duration-300">
      <div className="bg-[#111218] border border-cyan-500/30 rounded-3xl w-full max-w-6xl h-full max-h-[95vh] overflow-hidden shadow-[0_0_80px_rgba(6,182,212,0.15)] flex flex-col relative animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="px-8 py-6 border-b border-white/5 flex justify-between items-center bg-gradient-to-r from-cyan-500/10 via-transparent to-transparent">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 flex items-center justify-center border border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.2)]">
              <Zap className="text-cyan-400" size={24} fill="currentColor" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white tracking-tight uppercase">
                {boIndex !== null ? 'Modifica Build Order' : 'Nuovo Build Order'}
              </h2>
              <p className="text-xs text-cyan-400/60 font-bold uppercase tracking-widest">{civ.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2.5 bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-400 rounded-2xl transition-all border border-white/5 hover:border-red-500/30">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-10">
          
          {/* Top Section: Title & Difficulty */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8 space-y-6">
              <div>
                <label className="flex items-center gap-2 text-[10px] font-black text-cyan-400 uppercase tracking-[0.2em] mb-3">
                  <Type size={14} /> Titolo del Build Order
                </label>
                <input
                  type="text"
                  value={editedBO.title}
                  onChange={e => setEditedBO(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Esempio: 2-Town Center Fast Castle..."
                  className="w-full bg-white/5 border-2 border-white/10 rounded-2xl px-6 py-4 text-xl font-bold text-white focus:border-cyan-500/50 focus:bg-white/10 transition-all outline-none placeholder:text-white/20"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="flex items-center gap-2 text-[10px] font-black text-cyan-400 uppercase tracking-[0.2em] mb-3">
                    <Star size={14} /> Difficoltà
                  </label>
                  <div className="flex gap-2">
                    {[1, 2, 3].map(d => (
                      <button
                        key={d}
                        onClick={() => setEditedBO(prev => ({ ...prev, difficulty: d as 1 | 2 | 3 }))}
                        className={`flex-1 py-3 rounded-xl border-2 transition-all font-black text-sm uppercase tracking-tighter ${
                          editedBO.difficulty === d
                            ? 'bg-cyan-500 border-cyan-400 text-black shadow-[0_0_20px_rgba(6,182,212,0.4)]'
                            : 'bg-white/5 border-white/10 text-gray-500 hover:border-white/20'
                        }`}
                      >
                        {d === 1 ? 'Facile' : d === 2 ? 'Medio' : 'Difficile'}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="flex items-center gap-2 text-[10px] font-black text-cyan-400 uppercase tracking-[0.2em] mb-3">
                    <Map size={14} /> Mappa Consigliata
                  </label>
                  <input
                    type="text"
                    value={editedBO.map || ''}
                    onChange={e => setEditedBO(prev => ({ ...prev, map: e.target.value }))}
                    placeholder="Esempio: Tutte, Open Maps, Arabia..."
                    className="w-full bg-white/5 border-2 border-white/10 rounded-xl px-4 py-3 text-white focus:border-cyan-500/50 outline-none transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="lg:col-span-4 space-y-6">
               <div>
                  <label className="flex items-center gap-2 text-[10px] font-black text-cyan-400 uppercase tracking-[0.2em] mb-3">
                    <User size={14} /> Strategist (Autore)
                  </label>
                  <div className="bg-white/5 border-2 border-white/10 rounded-2xl p-4 space-y-4">
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={editedBO.author_nickname || ''}
                        onChange={e => setEditedBO(prev => ({ ...prev, author_nickname: e.target.value }))}
                        placeholder="Nickname..."
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:border-cyan-500/50 outline-none"
                      />
                      <input
                        type="text"
                        value={editedBO.author_rank || ''}
                        onChange={e => setEditedBO(prev => ({ ...prev, author_rank: e.target.value }))}
                        placeholder="Rank (es. Diamond III)..."
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:border-cyan-500/50 outline-none"
                      />
                    </div>
                    <button
                      onClick={() => setEditedBO(prev => ({ 
                        ...prev, 
                        author_nickname: user?.nickname || '', 
                        author_rank: user?.rank || '' 
                      }))}
                      className="w-full py-2.5 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 rounded-xl hover:bg-cyan-500/20 transition-all text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2"
                    >
                      <Shield size={14} /> Firma come {user?.nickname?.split(' ')[0] || 'Admin'}
                    </button>
                  </div>
               </div>
            </div>
          </div>

          {/* Banner Section */}
          <div className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-6">
            <label className="flex items-center gap-2 text-[10px] font-black text-yellow-500 uppercase tracking-[0.2em]">
              <Upload size={14} /> Visual Design & Banner
            </label>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              <div className="md:col-span-5 space-y-4">
                <input
                  type="text"
                  value={editedBO.banner_url || ''}
                  onChange={e => setEditedBO(prev => ({ ...prev, banner_url: e.target.value }))}
                  placeholder="URL Immagine..."
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-cyan-200 focus:border-cyan-500/50 outline-none transition-all"
                />
                <div className="relative">
                  <input
                    type="file"
                    id="bo-banner-upload"
                    className="hidden"
                    accept="image/*"
                    onChange={handleFileUpload}
                  />
                  <label
                    htmlFor="bo-banner-upload"
                    className={`flex items-center justify-center gap-3 w-full py-6 border-2 border-dashed rounded-2xl transition-all cursor-pointer ${
                      uploading ? 'bg-white/5 border-white/10 opacity-50' : 'bg-yellow-500/5 border-yellow-500/20 hover:border-yellow-500/50 hover:bg-yellow-500/10'
                    }`}
                  >
                    {uploading ? (
                      <Loader2 className="text-yellow-500 animate-spin" size={24} />
                    ) : (
                      <>
                        <Upload className="text-yellow-500" size={24} />
                        <span className="text-xs font-black text-yellow-500 uppercase tracking-widest">Carica File Locale</span>
                      </>
                    )}
                  </label>
                </div>
              </div>
              <div className="md:col-span-7">
                {editedBO.banner_url ? (
                  <div className="space-y-3">
                    <div 
                      className="relative w-full aspect-[21/6] rounded-2xl overflow-hidden border-2 border-white/20 cursor-move group shadow-2xl"
                      onMouseDown={(e) => startDrag(e, editedBO.banner_position ?? 50)}
                    >
                      <img
                        src={editedBO.banner_url}
                        alt="Preview"
                        className="w-full h-full object-cover select-none pointer-events-none"
                        style={{ objectPosition: `50% ${editedBO.banner_position ?? 50}%` }}
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 pointer-events-none">
                        <div className="bg-yellow-500 text-black px-3 py-1.5 rounded-full text-[10px] font-black uppercase flex items-center gap-2 shadow-xl">
                          <MousePointer2 size={12} /> Trascina verticalmente per inquadrare
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-bold text-gray-500 uppercase">
                      <span>Preview Inquadratura</span>
                      <button onClick={() => setEditedBO(prev => ({ ...prev, banner_url: '' }))} className="text-red-400 hover:text-red-300 transition-colors">Rimuovi Immagine</button>
                    </div>
                  </div>
                ) : (
                  <div className="w-full aspect-[21/6] bg-black/40 border-2 border-dashed border-white/5 rounded-2xl flex flex-col items-center justify-center text-gray-600">
                    <MoveVertical size={32} className="mb-2 opacity-20" />
                    <span className="text-[10px] uppercase font-bold tracking-widest opacity-40">Nessun Banner Caricato</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="flex items-center gap-2 text-[10px] font-black text-cyan-400 uppercase tracking-[0.2em] mb-3">
              <Zap size={14} /> Descrizione e Strategia Generale
            </label>
            <textarea
              value={editedBO.description}
              onChange={e => setEditedBO(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Descrivi l'obiettivo di questo build order, i punti di forza e quando usarlo..."
              className="w-full bg-white/5 border-2 border-white/10 rounded-2xl px-6 py-4 text-white focus:border-cyan-500/50 focus:bg-white/10 transition-all outline-none placeholder:text-white/20 min-h-[150px] resize-y"
            />
          </div>

          {/* YouTube Section */}
          <div className="bg-red-500/5 border border-red-500/20 rounded-3xl p-6">
             <label className="flex items-center gap-2 text-[10px] font-black text-red-500 uppercase tracking-[0.2em] mb-4">
              <Youtube size={16} /> Video Tutorial (YouTube)
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
              <div className="space-y-4">
                <input
                  type="text"
                  value={editedBO.source || ''}
                  onChange={e => setEditedBO(prev => ({ ...prev, source: e.target.value }))}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full bg-black/40 border-2 border-white/10 rounded-xl px-4 py-3 text-sm text-red-200 focus:border-red-500/50 outline-none transition-all"
                />
                <p className="text-[10px] text-gray-500 italic">Incolla l'URL completo del video per mostrare l'anteprima.</p>
              </div>
              {editedBO.source && getYoutubeId(editedBO.source) && (
                <div className="relative aspect-video rounded-2xl overflow-hidden border-2 border-red-500/20 group">
                  <img
                    src={`https://img.youtube.com/vi/${getYoutubeId(editedBO.source)}/maxresdefault.jpg`}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center shadow-xl">
                      <Play size={24} className="text-white fill-white ml-1" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Steps Section */}
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <label className="flex items-center gap-2 text-[10px] font-black text-cyan-400 uppercase tracking-[0.2em]">
                <Clock size={16} /> Passaggi Dettagliati
              </label>
              <button
                onClick={() => setEditedBO(prev => ({ ...prev, steps: [...(prev.steps || []), { time: '00:00', action: '', note: '' }] }))}
                className="bg-cyan-500 hover:bg-cyan-400 text-black px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)] flex items-center gap-2"
              >
                <Plus size={14} strokeWidth={3} /> Aggiungi Passaggio
              </button>
            </div>

            <div className="space-y-4">
              {(editedBO.steps || []).map((step, idx) => (
                <div 
                  key={idx} 
                  draggable
                  onDragStart={() => handleDragStart(idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDragEnd={handleDragEnd}
                  className={`group relative bg-white/5 border rounded-2xl p-6 transition-all animate-in slide-in-from-top-4 duration-300 flex items-start gap-4 ${
                    draggedStepIndex === idx 
                      ? 'border-dashed border-cyan-500 bg-cyan-500/10 shadow-[0_0_40px_rgba(6,182,212,0.3)] scale-[0.98]' 
                      : droppedIndex === idx
                        ? 'border-green-500 bg-green-500/5 shadow-[0_0_20px_rgba(34,197,94,0.2)] scale-[1.01]'
                        : 'border-white/10 hover:border-cyan-500/30'
                  }`}
                >
                  {draggedStepIndex === idx && (
                    <div className="absolute inset-0 bg-cyan-500/5 rounded-2xl flex items-center justify-center z-20 pointer-events-none">
                      <div className="bg-cyan-500 text-black px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl flex items-center gap-2">
                        <MoveVertical size={14} />
                        Spostamento in corso...
                      </div>
                    </div>
                  )}
                  {/* Drag Handle & Reorder Buttons */}
                  <div className="flex flex-col items-center gap-1 mt-1">
                    <button
                      onClick={() => moveStep(idx, idx - 1)}
                      disabled={idx === 0}
                      className="p-1 text-gray-600 hover:text-cyan-400 disabled:opacity-0 transition-colors"
                    >
                      <ChevronUp size={20} />
                    </button>
                    <div className="cursor-grab active:cursor-grabbing p-1 text-gray-700 hover:text-cyan-400 transition-colors">
                      <MoveVertical size={18} />
                    </div>
                    <button
                      onClick={() => moveStep(idx, idx + 1)}
                      disabled={idx === editedBO.steps.length - 1}
                      className="p-1 text-gray-600 hover:text-cyan-400 disabled:opacity-0 transition-colors"
                    >
                      <ChevronDown size={20} />
                    </button>
                  </div>

                  <div className="flex-1">
                    <button
                      onClick={() => {
                        const newSteps = [...editedBO.steps];
                        newSteps.splice(idx, 1);
                        setEditedBO(prev => ({ ...prev, steps: newSteps }));
                      }}
                      className="absolute -top-3 -right-3 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:scale-110 shadow-lg z-10"
                    >
                      <X size={16} />
                    </button>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                      <div className="md:col-span-2">
                         <label className="text-[9px] font-bold text-gray-500 uppercase mb-2 block">Tempo</label>
                         <input
                          type="text"
                          value={step.time}
                          onChange={e => {
                            const newSteps = [...editedBO.steps];
                            newSteps[idx].time = e.target.value;
                            setEditedBO(prev => ({ ...prev, steps: newSteps }));
                          }}
                          className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-2.5 text-center font-mono text-cyan-400 font-bold focus:border-cyan-500 outline-none"
                        />
                      </div>
                      <div className="md:col-span-10">
                        <label className="text-[9px] font-bold text-gray-500 uppercase mb-2 block">Azione Principalle</label>
                        <input
                          type="text"
                          value={step.action}
                          onChange={e => {
                            const newSteps = [...editedBO.steps];
                            newSteps[idx].action = e.target.value;
                            setEditedBO(prev => ({ ...prev, steps: newSteps }));
                          }}
                          placeholder="Cosa fare in questo momento..."
                          className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white font-bold focus:border-cyan-500 outline-none"
                        />
                      </div>
                      <div className="md:col-span-12">
                        <label className="text-[9px] font-bold text-gray-500 uppercase mb-2 block">Note / Dettagli</label>
                        <textarea
                          value={step.note || ''}
                          onChange={e => {
                            const newSteps = [...editedBO.steps];
                            newSteps[idx].note = e.target.value;
                            setEditedBO(prev => ({ ...prev, steps: newSteps }));
                          }}
                          placeholder="Dettagli extra (es. numero villaggi sull'oro)..."
                          className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-xs text-gray-400 italic focus:border-cyan-500 outline-none resize-y min-h-[60px]"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {(!editedBO.steps || editedBO.steps.length === 0) && (
                <div className="py-20 bg-white/[0.02] border-2 border-dashed border-white/5 rounded-3xl flex flex-col items-center justify-center text-gray-600">
                  <Clock size={48} className="mb-4 opacity-20" />
                  <p className="text-sm font-bold uppercase tracking-widest opacity-40">Nessun passaggio inserito</p>
                  <button
                    onClick={() => setEditedBO(prev => ({ ...prev, steps: [{ time: '00:00', action: '', note: '' }] }))}
                    className="mt-6 text-cyan-500 hover:text-cyan-400 font-black text-xs uppercase tracking-tighter"
                  >
                    + Clicca per aggiungere il primo step
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-6 border-t border-white/5 bg-black/40 flex justify-end items-center gap-4">
          <button
            onClick={onClose}
            className="px-6 py-3 text-sm font-bold text-gray-400 hover:text-white transition-colors"
          >
            Annulla
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || showSuccess}
            className={`px-10 py-4 ${showSuccess ? 'bg-green-600' : 'bg-gradient-to-r from-cyan-600 to-blue-600'} text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center gap-3 ${isSaving || showSuccess ? 'opacity-80 cursor-not-allowed' : ''}`}
          >
            {isSaving ? <Loader2 size={18} className="animate-spin" /> : showSuccess ? <CheckCircle2 size={18} /> : <Save size={18} />}
            {isSaving ? 'Salvataggio...' : showSuccess ? (boIndex !== null ? 'Salvato!' : 'Pubblicato!') : (boIndex !== null ? 'Salva Build Order' : 'Pubblica Build Order')}
          </button>
        </div>

      </div>
    </div>
  );
}
