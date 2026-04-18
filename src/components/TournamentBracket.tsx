import { useState, useEffect } from 'react';
import { fetchPhaseGroupSets, fetchPhaseGroups } from '../services/startgg';
import type { StartGGPhase, StartGGSet, StartGGPhaseGroup } from '../services/startgg';
import { Loader2, Trophy } from 'lucide-react';
import { clsx } from 'clsx';

interface TournamentBracketProps {
  phase: StartGGPhase;
}

export function TournamentBracket({ phase }: TournamentBracketProps) {
  const [sets, setSets] = useState<StartGGSet[]>([]);
  const [pools, setPools] = useState<StartGGPhaseGroup[]>([]);
  const [activePoolId, setActivePoolId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSets() {
      setLoading(true);
      try {
        let groups: StartGGPhaseGroup[] = [];
        const rawGroups = phase.phaseGroups as any;
        
        if (Array.isArray(rawGroups)) {
          groups = rawGroups;
        } else if (rawGroups?.nodes) {
          groups = rawGroups.nodes;
        }
        
        if (groups.length === 0) {
          groups = await fetchPhaseGroups(phase.id);
        }

        // SALVATAGGIO POOL PER I TAB
        setPools(groups);
        if (groups.length > 0 && !activePoolId) {
          setActivePoolId(groups[0].id);
        }

        const results = await Promise.allSettled(
          groups.map(async pg => {
            const poolSets = await fetchPhaseGroupSets(pg.id);
            // Marciamo ogni set con l'id della pool di appartenenza
            return poolSets.map(s => ({ ...s, poolId: pg.id }));
          })
        );

        const allSets = (results.filter(r => r.status === 'fulfilled') as PromiseFulfilledResult<any[]>[]).flatMap(r => r.value);
        setSets(allSets);
      } catch (err) {
        console.error("Error in loadSets:", err);
      } finally {
        setLoading(false);
      }
    }
    loadSets();
  }, [phase]);

  // Filtraggio set per pool attiva (se ci sono pool multiple, come nei gironi)
  const filteredSets = pools.length > 1 && activePoolId 
    ? sets.filter((s: any) => s.poolId === activePoolId)
    : sets;

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 text-yellow-500 animate-spin" />
      </div>
    );
  }

  if (sets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-6">
          <Trophy className="w-8 h-8 text-gray-600" />
        </div>
        <h3 className="text-xl font-cinzel text-gray-400 mb-2 uppercase tracking-widest">Tabellone in Sincronizzazione</h3>
        <p className="text-gray-500 font-serif italic max-w-md mx-auto mb-8">
          I dati del torneo non sono ancora disponibili tramite connessione remota o il tabellone è in fase di generazione.
        </p>
        <a 
          href="https://www.start.gg/tournament/torneo-1v1-2026/event/1v1/brackets" 
          target="_blank" 
          rel="noopener noreferrer"
          className="px-6 py-2 bg-yellow-600/10 hover:bg-yellow-600/20 border border-yellow-500/30 rounded-xl text-yellow-500 text-[10px] font-black uppercase tracking-widest transition-all"
        >
          Apri Tabellone Originale
        </a>
      </div>
    );
  }

  // Identificazione dei bracket (Winners vs Losers)
  const winnersSets = filteredSets.filter(s => !s.fullRoundText.toLowerCase().includes('losers'));
  const losersSets = filteredSets.filter(s => s.fullRoundText.toLowerCase().includes('losers'));

  const renderRounds = (targetSets: StartGGSet[]) => {
    if (targetSets.length === 0) return null;
    
    const roundsMap: { [key: number]: { title: string; sets: StartGGSet[] } } = {};
    targetSets.forEach(set => {
      // Usiamo una chiave assoluta per assicurare l'ordine cronologico (i round di startgg possono essere negativi per i losers)
      const roundKey = set.round;
      if (!roundsMap[roundKey]) {
        roundsMap[roundKey] = { title: set.fullRoundText, sets: [] };
      }
      roundsMap[roundKey].sets.push(set);
    });

    const sortedRounds = Object.values(roundsMap).sort((a, b) => {
      // Usiamo il valore assoluto per assicurarci che sia i Winners (1, 2, 3) 
      // che i Losers (-1, -2, -3) scorrano da sinistra a destra nel tempo.
      return Math.abs(a.sets[0].round) - Math.abs(b.sets[0].round);
    });

    return (
      <div className="flex gap-4 md:gap-12 overflow-x-auto pb-12 elegant-scrollbar pt-4 px-2 min-h-[700px]">
        {sortedRounds.map((round, idx) => (
          <div key={idx} className="min-w-[280px] flex flex-col">
            <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] mb-8 pl-2 border-l-2 border-yellow-500/30">
              {round.title}
            </h3>
            <div className="flex-1 flex flex-col justify-around py-4">
              {round.sets.map(set => (
                <BracketSet 
                  key={set.id} 
                  set={set} 
                  isFirstRound={idx === 0}
                  isLastRound={idx === sortedRounds.length - 1}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="p-4 md:p-8 animate-in fade-in duration-500">
      {/* Pool Selector (Tabs) per i Gironi */}
      {pools.length > 1 && (
        <div className="flex flex-wrap gap-3 mb-10 border-b border-white/5 pb-8 overflow-x-auto elegant-scrollbar">
          {pools.map((pool, idx) => (
            <button
              key={pool.id}
              onClick={() => setActivePoolId(pool.id)}
              className={clsx(
                "px-6 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all whitespace-nowrap border",
                activePoolId === pool.id
                  ? "bg-yellow-500 text-black border-yellow-400 shadow-[0_0_25px_rgba(234,179,8,0.4)] scale-105"
                  : "bg-white/5 text-gray-500 hover:bg-white/10 hover:text-gray-300 border-white/5"
              )}
            >
              {`Gruppo ${pool.displayIdentifier || idx + 1}`}
            </button>
          ))}
        </div>
      )}

      {/* Winners Bracket */}
      <div className="mb-16">
        {losersSets.length > 0 && winnersSets.length > 0 && (
          <div className="flex items-center gap-3 mb-8 px-2">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-yellow-500/20 to-transparent"></div>
            <h2 className="text-[11px] font-black text-yellow-500 uppercase tracking-[0.5em] whitespace-nowrap px-4">Upper Bracket</h2>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-yellow-500/20 to-transparent"></div>
          </div>
        )}
        {renderRounds(winnersSets)}
      </div>

      {/* Losers Bracket (Stacked Below) */}
      {losersSets.length > 0 && (
        <div className="mt-20">
          <div className="flex items-center gap-3 mb-8 px-2">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-red-500/20 to-transparent"></div>
            <h2 className="text-[11px] font-black text-red-500/60 uppercase tracking-[0.5em] whitespace-nowrap px-4">Lower Bracket</h2>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-red-500/20 to-transparent"></div>
          </div>
          {renderRounds(losersSets)}
        </div>
      )}
    </div>
  );
}

function BracketSet({ set, isFirstRound, isLastRound }: { set: StartGGSet, isFirstRound?: boolean, isLastRound?: boolean }) {
  return (
    <div className="relative py-4 w-full group/set">
      {/* Connector lines (Golden) */}
      {!isFirstRound && (
        <div className="absolute left-[-24px] top-1/2 -translate-y-px w-6 h-px bg-gradient-to-r from-transparent to-yellow-500/30"></div>
      )}
      {!isLastRound && (
        <div className="absolute right-[-24px] top-1/2 -translate-y-px w-6 h-px bg-gradient-to-r from-yellow-500/30 to-transparent"></div>
      )}

      <div className="glass rounded-xl border border-white/5 hover:border-yellow-500/30 transition-all duration-300 w-full overflow-hidden shadow-lg relative z-10">
        <div className="flex flex-col">
        {set.slots.map((slot, idx) => {
          const isWinner = slot.standing?.stats.score.value !== null && 
                          set.slots.every(s => s === slot || (s.standing?.stats.score.value || 0) < (slot.standing?.stats.score.value || 0));
          const score = slot.standing?.stats.score.value;
          const entrant = slot.entrant;

          return (
            <div 
              key={idx} 
              className={clsx(
                "flex items-center justify-between p-3 border-white/5 transition-colors",
                idx === 0 ? "border-b" : "",
                isWinner ? "bg-yellow-500/5" : "bg-transparent"
              )}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className={clsx(
                  "w-1 h-4 rounded-full",
                  isWinner ? "bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.5)]" : "bg-gray-700"
                )} />
                
                <div className="relative group/player truncate">
                  <span className={clsx(
                    "text-xs font-bold truncate block",
                    isWinner ? "text-yellow-100" : "text-gray-400"
                  )}>
                    {entrant?.name || 'TBD'}
                  </span>
                  
                  {/* Tooltip for Players (Teams) */}
                  {entrant && entrant.participants.length > 1 && (
                    <div className="absolute bottom-full left-0 mb-2 opacity-0 group-hover/player:opacity-100 pointer-events-none transition-opacity z-50">
                      <div className="glass px-3 py-2 rounded-lg border border-yellow-500/30 shadow-2xl min-w-[150px]">
                        <p className="text-[9px] font-black text-yellow-500 uppercase tracking-widest mb-1 border-b border-yellow-500/20 pb-1">Componenti Team</p>
                        <div className="space-y-1">
                          {entrant.participants.map(p => (
                            <p key={p.id} className="text-[10px] text-white font-medium">{p.gamerTag}</p>
                          ))}
                        </div>
                      </div>
                      <div className="w-2 h-2 glass border-r border-b border-yellow-500/30 rotate-45 mx-auto -mt-1 bg-[#1a2542]" />
                    </div>
                  )}
                </div>
              </div>

              <div className={clsx(
                "w-8 text-center text-sm font-black tabular-nums",
                isWinner ? "text-yellow-500" : "text-gray-500"
              )}>
                {score !== null ? score : '-'}
              </div>
            </div>
          );
        })}
        </div>
      </div>
    </div>
  );
}
