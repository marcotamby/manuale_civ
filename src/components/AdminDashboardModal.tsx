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
    } catch (err: any) {
      console.error('Error fetching suggestions:', err);
      setToast({ isVisible: true, message: 'Errore nel caricamento delle proposte', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchSuggestions();
    }
  }, [isOpen]);

  const handleUpdateStatus = async (sugg: Suggestion, newStatus: 'implemented' | 'rejected') => {
    try {
      if (newStatus === 'implemented') {
        let updateData: any = null;
        
        switch (sugg.section) {
          case 'caratteristiche':
            updateData = { description: sugg.suggestion_text };
            break;
          case 'bonus':
            updateData = { passiveBonuses: sugg.suggestion_text.split('\n').filter(s => s.trim() !== '') };
            break;
          case 'punti_di_forza':
            updateData = { strengths: sugg.suggestion_text.split('\n').filter(s => s.trim() !== '') };
            break;
          case 'punti_di_debolezza':
            updateData = { weaknesses: sugg.suggestion_text.split('\n').filter(s => s.trim() !== '') };
            break;
          default:
            // For complex structures, we cannot auto update safely
            break;
        }

        if (updateData) {
          const { error: civUpdateError } = await supabase
            .from('civilizations')
            .update(updateData)
            .eq('name', sugg.civ_name);
            
          if (civUpdateError) throw civUpdateError;
        }
      }

      const { error } = await supabase
        .from('suggestions')
        .update({ status: newStatus })
        .eq('id', sugg.id);

      if (error) throw error;

      setToast({
        isVisible: true,
        message: newStatus === 'implemented' ? 'Proposta segnata come risolta!' : 'Proposta rifiutata',
        type: 'success'
      });

      // Rimuovi dalla lista locale
      setSuggestions(prev => prev.filter(s => s.id !== sugg.id));
    } catch (err: any) {
      console.error('Error updating suggestion:', err);
      setToast({ isVisible: true, message: 'Errore durante l\'aggiornamento', type: 'error' });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm shadow-2xl">
      <div className="bg-[#0f1423] border border-[#D4AF37]/30 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-[0_0_40px_rgba(0,0,0,0.8)] filter drop-shadow-2xl">
        
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
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
          >
            <X size={24} />
          </button>
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
                        <CheckCircle size={18} /> Approva/Fatto
                      </button>
                      
                      <button 
                        onClick={() => handleUpdateStatus(sugg, 'rejected')}
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
