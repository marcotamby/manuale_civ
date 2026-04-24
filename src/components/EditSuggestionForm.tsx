import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './AuthContext';
import { Trash2, Plus, User, CheckCircle, XCircle, X, Upload, Loader2, MousePointer2, MoveVertical, Map, ChevronUp, ChevronDown } from 'lucide-react';
import type { ToastType } from './Toast';

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

  const startDrag = (e: React.MouseEvent, currentPos: number) => {
    setDragState({ startY: e.clientY, startPos: currentPos });
  };

  // Build Order structured state
  const [boSteps, setBoSteps] = useState<{ time: string; action: string; note: string }[]>([
    { time: '', action: '', note: '' }
  ]);

  const moveStep = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= boSteps.length) return;
    const newSteps = [...boSteps];
    const [movedStep] = newSteps.splice(fromIndex, 1);
    newSteps.splice(toIndex, 0, movedStep);
    setBoSteps(newSteps);
  };

  const [draggedStepIndex, setDraggedStepIndex] = useState<number | null>(null);

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
      <div className="flex items-center gap-2 mb-6 text-sm text-green-400/80 bg-green-500/5 px-4 py-2 rounded-lg border border-green-500/20 w-fit">
        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        Loggato come <strong>{user?.name}</strong>
      </div>

      <p className="text-gray-400 text-sm mb-6">
        Hai informazioni più accurate su questa civiltà? Proponi una modifica e il nostro team la esaminerà.
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
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Sezione da modificare</label>
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
            className="w-full bg-black/40 border border-gray-600 rounded-lg pl-4 pr-10 py-3 text-white focus:outline-none focus:border-yellow-500 transition-colors [&>option]:bg-[#1a1c23] [&>option]:text-white appearance-none"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='rgba(255,255,255,0.5)' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 1rem center',
              backgroundSize: '1.2em'
            }}
          >
            <option value="">Seleziona sezione...</option>
            <option value="caratteristiche">Descrizione</option>
            <option value="punti_di_forza">Punti di Forza</option>
            <option value="punti_di_debolezza">Punti Deboli</option>
            <option value="bonus">Bonus</option>
            <option value="build_order">Build Order</option>
            <option value="altro">Altro</option>
          </select>
        </div>

        {section !== 'build_order' && section !== '' && (
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Descrizione</label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={5}
              className="w-full bg-black/40 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-yellow-500 transition-colors resize-y"
              placeholder="Descrivi dettagliatamente la modifica che proponi..."
              required
            />
          </div>
        )}

        {section === 'build_order' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Titolo Build Order</label>
              <input
                type="text"
                placeholder="Titolo"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Difficoltà Strategia</label>
              <div className="flex gap-4">
                {[1, 2, 3].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setDifficulty(num)}
                    className={`flex-1 py-3 rounded-xl border-2 transition-all flex flex-col items-center gap-1 ${
                      difficulty === num 
                        ? 'bg-yellow-500/10 border-yellow-500 text-yellow-500' 
                        : 'bg-black/40 border-white/10 text-gray-500 hover:border-white/20'
                    }`}
                  >
                    <div className="flex gap-0.5">
                      {Array.from({ length: num }).map((_, i) => (
                        <span key={i} className="text-xs">⭐</span>
                      ))}
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-tighter">
                      {num === 1 ? 'Facile' : num === 2 ? 'Media' : 'Difficile'}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                <Map size={12} className="text-yellow-500" /> Mappa Consigliata
              </label>
              <input
                type="text"
                placeholder="es. Arabia, Isole, ecc."
                value={map}
                onChange={(e) => setMap(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Immagine Banner (JPG/PNG)</label>
              <div className="flex items-stretch gap-2">
                <input
                  type="text"
                  placeholder="Inserisci link immagine o carica file..."
                  value={bannerUrl}
                  onChange={(e) => setBannerUrl(e.target.value)}
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm text-blue-300 focus:outline-none focus:border-blue-500 transition-colors"
                />
                <label className={`cursor-pointer flex items-center justify-center rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-colors w-12 shrink-0 m-0 ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                   <input 
                     type="file" 
                     className="hidden" 
                     accept="image/*"
                     onChange={handleFileUpload}
                   />
                   {isUploading ? (
                     <Loader2 size={20} className="text-yellow-500 animate-spin" />
                   ) : (
                     <Upload size={20} className="text-gray-400" />
                   )}
                </label>
              </div>

              {isUploading && (
                <div className="mt-3 bg-yellow-500/10 border border-dashed border-yellow-500/30 rounded-xl p-6 flex flex-col items-center gap-3 animate-pulse">
                  <Loader2 size={32} className="text-yellow-500 animate-spin" />
                  <div className="text-center">
                    <p className="text-xs font-black text-yellow-500 uppercase tracking-[0.2em] mb-1">Caricamento in corso...</p>
                    <p className="text-[10px] text-yellow-500/60 uppercase">Ottimizzazione immagine per il web</p>
                  </div>
                </div>
              )}
              
              {bannerUrl && (
                <div className="space-y-3 mt-4">
                  <div className="bg-black/60 border-t border-x border-white/10 rounded-t-2xl px-4 py-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                      <MoveVertical size={14} className="text-yellow-500" />
                      Inquadratura Finale Build Order
                      <span className="text-[8px] normal-case font-medium text-gray-600 block md:inline ml-1">(Trascina l'anteprima sotto)</span>
                    </label>
                  </div>

                  <div 
                    className={`relative w-full aspect-[4/1] rounded-b-2xl overflow-hidden border-2 transition-all duration-300 group/preview cursor-move ${dragState ? 'border-yellow-500 shadow-[0_0_40px_rgba(234,179,8,0.3)]' : 'border-white/10 hover:border-white/20'}`}
                    onMouseDown={(e) => startDrag(e, bannerPosition)}
                  >
                    <img 
                      src={bannerUrl} 
                      alt="Anteprima" 
                      className="w-full h-full object-cover transition-all duration-300 pointer-events-none select-none" 
                      style={{ objectPosition: `50% ${bannerPosition}%` }}
                    />
                    
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/preview:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3 pointer-events-none">
                       <div className="bg-yellow-500/90 text-black px-3 py-1.5 rounded-lg text-[10px] font-black uppercase flex items-center gap-2">
                         <MousePointer2 size={12} /> Trascina per posizionare
                       </div>
                    </div>

                    <div className="absolute top-3 right-3 flex gap-2">
                       <button 
                         type="button"
                         onClick={(e) => { e.stopPropagation(); setBannerUrl(''); }}
                         className="p-2 bg-red-600 text-white rounded-lg shadow-2xl pointer-events-auto hover:bg-red-500 transition-colors"
                         title="Rimuovi Immagine"
                       >
                         <Trash2 size={16} />
                       </button>
                    </div>

                    {/* Focus Area Guide */}
                    <div className="absolute inset-x-0 h-full border-y-2 border-dashed border-white/20 pointer-events-none" />
                  </div>
                  <p className="text-[10px] text-gray-500 italic text-center px-4">
                    Tieni premuto e trascina l'immagine verso l'alto o il basso per scegliere l'inquadratura perfetta.
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Breve Descrizione / Introduzione Strategia</label>
              <textarea
                placeholder="es. Questa build punta a massimizzare l'economia iniziale..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-black/40 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-yellow-500 transition-colors resize-y h-24"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Passaggi</label>
              {boSteps.map((step, index) => (
                <div 
                  key={index} 
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`flex items-start gap-4 p-4 bg-white/5 rounded-xl border transition-all group relative ${draggedStepIndex === index ? 'opacity-30 border-blue-500 shadow-[0_0_30px_rgba(59,130,246,0.2)]' : 'border-white/10 hover:border-blue-500/30'}`}
                >
                  {/* Drag Handle & Reorder Buttons */}
                  <div className="flex flex-col items-center gap-1 mt-1">
                    <button
                      type="button"
                      onClick={() => moveStep(index, index - 1)}
                      disabled={index === 0}
                      className="p-1 text-gray-600 hover:text-blue-400 disabled:opacity-0 transition-colors"
                    >
                      <ChevronUp size={20} />
                    </button>
                    <div className="cursor-grab active:cursor-grabbing p-1 text-gray-700 hover:text-blue-400 transition-colors">
                      <MoveVertical size={18} />
                    </div>
                    <button
                      type="button"
                      onClick={() => moveStep(index, index + 1)}
                      disabled={index === boSteps.length - 1}
                      className="p-1 text-gray-600 hover:text-blue-400 disabled:opacity-0 transition-colors"
                    >
                      <ChevronDown size={20} />
                    </button>
                  </div>

                  <div className="flex-1 space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="0:00"
                        value={step.time}
                        onChange={(e) => updateStep(index, 'time', e.target.value)}
                        className="w-24 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-yellow-400 focus:outline-none focus:border-blue-500 transition-colors font-mono text-center"
                      />
                      <div className="flex-1">
                        <input
                          type="text"
                          value={step.action}
                          onChange={(e) => updateStep(index, 'action', e.target.value)}
                          placeholder="Azione (es. 6 a cibo)"
                          className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white placeholder:text-gray-600 focus:border-blue-500 outline-none transition-all font-bold text-sm"
                        />
                      </div>
                      {boSteps.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeStep(index)}
                          className="p-2 text-gray-500 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 size={20} />
                        </button>
                      )}
                    </div>
                    <textarea
                      placeholder="Note aggiuntive"
                      value={step.note}
                      onChange={(e) => updateStep(index, 'note', e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white placeholder:text-gray-600 focus:border-blue-500 outline-none transition-all italic text-xs h-16 resize-none"
                    />
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={addStep}
                className="w-full py-3 border-2 border-dashed border-white/10 rounded-xl text-gray-400 hover:text-white hover:border-white/20 transition-all flex items-center justify-center gap-2 text-sm"
              >
                <Plus size={16} />
                Aggiungi Passaggio
              </button>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <div 
                className="flex items-center gap-2 cursor-pointer group"
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
              >
                <div className={`w-5 h-5 rounded border transition-all flex items-center justify-center ${
                  isSigned 
                    ? 'bg-yellow-500 border-yellow-500' 
                    : 'border-gray-600 bg-black/40 group-hover:border-yellow-500/50'
                }`}>
                  {isSigned && <CheckCircle size={14} className="text-black" />}
                </div>
                <span className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors">Firma</span>
              </div>
              {!user?.nickname && (
                <span className="text-[10px] text-gray-500 italic">Completa il profilo per firmare</span>
              )}
            </div>
          </div>
        )}

        {section !== '' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Fonte / Video (opzionale)</label>
              <input
                type="text"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="w-full bg-black/40 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-yellow-500 transition-colors"
                placeholder={section === 'build_order' ? "Link YouTube o guida..." : "AoE4 World, Pro Player, ecc."}
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto sm:px-8 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium shadow-lg shadow-blue-500/20 transition-all mt-2 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Invio in corso...
                </>
              ) : (
                'Invia Proposta'
              )}
            </button>
          </>
        )}
      </form>

    </div>
  );
}
