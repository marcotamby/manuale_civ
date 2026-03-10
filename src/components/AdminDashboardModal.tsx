import { useState, useEffect } from 'react';
import { X, CheckCircle, XCircle, Loader2, Inbox } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
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
  status: 'pending' | 'implemented' | 'rejected';
}

interface AdminDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AdminDashboardModal({ isOpen, onClose }: AdminDashboardModalProps) {
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
    if (isOpen) {
      fetchSuggestions();
    }
  }, [isOpen]);

  const handleSendNotifications = async () => {
    if (pendingNotifCount === 0) return;
    
    try {
      setIsSendingEmail(true);
      const { data, error } = await supabase.functions.invoke('batch-send-notifications');

      if (error) {
        console.error('Invocation error:', error);
        throw error;
      }

      console.log('Notifications result:', data);

      setToast({
        isVisible: true,
        message: `Inviate ${pendingNotifCount} notifiche con successo!`,
        type: 'success'
      });
      setPendingNotifCount(0);
    } catch (err: any) {
      console.error('Full notification error:', err);
      // Give the user the real error message but also the tip about the email
      const errorMsg = err.message || 'Errore sconosciuto';
      setToast({
        isVisible: true,
        message: `Errore: ${errorMsg}. Controlla l'email: potrebbe essere partita comunque!`,
        type: 'error'
      });
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleUpdateStatus = async (sugg: Suggestion, newStatus: 'implemented' | 'rejected', reason?: string) => {
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
            const newBO = {
              id: `bo-${Date.now()}`,
              title: `Proposta Community - ${new Date().toLocaleDateString('it-IT')}`,
              description: sugg.suggestion_text,
              difficulty: 'Medium',
              steps: [{ action: 'Vedi sopra per i dettagli della strategia.' }]
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

  if (!isOpen) return null;

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
                      <div className="flex items-center gap-3 mb-3">
                        <span className="px-3 py-1 bg-blue-600/20 text-blue-400 text-xs font-bold rounded-lg border border-blue-500/30 uppercase tracking-wider">
                          {sugg.civ_name}
                        </span>
                        <span className="text-sm text-gray-400 flex items-center gap-2">
                          Sezione: <span className="text-white font-medium">{sugg.section}</span>
                        </span>
                      </div>
                      
                      <div className="bg-black/50 p-4 rounded-lg border border-gray-700/50 mb-4">
                        <p className="text-gray-200 text-sm whitespace-pre-wrap leading-relaxed">{sugg.suggestion_text}</p>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-4 text-xs">
                        {sugg.source && (
                          <div className="flex items-center gap-1 text-yellow-400/80 bg-yellow-400/10 px-2 py-1 rounded">
                            <span className="font-bold">Fonte:</span> {sugg.source}
                          </div>
                        )}
                        <div className="text-gray-500">
                          <strong>Autore:</strong> {sugg.user_name || 'Anonimo'}
                        </div>
                        <div className="text-gray-500 text-blue-400/80">
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
