import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './AuthContext';
import { Trash2, Plus, User, CheckCircle, XCircle, X, Upload, Loader2 } from 'lucide-react';
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
  const [bannerPosition, setBannerPosition] = useState<'top' | 'center' | 'bottom'>('center');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<{ isVisible: boolean; message: string; type: ToastType }>({
    isVisible: false,
    message: '',
    type: 'success'
  });
  const [isUploading, setIsUploading] = useState(false);

  // Build Order structured state
  const [boSteps, setBoSteps] = useState<{ time: string; action: string; note: string }[]>([
    { time: '', action: '', note: '' }
  ]);

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
    setBannerPosition('center');
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
      openLoginModal();
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
          source: source
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
          onClick={openLoginModal}
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
            className="w-full bg-black/40 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-yellow-500 transition-colors [&>option]:bg-[#1a1c23] [&>option]:text-white"
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
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Immagine Banner (JPG/PNG)</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Inserisci link immagine o carica file..."
                      value={bannerUrl}
                      onChange={(e) => setBannerUrl(e.target.value)}
                      className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm text-blue-300 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                    <label className={`cursor-pointer flex items-center justify-center p-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-colors w-12 h-full shrink-0 ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}>
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
                </div>
                <div className="w-24">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Allinea</label>
                  <select
                    value={bannerPosition}
                    onChange={(e) => setBannerPosition(e.target.value as any)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-[11px] text-white text-xs focus:outline-none focus:border-blue-500"
                  >
                    <option value="top">Sopra</option>
                    <option value="center">Centro</option>
                    <option value="bottom">Sotto</option>
                  </select>
                </div>
              </div>
              {bannerUrl && (
                <div className="mt-2 relative h-32 w-full rounded-xl overflow-hidden border border-white/10 group/preview">
                  <img 
                    src={bannerUrl} 
                    alt="Anteprima" 
                    className="w-full h-full object-cover" 
                    style={{ objectPosition: bannerPosition }}
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/preview:opacity-100 transition-opacity flex items-center justify-center">
                     <button 
                       type="button"
                       onClick={() => setBannerUrl('')}
                       className="p-1 px-3 bg-red-600 text-xs font-bold text-white rounded-lg uppercase flex items-center gap-1 shadow-lg"
                     >
                       <Trash2 size={12} /> Rimuovi
                     </button>
                  </div>
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
                <div key={index} className="flex flex-col gap-2 p-4 bg-white/5 rounded-xl border border-white/10 group relative">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="0:00"
                      value={step.time}
                      onChange={(e) => updateStep(index, 'time', e.target.value)}
                      className="w-28 bg-black/40 border border-white/10 rounded-lg px-3 py-3 text-base text-yellow-400 focus:outline-none focus:border-blue-500 transition-colors font-mono"
                    />
                    <div className="flex-1">
                      <input
                        type="text"
                        value={step.action}
                        onChange={(e) => updateStep(index, 'action', e.target.value)}
                        placeholder="Azione (es. 6 a cibo)"
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-600 focus:border-yellow-500/50 outline-none transition-all font-bold text-sm"
                      />
                    </div>
                    {boSteps.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeStep(index)}
                        className="p-2 text-gray-500 hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={24} />
                      </button>
                    )}
                  </div>
                  <textarea
                    placeholder="Note aggiuntive"
                    value={step.note}
                    onChange={(e) => updateStep(index, 'note', e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-600 focus:border-yellow-500/50 outline-none transition-all italic text-xs h-20 resize-none"
                  />
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
