/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './AuthContext';
import { fetchTournament } from '../services/startgg';
import { Loader2, ArrowLeft, Trophy, Users, TrendingUp, AlertCircle, Plus, X, Zap, ChevronDown } from 'lucide-react';
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
  const { user, isAuthenticated, isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [tournament, setTournament] = useState<any>(null);
  const [sheepBalance, setSheepBalance] = useState(0);
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [selectedBets, setSelectedBets] = useState<{ [marketId: string]: { optionId: string, amount: number } }>({});
  const [placingBetId, setPlacingBetId] = useState<string | null>(null);
  const [myBets, setMyBets] = useState<any[]>([]);
  const [showAdminTools, setShowAdminTools] = useState(false);
  const [isCreatingMarket, setIsCreatingMarket] = useState(false);
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

  useEffect(() => {
    loadData();
  }, [slug, user]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load Tournament
      const cleanSlug = (slug || '').split('?')[0].trim().replace(/\/$/, '');
      
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
      const { data: marketData } = await supabase
        .from('betting_markets')
        .select('*')
        .eq('tournament_slug', cleanSlug)
        .order('created_at', { ascending: true });
      setMarkets(marketData || []);

      // Load Balance if auth
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('sheep_balance')
          .eq('id', user.id)
          .single();
        setSheepBalance(profile?.sheep_balance ?? 100);
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
      <div className="flex flex-col md:flex-row items-start justify-between mb-12 gap-6 px-4 md:px-0">
        <div className="relative flex-1">
           <button 
            onClick={() => navigate('/tornei')}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-4 text-xs font-black uppercase tracking-widest"
           >
            <ArrowLeft size={16} /> Torna ai Tornei
           </button>
           <h1 className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-slate-300 via-white to-slate-400 uppercase tracking-tighter mb-4 leading-none">
            Social Betting:<br/>
            {tournament?.name || (slug?.replace(/-/g, ' ')) || 'Torneo'}
           </h1>
            <div className="flex flex-col gap-4">
             <p className="text-sky-400/90 font-serif italic text-lg flex items-center gap-2 drop-shadow-[0_0_10px_rgba(56,189,248,0.2)]">
              Il mercato delle pecore è aperto! 🐑
             </p>
             <div className="group relative max-w-[500px]">
               <div className="bg-[#111218]/90 border border-red-500/20 p-2.5 rounded-xl flex items-center gap-3 text-red-400/80 text-[10px] font-bold uppercase tracking-widest cursor-help transition-all duration-500 max-h-[36px] hover:max-h-[200px] overflow-hidden backdrop-blur-sm">
                <AlertCircle size={14} className="shrink-0" />
                <span className="truncate group-hover:whitespace-normal transition-all duration-500">
                  Il sistema di Social Betting è un gioco di simulazione puramente gratuito.
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity ml-1">
                    Non costituisce attività di gioco d'azzardo. Le "Pecore" sono punti virtuali privi di valore economico.
                  </span>
                </span>
               </div>
             </div>
           </div>
        </div>

        <div className="flex flex-col items-end gap-4 self-start mt-0 md:mt-10">
            {isAuthenticated && (
              <div className="bg-[#111218] px-6 py-3 rounded-2xl border-slate-400/20 shadow-[0_0_30px_rgba(59,130,246,0.1)] flex items-center gap-4 h-[56px] transition-transform hover:scale-105">
                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest whitespace-nowrap">Il Tuo Gregge</span>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-black text-white">{sheepBalance}</span>
                  <span className="text-2xl animate-bounce" style={{ animationDuration: '2s' }}>🐑</span>
                </div>
              </div>
            )}
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
                      <div className="grid grid-cols-2 gap-3">
                        {['2-0', '2-1', '1-2', '0-2'].map((score) => (
                          <button
                            key={score}
                            onClick={() => {
                              const label = `${score} (${adminForm.teamA} vs ${adminForm.teamB})`;
                              if (!adminForm.options.includes(label)) {
                                setAdminForm({...adminForm, options: [...adminForm.options, label].filter(o => o !== '')});
                              }
                            }}
                            className="p-3 bg-white/5 border border-white/10 rounded-xl text-white text-xs font-bold hover:border-cyan-500 transition-all"
                          >
                            {score}
                          </button>
                        ))}
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

                    setIsCreatingMarket(true);
                    try {
                      const optionsWithMeta = finalOptions.map(label => ({
                        id: crypto.randomUUID(),
                        label,
                        total_bet: 0
                      }));

                      const payload = {
                        tournament_slug: tournament?.slug || (slug || '').split('?')[0].trim().replace(/\/$/, ''),
                        title: adminForm.title,
                        description: adminForm.description,
                        type: adminForm.type,
                        options: optionsWithMeta,
                        status: 'open'
                      };
                      
                      console.log('🚀 Final Betting Payload:', payload);

                      const { error } = await supabase
                        .from('betting_markets')
                        .insert(payload);

                      if (error) throw error;
                      toast.success('Scommessa pubblicata!');
                      await loadData();
                      setAdminForm({
                        title: '',
                        description: '',
                        type: 'Match Winner',
                        eventLevel: 'High Elo',
                        teamA: '',
                        teamB: '',
                        options: ['', '']
                      });
                      setShowAdminTools(false);
                      loadData();
                    } catch (err: any) {
                      toast.error(err.message);
                    } finally {
                      setIsCreatingMarket(false);
                    }
                  }}
                  disabled={isCreatingMarket}
                  className="w-full py-5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:brightness-110 text-white font-black uppercase tracking-[0.2em] rounded-2xl transition-all shadow-xl active:scale-95 flex items-center justify-center gap-3"
                >
                  {isCreatingMarket ? <Loader2 size={20} className="animate-spin" /> : 'Pubblica Scommessa Ora'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 px-4 md:px-0">
        {/* Main Betting Area */}
        <div className="lg:col-span-2 space-y-8">
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
            markets.map((market) => (
              <div key={market.id} className="bg-[#111218] rounded-[2.5rem] border border-slate-400/20 overflow-hidden group hover:border-slate-400/40 transition-all duration-500 shadow-2xl">
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
                    <div className="mt-8 p-6 bg-[#111218] border border-slate-400/20 rounded-3xl animate-in slide-in-from-top-4 duration-300">
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
          {/* My Bets Section */}
          {isAuthenticated && myBets.length > 0 && (
            <div className="bg-[#111218] p-8 rounded-[2.5rem] border border-slate-400/20">
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
          <div className="bg-[#111218] p-8 rounded-[2.5rem] border border-slate-400/20 relative overflow-hidden">
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
        </div>
      </div>
    </div>
  );
}
