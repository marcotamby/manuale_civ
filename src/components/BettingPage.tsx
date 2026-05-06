import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Trophy, Users, History, Plus, 
  AlertCircle, Clock, Shield,
  ArrowUpRight, Coins, UserCheck, Activity,
  Trophy as TrophyIcon, User as UserIcon, X,
  Zap, Filter, Trash2, Loader2, CheckCircle2,
  XCircle
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './AuthContext';
import clsx from 'clsx';

interface BetOption {
  id: string;
  label: string;
  total_sheep: number;
  bet_count: number;
  weight: number;
  is_disabled?: boolean;
}

interface Market {
  id: string;
  title: string;
  description: string;
  status: 'open' | 'closed' | 'settled';
  created_at: string;
  type: string;
  options: BetOption[];
  total_sheep: number;
  total_bets: number;
  winning_option_id?: string;
  event_level?: string;
}

export function BettingPage() {
  const { user, isAuthenticated, canManageTournaments } = useAuth();
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBets, setSelectedBets] = useState<Record<string, string>>({});
  const [betAmounts, setBetAmounts] = useState<Record<string, number>>({});
  const [placingBet, setPlacingBet] = useState<string | null>(null);
  const [sheepBalance, setSheepBalance] = useState<number>(0);
  const [showAdminTools, setShowAdminTools] = useState(false);
  const [adminTab, setAdminTab] = useState<'create' | 'users' | 'bets'>('create');
  const [filterCategory, setFilterCategory] = useState<'all' | 'open' | 'closed' | 'high' | 'low' | 'tournament'>('all');
  
  // State for user management
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [searchUser, setSearchUser] = useState('');
  const [refillAmount, setRefillAmount] = useState(1000);
  const [isRefilling, setIsRefilling] = useState<string | null>(null);
  const [recentBets, setRecentBets] = useState<any[]>([]);

  // State for market deletion/settlement
  const [marketToDelete, setMarketToDelete] = useState<string | null>(null);
  const [, setIsDeleting] = useState(false);
  const [settleConfirm, setSettleConfirm] = useState<{marketId: string, optionId: string, label: string} | null>(null);
  const [, setIsSettling] = useState(false);

  const [adminForm, setAdminForm] = useState({
    title: '',
    description: '',
    type: 'Match Winner',
    eventLevel: 'High Elo',
    teamA: '',
    teamB: '',
    options: [
      { label: '', weight: 100 },
      { label: '', weight: 100 }
    ] as any[]
  });

  useEffect(() => {
    if (isAuthenticated && user) {
      const fetchBalance = async () => {
        const { data } = await supabase
          .from('profiles')
          .select('sheep_balance')
          .eq('id', user.id)
          .single();
        if (data) setSheepBalance(data.sheep_balance);
      };
      fetchBalance();
    }
  }, [user, isAuthenticated]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const { data: marketsData, error: marketsError } = await supabase
        .from('betting_markets')
        .select('*')
        .order('created_at', { ascending: false });

      if (marketsError) throw marketsError;

      // For each market, get total sheep and bets
      const marketsWithDetails = await Promise.all((marketsData || []).map(async (market: any) => {
        const { data: betsData } = await supabase
          .from('user_bets')
          .select('amount, option_id')
          .eq('market_id', market.id);

        const options = (market.options || []).map((opt: any) => {
          const optBets = (betsData || []).filter((b: any) => b.option_id === opt.id);
          return {
            ...opt,
            total_sheep: optBets.reduce((sum: number, b: any) => sum + b.amount, 0),
            bet_count: optBets.length
          };
        });

        return {
          ...market,
          options,
          total_sheep: (betsData || []).reduce((sum: number, b: any) => sum + b.amount, 0),
          total_bets: (betsData || []).length
        };
      }));

      setMarkets(marketsWithDetails);

      if (canManageTournaments) {
        const { data: usersData } = await supabase
          .from('profiles')
          .select('id, username, email, sheep_balance')
          .order('sheep_balance', { ascending: false });
        setAllUsers(usersData || []);

        const { data: recentBetsData } = await supabase
          .from('user_bets')
          .select(`
            *,
            profiles (username, email)
          `)
          .order('created_at', { ascending: false })
          .limit(50);
        setRecentBets(recentBetsData || []);
      }
    } catch (err) {
      console.error('Error loading betting data:', err);
    } finally {
      setLoading(false);
    }
  }, [canManageTournaments]);

  const handlePlaceBet = async (marketId: string) => {
    if (!isAuthenticated) return;
    const optionId = selectedBets[marketId];
    const amount = betAmounts[marketId] || 100;

    if (!optionId) return;
    if (amount > sheepBalance) {
      alert('Pecore insufficienti!');
      return;
    }

    setPlacingBet(marketId);
    try {
      const { error } = await supabase
        .from('user_bets')
        .insert({
          user_id: user?.id,
          market_id: marketId,
          option_id: optionId,
          amount: amount
        });

      if (error) throw error;

      // Update balance
      const newBalance = sheepBalance - amount;
      await supabase
        .from('profiles')
        .update({ sheep_balance: newBalance })
        .eq('id', user?.id);

      setSheepBalance(newBalance);
      setSelectedBets(prev => {
        const next = {...prev};
        delete next[marketId];
        return next;
      });
      loadData(true);
    } catch (err) {
      console.error('Error placing bet:', err);
      alert('Errore durante la puntata. Riprova.');
    } finally {
      setPlacingBet(null);
    }
  };

  const handleCreateMarket = async () => {
    try {
      const options = adminForm.type === 'Match Winner' 
        ? [
            { id: crypto.randomUUID(), label: adminForm.teamA || 'Team A', weight: adminForm.options[0]?.weight || 100 },
            { id: crypto.randomUUID(), label: adminForm.teamB || 'Team B', weight: adminForm.options[1]?.weight || 100 }
          ]
        : adminForm.options.map(opt => ({
            id: crypto.randomUUID(),
            label: opt.label,
            weight: opt.weight || 100
          }));

      const { error } = await supabase
        .from('betting_markets')
        .insert({
          title: adminForm.title,
          description: adminForm.description,
          type: adminForm.type,
          event_level: adminForm.eventLevel,
          options,
          status: 'open'
        });

      if (error) throw error;
      setAdminForm({
        title: '',
        description: '',
        type: 'Match Winner',
        eventLevel: 'High Elo',
        teamA: '',
        teamB: '',
        options: [{ label: '', weight: 100 }, { label: '', weight: 100 }]
      });
      setShowAdminTools(false);
      loadData();
    } catch (err) {
      console.error('Error creating market:', err);
    }
  };

  const handleRefill = async (userId: string) => {
    setIsRefilling(userId);
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('sheep_balance')
        .eq('id', userId)
        .single();
      
      const currentBalance = profile?.sheep_balance || 0;
      const { error } = await supabase
        .from('profiles')
        .update({ sheep_balance: currentBalance + refillAmount })
        .eq('id', userId);

      if (error) throw error;
      loadData(true);
    } catch (err) {
      console.error('Error refilling sheep:', err);
    } finally {
      setIsRefilling(null);
    }
  };

  const handleSettleMarket = async (marketId: string, winningOptionId: string) => {
    setIsSettling(true);
    try {
      // 1. Get all bets for this market
      const { data: bets } = await supabase
        .from('user_bets')
        .select('*')
        .eq('market_id', marketId);

      if (!bets || bets.length === 0) {
        await supabase
          .from('betting_markets')
          .update({ status: 'settled', winning_option_id: winningOptionId })
          .eq('id', marketId);
        loadData();
        setSettleConfirm(null);
        return;
      }

      const market = markets.find(m => m.id === marketId);
      if (!market) return;

      const totalPool = bets.reduce((sum: number, b: any) => sum + b.amount, 0);
      const winningBets = bets.filter((b: any) => b.option_id === winningOptionId);
      const winningPool = winningBets.reduce((sum: number, b: any) => sum + b.amount, 0);

      if (winningPool > 0) {
        for (const bet of winningBets) {
          const share = bet.amount / winningPool;
          const winnings = Math.floor(totalPool * share);
          
          const { data: profile } = await supabase
            .from('profiles')
            .select('sheep_balance')
            .eq('id', bet.user_id)
            .single();
          
          await supabase
            .from('profiles')
            .update({ sheep_balance: (profile?.sheep_balance || 0) + winnings })
            .eq('id', bet.user_id);
        }
      }

      await supabase
        .from('betting_markets')
        .update({ status: 'settled', winning_option_id: winningOptionId })
        .eq('id', marketId);

      setSettleConfirm(null);
      loadData();
    } catch (err) {
      console.error('Error settling market:', err);
    } finally {
      setIsSettling(false);
    }
  };

  const executeDeleteMarket = async () => {
    if (!marketToDelete) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('betting_markets')
        .delete()
        .eq('id', marketToDelete);
      if (error) throw error;
      setMarketToDelete(null);
      loadData();
    } catch (err) {
      console.error('Error deleting market:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredUsers = allUsers.filter(u => 
    u.username?.toLowerCase().includes(searchUser.toLowerCase()) || 
    u.email?.toLowerCase().includes(searchUser.toLowerCase())
  );

  const totalStats = useMemo(() => {
    const totalSheep = markets.reduce((sum, m) => sum + m.total_sheep, 0);
    const totalBets = markets.reduce((sum, m) => sum + m.total_bets, 0);
    const activeMarkets = markets.filter(m => m.status === 'open').length;
    return [
      { label: 'Pecore Totali', value: totalSheep.toLocaleString(), icon: Coins, color: 'text-yellow-400' },
      { label: 'Puntate Totali', value: totalBets.toLocaleString(), icon: Activity, color: 'text-cyan-400' },
      { label: 'Mercati Attivi', value: activeMarkets, icon: TrophyIcon, color: 'text-emerald-400' }
    ];
  }, [markets]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
          <p className="text-cyan-500 font-black uppercase tracking-[0.2em] animate-pulse">Caricamento Mercati...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-[#0a0a0c] text-white selection:bg-cyan-500/30">
      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row items-start justify-between mb-8 gap-10">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4 mb-2">
              <div className="w-16 h-16 rounded-[2rem] bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                <Trophy className="text-white" size={32} strokeWidth={2.5} />
              </div>
              <div>
                <h1 className="text-5xl font-black italic tracking-tighter uppercase leading-none">Social <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">Betting</span></h1>
                <p className="text-gray-500 font-bold uppercase tracking-[0.3em] text-[10px] mt-2 flex items-center gap-2">
                  <Shield size={12} className="text-cyan-500" /> Scommesse Amichevoli del Manuale
                </p>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-4 md:gap-8">
              {totalStats.map((stat, idx) => (
                <div key={idx} className="flex items-center gap-6 my-2 animate-in fade-in slide-in-from-left duration-1000 delay-300">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">{stat.label}</span>
                    <div className="flex items-center gap-2">
                      <stat.icon className={clsx("w-4 h-4", stat.color)} />
                      <span className="text-2xl font-black tracking-tighter">{stat.value}</span>
                    </div>
                  </div>
                  {idx < totalStats.length - 1 && <div className="w-px h-8 bg-white/10" />}
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col items-end gap-4 w-full md:w-auto">
            <div className="bg-[#111218] border border-white/5 p-6 rounded-[2.5rem] shadow-2xl min-w-[280px] group transition-all hover:border-cyan-500/20">
              <div className="flex items-center justify-between mb-4">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-1">Il tuo Saldo</span>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-yellow-500/10 flex items-center justify-center border border-yellow-500/20">
                      <Coins className="text-yellow-500" size={20} />
                    </div>
                    <span className="text-4xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-400">{sheepBalance.toLocaleString()}</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-4 items-center">
                <div className="flex flex-col">
                   <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest mb-1">Top Scommettitori</span>
                   <div className="flex gap-1.5">
                    {allUsers.slice(0, 3).map((u, i) => (
                      <div key={u.username} className="flex items-center gap-2 bg-white/5 px-2 py-1 rounded-lg border border-white/5">
                        <span className="text-[9px] font-bold text-gray-400 uppercase">{i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"} {u.username.substring(0, 4)}</span>
                        <span className="text-[10px] font-black text-blue-400">{u.sheep_balance}</span>
                      </div>
                    ))}
                   </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Admin Market Creation Tools */}
        {canManageTournaments && showAdminTools && (
          <div className="mb-12 bg-[#111218] border border-cyan-500/30 rounded-3xl overflow-hidden shadow-[0_0_80px_rgba(6,182,212,0.15)] animate-in slide-in-from-top-4 duration-500">
            <div className="px-8 py-6 border-b border-white/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-cyan-500/10 via-transparent to-transparent">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 flex items-center justify-center border border-cyan-500/30">
                  <Zap className="text-cyan-400" size={24} fill="currentColor" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-white uppercase tracking-tighter leading-none">Console <span className="text-cyan-400">Admin</span></h2>
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">Gestione Mercati e Utenti</p>
                </div>
              </div>
              <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 w-full md:w-auto">
                {[
                  { id: 'create', label: 'Crea', icon: Plus },
                  { id: 'users', label: 'Utenti', icon: Users },
                  { id: 'bets', label: 'Log', icon: History }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setAdminTab(tab.id as any)}
                    className={clsx(
                      "flex-1 md:flex-none px-6 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2",
                      adminTab === tab.id ? "bg-cyan-500 text-black shadow-lg shadow-cyan-500/20" : "text-gray-500 hover:text-white hover:bg-white/5"
                    )}
                  >
                    <tab.icon size={14} /> {tab.label}
                  </button>
                ))}
                <button 
                  onClick={() => setShowAdminTools(false)}
                  className="ml-2 p-2.5 text-gray-500 hover:text-red-400 transition-all"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="p-8">
              {adminTab === 'create' && (
                <div className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                      <div className="flex bg-black/40 p-1.5 rounded-2xl border border-white/5">
                        {['Match Winner', 'Tournament Winner'].map(type => (
                          <button
                            key={type}
                            onClick={() => setAdminForm({...adminForm, type, options: (type === 'Match Winner' ? [{label: '', weight: 100}, {label: '', weight: 100}] : adminForm.options)})}
                            className={clsx(
                              "flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                              adminForm.type === type ? "bg-white/10 text-cyan-400 border border-cyan-500/30" : "text-gray-500 hover:text-white"
                            )}
                          >
                            {type === 'Match Winner' ? 'Vincitore Match' : 'Vincitore Torneo'}
                          </button>
                        ))}
                      </div>

                      <div className="space-y-6">
                        <div className="space-y-3">
                          <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Livello Torneo</label>
                          <div className="flex gap-2">
                            {['High Elo', 'Low Elo'].map(lvl => (
                              <button
                                key={lvl}
                                onClick={() => setAdminForm({...adminForm, eventLevel: lvl})}
                                className={clsx(
                                  "flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border",
                                  adminForm.eventLevel === lvl ? "bg-cyan-500/10 border-cyan-500/50 text-cyan-400" : "bg-white/5 border-white/5 text-gray-500"
                                )}
                              >
                                {lvl}
                              </button>
                            ))}
                          </div>
                        </div>

                        {adminForm.type === 'Match Winner' && (
                          <div className="grid grid-cols-1 gap-4">
                            <div className="space-y-2">
                              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Team A / Giocatore A</label>
                              <input
                                type="text"
                                value={adminForm.teamA}
                                onChange={(e) => setAdminForm({...adminForm, teamA: e.target.value})}
                                placeholder="Nome Team A..."
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-6 py-4 text-white placeholder:text-gray-700 outline-none focus:border-cyan-500/50 transition-all"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Team B / Giocatore B</label>
                              <input
                                type="text"
                                value={adminForm.teamB}
                                onChange={(e) => setAdminForm({...adminForm, teamB: e.target.value})}
                                placeholder="Nome Team B..."
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-6 py-4 text-white placeholder:text-gray-700 outline-none focus:border-cyan-500/50 transition-all"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Titolo Mercato (opzionale)</label>
                        <input
                          type="text"
                          value={adminForm.title}
                          onChange={(e) => setAdminForm({...adminForm, title: e.target.value})}
                          placeholder="es: Grande Finale Manuale"
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-6 py-4 text-white placeholder:text-gray-700 outline-none focus:border-cyan-500/50 transition-all"
                        />
                      </div>

                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Opzioni di Scommessa</label>
                        <div className="space-y-3">
                          {adminForm.type === 'Tournament Winner' && adminForm.options.map((opt, idx) => (
                            <div key={idx} className="flex gap-2">
                              <input
                                type="text"
                                value={opt.label}
                                onChange={(e) => {
                                  const newOpts = [...adminForm.options];
                                  newOpts[idx].label = e.target.value;
                                  setAdminForm({...adminForm, options: newOpts});
                                }}
                                placeholder={`Team ${idx + 1}...`}
                                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-6 py-4 text-white outline-none focus:border-cyan-500/50 transition-all"
                              />
                              <button 
                                onClick={() => {
                                  const newOpts = adminForm.options.filter((_, i) => i !== idx);
                                  setAdminForm({...adminForm, options: newOpts});
                                }}
                                className="p-4 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500/20 transition-all"
                              >
                                <Trash2 size={20} />
                              </button>
                            </div>
                          ))}
                          
                          {adminForm.type === 'Tournament Winner' && (
                            <button 
                              onClick={() => setAdminForm({...adminForm, options: [...adminForm.options, { label: '', weight: 100 }]})}
                              className="w-full py-4 border-2 border-dashed border-white/10 rounded-xl text-gray-500 hover:border-cyan-500/50 hover:text-cyan-500 transition-all text-[10px] font-black uppercase tracking-widest"
                            >
                              + Aggiungi Team
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <button 
                    onClick={handleCreateMarket}
                    disabled={(!adminForm.teamA && adminForm.type === 'Match Winner') || adminForm.options.some(o => !o.label && adminForm.type === 'Tournament Winner')}
                    className="w-full py-5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black uppercase tracking-[0.3em] text-xs rounded-2xl transition-all shadow-xl shadow-cyan-500/20 disabled:opacity-50 disabled:grayscale"
                  >
                    Crea Nuovo Mercato
                  </button>
                </div>
              )}

              {adminTab === 'users' && (
                <div className="space-y-6">
                  <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
                    <div className="relative w-full md:w-96">
                      <Filter size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                      <input
                        type="text"
                        value={searchUser}
                        onChange={(e) => setSearchUser(e.target.value)}
                        placeholder="Cerca pastore..."
                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-6 py-3 text-white text-sm outline-none"
                      />
                    </div>
                    <div className="flex items-center gap-4 bg-white/5 p-2 rounded-xl border border-white/10">
                      <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-2">Ammontare Rifornimento:</span>
                      <div className="flex gap-1">
                        {[500, 1000, 5000].map(amt => (
                          <button 
                            key={amt}
                            onClick={() => setRefillAmount(amt)}
                            className={clsx(
                              "px-3 py-1.5 rounded-lg text-[10px] font-black transition-all",
                              refillAmount === amt ? "bg-cyan-500 text-black" : "text-gray-500 hover:text-white"
                            )}
                          >
                            {amt}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="bg-black/40 border border-white/5 rounded-2xl overflow-hidden overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-white/10 bg-white/5">
                          <th className="px-6 py-4 text-[10px] font-black text-cyan-400 uppercase tracking-widest">Pastore</th>
                          <th className="px-6 py-4 text-[10px] font-black text-cyan-400 uppercase tracking-widest">Saldo Pecore</th>
                          <th className="px-6 py-4 text-[10px] font-black text-cyan-400 uppercase tracking-widest text-right">Azioni</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredUsers.map((u) => (
                          <tr key={u.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                                  <UserIcon size={14} className="text-gray-400" />
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-sm font-bold text-white">{u.username || 'Anonimo'}</span>
                                  <span className="text-[10px] text-gray-500">{u.email}</span>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <Coins size={14} className="text-yellow-500" />
                                <span className="text-lg font-black tracking-tighter">{(u.sheep_balance || 0).toLocaleString()}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button
                                onClick={() => handleRefill(u.id)}
                                disabled={isRefilling === u.id}
                                className="px-4 py-2 bg-white/10 hover:bg-cyan-500 hover:text-black text-white font-black uppercase text-[10px] tracking-widest rounded-lg transition-all flex items-center gap-2 ml-auto"
                              >
                                {isRefilling === u.id ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
                                Rifornisci
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {adminTab === 'bets' && (
                <div className="space-y-6">
                   <div className="bg-black/40 border border-white/5 rounded-2xl overflow-hidden overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-white/10 bg-white/5">
                          <th className="px-6 py-4 text-[10px] font-black text-cyan-400 uppercase tracking-widest">Utente</th>
                          <th className="px-6 py-4 text-[10px] font-black text-cyan-400 uppercase tracking-widest">Mercato</th>
                          <th className="px-6 py-4 text-[10px] font-black text-cyan-400 uppercase tracking-widest">Puntata</th>
                          <th className="px-6 py-4 text-[10px] font-black text-cyan-400 uppercase tracking-widest">Ammontare</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentBets.map((bet) => (
                          <tr key={bet.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                            <td className="px-6 py-4">
                              <span className="text-sm font-bold text-white">{bet.profiles?.username || 'Anonimo'}</span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-sm text-gray-400">{markets.find(m => m.id === bet.market_id)?.title || 'Mercato'}</span>
                            </td>
                            <td className="px-6 py-4">
                                <span className="px-3 py-1 bg-white/5 rounded-lg text-[10px] font-black text-white uppercase">{bet.option_label || 'Opzione'}</span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <Coins size={12} className="text-yellow-500" />
                                <span className="font-black text-cyan-400">{bet.amount}</span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 px-4 md:px-0">
          <div className="lg:col-span-12">
            {markets.length === 0 ? (
              <div className="bg-[#111218] p-12 rounded-[2.5rem] border border-slate-400/20 text-center flex flex-col items-center">
                <AlertCircle size={48} className="mb-4 text-gray-600" />
                <h3 className="text-xl font-bold text-white mb-6 uppercase tracking-tighter">Nessuna Scommessa Aperta</h3>
                {canManageTournaments && (
                  <button 
                    onClick={() => setShowAdminTools(true)}
                    className="px-8 py-4 bg-gradient-to-b from-slate-200 to-slate-400 hover:from-white hover:to-slate-300 text-slate-900 font-black uppercase tracking-[0.2em] rounded-2xl transition-all shadow-xl flex items-center gap-3 border border-white/20"
                  >
                    <Plus size={20} strokeWidth={3} /> Crea Mercato
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-2">
                   <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 w-full md:w-auto">
                    {[
                      { id: 'all', label: 'Tutti', icon: Filter },
                      { id: 'open', label: 'Aperte', icon: Clock },
                      { id: 'closed', label: 'Chiuse', icon: XCircle },
                      { id: 'high', label: 'High Elo', icon: TrophyIcon },
                      { id: 'low', label: 'Low Elo', icon: UserCheck }
                    ].map(cat => (
                      <button
                        key={cat.id}
                        onClick={() => setFilterCategory(cat.id as any)}
                        className={clsx(
                          "flex-1 md:flex-none px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2",
                          filterCategory === cat.id ? "bg-white/10 text-cyan-400 shadow-inner" : "text-gray-500 hover:text-white"
                        )}
                      >
                        <cat.icon size={12} /> {cat.label}
                      </button>
                    ))}
                  </div>
                  {canManageTournaments && !showAdminTools && (
                    <button 
                      onClick={() => setShowAdminTools(true)}
                      className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white font-black uppercase text-[10px] tracking-widest rounded-xl transition-all border border-white/5 flex items-center gap-2"
                    >
                      <Plus size={14} /> Nuovo Mercato
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {markets.filter(m => {
                    if (filterCategory === 'all') return true;
                    if (filterCategory === 'open') return m.status === 'open';
                    if (filterCategory === 'closed') return m.status !== 'open';
                    if (filterCategory === 'high') return m.event_level === 'High Elo';
                    if (filterCategory === 'low') return m.event_level === 'Low Elo';
                    if (filterCategory === 'tournament') return m.type === 'Tournament Winner';
                    return true;
                  }).map((market) => {
                    const isSelected = selectedBets[market.id];
                    return (
                      <div key={market.id} className="group bg-[#111218] border border-white/5 rounded-[2.5rem] overflow-hidden flex flex-col shadow-2xl transition-all hover:border-cyan-500/30 hover:shadow-cyan-500/5 relative">
                        <div className="absolute top-0 right-0 p-6 flex gap-2">
                          {canManageTournaments && (
                            <button 
                              onClick={() => setMarketToDelete(market.id)}
                              className="p-2 bg-red-500/10 text-red-500/50 hover:text-red-500 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>

                        <div className="p-8 pb-0">
                          <div className="flex items-center gap-2 mb-4">
                            <span className={clsx(
                              "px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest",
                              market.status === 'open' ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"
                            )}>
                              {market.status === 'open' ? 'Mercato Aperto' : 'Mercato Chiuso'}
                            </span>
                            {market.event_level && (
                              <span className="px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[8px] font-black uppercase tracking-widest">
                                {market.event_level}
                              </span>
                            )}
                          </div>

                          <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-2 group-hover:text-cyan-400 transition-colors">{market.title || (market.type === 'Match Winner' ? 'Winner' : 'Tournament')}</h3>
                          <p className="text-gray-500 text-xs font-medium line-clamp-2 mb-6">{market.description || 'Scommetti sul vincitore del torneo.'}</p>

                          <div className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-2xl mb-6">
                            <div className="flex flex-col">
                              <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest mb-1">Pecore Totali</span>
                              <div className="flex items-center gap-2 text-yellow-500">
                                <Coins size={14} />
                                <span className="text-xl font-black tracking-tighter">{market.total_sheep.toLocaleString()}</span>
                              </div>
                            </div>
                            <div className="h-8 w-px bg-white/5" />
                            <div className="flex flex-col items-end text-right">
                              <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest mb-1">Pastori</span>
                              <div className="flex items-center gap-2 text-cyan-400">
                                <Users size={14} />
                                <span className="text-xl font-black tracking-tighter">{market.total_bets}</span>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-3 mb-8">
                            {market.options.map((opt) => {
                              const isOptionSelected = selectedBets[market.id] === opt.id;
                              const isWinner = market.winning_option_id === opt.id;
                              
                              // Calculate odds based on pari-mutuel system
                              const totalPool = market.total_sheep;
                              const winningPool = opt.total_sheep;
                              const rawOdds = winningPool > 0 ? (totalPool / winningPool) : 2;
                              const odds = rawOdds.toFixed(2);

                              return (
                                <button
                                  key={opt.id}
                                  disabled={market.status !== 'open' || placingBet === market.id}
                                  onClick={() => {
                                    if (canManageTournaments && market.status !== 'open' && market.status !== 'settled') {
                                      setSettleConfirm({marketId: market.id, optionId: opt.id, label: opt.label});
                                    } else {
                                      setSelectedBets({ ...selectedBets, [market.id]: opt.id });
                                    }
                                  }}
                                  className={clsx(
                                    "w-full p-4 rounded-2xl border transition-all flex items-center justify-between relative overflow-hidden group/btn",
                                    isOptionSelected ? "bg-cyan-500 border-cyan-400 text-black shadow-lg shadow-cyan-500/20" : "bg-white/5 border-white/10 hover:border-white/20 text-white",
                                    isWinner && "ring-2 ring-emerald-500 bg-emerald-500/10 border-emerald-500 text-emerald-400 shadow-emerald-500/20",
                                    market.status !== 'open' && !isWinner && "opacity-50 grayscale",
                                    canManageTournaments && market.status === 'open' && "hover:border-red-500/50"
                                  )}
                                >
                                  <div className="flex items-center gap-3 relative z-10">
                                    <div className={clsx(
                                      "w-8 h-8 rounded-xl flex items-center justify-center transition-colors",
                                      isOptionSelected ? "bg-black/20" : "bg-white/5 border border-white/10"
                                    )}>
                                      {isWinner ? <TrophyIcon size={16} /> : <span className="text-[10px] font-black">{opt.label[0]}</span>}
                                    </div>
                                    <span className="text-xs font-black uppercase tracking-widest">{opt.label}</span>
                                  </div>
                                  <div className="flex flex-col items-end relative z-10">
                                    <span className="text-[8px] font-black opacity-40 uppercase tracking-widest">Quota</span>
                                    <span className="text-sm font-black italic">{odds}x</span>
                                  </div>
                                  {isOptionSelected && <div className="absolute inset-0 bg-white/10 animate-pulse" />}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {market.status === 'open' && isSelected && (
                          <div className="p-8 pt-0 bg-gradient-to-t from-cyan-500/5 to-transparent border-t border-white/5">
                            <div className="pt-6 space-y-4">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest">Importo Scommessa</span>
                                <div className="flex items-center gap-1 text-yellow-500">
                                  <Coins size={12} />
                                  <span className="text-xs font-black">{betAmounts[market.id] || 100}</span>
                                </div>
                              </div>
                              <input
                                type="range"
                                min="100"
                                max={Math.min(sheepBalance, 100000)}
                                step="100"
                                value={betAmounts[market.id] || 100}
                                onChange={(e) => setBetAmounts({ ...betAmounts, [market.id]: parseInt(e.target.value) })}
                                className="w-full h-1.5 bg-white/5 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                              />
                              <div className="flex gap-2">
                                {[100, 500, 1000, 5000].map(amt => (
                                  <button
                                    key={amt}
                                    onClick={() => setBetAmounts({ ...betAmounts, [market.id]: amt })}
                                    className={clsx(
                                      "flex-1 py-2 rounded-xl text-[10px] font-black transition-all border",
                                      (betAmounts[market.id] || 100) === amt ? "bg-white/10 border-white/20 text-white" : "bg-white/[0.02] border-white/5 text-gray-500 hover:border-white/10"
                                    )}
                                  >
                                    {amt}
                                  </button>
                                ))}
                              </div>
                              <button
                                onClick={() => handlePlaceBet(market.id)}
                                disabled={placingBet === market.id || (betAmounts[market.id] || 100) > sheepBalance}
                                className="w-full py-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black uppercase text-xs tracking-[0.2em] rounded-2xl transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-50 flex items-center justify-center gap-3"
                              >
                                {placingBet === market.id ? <Loader2 size={16} className="animate-spin" /> : <ArrowUpRight size={16} />}
                                Piazza Scommessa
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {marketToDelete && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-[#111218] border border-red-500/20 p-8 rounded-[2.5rem] max-w-md w-full shadow-[0_0_100px_rgba(239,68,68,0.1)] animate-in zoom-in-95 duration-300 text-center">
            <div className="w-20 h-20 bg-red-500/10 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-red-500/20">
              <Trash2 className="text-red-500" size={40} />
            </div>
            <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-4">Elimina Mercato?</h3>
            <p className="text-gray-400 text-sm font-medium leading-relaxed mb-8">Tutte le scommesse andranno perse.</p>
            <div className="flex gap-4">
              <button onClick={() => setMarketToDelete(null)} className="flex-1 py-4 bg-white/5 text-white font-black rounded-2xl">Annulla</button>
              <button onClick={executeDeleteMarket} className="flex-1 py-4 bg-red-600 text-white font-black rounded-2xl">Elimina</button>
            </div>
          </div>
        </div>
      )}

      {/* Settlement Confirmation Overlay */}
      {settleConfirm && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-[#111218] border border-emerald-500/20 p-8 rounded-[2.5rem] max-w-md w-full text-center">
            <div className="w-20 h-20 bg-emerald-500/10 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-emerald-500/20">
              <CheckCircle2 className="text-emerald-500" size={40} />
            </div>
            <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-4">Conferma Vincitore</h3>
            <p className="text-gray-400 text-sm mb-8">Hai selezionato <span className="text-emerald-400 font-black italic">{settleConfirm.label}</span> come vincitore.</p>
            <div className="flex flex-col gap-3">
              <button 
                onClick={() => handleSettleMarket(settleConfirm.marketId, settleConfirm.optionId)}
                className="w-full py-4 bg-emerald-600 text-white font-black uppercase rounded-2xl"
              >
                Conferma Vittoria
              </button>
              <button onClick={() => setSettleConfirm(null)} className="w-full py-4 bg-white/5 text-gray-400 font-black rounded-2xl">Annulla</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
