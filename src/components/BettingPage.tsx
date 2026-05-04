/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './AuthContext';
import { Loader2, ArrowLeft, Trophy, Users, TrendingUp, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { clsx } from 'clsx';

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
  const { user, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(true);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [tournament, setTournament] = useState<any>(null);
  const [sheepBalance, setSheepBalance] = useState(0);
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [selectedBets, setSelectedBets] = useState<{ [marketId: string]: { optionId: string, amount: number } }>({});
  const [placingBetId, setPlacingBetId] = useState<string | null>(null);
  const [myBets, setMyBets] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, [slug, user]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load Tournament
      const { data: tourney } = await supabase
        .from('tournaments')
        .select('*')
        .eq('slug', slug)
        .single();
      setTournament(tourney);

      // Load Markets
      const { data: marketData } = await supabase
        .from('betting_markets')
        .select('*')
        .eq('tournament_slug', slug)
        .order('created_at', { ascending: true });
      setMarkets(marketData || []);

      // Load Balance if auth
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('sheep_balance')
          .eq('id', user.id)
          .single();
        setSheepBalance(profile?.sheep_balance || 0);
      }

      // Load Leaderboard
      const { data: topPastors } = await supabase
        .from('profiles')
        .select('username, sheep_balance')
        .order('sheep_balance', { ascending: false })
        .limit(5);
      setLeaderboard(topPastors || []);

      // Load My Bets
      if (user && marketData && marketData.length > 0) {
        const { data: userBets } = await supabase
          .from('user_bets')
          .select('*')
          .in('market_id', marketData.map(m => m.id))
          .order('created_at', { ascending: false });
        setMyBets(userBets || []);
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

    if (bet.amount > sheepBalance) {
      toast.error('Il tuo gregge non è abbastanza grande per questa scommessa!');
      return;
    }

    setPlacingBetId(marketId);
    try {
      const { error } = await supabase
        .from('user_bets')
        .insert({
          user_id: user?.id,
          market_id: marketId,
          option_id: bet.optionId,
          amount: bet.amount
        });

      if (error) throw error;

      toast.success('I tuoi scout hanno portato le pecore al mercato!');
      loadData(); // Refresh balance and markets
      setSelectedBets(prev => {
        const next = { ...prev };
        delete next[marketId];
        return next;
      });
    } catch (err: any) {
      toast.error(`Errore nel piazzare la scommessa: ${err.message}`);
    } finally {
      setPlacingBetId(null);
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
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-12 gap-6">
        <div className="relative p-6 md:p-8">
           <div className="absolute inset-0 -z-10 bg-slate-800/40 backdrop-blur-xl rounded-[2rem] border border-white/5 shadow-2xl" />
           <button 
            onClick={() => navigate('/tornei')}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-4 text-xs font-black uppercase tracking-widest"
           >
            <ArrowLeft size={16} /> Torna ai Tornei
           </button>
           <h1 className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-slate-200 via-slate-400 to-slate-200 uppercase tracking-tighter mb-2">
            Social Betting: {tournament?.name || 'Torneo'}
           </h1>
           <p className="text-blue-400 font-serif italic text-lg flex items-center gap-2">
            Il mercato delle pecore è aperto 🐑
           </p>
        </div>

        {isAuthenticated && (
          <div className="glass p-6 rounded-3xl border-blue-500/20 shadow-[0_0_30px_rgba(59,130,246,0.1)] flex flex-col items-center gap-2 min-w-[200px]">
            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Il Tuo Gregge</span>
            <div className="flex items-center gap-3">
              <span className="text-4xl font-black text-white">{sheepBalance}</span>
              <span className="text-3xl">🐑</span>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Betting Area */}
        <div className="lg:col-span-2 space-y-8">
          {markets.length === 0 ? (
            <div className="glass p-12 rounded-[2.5rem] border-white/5 text-center">
              <AlertCircle size={48} className="mx-auto mb-4 text-gray-600" />
              <h3 className="text-xl font-bold text-white mb-2 uppercase tracking-tighter">Nessuna Scommessa Aperta</h3>
              <p className="text-gray-500 text-sm italic">Gli scout non hanno ancora identificato opportunità in questo torneo.</p>
            </div>
          ) : (
            markets.map((market) => (
              <div key={market.id} className="glass rounded-[2.5rem] overflow-hidden border border-white/10 hover:border-blue-500/30 transition-all duration-500 group shadow-2xl">
                {/* Market Header */}
                <div className="p-6 md:p-8 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-white/5">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] mb-2 block">{market.type}</span>
                      <h3 className="text-2xl font-black text-white uppercase tracking-tighter">{market.title}</h3>
                    </div>
                    <div className={clsx(
                      "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                      market.status === 'open' ? "bg-green-500/10 border-green-500/30 text-green-400" : "bg-red-500/10 border-red-500/30 text-red-400"
                    )}>
                      {market.status === 'open' ? 'Aperto' : 'Chiuso'}
                    </div>
                  </div>
                  {market.description && <p className="text-gray-400 text-sm font-medium italic">{market.description}</p>}
                </div>

                {/* Options */}
                <div className="p-6 md:p-8 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {market.options.map((opt: any) => {
                      const isSelected = selectedBets[market.id]?.optionId === opt.id;
                      const isWinner = market.winner_option_id === opt.id;
                      const odds = calculateOdds(market.options, opt.id);

                      return (
                        <button
                          key={opt.id}
                          disabled={market.status !== 'open' || !isAuthenticated}
                          onClick={() => setSelectedBets({ ...selectedBets, [market.id]: { optionId: opt.id, amount: selectedBets[market.id]?.amount || 10 } })}
                          className={clsx(
                            "relative p-6 rounded-2xl border transition-all duration-300 text-left group/opt overflow-hidden",
                            isSelected ? "bg-blue-600/20 border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.2)]" : 
                            isWinner ? "bg-green-600/20 border-green-500" :
                            "bg-white/5 border-white/5 hover:border-white/20 hover:bg-white/[0.08]"
                          )}
                        >
                          <div className="flex justify-between items-center relative z-10">
                            <div className="flex flex-col">
                              <span className={clsx(
                                "text-lg font-black uppercase tracking-tight",
                                isSelected ? "text-white" : "text-gray-300"
                              )}>
                                {opt.label}
                              </span>
                              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                                Puntata Totale: {opt.total_bet || 0} 🐑
                              </span>
                            </div>
                            <div className="flex flex-col items-end">
                              <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Quota</span>
                              <span className="text-2xl font-black text-white">{odds}</span>
                            </div>
                          </div>
                          
                          {/* Win Badge */}
                          {isWinner && (
                            <div className="absolute top-2 right-2">
                              <Trophy size={16} className="text-yellow-500" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Bet Input Area */}
                  {selectedBets[market.id] && market.status === 'open' && (
                    <div className="mt-8 p-6 bg-blue-600/10 border border-blue-500/20 rounded-3xl animate-in slide-in-from-top-4 duration-300">
                      <div className="flex flex-col md:flex-row items-center gap-6">
                        <div className="flex-grow w-full">
                          <label className="block text-[10px] font-black text-blue-400 uppercase tracking-widest mb-3">Quante pecore vuoi inviare?</label>
                          <div className="relative">
                            <input
                              type="number"
                              min="1"
                              max={sheepBalance}
                              value={selectedBets[market.id].amount}
                              onChange={(e) => setSelectedBets({ ...selectedBets, [market.id]: { ...selectedBets[market.id], amount: parseInt(e.target.value) || 0 } })}
                              className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-white font-black text-xl outline-none focus:border-blue-500 transition-all"
                            />
                            <span className="absolute right-6 top-1/2 -translate-y-1/2 text-2xl">🐑</span>
                          </div>
                        </div>
                        <button
                          onClick={() => handlePlaceBet(market.id)}
                          disabled={placingBetId === market.id}
                          className="w-full md:w-auto h-full px-10 py-5 bg-gradient-to-b from-blue-400 to-blue-600 text-white font-black uppercase tracking-widest rounded-2xl hover:brightness-110 active:scale-95 transition-all shadow-xl shadow-blue-900/20 flex items-center justify-center gap-3"
                        >
                          {placingBetId === market.id ? <Loader2 size={20} className="animate-spin" /> : 'Scommetti Ora'}
                        </button>
                      </div>
                      <p className="mt-4 text-[11px] text-gray-500 italic flex items-center gap-2">
                        <TrendingUp size={14} /> Possibile vincita stimata: {Math.floor(selectedBets[market.id].amount * parseFloat(calculateOdds(market.options, selectedBets[market.id].optionId) || '0'))} 🐑
                      </p>
                    </div>
                  )}

                  {!isAuthenticated && (
                    <div className="mt-6 text-center p-4 bg-yellow-500/5 border border-yellow-500/10 rounded-2xl">
                      <p className="text-yellow-500/80 text-xs font-bold uppercase tracking-widest">Effettua il login per iniziare a scommettere le tue pecore!</p>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Sidebar: Leaderboard & Rules */}
        <div className="space-y-8">
          {/* Disclaimer */}
          <div className="glass p-8 rounded-[2.5rem] border-red-500/20 bg-red-500/5">
            <h4 className="text-red-500 font-black uppercase tracking-tighter mb-4 flex items-center gap-2">
              <AlertCircle size={20} /> Avviso Importante
            </h4>
            <p className="text-gray-400 text-sm font-medium leading-relaxed">
              Questo è un sistema di social betting <strong>puramente ludico</strong>. Le "Pecore" non hanno alcun valore monetario reale e non possono essere scambiate con denaro. Il gioco è destinato esclusivamente all'intrattenimento della community.
            </p>
          </div>

          {/* My Bets Section */}
          {isAuthenticated && myBets.length > 0 && (
            <div className="glass p-8 rounded-[2.5rem] border-blue-500/20 bg-blue-500/5">
              <h4 className="text-blue-400 font-black uppercase tracking-tighter mb-6 flex items-center gap-3">
                <TrendingUp size={20} /> Le Tue Scommesse
              </h4>
              <div className="space-y-4">
                {myBets.map((bet) => {
                  const market = markets.find(m => m.id === bet.market_id);
                  const option = market?.options.find(o => o.id === bet.option_id);
                  
                  return (
                    <div key={bet.id} className="p-4 bg-black/40 border border-white/10 rounded-2xl">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{market?.title}</span>
                        <span className={clsx(
                          "text-[10px] font-black uppercase px-2 py-0.5 rounded",
                          bet.status === 'won' ? "bg-green-500/20 text-green-400" :
                          bet.status === 'lost' ? "bg-red-500/20 text-red-400" : "bg-blue-500/20 text-blue-400"
                        )}>
                          {bet.status === 'won' ? 'Vinta' : bet.status === 'lost' ? 'Persa' : 'In attesa'}
                        </span>
                      </div>
                      <div className="flex justify-between items-end">
                        <div>
                          <p className="text-sm font-bold text-white uppercase tracking-tight">{option?.label}</p>
                          <p className="text-xs text-blue-400 font-bold">{bet.amount} 🐑</p>
                        </div>
                        {bet.status === 'won' && (
                          <div className="text-right">
                            <p className="text-[10px] font-black text-green-400 uppercase">Premio</p>
                            <p className="text-sm font-black text-green-400">+{bet.payout} 🐑</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Leaderboard */}
          <div className="glass p-8 rounded-[2.5rem] border-white/5 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <Trophy size={80} className="text-blue-500" />
            </div>
            <h4 className="text-xl font-black text-white uppercase tracking-tighter mb-6 relative z-10 flex items-center gap-3">
              <Users size={20} className="text-blue-400" />
              I Migliori Pastori
            </h4>
            <div className="space-y-4 relative z-10">
              {leaderboard.map((u, i) => (
                <div key={u.username} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-white/20 transition-all">
                  <div className="flex items-center gap-4">
                    <span className={clsx(
                      "w-8 h-8 rounded-full flex items-center justify-center font-black text-xs",
                      i === 0 ? "bg-yellow-500 text-black" : 
                      i === 1 ? "bg-slate-300 text-black" : 
                      i === 2 ? "bg-amber-700 text-white" : "bg-white/10 text-gray-400"
                    )}>
                      {i + 1}
                    </span>
                    <span className="font-bold text-white uppercase tracking-tight">{u.username}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-blue-400">{u.sheep_balance}</span>
                    <span>🐑</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Themed Quotes */}
          <div className="glass p-8 rounded-[2.5rem] border-white/5 italic text-gray-500 text-sm font-serif">
            <p className="mb-4">"Hai inviato i tuoi scout a recuperare nuove pecore per il tuo gregge..."</p>
            <p>"Ricorda: un buon pastore sa quando rischiare e quando proteggere il gregge dai lupi."</p>
          </div>
        </div>
      </div>
    </div>
  );
}
