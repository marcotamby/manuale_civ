import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCivData } from './CivContext';
import { useAuth } from './AuthContext';
import { usePresence } from './PresenceContext';
import type { Unit } from '../data/aoe4Data';
import { UnitGrid } from './UnitGrid';
import { MatchupsTable } from './MatchupsTable';
import { Shield, Sword, Zap, Map, BarChart2, Edit, ChevronDown, ChevronUp, Play, ChevronRight, Clock, MessageSquare, Send, UserCircle, CheckCircle, XCircle, X, Loader2, Trash2, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { ResourceText } from './ResourceText';
import { ExternalLink } from 'lucide-react';
import { SocialProofPopup } from './SocialProofPopup';
import { RANK_ICONS } from './ProfileModal';
import { EditSuggestionForm } from './EditSuggestionForm';

const getYoutubeId = (url: string) => {
  if (!url) return null;
  const match = url.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
};

type Tab = 'caratteristiche' | 'units' | 'buildorders' | 'matchups' | 'video' | 'domande' | 'proponi' | 'admin-edit';

interface CivViewProps {
  civId: string;
  onSelectUnit: (unit: Unit) => void;
}

const getRankIcon = (rank: string | undefined) => {
  if (!rank) return null;
  if (RANK_ICONS[rank]) return RANK_ICONS[rank];
  // Case-insensitive fallback
  return Object.entries(RANK_ICONS).find(
    ([key]) => key.toLowerCase() === rank.toLowerCase()
  )?.[1];
};

export function CivView({ civId, onSelectUnit }: CivViewProps) {
  const { civilizations } = useCivData();
  const { isAdmin, isSuperAdmin, user, toggleFavorite, openLoginModal } = useAuth();
  const { updateActivity, activeAdmins: _activeAdmins } = usePresence();
  const { tab } = useParams<{ tab?: string }>();
  const navigate = useNavigate();

  const validTabs: Tab[] = ['caratteristiche', 'units', 'buildorders', 'matchups', 'video', 'domande', 'proponi', 'admin-edit'];
  const activeTab: Tab = (validTabs.includes(tab as Tab)) ? (tab as Tab) : 'caratteristiche';
  const [activeAge, setActiveAge] = useState<1 | 2 | 3 | 4>(() => {
    return (Number(sessionStorage.getItem('activeAge')) as 1 | 2 | 3 | 4) || 1;
  });

  const handleTabChange = (newTab: Tab) => {
    navigate(`/civ/${civId}/${newTab}`);
  };

  const handleAgeChange = (age: number) => {
    setActiveAge(age as 1 | 2 | 3 | 4);
    sessionStorage.setItem('activeAge', age.toString());
  };

  const civ = civilizations.find(c => c.id === civId);
  const [expandedBOs, setExpandedBOs] = useState<Set<string>>(new Set());
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string, type: 'question' | 'answer' } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);


  useEffect(() => {

    // Update presence to viewing this civ
    updateActivity({ type: 'viewing', civId });

    // Mark as read for this specific civ (Logged in users only)
    if (user?.email && civ) {
      const lastSeenKey = `lastSeenCounts_${user.email}`;
      const lastSeenData = JSON.parse(localStorage.getItem(lastSeenKey) || '{}');

      const currentBO = civ.buildOrders?.length || 0;
      const currentVideo = civ.videos?.length || 0;

      // Only update if counts have changed
      const stored = lastSeenData[civId] || { bo: 0, video: 0 };
      const storedBO = typeof stored.bo === 'number' ? stored.bo : 0;
      const storedVideo = typeof stored.video === 'number' ? stored.video : 0;

      if (storedBO !== currentBO || storedVideo !== currentVideo) {
        lastSeenData[civId] = { bo: currentBO, video: currentVideo };
        localStorage.setItem(lastSeenKey, JSON.stringify(lastSeenData));

        // Refresh topbar count
        (window as any).refreshNotificationCount?.();
      }
    }

    return () => {
      // Reset activity to idle when leaving the view
      updateActivity({ type: 'idle' });
    };
  }, [civId, user?.email, !!civ]);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 2);
    }
  };

  useEffect(() => {
    fetchQA();

    // Real-time subscription for questions and answers
    const channel = supabase
      .channel(`qa-${civId}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'questions',
        filter: `civ_id=eq.${civId}`
      }, () => fetchQA())
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'answers'
      }, () => fetchQA())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [civId]);

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, []);


  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'caratteristiche', label: 'Caratteristiche', icon: <Shield size={16} /> },
    { id: 'units', label: 'Unità & Landmarks', icon: <Sword size={16} /> },
    { id: 'buildorders', label: 'Build Orders', icon: <Map size={16} /> },
    { id: 'matchups', label: 'Matchups', icon: <BarChart2 size={16} /> },
    { id: 'video', label: 'Video Guide', icon: <Play size={16} /> },
    { id: 'domande', label: 'Domande', icon: <MessageSquare size={16} /> },
    { id: 'proponi', label: 'Proponi Modifica', icon: <Edit size={16} /> },
  ];

  // Q&A State
  const [questions, setQuestions] = useState<any[]>([]);
  const [qaLoading, setQaLoading] = useState(false);
  const [questionText, setQuestionText] = useState('');
  const [replyTo, setReplyTo] = useState<{ questionId: string, parentId?: string } | null>(null);
  const [answerText, setAnswerText] = useState('');
  const [qaMessage, setQaMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

  const fetchQA = async () => {
    try {
      setQaLoading(true);
      const { data, error } = await supabase
        .from('questions')
        .select(`
          *,
          answers:answers(*)
        `)
        .eq('civ_id', civId)
        .eq('status', 'approved')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Build threaded structure
      const filteredData = data.map(q => {
        const allAnswers = (q.answers || [])
          .filter((a: any) => a.status === 'approved')
          .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

        // Helper to find children
        const getThread = (parentId: string | null): any[] => {
          return allAnswers
            .filter((a: any) => a.parent_id === parentId)
            .map((a: any) => ({
              ...a,
              replies: getThread(a.id)
            }));
        };

        return {
          ...q,
          answers: getThread(null)
        };
      });

      setQuestions(filteredData);
    } catch (err) {
      console.error('Error fetching Q&A:', err);
    } finally {
      setQaLoading(true); // Small delay to prevent layout shift
      setTimeout(() => setQaLoading(false), 200);
    }
  };

  const handleDeleteQA = (id: string, type: 'question' | 'answer') => {
    if (!isAdmin) return;
    setDeleteConfirm({ id, type });
  };

  const executeDeleteQA = async () => {
    if (!deleteConfirm || isDeleting) return;
    
    setIsDeleting(true);
    const { id, type } = deleteConfirm;

    try {
      const { error } = await supabase
        .from(type === 'question' ? 'questions' : 'answers')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setDeleteConfirm(null);
      fetchQA();
    } catch (err) {
      console.error(`Error deleting ${type}:`, err);
      alert('Errore durante l\'eliminazione');
    } finally {
      setIsDeleting(false);
    }
  };

  // Clear inputs and messages when user changes (logout or switch)
  useEffect(() => {
    setQuestionText('');
    setAnswerText('');
    setReplyTo(null);
    setQaMessage(null);
  }, [user?.email]);

  // Removed the old useEffect for fetching Q&A, now handled by the subscription useEffect
  // useEffect(() => {
  //   if (activeTab === 'domande') {
  //     fetchQA();
  //   }
  // }, [activeTab, civId]);

  const validateProfile = () => {
    if (!user?.nickname || !user?.rank || user.rank === 'Unranked') {
      setQaMessage({ 
        text: 'Per inviare domande o risposte occorre completare il profilo con username e rank.', 
        type: 'error' 
      });
      return false;
    }
    return true;
  };

  const handleQuestionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!validateProfile()) return;
    if (!questionText.trim()) return;

    try {
      const { error } = await supabase
        .from('questions')
        .insert([{
          civ_id: civId,
          user_id: user.email,
          user_nickname: user.nickname,
          user_rank: user.rank,
          question_text: questionText.trim(),
          status: 'pending'
        }]);

      if (error) throw error;
      setQuestionText('');
      
      const msg = isAdmin 
        ? 'Domanda pubblicata!' 
        : 'La tua domanda è in fase di approvazione da parte degli amministratori';
      
      setQaMessage({ text: msg, type: 'success' });
      if (isAdmin) fetchQA();
    } catch (err) {
      console.error('Error submitting question:', err);
      setQaMessage({ text: 'Errore durante l\'invio della domanda.', type: 'error' });
    }
  };

  const handleAnswerSubmit = async (questionId: string, parentId?: string) => {
    if (!user) return;
    if (!validateProfile()) return;
    if (!answerText.trim()) return;

    try {
      // Auto-approval logic:
      // 1. If admin -> approved
      // 2. If the user already has an approved message in this specific question thread -> approved
      let targetStatus = 'pending';
      
      if (isAdmin) {
        targetStatus = 'approved';
      } else {
        // Check if user has any approved activity in this question
        const { data: existingApproved } = await supabase
          .from('answers')
          .select('id')
          .eq('question_id', questionId)
          .eq('user_id', user.email)
          .eq('status', 'approved')
          .limit(1);
          
        const { data: existingQApproved } = await supabase
          .from('questions')
          .select('id')
          .eq('id', questionId)
          .eq('user_id', user.email)
          .eq('status', 'approved')
          .limit(1);

        if ((existingApproved && existingApproved.length > 0) || (existingQApproved && existingQApproved.length > 0)) {
          targetStatus = 'approved';
        }
      }

      const { error } = await supabase
        .from('answers')
        .insert([{
          question_id: questionId,
          parent_id: parentId || null,
          user_id: user.email,
          user_nickname: user.nickname,
          user_rank: user.rank,
          answer_text: answerText.trim(),
          status: targetStatus
        }]);

      if (error) throw error;
      setAnswerText('');
      setReplyTo(null);
      
      const msg = targetStatus === 'approved' 
        ? 'Risposta pubblicata!' 
        : 'La tua risposta è in fase di approvazione';
        
      setQaMessage({ text: msg, type: 'success' });
      if (targetStatus === 'approved') fetchQA();
    } catch (err) {
      console.error('Error submitting answer:', err);
      setQaMessage({ text: 'Errore durante l\'invio della risposta.', type: 'error' });
    }
  };

  // Helper function to render answers recursively within the component scope
  const renderAnswers = (answers: any[], questionId: string, depth = 0) => {
    if (!answers || answers.length === 0) return null;

    return answers.map((a: any) => (
      <div key={a.id} className={`${depth > 0 ? 'ml-6 border-l border-white/5 pl-4' : ''} space-y-3`}>
        <div className="glass p-4 rounded-xl border border-white/5 bg-white/[0.01] group/a">
          <div className="flex items-start gap-3">
            <div className="shrink-0">
              <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                {a.user_rank && getRankIcon(a.user_rank) ? (
                  <img src={getRankIcon(a.user_rank) || ''} alt={a.user_rank} className="w-5 h-5 object-contain" />
                ) : (
                  <UserCircle size={18} className="text-gray-600" />
                )}
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold text-blue-400 uppercase tracking-tight select-text">{a.user_nickname}</span>
                <span className="text-[9px] text-gray-500 font-bold px-1 py-0.5 bg-white/5 rounded border border-white/5 uppercase select-none">{a.user_rank}</span>
                <span className="text-[9px] text-gray-600 select-none">{new Date(a.created_at).toLocaleDateString('it-IT')}</span>
                {isAdmin && (
                  <button 
                    onClick={() => handleDeleteQA(a.id, 'answer')}
                    className="ml-auto opacity-0 group-hover/a:opacity-100 p-1 text-red-500 hover:bg-red-500/10 rounded transition-all"
                    title="Elimina risposta"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
              <p className="text-gray-300 text-sm leading-relaxed select-text">{a.answer_text}</p>
              
              <div className="flex justify-end pt-2">
                 <button 
                   onClick={() => {
                     if (replyTo && replyTo.parentId === a.id) {
                       setReplyTo(null);
                     } else {
                       setReplyTo({ questionId, parentId: a.id });
                       setAnswerText('');
                     }
                   }}
                   className={`flex items-center gap-1.5 px-3 py-1 rounded text-[10px] font-bold transition-all ${
                     replyTo && replyTo.parentId === a.id 
                       ? 'bg-white/10 text-white' 
                       : 'text-gray-500 hover:text-white hover:bg-white/5'
                   }`}
                 >
                   <MessageSquare size={12} />
                   {replyTo && replyTo.parentId === a.id ? 'Annulla' : 'Rispondi'}
                 </button>
              </div>

              {/* Nested Reply Input */}
              {replyTo && replyTo.parentId === a.id && (
                <div className="mt-3 pt-3 border-t border-white/5 space-y-2 animate-in fade-in slide-in-from-top-1 duration-200 outline-none select-none">
                  <textarea
                    value={answerText}
                    onChange={(e) => setAnswerText(e.target.value)}
                    placeholder="Scrivi una risposta..."
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white placeholder:text-gray-600 focus:border-blue-500/50 outline-none transition-all text-xs min-h-[60px] resize-y"
                    autoFocus
                  />
                  <div className="flex justify-end">
                    <button
                      onClick={() => handleAnswerSubmit(questionId, a.id)}
                      disabled={!answerText.trim()}
                      className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-[10px] font-bold uppercase transition-all"
                    >
                      <Send size={10} />
                      Rispondi
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        {a.replies && a.replies.length > 0 && (
          <div className="space-y-3">
            {renderAnswers(a.replies, questionId, depth + 1)}
          </div>
        )}
      </div>
    ));
  };

  if (!civ) return <div className="text-gray-400 p-8">Civiltà non trovata.</div>;

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden w-full civ-view-container">
      {/* Civ Hero Header */}
      <div className="relative px-6 pt-8 pb-6 border-b border-white/5 overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <img src={civ.flag} alt="" className="w-full h-full object-cover blur-2xl scale-150" />
        </div>
        <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <img
            src={civ.flag}
            alt={civ.name}
            className="w-24 h-24 object-contain drop-shadow-[0_0_20px_rgba(212,175,55,0.3)] shrink-0"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap mb-2">
              <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600">
                {civ.name}
              </h1>
              <span className={`text-xs font-bold px-3 py-1 rounded-full border ${civ.difficulty === 'Facile' ? 'text-green-400 border-green-500/40 bg-green-500/10' :
                civ.difficulty === 'Medio' ? 'text-yellow-400 border-yellow-500/40 bg-yellow-500/10' :
                  'text-red-400 border-red-400/30 bg-red-500/10'
                }`}>
                {civ.difficulty}
              </span>
              {isAdmin && (
                <div className="flex gap-2 items-center bg-yellow-500/10 px-3 py-1.5 rounded-lg border border-yellow-500/40 shadow-[0_0_15px_rgba(234,179,8,0.1)]">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-yellow-500 uppercase tracking-widest leading-none mb-1">
                      {isSuperAdmin ? 'MODALITÀ ADMIN' : 'MODALITÀ EDITOR'}
                    </span>
                    <span className="text-[8px] text-yellow-500/60 font-medium leading-none">{user?.email}</span>
                  </div>
                  <button
                    onClick={() => (window as any).openCivEditor?.()}
                    className="ml-2 px-3 py-1.5 bg-yellow-600 hover:bg-yellow-500 text-black text-[10px] font-black rounded uppercase transition-all active:scale-95 flex items-center gap-1 shadow-lg border border-yellow-400/50"
                  >
                    <Edit size={12} fill="black" /> Modifica
                  </button>
                </div>
              )}
            </div>

            {/* Active presence indicators */}
            {Object.values(_activeAdmins).some(a => a.user?.email !== user?.email && a.activity?.civId === civId) && (
              <div className="flex -space-x-2 overflow-hidden mt-3 items-center">
                {Object.values(_activeAdmins)
                  .filter(admin => admin.user?.email !== user?.email && admin.activity?.civId === civId)
                  .map((admin, idx) => (
                    <div
                      key={idx}
                      className="inline-block h-6 w-6 rounded-full ring-2 ring-[var(--color-brand-dark)] bg-yellow-500/10 flex items-center justify-center overflow-hidden"
                      title={`${admin.user.name} sta guardando questa civiltà`}
                    >
                      {admin.user.avatar ? (
                        <img src={admin.user.avatar} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-[10px] font-bold text-yellow-500">{admin.user.name?.charAt(0)}</span>
                      )}
                    </div>
                  ))}
                <span className="ml-4 text-[10px] text-gray-500 font-medium italic">
                  Altri admin stanno consultando questa civiltà
                </span>
              </div>
            )}

            <p className="text-gray-300 max-w-2xl leading-relaxed">{civ.shortDescription}</p>
          </div>
        </div>
      </div>

      <div className="relative sticky top-0 bg-[var(--color-brand-dark)] z-10 border-b border-[#D4AF37]/15 w-full">
        <div
          ref={scrollContainerRef}
          onScroll={checkScroll}
          className="px-4 overflow-x-auto flex flex-nowrap gap-0 relative w-full no-scrollbar"
        >
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex items-center gap-2 px-5 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === tab.id
                ? 'border-yellow-500 text-yellow-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
                }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {canScrollRight && (
          <div className="md:hidden absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-[var(--color-brand-dark)] to-transparent pointer-events-none flex items-center justify-end pr-2">
            <ChevronRight size={16} className="text-yellow-500/70 animate-pulse" />
          </div>
        )}
      </div>

      <div className="p-4 md:p-8">
        {activeTab === 'caratteristiche' && (
          <div className="space-y-8 max-w-4xl">
            <section>
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Zap className="text-yellow-500" size={20} />
                Bonus
                {isAdmin && (
                  <button
                    onClick={() => (window as any).openCivEditor?.('bonuses')}
                    className="p-1.5 bg-yellow-500 hover:bg-yellow-400 rounded-lg transition-all text-black border border-yellow-400 flex items-center gap-1 shadow-[0_0_10px_rgba(234,179,8,0.3)] group/btn"
                    title="Modifica Bonus"
                  >
                    <Edit size={12} fill="black" className="group-hover/btn:scale-110 transition-transform" />
                    <span className="text-[10px] font-bold uppercase pr-1">Modifica</span>
                  </button>
                )}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {civ.passiveBonuses.map((bonus, idx) => (
                  <div key={idx} className="flex items-start gap-3 glass p-4 rounded-xl border border-white/5 hover:border-yellow-500/30 transition-colors text-sm text-gray-300 leading-relaxed">
                    <Zap size={18} className="text-yellow-500 mt-1 shrink-0" />
                    <ResourceText text={bonus} />
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <ChevronUp className="text-green-400" size={20} />
                Punti di Forza
                {isAdmin && (
                  <button
                    onClick={() => (window as any).openCivEditor?.('strengths')}
                    className="p-1.5 bg-yellow-500 hover:bg-yellow-400 rounded-lg transition-all text-black border border-yellow-400 flex items-center gap-1 shadow-[0_0_10px_rgba(234,179,8,0.3)] group/btn"
                    title="Modifica Punti di Forza"
                  >
                    <Edit size={12} fill="black" className="group-hover/btn:scale-110 transition-transform" />
                    <span className="text-[10px] font-bold uppercase pr-1">Modifica</span>
                  </button>
                )}
              </h2>
              <div className="glass p-5 rounded-xl border border-green-500/20 text-gray-300 text-sm leading-relaxed">
                <ul className="space-y-3 list-disc list-inside">
                  {civ.strengths && civ.strengths.length > 0 ? (
                    civ.strengths.map((str, idx) => (
                      <li key={idx}><strong className="text-green-400">{str}</strong></li>
                    ))
                  ) : (
                    <>
                      {civ.uniqueUnits.length > 0 && (
                        <li>Accesso a unità uniche: <strong className="text-green-400">{civ.uniqueUnits.map(u => u.name).join(', ')}</strong></li>
                      )}
                      <li className="text-gray-400 italic">Vedi sezione Unità & Landmarks per i dettagli specifici.</li>
                    </>
                  )}
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <ChevronDown className="text-red-400" size={20} />
                Punti Deboli
                {isAdmin && (
                  <button
                    onClick={() => (window as any).openCivEditor?.('weaknesses')}
                    className="p-1.5 bg-yellow-500 hover:bg-yellow-400 rounded-lg transition-all text-black border border-yellow-400 flex items-center gap-1 shadow-[0_0_10px_rgba(234,179,8,0.3)] group/btn"
                    title="Modifica Punti Deboli"
                  >
                    <Edit size={12} fill="black" className="group-hover/btn:scale-110 transition-transform" />
                    <span className="text-[10px] font-bold uppercase pr-1">Modifica</span>
                  </button>
                )}
              </h2>
              <div className="glass p-5 rounded-xl border border-red-500/20 text-gray-300 text-sm leading-relaxed">
                {civ.weaknesses && civ.weaknesses.length > 0 ? (
                  <ul className="space-y-3 list-disc list-inside">
                    {civ.weaknesses.map((wk, idx) => (
                      <li key={idx}><strong className="text-red-400">{wk}</strong></li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-400 italic">I punti deboli specifici saranno aggiunti dalla community tramite "Proponi Modifica".</p>
                )}
              </div>
            </section>
          </div>
        )}

        {activeTab === 'units' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex gap-2 glass rounded-2xl p-1.5 w-fit">
                {[1, 2, 3, 4].map((age) => (
                  <button
                    key={age}
                    className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all duration-300 ${activeAge === age
                      ? 'bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)] scale-105'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                      }`}
                    onClick={() => handleAgeChange(age)}
                  >
                    Age {"I II III IV".split(" ")[age - 1]}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 glass rounded-2xl p-1.5 shrink-0">
                <button
                  className="px-6 py-2.5 rounded-xl text-sm font-bold bg-blue-600 shadow-[0_0_20px_rgba(37,99,235,0.4)] text-white"
                >
                  Unità & Landmarks
                </button>
              </div>
            </div>
            <UnitGrid
              civId={civId}
              age={activeAge}
              onSelectUnit={onSelectUnit}
              onEditUnit={(id, isGlobal) => (window as any).openCivEditor?.(isGlobal ? 'global' : 'units', id)}
              onEditLandmark={(id) => (window as any).openCivEditor?.('landmarks', id)}
            />
          </div>
        )}

        {activeTab === 'buildorders' && (
          <div className="max-w-4xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
              <h2 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">
                <Map className="text-yellow-500" size={24} />
                Build Orders
                {isAdmin && (
                  <button
                    onClick={() => (window as any).openCivEditor?.('buildorders')}
                    className="p-1.5 bg-yellow-500/20 hover:bg-yellow-500/40 rounded-lg transition-all text-yellow-500 border border-yellow-500/30 flex items-center gap-1 shadow-sm group/btn"
                    title="Modifica Build Orders"
                  >
                    <Edit size={12} className="group-hover/btn:scale-110 transition-transform" />
                    <span className="text-[10px] font-bold uppercase pr-1">Edit</span>
                  </button>
                )}
              </h2>
              <p className="text-sm text-gray-400">Strategie ottimizzate per dominare la partita.</p>
            </div>

            {civ.buildOrders && civ.buildOrders.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-10 w-full max-w-7xl mx-auto px-4 md:px-0">
                {civ.buildOrders.map((bo) => {
                  const isExpanded = expandedBOs.has(bo.id);
                  return (
                    <div
                      key={bo.id}
                      className={`glass p-6 md:p-8 rounded-2xl border border-white/5 transition-all group h-fit hover:border-yellow-500/30 ${isExpanded ? 'bg-white/[0.02]' : 'cursor-pointer'}`}
                      onClick={() => {
                        if (!isExpanded) {
                          const newExpanded = new Set(expandedBOs);
                          newExpanded.add(bo.id);
                          setExpandedBOs(newExpanded);
                        }
                      }}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="text-lg md:text-xl font-bold text-white group-hover:text-yellow-400 transition-colors uppercase tracking-tight">{bo.title}</h3>
                      </div>

                      <div className={`text-base text-gray-200 leading-relaxed max-w-4xl mb-6 ${isExpanded ? '' : 'line-clamp-2 opacity-60'}`}>
                        <ResourceText text={bo.description} />
                      </div>

                      {isExpanded && bo.steps && bo.steps.length > 0 && (
                        <div className="space-y-4 mb-8 animate-in slide-in-from-top-2 duration-300">
                          {bo.steps.map((step, sIdx) => (
                            <div key={sIdx} className="flex flex-col gap-1.5 relative pl-6 border-l border-white/5">
                              {/* Bullet point indicator */}
                              <div className="absolute left-[-5px] top-[10px] w-[10px] h-[10px] rounded-full bg-yellow-500/80 shadow-[0_0_8px_rgba(234,179,8,0.4)]" />

                              <div className="flex gap-2 items-baseline">
                                {step.time && (
                                  <span className="text-yellow-500 font-mono w-14 shrink-0 font-bold flex items-center gap-1 text-[10px] md:text-xs">
                                    <Clock size={12} /> {step.time}
                                  </span>
                                )}
                                <ResourceText text={step.action} className="text-sm md:text-base text-white font-semibold tracking-tight leading-snug py-0.5" />
                              </div>
                              {step.note && (
                                <div className="pl-0 mt-1 mb-1">
                                  <ResourceText text={step.note} className="text-sm text-gray-300 italic leading-relaxed" />
                                </div>
                              )}
                            </div>
                          ))}

                          {/* Source / Video Preview */}
                          {bo.source && (
                            <div className="mt-8 pt-6 border-t border-white/5 space-y-4">
                              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1 block">Fonte & Riferimenti</label>
                              {getYoutubeId(bo.source) ? (
                                <a
                                  href={bo.source}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="group relative block aspect-video w-full max-w-xs rounded-xl overflow-hidden border border-white/10 bg-black hover:border-red-500/50 transition-all shadow-xl hover:shadow-red-500/10"
                                >
                                  <img
                                    src={`https://img.youtube.com/vi/${getYoutubeId(bo.source)}/hqdefault.jpg`}
                                    className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity"
                                    alt="Video preview"
                                  />
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-12 h-9 bg-red-600 rounded-lg flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
                                      <Play size={16} fill="white" />
                                    </div>
                                  </div>
                                  <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black to-transparent text-[10px] text-white font-medium flex items-center gap-1">
                                    <ExternalLink size={10} /> Guarda su YouTube
                                  </div>
                                </a>
                              ) : (
                                <a
                                  href={bo.source}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="inline-flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors bg-blue-500/10 px-4 py-3 rounded-xl border border-blue-500/20 shadow-lg"
                                >
                                  <ExternalLink size={14} />
                                  {bo.source.length > 30 ? bo.source.slice(0, 30) + '...' : bo.source}
                                </a>
                              )}
                            </div>
                          )}

                          {/* Author Attribution */}
                          {(bo.author_nickname || bo.author_rank) && (
                            <div className="flex items-center justify-between mt-6 px-4 py-3 bg-white/5 rounded-xl border border-white/5">
                              <div className="flex items-center gap-3">
                                <div className="flex flex-col">
                                  <span className="text-[9px] text-gray-500 uppercase font-bold tracking-tighter">Proposta da</span>
                                  <span className="text-sm font-bold text-blue-400">{bo.author_nickname || 'Anonimo'}</span>
                                </div>
                              </div>
                              {bo.author_rank && bo.author_rank !== 'Unranked' && RANK_ICONS[bo.author_rank] && (
                                <div className="flex items-center gap-2 bg-black/30 px-2 py-1.5 rounded-lg border border-white/5">
                                  <img src={RANK_ICONS[bo.author_rank]} alt={bo.author_rank} className="w-6 h-6 object-contain" />
                                  <span className="text-[10px] font-bold text-gray-400 uppercase">{bo.author_rank}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const newExpanded = new Set(expandedBOs);
                          if (isExpanded) newExpanded.delete(bo.id);
                          else newExpanded.add(bo.id);
                          setExpandedBOs(newExpanded);
                        }}
                        className="flex items-center gap-2 text-xs font-bold text-yellow-500/80 hover:text-yellow-400 transition-colors"
                      >
                        {isExpanded ? (
                          <>
                            <ChevronUp size={14} /> Chiudi dettagli
                          </>
                        ) : (
                          <>
                            <ChevronDown size={14} /> Mostra dettagli strategia
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}

                <div className="mt-12 pt-10 border-t border-white/5 text-center flex flex-col items-center">
                  <div className="w-16 h-16 bg-yellow-500/10 rounded-full flex items-center justify-center mb-4 border border-yellow-500/20">
                    <Map size={32} className="text-yellow-500" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Proponi un nuovo Build Order</h3>
                  <p className="text-sm text-gray-500 max-w-sm mb-6">Aiuta la community aggiungendo una nuova strategia o un'ottimizzazione per questa civiltà.</p>
                  <button
                    onClick={() => navigate(`/civ/${civId}/proponi?section=build_order`)}
                    className="px-10 py-4 bg-yellow-600/10 hover:bg-yellow-600/20 border border-yellow-500/40 rounded-2xl text-base text-yellow-500 font-extrabold transition-all shadow-lg hover:scale-105 active:scale-95"
                  >
                    Invia la tua proposta →
                  </button>
                </div>
              </div>
            ) : (
              <div className="glass p-10 rounded-3xl border border-yellow-500/20 text-center flex flex-col items-center">
                <div className="w-16 h-16 bg-yellow-500/10 rounded-full flex items-center justify-center mb-4 border border-yellow-500/20">
                  <Map size={32} className="text-yellow-500" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Build Orders in arrivo</h3>
                <p className="text-sm text-gray-500 max-w-sm">I build order per questa civiltà saranno aggiunti presto dai contributori della community.</p>
                <button
                  onClick={() => navigate(`/civ/${civId}/proponi?section=build_order`)}
                  className="mt-6 px-10 py-4 bg-yellow-600/10 hover:bg-yellow-600/20 border border-yellow-500/40 rounded-2xl text-base text-yellow-500 font-extrabold transition-all shadow-lg hover:scale-105 active:scale-95"
                >
                  Proponi un Build Order →
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'matchups' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">
                <BarChart2 className="text-blue-400" size={24} />
                Matchup Live (1v1)
              </h2>
              <p className="text-sm text-gray-400">Statistiche aggiornate in tempo reale tramite le API di AoE4World.</p>
            </div>
            <MatchupsTable selectedCiv={civId} />
          </div>
        )}

        {activeTab === 'video' && (
          <div className="w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row md:items-center gap-6 mb-2">
              <div className="flex flex-col">
                <h2 className="text-3xl font-bold text-white flex items-center gap-3">
                  <Play className="text-red-500" size={32} />
                  Video Guide & Gameplay
                </h2>
                <p className="text-gray-400 mt-1">Tutorial e partite commentate da <span className="text-red-500 font-bold">marcotamby_aoe</span>.</p>
              </div>
              <a
                href="https://www.youtube.com/@marcotamby_aoe"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-6 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-[11px] uppercase tracking-wider font-extrabold transition-all shadow-lg shadow-red-600/20 hover:scale-105 active:scale-95 self-start md:self-center"
              >
                <Play size={14} fill="currentColor" />
                VISITA IL CANALE YOUTUBE
              </a>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {civ.videos && civ.videos.length > 0 ? (
                civ.videos.map((vidId, index) => {
                  let finalId = vidId.trim();
                  if (finalId.includes('youtube.com') || finalId.includes('youtu.be')) {
                    try {
                      const url = new URL(finalId);
                      finalId = url.searchParams.get('v') || url.pathname.slice(1) || finalId;
                    } catch (e) { }
                  }
                  return (
                    <div key={`${finalId}-${index}`} className="flex flex-col h-full">
                      <a
                        href={`https://www.youtube.com/watch?v=${finalId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group relative block aspect-video w-full rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-black transition-transform hover:scale-105 hover:border-red-500/50 hover:shadow-[0_0_20px_rgba(239,68,68,0.3)]"
                      >
                        <img
                          src={`https://img.youtube.com/vi/${finalId}/maxresdefault.jpg`}
                          alt="Video Thumbnail"
                          className="w-full h-full object-cover opacity-100 md:opacity-80 md:group-hover:opacity-100 transition-opacity"
                          onLoad={(e) => {
                            const target = e.target as HTMLImageElement;
                            if (target.naturalWidth === 120 && target.naturalHeight === 90) {
                              target.src = `https://img.youtube.com/vi/${finalId}/hqdefault.jpg`;
                            }
                          }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-12 h-9 bg-red-600/90 rounded-2xl flex items-center justify-center group-hover:bg-red-500 transition-colors shadow-lg">
                            <Play size={18} fill="currentColor" className="text-white ml-0.5" />
                          </div>
                        </div>
                      </a>
                    </div>
                  );
                })
              ) : (
                <div className="glass p-8 rounded-2xl border border-white/5 text-center flex flex-col items-center justify-center aspect-video max-w-[300px] bg-black/20">
                  <Play size={32} className="text-gray-600 mb-3" />
                  <h3 className="text-base font-bold text-gray-400 mb-1">Video in arrivo</h3>
                  <p className="text-xs text-gray-500 px-4 leading-tight">Guide dedicate in fase di preparazione.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'domande' && (
          <div className="max-w-4xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
              <h2 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">
                <MessageSquare className="text-yellow-500" size={24} />
                Domande della Community
              </h2>
              <p className="text-sm text-gray-400">Chiedi consiglio ai giocatori più esperti o aiuta gli altri a migliorare.</p>
            </div>

            {/* Success/Error Message */}
            {qaMessage && (
              <div className={`p-4 rounded-xl border flex items-center justify-between animate-in zoom-in duration-300 ${
                qaMessage.type === 'success' 
                  ? 'bg-green-500/10 border-green-500/30 text-green-400' 
                  : 'bg-red-500/10 border-red-500/30 text-red-400'
              }`}>
                <div className="flex items-center gap-3">
                  {qaMessage.type === 'success' ? <CheckCircle size={20} /> : <XCircle size={20} />}
                  <p className="text-sm font-medium">{qaMessage.text}</p>
                </div>
                {qaMessage.type === 'error' && (
                  <button 
                    onClick={() => (window as any).openProfileModal?.()}
                    className="px-4 py-1.5 bg-red-500 hover:bg-red-400 text-white rounded-lg text-xs font-bold transition-all"
                  >
                    Vai al Profilo
                  </button>
                )}
                <button onClick={() => setQaMessage(null)} className="ml-4 opacity-50 hover:opacity-100">
                  <X size={16} />
                </button>
              </div>
            )}

            {/* Question Submission Box */}
            {user ? (
               <div className="glass p-6 rounded-2xl border border-white/5 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-yellow-500/10 flex items-center justify-center border border-yellow-500/20">
                      {user.rank && getRankIcon(user.rank) ? (
                        <img src={getRankIcon(user.rank) || ''} alt={user.rank} className="w-6 h-6 object-contain" />
                      ) : (
                        <UserCircle size={24} className="text-gray-500" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">{user.nickname || user.name || 'Il Tuo Profilo'}</p>
                      <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest">{user.rank || 'Unranked'}</p>
                    </div>
                  </div>
                  <form onSubmit={handleQuestionSubmit} className="space-y-4">
                    <textarea
                      value={questionText}
                      onChange={(e) => setQuestionText(e.target.value)}
                      placeholder="Fai una domanda relativa a questa civiltà. Sii il più specifico possibile, così che i giocatori più esperti possano risponderti in maniera dettagliata e darti una mano!"
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-4 text-white placeholder:text-gray-600 focus:border-yellow-500/50 outline-none transition-all text-sm min-h-[100px] resize-y"
                    />
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={!questionText.trim()}
                        className="flex items-center gap-2 px-6 py-2.5 bg-yellow-600 hover:bg-yellow-500 text-black rounded-xl text-xs font-black uppercase transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-yellow-600/20"
                      >
                        <Send size={14} />
                        Invia Domanda
                      </button>
                    </div>
                  </form>
               </div>
            ) : (
              <div className="glass p-8 rounded-2xl border border-white/5 text-center">
                <p className="text-gray-400 text-sm mb-4">Accedi per fare una domanda o rispondere alla community.</p>
                <button 
                  onClick={openLoginModal}
                  className="px-8 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold uppercase transition-all"
                >
                  Accedi Ora
                </button>
              </div>
            )}

            {/* Questions List */}
            <div className="space-y-6">
              {qaLoading ? (
                <div className="flex py-12 justify-center">
                  <Loader2 className="animate-spin text-yellow-500" size={32} />
                </div>
              ) : questions.length > 0 ? (
                questions.map((q) => (
                  <div key={q.id} className="space-y-4">
                      {/* Question Card */}
                      <div className="glass p-6 rounded-2xl border border-white/10 relative overflow-hidden group/q outline-none select-none">
                         <div className="flex items-start gap-4 mb-4">
                           <div className="shrink-0 flex flex-col items-center gap-1">
                              <div className="w-12 h-12 rounded-full bg-yellow-500/10 flex items-center justify-center border border-yellow-500/20">
                                {q.user_rank && getRankIcon(q.user_rank) ? (
                                  <img src={getRankIcon(q.user_rank) || ''} alt={q.user_rank} className="w-8 h-8 object-contain" />
                                ) : (
                                  <UserCircle size={28} className="text-gray-600" />
                                )}
                              </div>
                           </div>
                           <div className="flex-1">
                               <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-black text-yellow-500 uppercase tracking-tight select-text">{q.user_nickname}</span>
                                <span className="text-[10px] text-gray-500 font-bold px-1.5 py-0.5 bg-white/5 rounded border border-white/5 uppercase select-none">{q.user_rank}</span>
                                <span className="text-[10px] text-gray-600 select-none">{new Date(q.created_at).toLocaleDateString('it-IT')}</span>
                                {isAdmin && (
                                  <button 
                                    onClick={() => handleDeleteQA(q.id, 'question')}
                                    className="ml-auto opacity-0 group-hover/q:opacity-100 p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                                    title="Elimina domanda"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                )}
                              </div>
                              <p className="text-white text-base leading-relaxed select-text">{q.question_text}</p>
                           </div>
                         </div>
                                  <div className="flex justify-end pt-2 border-t border-white/5">
                           <button 
                              onClick={() => {
                                if (replyTo && replyTo.questionId === q.id && !replyTo.parentId) {
                                  setReplyTo(null);
                                } else {
                                  setReplyTo({ questionId: q.id });
                                  setAnswerText('');
                                }
                              }}
                              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                replyTo && replyTo.questionId === q.id && !replyTo.parentId
                                  ? 'bg-white/10 text-white' 
                                  : 'text-gray-400 hover:text-white hover:bg-white/5'
                              }`}
                            >
                              <MessageSquare size={14} />
                              {replyTo && replyTo.questionId === q.id && !replyTo.parentId ? 'Annulla' : 'Rispondi'}
                            </button>
                        </div>

                        {/* Answer Input (Root) */}
                        {replyTo && replyTo.questionId === q.id && !replyTo.parentId && (
                           <div className="mt-4 pt-4 border-t border-white/5 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300 outline-none select-none">
                              <textarea
                                value={answerText}
                                onChange={(e) => setAnswerText(e.target.value)}
                                placeholder="Scrivi la tua risposta..."
                                className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-600 focus:border-blue-500/50 outline-none transition-all text-sm min-h-[80px] resize-y"
                                autoFocus
                              />
                              <div className="flex justify-end">
                                <button
                                  onClick={() => handleAnswerSubmit(q.id)}
                                  disabled={!answerText.trim()}
                                  className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold uppercase transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50"
                                >
                                  <Send size={12} />
                                  Pubblica Risposta
                                </button>
                              </div>
                           </div>
                        )}
                     </div>

                     {/* Answers List (Recursive Threading) */}
                     <div className="ml-6 md:ml-12 space-y-3">
                        {renderAnswers(q.answers, q.id)}
                     </div>
                  </div>
                ))
              ) : (
                <div className="glass p-12 rounded-3xl border border-white/5 text-center flex flex-col items-center">
                  <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
                    <MessageSquare size={32} className="text-gray-700" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-500 mb-2">Ancora nessuna domanda</h3>
                  <p className="text-sm text-gray-600 max-w-sm">Sii il primo a rompere il ghiaccio! Fai una domanda su questa civiltà.</p>
                </div>
              )}
            </div>
          </div>
        )}
        {activeTab === 'proponi' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <Edit className="text-yellow-500" size={24} />
              Proponi una modifica
            </h2>
            <EditSuggestionForm civName={civ.name} />
          </div>
        )}
      </div>

      {civ && (
        <SocialProofPopup
          civId={civId}
          civName={civ.name}
          onFollow={() => toggleFavorite(civId)}
        />
      )}

      {/* Custom Deletion Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#1a1c23] border border-red-500/30 p-8 rounded-3xl max-w-sm w-full shadow-2xl animate-in zoom-in duration-300 text-center">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/20">
              <AlertTriangle className="text-red-500" size={32} />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Conferma Eliminazione</h3>
            <p className="text-sm text-gray-400 mb-8 leading-relaxed">
              Sei sicuro di voler eliminare questa {deleteConfirm.type === 'question' ? 'domanda' : 'risposta'}? Questa azione non può essere annullata.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                disabled={isDeleting}
                className="flex-1 px-4 py-2.5 border border-white/10 text-gray-400 rounded-xl hover:bg-white/5 transition-colors font-bold text-xs uppercase"
              >
                Annulla
              </button>
              <button
                onClick={executeDeleteQA}
                disabled={isDeleting}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl transition-all font-bold text-xs uppercase shadow-lg shadow-red-600/20 flex items-center justify-center gap-2"
              >
                {isDeleting ? <Loader2 size={14} className="animate-spin" /> : 'Elimina Ora'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
