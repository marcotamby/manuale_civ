import { useState, useEffect } from 'react';
import { Award, Skull, Rocket } from 'lucide-react';
import { RANK_ICONS } from './ProfileModal';

const normalizeRankLabel = (rank: string | undefined | null) => {
  if (!rank) return '';
  const trimmed = rank.trim();
  if (RANK_ICONS[trimmed as keyof typeof RANK_ICONS]) return trimmed;

  const normalized = trimmed
    .replace(/_/g, ' ')
    .replace(/\b(\w)/g, segment => segment.toUpperCase());

  return normalized.replace(/\b([1-3])\b/, num => {
    const map: Record<string, string> = { '1': 'I', '2': 'II', '3': 'III' };
    return map[num] || num;
  });
};

interface Player {
  player_name?: string;
  name?: string;
  rating?: number;
  elo?: number;
  wins?: number;
  losses?: number;
  [key: string]: any;
}

interface PlayerMode {
  rating?: number;
  modeName?: string;
  name?: string;
  mode?: string;
  [key: string]: any;
}

type LeaderboardType = 'singolo' | 'team' | 'elo';

export function ClassificaPage() {
  const [activeTab, setActiveTab] = useState<LeaderboardType>('elo');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [soloData, setSoloData] = useState<Player[]>([]);
  const [teamData, setTeamData] = useState<Player[]>([]);
  const [eloData, setEloData] = useState<PlayerMode[]>([]);
  const [sortColumn, setSortColumn] = useState<string>('_scudi_totali');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const handleSort = (key: string) => {
    if (sortColumn === key) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortColumn(key);
    setSortDirection('desc');
  };

  useEffect(() => {
    const fetchAllLeaderboards = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch Solo leaderboard
        const soloResponse = await fetch(
          'https://backend.aoeitalia.com:8443/api/getAoe4worldPlayers?leaderboard=rm_solo'
        );
        if (!soloResponse.ok) throw new Error('Failed to fetch solo leaderboard');
        const soloDataFetched = await soloResponse.json();
        setSoloData(Array.isArray(soloDataFetched) ? soloDataFetched : []);

        // Fetch Team leaderboard
        const teamResponse = await fetch(
          'https://backend.aoeitalia.com:8443/api/getAoe4worldPlayers?leaderboard=rm_team'
        );
        if (!teamResponse.ok) throw new Error('Failed to fetch team leaderboard');
        const teamDataFetched = await teamResponse.json();
        setTeamData(Array.isArray(teamDataFetched) ? teamDataFetched : []);

        // Fetch ELO leaderboard
        const eloResponse = await fetch(
          'https://backend.aoeitalia.com:8443/api/getPlayerModes'
        );
        if (!eloResponse.ok) throw new Error('Failed to fetch elo leaderboard');
        const eloDataFetched = await eloResponse.json();
        setEloData(Array.isArray(eloDataFetched) ? eloDataFetched : []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        console.error('Error fetching leaderboards:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAllLeaderboards();
  }, []);

  const renderTable = (data: any[], type: LeaderboardType) => {
    if (!data || data.length === 0) {
      return <div className="text-center py-8 text-gray-400">No data available</div>;
    }

    const normalizedSearch = searchQuery.trim().toLowerCase();
    const matchesSearch = (row: any) => {
      if (!normalizedSearch) return true;
      return [row.discord_name, row.name, row.player_name]
        .filter(Boolean)
        .some(value => String(value).toLowerCase().includes(normalizedSearch));
    };

    const transformedData = type === 'elo'
      ? data.map(item => {
        const eloSolo = typeof item.rating_rm_1vs1 === 'number' ? Math.round(item.rating_rm_1vs1) : undefined;
        const eloTg = [item.rating_rm_2vs2, item.rating_rm_3vs3, item.rating_rm_4vs4].every(val => typeof val === 'number')
          ? Math.round((item.rating_rm_2vs2 + item.rating_rm_3vs3 + item.rating_rm_4vs4) / 3)
          : undefined;
        const eloMedioSoloTg = (typeof eloSolo === 'number' && typeof eloTg === 'number')
          ? Math.round((eloSolo + eloTg) / 2)
          : undefined;

        const scudiSolo = typeof item.rating_rm_1vs1 === 'number'
          ? Math.round((item.rating_rm_1vs1 - 800) / 10)
          : undefined;
        const scudiTg = [item.rating_rm_2vs2, item.rating_rm_3vs3, item.rating_rm_4vs4].every(val => typeof val === 'number')
          ? Math.round((((item.rating_rm_2vs2 + item.rating_rm_3vs3 + item.rating_rm_4vs4) / 3) - 800) / 10)
          : undefined;
        const scudiTotali = (item.rating_rm_1vs1 === 0 || item.rating_rm_2vs2 === 0 || item.rating_rm_3vs3 === 0 || item.rating_rm_4vs4 === 0)
          ? null
          : (typeof scudiSolo === 'number' && typeof scudiTg === 'number')
            ? Math.round((scudiSolo + scudiTg) / 2)
            : undefined;

        return {
          ...item,
          _elo_rm_1vs1: { games: item.games_rm_1vs1, rating: item.rating_rm_1vs1 },
          _elo_rm_2vs2: { games: item.games_rm_2vs2, rating: item.rating_rm_2vs2 },
          _elo_rm_3vs3: { games: item.games_rm_3vs3, rating: item.rating_rm_3vs3 },
          _elo_rm_4vs4: { games: item.games_rm_4vs4, rating: item.rating_rm_4vs4 },
          _elo_medio_solo_tg: eloMedioSoloTg,
          _scudi_solo: item.rating_rm_1vs1 === 0 ? null : scudiSolo,
          _scudi_tg: (item.rating_rm_2vs2 === 0 || item.rating_rm_3vs3 === 0 || item.rating_rm_4vs4 === 0) ? null : scudiTg,
          _scudi_totali: scudiTotali
        };
      })
      : data;

    const filteredData = transformedData.filter(matchesSearch);
    if (filteredData.length === 0) {
      return <div className="text-center py-8 text-gray-400">No matching rows for "{searchQuery}"</div>;
    }

    // Get all unique keys from the data
    let allKeys = Array.from(
      new Set(filteredData.flatMap(item => Object.keys(item)))
    ).sort();

    // Hide Elo-specific unwanted columns
    if (type === 'elo') {
      allKeys = allKeys.filter(key => ![
        'profile_id',
        'rating',
        'games_rm_1vs1',
        'games_rm_2vs2',
        'games_rm_3vs3',
        'games_rm_4vs4',
        'rating_rm_1vs1',
        'rating_rm_2vs2',
        'rating_rm_3vs3',
        'rating_rm_4vs4'
      ].includes(key));
    }

    // Check if we have discord data to merge
    const hasDiscordData = allKeys.includes('discord_avatar') || allKeys.includes('discord_name');
    const hasAoEData = allKeys.includes('name') || allKeys.includes('site_url') || allKeys.includes('player_name');
    const hasRankData = allKeys.includes('rank_level');

    // Remove individual discord columns and add merged one
    if (hasDiscordData) {
      allKeys = allKeys.filter(key => key !== 'discord_avatar' && key !== 'discord_name' && key !== 'discord_id');
      allKeys.unshift('_discord_user');
    } else {
      allKeys = allKeys.filter(key => key !== 'discord_id');
    }

    // Remove individual AoE name and site_url columns and add merged one
    if (hasAoEData) {
      allKeys = allKeys.filter(key => key !== 'name' && key !== 'site_url' && key !== 'player_name');
      if (hasDiscordData) {
        allKeys.splice(1, 0, '_aoe_user');
      } else {
        allKeys.unshift('_aoe_user');
      }
    }

    // Remove individual rank_level column and add merged one
    if (hasRankData) {
      allKeys = allKeys.filter(key => key !== 'rank_level' && key !== 'rank');
      let insertPosition = 2;
      if (!hasDiscordData) insertPosition -= 1;
      if (!hasAoEData) insertPosition -= 1;
      allKeys.splice(insertPosition, 0, '_rank');
    }

    // Remove individual rating columns and add merged one
    const hasRatingData = data.some(item => item.rating !== undefined || item.highest_rating !== undefined);
    if (hasRatingData && type !== 'elo') {
      allKeys = allKeys.filter(key => key !== 'highest_rating');
      if (!allKeys.includes('rating')) {
        allKeys.unshift('rating');
      }
    }
    allKeys = allKeys.filter(key => key !== 'last_rating_change');

    // Define the specific column order for the rest
    const orderedColumns = ['last_rating_change', 'games', 'streak', 'win_rate', 'last_match_time'];

    // Remove individual record columns when record values exist
    const hasRecordData = data.some(item => item.wins !== undefined || item.losses !== undefined || item.drops !== undefined);
    if (hasRecordData) {
      allKeys = allKeys.filter(key => key !== 'wins' && key !== 'losses' && key !== 'drops');
    }

    // Keep merged columns at the beginning
    let mergedCols = allKeys.filter(k => k.startsWith('_'));
    if (type === 'elo') {
      const mergedOrder = [
        '_discord_user',
        '_aoe_user',
        '_rank',
        '_elo_rm_1vs1',
        '_elo_rm_2vs2',
        '_elo_rm_3vs3',
        '_elo_rm_4vs4',
        '_elo_medio_solo_tg',
        '_scudi_solo',
        '_scudi_tg',
        '_scudi_totali'
      ];
      mergedCols = [
        ...mergedOrder.filter(k => mergedCols.includes(k)),
        ...mergedCols.filter(k => !mergedOrder.includes(k))
      ];
    }

    // Filter and order remaining columns
    const remainingCols = allKeys
      .filter(k => !k.startsWith('_') && !orderedColumns.includes(k))
      .sort();

    const orderedRemainingCols = orderedColumns.filter(col => allKeys.includes(col) && !col.startsWith('_'));

    // Combine: merged columns + rating (unless ELO) + ordered columns + remaining unspecified columns
    if (type === 'elo') {
      allKeys = mergedCols;
    } else {
      allKeys = [
        ...mergedCols,
        'rating',
        ...orderedRemainingCols,
        ...remainingCols.filter(k => k !== 'rating')
      ];
    }

    const headerHelpText: Record<string, string> = {
      _elo_medio_solo_tg: 'Media Elo Team = (rating rm 2vs2 + rating rm 3vs3 + rating rm 4vs4) / 3\n\nMedia Elo = (rating rm 1vs1 + Media Elo Team) / 2',
      _scudi_solo: 'Scudi Singolo = (rating rm 1vs1 - 800) / 10',
      _scudi_tg: 'Media Elo Team = (rating rm 2vs2 + rating rm 3vs3 + rating rm 4vs4) / 3\n\nScudi Team = (Media Elo Team - 800) / 10',
      _scudi_totali: 'Scudi Totali = (Scudi Singolo + Scudi Team) / 2'
    };

    const renderHeaderLabel = (key: string) => {
      const label = formatHeader(key);
      const helpText = headerHelpText[key];
      return (
        <div className="inline-flex items-center gap-2">
          <span>{label}</span>
          {helpText && (
            <span className="relative inline-flex items-center group" onClick={e => e.stopPropagation()}>
              <span className="w-4 h-4 rounded-full bg-neutral-800 text-neutral-300 text-[10px] font-bold flex items-center justify-center cursor-help">?</span>
              <div className="pointer-events-none absolute left-1/2 top-full mb-2 hidden w-[220px] -translate-x-1/2 rounded border border-neutral-700 bg-neutral-950 p-2 text-xs text-white whitespace-pre-line shadow-lg group-hover:block z-50">
                {helpText}
              </div>
            </span>
          )}
        </div>
      );
    };

    const formatHeader = (key: string) => {
      if (key === '_discord_user') return 'Utente Discord';
      if (key === '_aoe_user') return 'Utente AoE';
      if (key === '_rank') return 'Rank';
      if (key === '_elo_medio_solo_tg') return 'Media Elo';
      if (key === '_scudi_solo') return 'Scudi Singolo';
      if (key === '_scudi_tg') return 'Scudi Team';
      if (key === '_scudi_totali') return 'Scudi Totali';
      if (key === '_elo_rm_1vs1') return 'Elo RM 1vs1';
      if (key === '_elo_rm_2vs2') return 'Elo RM 2vs2';
      if (key === '_elo_rm_3vs3') return 'Elo RM 3vs3';
      if (key === '_elo_rm_4vs4') return 'Elo RM 4vs4';
      if (key === 'rating') return 'Ranking Points';
      if (key === 'games') return 'Partite (V-P-D)';
      if (key === 'streak') return 'Ultima Serie';
      if (key === 'wins') return 'Vinte';
      if (key === 'losses') return 'Perse';
      if (key === 'drops') return 'Disconnesse';
      if (key === 'last_match_time') return 'Ultima Partita';

      return key
        .replace(/_/g, ' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    };

    const getSortValue = (row: any, key: string) => {
      if (key === '_discord_user') return String(row.discord_name || row.name || row.player_name || '').toLowerCase();
      if (key === '_aoe_user') return String(row.name || row.player_name || '').toLowerCase();
      if (key === '_rank') return String(row.rank_level || '').toLowerCase();
      if (key === 'rating') {
        const value = row.rating ?? row.highest_rating;
        if (typeof value === 'number') return value;
        if (typeof value === 'string' && !Number.isNaN(Number(value))) return Number(value);
        return value ?? -Infinity;
      }
      if (key === '_elo_medio_solo_tg') {
        const value = row[key];
        if (typeof value === 'number') return value;
        if (typeof value === 'string' && !Number.isNaN(Number(value))) return Number(value);
        return value ?? -Infinity;
      }
      if (key === '_scudi_solo') {
        const value = row[key];
        if (typeof value === 'number') return value;
        return value === null ? -Infinity : -Infinity;
      }
      if (key === '_scudi_tg') {
        const value = row[key];
        if (typeof value === 'number') return value;
        return value === null ? -Infinity : -Infinity;
      }
      if (key === '_scudi_totali') {
        const value = row[key];
        if (typeof value === 'number') return value;
        return value === null ? -Infinity : -Infinity;
      }
      if (key === '_elo_rm_1vs1' || key === '_elo_rm_2vs2' || key === '_elo_rm_3vs3' || key === '_elo_rm_4vs4') {
        const eloInfo = row[key];
        return eloInfo ? eloInfo.rating ?? -Infinity : -Infinity;
      }
      if (key === 'elo' || key === 'wins' || key === 'losses' || key === 'drops' || key === 'games' || key === 'streak' || key === 'last_rating_change') {
        const value = row[key];
        if (typeof value === 'number') return value;
        if (typeof value === 'string' && !Number.isNaN(Number(value))) return Number(value);
        return value ?? -Infinity;
      }
      if (key.includes('time') && typeof row[key] === 'string') {
        const parsed = Date.parse(row[key]);
        return Number.isNaN(parsed) ? String(row[key]).toLowerCase() : parsed;
      }
      const value = row[key];
      if (value === null || value === undefined) return '';
      return String(value).toLowerCase();
    };

    const sortedData = [...filteredData].sort((a, b) => {
      const aValue = getSortValue(a, sortColumn);
      const bValue = getSortValue(b, sortColumn);

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }

      return sortDirection === 'asc'
        ? String(aValue).localeCompare(String(bValue))
        : String(bValue).localeCompare(String(aValue));
    });

    const formatValue = (value: any, key: string, rowData?: any) => {
      if (key === '_rank') {
        const rankLevel = rowData?.rank_level;
        if (!rankLevel) {
          return <span className="text-gray-400">Unranked</span>;
        }
        const normalizedRank = normalizeRankLabel(rankLevel);
        const rankIcon = RANK_ICONS[normalizedRank as keyof typeof RANK_ICONS];
        if (rankIcon) {
          return <img src={rankIcon} alt={normalizedRank} className="w-8 h-8 object-contain" />;
        }
        return <span className="font-medium text-white text-sm">{normalizedRank}</span>;
      }

      if (key === '_aoe_user') {
        const aoeUserName = rowData?.name || rowData?.player_name || 'Unknown';
        const siteUrl = rowData?.site_url;
        const profileIdUrl = rowData?.profile_id
          ? `http://aoe4world.com/players/${rowData.profile_id}`
          : undefined;
        const aoeUrl = siteUrl || (type === 'elo' ? profileIdUrl : undefined);

        return aoeUrl ? (
          <a
            href={aoeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-blue-400 hover:text-blue-300 cursor-pointer hover:underline"
          >
            {aoeUserName}
          </a>
        ) : (
          <span className="font-medium text-white">{aoeUserName}</span>
        );
      }

      if (key === '_elo_medio_solo_tg') {
        const value = rowData?.[key];
        return typeof value === 'number' ? value : 'N/A';
      }

      if (key === '_scudi_solo') {
        if (rowData?.rating_rm_1vs1 === 0) {
          return <div>N/A</div>;
        }
        const value = rowData?.[key];
        return typeof value === 'number' ? value : 'N/A';
      }

      if (key === '_scudi_tg') {
        if (rowData?.rating_rm_2vs2 === 0 || rowData?.rating_rm_3vs3 === 0 || rowData?.rating_rm_4vs4 === 0) {
          return <div>N/A</div>;
        }
        const value = rowData?.[key];
        return typeof value === 'number' ? value : 'N/A';
      }

      if (key === '_scudi_totali') {
        if (rowData?.rating_rm_1vs1 === 0 || rowData?.rating_rm_2vs2 === 0 || rowData?.rating_rm_3vs3 === 0 || rowData?.rating_rm_4vs4 === 0) {
          return <div>N/A</div>;
        }
        const value = rowData?.[key];
        return typeof value === 'number' ? value : 'N/A';
      }

      if (key === '_elo_rm_1vs1' || key === '_elo_rm_2vs2' || key === '_elo_rm_3vs3' || key === '_elo_rm_4vs4') {
        const eloInfo = rowData as any;
        const games = eloInfo?.[key]?.games ?? 0;
        const rating = eloInfo?.[key]?.rating;
        return (
          <div className="flex flex-col gap-0">
            <span>{rating !== undefined && rating !== null ? rating : 'N/A'}</span>
            <span className="text-gray-400">({games} partite)</span>
          </div>
        );
      }

      if (key === '_discord_user') {
        const avatarUrl = rowData?.discord_id && rowData?.discord_avatar
          ? `https://cdn.discordapp.com/avatars/${rowData.discord_id}/${rowData.discord_avatar}.webp?size=1024`
          : `https://cdn.discordapp.com/embed/avatars/1.png?size=1024`;

        const fallbackUrl = `https://cdn.discordapp.com/embed/avatars/1.png?size=1024`;
        const discordUrl = rowData?.discord_id ? `discord://discordapp.com/users/${rowData.discord_id}/` : null;

        return (
          <div className="flex items-center gap-3">
            <img
              src={avatarUrl}
              alt="Discord Avatar"
              className="w-10 h-10 rounded-full object-cover flex-shrink-0"
              onError={(e) => {
                (e.target as HTMLImageElement).src = fallbackUrl;
              }}
            />
            {discordUrl ? (
              <a
                href={discordUrl}
                className="font-medium text-blue-400 hover:text-blue-300 cursor-pointer"
              >
                {rowData?.discord_name || 'Unknown'}
              </a>
            ) : (
              <span className="font-medium text-white">{rowData?.discord_name || 'Unknown'}</span>
            )}
          </div>
        );
      }


      if (key === '_record') {
        console.log('rowData for _record:', rowData);
        const wins = rowData?.wins || 0;
        const losses = rowData?.losses || 0;
        const drops = rowData?.drops || 0;
        return (
          <div className="flex items-center gap-2">
            <span className="text-green-400">{wins}</span>
            <span className="text-gray-400">-</span>
            <span className="text-red-400">{losses}</span>
            <span className="text-gray-400">-</span>
            <span className="text-yellow-400">{drops}</span>
          </div>
        );
      }

      if (key === 'rating') {
        const currentRating = rowData?.rating ?? rowData?.highest_rating;
        if (currentRating === null || currentRating === undefined) {
          return 'N/A';
        }
        const maxRating = rowData?.highest_rating;
        if (maxRating !== undefined && maxRating !== null && maxRating !== currentRating) {
          return (
            <div className="flex flex-col gap-0">
              <span>{currentRating}</span>
              <span className="text-gray-400">(max {maxRating})</span>
            </div>
          );
        }
        return <span>{currentRating}</span>;
      }

      if (key === 'games') {
        const gamesValue = value ?? 0;
        const wins = rowData?.wins ?? 0;
        const losses = rowData?.losses ?? 0;
        const drops = rowData?.drops ?? 0;
        return <div className="flex items-center gap-1"><span className="font-medium text-white">{gamesValue}</span>
          (
          <span className="text-green-400">{wins}</span>
          <span className="text-gray-400">-</span>
          <span className="text-red-400">{losses}</span>
          <span className="text-gray-400">-</span>
          <span className="text-yellow-400">{drops}</span>
          )
        </div>;
      }

      if (value === null || value === undefined) return 'N/A';

      if (key.includes('url') || key.includes('site')) {
        return (
          <a href={value} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline truncate">
            {value}
          </a>
        );
      }

      if (key.includes('time') && typeof value === 'string') {
        try {
          const date = new Date(value);
          return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
        } catch {
          return value;
        }
      }

      if (key.includes('id') && typeof value === 'string' && value.length > 20) {
        return <span title={value} className="truncate">{value.substring(0, 20)}...</span>;
      }

      if (typeof value === 'number') {
        if (key.includes('wins')) return <span className="text-green-400">{value}</span>;
        if (key.includes('losses')) return <span className="text-red-400">{value}</span>;
        if (key.includes('rank')) return <span className="text-slate-400 font-bold">#{value}</span>;
      }

      if (key === 'streak') {
        const streakValue = Number(value);
        if (streakValue <= -5) {
          return (
            <div className="flex items-center gap-1 text-red-400">
              <span>{value}</span>
              <Skull size={16} />
            </div>
          );
        } else if (streakValue >= 5) {
          return (
            <div className="flex items-center gap-1 text-green-400">
              <span>{value}</span>
              <Rocket size={16} />
            </div>
          );
        }
      }

      if (key === 'win_rate') {
        const numericValue = typeof value === 'string' ? Number(value) : value;
        return <span>{Number.isNaN(numericValue) ? String(value) : `${numericValue}%`}</span>;
      }

      return String(value);
    };

    return (
      <div>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between px-4 py-4 border-b border-white/10 bg-neutral-950/40">
          <div className="text-sm text-gray-300">
            {filteredData.length} righe trovate
          </div>
          <div className="w-full max-w-md">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cerca per Utente Discord o Utente Aoe"
              className="w-full rounded-2xl border border-white/10 bg-neutral-950/90 px-4 py-3 text-sm text-white placeholder:text-neutral-500 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400/20"
            />
          </div>
        </div>
        <div className="overflow-x-auto pb-4">
          <table className="w-max min-w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.03] sticky top-0">
                {allKeys.map((key, i) => (
                  <th
                    key={key}
                    onClick={() => handleSort(key)}
                    className={`pl-4 py-3 text-left font-bold text-white uppercase tracking-wider whitespace-nowrap text-xs cursor-pointer select-none ${
                      key === '_scudi_totali' || i === allKeys.length - 1 ? 'pr-10 min-w-[180px]' : 'pr-4'
                    }`}
                  >
                    <div className="inline-flex items-center gap-2">
                      {renderHeaderLabel(key)}
                      {sortColumn === key && (
                        <span className="text-slate-400">{sortDirection === 'desc' ? '↓' : '↑'}</span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedData.map((item, idx) => (
                <tr key={idx} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  {allKeys.map((key, i) => (
                    <td 
                      key={`${idx}-${key}`} 
                      className={`pl-4 py-3 text-white max-w-xs ${
                        key === '_scudi_totali' || i === allKeys.length - 1 ? 'pr-10' : 'pr-4'
                      }`}
                    >
                      {formatValue(item[key], key, item)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full min-h-screen bg-[#000000]">
      {/* Header */}
      <div className="bg-gradient-to-b from-neutral-900 to-transparent pt-8 pb-6 px-6 md:px-20 border-b border-white/10">
        <div className="flex items-center gap-3 mb-2">
          <Award size={32} className="text-amber-400" />
          <h1 className="text-3xl md:text-4xl font-black text-white uppercase tracking-wider">Classifica</h1>
        </div>
        <p className="text-gray-400 text-sm md:text-base">AoeItalia.com</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-white/10 px-6 md:px-20 bg-white/[0.02]">
        {[
          { id: 'elo' as LeaderboardType, label: 'Elo Classificate' },
          { id: 'singolo' as LeaderboardType, label: 'Classifica Singolo' },
          { id: 'team' as LeaderboardType, label: 'Classifica Ranked' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              setSortColumn(tab.id === 'elo' ? '_scudi_totali' : 'rating');
              setSortDirection('desc');
            }}
            className={`px-4 md:px-6 py-4 font-bold uppercase tracking-wider text-sm border-b-2 transition-all ${activeTab === tab.id
              ? 'border-slate-300 text-white'
              : 'border-transparent text-gray-400 hover:text-white'
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="px-6 md:px-20 py-8">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-400"></div>
            </div>
            <p className="mt-4 text-gray-400">Loading leaderboards...</p>
          </div>
        ) : error ? (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6 text-red-400">
            <p className="font-bold">Error loading leaderboards</p>
            <p className="text-sm mt-2">{error}</p>
          </div>
        ) : (
          <div className="bg-white/[0.02] border border-white/10 rounded-lg">
            {activeTab === 'singolo' && renderTable(soloData, 'singolo')}
            {activeTab === 'team' && renderTable(teamData, 'team')}
            {activeTab === 'elo' && renderTable(eloData, 'elo')}
          </div>
        )}
      </div>
    </div>
  );
}
