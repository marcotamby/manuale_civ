/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import { fetchPhaseGroupSets, fetchPhaseGroups } from '../services/startgg';
import type { StartGGPhase, StartGGSet, StartGGPhaseGroup } from '../services/startgg';
import { Loader2, Trophy, Users } from 'lucide-react';
import { clsx } from 'clsx';

interface TournamentBracketProps {
  phase: StartGGPhase;
  tournamentSlug?: string;
  directLink?: string;
}

export function TournamentBracket({ phase, tournamentSlug, directLink }: TournamentBracketProps) {
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
      <main className="flex-1 max-w-full flex justify-center py-20">
        <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
      </main>
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
          href={directLink || (tournamentSlug ? `https://www.start.gg/${tournamentSlug.includes('tournament/') ? tournamentSlug : `tournament/${tournamentSlug}`}/brackets` : "https://www.start.gg")} 
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

    const isRoundRobin = phase.bracketType === 'ROUND_ROBIN';

    return (
      <div className={clsx(
        "flex gap-4 md:gap-12 overflow-x-auto pb-12 elegant-scrollbar pt-24 px-2",
        !isRoundRobin ? "min-h-[700px]" : "min-h-0"
      )}>
        {sortedRounds.map((round, idx) => (
          <div key={idx} className="min-w-[280px] flex flex-col">
            <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] mb-8 pl-2 border-l-2 border-yellow-500/30">
              {round.title}
            </h3>
            <div className={clsx(
              "flex-1 flex flex-col py-4",
              isRoundRobin ? "justify-start gap-4" : "justify-around"
            )}>
              {round.sets.map(set => (
                <BracketSet 
                  key={set.id} 
                  set={set} 
                  isFirstRound={idx === 0}
                  isLastRound={idx === sortedRounds.length - 1}
                  hideConnectors={isRoundRobin}
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

function BracketSet({ set, isFirstRound, isLastRound, hideConnectors }: { set: StartGGSet, isFirstRound?: boolean, isLastRound?: boolean, hideConnectors?: boolean }) {
  return (
    <div className="relative py-4 w-full group/set">
      {/* Connector lines (Golden) - Potenziate */}
      {!isFirstRound && !hideConnectors && (
        <div className="absolute left-[-24px] top-1/2 -translate-y-[1px] w-6 h-[2px] bg-gradient-to-r from-transparent to-yellow-500/60 transition-all duration-300 group-hover/set:to-yellow-400"></div>
      )}
      {!isLastRound && !hideConnectors && (
        <div className="absolute right-[-24px] top-1/2 -translate-y-[1px] w-6 h-[2px] bg-gradient-to-r from-yellow-500/60 to-transparent transition-all duration-300 group-hover/set:from-yellow-400"></div>
      )}

      <div className="glass rounded-xl border border-white/5 hover:border-yellow-500/40 transition-all duration-300 w-full shadow-lg relative z-10 hover:z-[110]">
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
                "flex items-center justify-between p-3 border-white/5 transition-colors relative",
                idx === 0 ? "border-b rounded-t-xl" : "rounded-b-xl",
                isWinner ? "bg-yellow-500/5" : "bg-transparent"
              )}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className={clsx(
                  "w-1 h-4 rounded-full",
                  isWinner ? "bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.5)]" : "bg-gray-700"
                )} />
                
                <div className="relative group/player min-w-0">
                  <span className={clsx(
                    "text-[13px] font-black truncate block transition-all duration-300 group-hover/player:text-white uppercase tracking-wider",
                    isWinner ? "text-yellow-400" : "text-gray-300",
                    entrant && entrant.participants && entrant.participants.length > 1 ? "cursor-help" : "cursor-default"
                  )}>
                    {entrant?.name || 'TBD'}
                  </span>
                  
                  {/* Tooltip for Players (Teams) - Premium Design (Right Positioned, Discrete) */}
                  {entrant && entrant.participants && entrant.participants.length > 1 && (
                    <div className="absolute left-full top-1/2 -translate-y-1/2 ml-4 opacity-0 group-hover/player:opacity-100 pointer-events-none transition-all duration-300 -translate-x-2 group-hover/player:translate-x-0 z-[150] w-[180px]">
                      <div className="bg-[#0a0f1a]/95 backdrop-blur-xl border border-yellow-500/30 rounded-xl p-3 shadow-[0_15px_40px_rgba(0,0,0,0.6),0_0_15px_rgba(234,179,8,0.1)] overflow-hidden">
                        {/* Background Decoration */}
                        <div className="absolute top-0 right-0 -mr-3 -mt-3 w-12 h-12 bg-yellow-500/5 rounded-full blur-xl" />
                        
                        <div className="flex items-center gap-2 mb-2 border-b border-white/5 pb-1.5 relative z-10">
                          <Users size={10} className="text-yellow-500/70" />
                          <span className="text-[9px] font-black text-yellow-500/80 uppercase tracking-[0.2em]">Team Info</span>
                        </div>
                        
                        <div className="space-y-1.5 relative z-10">
                          {entrant.participants.map((p: any) => (
                            <div key={p.id} className="flex flex-col">
                              <div className="flex items-center gap-1.5">
                                {p.player?.prefix && (
                                  <span className="text-[7px] font-bold text-gray-500 uppercase px-0.5 bg-white/5 rounded leading-tight">{p.player.prefix}</span>
                                )}
                                <span className="text-[11px] text-gray-200 font-bold uppercase tracking-tight">{p.gamerTag}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      {/* Arrow (Pointing Left) */}
                      <div className="absolute top-1/2 -left-1 w-2.5 h-2.5 bg-[#0a0f1a] border-l border-b border-yellow-500/30 rotate-45 z-0 -translate-y-1/2" />
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
