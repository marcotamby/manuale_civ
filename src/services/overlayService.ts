import { supabase } from '../lib/supabaseClient';
// Real-time overlay service for AoE4 match data sync


export interface OverlayState {
  t1?: { name: string; score: number; players: string[]; active?: boolean };
  t2?: { name: string; score: number; players: string[]; active?: boolean };
  p1?: { name: string; score: number; civId: string };
  p2?: { name: string; score: number; civId: string };
  map?: string;
  maps?: any[];
  timer: { active: boolean; min?: number; sec?: number; timestamp?: number; startTime?: number | null };
  casters: { active: boolean; name: string }[];
  bracket?: any;
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

  async getOverlayName(id: string = 'aoe4-match'): Promise<string | null> {
    const { data, error } = await supabase
      .from('stream_overlays')
      .select('display_name')
      .eq('id', id)
      .single();
    if (error || !data) return null;
    return (data as any).display_name as string | null;
  },

  async getOverlayIcon(id: string = 'aoe4-match'): Promise<string | null> {
    const { data, error } = await supabase
      .from('stream_overlays')
      .select('icon_url')
      .eq('id', id)
      .single();
    if (error || !data) return null;
    return (data as any).icon_url as string | null;
  },

  async getOverlayBackground(id: string = 'aoe4-match'): Promise<string | null> {
    const { data, error } = await supabase
      .from('stream_overlays')
      .select('background_url')
      .eq('id', id)
      .single();
    if (error || !data) return null;
    return (data as any).background_url as string | null;
  },

  async getOverlayDescription(id: string = 'aoe4-match'): Promise<string | null> {
    const { data, error } = await supabase
      .from('stream_overlays')
      .select('description')
      .eq('id', id)
      .single();
    if (error || !data) return null;
    return (data as any).description as string | null;
  },

  async updateOverlayName(id: string = 'aoe4-match', displayName: string) {
    const { error } = await supabase
      .from('stream_overlays')
      .upsert({ id, display_name: displayName }, { onConflict: 'id' });

    if (error) throw error;
  },

  async updateOverlayIcon(id: string = 'aoe4-match', iconUrl: string) {
    const { error } = await supabase
      .from('stream_overlays')
      .upsert({ id, icon_url: iconUrl }, { onConflict: 'id' });

    if (error) throw error;
  },

  async updateOverlayBackground(id: string = 'aoe4-match', backgroundUrl: string) {
    const { error } = await supabase
      .from('stream_overlays')
      .upsert({ id, background_url: backgroundUrl }, { onConflict: 'id' });

    if (error) throw error;
  },

  async updateOverlayDescription(id: string = 'aoe4-match', description: string) {
    const { error } = await supabase
      .from('stream_overlays')
      .upsert({ id, description }, { onConflict: 'id' });

    if (error) throw error;
  },

  async updateOverlayState(id: string = 'aoe4-match', state: OverlayState) {
    try {
      // 1. Prova prima l'aggiornamento
      const { data, error } = await supabase
        .from('stream_overlays')
        .update({ 
          state,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select();

      if (error) throw error;

      // 2. Se non ha aggiornato nulla (es. record non esiste), prova l'inserimento
      if (!data || data.length === 0) {
        console.log('Record non trovato, provo l\'inserimento...');
        const { error: insertError } = await supabase
          .from('stream_overlays')
          .insert({ 
            id,
            state,
            updated_at: new Date().toISOString()
          });
        
        if (insertError) throw insertError;
      }
    } catch (err) {
      console.error('Errore dettagliato in overlayService:', err);
      throw err;
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
