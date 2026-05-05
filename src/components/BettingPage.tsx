/* eslint-disable @typescript-eslint/no-explicit-any */
// Force build trigger - 2026-05-05 09:05
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './AuthContext';
import { fetchTournament } from '../services/startgg';
import { Loader2, ArrowLeft, Trophy, Users, AlertCircle, Plus, X, Zap, ChevronDown, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import clsx from 'clsx';

interface Market {
  id: string;
  tournament_slug: string;
  title: string;
  description: string;
  options: any[];
  status: string;
  winner_option_id: string;
  type: string;
}

interface LeaderboardUser {
  username: string;
  sheep_balance: number;
}

export function BettingPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated, isAdmin, setUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [tournament, setTournament] = useState<any>(null);
  const [sheepBalance, setSheepBalance] = useState(0);
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [selectedBets, setSelectedBets] = useState<{ [marketId: string]: { optionId: string, amount: number } }>({});
  const [placingBetId, setPlacingBetId] = useState<string | null>(null);
  const [successBetId, setSuccessBetId] = useState<string | null>(null);
  const [showAdminTools, setShowAdminTools] = useState(false);
  const [publishStatus, setPublishStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [marketToDelete, setMarketToDelete] = useState<string | null>(null);
  const [settleConfirm, setSettleConfirm] = useState<{ marketId: string, optionId: string, optionLabel: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [participantsByLevel, setParticipantsByLevel] = useState<{ [level: string]: string[] }>({ 'High Elo': [], 'Low Elo': [] });
  const [adminForm, setAdminForm] = useState({
    title: '',
    description: '',
    type: 'Match Winner',
    eventLevel: 'High Elo',
    teamA: '',
    teamB: '',
    options: ['', '']
  });

  const cleanSlug = (slug || '').split('?')[0].trim().replace(/\/$/, '');

  useEffect(() => {
    loadData();
  }, [slug]); // Don't trigger on user change to avoid balance-update loop

  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      // Load Tournament
      
      const { data: tourney } = await supabase
        .from('tournaments')
        .select('*')
        .or(`slug.eq.${cleanSlug},slug.ilike.${cleanSlug},slug.ilike.%${cleanSlug}%`)
        .maybeSingle();
        
      setTournament(tourney);

      // Fetch participants for admin tools
      try {
        const startggData = await fetchTournament(cleanSlug);
        if (startggData?.events) {
          const mapping: { [level: string]: string[] } = { 'High Elo': [], 'Low Elo': [] };
          startggData.events.forEach((e: any) => {
            const eventName = e.name.toLowerCase();
            let level = '';
            if (eventName.includes('high')) level = 'High Elo';
            else if (eventName.includes('low')) level = 'Low Elo';
            
            if (level && e.entrants?.nodes) {
              e.entrants.nodes.forEach((n: any) => {
                if (!mapping[level].includes(n.name)) mapping[level].push(n.name);
              });
            } else if (!level && e.entrants?.nodes) {
              // Fallback: if no level in name, add to both if empty or handle as generic
              e.entrants.nodes.forEach((n: any) => {
                if (!mapping['High Elo'].includes(n.name)) mapping['High Elo'].push(n.name);
                if (!mapping['Low Elo'].includes(n.name)) mapping['Low Elo'].push(n.name);
              });
            }
          });
          setParticipantsByLevel({
            'High Elo': mapping['High Elo'].sort(),
            'Low Elo': mapping['Low Elo'].sort()
          });
        }
      } catch (e) {
        console.warn("Could not fetch entrants for dropdowns", e);
      }

      // Load Markets
      console.log('🔍 Fetching markets for slug:', cleanSlug);
      const { data: marketData, error: marketError } = await supabase
        .from('betting_markets')
        .select('*')
        .or(`tournament_slug.eq.${cleanSlug},tournament_slug.eq.${cleanSlug}/,tournament_slug.ilike.%${cleanSlug}%`)
        .order('created_at', { ascending: true });
      
      if (marketError) console.error('❌ Error fetching markets:', marketError);
      console.log('📊 Markets found:', marketData?.length || 0, marketData);
      
      setMarkets(marketData || []);

      const finalUserEmail = user?.email || localStorage.getItem('auth_user_email');
      if (finalUserEmail) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('sheep_balance')
          .ilike('email', finalUserEmail)
          .maybeSingle();

        if (profile && (!silent || sheepBalance === 0)) {
          setSheepBalance(profile.sheep_balance ?? 0);
        }
      }

      // Load Leaderboard
      const { data: topPastors } = await supabase
        .from('profiles')
        .select('username, sheep_balance')
        .order('sheep_balance', { ascending: false })
        .limit(5);
      setLeaderboard(topPastors || []);

    } catch (err) {
      console.error('Error loading betting data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePlaceBet = async (marketId: string) => {
    const bet = selectedBets[marketId];
    if (!bet || !bet.optionId || bet.amount <= 0) {
      toast.error('Inserisci un ammontare valido di pecore!');
      return;
    }

    if (bet.amount > sheepBalance) {
      toast.error('Il tuo gregge non è abbastanza grande per questa scommessa!');
      return;
    }

    setPlacingBetId(marketId);
    try {
      // USE EMAIL IDENTIFICATION (Same as build order votes)
      const finalUserEmail = user?.email || localStorage.getItem('auth_user_email');

      if (!finalUserEmail) {
        const msg = "IDENTIFICAZIONE FALLITA! Per favore rifai il login.";
        toast.error(msg);
        setPlacingBetId(null);
        return;
      }

      const betData: any = {
        user_email: finalUserEmail,
        market_id: marketId,
        option_id: bet.optionId,
        amount: bet.amount
      };

      console.log('🎲 Placing bet for email:', finalUserEmail);
      console.log('🚀 Sending bet to Supabase...');
      
      const { error: insertError } = await supabase
        .from('user_bets')
        .insert(betData);

      if (insertError) throw insertError;
      
      // Update local balance immediately (optimistic update)
      const amountToDeduct = bet.amount;
      const newBalance = sheepBalance - amountToDeduct;
      setSheepBalance(newBalance);
      
      // Sync with global AuthContext immediately so Topbar updates
      if (user) {
        setUser({ ...user, sheep_balance: newBalance });
      }
      
      // Load other data (markets, leaderboard) but don't overwrite balance yet
      loadData(true);    

      setSuccessBetId(marketId);
      
      // Keep success message on button for 3 seconds
      setTimeout(() => setSuccessBetId(null), 3000);

      // Clear the input/selection area after 1.5s
      setTimeout(() => {
        setSelectedBets(prev => {
          const next = { ...prev };
          delete next[marketId];
          return next;
        });
      }, 1500);

    } catch (err: any) {
      console.error('❌ CRITICAL ERROR:', err);
      toast.error(`Errore critico: ${err.message}`);
    } finally {
      setPlacingBetId(null);
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
      toast.success('Scommessa eliminata con successo.');
      setMarketToDelete(null);
      loadData();
    } catch (err: any) {
      toast.error(`Errore durante l'eliminazione: ${err.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCloseMarket = async (id: string) => {
    try {
      const { error } = await supabase.from('betting_markets').update({ status: 'closed' }).eq('id', id);
      if (error) throw error;
      toast.success('Mercato chiuso con successo.');
      loadData(true);
    } catch (err: any) {
      toast.error(`Errore: ${err.message}`);
    }
  };

  const handleReopenMarket = async (id: string) => {
    try {
      const { error } = await supabase.from('betting_markets').update({ status: 'open' }).eq('id', id);
      if (error) throw error;
      toast.success('Mercato riaperto con successo.');
      loadData(true);
    } catch (err: any) {
      toast.error(`Errore: ${err.message}`);
    }
  };

  const handleSettleMarket = async (marketId: string, winnerOptionId: string) => {
    try {
      const { error } = await supabase.rpc('settle_betting_market', {
        p_market_id: marketId,
        p_winner_option_id: winnerOptionId
      });
      if (error) throw error;
      toast.success('Mercato liquidato e vincite assegnate!');
      setSettleConfirm(null);
      
      // Force a full data reload (not silent) to see the new balance 
      // and update the global context so the Topbar reflects winnings
      await loadData(false);
      
      // Update global context again just to be 100% sure the Topbar is in sync
       // Trigger notification badge update globally with a small delay for DB consistency
       setTimeout(() => {
         if ((window as any).refreshNotificationCount) {
           (window as any).refreshNotificationCount();
         }
       }, 1000);
    } catch (err: any) {
      toast.error(`Errore: ${err.message}`);
    }
  };


  const calculateOdds = (options: any[], optionId: string) => {
    const totalPool = options.reduce((sum, opt) => sum + (opt.total_bet || 0), 0);
    const optionPool = options.find(o => o.id === optionId)?.total_bet || 0;
    
    if (totalPool === 0 || optionPool === 0) return '---';
    
    // Totalizer odds: Total Pool / Selection Pool
    const odds = totalPool / optionPool;
    return odds.toFixed(2);
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <Loader2 className="w-12 h-12 text-blue-400 animate-spin" />
      <p className="text-gray-400 font-serif italic">Caricamento mercato delle pecore...</p>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 md:py-12 animate-in fade-in duration-700">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row items-start justify-between mb-12 gap-10 px-4 md:px-0">
        <div className="relative flex-1">
           <button 
            onClick={() => navigate('/tornei')}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-4 text-xs font-black uppercase tracking-widest"
           >
            <ArrowLeft size={16} /> Torna ai Tornei
           </button>
           <h1 className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-slate-300 via-white to-slate-400 uppercase tracking-tighter mb-4 leading-tight">
            Social Betting:<br/>
            {tournament?.name || (slug?.replace(/-/g, ' ')) || 'Torneo'}
           </h1>
            <div className="flex flex-col gap-4">
             <p className="text-slate-300/80 font-serif italic text-lg flex items-center gap-2">
              Il mercato delle pecore è aperto! 🐑
             </p>
             <div className="group relative max-w-[500px] -ml-0.5">
               <div className="bg-[#111218]/90 border border-white/10 p-2.5 px-3 rounded-xl flex items-start gap-3 text-gray-500 text-[10px] font-bold uppercase tracking-widest cursor-help backdrop-blur-sm">
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                <div className="flex flex-col">
                  <span>Disclaimer</span>
                  <div className="overflow-hidden transition-all duration-500 ease-in-out max-h-0 group-hover:max-h-[100px] opacity-0 group-hover:opacity-100">
                    <p className="text-[9px] text-gray-500 normal-case tracking-normal font-normal mt-1.5 leading-relaxed">
                      Il sistema di Social Betting è un gioco di simulazione puramente gratuito. Non costituisce attività di gioco d'azzardo. Le "Pecore" sono punti virtuali privi di valore economico.
                    </p>
                  </div>
                </div>
               </div>
             </div>
           </div>
        </div>

        <div className="flex flex-col md:flex-row items-stretch gap-4 self-stretch md:self-start mt-4 md:mt-10">
            {isAuthenticated && (
              <div className="bg-[#111218]/80 backdrop-blur-md px-6 h-14 rounded-2xl border border-white/10 flex items-center gap-3 transition-all hover:bg-[#1a1c25] group flex-1">
                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest whitespace-nowrap">Il Tuo Gregge:</span>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-black text-white">{sheepBalance}</span>
                  <span className="text-lg group-hover:animate-bounce">🐑</span>
                </div>
              </div>
            )}

            {/* Top Leaderboard */}
            <div className="bg-[#111218]/80 backdrop-blur-md px-6 h-14 rounded-2xl border border-white/10 flex items-center gap-6 transition-all hover:bg-[#1a1c25] group flex-[1.4]">
              <div className="flex items-center gap-2 shrink-0">
                <Users size={16} className="text-blue-400" />
                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Migliori Pastori</span>
              </div>
              <div className="flex gap-3">
                {leaderboard.slice(0, 3).map((u, i) => (
                  <div key={u.username} className="flex items-center gap-2 bg-white/5 px-2 py-1 rounded-lg border border-white/5">
                    <span className="text-[9px] font-bold text-gray-400 uppercase">{i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"} {u.username.substring(0, 4)}</span>
                    <span className="text-[10px] font-black text-blue-400">{u.sheep_balance}</span>
                  </div>
                ))}
              </div>
            </div>
        </div>
      </div>

      {/* Admin Market Creation Tools */}
      {isAdmin && showAdminTools && (
        <div className="mb-12 bg-[#111218] border border-cyan-500/30 rounded-3xl overflow-hidden shadow-[0_0_80px_rgba(6,182,212,0.15)] animate-in slide-in-from-top-4 duration-500 px-4 md:px-0">
          <div className="px-8 py-6 border-b border-white/5 flex justify-between items-center bg-gradient-to-r from-cyan-500/10 via-transparent to-transparent">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 flex items-center justify-center border border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.2)]">
                <Zap className="text-cyan-400" size={24} fill="currentColor" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-white tracking-tight uppercase">
                  Nuova Scommessa
                </h2>
                <p className="text-xs text-cyan-400/60 font-bold uppercase tracking-widest">{tournament?.name}</p>
              </div>
            </div>
            <button onClick={() => setShowAdminTools(false)} className="p-2 text-gray-400 hover:text-white transition-colors">
              <X size={24} />
            </button>
          </div>

          <div className="p-8 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div>
                  <label className="flex items-center gap-2 text-xs font-black text-cyan-400 uppercase tracking-[0.2em] mb-3">Tipo di Scommessa</label>
                  <div className="relative">
                    <select 
                      value={adminForm.type}
                      onChange={(e) => {
                        const type = e.target.value;
                        let newOpts = ['', ''];
                        if (type === 'Tournament Winner') newOpts = ['Team 1', 'Team 2', 'Team 3'];
                        setAdminForm({...adminForm, type, options: newOpts});
                      }}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white font-bold outline-none focus:border-cyan-500 transition-all appearance-none cursor-pointer"
                    >
                      <option value="Tournament Winner" className="bg-[#111218]">Vincitore Torneo</option>
                      <option value="Match Winner" className="bg-[#111218]">Vincitore Match</option>
                      <option value="Final Score" className="bg-[#111218]">Punteggio Finale Match</option>
                    </select>
                    <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 text-cyan-400 pointer-events-none" size={20} />
                  </div>
                </div>

                <div>
                  <label className="flex items-center gap-2 text-xs font-black text-cyan-400 uppercase tracking-[0.2em] mb-3">Livello Evento</label>
                  <div className="flex gap-2">
                    {['High Elo', 'Low Elo'].map(lvl => (
                      <button
                        key={lvl}
                        onClick={() => setAdminForm({...adminForm, eventLevel: lvl})}
                        className={clsx(
                          "flex-1 py-3 rounded-xl border transition-all font-black text-[10px] uppercase tracking-widest",
                          adminForm.eventLevel === lvl ? "bg-cyan-500 border-cyan-400 text-black shadow-[0_0_15px_rgba(6,182,212,0.3)]" : "bg-white/5 border-white/10 text-gray-500"
                        )}
                      >
                        {lvl}
                      </button>
                    ))}
                  </div>
                </div>

                {(adminForm.type === 'Match Winner' || adminForm.type === 'Final Score') && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase mb-2 block tracking-widest">Team A</label>
                        <div className="relative">
                          <select 
                            value={adminForm.teamA}
                            onChange={(e) => setAdminForm({...adminForm, teamA: e.target.value})}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-cyan-500 appearance-none cursor-pointer"
                          >
                            <option value="" className="bg-[#111218] text-white/50">Seleziona Team</option>
                            {(participantsByLevel[adminForm.eventLevel] || []).map(p => <option key={p} value={p} className="bg-[#111218]">{p}</option>)}
                          </select>
                          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-cyan-400/50 pointer-events-none" size={16} />
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase mb-2 block tracking-widest">Team B</label>
                        <div className="relative">
                          <select 
                            value={adminForm.teamB}
                            onChange={(e) => setAdminForm({...adminForm, teamB: e.target.value})}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-cyan-500 appearance-none cursor-pointer"
                          >
                            <option value="" className="bg-[#111218] text-white/50">Seleziona Team</option>
                            {(participantsByLevel[adminForm.eventLevel] || []).map(p => <option key={p} value={p} className="bg-[#111218]">{p}</option>)}
                          </select>
                          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-cyan-400/50 pointer-events-none" size={16} />
                        </div>
                      </div>
                    </div>
                  </>
                )}

                <div>
                  <label className="flex items-center gap-2 text-xs font-black text-cyan-400 uppercase tracking-[0.2em] mb-3">Titolo della Scommessa</label>
                  <input 
                    type="text" 
                    value={adminForm.title}
                    onChange={(e) => setAdminForm({...adminForm, title: e.target.value})}
                    placeholder="Esempio: Vincitore del Torneo"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white font-bold outline-none focus:border-cyan-500 transition-all placeholder:text-white/20"
                  />
                  <button 
                    onClick={() => {
                      let generated = "";
                      const prefix = `[${adminForm.eventLevel}] `;
                      if (adminForm.type === 'Match Winner') generated = `${prefix}${adminForm.teamA} vs ${adminForm.teamB}`;
                      else if (adminForm.type === 'Final Score') generated = `${prefix}Punteggio: ${adminForm.teamA} vs ${adminForm.teamB}`;
                      else generated = `${prefix}Vincitore Torneo: ${tournament?.name || (slug?.replace(/-/g, ' ')) || 'Torneo'}`;
                      setAdminForm({...adminForm, title: generated});
                    }}
                    className="mt-2 text-[9px] font-black text-cyan-400/60 uppercase tracking-widest hover:text-cyan-400 transition-colors"
                  >
                    Auto-genera Titolo
                  </button>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="flex items-center gap-2 text-xs font-black text-cyan-400 uppercase tracking-[0.2em] mb-3">Opzioni di Scommessa</label>
                  <div className="space-y-3">
                    {adminForm.type === 'Match Winner' ? (
                      <div className="grid grid-cols-2 gap-3">
                        {[adminForm.teamA || 'Team A', adminForm.teamB || 'Team B'].map((name, i) => (
                          <div key={i} className="p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-center text-cyan-400 font-black uppercase text-xs">
                            {name}
                          </div>
                        ))}
                      </div>
                    ) : adminForm.type === 'Final Score' ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {['2-0', '2-1', '1-2', '0-2', '3-0', '3-1', '3-2', '2-3', '1-3', '0-3'].map((score) => {
                          const isSelected = adminForm.options.some(o => o.startsWith(score));
                          return (
                            <button
                              key={score}
                              type="button"
                              onClick={() => {
                                const label = `${score} (${adminForm.teamA || 'A'} vs ${adminForm.teamB || 'B'})`;
                                if (isSelected) {
                                  setAdminForm({...adminForm, options: adminForm.options.filter(o => !o.startsWith(score))});
                                } else {
                                  setAdminForm({...adminForm, options: [...adminForm.options.filter(o => o !== ''), label]});
                                }
                              }}
                              className={clsx(
                                "p-3 border rounded-xl text-[10px] font-black uppercase transition-all",
                                isSelected 
                                  ? "bg-cyan-500 border-cyan-400 text-black shadow-[0_0_10px_rgba(6,182,212,0.3)]" 
                                  : "bg-white/5 border-white/10 text-white hover:border-cyan-500/50"
                              )}
                            >
                              {score}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      adminForm.options.map((opt, idx) => (
                        <div key={idx} className="flex gap-2">
                          <div className="relative flex-grow">
                            <select 
                              value={opt}
                              onChange={(e) => {
                                const newOpts = [...adminForm.options];
                                newOpts[idx] = e.target.value;
                                setAdminForm({...adminForm, options: newOpts});
                              }}
                              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-cyan-500 appearance-none cursor-pointer"
                            >
                               <option value="" className="bg-[#111218] text-white/50">Seleziona Team</option>
                              {(participantsByLevel[adminForm.eventLevel] || []).map(p => <option key={p} value={p} className="bg-[#111218]">{p}</option>)}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-cyan-400/50 pointer-events-none" size={16} />
                          </div>
                          {adminForm.options.length > 2 && (
                            <button 
                              onClick={() => setAdminForm({...adminForm, options: adminForm.options.filter((_, i) => i !== idx)})}
                              className="p-3 text-red-500 hover:bg-red-500/10 rounded-xl transition-colors"
                            >
                              <X size={20} />
                            </button>
                          )}
                        </div>
                      ))
                    )}
                    
                    {adminForm.type === 'Tournament Winner' && (
                      <button 
                        onClick={() => setAdminForm({...adminForm, options: [...adminForm.options, '']})}
                        className="w-full py-3 border-2 border-dashed border-white/10 rounded-xl text-gray-500 hover:border-cyan-500/50 hover:text-cyan-500 transition-all text-[10px] font-black uppercase tracking-widest"
                      >
                        + Aggiungi Team
                      </button>
                    )}
                  </div>
                </div>

                <button 
                  onClick={async () => {
                    let finalOptions = adminForm.options;
                    if (adminForm.type === 'Match Winner') {
                      finalOptions = [adminForm.teamA || 'Team A', adminForm.teamB || 'Team B'];
                    }
                    
                    if (!adminForm.title || finalOptions.some(o => !o)) {
                      toast.error('Compila tutti i campi!');
                      return;
                    }
                    
                    setPublishStatus('loading');
                    try {
                      const optionsWithMeta = finalOptions.map(label => ({
                        id: Math.random().toString(36).substring(2, 11),
                        label,
                        total_bet: 0
                      }));

                      const payload = {
                        tournament_slug: cleanSlug,
                        title: adminForm.title,
                        description: adminForm.description,
                        type: adminForm.type,
                        options: optionsWithMeta,
                        status: 'open'
                      };
                      
                      console.log('📝 Saving market with slug:', cleanSlug);
                      console.log('🚀 Final Betting Payload:', payload);

                      const { error } = await supabase
                        .from('betting_markets')
                        .insert(payload);

                      if (error) throw error;
                      
                      setPublishStatus('success');
                      toast.success('Scommessa pubblicata!');
                      await loadData(true);
                      
                      setTimeout(() => {
                        setShowAdminModal(false);
                        setAdminForm({
                          title: '',
                          description: '',
                          type: 'Match Winner',
                          eventLevel: 'High Elo',
                          teamA: '',
                          teamB: '',
                          options: ['', '']
                        });
                        setPublishStatus('idle');
                      }, 2000);
                    } catch (err: any) {
                      setPublishStatus('error');
                      toast.error(err.message);
                      setTimeout(() => setPublishStatus('idle'), 3000);
                    }
                  }}
                  disabled={publishStatus === 'loading' || publishStatus === 'success'}
                  className={clsx(
                    "w-full py-4 rounded-xl font-black text-xs uppercase tracking-[0.3em] transition-all duration-500 shadow-xl flex items-center justify-center gap-3",
                    publishStatus === 'success' ? "bg-green-500 text-black shadow-green-900/20" : 
                    "bg-cyan-500 hover:bg-cyan-400 text-black active:scale-[0.98]"
                  )}
                >
                  {publishStatus === 'loading' ? (
                    <><div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" /> INVIO...</>
                  ) : publishStatus === 'success' ? (
                    <>PUBBLICATA! ✅</>
                  ) : (
                    <>PUBBLICA SCOMMESSA</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 px-4 md:px-0">
        {/* Main Betting Area */}
        <div className="lg:col-span-12">
          {markets.length === 0 ? (
            <div className="bg-[#111218] p-12 rounded-[2.5rem] border border-slate-400/20 text-center flex flex-col items-center">
              <AlertCircle size={48} className="mb-4 text-gray-600" />
              <h3 className="text-xl font-bold text-white mb-6 uppercase tracking-tighter">Nessuna Scommessa Aperta</h3>
              {isAdmin && (
                <button 
                  onClick={() => setShowAdminTools(true)}
                  className="px-8 py-4 bg-gradient-to-b from-slate-200 to-slate-400 hover:from-white hover:to-slate-300 text-slate-900 font-black uppercase tracking-[0.2em] rounded-2xl transition-all shadow-xl active:scale-95 flex items-center gap-3 border border-white/20"
                >
                  <Plus size={20} strokeWidth={3} /> Crea Mercato
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {isAdmin && !showAdminTools && (
                <div className="flex justify-end">
                  <button 
                    onClick={() => setShowAdminTools(true)}
                    className="px-6 py-3 bg-gradient-to-b from-slate-200 to-slate-400 hover:from-white hover:to-slate-300 text-slate-900 font-black uppercase tracking-[0.2em] rounded-xl transition-all shadow-lg active:scale-95 flex items-center gap-2 border border-white/20"
                  >
                    <Plus size={16} strokeWidth={3} /> Nuova Scommessa
                  </button>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {markets.map((market) => (
                <div key={market.id} className="bg-[#111218] rounded-[2.5rem] border border-slate-400/20 overflow-hidden group hover:border-slate-400/40 transition-all duration-500 shadow-2xl flex flex-col h-full">
                  {/* Market Header */}
                  <div className="p-6 md:p-8 bg-gradient-to-br from-[#1a1c25] to-[#111218] border-b border-white/5 min-h-[160px] md:min-h-[180px] flex flex-col">
                    <div className="flex flex-col gap-4 h-full">
                      <div className="flex items-center gap-2 flex-nowrap">
                        <span className="text-[10px] font-black text-cyan-400 uppercase tracking-[0.15em] shrink-0">{market.type}</span>
                        <div className={clsx(
                          "px-2.5 py-1 rounded-lg text-[9px] font-black uppercase border shrink-0",
                          market.status === 'open' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-red-500/10 border-red-500/20 text-red-400"
                        )}>
                          {market.status === 'open' ? 'Bet Aperta' : 'Bet Chiusa'}
                        </div>
                        {isAdmin && market.status === 'open' && (
                           <button 
                             onClick={() => handleCloseMarket(market.id)}
                             className="px-2.5 py-1 bg-red-500/10 text-red-500 border border-red-500/20 rounded-lg text-[9px] font-black uppercase hover:bg-red-500 transition-all hover:text-white shrink-0"
                           >
                             Chiudi Bet
                           </button>
                        )}
                        {isAdmin && market.status === 'closed' && market.winner_option_id === null && (
                           <button 
                             onClick={() => handleReopenMarket(market.id)}
                             className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg text-[9px] font-black uppercase hover:bg-emerald-500 transition-all hover:text-white shrink-0"
                           >
                             Riapri Bet
                           </button>
                        )}
                        {isAdmin && (
                          <button
                            onClick={() => setMarketToDelete(market.id)}
                            className="text-red-500/60 hover:text-red-400 transition-colors p-1 shrink-0"
                            title="Elimina scommessa"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                      <div className="flex-grow flex flex-col justify-end mt-2">
                        <h3 className="text-xl md:text-2xl font-black text-white uppercase tracking-tighter leading-tight">{market.title}</h3>
                      </div>
                    </div>
                  </div>

                  {/* Options */}
                  <div className="p-4 md:p-5 space-y-3 flex-grow flex flex-col">
                    <div className="grid grid-cols-1 gap-2">
                      {market.options.map((opt: any) => {
                        const isSelected = selectedBets[market.id]?.optionId === opt.id;
                        const isWinner = market.winner_option_id === opt.id;
                        const odds = calculateOdds(market.options, opt.id);

                        return (
                          <div
                            key={opt.id}
                            role={market.status === 'open' && isAuthenticated ? 'button' : undefined}
                            onClick={() => {
                              if (market.status === 'open' && isAuthenticated) {
                                setSelectedBets({ ...selectedBets, [market.id]: { optionId: opt.id, amount: selectedBets[market.id]?.amount || 10 } });
                              }
                            }}
                            className={clsx(
                              "relative p-2.5 px-3 rounded-xl border transition-all duration-300 text-left group/opt overflow-hidden",
                              market.status === 'open' && isAuthenticated ? "cursor-pointer" : "",
                              isSelected ? "bg-emerald-500/10 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.1)]" : 
                              isWinner ? "bg-emerald-600/20 border-emerald-500" :
                              "bg-white/5 border-white/5 hover:border-white/10 hover:bg-white/[0.06]"
                            )}
                          >
                            <div className="flex justify-between items-center relative z-10">
                              <div className="flex flex-col min-w-0">
                                <span className={clsx(
                                  "text-sm font-black uppercase tracking-tight leading-none mb-1.5",
                                  isSelected ? "text-white" : "text-gray-200"
                                )}>
                                  {opt.label}
                                </span>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Pecore Puntate:</span>
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-xs font-black text-blue-400 leading-none">{opt.total_bet || 0}</span>
                                    <span className="text-[10px] leading-none mb-0.5">🐑</span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-3 shrink-0 ml-4">
                                <div className="flex flex-col items-end">
                                  <span className={clsx(
                                    "text-[9px] font-black uppercase tracking-widest mb-0.5",
                                    isSelected ? "text-blue-200" : "text-blue-400"
                                  )}>Quota</span>
                                  <span className={clsx(
                                    "text-xl font-black",
                                    isSelected ? "text-white" : "text-white"
                                  )}>{odds}</span>
                                </div>
                                {isAdmin && market.status === 'closed' && !isWinner && market.winner_option_id === null && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      e.preventDefault();
                                      setSettleConfirm({ 
                                        marketId: market.id, 
                                        optionId: opt.id, 
                                        optionLabel: opt.label 
                                      });
                                    }}
                                    className="px-2.5 py-1.5 bg-gradient-to-b from-slate-200 to-slate-400 text-slate-900 border border-white/30 rounded-lg text-[9px] font-black uppercase tracking-wider hover:from-white hover:to-slate-300 transition-all cursor-pointer whitespace-nowrap shadow-sm"
                                  >
                                    Vincitore
                                  </button>
                                )}
                              </div>
                            </div>
                            

                          </div>
                        );
                      })}
                    </div>

                    {/* Bet Input Area - INTEGRATED */}
                    {selectedBets[market.id] && market.status === 'open' && (
                      <div className="mt-auto pt-6 border-t border-white/5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="flex flex-col gap-3">
                          <div className="flex items-stretch gap-2">
                            <div className="flex-grow flex items-center bg-black/40 border border-white/10 rounded-xl overflow-hidden h-12">
                              <button 
                                onClick={() => {
                                  const current = selectedBets[market.id].amount;
                                  if (current > 1) setSelectedBets({ ...selectedBets, [market.id]: { ...selectedBets[market.id], amount: current - 1 } });
                                }}
                                className="w-10 h-full flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/5 transition-all font-black"
                              >
                                -
                              </button>
                              <div className="flex-grow flex items-center justify-center gap-1.5 px-1">
                                <input
                                  type="number"
                                  value={selectedBets[market.id].amount}
                                  onChange={(e) => {
                                    const val = parseInt(e.target.value) || 0;
                                    setSelectedBets({ ...selectedBets, [market.id]: { ...selectedBets[market.id], amount: val } });
                                  }}
                                  className="w-12 bg-transparent text-center text-white font-black text-lg outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                />
                                <span className="text-sm">🐑</span>
                              </div>
                              <button 
                                onClick={() => {
                                  const current = selectedBets[market.id].amount;
                                  if (current < sheepBalance) setSelectedBets({ ...selectedBets, [market.id]: { ...selectedBets[market.id], amount: current + 1 } });
                                }}
                                className="w-10 h-full flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/5 transition-all font-black"
                              >
                                +
                              </button>
                            </div>
                            
                            <button
                              type="button"
                              onClick={() => handlePlaceBet(market.id)}
                              disabled={placingBetId === market.id || successBetId === market.id}
                              className={clsx(
                                "px-6 font-black uppercase text-[10px] tracking-widest rounded-xl transition-all shadow-lg flex items-center justify-center min-w-[140px]",
                                successBetId === market.id 
                                  ? "bg-green-500 text-black shadow-green-900/40" 
                                  : "bg-emerald-500 text-black hover:bg-emerald-400 shadow-emerald-900/20 active:scale-95"
                              )}
                            >
                              {placingBetId === market.id ? (
                                <Loader2 size={16} className="animate-spin" />
                              ) : successBetId === market.id ? (
                                "BET INVIATA! ✅"
                              ) : (
                                "SCOMMETTI"
                              )}
                            </button>
                          </div>

                          <div className="flex justify-between items-center px-1">
                            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest">
                              <span className="text-gray-500">Vincita:</span>
                              <span className="text-emerald-400 font-black text-xs">
                                {(() => {
                                  const odds = calculateOdds(market.options, selectedBets[market.id].optionId);
                                  if (odds === '---') return '---';
                                  return Math.floor(selectedBets[market.id].amount * parseFloat(odds));
                                })()} 🐑
                              </span>
                            </div>
                            <button 
                              onClick={() => setSelectedBets(prev => {
                                const next = { ...prev };
                                delete next[market.id];
                                return next;
                              })}
                              className="text-[9px] font-black text-gray-600 hover:text-gray-400 uppercase tracking-widest underline underline-offset-4"
                            >
                              Annulla
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {!isAuthenticated && (
                      <div className="mt-auto pt-6 text-center">
                        <p className="text-yellow-500/50 text-[10px] font-black uppercase tracking-[0.15em] border border-yellow-500/10 py-3 rounded-xl bg-yellow-500/5">Effettua il login per scommettere</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>

      {/* Premium Delete Confirmation Modal */}
      {marketToDelete && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-[#111218] border border-red-500/20 p-8 rounded-[2.5rem] max-w-md w-full shadow-[0_0_100px_rgba(239,68,68,0.1)] animate-in zoom-in-95 duration-300 text-center">
            <div className="w-20 h-20 bg-red-500/10 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-red-500/20">
              <Trash2 className="text-red-500" size={40} />
            </div>
            <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-4">Elimina Scommessa?</h3>
            <p className="text-gray-400 text-sm font-medium leading-relaxed mb-8">
              Stai per rimuovere definitivamente questo mercato dal torneo. Tutte le puntate degli utenti verranno perse e l'azione non può essere annullata.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setMarketToDelete(null)}
                disabled={isDeleting}
                className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-white font-black uppercase text-xs tracking-widest rounded-2xl transition-all border border-white/5"
              >
                Annulla
              </button>
              <button
                onClick={executeDeleteMarket}
                disabled={isDeleting}
                className="flex-1 py-4 bg-red-600 hover:bg-red-500 text-white font-black uppercase text-xs tracking-widest rounded-2xl transition-all shadow-lg shadow-red-600/20 flex items-center justify-center gap-2"
              >
                {isDeleting ? <Loader2 size={16} className="animate-spin" /> : 'Sì, Elimina'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Premium Settlement Confirmation Overlay */}
      {settleConfirm && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={() => setSettleConfirm(null)} />
          <div className="relative bg-[#111218] border border-white/10 rounded-[2.5rem] p-8 md:p-12 max-w-lg w-full shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="flex flex-col items-center text-center space-y-6">
              <div className="w-20 h-20 bg-yellow-500/10 rounded-full flex items-center justify-center border border-yellow-500/20 shadow-[0_0_40px_rgba(234,179,8,0.1)]">
                <Trophy size={40} className="text-yellow-500" />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Conferma Vincitore</h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  Stai per dichiarare <span className="text-yellow-500 font-bold">"{settleConfirm.optionLabel}"</span> come vincitore. 
                  Tutte le scommesse su questa opzione verranno liquidate. L'azione è irreversibile.
                </p>
              </div>

              <div className="flex flex-col w-full gap-3 pt-4">
                <button
                  onClick={() => handleSettleMarket(settleConfirm.marketId, settleConfirm.optionId)}
                  className="w-full py-4 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-400 hover:to-yellow-500 text-black font-black uppercase tracking-widest rounded-2xl transition-all shadow-lg active:scale-95"
                >
                  Conferma Vittoria
                </button>
                <button
                  onClick={() => setSettleConfirm(null)}
                  className="w-full py-4 bg-white/5 hover:bg-white/10 text-gray-400 font-bold uppercase tracking-widest rounded-2xl transition-all border border-white/5"
                >
                  Annulla
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
