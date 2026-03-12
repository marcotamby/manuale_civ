import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './AuthContext';

export interface PresenceState {
  user: {
    email: string;
    name: string;
    avatar?: string;
  };
  activity: {
    type: 'viewing' | 'editing' | 'idle';
    civId?: string;
    section?: string;
  };
  onlineAt: string;
}

interface PresenceContextType {
  activeAdmins: Record<string, PresenceState>;
  updateActivity: (activity: PresenceState['activity']) => void;
}

const PresenceContext = createContext<PresenceContextType | undefined>(undefined);

const DISABLE_PRESENCE = true; // Temporary master switch to restore site

export function PresenceProvider({ children }: { children: React.ReactNode }) {
  const { user, isAdmin } = useAuth();
  const [activeAdmins, setActiveAdmins] = useState<Record<string, PresenceState>>({});
  const [channel, setChannel] = useState<any>(null);

  useEffect(() => {
    if (DISABLE_PRESENCE || !isAdmin || !user || !user.email) {
      setActiveAdmins({});
      setChannel(null);
      return;
    }

    const adminChannel = supabase.channel('admin-presence', {
      config: {
        presence: {
          key: user.email,
        },
      },
    });

    adminChannel
      .on('presence', { event: 'sync' }, () => {
        try {
          const newState = adminChannel.presenceState();
          if (!newState) return;

          const simplifiedState: Record<string, PresenceState> = {};
          
          Object.keys(newState).forEach((key) => {
            const presenceEntry = newState[key]?.[0] as any;
            // Only add to activeAdmins if the data is complete to avoid downstream crashes
            if (presenceEntry && presenceEntry.user && presenceEntry.user.email && presenceEntry.activity) {
              simplifiedState[key] = {
                user: presenceEntry.user,
                activity: presenceEntry.activity,
                onlineAt: presenceEntry.onlineAt || new Date().toISOString()
              };
            }
          });
          
          setActiveAdmins(simplifiedState);
        } catch (err) {
          console.error('Error syncing presence:', err);
        }
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('Admin joined:', key, newPresences);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('Admin left:', key, leftPresences);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await adminChannel.track({
            user: {
              email: user.email,
              name: user.name,
              avatar: user.picture
            },
            activity: { type: 'idle' },
            onlineAt: new Date().toISOString(),
          });
        }
      });

    setChannel(adminChannel);

    return () => {
      adminChannel.unsubscribe();
    };
  }, [isAdmin, user?.email]);

  const updateActivity = async (activity: PresenceState['activity']) => {
    if (channel && user && user.email) {
      await channel.track({
        user: {
          email: user.email,
          name: user.name,
          avatar: user.picture
        },
        activity,
        onlineAt: new Date().toISOString(),
      });
    }
  };

  return (
    <PresenceContext.Provider value={{ activeAdmins, updateActivity }}>
      {children}
    </PresenceContext.Provider>
  );
}

export function usePresence() {
  const context = useContext(PresenceContext);
  if (context === undefined) {
    return { activeAdmins: {}, updateActivity: () => {} };
  }
  return context;
}
