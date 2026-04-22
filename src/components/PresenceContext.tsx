import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './AuthContext';

export interface PresenceState {
  user: {
    email: string;
    name: string;
    nickname?: string;
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
  onlineUserCount: number;
  usersByPage: Record<string, number>;
  updateActivity: (activity: PresenceState['activity']) => void;
}

const PresenceContext = createContext<PresenceContextType | undefined>(undefined);

const DISABLE_PRESENCE = false;

export function PresenceProvider({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, isStreamer } = useAuth();
  const [activeAdmins, setActiveAdmins] = useState<Record<string, PresenceState>>({});
  const [onlineUserCount, setOnlineUserCount] = useState(0);
  const [usersByPage, setUsersByPage] = useState<Record<string, number>>({});
  const [adminChannel, setAdminChannel] = useState<any>(null);
  const [userChannel, setUserChannel] = useState<any>(null);

  useEffect(() => {
    if (DISABLE_PRESENCE || !user || !user.id) {
      setActiveAdmins({});
      setOnlineUserCount(0);
      setUsersByPage({});
      return;
    }

    // 1. Admin Presence Channel (Rich data)
    let aChannel: any = null;
    if (isAdmin || isStreamer) {
      aChannel = supabase.channel('admin-presence', {
        config: { presence: { key: user.email?.toLowerCase() || user.id } },
      });

      aChannel
        .on('presence', { event: 'sync' }, () => {
          const newState = aChannel.presenceState();
          const simplified: Record<string, PresenceState> = {};
          Object.keys(newState).forEach((key) => {
            const presences = newState[key] as any[];
            if (!presences?.length) return;
            let consolidated = presences[0];
            for (let i = 1; i < presences.length; i++) {
              const current = presences[i];
              const p = (a: any) => a?.type === 'editing' ? 3 : a?.type === 'viewing' ? 2 : 1;
              if (p(current.activity) > p(consolidated.activity)) consolidated = current;
            }
            if (consolidated?.user && consolidated?.activity) {
              simplified[key] = {
                user: consolidated.user,
                activity: consolidated.activity,
                onlineAt: consolidated.onlineAt || new Date().toISOString()
              };
            }
          });
          setActiveAdmins(simplified);
        })
        .subscribe(async (status: string) => {
          if (status === 'SUBSCRIBED') {
            await aChannel.track({
              user: { email: user.email, name: user.name || 'Admin', nickname: user.nickname, avatar: user.avatar_url },
              activity: { type: 'idle' },
              onlineAt: new Date().toISOString(),
            });
          }
        });
      setAdminChannel(aChannel);
    }

    // 2. Global User Presence Channel (Privacy focused, count only)
    const uChannel = supabase.channel('global-presence', {
      config: { presence: { key: user.id } },
    });

    uChannel
      .on('presence', { event: 'sync' }, () => {
        const newState = uChannel.presenceState();
        const pageCounts: Record<string, number> = {};
        let total = 0;

        Object.keys(newState).forEach((key) => {
          const presences = newState[key] as any[];
          if (!presences?.length) return;
          total++;
          const act = presences[0].activity;
          if (act?.type === 'viewing' && act.civId) {
            pageCounts[act.civId] = (pageCounts[act.civId] || 0) + 1;
          } else if (act?.type === 'viewing' && act.section) {
            pageCounts[act.section] = (pageCounts[act.section] || 0) + 1;
          } else {
            pageCounts['other'] = (pageCounts['other'] || 0) + 1;
          }
        });

        setOnlineUserCount(total);
        setUsersByPage(pageCounts);
      })
      .subscribe(async (status: string) => {
        if (status === 'SUBSCRIBED') {
          await uChannel.track({
            activity: { type: 'idle' },
            onlineAt: new Date().toISOString(),
          });
        }
      });
    setUserChannel(uChannel);

    return () => {
      aChannel?.unsubscribe();
      uChannel.unsubscribe();
    };
  }, [user?.id, isAdmin, isStreamer]);

  const updateActivity = async (activity: PresenceState['activity']) => {
    const trackData = { activity, onlineAt: new Date().toISOString() };
    
    if (adminChannel && user) {
      await adminChannel.track({
        ...trackData,
        user: { email: user.email, name: user.name || 'Admin', nickname: user.nickname, avatar: user.avatar_url }
      });
    }
    
    if (userChannel) {
      await userChannel.track(trackData);
    }
  };

  return (
    <PresenceContext.Provider value={{ activeAdmins, onlineUserCount, usersByPage, updateActivity }}>
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
