import { supabase } from '../lib/supabaseClient';

export type TurnPlayer = 'HOST' | 'GUEST';
export type TurnAction = 'BAN' | 'PICK';
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
  created_at?: string;
  updated_at?: string;
}

export interface DraftState {
  hostPicks: string[];
  guestPicks: string[];
  hostBans: string[];
  guestBans: string[];
  mapPicks: string[];
  mapBans: string[];
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

export const draftService = {
  // Preset management
  async getPresets(): Promise<DraftPreset[]> {
    const { data, error } = await supabase
      .from('draft_presets')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Error fetching draft presets from Supabase, using local fallback if needed:', error);
      return [];
    }
    return data || [];
  },

  async getPresetById(id: string): Promise<DraftPreset | null> {
    const { data, error } = await supabase
      .from('draft_presets')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return null;
    return data;
  },

  async savePreset(preset: Partial<DraftPreset>): Promise<DraftPreset | null> {
    const id = preset.id || `preset-${Date.now()}`;
    const payload = {
      id,
      title: preset.title || 'Nuovo Preset Draft',
      description: preset.description || '',
      scope: preset.scope || 'civs',
      is_active: preset.is_active ?? true,
      turns: preset.turns || [],
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('draft_presets')
      .upsert([payload])
      .select()
      .single();

    if (error) {
      console.error('Error saving draft preset:', error);
      throw error;
    }
    return data;
  },

  async deletePreset(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('draft_presets')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting draft preset:', error);
      throw error;
    }
    return true;
  },

  // Room management
  async createRoom(preset: DraftPreset, hostName = 'Giocatore 1', guestName = 'Giocatore 2'): Promise<DraftRoom> {
    const roomId = generateDraftId(7);
    const roomPayload: Partial<DraftRoom> = {
      id: roomId,
      preset_id: preset.id,
      title: preset.title,
      host_name: hostName || 'Giocatore 1',
      guest_name: guestName || 'Giocatore 2',
      current_step: 0,
      timer_ends_at: null,
      state: {
        hostPicks: [],
        guestPicks: [],
        hostBans: [],
        guestBans: [],
        mapPicks: [],
        mapBans: []
      },
      status: 'waiting'
    };

    const { data, error } = await supabase
      .from('draft_rooms')
      .insert([roomPayload])
      .select()
      .single();

    if (error) {
      console.error('Error creating draft room in Supabase:', error);
      // Fallback local session if table not present yet
      return { ...roomPayload, preset } as DraftRoom;
    }

    return { ...data, preset };
  },

  async getRoom(roomId: string): Promise<DraftRoom | null> {
    const { data, error } = await supabase
      .from('draft_rooms')
      .select('*, draft_presets(*)')
      .eq('id', roomId)
      .single();

    if (error || !data) return null;

    const presetData = (data as any).draft_presets || null;
    return {
      ...data,
      preset: presetData
    };
  },

  async updateRoom(roomId: string, updates: Partial<DraftRoom>): Promise<DraftRoom | null> {
    const { data, error } = await supabase
      .from('draft_rooms')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', roomId)
      .select('*, draft_presets(*)')
      .single();

    if (error) {
      console.error('Error updating draft room:', error);
      return null;
    }

    const presetData = (data as any).draft_presets || null;
    return {
      ...data,
      preset: presetData
    };
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
          if (fresh) onUpdate(fresh);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }
};
