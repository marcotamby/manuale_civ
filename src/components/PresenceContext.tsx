import { createContext, useContext, useEffect, useState, useRef } from 'react';
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
  const [consentStatus, setConsentStatus] = useState<string | null>(
    () => localStorage.getItem('cookieConsent')
  );

  useEffect(() => {
    const handleConsentChange = () => {
      setConsentStatus(localStorage.getItem('cookieConsent'));
    };
    window.addEventListener('cookie-consent-changed', handleConsentChange);
    return () => {
      window.removeEventListener('cookie-consent-changed', handleConsentChange);
    };
  }, []);

  const staffChannelRef = useRef<any>(null);
  const globalChannelRef = useRef<any>(null);
  const isGlobalConnected = useRef(false);

  // 1. Staff Presence Lifecycle
  useEffect(() => {
    if (!isAuthenticated || (!isAdmin && !isStreamer) || !user?.email) {
      if (staffChannelRef.current) {
        staffChannelRef.current.unsubscribe();
        staffChannelRef.current = null;
      }
      setActiveAdmins({});
      return;
    }

    // Only create channel if it doesn't exist
    if (!staffChannelRef.current) {
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

      staffChannelRef.current = channel;
    }

    return () => {
      // We don't unsubscribe on every re-render, only on unmount or auth change
      // handled by the dependency array and the cleanup logic at the top of the effect
    };
  }, [isAuthenticated, isAdmin, isStreamer, user?.email]);

  // 2. Global User Presence Lifecycle
  useEffect(() => {
    let timeoutId: any;

    if (consentStatus === 'declined') {
      if (globalChannelRef.current) {
        globalChannelRef.current.unsubscribe();
        globalChannelRef.current = null;
      }
      setOnlineUserCount(0);
      return;
    }

    // Only connect if not already connected
    if (!globalChannelRef.current) {
      // Delay initial connection
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

          const channel = supabase.channel('global-presence', {
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
                console.warn('Connessione al counter bloccata dalla rete.');
                return;
              }

              if (status === 'SUBSCRIBED') {
                isGlobalConnected.current = true;
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

          globalChannelRef.current = channel;
        } catch (err) {
          console.error('Failed to initialize presence channel:', err);
        }
      }, 2000);
    }

    return () => {
      clearTimeout(timeoutId);
      // We don't unsubscribe on activity change anymore
    };
  }, [user?.email, consentStatus]);

  // 3. Cleanup everything on unmount
  useEffect(() => {
    return () => {
      if (staffChannelRef.current) staffChannelRef.current.unsubscribe();
      if (globalChannelRef.current) globalChannelRef.current.unsubscribe();
    };
  }, []);

  // 4. Update Activity Tracking
  useEffect(() => {
    const updatePresence = async () => {
      // Update Staff Channel
      if (staffChannelRef.current && isAuthenticated && (isAdmin || isStreamer)) {
        try {
          await staffChannelRef.current.track({
            user: {
              name: user?.name,
              nickname: user?.nickname,
              avatar: user?.avatar_url,
              email: user?.email
            },
            activity,
            last_seen: new Date().toISOString()
          });
        } catch (e) {
          console.warn('Error updating staff activity:', e);
        }
      }

      // Update Global Channel
      if (globalChannelRef.current && isGlobalConnected.current) {
        try {
          await globalChannelRef.current.track({
            page: activity.civId || activity.section || 'home',
            active: true
          });
        } catch (e) {
          console.warn('Error updating global activity:', e);
        }
      }
    };

    updatePresence();
  }, [activity, isAuthenticated, isAdmin, isStreamer]);

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
