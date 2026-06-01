// Deployment trigger: 2026-04-24 10:15
import { useState, useEffect } from 'react';
import { MessageSquare, CheckCircle, XCircle, Loader2, Send, Inbox, AlertTriangle, X, ShieldCheck, Radio, Search, UserPlus, Trophy, BookOpen, Zap, Edit2, Check, Trash2, Plus, Minus } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './AuthContext';
import { useCivData } from './CivContext';
import { Toast } from './Toast';
import type { ToastType } from './Toast';
import { sendNewBuildOrderWebhook } from '../utils/discordWebhook';

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
  const { isSuperAdmin, canManageCivs, canManageBuildorders } = useAuth();
  const { refreshCivs } = useCivData();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; type: 'question' | 'answer' | 'user'; item: any } | null>(null);
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
  const [activeTab, setActiveTab] = useState<'proposte' | 'qa' | 'users' | 'pecore'>('proposte');
  const [users, setUsers] = useState<any[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [userLoading, setUserLoading] = useState(false);
  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<any[]>([]);
  const [qaLoading, setQaLoading] = useState(false);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [newUemail, setNewUemail] = useState('');
  const [editingNickname, setEditingNickname] = useState<string | null>(null);
  const [tempNickname, setTempNickname] = useState('');
  const [isSavingNickname, setIsSavingNickname] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState<string | null>(null);
  const [addSuccess, setAddSuccess] = useState(false);
  const [recentlyAddedEmails, setRecentlyAddedEmails] = useState<Set<string>>(new Set());
  const [inlineToast, setInlineToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState(false);
  const [allProfiles, setAllProfiles] = useState<any[]>([]);
  const [isRefilling, setIsRefilling] = useState<string | null>(null);
  const [perUserRefillAmounts, setPerUserRefillAmounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (isOpen) {
      fetchSuggestions();
      fetchQA();
      if (isSuperAdmin) {
        fetchUsers();
        fetchProfiles();
      }
    }
  }, [isOpen, isSuperAdmin]);

  useEffect(() => {
    if (activeTab === 'pecore') {
      fetchProfiles();
    }
  }, [activeTab]);

  const getYoutubeId = (url: string) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
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

  const fetchProfiles = async () => {
    try {
      const [profilesRes, betsRes] = await Promise.all([
        supabase.from('profiles').select('*').order('sheep_balance', { ascending: false }),
        supabase.from('user_bets').select('user_email')
      ]);

      if (profilesRes.error) throw profilesRes.error;
      
      const bettorEmails = new Set(betsRes.data?.map(b => b.user_email?.toLowerCase()) || []);
      
      // Filtriamo per mostrare solo i "pastori" (utenti che hanno scommesso almeno una volta)
      const filteredProfiles = (profilesRes.data || []).filter(p => p.email && bettorEmails.has(p.email.toLowerCase()));
      
      setAllProfiles(filteredProfiles);
    } catch (err: any) {
      console.error('Error fetching profiles:', err);
    }
  };

  const handleSheepRefill = async (email: string, amount: number, isSet: boolean = false) => {
    try {
      setIsRefilling(email);
      const profile = allProfiles.find(p => p.email === email);
      if (!profile) return;

      const newBalance = isSet ? amount : (profile.sheep_balance || 0) + amount;

      const { error } = await supabase
        .from('profiles')
        .update({ sheep_balance: newBalance })
        .eq('email', email);

      if (error) throw error;
      
      setAllProfiles(allProfiles.map(p => 
        p.email === email ? { ...p, sheep_balance: newBalance } : p
      ));
      
      setToast({ isVisible: true, message: `Bilancio aggiornato per ${profile.nickname || email}`, type: 'success' });
    } catch (err: any) {
      setToast({ isVisible: true, message: `Errore: ${err.message}`, type: 'error' });
    } finally {
      setIsRefilling(null);
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

  const fetchQA = async () => {
    try {
      setQaLoading(true);
      const { data: qData, error: qError } = await supabase
        .from('questions')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      const { data: aData, error: aError } = await supabase
        .from('answers')
        .select('*, questions(question_text, civ_id)')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (qError) throw qError;
      if (aError) throw aError;

      setQuestions(qData || []);
      setAnswers(aData || []);
    } catch (err: any) {
      setQaLoading(false);
      console.error('Error fetching QA:', err);
      setToast({ isVisible: true, message: 'Errore caricamento QA', type: 'error' });
    } finally {
      setQaLoading(false);
    }
  };

  const fetchUsers = async (silent = false) => {
    if (!isSuperAdmin) return;
    try {
      if (!silent) setUserLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('nickname', { ascending: true });

      if (error) throw error;

      console.log('👥 Users fetched for Admin:', data?.length || 0);
      setUsers(data || []);
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setUserLoading(false);
    }
  };

  const handleAddUser = async () => {
    if (!newUemail.trim() || !isSuperAdmin) return;
    try {
      const email = newUemail.trim().toLowerCase();
      // We set role: 'staff' as a baseline so they appear in the staff list persistently
      // This role grants NO permissions in AuthContext but keeps them in this list.
      const { error } = await supabase
        .from('profiles')
        .upsert({ email, role: 'staff' }, { onConflict: 'email' });

      if (error) throw error;

      setAddSuccess(true);
      setInlineToast({ message: 'Utente aggiunto allo staff', type: 'success' });
      setTimeout(() => {
        setAddSuccess(false);
        setIsAddingUser(false);
        setNewUemail('');
        setInlineToast(null);
      }, 3000);

      setRecentlyAddedEmails(prev => new Set(prev).add(email));
      await fetchUsers(true);
    } catch (err: any) {
      console.error('Error adding user:', err);
      setToast({ isVisible: true, message: 'Errore durante l\'aggiunta', type: 'error' });
    } finally {
      // Done
    }
  };

  const handleUpdateNickname = async (email: string, nickname: string) => {
    try {
      setIsSavingNickname(email);
      const { error } = await supabase
        .from('profiles')
        .update({ nickname })
        .eq('email', email);

      if (error) throw error;

      setUsers(prev => prev.map(u => u.email === email ? { ...u, nickname } : u));
      setEditingNickname(null);
      setSavedSuccess(email);
      setTimeout(() => setSavedSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error updating nickname:', err);
      setToast({ isVisible: true, message: 'Errore aggiornamento', type: 'error' });
    } finally {
      setIsSavingNickname(null);
    }
  };

  const handleToggleUserRole = async (userEmail: string, field: string, value: any) => {
    try {
      const user = users.find(u => u.email === userEmail);
      const updates: any = { [field]: value };
      
      // If we are granting a permission and the user has no functional role, 
      // upgrade them to 'editor' so they can actually access the admin dashboard.
      if (value === true && (!user?.role || user?.role === 'staff') && field !== 'is_streamer') {
        updates.role = 'editor';
      }

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('email', userEmail);

      if (error) throw error;

      setUsers(prev => prev.map(u => u.email === userEmail ? { ...u, ...updates } : u));
      setToast({ isVisible: true, message: 'Permessi aggiornati', type: 'success' });
    } catch (err: any) {
      console.error('Error updating user role:', err);
      setToast({ isVisible: true, message: 'Errore aggiornamento', type: 'error' });
    }
  };

  const handleDeleteUser = (email: string) => {
    if (!isSuperAdmin) return;
    setDeleteConfirm({ id: email, type: 'user', item: email });
  };




  const executeDeleteUser = async (email: string) => {
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          role: null,
          is_streamer: false,
          can_manage_tournaments: false,
          can_manage_civs: false,
          can_manage_buildorders: false
        })
        .eq('email', email);

      if (error) throw error;

      setDeleteSuccess(true);
      // Immediate disappearance from the list
      setUsers(prev => prev.filter(u => u.email !== email));
      
      setTimeout(() => {
        setDeleteConfirm(null);
        setDeleteSuccess(false);
        setIsDeleting(false);
      }, 1500);
    } catch (err: any) {
      console.error('Error removing user:', err);
      setIsDeleting(false);
      setInlineToast({ message: 'Errore durante la rimozione', type: 'error' });
      setTimeout(() => setInlineToast(null), 3000);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchSuggestions();
      fetchQA();
      if (isSuperAdmin) fetchUsers();
      fetchPendingNotifCount();

    }
  }, [isOpen]);

  const handleSendNotifications = async () => {
    if (pendingNotifCount === 0 || !isSuperAdmin) return;

    try {
      setIsSendingEmail(true);
      setToast({ isVisible: false, message: '', type: 'success' });

      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY || '';

      const { error: invokeError } = await supabase.functions.invoke('batch-send-notifications', {
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: {}
      });

      if (invokeError) {
        let msg = invokeError.message;
        if (invokeError instanceof Error && 'context' in invokeError) {
          try {
            const body = await (invokeError as any).context.json();
            msg = body.error || body.message || msg;
          } catch (e) {
            // Silently ignore parsing errors
          }
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
    const canManage = (sugg.section === 'build_order' && canManageBuildorders) || (sugg.section !== 'build_order' && canManageCivs);
    if (!isSuperAdmin && !canManage) return;
    try {
      let justApprovedBO: any = null;
      let targetCiv: any = null;

      if (newStatus === 'implemented') {
        const { data: currentCiv, error: fetchError } = await supabase
          .from('civilizations')
          .select('*')
          .eq('name', sugg.civ_name)
          .single();

        if (fetchError) throw fetchError;

        targetCiv = currentCiv;

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
            justApprovedBO = newBO;
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

          if (justApprovedBO && targetCiv) {
            try {
              await sendNewBuildOrderWebhook({
                civId: targetCiv.id,
                civName: targetCiv.name,
                boId: justApprovedBO.id,
                boTitle: justApprovedBO.title,
                difficulty: justApprovedBO.difficulty,
                description: justApprovedBO.description,
                map: justApprovedBO.map || '',
                bannerUrl: justApprovedBO.banner_url || ''
              });
            } catch (webhookErr) {
              console.error('Failed to trigger Discord webhook:', webhookErr);
            }
          }
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

      if (newStatus === 'implemented') {
        refreshCivs();
      }
      
      // Refresh the notification count in the Topbar immediately
      (window as any).refreshNotificationCount?.();
    } catch (err: any) {
      console.error('Error updating suggestion:', err);
      setToast({
        isVisible: true,
        message: `Errore: ${err.message || 'Aggiornamento fallito'}`,
        type: 'error'
      });
    }
  };

  const handleUpdateQAStatus = async (item: any, type: 'question' | 'answer', newStatus: 'approved' | 'rejected' | 'deleted') => {
    try {
      const table = type === 'question' ? 'questions' : 'answers';

      let error;
      if (newStatus === 'deleted') {
        const { error: delError } = await supabase
          .from(table)
          .delete()
          .eq('id', item.id);
        error = delError;
      } else {
        const { error: updError } = await supabase
          .from(table)
          .update({ status: newStatus })
          .eq('id', item.id);
        error = updError;
      }

      if (error) throw error;

      setToast({
        isVisible: true,
        message: newStatus === 'approved' ? 'Approvato con successo!' : newStatus === 'deleted' ? 'Eliminato definitivamente' : 'Rifiutato',
        type: 'success'
      });

      if (type === 'question') {
        setQuestions(prev => prev.filter(q => q.id !== item.id));
      } else {
        setAnswers(prev => prev.filter(a => a.id !== item.id));
      }

      // Refresh the notification count in the Topbar immediately
      (window as any).refreshNotificationCount?.();
    } catch (err: any) {
      console.error(`Error updating ${type} status:`, err);
      setToast({ isVisible: true, message: 'Errore nell\'operazione', type: 'error' });
    }
  };

  const { isAdmin } = useAuth();
  if (!isOpen || !isAdmin) return null;

  return (
    <div className="fixed inset-0 z-[1001] flex items-center justify-center p-2 md:p-4 bg-black/80 backdrop-blur-md shadow-2xl overflow-y-auto">
      <div className="bg-[#0f1423] border border-[#D4AF37]/30 rounded-xl md:rounded-2xl w-full max-w-4xl min-h-[50vh] max-h-[90vh] flex flex-col shadow-[0_0_40px_rgba(0,0,0,0.8)] filter drop-shadow-2xl relative overflow-hidden">

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

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 md:p-6 border-b border-[#D4AF37]/20 bg-gradient-to-r from-[#0d1424] to-[#1a1c32] rounded-t-2xl shrink-0 gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg border border-blue-500/20 text-blue-400">
              {activeTab === 'proposte' ? <Inbox size={24} /> : activeTab === 'users' ? <ShieldCheck size={24} /> : activeTab === 'pecore' ? <span className="text-2xl">🐑</span> : <MessageSquare size={24} />}
            </div>
            <div>
              <h2 className="text-lg md:text-xl font-bold text-white uppercase tracking-wider">
                {activeTab === 'proposte' ? 'Gestione Proposte' : activeTab === 'users' ? 'Gestione Permessi' : activeTab === 'pecore' ? 'Gestione Pecore' : 'Gestione Q&A'}
              </h2>
              <p className="text-[10px] md:text-xs text-gray-400">
                {activeTab === 'proposte' ? 'Revisiona i suggerimenti della community' : activeTab === 'users' ? 'Gestisci i ruoli e i permessi del team' : activeTab === 'pecore' ? 'Ricarica il saldo delle pecore agli utenti' : 'Modera le domande e risposte degli utenti'}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between md:justify-end w-full md:w-auto gap-4">
            <div className="flex bg-black/40 p-1 rounded-xl border border-white/5">
              <button
                onClick={() => setActiveTab('proposte')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'proposte' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
              >
                Proposte
                {suggestions.length > 0 && (
                  <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] rounded-full">
                    {suggestions.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('qa')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'qa' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
              >
                Q&A
                {(questions.length + answers.length) > 0 && (
                  <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-yellow-500 text-black text-[10px] rounded-full font-black">
                    {questions.length + answers.length}
                  </span>
                )}
              </button>
              {isSuperAdmin && (
                <button
                  onClick={() => setActiveTab('users')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'users' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                >
                  Permessi
                </button>
              )}
              {isSuperAdmin && (
                <button
                  onClick={() => setActiveTab('pecore')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'pecore' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                >
                  <span className="text-sm">🐑</span>
                  Pecore
                </button>
              )}

            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {isLoading || qaLoading ? (
          <div className="flex flex-col items-center justify-center h-40">
            <Loader2 className="animate-spin text-blue-400 mb-4" size={32} />
            <p className="text-gray-400">Caricamento in corso...</p>
          </div>
        ) : activeTab === 'proposte' ? (
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 custom-scrollbar">
            {suggestions.length === 0 ? (
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
                        {((sugg.section === 'build_order' && canManageBuildorders) || (sugg.section !== 'build_order' && canManageCivs)) && (
                          <button
                            onClick={() => handleUpdateStatus(sugg, 'implemented')}
                            className="flex-1 md:flex-none flex items-center gap-2 px-4 py-2 bg-green-600/20 hover:bg-green-600/40 text-green-400 rounded-lg border border-green-500/30 transition-colors font-medium text-sm"
                            title="Segna come completata"
                          >
                            <CheckCircle size={18} /> Approva
                          </button>
                        )}

                        {((sugg.section === 'build_order' && canManageBuildorders) || (sugg.section !== 'build_order' && canManageCivs)) && (
                          <button
                            onClick={() => setRejectionModalSugg(sugg)}
                            className="flex-1 md:flex-none flex items-center gap-2 px-4 py-2 bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded-lg border border-red-500/30 transition-colors font-medium text-sm"
                            title="Rifiuta proposta"
                          >
                            <XCircle size={18} /> Scarta
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : activeTab === 'users' && isSuperAdmin ? (
          <div className="flex-1 flex flex-col min-h-0 bg-black/20">
            {/* Permessi Management Toolbar */}
            <div className="p-4 md:p-6 border-b border-white/5 space-y-4">
              <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative w-full md:w-96">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Cerca per email o nickname..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:border-blue-500 outline-none transition-all"
                  />
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                  {isAddingUser ? (
                    <div className="flex gap-2 w-full animate-in slide-in-from-right-4 duration-300">
                      <input
                        type="email"
                        autoFocus
                        placeholder="Inserisci email..."
                        value={newUemail}
                        onChange={(e) => setNewUemail(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddUser()}
                        className="flex-1 bg-blue-500/10 border border-blue-500/30 rounded-xl px-4 py-2 text-sm text-white outline-none focus:border-blue-400"
                      />
                      <button
                        onClick={handleAddUser}
                        disabled={!newUemail.trim() || addSuccess}
                        className={`px-4 py-2 ${addSuccess ? 'bg-green-600' : 'bg-blue-600 hover:bg-blue-500'} text-white rounded-xl font-bold text-xs uppercase disabled:opacity-50 transition-all flex items-center gap-2`}
                      >
                        {addSuccess ? <Check size={14} /> : null}
                        {addSuccess ? 'Aggiunto' : 'Aggiungi'}
                      </button>
                      <button
                        onClick={() => { setIsAddingUser(false); setNewUemail(''); }}
                        className="p-2 text-gray-500 hover:text-white"
                      >
                        <X size={20} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setIsAddingUser(true)}
                      className="w-full md:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded-xl border border-blue-500/30 transition-all font-bold text-xs uppercase"
                    >
                      <UserPlus size={16} /> Aggiungi Utente
                    </button>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-4 text-[10px] uppercase font-bold text-gray-500 border-t border-white/5 pt-4">
                <span className="flex items-center gap-1.5"><Trophy size={14} className="text-yellow-500" /> Tornei</span>
                <span className="flex items-center gap-1.5"><BookOpen size={14} className="text-blue-400" /> Civiltà</span>
                <span className="flex items-center gap-1.5"><Zap size={14} className="text-orange-400" /> Build Orders</span>
                <span className="flex items-center gap-1.5"><Radio size={14} className="text-pink-400" /> Streamer</span>
              </div>
            </div>

            {/* Users List */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
              {inlineToast && (
                <div className={`mb-4 p-3 rounded-xl border flex items-center gap-2 animate-in slide-in-from-top duration-300 ${
                  inlineToast.type === 'success' 
                    ? 'bg-green-500/10 border-green-500/20 text-green-400' 
                    : 'bg-red-500/10 border-red-500/20 text-red-400'
                }`}>
                  {inlineToast.type === 'success' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
                  <span className="text-xs font-bold uppercase">{inlineToast.message}</span>
                </div>
              )}
              {userLoading ? (
                <div className="flex flex-col items-center justify-center h-60">
                  <Loader2 className="animate-spin text-blue-400 mb-2" size={32} />
                  <p className="text-gray-400 text-sm">Caricamento...</p>
                </div>
              ) : (
                <div className="space-y-8">
                  {/* List Section: Staff Attivo or Search Results */}
                  <div>
                    <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                      {userSearch ? 'Risultati Ricerca' : 'Staff Attivo'}
                      <span className="h-px flex-1 bg-white/5 ml-2" />
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {users
                        .filter(u => {
                          const email = u.email?.toLowerCase();
                          const matchSearch = !userSearch ||
                            u.email?.toLowerCase().includes(userSearch.toLowerCase()) ||
                            u.nickname?.toLowerCase().includes(userSearch.toLowerCase());

                          // Define staff fallbacks to match AuthContext
                          const hardcodedStaff = [
                            'marcotamby@gmail.com', 'marco.tamborrino.94@gmail.com',
                            'alessio.bella97@gmail.com', 'contattodisparta@gmail.com',
                            'cani.vincenzo@gmail.com', 'dadduedo@gmail.com', 'djalfredoneservice@gmail.com'
                          ];

                          // If no search, show staff OR recently added emails
                          if (!userSearch) {
                            return u.role === 'editor' || 
                                   u.role === 'admin' || 
                                   u.role === 'staff' || 
                                   u.is_streamer === true || 
                                   u.can_manage_tournaments === true ||
                                   u.can_manage_civs === true ||
                                   u.can_manage_buildorders === true ||
                                   recentlyAddedEmails.has(email || '') ||
                                   (email && hardcodedStaff.includes(email));
                          }
                          return matchSearch;
                        })
                        .sort((a, b) => {
                          // Sort staff: admins first, then editors
                          if (a.role === 'admin') return -1;
                          if (b.role === 'admin') return 1;
                          return 0;
                        })
                        .map(u => (
                          <div key={u.id} className={`bg-white/[0.03] border rounded-2xl p-5 flex flex-col gap-4 group hover:bg-white/[0.05] transition-all ${u.role === 'admin' ? 'border-yellow-500/20' : 'border-white/5'}`}>
                            <div className="flex items-center gap-4">
                              <div className={`w-12 h-12 rounded-full flex items-center justify-center border text-xl font-bold shrink-0 overflow-hidden ${u.role === 'admin' ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-500' : 'bg-blue-600/10 border-blue-500/20 text-blue-400'}`}>
                                {u.avatar_url ? (
                                  <img 
                                    src={u.avatar_url} 
                                    alt={u.nickname || u.email} 
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).style.display = 'none';
                                      (e.target as HTMLImageElement).parentElement!.innerHTML = `<span>${u.nickname?.[0]?.toUpperCase() || u.email?.[0]?.toUpperCase() || 'U'}</span>`;
                                    }}
                                  />
                                ) : (
                                  <span>{u.nickname?.[0]?.toUpperCase() || u.email?.[0]?.toUpperCase() || 'U'}</span>
                                )}
                              </div>
                              <div className="flex flex-col min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  {editingNickname === u.email ? (
                                    <div className="flex items-center gap-2">
                                      <input
                                        autoFocus
                                        className="bg-black/60 border border-blue-500/50 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-yellow-500 transition-all"
                                        value={tempNickname}
                                        disabled={isSavingNickname === u.email}
                                        onChange={(e) => setTempNickname(e.target.value)}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') handleUpdateNickname(u.email, tempNickname);
                                          if (e.key === 'Escape') setEditingNickname(null);
                                        }}
                                        onBlur={() => { if (!isSavingNickname) setEditingNickname(null); }}
                                      />
                                      <button
                                        type="button"
                                        onMouseDown={(e) => {
                                          e.preventDefault();
                                          handleUpdateNickname(u.email, tempNickname);
                                        }}
                                        disabled={isSavingNickname === u.email}
                                        className="text-green-500 hover:text-green-400 disabled:opacity-50"
                                      >
                                        {isSavingNickname === u.email ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-2 group/nick relative">
                                      <span className={`text-base md:text-lg font-bold text-white truncate leading-tight transition-colors ${savedSuccess === u.email ? 'text-green-400' : ''}`}>
                                        {u.nickname || 'Senza Nickname'}
                                      </span>
                                      {savedSuccess === u.email && <CheckCircle size={12} className="text-green-400 animate-in zoom-in duration-300" />}
                                      <button
                                        onClick={() => { setEditingNickname(u.email); setTempNickname(u.nickname || ''); }}
                                        className="opacity-0 group-hover/nick:opacity-100 p-1 text-gray-500 hover:text-blue-400 transition-all"
                                        title="Modifica Nickname"
                                      >
                                        <Edit2 size={12} />
                                      </button>
                                    </div>
                                  )}
                                  {u.role === 'admin' && <span className="text-[9px] px-1.5 py-0.5 bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 rounded font-black uppercase">Owner</span>}
                                  {u.role === 'editor' && <span className="text-[9px] px-1.5 py-0.5 bg-blue-500/10 text-blue-500 border border-blue-500/20 rounded font-black uppercase">Editor</span>}
                                </div>
                                <span className="text-xs md:text-sm text-gray-500 truncate block">{u.email}</span>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-[10px] font-bold text-blue-400/70 border border-blue-500/20 px-1.5 py-0.5 rounded bg-blue-500/5">{u.rank || 'Unranked'}</span>
                                </div>
                              </div>
                            </div>

                            <div className="pt-3 border-t border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-3">
                              <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] select-none">Configurazione Permessi</span>
                              {/* Unified Permissions Group */}
                              <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/5 shadow-inner">
                                {/* Tournaments */}
                                <button
                                  onClick={() => handleToggleUserRole(u.email, 'can_manage_tournaments', !u.can_manage_tournaments)}
                                  className={`w-9 h-9 flex items-center justify-center rounded-lg transition-all ${u.can_manage_tournaments ? 'bg-yellow-500 text-black shadow-[0_0_15px_rgba(234,179,8,0.3)]' : 'bg-gray-800/50 text-gray-500 hover:text-white'}`}
                                  title="Gestione Tornei"
                                >
                                  <Trophy size={16} />
                                </button>

                                {/* Civs */}
                                <button
                                  onClick={() => handleToggleUserRole(u.email, 'can_manage_civs', !u.can_manage_civs)}
                                  className={`w-9 h-9 flex items-center justify-center rounded-lg transition-all ${u.can_manage_civs ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.3)]' : 'bg-gray-800/50 text-gray-500 hover:text-white'}`}
                                  title="Gestione Civiltà"
                                >
                                  <BookOpen size={16} />
                                </button>

                                {/* Build Orders */}
                                <button
                                  onClick={() => handleToggleUserRole(u.email, 'can_manage_buildorders', !u.can_manage_buildorders)}
                                  className={`w-9 h-9 flex items-center justify-center rounded-lg transition-all ${u.can_manage_buildorders ? 'bg-orange-500 text-white shadow-[0_0_15px_rgba(249,115,22,0.3)]' : 'bg-gray-800/50 text-gray-500 hover:text-white'}`}
                                  title="Gestione Build Orders"
                                >
                                  <Zap size={16} />
                                </button>

                                <div className="w-px h-4 bg-white/10 mx-1" />

                                {/* Streamer Toggle */}
                                <button
                                  onClick={() => handleToggleUserRole(u.email, 'is_streamer', !u.is_streamer)}
                                  className={`w-9 h-9 flex items-center justify-center rounded-lg transition-all ${u.is_streamer ? 'bg-pink-600 text-white shadow-[0_0_15px_rgba(219,39,119,0.3)]' : 'bg-gray-800/50 text-gray-500 hover:text-pink-400'}`}
                                  title={u.is_streamer ? 'Rimuovi Streamer' : 'Segna come Streamer'}
                                >
                                  <Radio size={16} />
                                </button>
                                 {isSuperAdmin && (
                                  <>
                                    <div className="w-px h-4 bg-white/10 mx-1" />
                                    <button
                                      onClick={() => handleDeleteUser(u.email)}
                                      className="w-9 h-9 flex items-center justify-center rounded-lg bg-red-500/10 text-red-500/50 hover:text-red-500 hover:bg-red-500/20 transition-all"
                                      title="Elimina Utente"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </>
                                 )}
                               </div>
                            </div>
                          </div>
                        ))}

                      {/* Empty State */}
                      {!userSearch && users.filter(u => u.role === 'editor' || u.role === 'admin' || u.is_streamer === true).length === 0 && (
                        <div className="col-span-full py-20 text-center bg-white/[0.02] border border-dashed border-white/5 rounded-3xl">
                          <ShieldCheck size={40} className="mx-auto text-gray-700 mb-4 opacity-20" />
                          <p className="text-gray-500 text-sm italic">Nessun membro dello staff assegnato.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : activeTab === 'pecore' && isSuperAdmin ? (
          <div className="flex-1 flex flex-col min-h-0 bg-[#0d1424]">
            {/* Pecore Tab Content */}
            <div className="p-4 md:p-6 border-b border-white/5 space-y-4 bg-gradient-to-b from-blue-500/5 to-transparent">
              <div className="flex items-center justify-between gap-4">
                <div className="relative w-80">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-cyan-400" />
                  <input
                    type="text"
                    placeholder="Cerca utente per email..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-xs text-white focus:border-cyan-500 outline-none transition-all placeholder:text-gray-600"
                  />
                </div>
                <div className="flex items-center gap-3 bg-cyan-500/5 px-4 py-2.5 rounded-xl border border-cyan-500/10 shrink-0">
                  <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest">Totale Pastori:</span>
                  <span className="text-sm font-black text-white">{allProfiles.length}</span>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {allProfiles
                  .filter(p => !userSearch || p.email?.toLowerCase().includes(userSearch.toLowerCase()) || p.nickname?.toLowerCase().includes(userSearch.toLowerCase()))
                  .map(p => (
                  <div key={p.email} className="bg-white/[0.03] border border-white/5 rounded-2xl p-5 flex flex-col gap-4 hover:border-cyan-500/30 transition-all group">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-cyan-500/10 flex items-center justify-center text-cyan-400 font-bold border border-cyan-500/20 group-hover:scale-110 transition-transform overflow-hidden">
                        {p.avatar_url ? (
                          <img 
                            src={p.avatar_url} 
                            alt={p.nickname || p.email} 
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              // Fallback if image fails to load
                              (e.target as HTMLImageElement).style.display = 'none';
                              (e.target as HTMLImageElement).parentElement!.innerHTML = `<span>${p.nickname?.[0] || p.email?.[0]}</span>`;
                            }}
                          />
                        ) : (
                          <span>{p.nickname?.[0] || p.email?.[0]}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-bold truncate">{p.nickname || 'Anonimo'}</p>
                        <p className="text-[10px] text-gray-500 truncate">{p.email}</p>
                      </div>
                    </div>
                    
                    <div className="bg-black/40 p-4 rounded-xl border border-white/5 flex flex-col items-stretch gap-4 w-full">
                      <div className="flex items-center justify-between gap-2 w-full">
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xl">🐑</span>
                          <span className="text-xl font-black text-white">{p.sheep_balance || 0}</span>
                        </div>
                        <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10 shrink-0 ml-auto">
                          <button
                            onClick={() => {
                              const current = perUserRefillAmounts[p.email] ?? 100;
                              setPerUserRefillAmounts({ ...perUserRefillAmounts, [p.email]: Math.max(0, current - 10) });
                            }}
                            className="p-1.5 hover:bg-white/10 rounded-lg text-cyan-400 transition-colors"
                          >
                            <Minus size={12} />
                          </button>
                           <input
                            type="number"
                            value={perUserRefillAmounts[p.email] ?? 100}
                            onChange={(e) => setPerUserRefillAmounts({ ...perUserRefillAmounts, [p.email]: Number(e.target.value) })}
                            className="w-12 bg-transparent text-xs text-white font-bold text-center outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            title="Importo personalizzato"
                          />
                          <button
                            onClick={() => {
                              const current = perUserRefillAmounts[p.email] ?? 100;
                              setPerUserRefillAmounts({ ...perUserRefillAmounts, [p.email]: current + 10 });
                            }}
                            className="p-1.5 hover:bg-white/10 rounded-lg text-cyan-400 transition-colors"
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => handleSheepRefill(p.email, perUserRefillAmounts[p.email] ?? 100)}
                        disabled={isRefilling === p.email}
                        className="w-full flex items-center justify-center gap-2 py-3 bg-cyan-500/10 text-cyan-400 rounded-xl text-xs font-black border border-cyan-500/20 hover:bg-cyan-500/20 transition-all uppercase tracking-widest active:scale-95 group/btn"
                      >
                        {isRefilling === p.email ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <>
                            <Zap size={14} className="group-hover/btn:fill-cyan-400 transition-all" />
                            <span>Ricarica +{perUserRefillAmounts[p.email] ?? 100}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Q&A Tab Content */
          <div className="space-y-8 overflow-y-auto px-4 md:px-6 py-4 max-h-[70vh]">
            {/* Pending Questions */}
            <div className="space-y-4">
              <h3 className="text-sm font-black text-yellow-500 uppercase tracking-widest flex items-center gap-3">
                <MessageSquare size={16} className="text-yellow-500 shrink-0" /> Domande da Approvare ({questions.length})
              </h3>
              {questions.length === 0 ? (
                <p className="text-gray-500 text-sm italic py-4">Nessuna domanda in sospeso.</p>
              ) : (
                <div className="grid gap-4">
                  {questions.map(q => (
                    <div key={q.id} className="glass p-5 rounded-xl border border-white/5 space-y-4">
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="px-2 py-0.5 bg-yellow-500/10 text-yellow-500 text-[10px] font-black rounded border border-yellow-500/20 uppercase">{q.civ_id}</span>
                            <span className="text-xs font-bold text-white">{q.user_nickname}</span>
                            <span className="text-[10px] text-gray-500">({q.user_rank})</span>
                          </div>
                          <p className="text-gray-200 text-sm">{q.question_text}</p>
                          <div className="flex flex-wrap gap-3 mt-6 pt-5 border-t border-white/5">
                            {canManageCivs && (
                              <>
                                <button 
                                  onClick={() => handleUpdateQAStatus(q, 'question', 'approved')} 
                                  className="flex items-center gap-2 px-5 py-2.5 bg-green-500/10 text-green-500 rounded-xl border border-green-500/20 hover:bg-green-500/20 hover:scale-105 transition-all text-xs font-black uppercase tracking-wider" 
                                  title="Approva"
                                >
                                  <CheckCircle size={18} />
                                  <span>Approva</span>
                                </button>
                                <button 
                                  onClick={() => handleUpdateQAStatus(q, 'question', 'rejected')} 
                                  className="flex items-center gap-2 px-5 py-2.5 bg-red-500/10 text-red-500 rounded-xl border border-red-500/20 hover:bg-red-500/20 hover:scale-105 transition-all text-xs font-black uppercase tracking-wider" 
                                  title="Rifiuta"
                                >
                                  <XCircle size={18} />
                                  <span>Rifiuta</span>
                                </button>
                                <button 
                                  onClick={() => setDeleteConfirm({ id: q.id, type: 'question', item: q })} 
                                  className="flex items-center gap-2 px-4 py-2.5 bg-white/5 text-gray-400 rounded-xl border border-white/5 hover:bg-red-500/20 hover:text-red-500 hover:border-red-500/30 transition-all text-xs font-bold uppercase ml-auto" 
                                  title="Elimina"
                                >
                                  <Trash2 size={18} />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pending Answers */}
            <div className="space-y-4">
              <h3 className="text-sm font-black text-blue-400 uppercase tracking-widest flex items-center gap-3">
                <Send size={16} className="text-blue-400 shrink-0" /> Risposte da Approvare ({answers.length})
              </h3>
              {answers.length === 0 ? (
                <p className="text-gray-500 text-sm italic py-4">Nessuna risposta in sospeso.</p>
              ) : (
                <div className="grid gap-4">
                  {answers.map(a => (
                    <div key={a.id} className="glass p-5 rounded-xl border border-white/5 space-y-4">
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex-1">
                          <div className="bg-white/5 p-3 rounded-lg border border-white/5 mb-3">
                            <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">In risposta a:</p>
                            <p className="text-xs text-gray-400 italic line-clamp-1">"{a.questions?.question_text}"</p>
                          </div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 text-[10px] font-black rounded border border-blue-500/20 uppercase">{a.questions?.civ_id}</span>
                            <span className="text-xs font-bold text-white">{a.user_nickname}</span>
                            <span className="text-[10px] text-gray-500">({a.user_rank})</span>
                          </div>
                          <p className="text-gray-200 text-sm">{a.answer_text}</p>
                          
                          <div className="flex flex-wrap gap-3 mt-6 pt-5 border-t border-white/5">
                            {canManageCivs && (
                              <>
                                <button 
                                  onClick={() => handleUpdateQAStatus(a, 'answer', 'approved')} 
                                  className="flex items-center gap-2 px-5 py-2.5 bg-green-500/10 text-green-500 rounded-xl border border-green-500/20 hover:bg-green-500/20 hover:scale-105 transition-all text-xs font-black uppercase tracking-wider" 
                                  title="Approva"
                                >
                                  <CheckCircle size={18} />
                                  <span>Approva</span>
                                </button>
                                <button 
                                  onClick={() => handleUpdateQAStatus(a, 'answer', 'rejected')} 
                                  className="flex items-center gap-2 px-5 py-2.5 bg-red-500/10 text-red-500 rounded-xl border border-red-500/20 hover:bg-red-500/20 hover:scale-105 transition-all text-xs font-black uppercase tracking-wider" 
                                  title="Rifiuta"
                                >
                                  <XCircle size={18} />
                                  <span>Rifiuta</span>
                                </button>
                                <button 
                                  onClick={() => setDeleteConfirm({ id: a.id, type: 'answer', item: a })} 
                                  className="flex items-center gap-2 px-4 py-2.5 bg-white/5 text-gray-400 rounded-xl border border-white/5 hover:bg-red-500/20 hover:text-red-500 hover:border-red-500/30 transition-all text-xs font-bold uppercase ml-auto" 
                                  title="Elimina"
                                >
                                  <Trash2 size={18} />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

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
      {/* Custom Deletion Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
          <div className={`bg-[#1a1c23] border p-8 rounded-3xl max-w-sm w-full shadow-2xl animate-in zoom-in duration-300 text-center transition-colors ${deleteSuccess ? 'border-green-500/30' : 'border-red-500/30'}`}>
            {deleteSuccess ? (
              <div className="py-4 animate-in zoom-in duration-300">
                <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-500/20">
                  <CheckCircle className="text-green-500" size={32} />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Rimosso con Successo</h3>
                <p className="text-sm text-gray-400">L'azione è stata completata correttamente.</p>
              </div>
            ) : (
              <>
                <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/20">
                  <AlertTriangle className="text-red-500" size={32} />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">
                  {deleteConfirm.type === 'user' ? 'Rimuovi dallo Staff' : 'Conferma Eliminazione'}
                </h3>
                <p className="text-sm text-gray-400 mb-8 leading-relaxed">
                  {deleteConfirm.type === 'user' 
                    ? `Sei sicuro di voler rimuovere l'utente ${deleteConfirm.item} dallo staff? Perderà ogni permesso di gestione.`
                    : `Sei sicuro di voler eliminare definitivamente questa ${deleteConfirm.type === 'question' ? 'domanda' : 'risposta'}?`}
                </p>

                <div className="flex gap-3">
                  <button
                    onClick={() => setDeleteConfirm(null)}
                    disabled={isDeleting}
                    className="flex-1 px-4 py-2.5 border border-white/10 text-gray-400 rounded-xl hover:bg-white/5 transition-colors font-bold text-xs uppercase disabled:opacity-50"
                  >
                    Annulla
                  </button>
                  <button
                    onClick={async () => {
                      const item = deleteConfirm.item;
                      const type = deleteConfirm.type;
                      if (type === 'user') {
                        executeDeleteUser(item);
                      } else {
                        setDeleteConfirm(null);
                        handleUpdateQAStatus(item, type, 'deleted');
                      }
                    }}
                    disabled={isDeleting}
                    className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl transition-all font-bold text-xs uppercase shadow-lg shadow-red-600/20 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isDeleting ? <Loader2 size={14} className="animate-spin" /> : (deleteConfirm.type === 'user' ? 'Rimuovi Ora' : 'Elimina Ora')}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <Toast
        isVisible={toast.isVisible}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ ...toast, isVisible: false })}
      />
    </div>
  );
}
