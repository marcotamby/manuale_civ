/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useCivData } from './CivContext';
import { useAuth } from './AuthContext';
import { usePresence } from './PresenceContext';
import type { Unit } from '../data/aoe4Data';
import { UnitGrid } from './UnitGrid';
import { MatchupsTable } from './MatchupsTable';
import { Shield, Sword, Zap, Map, BarChart2, Pencil, ChevronDown, ChevronUp, Play, ChevronRight, MessageSquare, Send, UserCircle, CheckCircle, XCircle, X, Loader2, Trash2, AlertTriangle, Plus, ExternalLink, ThumbsUp, ThumbsDown, User } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { ResourceText } from './ResourceText';
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

const getRankColor = (rank: string | undefined) => {
  if (!rank || rank === 'Unranked') return { text: '#9ca3af', bg: 'rgba(156, 163, 175, 0.1)', border: 'rgba(156, 163, 175, 0.2)' };
  const r = rank.toLowerCase();
  if (r.includes('bronze')) return { text: '#dca376', bg: 'rgba(220, 163, 118, 0.1)', border: 'rgba(220, 163, 118, 0.2)' };
  if (r.includes('silver')) return { text: '#a4aab1', bg: 'rgba(164, 170, 177, 0.1)', border: 'rgba(164, 170, 177, 0.2)' };
  if (r.includes('gold')) return { text: '#f6d271', bg: 'rgba(246, 210, 113, 0.1)', border: 'rgba(246, 210, 113, 0.2)' };
  if (r.includes('platinum')) return { text: '#e5e7eb', bg: 'rgba(229, 231, 235, 0.1)', border: 'rgba(229, 231, 235, 0.2)' };
  if (r.includes('diamond')) return { text: '#71b5f6', bg: 'rgba(113, 181, 246, 0.1)', border: 'rgba(113, 181, 246, 0.2)' };
  if (r.includes('conqueror')) return { text: '#f67171', bg: 'rgba(246, 113, 113, 0.1)', border: 'rgba(246, 113, 113, 0.2)' };
  return { text: '#9ca3af', bg: 'rgba(156, 163, 175, 0.1)', border: 'rgba(156, 163, 175, 0.2)' };
};

export function CivView({ civId, onSelectUnit }: CivViewProps) {
  const { civilizations } = useCivData();
  const { isAdmin, isSuperAdmin, canManageCivs, canManageBuildorders, user, toggleFavorite, openLoginModal } = useAuth();
  const { activeAdmins: _activeAdmins, usersByPage } = usePresence();
  const { tab } = useParams<{ tab?: string }>();
  const navigate = useNavigate();

  const validTabs: Tab[] = ['caratteristiche', 'units', 'buildorders', 'matchups', 'video', 'domande', 'proponi', 'admin-edit'];
  const activeTab: Tab = (validTabs.includes(tab as Tab)) ? (tab as Tab) : 'caratteristiche';
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedBOId = searchParams.get('bo');
  
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
  
  // Robust fallback for theme colors
  const THEME_COLORS: Record<string, string> = {
    abbasid: "#1f2937",
    ayyubids: "#eab308",
    delhi: "#10b981",
    byzantines: "#8b5cf6",
    chinese: "#ef4444",
    english: "#ef4444",
    french: "#3b82f6",
    goldenhorde: "#f59e0b",
    hre: "#fbbf24",
    japanese: "#e2e8f0",
    jeannedarc: "#3b82f6",
    lancaster: "#2563eb",
    macedonian: "#991b1b",
    malians: "#ef4444",
    mongols: "#06b6d4",
    orderofthedragon: "#fbbf24",
    ottomans: "#dc2626",
    rus: "#b91c1c",
    sengoku: "#e11d48",
    templar: "#dc2626",
    tughlaq: "#94a3b8",
    zhuxi: "#16a34a"
  };

  const themeColor = civ?.primaryColor || THEME_COLORS[civId] || '#d4af37';
  
  // Find selected BO for overlay
  const selectedBO = civ?.buildOrders?.find(bo => bo.id === selectedBOId);

  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string, type: 'question' | 'answer' } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);


  useEffect(() => {
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
    { id: 'proponi', label: 'Proponi Modifica', icon: <Pencil size={16} /> },
  ];

  // Q&A State
  const [questions, setQuestions] = useState<any[]>([]);
  const [qaLoading, setQaLoading] = useState(false);
  const [isSubmittingQA, setIsSubmittingQA] = useState(false);
  const [qaSubmissionSuccess, setQaSubmissionSuccess] = useState(false);
  const [ansSubmissionSuccess, setAnsSubmissionSuccess] = useState<string | null>(null);
  const [isSubmittingAns, setIsSubmittingAns] = useState<string | null>(null);
  const [questionText, setQuestionText] = useState('');
  const [expandedBOs, setExpandedBOs] = useState<Set<string>>(new Set());
  const [replyTo, setReplyTo] = useState<{ questionId: string, parentId?: string } | null>(null);
  const [answerText, setAnswerText] = useState('');
  const [qaMessage, setQaMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);
  const [qaMessageClosing, setQaMessageClosing] = useState(false);
  const [boVotes, setBoVotes] = useState<Record<string, { up: number, down: number, userVote: number | null }>>({});
  const [boMessage, setBoMessage] = useState<{ id: string, text: string } | null>(null);
  const [isQaExpanded, setIsQaExpanded] = useState(false);

  const fetchVotes = async () => {
    if (!civ?.buildOrders || civ.buildOrders.length === 0) return;
    const boIds = civ.buildOrders.map(bo => bo.id);
    
    const { data, error } = await supabase
      .from('build_order_votes')
      .select('*')
      .in('build_order_id', boIds);
    
    if (error) return;

    const counts: Record<string, { up: number, down: number, userVote: number | null }> = {};
    data.forEach(v => {
      if (!counts[v.build_order_id]) counts[v.build_order_id] = { up: 0, down: 0, userVote: null };
      if (v.vote === 1) counts[v.build_order_id].up++;
      else counts[v.build_order_id].down++;
      
      if (user && v.user_email === user.email) {
        counts[v.build_order_id].userVote = v.vote;
      }
    });
    setBoVotes(counts);
  };

  const handleVote = async (boId: string, value: number) => {
    if (!user) {
      setBoMessage({ id: boId, text: 'Accedi per votare questa strategia!' });
      setTimeout(() => setBoMessage(null), 4000);
      openLoginModal('Accedi con il tuo account Google per votare questo Build Order e supportare i creatori!');
      return;
    }

    const currentVote = boVotes[boId]?.userVote;
    const isRemoving = currentVote === value;
    
    // Optimistic update
    setBoVotes(prev => {
      const next = { ...prev };
      if (!next[boId]) next[boId] = { up: 0, down: 0, userVote: null };
      
      // Remove previous vote influence
      if (currentVote === 1) next[boId].up--;
      if (currentVote === -1) next[boId].down--;
      
      if (isRemoving) {
        next[boId].userVote = null;
      } else {
        if (value === 1) next[boId].up++;
        else next[boId].down++;
        next[boId].userVote = value;
      }
      return next;
    });

    try {
      if (isRemoving) {
        await supabase
          .from('build_order_votes')
          .delete()
          .match({ user_email: user.email, build_order_id: boId });
      } else {
        await supabase
          .from('build_order_votes')
          .upsert({ user_email: user.email, build_order_id: boId, vote: value });
      }
    } catch (e) {
      console.error(e);
      fetchVotes(); // Rollback
    }
  };

  useEffect(() => {
    if (civ?.buildOrders) fetchVotes();
  }, [civ?.buildOrders, user?.email]);

  const fetchQA = async () => {
    try {
      setQaLoading(true);
      
      if (!civId) return;

      // Step 1: Fetch questions for this civ (using both ID and Name to be safe)
      let query = supabase
        .from('questions')
        .select('*')
        .order('created_at', { ascending: false });

      if (civ?.name) {
        query = query.or(`civ_id.ilike.${civId},civ_id.ilike.${civ.name}`);
      } else {
        query = query.ilike('civ_id', civId);
      }

      const { data: qData, error: qError } = await query;

      if (qError) throw qError;

      // Step 2: Fetch all answers for these questions
      const questionIds = (qData || []).map(q => q.id);
      let aData: any[] = [];
      
      if (questionIds.length > 0) {
        const { data: ansData, error: aError } = await supabase
          .from('answers')
          .select('*')
          .in('question_id', questionIds);
        
        if (aError) throw aError;
        aData = ansData || [];
      }

      // Step 3: Fetch profiles for all users involved (questions + answers)
      const userEmails = new Set<string>();
      (qData || []).forEach(q => { if (q.user_id) userEmails.add(q.user_id.toLowerCase()); });
      (aData || []).forEach(a => { if (a.user_id) userEmails.add(a.user_id.toLowerCase()); });

      let profiles: any[] = [];
      if (userEmails.size > 0) {
        const { data: profData } = await supabase
          .from('profiles')
          .select('email, avatar_url')
          .in('email', Array.from(userEmails));
        profiles = profData || [];
      }

      const userEmail = user?.email?.toLowerCase();
      const isStaff = isAdmin || canManageCivs || canManageBuildorders;

      // JS Filtering, Threading and Profile mapping
      const threadedQuestions = (qData || []).filter(q => {
        if (isStaff) return true;
        if (q.status === 'approved') return true;
        if (userEmail && q.user_id?.toLowerCase() === userEmail) return true;
        return false;
      }).map(q => {
        const qProfile = profiles.find(p => p.email?.toLowerCase() === q.user_id?.toLowerCase());
        
        // Filter and sort answers for this question
        const qAnswers = aData.filter(a => a.question_id === q.id)
          .filter(a => isStaff || a.status === 'approved' || (userEmail && a.user_id?.toLowerCase() === userEmail))
          .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

        // Recursive thread builder
        const buildThread = (parentId: string | null, parentNick: string | null = null): any[] => {
          return qAnswers
            .filter(a => a.parent_id === parentId)
            .map(a => {
              const aProfile = profiles.find(p => p.email?.toLowerCase() === a.user_id?.toLowerCase());
              return {
                ...a,
                profile: aProfile,
                replyToNickname: parentNick,
                replies: buildThread(a.id, a.user_nickname)
              };
            });
        };

        return {
          ...q,
          profile: qProfile,
          answers: buildThread(null)
        };
      });

      setQuestions(threadedQuestions);
    } catch (err) {
      console.error('Error fetching Q&A:', err);
    } finally {
      setQaLoading(false);
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
    setQaMessageClosing(false);
  }, [user?.email]);

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
    if (!user || isSubmittingQA) return;
    if (!validateProfile()) return;
    if (!questionText.trim()) return;

    try {
      setIsSubmittingQA(true);
      const isAutoApproved = isAdmin || canManageCivs || canManageBuildorders;
      
      const { error } = await supabase
        .from('questions')
        .insert([{
          civ_id: civId,
          user_id: user.email,
          user_nickname: user.nickname,
          user_rank: user.rank,
          question_text: questionText.trim(),
          status: isAutoApproved ? 'approved' : 'pending'
        }]);

      if (error) throw error;
      
      setQuestionText('');
      setIsQaExpanded(false);
      
      setQaSubmissionSuccess(true);
      
      if (!isAutoApproved) {
        setQaMessage({ 
          text: 'La tua domanda è stata inviata e verrà presto approvata dagli admin del sito', 
          type: 'success' 
        });
      }
      
      setTimeout(() => {
        fetchQA();
      }, 1000);

      setTimeout(() => {
        setQaMessageClosing(true);
        setTimeout(() => {
          setQaSubmissionSuccess(false);
          setQaMessage(null);
          setQaMessageClosing(false);
        }, 1000);
      }, 7000);

    } catch (err) {
      console.error('Error submitting question:', err);
      setQaMessage({ text: 'Errore durante l\'invio della domanda.', type: 'error' });
    } finally {
      setIsSubmittingQA(false);
    }
  };

  const handleAnswerSubmit = async (questionId: string, parentId?: string) => {
    if (!user) return;
    if (!validateProfile()) return;
    if (!answerText.trim()) return;

    setIsSubmittingAns(parentId || questionId);

    try {
      let targetStatus = 'pending';
      const isAutoApproved = isAdmin || canManageCivs || canManageBuildorders;

      if (isAutoApproved) {
        targetStatus = 'approved';
      } else {
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
      setAnsSubmissionSuccess(parentId || questionId);
      
      if (targetStatus !== 'approved') {
        setQaMessage({ 
          text: 'La tua risposta è stata inviata e verrà presto approvata dagli admin del sito', 
          type: 'success' 
        });
      }
      
      if (targetStatus === 'approved') fetchQA();
      
      setTimeout(() => {
        setQaMessageClosing(true);
        setTimeout(() => {
          setAnsSubmissionSuccess(null);
          setQaMessage(null);
          setQaMessageClosing(false);
        }, 1000);
      }, 7000);
    } catch (err) {
      console.error('Error submitting answer:', err);
      setQaMessage({ text: 'Errore durante l\'invio della risposta', type: 'error' });
    } finally {
      setIsSubmittingAns(null);
    }
  };

  // Helper function to render answers recursively within the component scope
  const renderAnswers = (answers: any[], questionId: string, depth = 0) => {
    if (!answers || answers.length === 0) return null;

    return answers.map((a: any) => (
      <div key={a.id} className="space-y-4">
        <div className={`p-4 rounded-2xl group/a relative transition-all bg-white/[0.02] border-l-2 ${depth % 2 === 0 ? 'border-blue-500/30' : 'border-cyan-500/30'} ml-2 md:ml-12`}>
          <div className="flex items-start gap-4">
            <div className="shrink-0">
              <div className="w-12 h-12 rounded-full bg-black flex items-center justify-center overflow-hidden shadow-none border-none">
                {a.profile?.avatar_url ? (
                  <img src={a.profile.avatar_url} alt="" className="w-full h-full object-cover rounded-full" />
                ) : a.user_rank && getRankIcon(a.user_rank) ? (
                  <img src={getRankIcon(a.user_rank) || ''} alt={a.user_rank} className="w-8 h-8 object-contain" />
                ) : (
                  <UserCircle size={24} className="text-gray-600" />
                )}
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2.5 mb-2">
                <span className="text-base font-black text-white uppercase tracking-tight select-text">{a.user_nickname}</span>
                <span 
                  className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[10px] font-black uppercase select-none tracking-widest"
                  style={{ 
                    color: getRankColor(a.user_rank).text, 
                    backgroundColor: getRankColor(a.user_rank).bg,
                    borderColor: getRankColor(a.user_rank).border
                  }}
                >
                  {getRankIcon(a.user_rank) && (
                    <img src={getRankIcon(a.user_rank)!} alt="" className="w-4 h-4 object-contain" />
                  )}
                  {a.user_rank}
                </span>
                <span className="text-[9px] text-gray-500 font-bold select-none uppercase tracking-widest">{new Date(a.created_at).toLocaleDateString('it-IT')}</span>
                {(isAdmin || (user && a.user_id === user.email)) && (
                  <button 
                    onClick={() => handleDeleteQA(a.id, 'answer')}
                    className="ml-auto opacity-0 group-hover/a:opacity-100 p-1.5 text-red-500/50 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                    title="Elimina risposta"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
              <p className="text-gray-200 text-base leading-relaxed select-text font-medium">
                {a.replyToNickname && (
                  <span className="text-blue-500/80 font-bold mr-2 select-none italic">@{a.replyToNickname}</span>
                )}
                {a.answer_text}
              </p>
              
              <div className="flex justify-end pt-1">
                 <button 
                   onClick={() => {
                     if (replyTo && replyTo.parentId === a.id) {
                       setReplyTo(null);
                     } else {
                       setReplyTo({ questionId, parentId: a.id });
                       setAnswerText('');
                     }
                   }}
                   className={`flex items-center gap-2 px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                     replyTo && replyTo.parentId === a.id 
                       ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' 
                       : 'text-gray-400 hover:text-blue-400 hover:bg-blue-500/10'
                   }`}
                 >
                   <MessageSquare size={12} />
                   {replyTo && replyTo.parentId === a.id ? 'Annulla' : 'Rispondi'}
                 </button>
              </div>

              {/* Nested Reply Input */}
              {replyTo && replyTo.parentId === a.id && (
                <div className="mt-4 pt-4 border-t border-white/5 space-y-3 animate-in fade-in slide-in-from-top-1 duration-300 outline-none">
                  <textarea
                    value={answerText}
                    onChange={(e) => setAnswerText(e.target.value)}
                    placeholder={`Rispondi a ${a.user_nickname}...`}
                    className="w-full bg-black/60 border border-blue-500/20 rounded-2xl px-5 py-4 text-white placeholder:text-gray-600 focus:border-blue-500/50 outline-none transition-all text-base min-h-[100px] resize-y shadow-inner"
                    autoFocus
                  />
                  <div className="flex justify-end">
                    <button
                      onClick={() => handleAnswerSubmit(questionId, a.id)}
                      disabled={!answerText.trim() || isSubmittingAns === a.id}
                      className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg border border-white/10 active:scale-95 ${
                        ansSubmissionSuccess === a.id
                          ? 'bg-green-600 text-white shadow-green-600/20'
                          : 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white shadow-blue-600/20'
                      }`}
                    >
                      {isSubmittingAns === a.id ? (
                        <>
                          <Loader2 size={12} className="animate-spin" />
                          Inviando...
                        </>
                      ) : ansSubmissionSuccess === a.id ? (
                        <>
                          <CheckCircle size={12} />
                          Risposta Inviata!
                        </>
                      ) : (
                        <>
                          <Send size={12} />
                          Invia Risposta
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        {a.replies && a.replies.length > 0 && (
          <div className="space-y-4">
            {renderAnswers(a.replies, questionId, depth + 1)}
          </div>
        )}
      </div>
    ));
  };

  if (!civ) return <div className="text-gray-400 p-8">Civiltà non trovata.</div>;

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden w-full civ-view-container">
      {/* Unified Cinematic Top Section (Header + Navbar) */}
      <div className="relative bg-[#121212]">
        {/* Unified Cinematic Fading Flag Background - Spans both Header and Navbar */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
          <img 
            src={civ.flag.replace('.webp', '.png')} 
            alt="" 
            className="h-full w-full object-cover object-center md:object-right opacity-[0.8] md:opacity-[0.9]"
            style={{
              maskImage: 'linear-gradient(to left, black 0%, black 40%, transparent 90%), linear-gradient(to bottom, transparent 0%, black 25%)',
              WebkitMaskImage: 'linear-gradient(to left, black 0%, black 40%, transparent 90%), linear-gradient(to bottom, transparent 0%, black 25%)',
              maskComposite: 'intersect',
              WebkitMaskComposite: 'source-in'
            }}
          />
          {/* Smoothing gradients */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#121212] via-transparent to-[#121212]/30" />
        </div>

        {/* Premium Decorative Border - Bilinear fade toward both ends */}
        <div 
          className="absolute inset-0 pointer-events-none hidden md:block rounded-tr-xl" 
          style={{
            borderTop: `2px solid ${themeColor}80`,
            borderRight: `2px solid ${themeColor}80`,
            boxShadow: `inset -20px 20px 40px -20px ${themeColor}26`,
            maskImage: 'linear-gradient(to left, black 20%, transparent 100%), linear-gradient(to bottom, black 20%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to left, black 20%, transparent 100%), linear-gradient(to bottom, black 20%, transparent 100%)',
            maskComposite: 'intersect',
            WebkitMaskComposite: 'source-in'
          }}
        />
        
        {/* Subtle atmospheric glow in the top-right corner */}
        <div 
          className="absolute top-0 right-0 w-64 h-64 blur-[100px] pointer-events-none rounded-full -mr-32 -mt-32"
          style={{ backgroundColor: `${themeColor}1a` }}
        ></div>

        {/* Header Content */}
        <div className="relative z-10 px-6 pt-12 md:pt-10 pb-6 flex items-center min-h-[320px] md:h-[240px]">
          <div className="flex flex-col items-start gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap mb-2">
                <h1 className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-slate-400 drop-shadow-[0_2px_10px_rgba(255,255,255,0.15)]">
                  {civ.name}
                </h1>
                <span className={`text-xs font-bold px-3 py-1 rounded-full border ${civ.difficulty === 'Facile' ? 'text-green-400 border-green-500/40 bg-green-500/10' :
                  civ.difficulty === 'Medio' ? 'text-yellow-400 border-yellow-500/40 bg-yellow-500/10' :
                    'text-red-400 border-red-400/30 bg-red-500/10'
                  }`}>
                  {civ.difficulty}
                </span>
                {(canManageCivs || canManageBuildorders) && (
                  <div className="flex gap-2 items-center bg-slate-500/10 px-3 py-1.5 rounded-lg border border-slate-400/60 shadow-[0_0_15px_rgba(148,163,184,0.1)]">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest leading-none mb-1">
                        {isSuperAdmin ? 'MODALITÀ ADMIN' : 'MODALITÀ EDITOR'}
                      </span>
                      <span className="text-[8px] text-slate-500 font-medium leading-none">{user?.email}</span>
                    </div>
                    <button
                      onClick={() => (window as any).openCivEditor?.()}
                      className="ml-2 px-3 py-1.5 bg-gradient-to-r from-slate-600 to-slate-400 hover:from-slate-500 hover:to-slate-300 text-black text-[10px] font-black rounded uppercase transition-all active:scale-95 flex items-center gap-1 shadow-lg border border-slate-300/50"
                    >
                      <Pencil size={12} fill="black" /> Modifica
                    </button>
                  </div>
                )}
              </div>

              {/* Presence Section */}
              <div className="flex flex-col gap-2 mt-3">
                {/* Admin Presence indicators */}
                {Object.values(_activeAdmins).some(a => a.user?.email !== user?.email && a.activity?.civId === civId) && (
                  <div className="flex items-center gap-3 animate-in fade-in slide-in-from-left-4 duration-500">
                    <div className="flex -space-x-3 items-center py-2 px-1">
                      {Object.values(_activeAdmins)
                        .filter(admin => admin.user?.email !== user?.email && admin.activity?.civId === civId)
                        .map((admin, idx) => (
                          <div
                            key={idx}
                            className="relative group/admin z-0 hover:z-10"
                          >
                            <div className="h-9 w-9 rounded-full ring-2 ring-slate-400/50 bg-gradient-to-br from-slate-700/80 to-slate-900/80 flex items-center justify-center overflow-hidden shadow-[0_0_20px_rgba(148,163,184,0.15)] transition-all duration-300 group-hover/admin:scale-110 group-hover/admin:ring-slate-300">
                              {admin.user.avatar ? (
                                <img src={admin.user.avatar} alt="" className="h-full w-full object-cover" />
                              ) : (
                                <span className="text-[15px] font-black text-slate-100 uppercase leading-none flex items-center justify-center translate-y-[0.5px]">
                                  {admin.user.name?.charAt(0)}
                                </span>
                              )}
                            </div>
                            
                            {/* Live Pulse Dot - Silver version */}
                            <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-slate-300 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-3 w-3 bg-slate-100 border-2 border-[#1a1c23]"></span>
                            </span>

                            {/* Custom Premium Tooltip */}
                            <div className="absolute bottom-full left-0 mb-3 px-3 py-1.5 bg-slate-800/95 backdrop-blur-md border border-slate-400/30 rounded-lg opacity-0 group-hover/admin:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap shadow-2xl scale-90 group-hover/admin:scale-100 origin-bottom-left z-50">
                              <div className="flex flex-col items-center">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Staff Online</span>
                                <span className="text-xs font-bold text-white">{admin.user.name}</span>
                              </div>
                              {/* Tooltip Arrow */}
                              <div className="absolute top-full left-4 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-800/95"></div>
                            </div>
                          </div>
                        ))}
                    </div>
                    <span className="text-[9px] text-slate-400 font-black uppercase tracking-[0.25em] animate-pulse">
                      Staff online in questa sezione
                    </span>
                  </div>
                )}

                {/* Community Presence indicator */}
                {usersByPage[civId] > 1 && (
                  <div className="flex items-center gap-2 px-3 py-1 bg-slate-500/10 rounded-full border border-slate-500/30 w-fit animate-in fade-in duration-500">
                    <div className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-slate-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-slate-500"></span>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                      {usersByPage[civId]} UTENTI SU QUESTA PAGINA
                    </span>
                  </div>
                )}
              </div>

              <p className="text-gray-300 text-sm md:text-base max-w-2xl leading-relaxed">{civ.shortDescription}</p>
            </div>
          </div>
        </div>

        {/* Navigation Bar - Fully Transparent over the cinematic background */}
        <div className="relative sticky top-0 z-20 border-y border-[#D4AF37]/15 w-full bg-transparent backdrop-blur-sm">
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
            <div className="md:hidden absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-[var(--color-brand-dark)]/90 to-transparent pointer-events-none flex items-center justify-end pr-2">
              <ChevronRight size={16} className="text-yellow-500/70 animate-pulse" />
            </div>
          )}
        </div>
      </div>

      <div className="p-4 md:p-8">
        {activeTab === 'caratteristiche' && (
          <div className="space-y-8 max-w-4xl">
            <section>
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Zap className="text-yellow-500" size={20} />
                Bonus
                {canManageCivs && (
                  <button
                    onClick={() => (window as any).openCivEditor?.('bonuses')}
                    className="p-1.5 bg-gradient-to-r from-slate-600 to-slate-400 hover:from-slate-500 hover:to-slate-300 rounded-lg transition-all text-black border border-slate-300/50 flex items-center gap-1 shadow-lg group/btn"
                    title="Modifica Bonus"
                  >
                    <Pencil size={12} fill="black" className="group-hover/btn:scale-110 transition-transform" />
                    <span className="text-[10px] font-bold uppercase pr-1">Modifica</span>
                  </button>
                )}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {civ.passiveBonuses.map((bonus, idx) => (
                  <div key={idx} className="flex items-start gap-3 glass p-4 rounded-xl border border-white/5 hover:border-yellow-500/30 transition-colors text-sm text-gray-300 leading-relaxed select-text">
                    <Zap size={18} className="text-yellow-500 mt-1 shrink-0" />
                    <ResourceText text={bonus} />
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <ChevronUp className="text-emerald-400 cursor-default pointer-events-none" size={20} />
                Punti di Forza
                {canManageCivs && (
                  <button
                    onClick={() => (window as any).openCivEditor?.('strengths')}
                    className="p-1.5 bg-gradient-to-r from-slate-600 to-slate-400 hover:from-slate-500 hover:to-slate-300 rounded-lg transition-all text-black border border-slate-300/50 flex items-center gap-1 shadow-lg group/btn"
                    title="Modifica Punti di Forza"
                  >
                    <Pencil size={12} fill="black" className="group-hover/btn:scale-110 transition-transform" />
                    <span className="text-[10px] font-bold uppercase pr-1">Modifica</span>
                  </button>
                )}
              </h2>
              <div className="bg-slate-900/40 backdrop-blur-md p-6 rounded-2xl border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.05)] text-gray-300 text-sm leading-relaxed select-text">
                <div className="space-y-4">
                  {civ.strengths && civ.strengths.length > 0 ? (
                    civ.strengths.map((str, idx) => (
                      <div key={idx} className="flex items-start gap-3 group/item">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)] mt-1.5 shrink-0 group-hover/item:scale-125 transition-transform" />
                        <span className="text-slate-200/90 group-hover/item:text-white transition-colors">{str}</span>
                      </div>
                    ))
                  ) : (
                    <div className="space-y-4">
                      {civ.uniqueUnits.length > 0 && (
                        <div className="flex items-start gap-3">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)] mt-1.5 shrink-0" />
                          <span className="text-slate-200/90">Accesso a unità uniche: <strong className="text-emerald-400/80 font-bold">{civ.uniqueUnits.map(u => u.name).join(', ')}</strong></span>
                        </div>
                      )}
                      <p className="text-gray-500 italic text-[11px] pl-4.5">Vedi sezione Unità & Landmarks per i dettagli specifici.</p>
                    </div>
                  )}
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <ChevronDown className="text-rose-400 cursor-default pointer-events-none" size={20} />
                Punti Deboli
                {isAdmin && (
                  <button
                    onClick={() => (window as any).openCivEditor?.('weaknesses')}
                    className="p-1.5 bg-gradient-to-r from-slate-600 to-slate-400 hover:from-slate-500 hover:to-slate-300 rounded-lg transition-all text-black border border-slate-300/50 flex items-center gap-1 shadow-lg group/btn"
                    title="Modifica Punti Deboli"
                  >
                    <Pencil size={12} fill="black" className="group-hover/btn:scale-110 transition-transform" />
                    <span className="text-[10px] font-bold uppercase pr-1">Modifica</span>
                  </button>
                )}
              </h2>
              <div className="bg-slate-900/40 backdrop-blur-md p-6 rounded-2xl border border-rose-500/30 shadow-[0_0_15px_rgba(244,63,94,0.05)] text-gray-300 text-sm leading-relaxed select-text">
                <div className="space-y-4">
                  {civ.weaknesses && civ.weaknesses.length > 0 ? (
                    civ.weaknesses.map((weak, idx) => (
                      <div key={idx} className="flex items-start gap-3 group/item">
                        <div className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.4)] mt-1.5 shrink-0 group-hover/item:scale-125 transition-transform" />
                        <span className="text-slate-200/90 group-hover/item:text-white transition-colors">{weak}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 italic text-center py-2">Nessun punto debole registrato.</p>
                  )}
                </div>
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
              </h2>
              <p className="text-sm text-gray-400">Strategie ottimizzate per dominare la partita.</p>
            </div>

            {civ.buildOrders && civ.buildOrders.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-7xl mx-auto">
                {civ.buildOrders.map((bo, idx) => {
                  return (
                    <div
                      key={bo.id}
                      className="glass flex flex-col rounded-2xl border border-white/5 overflow-hidden transition-all group hover:border-yellow-500/30 hover:shadow-[0_0_30px_rgba(234,179,8,0.1)] cursor-pointer relative group/card"
                      onClick={() => setSearchParams({ bo: bo.id }, { replace: true })}
                    >
                      {/* Admin Edit Button (Subtle Pencil) */}
                      {(isAdmin || canManageBuildorders) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            (window as any).openBOEditor?.(civId, idx);
                          }}
                          className="absolute top-3 right-3 z-[20] p-2 bg-black/60 hover:bg-white text-white hover:text-black rounded-lg border border-white/20 transition-all shadow-xl"
                          title="Modifica Build Order"
                        >
                          <Pencil size={14} />
                        </button>
                      )}
                      {/* Banner */}
                      <div className="relative h-40 w-full overflow-hidden bg-black/40">
                        {bo.banner_url ? (
                          <img 
                            src={bo.banner_url} 
                            alt={bo.title} 
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                            style={{ objectPosition: `${bo.banner_position_x ?? 50}% ${bo.banner_position ?? 50}%` }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Map size={48} className="text-white/10" />
                          </div>
                        )}
                        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#1a1c23] via-[#1a1c23]/60 to-transparent" />
                        <div className="absolute inset-0 bg-black/10" />
                        <div className="absolute bottom-4 left-5 flex items-center justify-between right-5 drop-shadow-2xl">
                          <div className="flex gap-1.5">
                            {Array.from({ length: 3 }).map((_, i) => (
                              <span key={i} className={`text-lg filter ${i < bo.difficulty ? 'text-yellow-500 drop-shadow-[0_0_10px_rgba(234,179,8,0.8)]' : 'text-white/30'}`}>⭐</span>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-5 flex-1 flex flex-col bg-[#1a1c23]/50">
                        <h3 className="text-lg font-black text-white group-hover:text-yellow-400 transition-colors uppercase tracking-tight mb-2 line-clamp-1">{bo.title}</h3>
                        
                        <div className="relative group/desc">
                          <p className={`text-sm text-gray-300 leading-relaxed transition-all duration-300 ${expandedBOs.has(bo.id) ? '' : 'line-clamp-2'} mb-4`}>
                             {bo.description}
                          </p>
                          {bo.description && bo.description.length > 100 && (
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedBOs(prev => {
                                  const next = new Set(prev);
                                  if (next.has(bo.id)) next.delete(bo.id);
                                  else next.add(bo.id);
                                  return next;
                                });
                              }}
                              className="text-[10px] font-black uppercase text-yellow-500/80 hover:text-yellow-500 transition-colors mb-4 flex items-center gap-1"
                            >
                              {expandedBOs.has(bo.id) ? 'Mostra meno' : 'Leggi tutto'}
                              <ChevronDown size={10} className={`transition-transform duration-300 ${expandedBOs.has(bo.id) ? 'rotate-180' : ''}`} />
                            </button>
                          )}
                        </div>

                        <div className="flex flex-col mt-auto pt-4 border-t border-white/5 gap-4">
                           {/* Row 1: Author & Button */}
                           <div className="flex items-center justify-between gap-3 flex-nowrap">
                               <div className="flex items-center gap-2 flex-1 min-w-0">
                                 <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20 shrink-0 overflow-hidden">
                                   {bo.author_avatar ? (
                                     <img src={bo.author_avatar} alt="" className="w-full h-full object-cover" />
                                   ) : bo.author_rank && getRankIcon(bo.author_rank) ? (
                                     <img src={getRankIcon(bo.author_rank) || ''} alt={bo.author_rank} className="w-5 h-5 object-contain" />
                                   ) : (
                                     <UserCircle size={18} className="text-gray-600" />
                                   )}
                                 </div>
                                 <div className="flex-1 min-w-0 relative group/author">
                                    <span className="text-[11px] font-bold text-blue-400 uppercase tracking-tighter truncate block cursor-help">
                                      {bo.author_nickname || 'Anonimo'}
                                    </span>
                                    
                                    {/* Premium Author Tooltip */}
                                    <div className="absolute bottom-full left-0 mb-3 px-4 py-2.5 bg-slate-800/95 backdrop-blur-md border border-slate-400/30 rounded-2xl opacity-0 group-hover/author:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap shadow-2xl scale-90 group-hover/author:scale-100 origin-bottom-left z-50">
                                      <div className="flex flex-col">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 border-b border-white/5 pb-1">
                                          Autore Strategia
                                        </span>
                                        <span className="text-sm font-bold text-white uppercase">{bo.author_nickname || 'Anonimo'}</span>
                                      </div>
                                      {/* Tooltip Arrow */}
                                      <div className="absolute top-full left-4 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-800/95"></div>
                                    </div>
                                  </div>
                               </div>
                              
                              <span className="text-[9px] md:text-[10px] font-black text-yellow-500 uppercase tracking-wider bg-yellow-500/10 px-3 py-2 rounded-xl border border-yellow-500/20 hover:bg-yellow-500 hover:text-black transition-all shadow-lg whitespace-nowrap shrink-0">
                                Leggi Strategia
                              </span>
                           </div>

                           {/* Row 2: Voting Centered */}
                           {boMessage && boMessage.id === bo.id && (
                              <div className="text-[10px] font-bold text-center text-yellow-500 bg-yellow-500/10 py-2 rounded-lg border border-yellow-500/20 animate-in zoom-in-95 duration-200">
                                {boMessage.text}
                              </div>
                            )}

                           <div className="flex items-center justify-center gap-8 py-2 bg-black/20 rounded-xl border border-white/5">
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleVote(bo.id, 1); }}
                                className={`flex items-center gap-2 transition-all hover:scale-110 ${boVotes[bo.id]?.userVote === 1 ? 'text-green-500' : 'text-gray-400 hover:text-green-400'}`}
                              >
                                <ThumbsUp size={18} />
                                <span className="text-xs font-black">{boVotes[bo.id]?.up || 0}</span>
                              </button>
                              <div className="w-px h-4 bg-white/10" />
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleVote(bo.id, -1); }}
                                className={`flex items-center gap-2 transition-all hover:scale-110 ${boVotes[bo.id]?.userVote === -1 ? 'text-red-500' : 'text-gray-400 hover:text-red-400'}`}
                              >
                                <ThumbsDown size={18} />
                                <span className="text-xs font-black">{boVotes[bo.id]?.down || 0}</span>
                              </button>
                           </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Proposal / Addition card */}
                <div 
                  onClick={() => (isAdmin || canManageBuildorders) ? (window as any).openBOEditor?.(civId, null) : navigate(`/civ/${civId}/proponi?section=build_order`)}
                  className={`glass flex flex-col items-center justify-center p-8 rounded-3xl border border-dashed transition-all group cursor-pointer text-center h-full min-h-[440px] ${
                    (isAdmin || canManageBuildorders) 
                      ? 'border-slate-400/30 hover:border-slate-200/60 hover:bg-slate-400/5 shadow-[0_0_30px_rgba(148,163,184,0.1)]' 
                      : 'border-yellow-500/20 hover:border-yellow-500/40 hover:bg-yellow-500/5 shadow-[0_0_30px_rgba(234,179,8,0.05)]'
                  }`}
                >
                  <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 border group-hover:scale-110 transition-transform ${
                    (isAdmin || canManageBuildorders) ? 'bg-slate-400/10 border-slate-400/30 shadow-[0_0_20px_rgba(148,163,184,0.2)]' : 'bg-yellow-500/10 border-yellow-500/20 shadow-[0_0_20px_rgba(234,179,8,0.1)]'
                  }`}>
                    <Plus size={40} className={(isAdmin || canManageBuildorders) ? 'text-slate-300' : 'text-yellow-500'} />
                  </div>
                  <h3 className={`text-2xl font-black mb-3 uppercase tracking-tighter leading-[1.1] ${(isAdmin || canManageBuildorders) ? 'text-slate-200' : 'text-white'} flex flex-col`}>
                    <span>{(isAdmin || canManageBuildorders) ? 'Aggiungi' : 'Proponi'}</span>
                    <span>Build Order</span>
                  </h3>
                  <p className="text-sm md:text-base text-gray-500 px-4 max-w-[280px] font-medium leading-relaxed">
                    {(isAdmin || canManageBuildorders) ? 'Inserisci ufficialmente una nuova strategia.' : 'Proponi per primo un build order per questa civiltà!'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-7xl mx-auto">
                <div 
                  onClick={() => (isAdmin || canManageBuildorders) ? (window as any).openBOEditor?.(civId, null) : navigate(`/civ/${civId}/proponi?section=build_order`)}
                  className={`glass flex flex-col items-center justify-center p-8 rounded-3xl border border-dashed transition-all group cursor-pointer text-center h-full min-h-[440px] ${
                    (isAdmin || canManageBuildorders)
                      ? 'border-slate-400/30 hover:border-slate-200/60 hover:bg-slate-400/5 shadow-[0_0_30px_rgba(148,163,184,0.1)]'
                      : 'border-yellow-500/20 hover:border-yellow-500/40 hover:bg-yellow-500/5 shadow-[0_0_30px_rgba(234,179,8,0.05)]'
                  }`}
                >
                  <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 border transition-transform group-hover:scale-110 ${
                    (isAdmin || canManageBuildorders) ? 'bg-slate-400/10 border-slate-400/30 shadow-[0_0_20px_rgba(148,163,184,0.2)]' : 'bg-yellow-500/10 border-yellow-500/20 shadow-[0_0_20px_rgba(234,179,8,0.1)]'
                  }`}>
                    <Plus size={40} className={(isAdmin || canManageBuildorders) ? 'text-slate-300' : 'text-yellow-500'} />
                  </div>
                  <h3 className={`text-2xl font-black mb-3 uppercase tracking-tighter leading-[1.1] ${(isAdmin || canManageBuildorders) ? 'text-slate-200' : 'text-white'} flex flex-col`}>
                    <span>{(isAdmin || canManageBuildorders) ? 'Aggiungi' : 'Proponi'}</span>
                    <span>Build Order</span>
                  </h3>
                  <p className="text-sm md:text-base text-gray-500 px-4 max-w-[280px] font-medium leading-relaxed">
                    {(isAdmin || canManageBuildorders) ? 'Inserisci ufficialmente una nuova strategia.' : 'Proponi per primo un build order per questa civiltà!'}
                  </p>
                </div>
              </div>
            )}

            {/* FULL BUILD ORDER OVERLAY */}
            {selectedBO && (
              <div className="fixed inset-0 z-[3000] flex items-center justify-center p-2 md:p-6 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
                <div 
                   className="absolute inset-0" 
                   onClick={() => setSearchParams({}, { replace: true })}
                />
                <div className="relative bg-[#0f1115] border border-yellow-500/30 rounded-3xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col shadow-[0_0_100px_rgba(234,179,8,0.15)] animate-in zoom-in slide-in-from-bottom-5 duration-300">
                  
                  {/* Header / Banner */}
                  <div className="relative h-48 md:h-64 shrink-0 overflow-hidden">
                    {selectedBO.banner_url ? (
                      <img 
                        src={selectedBO.banner_url} 
                        alt="" 
                        className="w-full h-full object-cover" 
                        style={{ objectPosition: `${selectedBO.banner_position_x ?? 50}% ${selectedBO.banner_position ?? 50}%` }}
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-[#1a1c23] to-black flex items-center justify-center">
                        <Map size={64} className="text-white/5" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0f1115] via-[#0f1115]/40 to-transparent" />
                    
                    <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
                      {canManageBuildorders && (
                        <button 
                          onClick={() => {
                            const currentIdx = civ.buildOrders?.findIndex(b => b.id === selectedBO.id);
                            if (currentIdx !== undefined && currentIdx !== -1) {
                              setSearchParams({}, { replace: true });
                              (window as any).openBOEditor?.(civId, currentIdx);
                            }
                          }}
                          className="p-2 bg-white/10 hover:bg-white text-white hover:text-black rounded-full backdrop-blur-md border border-white/10 transition-all flex items-center gap-2 px-4 shadow-lg"
                        >
                          <Pencil size={18} />
                          <span className="text-xs font-black uppercase tracking-widest">Modifica</span>
                        </button>
                      )}
                      <button 
                        onClick={() => setSearchParams({}, { replace: true })}
                        className="p-2 bg-black/60 hover:bg-black/80 text-white rounded-full backdrop-blur-md border border-white/10 transition-all"
                      >
                        <X size={24} />
                      </button>
                    </div>

                    <div className="absolute bottom-6 left-8 right-8">
                       <div className="flex items-center gap-1.5 drop-shadow-lg scale-110 origin-left">
                          {Array.from({ length: 3 }).map((_, i) => (
                            <span key={i} className={`text-lg filter ${i < selectedBO.difficulty ? 'text-yellow-500 drop-shadow-[0_0_8px_rgba(234,179,8,0.6)]' : 'text-white/30'}`}>⭐</span>
                          ))}
                          <span className="text-[10px] font-black text-yellow-500 uppercase tracking-[0.2em] ml-3 bg-yellow-500/10 px-2 py-0.5 rounded border border-yellow-500/20">
                             {selectedBO.difficulty === 1 ? 'Facile' : selectedBO.difficulty === 2 ? 'Media' : 'Difficile'}
                          </span>
                       </div>
                       <h2 className="text-2xl md:text-4xl font-black text-white uppercase tracking-tighter drop-shadow-lg leading-tight mt-2">
                         {selectedBO.title}
                       </h2>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 custom-scrollbar">
                    
                    {/* Intro / Description */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                      <div className="lg:col-span-2 space-y-6">
                        <div className="space-y-4">
                           <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest border-b border-white/5 pb-2">Introduzione & Strategia</h4>
                           <div className="text-gray-300 leading-relaxed text-sm md:text-base">
                             <ResourceText text={selectedBO.description} />
                           </div>
                        </div>

                        {/* Steps List */}
                        <div className="space-y-6 pt-4">
                           <h4 className="text-[10px] font-black text-yellow-500 uppercase tracking-widest flex items-center gap-2">
                             <Map size={14} /> Passaggi della Build
                           </h4>
                           <div className="space-y-0">
                             {selectedBO.steps.map((step, sIdx) => (
                               <div key={sIdx} className="group relative pl-10 pb-8 last:pb-0 border-l border-white/5 last:border-transparent">
                                 {/* Connector dot */}
                                 <div className="absolute left-[-5px] top-1.5 w-[10px] h-[10px] rounded-full bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.5)] group-hover:scale-125 transition-transform" />
                                 
                                 <div className="space-y-2">
                                   <div className="flex items-start gap-3">
                                      {step.time && (
                                        <span className="px-2 py-0.5 bg-yellow-500/10 text-yellow-500 rounded font-mono text-xs font-bold border border-yellow-500/20">
                                          {step.time}
                                        </span>
                                      )}
                                      <h5 className="text-white font-bold leading-tight md:text-lg">
                                        <ResourceText text={step.action} />
                                      </h5>
                                   </div>
                                   {step.note && (
                                     <div className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl text-sm text-gray-400 italic leading-relaxed">
                                       <ResourceText text={step.note} />
                                     </div>
                                   )}
                                 </div>
                               </div>
                             ))}
                           </div>
                        </div>
                      </div>

                      {/* Sidebar */}
                      <div className="space-y-6 lg:pt-10">
                        {/* Map Info (Silver design) */}
                        {selectedBO.map && (
                          <div className="bg-white/[0.03] rounded-2xl border border-white/10 p-4 space-y-3">
                             <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                               Mappe Consigliate
                             </h4>
                             <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-cyan-500/5 border border-cyan-500/20 flex items-center justify-center">
                                   <Map size={18} className="text-cyan-500" />
                                </div>
                                <div>
                                   <span className="text-sm font-medium text-cyan-400 block leading-snug tracking-tight">
                                     {selectedBO.map}
                                   </span>
                                </div>
                             </div>
                          </div>
                        )}

                        {/* Author Info */}
                        <div className="bg-white/5 rounded-3xl border border-white/5 py-3 px-4 space-y-3">
                           <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                             <User size={12} /> Autore
                           </h4>
                           <div className="flex items-center gap-4">
                              <div className="w-16 h-16 rounded-2xl bg-[#0f1115] border border-blue-500/20 flex items-center justify-center overflow-hidden">
                                 {selectedBO.author_avatar ? (
                                   <img src={selectedBO.author_avatar} alt="" className="w-full h-full object-cover" />
                                 ) : selectedBO.author_rank && getRankIcon(selectedBO.author_rank) ? (
                                   <img src={getRankIcon(selectedBO.author_rank) || ''} alt={selectedBO.author_rank} className="w-full h-full object-contain p-2" />
                                 ) : (
                                   <UserCircle size={32} className="text-gray-800" />
                                 )}
                              </div>
                              <div className="flex flex-col">
                                 <span className="text-lg font-black text-blue-400 truncate uppercase tracking-tighter">
                                   {selectedBO.author_nickname || 'Contributore'}
                                 </span>
                                 <span className="text-[10px] font-bold text-gray-500 uppercase bg-black/40 px-2 py-0.5 rounded w-fit">
                                   {selectedBO.author_rank || 'Unranked'}
                                 </span>
                              </div>
                           </div>
                        </div>

                        {/* Video / Source */}
                        {selectedBO.source && (
                          <div className="bg-white/5 rounded-3xl border border-white/5 py-3 px-4 space-y-3">
                            <h4 className="text-[10px] font-black text-red-500 uppercase tracking-widest">Video Tutorial</h4>
                            {getYoutubeId(selectedBO.source) ? (
                              <div className="relative aspect-video rounded-2xl overflow-hidden border border-white/10 group cursor-pointer"
                                   onClick={() => window.open(selectedBO.source, '_blank')}>
                                <img 
                                  src={`https://img.youtube.com/vi/${getYoutubeId(selectedBO.source)}/maxresdefault.jpg`} 
                                  alt="Tutorial Preview" 
                                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                />
                                <div className="absolute inset-0 flex items-center justify-center bg-black/20 md:bg-black/40 md:group-hover:bg-black/20 transition-all">
                                  <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center shadow-xl shadow-black/50 group-hover:scale-110 transition-transform">
                                    <Play size={24} className="text-white fill-white ml-1" />
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <a href={selectedBO.source} target="_blank" rel="noopener noreferrer" 
                                 className="flex items-center gap-3 p-4 bg-black/40 rounded-2xl border border-white/5 text-blue-400 hover:text-blue-300 transition-colors group">
                                <ExternalLink size={20} className="group-hover:scale-110 transition-transform" />
                                <span className="text-sm font-bold truncate">{selectedBO.source}</span>
                              </a>
                            )}
                          </div>
                        )}

                        {/* Votes / Feedback */}
                        <div className="bg-white/5 rounded-3xl border border-white/5 py-3 px-4 space-y-3">
                           <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                             <MessageSquare size={12} /> Feedback Community
                           </h4>
                           {boMessage && boMessage.id === selectedBO.id && (
                             <div className="text-[10px] font-bold text-center text-yellow-500 bg-yellow-500/10 py-3 rounded-xl border border-yellow-500/20 animate-in slide-in-from-top-2 duration-300">
                               {boMessage.text}
                             </div>
                           )}
                           <div className="flex items-center justify-between gap-3">
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleVote(selectedBO.id, 1); }}
                                className={`flex-1 flex items-center justify-center gap-2 p-2 rounded-xl border transition-all ${
                                  boVotes[selectedBO.id]?.userVote === 1 
                                    ? 'bg-green-500/10 border-green-500/40 text-green-500 shadow-[0_0_10px_rgba(34,197,94,0.1)]' 
                                    : 'bg-black/20 border-white/5 text-gray-400 hover:border-green-500/20 hover:text-green-400'
                                }`}
                              >
                                <ThumbsUp size={16} />
                                <span className="text-sm font-black">{boVotes[selectedBO.id]?.up || 0}</span>
                              </button>

                              <button 
                                onClick={(e) => { e.stopPropagation(); handleVote(selectedBO.id, -1); }}
                                className={`flex-1 flex items-center justify-center gap-2 p-2 rounded-xl border transition-all ${
                                  boVotes[selectedBO.id]?.userVote === -1 
                                    ? 'bg-red-500/10 border-red-500/40 text-red-500 shadow-[0_0_10px_rgba(239,68,68,0.1)]' 
                                    : 'bg-black/20 border-white/5 text-gray-400 hover:border-red-500/20 hover:text-red-400'
                                }`}
                              >
                                <ThumbsDown size={16} />
                                <span className="text-sm font-black">{boVotes[selectedBO.id]?.down || 0}</span>
                              </button>
                           </div>
                           <div className="pt-1">
                             <div className="h-1 w-full bg-black/40 rounded-full overflow-hidden flex border border-white/5">
                               { (boVotes[selectedBO.id]?.up || 0) + (boVotes[selectedBO.id]?.down || 0) > 0 ? (
                                 <>
                                   <div 
                                     className="h-full bg-green-500/60 shadow-[0_0_5px_rgba(34,197,94,0.3)]" 
                                     style={{ width: `${((boVotes[selectedBO.id]?.up || 0) / ((boVotes[selectedBO.id]?.up || 0) + (boVotes[selectedBO.id]?.down || 0))) * 100}%` }} 
                                   />
                                   <div 
                                     className="h-full bg-red-500/60 shadow-[0_0_5px_rgba(239,68,68,0.3)]" 
                                     style={{ width: `${((boVotes[selectedBO.id]?.down || 0) / ((boVotes[selectedBO.id]?.up || 0) + (boVotes[selectedBO.id]?.down || 0))) * 100}%` }} 
                                   />
                                 </>
                               ) : (
                                 <div className="h-full w-full bg-gray-800" />
                               )}
                             </div>
                             <p className="text-[8px] text-gray-600 text-center mt-1.5 font-bold uppercase tracking-tight">
                               {((boVotes[selectedBO.id]?.up || 0) + (boVotes[selectedBO.id]?.down || 0))} Valutazioni
                             </p>
                           </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
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
                    } catch (e) {
          // Silently ignore parsing errors
        }
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
                          style={{ objectPosition: 'center center' }}
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
          <div className="max-w-6xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
              <h2 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">
                <MessageSquare className="text-yellow-500" size={24} />
                Domande della Community
              </h2>
              <p className="text-sm text-gray-400">Chiedi consiglio ai giocatori più esperti o aiuta gli altri a migliorare.</p>
            </div>

            {/* Success/Error Message */}
            {qaMessage && (
              <div className={`p-4 rounded-xl border flex items-center justify-between transition-all duration-1000 ${
                qaMessageClosing ? 'opacity-0 -translate-y-2' : 'animate-in zoom-in duration-300 opacity-100 translate-y-0'
              } ${
                qaMessage.type === 'success' 
                  ? 'bg-green-500/10 border-green-500/30 text-green-400 shadow-[0_0_20px_rgba(34,197,94,0.1)]' 
                  : 'bg-red-500/10 border-red-500/30 text-red-400 shadow-[0_0_20px_rgba(239,68,68,0.1)]'
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
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Main Column */}
              <div className={`${(!user && questions.length > 0) ? 'lg:col-span-8' : 'lg:col-span-12'} space-y-8`}>
                
                {/* Question Submission Box */}
                {user ? (
                   <div className={`bg-gradient-to-br from-blue-900/40 via-[#0f1423] to-cyan-900/20 rounded-3xl border border-blue-500/30 shadow-[0_0_50px_rgba(37,99,235,0.15)] relative overflow-hidden group transition-all duration-300 ${isQaExpanded ? 'p-5 pb-4' : 'p-3'}`}>
                      <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 blur-[100px] pointer-events-none" />
                      
                      {!isQaExpanded ? (
                        <div 
                          className="flex items-center gap-4 cursor-pointer"
                          onClick={() => setIsQaExpanded(true)}
                        >
                          <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center overflow-hidden shrink-0">
                             {user.avatar_url ? (
                               <img src={user.avatar_url} alt="You" className="w-full h-full object-cover rounded-full" />
                             ) : user.rank && getRankIcon(user.rank) ? (
                               <img src={getRankIcon(user.rank) || ''} alt={user.rank} className="w-6 h-6 object-contain" />
                             ) : (
                               <UserCircle size={20} className="text-blue-400" />
                             )}
                          </div>
                          <div className="flex-1 bg-black/40 border border-blue-500/10 rounded-xl px-4 py-2.5 text-gray-500 text-sm font-medium">
                             Fai una domanda relativa a questa civiltà...
                          </div>
                          <button className="p-2 bg-blue-600/20 text-blue-400 rounded-lg">
                            <Plus size={18} />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center justify-between mb-3 relative z-10">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center overflow-hidden shadow-none border-none">
                                  {user.avatar_url ? (
                                    <img src={user.avatar_url} alt="You" className="w-full h-full object-cover rounded-full" />
                                  ) : user.rank && getRankIcon(user.rank) ? (
                                    <img src={getRankIcon(user.rank) || ''} alt={user.rank} className="w-6 h-6 object-contain" />
                                  ) : (
                                    <UserCircle size={24} className="text-blue-400" />
                                  )}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-black text-white uppercase tracking-tight">{user.nickname || user.name || 'Il Tuo Profilo'}</p>
                                  {(isAdmin || canManageCivs || canManageBuildorders) && (
                                    <span className="text-[8px] px-2 py-0.5 bg-blue-500 text-white font-black rounded-full uppercase tracking-widest">Staff</span>
                                  )}
                                </div>
                                  <p 
                                    className="text-[10px] uppercase font-black tracking-widest flex items-center gap-1.5"
                                    style={{ color: getRankColor(user.rank).text }}
                                  >
                                    {getRankIcon(user.rank) && (
                                      <img src={getRankIcon(user.rank)!} alt="" className="w-4 h-4 object-contain" />
                                    )}
                                    {user.rank || 'Unranked'}
                                  </p>
                              </div>
                            </div>
                            <button 
                              onClick={(e) => { e.stopPropagation(); setIsQaExpanded(false); }}
                              className="p-1.5 hover:bg-white/5 rounded-lg text-gray-500 hover:text-white transition-all"
                            >
                              <X size={18} />
                            </button>
                          </div>
                          <form onSubmit={handleQuestionSubmit} className="flex flex-col relative z-10">
                            <div className="relative group/input flex-1 mb-3">
                              <textarea
                                value={questionText}
                                onChange={(e) => setQuestionText(e.target.value)}
                                placeholder="Sii specifico per ricevere risposte dettagliate!"
                                className="w-full bg-black/40 border border-blue-500/20 rounded-xl px-4 py-3 text-white placeholder:text-gray-600 focus:border-blue-500/50 focus:bg-black/60 outline-none transition-all text-sm min-h-[120px] resize-y shadow-inner"
                                autoFocus
                              />
                            </div>
                            <div className="flex justify-end items-center">
                                <button
                                type="submit"
                                disabled={!questionText.trim() || isSubmittingQA || qaSubmissionSuccess}
                                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl border border-white/10 ${
                                  qaSubmissionSuccess 
                                    ? 'bg-green-600 text-white shadow-green-500/20' 
                                    : 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white shadow-blue-500/30'
                                }`}
                              >
                                {isSubmittingQA ? (
                                  <>
                                    <Loader2 size={14} className="animate-spin" />
                                    Inviando...
                                  </>
                                ) : qaSubmissionSuccess ? (
                                  <>
                                    <CheckCircle size={14} />
                                    Inviata!
                                  </>
                                ) : (
                                  <>
                                    <Send size={14} />
                                    Invia Domanda
                                  </>
                                )}
                              </button>
                            </div>
                          </form>
                        </>
                      )}
                   </div>
                ) : questions.length === 0 ? (
                  <div className="max-w-sm">
                    <div 
                      onClick={() => openLoginModal()}
                      className="glass flex flex-col items-center justify-center p-8 rounded-3xl border border-dashed border-blue-500/20 hover:border-blue-500/40 hover:bg-blue-500/5 transition-all group cursor-pointer text-center shadow-2xl"
                    >
                      <div className="w-16 h-16 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                        <UserCircle size={32} className="text-blue-400" />
                      </div>
                      <h3 className="text-xl font-black mb-3 uppercase tracking-tighter text-white">Accedi</h3>
                      <p className="text-sm text-gray-500 px-4 font-medium leading-relaxed">
                        Accedi per partecipare alla discussione e aiutare la community.
                      </p>
                    </div>
                  </div>
                ) : null}

                {/* Questions List */}
                <div className="space-y-6">
                  {qaLoading ? (
                    <div className="flex py-12 justify-center">
                      <Loader2 className="w-12 h-12 text-blue-400 animate-spin" />
                    </div>
                  ) : questions.length > 0 ? (
                    questions.map((q) => (
                      <div key={q.id} className="bg-gradient-to-r from-white/[0.03] to-white/[0.01] p-5 rounded-3xl border border-white/10 relative overflow-hidden group/q shadow-xl backdrop-blur-sm space-y-4">

                             <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-blue-600 to-cyan-500 opacity-30" />
                             
                             <div className="flex items-start gap-5 mb-3">
                               <div className="shrink-0">
                                  <div className="w-14 h-14 rounded-full bg-black flex items-center justify-center overflow-hidden shadow-none border-none">
                                    {q.profile?.avatar_url ? (
                                      <img src={q.profile.avatar_url} alt="" className="w-full h-full object-cover rounded-full" />
                                    ) : q.user_rank && getRankIcon(q.user_rank) ? (
                                      <img src={getRankIcon(q.user_rank) || ''} alt={q.user_rank} className="w-9 h-9 object-contain" />
                                    ) : (
                                      <UserCircle size={32} className="text-gray-700" />
                                    )}
                                  </div>
                               </div>
                               <div className="flex-1">
                                   <div className="flex items-center gap-3 mb-2">
                                    <span className="text-base font-black text-white uppercase tracking-tight select-text">{q.user_nickname}</span>
                                    <span 
                                      className="flex items-center gap-1.5 text-[10px] font-black px-2.5 py-0.5 rounded-full border uppercase select-none tracking-widest"
                                      style={{ 
                                        color: getRankColor(q.user_rank).text, 
                                        backgroundColor: getRankColor(q.user_rank).bg,
                                        borderColor: getRankColor(q.user_rank).border
                                      }}
                                    >
                                      {getRankIcon(q.user_rank) && (
                                        <img src={getRankIcon(q.user_rank)!} alt="" className="w-4 h-4 object-contain" />
                                      )}
                                      {q.user_rank}
                                    </span>
                                    <span className="text-[10px] text-gray-500 font-bold select-none uppercase tracking-widest">{new Date(q.created_at).toLocaleDateString('it-IT')}</span>
                                    {(isAdmin || (user && q.user_id === user.email)) && (
                                      <button 
                                        onClick={() => handleDeleteQA(q.id, 'question')}
                                        className="ml-auto opacity-0 group-hover/q:opacity-100 p-2 text-red-500/50 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                                        title="Elimina domanda"
                                      >
                                        <Trash2 size={16} />
                                      </button>
                                    )}
                                  </div>
                                  <p className="text-gray-200 text-base leading-relaxed select-text font-medium">{q.question_text}</p>
                               </div>
                             </div>

                             {q.answers && q.answers.length > 0 && (
                                <div className="pt-4 border-t border-white/5 space-y-4">
                                   {renderAnswers(q.answers, q.id)}
                                </div>
                             )}
                                      <div className="flex justify-end pt-1 border-t border-white/5">
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
                                       : 'text-gray-400 hover:text-blue-400 hover:bg-blue-500/10'
                                  }`}
                                >
                                  <MessageSquare size={14} />
                                  {replyTo && replyTo.questionId === q.id && !replyTo.parentId ? 'Annulla' : 'Rispondi'}
                                </button>
                            </div>

                            {/* Answer Input (Root) */}
                            {replyTo && replyTo.questionId === q.id && !replyTo.parentId && (
                               <div className="mt-6 pt-6 border-t border-white/10 space-y-4 animate-in fade-in slide-in-from-top-3 duration-300 outline-none">
                                  <textarea
                                    value={answerText}
                                    onChange={(e) => setAnswerText(e.target.value)}
                                    placeholder="Condividi la tua esperienza con la community..."
                                    className="w-full bg-black/60 border border-blue-500/20 rounded-2xl px-6 py-5 text-white placeholder:text-gray-600 focus:border-blue-500/50 focus:bg-black/80 outline-none transition-all text-base min-h-[120px] resize-y shadow-inner"
                                    autoFocus
                                  />
                                  <div className="flex justify-end">
                                    <button
                                      onClick={() => handleAnswerSubmit(q.id)}
                                      disabled={!answerText.trim() || isSubmittingAns === q.id}
                                      className={`flex items-center gap-3 px-8 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-xl border border-white/10 active:scale-95 ${
                                        ansSubmissionSuccess === q.id
                                          ? 'bg-green-600 text-white shadow-green-500/20'
                                          : 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white shadow-[0_10px_25px_rgba(37,99,235,0.3)] hover:shadow-[0_15px_35px_rgba(37,99,235,0.5)]'
                                      }`}
                                    >
                                      {isSubmittingAns === q.id ? (
                                        <>
                                          <Loader2 size={16} className="animate-spin" />
                                          Inviando...
                                        </>
                                      ) : ansSubmissionSuccess === q.id ? (
                                        <>
                                          <CheckCircle size={16} />
                                          Risposta Inviata!
                                        </>
                                      ) : (
                                        <>
                                          <Send size={16} />
                                          Invia Risposta
                                        </>
                                      )}
                                    </button>
                                  </div>
                               </div>
                            )}
                         </div>
                      ))
                  ) : (
                    <div className="bg-[#0f1423] p-12 rounded-[40px] border border-white/5 text-center flex flex-col items-center shadow-2xl relative overflow-hidden">
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-blue-500/5 blur-[100px] pointer-events-none" />
                      <div className="w-16 h-16 bg-gradient-to-br from-blue-600/20 to-cyan-500/20 rounded-2xl flex items-center justify-center mb-6 border border-blue-500/20">
                        <MessageSquare size={32} className="text-blue-400" />
                      </div>
                      <h3 className="text-xl font-black text-white mb-2 uppercase tracking-tight">Ancora nessuna domanda</h3>
                      <p className="text-gray-500 max-w-xs text-sm leading-relaxed">Sii il primo a rompere il ghiaccio! Fai una domanda su questa civiltà.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Sidebar (Not logged in + has questions) */}
              {!user && questions.length > 0 && (
                <div className="lg:col-span-4 sticky top-24">
                  <div className="bg-[#0f1423] p-8 rounded-3xl border border-white/5 text-center shadow-2xl flex flex-col items-center">
                    <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mb-6 border border-blue-500/20">
                      <UserCircle size={32} className="text-blue-400" />
                    </div>
                    <h3 className="text-lg font-black text-white mb-2 uppercase tracking-tight">Partecipa</h3>
                    <p className="text-gray-400 text-sm mb-6 font-medium leading-relaxed">Accedi per fare domande o rispondere alla community.</p>
                    <button 
                      onClick={() => openLoginModal()}
                      className="w-full py-4 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all shadow-xl shadow-blue-600/20 hover:scale-[1.02] active:scale-95 border border-white/10"
                    >
                      Accedi Ora
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        {activeTab === 'proponi' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <Pencil className="text-slate-400" size={24} />
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
