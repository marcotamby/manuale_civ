import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  MessageSquare, CheckCircle, XCircle, Loader2, Send, Inbox, 
  AlertTriangle, X, ShieldCheck, Radio, Search, UserPlus, 
  Trophy, BookOpen, Zap, Edit2, Check, Trash2, Plus, Minus, ArrowLeft, LayoutDashboard,
  Save, Sparkles, ChevronDown, ChevronUp, Users, Youtube, Menu, History, Database, Activity, Download,
  Megaphone, TrendingUp, Coins, Lock, Unlock, ChevronRight, Link2, HelpCircle, Shield, Monitor
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './AuthContext';
import { useCivData } from './CivContext';
import { Toast } from './Toast';
import type { ToastType } from './Toast';
import { CustomSelect } from './CustomSelect';
import { getAvatarEffectClass } from './ProfileModal';
import { TitleEmblemTooltip, SHOP_TITLES } from './TitleEmblemTooltip';
import { sendNewBuildOrderWebhook } from '../utils/discordWebhook';
import { WYSIWYGEditor } from './TournamentsPage';
import { WYSIWYGEditor as SharedWYSIWYGEditor } from './WYSIWYGEditor';
import { renderTextWithLinks } from '../lib/linkParser';

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
  const { isAuthenticated, isAdmin, isSuperAdmin, canManageCivs, canManageBuildorders, canManageTournaments, user } = useAuth();
  const { refreshCivs } = useCivData();

  const isSuperAdminEmail = (emailStr: string) => {
    return emailStr?.toLowerCase() === 'marco.tamborrino.94@gmail.com';
  };

  const bodyTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [linkModalText, setLinkModalText] = useState('');
  const [linkModalUrl, setLinkModalUrl] = useState('');

  // Redirect if not admin
  useEffect(() => {
    if (!isAuthenticated || !isAdmin) {
      navigate('/');
    }
  }, [isAuthenticated, isAdmin, navigate]);

  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get('tab') as 'overview' | 'proposte' | 'qa' | 'users' | 'pecore' | 'tornei' | 'civilta' | 'audit' | 'diagnostics' | 'utenti' | 'comunicazioni' | 'analytics' | 'faq' | 'privacy') || 'overview';
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // CRM States (Tab 2)
  const [crmUsers, setCrmUsers] = useState<any[]>([]);
  const [crmLoading, setCrmLoading] = useState(false);
  const [crmSearch, setCrmSearch] = useState('');
  const [crmRoleFilter, setCrmRoleFilter] = useState('all');
  const [crmSortField, setCrmSortField] = useState('created_at');
  const [crmSortOrder, setCrmSortOrder] = useState<'asc' | 'desc'>('desc');
  const [crmPage, setCrmPage] = useState(1);
  const [crmTotalCount, setCrmTotalCount] = useState(0);
  const [selectedCrmUser, setSelectedCrmUser] = useState<any | null>(null);
  const [selectedUserStats, setSelectedUserStats] = useState<{ suggestions: number; bets: number; qa: number } | null>(null);
  const [selectedUserLogs, setSelectedUserLogs] = useState<any[]>([]);
  const [statsLoading, setStatsLoading] = useState(false);
  const [crmTempNickname, setCrmTempNickname] = useState('');
  const [crmEditingNickname, setCrmEditingNickname] = useState(false);
  const [crmSheepAmount, setCrmSheepAmount] = useState<number | ''>('');
  const [pendingRedemptionsCount, setPendingRedemptionsCount] = useState(0);
  const [emailsWithPendingRedemptions, setEmailsWithPendingRedemptions] = useState<string[]>([]);
  const [selectedUserRedemptions, setSelectedUserRedemptions] = useState<any[]>([]);
  const [redemptionsLoading, setRedemptionsLoading] = useState(false);

  // Announcements States (Tab 3)
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [announcementsLoading, setAnnouncementsLoading] = useState(false);
  const [annForm, setAnnForm] = useState({
    title: '',
    body: '',
    type: 'banner',
    target: 'all',
    is_active: true,
    btn_label: '',
    btn_url: ''
  });
  const [annError, setAnnError] = useState<string | null>(null);
  const [editingAnnId, setEditingAnnId] = useState<string | null>(null);

  // Analytics States (Tab 4)
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // Audit Log states
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditSearch, setAuditSearch] = useState('');
  const [auditActionFilter, setAuditActionFilter] = useState('all');
  const [expandedAuditLog, setExpandedAuditLog] = useState<string | null>(null);

  // Diagnostics states
  const [dbMetrics, setDbMetrics] = useState<Record<string, number>>({});
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [pingStatus, setPingStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [isGeneratingBackup, setIsGeneratingBackup] = useState(false);
  const [pendingQueueCount, setPendingQueueCount] = useState<number | null>(null);
  
  const selectTab = (tab: typeof activeTab) => {
    setSearchParams({ tab });
    setIsMobileMenuOpen(false);
  };
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
  const [isBulkRefilling, setIsBulkRefilling] = useState(false);
  const [isBulkRefillConfirmOpen, setIsBulkRefillConfirmOpen] = useState(false);

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
    vods: [],
    podium: []
  });
  const [isPodiumExpanded, setIsPodiumExpanded] = useState(false);
  const [isVodsExpanded, setIsVodsExpanded] = useState(false);

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
    weaknesses: [],
    flag: '',
    videos: []
  });
  
  const [isAddingCiv, setIsAddingCiv] = useState(false);
  const [newCivForm, setNewCivForm] = useState<any>({
    aoe4worldUrl: '',
    id: '',
    name: '',
    flag: '',
    difficulty: 'Medio',
    short_description: ''
  });

  const handleAoe4WorldUrlChange = (url: string) => {
    setNewCivForm((prev: any) => {
      const updated = { ...prev, aoe4worldUrl: url };
      const cleanUrl = url.trim().toLowerCase();
      let slug = '';
      
      if (cleanUrl) {
        if (cleanUrl.includes('aoe4world.com')) {
          const match = cleanUrl.match(/\/explorer\/civilizations\/([a-z0-9-_]+)/);
          if (match) {
            slug = match[1];
          } else {
            const segments = cleanUrl.split('/');
            slug = segments[segments.length - 1] || segments[segments.length - 2] || '';
          }
        } else {
          slug = cleanUrl.replace(/[^a-z0-9-_]+/g, '');
        }
      }
      
      if (slug) {
        updated.id = slug;
        const nameParts = slug.split(/[-_]+/);
        const formattedName = nameParts
          .map(w => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ');
        updated.name = formattedName;
        updated.flag = `/flags/${slug}.png`;
      }
      
      return updated;
    });
  };
  
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

  // FAQ States
  const [faqIntro, setFaqIntro] = useState({ title: "Cos'è il Manuale delle Civiltà?", content: '' });
  const [faqSections, setFaqSections] = useState<any[]>([]);
  const [faqLoading, setFaqLoading] = useState(false);
  const [faqSaveLoading, setFaqSaveLoading] = useState(false);

  // Privacy States
  const [privacyTitle, setPrivacyTitle] = useState('Privacy & Cookie Policy');
  const [privacyContent, setPrivacyContent] = useState('');
  const [privacyLoading, setPrivacyLoading] = useState(false);
  const [privacySaveLoading, setPrivacySaveLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated && isAdmin) {
      fetchSuggestions();
      fetchQA();
      fetchProfiles();
      fetchPendingRedemptionsCount();
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
    } else if (activeTab === 'audit') {
      fetchAuditLogs();
    } else if (activeTab === 'diagnostics') {
      fetchDiagnostics();
    } else if (activeTab === 'comunicazioni') {
      fetchAnnouncements();
    } else if (activeTab === 'analytics' || activeTab === 'overview') {
      fetchAnalyticsData();
    } else if (activeTab === 'faq') {
      fetchFAQData();
    } else if (activeTab === 'privacy') {
      fetchPrivacyData();
    }
  }, [activeTab]);

  // CRM dynamic filters effect
  useEffect(() => {
    if (activeTab === 'utenti') {
      fetchCrmUsers();
    }
  }, [crmSearch, crmRoleFilter, crmSortField, crmSortOrder, crmPage, activeTab, emailsWithPendingRedemptions.join(',')]);

  const fetchTournaments = async () => {
    try {
      setTournamentsLoading(true);
      const { data, error } = await supabase
        .from('tournaments')
        .select('*');
      if (error) throw error;
      const sorted = (data || []).sort((a: any, b: any) => {
        if ((b.display_order || 0) !== (a.display_order || 0)) {
          return (b.display_order || 0) - (a.display_order || 0);
        }
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return dateB - dateA;
      });
      setTournaments(sorted);
      if (sorted && sorted.length > 0 && !selectedTournament) {
        setSelectedTournament(sorted[0]);
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
        vods: selectedTournament.vods || [],
        podium: selectedTournament.podium || []
      });
      setIsEditingTournament(false);
      setIsCreatingTournament(false);
      setIsCreatingMarket(false);
      setIsPodiumExpanded(false);
      setIsVodsExpanded(false);
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
      vods: (tournamentForm.vods || []).map((v: any) => ({
        id: v.id || `vod-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title: (v.title || '').trim(),
        url: (v.url || '').trim(),
        round: (v.round || '').trim(),
        score: (v.score || '').trim()
      })),
      podium: (tournamentForm.podium || []).map((p: any) => ({
        ...p,
        players: p.players ? p.players.map((name: string) => name.trim()).filter((name: string) => name !== '') : []
      })),
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

      await logAdminAction(
        isCreatingTournament ? 'CREATE_TOURNAMENT' : 'UPDATE_TOURNAMENT',
        'tournaments',
        slug,
        isCreatingTournament 
          ? `Creato nuovo torneo: "${payload.name}" (${payload.type})`
          : `Aggiornato torneo: "${payload.name}"`,
        { tournament_name: payload.name, tournament_slug: slug, form_payload: payload }
      );

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

      await logAdminAction(
        'DELETE_TOURNAMENT',
        'tournaments',
        tId,
        `Eliminato torneo "${selectedTournament?.name || tId}"`,
        { id: tId, name: selectedTournament?.name, slug: selectedTournament?.slug }
      );

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

      await logAdminAction(
        'CREATE_MARKET',
        'betting_markets',
        payload.title,
        `Creato mercato scommesse: "${payload.title}" per il torneo "${selectedTournament.name}"`,
        { market_payload: payload, tournament_name: selectedTournament.name }
      );

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

      const market = markets.find(m => m.id === marketId);
      await logAdminAction(
        'TOGGLE_MARKET_STATUS',
        'betting_markets',
        marketId,
        `Modificato stato scommessa "${market?.title || marketId}" a "${newStatus}"`,
        { id: marketId, title: market?.title, new_status: newStatus, previous_status: currentStatus }
      );

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

      const market = markets.find(m => m.id === marketId);
      const winnerOpt = market?.options?.find((o: any) => o.id === optionId);
      await logAdminAction(
        'SETTLE_MARKET',
        'betting_markets',
        marketId,
        `Liquidata scommessa "${market?.title || marketId}" (Vincitore: "${winnerOpt?.label || optionId}")`,
        { id: marketId, title: market?.title, winner_option_id: optionId, winner_label: winnerOpt?.label }
      );

      setToast({ isVisible: true, message: 'Scommessa liquidata con successo!', type: 'success' });
      setSettleConfirmOption(null);
      await fetchMarkets(selectedTournament.slug);
    } catch (err: any) {
      setToast({ isVisible: true, message: `Errore liquidazione: ${err.message}`, type: 'error' });
    }
  };

  const fetchCivilizations = async (selectId?: string) => {
    try {
      setCivsLoading(true);
      const { data, error } = await supabase
        .from('civilizations')
        .select('*')
        .order('name', { ascending: true });
      if (error) throw error;
      setCivList(data || []);
      if (data && data.length > 0) {
        if (selectId) {
          const newSelected = data.find(c => c.id === selectId);
          if (newSelected) setSelectedCiv(newSelected);
        } else if (!selectedCiv) {
          setSelectedCiv(data[0]);
        }
      }
    } catch (err: any) {
      console.error('Error fetching civilizations:', err);
      setToast({ isVisible: true, message: 'Errore nel caricamento delle civiltà', type: 'error' });
    } finally {
      setCivsLoading(false);
    }
  };

  const handleCreateCiv = async () => {
    if (!newCivForm.id) {
      setToast({ isVisible: true, message: 'ID/Slug civiltà obbligatorio', type: 'error' });
      return;
    }
    if (!newCivForm.name) {
      setToast({ isVisible: true, message: 'Nome civiltà obbligatorio', type: 'error' });
      return;
    }

    try {
      setCivsLoading(true);
      
      // Check if civilization with this ID already exists
      const { data: existing, error: checkError } = await supabase
        .from('civilizations')
        .select('id')
        .eq('id', newCivForm.id.trim())
        .maybeSingle();

      if (checkError) throw checkError;
      if (existing) {
        throw new Error(`Una civiltà con ID "${newCivForm.id}" esiste già.`);
      }

      const newCivData = {
        id: newCivForm.id.trim().toLowerCase(),
        name: newCivForm.name.trim(),
        flag: newCivForm.flag.trim(),
        difficulty: newCivForm.difficulty,
        short_description: newCivForm.short_description.trim(),
        passive_bonuses: [],
        unique_units: [],
        technologies: [],
        landmarks: [],
        videos: [],
        build_orders: [],
        strengths: [],
        weaknesses: []
      };

      const { error: insertError } = await supabase
        .from('civilizations')
        .insert(newCivData);

      if (insertError) throw insertError;

      // Log admin action
      await logAdminAction(
        'CREATE_CIVILIZATION',
        'civilizations',
        newCivForm.id.trim().toLowerCase(),
        `Creata nuova civiltà "${newCivForm.name}"`,
        { civ_id: newCivForm.id.trim().toLowerCase(), details: newCivForm }
      );

      setToast({ isVisible: true, message: 'Nuova civiltà creata con successo!', type: 'success' });
      
      const createdId = newCivForm.id.trim().toLowerCase();

      // Reset form
      setNewCivForm({
        aoe4worldUrl: '',
        id: '',
        name: '',
        flag: '',
        difficulty: 'Medio',
        short_description: ''
      });
      setIsAddingCiv(false);

      // Reload civilizations and select the new one
      await fetchCivilizations(createdId);
      
      // Trigger CivContext refresh to sync with frontend
      refreshCivs();

    } catch (err: any) {
      console.error('Error creating civilization:', err);
      setToast({ isVisible: true, message: err.message || 'Errore durante la creazione della civiltà', type: 'error' });
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
        weaknesses: selectedCiv.weaknesses || [],
        flag: selectedCiv.flag || '',
        videos: selectedCiv.videos || []
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
          weaknesses: civForm.weaknesses?.filter((w: string) => w.trim() !== '') || [],
          flag: civForm.flag,
          videos: civForm.videos || []
        })
        .eq('id', selectedCiv.id);
      if (error) throw error;

      await logAdminAction(
        'SAVE_CIV_DETAILS',
        'civilizations',
        selectedCiv.id,
        `Aggiornati dettagli della civiltà "${civForm.name}"`,
        { civ_id: selectedCiv.id, updated_fields: civForm }
      );

      setToast({ isVisible: true, message: 'Dettagli civiltà salvati!', type: 'success' });
      
      setCivList(prev => prev.map(c => c.id === selectedCiv.id ? {
        ...c,
        name: civForm.name,
        difficulty: civForm.difficulty,
        short_description: civForm.short_description,
        passive_bonuses: civForm.passive_bonuses,
        strengths: civForm.strengths,
        weaknesses: civForm.weaknesses,
        flag: civForm.flag,
        videos: civForm.videos
      } : c));
      
      setSelectedCiv((prev: any) => ({
        ...prev,
        name: civForm.name,
        difficulty: civForm.difficulty,
        short_description: civForm.short_description,
        passive_bonuses: civForm.passive_bonuses,
        strengths: civForm.strengths,
        weaknesses: civForm.weaknesses,
        flag: civForm.flag,
        videos: civForm.videos
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
        author_nickname: user?.nickname || '',
        author_rank: user?.rank || '',
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

      await logAdminAction(
        selectedBOIndex === -1 ? 'CREATE_BUILD_ORDER' : 'UPDATE_BUILD_ORDER',
        'civilizations',
        selectedCiv.id,
        selectedBOIndex === -1 
          ? `Creato build order "${boForm.title}" per "${selectedCiv.name}"`
          : `Aggiornato build order "${boForm.title}" per "${selectedCiv.name}"`,
        { civ_id: selectedCiv.id, bo_id: boForm.id, bo_title: boForm.title, is_new: selectedBOIndex === -1, details: boForm }
      );

      setToast({ isVisible: true, message: 'Build order salvato!', type: 'success' });
      
      const updatedCiv = { ...selectedCiv, build_orders: currentBOs };
      setSelectedCiv(updatedCiv);
      setCivList(prev => prev.map(c => c.id === selectedCiv.id ? updatedCiv : c));
      setSelectedBOIndex(-2);
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

      const deletedBO = selectedCiv.build_orders?.[index];
      await logAdminAction(
        'DELETE_BUILD_ORDER',
        'civilizations',
        selectedCiv.id,
        `Eliminato build order "${deletedBO?.title || index}" per "${selectedCiv.name}"`,
        { civ_id: selectedCiv.id, bo_index: index, bo_title: deletedBO?.title }
      );

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

  const fetchPendingRedemptionsCount = async () => {
    try {
      const { data, error } = await supabase
        .from('service_redemptions')
        .select('user_email')
        .eq('status', 'pending');
      if (!error && data) {
        setPendingRedemptionsCount(data.length);
        const emails = Array.from(new Set(data.map((r: any) => r.user_email.toLowerCase())));
        setEmailsWithPendingRedemptions(emails);
      }
    } catch (err) {
      console.error('Error fetching pending redemptions count:', err);
    }
  };

  const fetchUserRedemptions = async (email: string) => {
    if (!email) return;
    setRedemptionsLoading(true);
    try {
      const { data, error } = await supabase
        .from('service_redemptions')
        .select('*')
        .eq('user_email', email.toLowerCase())
        .order('created_at', { ascending: false });
      if (!error && data) {
        setSelectedUserRedemptions(data);
      }
    } catch (err) {
      console.error('Error fetching user redemptions:', err);
    } finally {
      setRedemptionsLoading(false);
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
      
      await logAdminAction(
        'SHEEP_REFILL',
        'profiles',
        profile.id || email,
        `Modificato saldo pecore per ${profile.nickname || email} a ${newBalance} 🐑 (variazione: ${isSet ? 'impostato a' : (amount >= 0 ? '+' : '') + amount})`,
        { target_email: email, previous_balance: profile.sheep_balance, new_balance: newBalance, amount, is_set: isSet }
      );
      
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

  const handleBulkSheepRefill = async () => {
    try {
      setIsBulkRefilling(true);
      if (allProfiles.length === 0) {
        setToast({ isVisible: true, message: 'Nessun pastore attivo da ricaricare', type: 'error' });
        return;
      }

      // Update all shepherd profiles in parallel
      const updatePromises = allProfiles.map(async (profile) => {
        const newBalance = (profile.sheep_balance || 0) + 100;
        const { error } = await supabase
          .from('profiles')
          .update({ sheep_balance: newBalance })
          .eq('email', profile.email);
        
        if (error) throw error;
        return { email: profile.email, previous: profile.sheep_balance, new: newBalance };
      });

      const results = await Promise.all(updatePromises);

      // Log a single bulk action in the audit log
      await logAdminAction(
        'SHEEP_BULK_REFILL',
        'profiles',
        'all_active',
        `Ricarica massiva: +100 pecore 🐑 a tutti i ${allProfiles.length} pastori attivi`,
        { 
          amount: 100, 
          shepherds_count: allProfiles.length,
          refilled_users: results.map(r => ({ email: r.email, previous: r.previous, new: r.new }))
        }
      );

      // Update state locally
      setAllProfiles(allProfiles.map(p => {
        const match = results.find(r => r.email === p.email);
        return match ? { ...p, sheep_balance: match.new } : p;
      }));

      setToast({ isVisible: true, message: `Ricarica di 100 pecore completata per tutti i ${allProfiles.length} pastori!`, type: 'success' });
    } catch (err: any) {
      setToast({ isVisible: true, message: `Errore nella ricarica massiva: ${err.message}`, type: 'error' });
    } finally {
      setIsBulkRefilling(false);
      setIsBulkRefillConfirmOpen(false);
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

  // CRM Functions (Tab 2)
  const handleCrmSearchChange = (value: string) => {
    setCrmSearch(value);
    setCrmPage(1);
  };

  const handleCrmRoleFilterChange = (value: string) => {
    setCrmRoleFilter(value);
    setCrmPage(1);
  };

  const fetchCrmUsers = async () => {
    setCrmLoading(true);
    try {
      let query = supabase.from('profiles').select('*', { count: 'exact' });
      
      if (crmSearch.trim()) {
        query = query.or(`email.ilike.%${crmSearch.trim()}%,nickname.ilike.%${crmSearch.trim()}%`);
      }
      
      if (crmRoleFilter !== 'all') {
        if (crmRoleFilter === 'pending_service') {
          if (emailsWithPendingRedemptions.length > 0) {
            query = query.in('email', emailsWithPendingRedemptions);
          } else {
            query = query.eq('email', 'non-existent-email-placeholder');
          }
        } else if (crmRoleFilter === 'user') {
          query = query.or('role.is.null,role.eq.user');
        } else {
          query = query.eq('role', crmRoleFilter);
        }
      }
      
      query = query.order(crmSortField, { ascending: crmSortOrder === 'asc' });
      
      const pageSize = 12;
      const fromRange = (crmPage - 1) * pageSize;
      const toRange = fromRange + pageSize - 1;
      query = query.range(fromRange, toRange);
      
      const { data, error, count } = await query;
      if (error) throw error;
      
      setCrmUsers(data || []);
      setCrmTotalCount(count || 0);
    } catch (err) {
      console.error('Error fetching CRM users:', err);
      setToast({ isVisible: true, message: 'Errore nel caricamento degli utenti CRM', type: 'error' });
    } finally {
      setCrmLoading(false);
    }
  };

  const handleSelectCrmUser = async (userProfile: any) => {
    setSelectedCrmUser(userProfile);
    setCrmTempNickname(userProfile.nickname || '');
    setCrmEditingNickname(false);
    setCrmSheepAmount('');
    setStatsLoading(true);
    try {
      const email = userProfile.email;
      if (!email) return;

      const [suggRes, betsRes, qRes, aRes, logsRes] = await Promise.all([
        supabase.from('suggestions').select('id', { count: 'exact', head: true }).ilike('user_email', email),
        supabase.from('user_bets').select('id', { count: 'exact', head: true }).ilike('user_email', email),
        supabase.from('questions').select('id', { count: 'exact', head: true }).ilike('user_email', email),
        supabase.from('answers').select('id', { count: 'exact', head: true }).ilike('user_email', email),
        supabase.from('audit_log').select('*').ilike('user_email', email).order('created_at', { ascending: false }).limit(10)
      ]);

      setSelectedUserStats({
        suggestions: suggRes.count || 0,
        bets: betsRes.count || 0,
        qa: (qRes.count || 0) + (aRes.count || 0)
      });
      setSelectedUserLogs(logsRes.data || []);
      
      // Fetch redemptions for this user
      fetchUserRedemptions(email);
    } catch (err) {
      console.error('Error fetching user stats:', err);
    } finally {
      setStatsLoading(false);
    }
  };

  const handleCrmToggleBan = async (userEmail: string, currentRole: string) => {
    if (!isAdmin) {
      setToast({ isVisible: true, message: 'Solo gli amministratori possono bannare utenti', type: 'error' });
      return;
    }
    if (isSuperAdminEmail(userEmail)) {
      setToast({ isVisible: true, message: 'Non è possibile bloccare o bannare il super amministratore', type: 'error' });
      return;
    }
    const isBanned = currentRole === 'banned';
    const newRole = isBanned ? 'user' : 'banned';
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('email', userEmail);
      
      if (error) throw error;
      
      await logAdminAction(
        isBanned ? 'UNBAN_USER' : 'BAN_USER',
        'profiles',
        userEmail,
        isBanned ? `Sbloccato utente "${userEmail}"` : `Bannato utente "${userEmail}"`,
        { target_email: userEmail }
      );

      setToast({ isVisible: true, message: isBanned ? 'Utente sbloccato' : 'Utente bannato', type: 'success' });
      
      setCrmUsers((prev: any[]) => prev.map(u => u.email === userEmail ? { ...u, role: newRole } : u));
      if (selectedCrmUser && selectedCrmUser.email === userEmail) {
        setSelectedCrmUser((prev: any) => prev ? { ...prev, role: newRole } : null);
      }
    } catch (err) {
      console.error('Error toggling ban:', err);
      setToast({ isVisible: true, message: 'Errore durante l\'azione', type: 'error' });
    }
  };

  const handleCrmUpdateNickname = async (userEmail: string, newNickname: string) => {
    if (isSuperAdminEmail(userEmail) && !isSuperAdmin) {
      setToast({ isVisible: true, message: 'Non hai i permessi per modificare il nickname del super amministratore', type: 'error' });
      return;
    }
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ nickname: newNickname })
        .eq('email', userEmail);
      
      if (error) throw error;
      
      await logAdminAction(
        'UPDATE_NICKNAME',
        'profiles',
        userEmail,
        `Modificato nickname di "${userEmail}" in "${newNickname}"`,
        { target_email: userEmail, nickname: newNickname }
      );

      setToast({ isVisible: true, message: 'Nickname aggiornato', type: 'success' });
      setCrmEditingNickname(false);
      
      setCrmUsers((prev: any[]) => prev.map(u => u.email === userEmail ? { ...u, nickname: newNickname } : u));
      if (selectedCrmUser && selectedCrmUser.email === userEmail) {
        setSelectedCrmUser((prev: any) => prev ? { ...prev, nickname: newNickname } : null);
      }
    } catch (err) {
      console.error('Error updating nickname:', err);
      setToast({ isVisible: true, message: 'Errore durante l\'aggiornamento', type: 'error' });
    }
  };

  const handleCrmAdjustSheep = async (userEmail: string, amount: number, isSet = false) => {
    if (!isAdmin) {
      setToast({ isVisible: true, message: 'Solo gli amministratori possono modificare il bilancio', type: 'error' });
      return;
    }
    if (isSuperAdminEmail(userEmail) && !isSuperAdmin) {
      setToast({ isVisible: true, message: 'Non puoi modificare il bilancio del super amministratore', type: 'error' });
      return;
    }
    try {
      const profile = crmUsers.find(u => u.email === userEmail) || selectedCrmUser;
      if (!profile) return;
      const newBalance = isSet ? amount : (profile.sheep_balance || 0) + amount;

      const { error } = await supabase
        .from('profiles')
        .update({ sheep_balance: newBalance })
        .eq('email', userEmail);
      
      if (error) throw error;
      
      await logAdminAction(
        'ADJUST_SHEEP_BALANCE',
        'profiles',
        userEmail,
        `Modificato bilancio pecore di "${userEmail}" a ${newBalance}`,
        { target_email: userEmail, amount: newBalance }
      );

      setToast({ isVisible: true, message: 'Bilancio pecore aggiornato', type: 'success' });
      setCrmSheepAmount('');
      
      setCrmUsers((prev: any[]) => prev.map(u => u.email === userEmail ? { ...u, sheep_balance: newBalance } : u));
      if (selectedCrmUser && selectedCrmUser.email === userEmail) {
        setSelectedCrmUser((prev: any) => prev ? { ...prev, sheep_balance: newBalance } : null);
      }
    } catch (err) {
      console.error('Error adjusting sheep:', err);
      setToast({ isVisible: true, message: 'Errore durante l\'aggiornamento', type: 'error' });
    }
  };

  const handleCrmDeliverService = async (redemptionId: string, userEmail: string, serviceId: string) => {
    if (!isAdmin) {
      setToast({ isVisible: true, message: 'Solo gli amministratori o lo staff possono erogare servizi', type: 'error' });
      return;
    }
    try {
      const { error } = await supabase
        .from('service_redemptions')
        .update({ status: 'delivered', updated_at: new Date().toISOString() })
        .eq('id', redemptionId);

      if (error) throw error;

      await logAdminAction(
        'DELIVER_SERVICE',
        'profiles',
        userEmail,
        `Erogato servizio "${serviceId === 'replay_review' ? 'Analisi Replay' : serviceId === 'coaching_1h' ? '1h Coaching' : serviceId}" per utente "${userEmail}"`,
        { target_email: userEmail, redemption_id: redemptionId, service_id: serviceId }
      );

      setToast({ isVisible: true, message: 'Servizio segnato come erogato! 🎉', type: 'success' });
      fetchPendingRedemptionsCount();
      fetchUserRedemptions(userEmail);
    } catch (err) {
      console.error('Error delivering service:', err);
      setToast({ isVisible: true, message: 'Errore nell\'erogazione del servizio', type: 'error' });
    }
  };

  const handleCrmChangeRole = async (userEmail: string, role: string) => {
    if (!isSuperAdmin) {
      setToast({ isVisible: true, message: 'Solo il super amministratore può modificare i ruoli', type: 'error' });
      return;
    }
    try {
      const updates: any = { role };
      if (role === 'admin' || role === 'editor' || role === 'staff') {
        updates.can_manage_tournaments = true;
        updates.can_manage_civs = true;
        updates.can_manage_buildorders = true;
      } else if (role === 'user') {
        updates.can_manage_tournaments = false;
        updates.can_manage_civs = false;
        updates.can_manage_buildorders = false;
      }

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('email', userEmail);
      
      if (error) throw error;
      
      await logAdminAction(
        'PROMOTE_USER_ROLE',
        'profiles',
        userEmail,
        `Modificato ruolo di "${userEmail}" in "${role}"`,
        { target_email: userEmail, role, updates }
      );

      setToast({ isVisible: true, message: 'Ruolo aggiornato', type: 'success' });
      
      setCrmUsers((prev: any[]) => prev.map(u => u.email === userEmail ? { ...u, ...updates } : u));
      if (selectedCrmUser && selectedCrmUser.email === userEmail) {
        setSelectedCrmUser((prev: any) => prev ? { ...prev, ...updates } : null);
      }
    } catch (err) {
      console.error('Error updating role:', err);
      setToast({ isVisible: true, message: 'Errore durante l\'aggiornamento', type: 'error' });
    }
  };

  const handleCrmTogglePermission = async (userEmail: string, field: string, value: boolean) => {
    if (!isSuperAdmin) {
      setToast({ isVisible: true, message: 'Solo il super amministratore può modificare i permessi', type: 'error' });
      return;
    }
    try {
      const updates = { [field]: value };
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('email', userEmail);
      
      if (error) throw error;
      
      await logAdminAction(
        'TOGGLE_USER_PERMISSION',
        'profiles',
        userEmail,
        `Modificato permesso "${field}" per "${userEmail}" a "${value}"`,
        { target_email: userEmail, field, value }
      );

      setToast({ isVisible: true, message: 'Permessi aggiornati', type: 'success' });
      
      setCrmUsers((prev: any[]) => prev.map(u => u.email === userEmail ? { ...u, ...updates } : u));
      if (selectedCrmUser && selectedCrmUser.email === userEmail) {
        setSelectedCrmUser((prev: any) => prev ? { ...prev, ...updates } : null);
      }
    } catch (err) {
      console.error('Error toggling permission:', err);
      setToast({ isVisible: true, message: 'Errore durante l\'aggiornamento', type: 'error' });
    }
  };

  // Announcements Functions (Tab 3)
  const fetchAnnouncements = async () => {
    setAnnouncementsLoading(true);
    setAnnError(null);
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        if (error.code === 'PGRST116' || error.message.includes('does not exist') || error.message.includes('announcements')) {
          setAnnError('table_missing');
        } else {
          throw error;
        }
      } else {
        setAnnouncements(data || []);
      }
    } catch (err: any) {
      console.error('Error fetching announcements:', err);
      setToast({ isVisible: true, message: 'Errore nel caricamento degli annunci', type: 'error' });
    } finally {
      setAnnouncementsLoading(false);
    }
  };

  const handleOpenLinkModal = () => {
    if (bodyTextareaRef.current) {
      const start = bodyTextareaRef.current.selectionStart;
      const end = bodyTextareaRef.current.selectionEnd;
      const selected = annForm.body.substring(start, end);
      setLinkModalText(selected);
    } else {
      setLinkModalText('');
    }
    setLinkModalUrl('');
    setIsLinkModalOpen(true);
  };

  const handleInsertLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkModalUrl.trim()) return;

    const textToInsert = linkModalText.trim() || linkModalUrl.trim();
    const formattedLink = `[${textToInsert}](${linkModalUrl.trim()})`;

    let newBody = annForm.body;
    let newCursorPos = annForm.body.length;

    if (bodyTextareaRef.current) {
      const start = bodyTextareaRef.current.selectionStart;
      const end = bodyTextareaRef.current.selectionEnd;
      const before = annForm.body.substring(0, start);
      const after = annForm.body.substring(end);
      newBody = before + formattedLink + after;
      newCursorPos = start + formattedLink.length;
    } else {
      newBody = annForm.body + (annForm.body ? ' ' : '') + formattedLink;
    }

    setAnnForm({ ...annForm, body: newBody });
    setIsLinkModalOpen(false);

    // Refocus the textarea and position the cursor after the inserted link
    setTimeout(() => {
      if (bodyTextareaRef.current) {
        bodyTextareaRef.current.focus();
        bodyTextareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 50);
  };

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!annForm.title.trim() || !annForm.body.trim()) return;
    
    try {
      const userEmail = user?.email || 'admin@localhost';
      
      if (editingAnnId) {
        // Mode: Edit
        const { error } = await supabase
          .from('announcements')
          .update({
            title: annForm.title.trim(),
            body: annForm.body.trim(),
            type: annForm.type,
            target: annForm.target,
            is_active: annForm.is_active,
            btn_label: annForm.btn_label.trim() || null,
            btn_url: annForm.btn_url.trim() || null
          })
          .eq('id', editingAnnId);
          
        if (error) throw error;
        
        await logAdminAction(
          'UPDATE_ANNOUNCEMENT',
          'announcements',
          editingAnnId,
          `Aggiornato annuncio ID ${editingAnnId} ("${annForm.title}")`,
          { form: annForm }
        );
        
        setToast({ isVisible: true, message: 'Annuncio aggiornato con successo', type: 'success' });
        setEditingAnnId(null);
      } else {
        // Mode: Create
        const { error } = await supabase
          .from('announcements')
          .insert({
            title: annForm.title.trim(),
            body: annForm.body.trim(),
            type: annForm.type,
            target: annForm.target,
            is_active: annForm.is_active,
            created_by: userEmail,
            btn_label: annForm.btn_label.trim() || null,
            btn_url: annForm.btn_url.trim() || null
          });
          
        if (error) throw error;
        
        await logAdminAction(
          'CREATE_ANNOUNCEMENT',
          'announcements',
          null,
          `Creato annuncio "${annForm.title}"`,
          { form: annForm }
        );

        setToast({ isVisible: true, message: 'Annuncio creato con successo', type: 'success' });
      }
      
      setAnnForm({
        title: '',
        body: '',
        type: 'banner',
        target: 'all',
        is_active: true,
        btn_label: '',
        btn_url: ''
      });
      fetchAnnouncements();
    } catch (err) {
      console.error('Error saving announcement:', err);
      setToast({ isVisible: true, message: editingAnnId ? 'Errore nell\'aggiornamento dell\'annuncio' : 'Errore nella creazione dell\'annuncio', type: 'error' });
    }
  };

  const handleStartEditAnnouncement = (ann: any) => {
    setEditingAnnId(ann.id);
    setAnnForm({
      title: ann.title,
      body: ann.body,
      type: ann.type,
      target: ann.target,
      is_active: ann.is_active,
      btn_label: ann.btn_label || '',
      btn_url: ann.btn_url || ''
    });
  };

  const handleCancelEditAnnouncement = () => {
    setEditingAnnId(null);
    setAnnForm({
      title: '',
      body: '',
      type: 'banner',
      target: 'all',
      is_active: true,
      btn_label: '',
      btn_url: ''
    });
  };

  const handleToggleAnnouncementActive = async (id: string, currentActive: boolean) => {
    try {
      const { error } = await supabase
        .from('announcements')
        .update({ is_active: !currentActive })
        .eq('id', id);
        
      if (error) throw error;
      
      await logAdminAction(
        'TOGGLE_ANNOUNCEMENT_ACTIVE',
        'announcements',
        id,
        `Modificato stato attivo annuncio in ${!currentActive}`,
        { announcement_id: id, is_active: !currentActive }
      );

      setToast({ isVisible: true, message: 'Stato annuncio aggiornato', type: 'success' });
      fetchAnnouncements();
    } catch (err) {
      console.error('Error toggling active state:', err);
      setToast({ isVisible: true, message: 'Errore nell\'aggiornamento', type: 'error' });
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    try {
      const { error } = await supabase
        .from('announcements')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      
      await logAdminAction(
        'DELETE_ANNOUNCEMENT',
        'announcements',
        id,
        `Eliminato annuncio ID ${id}`,
        { announcement_id: id }
      );

      setToast({ isVisible: true, message: 'Annuncio eliminato', type: 'success' });
      fetchAnnouncements();
    } catch (err) {
      console.error('Error deleting announcement:', err);
      setToast({ isVisible: true, message: 'Errore nell\'eliminazione', type: 'error' });
    }
  };

  // Analytics Functions (Tab 4)
  const getTrendData = (items: any[]) => {
    const now = new Date();
    const months = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
    const weeks = Array.from({ length: 6 }).map((_, idx) => {
      const d = new Date();
      d.setDate(now.getDate() - idx * 7);
      const start = new Date(d.setDate(d.getDate() - d.getDay()));
      const label = `${start.getDate()} ${months[start.getMonth()]}`;
      return {
        start,
        label,
        count: 0
      };
    }).reverse();

    items.forEach(item => {
      if (!item.created_at) return;
      const date = new Date(item.created_at);
      for (let i = 0; i < weeks.length; i++) {
        const w = weeks[i].start;
        const nextW = new Date(w);
        nextW.setDate(nextW.getDate() + 7);
        if (date >= w && date < nextW) {
          weeks[i].count++;
          break;
        }
      }
    });

    return weeks.map(w => ({ 
      label: w.label, 
      value: w.count 
    }));
  };

  const getCivPopularity = (suggestions: any[]) => {
    const counts: Record<string, number> = {};
    suggestions.forEach(s => {
      const name = s.civ_name || 'Generico';
      counts[name] = (counts[name] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  };



  // ========== FAQ Functions ==========
  const fetchFAQData = async () => {
    setFaqLoading(true);
    try {
      // Fetch intro
      const { data: introData } = await supabase
        .from('faq_settings')
        .select('title, content')
        .eq('id', 'intro')
        .maybeSingle();
      
      if (introData) {
        setFaqIntro({ title: introData.title || faqIntro.title, content: introData.content || '' });
      }

      // Fetch sections with items
      const { data: sectionsData } = await supabase
        .from('faq_sections')
        .select('*')
        .order('display_order', { ascending: true });

      const { data: itemsData } = await supabase
        .from('faq_items')
        .select('*')
        .order('display_order', { ascending: true });

      if (sectionsData) {
        const combined = sectionsData.map((s: any) => ({
          ...s,
          items: (itemsData || []).filter((it: any) => it.section_id === s.id)
        }));
        setFaqSections(combined);
      }
    } catch (err) {
      console.error('Error fetching FAQ:', err);
    } finally {
      setFaqLoading(false);
    }
  };

  const saveFAQData = async () => {
    setFaqSaveLoading(true);
    try {
      // Save Intro
      await supabase.from('faq_settings').upsert({
        id: 'intro',
        title: faqIntro.title,
        content: faqIntro.content
      });

      // Clear existing sections/items to simplify sync
      await supabase.from('faq_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('faq_sections').delete().neq('id', '00000000-0000-0000-0000-000000000000');

      for (let i = 0; i < faqSections.length; i++) {
        const s = faqSections[i];
        const { data: newS, error: sErr } = await supabase.from('faq_sections').insert({
          title: s.title,
          icon_name: s.icon_name || 'Layers',
          display_order: i
        }).select().single();

        if (sErr) throw sErr;

        if (s.items && s.items.length > 0) {
          const itemsToInsert = s.items.map((item: any, idx: number) => ({
            section_id: newS.id,
            label: item.label,
            description: item.description,
            icon_name: item.icon_name || 'Info',
            display_order: idx
          }));
          const { error: iErr } = await supabase.from('faq_items').insert(itemsToInsert);
          if (iErr) throw iErr;
        }
      }

      setToast({ isVisible: true, message: 'FAQ salvate con successo!', type: 'success' });
      fetchFAQData();
    } catch (err) {
      console.error('Error saving FAQ:', err);
      setToast({ isVisible: true, message: 'Errore nel salvataggio delle FAQ', type: 'error' });
    } finally {
      setFaqSaveLoading(false);
    }
  };

  // ========== Privacy Functions ==========
  const fetchPrivacyData = async () => {
    setPrivacyLoading(true);
    try {
      const { data, error } = await supabase
        .from('privacy_policy')
        .select('title, content')
        .eq('id', 'policy')
        .maybeSingle();

      if (data && !error) {
        setPrivacyTitle(data.title || 'Privacy & Cookie Policy');
        setPrivacyContent(data.content || '');
      }
    } catch (err) {
      console.error('Error fetching privacy:', err);
    } finally {
      setPrivacyLoading(false);
    }
  };

  const savePrivacyData = async () => {
    setPrivacySaveLoading(true);
    try {
      const { error } = await supabase
        .from('privacy_policy')
        .upsert({
          id: 'policy',
          title: privacyTitle,
          content: privacyContent,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      setToast({ isVisible: true, message: 'Privacy Policy salvata con successo!', type: 'success' });
    } catch (err: any) {
      console.error('Error saving privacy:', err);
      setToast({ isVisible: true, message: `Errore nel salvataggio: ${err.message}`, type: 'error' });
    } finally {
      setPrivacySaveLoading(false);
    }
  };

  const fetchAnalyticsData = async () => {
    setAnalyticsLoading(true);
    try {
      const [profilesRes, suggestionsRes, betsRes] = await Promise.all([
        supabase.from('profiles').select('created_at'),
        supabase.from('suggestions').select('created_at, status, civ_name'),
        supabase.from('user_bets').select('created_at, amount')
      ]);

      if (profilesRes.error) throw profilesRes.error;
      if (suggestionsRes.error) throw suggestionsRes.error;
      if (betsRes.error) throw betsRes.error;

      const profiles = profilesRes.data || [];
      const suggestions = suggestionsRes.data || [];
      const bets = betsRes.data || [];

      const totalUsers = profiles.length;
      const totalSuggestions = suggestions.length;
      const totalBets = bets.length;
      const totalSheep = bets.reduce((sum: number, b: any) => sum + (b.amount || 0), 0);

      // Highlights calculation
      const now = new Date();
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const newUsersThisWeek = profiles.filter((p: any) => p.created_at && new Date(p.created_at) >= oneWeekAgo).length;
      const newUsersToday = profiles.filter((p: any) => p.created_at && new Date(p.created_at) >= oneDayAgo).length;

      const newSuggestionsThisWeek = suggestions.filter((s: any) => s.created_at && new Date(s.created_at) >= oneWeekAgo).length;
      const newSuggestionsToday = suggestions.filter((s: any) => s.created_at && new Date(s.created_at) >= oneDayAgo).length;

      const betsThisWeek = bets.filter((b: any) => b.created_at && new Date(b.created_at) >= oneWeekAgo).length;
      const betsToday = bets.filter((b: any) => b.created_at && new Date(b.created_at) >= oneDayAgo).length;

      const sheepWageredThisWeek = bets
        .filter((b: any) => b.created_at && new Date(b.created_at) >= oneWeekAgo)
        .reduce((sum: number, b: any) => sum + (b.amount || 0), 0);
      const sheepWageredToday = bets
        .filter((b: any) => b.created_at && new Date(b.created_at) >= oneDayAgo)
        .reduce((sum: number, b: any) => sum + (b.amount || 0), 0);

      setAnalyticsData({
        totalUsers,
        totalSuggestions,
        totalBets,
        totalSheep,
        registrationsTrend: getTrendData(profiles),
        suggestionsTrend: getTrendData(suggestions),
        betsTrend: getTrendData(bets),
        civPopularity: getCivPopularity(suggestions),
        newUsersThisWeek,
        newUsersToday,
        newSuggestionsThisWeek,
        newSuggestionsToday,
        betsThisWeek,
        betsToday,
        sheepWageredThisWeek,
        sheepWageredToday
      });
    } catch (err) {
      console.error('Error fetching analytics data:', err);
      setToast({ isVisible: true, message: 'Errore nel caricamento delle metriche', type: 'error' });
    } finally {
      setAnalyticsLoading(false);
    }
  };

  // Helper utility to write audit logs
  const logAdminAction = async (
    action: string,
    targetType: string | null,
    targetId: string | null,
    description: string,
    details: Record<string, any> = {}
  ) => {
    try {
      const userEmail = user?.email || 'admin@localhost';
      const userNickname = user?.nickname || 'Admin';
      await supabase.from('audit_log').insert({
        user_email: userEmail,
        user_nickname: userNickname,
        action,
        target_type: targetType,
        target_id: targetId,
        description,
        details
      });
    } catch (err) {
      console.error('Error writing audit log:', err);
    }
  };

  // Fetch all audit logs
  const fetchAuditLogs = async () => {
    try {
      setAuditLoading(true);
      const { data, error } = await supabase
        .from('audit_log')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAuditLogs(data || []);
    } catch (err: any) {
      console.error('Error fetching audit logs:', err);
      setToast({ isVisible: true, message: 'Errore nel caricamento del registro attività', type: 'error' });
    } finally {
      setAuditLoading(false);
    }
  };

  // Fetch metrics & row counts for Diagnostics
  const fetchDiagnostics = async () => {
    try {
      setMetricsLoading(true);
      setPingStatus('checking');

      // Test Supabase connection
      const { error: pingError } = await supabase.from('civilizations').select('id').limit(1);
      if (pingError) {
        setPingStatus('offline');
      } else {
        setPingStatus('online');
      }

      // Fetch row counts for all tables (run in parallel)
      const tables = [
        'profiles', 'suggestions', 'questions', 'answers', 
        'tournaments', 'betting_markets', 'user_bets', 
        'civilizations', 'audit_log', 'stream_overlays', 'faq_sections', 'faq_items'
      ];

      const counts: Record<string, number> = {};
      await Promise.all(
        tables.map(async (table) => {
          try {
            const { count, error } = await supabase
              .from(table)
              .select('*', { count: 'exact', head: true });
            if (!error) {
              counts[table] = count || 0;
            } else {
              counts[table] = 0;
            }
          } catch (e) {
            counts[table] = 0;
          }
        })
      );

      // Total Sheep in circulation
      const { data: sheepData, error: sheepErr } = await supabase.from('profiles').select('sheep_balance');
      let totalSheep = 0;
      if (!sheepErr && sheepData) {
        totalSheep = sheepData.reduce((acc, curr) => acc + (curr.sheep_balance || 0), 0);
      }

      setDbMetrics({
        ...counts,
        total_sheep: totalSheep
      });

      // Count pending items directly for the "In Coda" box (independent of local state)
      const [{ count: pendingSugg }, { count: pendingQ }, { count: pendingA }] = await Promise.all([
        supabase.from('suggestions').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('questions').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('answers').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      ]);
      setPendingQueueCount((pendingSugg || 0) + (pendingQ || 0) + (pendingA || 0));
    } catch (err: any) {
      console.error('Error fetching diagnostics:', err);
    } finally {
      setMetricsLoading(false);
    }
  };

  // Perform full database backup download client-side
  const handleDownloadBackup = async () => {
    try {
      setIsGeneratingBackup(true);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      
      const tables = [
        'civilizations',
        'suggestions',
        'faq_settings',
        'faq_sections',
        'faq_items',
        'profiles',
        'build_order_votes',
        'betting_markets',
        'user_bets',
        'betting_notifications',
        'tournaments',
        'stream_overlays',
        'qa_votes',
        'audit_log'
      ];

      const backupData: Record<string, any[]> = {};

      // Load all data
      await Promise.all(
        tables.map(async (table) => {
          let allData: any[] = [];
          let from = 0;
          const step = 1000;
          let hasMore = true;

          while (hasMore) {
            const { data, error } = await supabase
              .from(table)
              .select('*')
              .range(from, from + step - 1);

            if (error) {
              console.error(`Error backing up table ${table}:`, error.message);
              hasMore = false;
              continue;
            }

            if (data && data.length > 0) {
              allData = [...allData, ...data];
              if (data.length < step) {
                hasMore = false;
              } else {
                from += step;
              }
            } else {
              hasMore = false;
            }
          }
          backupData[table] = allData;
        })
      );

      // Create browser download
      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
        JSON.stringify(backupData, null, 2)
      )}`;
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', jsonString);
      downloadAnchor.setAttribute('download', `manualeciv_backup_${timestamp}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      setToast({ isVisible: true, message: 'Backup database scaricato con successo!', type: 'success' });
      
      // Log the backup action!
      await logAdminAction(
        'BACKUP_DATABASE',
        'system',
        null,
        'Eseguito backup manuale e scaricato il dump JSON completo del database.'
      );
    } catch (err: any) {
      console.error('Error creating backup:', err);
      setToast({ isVisible: true, message: `Errore backup: ${err.message}`, type: 'error' });
    } finally {
      setIsGeneratingBackup(false);
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

      await logAdminAction(
        'ADD_STAFF_USER',
        'profiles',
        email,
        `Aggiunto utente "${email}" allo staff`,
        { target_email: email }
      );

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

      await logAdminAction(
        'UPDATE_NICKNAME',
        'profiles',
        email,
        `Modificato nickname di "${email}" in "${nickname}"`,
        { target_email: email, new_nickname: nickname }
      );

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
    if (!isSuperAdmin) {
      setToast({ isVisible: true, message: 'Solo il super amministratore può modificare i permessi dello staff', type: 'error' });
      return;
    }
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

      await logAdminAction(
        'TOGGLE_USER_PERMISSION',
        'profiles',
        userEmail,
        `Modificato permesso "${field}" per "${userEmail}" a "${value}"`,
        { target_email: userEmail, field, value, updates }
      );

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
    if (!isSuperAdmin) return;
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

      await logAdminAction(
        'REMOVE_STAFF_USER',
        'profiles',
        email,
        `Rimosso "${email}" dallo staff (revocati tutti i ruoli e permessi)`,
        { target_email: email }
      );

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
    if (pendingNotifCount === 0 || !isAdmin) return;

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
    if (!isAdmin && !canManage) return;
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

      await logAdminAction(
        newStatus === 'implemented' ? 'RESOLVE_SUGGESTION' : 'REJECT_SUGGESTION',
        'suggestions',
        sugg.id,
        newStatus === 'implemented' 
          ? `Approvata proposta di modifica da parte di "${sugg.user_name || sugg.user_email || 'Anonimo'}" per "${sugg.civ_name}" (${sugg.section})`
          : `Scartata proposta di modifica da parte di "${sugg.user_name || sugg.user_email || 'Anonimo'}" per "${sugg.civ_name}" (${sugg.section})${reason ? `: "${reason}"` : ''}`,
        { suggestion: sugg, status: newStatus, reason }
      );

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

      await logAdminAction(
        `QA_${newStatus.toUpperCase()}_${type.toUpperCase()}`,
        table,
        item.id,
        `${newStatus === 'approved' ? 'Approvata' : newStatus === 'deleted' ? 'Eliminata' : 'Rifiutata'} ${type === 'question' ? 'domanda' : 'risposta'} (ID: ${item.id}) da parte di "${item.user_nickname || item.user_name || 'Anonimo'}"`,
        { qa_item: item, type, new_status: newStatus }
      );

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
    <div className="h-screen w-screen flex bg-[#04060b] text-white overflow-hidden font-sans relative">
      
      {/* Backdrop per mobile drawer */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden transition-all duration-300 animate-in fade-in"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar di Navigazione Dashboard */}
      <aside className={`fixed inset-y-0 left-0 w-64 bg-[#080b16] border-r border-cyan-500/15 flex flex-col shrink-0 z-50 transform md:translate-x-0 md:static md:flex transition-transform duration-300 ease-in-out ${
        isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="p-6 border-b border-white/5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600/10 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold">M</div>
            <div>
              <h1 className="text-sm font-black uppercase tracking-wider text-white">Manuale Civ</h1>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Admin Control</p>
            </div>
          </div>
          <button 
            onClick={() => setIsMobileMenuOpen(false)}
            className="p-1.5 text-gray-400 hover:text-white md:hidden hover:bg-white/5 rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          <button
            onClick={() => selectTab('overview')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'overview' ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/15' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
          >
            <LayoutDashboard size={18} />
            <span>Panoramica</span>
          </button>
          
          <button
            onClick={() => selectTab('utenti')}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'utenti' ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/15' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
          >
            <div className="flex items-center gap-3">
              <Users size={18} />
              <span>Utenti (CRM)</span>
            </div>
            {pendingRedemptionsCount > 0 && (
              <span className="px-2 py-0.5 bg-fuchsia-600 text-white text-[10px] rounded-full font-black animate-pulse shadow-[0_0_8px_rgba(217,70,239,0.4)]">
                {pendingRedemptionsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => selectTab('comunicazioni')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'comunicazioni' ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/15' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
          >
            <Megaphone size={18} />
            <span>Comunicazioni</span>
          </button>

          <button
            onClick={() => selectTab('analytics')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'analytics' ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/15' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
          >
            <TrendingUp size={18} />
            <span>Analytics</span>
          </button>
          
          <button
            onClick={() => selectTab('proposte')}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'proposte' ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/15' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
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
            onClick={() => selectTab('qa')}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'qa' ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/15' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
          >
            <div className="flex items-center gap-3">
              <MessageSquare size={18} />
              <span>Q&A Mod</span>
            </div>
            {(questions.length + answers.length) > 0 && (
              <span className="px-2 py-0.5 bg-cyan-400 text-black text-[10px] rounded-full font-black shadow-[0_0_8px_rgba(34,211,238,0.4)]">
                {questions.length + answers.length}
              </span>
            )}
          </button>

          {(isAdmin || canManageTournaments) && (
            <button
              onClick={() => selectTab('tornei')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'tornei' ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/15' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
            >
              <Trophy size={18} />
              <span>Gestione Tornei</span>
            </button>
          )}

          {(isAdmin || canManageCivs || canManageBuildorders) && (
            <button
              onClick={() => selectTab('civilta')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'civilta' ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/15' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
            >
              <BookOpen size={18} />
              <span>Civiltà & BO</span>
            </button>
          )}

          {isSuperAdmin && (
            <button
              onClick={() => selectTab('users')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'users' ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/15' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
            >
              <ShieldCheck size={18} />
              <span>Permessi Staff</span>
            </button>
          )}

          <button
            onClick={() => selectTab('pecore')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'pecore' ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/15' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
          >
            <span className="text-base">🐑</span>
            <span>Bilancio Pecore</span>
          </button>

          <button
            onClick={() => selectTab('faq')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'faq' ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/15' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
          >
            <HelpCircle size={18} />
            <span>Gestione FAQ</span>
          </button>

          <button
            onClick={() => selectTab('privacy')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'privacy' ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/15' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
          >
            <Shield size={18} />
            <span>Privacy Policy</span>
          </button>

          <button
            onClick={() => selectTab('audit')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'audit' ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/15' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
          >
            <History size={18} />
            <span>Registro Attività</span>
          </button>

          <button
            onClick={() => selectTab('diagnostics')}
            className={`w-full flex items-center justify-start text-left gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'diagnostics' ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/15' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
          >
            <Database size={18} className="shrink-0" />
            <span className="text-left leading-snug whitespace-nowrap">Backup & Diagnostica</span>
          </button>

          <button
            onClick={() => {
              navigate('/admin/overlays', { state: { fromAdmin: true } });
              setIsMobileMenuOpen(false);
            }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all text-gray-400 hover:text-white hover:bg-white/5"
          >
            <Monitor size={18} />
            <span>Stream Overlays</span>
          </button>
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
        <header className="h-20 border-b border-white/5 flex items-center justify-between px-4 md:px-8 bg-[#0a0e1c]/40 backdrop-blur-sm shrink-0 gap-4">
          <div className="flex items-center gap-3 overflow-hidden">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2.5 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-xl md:hidden shrink-0 transition-colors"
            >
              <Menu size={20} className="text-cyan-400" />
            </button>
            <div className="overflow-hidden">
              <h2 className="text-sm md:text-xl font-bold uppercase tracking-wider truncate">
                {activeTab === 'overview' && 'Pannello di Controllo'}
                {activeTab === 'proposte' && 'Gestione Suggerimenti'}
                {activeTab === 'qa' && 'Moderazione Domande & Risposte'}
                {activeTab === 'users' && 'Staff & Permessi'}
                {activeTab === 'pecore' && 'Bilancio Pecore'}
                {activeTab === 'tornei' && 'Gestione Tornei'}
                {activeTab === 'civilta' && 'Gestione Civiltà & BO'}
                {activeTab === 'audit' && 'Registro Attività (Audit)'}
                {activeTab === 'diagnostics' && 'Backup & Diagnostica'}
                {activeTab === 'utenti' && 'Anagrafica Utenti (CRM)'}
                {activeTab === 'comunicazioni' && 'Centro Comunicazioni'}
                {activeTab === 'analytics' && 'Metriche & Analytics'}
                {activeTab === 'faq' && 'Gestione FAQ'}
                {activeTab === 'privacy' && 'Privacy Policy'}
              </h2>
              <p className="text-[10px] md:text-xs text-gray-400 truncate">
                {activeTab === 'overview' && 'Panoramica e statistiche globali del manuale.'}
                {activeTab === 'proposte' && 'Revisiona e approva i suggerimenti inviati dalla community.'}
                {activeTab === 'qa' && 'Approva, rifiuta o elimina i contributi Q&A degli utenti.'}
                {activeTab === 'users' && 'Gestisci i permessi operativi ed i ruoli dello staff.'}
                {activeTab === 'pecore' && 'Gestisci e ricarica i saldi di pecore dei pastori.'}
                {activeTab === 'tornei' && 'Pianifica tornei, gestisci podi e video dei match.'}
                {activeTab === 'civilta' && 'Modifica dettagli civiltà e crea/edita i build orders.'}
                {activeTab === 'audit' && 'Registro di controllo e sicurezza di tutte le azioni dello staff.'}
                {activeTab === 'diagnostics' && 'Monitoraggio del database, test di integrazione ed esportazione backup.'}
                {activeTab === 'utenti' && 'CRM per la gestione di tutti gli utenti registrati sul portale.'}
                {activeTab === 'comunicazioni' && 'Crea e pubblica annunci, banner in-app e notifiche per la community.'}
                {activeTab === 'analytics' && 'Visualizza trend di crescita, scommesse, contributi e fasce orarie.'}
                {activeTab === 'faq' && 'Gestisci le domande frequenti, le sezioni e i contenuti della pagina FAQ.'}
                {activeTab === 'privacy' && 'Modifica il titolo e il contenuto della Privacy & Cookie Policy.'}
              </p>
            </div>
          </div>
        </header>

        {/* Corpo scrollabile */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
          
          {/* TAB PANELS */}
          {activeTab === 'overview' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-500">
              {/* Welcome Banner */}
              <div className="bg-[#0a0e1c]/60 border border-cyan-500/15 rounded-3xl p-6 flex flex-col md:flex-row items-center gap-6 shadow-2xl backdrop-blur-md relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-cyan-500/35 to-transparent"></div>
                <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border-2 border-cyan-500/20 flex items-center justify-center text-cyan-400 text-2xl shadow-lg shrink-0">🔑</div>
                <div>
                  <h3 className="text-lg font-black text-white uppercase tracking-tight">Benvenuto nel Pannello Admin, {user?.nickname || 'Admin'}</h3>
                  <p className="text-xs text-gray-400 mt-1">
                    Ecco una panoramica dello stato attuale del sito e delle attività che richiedono il tuo intervento.
                  </p>
                </div>
              </div>

              {/* Sezione Attenzione Richiesta */}
              <div className="space-y-4">
                <h4 className="text-[11px] font-black uppercase text-gray-500 tracking-[0.2em]">⚠️ Cose che richiedono la tua attenzione</h4>
                
                {suggestions.length === 0 && questions.length === 0 && answers.length === 0 && (!isAdmin || pendingNotifCount === 0) ? (
                  <div className="max-w-2xl w-full bg-emerald-500/5 border border-emerald-500/20 rounded-2xl py-5 px-6 flex items-center gap-4 shadow-sm backdrop-blur-sm transition-all hover:bg-emerald-500/10">
                    <CheckCircle className="text-emerald-400 animate-pulse shrink-0" size={24} />
                    <div className="text-left">
                      <h5 className="text-sm font-black text-white uppercase tracking-wider">Tutto sotto controllo!</h5>
                      <p className="text-xs text-gray-400 mt-1">
                        Non ci sono proposte pendenti, contributi Q&A da moderare o notifiche in attesa di invio.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {suggestions.length > 0 && (
                      <div className="bg-[#0a0e1c]/60 border border-blue-500/20 rounded-3xl p-5 flex flex-col justify-between shadow-xl relative overflow-hidden group hover:border-blue-500/50 transition-all duration-300">
                        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-blue-500/30 to-transparent"></div>
                        <div className="space-y-3">
                          <div className="flex justify-between items-start">
                            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/25 flex items-center justify-center text-blue-400">
                              <Inbox size={20} />
                            </div>
                            <span className="px-2.5 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full text-[10px] font-black uppercase">
                              {suggestions.length} Pendenti
                            </span>
                          </div>
                          <div>
                            <h5 className="text-xs font-black text-white uppercase tracking-wider">Suggerimenti in attesa</h5>
                            <p className="text-[11px] text-gray-400 mt-1">
                              Ci sono proposte inviate dagli utenti per le civiltà o build orders che aspettano la tua approvazione.
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => selectTab('proposte')}
                          className="mt-4 w-full py-2 bg-blue-600/20 hover:bg-blue-600 border border-blue-500/30 text-blue-400 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
                        >
                          Risolvi Proposte
                        </button>
                      </div>
                    )}

                    {(questions.length > 0 || answers.length > 0) && (
                      <div className="bg-[#0a0e1c]/60 border border-cyan-500/20 rounded-3xl p-5 flex flex-col justify-between shadow-xl relative overflow-hidden group hover:border-cyan-500/50 transition-all duration-300">
                        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent"></div>
                        <div className="space-y-3">
                          <div className="flex justify-between items-start">
                            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center text-cyan-400">
                              <MessageSquare size={20} />
                            </div>
                            <span className="px-2.5 py-0.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-full text-[10px] font-black uppercase">
                              {questions.length + answers.length} Da moderare
                            </span>
                          </div>
                          <div>
                            <h5 className="text-xs font-black text-white uppercase tracking-wider">Moderazione Q&A</h5>
                            <p className="text-[11px] text-gray-400 mt-1">
                              Nuove domande o risposte della community in attesa di verifica per garantire la qualità del portale.
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => selectTab('qa')}
                          className="mt-4 w-full py-2 bg-cyan-600/20 hover:bg-cyan-600 border border-cyan-500/30 text-cyan-400 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
                        >
                          Modera Contributi
                        </button>
                      </div>
                    )}

                    {isAdmin && pendingNotifCount > 0 && (
                      <div className="bg-[#0a0e1c]/60 border border-purple-500/20 rounded-3xl p-5 flex flex-col justify-between shadow-xl relative overflow-hidden group hover:border-purple-500/50 transition-all duration-300">
                        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-purple-500/30 to-transparent"></div>
                        <div className="space-y-3">
                          <div className="flex justify-between items-start">
                            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/25 flex items-center justify-center text-purple-400">
                              <Send size={20} />
                            </div>
                            <span className="px-2.5 py-0.5 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-full text-[10px] font-black uppercase">
                              {pendingNotifCount} Notifiche
                            </span>
                          </div>
                          <div>
                            <h5 className="text-xs font-black text-white uppercase tracking-wider">Email da spedire</h5>
                            <p className="text-[11px] text-gray-400 mt-1">
                              Gli utenti attendono l'invio del resoconto delle loro proposte approvate o rifiutate.
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={handleSendNotifications}
                          disabled={isSendingEmail}
                          className="mt-4 w-full py-2 bg-purple-600/20 hover:bg-purple-600 border border-purple-500/30 text-purple-400 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all disabled:opacity-50"
                        >
                          {isSendingEmail ? 'Spedizione...' : 'Invia Email Ora'}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Sezione Punti Salienti (Highlights) */}
              <div className="space-y-4">
                <h4 className="text-[11px] font-black uppercase text-gray-500 tracking-[0.2em]">📈 Highlights dell'Attività</h4>
                
                {analyticsLoading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[1, 2, 3, 4].map(idx => (
                      <div key={idx} className="bg-[#0a0e1c]/60 border border-white/5 rounded-3xl p-6 animate-pulse h-28 flex flex-col justify-center gap-2">
                        <div className="h-2.5 bg-white/10 rounded w-1/2"></div>
                        <div className="h-6 bg-white/15 rounded w-1/3 mt-2"></div>
                      </div>
                    ))}
                  </div>
                ) : analyticsData ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-[#0a0e1c]/60 border border-white/5 rounded-3xl p-6 relative overflow-hidden backdrop-blur-md shadow-2xl">
                      <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-cyan-500/25 to-transparent"></div>
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">Utenti Registrati</span>
                        <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                          <Users size={16} />
                        </div>
                      </div>
                      <p className="text-3xl font-black mt-4 text-white tracking-tight">
                        {analyticsData.totalUsers}
                      </p>
                      <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-2 flex flex-col gap-0.5">
                        <span className="text-cyan-400">+{analyticsData.newUsersThisWeek} questa settimana</span>
                        <span>+{analyticsData.newUsersToday} oggi</span>
                      </div>
                    </div>

                    <div className="bg-[#0a0e1c]/60 border border-white/5 rounded-3xl p-6 relative overflow-hidden backdrop-blur-md shadow-2xl">
                      <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-blue-500/25 to-transparent"></div>
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">Proposte Totali</span>
                        <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                          <Inbox size={16} />
                        </div>
                      </div>
                      <p className="text-3xl font-black mt-4 text-white tracking-tight">
                        {analyticsData.totalSuggestions}
                      </p>
                      <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-2 flex flex-col gap-0.5">
                        <span className="text-blue-400">+{analyticsData.newSuggestionsThisWeek} questa settimana</span>
                        <span>+{analyticsData.newSuggestionsToday} oggi</span>
                      </div>
                    </div>

                    <div className="bg-[#0a0e1c]/60 border border-white/5 rounded-3xl p-6 relative overflow-hidden backdrop-blur-md shadow-2xl">
                      <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-indigo-500/25 to-transparent"></div>
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">Scommesse Piazzate</span>
                        <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                          <TrendingUp size={16} />
                        </div>
                      </div>
                      <p className="text-3xl font-black mt-4 text-white tracking-tight">
                        {analyticsData.totalBets}
                      </p>
                      <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-2 flex flex-col gap-0.5">
                        <span className="text-indigo-400">+{analyticsData.betsThisWeek} questa settimana</span>
                        <span>+{analyticsData.betsToday} oggi</span>
                      </div>
                    </div>

                    <div className="bg-[#0a0e1c]/60 border border-white/5 rounded-3xl p-6 relative overflow-hidden backdrop-blur-md shadow-2xl">
                      <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-cyan-500/25 to-transparent"></div>
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">Pecore Scommesse</span>
                        <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                          <Coins size={16} />
                        </div>
                      </div>
                      <p className="text-3xl font-black mt-4 text-cyan-400 tracking-tight">
                        🐑 {analyticsData.totalSheep}
                      </p>
                      <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-2 flex flex-col gap-0.5">
                        <span className="text-cyan-400">+🐑 {analyticsData.sheepWageredThisWeek} questa settimana</span>
                        <span>+🐑 {analyticsData.sheepWageredToday} oggi</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-black/20 border border-white/5 rounded-3xl p-6 text-center">
                    <p className="text-xs text-gray-400 font-medium">Impossibile caricare gli highlights dell'attività.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'proposte' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-5 duration-500">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 text-center bg-[#0a0e1c]/40 border border-white/5 rounded-3xl shadow-inner">
                  <Loader2 className="animate-spin text-blue-400 mb-2" size={32} />
                  <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Caricamento proposte...</span>
                </div>
              ) : suggestions.length === 0 ? (
                <div className="max-w-2xl w-full flex items-center py-5 px-6 bg-white/[0.02] border border-white/5 rounded-2xl text-gray-500 shadow-sm gap-4 hover:bg-white/[0.03] transition-colors">
                  <Inbox size={24} className="text-gray-500 opacity-60 animate-pulse shrink-0" />
                  <div className="text-left">
                    <h3 className="text-sm font-black text-white uppercase tracking-wider">Tutto gestito!</h3>
                    <p className="text-xs text-gray-400 mt-1">Non ci sono proposte in sospeso da approvare.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {suggestions.map((sugg) => (
                    <div key={sugg.id} className="bg-[#0a0e1c]/60 border border-cyan-500/15 rounded-3xl p-6 hover:border-blue-500/50 shadow-2xl relative overflow-hidden backdrop-blur-md transition-all duration-300">
                      <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-blue-500/35 to-transparent"></div>

                      <div className="flex flex-col lg:flex-row justify-between gap-6 relative z-10">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                            <div className="flex items-center gap-3">
                              <span className="px-2.5 py-0.5 bg-blue-600/20 text-blue-400 text-[10px] font-black rounded-lg border border-blue-500/20 uppercase tracking-wider">
                                {sugg.civ_name}
                              </span>
                              <span className="text-xs text-gray-400 flex items-center gap-1.5 font-bold uppercase tracking-wider">
                                Sezione: <span className="text-white">{sugg.section}</span>
                              </span>
                            </div>
                            {sugg.section === 'build_order' && (
                              <button
                                onClick={() => setExpandedSugg(expandedSugg === sugg.id ? null : sugg.id)}
                                className="text-xs text-blue-400 hover:text-blue-300 hover:underline font-black uppercase tracking-wider"
                              >
                                {expandedSugg === sugg.id ? 'Chiudi Editor' : 'Edita Passaggi'}
                              </button>
                            )}
                          </div>

                          <div className="bg-black/40 p-5 rounded-2xl border border-white/5 mb-4 shadow-inner">
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
                                    <div className="space-y-4">
                                      <p className="text-blue-400 font-black text-lg tracking-tight">{currentEdits.title}</p>
                                      <div className="space-y-2 mt-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                        {currentEdits.steps.map((s: any, i: number) => (
                                          <p key={i} className="text-xs text-gray-200 flex items-start">
                                            <span className="text-cyan-400 font-mono mr-4 text-xs font-black shrink-0">{s.time}</span>
                                            <span className="flex-1 font-medium">{s.action}</span>
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
                                  <div className="space-y-6 animate-in fade-in duration-300">
                                    <div>
                                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] block mb-2">Titolo Proposto</label>
                                      <input
                                        className="w-full bg-[#111218] border-2 border-white/10 hover:border-white/20 focus:border-blue-500/50 rounded-2xl px-4 py-3 text-xs text-white focus:shadow-[0_0_15px_rgba(59,130,246,0.15)] transition-all outline-none font-bold"
                                        value={currentEdits.title === 'Nuovo Build Order' ? '' : currentEdits.title}
                                        onChange={(e) => updateBOField('title', e.target.value)}
                                        placeholder="Titolo"
                                      />
                                    </div>
                                    <div className="space-y-4">
                                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] block">Passaggi Temporizzati</label>
                                      <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                                        {currentEdits.steps.map((s: any, i: number) => (
                                          <div key={i} className="grid grid-cols-12 gap-3 p-4 bg-black/35 rounded-2xl border border-white/5 relative">
                                            <input
                                              className="col-span-3 md:col-span-2 bg-[#111218] border-2 border-white/10 hover:border-white/20 focus:border-cyan-500/50 rounded-xl px-2 py-2 text-xs text-cyan-400 focus:shadow-[0_0_15px_rgba(6,182,212,0.15)] outline-none text-center font-bold"
                                              value={s.time}
                                              onChange={(e) => updateBOStep(i, 'time', e.target.value)}
                                            />
                                            <input
                                              className="col-span-9 md:col-span-10 bg-[#111218] border-2 border-white/10 hover:border-white/20 focus:border-blue-500/50 rounded-xl px-4 py-2 text-xs text-white focus:shadow-[0_0_15px_rgba(59,130,246,0.15)] outline-none font-bold"
                                              value={s.action}
                                              onChange={(e) => updateBOStep(i, 'action', e.target.value)}
                                            />
                                            <textarea
                                              className="col-span-12 bg-[#111218] border-2 border-white/10 hover:border-white/20 focus:border-blue-500/50 rounded-xl px-4 py-2 text-xs text-gray-300 focus:shadow-[0_0_15px_rgba(59,130,246,0.15)] outline-none resize-none h-16 italic"
                                              value={s.note}
                                              placeholder="Nota di dettaglio..."
                                              onChange={(e) => updateBOStep(i, 'note', e.target.value)}
                                            />
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                    <div>
                                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] block mb-2">Fonte / Link YouTube Video</label>
                                      <input
                                        className="w-full bg-[#111218] border-2 border-white/10 hover:border-white/20 focus:border-blue-500/50 rounded-2xl px-4 py-2 text-xs text-cyan-400/80 focus:shadow-[0_0_15px_rgba(59,130,246,0.15)] outline-none"
                                        value={currentEdits.source}
                                        onChange={(e) => updateBOField('source', e.target.value)}
                                      />
                                      {currentEdits.source && getYoutubeId(currentEdits.source) && (
                                        <div className="mt-4 relative aspect-video w-full max-w-[240px] rounded-2xl overflow-hidden border border-white/10 shadow-lg">
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
                              <p className="text-gray-200 text-xs whitespace-pre-wrap leading-relaxed">{sugg.suggestion_text}</p>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-4 text-[10px] text-gray-500">
                            <div className="flex items-center gap-2 bg-white/5 px-2.5 py-1 rounded-xl border border-white/5">
                              <span className="font-black uppercase text-gray-500">Autore:</span>
                              <span className="text-blue-400 font-bold">{sugg.user_nickname || sugg.user_name || 'Anonimo'}</span>
                              {sugg.user_rank && sugg.user_rank !== 'Unranked' && (
                                <span className="bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded-lg text-[9px] border border-blue-500/30">
                                  {sugg.user_rank}
                                </span>
                              )}
                            </div>
                            <div>
                              <strong className="uppercase font-black text-gray-600">Email:</strong> <span className="text-gray-400">{sugg.user_email || 'Non fornita'}</span>
                            </div>
                            <div>
                              <strong className="uppercase font-black text-gray-600">Data:</strong> <span className="text-gray-400">{new Date(sugg.created_at).toLocaleString('it-IT')}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0 items-stretch sm:items-center lg:items-end justify-center w-full lg:w-auto">
                          {((sugg.section === 'build_order' && canManageBuildorders) || (sugg.section !== 'build_order' && canManageCivs)) && (
                            <button
                              onClick={() => handleUpdateStatus(sugg, 'implemented')}
                              className="w-full lg:w-auto flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white rounded-xl shadow-lg hover:-translate-y-0.5 active:scale-95 transition-all text-xs font-black uppercase tracking-widest border-0"
                              title="Segna come completata"
                            >
                              <CheckCircle size={14} strokeWidth={3} /> Approva
                            </button>
                          )}

                          {((sugg.section === 'build_order' && canManageBuildorders) || (sugg.section !== 'build_order' && canManageCivs)) && (
                            <button
                              onClick={() => setRejectionModalSugg(sugg)}
                              className="w-full lg:w-auto flex items-center justify-center gap-2 px-5 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl hover:-translate-y-0.5 active:scale-95 transition-all text-xs font-black uppercase tracking-widest border border-red-500/20"
                              title="Rifiuta proposta"
                            >
                              <XCircle size={14} strokeWidth={3} /> Scarta
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
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-500">
              {qaLoading ? (
                <div className="flex flex-col items-center justify-center py-20 text-center bg-[#0a0e1c]/40 border border-white/5 rounded-3xl">
                  <Loader2 className="animate-spin text-blue-400 mb-2" size={32} />
                  <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Caricamento domande e risposte...</span>
                </div>
              ) : (
                <>
                  {/* Domande Pendenti */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-black text-yellow-500 uppercase tracking-[0.25em] flex items-center gap-3">
                      <MessageSquare size={16} className="text-yellow-500 shrink-0" /> Domande da Approvare ({questions.length})
                    </h3>
                    {questions.length === 0 ? (
                      <div className="max-w-2xl w-full flex items-center gap-3 py-4 px-5 bg-white/[0.02] border border-white/5 rounded-xl text-gray-400">
                        <MessageSquare size={18} className="text-gray-500 opacity-50 shrink-0" />
                        <span className="text-sm font-medium">Nessuna domanda in sospeso.</span>
                      </div>
                    ) : (
                      <div className="grid gap-4">
                        {questions.map(q => (
                          <div key={q.id} className="bg-[#0a0e1c]/60 border border-white/5 p-6 rounded-3xl space-y-4 hover:border-yellow-500/30 transition-colors shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-yellow-500/25 to-transparent"></div>
                            <div className="flex justify-between items-start gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-3 flex-wrap">
                                  <span className="px-2 py-0.5 bg-yellow-500/10 text-yellow-500 text-[9px] font-black rounded-lg border border-yellow-500/20 uppercase tracking-wider">{q.civ_id}</span>
                                  <span className="text-xs font-black text-white">{q.user_nickname}</span>
                                  <span className="text-[9px] font-black text-gray-500">({q.user_rank})</span>
                                </div>
                                <p className="text-gray-200 text-xs font-medium leading-relaxed">{q.question_text}</p>
                                
                                <div className="flex flex-wrap gap-3 mt-6 pt-5 border-t border-white/5">
                                  {canManageCivs && (
                                    <>
                                      <button 
                                        onClick={() => handleUpdateQAStatus(q, 'question', 'approved')} 
                                        className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white rounded-xl shadow-lg hover:-translate-y-0.5 active:scale-95 transition-all text-[10px] font-black uppercase tracking-widest" 
                                      >
                                        <CheckCircle size={14} strokeWidth={3} />
                                        <span>Approva</span>
                                      </button>
                                      <button 
                                        onClick={() => handleUpdateQAStatus(q, 'question', 'rejected')} 
                                        className="flex items-center gap-2 px-5 py-2.5 bg-[#111218] border-2 border-white/10 hover:border-white/20 text-gray-400 hover:text-white rounded-xl hover:-translate-y-0.5 active:scale-95 transition-all text-[10px] font-black uppercase tracking-widest" 
                                      >
                                        <XCircle size={14} strokeWidth={3} />
                                        <span>Rifiuta</span>
                                      </button>
                                      <button 
                                        onClick={() => setDeleteConfirm({ id: q.id, type: 'question', item: q })} 
                                        className="flex items-center gap-2 px-3 py-2 bg-red-500/10 text-red-400 rounded-xl border border-red-500/20 hover:bg-red-500/25 transition-all text-[10px] font-bold uppercase ml-auto" 
                                      >
                                        <Trash2 size={14} />
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
                    <h3 className="text-xs font-black text-blue-400 uppercase tracking-[0.25em] flex items-center gap-3">
                      <Send size={16} className="text-blue-400 shrink-0" /> Risposte da Approvare ({answers.length})
                    </h3>
                    {answers.length === 0 ? (
                      <div className="max-w-2xl w-full flex items-center gap-3 py-4 px-5 bg-white/[0.02] border border-white/5 rounded-xl text-gray-400">
                        <Send size={18} className="text-gray-500 opacity-50 shrink-0" />
                        <span className="text-sm font-medium">Nessuna risposta in sospeso.</span>
                      </div>
                    ) : (
                      <div className="grid gap-4">
                        {answers.map(a => (
                          <div key={a.id} className="bg-[#0a0e1c]/60 border border-white/5 p-6 rounded-3xl space-y-4 hover:border-blue-500/30 transition-colors shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-blue-500/25 to-transparent"></div>
                            <div className="flex justify-between items-start gap-4">
                              <div className="flex-1">
                                <div className="bg-black/40 p-4 rounded-2xl border border-white/5 mb-4 shadow-inner">
                                  <span className="text-[9px] text-gray-500 uppercase font-black tracking-wider block mb-1">In risposta a:</span>
                                  <p className="text-xs text-gray-400 italic line-clamp-2">"{a.questions?.question_text}"</p>
                                </div>
                                <div className="flex items-center gap-2 mb-3 flex-wrap">
                                  <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 text-[9px] font-black rounded-lg border border-blue-500/20 uppercase tracking-wider">{a.questions?.civ_id}</span>
                                  <span className="text-xs font-black text-white">{a.user_nickname}</span>
                                  <span className="text-[9px] font-black text-gray-500">({a.user_rank})</span>
                                </div>
                                <p className="text-gray-200 text-xs font-medium leading-relaxed">{a.answer_text}</p>
                                
                                <div className="flex flex-wrap gap-3 mt-6 pt-5 border-t border-white/5">
                                  {canManageCivs && (
                                    <>
                                      <button 
                                        onClick={() => handleUpdateQAStatus(a, 'answer', 'approved')} 
                                        className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white rounded-xl shadow-lg hover:-translate-y-0.5 active:scale-95 transition-all text-[10px] font-black uppercase tracking-widest" 
                                      >
                                        <CheckCircle size={14} strokeWidth={3} />
                                        <span>Approva</span>
                                      </button>
                                      <button 
                                        onClick={() => handleUpdateQAStatus(a, 'answer', 'rejected')} 
                                        className="flex items-center gap-2 px-5 py-2.5 bg-[#111218] border-2 border-white/10 hover:border-white/20 text-gray-400 hover:text-white rounded-xl hover:-translate-y-0.5 active:scale-95 transition-all text-[10px] font-black uppercase tracking-widest" 
                                      >
                                        <XCircle size={14} strokeWidth={3} />
                                        <span>Rifiuta</span>
                                      </button>
                                      <button 
                                        onClick={() => setDeleteConfirm({ id: a.id, type: 'answer', item: a })} 
                                        className="flex items-center gap-2 px-3 py-2 bg-red-500/10 text-red-400 rounded-xl border border-red-500/20 hover:bg-red-500/25 transition-all text-[10px] font-bold uppercase ml-auto" 
                                      >
                                        <Trash2 size={14} />
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
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-5 duration-500">
              {/* Toolbar */}
              <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-[#0a0e1c]/60 p-6 rounded-3xl border border-cyan-500/15 shadow-2xl backdrop-blur-md relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-cyan-500/35 to-transparent"></div>
                <div className="relative w-full md:w-96">
                  <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Cerca per email o nickname..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="w-full bg-[#111218] border-2 border-white/10 hover:border-white/20 focus:border-blue-500/50 rounded-2xl py-3 pl-11 pr-4 text-xs text-white focus:shadow-[0_0_15px_rgba(59,130,246,0.15)] transition-all outline-none font-bold"
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
                        className="flex-1 bg-[#111218] border-2 border-blue-500/30 rounded-2xl px-4 py-2.5 text-xs text-white outline-none focus:border-blue-400 focus:shadow-[0_0_15px_rgba(59,130,246,0.15)] font-bold"
                      />
                      <button
                        onClick={handleAddUser}
                        disabled={!newUemail.trim() || addSuccess}
                        className={`px-5 py-2.5 ${addSuccess ? 'bg-green-600' : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500'} text-white rounded-2xl font-black text-xs uppercase disabled:opacity-50 transition-all flex items-center gap-2 active:scale-95 shadow-md`}
                      >
                        {addSuccess ? <Check size={14} strokeWidth={3} /> : null}
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
                      className="w-full md:w-auto flex items-center justify-center gap-2 px-5 py-3 bg-blue-600/10 hover:bg-blue-600/25 border-2 border-blue-500/20 text-blue-400 hover:text-white rounded-2xl transition-all font-black text-xs uppercase tracking-widest active:scale-95 shadow-lg"
                    >
                      <UserPlus size={16} /> Aggiungi Utente
                    </button>
                  )}
                </div>
              </div>

              {inlineToast && (
                <div className={`p-4 rounded-2xl border-2 flex items-center gap-2 animate-in fade-in duration-300 ${
                  inlineToast.type === 'success' 
                    ? 'bg-green-500/10 border-green-500/20 text-green-400' 
                    : 'bg-red-500/10 border-red-500/20 text-red-400'
                }`}>
                  {inlineToast.type === 'success' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
                  <span className="text-xs font-black uppercase tracking-wider">{inlineToast.message}</span>
                </div>
              )}

              {userLoading ? (
                <div className="flex flex-col items-center justify-center py-20 text-center bg-[#0a0e1c]/40 border border-white/5 rounded-3xl">
                  <Loader2 className="animate-spin text-blue-400 mb-2" size={32} />
                  <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Caricamento staff...</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
                    <div key={u.id} className={`bg-[#0a0e1c]/60 border rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group hover:bg-[#0a0e1c]/80 hover:border-cyan-500/40 shadow-xl transition-all duration-300 ${u.role === 'admin' ? 'border-cyan-500/20' : 'border-white/5'}`}>
                      {/* Left: Avatar & Info */}
                      <div className="flex items-center gap-4 min-w-0">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border text-base font-bold shrink-0 overflow-hidden shadow-md ${u.role === 'admin' ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400' : 'bg-blue-600/10 border-blue-500/20 text-blue-400'} ${getAvatarEffectClass(u.selected_avatar_effect)}`}>
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
                        
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            {editingNickname === u.email ? (
                              <div className="flex items-center gap-1">
                                <input
                                  autoFocus
                                  className="bg-black/60 border border-cyan-500/50 rounded-lg px-2 py-0.5 text-xs text-white focus:outline-none"
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
                                  {isSavingNickname === u.email ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />}
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 group/nick relative">
                                <span className={`text-base font-black text-white truncate transition-colors ${savedSuccess === u.email ? 'text-green-400' : ''}`}>
                                  {u.nickname || 'Senza Nickname'}
                                </span>
                                {savedSuccess === u.email && <CheckCircle size={10} className="text-green-400 animate-in" />}
                                <button
                                  onClick={() => { setEditingNickname(u.email); setTempNickname(u.nickname || ''); }}
                                  className="opacity-0 group-hover/nick:opacity-100 p-0.5 text-gray-500 hover:text-cyan-400 transition-all"
                                >
                                  <Edit2 size={10} />
                                </button>
                              </div>
                            )}
                            {u.role === 'admin' && <span className="text-[8px] px-2 py-0.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded font-black uppercase tracking-wider">Owner</span>}
                            {u.role === 'editor' && <span className="text-[8px] px-2 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded font-black uppercase tracking-wider">Editor</span>}
                            {u.selected_title && (
                              <TitleEmblemTooltip titleId={u.selected_title} label={SHOP_TITLES.find(t => t.id === u.selected_title)?.label || u.selected_title} placement="top" />
                            )}
                            <span className="text-[9px] font-black text-cyan-400/80 border border-cyan-500/20 px-2 py-0.5 rounded bg-cyan-500/5 uppercase tracking-wider">{u.rank || 'Unranked'}</span>
                          </div>
                          <span className="text-xs text-gray-400 truncate mt-0.5">{u.email}</span>
                        </div>
                      </div>

                      {/* Right: Controls */}
                      <div className="flex items-center justify-between sm:justify-end gap-3 pt-3 sm:pt-0 border-t sm:border-t-0 border-white/5 w-full sm:w-auto shrink-0">
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest sm:hidden">Permessi</span>
                        <div className="flex items-center gap-1 bg-black/40 p-1.5 rounded-2xl border border-white/5">
                          <button
                            onClick={() => handleToggleUserRole(u.email, 'can_manage_tournaments', !u.can_manage_tournaments)}
                            className={`w-8 h-8 flex items-center justify-center rounded-xl transition-all ${u.can_manage_tournaments ? 'bg-cyan-500 text-black font-black' : 'bg-gray-800/40 text-gray-500 hover:text-white'}`}
                            title="Gestione Tornei"
                          >
                            <Trophy size={14} />
                          </button>

                          <button
                            onClick={() => handleToggleUserRole(u.email, 'can_manage_civs', !u.can_manage_civs)}
                            className={`w-8 h-8 flex items-center justify-center rounded-xl transition-all ${u.can_manage_civs ? 'bg-blue-600 text-white font-black' : 'bg-gray-800/40 text-gray-500 hover:text-white'}`}
                            title="Gestione Civiltà"
                          >
                            <BookOpen size={14} />
                          </button>

                          <button
                            onClick={() => handleToggleUserRole(u.email, 'can_manage_buildorders', !u.can_manage_buildorders)}
                            className={`w-8 h-8 flex items-center justify-center rounded-xl transition-all ${u.can_manage_buildorders ? 'bg-orange-500 text-white font-black' : 'bg-gray-800/40 text-gray-500 hover:text-white'}`}
                            title="Gestione Build Orders"
                          >
                            <Zap size={14} />
                          </button>

                          <button
                            onClick={() => handleToggleUserRole(u.email, 'can_view_admin', !u.can_view_admin)}
                            className={`w-8 h-8 flex items-center justify-center rounded-xl transition-all ${u.can_view_admin ? 'bg-purple-600 text-white font-black' : 'bg-gray-800/40 text-gray-500 hover:text-white'}`}
                            title="Accesso Pannello Admin"
                          >
                            <LayoutDashboard size={14} />
                          </button>

                          <div className="w-px h-5 bg-white/10 mx-0.5" />

                          <button
                            onClick={() => handleToggleUserRole(u.email, 'is_streamer', !u.is_streamer)}
                            className={`w-8 h-8 flex items-center justify-center rounded-xl transition-all ${u.is_streamer ? 'bg-pink-600 text-white font-black' : 'bg-gray-800/40 text-gray-500 hover:text-white'}`}
                            title="Streamer"
                          >
                            <Radio size={14} />
                          </button>
                          
                          {isSuperAdmin && (
                            <>
                              <div className="w-px h-5 bg-white/10 mx-0.5" />
                              <button
                                onClick={() => handleDeleteUser(u.email)}
                                className="w-8 h-8 flex items-center justify-center rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500/25 border border-red-500/20 transition-all"
                                title="Elimina Utente"
                              >
                                <Trash2 size={14} />
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

          {activeTab === 'pecore' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-5 duration-500">
              <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-[#0a0e1c]/60 p-6 rounded-3xl border border-cyan-500/15 shadow-2xl backdrop-blur-md relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-cyan-500/35 to-transparent"></div>
                <div className="relative w-full md:w-80">
                  <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-cyan-400" />
                  <input
                    type="text"
                    placeholder="Cerca utente per email..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="w-full bg-[#111218] border-2 border-white/10 hover:border-white/20 focus:border-cyan-500/50 rounded-2xl py-3 pl-11 pr-4 text-xs text-white focus:shadow-[0_0_15px_rgba(6,182,212,0.15)] transition-all outline-none font-bold placeholder:text-gray-600"
                  />
                </div>
                <div className="flex items-center gap-4 shrink-0 flex-wrap justify-center md:justify-end">
                  <div className="flex items-center gap-3 bg-cyan-500/5 px-4 py-2.5 rounded-2xl border border-cyan-500/15 shrink-0">
                    <span className="text-[9px] font-black text-cyan-400 uppercase tracking-widest">Totale Pastori:</span>
                    <span className="text-xs font-black text-white">{allProfiles.length}</span>
                  </div>
                  <button
                    onClick={() => setIsBulkRefillConfirmOpen(true)}
                    className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-black rounded-2xl text-xs border-0 shadow-lg shadow-amber-500/15 transition-all uppercase tracking-widest active:scale-95 flex items-center gap-2 hover:-translate-y-0.5 cursor-pointer"
                  >
                    <Zap size={12} className="fill-black animate-pulse" />
                    <span>Ricarica Tutti (+100 🐑)</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {allProfiles
                  .filter(p => !userSearch || p.email?.toLowerCase().includes(userSearch.toLowerCase()) || p.nickname?.toLowerCase().includes(userSearch.toLowerCase()))
                  .map(p => (
                    <div key={p.email} className="bg-[#0a0e1c]/60 border border-white/5 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 hover:border-cyan-500/40 shadow-xl transition-all duration-300 group">
                      {/* Left: Avatar & Info & Mobile Balance */}
                      <div className="flex items-center justify-between sm:justify-start gap-4 min-w-0 w-full sm:w-auto">
                        <div className="flex items-center gap-4 min-w-0">
                          <div className={`w-12 h-12 rounded-2xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 font-bold border border-cyan-500/20 overflow-hidden shadow-md shrink-0 ${getAvatarEffectClass(p.selected_avatar_effect)}`}>
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
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="text-white font-black text-base truncate">{p.nickname || 'Anonimo'}</p>
                              {p.selected_title && (
                                <TitleEmblemTooltip titleId={p.selected_title} label={SHOP_TITLES.find(t => t.id === p.selected_title)?.label || p.selected_title} placement="top" />
                              )}
                            </div>
                            <p className="text-xs text-gray-400 truncate block mt-0.5">{p.email}</p>
                          </div>
                        </div>

                        {/* Mobile Balance Badge */}
                        <div className="flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-xl border border-white/10 shrink-0 sm:hidden">
                          <span className="text-sm">🐑</span>
                          <span className="text-xs font-black text-white tracking-tight">{p.sheep_balance || 0}</span>
                        </div>
                      </div>
                      
                      {/* Middle: Sheep Balance (Desktop) */}
                      <div className="hidden sm:flex items-center gap-2 shrink-0">
                        <div className="flex items-center gap-1.5 bg-white/5 px-4 py-2 rounded-xl border border-white/10">
                          <span className="text-lg">🐑</span>
                          <span className="text-base font-black text-white tracking-tight">{p.sheep_balance || 0}</span>
                        </div>
                      </div>

                      {/* Right: Controls & Actions */}
                      <div className="flex items-center justify-between sm:justify-end gap-3 pt-3 sm:pt-0 border-t sm:border-t-0 border-white/5 w-full sm:w-auto shrink-0">
                        <div className="flex items-center gap-1 bg-[#111218] p-1 rounded-2xl border border-white/10 shadow-md">
                          <button
                            onClick={() => {
                              const current = perUserRefillAmounts[p.email] ?? 100;
                              setPerUserRefillAmounts({ ...perUserRefillAmounts, [p.email]: Math.max(0, current - 10) });
                            }}
                            className="w-8 h-8 flex items-center justify-center hover:bg-white/5 rounded-xl text-cyan-400 transition-colors"
                          >
                            <Minus size={12} />
                          </button>
                          <input
                            type="number"
                            value={perUserRefillAmounts[p.email] ?? 100}
                            onChange={(e) => setPerUserRefillAmounts({ ...perUserRefillAmounts, [p.email]: Number(e.target.value) })}
                            className="w-12 bg-transparent text-xs text-white font-black text-center outline-none"
                          />
                          <button
                            onClick={() => {
                              const current = perUserRefillAmounts[p.email] ?? 100;
                              setPerUserRefillAmounts({ ...perUserRefillAmounts, [p.email]: current + 10 });
                            }}
                            className="w-8 h-8 flex items-center justify-center hover:bg-white/5 rounded-xl text-cyan-400 transition-colors"
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                        
                        <button
                          onClick={() => handleSheepRefill(p.email, perUserRefillAmounts[p.email] ?? 100)}
                          disabled={isRefilling === p.email}
                          className="px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white rounded-xl text-xs font-black border-0 shadow-md transition-all uppercase tracking-widest active:scale-95 disabled:opacity-40 flex items-center gap-1 group/btn min-w-[110px] sm:min-w-[125px] justify-center"
                        >
                          {isRefilling === p.email ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <>
                              <Zap size={12} className="group-hover/btn:fill-cyan-400 transition-all animate-pulse" />
                              <span>Ricarica</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
              </div>

              {/* Modale Ricarica Massiva Pecore */}
              {isBulkRefillConfirmOpen && (
                <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
                  <div className="bg-[#0a0e1c] border border-amber-500/30 p-8 rounded-3xl max-w-md w-full shadow-2xl text-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-amber-500/50 to-transparent"></div>
                    <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-amber-500/20">
                      <Zap className="text-amber-400 animate-bounce" size={32} />
                    </div>
                    <h3 className="text-xl font-black text-white uppercase mb-2">Ricarica Massiva Pastori</h3>
                    <p className="text-xs text-gray-400 mb-6 leading-relaxed">
                      Stai per accreditare <span className="text-amber-400 font-bold">100 pecore 🐑</span> a ciascuno dei{' '}
                      <span className="text-white font-bold">{allProfiles.length} pastori attivi</span> (totale:{' '}
                      <span className="text-cyan-400 font-bold">{allProfiles.length * 100} pecore</span>).
                      Questa operazione verrà registrata nel log delle attività ed è ideale prima dell'inizio di un nuovo torneo.
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setIsBulkRefillConfirmOpen(false)}
                        className="flex-1 py-3 border-2 border-white/10 text-gray-400 hover:text-white rounded-xl transition-all text-xs font-black uppercase tracking-wider active:scale-95 cursor-pointer"
                        disabled={isBulkRefilling}
                      >
                        Annulla
                      </button>
                      <button
                        onClick={handleBulkSheepRefill}
                        className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-black rounded-xl transition-all text-xs uppercase tracking-wider active:scale-95 shadow-lg shadow-amber-500/20 flex items-center justify-center gap-1.5 cursor-pointer"
                        disabled={isBulkRefilling}
                      >
                        {isBulkRefilling ? (
                          <>
                            <Loader2 size={14} className="animate-spin" />
                            <span>Elaborazione...</span>
                          </>
                        ) : (
                          <>
                            <Zap size={14} className="fill-black" />
                            <span>Conferma (+100 🐑)</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB TORNEI */}
          {activeTab === 'tornei' && (isAdmin || canManageTournaments) && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-500">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* Sidebar Tornei */}
                <div className="lg:col-span-4 bg-[#0a0e1c]/60 border border-cyan-500/15 rounded-3xl p-6 space-y-6 shadow-2xl backdrop-blur-md relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-cyan-500/35 to-transparent"></div>
                  
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
                          vods: [],
                          podium: []
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
                    <div className="bg-[#0a0e1c]/60 border border-cyan-500/15 rounded-3xl p-8 space-y-8 shadow-2xl backdrop-blur-md relative overflow-hidden">
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
                              <CustomSelect
                                value={tournamentForm.status}
                                onChange={(val) => setTournamentForm({ ...tournamentForm, status: val })}
                                options={[
                                  { value: 'Programmato', label: 'Programmato' },
                                  { value: 'In Corso', label: 'In Corso' },
                                  { value: 'Concluso', label: 'Concluso' }
                                ]}
                                buttonClassName="bg-[#111218] border-2 border-white/10 hover:border-cyan-500/40 rounded-2xl px-4 py-3 h-12 text-sm text-white transition-all outline-none font-bold"
                              />
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
                              <button
                                type="button"
                                id="has_regolamento"
                                onClick={() => setTournamentForm({ ...tournamentForm, has_regolamento: !tournamentForm.has_regolamento })}
                                className={`w-9 h-5 rounded-full relative transition-all flex-shrink-0 outline-none cursor-pointer ${tournamentForm.has_regolamento ? 'bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.4)]' : 'bg-white/10'}`}
                              >
                                <div className={`absolute top-[2px] w-4 h-4 bg-white rounded-full transition-all ${tournamentForm.has_regolamento ? 'left-[18px]' : 'left-[2px]'}`} />
                              </button>
                              <span 
                                onClick={() => setTournamentForm({ ...tournamentForm, has_regolamento: !tournamentForm.has_regolamento })} 
                                className="text-xs font-black uppercase tracking-wider text-white select-none cursor-pointer"
                              >
                                Abilita Regolamento Dedicato
                              </span>
                            </div>
                            {tournamentForm.has_regolamento && (
                              <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] block mb-2">Contenuto Regolamento</label>
                                <WYSIWYGEditor
                                  initialValue={tournamentForm.regolamento_content}
                                  onChange={(html) => setTournamentForm({ ...tournamentForm, regolamento_content: html })}
                                />
                              </div>
                            )}
                          </div>

                          {/* PODIO DEL TORNEO */}
                          <div className="border-2 border-white/5 bg-black/20 p-6 rounded-3xl space-y-4">
                            <div 
                              className="flex items-center justify-between cursor-pointer select-none"
                              onClick={() => setIsPodiumExpanded(!isPodiumExpanded)}
                            >
                              <div className="flex items-center gap-3">
                                <Trophy size={18} className="text-cyan-400 animate-pulse" />
                                <label className="text-xs font-black uppercase tracking-wider text-white select-none cursor-pointer">Podio del Torneo</label>
                              </div>
                              <ChevronDown size={20} className={`transition-transform duration-300 ${isPodiumExpanded ? 'rotate-180 text-cyan-400' : 'text-gray-400'}`} />
                            </div>

                            {isPodiumExpanded && (
                              <div className="space-y-4 pt-4 border-t border-white/5 animate-in fade-in slide-in-from-top-2 duration-300">
                                {(tournamentForm.podium || []).map((p: any, i: number) => (
                                  <div key={i} className="bg-black/40 p-5 rounded-2xl border border-white/5 space-y-4 relative group">
                                    <div className="flex flex-col sm:flex-row gap-4 items-start w-full">
                                      <div className="w-full sm:w-40 shrink-0 space-y-2">
                                        <label className="text-[9px] text-gray-500 font-black uppercase tracking-widest ml-1 opacity-60">Posizione</label>
                                        <div className="relative w-full">
                                          <CustomSelect 
                                            value={p.placement || (i + 1)} 
                                            onChange={val => {
                                              const np = [...tournamentForm.podium];
                                              np[i] = { ...p, placement: parseInt(val) };
                                              setTournamentForm({ ...tournamentForm, podium: np });
                                            }}
                                            options={[
                                              { value: 1, label: '🥇 1° Posto' },
                                              { value: 2, label: '🥈 2° Posto' },
                                              { value: 3, label: '🥉 3° Posto' }
                                            ]}
                                            buttonClassName="bg-[#111218] border border-white/10 h-10 px-4 rounded-xl text-white text-xs font-bold transition-all outline-none"
                                          />
                                        </div>
                                      </div>
                                      
                                      <div className="flex-grow w-full space-y-2 relative">
                                        <label className="text-[9px] text-gray-500 font-black uppercase tracking-widest ml-1 opacity-60">Giocatore / Team</label>
                                        <div className="relative flex gap-2">
                                          <input 
                                            type="text" 
                                            value={p.entrant?.name || ''} 
                                            onChange={e => {
                                              const np = [...tournamentForm.podium]; 
                                              np[i] = {...p, entrant: {name: e.target.value}}; 
                                              setTournamentForm({...tournamentForm, podium: np});
                                            }} 
                                            placeholder="Inserisci nome..." 
                                            className="w-full h-10 bg-white/5 border border-white/10 px-4 rounded-xl text-white text-xs font-bold outline-none focus:border-cyan-500 transition-colors" 
                                          />
                                          <button 
                                            onClick={() => setTournamentForm({...tournamentForm, podium: tournamentForm.podium.filter((_: any, idx: number) => idx !== i)})} 
                                            className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl transition-all h-10 w-10 flex items-center justify-center shrink-0 border border-red-500/20"
                                            title="Rimuovi riga"
                                          >
                                            <Trash2 size={16} />
                                          </button>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Sub-players for Team Games */}
                                    {['2v2', '3v3', '4v4', 'Mod', 'Team'].some(t => (tournamentForm.type || '').toLowerCase().includes(t.toLowerCase())) && (
                                      <div className="space-y-1.5 pt-3 border-t border-white/5">
                                        <label className="text-[9px] text-gray-500 font-bold uppercase ml-1 flex items-center gap-2">
                                          <Users size={10} /> Componenti Team (per {tournamentForm.type})
                                        </label>
                                        <input 
                                          type="text" 
                                          value={p.players?.join(', ') || ''} 
                                          onChange={e => {
                                            const playerList = e.target.value.split(',').map((s, idx, arr) => {
                                              if (idx === arr.length - 1) {
                                                return s.replace(/^\s+/, '');
                                              }
                                              return s.trim();
                                            });
                                            const np = [...tournamentForm.podium]; 
                                            np[i] = { ...p, players: playerList }; 
                                            setTournamentForm({ ...tournamentForm, podium: np });
                                          }} 
                                          placeholder="Esempio: Marco, Alessio, Luca (separati da virgola)" 
                                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white/60 text-[10px] outline-none focus:border-cyan-500/20 transition-all italic" 
                                        />
                                      </div>
                                    )}

                                    {/* Division/Fascia input */}
                                    <div className="space-y-1.5 pt-3 border-t border-white/5">
                                      <label className="text-[9px] text-gray-500 font-bold uppercase ml-1 flex items-center gap-2">
                                        🏆 Divisione / Fascia (Opzionale)
                                      </label>
                                      <input 
                                        type="text" 
                                        value={p.division || ''} 
                                        onChange={e => {
                                          const np = [...tournamentForm.podium]; 
                                          np[i] = { ...p, division: e.target.value }; 
                                          setTournamentForm({ ...tournamentForm, podium: np });
                                        }} 
                                        placeholder="Esempio: Fascia 1 (High Elo), Fascia 2 (Low Elo)" 
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white/60 text-[10px] outline-none focus:border-cyan-500/20 transition-all italic" 
                                      />
                                    </div>
                                  </div>
                                ))}

                                <button 
                                  type="button"
                                  onClick={() => {
                                    const podiumList = tournamentForm.podium || [];
                                    if (podiumList.length < 12) {
                                      const lastItem = podiumList[podiumList.length - 1];
                                      const lastDivision = lastItem ? (lastItem.division || '') : '';
                                      const divisionCount = podiumList.filter((p: any) => (p.division || '') === lastDivision).length;
                                      const nextPlacement = Math.min(3, divisionCount + 1);
                                      setTournamentForm({
                                        ...tournamentForm,
                                        podium: [...podiumList, { placement: nextPlacement, entrant: { name: '' }, division: lastDivision }]
                                      });
                                    }
                                  }} 
                                  className="w-full py-3 border border-dashed border-white/10 hover:border-cyan-500/50 rounded-2xl text-cyan-400 hover:text-cyan-300 text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 bg-white/[0.01] hover:bg-white/[0.03] active:scale-[0.98]"
                                >
                                  + AGGIUNGI RIGA AL PODIO
                                </button>
                              </div>
                            )}
                          </div>

                          {/* VIDEO DEI MATCH (VODs) */}
                          <div className="border-2 border-white/5 bg-black/20 p-6 rounded-3xl space-y-4">
                            <div 
                              className="flex items-center justify-between cursor-pointer select-none"
                              onClick={() => setIsVodsExpanded(!isVodsExpanded)}
                            >
                              <div className="flex items-center gap-3">
                                <Youtube size={18} className="text-red-500" />
                                <label className="text-xs font-black uppercase tracking-wider text-white select-none cursor-pointer">Video dei Match (VODs)</label>
                              </div>
                              <ChevronDown size={20} className={`transition-transform duration-300 ${isVodsExpanded ? 'rotate-180 text-red-500' : 'text-gray-400'}`} />
                            </div>

                            {isVodsExpanded && (
                              <div className="space-y-4 pt-4 border-t border-white/5 animate-in fade-in slide-in-from-top-2 duration-300">
                                {(tournamentForm.vods || []).map((v: any, i: number) => (
                                  <div key={v.id || i} className="bg-black/40 p-4 rounded-2xl border border-white/5 space-y-3 relative group">
                                    <div className="flex justify-between items-center border-b border-white/5 pb-2 mb-2">
                                      <span className="text-[9px] text-gray-500 font-bold uppercase">Video #{i + 1}</span>
                                      <button 
                                        type="button"
                                        onClick={() => {
                                          const nv = tournamentForm.vods.filter((_: any, idx: number) => idx !== i);
                                          setTournamentForm({ ...tournamentForm, vods: nv });
                                        }} 
                                        className="p-1 text-red-500/50 hover:text-red-500 hover:bg-red-500/10 rounded transition-all"
                                        title="Rimuovi Video"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                      <div className="space-y-1">
                                        <label className="text-[9px] text-gray-500 font-bold uppercase ml-1">Titolo Match / Giocatori</label>
                                        <input 
                                          type="text" 
                                          value={v.title || ''} 
                                          onChange={e => {
                                            const nv = [...tournamentForm.vods];
                                            nv[i] = { ...v, title: e.target.value };
                                            setTournamentForm({ ...tournamentForm, vods: nv });
                                          }} 
                                          placeholder="Es: Semifinale: Player A vs Player B" 
                                          className="w-full bg-white/5 border border-white/10 px-3 py-2 rounded-xl text-white text-xs outline-none focus:border-red-500 transition-colors" 
                                        />
                                      </div>
                                      
                                      <div className="space-y-1">
                                        <label className="text-[9px] text-gray-500 font-bold uppercase ml-1 flex items-center gap-1.5"><Youtube size={12}/> Link YouTube</label>
                                        <input 
                                          type="text" 
                                          value={v.url || ''} 
                                          onChange={e => {
                                            const nv = [...tournamentForm.vods];
                                            nv[i] = { ...v, url: e.target.value };
                                            setTournamentForm({ ...tournamentForm, vods: nv });
                                          }} 
                                          placeholder="https://www.youtube.com/watch?v=..." 
                                          className="w-full bg-white/5 border border-white/10 px-3 py-2 rounded-xl text-white text-xs outline-none focus:border-red-500 transition-colors" 
                                        />
                                      </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                                      <div className="space-y-1">
                                        <label className="text-[9px] text-gray-500 font-bold uppercase ml-1">Fase / Round (Opzionale)</label>
                                        <input 
                                          type="text" 
                                          value={v.round || ''} 
                                          onChange={e => {
                                            const nv = [...tournamentForm.vods];
                                            nv[i] = { ...v, round: e.target.value };
                                            setTournamentForm({ ...tournamentForm, vods: nv });
                                          }} 
                                          placeholder="Es: Winners Round 1, Finale" 
                                          className="w-full bg-white/5 border border-white/10 px-3 py-2 rounded-xl text-white text-xs outline-none focus:border-red-500 transition-colors" 
                                        />
                                      </div>
                                      <div className="space-y-1">
                                        <label className="text-[9px] text-gray-500 font-bold uppercase ml-1">Risultato (Opzionale)</label>
                                        <input 
                                          type="text" 
                                          value={v.score || ''} 
                                          onChange={e => {
                                            const nv = [...tournamentForm.vods];
                                            nv[i] = { ...v, score: e.target.value };
                                            setTournamentForm({ ...tournamentForm, vods: nv });
                                          }} 
                                          placeholder="Es: 3-1" 
                                          className="w-full bg-white/5 border border-white/10 px-3 py-2 rounded-xl text-white text-xs outline-none focus:border-red-500 transition-colors" 
                                        />
                                      </div>
                                    </div>
                                  </div>
                                ))}
                                
                                <button 
                                  type="button"
                                  onClick={() => {
                                    const nv = tournamentForm.vods || [];
                                    setTournamentForm({
                                      ...tournamentForm,
                                      vods: [...nv, { id: `vod-${Date.now()}`, title: '', url: '', round: '', score: '' }]
                                    });
                                  }} 
                                  className="w-full py-3 border border-dashed border-white/10 hover:border-red-500/50 rounded-2xl text-red-400 hover:text-red-300 text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 bg-white/[0.01] hover:bg-white/[0.03] active:scale-[0.98]"
                                >
                                  + AGGIUNGI MATCH VIDEO (VOD)
                                </button>
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
                              className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-black rounded-xl text-xs font-black transition-all hover:-translate-y-0.5 shadow-lg active:scale-95 uppercase tracking-widest flex items-center gap-1.5 shadow-cyan-500/10"
                            >
                              <Plus size={14} strokeWidth={3} /> Nuova Scommessa
                            </button>
                          </div>

                          {isCreatingMarket && (
                            <div className="bg-black/30 border-2 border-cyan-500/20 p-6 rounded-3xl space-y-6 animate-in zoom-in-95 duration-300">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] block mb-2">Titolo Scommessa</label>
                                  <input
                                    type="text"
                                    value={marketForm.title}
                                    onChange={(e) => setMarketForm({ ...marketForm, title: e.target.value })}
                                    className="w-full bg-[#111218] border-2 border-white/10 hover:border-white/20 focus:border-cyan-500/50 rounded-2xl px-4 py-3 text-xs text-white focus:shadow-[0_0_15px_rgba(6,182,212,0.1)] transition-all outline-none font-bold"
                                    placeholder="es: VortiX vs LucifroN"
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] block mb-2">Descrizione</label>
                                  <input
                                    type="text"
                                    value={marketForm.description}
                                    onChange={(e) => setMarketForm({ ...marketForm, description: e.target.value })}
                                    className="w-full bg-[#111218] border-2 border-white/10 hover:border-cyan-500/30 focus:border-cyan-500/50 rounded-2xl px-4 py-3 text-xs text-white focus:shadow-[0_0_15px_rgba(6,182,212,0.1)] transition-all outline-none"
                                    placeholder="es: Match Winner semifinale"
                                  />
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] block mb-2">Tipo Mercato</label>
                                  <CustomSelect
                                    value={marketForm.type}
                                    onChange={(val) => setMarketForm({ ...marketForm, type: val })}
                                    options={[
                                      { value: 'Match Winner', label: 'Match Winner' },
                                      { value: 'Tournament Winner', label: 'Tournament Winner' },
                                      { value: 'Final Score', label: 'Final Score' }
                                    ]}
                                    buttonClassName="bg-[#111218] border-2 border-white/10 hover:border-cyan-500/40 rounded-2xl px-4 py-3 h-12 text-xs text-white transition-all outline-none font-bold"
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] block mb-2">Fascia Elo</label>
                                  <CustomSelect
                                    value={marketForm.event_level}
                                    onChange={(val) => setMarketForm({ ...marketForm, event_level: val })}
                                    options={[
                                      { value: 'High Elo', label: 'High Elo' },
                                      { value: 'Low Elo', label: 'Low Elo' }
                                    ]}
                                    buttonClassName="bg-[#111218] border-2 border-white/10 hover:border-cyan-500/40 rounded-2xl px-4 py-3 h-12 text-xs text-white transition-all outline-none font-bold"
                                  />
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
                                        className="flex-1 bg-[#111218] border-2 border-white/10 hover:border-white/20 focus:border-cyan-500/50 rounded-xl px-4 py-2 text-xs text-white focus:shadow-[0_0_15px_rgba(6,182,212,0.1)] transition-all outline-none font-bold"
                                        placeholder={`Opzione ${idx + 1}`}
                                      />
                                      <div className="flex gap-1 ml-2">
                                        {[
                                          { l: 'U', v: 500, t: 'Under' },
                                          { l: 'S', v: 1000, t: 'Sfav.' },
                                          { l: 'E', v: 2000, t: 'Eq.' },
                                          { l: 'F', v: 5000, t: 'Fav.' },
                                          { l: 'T', v: 15000, t: 'Top' }
                                        ].map(w => (
                                          <button
                                            key={w.v}
                                            type="button"
                                            title={w.t}
                                            onClick={() => {
                                              const newOpts = [...marketForm.options];
                                              newOpts[idx].weight = w.v;
                                              setMarketForm({ ...marketForm, options: newOpts });
                                            }}
                                            className={`w-8 h-8 rounded-lg text-[10px] font-black uppercase transition-all flex items-center justify-center ${
                                              Number(opt.weight) === w.v
                                                ? "bg-cyan-500 text-black shadow-lg shadow-cyan-500/20"
                                                : "bg-[#111218] border-2 border-white/10 text-gray-400 hover:border-white/30 hover:text-white"
                                            }`}
                                          >
                                            {w.l}
                                          </button>
                                        ))}
                                      </div>
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
                                  className="text-xs text-cyan-400 font-bold hover:underline"
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
                                  className="px-6 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-black font-bold rounded-xl hover:-translate-y-0.5 active:scale-95 shadow-lg shadow-cyan-500/10 transition-all text-xs uppercase tracking-widest"
                                >
                                  Crea Scommessa
                                </button>
                              </div>
                            </div>
                          )}

                          {marketsLoading ? (
                            <div className="flex flex-col items-center justify-center py-20">
                              <Loader2 className="animate-spin text-cyan-400 mb-2" size={32} />
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
                                              className="w-full mt-3 py-1.5 bg-cyan-500 text-black hover:bg-cyan-400 text-[9px] font-bold rounded-lg transition-all uppercase tracking-wider shadow-md shadow-cyan-500/15"
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
                  <div className="bg-[#0a0e1c] border border-cyan-500/30 p-8 rounded-3xl max-w-sm w-full shadow-2xl text-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent"></div>
                    <div className="w-16 h-16 bg-cyan-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-cyan-500/20">
                      <AlertTriangle className="text-cyan-400" size={32} />
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
                        className="flex-1 py-3 bg-cyan-500 hover:bg-cyan-400 text-black font-bold rounded-xl transition-all text-xs font-black uppercase tracking-wider active:scale-95 shadow-lg shadow-cyan-500/20"
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
          {activeTab === 'civilta' && (isAdmin || canManageCivs || canManageBuildorders) && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-500">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* Sidebar Civiltà */}
                <div className="lg:col-span-3 bg-[#0a0e1c]/60 border border-cyan-500/15 rounded-3xl p-6 space-y-6 shadow-2xl backdrop-blur-md relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-cyan-500/35 to-transparent"></div>
                  <div className="flex justify-between items-center border-b border-white/5 pb-3">
                    <h3 className="text-xs font-black text-cyan-400 uppercase tracking-wider">Lista Civiltà</h3>
                    <button
                      onClick={() => {
                        setIsAddingCiv(true);
                        setSelectedCiv(null);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1 active:scale-95 border ${
                        isAddingCiv
                          ? 'bg-cyan-600 text-white border-cyan-500/50 shadow-lg shadow-cyan-600/15'
                          : 'bg-[#111218] hover:bg-white/5 text-cyan-400 hover:text-cyan-300 border-cyan-500/20'
                      }`}
                    >
                      <Plus size={12} strokeWidth={3} /> Nuova Civiltà
                    </button>
                  </div>
                  {civsLoading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                      <Loader2 className="animate-spin text-cyan-400 mb-2" size={32} />
                      <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Caricamento...</span>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[550px] overflow-y-auto pr-2 custom-scrollbar">
                      {civList.map((c) => {
                        const isSelected = selectedCiv?.id === c.id && !isAddingCiv;
                        return (
                          <button
                            key={c.id}
                            onClick={() => {
                              setSelectedCiv(c);
                              setSelectedBOIndex(null);
                              setIsAddingCiv(false);
                            }}
                            className={`w-full text-left h-16 rounded-xl border transition-all hover:scale-[1.02] relative overflow-hidden flex items-center px-4 group ${
                              isSelected 
                                ? 'border-cyan-500/80 shadow-[0_0_20px_rgba(6,182,212,0.2)]' 
                                : 'border-white/5 hover:border-white/20'
                            }`}
                          >
                            {/* Flag background */}
                            {c.flag ? (
                              <img 
                                src={c.flag} 
                                alt={c.name} 
                                className={`absolute inset-0 w-full h-full object-cover transition-all duration-500 ${
                                  isSelected ? 'opacity-100 scale-105' : 'opacity-90 group-hover:opacity-100'
                                }`} 
                              />
                            ) : (
                              <div className="absolute inset-0 bg-slate-900 opacity-20"></div>
                            )}
                            
                            {/* Vignette Overlay (dark left, clear right) */}
                            <div className="absolute inset-0 bg-gradient-to-r from-[#0a0e1c] via-[#0a0e1c]/35 to-transparent pointer-events-none"></div>
                            
                            {/* Active glow indicator on the left */}
                            {isSelected && (
                              <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)] z-10" />
                            )}
                            
                            {/* Content */}
                            <div className="relative z-10 flex flex-col justify-center">
                              <span className="font-extrabold uppercase tracking-widest text-xs text-white/95 group-hover:text-cyan-300 transition-colors drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                                {c.name}
                              </span>
                              <span className="text-[8px] text-gray-400 font-bold uppercase tracking-wider mt-0.5 opacity-60">
                                {c.build_orders?.length || 0} Build Orders
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
 
                {/* Corpo Editor Civiltà & BO */}
                <div className="lg:col-span-9 space-y-6">
                  {isAddingCiv ? (
                    <div className="bg-[#0a0e1c]/60 border border-cyan-500/15 rounded-3xl p-8 space-y-8 shadow-2xl backdrop-blur-md relative overflow-hidden animate-in fade-in duration-300">
                      <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-cyan-500/35 to-transparent"></div>
                      
                      <div className="flex justify-between items-center border-b border-white/5 pb-4">
                        <div>
                          <h3 className="text-lg font-black text-white uppercase tracking-tight">Crea Nuova Civiltà</h3>
                          <p className="text-xs text-gray-400 mt-1">Inserisci un link di AoE4World per compilare automaticamente i campi principali.</p>
                        </div>
                        <button
                          onClick={() => {
                            setIsAddingCiv(false);
                            if (civList.length > 0) setSelectedCiv(civList[0]);
                          }}
                          className="px-4 py-2 border-2 border-white/10 hover:border-white/20 text-gray-400 hover:text-white rounded-xl transition-all text-xs font-black uppercase tracking-wider"
                        >
                          Annulla
                        </button>
                      </div>

                      <div className="space-y-6">
                        {/* Link AoE4World */}
                        <div>
                          <label className="text-[10px] font-black text-cyan-400 uppercase tracking-[0.2em] block mb-2">Link AoE4World Explorer (Opzionale)</label>
                          <input
                            type="text"
                            value={newCivForm.aoe4worldUrl}
                            onChange={(e) => handleAoe4WorldUrlChange(e.target.value)}
                            className="w-full bg-[#111218] border-2 border-white/10 hover:border-cyan-500/30 focus:border-cyan-500/50 rounded-2xl px-4 py-3 text-xs text-white focus:shadow-[0_0_15px_rgba(6,182,212,0.1)] transition-all outline-none"
                            placeholder="es: https://aoe4world.com/explorer/civilizations/byzantines"
                          />
                        </div>

                        {/* ID & Nome */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] block mb-2">ID / Slug Civiltà (Minuscolo, senza spazi)</label>
                            <input
                              type="text"
                              value={newCivForm.id}
                              onChange={(e) => setNewCivForm({ ...newCivForm, id: e.target.value.toLowerCase().replace(/[^a-z0-9-_]+/g, '') })}
                              className="w-full bg-[#111218] border-2 border-white/10 hover:border-white/20 focus:border-cyan-500/50 rounded-2xl px-4 py-3 text-xs text-white focus:shadow-[0_0_15px_rgba(6,182,212,0.1)] transition-all outline-none font-mono"
                              placeholder="es: byzantines"
                              required
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] block mb-2">Nome Civiltà</label>
                            <input
                              type="text"
                              value={newCivForm.name}
                              onChange={(e) => setNewCivForm({ ...newCivForm, name: e.target.value })}
                              className="w-full bg-[#111218] border-2 border-white/10 hover:border-white/20 focus:border-cyan-500/50 rounded-2xl px-4 py-3 text-xs text-white focus:shadow-[0_0_15px_rgba(6,182,212,0.1)] transition-all outline-none font-bold"
                              placeholder="es: Bizantini"
                              required
                            />
                          </div>
                        </div>

                        {/* Flag & Difficoltà */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] block mb-2">Flag URL / Percorso Bandiera</label>
                            <input
                              type="text"
                              value={newCivForm.flag}
                              onChange={(e) => setNewCivForm({ ...newCivForm, flag: e.target.value })}
                              className="w-full bg-[#111218] border-2 border-white/10 hover:border-white/20 focus:border-cyan-500/50 rounded-2xl px-4 py-3 text-xs text-white focus:shadow-[0_0_15px_rgba(6,182,212,0.1)] transition-all outline-none font-mono"
                              placeholder="es: /flags/byzantines.png"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] block mb-2">Difficoltà</label>
                            <CustomSelect
                              value={newCivForm.difficulty}
                              onChange={(val) => setNewCivForm({ ...newCivForm, difficulty: val })}
                              options={[
                                { value: 'Facile', label: 'Facile' },
                                { value: 'Medio', label: 'Medio' },
                                { value: 'Difficile', label: 'Difficile' }
                              ]}
                              buttonClassName="bg-[#111218] border-2 border-white/10 hover:border-cyan-500/40 rounded-2xl px-4 py-3 h-12 text-xs text-white transition-all outline-none font-bold"
                            />
                          </div>
                        </div>

                        {/* Descrizione Breve */}
                        <div>
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] block mb-2">Descrizione Breve</label>
                          <textarea
                            value={newCivForm.short_description}
                            onChange={(e) => setNewCivForm({ ...newCivForm, short_description: e.target.value })}
                            rows={4}
                            className="w-full bg-[#111218] border-2 border-white/10 hover:border-white/20 focus:border-cyan-500/50 rounded-2xl p-4 text-xs text-white focus:shadow-[0_0_15px_rgba(6,182,212,0.1)] transition-all outline-none"
                            placeholder="Scrivi una breve descrizione..."
                          />
                        </div>

                        {/* Bottoni Salva / Cancella */}
                        <div className="flex justify-end gap-3 pt-6 border-t border-white/5">
                          <button
                            onClick={() => {
                              setIsAddingCiv(false);
                              if (civList.length > 0) setSelectedCiv(civList[0]);
                            }}
                            className="px-5 py-3 border-2 border-white/10 text-gray-400 hover:text-white hover:border-white/20 rounded-xl transition-all font-black text-xs uppercase tracking-widest active:scale-95"
                          >
                            Annulla
                          </button>
                          <button
                            onClick={handleCreateCiv}
                            disabled={civsLoading}
                            className="px-8 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-black rounded-xl text-xs font-black uppercase tracking-widest shadow-lg hover:-translate-y-0.5 active:scale-95 transition-all flex items-center gap-2"
                          >
                            {civsLoading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} strokeWidth={3} />} Crea Civiltà
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : selectedCiv ? (
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
                          onClick={() => setSelectedBOIndex(-2)}
                          className={`pb-3 text-sm font-black uppercase tracking-wider relative transition-colors ${selectedBOIndex !== null ? 'text-blue-400 font-black' : 'text-gray-400 hover:text-white'}`}
                        >
                          Build Orders ({selectedCiv.build_orders?.length || 0})
                          {selectedBOIndex !== null && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]"></span>}
                        </button>
                      </div>
 
                      {/* PANEL 1: Dettagli Civiltà */}
                      {selectedBOIndex === null ? (
                        <div className="bg-[#0a0e1c]/60 border border-cyan-500/15 rounded-3xl p-8 space-y-8 shadow-2xl backdrop-blur-md relative overflow-hidden">
                          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-blue-500/35 to-transparent"></div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                            <div className="md:col-span-10">
                              <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] block mb-2">Flag Image URL / Percorso Bandiera</label>
                              <input
                                type="text"
                                value={civForm.flag}
                                onChange={(e) => setCivForm({ ...civForm, flag: e.target.value })}
                                className="w-full bg-white/[0.02] border-2 border-white/10 hover:border-white/20 focus:border-blue-500/50 rounded-2xl px-4 py-3 text-xs text-white focus:bg-white/[0.04] focus:shadow-[0_0_15px_rgba(59,130,246,0.1)] transition-all outline-none font-mono"
                                placeholder="es: /civs/English.webp"
                              />
                            </div>
                            <div className="md:col-span-2 flex flex-col items-center justify-center pt-5">
                              {civForm.flag ? (
                                <img src={civForm.flag} alt="Preview Bandiera" className="w-16 h-16 object-contain rounded-xl border border-white/10 bg-black/40 p-2 shadow-inner" />
                              ) : (
                                <div className="w-16 h-16 rounded-xl border-2 border-dashed border-white/10 flex items-center justify-center text-[10px] text-gray-500 font-bold uppercase tracking-tighter">No Flag</div>
                              )}
                            </div>
                          </div>
 
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
                              <CustomSelect
                                value={civForm.difficulty}
                                onChange={(val) => setCivForm({ ...civForm, difficulty: val })}
                                options={[
                                  { value: 'Facile', label: 'Facile' },
                                  { value: 'Medio', label: 'Medio' },
                                  { value: 'Difficile', label: 'Difficile' }
                                ]}
                                buttonClassName="bg-[#111218] border-2 border-white/10 hover:border-cyan-500/40 rounded-2xl px-4 py-3 h-12 text-sm text-white transition-all outline-none font-bold"
                              />
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

                          {/* Video Guide Section */}
                          <div className="bg-black/20 border-2 border-white/5 p-6 rounded-3xl space-y-4">
                            <div className="flex items-center gap-3">
                              <Youtube size={18} className="text-red-500" />
                              <label className="text-[10px] font-black text-red-500 uppercase tracking-[0.2em]">Video Guide (YouTube)</label>
                            </div>
                            
                            {(civForm.videos || []).map((video: any, idx: number) => {
                              const videoId = typeof video === 'string' 
                                ? (video.match(/(?:youtu\.be\/|v=)([^&\s]+)/)?.[1] || '')
                                : (video.url?.match(/(?:youtu\.be\/|v=)([^&\s]+)/)?.[1] || '');
                              const videoUrl = typeof video === 'string' ? video : video.url;
                              const videoTitle = typeof video === 'string' ? '' : (video.title || '');
                              
                              return (
                                <div key={idx} className="flex items-start gap-3 bg-black/30 rounded-2xl p-3 border border-white/5">
                                  {videoId && (
                                    <img 
                                      src={`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`} 
                                      alt="Thumbnail" 
                                      className="w-28 h-16 rounded-lg object-cover border border-white/10 shrink-0"
                                    />
                                  )}
                                  <div className="flex-1 space-y-2 min-w-0">
                                    <input
                                      type="text"
                                      placeholder="Titolo video (opzionale)"
                                      value={videoTitle}
                                      onChange={(e) => {
                                        const newVideos = [...(civForm.videos || [])];
                                        const v = typeof newVideos[idx] === 'string' ? { url: newVideos[idx], title: '' } : { ...newVideos[idx] };
                                        v.title = e.target.value;
                                        newVideos[idx] = v;
                                        setCivForm({ ...civForm, videos: newVideos });
                                      }}
                                      className="w-full bg-white/[0.01] border border-white/10 rounded-xl px-3 py-1.5 text-[11px] text-white outline-none focus:border-red-500/50 transition-all"
                                    />
                                    <input
                                      type="text"
                                      placeholder="https://www.youtube.com/watch?v=..."
                                      value={videoUrl}
                                      onChange={(e) => {
                                        const newVideos = [...(civForm.videos || [])];
                                        const v = typeof newVideos[idx] === 'string' ? { url: '', title: '' } : { ...newVideos[idx] };
                                        v.url = e.target.value;
                                        newVideos[idx] = v;
                                        setCivForm({ ...civForm, videos: newVideos });
                                      }}
                                      className="w-full bg-white/[0.01] border border-white/10 rounded-xl px-3 py-1.5 text-[11px] text-gray-400 outline-none focus:border-red-500/50 transition-all"
                                    />
                                  </div>
                                  <div className="flex flex-col gap-1 shrink-0">
                                    <button
                                      onClick={() => {
                                        if (idx > 0) {
                                          const newVideos = [...(civForm.videos || [])];
                                          [newVideos[idx - 1], newVideos[idx]] = [newVideos[idx], newVideos[idx - 1]];
                                          setCivForm({ ...civForm, videos: newVideos });
                                        }
                                      }}
                                      disabled={idx === 0}
                                      className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                                    >
                                      <ChevronUp size={14} />
                                    </button>
                                    <button
                                      onClick={() => {
                                        if (idx < (civForm.videos || []).length - 1) {
                                          const newVideos = [...(civForm.videos || [])];
                                          [newVideos[idx], newVideos[idx + 1]] = [newVideos[idx + 1], newVideos[idx]];
                                          setCivForm({ ...civForm, videos: newVideos });
                                        }
                                      }}
                                      disabled={idx === (civForm.videos || []).length - 1}
                                      className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                                    >
                                      <ChevronDown size={14} />
                                    </button>
                                    <button
                                      onClick={() => {
                                        const newVideos = (civForm.videos || []).filter((_: any, i: number) => i !== idx);
                                        setCivForm({ ...civForm, videos: newVideos });
                                      }}
                                      className="p-1.5 bg-red-500/10 hover:bg-red-500/25 rounded-lg text-red-400 transition-all"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                            
                            <button
                              onClick={() => setCivForm({ ...civForm, videos: [...(civForm.videos || []), { url: '', title: '' }] })}
                              className="text-xs text-red-500 font-black uppercase tracking-wider hover:underline flex items-center gap-1.5 pt-2"
                            >
                              <Plus size={14} strokeWidth={3} /> Aggiungi Video Guida
                            </button>
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
                            <div className="bg-[#0a0e1c]/60 border border-cyan-500/15 rounded-3xl p-8 space-y-8 shadow-2xl backdrop-blur-md relative overflow-hidden">
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
                                  onClick={() => setSelectedBOIndex(-2)}
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
                                  <CustomSelect
                                    value={boForm.difficulty}
                                    onChange={(val) => setBoForm({ ...boForm, difficulty: Number(val) })}
                                    options={[
                                      { value: 1, label: 'Facile' },
                                      { value: 2, label: 'Medio' },
                                      { value: 3, label: 'Difficile' }
                                    ]}
                                    buttonClassName="bg-[#111218] border-2 border-white/10 hover:border-cyan-500/40 rounded-2xl px-4 py-3 h-12 text-xs text-white transition-all outline-none font-bold"
                                  />
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
                                      <input
                                        type="text"
                                        value={step.time}
                                        onChange={(e) => {
                                          const newSteps = [...boForm.steps];
                                          newSteps[idx].time = e.target.value;
                                          setBoForm({ ...boForm, steps: newSteps });
                                        }}
                                        className="w-full md:w-24 bg-[#111218] border-2 border-white/10 hover:border-white/20 focus:border-cyan-500/50 rounded-xl px-3 py-2 text-xs text-cyan-400 font-black text-center outline-none"
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
                                      <button
                                        onClick={() => {
                                          const newSteps = boForm.steps.filter((_: any, i: number) => i !== idx);
                                          setBoForm({ ...boForm, steps: newSteps });
                                        }}
                                        className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-full transition-all shrink-0 md:self-center self-end"
                                        title="Elimina passo"
                                      >
                                        <X size={14} />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              <div className="flex justify-end gap-3 pt-6 border-t border-white/5">
                                <button
                                  onClick={() => setSelectedBOIndex(-2)}
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
                                <h4 className="text-xs font-black text-white uppercase tracking-[0.25em] flex items-center gap-2">
                                  {selectedCiv.flag && <img src={selectedCiv.flag} alt="" className="w-5 h-5 object-contain" />}
                                  Build Orders di {selectedCiv.name}
                                </h4>
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

          {/* TAB AUDIT LOG */}
          {activeTab === 'audit' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-500">
              <div className="bg-[#0a0e1c]/60 border border-cyan-500/15 rounded-3xl p-8 shadow-2xl backdrop-blur-md relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-cyan-500/35 to-transparent"></div>
                
                {/* Search & Filters */}
                <div className="flex flex-col sm:flex-row gap-4 items-center justify-between border-b border-white/5 pb-6 mb-6">
                  <div className="relative w-full sm:max-w-md">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                    <input
                      type="text"
                      placeholder="Cerca per moderatore, azione o descrizione..."
                      value={auditSearch}
                      onChange={(e) => setAuditSearch(e.target.value)}
                      className="w-full bg-white/[0.02] border-2 border-white/10 hover:border-white/20 focus:border-cyan-500/50 rounded-2xl pl-12 pr-4 py-3 text-sm text-white transition-all outline-none font-bold"
                    />
                  </div>
                  
                  <div className="flex items-center gap-3 w-full sm:w-auto shrink-0">
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider">Azione:</span>
                    <CustomSelect
                      value={auditActionFilter}
                      onChange={(val) => setAuditActionFilter(val)}
                      options={[
                        { value: 'all', label: 'Tutte le azioni' },
                        { value: 'SHEEP_REFILL', label: 'Ricarica Pecore 🐑' },
                        { value: 'CREATE_TOURNAMENT', label: 'Creazione Tornei 🏆' },
                        { value: 'UPDATE_TOURNAMENT', label: 'Aggiornamento Tornei 🏆' },
                        { value: 'DELETE_TOURNAMENT', label: 'Cancellazione Tornei 🏆' },
                        { value: 'CREATE_MARKET', label: 'Creazione Scommesse 🎲' },
                        { value: 'TOGGLE_MARKET_STATUS', label: 'Apertura/Chiusura Scommesse 🎲' },
                        { value: 'SETTLE_MARKET', label: 'Liquidazione Scommesse 💸' },
                        { value: 'SAVE_CIV_DETAILS', label: 'Modifica Civiltà 🏛️' },
                        { value: 'CREATE_BUILD_ORDER', label: 'Nuovo Build Order 📖' },
                        { value: 'UPDATE_BUILD_ORDER', label: 'Aggiorna Build Order 📖' },
                        { value: 'DELETE_BUILD_ORDER', label: 'Elimina Build Order 📖' },
                        { value: 'RESOLVE_SUGGESTION', label: 'Approvazione Suggerimento 💡' },
                        { value: 'REJECT_SUGGESTION', label: 'Rifiuto Suggerimento 💡' },
                        { value: 'QA_ACTION', label: 'Moderazione Q&A 💬' },
                        { value: 'ADD_STAFF_USER', label: 'Aggiunta Staff 👑' },
                        { value: 'REMOVE_STAFF_USER', label: 'Rimozione Staff 👑' },
                        { value: 'UPDATE_NICKNAME', label: 'Cambio Nickname ✏️' },
                        { value: 'BACKUP_DATABASE', label: 'Backup Generato 💾' }
                      ]}
                      buttonClassName="bg-[#111218] border-2 border-white/10 hover:border-cyan-500/40 rounded-2xl px-4 py-3 h-12 text-sm text-white transition-all outline-none font-bold"
                    />
                  </div>
                </div>

                {/* Audit Logs Content */}
                {auditLoading ? (
                  <div className="flex flex-col items-center justify-center py-32">
                    <Loader2 className="animate-spin text-cyan-400 mb-4" size={48} />
                    <span className="text-xs text-gray-500 uppercase tracking-widest font-black">Caricamento registro...</span>
                  </div>
                ) : auditLogs.length === 0 ? (
                  <div className="text-center py-20 bg-black/20 rounded-2xl border border-white/5">
                    <History size={48} className="text-gray-600 mx-auto mb-4 opacity-30" />
                    <h4 className="text-sm font-bold uppercase tracking-wider text-gray-400">Nessun log trovato</h4>
                    <p className="text-xs text-gray-600 mt-2">Le azioni degli amministratori appariranno in questo registro una volta registrate.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="overflow-x-auto rounded-2xl border border-white/5 bg-black/20">
                      <table className="w-full text-left border-collapse text-xs md:text-sm">
                        <thead>
                          <tr className="border-b border-white/5 bg-white/[0.02] text-gray-400 uppercase tracking-wider text-[10px] font-black">
                            <th className="p-4 w-[160px]">Data & Ora</th>
                            <th className="p-4 w-[180px]">Moderatore</th>
                            <th className="p-4 w-[200px]">Azione</th>
                            <th className="p-4">Descrizione</th>
                            <th className="p-4 w-[80px] text-center">Dettagli</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 font-medium">
                          {auditLogs
                            .filter(log => {
                              const matchesSearch = 
                                (log.user_email || '').toLowerCase().includes(auditSearch.toLowerCase()) ||
                                (log.user_nickname || '').toLowerCase().includes(auditSearch.toLowerCase()) ||
                                (log.action || '').toLowerCase().includes(auditSearch.toLowerCase()) ||
                                (log.description || '').toLowerCase().includes(auditSearch.toLowerCase());
                              
                              if (auditActionFilter === 'all') return matchesSearch;
                              if (auditActionFilter === 'QA_ACTION') return matchesSearch && log.action.startsWith('QA_');
                              return matchesSearch && log.action === auditActionFilter;
                            })
                            .map((log) => {
                              const isExpanded = expandedAuditLog === log.id;
                              
                              // Pill colors mapping
                              let badgeColor = 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
                              if (log.action.includes('REFILL')) badgeColor = 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
                              else if (log.action.includes('CREATE')) badgeColor = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
                              else if (log.action.includes('DELETE') || log.action.includes('REMOVE') || log.action.includes('REJECT')) badgeColor = 'bg-red-500/10 text-red-400 border-red-500/20';
                              else if (log.action.includes('SETTLE')) badgeColor = 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
                              else if (log.action.includes('BACKUP')) badgeColor = 'bg-purple-500/10 text-purple-400 border-purple-500/20';

                              return (
                                <tr key={log.id} className="hover:bg-white/[0.01] transition-colors group">
                                  <td className="p-4 text-gray-400 whitespace-nowrap">
                                    {new Date(log.created_at).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'medium' })}
                                  </td>
                                  <td className="p-4">
                                    <div className="font-bold text-white leading-tight">{log.user_nickname || 'Admin'}</div>
                                    <div className="text-[10px] text-gray-500 font-mono">{log.user_email}</div>
                                  </td>
                                  <td className="p-4 whitespace-nowrap">
                                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${badgeColor}`}>
                                      {log.action.replace(/_/g, ' ')}
                                    </span>
                                  </td>
                                  <td className="p-4 text-gray-300">
                                    {log.description}
                                  </td>
                                  <td className="p-4 text-center">
                                    <button
                                      onClick={() => setExpandedAuditLog(isExpanded ? null : log.id)}
                                      className={`px-3 py-1.5 rounded-lg border text-[10px] uppercase font-black transition-all ${isExpanded ? 'bg-cyan-600 border-cyan-500 text-white shadow-lg shadow-cyan-600/20' : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10'}`}
                                    >
                                      {isExpanded ? 'Chiudi' : 'Payload'}
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>

                    {/* Expanded Payload Viewer */}
                    {expandedAuditLog && (() => {
                      const log = auditLogs.find(l => l.id === expandedAuditLog);
                      if (!log) return null;
                      return (
                        <div className="bg-[#0e1227] border border-cyan-500/15 p-6 rounded-2xl animate-in slide-in-from-top-4 duration-300 space-y-4">
                          <div className="flex justify-between items-center border-b border-white/5 pb-3">
                            <h4 className="text-xs font-black uppercase text-cyan-400 tracking-widest flex items-center gap-2">
                              📌 Dettagli Tecnici (Payload JSON)
                            </h4>
                            <span className="text-[10px] font-mono text-gray-500">Log ID: {log.id}</span>
                          </div>
                          <pre className="text-xs font-mono text-cyan-300 bg-black/45 p-5 rounded-xl border border-white/5 overflow-x-auto max-h-[350px] custom-scrollbar leading-relaxed">
                            {JSON.stringify(log.details || {}, null, 2)}
                          </pre>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB DIAGNOSTICS & BACKUPS */}
          {activeTab === 'diagnostics' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-500">
              
              {/* Metrics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                
                {/* Supabase Connection State */}
                <div className="bg-[#0a0e1c]/60 border border-cyan-500/15 rounded-3xl p-6 shadow-2xl backdrop-blur-md relative overflow-hidden flex items-center gap-5">
                  <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-cyan-500/35 to-transparent"></div>
                  <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center shadow-lg ${pingStatus === 'online' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : pingStatus === 'offline' ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400 animate-pulse'}`}>
                    <Activity size={24} />
                  </div>
                  <div>
                    <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest block">Supabase Client</span>
                    <span className="text-base font-black text-white uppercase tracking-wider block mt-0.5">
                      {pingStatus === 'online' ? 'ONLINE' : pingStatus === 'offline' ? 'OFFLINE' : 'VERIFICA...'}
                    </span>
                    <div className="flex items-center gap-1.5 mt-1">
                      <div className={`w-2 h-2 rounded-full ${pingStatus === 'online' ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : pingStatus === 'offline' ? 'bg-red-500' : 'bg-yellow-500 animate-ping'}`}></div>
                      <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">
                        {pingStatus === 'online' ? 'Connesso' : pingStatus === 'offline' ? 'Disconnesso' : 'In attesa'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Total Registered Users */}
                <div className="bg-[#0a0e1c]/60 border border-cyan-500/15 rounded-3xl p-6 shadow-2xl backdrop-blur-md relative overflow-hidden flex items-center gap-5">
                  <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-blue-500/35 to-transparent"></div>
                  <div className="w-12 h-12 bg-blue-500/10 border border-blue-500/30 text-blue-400 rounded-2xl flex items-center justify-center shadow-lg">
                    <Users size={24} />
                  </div>
                  <div>
                    <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest block">Profili Utenti</span>
                    <span className="text-xl font-black text-white block mt-0.5">
                      {metricsLoading ? '...' : dbMetrics.profiles || 0}
                    </span>
                    <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider block mt-1">Registrati sul database</span>
                  </div>
                </div>

                {/* Total Sheep in Circulation */}
                <div className="bg-[#0a0e1c]/60 border border-cyan-500/15 rounded-3xl p-6 shadow-2xl backdrop-blur-md relative overflow-hidden flex items-center gap-5">
                  <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-yellow-500/35 to-transparent"></div>
                  <div className="w-12 h-12 bg-yellow-500/10 border border-yellow-500/30 text-yellow-500 rounded-2xl flex items-center justify-center text-xl shadow-lg">
                    🐑
                  </div>
                  <div>
                    <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest block">Massa Pecore Totale</span>
                    <span className="text-xl font-black text-yellow-500 block mt-0.5">
                      {metricsLoading ? '...' : (dbMetrics.total_sheep || 0).toLocaleString('it-IT')} 🐑
                    </span>
                    <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider block mt-1">Nelle tasche dei pastori</span>
                  </div>
                </div>

                {/* Pending Actions */}
                <div className="bg-[#0a0e1c]/60 border border-cyan-500/15 rounded-3xl p-6 shadow-2xl backdrop-blur-md relative overflow-hidden flex items-center gap-5">
                  <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-red-500/35 to-transparent"></div>
                  <div className="w-12 h-12 bg-red-500/10 border border-red-500/30 text-red-400 rounded-2xl flex items-center justify-center shadow-lg">
                    <Inbox size={24} />
                  </div>
                  <div>
                    <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest block">Proposte / Q&A In Coda</span>
                    <span className="text-xl font-black text-white block mt-0.5">
                      {metricsLoading || pendingQueueCount === null ? '...' : pendingQueueCount}
                    </span>
                    <span className="text-[9px] text-red-400 font-black uppercase tracking-wider block mt-1 animate-pulse">Da revisionare</span>
                  </div>
                </div>

              </div>

              {/* Database & Integrations Control */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* Backup actions */}
                <div className="lg:col-span-5 bg-[#0a0e1c]/60 border border-cyan-500/15 rounded-3xl p-8 space-y-6 shadow-2xl backdrop-blur-md relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-cyan-500/35 to-transparent"></div>
                  
                  <div>
                    <h3 className="text-xs font-black text-cyan-400 uppercase tracking-[0.25em] flex items-center gap-2 mb-2">
                      <Database size={14} className="text-cyan-400" /> Utility Database
                    </h3>
                    <p className="text-xs text-gray-400 leading-relaxed font-medium">
                      Esegui backup di sicurezza della struttura e del contenuto del manuale. Il backup viene assemblato ed esportato in formato JSON leggibile.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <button
                      onClick={handleDownloadBackup}
                      disabled={isGeneratingBackup}
                      className="w-full px-6 py-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white border border-cyan-400/20 rounded-2xl text-xs font-black tracking-widest uppercase transition-all hover:-translate-y-0.5 shadow-lg active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isGeneratingBackup ? (
                        <Loader2 size={16} className="animate-spin text-white" />
                      ) : (
                        <Download size={16} />
                      )}
                      {isGeneratingBackup ? 'Generazione Backup...' : 'Scarica Backup JSON Completo'}
                    </button>


                  </div>

                  <div className="bg-black/30 p-4 border border-white/5 rounded-2xl space-y-2">
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase text-gray-500 tracking-wider">
                      <span>💡 Informazioni di Sicurezza</span>
                    </div>
                    <p className="text-[10px] text-gray-500 leading-relaxed font-medium">
                      Il file scaricato conterrà tutte le tabelle essenziali (profilo utenti, civiltà, tornei, scommesse). Può essere usato per ripristinare il database in caso di corruzione dei dati.
                    </p>
                  </div>
                </div>

                {/* Table row count diagnostics */}
                <div className="lg:col-span-7 bg-[#0a0e1c]/60 border border-cyan-500/15 rounded-3xl p-8 space-y-6 shadow-2xl backdrop-blur-md relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-cyan-500/35 to-transparent"></div>
                  
                  <div>
                    <h3 className="text-xs font-black text-cyan-400 uppercase tracking-[0.25em] flex items-center gap-2 mb-2">
                      📊 Diagnostica Tabelle Supabase
                    </h3>
                    <p className="text-xs text-gray-400 leading-relaxed font-medium">
                      Dimensione delle singole entità presenti nel database di produzione. Ciascun conteggio corrisponde al numero totale di righe memorizzate.
                    </p>
                  </div>

                  {metricsLoading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                      <Loader2 className="animate-spin text-cyan-400 mb-2" size={32} />
                      <span className="text-[10px] text-gray-500 uppercase tracking-widest font-black">Interrogazione Tabelle...</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {[
                        { name: 'civilizations', label: 'Civiltà Registrate 🏛️' },
                        { name: 'suggestions', label: 'Suggerimenti Totali 💡' },
                        { name: 'tournaments', label: 'Tornei Totali 🏆' },
                        { name: 'betting_markets', label: 'Mercati Scommesse 🎲' },
                        { name: 'user_bets', label: 'Scommesse Totali 💸' },
                        { name: 'profiles', label: 'Utenti / Profili 👤' },
                        { name: 'audit_log', label: 'Voci Registro Attività 📝' },
                        { name: 'stream_overlays', label: 'Overlay Stream Configurati 🖥️' },
                        { name: 'faq_sections', label: 'Sezioni delle FAQ 📖' },
                        { name: 'faq_items', label: 'Domande FAQ Totali 📖' }
                      ].map((t) => (
                        <div key={t.name} className="flex justify-between items-center p-3.5 bg-black/20 border border-white/5 rounded-2xl group hover:border-cyan-500/30 transition-colors">
                          <span className="text-xs font-black text-gray-400 group-hover:text-white transition-colors">{t.label}</span>
                          <span className="text-xs font-bold text-cyan-400 bg-cyan-950/40 border border-cyan-800/30 px-3 py-1 rounded-xl">
                            {dbMetrics[t.name] || 0}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                </div>

              </div>

            </div>
          )}

          {/* TAB 2: CRM Utenti */}
          {activeTab === 'utenti' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-5 duration-500">
              <div className="flex flex-col xl:flex-row gap-6">
                
                {/* Lista Utenti */}
                <div className="flex-1 bg-[#0a0e1c]/60 border border-cyan-500/15 rounded-3xl p-6 shadow-2xl backdrop-blur-md relative overflow-hidden flex flex-col min-w-0">
                  <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-cyan-500/25 to-transparent"></div>
                  
                  {/* Filtri */}
                  <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-6">
                    <div className="relative w-full md:w-80">
                      <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                      <input
                        type="text"
                        placeholder="Cerca per email o nickname..."
                        value={crmSearch}
                        onChange={(e) => handleCrmSearchChange(e.target.value)}
                        className="w-full bg-[#111218] border-2 border-white/10 hover:border-white/20 focus:border-cyan-500/50 rounded-2xl py-3 pl-11 pr-4 text-xs text-white focus:shadow-[0_0_15px_rgba(34,211,238,0.15)] transition-all outline-none font-bold"
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
                      <CustomSelect
                        value={crmRoleFilter}
                        onChange={handleCrmRoleFilterChange}
                        options={[
                          { value: 'all', label: 'Tutti i Ruoli' },
                          { value: 'pending_service', label: 'Servizi Pendenti 📢' },
                          { value: 'admin', label: 'Admin' },
                          { value: 'editor', label: 'Editor' },
                          { value: 'staff', label: 'Staff' },
                          { value: 'user', label: 'Utenti standard' },
                          { value: 'banned', label: 'Bloccati 🚫' },
                        ]}
                        className="min-w-[130px] flex-initial"
                        buttonClassName="h-10 border-white/10 hover:border-cyan-500/50 rounded-2xl text-xs py-2 bg-[#111218] font-bold"
                      />

                      <CustomSelect
                        value={crmSortField}
                        onChange={(val) => { setCrmSortField(val); setCrmPage(1); }}
                        options={[
                          { value: 'created_at', label: 'Data Registrazione' },
                          { value: 'sheep_balance', label: 'Saldo Pecore' },
                          { value: 'nickname', label: 'Nickname' },
                          { value: 'email', label: 'Email' },
                        ]}
                        className="min-w-[160px] flex-initial"
                        buttonClassName="h-10 border-white/10 hover:border-cyan-500/50 rounded-2xl text-xs py-2 bg-[#111218] font-bold"
                      />

                      <button
                        onClick={() => setCrmSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                        className="p-2.5 bg-[#111218] border border-white/10 hover:border-cyan-500/30 rounded-2xl text-cyan-400 font-bold transition-all text-xs active:scale-95 h-10 flex items-center justify-center"
                      >
                        {crmSortOrder === 'asc' ? '↑ ASC' : '↓ DESC'}
                      </button>
                    </div>
                  </div>

                  {/* Tabella Utenti */}
                  {crmLoading ? (
                    <div className="flex flex-col items-center justify-center py-24">
                      <Loader2 className="animate-spin text-cyan-400 mb-2" size={36} />
                      <span className="text-[10px] text-gray-500 uppercase tracking-widest font-black">Interrogazione registro utenti...</span>
                    </div>
                  ) : crmUsers.length === 0 ? (
                    <div className="text-center py-20 bg-black/20 border border-white/5 rounded-2xl">
                      <p className="text-sm text-gray-400 font-medium">Nessun utente trovato con questi criteri di ricerca.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="overflow-x-auto elegant-scrollbar">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-white/5 text-[11px] font-black uppercase text-gray-500 tracking-wider">
                              <th className="py-3.5 px-4">Utente</th>
                              <th className="py-3.5 px-4">Ruolo</th>
                              <th className="py-3.5 px-4 text-center">🐑 Pecore</th>
                              <th className="py-3.5 px-4">Creato il</th>
                              <th className="py-3.5 px-4 text-right">Azioni</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5">
                            {crmUsers.map((u) => {
                              const isSelected = selectedCrmUser?.email === u.email;
                              const hasPending = emailsWithPendingRedemptions.includes(u.email?.toLowerCase());
                              return (
                                <tr 
                                  key={u.id}
                                  onClick={() => handleSelectCrmUser(u)}
                                  className={`group cursor-pointer transition-colors ${isSelected ? 'bg-cyan-500/5' : 'hover:bg-white/[0.02]'} ${hasPending ? 'border-l-2 border-l-fuchsia-500' : ''}`}
                                >
                                  <td className="py-3.5 px-4">
                                    <div className="flex items-center gap-3">
                                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center border text-sm font-bold shrink-0 overflow-hidden shadow ${u.role === 'admin' ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400' : u.role === 'banned' ? 'bg-red-500/10 border-red-500/20 text-red-500' : 'bg-blue-600/10 border-blue-500/20 text-blue-400'} ${getAvatarEffectClass(u.selected_avatar_effect)}`}>
                                        {u.avatar_url ? (
                                          <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                          <span>{u.nickname?.[0]?.toUpperCase() || u.email?.[0]?.toUpperCase() || 'U'}</span>
                                        )}
                                      </div>
                                      <div className="flex flex-col min-w-0">
                                        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                                          <span className="text-sm font-bold text-white truncate max-w-[150px]">{u.nickname || 'Nessun nickname'}</span>
                                          {u.selected_title && (
                                            <TitleEmblemTooltip titleId={u.selected_title} label={SHOP_TITLES.find(t => t.id === u.selected_title)?.label || u.selected_title} placement="top" />
                                          )}
                                          {hasPending && (
                                            <span className="text-[9px] px-1.5 py-0.5 bg-fuchsia-600/20 text-fuchsia-400 border border-fuchsia-500/30 rounded font-black uppercase tracking-tight animate-pulse shrink-0">
                                              Servizio Pendente
                                            </span>
                                          )}
                                        </div>
                                        <span className="text-xs text-gray-400 truncate max-w-[150px]">{u.email}</span>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="py-3.5 px-4">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      {u.role === 'admin' && <span className="text-[9px] px-2 py-0.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-md font-black uppercase tracking-wider">Owner</span>}
                                      {u.role === 'editor' && <span className="text-[9px] px-2 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-md font-black uppercase tracking-wider">Editor</span>}
                                      {u.role === 'staff' && <span className="text-[9px] px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-md font-black uppercase tracking-wider">Staff</span>}
                                      {u.role === 'banned' && <span className="text-[9px] px-2 py-0.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-md font-black uppercase tracking-wider">Bannato</span>}
                                      {(!u.role || u.role === 'user') && <span className="text-[9px] px-2 py-0.5 bg-white/5 text-gray-400 border border-white/10 rounded-md font-black uppercase tracking-wider">User</span>}
                                    </div>
                                  </td>
                                  <td className="py-3.5 px-4 text-center">
                                    <span className="text-sm font-bold text-cyan-400 bg-cyan-950/40 border border-cyan-900/40 px-2.5 py-0.5 rounded-full">{u.sheep_balance ?? 100}</span>
                                  </td>
                                  <td className="py-3.5 px-4 text-sm text-gray-400 font-medium">
                                    {new Date(u.created_at).toLocaleDateString('it-IT')}
                                  </td>
                                  <td className="py-3.5 px-4 text-right">
                                    <button 
                                      className="p-1.5 bg-white/5 hover:bg-cyan-500/10 text-gray-400 hover:text-cyan-400 border border-white/5 hover:border-cyan-500/20 rounded-xl transition-all"
                                      onClick={(e) => { e.stopPropagation(); handleSelectCrmUser(u); }}
                                    >
                                      <ChevronRight size={14} />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Paginazione */}
                      {crmTotalCount > 12 && (
                        <div className="flex justify-between items-center pt-4 border-t border-white/5">
                          <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                            Mostrando {crmUsers.length} di {crmTotalCount} utenti
                          </span>
                          <div className="flex gap-2">
                            <button
                              disabled={crmPage === 1}
                              onClick={() => setCrmPage(prev => Math.max(prev - 1, 1))}
                              className="px-4 py-2 bg-[#111218] border-2 border-white/10 hover:border-cyan-500/30 text-xs font-bold text-white rounded-xl disabled:opacity-30 disabled:pointer-events-none transition-all active:scale-95"
                            >
                              Precedente
                            </button>
                            <span className="px-4 py-2 bg-white/5 border border-white/5 rounded-xl text-xs font-bold text-cyan-400 flex items-center">
                              Pagina {crmPage}
                            </span>
                            <button
                              disabled={crmPage * 12 >= crmTotalCount}
                              onClick={() => setCrmPage(prev => prev + 1)}
                              className="px-4 py-2 bg-[#111218] border-2 border-white/10 hover:border-cyan-500/30 text-xs font-bold text-white rounded-xl disabled:opacity-30 disabled:pointer-events-none transition-all active:scale-95"
                            >
                              Successiva
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Scheda Dettagli Laterale */}
                <div className="w-full xl:w-96 space-y-6">
                  {selectedCrmUser ? (
                    <div className="bg-[#0a0e1c]/60 border border-cyan-500/15 rounded-3xl p-6 shadow-2xl backdrop-blur-md relative overflow-hidden space-y-6">
                      <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-cyan-500/25 to-transparent"></div>
                      
                      <div className="flex flex-col items-center text-center pb-6 border-b border-white/5">
                        <div className={`w-20 h-20 rounded-3xl flex items-center justify-center border-2 text-2xl font-bold overflow-hidden shadow-lg mb-4 ${selectedCrmUser.role === 'admin' ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400' : selectedCrmUser.role === 'banned' ? 'bg-red-500/10 border-red-500/30 text-red-500' : 'bg-blue-600/10 border-blue-500/30 text-blue-400'} ${getAvatarEffectClass(selectedCrmUser.selected_avatar_effect)}`}>
                          {selectedCrmUser.avatar_url ? (
                            <img src={selectedCrmUser.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span>{selectedCrmUser.nickname?.[0]?.toUpperCase() || selectedCrmUser.email?.[0]?.toUpperCase() || 'U'}</span>
                          )}
                        </div>
                        
                        <div className="w-full">
                          {crmEditingNickname ? (
                            <div className="flex items-center justify-center gap-1.5 w-full">
                              <input
                                autoFocus
                                className="bg-black/60 border-2 border-cyan-500/30 rounded-xl px-3 py-1.5 text-xs text-white text-center focus:outline-none max-w-[180px] font-bold"
                                value={crmTempNickname}
                                onChange={(e) => setCrmTempNickname(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleCrmUpdateNickname(selectedCrmUser.email, crmTempNickname);
                                  if (e.key === 'Escape') setCrmEditingNickname(false);
                                }}
                              />
                              <button 
                                onClick={() => handleCrmUpdateNickname(selectedCrmUser.email, crmTempNickname)}
                                className="p-1.5 bg-green-500/10 border border-green-500/20 text-green-400 rounded-lg hover:bg-green-500/20"
                              >
                                <Check size={14} />
                              </button>
                            </div>
                          ) : (
                            <h3 className="text-base font-black text-white flex items-center justify-center gap-2">
                              {selectedCrmUser.nickname || 'Nessun Nickname'}
                              {(!isSuperAdminEmail(selectedCrmUser.email) || isSuperAdmin) && (
                                <button 
                                  onClick={() => setCrmEditingNickname(true)} 
                                  className="p-1 text-gray-400 hover:text-white transition-colors"
                                >
                                  <Edit2 size={12} />
                                </button>
                              )}
                            </h3>
                          )}
                          {selectedCrmUser.selected_title && (
                            <div className="flex justify-center mt-2">
                              <TitleEmblemTooltip titleId={selectedCrmUser.selected_title} label={SHOP_TITLES.find(t => t.id === selectedCrmUser.selected_title)?.label || selectedCrmUser.selected_title} placement="top" />
                            </div>
                          )}
                          <p className="text-xs text-gray-400 mt-1 truncate select-all">{selectedCrmUser.email}</p>
                          <p className="text-[9px] text-gray-500 uppercase tracking-widest font-black mt-2">
                            ID AoE4: {selectedCrmUser.aoe4_profile_id || 'Non Collegato'}
                          </p>
                        </div>
                      </div>

                      {/* Contributi */}
                      <div className="space-y-3">
                        <h4 className="text-[10px] font-black uppercase text-gray-500 tracking-wider">Contributi Portale</h4>
                        {statsLoading ? (
                          <div className="flex justify-center py-4">
                            <Loader2 className="animate-spin text-cyan-400" size={18} />
                          </div>
                        ) : selectedUserStats ? (
                          <div className="grid grid-cols-3 gap-2">
                            <div className="bg-black/20 border border-white/5 rounded-2xl p-3 text-center">
                              <span className="text-[9px] font-black text-gray-500 uppercase block tracking-wider">Proposte</span>
                              <span className="text-base font-black text-white">{selectedUserStats.suggestions}</span>
                            </div>
                            <div className="bg-black/20 border border-white/5 rounded-2xl p-3 text-center">
                              <span className="text-[9px] font-black text-gray-500 uppercase block tracking-wider">Scommesse</span>
                              <span className="text-base font-black text-cyan-400">{selectedUserStats.bets}</span>
                            </div>
                            <div className="bg-black/20 border border-white/5 rounded-2xl p-3 text-center">
                              <span className="text-[9px] font-black text-gray-500 uppercase block tracking-wider">Q&A</span>
                              <span className="text-base font-black text-white">{selectedUserStats.qa}</span>
                            </div>
                          </div>
                        ) : null}
                      </div>

                      {/* Servizi Riscattati */}
                      <div className="space-y-4 pt-4 border-t border-white/5">
                        <div className="flex items-center justify-between">
                          <h4 className="text-[10px] font-black uppercase text-gray-500 tracking-wider text-left">Servizi Riscattati</h4>
                          {redemptionsLoading && <Loader2 className="animate-spin text-cyan-400" size={10} />}
                        </div>
                        
                        {selectedUserRedemptions && selectedUserRedemptions.length > 0 ? (
                          <div className="space-y-3">
                            {/* Pending Services */}
                            {selectedUserRedemptions.filter(r => r.status === 'pending').length > 0 && (
                              <div className="space-y-2">
                                <span className="text-[8px] font-black text-fuchsia-500 uppercase tracking-widest block text-left">Da Erogare (Pending)</span>
                                {selectedUserRedemptions.filter(r => r.status === 'pending').map((redemption: any) => {
                                  const label = redemption.service_id === 'replay_review' ? '🎥 Replay con Staff' : redemption.service_id === 'coaching_1h' ? '👨‍🏫 1h Coaching' : redemption.service_id;
                                  return (
                                    <div key={redemption.id} className="flex items-center justify-between p-2.5 bg-fuchsia-500/5 border border-fuchsia-500/20 rounded-xl gap-2">
                                      <span className="text-[10px] font-bold text-fuchsia-400 truncate">{label}</span>
                                      <button
                                        type="button"
                                        onClick={() => handleCrmDeliverService(redemption.id, selectedCrmUser.email, redemption.service_id)}
                                        className="px-2.5 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg text-[8px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-md shadow-green-950/20"
                                      >
                                        Eroga
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            {/* Completed Services */}
                            {selectedUserRedemptions.filter(r => r.status === 'delivered').length > 0 && (
                              <div className="space-y-2">
                                <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest block text-left">Erogati (Delivered)</span>
                                <div className="max-h-24 overflow-y-auto elegant-scrollbar space-y-1.5 pr-1">
                                  {selectedUserRedemptions.filter(r => r.status === 'delivered').map((redemption: any) => {
                                    const label = redemption.service_id === 'replay_review' ? '🎥 Replay con Staff' : redemption.service_id === 'coaching_1h' ? '👨‍🏫 1h Coaching' : redemption.service_id;
                                    return (
                                      <div key={redemption.id} className="flex items-center justify-between p-2 bg-black/20 border border-white/5 rounded-xl gap-2 opacity-60">
                                        <span className="text-[9px] font-bold text-gray-400 truncate">{label}</span>
                                        <span className="text-[7px] text-gray-500 font-bold uppercase tracking-wider">
                                          {new Date(redemption.updated_at || redemption.created_at).toLocaleDateString('it-IT')}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="text-[10px] text-gray-500 italic text-left">Nessun servizio riscattato.</p>
                        )}
                      </div>

                      {/* Azioni Gestionali */}
                      <div className="space-y-4 pt-4 border-t border-white/5">
                        <h4 className="text-[10px] font-black uppercase text-gray-500 tracking-wider">Azioni Gestionali CRM</h4>
                        
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 block uppercase tracking-wider">Bilancio Pecore ({selectedCrmUser.sheep_balance ?? 100})</label>
                          <div className="flex flex-col xs:flex-row gap-2 w-full">
                            <div className="flex items-center bg-[#111218] border border-white/10 rounded-xl px-2 py-1 justify-between w-full xs:max-w-[140px] shrink-0">
                              <button
                                type="button"
                                disabled={!isAdmin || (isSuperAdminEmail(selectedCrmUser.email) && !isSuperAdmin)}
                                onClick={() => {
                                  const current = crmSheepAmount === '' ? 0 : Number(crmSheepAmount);
                                  setCrmSheepAmount(current - 10);
                                }}
                                className="w-8 h-8 flex items-center justify-center hover:bg-white/5 rounded-xl text-cyan-400 transition-colors active:scale-95 disabled:opacity-30 disabled:pointer-events-none"
                              >
                                <Minus size={12} />
                              </button>
                              <input
                                type="number"
                                placeholder="0"
                                disabled={!isAdmin || (isSuperAdminEmail(selectedCrmUser.email) && !isSuperAdmin)}
                                value={crmSheepAmount}
                                onChange={(e) => setCrmSheepAmount(e.target.value === '' ? '' : Number(e.target.value))}
                                className="w-12 bg-transparent text-xs text-white font-black text-center outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none disabled:opacity-50"
                              />
                              <button
                                type="button"
                                disabled={!isAdmin || (isSuperAdminEmail(selectedCrmUser.email) && !isSuperAdmin)}
                                onClick={() => {
                                  const current = crmSheepAmount === '' ? 0 : Number(crmSheepAmount);
                                  setCrmSheepAmount(current + 10);
                                }}
                                className="w-8 h-8 flex items-center justify-center hover:bg-white/5 rounded-xl text-cyan-400 transition-colors active:scale-95 disabled:opacity-30 disabled:pointer-events-none"
                              >
                                <Plus size={12} />
                              </button>
                            </div>
                            <div className="flex gap-2 w-full xs:w-auto flex-1">
                              <button
                                disabled={crmSheepAmount === '' || !isAdmin || (isSuperAdminEmail(selectedCrmUser.email) && !isSuperAdmin)}
                                onClick={() => handleCrmAdjustSheep(selectedCrmUser.email, Number(crmSheepAmount))}
                                className="flex-1 py-2 px-3 bg-cyan-600/20 hover:bg-cyan-600 border border-cyan-500/30 text-cyan-400 hover:text-white rounded-xl text-xs font-black uppercase tracking-wider disabled:opacity-30 disabled:pointer-events-none transition-all text-center"
                              >
                                Aggiungi
                              </button>
                              <button
                                disabled={crmSheepAmount === '' || !isAdmin || (isSuperAdminEmail(selectedCrmUser.email) && !isSuperAdmin)}
                                onClick={() => handleCrmAdjustSheep(selectedCrmUser.email, Number(crmSheepAmount), true)}
                                className="flex-1 py-2 px-3 bg-cyan-600/10 hover:bg-cyan-600 border border-cyan-500/15 text-cyan-400 hover:text-white rounded-xl text-xs font-black uppercase tracking-wider disabled:opacity-30 disabled:pointer-events-none transition-all text-center"
                              >
                                Imposta
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 block uppercase tracking-wider">Modifica Ruolo Operativo</label>
                          <div className="grid grid-cols-2 gap-2">
                            {['user', 'staff', 'editor', 'admin'].map((role) => (
                              <button
                                key={role}
                                disabled={!isSuperAdmin}
                                onClick={() => handleCrmChangeRole(selectedCrmUser.email, role)}
                                className={`py-2 rounded-xl text-[10px] font-black uppercase border transition-all ${
                                  selectedCrmUser.role === role 
                                    ? 'bg-cyan-600/20 border-cyan-500/50 text-cyan-400 font-bold' 
                                    : 'bg-black/10 border-white/5 text-gray-400 hover:bg-white/5'
                                } ${!isSuperAdmin ? 'opacity-50 cursor-not-allowed' : ''}`}
                              >
                                {role}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-2 pt-2">
                          <label className="text-[10px] font-black text-gray-400 block uppercase tracking-wider text-left">Permessi Granulari</label>
                          <div className="space-y-2">
                            {[
                              { field: 'can_manage_tournaments', label: 'Gestione Tornei 🏆' },
                              { field: 'can_manage_civs', label: 'Gestione Civiltà 🏛️' },
                              { field: 'can_manage_buildorders', label: 'Gestione Build Orders ⚡' },
                              { field: 'can_view_admin', label: 'Accesso Pannello Admin 🔑' }
                            ].map((perm) => (
                              <div key={perm.field} className="flex items-center justify-between p-2 bg-[#111218] border border-white/5 rounded-xl gap-2">
                                <span className="text-[10px] font-bold text-gray-300 min-w-0 flex-1 pr-2 break-words text-left">{perm.label}</span>
                                <button
                                  type="button"
                                  disabled={!isSuperAdmin}
                                  onClick={() => handleCrmTogglePermission(selectedCrmUser.email, perm.field, !selectedCrmUser[perm.field])}
                                  className={`w-9 h-5 rounded-full relative transition-all flex-shrink-0 outline-none ${!isSuperAdmin ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${selectedCrmUser[perm.field] ? 'bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.4)]' : 'bg-white/10'}`}
                                >
                                  <div className={`absolute top-[2px] w-4 h-4 bg-white rounded-full transition-all ${selectedCrmUser[perm.field] ? 'left-[18px]' : 'left-[2px]'}`} />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="pt-2">
                          {selectedCrmUser.role === 'banned' ? (
                            <button
                              disabled={!isAdmin || isSuperAdminEmail(selectedCrmUser.email)}
                              onClick={() => handleCrmToggleBan(selectedCrmUser.email, 'banned')}
                              className={`w-full flex items-center justify-center gap-2 py-3 bg-green-500/10 hover:bg-green-600 border border-green-500/20 hover:border-green-500 text-green-400 hover:text-white rounded-2xl transition-all font-black text-xs uppercase tracking-wider ${isSuperAdminEmail(selectedCrmUser.email) ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                              <Unlock size={14} /> Sblocca Account
                            </button>
                          ) : (
                            <button
                              disabled={!isAdmin || isSuperAdminEmail(selectedCrmUser.email)}
                              onClick={() => handleCrmToggleBan(selectedCrmUser.email, selectedCrmUser.role || 'user')}
                              className={`w-full flex items-center justify-center gap-2 py-3 bg-red-500/10 hover:bg-red-600 border border-red-500/20 hover:border-red-500 text-red-400 hover:text-white rounded-2xl transition-all font-black text-xs uppercase tracking-wider shadow-lg shadow-red-950/20 ${isSuperAdminEmail(selectedCrmUser.email) ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                              <Lock size={14} /> Blocca / Banna Utente
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Log Attività Utente */}
                      <div className="space-y-3 pt-4 border-t border-white/5">
                        <h4 className="text-[10px] font-black uppercase text-gray-500 tracking-wider">Ultime Azioni Log</h4>
                        {statsLoading ? (
                          <div className="flex justify-center py-4">
                            <Loader2 className="animate-spin text-cyan-400" size={14} />
                          </div>
                        ) : selectedUserLogs.length === 0 ? (
                          <p className="text-[10px] text-gray-500 italic">Nessuna azione registrata nell'audit log.</p>
                        ) : (
                          <div className="space-y-2 max-h-48 overflow-y-auto elegant-scrollbar pr-1">
                            {selectedUserLogs.map((log) => (
                              <div key={log.id} className="bg-black/20 border border-white/5 rounded-xl p-2.5 text-[10px] space-y-1">
                                <div className="flex justify-between font-black text-gray-400">
                                  <span className="text-cyan-400 uppercase tracking-wider">{log.action}</span>
                                  <span>{new Date(log.created_at).toLocaleDateString('it-IT')}</span>
                                </div>
                                <p className="text-gray-300 font-medium">{log.description}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                    </div>
                  ) : (
                    <div className="bg-[#0a0e1c]/40 border border-white/5 rounded-3xl p-8 text-center h-full flex flex-col items-center justify-center py-24">
                      <Users size={32} className="text-gray-600 mb-2" />
                      <h3 className="text-sm font-bold text-gray-400">Nessun utente selezionato</h3>
                      <p className="text-[11px] text-gray-500 mt-1 max-w-[200px] mx-auto">Clicca sulla riga di un utente per visualizzare dettagli, storico contributi e controlli CRM.</p>
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}

          {/* TAB 3: Comunicazioni */}
          {activeTab === 'comunicazioni' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-5 duration-500">
              {annError === 'table_missing' ? (
                <div className="bg-red-500/10 border-2 border-red-500/20 rounded-3xl p-8 text-center max-w-2xl mx-auto space-y-4">
                  <AlertTriangle className="text-red-500 mx-auto" size={48} />
                  <h3 className="text-lg font-black text-white uppercase tracking-wider">Tabella DB "announcements" non trovata</h3>
                  <p className="text-xs text-gray-300 leading-relaxed font-medium">
                    Per poter utilizzare il modulo Comunicazioni, è necessario creare la tabella <code>announcements</code> all'interno del database Supabase.
                  </p>
                  <p className="text-xs text-gray-400 leading-relaxed font-semibold">
                    Abbiamo già generato il file SQL per te. Copia il contenuto del file <code>supabase_announcements_migration.sql</code> presente nella cartella principale del progetto ed eseguilo nel terminale SQL Editor del tuo pannello Supabase.
                  </p>
                  <div className="pt-2">
                    <button
                      onClick={fetchAnnouncements}
                      className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-black uppercase rounded-2xl transition-all shadow-lg shadow-cyan-600/15 animate-pulse"
                    >
                      Aggiorna Verifica Database
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                  
                  {/* Creazione Annuncio */}
                  <div className="xl:col-span-5 bg-[#0a0e1c]/60 border border-cyan-500/15 rounded-3xl p-6 shadow-2xl backdrop-blur-md relative overflow-hidden h-fit">
                    <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-cyan-500/25 to-transparent"></div>
                    
                    <h3 className="text-xs font-black text-cyan-400 uppercase tracking-[0.2em] mb-6">
                      📢 {editingAnnId ? 'Modifica Comunicazione' : 'Crea Nuova Comunicazione'}
                    </h3>
                    
                    <form onSubmit={handleCreateAnnouncement} className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Titolo Annuncio</label>
                        <input
                          type="text"
                          required
                          placeholder="es. Torneo Aperto a Tutti!"
                          value={annForm.title}
                          onChange={(e) => setAnnForm({ ...annForm, title: e.target.value })}
                          className="w-full bg-[#111218] border border-white/10 focus:border-cyan-500/50 rounded-xl px-4 py-3 text-xs text-white font-bold outline-none"
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Corpo / Messaggio</label>
                          <button
                            type="button"
                            onClick={handleOpenLinkModal}
                            className="flex items-center gap-1.5 px-3 py-1 bg-white/5 border border-white/10 hover:border-cyan-500/50 hover:bg-cyan-500/10 text-[10px] font-black uppercase tracking-wider text-cyan-400 rounded-lg transition-all active:scale-95 cursor-pointer shadow-lg shadow-cyan-950/20"
                            title="Inserisci un link testuale nel messaggio"
                          >
                            <Link2 size={12} />
                            <span>Aggiungi Link</span>
                          </button>
                        </div>
                        <textarea
                          ref={bodyTextareaRef}
                          required
                          rows={4}
                          placeholder="Inserisci il testo dettagliato dell'annuncio o del banner..."
                          value={annForm.body}
                          onChange={(e) => setAnnForm({ ...annForm, body: e.target.value })}
                          className="w-full bg-[#111218] border border-white/10 focus:border-cyan-500/50 rounded-xl px-4 py-3 text-xs text-white font-medium outline-none resize-none"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <CustomSelect
                          label="Tipo Pubblicazione"
                          value={annForm.type}
                          onChange={(val) => setAnnForm({ ...annForm, type: val })}
                          options={[
                            { value: 'banner', label: 'Banner Superiore' },
                            { value: 'notification', label: 'Notifica In-App' },
                            { value: 'both', label: 'Entrambi' }
                          ]}
                          className="w-full"
                          buttonClassName="h-10 border-white/10 hover:border-cyan-500/50 rounded-xl text-xs py-2 bg-[#111218] font-bold"
                        />

                        <CustomSelect
                          label="Target Destinatari"
                          value={annForm.target}
                          onChange={(val) => setAnnForm({ ...annForm, target: val })}
                          options={[
                            { value: 'all', label: 'Tutti gli Utenti' },
                            { value: 'staff', label: 'Solo Staff' },
                            { value: 'pastori', label: 'Solo Chi Ha Scommesso' }
                          ]}
                          className="w-full"
                          buttonClassName="h-10 border-white/10 hover:border-cyan-500/50 rounded-xl text-xs py-2 bg-[#111218] font-bold"
                        />
                      </div>

                      {(annForm.type === 'notification' || annForm.type === 'both') && (
                        <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Testo Bottone Azione (Opzionale)</label>
                            <input
                              type="text"
                              placeholder="es. Iscriviti"
                              value={annForm.btn_label}
                              onChange={(e) => setAnnForm({ ...annForm, btn_label: e.target.value })}
                              className="w-full bg-[#111218] border border-white/10 focus:border-cyan-500/50 rounded-xl px-4 py-2.5 text-xs text-white font-bold outline-none"
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Link Bottone Azione (Opzionale)</label>
                            <input
                              type="text"
                              placeholder="es. /tornei o https://..."
                              value={annForm.btn_url}
                              onChange={(e) => setAnnForm({ ...annForm, btn_url: e.target.value })}
                              className="w-full bg-[#111218] border border-white/10 focus:border-cyan-500/50 rounded-xl px-4 py-2.5 text-xs text-white font-bold outline-none"
                            />
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-3 py-2">
                        <button
                          type="button"
                          id="ann_is_active"
                          onClick={() => setAnnForm({ ...annForm, is_active: !annForm.is_active })}
                          className={`w-9 h-5 rounded-full relative transition-all flex-shrink-0 outline-none cursor-pointer ${annForm.is_active ? 'bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.4)]' : 'bg-white/10'}`}
                        >
                          <div className={`absolute top-[2px] w-4 h-4 bg-white rounded-full transition-all ${annForm.is_active ? 'left-[18px]' : 'left-[2px]'}`} />
                        </button>
                        <span 
                          onClick={() => setAnnForm({ ...annForm, is_active: !annForm.is_active })} 
                          className="text-xs font-bold text-gray-300 cursor-pointer select-none"
                        >
                          Attiva e mostra subito
                        </span>
                      </div>

                      <div className="flex gap-3">
                        {editingAnnId && (
                          <button
                            type="button"
                            onClick={handleCancelEditAnnouncement}
                            className="flex-1 py-3.5 bg-white/5 border border-white/10 hover:bg-white/10 text-gray-400 hover:text-white text-xs font-black uppercase tracking-wider rounded-2xl transition-all"
                          >
                            Annulla
                          </button>
                        )}
                        <button
                          type="submit"
                          className={`py-3.5 text-white text-xs font-black uppercase tracking-wider rounded-2xl transition-all active:scale-95 shadow-lg ${editingAnnId ? 'flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 shadow-green-600/10' : 'w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 shadow-cyan-600/10'}`}
                        >
                          {editingAnnId ? 'Salva Modifiche' : 'Invia Comunicazione'}
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Storico Annunci */}
                  <div className="xl:col-span-7 bg-[#0a0e1c]/60 border border-cyan-500/15 rounded-3xl p-6 shadow-2xl backdrop-blur-md relative overflow-hidden flex flex-col h-fit">
                    <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-cyan-500/25 to-transparent"></div>
                    
                    <h3 className="text-xs font-black text-cyan-400 uppercase tracking-[0.2em] mb-6">📣 Storico Annunci & Pubblicazioni</h3>
                    
                    {announcementsLoading ? (
                      <div className="flex flex-col items-center justify-center py-20">
                        <Loader2 className="animate-spin text-cyan-400" size={32} />
                        <span className="text-[10px] text-gray-500 uppercase tracking-widest font-black">Interrogazione annunci...</span>
                      </div>
                    ) : announcements.length === 0 ? (
                      <div className="text-center py-16 bg-black/20 border border-white/5 rounded-2xl">
                        <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Nessuna comunicazione registrata</p>
                      </div>
                    ) : (
                      <div className="space-y-4 max-h-[500px] overflow-y-auto elegant-scrollbar pr-2">
                        {announcements.map((ann) => (
                          <div 
                            key={ann.id} 
                            className={`bg-black/20 border rounded-2xl p-4.5 space-y-3 relative group transition-colors ${ann.is_active ? 'border-cyan-500/20' : 'border-white/5'}`}
                          >
                            <div className="flex justify-between items-start gap-4">
                              <div className="space-y-1">
                                <h4 className="text-xs font-black text-white">{ann.title}</h4>
                                <div className="flex items-center gap-2 text-[8px] font-black uppercase text-gray-500">
                                  <span className="text-cyan-400">{ann.type}</span>
                                  <span>•</span>
                                  <span>Destinatari: {ann.target}</span>
                                  <span>•</span>
                                  <span>Creato da: {ann.created_by}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <button
                                  onClick={() => handleToggleAnnouncementActive(ann.id, ann.is_active)}
                                  className={`px-2.5 py-1 text-[8px] font-black uppercase tracking-wider rounded border transition-all ${ann.is_active ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400' : 'bg-white/5 border-white/10 text-gray-400'}`}
                                >
                                  {ann.is_active ? 'Attivo' : 'Spento'}
                                </button>
                                <button
                                  onClick={() => handleStartEditAnnouncement(ann)}
                                  className={`p-1 hover:bg-cyan-500/10 hover:text-cyan-400 rounded transition-colors ${editingAnnId === ann.id ? 'text-cyan-400 bg-cyan-500/10' : 'text-gray-500'}`}
                                  title="Modifica annuncio"
                                >
                                  <Edit2 size={14} />
                                </button>
                                <button
                                  onClick={() => {
                                    if (confirm('Sei sicuro di voler eliminare questo annuncio?')) {
                                      handleDeleteAnnouncement(ann.id);
                                    }
                                  }}
                                  className="p-1 hover:bg-red-500/10 hover:text-red-500 text-gray-500 rounded transition-colors"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                            
                            <p className="text-[11px] text-gray-300 leading-relaxed font-medium bg-black/30 p-3 rounded-xl border border-white/5">
                              {renderTextWithLinks(ann.body)}
                            </p>
                            
                            <div className="text-[9px] text-gray-500 text-right">
                              Data invio: {new Date(ann.created_at).toLocaleString('it-IT')}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                </div>
              )}
            </div>
          )}

          {/* TAB 4: Analytics */}
          {activeTab === 'analytics' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-5 duration-500">
              
              {analyticsLoading ? (
                <div className="flex flex-col items-center justify-center py-40">
                  <Loader2 className="animate-spin text-cyan-400 mb-2" size={40} />
                  <span className="text-[10px] text-gray-500 uppercase tracking-widest font-black">Analisi dati in corso...</span>
                </div>
              ) : analyticsData ? (
                <div className="space-y-6">
                  {/* Riepiloghi Metriche */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-[#0a0e1c]/60 border border-white/5 rounded-3xl p-6 relative overflow-hidden backdrop-blur-md shadow-2xl">
                      <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-cyan-500/25 to-transparent"></div>
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">Registrati Totali</span>
                        <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                          <Users size={16} />
                        </div>
                      </div>
                      <p className="text-3xl font-black mt-4 text-white tracking-tight">{analyticsData.totalUsers}</p>
                    </div>

                    <div className="bg-[#0a0e1c]/60 border border-white/5 rounded-3xl p-6 relative overflow-hidden backdrop-blur-md shadow-2xl">
                      <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-blue-500/25 to-transparent"></div>
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">Suggerimenti Inviati</span>
                        <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                          <Inbox size={16} />
                        </div>
                      </div>
                      <p className="text-3xl font-black mt-4 text-white tracking-tight">{analyticsData.totalSuggestions}</p>
                    </div>

                    <div className="bg-[#0a0e1c]/60 border border-white/5 rounded-3xl p-6 relative overflow-hidden backdrop-blur-md shadow-2xl">
                      <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-indigo-500/25 to-transparent"></div>
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">Scommesse Totali</span>
                        <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                          <TrendingUp size={16} />
                        </div>
                      </div>
                      <p className="text-3xl font-black mt-4 text-white tracking-tight">{analyticsData.totalBets}</p>
                    </div>

                    <div className="bg-[#0a0e1c]/60 border border-white/5 rounded-3xl p-6 relative overflow-hidden backdrop-blur-md shadow-2xl">
                      <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-cyan-500/25 to-transparent"></div>
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">Pecore Puntate</span>
                        <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                          <Coins size={16} />
                        </div>
                      </div>
                      <p className="text-3xl font-black mt-4 text-cyan-400 tracking-tight">🐑 {analyticsData.totalSheep}</p>
                    </div>
                  </div>

                  {/* Grafici SVG */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <GlassyLineChart 
                      data={analyticsData.registrationsTrend} 
                      title="👥 Andamento Iscrizioni (Ultime 6 Settimane)" 
                      color="#22d3ee" 
                    />
                    <GlassyLineChart 
                      data={analyticsData.suggestionsTrend} 
                      title="💡 Andamento Proposte Ricevute (Ultime 6 Settimane)" 
                      color="#3b82f6" 
                    />
                    <GlassyLineChart 
                      data={analyticsData.betsTrend} 
                      title="💸 Andamento Scommesse Piazzate (Ultime 6 Settimane)" 
                      color="#6366f1" 
                    />

                    {/* Civiltà Più Modificate */}
                    <div className="bg-[#0a0e1c]/60 p-6 rounded-3xl border border-cyan-500/15 backdrop-blur-md relative overflow-hidden flex flex-col h-80 shadow-2xl">
                      <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-cyan-500/25 to-transparent"></div>
                      <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 mb-6">🏛️ Civiltà Più Votate (Suggerimenti)</h3>
                      
                      {analyticsData.civPopularity.length === 0 ? (
                        <div className="flex-1 flex items-center justify-center">
                          <p className="text-xs text-gray-500 font-black uppercase">Nessuna proposta registrata</p>
                        </div>
                      ) : (
                        <div className="flex-1 flex flex-col justify-center gap-4">
                          {analyticsData.civPopularity.map((c: any, i: number) => {
                            const maxVal = Math.max(...analyticsData.civPopularity.map((x: any) => x.value), 1);
                            const percent = (c.value / maxVal) * 100;
                            return (
                              <div key={i} className="space-y-1">
                                <div className="flex justify-between items-center text-xs font-bold">
                                  <span className="text-white">{c.label}</span>
                                  <span className="text-cyan-400 font-black">{c.value} proposte</span>
                                </div>
                                <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden border border-white/5">
                                  <div 
                                    style={{ width: `${percent}%` }}
                                    className="bg-cyan-500 h-full rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(34,211,238,0.3)]"
                                  ></div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>



                </div>
              ) : (
                <div className="text-center py-20">
                  <p className="text-sm text-gray-400 font-medium">Impossibile generare le metriche.</p>
                </div>
              )}

            </div>
          )}

          {/* TAB 5: FAQ */}
          {activeTab === 'faq' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-5 duration-500">
              {faqLoading ? (
                <div className="flex flex-col items-center justify-center py-40">
                  <Loader2 className="animate-spin text-cyan-400 mb-2" size={40} />
                  <span className="text-[10px] text-gray-500 uppercase tracking-widest font-black">Caricamento FAQ...</span>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Intro Section */}
                  <div className="bg-[#0a0e1c]/60 border border-cyan-500/15 rounded-3xl p-8 space-y-6 shadow-2xl backdrop-blur-md relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-cyan-500/35 to-transparent"></div>
                    <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                      <HelpCircle size={20} className="text-cyan-400" />
                      <h3 className="text-sm font-black uppercase tracking-[0.15em] text-white">Introduzione FAQ</h3>
                    </div>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] block">Titolo Introduzione</label>
                        <input
                          type="text"
                          value={faqIntro.title}
                          onChange={(e) => setFaqIntro({ ...faqIntro, title: e.target.value })}
                          className="w-full bg-white/[0.01] border-2 border-white/10 hover:border-white/20 focus:border-cyan-500/50 rounded-2xl p-4 text-sm text-white focus:shadow-[0_0_15px_rgba(34,211,238,0.1)] transition-all outline-none"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] block">Contenuto Introduzione</label>
                        <SharedWYSIWYGEditor
                          initialValue={faqIntro.content}
                          onChange={(html) => setFaqIntro({ ...faqIntro, content: html })}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Sections */}
                  {faqSections.map((section: any, sIdx: number) => (
                    <div key={section.id || sIdx} className="bg-[#0a0e1c]/60 border border-white/10 rounded-3xl p-6 space-y-5 shadow-xl backdrop-blur-md relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-blue-500/25 to-transparent"></div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <BookOpen size={18} className="text-blue-400 shrink-0" />
                          <input
                            type="text"
                            value={section.title}
                            onChange={(e) => {
                              const newSections = [...faqSections];
                              newSections[sIdx] = { ...newSections[sIdx], title: e.target.value };
                              setFaqSections(newSections);
                            }}
                            className="bg-transparent border-b-2 border-white/10 focus:border-blue-500/50 text-sm font-bold text-white outline-none flex-1 py-1 transition-all"
                            placeholder="Titolo sezione..."
                          />
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-3">
                          <select
                            value={section.icon_name || 'Layers'}
                            onChange={(e) => {
                              const newSections = [...faqSections];
                              newSections[sIdx] = { ...newSections[sIdx], icon_name: e.target.value };
                              setFaqSections(newSections);
                            }}
                            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-[10px] text-white outline-none focus:border-blue-500/50 appearance-none cursor-pointer font-bold uppercase tracking-wider"
                          >
                            {['Layers', 'Zap', 'Heart', 'Shield', 'Sword', 'BookOpen', 'PlayCircle', 'Users', 'HelpCircle', 'Info', 'Trophy', 'GitPullRequest'].map(icon => (
                              <option key={icon} value={icon} className="bg-[#121620]">{icon}</option>
                            ))}
                          </select>
                          <button
                            onClick={() => {
                              if (sIdx > 0) {
                                const ns = [...faqSections];
                                [ns[sIdx - 1], ns[sIdx]] = [ns[sIdx], ns[sIdx - 1]];
                                setFaqSections(ns);
                              }
                            }}
                            disabled={sIdx === 0}
                            className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition-all disabled:opacity-30"
                          >
                            <ChevronUp size={16} />
                          </button>
                          <button
                            onClick={() => {
                              if (sIdx < faqSections.length - 1) {
                                const ns = [...faqSections];
                                [ns[sIdx], ns[sIdx + 1]] = [ns[sIdx + 1], ns[sIdx]];
                                setFaqSections(ns);
                              }
                            }}
                            disabled={sIdx === faqSections.length - 1}
                            className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition-all disabled:opacity-30"
                          >
                            <ChevronDown size={16} />
                          </button>
                          <button
                            onClick={() => setFaqSections(faqSections.filter((_: any, i: number) => i !== sIdx))}
                            className="p-2 bg-red-500/10 hover:bg-red-500/25 rounded-xl text-red-400 transition-all"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>

                      {/* Items inside section */}
                      <div className="space-y-3 pl-2 border-l-2 border-white/5 ml-2">
                        {(section.items || []).map((item: any, iIdx: number) => (
                          <div key={item.id || iIdx} className="bg-black/30 rounded-2xl p-4 space-y-3 border border-white/5">
                            <div className="flex items-center gap-3">
                              <select
                                value={item.icon_name || 'Info'}
                                onChange={(e) => {
                                  const ns = [...faqSections];
                                  const newItems = [...ns[sIdx].items];
                                  newItems[iIdx] = { ...newItems[iIdx], icon_name: e.target.value };
                                  ns[sIdx] = { ...ns[sIdx], items: newItems };
                                  setFaqSections(ns);
                                }}
                                className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-[10px] text-white outline-none cursor-pointer font-bold uppercase shrink-0"
                              >
                                {['Info', 'Shield', 'Sword', 'BookOpen', 'PlayCircle', 'Users', 'HelpCircle', 'Heart', 'Trophy', 'Layers', 'Zap', 'GitPullRequest'].map(icon => (
                                  <option key={icon} value={icon} className="bg-[#121620]">{icon}</option>
                                ))}
                              </select>
                              <input
                                type="text"
                                value={item.label}
                                onChange={(e) => {
                                  const ns = [...faqSections];
                                  const newItems = [...ns[sIdx].items];
                                  newItems[iIdx] = { ...newItems[iIdx], label: e.target.value };
                                  ns[sIdx] = { ...ns[sIdx], items: newItems };
                                  setFaqSections(ns);
                                }}
                                className="flex-1 bg-transparent border-b border-white/10 focus:border-cyan-500/50 text-xs font-bold text-white outline-none py-1 transition-all"
                                placeholder="Etichetta elemento..."
                              />
                              <button
                                onClick={() => {
                                  const ns = [...faqSections];
                                  ns[sIdx] = { ...ns[sIdx], items: ns[sIdx].items.filter((_: any, i: number) => i !== iIdx) };
                                  setFaqSections(ns);
                                }}
                                className="p-1.5 bg-red-500/10 hover:bg-red-500/25 rounded-lg text-red-400 transition-all shrink-0"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                            <div>
                              <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest block mb-2">Descrizione</label>
                              <SharedWYSIWYGEditor
                                initialValue={item.description}
                                onChange={(html) => {
                                  const ns = [...faqSections];
                                  const newItems = [...ns[sIdx].items];
                                  newItems[iIdx] = { ...newItems[iIdx], description: html };
                                  ns[sIdx] = { ...ns[sIdx], items: newItems };
                                  setFaqSections(ns);
                                }}
                              />
                            </div>
                          </div>
                        ))}
                        <button
                          onClick={() => {
                            const ns = [...faqSections];
                            ns[sIdx] = {
                              ...ns[sIdx],
                              items: [...(ns[sIdx].items || []), { id: crypto.randomUUID(), label: 'Nuovo Elemento', description: 'Descrizione...', icon_name: 'Info', display_order: (ns[sIdx].items || []).length }]
                            };
                            setFaqSections(ns);
                          }}
                          className="text-[10px] text-cyan-400 font-black uppercase tracking-wider hover:underline flex items-center gap-1.5"
                        >
                          <Plus size={12} strokeWidth={3} /> Aggiungi Elemento
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Add Section Button */}
                  <button
                    onClick={() => setFaqSections([...faqSections, { title: 'Nuova Sezione', icon_name: 'Layers', display_order: faqSections.length, items: [] }])}
                    className="w-full py-4 border-2 border-dashed border-white/10 hover:border-cyan-500/50 rounded-3xl text-cyan-400 hover:text-cyan-300 text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 bg-white/[0.01] hover:bg-white/[0.03] active:scale-[0.98]"
                  >
                    <Plus size={16} strokeWidth={3} /> Aggiungi Sezione FAQ
                  </button>

                  {/* Save Button */}
                  <div className="flex justify-end pt-4 border-t border-white/5">
                    <button
                      onClick={saveFAQData}
                      disabled={faqSaveLoading}
                      className="px-8 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg hover:-translate-y-0.5 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                      {faqSaveLoading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} strokeWidth={3} />}
                      {faqSaveLoading ? 'Salvataggio...' : 'Salva FAQ'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 6: Privacy */}
          {activeTab === 'privacy' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-5 duration-500">
              {privacyLoading ? (
                <div className="flex flex-col items-center justify-center py-40">
                  <Loader2 className="animate-spin text-cyan-400 mb-2" size={40} />
                  <span className="text-[10px] text-gray-500 uppercase tracking-widest font-black">Caricamento Privacy Policy...</span>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="bg-[#0a0e1c]/60 border border-cyan-500/15 rounded-3xl p-8 space-y-6 shadow-2xl backdrop-blur-md relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-cyan-500/35 to-transparent"></div>
                    <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                      <Shield size={20} className="text-cyan-400" />
                      <h3 className="text-sm font-black uppercase tracking-[0.15em] text-white">Privacy & Cookie Policy</h3>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] block">Titolo Pagina</label>
                        <input
                          type="text"
                          value={privacyTitle}
                          onChange={(e) => setPrivacyTitle(e.target.value)}
                          className="w-full bg-white/[0.01] border-2 border-white/10 hover:border-white/20 focus:border-cyan-500/50 rounded-2xl p-4 text-sm text-white focus:shadow-[0_0_15px_rgba(34,211,238,0.1)] transition-all outline-none"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] block">Contenuto Privacy Policy</label>
                        <SharedWYSIWYGEditor
                          initialValue={privacyContent}
                          onChange={(html) => setPrivacyContent(html)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Save Button */}
                  <div className="flex justify-end pt-4 border-t border-white/5">
                    <button
                      onClick={savePrivacyData}
                      disabled={privacySaveLoading}
                      className="px-8 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg hover:-translate-y-0.5 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                      {privacySaveLoading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} strokeWidth={3} />}
                      {privacySaveLoading ? 'Salvataggio...' : 'Salva Privacy Policy'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Fisso per Invio Mail */}
        {isAdmin && (pendingNotifCount > 0 || sendNotifSuccess) && (
          <div className="p-6 border-t border-cyan-500/15 bg-gradient-to-r from-[#0d1424] to-[#1a1c32] flex justify-center sticky bottom-0 z-20 shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
            <button
              onClick={handleSendNotifications}
              disabled={isSendingEmail || sendNotifSuccess}
              className={`flex items-center gap-4 px-12 py-4 rounded-xl transition-all font-bold shadow-xl group hover:scale-105 active:scale-95 ${
                sendNotifSuccess
                  ? 'bg-green-600 shadow-green-600/30 text-white'
                  : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-600/30'
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

      {/* Modale Assistente Link Annuncio */}
      {isLinkModalOpen && (
        <div className="fixed inset-0 z-[2000] bg-black/80 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="bg-[#0a0e1c] border border-cyan-500/30 p-6 rounded-2xl max-w-md w-full shadow-2xl animate-in zoom-in duration-300 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent"></div>
            
            <h3 className="text-sm font-black text-cyan-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
              <Link2 size={16} /> Assistente Inserimento Link
            </h3>
            
            <form onSubmit={handleInsertLink} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Testo da mostrare</label>
                <input
                  type="text"
                  placeholder="Es. Clicca qui, Regolamento..."
                  value={linkModalText}
                  onChange={(e) => setLinkModalText(e.target.value)}
                  className="w-full bg-[#111218] border border-white/10 focus:border-cyan-500/50 rounded-xl px-4 py-2.5 text-xs text-white font-bold outline-none"
                  autoFocus
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">URL / Destinazione</label>
                <input
                  type="text"
                  required
                  placeholder="Es. /tornei (interno) o google.com (esterno)"
                  value={linkModalUrl}
                  onChange={(e) => setLinkModalUrl(e.target.value)}
                  className="w-full bg-[#111218] border border-white/10 focus:border-cyan-500/50 rounded-xl px-4 py-2.5 text-xs text-white font-medium outline-none"
                />
              </div>

              <div className="p-3 bg-cyan-950/20 border border-cyan-500/10 rounded-xl text-[10px] text-gray-400 leading-relaxed font-semibold">
                💡 <span className="text-cyan-400">Suggerimento:</span> Se inserisci un link interno (es. <code className="text-white">/tornei</code> o <code className="text-white">/classifica</code>), la navigazione avverrà nella stessa scheda del browser. Altrimenti aprirà una nuova scheda.
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsLinkModalOpen(false)}
                  className="flex-1 py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl transition-all text-xs font-bold uppercase"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={!linkModalUrl.trim()}
                  className="flex-1 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl transition-all text-xs font-black uppercase shadow-lg shadow-cyan-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Inserisci Link
                </button>
              </div>
            </form>
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

interface ChartDataPoint {
  label: string;
  value: number;
}

function GlassyLineChart({ data, title, color = '#22d3ee' }: { data: ChartDataPoint[]; title: string; color?: string }) {
  const maxValue = Math.max(...data.map(d => d.value), 1);
  const width = 500;
  const height = 180;
  const padding = 20;
  
  const points = data.map((d, i) => {
    const x = padding + (i / (data.length - 1 || 1)) * (width - padding * 2);
    const y = height - padding - (d.value / maxValue) * (height - padding * 2);
    return { x, y, value: d.value, label: d.label };
  });
  
  const linePath = points.length > 0 
    ? `M ${points[0].x} ${points[0].y} ` + points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ')
    : '';
    
  const areaPath = points.length > 0
    ? `${linePath} L ${points[points.length-1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`
    : '';

  return (
    <div className="bg-[#0a0e1c]/60 p-6 rounded-3xl border border-cyan-500/15 backdrop-blur-md relative overflow-hidden flex flex-col shadow-2xl">
      <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-cyan-500/25 to-transparent"></div>
      <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 mb-6">{title}</h3>
      <div className="relative w-full h-40">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
          <defs>
            <linearGradient id={`areaGrad-${title.replace(/[^a-zA-Z0-9]/g, '')}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.2" />
              <stop offset="100%" stopColor={color} stopOpacity="0.0" />
            </linearGradient>
          </defs>
          
          {[0, 0.25, 0.5, 0.75, 1].map((r, i) => {
            const y = padding + r * (height - padding * 2);
            return (
              <line 
                key={i} 
                x1={padding} 
                y1={y} 
                x2={width - padding} 
                y2={y} 
                stroke="rgba(255,255,255,0.05)" 
                strokeWidth="1" 
              />
            );
          })}
          
          {areaPath && <path d={areaPath} fill={`url(#areaGrad-${title.replace(/[^a-zA-Z0-9]/g, '')})`} />}
          
          {linePath && (
            <path 
              d={linePath} 
              fill="none" 
              stroke={color} 
              strokeWidth="2.5" 
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
          
          {points.map((p, i) => (
            <g key={i} className="group cursor-pointer">
              <circle 
                cx={p.x} 
                cy={p.y} 
                r="4" 
                fill="#070a13" 
                stroke={color} 
                strokeWidth="2" 
              />
              <circle 
                cx={p.x} 
                cy={p.y} 
                r="12" 
                fill={color} 
                fillOpacity="0"
                className="hover:fill-opacity-10 transition-all"
              />
              <title>{`${p.label}: ${p.value}`}</title>
            </g>
          ))}
        </svg>
      </div>
      <div className="flex justify-between mt-2 text-[9px] font-black text-gray-500 uppercase tracking-wider px-2">
        {data.map((item, idx) => (
          <span key={idx} className="truncate">{item.label}</span>
        ))}
      </div>
    </div>
  );
}
