import { supabase } from '../lib/supabaseClient';
import { AOE4_MAPS } from '../data/aoe4Maps';

export type TurnPlayer = 'HOST' | 'GUEST' | 'ADMIN';
export type TurnAction = 'BAN' | 'PICK' | 'SNIPE' | 'AUTO_PICK_LAST_MAP' | 'REVEAL_BANS' | 'REVEAL_PICKS' | 'REVEAL_ALL';
export type TurnTarget = 'CIV' | 'MAP';

export interface DraftTurn {
  step: number;
  player: TurnPlayer;
  action: TurnAction;
  target: TurnTarget;
  amount: number;
  timeLimit: number; // default 30
}

export interface DraftPreset {
  id: string;
  title: string;
  description?: string;
  scope: 'civs' | 'maps' | 'both';
  is_active: boolean;
  turns: DraftTurn[];
  map_pool?: string[];
  created_at?: string;
  updated_at?: string;
}

export interface DraftState {
  hostPicks: string[];
  guestPicks: string[];
  hostBans: string[];
  guestBans: string[];
  hostSnipes: string[];
  guestSnipes: string[];
  hostReady?: boolean;
  guestReady?: boolean;
  hostClaimed?: boolean;
  guestClaimed?: boolean;
  mapPicks: string[];
  mapBans: string[];
  hostMapPicks?: string[];
  guestMapPicks?: string[];
  hostMapBans?: string[];
  guestMapBans?: string[];
  adminMapPicks?: string[];
  mapPool?: string[];
  revealedBans?: boolean;
  revealedPicks?: boolean;
}

export interface DraftRoom {
  id: string;
  preset_id: string | null;
  title: string;
  host_name: string;
  guest_name: string;
  current_step: number;
  timer_ends_at: string | null;
  state: DraftState;
  status: 'waiting' | 'in_progress' | 'completed';
  is_archived?: boolean;
  created_at?: string;
  updated_at?: string;
  preset?: DraftPreset;
}

// Generate random short ID for draft rooms
export function generateDraftId(length = 7): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Helper to save/read fallback room & presets in local storage
function setLocalRoom(room: DraftRoom) {
  try {
    localStorage.setItem(`fallback_draft_room_${room.id}`, JSON.stringify(room));
  } catch (e) {
    console.warn('Could not save local room fallback:', e);
  }
}

function getLocalRoom(roomId: string): DraftRoom | null {
  try {
    const raw = localStorage.getItem(`fallback_draft_room_${roomId}`);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function markLocalRoomDeleted(roomId: string) {
  try {
    const raw = localStorage.getItem('deleted_draft_room_ids');
    const ids: string[] = raw ? JSON.parse(raw) : [];
    if (!ids.includes(roomId)) {
      localStorage.setItem('deleted_draft_room_ids', JSON.stringify([...ids, roomId]));
    }
  } catch (e) {}
}

function getDeletedRoomIds(): Set<string> {
  try {
    const raw = localStorage.getItem('deleted_draft_room_ids');
    const ids: string[] = raw ? JSON.parse(raw) : [];
    return new Set(ids);
  } catch (e) {
    return new Set();
  }
}

function setLocalPreset(preset: DraftPreset) {
  try {
    const raw = localStorage.getItem('fallback_draft_presets');
    const existing: DraftPreset[] = raw ? JSON.parse(raw) : [];
    const filtered = existing.filter(p => p.id !== preset.id);
    localStorage.setItem('fallback_draft_presets', JSON.stringify([preset, ...filtered]));
  } catch (e) {
    console.warn('Could not save local preset fallback:', e);
  }
}

function getLocalPresets(): DraftPreset[] {
  try {
    const raw = localStorage.getItem('fallback_draft_presets');
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function removeLocalPreset(id: string) {
  try {
    const raw = localStorage.getItem('fallback_draft_presets');
    const existing: DraftPreset[] = raw ? JSON.parse(raw) : [];
    localStorage.setItem('fallback_draft_presets', JSON.stringify(existing.filter(p => p.id !== id)));
  } catch (e) {}
}

export const draftService = {
  async getPresets(): Promise<DraftPreset[]> {
    const { data } = await supabase
      .from('draft_presets')
      .select('*')
      .order('created_at', { ascending: false });

    const dbPresets = data || [];
    const localPresets = getLocalPresets();

    // Merge DB presets and local presets (DB takes priority, but preserve map_pool if DB is missing it)
    const map = new Map<string, DraftPreset>();
    localPresets.forEach(p => map.set(p.id, p));
    dbPresets.forEach(p => {
      const local = localPresets.find(lp => lp.id === p.id);
      const mergedMapPool = (p.map_pool && Array.isArray(p.map_pool) && p.map_pool.length > 0)
        ? p.map_pool
        : (local?.map_pool && local.map_pool.length > 0)
        ? local.map_pool
        : (p.scope === 'maps' || p.scope === 'both') ? [...AOE4_MAPS] : [];
      map.set(p.id, { ...p, map_pool: mergedMapPool });
    });

    return Array.from(map.values());
  },

  async getPresetById(id: string): Promise<DraftPreset | null> {
    const { data } = await supabase
      .from('draft_presets')
      .select('*')
      .eq('id', id)
      .single();

    const local = getLocalPresets().find(p => p.id === id);

    if (data) {
      const mergedMapPool = (data.map_pool && Array.isArray(data.map_pool) && data.map_pool.length > 0)
        ? data.map_pool
        : (local?.map_pool && local.map_pool.length > 0)
        ? local.map_pool
        : (data.scope === 'maps' || data.scope === 'both') ? [...AOE4_MAPS] : [];
      const presetWithPool = { ...data, map_pool: mergedMapPool };
      setLocalPreset(presetWithPool);
      return presetWithPool;
    }

    // Check local fallback
    if (local) return local;

    return null;
  },

  async savePreset(preset: Partial<DraftPreset>): Promise<DraftPreset | null> {
    const id = preset.id || `preset-${Date.now()}`;
    const mapPoolToSave = (preset.map_pool && Array.isArray(preset.map_pool) && preset.map_pool.length > 0)
      ? preset.map_pool
      : (preset.scope === 'maps' || preset.scope === 'both') ? [...AOE4_MAPS] : [];

    const payloadWithMapPool = {
      id,
      title: preset.title || 'Nuovo Preset Draft',
      description: preset.description || '',
      scope: preset.scope || 'civs',
      is_active: preset.is_active ?? true,
      turns: preset.turns || [],
      map_pool: mapPoolToSave,
      updated_at: new Date().toISOString()
    };

    // First try saving with map_pool
    let { data, error } = await supabase
      .from('draft_presets')
      .upsert([payloadWithMapPool])
      .select()
      .single();

    // If map_pool column doesn't exist on DB yet, try fallback without map_pool column in SQL payload
    if (error) {
      console.warn('Supabase save with map_pool failed, attempting fallback save:', error.message);
      const { map_pool, ...payloadWithoutMapPool } = payloadWithMapPool;
      const res = await supabase
        .from('draft_presets')
        .upsert([payloadWithoutMapPool])
        .select()
        .single();
      
      if (res.data) {
        data = { ...res.data, map_pool: mapPoolToSave };
        error = null;
      }
    }

    const savedPreset: DraftPreset = data ? { ...data, map_pool: mapPoolToSave } : (payloadWithMapPool as DraftPreset);
    setLocalPreset(savedPreset);

    return savedPreset;
  },

  async deletePreset(id: string): Promise<boolean> {
    removeLocalPreset(id);
    const { error } = await supabase
      .from('draft_presets')
      .delete()
      .eq('id', id);

    if (error) {
      console.warn('Supabase delete preset warning:', error);
    }
    return true;
  },

  // Room Management
  async createRoom(preset: DraftPreset, playerName: string = 'Giocatore 1', role: TurnPlayer = 'SPECTATOR'): Promise<DraftRoom> {
    const roomId = generateDraftId(7);
    const roomPayload: any = {
      id: roomId,
      preset_id: preset.id,
      title: preset.title,
      host_name: 'Giocatore 1',
      guest_name: 'Giocatore 2',
      current_step: 0,
      timer_ends_at: null,
      state: {
        hostPicks: [],
        guestPicks: [],
        hostBans: [],
        guestBans: [],
        hostSnipes: [],
        guestSnipes: [],
        hostReady: false,
        guestReady: false,
        hostClaimed: false,
        guestClaimed: false,
        mapPicks: [],
        mapBans: [],
        hostMapPicks: [],
        guestMapPicks: [],
        hostMapBans: [],
        guestMapBans: [],
        adminMapPicks: [],
        mapPool: preset.map_pool || [],
        revealedBans: false,
        revealedPicks: false
      },
      status: 'waiting'
    };

    const { data, error } = await supabase
      .from('draft_rooms')
      .insert([roomPayload])
      .select()
      .single();

    const createdRoom: DraftRoom = data ? { ...data, preset } : { ...roomPayload, preset };
    setLocalRoom(createdRoom);

    if (error) {
      console.warn('Draft room created in local fallback due to Supabase notice:', error);
    }

    return createdRoom;
  },

  async getRoom(roomId: string): Promise<DraftRoom | null> {
    const { data, error } = await supabase
      .from('draft_rooms')
      .select('*')
      .eq('id', roomId)
      .single();

    if (error || !data) {
      // Check local fallback
      const local = getLocalRoom(roomId);
      if (local) return local;
      return null;
    }

    let preset: DraftPreset | null = null;
    if (data.preset_id) {
      preset = await draftService.getPresetById(data.preset_id);
    }

    // Ensure preset map_pool is populated from room state if present
    if (data.state?.mapPool && Array.isArray(data.state.mapPool) && data.state.mapPool.length > 0) {
      if (!preset) {
        preset = {
          id: data.preset_id || 'unknown',
          title: data.title || 'Draft Match',
          scope: 'both',
          is_active: true,
          turns: [],
          map_pool: data.state.mapPool
        };
      } else {
        preset = { ...preset, map_pool: data.state.mapPool };
      }
    }

    const roomObj: DraftRoom = {
      ...data,
      preset: preset || undefined
    };

    setLocalRoom(roomObj);
    return roomObj;
  },

  async getRoomsByPresetId(presetId: string): Promise<DraftRoom[]> {
    const { data, error } = await supabase
      .from('draft_rooms')
      .select('*')
      .eq('preset_id', presetId)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Error fetching rooms by preset:', error);
      return [];
    }
    const deletedIds = getDeletedRoomIds();
    return (data || []).filter(r => !deletedIds.has(r.id));
  },

  async archiveRoom(roomId: string, isArchived: boolean): Promise<boolean> {
    const { error } = await supabase
      .from('draft_rooms')
      .update({ is_archived: isArchived })
      .eq('id', roomId);

    if (error) {
      console.error('Error archiving draft room:', error);
      // Fallback update
      const local = getLocalRoom(roomId);
      if (local) {
        local.is_archived = isArchived;
        setLocalRoom(local);
        return true;
      }
      return false;
    }
    return true;
  },

  async deleteRoom(roomId: string): Promise<boolean> {
    markLocalRoomDeleted(roomId);
    try {
      localStorage.removeItem(`fallback_draft_room_${roomId}`);
    } catch (e) {}

    const { error } = await supabase
      .from('draft_rooms')
      .delete()
      .eq('id', roomId);

    if (error) {
      console.warn('Error or notice when deleting draft room from Supabase:', error.message);
    }
    return true;
  },

  async updateRoom(roomId: string, updates: Partial<DraftRoom>): Promise<DraftRoom | null> {
    // Exclude preset object from DB payload
    const { preset, ...dbPayload } = updates as any;

    const { data, error } = await supabase
      .from('draft_rooms')
      .update({
        ...dbPayload,
        updated_at: new Date().toISOString()
      })
      .eq('id', roomId)
      .select('*')
      .single();

    let roomObj: DraftRoom | null = null;

    if (error || !data) {
      console.warn('Updating room in local fallback:', error);
      const local = getLocalRoom(roomId);
      if (local) {
        roomObj = { ...local, ...updates };
        setLocalRoom(roomObj);
      }
    } else {
      let presetData: DraftPreset | null = null;
      if (data.preset_id) {
        presetData = await draftService.getPresetById(data.preset_id);
      }
      roomObj = {
        ...data,
        preset: presetData || undefined
      };
      if (roomObj) setLocalRoom(roomObj);
    }

    return roomObj;
  },

  subscribeToRoom(roomId: string, onUpdate: (room: DraftRoom) => void) {
    const channel = supabase
      .channel(`draft_room_${roomId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'draft_rooms',
          filter: `id=eq.${roomId}`
        },
        async () => {
          const fresh = await draftService.getRoom(roomId);
          if (fresh !== null) onUpdate(fresh);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }
};
