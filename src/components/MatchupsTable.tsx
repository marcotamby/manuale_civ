import { useState, useEffect } from 'react';
import { civilizationsData } from '../data/aoe4Data';
import { CustomSelect } from './CustomSelect';
import { Users, Trophy } from 'lucide-react';

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

// Reverse map: API key → app civ ID (for looking up flag/name)
const API_KEY_TO_CIV_ID: Record<string, string> = Object.fromEntries(
  Object.entries(CIV_ID_TO_API_KEY).map(([appId, apiKey]) => [apiKey, appId])
);

interface MatchupData {
  civilization: string;
  other_civilization: string;
  win_rate: number;
  win_count: number;
  games_count: number;
}

interface MatchupsResponse {
  data: MatchupData[];
}

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

interface MapDetail {
  map: string;
  civilizations: {
    [civKey: string]: {
      win_rate: number;
      games_count: number;
    };
  };
}

interface MapsResponse {
  data: MapDetail[];
}

interface MapStat {
  map: string;
  win_rate: number;
  games_count: number;
}

export function MatchupsTable({ selectedCiv }: { selectedCiv: string }) {
  const [activeSubTab, setActiveSubTab] = useState<'civ' | 'maps'>('civ');
  const [matchups, setMatchups] = useState<MatchupData[]>([]);
  const [mapStats, setMapStats] = useState<MapStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rankLevel, setRankLevel] = useState<RankLevel>('');
  const [ratingRange, setRatingRange] = useState<RatingRange>('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (rankLevel) params.set('rank_level', rankLevel);
        if (ratingRange) params.set('rating', ratingRange);

        if (activeSubTab === 'civ') {
          const url = `https://aoe4world.com/api/v0/stats/rm_solo/matchups${params.toString() ? '?' + params.toString() : ''}`;
          const response = await fetch(url);
          const json: MatchupsResponse = await response.json();
          const relevantMatchups = (json.data || []).filter(
            m => m.civilization === (CIV_ID_TO_API_KEY[selectedCiv] || selectedCiv) && 
                 m.other_civilization !== (CIV_ID_TO_API_KEY[selectedCiv] || selectedCiv)
          );
          relevantMatchups.sort((a, b) => a.win_rate - b.win_rate);
          setMatchups(relevantMatchups);
        } else {
          params.set('include_civs', 'true');
          const url = `https://aoe4world.com/api/v0/stats/rm_solo/maps${params.toString() ? '?' + params.toString() : ''}`;
          const response = await fetch(url);
          const json: MapsResponse = await response.json();
          
          const relevantMaps: MapStat[] = [];
          const apiKey = CIV_ID_TO_API_KEY[selectedCiv] || selectedCiv;

          (json.data || []).forEach((detail) => {
            const civStats = detail.civilizations && detail.civilizations[apiKey];
            if (civStats) {
              relevantMaps.push({
                map: detail.map,
                win_rate: civStats.win_rate,
                games_count: civStats.games_count
              });
            }
          });

          relevantMaps.sort((a, b) => b.win_rate - a.win_rate);
          setMapStats(relevantMaps);
        }
      } catch (err) {
        console.error("Failed to fetch data:", err);
        setError("Impossibile caricare i dati live. Riprova più tardi.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedCiv, rankLevel, ratingRange, activeSubTab]);

  return (
    <div className="mt-2 mb-4 animate-in fade-in duration-500">
      {/* Sub-tabs */}
      <div className="flex gap-4 mb-6 border-b border-white/5">
        <button
          onClick={() => setActiveSubTab('civ')}
          className={`pb-3 text-sm font-bold transition-all relative ${activeSubTab === 'civ' ? 'text-yellow-400' : 'text-gray-500 hover:text-gray-300'}`}
        >
          <div className="flex items-center gap-2">
            <Users size={16} />
            Civiltà
          </div>
          {activeSubTab === 'civ' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-yellow-500" />}
        </button>
        <button
          onClick={() => setActiveSubTab('maps')}
          className={`pb-3 text-sm font-bold transition-all relative ${activeSubTab === 'maps' ? 'text-yellow-400' : 'text-gray-500 hover:text-gray-300'}`}
        >
          <div className="flex items-center gap-2">
            <Trophy size={16} />
            Mappe
          </div>
          {activeSubTab === 'maps' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-yellow-500" />}
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
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
        {loading && (
          <div className="flex items-end pb-2">
            <span className="text-gray-400 text-xs font-bold animate-pulse uppercase tracking-widest bg-white/5 px-3 py-1 rounded-full border border-white/10">Sincronizzazione dati live...</span>
          </div>
        )}
      </div>

      {error && <div className="text-red-400 text-sm py-4 italic bg-red-500/10 border border-red-500/20 rounded-xl px-4">{error}</div>}

      {!loading && !error && (activeSubTab === 'civ' ? matchups.length === 0 : mapStats.length === 0) && (
        <div className="text-gray-400 text-sm py-8 text-center glass rounded-2xl border border-white/5 italic">
          Nessun dato disponibile per questi criteri di ricerca.
        </div>
      )}

      {!loading && !error && (
        <div className="glass rounded-2xl overflow-hidden border border-[#D4AF37]/15 shadow-2xl">
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white/5 border-b border-[#D4AF37]/20">
                  <th className="py-4 px-6 text-xs font-bold text-yellow-500/70 uppercase tracking-widest">
                    {activeSubTab === 'civ' ? 'Avversario' : 'Mappa'}
                  </th>
                  <th className="py-4 px-6 text-xs font-bold text-yellow-500/70 uppercase tracking-widest text-right">Win Rate</th>
                  <th className="py-4 px-6 text-xs font-bold text-yellow-100/70 uppercase tracking-widest text-right">Partite</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {activeSubTab === 'civ' ? (
                  matchups.map((matchup) => {
                    const appId = API_KEY_TO_CIV_ID[matchup.other_civilization] || matchup.other_civilization;
                    const opponentCiv = civilizationsData.find(c => c.id === appId);
                    const isFavorable = matchup.win_rate > 50;

                    return (
                      <tr key={matchup.other_civilization} className="hover:bg-white/5 transition-colors">
                        <td className="py-3 px-6">
                          <div className="flex items-center gap-3">
                            {opponentCiv?.flag ? (
                              <img src={opponentCiv.flag} alt={opponentCiv.name} className="w-7 h-7 object-contain drop-shadow-md" />
                            ) : (
                              <div className="w-7 h-7 bg-gray-700 rounded-full" />
                            )}
                            <div>
                              <span className="font-medium text-gray-200">{opponentCiv?.name || matchup.other_civilization}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-6">
                          <div className="flex flex-col items-end gap-1">
                            <span className={`font-bold text-sm ${isFavorable ? 'text-green-400' : 'text-red-400'}`}>
                              {matchup.win_rate.toFixed(1)}%
                            </span>
                            <div className="w-24 h-1 bg-gray-700 rounded-full overflow-hidden flex">
                              <div className="h-full bg-green-500 transition-all opacity-80" style={{ width: `${matchup.win_rate}%` }} />
                              <div className="h-full bg-red-500 transition-all opacity-80" style={{ width: `${100 - matchup.win_rate}%` }} />
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-6 text-right text-gray-400 text-sm">
                          {matchup.games_count.toLocaleString('it-IT')}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  mapStats.map((stat) => {
                    const isFavorable = stat.win_rate > 50;
                    return (
                      <tr key={stat.map} className="hover:bg-white/5 transition-colors">
                        <td className="py-3 px-6">
                          <span className="font-medium text-gray-200">{stat.map}</span>
                        </td>
                        <td className="py-3 px-6">
                          <div className="flex flex-col items-end gap-1">
                            <span className={`font-bold text-sm ${isFavorable ? 'text-green-400' : 'text-red-400'}`}>
                              {stat.win_rate.toFixed(1)}%
                            </span>
                            <div className="w-24 h-1 bg-gray-700 rounded-full overflow-hidden flex">
                              <div className="h-full bg-green-500 transition-all opacity-80" style={{ width: `${stat.win_rate}%` }} />
                              <div className="h-full bg-red-500 transition-all opacity-80" style={{ width: `${100 - stat.win_rate}%` }} />
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-6 text-right text-gray-400 text-sm">
                          {stat.games_count.toLocaleString('it-IT')}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
