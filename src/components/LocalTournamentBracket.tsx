/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Loader2, Trophy, RefreshCw, Users, Calendar, Clock, MapPin, UserCheck, Sparkles, Play } from 'lucide-react';
import { clsx } from 'clsx';
import type { TournamentMatch, TournamentParticipant } from '../services/bracketEngine';
import { generateSingleEliminationBracket } from '../services/bracketEngine';
import { toast } from 'react-hot-toast';

interface LocalTournamentBracketProps {
  tournamentId: string;
}

export function LocalTournamentBracket({ tournamentId }: LocalTournamentBracketProps) {
  const [tournament, setTournament] = useState<any>(null);
  const [participants, setParticipants] = useState<TournamentParticipant[]>([]);
  const [matches, setMatches] = useState<TournamentMatch[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      // 1. Torneo info (Supporta sia UUID che Slug)
      let tData: any = null;
      if (tournamentId.length > 20) {
        const { data } = await supabase
          .from('tournaments')
          .select('*')
          .eq('id', tournamentId)
          .maybeSingle();
        tData = data;
      }

      if (!tData) {
        const { data } = await supabase
          .from('tournaments')
          .select('*')
          .or(`slug.eq.${tournamentId},slug.ilike.%${tournamentId}%`)
          .maybeSingle();
        tData = data;
      }

      if (tData) setTournament(tData);

      const targetId = tData?.id || tournamentId;

      // 2. Partecipanti Iscritti
      const { data: pData, error: pErr } = await supabase
        .from('tournament_participants')
        .select('*')
        .eq('tournament_id', targetId)
        .order('registered_at', { ascending: true });

      if (pErr) console.warn("Errore caricamento partecipanti:", pErr);
      if (pData) setParticipants(pData as any[]);

      // 3. Match Generati
      const { data: mData, error: mErr } = await supabase
        .from('tournament_matches')
        .select(`
          *,
          player1:player1_id(id, display_name, discord_username, avatar_url),
          player2:player2_id(id, display_name, discord_username, avatar_url),
          winner:winner_id(id, display_name, discord_username)
        `)
        .eq('tournament_id', targetId)
        .order('round', { ascending: true })
        .order('match_number', { ascending: true });

      if (mErr) console.warn("Errore caricamento match:", mErr);
      if (mData) setMatches(mData as any[]);
    } catch (err) {
      console.error('Errore caricamento dati torneo:', err);
    } finally {
      setLoading(false);
    }
  }, [tournamentId]);

  useEffect(() => {
    fetchData();

    // Sottoscrizioni Realtime per sia i partecipanti che i match
    const channelMatches = supabase
      .channel(`realtime_matches_${tournamentId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tournament_matches', filter: `tournament_id=eq.${tournamentId}` }, () => fetchData())
      .subscribe();

    const channelParticipants = supabase
      .channel(`realtime_parts_${tournamentId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tournament_participants', filter: `tournament_id=eq.${tournamentId}` }, () => fetchData())
      .subscribe();

    return () => {
      supabase.removeChannel(channelMatches);
      supabase.removeChannel(channelParticipants);
    };
  }, [tournamentId, fetchData]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
      </div>
    );
  }

  const maxSlots = tournament?.max_participants || 8;
  const currentCount = participants.length;
  const progressPercent = Math.min(100, Math.round((currentCount / maxSlots) * 100));

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
    <div className="p-4 md:p-8 animate-in fade-in duration-500 max-w-7xl mx-auto space-y-10">
      
      {/* Header Info Torneo (Mappa, Data, Orario, Tipologia, Posti Live) */}
      <div className="glass p-6 md:p-8 rounded-3xl border border-cyan-500/20 shadow-2xl relative overflow-hidden bg-gradient-to-br from-cyan-950/20 via-black/60 to-black/80">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-2 px-3 py-1 bg-cyan-500/10 border border-cyan-500/30 rounded-full text-cyan-400 text-[10px] font-black uppercase tracking-widest">
                <Sparkles size={12} className="animate-spin text-cyan-400" /> Sincronizzato Live con Discord
              </span>
              {tournament?.type && (
                <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-gray-300 text-[10px] font-black uppercase tracking-widest">
                  ⚔️ {tournament.type}
                </span>
              )}
            </div>

            <h2 className="text-2xl md:text-4xl font-black text-white uppercase tracking-tight">
              {tournament?.name || tournament?.title || 'Torneo Live'}
            </h2>

            {/* Dettagli Mappa, Data, Orario */}
            <div className="flex flex-wrap gap-4 text-xs font-bold text-gray-300 pt-1">
              {tournament?.map && (
                <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-xl border border-white/5">
                  <MapPin size={14} className="text-cyan-400" />
                  <span>Mappa: <strong className="text-white">{tournament.map}</strong></span>
                </div>
              )}
              {tournament?.event_date && (
                <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-xl border border-white/5">
                  <Calendar size={14} className="text-cyan-400" />
                  <span>Data: <strong className="text-white">{tournament.event_date}</strong></span>
                </div>
              )}
              {tournament?.event_time && (
                <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-xl border border-white/5">
                  <Clock size={14} className="text-cyan-400" />
                  <span>Orario: <strong className="text-white">{tournament.event_time}</strong></span>
                </div>
              )}
            </div>
          </div>

          {/* Barra di Progresso Iscritti */}
          <div className="bg-black/60 p-5 rounded-2xl border border-white/10 w-full md:w-80 space-y-3 shadow-inner">
            <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider">
              <span className="text-gray-400 flex items-center gap-1.5">
                <Users size={14} className="text-cyan-400" /> Posti Iscritti
              </span>
              <span className="text-cyan-400 font-mono text-sm">
                {currentCount} / {maxSlots}
              </span>
            </div>
            <div className="w-full bg-white/5 h-3 rounded-full overflow-hidden p-0.5 border border-white/10">
              <div 
                className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full rounded-full transition-all duration-500 shadow-[0_0_12px_rgba(6,182,212,0.6)]"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="text-[10px] text-gray-500 text-right font-bold uppercase tracking-tight">
              {currentCount >= maxSlots ? '🔴 Iscrizioni Chiuse' : `🟢 Posti Rimanenti: ${maxSlots - currentCount}`}
            </div>
          </div>
        </div>
      </div>

      {/* SEZIONE 1: TABELLONE MATCH (se i match sono generati) */}
      {matches.length > 0 ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-white uppercase tracking-[0.2em] flex items-center gap-2">
              <Trophy size={16} className="text-yellow-500" /> Tabellone Eliminazione Diretta
            </h3>
            <button
              onClick={fetchData}
              className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-gray-400 hover:text-white transition-all text-xs font-bold flex items-center gap-2"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Aggiorna
            </button>
          </div>

          <div className="flex gap-6 md:gap-12 overflow-x-auto pb-12 pt-4 px-2 elegant-scrollbar min-h-[500px]">
            {roundNumbers.map((roundNum) => {
              const roundMatches = roundsMap[roundNum];
              const isLastRound = roundNum === roundNumbers[roundNumbers.length - 1];

              return (
                <div key={roundNum} className="min-w-[280px] flex flex-col">
                  <h4 className="text-xs font-black text-cyan-400 uppercase tracking-[0.2em] mb-6 pl-3 border-l-2 border-cyan-500/50">
                    {getRoundTitle(roundNum, roundNumbers.length)}
                  </h4>

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
      ) : null}

      {/* SEZIONE 2: GRIGLIA PARTECIPANTI ISCRITTI IN TEMPO REALE (Si popola uno per uno) */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
          <h3 className="text-sm font-black text-white uppercase tracking-[0.2em] flex items-center gap-2">
            <UserCheck size={16} className="text-cyan-400" /> Lista Iscritti in Tempo Reale ({currentCount} / {maxSlots})
          </h3>
          
          <div className="flex items-center gap-3">
            {matches.length === 0 && participants.length >= 2 && (
              <button
                type="button"
                onClick={async () => {
                  try {
                    toast.loading('Generazione tabellone in corso...');
                    await generateSingleEliminationBracket(tournamentId, participants);
                    toast.dismiss();
                    toast.success('🏆 Tabellone generato con successo!');
                    fetchData();
                  } catch (err: any) {
                    toast.dismiss();
                    toast.error(`Errore generazione: ${err.message}`);
                  }
                }}
                className="px-4 py-2 bg-gradient-to-r from-amber-500 to-yellow-500 hover:brightness-110 text-black font-black uppercase text-[10px] tracking-widest rounded-xl transition-all shadow-lg flex items-center gap-2 active:scale-95"
              >
                <Play size={12} fill="black" /> Genera Tabellone Match Ora
              </button>
            )}
            <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold hidden sm:inline-block">
              Aggiornato da Discord Bot
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: maxSlots }).map((_, index) => {
            const player = participants[index];

            return (
              <div
                key={index}
                className={clsx(
                  "p-4 rounded-2xl border transition-all duration-300 flex items-center gap-3.5 relative overflow-hidden",
                  player
                    ? "bg-gradient-to-br from-cyan-500/10 via-black/40 to-black/60 border-cyan-500/40 shadow-lg shadow-cyan-500/5 scale-[1.02]"
                    : "bg-white/[0.02] border-white/5 opacity-60"
                )}
              >
                {/* Slot Number Badge */}
                <div className={clsx(
                  "w-7 h-7 rounded-xl font-black text-xs flex items-center justify-center shrink-0 border",
                  player ? "bg-cyan-500 text-black border-cyan-400" : "bg-white/5 text-gray-600 border-white/10"
                )}>
                  #{index + 1}
                </div>

                {player ? (
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {player.avatar_url ? (
                      <img
                        src={player.avatar_url}
                        alt={player.display_name}
                        className="w-10 h-10 rounded-full border border-cyan-400/50 object-cover shrink-0 shadow-md"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center font-black text-cyan-400 shrink-0 text-sm">
                        {player.display_name?.substring(0, 2).toUpperCase() || 'P'}
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-black text-white truncate uppercase tracking-wider">
                        {player.display_name || player.discord_username}
                      </div>
                      <div className="text-[10px] font-mono text-cyan-400/80 truncate">
                        @{player.discord_username}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-gray-600 text-xs italic font-medium">
                    <span>In attesa di iscrizione...</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
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
              {p1 ? p1.display_name || p1.discord_username : 'TBD'}
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
              {p2 ? p2.display_name || p2.discord_username : 'TBD'}
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
