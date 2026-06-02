import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  MessageSquare, CheckCircle, XCircle, Loader2, Send, Inbox, 
  AlertTriangle, X, ShieldCheck, Radio, Search, UserPlus, 
  Trophy, BookOpen, Zap, Edit2, Check, Trash2, Plus, Minus, ArrowLeft, LayoutDashboard,
  Save, Sparkles
} from 'lucide-react';
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

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const { isAuthenticated, isAdmin, isSuperAdmin, canManageCivs, canManageBuildorders, canManageTournaments } = useAuth();
  const { refreshCivs } = useCivData();

  // Redirect if not admin
  useEffect(() => {
    if (!isAuthenticated || !isAdmin) {
      navigate('/');
    }
  }, [isAuthenticated, isAdmin, navigate]);

  const [activeTab, setActiveTab] = useState<'overview' | 'proposte' | 'qa' | 'users' | 'pecore' | 'tornei' | 'civilta'>('overview');
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
  const [sendNotifSuccess, setSendNotifSuccess] = useState(false);
  const [editingBOs, setEditingBOs] = useState<Record<string, any>>({});
  const [expandedSugg, setExpandedSugg] = useState<string | null>(null);
  
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

  // Tournaments states
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [tournamentsLoading, setTournamentsLoading] = useState(false);
  const [selectedTournament, setSelectedTournament] = useState<any | null>(null);
  const [isEditingTournament, setIsEditingTournament] = useState(false);
  const [isCreatingTournament, setIsCreatingTournament] = useState(false);
  const [tournamentForm, setTournamentForm] = useState<any>({
    name: '',
    organizer: '',
    period: '',
    banner_url: '',
    status: 'Programmato',
    type: '1v1',
    has_regolamento: false,
    regolamento_content: '',
    direct_link: '',
    display_order: 0,
    banner_position_x: 50,
    banner_position_y: 50,
    vods: []
  });

  // Betting markets states
  const [markets, setMarkets] = useState<any[]>([]);
  const [marketsLoading, setMarketsLoading] = useState(false);
  const [isCreatingMarket, setIsCreatingMarket] = useState(false);
  const [settleConfirmOption, setSettleConfirmOption] = useState<{ marketId: string; optionId: string } | null>(null);
  const [marketForm, setMarketForm] = useState<any>({
    title: '',
    description: '',
    type: 'Match Winner',
    event_level: 'High Elo',
    options: [{ label: '', weight: 100 }, { label: '', weight: 100 }]
  });

  // Civilizations and Build Orders states
  const [civList, setCivList] = useState<any[]>([]);
  const [civsLoading, setCivsLoading] = useState(false);
  const [selectedCiv, setSelectedCiv] = useState<any | null>(null);
  const [civForm, setCivForm] = useState<any>({
    name: '',
    difficulty: 'Medio',
    short_description: '',
    passive_bonuses: [],
    strengths: [],
    weaknesses: []
  });
  
  const [selectedBOIndex, setSelectedBOIndex] = useState<number | null>(null); // -1 for new, number for edit index, null for none
  const [boForm, setBoForm] = useState<any>({
    id: '',
    title: '',
    difficulty: 2,
    description: '',
    map: '',
    author_nickname: '',
    author_rank: '',
    banner_url: '',
    banner_position: 50,
    source: '',
    steps: []
  });
  const [boManualText, setBoManualText] = useState('');
  const [isAnalyzingBO, setIsAnalyzingBO] = useState(false);
  const [boAnalysisProgress, setBoAnalysisProgress] = useState(0);

  useEffect(() => {
    if (isAuthenticated && isAdmin) {
      fetchSuggestions();
      fetchQA();
      fetchProfiles();
      if (isSuperAdmin) {
        fetchUsers();
      }
    }
  }, [isAuthenticated, isAdmin, isSuperAdmin]);

  // Tab switcher effect to load data
  useEffect(() => {
    if (activeTab === 'tornei') {
      fetchTournaments();
    } else if (activeTab === 'civilta') {
      fetchCivilizations();
    }
  }, [activeTab]);

  const fetchTournaments = async () => {
    try {
      setTournamentsLoading(true);
      const { data, error } = await supabase
        .from('tournaments')
        .select('*')
        .order('created_at', { ascending: true });
      if (error) throw error;
      setTournaments(data || []);
      if (data && data.length > 0 && !selectedTournament) {
        setSelectedTournament(data[0]);
      }
    } catch (err: any) {
      console.error('Error fetching tournaments:', err);
      setToast({ isVisible: true, message: 'Errore nel caricamento dei tornei', type: 'error' });
    } finally {
      setTournamentsLoading(false);
    }
  };

  const fetchMarkets = async (tourneySlug: string) => {
    if (!tourneySlug) return;
    try {
      setMarketsLoading(true);
      const { data, error } = await supabase
        .from('betting_markets')
        .select('*')
        .eq('tournament_slug', tourneySlug)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setMarkets(data || []);
    } catch (err: any) {
      console.error('Error fetching markets:', err);
    } finally {
      setMarketsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedTournament) {
      fetchMarkets(selectedTournament.slug);
      setTournamentForm({
        name: selectedTournament.name || '',
        organizer: selectedTournament.organizer || '',
        period: selectedTournament.period || '',
        banner_url: selectedTournament.banner_url || '',
        status: selectedTournament.status || 'Programmato',
        type: selectedTournament.type || '1v1',
        has_regolamento: selectedTournament.has_regolamento || false,
        regolamento_content: selectedTournament.regolamento_content || '',
        direct_link: selectedTournament.direct_link || '',
        display_order: selectedTournament.display_order || 0,
        banner_position_x: selectedTournament.banner_position_x || 50,
        banner_position_y: selectedTournament.banner_position_y || 50,
        vods: selectedTournament.vods || []
      });
      setIsEditingTournament(false);
      setIsCreatingTournament(false);
      setIsCreatingMarket(false);
    }
  }, [selectedTournament]);

  const handleSaveTournament = async () => {
    if (!tournamentForm.name) {
      setToast({ isVisible: true, message: 'Nome torneo obbligatorio', type: 'error' });
      return;
    }
    const slug = isCreatingTournament 
      ? tournamentForm.name.toLowerCase().trim().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-')
      : selectedTournament.slug;

    const payload = {
      slug,
      name: tournamentForm.name,
      organizer: tournamentForm.organizer,
      period: tournamentForm.period,
      banner_url: tournamentForm.banner_url,
      status: tournamentForm.status,
      type: tournamentForm.type,
      has_regolamento: tournamentForm.has_regolamento,
      regolamento_content: tournamentForm.regolamento_content,
      direct_link: tournamentForm.direct_link || null,
      display_order: Number(tournamentForm.display_order || 0),
      banner_position_x: Number(tournamentForm.banner_position_x || 50),
      banner_position_y: Number(tournamentForm.banner_position_y || 50),
      vods: tournamentForm.vods,
      updated_at: new Date().toISOString()
    };

    try {
      let error;
      if (isCreatingTournament) {
        const { error: insError } = await supabase.from('tournaments').insert(payload);
        error = insError;
      } else {
        const { error: updError } = await supabase.from('tournaments').update(payload).eq('id', selectedTournament.id);
        error = updError;
      }
      if (error) throw error;
      setToast({ isVisible: true, message: isCreatingTournament ? 'Torneo creato!' : 'Torneo salvato!', type: 'success' });
      setIsCreatingTournament(false);
      setIsEditingTournament(false);
      await fetchTournaments();
    } catch (err: any) {
      console.error(err);
      setToast({ isVisible: true, message: `Errore: ${err.message}`, type: 'error' });
    }
  };

  const handleDeleteTournament = async (tId: string) => {
    if (!window.confirm('Sei sicuro di voler eliminare questo torneo? Tutti i dati e scommesse collegati potrebbero andare persi.')) return;
    try {
      const { error } = await supabase.from('tournaments').delete().eq('id', tId);
      if (error) throw error;
      setToast({ isVisible: true, message: 'Torneo eliminato', type: 'success' });
      setSelectedTournament(null);
      await fetchTournaments();
    } catch (err: any) {
      setToast({ isVisible: true, message: err.message, type: 'error' });
    }
  };

  const handleSaveMarket = async () => {
    if (!marketForm.title) {
      setToast({ isVisible: true, message: 'Titolo scommessa obbligatorio', type: 'error' });
      return;
    }
    const finalOptions = marketForm.options.map((opt: any) => ({
      id: Math.random().toString(36).substring(2, 11),
      label: opt.label,
      initial_weight: Number(opt.weight || 100),
      is_disabled: false,
      total_bet: 0
    }));

    if (finalOptions.some((o: any) => !o.label)) {
      setToast({ isVisible: true, message: 'Compila tutte le opzioni', type: 'error' });
      return;
    }

    const payload = {
      tournament_slug: selectedTournament.slug,
      title: marketForm.title,
      description: marketForm.description,
      type: marketForm.type,
      event_level: marketForm.event_level,
      options: finalOptions,
      status: 'open'
    };

    try {
      const { error } = await supabase.from('betting_markets').insert(payload);
      if (error) throw error;
      setToast({ isVisible: true, message: 'Scommessa pubblicata!', type: 'success' });
      setIsCreatingMarket(false);
      setMarketForm({
        title: '',
        description: '',
        type: 'Match Winner',
        event_level: 'High Elo',
        options: [{ label: '', weight: 100 }, { label: '', weight: 100 }]
      });
      await fetchMarkets(selectedTournament.slug);
    } catch (err: any) {
      setToast({ isVisible: true, message: err.message, type: 'error' });
    }
  };

  const handleToggleMarketStatus = async (marketId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'open' ? 'closed' : 'open';
    try {
      const { error } = await supabase
        .from('betting_markets')
        .update({ status: newStatus })
        .eq('id', marketId);
      if (error) throw error;
      setToast({ isVisible: true, message: `Stato mercato aggiornato a ${newStatus}`, type: 'success' });
      await fetchMarkets(selectedTournament.slug);
    } catch (err: any) {
      setToast({ isVisible: true, message: err.message, type: 'error' });
    }
  };

  const handleSettleMarketDashboard = async (marketId: string, optionId: string) => {
    try {
      const { error } = await supabase.rpc('settle_betting_market', {
        p_market_id: marketId,
        p_winner_option_id: optionId
      });
      if (error) throw error;
      setToast({ isVisible: true, message: 'Scommessa liquidata con successo!', type: 'success' });
      setSettleConfirmOption(null);
      await fetchMarkets(selectedTournament.slug);
    } catch (err: any) {
      setToast({ isVisible: true, message: `Errore liquidazione: ${err.message}`, type: 'error' });
    }
  };

  const fetchCivilizations = async () => {
    try {
      setCivsLoading(true);
      const { data, error } = await supabase
        .from('civilizations')
        .select('*')
        .order('name', { ascending: true });
      if (error) throw error;
      setCivList(data || []);
      if (data && data.length > 0 && !selectedCiv) {
        setSelectedCiv(data[0]);
      }
    } catch (err: any) {
      console.error('Error fetching civilizations:', err);
      setToast({ isVisible: true, message: 'Errore nel caricamento delle civiltà', type: 'error' });
    } finally {
      setCivsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedCiv) {
      setCivForm({
        name: selectedCiv.name || '',
        difficulty: selectedCiv.difficulty || 'Medio',
        short_description: selectedCiv.short_description || '',
        passive_bonuses: selectedCiv.passive_bonuses || [],
        strengths: selectedCiv.strengths || [],
        weaknesses: selectedCiv.weaknesses || []
      });
      setSelectedBOIndex(null);
    }
  }, [selectedCiv]);

  const handleSaveCivDetails = async () => {
    if (!civForm.name) {
      setToast({ isVisible: true, message: 'Nome civiltà obbligatorio', type: 'error' });
      return;
    }
    try {
      const { error } = await supabase
        .from('civilizations')
        .update({
          name: civForm.name,
          difficulty: civForm.difficulty,
          short_description: civForm.short_description,
          passive_bonuses: civForm.passive_bonuses?.filter((b: string) => b.trim() !== '') || [],
          strengths: civForm.strengths?.filter((s: string) => s.trim() !== '') || [],
          weaknesses: civForm.weaknesses?.filter((w: string) => w.trim() !== '') || []
        })
        .eq('id', selectedCiv.id);
      if (error) throw error;
      setToast({ isVisible: true, message: 'Dettagli civiltà salvati!', type: 'success' });
      
      setCivList(prev => prev.map(c => c.id === selectedCiv.id ? {
        ...c,
        name: civForm.name,
        difficulty: civForm.difficulty,
        short_description: civForm.short_description,
        passive_bonuses: civForm.passive_bonuses,
        strengths: civForm.strengths,
        weaknesses: civForm.weaknesses
      } : c));
      
      setSelectedCiv((prev: any) => ({
        ...prev,
        name: civForm.name,
        difficulty: civForm.difficulty,
        short_description: civForm.short_description,
        passive_bonuses: civForm.passive_bonuses,
        strengths: civForm.strengths,
        weaknesses: civForm.weaknesses
      }));

      refreshCivs();
    } catch (err: any) {
      setToast({ isVisible: true, message: err.message, type: 'error' });
    }
  };

  const handleEditBO = (index: number) => {
    setSelectedBOIndex(index);
    if (index === -1) {
      setBoForm({
        id: `bo-${Date.now()}`,
        title: '',
        difficulty: 2,
        description: '',
        map: '',
        author_nickname: useAuth().user?.nickname || '',
        author_rank: useAuth().user?.rank || '',
        banner_url: '',
        banner_position: 50,
        source: '',
        steps: []
      });
      setBoManualText('');
    } else {
      const bo = selectedCiv.build_orders[index];
      setBoForm({
        id: bo.id || `bo-${Date.now()}`,
        title: bo.title || '',
        difficulty: bo.difficulty || 2,
        description: bo.description || '',
        map: bo.map || '',
        author_nickname: bo.author_nickname || '',
        author_rank: bo.author_rank || '',
        banner_url: bo.banner_url || '',
        banner_position: bo.banner_position || 50,
        source: bo.source || '',
        steps: bo.steps || []
      });
      setBoManualText('');
    }
  };

  const handleSaveBO = async () => {
    if (!boForm.title) {
      setToast({ isVisible: true, message: 'Titolo build order obbligatorio', type: 'error' });
      return;
    }
    try {
      const currentBOs = [...(selectedCiv.build_orders || [])];
      if (selectedBOIndex === -1) {
        currentBOs.push(boForm);
      } else if (selectedBOIndex !== null) {
        currentBOs[selectedBOIndex] = boForm;
      }

      const { error } = await supabase
        .from('civilizations')
        .update({ build_orders: currentBOs })
        .eq('id', selectedCiv.id);

      if (error) throw error;
      setToast({ isVisible: true, message: 'Build order salvato!', type: 'success' });
      
      const updatedCiv = { ...selectedCiv, build_orders: currentBOs };
      setSelectedCiv(updatedCiv);
      setCivList(prev => prev.map(c => c.id === selectedCiv.id ? updatedCiv : c));
      setSelectedBOIndex(null);
      refreshCivs();

      if (selectedBOIndex === -1) {
        try {
          await sendNewBuildOrderWebhook({
            civId: selectedCiv.id,
            civName: selectedCiv.name,
            boId: boForm.id,
            boTitle: boForm.title,
            difficulty: boForm.difficulty,
            description: boForm.description,
            map: boForm.map,
            bannerUrl: boForm.banner_url
          });
        } catch (webErr) {
          console.error(webErr);
        }
      }
    } catch (err: any) {
      setToast({ isVisible: true, message: err.message, type: 'error' });
    }
  };

  const handleDeleteBO = async (index: number) => {
    if (!window.confirm('Sei sicuro di voler eliminare questo build order?')) return;
    try {
      const currentBOs = [...(selectedCiv.build_orders || [])];
      currentBOs.splice(index, 1);

      const { error } = await supabase
        .from('civilizations')
        .update({ build_orders: currentBOs })
        .eq('id', selectedCiv.id);

      if (error) throw error;
      setToast({ isVisible: true, message: 'Build order eliminato', type: 'success' });
      const updatedCiv = { ...selectedCiv, build_orders: currentBOs };
      setSelectedCiv(updatedCiv);
      setCivList(prev => prev.map(c => c.id === selectedCiv.id ? updatedCiv : c));
      refreshCivs();
    } catch (err: any) {
      setToast({ isVisible: true, message: err.message, type: 'error' });
    }
  };

  const handleAIBOAnalysis = async () => {
    if (!boManualText.trim()) {
      setToast({ isVisible: true, message: 'Incolla il testo per l\'analisi', type: 'error' });
      return;
    }
    try {
      setIsAnalyzingBO(true);
      setBoAnalysisProgress(10);
      const timer = setInterval(() => {
        setBoAnalysisProgress(p => p < 90 ? p + Math.random() * 8 : p);
      }, 500);

      const response = await fetch('/api/analyze-bo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          youtubeUrl: null,
          rawText: boManualText,
          civName: selectedCiv.name
        }),
      });

      clearInterval(timer);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || error.error || 'Errore durante l\'analisi');
      }

      const data = await response.json();
      setBoForm((prev: any) => ({
        ...prev,
        description: data.description || prev.description,
        steps: data.steps && data.steps.length > 0 ? data.steps : prev.steps
      }));
      setBoAnalysisProgress(100);
      setToast({ isVisible: true, message: 'Analisi completata con successo!', type: 'success' });
    } catch (err: any) {
      console.error(err);
      setToast({ isVisible: true, message: `Errore IA: ${err.message}`, type: 'error' });
    } finally {
      setIsAnalyzingBO(false);
      setBoAnalysisProgress(0);
    }
  };

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

  const handleSendNotifications = async () => {
    if (pendingNotifCount === 0 || !isSuperAdmin) return;

    try {
      setIsSendingEmail(true);
      setToast({ isVisible: false, message: '', type: 'success' });

      const token = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

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

      setSendNotifSuccess(true);
      setPendingNotifCount(0);
      setTimeout(() => {
        setSendNotifSuccess(false);
      }, 3000);
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
              boData = {
                title: `Proposta Community - ${new Date().toLocaleDateString('it-IT')}`,
                steps: sugg.suggestion_text.split('\n').filter(l => l.trim() !== '').map(l => ({ action: l })),
                source: sugg.source || ''
              };
            }

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

      setSuggestions(prev => prev.filter(s => s.id !== sugg.id));
      setRejectionModalSugg(null);
      setRejectionReason('');
      fetchPendingNotifCount();

      if (newStatus === 'implemented') {
        refreshCivs();
      }
      
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

      (window as any).refreshNotificationCount?.();
    } catch (err: any) {
      console.error(`Error updating ${type} status:`, err);
      setToast({ isVisible: true, message: 'Errore nell\'operazione', type: 'error' });
    }
  };

  if (!isAuthenticated || !isAdmin) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#070a13] text-white">
        <Loader2 className="animate-spin text-blue-400" size={48} />
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex bg-[#070a13] text-white overflow-hidden font-sans">
      
      {/* Sidebar di Navigazione Dashboard */}
      <aside className="w-64 bg-[#0a0e1c] border-r border-[#D4AF37]/15 flex flex-col shrink-0">
        <div className="p-6 border-b border-white/5 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600/10 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold">M</div>
          <div>
            <h1 className="text-sm font-black uppercase tracking-wider text-white">Manuale Civ</h1>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Admin Control</p>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'overview' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/10' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
          >
            <LayoutDashboard size={18} />
            <span>Panoramica</span>
          </button>
          
          <button
            onClick={() => setActiveTab('proposte')}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'proposte' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/10' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
          >
            <div className="flex items-center gap-3">
              <Inbox size={18} />
              <span>Proposte</span>
            </div>
            {suggestions.length > 0 && (
              <span className="px-2 py-0.5 bg-red-500 text-white text-[10px] rounded-full font-black">
                {suggestions.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('qa')}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'qa' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/10' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
          >
            <div className="flex items-center gap-3">
              <MessageSquare size={18} />
              <span>Q&A Mod</span>
            </div>
            {(questions.length + answers.length) > 0 && (
              <span className="px-2 py-0.5 bg-yellow-500 text-black text-[10px] rounded-full font-black">
                {questions.length + answers.length}
              </span>
            )}
          </button>

          {(isSuperAdmin || canManageTournaments) && (
            <button
              onClick={() => setActiveTab('tornei')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'tornei' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/10' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
            >
              <Trophy size={18} />
              <span>Gestione Tornei</span>
            </button>
          )}

          {(isSuperAdmin || canManageCivs || canManageBuildorders) && (
            <button
              onClick={() => setActiveTab('civilta')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'civilta' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/10' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
            >
              <BookOpen size={18} />
              <span>Civiltà & BO</span>
            </button>
          )}

          {isSuperAdmin && (
            <>
              <button
                onClick={() => setActiveTab('users')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'users' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/10' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
              >
                <ShieldCheck size={18} />
                <span>Permessi Staff</span>
              </button>

              <button
                onClick={() => setActiveTab('pecore')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'pecore' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/10' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
              >
                <span className="text-base">🐑</span>
                <span>Bilancio Pecore</span>
              </button>
            </>
          )}
        </nav>

        <div className="p-4 border-t border-white/5">
          <button
            onClick={() => navigate('/')}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl text-xs font-bold uppercase transition-all"
          >
            <ArrowLeft size={16} />
            <span>Torna al Sito</span>
          </button>
        </div>
      </aside>

      {/* Area Contenuto Principale */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        
        {/* Header superiore */}
        <header className="h-20 border-b border-white/5 flex items-center justify-between px-8 bg-[#0a0e1c]/40 backdrop-blur-sm shrink-0">
          <div>
            <h2 className="text-xl font-bold uppercase tracking-wider">
              {activeTab === 'overview' && 'Pannello di Controllo'}
              {activeTab === 'proposte' && 'Gestione Suggerimenti'}
              {activeTab === 'qa' && 'Moderazione Domande & Risposte'}
              {activeTab === 'users' && 'Staff & Permessi'}
              {activeTab === 'pecore' && 'Bilancio Pecore'}
            </h2>
            <p className="text-xs text-gray-400">
              {activeTab === 'overview' && 'Panoramica e statistiche globali del manuale.'}
              {activeTab === 'proposte' && 'Revisiona e approva i suggerimenti inviati dalla community.'}
              {activeTab === 'qa' && 'Approva, rifiuta o elimina i contributi Q&A degli utenti.'}
              {activeTab === 'users' && 'Gestisci i permessi operativi ed i ruoli dello staff.'}
              {activeTab === 'pecore' && 'Gestisci e ricarica i saldi di pecore dei pastori.'}
            </p>
          </div>
        </header>

        {/* Corpo scrollabile */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          
          {/* TAB PANELS */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div 
                  onClick={() => setActiveTab('proposte')}
                  className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 hover:border-blue-500/30 transition-all cursor-pointer group"
                >
                  <div className="w-12 h-12 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-4 group-hover:scale-110 transition-transform">
                    <Inbox size={24} />
                  </div>
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Proposte Pendenti</h3>
                  <p className="text-3xl font-black mt-2 text-white">{suggestions.length}</p>
                </div>
                
                <div 
                  onClick={() => setActiveTab('qa')}
                  className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 hover:border-blue-500/30 transition-all cursor-pointer group"
                >
                  <div className="w-12 h-12 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center text-yellow-500 mb-4 group-hover:scale-110 transition-transform">
                    <MessageSquare size={24} />
                  </div>
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Contributi Q&A Pendenti</h3>
                  <p className="text-3xl font-black mt-2 text-white">{questions.length + answers.length}</p>
                </div>

                <div 
                  onClick={() => setActiveTab('pecore')}
                  className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 hover:border-blue-500/30 transition-all cursor-pointer group"
                >
                  <div className="w-12 h-12 rounded-xl bg-cyan-600/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-4 group-hover:scale-110 transition-transform">
                    <span className="text-2xl">🐑</span>
                  </div>
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Utenti Registrati</h3>
                  <p className="text-3xl font-black mt-2 text-white">{allProfiles.length}</p>
                </div>
              </div>

              <div className="bg-[#0a0e1c]/60 border border-white/5 rounded-2xl p-8 flex flex-col md:flex-row items-center gap-6">
                <div className="w-16 h-16 rounded-full bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center text-yellow-500 text-3xl">🔑</div>
                <div>
                  <h3 className="text-lg font-bold">Benvenuto nel Pannello Admin, {useAuth().user?.nickname || 'Admin'}</h3>
                  <p className="text-sm text-gray-400 mt-1 max-w-xl">
                    Da qui puoi moderare il sito con un solo clic. Tutte le modifiche fatte alle proposte o al Q&A saranno sincronizzate immediatamente in tempo reale sul database.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'proposte' && (
            <div className="space-y-4">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 text-center bg-white/[0.02] border border-white/5 rounded-2xl">
                  <Loader2 className="animate-spin text-blue-400 mb-2" size={32} />
                  <p className="text-gray-400 text-sm">Caricamento proposte...</p>
                </div>
              ) : suggestions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center bg-white/[0.02] border border-white/5 rounded-2xl">
                  <Inbox size={48} className="text-gray-600 mb-4" />
                  <h3 className="text-lg font-bold text-white">Tutto gestito!</h3>
                  <p className="text-gray-400 text-sm mt-1">Non ci sono proposte in sospeso da approvare.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {suggestions.map((sugg) => (
                    <div key={sugg.id} className="bg-[#0a0e1c]/40 border border-[#D4AF37]/20 rounded-xl p-5 hover:border-blue-500/50 transition-colors relative overflow-hidden group">
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
                                className="text-xs text-blue-400 hover:underline font-bold"
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
          )}

          {activeTab === 'qa' && (
            <div className="space-y-8">
              {qaLoading ? (
                <div className="flex flex-col items-center justify-center py-20 text-center bg-white/[0.02] border border-white/5 rounded-2xl">
                  <Loader2 className="animate-spin text-blue-400 mb-2" size={32} />
                  <p className="text-gray-400 text-sm">Caricamento domande e risposte...</p>
                </div>
              ) : (
                <>
                  {/* Domande Pendenti */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-black text-yellow-500 uppercase tracking-widest flex items-center gap-3">
                      <MessageSquare size={16} className="text-yellow-500 shrink-0" /> Domande da Approvare ({questions.length})
                    </h3>
                    {questions.length === 0 ? (
                      <p className="text-gray-500 text-sm italic py-4">Nessuna domanda in sospeso.</p>
                    ) : (
                  <div className="grid gap-4">
                    {questions.map(q => (
                      <div key={q.id} className="bg-[#0a0e1c]/40 border border-white/5 p-5 rounded-xl space-y-4">
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
                                  >
                                    <CheckCircle size={18} />
                                    <span>Approva</span>
                                  </button>
                                  <button 
                                    onClick={() => handleUpdateQAStatus(q, 'question', 'rejected')} 
                                    className="flex items-center gap-2 px-5 py-2.5 bg-red-500/10 text-red-500 rounded-xl border border-red-500/20 hover:bg-red-500/20 hover:scale-105 transition-all text-xs font-black uppercase tracking-wider" 
                                  >
                                    <XCircle size={18} />
                                    <span>Rifiuta</span>
                                  </button>
                                  <button 
                                    onClick={() => setDeleteConfirm({ id: q.id, type: 'question', item: q })} 
                                    className="flex items-center gap-2 px-4 py-2.5 bg-white/5 text-gray-400 rounded-xl border border-white/5 hover:bg-red-500/20 hover:text-red-500 hover:border-red-500/30 transition-all text-xs font-bold uppercase ml-auto" 
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

              {/* Risposte Pendenti */}
              <div className="space-y-4">
                <h3 className="text-sm font-black text-blue-400 uppercase tracking-widest flex items-center gap-3">
                  <Send size={16} className="text-blue-400 shrink-0" /> Risposte da Approvare ({answers.length})
                </h3>
                {answers.length === 0 ? (
                  <p className="text-gray-500 text-sm italic py-4">Nessuna risposta in sospeso.</p>
                ) : (
                  <div className="grid gap-4">
                    {answers.map(a => (
                      <div key={a.id} className="bg-[#0a0e1c]/40 border border-white/5 p-5 rounded-xl space-y-4">
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
                                  >
                                    <CheckCircle size={18} />
                                    <span>Approva</span>
                                  </button>
                                  <button 
                                    onClick={() => handleUpdateQAStatus(a, 'answer', 'rejected')} 
                                    className="flex items-center gap-2 px-5 py-2.5 bg-red-500/10 text-red-500 rounded-xl border border-red-500/20 hover:bg-red-500/20 hover:scale-105 transition-all text-xs font-black uppercase tracking-wider" 
                                  >
                                    <XCircle size={18} />
                                    <span>Rifiuta</span>
                                  </button>
                                  <button 
                                    onClick={() => setDeleteConfirm({ id: a.id, type: 'answer', item: a })} 
                                    className="flex items-center gap-2 px-4 py-2.5 bg-white/5 text-gray-400 rounded-xl border border-white/5 hover:bg-red-500/20 hover:text-red-500 hover:border-red-500/30 transition-all text-xs font-bold uppercase ml-auto" 
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
            </>
          )}
        </div>
      )}

          {activeTab === 'users' && isSuperAdmin && (
            <div className="space-y-6">
              {/* Toolbar */}
              <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-[#0a0e1c]/30 p-6 rounded-2xl border border-white/5">
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

              {inlineToast && (
                <div className={`p-3 rounded-xl border flex items-center gap-2 ${
                  inlineToast.type === 'success' 
                    ? 'bg-green-500/10 border-green-500/20 text-green-400' 
                    : 'bg-red-500/10 border-red-500/20 text-red-400'
                }`}>
                  {inlineToast.type === 'success' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
                  <span className="text-xs font-bold uppercase">{inlineToast.message}</span>
                </div>
              )}

              {userLoading ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <Loader2 className="animate-spin text-blue-400 mb-2" size={32} />
                  <p className="text-gray-400 text-sm">Caricamento staff...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {users
                  .filter(u => {
                    const email = u.email?.toLowerCase();
                    const matchSearch = !userSearch ||
                      u.email?.toLowerCase().includes(userSearch.toLowerCase()) ||
                      u.nickname?.toLowerCase().includes(userSearch.toLowerCase());

                    const hardcodedStaff = [
                      'marcotamby@gmail.com', 'marco.tamborrino.94@gmail.com',
                      'alessio.bella97@gmail.com', 'contattodisparta@gmail.com',
                      'cani.vincenzo@gmail.com', 'dadduedo@gmail.com', 'djalfredoneservice@gmail.com'
                    ];

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
                  .map(u => (
                    <div key={u.id} className={`bg-[#0a0e1c]/40 border rounded-2xl p-5 flex flex-col gap-4 group hover:bg-white/[0.02] transition-all ${u.role === 'admin' ? 'border-yellow-500/20' : 'border-white/5'}`}>
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
                                  className="bg-black/60 border border-blue-500/50 rounded px-2 py-1 text-sm text-white focus:outline-none"
                                  value={tempNickname}
                                  disabled={isSavingNickname === u.email}
                                  onChange={(e) => setTempNickname(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleUpdateNickname(u.email, tempNickname);
                                    if (e.key === 'Escape') setEditingNickname(null);
                                  }}
                                />
                                <button
                                  type="button"
                                  onClick={() => handleUpdateNickname(u.email, tempNickname)}
                                  disabled={isSavingNickname === u.email}
                                  className="text-green-500 hover:text-green-400"
                                >
                                  {isSavingNickname === u.email ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 group/nick relative">
                                <span className={`text-base md:text-lg font-bold text-white truncate leading-tight transition-colors ${savedSuccess === u.email ? 'text-green-400' : ''}`}>
                                  {u.nickname || 'Senza Nickname'}
                                </span>
                                {savedSuccess === u.email && <CheckCircle size={12} className="text-green-400 animate-in" />}
                                <button
                                  onClick={() => { setEditingNickname(u.email); setTempNickname(u.nickname || ''); }}
                                  className="opacity-0 group-hover/nick:opacity-100 p-1 text-gray-500 hover:text-blue-400 transition-all"
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
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] select-none">Permessi</span>
                        <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/5">
                          <button
                            onClick={() => handleToggleUserRole(u.email, 'can_manage_tournaments', !u.can_manage_tournaments)}
                            className={`w-9 h-9 flex items-center justify-center rounded-lg transition-all ${u.can_manage_tournaments ? 'bg-yellow-500 text-black' : 'bg-gray-800/50 text-gray-500 hover:text-white'}`}
                            title="Gestione Tornei"
                          >
                            <Trophy size={16} />
                          </button>

                          <button
                            onClick={() => handleToggleUserRole(u.email, 'can_manage_civs', !u.can_manage_civs)}
                            className={`w-9 h-9 flex items-center justify-center rounded-lg transition-all ${u.can_manage_civs ? 'bg-blue-600 text-white' : 'bg-gray-800/50 text-gray-500 hover:text-white'}`}
                            title="Gestione Civiltà"
                          >
                            <BookOpen size={16} />
                          </button>

                          <button
                            onClick={() => handleToggleUserRole(u.email, 'can_manage_buildorders', !u.can_manage_buildorders)}
                            className={`w-9 h-9 flex items-center justify-center rounded-lg transition-all ${u.can_manage_buildorders ? 'bg-orange-500 text-white' : 'bg-gray-800/50 text-gray-500 hover:text-white'}`}
                            title="Gestione Build Orders"
                          >
                            <Zap size={16} />
                          </button>

                          <div className="w-px h-4 bg-white/10 mx-1" />

                          <button
                            onClick={() => handleToggleUserRole(u.email, 'is_streamer', !u.is_streamer)}
                            className={`w-9 h-9 flex items-center justify-center rounded-lg transition-all ${u.is_streamer ? 'bg-pink-600 text-white' : 'bg-gray-800/50 text-gray-500 hover:text-white'}`}
                            title="Streamer"
                          >
                            <Radio size={16} />
                          </button>
                          
                          {isSuperAdmin && (
                            <>
                              <div className="w-px h-4 bg-white/10 mx-1" />
                              <button
                                onClick={() => handleDeleteUser(u.email)}
                                className="w-9 h-9 flex items-center justify-center rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-all"
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
              </div>
              )}
            </div>
          )}

          {activeTab === 'pecore' && isSuperAdmin && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-[#0a0e1c]/30 p-6 rounded-2xl border border-white/5">
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

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {allProfiles
                  .filter(p => !userSearch || p.email?.toLowerCase().includes(userSearch.toLowerCase()) || p.nickname?.toLowerCase().includes(userSearch.toLowerCase()))
                  .map(p => (
                    <div key={p.email} className="bg-[#0a0e1c]/40 border border-white/5 rounded-2xl p-5 flex flex-col gap-4 hover:border-cyan-500/30 transition-all group">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-cyan-500/10 flex items-center justify-center text-cyan-400 font-bold border border-cyan-500/20 overflow-hidden">
                          {p.avatar_url ? (
                            <img 
                              src={p.avatar_url} 
                              alt={p.nickname || p.email} 
                              className="w-full h-full object-cover"
                              onError={(e) => {
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
                              className="w-12 bg-transparent text-xs text-white font-bold text-center outline-none"
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
          )}

          {/* TAB TORNEI */}
          {activeTab === 'tornei' && (isSuperAdmin || canManageTournaments) && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-500">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* Sidebar Tornei */}
                <div className="lg:col-span-4 bg-[#0a0e1c]/60 border border-[#D4AF37]/15 rounded-3xl p-6 space-y-6 shadow-2xl backdrop-blur-md relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[#D4AF37]/35 to-transparent"></div>
                  
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black text-cyan-400 uppercase tracking-[0.25em] flex items-center gap-2">
                      <Trophy size={14} className="text-yellow-500 animate-pulse" /> Tornei Attivi
                    </h3>
                    <button
                      onClick={() => {
                        setIsCreatingTournament(true);
                        setIsEditingTournament(true);
                        setSelectedTournament(null);
                        setTournamentForm({
                          name: '',
                          organizer: '',
                          period: '',
                          banner_url: '',
                          status: 'Programmato',
                          type: '1v1',
                          has_regolamento: false,
                          regolamento_content: '',
                          direct_link: '',
                          display_order: 0,
                          banner_position_x: 50,
                          banner_position_y: 50,
                          vods: []
                        });
                      }}
                      className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-black transition-all hover:-translate-y-0.5 shadow-lg active:scale-95 uppercase tracking-widest flex items-center gap-1.5"
                    >
                      <Plus size={14} strokeWidth={3} /> Nuovo
                    </button>
                  </div>

                  {tournamentsLoading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                      <Loader2 className="animate-spin text-cyan-400 mb-2" size={32} />
                      <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Sincronizzazione...</span>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                      {tournaments.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => {
                            setSelectedTournament(t);
                            setIsCreatingTournament(false);
                            setIsEditingTournament(false);
                          }}
                          className={`w-full flex items-center justify-between p-4 rounded-2xl border text-left transition-all hover:scale-[1.02] ${selectedTournament?.id === t.id && !isCreatingTournament ? 'bg-gradient-to-r from-blue-950/40 to-indigo-950/40 border-blue-500/80 text-white shadow-[0_0_20px_rgba(59,130,246,0.15)]' : 'bg-black/30 border-white/5 text-gray-400 hover:text-white hover:bg-white/5 hover:border-white/10'}`}
                        >
                          <div>
                            <span className="font-bold text-sm block leading-tight">{t.name}</span>
                            <span className={`text-[9px] uppercase font-black tracking-widest block mt-1 ${t.status === 'In Corso' ? 'text-green-400' : t.status === 'Concluso' ? 'text-gray-500' : 'text-yellow-500'}`}>{t.status} • {t.type}</span>
                          </div>
                          <span className="text-xs font-black text-gray-600 bg-white/5 px-2 py-0.5 rounded-lg border border-white/5">#{t.display_order}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Dettagli / Gestione Scommesse */}
                <div className="lg:col-span-8 space-y-6">
                  {(selectedTournament || isCreatingTournament) ? (
                    <div className="bg-[#0a0e1c]/60 border border-[#D4AF37]/15 rounded-3xl p-8 space-y-8 shadow-2xl backdrop-blur-md relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-blue-500/35 to-transparent"></div>
                      
                      {/* Titolo Sezione */}
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-white/5 pb-6 gap-4">
                        <div>
                          <h3 className="text-2xl font-black text-white tracking-tight uppercase leading-none">
                            {isCreatingTournament ? 'Nuovo Torneo' : selectedTournament?.name}
                          </h3>
                          <p className="text-xs text-cyan-400/60 font-bold uppercase tracking-widest mt-2">
                            {isCreatingTournament ? 'Configura le informazioni iniziali del torneo' : 'Gestisci metadati e mercati scommesse'}
                          </p>
                        </div>
                        {!isCreatingTournament && (
                          <div className="flex gap-2 shrink-0">
                            <button
                              onClick={() => setIsEditingTournament(!isEditingTournament)}
                              className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white border-2 border-white/10 hover:border-white/20 rounded-xl text-xs font-black transition-all hover:-translate-y-0.5 active:scale-95 uppercase tracking-wider"
                            >
                              {isEditingTournament ? 'Visualizza Scommesse' : 'Modifica Torneo'}
                            </button>
                            <button
                              onClick={() => handleDeleteTournament(selectedTournament.id)}
                              className="p-2.5 bg-red-500/10 hover:bg-red-500/20 border-2 border-red-500/20 text-red-400 rounded-xl transition-all hover:-translate-y-0.5 active:scale-95"
                              title="Elimina Torneo"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Configurazione Form o Scommesse */}
                      {isEditingTournament || isCreatingTournament ? (
                        <div className="space-y-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                              <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] block mb-2">Nome Torneo</label>
                              <input
                                type="text"
                                value={tournamentForm.name}
                                onChange={(e) => setTournamentForm({ ...tournamentForm, name: e.target.value })}
                                className="w-full bg-white/[0.02] border-2 border-white/10 hover:border-white/20 focus:border-blue-500/50 rounded-2xl px-4 py-3 text-sm text-white focus:bg-white/[0.04] focus:shadow-[0_0_15px_rgba(59,130,246,0.1)] transition-all outline-none font-bold"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] block mb-2">Organizzatore</label>
                              <input
                                type="text"
                                value={tournamentForm.organizer}
                                onChange={(e) => setTournamentForm({ ...tournamentForm, organizer: e.target.value })}
                                className="w-full bg-white/[0.02] border-2 border-white/10 hover:border-white/20 focus:border-blue-500/50 rounded-2xl px-4 py-3 text-sm text-white focus:bg-white/[0.04] focus:shadow-[0_0_15px_rgba(59,130,246,0.1)] transition-all outline-none"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                              <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] block mb-2">Stato</label>
                              <select
                                value={tournamentForm.status}
                                onChange={(e) => setTournamentForm({ ...tournamentForm, status: e.target.value })}
                                className="w-full bg-[#111218] border-2 border-white/10 hover:border-white/20 focus:border-blue-500/50 rounded-2xl px-4 py-3 text-sm text-white focus:shadow-[0_0_15px_rgba(59,130,246,0.1)] transition-all outline-none font-bold [&>option]:bg-[#111218]"
                              >
                                <option value="Programmato">Programmato</option>
                                <option value="In Corso">In Corso</option>
                                <option value="Concluso">Concluso</option>
                              </select>
                            </div>
                            <div>
                              <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] block mb-2">Tipo</label>
                              <input
                                type="text"
                                value={tournamentForm.type}
                                onChange={(e) => setTournamentForm({ ...tournamentForm, type: e.target.value })}
                                className="w-full bg-white/[0.02] border-2 border-white/10 hover:border-white/20 focus:border-blue-500/50 rounded-2xl px-4 py-3 text-sm text-white focus:bg-white/[0.04] focus:shadow-[0_0_15px_rgba(59,130,246,0.1)] transition-all outline-none"
                                placeholder="es: 1v1, 2v2, 3v3"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] block mb-2">Ordine Visualizzazione</label>
                              <input
                                type="number"
                                value={tournamentForm.display_order}
                                onChange={(e) => setTournamentForm({ ...tournamentForm, display_order: e.target.value })}
                                className="w-full bg-white/[0.02] border-2 border-white/10 hover:border-white/20 focus:border-blue-500/50 rounded-2xl px-4 py-3 text-sm text-white focus:bg-white/[0.04] focus:shadow-[0_0_15px_rgba(59,130,246,0.1)] transition-all outline-none text-center font-bold"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                              <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] block mb-2">Periodo / Date</label>
                              <input
                                type="text"
                                value={tournamentForm.period}
                                onChange={(e) => setTournamentForm({ ...tournamentForm, period: e.target.value })}
                                className="w-full bg-white/[0.02] border-2 border-white/10 hover:border-white/20 focus:border-blue-500/50 rounded-2xl px-4 py-3 text-sm text-white focus:bg-white/[0.04] focus:shadow-[0_0_15px_rgba(59,130,246,0.1)] transition-all outline-none"
                                placeholder="es: 12 - 15 Giugno 2026"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] block mb-2">Banner Image URL</label>
                              <input
                                type="text"
                                value={tournamentForm.banner_url}
                                onChange={(e) => setTournamentForm({ ...tournamentForm, banner_url: e.target.value })}
                                className="w-full bg-white/[0.02] border-2 border-white/10 hover:border-white/20 focus:border-blue-500/50 rounded-2xl px-4 py-3 text-sm text-white focus:bg-white/[0.04] focus:shadow-[0_0_15px_rgba(59,130,246,0.1)] transition-all outline-none text-xs text-blue-300 font-mono"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] block mb-2">Link Diretto Challonge/Startgg</label>
                            <input
                              type="text"
                              value={tournamentForm.direct_link}
                              onChange={(e) => setTournamentForm({ ...tournamentForm, direct_link: e.target.value })}
                              className="w-full bg-white/[0.02] border-2 border-white/10 hover:border-white/20 focus:border-blue-500/50 rounded-2xl px-4 py-3 text-sm text-white focus:bg-white/[0.04] focus:shadow-[0_0_15px_rgba(59,130,246,0.1)] transition-all outline-none"
                              placeholder="https://challonge.com/..."
                            />
                          </div>

                          <div className="border-2 border-white/5 bg-black/20 p-6 rounded-3xl space-y-4">
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                id="has_regolamento"
                                checked={tournamentForm.has_regolamento}
                                onChange={(e) => setTournamentForm({ ...tournamentForm, has_regolamento: e.target.checked })}
                                className="w-5 h-5 rounded-lg bg-black/40 border-2 border-white/20 text-blue-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                              />
                              <label htmlFor="has_regolamento" className="text-xs font-black uppercase tracking-wider text-white select-none cursor-pointer">Abilita Regolamento Dedicato</label>
                            </div>
                            {tournamentForm.has_regolamento && (
                              <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] block mb-2">Contenuto Regolamento (Markdown supportato)</label>
                                <textarea
                                  value={tournamentForm.regolamento_content}
                                  onChange={(e) => setTournamentForm({ ...tournamentForm, regolamento_content: e.target.value })}
                                  rows={6}
                                  className="w-full bg-white/[0.01] border-2 border-white/10 hover:border-white/20 focus:border-blue-500/50 rounded-2xl p-4 text-xs text-white focus:shadow-[0_0_15px_rgba(59,130,246,0.1)] transition-all outline-none font-sans"
                                  placeholder="Inserisci qui le regole del torneo..."
                                />
                              </div>
                            )}
                          </div>

                          <div className="flex justify-end gap-3 pt-6 border-t border-white/5">
                            <button
                              onClick={() => {
                                setIsEditingTournament(false);
                                setIsCreatingTournament(false);
                              }}
                              className="px-5 py-3 border-2 border-white/10 text-gray-400 hover:text-white hover:border-white/20 rounded-xl transition-all font-black text-xs uppercase tracking-widest active:scale-95"
                            >
                              Annulla
                            </button>
                            <button
                              onClick={handleSaveTournament}
                              className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg hover:-translate-y-0.5 active:scale-95 transition-all flex items-center gap-2"
                            >
                              <Save size={14} strokeWidth={3} /> Salva Torneo
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-6 animate-in fade-in duration-300">
                          
                          {/* Scommesse Tab Content */}
                          <div className="flex justify-between items-center">
                            <h4 className="text-xs font-black text-white uppercase tracking-[0.2em] flex items-center gap-2">
                              <Radio size={16} className="text-red-500 animate-pulse" /> Mercati Scommesse
                            </h4>
                            <button
                              onClick={() => setIsCreatingMarket(true)}
                              className="px-4 py-2 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-black rounded-xl text-xs font-black transition-all hover:-translate-y-0.5 shadow-lg active:scale-95 uppercase tracking-widest flex items-center gap-1.5"
                            >
                              <Plus size={14} strokeWidth={3} /> Nuova Scommessa
                            </button>
                          </div>

                          {isCreatingMarket && (
                            <div className="bg-black/30 border-2 border-yellow-500/20 p-6 rounded-3xl space-y-6 animate-in zoom-in-95 duration-300">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] block mb-2">Titolo Scommessa</label>
                                  <input
                                    type="text"
                                    value={marketForm.title}
                                    onChange={(e) => setMarketForm({ ...marketForm, title: e.target.value })}
                                    className="w-full bg-[#111218] border-2 border-white/10 hover:border-white/20 focus:border-yellow-500/50 rounded-2xl px-4 py-3 text-xs text-white focus:shadow-[0_0_15px_rgba(234,179,8,0.1)] transition-all outline-none font-bold"
                                    placeholder="es: VortiX vs LucifroN"
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] block mb-2">Descrizione</label>
                                  <input
                                    type="text"
                                    value={marketForm.description}
                                    onChange={(e) => setMarketForm({ ...marketForm, description: e.target.value })}
                                    className="w-full bg-[#111218] border-2 border-white/10 hover:border-white/20 focus:border-yellow-500/50 rounded-2xl px-4 py-3 text-xs text-white focus:shadow-[0_0_15px_rgba(234,179,8,0.1)] transition-all outline-none"
                                    placeholder="es: Match Winner semifinale"
                                  />
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] block mb-2">Tipo Mercato</label>
                                  <select
                                    value={marketForm.type}
                                    onChange={(e) => setMarketForm({ ...marketForm, type: e.target.value })}
                                    className="w-full bg-[#111218] border-2 border-white/10 hover:border-white/20 focus:border-yellow-500/50 rounded-2xl px-4 py-3 text-xs text-white focus:shadow-[0_0_15px_rgba(234,179,8,0.1)] transition-all outline-none font-bold [&>option]:bg-[#111218]"
                                  >
                                    <option value="Match Winner">Match Winner</option>
                                    <option value="Tournament Winner">Tournament Winner</option>
                                    <option value="Final Score">Final Score</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] block mb-2">Fascia Elo</label>
                                  <select
                                    value={marketForm.event_level}
                                    onChange={(e) => setMarketForm({ ...marketForm, event_level: e.target.value })}
                                    className="w-full bg-[#111218] border-2 border-white/10 hover:border-white/20 focus:border-yellow-500/50 rounded-2xl px-4 py-3 text-xs text-white focus:shadow-[0_0_15px_rgba(234,179,8,0.1)] transition-all outline-none font-bold [&>option]:bg-[#111218]"
                                  >
                                    <option value="High Elo">High Elo</option>
                                    <option value="Low Elo">Low Elo</option>
                                  </select>
                                </div>
                              </div>

                              <div className="space-y-3">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] block">Opzioni & Pesi Iniziali</label>
                                <div className="space-y-2">
                                  {marketForm.options.map((opt: any, idx: number) => (
                                    <div key={idx} className="flex gap-3 items-center">
                                      <input
                                        type="text"
                                        value={opt.label}
                                        onChange={(e) => {
                                          const newOpts = [...marketForm.options];
                                          newOpts[idx].label = e.target.value;
                                          setMarketForm({ ...marketForm, options: newOpts });
                                        }}
                                        className="flex-1 bg-[#111218] border-2 border-white/10 hover:border-white/20 focus:border-yellow-500/50 rounded-xl px-4 py-2 text-xs text-white focus:shadow-[0_0_15px_rgba(234,179,8,0.1)] transition-all outline-none font-bold"
                                        placeholder={`Opzione ${idx + 1}`}
                                      />
                                      <input
                                        type="number"
                                        value={opt.weight}
                                        onChange={(e) => {
                                          const newOpts = [...marketForm.options];
                                          newOpts[idx].weight = e.target.value;
                                          setMarketForm({ ...marketForm, options: newOpts });
                                        }}
                                        className="w-24 bg-[#111218] border-2 border-white/10 hover:border-white/20 focus:border-yellow-500/50 rounded-xl px-4 py-2 text-xs text-white focus:shadow-[0_0_15px_rgba(234,179,8,0.1)] transition-all outline-none text-center font-bold"
                                        placeholder="Peso"
                                        title="Peso probabilistico iniziale"
                                      />
                                      {marketForm.options.length > 2 && (
                                        <button
                                          onClick={() => {
                                            const newOpts = marketForm.options.filter((_: any, i: number) => i !== idx);
                                            setMarketForm({ ...marketForm, options: newOpts });
                                          }}
                                          className="p-2 bg-red-500/10 hover:bg-red-500/25 border-2 border-red-500/20 text-red-400 rounded-xl text-xs transition-colors"
                                        >
                                          <X size={14} />
                                        </button>
                                      )}
                                    </div>
                                  ))}
                                </div>
                                <button
                                  onClick={() => setMarketForm({ ...marketForm, options: [...marketForm.options, { label: '', weight: 100 }] })}
                                  className="text-xs text-yellow-500 font-bold hover:underline"
                                >
                                  + Aggiungi Opzione
                                </button>
                              </div>

                              <div className="flex justify-end gap-2 pt-4 border-t border-white/5">
                                <button
                                  onClick={() => setIsCreatingMarket(false)}
                                  className="px-4 py-2 border-2 border-white/10 text-gray-400 hover:text-white rounded-xl transition-all text-xs font-bold uppercase tracking-wider"
                                >
                                  Annulla
                                </button>
                                <button
                                  onClick={handleSaveMarket}
                                  className="px-6 py-2 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-black font-black rounded-xl hover:-translate-y-0.5 active:scale-95 shadow-lg transition-all text-xs uppercase tracking-widest"
                                >
                                  Crea Scommessa
                                </button>
                              </div>
                            </div>
                          )}

                          {marketsLoading ? (
                            <div className="flex flex-col items-center justify-center py-20">
                              <Loader2 className="animate-spin text-yellow-500 mb-2" size={32} />
                              <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Caricamento mercati...</span>
                            </div>
                          ) : markets.length === 0 ? (
                            <div className="text-center py-20 bg-white/[0.01] border-2 border-dashed border-white/5 rounded-2xl text-gray-500">
                              Nessuna scommessa registrata per questo torneo.
                            </div>
                          ) : (
                            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                              {markets.map((market) => (
                                <div key={market.id} className="bg-black/30 border border-white/5 rounded-2xl p-5 space-y-4 shadow-xl">
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <span className="font-black text-sm text-white block">{market.title}</span>
                                      <span className="text-[10px] text-cyan-400/60 font-bold uppercase tracking-wider">{market.description || market.type}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className={`px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider border ${market.status === 'open' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                                        {market.status === 'open' ? 'Aperto' : 'Chiuso'}
                                      </span>
                                      <button
                                        onClick={() => handleToggleMarketStatus(market.id, market.status)}
                                        className="px-3 py-1 bg-white/5 hover:bg-white/10 text-white rounded-lg text-[9px] border-2 border-white/10 font-black transition-all uppercase tracking-wider"
                                      >
                                        {market.status === 'open' ? 'Chiudi scommesse' : 'Riapri'}
                                      </button>
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-black/40 p-4 rounded-xl border border-white/5">
                                    {market.options?.map((opt: any) => {
                                      const isWinner = market.winner_option_id === opt.id;
                                      return (
                                        <div key={opt.id} className={`p-3 rounded-xl border text-center relative flex flex-col justify-between ${isWinner ? 'bg-green-500/10 border-green-500/50 text-green-300' : 'bg-white/[0.01] border-white/5 text-gray-400'}`}>
                                          <div>
                                            <span className="text-xs font-black block truncate" title={opt.label}>{opt.label}</span>
                                            <span className="text-[10px] text-gray-500 block mt-1">Puntate: <b className="text-gray-300">{opt.total_bet || 0} 🐑</b></span>
                                          </div>
                                          
                                          {/* Settle option selector if market is closed and not settled */}
                                          {market.status === 'closed' && market.winner_option_id === null && (
                                            <button
                                              onClick={() => setSettleConfirmOption({ marketId: market.id, optionId: opt.id })}
                                              className="w-full mt-3 py-1.5 bg-yellow-500 text-black hover:bg-yellow-400 text-[9px] font-black rounded-lg transition-all uppercase tracking-wider"
                                            >
                                              Decreta Vincitore
                                            </button>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-32 text-center bg-white/[0.01] border-2 border-dashed border-white/5 rounded-3xl text-gray-500 shadow-inner">
                      <Trophy size={64} className="opacity-20 mb-4 animate-bounce" style={{ animationDuration: '4s' }} />
                      <h4 className="text-sm font-bold uppercase tracking-wider text-gray-400">Nessun torneo selezionato</h4>
                      <p className="text-xs text-gray-600 mt-2 max-w-sm">Seleziona un torneo a sinistra per gestirlo oppure creane uno nuovo.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Modale Conferma Liquidazione Scommessa */}
              {settleConfirmOption && (
                <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
                  <div className="bg-[#0a0e1c] border border-yellow-500/30 p-8 rounded-3xl max-w-sm w-full shadow-2xl text-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-yellow-500/50 to-transparent"></div>
                    <div className="w-16 h-16 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-yellow-500/20">
                      <AlertTriangle className="text-yellow-500" size={32} />
                    </div>
                    <h3 className="text-xl font-black text-white uppercase mb-2">Sei sicuro?</h3>
                    <p className="text-xs text-gray-400 mb-6">
                      Questa azione assegnerà automaticamente i premi in pecore a tutti i vincitori e non può essere annullata.
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setSettleConfirmOption(null)}
                        className="flex-1 py-3 border-2 border-white/10 text-gray-400 hover:text-white rounded-xl transition-all text-xs font-black uppercase tracking-wider active:scale-95"
                      >
                        Annulla
                      </button>
                      <button
                        onClick={() => handleSettleMarketDashboard(settleConfirmOption.marketId, settleConfirmOption.optionId)}
                        className="flex-1 py-3 bg-yellow-500 hover:bg-yellow-400 text-black rounded-xl transition-all text-xs font-black uppercase tracking-wider active:scale-95 shadow-lg"
                      >
                        Conferma
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB CIVILTA */}
          {activeTab === 'civilta' && (isSuperAdmin || canManageCivs || canManageBuildorders) && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-500">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* Sidebar Civiltà */}
                <div className="lg:col-span-3 bg-[#0a0e1c]/60 border border-[#D4AF37]/15 rounded-3xl p-6 space-y-6 shadow-2xl backdrop-blur-md relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[#D4AF37]/35 to-transparent"></div>
                  <h3 className="text-xs font-black text-cyan-400 uppercase tracking-[0.25em] border-b border-white/5 pb-3">Lista Civiltà</h3>
                  {civsLoading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                      <Loader2 className="animate-spin text-cyan-400 mb-2" size={32} />
                      <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Caricamento...</span>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[550px] overflow-y-auto pr-2 custom-scrollbar">
                      {civList.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => {
                            setSelectedCiv(c);
                            setSelectedBOIndex(null);
                          }}
                          className={`w-full text-left px-4 py-3 rounded-xl border text-sm font-bold transition-all hover:scale-[1.02] ${selectedCiv?.id === c.id ? 'bg-gradient-to-r from-blue-950/40 to-indigo-950/40 border-blue-500/80 text-white shadow-[0_0_20px_rgba(59,130,246,0.15)]' : 'bg-black/30 border-white/5 text-gray-400 hover:text-white hover:bg-white/5 hover:border-white/10'}`}
                        >
                          {c.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Corpo Editor Civiltà & BO */}
                <div className="lg:col-span-9 space-y-6">
                  {selectedCiv ? (
                    <div className="space-y-6 animate-in fade-in duration-300">
                      
                      {/* Nav Tab interna all'Editor Civ */}
                      <div className="flex items-center gap-6 border-b border-white/5 pb-1">
                        <button
                          onClick={() => setSelectedBOIndex(null)}
                          className={`pb-3 text-sm font-black uppercase tracking-wider relative transition-colors ${selectedBOIndex === null ? 'text-blue-400 font-black' : 'text-gray-400 hover:text-white'}`}
                        >
                          Dettagli Civiltà
                          {selectedBOIndex === null && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]"></span>}
                        </button>
                        <button
                          onClick={() => handleEditBO(-1)}
                          className={`pb-3 text-sm font-black uppercase tracking-wider relative transition-colors ${selectedBOIndex !== null ? 'text-blue-400 font-black' : 'text-gray-400 hover:text-white'}`}
                        >
                          Build Orders ({selectedCiv.build_orders?.length || 0})
                          {selectedBOIndex !== null && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]"></span>}
                        </button>
                      </div>

                      {/* PANEL 1: Dettagli Civiltà */}
                      {selectedBOIndex === null ? (
                        <div className="bg-[#0a0e1c]/60 border border-[#D4AF37]/15 rounded-3xl p-8 space-y-8 shadow-2xl backdrop-blur-md relative overflow-hidden">
                          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-blue-500/35 to-transparent"></div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                              <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] block mb-2">Nome Civiltà</label>
                              <input
                                type="text"
                                value={civForm.name}
                                onChange={(e) => setCivForm({ ...civForm, name: e.target.value })}
                                className="w-full bg-white/[0.02] border-2 border-white/10 hover:border-white/20 focus:border-blue-500/50 rounded-2xl px-4 py-3 text-sm text-white focus:bg-white/[0.04] focus:shadow-[0_0_15px_rgba(59,130,246,0.1)] transition-all outline-none font-bold"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] block mb-2">Difficoltà</label>
                              <select
                                value={civForm.difficulty}
                                onChange={(e) => setCivForm({ ...civForm, difficulty: e.target.value })}
                                className="w-full bg-[#111218] border-2 border-white/10 hover:border-white/20 focus:border-blue-500/50 rounded-2xl px-4 py-3 text-sm text-white focus:shadow-[0_0_15px_rgba(59,130,246,0.1)] transition-all outline-none font-bold [&>option]:bg-[#111218]"
                              >
                                <option value="Facile">Facile</option>
                                <option value="Medio">Medio</option>
                                <option value="Difficile">Difficile</option>
                              </select>
                            </div>
                          </div>

                          <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] block mb-2">Descrizione Breve</label>
                            <textarea
                              value={civForm.short_description}
                              onChange={(e) => setCivForm({ ...civForm, short_description: e.target.value })}
                              rows={5}
                              className="w-full bg-white/[0.02] border-2 border-white/10 hover:border-white/20 focus:border-blue-500/50 rounded-2xl p-4 text-sm text-white focus:bg-white/[0.04] focus:shadow-[0_0_15px_rgba(59,130,246,0.1)] transition-all outline-none"
                            />
                          </div>

                          {/* Passive bonuses list */}
                          <div className="bg-black/20 border-2 border-white/5 p-6 rounded-3xl space-y-4">
                            <label className="text-[10px] font-black text-yellow-500 uppercase tracking-[0.2em] block">Bonus Passivi</label>
                            <div className="space-y-3">
                              {civForm.passive_bonuses?.map((bonus: string, idx: number) => (
                                <div key={idx} className="flex gap-3 items-start animate-in fade-in duration-300">
                                  <textarea
                                    value={bonus}
                                    onChange={(e) => {
                                      const newB = [...civForm.passive_bonuses];
                                      newB[idx] = e.target.value;
                                      setCivForm({ ...civForm, passive_bonuses: newB });
                                    }}
                                    rows={2}
                                    className="w-full bg-white/[0.01] border-2 border-white/10 hover:border-white/20 focus:border-yellow-500/50 rounded-2xl p-3 text-xs text-white focus:shadow-[0_0_15px_rgba(234,179,8,0.1)] transition-all outline-none"
                                  />
                                  <button
                                    onClick={() => {
                                      const newB = civForm.passive_bonuses.filter((_: any, i: number) => i !== idx);
                                      setCivForm({ ...civForm, passive_bonuses: newB });
                                    }}
                                    className="p-3 bg-red-500/10 hover:bg-red-500/25 border-2 border-red-500/20 text-red-400 rounded-xl transition-all"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              ))}
                              <button
                                onClick={() => setCivForm({ ...civForm, passive_bonuses: [...(civForm.passive_bonuses || []), ''] })}
                                className="text-xs text-yellow-500 font-black uppercase tracking-wider hover:underline flex items-center gap-1.5 pt-2"
                              >
                                <Plus size={14} strokeWidth={3} /> Aggiungi Nuovo Bonus
                              </button>
                            </div>
                          </div>

                          {/* strengths & weaknesses */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-black/20 border-2 border-white/5 p-6 rounded-3xl space-y-3">
                              <label className="text-[10px] font-black text-green-500 uppercase tracking-[0.2em] block">Punti di Forza (Uno per riga)</label>
                              <textarea
                                value={civForm.strengths?.join('\n') || ''}
                                onChange={(e) => setCivForm({ ...civForm, strengths: e.target.value.split('\n') })}
                                rows={5}
                                className="w-full bg-white/[0.01] border-2 border-white/10 hover:border-white/20 focus:border-green-500/50 rounded-2xl p-4 text-xs text-white focus:shadow-[0_0_15px_rgba(34,197,94,0.1)] transition-all outline-none"
                                placeholder="Inserisci un punto di forza per riga..."
                              />
                            </div>
                            <div className="bg-black/20 border-2 border-white/5 p-6 rounded-3xl space-y-3">
                              <label className="text-[10px] font-black text-red-500 uppercase tracking-[0.2em] block">Punti di Debolezza (Uno per riga)</label>
                              <textarea
                                value={civForm.weaknesses?.join('\n') || ''}
                                onChange={(e) => setCivForm({ ...civForm, weaknesses: e.target.value.split('\n') })}
                                rows={5}
                                className="w-full bg-white/[0.01] border-2 border-white/10 hover:border-white/20 focus:border-red-500/50 rounded-2xl p-4 text-xs text-white focus:shadow-[0_0_15px_rgba(239,68,68,0.1)] transition-all outline-none"
                                placeholder="Inserisci un punto debole per riga..."
                              />
                            </div>
                          </div>

                          <div className="flex justify-end pt-4 border-t border-white/5">
                            <button
                              onClick={handleSaveCivDetails}
                              className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg hover:-translate-y-0.5 active:scale-95 transition-all flex items-center gap-2"
                            >
                              <Save size={14} strokeWidth={3} /> Salva Dettagli Civiltà
                            </button>
                          </div>
                        </div>
                      ) : (
                        
                        /* PANEL 2: Build Orders List & Editor */
                        <div className="space-y-6">
                          {selectedBOIndex === -1 || selectedBOIndex > -1 ? (
                            
                            /* INLINE BO EDITOR FORM */
                            <div className="bg-[#0a0e1c]/60 border border-[#D4AF37]/15 rounded-3xl p-8 space-y-8 shadow-2xl backdrop-blur-md relative overflow-hidden">
                              <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-cyan-500/35 to-transparent"></div>
                              
                              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                                <div>
                                  <h4 className="text-lg font-black text-white uppercase tracking-tight">
                                    {selectedBOIndex === -1 ? 'Nuovo Build Order' : 'Modifica Build Order'}
                                  </h4>
                                  <p className="text-xs text-cyan-400/60 font-bold uppercase tracking-widest mt-1">
                                    Associa passaggi temporizzati ed IA ad una strategia
                                  </p>
                                </div>
                                <button
                                  onClick={() => setSelectedBOIndex(null)}
                                  className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border-2 border-white/10 hover:border-white/20 rounded-xl text-xs font-black uppercase tracking-wider text-gray-400 hover:text-white transition-all"
                                >
                                  Chiudi Editor
                                </button>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="md:col-span-2">
                                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] block mb-2">Titolo BO</label>
                                  <input
                                    type="text"
                                    value={boForm.title}
                                    onChange={(e) => setBoForm({ ...boForm, title: e.target.value })}
                                    className="w-full bg-white/[0.02] border-2 border-white/10 hover:border-white/20 focus:border-cyan-500/50 rounded-2xl px-4 py-3 text-xs text-white focus:bg-white/[0.04] focus:shadow-[0_0_15px_rgba(6,182,212,0.1)] transition-all outline-none font-bold"
                                    placeholder="es: Fast Castle 2-TC..."
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] block mb-2">Difficoltà</label>
                                  <select
                                    value={boForm.difficulty}
                                    onChange={(e) => setBoForm({ ...boForm, difficulty: Number(e.target.value) })}
                                    className="w-full bg-[#111218] border-2 border-white/10 hover:border-white/20 focus:border-cyan-500/50 rounded-2xl px-4 py-3 text-xs text-white focus:shadow-[0_0_15px_rgba(6,182,212,0.1)] transition-all outline-none font-bold [&>option]:bg-[#111218]"
                                  >
                                    <option value={1}>Facile</option>
                                    <option value={2}>Medio</option>
                                    <option value={3}>Difficile</option>
                                  </select>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div>
                                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] block mb-2">Mappa Consigliata</label>
                                  <input
                                    type="text"
                                    value={boForm.map}
                                    onChange={(e) => setBoForm({ ...boForm, map: e.target.value })}
                                    className="w-full bg-white/[0.02] border-2 border-white/10 hover:border-white/20 focus:border-cyan-500/50 rounded-2xl px-4 py-3 text-xs text-white focus:bg-white/[0.04] focus:shadow-[0_0_15px_rgba(6,182,212,0.1)] transition-all outline-none"
                                    placeholder="Qualsiasi, Land, ecc."
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] block mb-2">Autore Nickname</label>
                                  <input
                                    type="text"
                                    value={boForm.author_nickname}
                                    onChange={(e) => setBoForm({ ...boForm, author_nickname: e.target.value })}
                                    className="w-full bg-white/[0.02] border-2 border-white/10 hover:border-white/20 focus:border-cyan-500/50 rounded-2xl px-4 py-3 text-xs text-white focus:bg-white/[0.04] focus:shadow-[0_0_15px_rgba(6,182,212,0.1)] transition-all outline-none font-bold"
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] block mb-2">Autore Rank</label>
                                  <input
                                    type="text"
                                    value={boForm.author_rank}
                                    onChange={(e) => setBoForm({ ...boForm, author_rank: e.target.value })}
                                    className="w-full bg-white/[0.02] border-2 border-white/10 hover:border-white/20 focus:border-cyan-500/50 rounded-2xl px-4 py-3 text-xs text-white focus:bg-white/[0.04] focus:shadow-[0_0_15px_rgba(6,182,212,0.1)] transition-all outline-none"
                                    placeholder="Conqueror, Diamond, etc."
                                  />
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] block mb-2">Banner Image URL</label>
                                  <input
                                    type="text"
                                    value={boForm.banner_url}
                                    onChange={(e) => setBoForm({ ...boForm, banner_url: e.target.value })}
                                    className="w-full bg-white/[0.02] border-2 border-white/10 hover:border-white/20 focus:border-cyan-500/50 rounded-2xl px-4 py-3 text-xs text-white focus:bg-white/[0.04] focus:shadow-[0_0_15px_rgba(6,182,212,0.1)] transition-all outline-none"
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] block mb-2">Link YouTube Video Guida</label>
                                  <input
                                    type="text"
                                    value={boForm.source}
                                    onChange={(e) => setBoForm({ ...boForm, source: e.target.value })}
                                    className="w-full bg-white/[0.02] border-2 border-white/10 hover:border-white/20 focus:border-cyan-500/50 rounded-2xl px-4 py-3 text-xs text-white focus:bg-white/[0.04] focus:shadow-[0_0_15px_rgba(6,182,212,0.1)] transition-all outline-none"
                                    placeholder="https://youtube.com/watch?v=..."
                                  />
                                </div>
                              </div>

                              <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] block mb-2">Descrizione Strategia</label>
                                <textarea
                                  value={boForm.description}
                                  onChange={(e) => setBoForm({ ...boForm, description: e.target.value })}
                                  rows={3}
                                  className="w-full bg-white/[0.02] border-2 border-white/10 hover:border-white/20 focus:border-cyan-500/50 rounded-2xl p-4 text-xs text-white focus:bg-white/[0.04] focus:shadow-[0_0_15px_rgba(6,182,212,0.1)] transition-all outline-none"
                                  placeholder="Spiega l'obiettivo o il tempismo di questa build..."
                                />
                              </div>

                              {/* AI Transcription Extraction Box */}
                              <div className="bg-[#0c192c]/50 border-2 border-cyan-500/20 p-6 rounded-3xl space-y-4">
                                <label className="text-[10px] font-black text-cyan-400 uppercase tracking-[0.2em] block flex items-center gap-1.5">
                                  <Sparkles size={14} className="animate-bounce" /> Gemini AI Trascrizione (Analisi Automatica Passaggi)
                                </label>
                                <textarea
                                  value={boManualText}
                                  onChange={(e) => setBoManualText(e.target.value)}
                                  rows={5}
                                  className="w-full bg-black/60 border-2 border-white/10 hover:border-white/20 focus:border-cyan-500/50 rounded-2xl p-4 text-xs text-cyan-100 placeholder:text-cyan-500/20 focus:shadow-[0_0_20px_rgba(6,182,212,0.1)] transition-all outline-none font-sans"
                                  placeholder="Incolla qui la trascrizione del video youtube per estrarre passaggi e tempi in automatico..."
                                />
                                {isAnalyzingBO && (
                                  <div className="space-y-2 animate-in fade-in duration-300">
                                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                                      <div className="h-full bg-cyan-400 transition-all duration-300 shadow-[0_0_10px_rgba(6,182,212,0.5)]" style={{ width: `${boAnalysisProgress}%` }}></div>
                                    </div>
                                    <span className="text-[9px] text-cyan-500 font-black block uppercase tracking-widest">Analisi in corso con Gemini...</span>
                                  </div>
                                )}
                                <div className="flex justify-end">
                                  <button
                                    onClick={handleAIBOAnalysis}
                                    disabled={isAnalyzingBO || !boManualText.trim()}
                                    className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all hover:-translate-y-0.5 active:scale-95 disabled:opacity-30 flex items-center gap-1.5 shadow-[0_0_20px_rgba(6,182,212,0.2)]"
                                  >
                                    <Sparkles size={14} /> Analizza Trascrizione
                                  </button>
                                </div>
                              </div>

                              {/* Passaggi steps management */}
                              <div className="space-y-4">
                                <div className="flex justify-between items-center border-t border-white/5 pt-6">
                                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] block">Passaggi Temporizzati</label>
                                  <button
                                    onClick={() => setBoForm({ ...boForm, steps: [...(boForm.steps || []), { time: '00:00', action: '', note: '' }] })}
                                    className="text-xs text-cyan-400 font-black uppercase tracking-wider hover:underline flex items-center gap-1"
                                  >
                                    <Plus size={12} strokeWidth={3} /> Aggiungi Passo
                                  </button>
                                </div>

                                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                  {(boForm.steps || []).map((step: any, idx: number) => (
                                    <div key={idx} className="bg-black/30 border-2 border-white/5 p-4 rounded-2xl flex flex-col md:flex-row gap-3 relative animate-in fade-in duration-300">
                                      <button
                                        onClick={() => {
                                          const newSteps = boForm.steps.filter((_: any, i: number) => i !== idx);
                                          setBoForm({ ...boForm, steps: newSteps });
                                        }}
                                        className="absolute -top-2 -right-2 p-1.5 bg-red-600 hover:bg-red-500 text-white rounded-full text-xs shadow-lg transition-transform hover:scale-110"
                                      >
                                        <X size={12} />
                                      </button>
                                      <input
                                        type="text"
                                        value={step.time}
                                        onChange={(e) => {
                                          const newSteps = [...boForm.steps];
                                          newSteps[idx].time = e.target.value;
                                          setBoForm({ ...boForm, steps: newSteps });
                                        }}
                                        className="w-full md:w-24 bg-[#111218] border-2 border-white/10 hover:border-white/20 focus:border-cyan-500/50 rounded-xl px-3 py-2 text-xs text-yellow-500 font-black text-center outline-none"
                                        placeholder="00:00"
                                      />
                                      <input
                                        type="text"
                                        value={step.action}
                                        onChange={(e) => {
                                          const newSteps = [...boForm.steps];
                                          newSteps[idx].action = e.target.value;
                                          setBoForm({ ...boForm, steps: newSteps });
                                        }}
                                        className="flex-1 bg-[#111218] border-2 border-white/10 hover:border-white/20 focus:border-cyan-500/50 rounded-xl px-4 py-2 text-xs text-white font-bold outline-none"
                                        placeholder="Azione..."
                                      />
                                      <input
                                        type="text"
                                        value={step.note || ''}
                                        onChange={(e) => {
                                          const newSteps = [...boForm.steps];
                                          newSteps[idx].note = e.target.value;
                                          setBoForm({ ...boForm, steps: newSteps });
                                        }}
                                        className="flex-1 bg-[#111218] border-2 border-white/10 hover:border-white/20 focus:border-cyan-500/50 rounded-xl px-4 py-2 text-xs text-gray-400 italic outline-none"
                                        placeholder="Nota/Dettaglio..."
                                      />
                                    </div>
                                  ))}
                                </div>
                              </div>

                              <div className="flex justify-end gap-3 pt-6 border-t border-white/5">
                                <button
                                  onClick={() => setSelectedBOIndex(null)}
                                  className="px-5 py-3 border-2 border-white/10 text-gray-400 hover:text-white rounded-xl transition-all text-xs font-black uppercase tracking-wider active:scale-95"
                                >
                                  Annulla
                                </button>
                                <button
                                  onClick={handleSaveBO}
                                  className="px-8 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg hover:-translate-y-0.5 active:scale-95 transition-all flex items-center gap-2"
                                >
                                  <Save size={14} strokeWidth={3} /> Salva Build Order
                                </button>
                              </div>
                            </div>
                          ) : (
                            
                            /* BO LISTING VIEW */
                            <div className="bg-[#0a0e1c]/60 border border-white/5 rounded-3xl p-8 space-y-6 shadow-2xl relative overflow-hidden">
                              <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-cyan-500/25 to-transparent"></div>
                              <div className="flex justify-between items-center">
                                <h4 className="text-xs font-black text-white uppercase tracking-[0.25em]">Build Orders di {selectedCiv.name}</h4>
                                <button
                                  onClick={() => handleEditBO(-1)}
                                  className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-xs font-black transition-all hover:-translate-y-0.5 shadow-lg active:scale-95 uppercase tracking-widest flex items-center gap-1.5"
                                >
                                  <Plus size={14} strokeWidth={3} /> Nuovo BO
                                </button>
                              </div>

                              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                                {(selectedCiv.build_orders || []).map((bo: any, idx: number) => (
                                  <div key={bo.id || idx} className="bg-black/30 border border-white/5 rounded-2xl p-5 flex items-center justify-between hover:border-cyan-500/30 transition-all hover:scale-[1.01] duration-300">
                                    <div>
                                      <span className="font-black text-sm text-white block">{bo.title}</span>
                                      <span className="text-[10px] text-cyan-400/60 font-black uppercase tracking-wider block mt-1">
                                        Difficoltà: {bo.difficulty === 1 ? 'Facile' : bo.difficulty === 3 ? 'Difficile' : 'Medio'} • Passaggi: {bo.steps?.length || 0}
                                      </span>
                                    </div>
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() => handleEditBO(idx)}
                                        className="p-2 bg-white/5 hover:bg-white/10 border-2 border-white/10 text-white rounded-xl transition-all"
                                        title="Modifica"
                                      >
                                        <Edit2 size={14} />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteBO(idx)}
                                        className="p-2 bg-red-500/10 hover:bg-red-500/25 border-2 border-red-500/20 text-red-400 rounded-xl transition-all"
                                        title="Elimina"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    </div>
                                  </div>
                                ))}

                                {(!selectedCiv.build_orders || selectedCiv.build_orders.length === 0) && (
                                  <div className="text-center py-20 bg-white/[0.01] border-2 border-dashed border-white/5 rounded-3xl text-gray-500">
                                    Nessun build order presente per questa civiltà.
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-32 text-center bg-white/[0.01] border-2 border-dashed border-white/5 rounded-3xl text-gray-500 shadow-inner">
                      <BookOpen size={64} className="opacity-20 mb-4 animate-bounce" style={{ animationDuration: '4s' }} />
                      <h4 className="text-sm font-bold uppercase tracking-wider text-gray-400">Nessuna civiltà selezionata</h4>
                      <p className="text-xs text-gray-600 mt-2 max-w-sm">Seleziona una civiltà a sinistra per gestirne i dettagli ed i build orders.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Fisso per Invio Mail */}
        {isSuperAdmin && (pendingNotifCount > 0 || sendNotifSuccess) && (
          <div className="p-6 border-t border-[#D4AF37]/20 bg-gradient-to-r from-[#0d1424] to-[#1a1c32] flex justify-center sticky bottom-0 z-20 shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
            <button
              onClick={handleSendNotifications}
              disabled={isSendingEmail || sendNotifSuccess}
              className={`flex items-center gap-4 px-12 py-4 rounded-xl transition-all font-bold shadow-xl group hover:scale-105 active:scale-95 ${
                sendNotifSuccess
                  ? 'bg-green-600 shadow-green-600/30 text-white'
                  : 'bg-yellow-600 hover:bg-yellow-500 text-white shadow-yellow-600/30'
              }`}
            >
              {isSendingEmail ? (
                <Loader2 size={24} className="animate-spin" />
              ) : (
                <CheckCircle size={24} className={sendNotifSuccess ? '' : 'group-hover:scale-110 transition-transform'} />
              )}
              <div className="text-left">
                <div className="text-lg leading-tight">
                  {sendNotifSuccess ? 'Notifiche inviate con successo! 🎉' : `Invia ${pendingNotifCount} Notifiche Ora`}
                </div>
                <div className="text-[11px] opacity-70 font-normal uppercase tracking-widest">
                  {sendNotifSuccess ? 'Riepilogo email spedito agli utenti' : 'Invia il riepilogo email agli utenti'}
                </div>
              </div>
            </button>
          </div>
        )}

      </main>

      {/* Modale Rifiuto Proposta */}
      {rejectionModalSugg && (
        <div className="fixed inset-0 z-[2000] bg-black/80 backdrop-blur-md flex items-center justify-center p-6 text-center animate-in fade-in duration-200">
          <div className="bg-[#0a0e1c] border border-red-500/30 p-8 rounded-2xl max-w-md w-full shadow-2xl animate-in zoom-in duration-300">
            <XCircle size={48} className="text-red-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Perché scarti la proposta?</h3>
            <p className="text-sm text-gray-400 mb-6">L'utente riceverà un'email con questa motivazione.</p>

            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Esempio: Informazione già presente o non accurata..."
              className="w-full bg-black/50 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm mb-6 focus:border-red-500 transition-colors h-32 resize-none outline-none"
            />

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setRejectionModalSugg(null);
                  setRejectionReason('');
                }}
                className="flex-1 px-4 py-2 border border-gray-600 text-gray-400 rounded-lg hover:bg-white/5 transition-colors font-medium text-sm"
              >
                Annulla
              </button>
              <button
                onClick={() => handleUpdateStatus(rejectionModalSugg, 'rejected', rejectionReason)}
                disabled={!rejectionReason.trim()}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-500 transition-all font-bold shadow-lg shadow-red-600/20 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                Conferma Scarto
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modale Conferma Cancellazione staff/Q&A */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
          <div className={`bg-[#0a0e1c] border p-8 rounded-3xl max-w-sm w-full shadow-2xl animate-in zoom-in duration-300 text-center transition-colors ${deleteSuccess ? 'border-green-500/30' : 'border-red-500/30'}`}>
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
                <h3 className="text-xl font-bold text-white mb-2">Sei sicuro?</h3>
                <p className="text-sm text-gray-400 mb-6">Questa azione è permanente e non può essere annullata.</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setDeleteConfirm(null)}
                    className="flex-1 px-4 py-2.5 bg-white/5 border border-white/10 text-gray-400 hover:text-white rounded-xl transition-all text-xs font-bold uppercase"
                  >
                    Annulla
                  </button>
                  <button
                    onClick={() => {
                      if (deleteConfirm.type === 'user') {
                        executeDeleteUser(deleteConfirm.id);
                      } else if (deleteConfirm.type === 'question') {
                        handleUpdateQAStatus(deleteConfirm.item, 'question', 'deleted');
                        setDeleteConfirm(null);
                      } else if (deleteConfirm.type === 'answer') {
                        handleUpdateQAStatus(deleteConfirm.item, 'answer', 'deleted');
                        setDeleteConfirm(null);
                      }
                    }}
                    className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl transition-all text-xs font-bold uppercase shadow-lg shadow-red-600/20"
                  >
                    {isDeleting ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Sì, Elimina'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Toasts */}
      <Toast 
        isVisible={toast.isVisible}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ ...toast, isVisible: false })}
      />
    </div>
  );
}
