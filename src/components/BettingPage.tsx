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
  const { user, isAuthenticated, refreshUser, isAdmin } = useAuth();
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
  }, [slug, user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: tourney } = await supabase
        .from('tournaments')
        .select('*')
        .or(`slug.eq.${cleanSlug},slug.ilike.${cleanSlug},slug.ilike.%${cleanSlug}%`)
        .maybeSingle();
        
      setTournament(tourney);

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

      const { data: marketData, error: marketError } = await supabase
        .from('betting_markets')
        .select('*')
        .or(`tournament_slug.eq.${cleanSlug},tournament_slug.eq.${cleanSlug}/,tournament_slug.ilike.%${cleanSlug}%`)
        .order('created_at', { ascending: true });
      
      if (marketError) console.error('❌ Error fetching markets:', marketError);
      
      setMarkets(marketData || []);

      if (user?.email) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('sheep_balance')
          .ilike('email', user.email)
          .maybeSingle();
        setSheepBalance(profile?.sheep_balance ?? 100);
      }

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
      const finalUserEmail = user?.email || localStorage.getItem('auth_user_email');
      if (!finalUserEmail) {
        toast.error("Identificazione fallita! Per favore rifai il login.");
        setPlacingBetId(null);
        return;
      }

      const betData: any = {
        user_email: finalUserEmail,
        market_id: marketId,
        option_id: bet.optionId,
        amount: bet.amount
      };

      const { error: insertError } = await supabase
        .from('user_bets')
        .insert(betData);

      if (insertError) throw insertError;
      
      toast.success('I tuoi scout hanno portato le pecore al mercato! 🐑');
      
      await refreshUser(); 
      await loadData();
      
      setSuccessBetId(marketId);
      setTimeout(() => setSuccessBetId(null), 3000);
      
      setTimeout(() => {
        setSelectedBets(prev => {
          const next = { ...prev };
          delete next[marketId];
          return next;
        });
      }, 1500);

    } catch (err: any) {
      console.error('❌ CRITICAL ERROR:', err);
      toast.error(err.message || 'Errore durante la scommessa');
    } finally {
      setPlacingBetId(null);
    }
  };

  const handleDeleteMarket = async (marketId: string) => {
    setMarketToDelete(marketId);
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

  const calculateOdds = (options: any[], optionId: string) => {
    const totalPool = options.reduce((sum, opt) => sum + (opt.total_bet || 0), 0);
    const optionPool = options.find(o => o.id === optionId)?.total_bet || 0;
    
    if (totalPool === 0 || optionPool === 0) return '---';
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
        </div>

        <div className="flex flex-col md:flex-row items-start gap-6 self-start mt-0 md:mt-10">
            {isAuthenticated && (
              <div className="bg-gradient-to-br from-blue-600/20 to-indigo-600/20 px-8 py-5 rounded-[2rem] border border-blue-500/30 shadow-[0_0_40px_rgba(59,130,246,0.15)] flex flex-col items-center gap-1 transition-transform hover:scale-105 backdrop-blur-md">
                <span className="text-[10px] font-black text-blue-400/80 uppercase tracking-[0.2em] whitespace-nowrap mb-1">Il Tuo Gregge</span>
                <div className="flex items-center gap-3">
                  <span className="text-4xl font-black text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">{sheepBalance}</span>
                  <span className="text-3xl animate-bounce" style={{ animationDuration: '2s' }}>🐑</span>
                </div>
              </div>
            )}
        </div>
      </div>

      {isAdmin && showAdminTools && (
        <div className="mb-12 bg-[#111218] border border-cyan-500/30 rounded-3xl overflow-hidden shadow-[0_0_80px_rgba(6,182,212,0.15)] px-4 md:px-0">
          <div className="px-8 py-6 border-b border-white/5 flex justify-between items-center bg-gradient-to-r from-cyan-500/10 via-transparent to-transparent">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 flex items-center justify-center border border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.2)]">
                <Zap className="text-cyan-400" size={24} fill="currentColor" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-white tracking-tight uppercase">
                  Nuova Scommessa
                </h2>
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
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 px-4 md:px-0">
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {markets.map((market) => (
                <div key={market.id} className="bg-[#111218] rounded-[2rem] border border-slate-400/20 overflow-hidden shadow-2xl flex flex-col h-full">
                  <div className="p-6 bg-gradient-to-br from-[#1a1c25] to-[#111218] border-b border-white/5">
                    <div className="flex items-center justify-between">
                      <span className="text-[8px] font-black text-cyan-400/50 uppercase tracking-[0.3em]">{market.type}</span>
                      {isAdmin && (
                        <button onClick={() => handleDeleteMarket(market.id)} className="text-white/10 hover:text-red-500 transition-colors"><Trash2 size={12} /></button>
                      )}
                    </div>
                    <h3 className="text-lg font-black text-white uppercase tracking-tighter leading-tight mt-2">{market.title}</h3>
                  </div>

                  <div className="p-6 flex-grow flex flex-col gap-4">
                    <div className="grid grid-cols-1 gap-2">
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
                              "relative p-3.5 rounded-xl border transition-all duration-300 text-left group/opt overflow-hidden",
                              isSelected ? "bg-emerald-500/10 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.1)]" : 
                              isWinner ? "bg-emerald-600/20 border-emerald-500" :
                              "bg-white/5 border-white/5 hover:border-white/10 hover:bg-white/[0.06]"
                            )}
                          >
                            <div className="flex justify-between items-center relative z-10">
                              <div className="flex flex-col min-w-0">
                                <span className={clsx(
                                  "text-sm font-black uppercase tracking-tight leading-tight mb-1",
                                  isSelected ? "text-white" : "text-gray-300"
                                )}>
                                  {opt.label}
                                </span>
                                <div className="flex items-center gap-2">
                                  <span className={clsx(
                                    "text-[9px] font-bold uppercase tracking-widest",
                                    isSelected ? "text-emerald-400/60" : "text-gray-500"
                                  )}>Puntata:</span>
                                  <span className={clsx(
                                    "text-[10px] font-black",
                                    isSelected ? "text-emerald-400" : "text-cyan-400"
                                  )}>{opt.total_bet || 0} 🐑</span>
                                </div>
                              </div>
                              <div className="flex flex-col items-end shrink-0 ml-4">
                                <span className={clsx(
                                  "text-[9px] font-black uppercase tracking-widest mb-0.5",
                                  isSelected ? "text-blue-200" : "text-blue-400"
                                )}>Quota</span>
                                <span className={clsx(
                                  "text-xl font-black",
                                  isSelected ? "text-white" : "text-white"
                                )}>{odds}</span>
                              </div>
                            </div>
                            
                            {isWinner && (
                              <div className="absolute top-2 right-2">
                                <Trophy size={14} className="text-yellow-500" />
                              </div>
                            )}
                          </button>
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
    </div>
  );
}
