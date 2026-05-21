import { civilizationsData } from '../data/aoe4Data';
import { AOE4_MAPS } from '../data/aoe4Maps';
import { io } from 'socket.io-client';

export interface ParsedDraft {
  nameHost: string;
  nameGuest: string;
  hostPlayers: string[];
  guestPlayers: string[];
  hostPicks: string[]; // mapped civ IDs
  guestPicks: string[]; // mapped civ IDs
  hostBans: string[]; // mapped civ IDs
  guestBans: string[]; // mapped civ IDs
  maps: string[]; // mapped map names
}

export const mapAoe2cmCivId = (id: string): string => {
  if (!id) return '';
  
  // Clean string: remove "aoe4." prefix, lowercase and trim
  const clean = id.replace(/^aoe4\./i, '').toLowerCase().trim();
  
  const mapping: Record<string, string> = {
    'rus': 'rus',
    'holyromanempire': 'hre',
    'hre': 'hre',
    'chinese': 'chinese',
    'english': 'english',
    'delhisultanate': 'delhi',
    'delhi': 'delhi',
    'mongols': 'mongols',
    'abbasiddynasty': 'abbasid',
    'abbasid': 'abbasid',
    'french': 'french',
    'ottomans': 'ottomans',
    'malians': 'malians',
    'byzantines': 'byzantines',
    'japanese': 'japanese',
    'ayyubids': 'ayyubids',
    'ayyubid': 'ayyubids',
    'zhuxilegacy': 'zhuxi',
    'zhuxi': 'zhuxi',
    'jeannedarc': 'jeannedarc',
    'orderofthedragon': 'orderofthedragon',
    'houseoflancaster': 'lancaster',
    'lancaster': 'lancaster',
    'tughlaqdynasty': 'delhi',
    'sengokudaimyo': 'sengoku',
    'sengoku': 'sengoku',
    'knightstemplar': 'templar',
    'templar': 'templar',
    'jindynasty': 'jin-dynasty',
    'goldenhorde': 'goldenhorde',
    'macedoniandynasty': 'macedonian',
    'macedonian': 'macedonian'
  };
  
  if (mapping[clean]) return mapping[clean];
  
  // Search fallback in local data
  const match = civilizationsData.find(c => 
    c.id.toLowerCase() === clean || 
    clean.includes(c.id.toLowerCase()) || 
    c.id.toLowerCase().includes(clean)
  );
  return match ? match.id : '';
};

export const mapAoe2cmMapName = (id: string): string => {
  if (!id) return '';
  const clean = id.toLowerCase().replace(/[-_]/g, ' ').trim();
  
  const found = AOE4_MAPS.find(m => 
    m.toLowerCase() === clean || 
    clean.includes(m.toLowerCase()) || 
    m.toLowerCase().includes(clean)
  );
  return found || '';
};

export const parsePlayers = (name: string): string[] => {
  if (!name) return ['', '', ''];
  // Split by common delimiters like comma, ampersand, plus, slash, " - ", " and ", " e "
  const parts = name.split(/[,&/+\\]| - | and | e /i).map(s => s.trim()).filter(Boolean);
  return [parts[0] || '', parts[1] || '', parts[2] || ''];
};

export const getDraftIdFromUrl = (url: string): string => {
  if (!url) return '';
  // Match draft/abcde or preset/abcde or just trailing id
  const match = url.match(/(?:draft|preset)\/([a-zA-Z0-9_-]+)/) || url.match(/\/([a-zA-Z0-9_-]+)$/);
  return match ? match[1] : url.trim();
};

export async function fetchDraft(urlOrId: string): Promise<ParsedDraft> {
  const draftId = getDraftIdFromUrl(urlOrId);
  if (!draftId) {
    throw new Error('Link del draft non valido.');
  }

  let data: any = null;

  try {
    const response = await fetch(`https://aoe2cm.net/api/draft/${draftId}?t=${Date.now()}`, { cache: 'no-store' });
    if (response.ok) {
      data = await response.json();
    }
  } catch (err) {
    console.warn("HTTP fetch failed, will fallback to socket.io", err);
  }

  // Fallback a socket.io per i draft in diretta (che restituiscono 404 sull'API REST)
  if (!data) {
    data = await new Promise((resolve, reject) => {
      const socket = io("wss://aoe2cm.net", { query: { draftId }, transports: ['websocket'] });
      
      const timeout = setTimeout(() => {
        socket.disconnect();
        reject(new Error("Timeout durante il recupero del draft in diretta (Socket.io)"));
      }, 5000);

      socket.on("draft_state", (state: any) => {
        clearTimeout(timeout);
        socket.disconnect();
        resolve(state);
      });

      socket.on("connect_error", (err: any) => {
        clearTimeout(timeout);
        socket.disconnect();
        reject(new Error(`Errore di connessione live: ${err.message}`));
      });
      
      socket.on("message", (msg: string) => {
         if (msg === 'This draft does not exist.') {
            clearTimeout(timeout);
            socket.disconnect();
            reject(new Error("Il draft non esiste."));
         }
      });
    });
  }

  if (!data) {
    throw new Error('Impossibile recuperare i dati del draft.');
  }

  const draft = data.draft || data; // handle wrapped response
  
  const events = draft.events || draft.state?.events || [];
  const nameHost = draft.nameHost || draft.host?.name || '';
  const nameGuest = draft.nameGuest || draft.guest?.name || '';
  
  const hostPlayers = parsePlayers(nameHost);
  const guestPlayers = parsePlayers(nameGuest);
  
  const hostPicks: string[] = [];
  const guestPicks: string[] = [];
  const hostBans: string[] = [];
  const guestBans: string[] = [];
  const maps: string[] = [];

  events.forEach((evt: any) => {
    const player = (evt.player || '').toUpperCase();
    const action = (evt.action || evt.actionType || '').toUpperCase();
    const optionId = evt.chosenOptionId || evt.optionId || evt.option || '';
    
    if (!optionId) return;

    // Check if the option is a map or a civ
    const mappedMapName = mapAoe2cmMapName(optionId);
    if (mappedMapName) {
      if (action === 'PICK' || action === 'CHOOSE') {
        maps.push(mappedMapName);
      }
    } else {
      const mappedCivId = mapAoe2cmCivId(optionId);
      if (mappedCivId) {
        if (action === 'PICK' || action === 'CHOOSE') {
          if (player === 'HOST') {
            hostPicks.push(mappedCivId);
          } else if (player === 'GUEST') {
            guestPicks.push(mappedCivId);
          }
        } else if (action === 'BAN') {
          if (player === 'HOST') {
            hostBans.push(mappedCivId);
          } else if (player === 'GUEST') {
            guestBans.push(mappedCivId);
          }
        }
      }
    }
  });

  return {
    nameHost,
    nameGuest,
    hostPlayers,
    guestPlayers,
    hostPicks,
    guestPicks,
    hostBans,
    guestBans,
    maps
  };
}
