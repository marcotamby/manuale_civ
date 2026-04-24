import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './AuthContext';

export interface PresenceState {
  user: {
    email: string;
    name: string | null;
    nickname?: string;
    avatar?: string | null;
  };
  activity: {
    type: 'viewing' | 'editing' | 'idle';
    civId?: string;
    section?: string;
  };
  last_seen: string;
}

interface PresenceContextType {
  activeAdmins: Record<string, PresenceState>;
  onlineUserCount: number;
  usersByPage: Record<string, number>;
  updateActivity: (activity: any) => void;
}

const PresenceContext = createContext<PresenceContextType>({
  activeAdmins: {},
  onlineUserCount: 0,
  usersByPage: {},
  updateActivity: () => { }
});

export function PresenceProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isAdmin, isStreamer } = useAuth();
  const [activeAdmins, setActiveAdmins] = useState<Record<string, PresenceState>>({});
  const [onlineUserCount, setOnlineUserCount] = useState(0);
  const [usersByPage, setUsersByPage] = useState<Record<string, number>>({});
  const [activity, setActivity] = useState<any>({ type: 'idle' });

  // 1. Staff Presence (detailed)
  useEffect(() => {
    if (!isAuthenticated || (!isAdmin && !isStreamer) || !user?.email) {
      setActiveAdmins({});
      return;
    }

    const channel = supabase.channel('staff-presence', {
      config: { presence: { key: user.email } }
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const formatted: Record<string, PresenceState> = {};
        Object.keys(state).forEach(key => {
          const presences = state[key] as any[];
          if (presences.length > 0) {
            formatted[key] = presences[0] as PresenceState;
          }
        });
        setActiveAdmins(formatted);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user: {
              name: user.name,
              nickname: user.nickname,
              avatar: user.avatar_url,
              email: user.email
            },
            activity,
            last_seen: new Date().toISOString()
          });
        }
      });

    return () => { channel.unsubscribe(); };
  }, [isAuthenticated, isAdmin, isStreamer, user?.email, activity]);

    // 2. Global User Presence (privacy-focused)
    useEffect(() => {
      let timeoutId: any;
      let channel: any;
  
      const consent = localStorage.getItem('cookieConsent');
      // If user declined cookies, we don't track them in the global counter
      if (consent === 'declined') {
        setOnlineUserCount(0);
        return;
      }
  
      // We delay the presence connection by 2 seconds to allow 
      // the main data fetch (civilizations) to complete first.
      // This helps bypass some corporate firewall "burst" blocks.
      timeoutId = setTimeout(() => {
        try {
          let guestId = 'guest-temp';
          try {
            guestId = sessionStorage.getItem('presence_guest_id') || '';
            if (!guestId) {
              guestId = 'guest-' + Math.random().toString(36).substring(2, 9);
              sessionStorage.setItem('presence_guest_id', guestId);
            }
          } catch (e) {
            console.warn('sessionStorage not available, using temporary guest ID');
          }
  
          const presenceKey = user?.email || guestId;
  
          channel = supabase.channel('global-presence', {
            config: { presence: { key: presenceKey } }
          });
  
          channel
            .on('presence', { event: 'sync' }, () => {
              const state = channel.presenceState();
              const keys = Object.keys(state);
              setOnlineUserCount(keys.length);
  
              const distribution: Record<string, number> = {};
              keys.forEach(key => {
                const p = state[key] as any[];
                if (p.length > 0 && p[0].page) {
                  const page = p[0].page;
                  distribution[page] = (distribution[page] || 0) + 1;
                }
              });
              setUsersByPage(distribution);
            })
            .subscribe(async (status: string) => {
              if (status === 'CHANNEL_ERROR') {
                console.warn('Connessione al counter bloccata dalla rete (probabile firewall aziendale).');
                return;
              }
              
              if (status === 'SUBSCRIBED') {
                try {
                  await channel.track({
                    page: activity.civId || activity.section || 'home',
                    active: true
                  });
                } catch (err) {
                  console.error('Error tracking presence:', err);
                }
              }
            });
        } catch (err) {
          console.error('Failed to initialize presence channel:', err);
        }
      }, 2000);
  
      return () => { 
        clearTimeout(timeoutId);
        if (channel) channel.unsubscribe(); 
      };
    }, [user?.email, activity]);

  const updateActivity = (newActivity: any) => {
    setActivity(newActivity);
  };

  return (
    <PresenceContext.Provider value={{ activeAdmins, onlineUserCount, usersByPage, updateActivity }}>
      {children}
    </PresenceContext.Provider>
  );
}

export function usePresence() {
  const context = useContext(PresenceContext);
  return context;
}
