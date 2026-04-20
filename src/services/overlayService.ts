import { supabase } from '../lib/supabaseClient';

export interface OverlayState {
  t1: { name: string; score: number; players: string[] };
  t2: { name: string; score: number; players: string[] };
  maps: any[];
  timer: { active: boolean; min: number; sec: number; timestamp: number };
  casters: { active: boolean; name: string }[];
}

export const overlayService = {
  async getOverlayState(id: string = 'aoe4-match'): Promise<OverlayState | null> {
    const { data, error } = await supabase
      .from('stream_overlays')
      .select('state')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Errore nel recupero dello stato dell\'overlay:', error);
      return null;
    }

    return data.state as OverlayState;
  },

  async updateOverlayState(id: string = 'aoe4-match', state: OverlayState) {
    const { error } = await supabase
      .from('stream_overlays')
      .update({ 
        state,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) {
      throw error;
    }
  },

  subscribeToOverlay(id: string = 'aoe4-match', callback: (state: OverlayState) => void) {
    return supabase
      .channel(`overlay-${id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'stream_overlays',
          filter: `id=eq.${id}`
        },
        (payload) => {
          callback(payload.new.state as OverlayState);
        }
      )
      .subscribe();
  }
};
