import { useState, useEffect } from 'react';
import { useCivData } from './CivContext';
import { Shield, Sword, Zap, X, BarChart2, ChevronUp, ChevronDown, Users } from 'lucide-react';
import { CustomSelect } from './CustomSelect';

// Maps app civ IDs to the exact IDs used by the AoE4World API
const CIV_ID_TO_API_KEY: Record<string, string> = {
  abbasid: 'abbasid_dynasty',
  ayyubids: 'ayyubids',
  byzantines: 'byzantines',
  chinese: 'chinese',
  delhi: 'delhi_sultanate',
  english: 'english',
  french: 'french',
  goldenhorde: 'golden_horde',
  hre: 'holy_roman_empire',
  japanese: 'japanese',
  jeannedarc: 'jeanne_darc',
  lancaster: 'house_of_lancaster',
  macedonian: 'macedonian_dynasty',
  malians: 'malians',
  mongols: 'mongols',
  orderofthedragon: 'order_of_the_dragon',
  ottomans: 'ottomans',
  rus: 'rus',
  sengoku: 'sengoku_daimyo',
  templar: 'knights_templar',
  tughlaq: 'tughlaq_dynasty',
  zhuxi: 'zhu_xis_legacy',
};

type RankLevel = '' | 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' | 'conqueror' | '≥gold' | '≥platinum' | '≥diamond';
type RatingRange = '' | '<499' | '500-699' | '700-999' | '1000-1199' | '1200-1399' | '>1400' | '>1700';

const RANK_LEVELS: { value: RankLevel; label: string }[] = [
  { value: '', label: 'Tutti i Rank' },
  { value: 'bronze', label: 'Bronze' },
  { value: 'silver', label: 'Silver' },
  { value: 'gold', label: 'Gold' },
  { value: 'platinum', label: 'Platinum' },
  { value: 'diamond', label: 'Diamond' },
  { value: 'conqueror', label: 'Conqueror' },
  { value: '≥gold', label: '≥ Gold' },
  { value: '≥platinum', label: '≥ Platinum' },
  { value: '≥diamond', label: '≥ Diamond' },
];

const RATING_RANGES: { value: RatingRange; label: string }[] = [
  { value: '', label: 'Tutti i Rating' },
  { value: '<499', label: '< 499' },
  { value: '500-699', label: '500-699' },
  { value: '700-999', label: '700-999' },
  { value: '1000-1199', label: '1000-1199' },
  { value: '1200-1399', label: '1200-1399' },
  { value: '>1400', label: '> 1400' },
  { value: '>1700', label: '> 1700' },
];

interface CompareViewProps {
  civIds: string[];
  onClose: () => void;
}

export function CompareView({ civIds, onClose }: CompareViewProps) {
  const { civilizations } = useCivData();
  const [matchupWinRate, setMatchupWinRate] = useState<number | null>(null);
  const [gamesCount, setGamesCount] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [rankLevel, setRankLevel] = useState<RankLevel>('');
  const [ratingRange, setRatingRange] = useState<RatingRange>('');

  const civ1 = civilizations.find(c => c.id === civIds[0]);
  const civ2 = civilizations.find(c => c.id === civIds[1]);

  useEffect(() => {
    if (!civ1 || !civ2) return;

    const fetchMatchup = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (rankLevel) params.set('rank_level', rankLevel);
        if (ratingRange) params.set('rating', ratingRange);

        const url = `https://aoe4world.com/api/v0/stats/rm_solo/matchups${params.toString() ? '?' + params.toString() : ''}`;
        const response = await fetch(url);
        const json = await response.json();
        
        const civ1Key = CIV_ID_TO_API_KEY[civ1.id] || civ1.id;
        const civ2Key = CIV_ID_TO_API_KEY[civ2.id] || civ2.id;

        const data = json.data || [];
        const specificMatchup = data.find((m: any) => m.civilization === civ1Key && m.other_civilization === civ2Key);

        if (specificMatchup) {
          setMatchupWinRate(specificMatchup.win_rate);
          setGamesCount(specificMatchup.games_count);
        } else {
          setMatchupWinRate(null);
          setGamesCount(0);
        }
      } catch (err) {
        console.error("Matchup fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchMatchup();
  }, [civ1, civ2, rankLevel, ratingRange]);

  if (!civ1 || !civ2) return null;

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-[var(--color-brand-dark)] h-full">
      {/* Header */}
      <div className="flex flex-col items-center justify-center text-center p-6 md:p-8 bg-black/40 border-b border-white/5 relative">
        <button
          onClick={onClose}
          className="absolute right-6 top-6 p-2 hover:bg-white/10 rounded-full transition-colors"
        >
          <X size={24} className="text-gray-400" />
        </button>
        <div className="flex flex-col md:flex-row items-center gap-3 mb-2">
          <BarChart2 className="text-blue-500" size={32} />
          <h1 className="text-3xl font-bold text-white">Confronto Civiltà</h1>
        </div>
        <p className="text-gray-400">
          Analisi fianco a fianco di <span className="text-white font-medium">{civ1?.name}</span> e <span className="text-white font-medium">{civ2?.name}</span>.
        </p>
      </div>

      <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto w-full">
        {/* Row 1: Flags & Names */}
        <div className="grid grid-cols-2 gap-3 md:gap-8">
          {[civ1, civ2].map(civ => (
            <div key={civ!.id} className="relative glass rounded-3xl flex flex-col items-center justify-end text-center p-8 border border-white/5 hover:border-yellow-500/20 transition-all min-h-[220px] md:min-h-[300px] overflow-hidden group">
              {/* Massive High Quality Background Flag */}
              <div className="absolute inset-0 pointer-events-none">
                <div 
                  className="absolute inset-0 bg-cover bg-center opacity-70 scale-110 group-hover:scale-105 transition-transform duration-1000"
                  style={{ backgroundImage: `url(${civ!.flag})` }}
                />
                {/* Elegant Fading Overlays */}
                <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-brand-dark)] via-[var(--color-brand-dark)]/20 to-transparent" />
                <div className="absolute inset-0 bg-black/10" />
              </div>

              {/* Glowing Aura */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-white/5 blur-[100px] rounded-full pointer-events-none" />

              <div className="relative z-10 w-full">
                <h2 className="text-3xl md:text-5xl font-black text-white mb-3 tracking-tighter uppercase drop-shadow-2xl">{civ!.name}</h2>
                <div className="flex justify-center">
                  <span className={`text-[10px] md:text-xs font-black px-5 py-2 rounded-full border shadow-2xl backdrop-blur-md ${civ!.difficulty === 'Facile' ? 'text-green-400 border-green-500/40 bg-green-500/20' :
                    civ!.difficulty === 'Medio' ? 'text-yellow-400 border-yellow-500/40 bg-yellow-500/20' :
                      'text-red-400 border-red-400/30 bg-red-500/20'
                    }`}>
                    {civ!.difficulty.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Row 1.5: 1v1 Matchup Stats */}
        <div className="glass p-6 md:p-8 rounded-3xl border border-blue-500/20 bg-blue-500/5">
          <div className="flex flex-col items-center gap-6">
            <h3 className="text-sm font-black text-blue-400 uppercase tracking-[0.2em] flex items-center gap-2">
              <Users size={18} /> Statistiche 1v1 Live
            </h3>

            <div className="flex flex-wrap justify-center gap-4 w-full">
              <CustomSelect
                label="Grado (Rank)"
                options={RANK_LEVELS}
                value={rankLevel}
                onChange={setRankLevel}
              />
              <CustomSelect
                label="Punteggio ELO"
                options={RATING_RANGES}
                value={ratingRange}
                onChange={setRatingRange}
              />
            </div>

            <div className="flex flex-col items-center gap-2 w-full max-w-lg mt-4">
              {loading ? (
                <div className="text-blue-400/60 animate-pulse font-bold text-sm">SINCRONIZZAZIONE DATI...</div>
              ) : matchupWinRate !== null ? (
                <>
                  <div className="flex justify-between w-full text-xs font-bold mb-1">
                    <span className="text-gray-400">{civ1?.name}</span>
                    <span className="text-gray-400">{civ2?.name}</span>
                  </div>
                  <div className="w-full h-4 md:h-6 bg-gray-800 rounded-full overflow-hidden flex shadow-inner border border-white/5 relative">
                    <div 
                      className={`h-full transition-all duration-700 relative group ${matchupWinRate >= 50 ? 'bg-gradient-to-r from-green-600 to-green-500' : 'bg-gradient-to-r from-red-600 to-red-500'}`} 
                      style={{ width: `${matchupWinRate}%` }}
                    >
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-[10px] md:text-xs font-black text-white drop-shadow-md">{matchupWinRate.toFixed(1)}%</span>
                      </div>
                    </div>
                    <div 
                      className={`h-full transition-all duration-700 relative group ${matchupWinRate < 50 ? 'bg-gradient-to-r from-green-500 to-green-600' : 'bg-gradient-to-r from-red-500 to-red-600'}`} 
                      style={{ width: `${100 - matchupWinRate}%` }}
                    >
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-[10px] md:text-xs font-black text-white drop-shadow-md">{(100 - matchupWinRate).toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] md:text-xs text-gray-500 mt-2 font-medium">
                    Basato su <span className="text-blue-400/80">{gamesCount.toLocaleString('it-IT')}</span> partite analizzate
                  </span>
                </>
              ) : (
                <div className="text-gray-500 italic text-sm py-4">
                  Dati insufficienti per questo matchup con i filtri selezionati.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Row 2: Playstyle/Description */}
        <div className="grid grid-cols-2 gap-3 md:gap-8">
          {[civ1, civ2].map(civ => (
            <section key={`style-${civ!.id}`} className="glass p-4 md:p-6 rounded-2xl border border-white/5 h-full">
              <h3 className="text-[10px] md:text-sm font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Shield size={16} className="text-blue-400" />
                Stile di Gioco
              </h3>
              <p className="text-gray-300 leading-relaxed text-[11px] md:text-sm">{civ!.shortDescription}</p>
            </section>
          ))}
        </div>

        {/* Row 3: Key Bonuses */}
        <div className="grid grid-cols-2 gap-3 md:gap-8">
          {[civ1, civ2].map(civ => (
            <section key={`bonuses-${civ!.id}`} className="space-y-4 h-full">
              <h3 className="text-[10px] md:text-sm font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                <Zap size={16} className="text-yellow-500" />
                Bonus Chiave
              </h3>
              <div className="grid grid-cols-1 gap-3">
                {civ!.passiveBonuses.slice(0, 4).map((bonus, bIdx) => (
                  <div key={bIdx} className="glass p-2 md:p-4 rounded-xl border border-white/5 text-[10px] md:text-sm text-gray-300 min-h-[60px] flex items-center">
                    {bonus}
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* Row 3.5: Strengths */}
        <div className="grid grid-cols-2 gap-3 md:gap-8">
          {[civ1, civ2].map(civ => (
            <section key={`strengths-${civ!.id}`} className="space-y-4 h-full">
              <h3 className="text-[10px] md:text-sm font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                <ChevronUp size={16} className="text-emerald-400" />
                Punti di Forza
              </h3>
              <div className="bg-slate-900/40 backdrop-blur-md p-5 rounded-2xl border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.05)] text-gray-300 text-[11px] md:text-sm leading-relaxed">
                <div className="space-y-3">
                  {civ!.strengths && civ!.strengths.length > 0 ? (
                    civ!.strengths.map((str, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 group/item">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)] mt-1.5 shrink-0 group-hover/item:scale-125 transition-transform" />
                        <span className="text-slate-200/90 group-hover/item:text-white transition-colors">{str}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 italic text-xs pl-4">Dati non disponibili.</p>
                  )}
                </div>
              </div>
            </section>
          ))}
        </div>

        {/* Row 3.6: Weaknesses */}
        <div className="grid grid-cols-2 gap-3 md:gap-8">
          {[civ1, civ2].map(civ => (
            <section key={`weaknesses-${civ!.id}`} className="space-y-4 h-full">
              <h3 className="text-[10px] md:text-sm font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                <ChevronDown size={16} className="text-rose-400" />
                Punti Deboli
              </h3>
              <div className="bg-slate-900/40 backdrop-blur-md p-5 rounded-2xl border border-rose-500/30 shadow-[0_0_15px_rgba(244,63,94,0.05)] text-gray-300 text-[11px] md:text-sm leading-relaxed">
                <div className="space-y-3">
                  {civ!.weaknesses && civ!.weaknesses.length > 0 ? (
                    civ!.weaknesses.map((wk, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 group/item">
                        <div className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.4)] mt-1.5 shrink-0 group-hover/item:scale-125 transition-transform" />
                        <span className="text-slate-200/90 group-hover/item:text-white transition-colors">{wk}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 italic text-xs pl-4">Dati non disponibili.</p>
                  )}
                </div>
              </div>
            </section>
          ))}
        </div>

        {/* Row 4: Unique Units */}
        <div className="grid grid-cols-2 gap-3 md:gap-8">
          {[civ1, civ2].map(civ => (
            <section key={`units-${civ!.id}`} className="space-y-4 h-full">
              <h3 className="text-[10px] md:text-sm font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                <Sword size={16} className="text-red-400" />
                Unità Uniche
              </h3>
              {civ!.uniqueUnits.length > 0 ? (
                <div className="grid grid-cols-1 gap-3">
                  {civ!.uniqueUnits.map(unit => (
                    <div key={unit.id} className="glass p-3 md:p-4 rounded-xl border border-white/5 space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-white text-xs md:text-base font-bold block">{unit.name}</span>
                          <span className="text-[8px] md:text-[10px] text-gray-400 uppercase tracking-wider">{unit.type} • Age {unit.age}</span>
                        </div>
                      </div>
                      <div className="text-[11px] md:text-[13px] text-gray-300 leading-relaxed">
                        {unit.description}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="glass p-4 rounded-xl border border-white/5 text-gray-500 italic text-sm">
                  Nessuna unità unica specifica.
                </div>
              )}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
