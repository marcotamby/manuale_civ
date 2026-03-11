import { useState, useEffect } from 'react';
import { X, CheckCircle, XCircle, Loader2, Inbox } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './AuthContext';
import { Toast } from './Toast';
import type { ToastType } from './Toast';

export interface Suggestion {
  id: string;
  created_at: string;
  civ_name: string;
  section: string;
  suggestion_text: string;
  source: string | null;
  user_name: string | null;
  user_email: string | null;
  user_rank?: string;
  user_nickname?: string;
  status: 'pending' | 'implemented' | 'rejected';
}

interface AdminDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AdminDashboardModal({ isOpen, onClose }: AdminDashboardModalProps) {
  const { isSuperAdmin } = useAuth();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState<{ isVisible: boolean; message: string; type: ToastType }>({
    isVisible: false,
    message: '',
    type: 'success'
  });

  const [rejectionModalSugg, setRejectionModalSugg] = useState<Suggestion | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [pendingNotifCount, setPendingNotifCount] = useState(0);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [editingBOs, setEditingBOs] = useState<Record<string, any>>({});
  const [expandedSugg, setExpandedSugg] = useState<string | null>(null);

  const getYoutubeId = (url: string) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const fetchSuggestions = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('suggestions')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSuggestions(data || []);
      await fetchPendingNotifCount();
    } catch (err: any) {
      console.error('Error fetching suggestions:', err);
      setToast({ isVisible: true, message: 'Errore nel caricamento delle proposte', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPendingNotifCount = async () => {
    try {
      const { count, error } = await supabase
        .from('suggestions')
        .select('*', { count: 'exact', head: true })
        .neq('status', 'pending')
        .eq('notified', false);

      if (!error) setPendingNotifCount(count || 0);
    } catch (err) {
      console.error('Error fetching pending notifications:', err);
    }
  };

  useEffect(() => {
    if (isOpen && isSuperAdmin) {
      fetchSuggestions();
    }
  }, [isOpen, isSuperAdmin]);

  const handleSendNotifications = async () => {
    if (pendingNotifCount === 0 || !isSuperAdmin) return;

    try {
      setIsSendingEmail(true);
      setToast({ isVisible: false, message: '', type: 'success' });

      const { error: invokeError } = await supabase.functions.invoke('batch-send-notifications', {
        body: {}
      });

      if (invokeError) {
        let msg = invokeError.message;
        if (invokeError instanceof Error && 'context' in invokeError) {
          try {
            const body = await (invokeError as any).context.json();
            msg = body.error || body.message || msg;
          } catch (e) { }
        }
        throw new Error(msg || 'Errore durante l\'invio delle notifiche');
      }

      setToast({
        isVisible: true,
        message: 'Notifiche inviate con successo! 🎉',
        type: 'success'
      });
      setPendingNotifCount(0);
    } catch (err: any) {
      console.error('Notification error:', err);

      setToast({
        isVisible: true,
        message: `Si è verificato un errore: ${err.message}. Riprova più tardi.`,
        type: 'error'
      });
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleUpdateStatus = async (sugg: Suggestion, newStatus: 'implemented' | 'rejected', reason?: string) => {
    if (!isSuperAdmin) return;
    try {
      if (newStatus === 'implemented') {
        const { data: currentCiv, error: fetchError } = await supabase
          .from('civilizations')
          .select('*')
          .eq('name', sugg.civ_name)
          .single();

        if (fetchError) throw fetchError;

        let updateData: any = null;
        const newLines = sugg.suggestion_text.split('\n').map(s => s.trim()).filter(s => s !== '');

        const safeArray = (val: any) => Array.isArray(val) ? val : [];

        switch (sugg.section) {
          case 'caratteristiche':
            updateData = { short_description: (currentCiv.short_description || '') + '\n\nAddendum:\n' + sugg.suggestion_text };
            break;
          case 'bonus':
            updateData = { passive_bonuses: [...safeArray(currentCiv.passive_bonuses), ...newLines] };
            break;
          case 'punti_di_forza':
            updateData = { strengths: [...safeArray(currentCiv.strengths), ...newLines] };
            break;
          case 'punti_di_debolezza':
            updateData = { weaknesses: [...safeArray(currentCiv.weaknesses), ...newLines] };
            break;
          case 'build_order':
            let boData: any;
            try {
              boData = JSON.parse(sugg.suggestion_text);
            } catch (e) {
              // Fallback for old string-based BOs
              boData = {
                title: `Proposta Community - ${new Date().toLocaleDateString('it-IT')}`,
                steps: sugg.suggestion_text.split('\n').filter(l => l.trim() !== '').map(l => ({ action: l })),
                source: sugg.source || ''
              };
            }

            // Use edits if available
            const editedData = editingBOs[sugg.id] || boData;

            const newBO = {
              id: `bo-${Date.now()}`,
              title: editedData.title,
              description: editedData.description || '',
              difficulty: 'Medium',
              steps: editedData.steps,
              source: editedData.source,
              author_nickname: sugg.user_nickname || null,
              author_rank: sugg.user_nickname ? (sugg.user_rank || 'Unranked') : null
            };
            updateData = { build_orders: [...safeArray(currentCiv.build_orders), newBO] };
            break;
          case 'unita':
          case 'tecnologie':
          case 'matchup':
          case 'altro':
            updateData = { short_description: (currentCiv.short_description || '') + `\n\nAddendum (${sugg.section}):\n` + sugg.suggestion_text };
            break;
          default:
            break;
        }

        if (updateData) {
          const { error: civUpdateError } = await supabase
            .from('civilizations')
            .update(updateData)
            .eq('id', currentCiv.id);

          if (civUpdateError) throw civUpdateError;
        }
      }

      const updatePayload: any = { status: newStatus };
      if (newStatus === 'rejected' && reason) {
        updatePayload.rejection_reason = reason;
      }

      const { error } = await supabase
        .from('suggestions')
        .update(updatePayload)
        .eq('id', sugg.id);

      if (error) throw error;

      setToast({
        isVisible: true,
        message: newStatus === 'implemented' ? 'Proposta segnata come risolta!' : 'Proposta rifiutata',
        type: 'success'
      });

      // Rimuovi dalla lista locale
      setSuggestions(prev => prev.filter(s => s.id !== sugg.id));
      setRejectionModalSugg(null);
      setRejectionReason('');
      fetchPendingNotifCount();
    } catch (err: any) {
      console.error('Error updating suggestion:', err);
      setToast({
        isVisible: true,
        message: `Errore: ${err.message || 'Aggiornamento fallito'}`,
        type: 'error'
      });
    }
  };

  if (!isOpen || !isSuperAdmin) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm shadow-2xl">
      <div className="bg-[#0f1423] border border-[#D4AF37]/30 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-[0_0_40px_rgba(0,0,0,0.8)] filter drop-shadow-2xl relative">

        {/* Rejection Modal Overlay */}
        {rejectionModalSugg && (
          <div className="absolute inset-0 z-[60] bg-black/60 backdrop-blur-md rounded-2xl flex items-center justify-center p-6 text-center">
            <div className="bg-[#1a1c32] border border-red-500/30 p-8 rounded-2xl max-w-md w-full shadow-2xl animate-in fade-in zoom-in duration-300">
              <XCircle size={48} className="text-red-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">Perché scarti la proposta?</h3>
              <p className="text-sm text-gray-400 mb-6">L'utente riceverà un'email con questa motivazione.</p>

              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Esempio: Informazione già presente o non accurata..."
                className="w-full bg-black/50 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm mb-6 focus:border-red-500 transition-colors h-32 resize-none"
              />

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setRejectionModalSugg(null);
                    setRejectionReason('');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-600 text-gray-400 rounded-lg hover:bg-white/5 transition-colors font-medium"
                >
                  Annulla
                </button>
                <button
                  onClick={() => handleUpdateStatus(rejectionModalSugg, 'rejected', rejectionReason)}
                  disabled={!rejectionReason.trim()}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-500 transition-all font-bold shadow-lg shadow-red-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Conferma Scarto
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between p-6 border-b border-[#D4AF37]/20 bg-gradient-to-r from-[#0d1424] to-[#1a1c32] rounded-t-2xl shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg border border-blue-500/20 text-blue-400">
              <Inbox size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white uppercase tracking-wider">Gestione Proposte</h2>
              <p className="text-xs text-gray-400">Revisiona i suggerimenti della community</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-40">
              <Loader2 size={32} className="animate-spin text-blue-500 mb-4" />
              <p className="text-gray-400">Caricamento proposte...</p>
            </div>
          ) : suggestions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-60 text-center glass rounded-xl border border-white/5">
              <Inbox size={48} className="text-gray-600 mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">Nessuna proposta in sospeso</h3>
              <p className="text-gray-400 text-sm">Hai gestito tutti i suggerimenti della community!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {suggestions.map((sugg) => (
                <div key={sugg.id} className="bg-black/40 border border-[#D4AF37]/30 rounded-xl p-5 hover:border-blue-500/50 transition-colors relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-1 h-full bg-blue-500/50 hidden group-hover:block blur-sm"></div>

                  <div className="flex flex-col md:flex-row justify-between gap-6 relative z-10">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <span className="px-3 py-1 bg-blue-600/20 text-blue-400 text-xs font-bold rounded-lg border border-blue-500/30 uppercase tracking-wider">
                            {sugg.civ_name}
                          </span>
                          <span className="text-sm text-gray-400 flex items-center gap-2">
                            Sezione: <span className="text-white font-medium">{sugg.section}</span>
                          </span>
                        </div>
                        {sugg.section === 'build_order' && (
                          <button
                            onClick={() => setExpandedSugg(expandedSugg === sugg.id ? null : sugg.id)}
                            className="text-xs text-blue-400 hover:underline"
                          >
                            {expandedSugg === sugg.id ? 'Chiudi Editor' : 'Edita Passaggi'}
                          </button>
                        )}
                      </div>

                      <div className="bg-black/50 p-4 rounded-lg border border-gray-700/50 mb-4">
                        {sugg.section === 'build_order' ? (
                          (() => {
                            let boData: any;
                            try {
                              boData = JSON.parse(sugg.suggestion_text);
                            } catch (e) {
                              return <p className="text-gray-200 text-sm whitespace-pre-wrap">{sugg.suggestion_text}</p>;
                            }

                            const currentEdits = editingBOs[sugg.id] || boData;

                            const updateBOField = (field: string, value: any) => {
                              setEditingBOs(prev => ({
                                ...prev,
                                [sugg.id]: { ...(prev[sugg.id] || boData), [field]: value }
                              }));
                            };

                            const updateBOStep = (idx: number, field: string, value: string) => {
                              const newSteps = [...currentEdits.steps];
                              newSteps[idx] = { ...newSteps[idx], [field]: value };
                              updateBOField('steps', newSteps);
                            };

                            if (expandedSugg !== sugg.id) {
                              return (
                                <div className="space-y-3">
                                  <p className="text-blue-400 font-bold text-xl">{currentEdits.title}</p>
                                  <div className="space-y-3 mt-3">
                                    {currentEdits.steps.map((s: any, i: number) => (
                                      <p key={i} className="text-base text-gray-100">
                                        <span className="text-yellow-500 font-mono mr-4 text-sm font-bold">{s.time}</span> {s.action}
                                      </p>
                                    ))}
                                  </div>
                                  {currentEdits.source && (
                                    <div className="text-[10px] text-blue-400/60 truncate mt-2 font-mono italic">
                                      Fonte: {currentEdits.source}
                                    </div>
                                  )}
                                </div>
                              );
                            }

                            return (
                              <div className="space-y-5 animate-in fade-in duration-300">
                                <div>
                                  <label className="text-xs text-gray-500 uppercase font-bold mb-1.5 block">Titolo</label>
                                  <input
                                    className="w-full bg-black/40 border border-gray-700 rounded-lg px-4 py-3 text-lg text-white focus:border-blue-500 outline-none"
                                    value={currentEdits.title === 'Nuovo Build Order' ? '' : currentEdits.title}
                                    onChange={(e) => updateBOField('title', e.target.value)}
                                    placeholder="Titolo"
                                  />
                                </div>
                                <div className="space-y-4">
                                  <label className="text-xs text-gray-500 uppercase font-bold mb-1.5 block">Passaggi</label>
                                  {currentEdits.steps.map((s: any, i: number) => (
                                    <div key={i} className="grid grid-cols-12 gap-3 p-4 bg-white/5 rounded border border-white/5">
                                      <input
                                        className="col-span-2 bg-black/40 border border-transparent rounded px-2 py-2 text-base text-yellow-500 focus:border-blue-500 outline-none font-mono"
                                        value={s.time}
                                        onChange={(e) => updateBOStep(i, 'time', e.target.value)}
                                      />
                                      <input
                                        className="col-span-10 bg-black/40 border border-transparent rounded px-2 py-2 text-lg text-white focus:border-blue-500 outline-none font-bold"
                                        value={s.action}
                                        onChange={(e) => updateBOStep(i, 'action', e.target.value)}
                                      />
                                      <textarea
                                        className="col-span-12 bg-black/40 border border-transparent rounded px-2 py-2 text-base text-gray-300 focus:border-blue-500 outline-none resize-none h-20 italic"
                                        value={s.note}
                                        placeholder="Nota..."
                                        onChange={(e) => updateBOStep(i, 'note', e.target.value)}
                                      />
                                    </div>
                                  ))}
                                </div>
                                <div>
                                  <label className="text-[10px] text-gray-500 uppercase font-bold mb-1.5 block">Fonte / Link YouTube</label>
                                  <input
                                    className="w-full bg-black/40 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-yellow-400/80 focus:border-blue-500 outline-none"
                                    value={currentEdits.source}
                                    onChange={(e) => updateBOField('source', e.target.value)}
                                  />
                                  {currentEdits.source && getYoutubeId(currentEdits.source) && (
                                    <div className="mt-3 relative aspect-video w-full max-w-[240px] rounded-lg overflow-hidden border border-white/10 group">
                                      <img
                                        src={`https://img.youtube.com/vi/${getYoutubeId(currentEdits.source)}/mqdefault.jpg`}
                                        alt="Preview"
                                        className="w-full h-full object-cover"
                                      />
                                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                        <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center shadow-lg">
                                          <div className="w-0 h-0 border-t-[6px] border-t-transparent border-l-[10px] border-l-white border-b-[6px] border-b-transparent ml-1" />
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })()
                        ) : (
                          <p className="text-gray-200 text-sm whitespace-pre-wrap leading-relaxed">{sugg.suggestion_text}</p>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-xs">
                        <div className="flex items-center gap-2 text-gray-400 bg-white/5 px-2 py-1 rounded border border-white/5">
                          <span className="font-bold text-[10px] uppercase text-gray-500">Autore:</span>
                          <span className="text-blue-400">{sugg.user_nickname || sugg.user_name || 'Anonimo'}</span>
                          {sugg.user_rank && sugg.user_rank !== 'Unranked' && (
                            <span className="bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded-md text-[10px] border border-blue-500/30">
                              {sugg.user_rank}
                            </span>
                          )}
                        </div>
                        <div className="text-gray-500">
                          <strong>Email:</strong> {sugg.user_email || 'Non fornita'}
                        </div>
                        <div className="text-gray-500">
                          <strong>Data:</strong> {new Date(sugg.created_at).toLocaleString('it-IT')}
                        </div>
                      </div>
                    </div>

                    <div className="flex md:flex-col gap-3 shrink-0 items-center md:items-end justify-center">
                      <button
                        onClick={() => handleUpdateStatus(sugg, 'implemented')}
                        className="flex-1 md:flex-none flex items-center gap-2 px-4 py-2 bg-green-600/20 hover:bg-green-600/40 text-green-400 rounded-lg border border-green-500/30 transition-colors font-medium text-sm"
                        title="Segna come completata"
                      >
                        <CheckCircle size={18} /> Approva
                      </button>

                      <button
                        onClick={() => setRejectionModalSugg(sugg)}
                        className="flex-1 md:flex-none flex items-center gap-2 px-4 py-2 bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded-lg border border-red-500/30 transition-colors font-medium text-sm"
                        title="Rifiuta proposta"
                      >
                        <XCircle size={18} /> Scarta
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Fixed Footer with Send Notifications Button */}
        {pendingNotifCount > 0 && (
          <div className="p-6 border-t border-[#D4AF37]/20 bg-gradient-to-r from-[#0d1424] to-[#1a1c32] flex justify-center sticky bottom-0 rounded-b-2xl z-20 shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
            <button
              onClick={handleSendNotifications}
              disabled={isSendingEmail}
              className="flex items-center gap-4 px-12 py-4 bg-yellow-600 hover:bg-yellow-500 text-white rounded-xl transition-all font-bold shadow-xl shadow-yellow-600/30 group animate-in slide-in-from-bottom duration-500 hover:scale-105 active:scale-95"
            >
              {isSendingEmail ? (
                <Loader2 size={24} className="animate-spin" />
              ) : (
                <CheckCircle size={24} className="group-hover:scale-110 transition-transform" />
              )}
              <div className="text-left">
                <div className="text-lg leading-tight">Invia {pendingNotifCount} Notifiche Ora</div>
                <div className="text-[11px] opacity-70 font-normal uppercase tracking-widest">Invia il riepilogo email agli utenti</div>
              </div>
            </button>
          </div>
        )}
      </div>
      <Toast
        isVisible={toast.isVisible}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ ...toast, isVisible: false })}
      />
    </div>
  );
}
