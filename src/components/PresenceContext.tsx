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

const DISABLE_PRESENCE = false; // Phase 1: background logic reactivated

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
          key: user.email.toLowerCase(),
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
            const presences = newState[key] as any[];
            if (!presences || presences.length === 0) return;

            // Consolidate multiple presence entries for the same user (e.g., multiple tabs)
            // Priority: editing > viewing > idle
            let consolidatedEntry = presences[0];
            
            for (let i = 1; i < presences.length; i++) {
              const current = presences[i];
              if (!current?.activity) continue;

              const currentPriority = 
                current.activity.type === 'editing' ? 3 : 
                current.activity.type === 'viewing' ? 2 : 1;
              
              const consolidatedPriority = 
                consolidatedEntry.activity.type === 'editing' ? 3 : 
                consolidatedEntry.activity.type === 'viewing' ? 2 : 1;

              if (currentPriority > consolidatedPriority) {
                consolidatedEntry = current;
              }
            }

            // Only add to activeAdmins if the data is complete to avoid downstream crashes
            if (consolidatedEntry && consolidatedEntry.user && consolidatedEntry.user.email && consolidatedEntry.activity) {
              simplifiedState[key] = {
                user: consolidatedEntry.user,
                activity: consolidatedEntry.activity,
                onlineAt: consolidatedEntry.onlineAt || new Date().toISOString()
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
