/* eslint-disable @typescript-eslint/no-explicit-any */
// Force build trigger - 2026-05-05 09:05
import { useState, useEffect } from 'react';
// Force deploy update for betting favoritism weights 🐑
import { useParams, useLocation, Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './AuthContext';
import { fetchTournament } from '../services/startgg';
import { Loader2, ArrowLeft, ArrowRight, Trophy, Users, AlertCircle, Plus, X, Zap, ChevronDown, Trash2, Edit2, Filter, Check } from 'lucide-react';
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
  event_level?: string;
}

interface LeaderboardUser {
  nickname: string;
  sheep_balance: number;
}

export function BettingPage() {
  const { slug } = useParams();
  const location = useLocation();
  const { user, isAuthenticated, canManageTournaments, setUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [tournament, setTournament] = useState<any>(null);
  const [sheepBalance, setSheepBalance] = useState(0);
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [selectedBets, setSelectedBets] = useState<{ [marketId: string]: { optionId: string, amount: number } }>({});
  const [myBets, setMyBets] = useState<any[]>([]);
  const [placingBetId, setPlacingBetId] = useState<string | null>(null);
  const [successBetId, setSuccessBetId] = useState<string | null>(null);
  const [showAdminTools, setShowAdminTools] = useState(false);
  const [publishStatus, setPublishStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [marketToDelete, setMarketToDelete] = useState<string | null>(null);
  const [settleConfirm, setSettleConfirm] = useState<{ marketId: string, optionId: string, optionLabel: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editingMarketId, setEditingMarketId] = useState<string | null>(null);
  const [participantsByLevel, setParticipantsByLevel] = useState<{ [level: string]: string[] }>({ 'High Elo': [], 'Low Elo': [] });
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [totalStats, setTotalStats] = useState({ count: 0, sheep: 0, pastori: 0 });
  const [filterCategory, setFilterCategory] = useState('all');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [adminForm, setAdminForm] = useState({
    title: '',
    description: '',
    type: 'Match Winner',
    eventLevel: 'High Elo',
    teamA: '',
    teamB: '',
    options: [{ label: '', weight: 100, is_disabled: false }] as any[]
  });

  const cleanSlug = (slug || '').split('?')[0].trim().replace(/\/$/, '');

  useEffect(() => {
    loadData();
    
    // Real-time subscription for automatic updates
    if (cleanSlug) {
      const channel = supabase
        .channel('betting_updates')
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'user_bets' 
        }, () => {
          loadData(true);
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [slug, user?.email]); // Re-run when slug or user changes to ensure correct balance loading
  
  // Sync local sheepBalance state whenever the AuthContext balance changes
  useEffect(() => {
    if (user?.sheep_balance !== undefined) {
      setSheepBalance(Number(user.sheep_balance));
    }
  }, [user?.sheep_balance]);

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
        const startggSlug = tourney?.slug || (window.location.pathname.includes('/tournament/') ? `tournament/${cleanSlug}` : cleanSlug);
        const startggData = await fetchTournament(startggSlug);
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

      let finalUserEmail = user?.email;
      if (!finalUserEmail) {
        try {
          const storedUser = localStorage.getItem('auth_user');
          if (storedUser) finalUserEmail = JSON.parse(storedUser).email;
        } catch (e) { /* ignore */ }
      }
      
      if (finalUserEmail) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('sheep_balance')
          .ilike('email', finalUserEmail)
          .maybeSingle();

        if (profile) {
          setSheepBalance(Number(profile.sheep_balance ?? 0));
        }
      }

      // Calculate Total Stats & Tournament Leaderboard
      if (marketData && marketData.length > 0) {
        const totalSheep = marketData.reduce((acc, m) => 
          acc + (m.options?.reduce((sum: number, opt: any) => sum + (Number(opt.total_bet) || 0), 0) || 0)
        , 0);

        const marketIds = marketData.map(m => m.id);
        const { data: tourneyBets } = await supabase
          .from('user_bets')
          .select('user_email, amount, payout, status, option_id, market_id')
          .in('market_id', marketIds);

        if (tourneyBets) {
          if (finalUserEmail) {
            const userEmailLower = finalUserEmail.toLowerCase();
            const myBetsData = tourneyBets.filter(b => b.user_email.toLowerCase() === userEmailLower);
            setMyBets(myBetsData);
          } else {
            setMyBets([]);
          }
          const pastoriCount = new Set(tourneyBets.map(u => u.user_email)).size;
          setTotalStats({ count: tourneyBets.length, sheep: totalSheep, pastori: pastoriCount });

          // Calcola vincite del torneo
          const winningsByEmail: Record<string, number> = {};
          tourneyBets.forEach(bet => {
            if (bet.status === 'won') {
              const winAmount = Number(bet.payout) || 0;
              const profit = winAmount - (Number(bet.amount) || 0);
              if (profit > 0) {
                winningsByEmail[bet.user_email] = (winningsByEmail[bet.user_email] || 0) + profit;
              }
            }
          });

          const sortedEmails = Object.entries(winningsByEmail)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);

          if (sortedEmails.length > 0) {
            const { data: profiles } = await supabase
              .from('profiles')
              .select('email, nickname')
              .in('email', sortedEmails.map(e => e[0]));
            
            const newLeaderboard = sortedEmails.map(([email, profit]) => {
              const prof = profiles?.find(p => p.email === email);
              return {
                nickname: prof?.nickname || 'Anonimo',
                sheep_balance: profit
              };
            });
            setLeaderboard(newLeaderboard);
          } else {
            setLeaderboard([]);
          }
        }
      } else {
        setTotalStats({ count: 0, sheep: 0, pastori: 0 });
        setLeaderboard([]);
      }
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

      // Fetch latest balance from server to be sure
      const { data: profile } = await supabase
        .from('profiles')
        .select('sheep_balance')
        .ilike('email', finalUserEmail)
        .maybeSingle();
      
      const currentBalance = Number(profile?.sheep_balance ?? 0);
      setSheepBalance(currentBalance); // Sync local state

      if (Number(bet.amount) > currentBalance) {
        toast.error(`Il tuo gregge non è abbastanza grande! Hai solo ${currentBalance} pecore.`);
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

  // Market status management is now handled inline in the render logic or via Edit modal
  
  const calculateOdds = (options: any[], optionId: string) => {
    // 1. Total Real Money in the pool (all teams)
    const totalRealBets = options.reduce((sum, opt) => sum + (Number(opt.total_bet) || 0), 0);
    
    // 2. Total Virtual Weights only for ACTIVE teams
    const totalActiveWeights = options.reduce((sum, opt) => {
      if (opt.is_disabled) return sum;
      return sum + (Number(opt.initial_weight) || 100);
    }, 0);
    
    const totalPool = totalRealBets + totalActiveWeights;

    const option = options.find(o => o.id === optionId);
    if (!option || option.is_disabled) return '---';

    const optionRealBets = Number(option.total_bet) || 0;
    const optionWeight = Number(option.initial_weight) || 100;
    const optionTotal = optionRealBets + optionWeight;

    if (optionTotal <= 0) return '---';
    
    const rawOdds = totalPool / optionTotal;
    // Cap at 1.01 to avoid odds lower than 1
    return Math.max(1.01, rawOdds).toFixed(2);
  };

  const handleSettleMarket = async (marketId: string, winnerOptionId: string) => {
    try {
      const marketToSettle = markets.find(m => m.id === marketId);
      const winnerOption = marketToSettle?.options.find((o: any) => o.id === winnerOptionId);
      const winnerName = winnerOption?.label;

      const { error } = await supabase.rpc('settle_betting_market', {
        p_market_id: marketId,
        p_winner_option_id: winnerOptionId
      });
      if (error) throw error;
      toast.success('Mercato liquidato e vincite assegnate!');
      setSettleConfirm(null);

      // AUTO-UPDATE TOURNAMENT WINNER WEIGHTS
      if (marketToSettle?.type === 'Match Winner' && winnerName) {
        const tourneyWinnerMarket = markets.find(m => m.type === 'Tournament Winner');
        if (tourneyWinnerMarket) {
          const updatedOptions = tourneyWinnerMarket.options.map((opt: any) => {
            // If this team is the one who just won the match, promote its weight
            if (winnerName.includes(opt.label) || opt.label.includes(winnerName)) {
              let newWeight = Number(opt.initial_weight);
              if (newWeight <= 500) newWeight = 1000;
              else if (newWeight <= 1000) newWeight = 2000;
              else if (newWeight <= 2000) newWeight = 5000;
              else if (newWeight <= 5000) newWeight = 15000;
              
              return { ...opt, initial_weight: newWeight };
            }
            return opt;
          });

          await supabase
            .from('betting_markets')
            .update({ options: updatedOptions })
            .eq('id', tourneyWinnerMarket.id);
            
          toast(`Quote Vincitore Torneo aggiornate per ${winnerName}`, { icon: '📈' });
        }
      }
      
      await loadData(false);
      
      if (user?.email) {
        const { data: p } = await supabase.from('profiles').select('sheep_balance').ilike('email', user.email).maybeSingle();
        if (p) setUser({ ...user, sheep_balance: p.sheep_balance });
      }
    } catch (err: any) {
      toast.error(`Errore: ${err.message}`);
    }
  };




  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <Loader2 className="w-12 h-12 text-blue-400 animate-spin" />
      <p className="text-gray-400 font-serif italic">Caricamento mercato delle pecore...</p>
    </div>
  );

  const hasIntegratedBracket = tournament && tournament.source === 'startgg' && (
    tournament.slug?.startsWith('tournament/') || 
    !tournament.direct_link || 
    tournament.direct_link.includes('start.gg')
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 md:py-12 animate-in fade-in duration-700">
      <div className="flex justify-between items-start mb-6 w-full gap-4 px-4 md:px-0">
        {/* Left Side */}
        <div className="flex flex-col gap-3">
          <Link 
            to="/tornei"
            className="flex items-center gap-2 text-gray-200 hover:text-white transition-all duration-300 ease-in-out hover:translate-x-[2px] group text-sm uppercase tracking-widest font-bold hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]"
          >
            <ArrowLeft size={16} className="transition-transform duration-300 ease-in-out group-hover:-translate-x-[2px]" /> Torna ai Tornei
          </Link>
        </div>

        {/* Right Side */}
        <div className="flex flex-col items-end gap-3 text-right">
          {hasIntegratedBracket ? (
            <Link 
              to={`/tornei/${window.location.pathname.includes('/tournament/') ? `tournament/${slug}` : slug}${location.search}`}
              className="flex items-center gap-2 text-gray-200 hover:text-white transition-all duration-300 ease-in-out hover:translate-x-[2px] group text-sm uppercase tracking-widest font-bold hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]"
            >
              <ArrowRight size={16} className="transition-transform duration-300 ease-in-out group-hover:translate-x-[2px]" /> Vai al tabellone
            </Link>
          ) : (
            tournament?.direct_link && (
              <a 
                href={tournament.direct_link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-gray-200 hover:text-white transition-all duration-300 ease-in-out hover:translate-x-[2px] group text-sm uppercase tracking-widest font-bold hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]"
              >
                <ArrowRight size={16} className="transition-transform duration-300 ease-in-out group-hover:translate-x-[2px]" /> Vai al tabellone
              </a>
            )
          )}

          {tournament?.vods && tournament.vods.length > 0 && (
            <Link 
              to={`/tornei/${window.location.pathname.includes('/tournament/') ? `tournament/${slug}` : slug}/match${location.search}`}
              className="flex items-center gap-2 text-gray-200 hover:text-white transition-all duration-300 ease-in-out hover:translate-x-[2px] group text-sm uppercase tracking-widest font-bold hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]"
            >
              <ArrowRight size={16} className="transition-transform duration-300 ease-in-out group-hover:translate-x-[2px]" /> Vai ai VODs
            </Link>
          )}
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-start justify-between mb-8 gap-10 px-4 md:px-0">
        <div className="relative flex-1">
           <h1 className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-slate-300 via-white to-slate-400 uppercase tracking-tighter mb-4 leading-tight">
            Social Betting:<br/>
            {tournament?.name || (slug?.replace(/-/g, ' ')) || 'Torneo'}
           </h1>
            <div className="flex flex-col gap-4">
             <p className="text-slate-300/80 font-serif italic text-lg flex items-center gap-2">
              Il mercato delle pecore è aperto! 🐑
             </p>

             {/* Real-time Total Recap */}
             <div className="flex items-center gap-6 my-2 animate-in fade-in slide-in-from-left duration-1000 delay-300">
               <div className="flex flex-col">
                 <span className="text-[10px] font-black text-blue-400/60 uppercase tracking-[0.2em]">Puntate Totali</span>
                 <span className="text-xl font-black text-white tabular-nums">{totalStats.count}</span>
               </div>
               <div className="w-px h-8 bg-white/10" />
               <div className="flex flex-col">
                 <span className="text-[10px] font-black text-amber-400/60 uppercase tracking-[0.2em]">Pastori</span>
                 <span className="text-xl font-black text-white tabular-nums">{totalStats.pastori}</span>
               </div>
               <div className="w-px h-8 bg-white/10" />
               <div className="flex flex-col">
                 <span className="text-[10px] font-black text-emerald-400/60 uppercase tracking-[0.2em]">Pecore totali</span>
                 <span className="text-xl font-black text-white tabular-nums">{totalStats.sheep.toLocaleString()} 🐑</span>
               </div>
             </div>

              <div className="group relative w-full md:max-w-[320px] -ml-1">
                <div 
                  onClick={() => setShowDisclaimer(!showDisclaimer)}
                  className="w-full bg-[#111218]/90 border border-white/10 p-2.5 px-3 rounded-xl flex items-start gap-3 text-gray-500 text-[10px] font-bold uppercase tracking-widest cursor-pointer md:cursor-help backdrop-blur-sm transition-colors hover:border-white/20"
                >
                 <AlertCircle size={14} className="shrink-0 mt-0.5" />
                 <div className="flex flex-col w-full">
                   <span>Disclaimer</span>
                   <div className={clsx(
                     "overflow-hidden transition-all duration-500 ease-in-out opacity-0 group-hover:opacity-100 group-hover:max-h-[100px]",
                     showDisclaimer ? "max-h-[100px] opacity-100 mt-1.5" : "max-h-0"
                   )}>
                     <p className="text-[9px] text-gray-500 normal-case tracking-normal font-normal leading-relaxed">
                       Il sistema di Social Betting è un gioco di simulazione puramente gratuito. Non costituisce attività di gioco d'azzardo. Le "Pecore" sono punti virtuali privi di valore economico.
                     </p>
                   </div>
                 </div>
                </div>
              </div>

              {/* Real-time Filter Dropdown - Moved here for better proximity */}
              <div className="relative w-full md:max-w-[320px] mt-2 -ml-1">
                <button
                  onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                  className="w-full bg-[#111218]/80 backdrop-blur-xl border border-white/10 px-6 py-3 rounded-2xl flex items-center justify-between group transition-all hover:border-cyan-500/50 shadow-xl"
                >
                 <div className="flex items-center gap-3">
                   <Filter size={16} className="text-cyan-400" />
                   <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                     {filterCategory === 'all' ? 'Filtra Scommesse' :
                      filterCategory === 'open' ? 'Bet Aperte' :
                      filterCategory === 'closed' ? 'Bet Chiuse' :
                      filterCategory === 'high' ? 'High Elo' :
                      filterCategory === 'low' ? 'Low Elo' :
                      filterCategory === 'tournament' ? 'Vincitore Torneo' :
                      filterCategory === 'match' ? 'Vincitore Match' : 'Punteggio Finale'}
                   </span>
                 </div>
                 <ChevronDown size={16} className={clsx("text-gray-600 transition-transform duration-300", showFilterDropdown && "rotate-180")} />
               </button>

               {showFilterDropdown && (
                 <>
                   <div className="fixed inset-0 z-40" onClick={() => setShowFilterDropdown(false)} />
                   <div className="absolute top-full left-0 w-full mt-2 bg-[#111218] border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-[100] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                     {[
                       { id: 'all', label: 'Tutte le Scommesse' },
                       { id: 'high', label: 'High Elo' },
                       { id: 'low', label: 'Low Elo' },
                       { id: 'tournament', label: 'Vincitore Torneo' },
                       { id: 'match', label: 'Vincitore Match' },
                       { id: 'score', label: 'Punteggio Finale' },
                       { id: 'open', label: 'Bet Aperte' },
                       { id: 'closed', label: 'Bet Chiuse' }
                     ].map((opt) => (
                       <button
                         key={opt.id}
                         onClick={() => {
                           setFilterCategory(opt.id);
                           setShowFilterDropdown(false);
                         }}
                         className="w-full px-6 py-4 flex items-center justify-between hover:bg-white/5 transition-colors group"
                       >
                         <span className={clsx(
                           "text-[10px] font-bold uppercase tracking-widest transition-colors",
                           filterCategory === opt.id ? "text-cyan-400" : "text-gray-500 group-hover:text-white"
                         )}>
                           {opt.label}
                         </span>
                         {filterCategory === opt.id && <Check size={14} className="text-cyan-400" />}
                       </button>
                     ))}
                   </div>
                 </>
               )}
             </div>
           </div>
        </div>

        <div className="flex flex-col md:flex-row items-start gap-4 self-stretch md:self-start mt-4 md:mt-2">
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
            <div className="bg-[#111218]/80 backdrop-blur-md p-4 rounded-2xl border border-white/10 flex flex-col gap-3 transition-all hover:bg-[#1a1c25] group flex-[1.4] min-w-[280px]">
              <div className="flex items-center gap-2 shrink-0 pb-2 border-b border-white/5">
                <Users size={16} className="text-blue-400" />
                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Migliori Pastori</span>
              </div>
              <div className="flex flex-col gap-2">
                {leaderboard.length > 0 ? leaderboard.slice(0, 5).map((u, i) => (
                  <div key={i} className="flex items-center justify-between bg-white/5 px-3 py-2 rounded-lg border border-white/5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : <span className="text-[10px] text-gray-500 font-bold">{i + 1}°</span>}</span>
                      <span className="text-[10px] font-bold text-gray-300 uppercase">{u.nickname.substring(0, 15)}</span>
                    </div>
                    <span className="text-xs font-black text-blue-400">+{u.sheep_balance}</span>
                  </div>
                )) : (
                  <span className="text-[10px] text-gray-500 font-bold uppercase py-2 text-center">Nessuna vincita ancora registrata</span>
                )}
              </div>
            </div>
        </div>
      </div>

      {/* Admin Market Creation Tools */}
      {canManageTournaments && showAdminTools && (
        <div className="mb-12 bg-[#111218] border border-cyan-500/30 rounded-3xl overflow-hidden shadow-[0_0_80px_rgba(6,182,212,0.15)] animate-in slide-in-from-top-4 duration-500 px-4 md:px-0">
          <div className="px-8 py-6 border-b border-white/5 flex justify-between items-center bg-gradient-to-r from-cyan-500/10 via-transparent to-transparent">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 flex items-center justify-center border border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.2)]">
                <Zap className="text-cyan-400" size={24} fill="currentColor" />
              </div>
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black text-white uppercase tracking-tighter">
                  {editingMarketId ? 'Modifica Scommessa' : 'Nuova Scommessa'}
                </h2>
                <button onClick={() => {
                  setShowAdminTools(false);
                  setEditingMarketId(null);
                  setAdminForm({
                    title: '',
                    description: '',
                    type: 'Match Winner',
                    eventLevel: 'High Elo',
                    teamA: '',
                    teamB: '',
                    options: [{ label: '', weight: 100 }]
                  });
                }} className="text-gray-500 hover:text-white transition-colors ml-4">
                  <X size={24} />
                </button>
              </div>
            </div>
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
                        let newOpts = [{ label: '', weight: 100 }, { label: '', weight: 100 }];
                        if (type === 'Tournament Winner') newOpts = [{ label: 'Team 1', weight: 100 }, { label: 'Team 2', weight: 100 }, { label: 'Team 3', weight: 100 }];
                        setAdminForm({...adminForm, type, options: (newOpts as any)});
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
                      <div className="grid grid-cols-1 gap-4">
                        {[
                          { key: 'teamA', label: adminForm.teamA || 'Team A' },
                          { key: 'teamB', label: adminForm.teamB || 'Team B' }
                        ].map((team, i) => (
                          <div key={i} className="bg-cyan-500/5 border border-cyan-500/20 rounded-xl p-4">
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-xs font-black text-white uppercase tracking-tight">{team.label}</span>
                              <span className="text-[10px] font-bold text-cyan-400/60 uppercase">Peso Iniziale</span>
                            </div>
                            <div className="flex gap-2">
                              {[
                                { l: 'Under', v: 50 },
                                { l: 'Sfav.', v: 100 },
                                { l: 'Eq.', v: 250 },
                                { l: 'Fav.', v: 1000 },
                                { l: 'Top', v: 2500 }
                              ].map(w => (
                                <button
                                  key={w.v}
                                  type="button"
                                  onClick={() => {
                                    const newOpts = [...adminForm.options];
                                    newOpts[i] = { ...newOpts[i], weight: w.v };
                                    setAdminForm({ ...adminForm, options: newOpts });
                                  }}
                                  className={clsx(
                                    "flex-1 py-2 rounded-lg text-[9px] font-black uppercase transition-all border",
                                    adminForm.options[i]?.weight === w.v 
                                      ? "bg-cyan-500 border-cyan-400 text-black shadow-lg" 
                                      : "bg-white/5 border-white/10 text-gray-500 hover:border-white/20"
                                  )}
                                >
                                  {w.l}
                                </button>
                              ))}
                            </div>
                            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/5">
                               <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest flex-1">Status Opzione:</label>
                               <button
                                 onClick={() => {
                                   const newOpts = [...adminForm.options];
                                   newOpts[i] = { ...newOpts[i], is_disabled: !newOpts[i]?.is_disabled };
                                   setAdminForm({ ...adminForm, options: newOpts });
                                 }}
                                 className={clsx(
                                   "px-3 py-1.5 rounded-lg text-[8px] font-black uppercase transition-all border",
                                   adminForm.options[i]?.is_disabled 
                                     ? "bg-red-500/20 border-red-500 text-red-400" 
                                     : "bg-emerald-500/20 border-emerald-500 text-emerald-400"
                                 )}
                               >
                                 {adminForm.options[i]?.is_disabled ? 'Eliminato / Disabilitato' : 'Attivo'}
                               </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : adminForm.type === 'Final Score' ? (
                      <div className="space-y-6">
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                          {['2-0', '2-1', '1-2', '0-2', '3-0', '3-1', '3-2', '2-3', '1-3', '0-3'].map((score) => {
                            const label = `${score} (${adminForm.teamA || 'A'} vs ${adminForm.teamB || 'B'})`;
                            const isSelected = adminForm.options.some(o => o.label === label);
                            return (
                              <button
                                key={score}
                                type="button"
                                onClick={() => {
                                  if (isSelected) {
                                    setAdminForm({...adminForm, options: adminForm.options.filter(o => o.label !== label)});
                                  } else {
                                    setAdminForm({...adminForm, options: [...adminForm.options.filter(o => o.label !== ''), { label, weight: 1000 }]});
                                  }
                                }}
                                className={clsx(
                                  "py-2 border rounded-lg text-[9px] font-black uppercase transition-all",
                                  isSelected 
                                    ? "bg-cyan-500 border-cyan-400 text-black" 
                                    : "bg-white/5 border-white/10 text-white/40 hover:text-white"
                                )}
                              >
                                {score}
                              </button>
                            );
                          })}
                        </div>
                        
                        <div className="space-y-3 pt-4 border-t border-white/5">
                          {adminForm.options.map((opt, idx) => (
                            <div key={idx} className="bg-white/[0.02] border border-white/5 rounded-xl p-3 flex flex-col gap-3">
                              <div className="flex justify-between items-center">
                                <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest">{opt.label.split(' (')[0]}</span>
                                <button 
                                  onClick={() => setAdminForm({...adminForm, options: adminForm.options.filter((_, i) => i !== idx)})}
                                  className="text-red-500/50 hover:text-red-500"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="flex flex-1 gap-1">
                                  {[500, 1000, 2000, 5000, 15000].map(v => (
                                    <button
                                      key={v}
                                      type="button"
                                      onClick={() => {
                                        const newOpts = [...adminForm.options];
                                        newOpts[idx] = { ...newOpts[idx], weight: v };
                                        setAdminForm({ ...adminForm, options: newOpts });
                                      }}
                                      className={clsx(
                                        "flex-1 py-2 rounded-lg transition-all border",
                                        opt.weight === v 
                                          ? "bg-cyan-500 border-cyan-400 text-black" 
                                          : "bg-white/5 border-white/10 text-gray-500"
                                      )}
                                    >
                                      <div className="flex flex-col items-center">
                                        <span className="text-[8px] font-black leading-none">{v === 500 ? 'U' : v === 1000 ? 'S' : v === 2000 ? 'E' : v === 5000 ? 'F' : 'T'}</span>
                                        <span className="text-[6px] opacity-40 font-bold mt-0.5">{v}</span>
                                      </div>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {adminForm.options.map((opt, idx) => (
                          <div key={idx} className="bg-white/[0.02] border border-white/5 rounded-xl p-3 space-y-3">
                            <div className="flex gap-2">
                              <div className="relative flex-grow">
                                <select 
                                  value={opt.label}
                                  onChange={(e) => {
                                    const newOpts = [...adminForm.options];
                                    newOpts[idx] = { ...newOpts[idx], label: e.target.value };
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
                            
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest whitespace-nowrap mr-2">Quota Iniziale:</span>
                              <div className="flex flex-1 gap-1">
                                {[500, 1000, 2000, 5000, 15000].map(v => (
                                  <button
                                    key={v}
                                    type="button"
                                    onClick={() => {
                                      const newOpts = [...adminForm.options];
                                      newOpts[idx] = { ...newOpts[idx], weight: v };
                                      setAdminForm({ ...adminForm, options: newOpts });
                                    }}
                                    className={clsx(
                                      "flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all border shadow-sm",
                                      opt.weight === v 
                                        ? "bg-cyan-500 border-cyan-400 text-black shadow-cyan-500/20" 
                                        : "bg-white/5 border-white/10 text-gray-400 hover:border-white/30"
                                    )}
                                  >
                                    <div className="flex flex-col items-center gap-1">
                                      <span className="text-xs font-black tracking-tight">{v === 500 ? 'Under' : v === 1000 ? 'Sfav.' : v === 2000 ? 'Eq.' : v === 5000 ? 'Fav.' : 'Top'}</span>
                                      <span className="text-[10px] font-bold opacity-40">{v}</span>
                                    </div>
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/5">
                               <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest flex-1">Status Opzione:</label>
                               <button
                                 onClick={() => {
                                   const newOpts = [...adminForm.options];
                                   newOpts[idx] = { ...newOpts[idx], is_disabled: !newOpts[idx]?.is_disabled };
                                   setAdminForm({ ...adminForm, options: newOpts });
                                 }}
                                 className={clsx(
                                   "px-3 py-1.5 rounded-lg text-[8px] font-black uppercase transition-all border",
                                   adminForm.options[idx]?.is_disabled 
                                     ? "bg-red-500/20 border-red-500 text-red-400" 
                                     : "bg-emerald-500/20 border-emerald-500 text-emerald-400"
                                 )}
                               >
                                 {adminForm.options[idx]?.is_disabled ? 'Eliminato / Disabilitato' : 'Attivo'}
                               </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {adminForm.type === 'Tournament Winner' && (
                      <button 
                        onClick={() => setAdminForm({...adminForm, options: [...adminForm.options, { label: '', weight: 100 }]})}
                        className="w-full py-3 border-2 border-dashed border-white/10 rounded-xl text-gray-500 hover:border-cyan-500/50 hover:text-cyan-500 transition-all text-[10px] font-black uppercase tracking-widest"
                      >
                        + Aggiungi Team
                      </button>
                    )}
                  </div>
                </div>

                <button 
                  onClick={async () => {
                    let finalOptions: any[] = adminForm.options;
                    if (adminForm.type === 'Match Winner') {
                      finalOptions = [
                        { label: adminForm.teamA || 'Team A', weight: adminForm.options[0]?.weight || 100, is_disabled: adminForm.options[0]?.is_disabled },
                        { label: adminForm.teamB || 'Team B', weight: adminForm.options[1]?.weight || 100, is_disabled: adminForm.options[1]?.is_disabled }
                      ];
                    }
                    
                    if (!adminForm.title || finalOptions.some(o => !o || (typeof o === 'string' ? !o : !o.label))) {
                      toast.error('Compila tutti i campi!');
                      return;
                    }
                    
                    setPublishStatus('loading');
                    try {
                      const optionsWithMeta = finalOptions.map((opt, idx) => {
                        // Preserve original ID if editing, otherwise generate new
                        const existingOpt = editingMarketId ? markets.find(m => m.id === editingMarketId)?.options[idx] : null;
                        
                        return {
                          id: (opt as any).id || existingOpt?.id || Math.random().toString(36).substring(2, 11),
                          label: typeof opt === 'string' ? opt : opt.label,
                          initial_weight: typeof opt === 'string' ? 100 : opt.weight,
                          is_disabled: (opt as any).is_disabled || false,
                          total_bet: (opt as any).total_bet || existingOpt?.total_bet || 0
                        };
                      });

                      const payload = {
                        tournament_slug: cleanSlug,
                        title: adminForm.title,
                        description: adminForm.description,
                        type: adminForm.type,
                        event_level: adminForm.eventLevel,
                        options: optionsWithMeta,
                        status: editingMarketId ? (markets.find(m => m.id === editingMarketId)?.status || 'open') : 'open'
                      };
                      
                      const { error } = editingMarketId 
                        ? await supabase.from('betting_markets').update(payload).eq('id', editingMarketId)
                        : await supabase.from('betting_markets').insert(payload);

                      if (error) throw error;
                      
                      setPublishStatus('success');
                      toast.success(editingMarketId ? 'Scommessa aggiornata!' : 'Scommessa pubblicata!');
                      await loadData(true);
                      
                      setTimeout(() => {
                        setShowAdminTools(false);
                        setEditingMarketId(null);
                        setAdminForm({
                          title: '',
                          description: '',
                          type: 'Match Winner',
                          eventLevel: 'High Elo',
                          teamA: '',
                          teamB: '',
                          options: [{ label: '', weight: 100 }, { label: '', weight: 100 }]
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
              {canManageTournaments && (
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
                {canManageTournaments && !showAdminTools && (
                  <div className="flex justify-end mb-4">
                    <button 
                      onClick={() => setShowAdminTools(true)}
                      className="w-full md:w-auto px-6 py-3.5 bg-gradient-to-b from-slate-200 to-slate-400 hover:from-white hover:to-slate-300 text-slate-900 font-black uppercase tracking-[0.2em] rounded-2xl transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 border border-white/20"
                    >
                      <Plus size={16} strokeWidth={3} /> Nuova Scommessa
                    </button>
                  </div>
                )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 -ml-1">
                {(() => {
                    const filtered = markets.filter(market => {
                      // Hide settled markets from the main view as they are visible in profile history
                      if (market.status === 'settled') return false;
                      
                      if (filterCategory === 'all') return true;
                      if (filterCategory === 'open') return market.status === 'open';
                      if (filterCategory === 'closed') return market.status === 'closed';
                      if (filterCategory === 'high') {
                        const titleLower = market.title.toLowerCase();
                        if (titleLower.includes('low')) return false;
                        if (titleLower.includes('high')) return true;
                        return market.event_level === 'High Elo';
                      }
                      if (filterCategory === 'low') {
                        const titleLower = market.title.toLowerCase();
                        if (titleLower.includes('high')) return false;
                        if (titleLower.includes('low')) return true;
                        return market.event_level === 'Low Elo';
                      }
                      if (filterCategory === 'tournament') return market.type === 'Tournament Winner';
                      if (filterCategory === 'match') return market.type === 'Match Winner';
                      if (filterCategory === 'score') return market.type === 'Final Score';
                      return true;
                    });

                  if (filtered.length === 0) {
                    return (
                      <div className="col-span-full py-20 text-center bg-white/5 rounded-[2.5rem] border border-dashed border-white/10">
                        <Filter size={40} className="mx-auto mb-4 text-gray-700" />
                        <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Nessuna scommessa trovata per questo filtro</p>
                      </div>
                    );
                  }

                  return filtered.map((market) => (
                <div key={market.id} className="bg-[#111218] rounded-[2.5rem] border border-slate-400/20 overflow-hidden group hover:border-slate-400/40 transition-all duration-500 shadow-2xl flex flex-col h-full">
                  {/* Market Header */}
                  <div className="p-6 md:p-8 bg-gradient-to-br from-[#1a1c25] to-[#111218] border-b border-white/5 min-h-[160px] md:min-h-[180px] flex flex-col">
                    <div className="flex flex-col gap-4 h-full">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] font-black text-cyan-400 uppercase tracking-[0.15em] shrink-0">{market.type}</span>
                          <div className={clsx(
                            "px-2.5 py-1 rounded-lg text-[9px] font-black uppercase border shrink-0",
                            market.status === 'open' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-red-500/10 border-red-500/20 text-red-400"
                          )}>
                             {market.status === 'open' ? 'Bet Aperta' : 'Bet Chiusa'}
                          </div>
                        </div>
                        
                        {canManageTournaments && (
                           <div className="flex items-center gap-2">
                             {market.status === 'open' ? (
                               <button 
                                 onClick={() => {
                                   supabase.from('betting_markets').update({ status: 'closed' }).eq('id', market.id).then(() => loadData(true));
                                 }}
                                 className="px-2.5 py-1 bg-red-500/10 text-red-500 border border-red-500/20 rounded-lg text-[9px] font-black uppercase hover:bg-red-500 transition-all hover:text-white"
                               >
                                 Chiudi
                               </button>
                             ) : market.winner_option_id === null && (
                               <button 
                                 onClick={() => {
                                   supabase.from('betting_markets').update({ status: 'open' }).eq('id', market.id).then(() => loadData(true));
                                 }}
                                 className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg text-[9px] font-black uppercase hover:bg-emerald-500 transition-all hover:text-white"
                               >
                                 Riapri
                               </button>
                             )}
                             <button
                               onClick={() => {
                                 window.scrollTo({ top: 0, behavior: 'smooth' });
                                 setEditingMarketId(market.id);
                                 setAdminForm({
                                   title: market.title,
                                   description: market.description || '',
                                   type: market.type,
                                   eventLevel: market.event_level || (market.title.toLowerCase().includes('high') ? 'High Elo' : market.title.toLowerCase().includes('low') ? 'Low Elo' : 'High Elo'),
                                   teamA: market.type === 'Match Winner' || market.type === 'Final Score' ? (market.options[0]?.label?.split(' (')[1]?.split(' vs ')[0] || market.options[0]?.label || '') : '',
                                   teamB: market.type === 'Match Winner' || market.type === 'Final Score' ? (market.options[0]?.label?.split(' vs ')[1]?.split(')')[0] || market.options[1]?.label || '') : '',
                                   options: market.options.map((o: any) => ({ 
                                     id: o.id,
                                     label: o.label, 
                                     weight: o.initial_weight || 100,
                                     is_disabled: o.is_disabled || false,
                                     total_bet: o.total_bet || 0
                                   }))
                                 });
                                 setShowAdminTools(true);
                               }}
                               className="text-cyan-400/60 hover:text-cyan-400 transition-all p-2.5 shrink-0 relative z-50 hover:scale-125 active:scale-90"
                               title="Modifica scommessa"
                             >
                               <Edit2 size={20} />
                             </button>
                             <button
                               onClick={() => setMarketToDelete(market.id)}
                               className="text-red-500/60 hover:text-red-400 transition-all p-2.5 shrink-0 relative z-50 hover:scale-125 active:scale-90"
                               title="Elimina scommessa"
                             >
                               <Trash2 size={20} />
                             </button>
                           </div>
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
                        
                        const myBetsOnOption = myBets.filter(b => b.market_id === market.id && b.option_id === opt.id && b.status !== 'cancelled');
                        const myTotalAmount = myBetsOnOption.reduce((sum, b) => sum + (Number(b.amount) || 0), 0);

                        return (
                          <div
                            key={opt.id}
                            role={market.status === 'open' && isAuthenticated && !opt.is_disabled ? 'button' : undefined}
                            onClick={() => {
                              if (market.status === 'open' && isAuthenticated && !opt.is_disabled) {
                                setSelectedBets({ ...selectedBets, [market.id]: { optionId: opt.id, amount: selectedBets[market.id]?.amount || 10 } });
                              }
                            }}
                            className={clsx(
                              "relative p-2.5 px-3 rounded-xl border transition-all duration-300 text-left group/opt overflow-hidden",
                              market.status === 'open' && isAuthenticated && !opt.is_disabled ? "cursor-pointer" : "opacity-70",
                              isSelected ? "bg-emerald-500/10 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.1)]" : 
                              isWinner ? "bg-emerald-600/20 border-emerald-500" :
                              opt.is_disabled ? "bg-red-500/5 border-red-500/20 grayscale" :
                              "bg-white/5 border-white/5 hover:border-white/10 hover:bg-white/[0.06]"
                            )}
                          >
                            {opt.is_disabled && (
                               <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-20 backdrop-blur-[1px]">
                                 <span className="bg-red-500 text-white text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-tighter">Eliminato / Disabilitato</span>
                               </div>
                             )}
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
                                  {myTotalAmount > 0 && (
                                    <div className="flex items-center gap-1.5 ml-3 pl-3 border-l border-white/10">
                                      <span className="text-[9px] font-bold text-emerald-400/80 uppercase tracking-widest">La tua puntata:</span>
                                      <div className="flex items-center gap-1">
                                        <span className="text-xs font-black text-emerald-400 leading-none">{myTotalAmount}</span>
                                        <span className="text-[10px] leading-none mb-0.5">🐑</span>
                                      </div>
                                    </div>
                                  )}
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
                                {canManageTournaments && market.status === 'closed' && !isWinner && market.winner_option_id === null && (
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
                                  setSelectedBets(prev => {
                                    const current = Number(prev[market.id]?.amount || 0);
                                    if (current <= 1) return prev;
                                    return { ...prev, [market.id]: { ...prev[market.id], amount: current - 1 } };
                                  });
                                }}
                                className="w-10 h-full flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/5 transition-all font-black text-xl"
                              >
                                -
                              </button>
                              <div className="flex-grow flex items-center justify-center gap-1.5 px-1">
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  pattern="[0-9]*"
                                  value={selectedBets[market.id].amount === 0 ? '' : selectedBets[market.id].amount}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    if (val === '') {
                                      setSelectedBets(prev => ({ ...prev, [market.id]: { ...prev[market.id], amount: 0 } }));
                                      return;
                                    }
                                    const parsed = parseInt(val.replace(/\D/g, ''));
                                    if (!isNaN(parsed)) {
                                      setSelectedBets(prev => ({ ...prev, [market.id]: { ...prev[market.id], amount: parsed } }));
                                    }
                                  }}
                                  className="w-16 bg-transparent text-center text-white font-black text-lg outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                />
                                <span className="text-sm">🐑</span>
                              </div>
                              <button 
                                onClick={() => {
                                  setSelectedBets(prev => {
                                    const current = Number(prev[market.id]?.amount || 0);
                                    // Removed restrictive sheepBalance check to ensure button always works; validation happens on submit
                                    return { ...prev, [market.id]: { ...prev[market.id], amount: current + 1 } };
                                  });
                                }}
                                className="w-10 h-full flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/5 transition-all font-black text-xl"
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
                ))})()}
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
