import { useState, useEffect, useRef } from 'react';
import { StartGGPhase, StartGGSet, fetchPhaseGroupSets } from '../services/startgg';
import { Loader2 } from 'lucide-react';
import { clsx } from 'clsx';

interface TournamentBracketProps {
  phase: StartGGPhase;
}

export function TournamentBracket({ phase }: TournamentBracketProps) {
  const [sets, setSets] = useState<StartGGSet[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadSets() {
      setLoading(true);
      // Fetch nodes from all phase groups in this phase
      const allSets = await Promise.all(
        phase.phaseGroups.nodes.map(pg => fetchPhaseGroupSets(pg.id))
      );
      setSets(allSets.flat());
      setLoading(false);
    }
    loadSets();
  }, [phase]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 text-yellow-500 animate-spin" />
      </div>
    );
  }

  // Group sets by round
  const roundsMap: { [key: number]: { title: string; sets: StartGGSet[] } } = {};
  sets.forEach(set => {
    if (!roundsMap[set.round]) {
      roundsMap[set.round] = { title: set.fullRoundText, sets: [] };
    }
    roundsMap[set.round].sets.push(set);
  });

  // Sort rounds: Winners (positives) then Losers (negatives, descending?) or just sorted by round index
  const sortedRoundKeys = Object.keys(roundsMap)
    .map(Number)
    .sort((a, b) => {
      // Logic: Winners Round 1, 2, 3... then Losers Round 1, 2, 3...
      // On start.gg, Losers rounds are negative (e.g., -1, -2, -3)
      if (a > 0 && b > 0) return a - b;
      if (a < 0 && b < 0) return b - a; // -1, -2, -3...
      return b - a; // Winners first
    });

  return (
    <div className="w-full relative py-8 md:py-12">
      {/* Scrollable Area */}
      <div 
        ref={scrollContainerRef}
        className="flex gap-12 px-4 md:px-12 overflow-x-auto elegant-scrollbar pb-12 select-none active:cursor-grabbing scroll-smooth"
      >
        {sortedRoundKeys.map((roundKey) => (
          <div key={roundKey} className="flex flex-col gap-6 min-w-[280px]">
            <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-yellow-500/50 mb-4 border-l-2 border-yellow-500/30 pl-3">
              {roundsMap[roundKey].title}
            </h3>
            
            <div className="flex flex-col gap-4">
              {roundsMap[roundKey].sets.map((set) => (
                <BracketSet key={set.id} set={set} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BracketSet({ set }: { set: StartGGSet }) {
  return (
    <div className="glass rounded-xl border border-white/5 hover:border-yellow-500/30 transition-all duration-300 w-full overflow-hidden shadow-lg group/set">
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
  );
}
