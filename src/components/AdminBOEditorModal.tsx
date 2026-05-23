import { useState, useEffect, useRef } from 'react';
import { Save, X, Loader2, Map, Plus, Clock, Zap, Upload, MoveVertical, Shield, User, Star, Type, Youtube, CheckCircle2, ChevronUp, ChevronDown, AlertTriangle, BrainCircuit, FileText, PlayCircle, Play, MousePointer2 } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './AuthContext';
import { usePresence } from './PresenceContext';
import type { BuildOrder, Civilization } from '../data/aoe4Data';
import { toast } from 'react-hot-toast';
import { AOE4_MAPS as ALL_MAPS } from '../data/aoe4Maps';
import { sendNewBuildOrderWebhook } from '../utils/discordWebhook';

interface AdminBOEditorModalProps {
  civ: Civilization;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedBOs: BuildOrder[]) => void;
  boIndex: number | null; // null for new, number for edit
}

export const CATEGORY_MAPS = [
  "Qualsiasi",
  "Tutte le mappe",
  "Open Maps",
  "Closed Maps",
  "Land Maps",
  "Water Maps"
];

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
    author_id: user?.email || '',
    source: '',
    map: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragState, setDragState] = useState<{ startX: number; startY: number; startPosX: number; startPosY: number } | null>(null);
  const [isMapDropdownOpen, setIsMapDropdownOpen] = useState(false);
  const [mapSearch, setMapSearch] = useState('');
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [manualText, setManualText] = useState('');
  const [videoAddedStatus, setVideoAddedStatus] = useState(false);
  const initialDataRef = useRef<string>('');
  const mapDropdownRef = useRef<HTMLDivElement>(null);

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
          banner_position_x: 50,
          author_nickname: user?.nickname || '',
          author_rank: user?.rank || '',
          source: '',
          map: ''
        });
      }
      setTimeout(() => {
        initialDataRef.current = JSON.stringify(boIndex !== null && civ.buildOrders?.[boIndex] ? { ...civ.buildOrders[boIndex] } : {
          id: editedBO.id,
          title: '',
          difficulty: 2,
          description: '',
          steps: [],
          banner_url: '',
          banner_position: 50,
          banner_position_x: 50,
          author_nickname: user?.nickname || '',
          author_rank: user?.rank || '',
          source: '',
          map: ''
        });
      }, 0);
      updateActivity({ 
        type: 'editing', 
        civId: civ.id, 
        section: 'buildorders' 
      });
    }
  }, [isOpen, boIndex, civ.id]);

  useEffect(() => {
    let interval: any;
    if (isAnalyzing) {
      setAnalysisProgress(0);
      interval = setInterval(() => {
        setAnalysisProgress(prev => {
          if (prev >= 95) return 95;
          return prev + Math.random() * 5;
        });
      }, 800);
    } else {
      setAnalysisProgress(0);
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isAnalyzing]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragState) return;
      const deltaY = e.clientY - dragState.startY;
      const containerHeight = 120;
      const deltaPercentY = (deltaY / containerHeight) * 100;
      
      let newPosY = Math.max(0, Math.min(100, dragState.startPosY - (deltaPercentY * 0.5)));
      
      setEditedBO(prev => ({ 
        ...prev, 
        banner_position: Math.round(newPosY) 
      }));
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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (mapDropdownRef.current && !mapDropdownRef.current.contains(event.target as Node)) {
        setIsMapDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const startDrag = (e: React.MouseEvent, currentPosY: number) => {
    setDragState({ 
      startX: e.clientX, 
      startY: e.clientY, 
      startPosX: 50, 
      startPosY: currentPosY 
    });
  };

  const handleClose = () => {
    const currentData = JSON.stringify(editedBO);
    if (currentData !== initialDataRef.current) {
      setShowExitConfirm(true);
    } else {
      onClose();
    }
  };

  const getYoutubeId = (url: string) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|yewtu.be\/watch\?v=)([^#&?]*).*/;
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
      const isNew = boIndex === null;
      
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

      if (isNew) {
        try {
          await sendNewBuildOrderWebhook({
            civId: civ.id,
            civName: civ.name,
            boId: editedBO.id,
            boTitle: editedBO.title,
            difficulty: editedBO.difficulty,
            description: editedBO.description,
            map: editedBO.map,
            bannerUrl: editedBO.banner_url
          });
        } catch (webhookErr) {
          console.error('Failed to trigger Discord webhook:', webhookErr);
        }
      }

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

  const handleAIAnalysis = async (useManual: boolean = false) => {
    if (!useManual && !editedBO.source) {
      toast.error("Inserisci prima un link video guida");
      return;
    }

    if (useManual && !manualText.trim()) {
      toast.error("Incolla prima il testo della trascrizione");
      return;
    }

    const videoId = !useManual ? getYoutubeId(editedBO.source || '') : null;

    if (!useManual && !videoId) {
      toast.error("Link video non valido");
      return;
    }

    try {
      setIsAnalyzing(true);
      const response = await fetch('/api/analyze-bo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          youtubeUrl: useManual ? null : editedBO.source,
          rawText: useManual ? manualText : null,
          civName: civ.name
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || error.error || 'Errore durante l\'analisi');
      }

      const data = await response.json();
      
      setEditedBO(prev => ({
        ...prev,
        description: data.description || prev.description,
        steps: data.steps && data.steps.length > 0 ? data.steps : prev.steps
      }));

      setAnalysisProgress(100);
      toast.success("Analisi completata! Controlla i campi popolati.");
    } catch (err: any) {
      console.error('AI Analysis Error:', err);
      toast.error(`Errore IA: ${err.message}`);
    } finally {
      setTimeout(() => setIsAnalyzing(false), 500);
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

  const currentYoutubeId = getYoutubeId(editedBO.source || '');

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
          <button onClick={handleClose} className="p-2.5 bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-400 rounded-2xl transition-all border border-white/5 hover:border-red-500/30">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-10">
          
          {/* Top Section */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8 space-y-6">
              <div>
                <label className="flex items-center gap-2 text-xs font-black text-cyan-400 uppercase tracking-[0.2em] mb-3">
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
                  <label className="flex items-center gap-2 text-xs font-black text-cyan-400 uppercase tracking-[0.2em] mb-3">
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
                  <label className="flex items-center gap-2 text-xs font-black text-cyan-400 uppercase tracking-[0.2em] mb-3">
                    <Map size={14} /> Mappe Consigliate
                  </label>
                  <div className="relative" ref={mapDropdownRef}>
                    <button
                      type="button"
                      onClick={() => setIsMapDropdownOpen(!isMapDropdownOpen)}
                      className="w-full bg-white/5 border-2 border-white/10 rounded-xl px-4 py-3 text-white flex items-center justify-between group hover:bg-white/10 transition-all outline-none"
                    >
                      <span className={editedBO.map ? 'text-white font-bold' : 'text-white/20'}>
                        {editedBO.map || 'Seleziona una mappa...'}
                      </span>
                      <ChevronDown size={18} className={`text-cyan-500 transition-transform duration-300 ${isMapDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {isMapDropdownOpen && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-[#1a1c23] border border-cyan-500/30 rounded-xl overflow-hidden z-[7000] shadow-2xl flex flex-col animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="p-3 bg-black/40 border-b border-white/5">
                          <input 
                            type="text"
                            placeholder="Cerca mappa..."
                            autoFocus
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none"
                            value={mapSearch}
                            onChange={(e) => setMapSearch(e.target.value)}
                          />
                        </div>
                        <div className="max-h-64 overflow-y-auto custom-scrollbar">
                          {ALL_MAPS.filter((m: string) => !mapSearch || m.toLowerCase().includes(mapSearch.toLowerCase())).map((mapName) => (
                            <button
                              key={mapName}
                              onClick={() => {
                                const currentMaps = editedBO.map ? editedBO.map.split(', ').map(m => m.trim()) : [];
                                const newMaps = currentMaps.includes(mapName) ? currentMaps.filter(m => m !== mapName) : [...currentMaps, mapName];
                                setEditedBO(prev => ({ ...prev, map: newMaps.join(', ') }));
                              }}
                              className={`w-full px-4 py-2.5 text-sm text-left flex items-center justify-between ${editedBO.map?.split(', ').includes(mapName) ? 'bg-cyan-500/20 text-cyan-400 font-black' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
                            >
                              {mapName}
                              {editedBO.map?.split(', ').includes(mapName) && <CheckCircle2 size={14} />}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-4 space-y-6">
               <div>
                  <label className="flex items-center gap-2 text-xs font-black text-cyan-400 uppercase tracking-[0.2em] mb-3">
                    <User size={14} /> Autore
                  </label>
                  <div className="bg-white/5 border-2 border-white/10 rounded-2xl p-4 space-y-4">
                    <input
                      type="text"
                      value={editedBO.author_nickname || ''}
                      onChange={e => setEditedBO(prev => ({ ...prev, author_nickname: e.target.value }))}
                      placeholder="Nickname..."
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none"
                    />
                    <button
                      onClick={() => setEditedBO(prev => ({ ...prev, author_nickname: user?.nickname || '', author_rank: user?.rank || '' }))}
                      className="w-full py-2.5 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2"
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
              <Upload size={14} /> Immagine di Copertina
            </label>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              <div className="md:col-span-5 space-y-4">
                <input
                  type="text"
                  value={editedBO.banner_url || ''}
                  onChange={e => setEditedBO(prev => ({ ...prev, banner_url: e.target.value }))}
                  placeholder="URL Immagine..."
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-white outline-none"
                />
                <label className={`flex flex-col items-center justify-center gap-2 w-full py-6 border-2 border-dashed rounded-2xl cursor-pointer transition-all ${uploading ? 'opacity-50' : 'hover:bg-yellow-500/5 hover:border-yellow-500/30'}`}>
                  <input type="file" className="hidden" onChange={handleFileUpload} />
                  {uploading ? <Loader2 className="animate-spin text-cyan-400" /> : <><Upload className="text-yellow-500" /> <span className="text-[10px] font-black uppercase">Carica Immagine</span></>}
                </label>
              </div>
              <div className="md:col-span-7">
                <div className={`relative w-full aspect-[21/6] rounded-2xl overflow-hidden border-2 transition-all duration-500 bg-black/40 group ${dragState ? 'border-yellow-500 shadow-[0_0_40px_rgba(234,179,8,0.3)] scale-[1.02]' : 'border-white/10 hover:border-white/20'}`}>
                  {editedBO.banner_url ? (
                    <>
                      <img 
                        src={editedBO.banner_url} 
                        className={`w-full h-full object-cover select-none transition-transform duration-300 ${dragState ? 'cursor-grabbing' : 'cursor-grab hover:scale-105'}`} 
                        style={{ objectPosition: `50% ${editedBO.banner_position ?? 50}%` }} 
                        onMouseDown={(e) => startDrag(e, editedBO.banner_position ?? 50)} 
                        alt="Preview" 
                      />
                      <div className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity pointer-events-none ${dragState ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                        <div className="bg-yellow-500 text-black px-4 py-2 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 shadow-2xl scale-90 group-hover:scale-100 transition-transform">
                          <MousePointer2 size={12} /> {dragState ? 'Rilascia per confermare' : 'Trascina Verticalmente'}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <p className="text-[10px] font-black text-white/10 uppercase tracking-widest">Anteprima non disponibile</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="flex items-center gap-2 text-xs font-black text-cyan-400 uppercase tracking-[0.2em] mb-4">
              <Zap size={14} className="animate-pulse" /> Descrizione Strategia
            </label>
            <textarea
              value={editedBO.description}
              onChange={e => setEditedBO(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Spiega l'obiettivo della build..."
              className="w-full bg-white/5 border-2 border-white/10 rounded-2xl px-6 py-4 text-white outline-none min-h-[120px]"
            />
          </div>

          {/* YouTube Section */}
          <div className="bg-red-500/5 border border-red-500/20 rounded-3xl p-8 space-y-8">
            <div className="space-y-6">
              <label className="flex items-center gap-2 text-xs font-black text-red-500 uppercase tracking-[0.2em]">
                <Youtube size={16} /> Link Video Guida
              </label>
              <div className="flex gap-4">
                <input
                  type="text"
                  value={editedBO.source || ''}
                  onChange={e => setEditedBO(prev => ({ ...prev, source: e.target.value }))}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="flex-1 bg-black/40 border-2 border-white/10 rounded-2xl px-6 py-4 text-sm text-red-200 outline-none focus:border-red-500/50 transition-all"
                />
                <button
                  onClick={() => {
                    if (currentYoutubeId) {
                      setVideoAddedStatus(true);
                      setTimeout(() => setVideoAddedStatus(false), 3000);
                    } else {
                      toast.error("Link video non valido");
                    }
                  }}
                  disabled={!editedBO.source}
                  className={`px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 transition-all active:scale-95 border-2 ${
                    videoAddedStatus 
                    ? 'bg-green-600 border-green-400 text-white shadow-[0_0_20px_rgba(34,197,94,0.4)]' 
                    : 'bg-[#FF0000] border-[#FF0000] text-white hover:bg-[#CC0000] hover:border-[#CC0000] shadow-[0_0_20px_rgba(255,0,0,0.2)]'
                  }`}
                >
                  {videoAddedStatus ? (
                    <><CheckCircle2 size={14} strokeWidth={3} /> Video Aggiunto!</>
                  ) : (
                    <><PlayCircle size={14} /> Aggiungi Video Guida</>
                  )}
                </button>
              </div>

               {/* Video Preview inside Modal - High Res Thumbnail instead of blurry iframe */}
               {currentYoutubeId && (
                 <div className="mt-4 animate-in fade-in zoom-in-95 duration-500 flex justify-start">
                    <div className="relative aspect-video w-full max-w-[320px] rounded-xl overflow-hidden border-2 border-red-500/30 shadow-[0_0_30px_rgba(239,68,68,0.1)] group cursor-pointer">
                      <img 
                        src={`https://img.youtube.com/vi/${currentYoutubeId}/maxresdefault.jpg`} 
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        alt="Video Preview"
                        onError={(e) => {
                          // Fallback to hqdefault if maxres isn't available
                          (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${currentYoutubeId}/hqdefault.jpg`;
                        }}
                      />
                      <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                        <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center shadow-2xl transform group-hover:scale-110 transition-transform">
                          <Play fill="white" className="text-white ml-1" size={24} />
                        </div>
                      </div>
                      <div className="absolute top-2 left-2 px-2 py-0.5 bg-red-600 text-white text-[8px] font-black uppercase rounded shadow-lg">Preview HD</div>
                    </div>
                 </div>
               )}
            </div>

            <div className="h-px bg-white/5 w-full" />

            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-1">
                  <h3 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-2">
                    <FileText className="text-cyan-400" size={20} />
                    Inserimento Manuale Trascrizione
                  </h3>
                </div>
              </div>

              <div className="space-y-4">
                <textarea
                  value={manualText}
                  onChange={(e) => setManualText(e.target.value)}
                  placeholder="Incolla qui la trascrizione completa del video..."
                  className="w-full min-h-[180px] bg-black/60 border-2 border-cyan-500/20 rounded-2xl p-6 text-sm text-cyan-100 outline-none focus:border-cyan-500/50 transition-all placeholder:text-cyan-500/20 resize-y"
                />
                
                {/* AI Progress Bar */}
                {isAnalyzing && (
                  <div className="space-y-2 animate-in fade-in duration-300">
                    <div className="flex justify-between items-end">
                      <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest">Analisi in corso con Gemini 2.5...</span>
                      <span className="text-[10px] font-black text-cyan-400">{Math.round(analysisProgress)}%</span>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
                      <div 
                        className="h-full bg-gradient-to-r from-cyan-600 to-blue-500 transition-all duration-500 ease-out shadow-[0_0_15px_rgba(6,182,212,0.5)]"
                        style={{ width: `${analysisProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="flex justify-end items-center">
                  <button
                    onClick={() => handleAIAnalysis(true)}
                    disabled={isAnalyzing || !manualText.trim()}
                    className="px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-black rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.2)] active:scale-95 disabled:opacity-30 transition-all"
                  >
                    {isAnalyzing ? <Loader2 size={16} className="animate-spin" /> : <BrainCircuit size={16} />}
                    Analizza Trascrizione con IA
                  </button>
                </div>
              </div>
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
                className="bg-cyan-500 hover:bg-cyan-400 text-black px-4 py-2 rounded-xl text-[10px] font-black uppercase flex items-center gap-2"
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
                  className={`group relative bg-white/5 border rounded-2xl p-6 flex items-start gap-4 transition-all ${
                    droppedIndex === idx ? 'border-green-500 bg-green-500/5' : 'border-white/10 hover:border-cyan-500/30'
                  }`}
                >
                  <div className="flex flex-col items-center gap-1 mt-1">
                    <button onClick={() => moveStep(idx, idx - 1)} disabled={idx === 0} className="p-1 text-gray-600 hover:text-cyan-400 disabled:opacity-0"><ChevronUp size={20} /></button>
                    <div className="cursor-grab active:cursor-grabbing p-1 text-gray-700 hover:text-cyan-400"><MoveVertical size={18} /></div>
                    <button onClick={() => moveStep(idx, idx + 1)} disabled={idx === editedBO.steps.length - 1} className="p-1 text-gray-600 hover:text-cyan-400 disabled:opacity-0"><ChevronDown size={20} /></button>
                  </div>
                  <div className="flex-1">
                    <button onClick={() => setEditedBO(prev => ({ ...prev, steps: prev.steps.filter((_, i) => i !== idx) }))} className="absolute -top-3 -right-3 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all z-10"><X size={16} /></button>
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                      <div className="md:col-span-2"><input type="text" value={step.time} onChange={e => { const s = [...editedBO.steps]; s[idx].time = e.target.value; setEditedBO(p => ({ ...p, steps: s })); }} className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-2.5 text-center font-mono text-cyan-400 font-bold outline-none" /></div>
                      <div className="md:col-span-10"><input type="text" value={step.action} onChange={e => { const s = [...editedBO.steps]; s[idx].action = e.target.value; setEditedBO(p => ({ ...p, steps: s })); }} placeholder="Azione..." className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white font-bold outline-none" /></div>
                      <div className="md:col-span-12"><textarea value={step.note || ''} onChange={e => { const s = [...editedBO.steps]; s[idx].note = e.target.value; setEditedBO(p => ({ ...p, steps: s })); }} placeholder="Note..." className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-2 text-xs text-gray-400 italic outline-none resize-none" /></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-6 border-t border-white/5 bg-black/40 flex justify-end gap-4">
          <button onClick={onClose} className="px-6 py-3 text-sm font-bold text-gray-400 hover:text-white transition-colors">Annulla</button>
          <button onClick={handleSave} disabled={isSaving || showSuccess} className={`px-10 py-4 ${showSuccess ? 'bg-green-600' : 'bg-gradient-to-r from-cyan-600 to-blue-600'} text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg hover:-translate-y-0.5 transition-all flex items-center gap-3`}>
            {isSaving ? <Loader2 className="animate-spin" /> : showSuccess ? <CheckCircle2 /> : <Save />}
            {isSaving ? 'Salvataggio...' : showSuccess ? 'Fatto!' : 'Salva Build Order'}
          </button>
        </div>

        {/* Exit Confirmation Modal */}
        {showExitConfirm && (
          <div className="absolute inset-0 z-[7000] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
            <div className="bg-[#1a1c23] border border-red-500/30 rounded-3xl p-8 max-w-md w-full text-center">
              <AlertTriangle className="text-red-400 mx-auto mb-6" size={48} />
              <h3 className="text-xl font-black text-white uppercase mb-2">Modifiche non salvate</h3>
              <p className="text-gray-400 text-sm mb-8">Uscire senza salvare? I progressi andranno perduti.</p>
              <div className="grid grid-cols-2 gap-4">
                <button onClick={() => setShowExitConfirm(false)} className="py-3 bg-white/5 rounded-xl text-white font-bold">Annulla</button>
                <button onClick={() => { setShowExitConfirm(false); onClose(); }} className="py-3 bg-red-600 rounded-xl text-white font-black uppercase">Esci</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
