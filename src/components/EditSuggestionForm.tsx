import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './AuthContext';
import { Trash2, Plus, User, CheckCircle, XCircle, X, Upload, Loader2, MousePointer2, MoveVertical, Map, ChevronUp, ChevronDown, CheckCircle2 } from 'lucide-react';
import type { ToastType } from './Toast';
import { CATEGORY_MAPS } from './AdminBOEditorModal';
import { AOE4_MAPS as ALL_MAPS } from '../data/aoe4Maps';

interface SuggestionFormProps {
  civName: string;
}

export function EditSuggestionForm({ civName }: SuggestionFormProps) {
  const [searchParams] = useSearchParams();
  const { isAuthenticated, user, openLoginModal } = useAuth();
  const [section, setSection] = useState(searchParams.get('section') || '');
  const [title, setTitle] = useState(''); // For build order title
  const [description, setDescription] = useState(''); // For build order description
  const [text, setText] = useState(''); // For general suggestion text
  const [source, setSource] = useState(''); // For general source or build order source
  const [isSigned, setIsSigned] = useState(false);
  const [difficulty, setDifficulty] = useState<number>(2);
  const [bannerUrl, setBannerUrl] = useState('');
  const [bannerPosition, setBannerPosition] = useState<number>(50);
  const [map, setMap] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<{ isVisible: boolean; message: string; type: ToastType }>({
    isVisible: false,
    message: '',
    type: 'success'
  });
  const [isUploading, setIsUploading] = useState(false);
  const [dragState, setDragState] = useState<{ startY: number; startPos: number } | null>(null);
  const [isMapDropdownOpen, setIsMapDropdownOpen] = useState(false);
  const [mapSearch, setMapSearch] = useState('');
  const mapDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragState) return;
      const deltaY = e.clientY - dragState.startY;
      const containerHeight = 160; 
      const deltaPercent = (deltaY / containerHeight) * 100;
      let newPos = Math.max(0, Math.min(100, dragState.startPos - (deltaPercent * 0.5)));
      setBannerPosition(Math.round(newPos));
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

  // Handle Click Outside for Map Dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (mapDropdownRef.current && !mapDropdownRef.current.contains(event.target as Node)) {
        setIsMapDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const startDrag = (e: React.MouseEvent, currentPos: number) => {
    setDragState({ startY: e.clientY, startPos: currentPos });
  };

  // Build Order structured state
  const [boSteps, setBoSteps] = useState<{ time: string; action: string; note: string }[]>([
    { time: '', action: '', note: '' }
  ]);

  const [draggedStepIndex, setDraggedStepIndex] = useState<number | null>(null);
  const [droppedIndex, setDroppedIndex] = useState<number | null>(null);

  const moveStep = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= boSteps.length) return;
    const newSteps = [...boSteps];
    const [movedStep] = newSteps.splice(fromIndex, 1);
    newSteps.splice(toIndex, 0, movedStep);
    setBoSteps(newSteps);
    setDroppedIndex(toIndex);
    setTimeout(() => setDroppedIndex(null), 800);
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

  const addStep = () => setBoSteps([...boSteps, { time: '', action: '', note: '' }]);
  const removeStep = (index: number) => setBoSteps(boSteps.filter((_, i) => i !== index));
  const updateStep = (index: number, field: string, value: string) => {
    const newSteps = [...boSteps];
    (newSteps[index] as any)[field] = value;
    setBoSteps(newSteps);
  };

  useEffect(() => {
    const sectionFromUrl = searchParams.get('section');
    if (sectionFromUrl) {
      setSection(sectionFromUrl);
    }
  }, [searchParams]);

  // Clear inputs when user changes
  useEffect(() => {
    setText('');
    setTitle('');
    setDescription('');
    setSource('');
    setBoSteps([{ time: '', action: '', note: '' }]);
    setDifficulty(2);
    setBannerUrl('');
    setBannerPosition(50);
    setMap('');
    setIsSigned(false);
  }, [user?.email]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setToast({ isVisible: true, message: 'Immagine troppo grande (max 5MB)', type: 'error' });
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `suggestion-${Date.now()}.${fileExt}`;
      const filePath = `build-orders/suggestions/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('civilizations')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('civilizations')
        .getPublicUrl(filePath);

      setBannerUrl(publicUrl);
      setToast({ isVisible: true, message: 'Immagine caricata con successo!', type: 'success' });
    } catch (error: any) {
      console.error('Error uploading image:', error);
      setToast({ isVisible: true, message: `Errore caricamento: ${error.message}`, type: 'error' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      openLoginModal('Esegui l\'accesso per proporre modifiche e aiutarci a migliorare il manuale!');
      return;
    }

    if (section === 'build_order' && (!title.trim() || !description.trim())) {
      setToast({
        isVisible: true,
        message: 'Titolo e Descrizione sono obbligatori per i Build Order',
        type: 'error'
      });
      return;
    }

    if (section === 'build_order' && isSigned && !user?.nickname) {
      setToast({
        isVisible: true,
        message: 'Completa le informazioni nel tuo profilo per firmare un build order',
        type: 'error'
      });
      return;
    }

    try {
      setIsSubmitting(true);

      let submissionText = '';
      if (section === 'build_order') {
        const boData = {
          title: title.trim() || '',
          description: description,
          difficulty: difficulty,
          banner_url: bannerUrl,
          banner_position: bannerPosition,
          steps: boSteps,
          source: source,
          map: map
        };
        submissionText = JSON.stringify(boData);
      } else {
        submissionText = text;
      }

      const { error } = await supabase
        .from('suggestions')
        .insert([
          {
            civ_name: civName,
            section,
            suggestion_text: submissionText,
            user_name: user?.name || 'Anonimo',
            user_email: user?.email || '',
            user_rank: (section === 'build_order' && isSigned) ? (user?.rank || 'Unranked') : '',
            user_nickname: (section === 'build_order' && isSigned) ? (user?.nickname || '') : '',
            status: 'pending'
          }
        ]);

      if (error) throw error;

      setToast({
        isVisible: true,
        message: 'Proposta inviata con successo!',
        type: 'success'
      });

      setSection('');
      setText('');
      setTitle('');
      setDescription('');
      setSource('');
      setBoSteps([{ time: '', action: '', note: '' }]); // Reset build order steps
      setDifficulty(2);
      setBannerUrl('');
      setMap('');
      setIsSigned(false);
    } catch (err: any) {
      console.error('Error submitting suggestion:', err);
      setToast({
        isVisible: true,
        message: `Errore: ${err.message || 'Impossibile inviare la proposta'}`,
        type: 'error'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="glass p-8 rounded-2xl border border-[#D4AF37]/20 text-center flex flex-col items-center">
        <div className="w-16 h-16 bg-blue-600/10 rounded-full flex items-center justify-center mb-4 border border-blue-500/20">
          <User size={32} className="text-blue-400" />
        </div>
        <h3 className="text-xl font-bold text-white mb-2">Accesso Richiesto</h3>
        <p className="text-sm text-gray-400 max-w-sm mb-6">
          Per garantire la qualità dei contributi, ti chiediamo di effettuare l'accesso tramite Google per proporre modifiche.
        </p>
        <button
          onClick={() => openLoginModal()}
          className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg transition-all"
        >
          Accedi con Google
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-2 mb-6 text-xs font-black text-cyan-400 uppercase tracking-[0.2em] bg-cyan-500/10 px-4 py-2.5 rounded-xl border border-cyan-500/30 w-fit shadow-[0_0_20px_rgba(6,182,212,0.1)]">
        <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse shadow-[0_0_8px_rgba(6,182,212,0.5)]" />
        Loggato come <span className="text-white ml-1">{user?.nickname || user?.name}</span>
      </div>

      <p className="text-gray-400 text-[13px] font-medium leading-relaxed mb-8 border-l-2 border-cyan-500/30 pl-4">
        Hai informazioni più accurate su questa civiltà? Proponi una modifica e il nostro team la esaminerà con cura.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {toast.isVisible && (
          <div className={`p-4 rounded-xl border flex items-center justify-between animate-in zoom-in duration-300 ${
            toast.type === 'success' 
              ? 'bg-green-500/10 border-green-500/30 text-green-400' 
              : 'bg-red-500/10 border-red-500/30 text-red-400'
          }`}>
            <div className="flex items-center gap-3">
              {toast.type === 'success' ? <CheckCircle size={20} /> : <XCircle size={20} />}
              <p className="text-sm font-medium">{toast.message}</p>
            </div>
            <button onClick={() => setToast({ ...toast, isVisible: false })} className="ml-4 opacity-50 hover:opacity-100">
              <X size={16} />
            </button>
          </div>
        )}
        <div className="space-y-2">
          <label className="text-xs font-black text-cyan-400 uppercase tracking-[0.2em] ml-1">Sezione da modificare</label>
          <div className="relative group">
            <select
              value={section}
              onChange={(e) => {
                setSection(e.target.value);
                setText('');
                setTitle('');
                setDescription('');
                setSource('');
                setBoSteps([{ time: '', action: '', note: '' }]);
              }}
              required
              className="w-full bg-white/5 backdrop-blur-md border-2 border-white/10 rounded-xl pl-4 pr-10 py-3.5 text-sm text-white focus:outline-none focus:border-cyan-500/50 focus:shadow-[0_0_30px_rgba(6,182,212,0.1)] transition-all [&>option]:bg-[#1a1c23] [&>option]:text-white appearance-none cursor-pointer"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='rgba(6,182,212,0.6)' stroke-width='2.5'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 1.25rem center',
                backgroundSize: '1em'
              }}
            >
              <option value="">Seleziona sezione...</option>
              <option value="caratteristiche">Descrizione Generica</option>
              <option value="punti_di_forza">Punti di Forza</option>
              <option value="punti_di_debolezza">Punti Deboli</option>
              <option value="bonus">Bonus Civiltà</option>
              <option value="build_order">Nuovo Build Order</option>
              <option value="altro">Altre Modifiche</option>
            </select>
            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity"></div>
          </div>
        </div>

        {section !== 'build_order' && section !== '' && (
          <div className="space-y-2">
            <label className="text-xs font-black text-cyan-400 uppercase tracking-[0.2em] ml-1">Descrizione Modifica</label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={6}
              className="w-full bg-white/5 backdrop-blur-md border-2 border-white/10 rounded-xl px-4 py-3.5 text-sm text-white focus:outline-none focus:border-cyan-500/50 transition-all resize-y placeholder:text-white/20 leading-relaxed shadow-inner"
              placeholder="Descrivi dettagliatamente la modifica che proponi. Se possibile, cita le fonti..."
              required
            />
          </div>
        )}

        {section === 'build_order' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-black text-cyan-400 uppercase tracking-[0.2em] ml-1">Titolo Build Order</label>
              <input
                type="text"
                placeholder="es. Fast Castle into Knights"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-white/5 backdrop-blur-md border-2 border-white/10 rounded-xl px-4 py-3.5 text-sm text-white focus:outline-none focus:border-cyan-500/50 focus:shadow-[0_0_30px_rgba(6,182,212,0.1)] transition-all placeholder:text-white/20"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-cyan-400 uppercase tracking-[0.2em] ml-1">Difficoltà Strategia</label>
              <div className="flex gap-3">
                {[1, 2, 3].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setDifficulty(num)}
                    className={`flex-1 py-3 rounded-2xl border-2 transition-all flex flex-col items-center gap-1.5 group relative overflow-hidden ${
                      difficulty === num 
                        ? 'bg-cyan-500/10 border-cyan-500 shadow-[0_0_25px_rgba(6,182,212,0.15)]' 
                        : 'bg-white/5 border-white/10 text-gray-500 hover:border-white/20'
                    }`}
                  >
                    {difficulty === num && (
                      <div className="absolute inset-0 bg-gradient-to-b from-cyan-400/10 to-transparent" />
                    )}
                    <div className="flex gap-0.5 z-10">
                      {Array.from({ length: num }).map((_, i) => (
                        <span key={i} className={`text-xs ${difficulty === num ? 'text-cyan-400 drop-shadow-[0_0_5px_rgba(6,182,212,0.5)]' : 'text-gray-600'}`}>⭐</span>
                      ))}
                    </div>
                    <span className={`text-[11px] font-black uppercase tracking-widest z-10 ${difficulty === num ? 'text-cyan-400' : 'text-gray-500 group-hover:text-gray-400'}`}>
                      {num === 1 ? 'Facile' : num === 2 ? 'Media' : 'Difficile'}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-cyan-400 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                <Map size={14} className="text-cyan-400" /> Mappe Consigliate
              </label>
              <div className="relative" ref={mapDropdownRef}>
                <button
                  type="button"
                  onClick={() => {
                    setIsMapDropdownOpen(!isMapDropdownOpen);
                    if (!isMapDropdownOpen) setMapSearch('');
                  }}
                  className="w-full bg-white/5 border-2 border-white/10 rounded-xl px-4 py-3.5 text-sm text-white focus:border-cyan-500/50 outline-none transition-all flex items-center justify-between group hover:bg-white/10 shadow-inner"
                >
                  <span className={map ? 'text-white font-bold' : 'text-white/20'}>
                    {map || 'Seleziona una mappa...'}
                  </span>
                  <ChevronDown size={18} className={`text-cyan-500 transition-transform duration-300 ${isMapDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {isMapDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-[#1a1c23] border border-cyan-500/30 rounded-xl overflow-hidden z-[7000] shadow-[0_10px_40px_rgba(0,0,0,0.8)] animate-in fade-in slide-in-from-top-2 duration-200 flex flex-col">
                    {/* Search Input inside Dropdown */}
                    <div className="p-3 bg-black/40 border-b border-white/5">
                      <div className="relative">
                        <input 
                          type="text"
                          placeholder="Cerca mappa..."
                          autoFocus
                          className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-xs text-white focus:border-cyan-500/50 outline-none placeholder:text-white/20"
                          value={mapSearch}
                          onChange={(e) => setMapSearch(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              if (mapSearch.trim()) {
                                const currentMaps = map ? map.split(', ').map(m => m.trim()) : [];
                                const newMaps = currentMaps.includes(mapSearch) 
                                  ? currentMaps.filter(m => m !== mapSearch)
                                  : [...currentMaps, mapSearch];
                                setMap(newMaps.join(', '));
                                setMapSearch('');
                              }
                            }
                          }}
                        />
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20">
                          <Map size={14} />
                        </div>
                      </div>
                    </div>

                    <div className="max-h-64 overflow-y-auto custom-scrollbar">
                      {/* Categories (only if no search or matching) */}
                      {(!mapSearch || CATEGORY_MAPS.some((c: string) => c.toLowerCase().includes(mapSearch.toLowerCase()))) && (
                        <div className="p-1">
                           {CATEGORY_MAPS.filter((c: string) => !mapSearch || c.toLowerCase().includes(mapSearch.toLowerCase())).map((mapName) => (
                            <button
                              key={mapName}
                              type="button"
                              onClick={() => {
                                const currentMaps = map ? map.split(', ').map(m => m.trim()) : [];
                                const isSelected = currentMaps.includes(mapName);
                                const newMaps = isSelected 
                                  ? currentMaps.filter(m => m !== mapName)
                                  : [...currentMaps, mapName];
                                setMap(newMaps.join(', '));
                              }}
                              className={`w-full px-4 py-2.5 text-sm text-left transition-colors flex items-center justify-between group/item ${
                                map?.split(', ').includes(mapName)
                                  ? 'bg-cyan-500/20 text-cyan-400 font-black' 
                                  : 'text-cyan-300 hover:bg-white/5 hover:text-cyan-200'
                              }`}
                            >
                              {mapName}
                              {map?.split(', ').includes(mapName) && <CheckCircle2 size={14} className="text-cyan-500" />}
                            </button>
                          ))}
                          <div className="h-px bg-white/5 my-1" />
                        </div>
                      )}

                      {/* All Maps */}
                      {ALL_MAPS.filter((m: string) => !mapSearch || m.toLowerCase().includes(mapSearch.toLowerCase())).map((mapName: string) => (
                        <button
                          key={mapName}
                          type="button"
                          onClick={() => {
                            const currentMaps = map ? map.split(', ').map(m => m.trim()) : [];
                            const isSelected = currentMaps.includes(mapName);
                            const newMaps = isSelected 
                              ? currentMaps.filter(m => m !== mapName)
                              : [...currentMaps, mapName];
                            setMap(newMaps.join(', '));
                          }}
                          className={`w-full px-4 py-2.5 text-sm text-left transition-colors flex items-center justify-between group/item ${
                            map?.split(', ').includes(mapName)
                              ? 'bg-cyan-500/20 text-cyan-400 font-black' 
                              : 'text-gray-400 hover:bg-white/5 hover:text-white'
                          }`}
                        >
                          {mapName}
                          {map?.split(', ').includes(mapName) && <CheckCircle2 size={14} className="text-cyan-500" />}
                        </button>
                      ))}

                      {mapSearch && !ALL_MAPS.some((m: string) => m.toLowerCase().includes(mapSearch.toLowerCase())) && !CATEGORY_MAPS.some((c: string) => c.toLowerCase().includes(mapSearch.toLowerCase())) && (
                        <div className="p-4 text-center">
                           <p className="text-[10px] text-gray-500 uppercase font-bold mb-2">Nessuna mappa trovata</p>
                           <button 
                             onClick={() => {
                               const currentMaps = map ? map.split(', ').map(m => m.trim()) : [];
                               if (!currentMaps.includes(mapSearch)) {
                                 setMap([...currentMaps, mapSearch].join(', '));
                               }
                               setMapSearch('');
                             }}
                             className="text-xs font-black text-cyan-400 hover:text-cyan-300 flex items-center justify-center gap-2 w-full"
                           >
                             Usa "{mapSearch}" <CheckCircle2 size={12} />
                           </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-cyan-400 uppercase tracking-[0.2em] ml-1">Immagine di Copertina (JPG/PNG)</label>
              <div className="flex items-stretch gap-2">
                <input
                  type="text"
                  placeholder="Incolla link o usa il tasto a destra per caricare..."
                  value={bannerUrl}
                  onChange={(e) => setBannerUrl(e.target.value)}
                  className="flex-1 bg-white/5 backdrop-blur-md border-2 border-white/10 rounded-xl px-4 py-3.5 text-xs text-cyan-200 focus:outline-none focus:border-cyan-500/50 transition-all placeholder:text-white/20"
                />
                <label className={`cursor-pointer flex items-center justify-center rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all w-14 shrink-0 m-0 ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                   <input 
                     type="file" 
                     className="hidden" 
                     accept="image/*"
                     onChange={handleFileUpload}
                   />
                   {isUploading ? (
                     <Loader2 size={20} className="text-blue-400 animate-spin" />
                   ) : (
                     <Upload size={20} className="text-gray-400 group-hover:text-white transition-colors" />
                   )}
                </label>
              </div>

              {isUploading && (
                <div className="mt-3 bg-yellow-500/5 border border-dashed border-yellow-500/20 rounded-2xl p-6 flex flex-col items-center gap-3 animate-in fade-in duration-500">
                  <div className="relative">
                    <Loader2 size={32} className="text-blue-400 animate-spin" />
                    <div className="absolute inset-0 bg-yellow-500/20 blur-xl animate-pulse"></div>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] font-black text-yellow-500 uppercase tracking-[0.2em] mb-1">Ottimizzazione in corso...</p>
                    <p className="text-[9px] text-yellow-500/40 uppercase font-bold tracking-widest">Preparazione asset per il manuale</p>
                  </div>
                </div>
              )}
              
              {bannerUrl && (
                <div className="space-y-3 mt-4 animate-in slide-in-from-top-4 duration-500">
                  <div className="bg-[#16171d]/80 backdrop-blur-md border-t border-x border-white/10 rounded-t-2xl px-4 py-2.5">
                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] flex items-center gap-2">
                      <MoveVertical size={14} className="text-yellow-500" />
                      Inquadratura Finale
                      <span className="text-[8px] normal-case font-medium text-gray-600 ml-auto">Trascina l'immagine per posizionarla</span>
                    </label>
                  </div>

                  <div 
                    className={`relative w-full aspect-[4/1] rounded-b-2xl overflow-hidden border-2 transition-all duration-500 group/preview cursor-move ${dragState ? 'border-yellow-500 shadow-[0_0_40px_rgba(234,179,8,0.2)]' : 'border-white/10 hover:border-white/20'}`}
                    onMouseDown={(e) => startDrag(e, bannerPosition)}
                  >
                    <img 
                      src={bannerUrl} 
                      alt="Anteprima" 
                      className="w-full h-full object-cover transition-all duration-300 pointer-events-none select-none" 
                      style={{ objectPosition: `50% ${bannerPosition}%` }}
                    />
                    
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/preview:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3 pointer-events-none">
                       <div className="bg-yellow-500/90 text-black px-4 py-2 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 shadow-2xl">
                         <MousePointer2 size={12} /> Trascina Verticalmente
                       </div>
                    </div>

                    <div className="absolute top-3 right-3 flex gap-2">
                       <button 
                         type="button"
                         onClick={(e) => { e.stopPropagation(); setBannerUrl(''); }}
                         className="p-2.5 bg-red-600/90 hover:bg-red-500 text-white rounded-xl shadow-2xl pointer-events-auto transition-all active:scale-95 border border-red-400/20"
                         title="Rimuovi Immagine"
                       >
                         <Trash2 size={16} />
                       </button>
                    </div>

                    {/* Focus Area Guide */}
                    <div className="absolute inset-x-0 h-full border-y border-dashed border-white/20 pointer-events-none" />
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-cyan-400 uppercase tracking-[0.2em] ml-1">Descrizione e Strategia Generale</label>
              <textarea
                placeholder="Descrivi brevemente gli obiettivi di questa build..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-white/5 backdrop-blur-md border-2 border-white/10 rounded-xl px-6 py-4 text-white focus:outline-none focus:border-cyan-500/50 transition-all resize-y h-32 placeholder:text-white/20"
                required
              />
            </div>

            <div className="space-y-3">
              <label className="text-xs font-black text-cyan-400 uppercase tracking-[0.2em] ml-1">Build Order Steps</label>
              {boSteps.map((step, index) => (
                <div 
                  key={index} 
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`flex items-center gap-4 p-5 bg-white/5 backdrop-blur-sm rounded-2xl border-2 transition-all group relative ${
                    draggedStepIndex === index 
                      ? 'border-dashed border-cyan-500 bg-cyan-500/10 shadow-[0_0_40px_rgba(6,182,212,0.2)]' 
                      : droppedIndex === index
                        ? 'border-green-500/50 bg-green-500/5 shadow-[0_0_20px_rgba(34,197,94,0.1)] scale-[1.01]'
                        : 'border-white/10 hover:border-cyan-500/30 hover:bg-white/10'
                  }`}
                >
                  {draggedStepIndex === index && (
                    <div className="absolute inset-0 bg-cyan-500/5 rounded-2xl flex items-center justify-center z-20 pointer-events-none">
                      <div className="bg-cyan-500 text-black px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-[0.2em] shadow-2xl flex items-center gap-2 border border-cyan-400/30">
                        <MoveVertical size={14} />
                        Spostamento...
                      </div>
                    </div>
                  )}

                  {/* Drag Handle & Reorder Buttons */}
                  <div className="flex flex-col items-center gap-1.5 self-stretch justify-center bg-black/40 px-2 py-3 rounded-xl border border-white/5">
                    <button
                      type="button"
                      onClick={() => moveStep(index, index - 1)}
                      disabled={index === 0}
                      className="p-1 text-gray-500 hover:text-cyan-400 disabled:opacity-0 transition-all active:scale-90"
                    >
                      <ChevronUp size={18} />
                    </button>
                    <div className="cursor-grab active:cursor-grabbing p-1 text-cyan-400/60 hover:text-cyan-400 transition-colors">
                      <MoveVertical size={16} />
                    </div>
                    <button
                      type="button"
                      onClick={() => moveStep(index, index + 1)}
                      disabled={index === boSteps.length - 1}
                      className="p-1 text-gray-500 hover:text-cyan-400 disabled:opacity-0 transition-all active:scale-90"
                    >
                      <ChevronDown size={18} />
                    </button>
                  </div>

                  <div className="flex-1 space-y-3">
                    <div className="flex gap-3">
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="0:00"
                          value={step.time}
                          onChange={(e) => updateStep(index, 'time', e.target.value)}
                          className="w-20 bg-black/60 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-cyan-400 focus:outline-none focus:border-cyan-500 font-mono text-center shadow-inner placeholder:text-cyan-900"
                        />
                      </div>
                      <div className="flex-1">
                        <input
                          type="text"
                          value={step.action}
                          onChange={(e) => updateStep(index, 'action', e.target.value)}
                          placeholder="Azione principale..."
                          className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder:text-white/20 focus:border-cyan-500 outline-none transition-all font-bold text-sm shadow-inner"
                        />
                      </div>
                      {boSteps.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeStep(index)}
                          className="p-2.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all opacity-0 group-hover:opacity-100 active:scale-90"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                    <textarea
                      placeholder="Dettagli e note aggiuntive..."
                      value={step.note}
                      onChange={(e) => updateStep(index, 'note', e.target.value)}
                      className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-2.5 text-white placeholder:text-white/10 focus:border-cyan-500 outline-none transition-all italic text-[11px] h-16 resize-none shadow-inner leading-relaxed"
                    />
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={addStep}
                className="w-full py-4 border-2 border-dashed border-white/5 bg-white/[0.02] rounded-2xl text-gray-500 hover:text-blue-400 hover:border-blue-500/30 hover:bg-blue-500/5 transition-all flex items-center justify-center gap-3 text-xs font-black uppercase tracking-widest group"
              >
                <div className="p-1 bg-white/5 rounded-lg group-hover:bg-blue-500/20 transition-colors">
                  <Plus size={16} />
                </div>
                Aggiungi Passaggio
              </button>
            </div>

            <div className="flex items-center gap-3 pt-4 border-t border-white/5">
              <button
                type="button"
                onClick={() => {
                  if (!user?.nickname) {
                    setToast({
                      isVisible: true,
                      message: 'Completa le informazioni nel tuo profilo per firmare un build order',
                      type: 'error'
                    });
                  } else {
                    setIsSigned(!isSigned);
                  }
                }}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border transition-all ${
                  isSigned 
                    ? 'bg-yellow-500/10 border-yellow-500 text-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.1)]' 
                    : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20 hover:text-white'
                }`}
              >
                <div className={`w-5 h-5 rounded flex items-center justify-center transition-all ${
                  isSigned ? 'bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.5)]' : 'bg-black/40 border border-white/10'
                }`}>
                  {isSigned && <CheckCircle size={14} className="text-black" />}
                </div>
                <span className="text-xs font-black uppercase tracking-widest">Firma la Guida</span>
              </button>
              {!user?.nickname && (
                <div className="flex flex-col">
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Nickname mancante</span>
                  <span className="text-[9px] text-gray-600 italic">Vai al profilo per abilitare la firma</span>
                </div>
              )}
            </div>
          </div>
        )}

        {section !== '' && (
          <div className="space-y-6 pt-2">
            <div className="space-y-2">
              <label className="text-xs font-black text-cyan-400 uppercase tracking-[0.2em] ml-1">Fonti della Modifica (opzionale)</label>
              <input
                type="text"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="w-full bg-white/5 border-2 border-white/10 rounded-xl px-4 py-3.5 text-sm text-white focus:outline-none focus:border-cyan-500/50 transition-all placeholder:text-white/20"
                placeholder={section === 'build_order' ? "Link YouTube o guida esterna..." : "es. AoE4 World, Pro Player, Patch Notes..."}
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto sm:px-10 py-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:from-gray-800 disabled:to-gray-900 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-black uppercase tracking-[0.2em] text-xs shadow-[0_4px_25px_rgba(6,182,212,0.2)] hover:shadow-[0_4px_35px_rgba(6,182,212,0.3)] transition-all mt-2 flex items-center justify-center gap-3 active:scale-[0.98] group"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={18} className="animate-spin text-white/70" />
                  Invio in corso...
                </>
              ) : (
                <>
                  <span>Invia Proposta</span>
                  <CheckCircle size={18} className="group-hover:scale-110 transition-transform" />
                </>
              )}
            </button>
          </div>
        )}
      </form>

    </div>
  );
}
