/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Loader2, Trophy, RefreshCw } from 'lucide-react';
import { clsx } from 'clsx';
import type { TournamentMatch } from '../services/bracketEngine';

interface LocalTournamentBracketProps {
  tournamentId: string;
  maxParticipants?: number;
}

export function LocalTournamentBracket({ tournamentId }: LocalTournamentBracketProps) {
  const [matches, setMatches] = useState<TournamentMatch[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMatches = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('tournament_matches')
        .select(`
          *,
          player1:player1_id(id, display_name, discord_username, avatar_url),
          player2:player2_id(id, display_name, discord_username, avatar_url),
          winner:winner_id(id, display_name, discord_username)
        `)
        .eq('tournament_id', tournamentId)
        .order('round', { ascending: true })
        .order('match_number', { ascending: true });

      if (error) {
        console.error('Errore caricamento match:', error);
      } else if (data) {
        setMatches(data as any[]);
      }
    } catch (err) {
      console.error('Eccezione caricamento match:', err);
    } finally {
      setLoading(false);
    }
  }, [tournamentId]);

  useEffect(() => {
    fetchMatches();

    // Sottoscrizione in tempo reale con Supabase Realtime
    const channel = supabase
      .channel(`realtime_matches_${tournamentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tournament_matches',
          filter: `tournament_id=eq.${tournamentId}`
        },
        () => {
          fetchMatches();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tournamentId, fetchMatches]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center glass rounded-2xl border border-white/5 my-8">
        <div className="w-16 h-16 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mb-4">
          <Trophy className="w-8 h-8 text-cyan-400 animate-pulse" />
        </div>
        <h3 className="text-lg font-black text-white uppercase tracking-widest mb-2">Tabellone In Attesa</h3>
        <p className="text-gray-400 text-sm max-w-md mx-auto mb-6">
          Il tabellone verrà generato automaticamente non appena verranno completate le iscrizioni su Discord!
        </p>
        <button
          onClick={fetchMatches}
          className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold text-gray-300 transition-all"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Aggiorna
        </button>
      </div>
    );
  }

  // Raggruppa i match per Round
  const roundsMap: Record<number, TournamentMatch[]> = {};
  matches.forEach((m) => {
    if (!roundsMap[m.round]) {
      roundsMap[m.round] = [];
    }
    roundsMap[m.round].push(m);
  });

  const roundNumbers = Object.keys(roundsMap)
    .map(Number)
    .sort((a, b) => a - b);

  const getRoundTitle = (round: number, totalRounds: number) => {
    if (round === totalRounds) return '🏆 FINALE';
    if (round === totalRounds - 1) return '⚔️ SEMIFINALI';
    if (round === totalRounds - 2) return '🔥 QUARTI DI FINALE';
    return `ROUND ${round}`;
  };

  return (
    <div className="p-4 md:p-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
          <span className="text-xs font-black text-emerald-400 uppercase tracking-widest">
            Tabellone Live (Sincronizzato con Discord)
          </span>
        </div>
        <button
          onClick={fetchMatches}
          className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-gray-400 hover:text-white transition-all"
          title="Ricarica Match"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="flex gap-6 md:gap-12 overflow-x-auto pb-12 pt-4 px-2 elegant-scrollbar min-h-[550px]">
        {roundNumbers.map((roundNum) => {
          const roundMatches = roundsMap[roundNum];
          const isLastRound = roundNum === roundNumbers[roundNumbers.length - 1];

          return (
            <div key={roundNum} className="min-w-[280px] flex flex-col">
              <h3 className="text-xs font-black text-cyan-400 uppercase tracking-[0.2em] mb-6 pl-3 border-l-2 border-cyan-500/50">
                {getRoundTitle(roundNum, roundNumbers.length)}
              </h3>

              <div className="flex-1 flex flex-col justify-around py-2">
                {roundMatches.map((m) => (
                  <MatchCard key={m.id} match={m} isLastRound={isLastRound} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MatchCard({ match, isLastRound }: { match: TournamentMatch; isLastRound?: boolean }) {
  const p1 = match.player1;
  const p2 = match.player2;
  const isCompleted = match.status === 'completed';

  const isP1Winner = isCompleted && match.winner_id === match.player1_id;
  const isP2Winner = isCompleted && match.winner_id === match.player2_id;

  return (
    <div className="relative py-3 w-full">
      {!isLastRound && (
        <div className="absolute right-[-24px] top-1/2 -translate-y-[1px] w-6 h-[2px] bg-gradient-to-r from-cyan-500/60 to-transparent" />
      )}

      <div className="glass rounded-xl border border-white/10 hover:border-cyan-500/40 transition-all duration-300 w-full shadow-lg overflow-hidden">
        {/* Header Match */}
        <div className="bg-white/5 px-3 py-1.5 border-b border-white/5 flex items-center justify-between">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
            Match #{match.match_number}
          </span>
          <span
            className={clsx(
              'text-[9px] font-black uppercase px-2 py-0.5 rounded-full',
              match.status === 'completed'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : match.status === 'in_progress'
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse'
                : 'bg-white/5 text-gray-500 border border-white/10'
            )}
          >
            {match.status === 'completed' ? 'Completato' : match.status === 'in_progress' ? 'In Corso' : 'In Attesa'}
          </span>
        </div>

        {/* Giocatore 1 */}
        <div
          className={clsx(
            'flex items-center justify-between p-3 border-b border-white/5 transition-colors',
            isP1Winner ? 'bg-cyan-500/10' : 'bg-transparent'
          )}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={clsx(
                'w-1.5 h-4 rounded-full',
                isP1Winner ? 'bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.6)]' : 'bg-gray-700'
              )}
            />
            <span
              className={clsx(
                'text-xs font-black truncate uppercase tracking-wider',
                isP1Winner ? 'text-cyan-300' : p1 ? 'text-gray-200' : 'text-gray-600 italic'
              )}
            >
              {p1 ? p1.display_name || p1.discord_username : 'TBD (In attesa)'}
            </span>
          </div>
          <span className={clsx('text-xs font-black tabular-nums', isP1Winner ? 'text-cyan-400' : 'text-gray-500')}>
            {isCompleted ? match.player1_score : '-'}
          </span>
        </div>

        {/* Giocatore 2 */}
        <div
          className={clsx(
            'flex items-center justify-between p-3 transition-colors',
            isP2Winner ? 'bg-cyan-500/10' : 'bg-transparent'
          )}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={clsx(
                'w-1.5 h-4 rounded-full',
                isP2Winner ? 'bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.6)]' : 'bg-gray-700'
              )}
            />
            <span
              className={clsx(
                'text-xs font-black truncate uppercase tracking-wider',
                isP2Winner ? 'text-cyan-300' : p2 ? 'text-gray-200' : 'text-gray-600 italic'
              )}
            >
              {p2 ? p2.display_name || p2.discord_username : 'TBD (In attesa)'}
            </span>
          </div>
          <span className={clsx('text-xs font-black tabular-nums', isP2Winner ? 'text-cyan-400' : 'text-gray-500')}>
            {isCompleted ? match.player2_score : '-'}
          </span>
        </div>
      </div>
    </div>
  );
}
