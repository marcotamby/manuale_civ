import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, User, Heart, MessageSquare, Trophy, ExternalLink, Loader2, ChevronDown, LogOut, Camera, Trash2 as TrashIcon, TrendingUp, History, Info } from 'lucide-react';
import { useAuth } from './AuthContext';
import { useCivData } from './CivContext';
import { supabase } from '../lib/supabaseClient';
import type { Suggestion } from './AdminDashboardModal';
import clsx from 'clsx';
import { TitleEmblem, SHOP_TITLES } from './TitleEmblem';

interface ProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectCiv: (civId: string) => void;
}

const RANK_ICONS: Record<string, string> = {
    // Bronze — all variants use the same shield asset, text differentiates I/II/III
    'Bronze I': 'https://static.aoe4world.com/assets/rank_levels/season_3/solo_bronze_1-a193ea93b70b33ed636f2356854abe66585ef4d901dcef5a5248739970d03ccc.svg',
    'Bronze II': 'https://static.aoe4world.com/assets/rank_levels/season_3/solo_bronze_1-a193ea93b70b33ed636f2356854abe66585ef4d901dcef5a5248739970d03ccc.svg',
    'Bronze III': 'https://static.aoe4world.com/assets/rank_levels/season_3/solo_bronze_1-a193ea93b70b33ed636f2356854abe66585ef4d901dcef5a5248739970d03ccc.svg',
    // Silver
    'Silver I': 'https://static.aoe4world.com/assets/rank_levels/season_3/solo_silver_1-35f0d3f20df4026a3c6569a2c5ba654bec4f75aaad68dc07714c255007bd713c.svg',
    'Silver II': 'https://static.aoe4world.com/assets/rank_levels/season_3/solo_silver_2-985548b5dd4c500ad7b98aeeb8517bab2ef3d876d4bf80286a40d295943dce98.svg',
    'Silver III': 'https://static.aoe4world.com/assets/rank_levels/season_3/solo_silver_3-af994caf7a9461b35d33d8263328b152ffb146ef8882118184c5e4e3964c9337.svg',
    // Gold — each has a unique confirmed hash
    'Gold I': 'https://static.aoe4world.com/assets/rank_levels/season_3/solo_gold_1-a42fe36b5df89a42efaf489e6ef10d7c5546fd36a77c5977ce34dca3e822b420.svg',
    'Gold II': 'https://static.aoe4world.com/assets/rank_levels/season_3/solo_gold_2-e1e4843093c7120ad707e9e6ff0f0674e1db471491ef8694b72271dc08478af8.svg',
    'Gold III': 'https://static.aoe4world.com/assets/rank_levels/season_3/solo_gold_3-68164da46a35c3c0229a4d3e8dd065957198b8f81df268ac667aa3ce642ff4d5.svg',
    // Platinum
    'Platinum I': 'https://static.aoe4world.com/assets/rank_levels/season_3/solo_platinum_1-55fc3aa3a2a72c71fb3eee19f251d1db6bd66f8d6a39977a222ec2c74ac6bb77.svg',
    'Platinum II': 'https://static.aoe4world.com/assets/rank_levels/season_3/solo_platinum_1-55fc3aa3a2a72c71fb3eee19f251d1db6bd66f8d6a39977a222ec2c74ac6bb77.svg',
    'Platinum III': 'https://static.aoe4world.com/assets/rank_levels/season_3/solo_platinum_1-55fc3aa3a2a72c71fb3eee19f251d1db6bd66f8d6a39977a222ec2c74ac6bb77.svg',
    // Diamond
    'Diamond I': 'https://static.aoe4world.com/assets/rank_levels/season_3/solo_diamond_1-f298786d7d0c5af34efc552724d1e6962e143f05326f6092863a3542647987be.svg',
    'Diamond II': 'https://static.aoe4world.com/assets/rank_levels/season_3/solo_diamond_1-f298786d7d0c5af34efc552724d1e6962e143f05326f6092863a3542647987be.svg',
    'Diamond III': 'https://static.aoe4world.com/assets/rank_levels/season_3/solo_diamond_1-f298786d7d0c5af34efc552724d1e6962e143f05326f6092863a3542647987be.svg',
    // Conqueror — each confirmed unique
    'Conqueror I': 'https://static.aoe4world.com/assets/rank_levels/season_3/solo_conqueror_1-77cc5eae2e96a4b63b00a46fdf16567a134a81c0b39fa88e4e33a8c95a8071c2.svg',
    'Conqueror II': 'https://static.aoe4world.com/assets/rank_levels/season_3/solo_conqueror_2-d8ba19bf68442f739f9120493515f6043b4f80eeeabeca1ebe0e1dd1414eaace.svg',
    'Conqueror III': 'https://static.aoe4world.com/assets/rank_levels/season_3/solo_conqueror_3-7bfca5cbf4863241844cfc355340bcf5209c36d93bc747c5d96e33704349e65a.svg'
};

export { RANK_ICONS };

export function getAvatarEffectClass(effect: string | null | undefined): string {
    if (!effect) return '';
    switch (effect) {
        case 'cyan-glow': return 'avatar-effect-cyan-glow';
        case 'gold-glow': return 'avatar-effect-gold-glow';
        case 'neon-pulse': return 'avatar-effect-neon-pulse';
        case 'fire-ring': return 'avatar-effect-fire-ring';
        case 'rainbow-rgb': return 'avatar-effect-rainbow-rgb';
        default: return '';
    }
}

// SHOP_TITLES imported from TitleEmblem.tsx

export const SHOP_EFFECTS = [
    { id: 'none', label: 'Nessun Effetto', cost: 0, className: '' },
    { id: 'cyan-glow', label: 'Aura Ciano', cost: 250, className: 'avatar-effect-cyan-glow' },
    { id: 'gold-glow', label: 'Bagliore Dorato', cost: 500, className: 'avatar-effect-gold-glow' },
    { id: 'neon-pulse', label: 'Neon Pulsante', cost: 800, className: 'avatar-effect-neon-pulse' },
    { id: 'fire-ring', label: 'Anello di Fuoco', cost: 1500, className: 'avatar-effect-fire-ring' },
    { id: 'rainbow-rgb', label: 'Arcobaleno RGB', cost: 3000, className: 'avatar-effect-rainbow-rgb' },
];

export const SHOP_SERVICES = [
    { id: 'replay_review', label: 'Analisi Replay con lo Staff', cost: 500, desc: 'Pianifica una sessione con uno staffer per analizzare una tua partita registrata.' },
    { id: 'coaching_1h', label: '1h di Coaching', cost: 1000, desc: 'Un\'ora intera di allenamento personalizzato e consigli strategici con un esperto.' },
];

const RANK_GROUPS = [
    { label: 'Bronze', ranks: ['Bronze I', 'Bronze II', 'Bronze III'] },
    { label: 'Silver', ranks: ['Silver I', 'Silver II', 'Silver III'] },
    { label: 'Gold', ranks: ['Gold I', 'Gold II', 'Gold III'] },
    { label: 'Platinum', ranks: ['Platinum I', 'Platinum II', 'Platinum III'] },
    { label: 'Diamond', ranks: ['Diamond I', 'Diamond II', 'Diamond III'] },
    { label: 'Conqueror', ranks: ['Conqueror I', 'Conqueror II', 'Conqueror III'] },
];

function RankDropdown({ value, onChange }: { value: string; onChange: (rank: string) => void }) {
    const [isOpen, setIsOpen] = useState(false);
    const currentIcon = value && value !== 'Unranked' ? RANK_ICONS[value] : null;

    return (
        <div className="relative">
            <button
                type="button"
                onClick={() => setIsOpen(prev => !prev)}
                className="w-full bg-black/40 border border-white/10 rounded-lg pl-3 pr-10 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors flex items-center gap-3 hover:border-white/20"
            >
                {currentIcon ? (
                    <img src={currentIcon} alt={value} className="w-7 h-7 object-contain shrink-0" />
                ) : (
                    <span className="w-7 h-7 rounded-full bg-gray-700/50 flex items-center justify-center shrink-0">
                        <Trophy size={13} className="text-gray-500" />
                    </span>
                )}
                <span className="flex-1 text-left font-medium">{value || 'Unranked'}</span>
                <ChevronDown
                    size={16}
                    className={`absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                />
            </button>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-[70]" onClick={() => setIsOpen(false)} />
                    <div className="absolute left-0 right-0 mt-2 z-[80] bg-[#111827] border border-white/15 rounded-xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] overflow-hidden">
                        <div className="max-h-72 overflow-y-auto custom-scrollbar">
                            {/* Unranked */}
                            <button
                                type="button"
                                onClick={() => { onChange('Unranked'); setIsOpen(false); }}
                                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${value === 'Unranked' ? 'bg-blue-500/15 text-blue-300' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
                            >
                                <span className="w-7 h-7 rounded-full bg-gray-700/50 flex items-center justify-center shrink-0">
                                    <Trophy size={13} className="text-gray-500" />
                                </span>
                                <span>Unranked</span>
                            </button>

                            <div className="border-t border-white/5 mx-3" />

                            {RANK_GROUPS.map(group => (
                                <div key={group.label}>
                                    <div className="px-4 pt-2 pb-0.5 text-[9px] font-bold uppercase tracking-widest text-gray-600">
                                        {group.label}
                                    </div>
                                    {group.ranks.map(rank => (
                                        <button
                                            key={rank}
                                            type="button"
                                            onClick={() => { onChange(rank); setIsOpen(false); }}
                                            className={`w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors ${value === rank ? 'bg-blue-500/15 text-blue-300' : 'text-gray-200 hover:bg-white/5 hover:text-white'}`}
                                        >
                                            <img
                                                src={RANK_ICONS[rank]}
                                                alt={rank}
                                                className="w-7 h-7 object-contain shrink-0"
                                            />
                                            <span className="flex-1 text-left">{rank}</span>
                                            {value === rank && <span className="text-blue-400 text-xs font-bold">✓</span>}
                                        </button>
                                    ))}
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

export function ProfileModal({ isOpen, onClose, onSelectCiv }: ProfileModalProps) {
    const navigate = useNavigate();
    const { user, favorites, updateProfile, logout, isAdmin, isSuperAdmin } = useAuth();
    const { civilizations } = useCivData();
    const [mySuggestions, setMySuggestions] = useState<Suggestion[]>([]);
    const [qaNotifications, setQaNotifications] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isQaLoading, setIsQaLoading] = useState(false);
    const [qaUpdateTrigger, setQaUpdateTrigger] = useState(0);
    const [activeSubTab, setActiveSubTab] = useState<'profile' | 'shop'>('profile');
    const [shopToast, setShopToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    const showToast = (message: string, type: 'success' | 'error') => {
        setShopToast({ message, type });
        setTimeout(() => setShopToast(null), 3000);
    };

    const handleBuyTitle = (titleId: string, cost: number) => {
        if (!user) return;
        const currentBalance = user.sheep_balance ?? 100;
        if (currentBalance < cost) {
            showToast("Non hai abbastanza pecore! 🐑", "error");
            return;
        }
        const updatedUnlocked = [...(user.unlocked_titles || []), titleId];
        const updatedBalance = currentBalance - cost;
        updateProfile({
            sheep_balance: updatedBalance,
            unlocked_titles: updatedUnlocked
        });
        showToast("Titolo acquistato con successo! 🐑", "success");
    };

    const handleEquipTitle = (titleId: string | null) => {
        if (!user) return;
        updateProfile({
            selected_title: titleId
        });
        showToast(titleId ? "Titolo equipaggiato! 🏆" : "Titolo rimosso!", "success");
    };

    const handleBuyEffect = (effectId: string, cost: number) => {
        if (!user) return;
        const currentBalance = user.sheep_balance ?? 100;
        if (currentBalance < cost) {
            showToast("Non hai abbastanza pecore! 🐑", "error");
            return;
        }
        const updatedUnlocked = [...(user.unlocked_avatar_effects || []), effectId];
        const updatedBalance = currentBalance - cost;
        updateProfile({
            sheep_balance: updatedBalance,
            unlocked_avatar_effects: updatedUnlocked
        });
        showToast("Effetto avatar acquistato con successo! ✨", "success");
    };

    const handleEquipEffect = (effectId: string | null) => {
        if (!user) return;
        updateProfile({
            selected_avatar_effect: effectId
        });
        showToast(effectId && effectId !== 'none' ? "Effetto avatar equipaggiato! ✨" : "Effetto rimosso!", "success");
    };

    const handleBuyService = (serviceId: string, cost: number) => {
        if (!user) return;
        const currentBalance = user.sheep_balance ?? 100;
        if (currentBalance < cost) {
            showToast("Non hai abbastanza pecore! 🐑", "error");
            return;
        }
        const updatedUnlocked = [...(user.unlocked_services || []), serviceId];
        const updatedBalance = currentBalance - cost;
        updateProfile({
            sheep_balance: updatedBalance,
            unlocked_services: updatedUnlocked
        });
        showToast("Servizio acquistato con successo! 🐑", "success");
    };

    // Local state for pending changes
    const [pendingNickname, setPendingNickname] = useState(user?.nickname || '');
    const [pendingRank, setPendingRank] = useState(user?.rank || 'Unranked');
    const [pendingAvatar, setPendingAvatar] = useState<string | null>(user?.avatar_url || null);
    const [pendingAoe4Id, setPendingAoe4Id] = useState(user?.aoe4_profile_id || '');
    const [aoe4Stats, setAoe4Stats] = useState<any | null>(null);
    const [isAoe4Loading, setIsAoe4Loading] = useState(false);
    const [aoe4Error, setAoe4Error] = useState<string | null>(null);
    const [showSaveSuccess, setShowSaveSuccess] = useState(false);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [userBets, setUserBets] = useState<any[]>([]);
    const [isBetsLoading, setIsBetsLoading] = useState(false);
    const [showActiveBets, setShowActiveBets] = useState(true);
    const [showHistory, setShowHistory] = useState(false);
    const [isArchiving, setIsArchiving] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const mapAoe4RankToLocal = (aoe4Rank: string): string => {
        if (!aoe4Rank || aoe4Rank === 'unranked') return 'Unranked';
        const parts = aoe4Rank.split('_');
        const name = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
        const tier = parts[1];
        let roman = '';
        if (tier === '1') roman = 'I';
        else if (tier === '2') roman = 'II';
        else if (tier === '3') roman = 'III';
        return `${name} ${roman}`.trim();
    };

    const fetchAoe4Stats = async (profileId: string) => {
        if (!profileId) return null;
        setIsAoe4Loading(true);
        setAoe4Error(null);
        try {
            const response = await fetch(`https://aoe4world.com/api/v0/players/${profileId}`);
            if (!response.ok) {
                throw new Error('Profilo non trovato o errore di connessione.');
            }
            const data = await response.json();
            setAoe4Stats(data);
            return data;
        } catch (err: any) {
            console.error('Error fetching AoE4 World data:', err);
            setAoe4Error(err.message || 'Errore durante il recupero dei dati.');
            return null;
        } finally {
            setIsAoe4Loading(false);
        }
    };

    // Sync local state ONLY when modal opens
    useEffect(() => {
        if (isOpen) {
            setPendingNickname(user?.nickname || '');
            setPendingRank(user?.rank || 'Unranked');
            setPendingAvatar(user?.avatar_url || null);
            setPendingAoe4Id(user?.aoe4_profile_id || '');
            setShowSaveSuccess(false);

            if (user?.aoe4_profile_id) {
                fetchAoe4Stats(user.aoe4_profile_id).then(data => {
                    if (data) {
                        const rmSoloRank = data.modes?.rm_solo?.rank_level;
                        const rmTeamRank = data.modes?.rm_team?.rank_level;
                        const finalRankLevel = rmSoloRank && rmSoloRank !== 'unranked' ? rmSoloRank : rmTeamRank;
                        if (finalRankLevel) {
                            const mappedRank = mapAoe4RankToLocal(finalRankLevel);
                            setPendingRank(mappedRank);
                            if (mappedRank !== user.rank) {
                                console.log(`🔄 Auto-syncing rank in modal: ${user.rank} -> ${mappedRank}`);
                                updateProfile({ rank: mappedRank });
                            }
                        }
                    }
                });
            } else {
                setAoe4Stats(null);
            }

            // REFRESH Notification Data from localStorage whenever modal opens
            if (user?.email) {
                const refreshedData = JSON.parse(localStorage.getItem(`lastSeenCounts_${user.email}`) || '{}');
                setLastSeenData(refreshedData);
            }
        }
    }, [isOpen, user?.email, user?.aoe4_profile_id]); // Sync on open or if user profile changes

    const hasChanges = pendingNickname !== (user?.nickname || '') || 
                       pendingRank !== (user?.rank || 'Unranked') || 
                       pendingAvatar !== (user?.avatar_url || null) ||
                       pendingAoe4Id !== (user?.aoe4_profile_id || '');

    const handleSaveProfile = () => {
        updateProfile({
            nickname: pendingNickname,
            rank: pendingRank,
            avatar_url: pendingAvatar,
            aoe4_profile_id: pendingAoe4Id || null
        });
        setShowSaveSuccess(true);
        setTimeout(() => setShowSaveSuccess(false), 1000);
    };

    const handleLinkAoe4 = async () => {
        if (!pendingAoe4Id.trim()) return;
        const data = await fetchAoe4Stats(pendingAoe4Id.trim());
        if (data) {
            let finalNickname = pendingNickname;
            if (data.name) {
                setPendingNickname(data.name);
                finalNickname = data.name;
            }
            
            const rmSoloRank = data.modes?.rm_solo?.rank_level;
            const rmTeamRank = data.modes?.rm_team?.rank_level;
            const finalRankLevel = rmSoloRank && rmSoloRank !== 'unranked' ? rmSoloRank : rmTeamRank;
            let finalRank = pendingRank;
            if (finalRankLevel) {
                const mappedRank = mapAoe4RankToLocal(finalRankLevel);
                setPendingRank(mappedRank);
                finalRank = mappedRank;
            }
            
            let finalAvatar = pendingAvatar;
            if (data.avatars?.medium && !pendingAvatar) {
                setPendingAvatar(data.avatars.medium);
                finalAvatar = data.avatars.medium;
            }
            
            updateProfile({
                nickname: finalNickname,
                rank: finalRank,
                avatar_url: finalAvatar,
                aoe4_profile_id: pendingAoe4Id.trim()
            });
            setShowSaveSuccess(true);
            setTimeout(() => setShowSaveSuccess(false), 1000);
        }
    };

    const handleUnlinkAoe4 = () => {
        setPendingAoe4Id('');
        setAoe4Stats(null);
        updateProfile({
            aoe4_profile_id: null
        });
        setShowSaveSuccess(true);
        setTimeout(() => setShowSaveSuccess(false), 1000);
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validation
        if (!file.type.startsWith('image/')) {
            alert('Per favore seleziona un\'immagine.');
            return;
        }

        setIsUploading(true);
        try {
            // Client-side compression using Canvas
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_SIZE = 120; // 120x120 is plenty for a small avatar
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > MAX_SIZE) {
                            height *= MAX_SIZE / width;
                            width = MAX_SIZE;
                        }
                    } else {
                        if (height > MAX_SIZE) {
                            width *= MAX_SIZE / height;
                            height = MAX_SIZE;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx?.drawImage(img, 0, 0, width, height);

                    // Convert to low-quality JPEG base64 to keep it small in DB
                    const compressedBase64 = canvas.toDataURL('image/jpeg', 0.6);
                    setPendingAvatar(compressedBase64);
                    setIsUploading(false);
                };
                img.src = event.target?.result as string;
            };
            reader.readAsDataURL(file);
        } catch (err) {
            console.error('Upload error:', err);
            setIsUploading(false);
        }
    };

    const lastSeenKey = user?.email ? `lastSeenCounts_${user.email}` : null;
    const [lastSeenData, setLastSeenData] = useState<Record<string, { bo: number, video: number }>>(() => 
        lastSeenKey ? JSON.parse(localStorage.getItem(lastSeenKey) || '{}') : {}
    );

    const hasUnread = lastSeenKey && favorites.some(favId => {
        const civ = civilizations.find((c: any) => c.id === favId);
        const stored = lastSeenData[favId] || { bo: 0, video: 0 };
        const storedBO = typeof stored.bo === 'number' ? stored.bo : 0;
        const storedVideo = typeof stored.video === 'number' ? stored.video : 0;
        return civ && ((civ.buildOrders?.length || 0) > storedBO || (civ.videos?.length || 0) > storedVideo);
    });

    const markAllAsRead = () => {
        if (!lastSeenKey) return;
        const newData: Record<string, { bo: number, video: number }> = { ...lastSeenData };
        favorites.forEach(favId => {
            const civ = civilizations.find((c: any) => c.id === favId);
            if (civ) {
                newData[favId] = {
                    bo: civ.buildOrders?.length || 0,
                    video: civ.videos?.length || 0
                };
            }
        });
        localStorage.setItem(lastSeenKey, JSON.stringify(newData));
        setLastSeenData(newData);
        // Refresh topbar
        (window as any).refreshNotificationCount?.();
    };

    const [localUnreadBets, setLocalUnreadBets] = useState(0);
    
    useEffect(() => {
        if (isOpen && user?.email) {
            fetchMySuggestions();
            fetchQaNotifications();
            fetchUserBets();
            fetchUnreadBetCount();
        }
    }, [isOpen, user?.email, user?.id]);

    const fetchUnreadBetCount = async () => {
        if (!user?.email) return;
        try {
            const { count } = await supabase
                .from('betting_notifications')
                .select('*', { count: 'exact', head: true })
                .ilike('user_email', user.email)
                .eq('is_read', false);
            setLocalUnreadBets(count || 0);
        } catch (err) {
            console.error('Error fetching unread count:', err);
        }
    };

    const markAllBetsAsRead = async () => {
        if (!user?.email) return;
        try {
            await supabase
                .from('betting_notifications')
                .update({ is_read: true })
                .ilike('user_email', user.email)
                .eq('is_read', false);
            
            setLocalUnreadBets(0);
            // Refresh topbar to clear the badge
            (window as any).refreshNotificationCount?.();
        } catch (err) {
            console.error('Error marking all bets as read:', err);
        }
    };

    const { activeBets, historyBets } = useMemo(() => {
        const active = userBets.filter(b => b.betting_markets?.status === 'open' || (b.status === 'pending' && b.betting_markets?.status !== 'settled'));
        const history = userBets.filter(b => b.betting_markets?.status === 'settled' || b.status === 'won' || b.status === 'lost');
        return { activeBets: active, historyBets: history };
    }, [userBets]);

    const handleArchiveHistory = async () => {
        if (!user?.email || !window.confirm('Vuoi davvero archiviare tutta la cronologia? Le scommesse concluse verranno rimosse permanentemente dalla vista.')) return;
        try {
            setIsArchiving(true);
            const { error } = await supabase
                .from('user_bets')
                .delete()
                .ilike('user_email', user.email)
                .neq('status', 'pending');
            
            if (error) throw error;
            setUserBets(prev => prev.filter(b => b.status === 'pending'));
        } catch (err) {
            console.error('Error archiving history:', err);
        } finally {
            setIsArchiving(false);
        }
    };

    const fetchUserBets = async () => {
        if (!user?.email) return;
        try {
            setIsBetsLoading(true);
            const { data: bets, error } = await supabase
                .from('user_bets')
                .select(`
                    *,
                    betting_markets (
                        title,
                        status,
                        options
                    )
                `)
                .ilike('user_email', user.email)
                .order('created_at', { ascending: false });
            
            // If the join fails due to schema cache, try a simple fetch
            if (error) {
                console.warn('Join query failed, trying simple fetch:', error.message);
                const { data: simpleBets, error: simpleError } = await supabase
                    .from('user_bets')
                    .select('*')
                    .ilike('user_email', user.email)
                    .order('created_at', { ascending: false });
                
                if (simpleError) throw simpleError;
                setUserBets(simpleBets || []);
            } else {
                setUserBets(bets || []);
            }
        } catch (err) {
            console.error('Error fetching user bets:', err);
        } finally {
            setIsBetsLoading(false);
        }
    };

    const fetchQaNotifications = async () => {
        if (!user?.email) return;
        
        try {
            setIsQaLoading(true);
            // 1. Fetch my questions
            const { data: myQuestions } = await supabase
                .from('questions')
                .select('id, question_text, civ_id, status, created_at')
                .eq('user_id', user.email);
            
            if (!myQuestions) {
                setQaNotifications([]);
                return;
            }

            const notifications: any[] = [];

            // Approved questions notifications
            myQuestions.forEach(q => {
                if (q.status === 'approved') {
                    notifications.push({
                        id: `appr_${q.id}`,
                        type: 'approval',
                        text: `La tua domanda "${q.question_text.length > 40 ? q.question_text.substring(0, 40) + '...' : q.question_text}" è stata approvata!`,
                        civId: q.civ_id,
                        createdAt: q.created_at
                    });
                }
            });

            // Replies notifications
            const myQuestionIds = myQuestions.map(q => q.id);
            if (myQuestionIds.length > 0) {
                const { data: replies } = await supabase
                    .from('answers')
                    .select('id, question_id, user_nickname, answer_text, created_at, status')
                    .in('question_id', myQuestionIds)
                    .neq('user_id', user.email)
                    .eq('status', 'approved');
                
                if (replies) {
                    replies.forEach(r => {
                        const parentQ = myQuestions.find(q => q.id === r.question_id);
                        notifications.push({
                            id: `repl_${r.id}`,
                            type: 'reply',
                            text: `${r.user_nickname} ha risposto alla tua domanda su ${parentQ?.civ_id || 'una civiltà'}: "${r.answer_text.length > 40 ? r.answer_text.substring(0, 40) + '...' : r.answer_text}"`,
                            civId: parentQ?.civ_id || '',
                            createdAt: r.created_at
                        });
                    });
                }
            }

            // Sort by date desc
            notifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            setQaNotifications(notifications);
        } catch (err) {
            console.error('Error fetching QA notifications:', err);
        } finally {
            setIsQaLoading(false);
        }
    };

    const markQaAsRead = () => {
        if (!user?.email) return;
        const allIds = qaNotifications.map(n => n.id);
        localStorage.setItem(`seenQaNotifs_${user.email.toLowerCase()}`, JSON.stringify(allIds));
        // Force re-render of notification count in Topbar
        (window as any).refreshNotificationCount?.();
        // Trigger local re-render
        setQaUpdateTrigger(prev => prev + 1);
    };

    const unreadQaNotifs = useMemo(() => {
        const seenQaIds = user?.email ? JSON.parse(localStorage.getItem(`seenQaNotifs_${user.email.toLowerCase()}`) || '[]') : [];
        return qaNotifications.filter(n => !seenQaIds.includes(n.id));
    }, [qaNotifications, user?.email, qaUpdateTrigger]);

    const hasUnreadQa = unreadQaNotifs.length > 0;

    const fetchMySuggestions = async () => {
        try {
            setIsLoading(true);
            const { data, error } = await supabase
                .from('suggestions')
                .select('*')
                .eq('user_email', user?.email)
                .order('created_at', { ascending: false });
            if (error) throw error;
            setMySuggestions(data || []);
        } catch (err) {
            console.error('Error fetching my suggestions:', err);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[150] flex items-start justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300 overflow-y-auto pt-20 md:pt-24">
            <div className="bg-[#0f1423] border border-blue-500/30 rounded-2xl w-full max-w-2xl mb-20 flex flex-col shadow-[0_0_50px_rgba(37,99,235,0.2)] relative">
                
                {/* Close Button */}
                <button 
                    onClick={onClose} 
                    className="absolute top-4 right-4 z-[160] p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                >
                    <X size={24} />
                </button>

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/10 bg-gradient-to-r from-[#0d1424] to-[#1a1c32] rounded-t-2xl shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="flex flex-col items-center gap-2">
                            <div className="relative group/avatar cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                                <div className={clsx(
                                    "w-20 h-20 rounded-full bg-blue-600/10 flex items-center justify-center border-2 border-blue-500/30 text-blue-400 overflow-hidden group-hover/avatar:border-blue-400 group-hover/avatar:shadow-[0_0_20px_rgba(59,130,246,0.3)] transition-all",
                                    getAvatarEffectClass(user?.selected_avatar_effect)
                                )}>
                                    {isUploading ? (
                                        <Loader2 size={24} className="animate-spin" />
                                    ) : pendingAvatar ? (
                                        <img src={pendingAvatar} alt="Avatar" className="w-full h-full object-cover" />
                                    ) : (
                                        <User size={40} className="text-blue-500/50" />
                                    )}
                                </div>
                                
                                {/* Camera Badge */}
                                <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-blue-600 rounded-full border-2 border-[#0f1423] flex items-center justify-center text-white shadow-lg group-hover/avatar:scale-110 group-hover/avatar:bg-blue-500 transition-all">
                                    <Camera size={14} fill="currentColor" />
                                </div>

                                <input 
                                    type="file" 
                                    ref={fileInputRef} 
                                    onChange={handleFileChange} 
                                    accept="image/*" 
                                    className="hidden" 
                                />
                                
                                {pendingAvatar && (
                                    <button 
                                        onClick={(e) => { 
                                            e.stopPropagation(); 
                                            setPendingAvatar(null); 
                                        }}
                                        className="absolute -top-1 -right-1 bg-red-600 text-white p-1.5 rounded-full opacity-0 group-hover/avatar:opacity-100 transition-opacity hover:bg-red-500 shadow-lg z-10"
                                        title="Rimuovi immagine"
                                    >
                                        <TrashIcon size={12} />
                                    </button>
                                )}
                            </div>
                            <button 
                                onClick={() => fileInputRef.current?.click()}
                                className="text-[10px] font-bold text-blue-400 uppercase tracking-tighter hover:text-blue-300 transition-colors"
                            >
                                {pendingAvatar ? 'Cambia Immagine' : 'Carica Immagine'}
                            </button>
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-xl font-bold text-white uppercase tracking-wider">{user?.nickname || 'Il Tuo Profilo'}</h2>
                                {isAdmin && (
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 font-bold uppercase tracking-widest">
                                        {isSuperAdmin ? 'Admin' : 'Editor'}
                                    </span>
                                )}
                            </div>
                            {user?.selected_title && (
                                <div className="flex items-center gap-1.5 mt-0.5 justify-center sm:justify-start">
                                    <TitleEmblem titleId={user.selected_title} size={16} className="filter drop-shadow-[0_0_4px_rgba(59,130,246,0.5)]" />
                                    <span className="text-xs font-black text-blue-400 tracking-wider uppercase">
                                        {SHOP_TITLES.find(t => t.id === user.selected_title)?.label || user.selected_title}
                                    </span>
                                </div>
                            )}
                            <p className="text-xs text-gray-400">{user?.email}</p>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-white/10 bg-black/10 shrink-0">
                    <button
                        onClick={() => setActiveSubTab('profile')}
                        className={clsx(
                            "flex-grow py-3 text-xs font-black uppercase tracking-widest border-b-2 transition-all text-center",
                            activeSubTab === 'profile' 
                                ? "border-blue-500 text-blue-400 bg-blue-500/5" 
                                : "border-transparent text-gray-400 hover:text-white hover:bg-white/5"
                        )}
                    >
                        Profilo & Attività
                    </button>
                    <button
                        onClick={() => setActiveSubTab('shop')}
                        className={clsx(
                            "flex-grow py-3 text-xs font-black uppercase tracking-widest border-b-2 transition-all text-center flex items-center justify-center gap-1.5",
                            activeSubTab === 'shop' 
                                ? "border-blue-500 text-blue-400 bg-blue-500/5" 
                                : "border-transparent text-gray-400 hover:text-white hover:bg-white/5"
                        )}
                    >
                        Negozio Pecore 🐑
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 custom-scrollbar">

                    {activeSubTab === 'profile' ? (
                        <>
                            {/* Il Tuo Gregge */}
                    <section className="relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-purple-600/5 to-transparent -z-10 rounded-2xl" />
                        <div className="flex items-center justify-between p-6 bg-white/[0.03] border border-blue-500/20 rounded-2xl shadow-xl">
                            <div className="flex flex-col gap-1">
                                <span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em]">Il Tuo Gregge</span>
                                <div className="flex items-center gap-3">
                                    <span className="text-4xl font-black text-white">{user?.sheep_balance ?? 100}</span>
                                    <span className="text-3xl animate-bounce duration-2000">🐑</span>
                                </div>
                            </div>
                            <button 
                                onClick={() => { navigate('/tornei'); onClose(); }}
                                className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-900/40 active:scale-95 flex items-center gap-2"
                            >
                                <TrendingUp size={14} /> Scommetti
                            </button>
                        </div>
                    </section>

                    {/* Le Tue Scommesse Attive */}
                    <section>
                        <button 
                            onClick={() => setShowActiveBets(!showActiveBets)}
                            className="w-full flex items-center justify-between mb-4 group/h"
                        >
                            <div className="flex items-center gap-2 text-blue-400 tracking-widest uppercase text-xs font-bold group-hover/h:text-blue-300 transition-colors">
                                <TrendingUp size={14} />
                                <span>Le Tue Scommesse Attive ({activeBets.length})</span>
                            </div>
                            <ChevronDown size={16} className={clsx("text-gray-500 transition-transform duration-300", showActiveBets && "rotate-180")} />
                        </button>

                        {showActiveBets && (
                            <div className="animate-in slide-in-from-top-2 duration-300">
                                {isBetsLoading ? (
                                    <div className="flex items-center justify-center py-6 bg-white/[0.02] rounded-xl border border-white/5">
                                        <Loader2 size={20} className="animate-spin text-blue-500/50" />
                                    </div>
                                ) : activeBets.length > 0 ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {activeBets.map((bet) => {
                                            const market = bet.betting_markets;
                                            const option = market?.options?.find((o: any) => o.id === bet.option_id);
                                            
                                            return (
                                                <div key={bet.id} className="bg-white/[0.03] p-4 rounded-xl border border-blue-500/10 hover:border-blue-500/30 transition-all group shadow-lg">
                                                    <div className="flex justify-between items-center mb-2 gap-4">
                                                        <div className="min-w-0">
                                                            <p className="text-[9px] text-gray-500 font-black uppercase truncate tracking-widest leading-tight">{market?.title || 'Mercato'}</p>
                                                            <h5 className="text-sm font-black text-white uppercase truncate tracking-tight">{option?.label || 'Opzione'}</h5>
                                                        </div>
                                                        <span className="text-[8px] px-2 py-1 rounded font-black uppercase tracking-widest bg-blue-500/10 text-blue-400 border border-blue-500/20 leading-none shrink-0">
                                                            In Corso
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
                                                        <div className="flex items-center gap-1">
                                                            <span className="text-[10px] text-gray-500 font-bold uppercase">Puntata:</span>
                                                            <span className="text-xs font-black text-blue-400">{bet.amount} 🐑</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="text-center py-6 bg-white/[0.02] rounded-xl border border-dashed border-white/10">
                                        <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Nessuna scommessa attiva.</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </section>

                    {/* Cronologia Scommesse */}
                    {historyBets.length > 0 && (
                        <section>
                            <div className="flex items-center justify-between mb-4">
                                <button 
                                    onClick={() => {
                                        const next = !showHistory;
                                        setShowHistory(next);
                                        if (next && localUnreadBets > 0) markAllBetsAsRead();
                                    }}
                                    className="flex items-center gap-2 text-gray-400 tracking-widest uppercase text-xs font-bold hover:text-white transition-colors relative"
                                >
                                    <History size={14} />
                                    <span>Cronologia Scommesse</span>
                                    {localUnreadBets > 0 && (
                                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[9px] font-black text-white shadow-lg ring-1 ring-black animate-pulse">
                                            {localUnreadBets}
                                        </span>
                                    )}
                                    <ChevronDown size={14} className={clsx("transition-transform", showHistory && "rotate-180")} />
                                </button>
                                <button 
                                    onClick={handleArchiveHistory}
                                    disabled={isArchiving}
                                    className="text-[9px] text-gray-500 hover:text-red-400 transition-colors uppercase font-black tracking-widest flex items-center gap-1.5"
                                >
                                    {isArchiving ? <Loader2 size={10} className="animate-spin" /> : <TrashIcon size={10} />}
                                    Archivia Cronologia
                                </button>
                            </div>

                            {showHistory && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 opacity-80 animate-in slide-in-from-top-2 duration-300">
                                {historyBets.map((bet) => {
                                    const market = bet.betting_markets;
                                    const option = market?.options?.find((o: any) => o.id === bet.option_id);
                                    const isWin = bet.status === 'won';
                                    const isLoss = bet.status === 'lost';

                                    return (
                                        <div key={bet.id} className="bg-white/[0.02] p-4 rounded-xl border border-white/5 hover:border-white/10 transition-all grayscale-[0.5] hover:grayscale-0">
                                            <div className="flex justify-between items-center mb-2 gap-4">
                                                <div className="min-w-0">
                                                    <p className="text-[9px] text-gray-600 font-bold uppercase truncate tracking-widest leading-tight">{market?.title || 'Mercato'}</p>
                                                    <h5 className="text-sm font-bold text-gray-300 uppercase truncate tracking-tight">{option?.label || 'Opzione'}</h5>
                                                </div>
                                                <span className={clsx(
                                                    "text-[8px] px-2 py-1 rounded font-black uppercase tracking-widest border leading-none shrink-0",
                                                    isWin ? "bg-green-500/10 text-green-400 border-green-500/20" : 
                                                    isLoss ? "bg-red-500/10 text-red-400 border-red-500/20" : 
                                                    "bg-gray-500/10 text-gray-500 border-white/5"
                                                )}>
                                                    {isWin ? 'Vinta' : isLoss ? 'Persa' : 'Conclusa'}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
                                                <div className="flex items-center gap-1">
                                                    <span className="text-[10px] text-gray-600 font-bold uppercase">Puntata:</span>
                                                    <span className="text-xs font-bold text-gray-400">{bet.amount} 🐑</span>
                                                </div>
                                                {isWin && (
                                                    <div className="flex items-center gap-1 text-green-400">
                                                        <Trophy size={10} />
                                                        <span className="text-xs font-black">+{bet.payout}</span>
                                                    </div>
                                                )}
                                                {isLoss && (
                                                    <div className="text-red-500 text-[10px] font-black uppercase tracking-tighter">
                                                        Persa
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            )}
                        </section>
                    )}

                    {/* Le Tue Notifiche (Q&A) */}
                    <section>
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2 text-blue-400 tracking-widest uppercase text-xs font-bold">
                                <MessageSquare size={14} />
                                <span>Notifiche Community</span>
                            </div>
                            {qaNotifications.length > 0 && (
                                <button
                                    onClick={markQaAsRead}
                                    disabled={!hasUnreadQa}
                                    className={`flex items-center gap-1.5 text-[10px] uppercase font-black tracking-widest transition-all py-1.5 px-3 rounded-lg border shadow-sm ${
                                        hasUnreadQa 
                                            ? 'text-blue-400 border-blue-500/30 hover:text-white hover:bg-blue-500/20 hover:border-blue-500/50 bg-blue-500/5 cursor-pointer active:scale-95' 
                                            : 'text-gray-600 border-white/5 cursor-default opacity-30 bg-white/[0.01]'
                                    }`}
                                >
                                    {hasUnreadQa && <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse mr-0.5" />}
                                    Segna come lette
                                </button>
                            )}
                        </div>

                        {isQaLoading ? (
                            <div className="flex items-center justify-center py-6 bg-white/[0.02] rounded-xl border border-white/5">
                                <Loader2 size={20} className="animate-spin text-blue-500/50" />
                            </div>
                        ) : unreadQaNotifs.length > 0 ? (
                            <div className="space-y-2">
                                {unreadQaNotifs.slice(0, 10).map((notif) => {
                                    return (
                                        <div 
                                            key={notif.id}
                                            onClick={() => {
                                                if (notif.civId) {
                                                    onSelectCiv(notif.civId);
                                                    onClose();
                                                }
                                            }}
                                            className="group p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/15 hover:border-blue-500/40"
                                        >
                                            <div className="mt-1 h-1.5 w-1.5 rounded-full shrink-0 bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]"></div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm text-white font-bold">
                                                    {notif.text}
                                                </p>
                                                <p className="text-[10px] text-gray-500 mt-1 uppercase font-bold tracking-tighter">
                                                    {new Date(notif.createdAt).toLocaleDateString('it-IT')} • {notif.civId.toUpperCase()}
                                                </p>
                                            </div>
                                            <ExternalLink size={12} className="text-gray-600 group-hover:text-blue-400 transition-colors mt-1" />
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="text-center py-6 bg-white/[0.02] rounded-xl border border-white/5">
                                <p className="text-sm text-gray-500">Nessuna nuova notifica dalla community.</p>
                            </div>
                        )}
                    </section>

                    {/* Informazioni In-Gioco */}
                    <section>
                        <div className="flex items-center gap-2 mb-4 text-blue-400 tracking-widest uppercase text-xs font-bold">
                            <Trophy size={14} />
                            <span>Informazioni In Gioco & Statistiche</span>
                        </div>
                        <div className="bg-white/[0.03] border border-white/8 rounded-xl p-5 space-y-5">
                            
                            {/* Collegamento AoE4 World */}
                            <div className="border-b border-white/5 pb-5">
                                <label className="block text-[10px] text-gray-400 uppercase font-black tracking-widest mb-2">
                                    ID Profilo AoE4 World
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Es: 4635035"
                                        value={pendingAoe4Id}
                                        onChange={(e) => setPendingAoe4Id(e.target.value)}
                                        className="flex-1 bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
                                    />
                                    {user?.aoe4_profile_id ? (
                                        <button
                                            type="button"
                                            onClick={handleUnlinkAoe4}
                                            className="px-4 py-2.5 border border-red-500/30 text-red-400 hover:bg-red-500/10 rounded-lg text-xs font-bold uppercase tracking-widest transition-all"
                                        >
                                            Scollega
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={handleLinkAoe4}
                                            disabled={isAoe4Loading || !pendingAoe4Id.trim()}
                                            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-white/5 disabled:text-gray-500 text-white rounded-lg text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-1.5 shadow-[0_0_15px_rgba(37,99,235,0.2)]"
                                        >
                                            {isAoe4Loading ? <Loader2 size={12} className="animate-spin" /> : <ExternalLink size={12} />}
                                            Collega
                                        </button>
                                    )}
                                </div>
                                <div className="flex flex-wrap items-center gap-1 mt-2">
                                    <p className="text-[9px] text-gray-500 font-medium">
                                        Collega il profilo per sincronizzare automaticamente avatar, nickname e rank. Trovi il tuo ID nell'URL di <a href="https://aoe4world.com" target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">aoe4world.com</a>.
                                    </p>
                                    <div className="relative group/tooltip inline-block shrink-0">
                                        <Info size={11} className="text-gray-400 hover:text-blue-400 cursor-help transition-colors" />
                                        <div className="absolute bottom-full right-0 mb-2 w-56 p-2.5 bg-[#0b0f19] border border-blue-500/40 text-gray-200 text-[9px] rounded-lg shadow-[0_10px_30px_rgba(0,0,0,0.95)] opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all duration-200 z-[200] pointer-events-none text-left leading-normal">
                                            L'ID è la serie di numeri alla fine dell'URL del tuo profilo (es: aoe4world.com/players/<span className="text-blue-400 font-black">7000836</span>).
                                            <div className="absolute top-full right-1.5 border-4 border-transparent border-t-[#0b0f19] w-0 h-0" />
                                        </div>
                                    </div>
                                </div>
                                {aoe4Error && (
                                    <p className="text-xs text-red-400 mt-2 font-bold">{aoe4Error}</p>
                                )}
                            </div>

                            {/* Statistiche AoE4 World (Visualizzazione Premium) */}
                            {aoe4Stats && (
                                <div className="bg-[#121828]/60 border border-blue-500/20 rounded-xl p-4 space-y-4 animate-in fade-in duration-300 shadow-inner">
                                    <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                                        <div className="flex items-center gap-2.5">
                                            {aoe4Stats.avatars?.small ? (
                                                <img src={aoe4Stats.avatars.small} alt="Steam Avatar" className="w-6 h-6 rounded-full border border-white/10" />
                                            ) : (
                                                <div className="w-6 h-6 rounded-full bg-gray-800 flex items-center justify-center text-gray-500">
                                                    <User size={12} />
                                                </div>
                                            )}
                                            <span className="text-xs font-black text-white uppercase tracking-wider">{aoe4Stats.name}</span>
                                            {aoe4Stats.country && (
                                                <span className="text-[9px] bg-white/5 text-gray-400 px-1.5 py-0.5 rounded uppercase font-bold tracking-tight">
                                                    {aoe4Stats.country}
                                                </span>
                                            )}
                                        </div>
                                        <a
                                            href={aoe4Stats.site_url || `https://aoe4world.com/players/${pendingAoe4Id}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-[9px] text-blue-400 hover:text-blue-300 font-black tracking-widest flex items-center gap-1 uppercase transition-colors"
                                        >
                                            Profilo AoE4 <ExternalLink size={10} />
                                        </a>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {/* RM 1v1 */}
                                        {aoe4Stats.modes?.rm_solo ? (
                                            <div className="bg-black/35 p-3 rounded-lg border border-white/5 flex flex-col justify-between hover:border-white/10 transition-colors">
                                                <span className="text-[9px] text-gray-400 uppercase font-black tracking-widest">Ranked 1v1</span>
                                                <div className="flex items-center gap-2.5 my-2">
                                                    {aoe4Stats.modes.rm_solo.rank_level && RANK_ICONS[mapAoe4RankToLocal(aoe4Stats.modes.rm_solo.rank_level)] ? (
                                                        <img
                                                            src={RANK_ICONS[mapAoe4RankToLocal(aoe4Stats.modes.rm_solo.rank_level)]}
                                                            alt={aoe4Stats.modes.rm_solo.rank_level}
                                                            className="w-9 h-9 object-contain"
                                                        />
                                                    ) : (
                                                        <div className="w-9 h-9 rounded-full bg-gray-800/50 flex items-center justify-center text-gray-500">
                                                            <Trophy size={16} />
                                                        </div>
                                                    )}
                                                    <div>
                                                        <span className="text-xs font-black text-yellow-400 block leading-tight">
                                                            {mapAoe4RankToLocal(aoe4Stats.modes.rm_solo.rank_level)}
                                                        </span>
                                                        <span className="text-[10px] text-gray-400 font-bold">
                                                            {aoe4Stats.modes.rm_solo.rating || 0} punti
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="text-[10px] text-gray-500 flex justify-between pt-1.5 border-t border-white/5">
                                                    <span>Win Rate: <strong className="text-white">{aoe4Stats.modes.rm_solo.win_rate || 0}%</strong></span>
                                                    <span className="font-bold">{aoe4Stats.modes.rm_solo.wins_count || 0}V - {aoe4Stats.modes.rm_solo.losses_count || 0}P</span>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="bg-black/20 p-3 rounded-lg border border-white/5 border-dashed flex flex-col justify-center items-center text-center h-[90px]">
                                                <span className="text-[9px] text-gray-500 uppercase font-black tracking-widest">Ranked 1v1</span>
                                                <span className="text-[10px] text-gray-600 font-bold uppercase mt-1">Non Giocato</span>
                                            </div>
                                        )}

                                        {/* RM Team */}
                                        {aoe4Stats.modes?.rm_team ? (
                                            <div className="bg-black/35 p-3 rounded-lg border border-white/5 flex flex-col justify-between hover:border-white/10 transition-colors">
                                                <span className="text-[9px] text-gray-400 uppercase font-black tracking-widest">Ranked Team</span>
                                                <div className="flex items-center gap-2.5 my-2">
                                                    {aoe4Stats.modes.rm_team.rank_level && RANK_ICONS[mapAoe4RankToLocal(aoe4Stats.modes.rm_team.rank_level)] ? (
                                                        <img
                                                            src={RANK_ICONS[mapAoe4RankToLocal(aoe4Stats.modes.rm_team.rank_level)]}
                                                            alt={aoe4Stats.modes.rm_team.rank_level}
                                                            className="w-9 h-9 object-contain"
                                                        />
                                                    ) : (
                                                        <div className="w-9 h-9 rounded-full bg-gray-800/50 flex items-center justify-center text-gray-500">
                                                            <Trophy size={16} />
                                                        </div>
                                                    )}
                                                    <div>
                                                        <span className="text-xs font-black text-yellow-400 block leading-tight">
                                                            {mapAoe4RankToLocal(aoe4Stats.modes.rm_team.rank_level)}
                                                        </span>
                                                        <span className="text-[10px] text-gray-400 font-bold">
                                                            {aoe4Stats.modes.rm_team.rating || 0} punti
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="text-[10px] text-gray-500 flex justify-between pt-1.5 border-t border-white/5">
                                                    <span>Win Rate: <strong className="text-white">{aoe4Stats.modes.rm_team.win_rate || 0}%</strong></span>
                                                    <span className="font-bold">{aoe4Stats.modes.rm_team.wins_count || 0}V - {aoe4Stats.modes.rm_team.losses_count || 0}P</span>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="bg-black/20 p-3 rounded-lg border border-white/5 border-dashed flex flex-col justify-center items-center text-center h-[90px]">
                                                <span className="text-[9px] text-gray-500 uppercase font-black tracking-widest">Ranked Team</span>
                                                <span className="text-[10px] text-gray-600 font-bold uppercase mt-1">Non Giocato</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Nickname */}
                            <div>
                                <label className="block text-[10px] text-gray-500 uppercase font-bold mb-1.5 tracking-wider">
                                    Nickname AoE4
                                </label>
                                <input
                                    type="text"
                                    placeholder="Inserisci il tuo nickname..."
                                    value={pendingNickname}
                                    onChange={(e) => setPendingNickname(e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
                                />
                            </div>

                            {/* Rank dropdown */}
                            <div>
                                <label className="block text-[10px] text-gray-500 uppercase font-bold mb-1.5 tracking-wider">
                                    Grado Attuale
                                </label>
                                <RankDropdown
                                    value={pendingRank}
                                    onChange={(rank) => setPendingRank(rank)}
                                />
                            </div>

                            {/* Save Button */}
                            <div className="pt-2">
                                <button
                                    onClick={handleSaveProfile}
                                    disabled={!hasChanges && !showSaveSuccess}
                                    className={`w-full py-2.5 rounded-lg text-sm font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                                        showSaveSuccess
                                            ? 'bg-green-500 text-white shadow-[0_0_15px_rgba(34,197,94,0.4)]'
                                            : hasChanges 
                                                ? 'bg-blue-600 text-white hover:bg-blue-500 shadow-[0_0_15px_rgba(37,99,235,0.3)]' 
                                                : 'bg-white/5 text-gray-500 cursor-not-allowed border border-white/5'
                                    }`}
                                >
                                    {showSaveSuccess ? (
                                        <>Salvato!</>
                                    ) : (
                                        <>Salva Modifiche</>
                                    )}
                                </button>
                            </div>

                            {/* Selected rank display — shown only when not Unranked */}
                            {pendingRank !== 'Unranked' && RANK_ICONS[pendingRank] && (
                                <div className="flex items-center gap-4 pt-3 border-t border-white/5">
                                    <img
                                        src={RANK_ICONS[pendingRank]}
                                        alt={pendingRank}
                                        width={56}
                                        height={56}
                                        className="object-contain drop-shadow-[0_0_14px_rgba(255,200,50,0.5)] shrink-0"
                                    />
                                    <div>
                                        <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-0.5">Rank selezionato</p>
                                        <p className="text-lg font-bold text-yellow-400 leading-tight">{pendingRank}</p>
                                    </div>
                                </div>
                            )}

                            <p className="text-[10px] text-gray-600 italic">
                                Il tuo nickname e rank verranno visualizzati accanto alle tue proposte di modifica.
                            </p>
                        </div>
                    </section>

                    {/* Favorites */}
                    <section>
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2 text-red-400 tracking-widest uppercase text-xs font-bold">
                                <Heart size={14} />
                                <span>Civiltà Preferite ({favorites.length})</span>
                            </div>
                            {favorites.length > 0 && (
                                <button
                                    onClick={markAllAsRead}
                                    disabled={!hasUnread}
                                    className={`flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-tight transition-all py-1 px-2 rounded-md ${
                                        hasUnread 
                                            ? 'text-blue-400 hover:text-white hover:bg-blue-500/20 underline underline-offset-4 decoration-blue-500/50' 
                                            : 'text-gray-600 cursor-default opacity-50'
                                    }`}
                                >
                                    {hasUnread && <div className="w-1 h-1 rounded-full bg-blue-400 animate-pulse" />}
                                    Segna tutti come letti
                                </button>
                            )}
                        </div>
                        {favorites.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {favorites.map(favId => {
                                    const civ = civilizations.find((c: any) => c.id === favId);
                                    const stored = lastSeenData[favId] || { bo: 0, video: 0 };
                                    const storedBO = typeof stored.bo === 'number' ? stored.bo : 0;
                                    const storedVideo = typeof stored.video === 'number' ? stored.video : 0;
                                    const hasNewBO = civ && (civ.buildOrders?.length || 0) > storedBO;
                                    const hasNewVideo = civ && (civ.videos?.length || 0) > storedVideo;

                                    return (
                                        <button
                                            key={favId}
                                            onClick={() => { onSelectCiv(favId); onClose(); }}
                                            className="bg-white/[0.03] px-4 py-3 rounded-xl border border-white/5 text-gray-300 hover:text-white hover:border-blue-400/50 hover:bg-blue-400/5 transition-all flex flex-col gap-1 group relative overflow-hidden h-20 justify-center"
                                        >
                                            {/* Flag Background with Fade */}
                                            {civ?.flag && (
                                                <div className="absolute inset-0 z-0 pointer-events-none">
                                                    <img 
                                                        src={civ.flag} 
                                                        alt="" 
                                                        className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity duration-500 group-hover:scale-110" 
                                                    />
                                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#0f1423]/40 to-[#0f1423] opacity-90" />
                                                </div>
                                            )}

                                            <div className="flex items-center justify-between w-full relative z-10">
                                                <div className="flex items-center gap-3">
                                                    <span className="capitalize text-sm font-black tracking-wide text-white drop-shadow-lg">
                                                        {civ?.name || favId}
                                                    </span>
                                                </div>
                                                <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 transition-opacity text-blue-400" />
                                            </div>

                                            <div className="flex flex-wrap gap-1.5 mt-1 relative z-10">
                                                {hasNewBO && (
                                                    <span className="text-[8px] bg-yellow-500 text-black px-1.5 py-0.5 rounded font-black uppercase tracking-tighter animate-in zoom-in">
                                                        Nuova BO
                                                    </span>
                                                )}
                                                {hasNewVideo && (
                                                    <span className="text-[8px] bg-red-500 text-white px-1.5 py-0.5 rounded font-black uppercase tracking-tighter animate-in zoom-in">
                                                        Nuovo Video
                                                    </span>
                                                )}
                                            </div>

                                            {(hasNewBO || hasNewVideo) && (
                                                <div className="absolute top-0 right-0 w-8 h-8 bg-red-500/20 blur-xl rounded-full -mr-4 -mt-4 animate-pulse z-10"></div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="text-center py-6 bg-white/[0.02] rounded-xl border border-white/5">
                                <p className="text-sm text-gray-500">Non hai ancora aggiunto civiltà ai preferiti.</p>
                            </div>
                        )}
                    </section>

                    {/* Proposte - Hidden for Admins/Editors as they have the Dashboard */}
                    {!isAdmin && (
                        <section>
                            <div className="flex items-center gap-2 mb-4 text-yellow-400 tracking-widest uppercase text-xs font-bold">
                                <MessageSquare size={14} />
                                <span>Le Tue Proposte</span>
                            </div>
                            {isLoading ? (
                                <div className="flex items-center justify-center py-10">
                                    <Loader2 size={24} className="animate-spin text-blue-400" />
                                </div>
                            ) : mySuggestions.length > 0 ? (
                                <div className="space-y-3">
                                    {mySuggestions.map(sugg => (
                                        <div key={sugg.id} className="bg-white/[0.03] p-4 rounded-xl border border-white/5 hover:border-white/10 transition-all">
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="text-xs font-bold text-blue-400 uppercase">{sugg.civ_name}</span>
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${sugg.status === 'pending' ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20' :
                                                    sugg.status === 'implemented' ? 'bg-green-500/10 text-green-500 border border-green-500/20' :
                                                        'bg-red-500/10 text-red-500 border border-red-500/20'
                                                    }`}>
                                                    {sugg.status}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-300 line-clamp-2 italic">"{sugg.suggestion_text}"</p>
                                            <p className="text-[10px] text-gray-500 mt-2">
                                                Inviata il {new Date(sugg.created_at).toLocaleDateString('it-IT')}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-6 bg-white/[0.02] rounded-xl border border-white/5">
                                    <p className="text-sm text-gray-500">Non hai ancora inviato nessuna proposta.</p>
                                </div>
                            )}
                        </section>
                    )}
                    </>
                    ) : (
                        <div className="space-y-8 animate-in fade-in duration-300">
                            {/* Toast overlay/notification */}
                            {shopToast && (
                                <div className={clsx(
                                    "p-4 rounded-xl border text-center text-xs font-black uppercase tracking-widest animate-in slide-in-from-top duration-300",
                                    shopToast.type === 'success' 
                                        ? "bg-green-500/10 text-green-400 border-green-500/20" 
                                        : "bg-red-500/10 text-red-400 border-red-500/20"
                                )}>
                                    {shopToast.message}
                                </div>
                            )}

                            {/* Shop Balance Card */}
                            <div className="relative overflow-hidden rounded-2xl border border-blue-500/20 bg-gradient-to-r from-blue-600/10 via-purple-600/5 to-transparent p-6 shadow-xl">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em]">Pecore Disponibili</span>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-3xl font-black text-white">{user?.sheep_balance ?? 100}</span>
                                            <span className="text-2xl animate-bounce">🐑</span>
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider max-w-[200px] text-right">
                                        Usa le scommesse sportive o le attività sul sito per guadagnare altre pecore!
                                    </p>
                                </div>
                            </div>

                            {/* Titles Section */}
                            <section className="space-y-4">
                                <h3 className="text-xs font-black text-blue-400 tracking-widest uppercase flex items-center gap-2">
                                    🏆 Emblemi & Titoli
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {SHOP_TITLES.map(title => {
                                        const isUnlocked = title.cost === 0 || (user?.unlocked_titles || []).includes(title.id);
                                        const isEquipped = user?.selected_title === title.id;
                                        const canAfford = (user?.sheep_balance ?? 100) >= title.cost;

                                        return (
                                            <div key={title.id} className="bg-white/[0.03] border border-white/5 rounded-xl p-4 flex flex-col justify-between hover:border-white/10 transition-all">
                                                <div className="flex gap-3 mb-4">
                                                    <div className="w-12 h-12 bg-blue-500/10 flex items-center justify-center rounded-xl border border-blue-500/20 shrink-0">
                                                        <TitleEmblem titleId={title.id} size={32} className="filter drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                                                    </div>
                                                    <div>
                                                        <h4 className="text-sm font-black text-white uppercase tracking-wider">{title.label}</h4>
                                                        <div className="mt-1 flex items-center gap-2">
                                                            {title.cost > 0 ? (
                                                                <span className="text-xs font-bold text-blue-400">{title.cost} 🐑</span>
                                                            ) : (
                                                                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Gratis</span>
                                                            )}
                                                            {isUnlocked && (
                                                                <span className="text-[9px] bg-green-500/10 text-green-400 border border-green-500/20 px-1.5 py-0.5 rounded font-bold uppercase tracking-tight">
                                                                    Sbloccato
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="pt-2 border-t border-white/5 flex gap-2">
                                                    {isUnlocked ? (
                                                        isEquipped ? (
                                                            <button
                                                                onClick={() => handleEquipTitle(null)}
                                                                className="w-full py-2 bg-red-600/10 hover:bg-red-600/20 text-red-400 hover:text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
                                                            >
                                                                Rimuovi
                                                            </button>
                                                        ) : (
                                                            <button
                                                                onClick={() => handleEquipTitle(title.id)}
                                                                className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
                                                            >
                                                                Equipaggia
                                                            </button>
                                                        )
                                                    ) : (
                                                        <button
                                                            onClick={() => handleBuyTitle(title.id, title.cost)}
                                                            disabled={!canAfford}
                                                            className={clsx(
                                                                "w-full py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                                                                canAfford 
                                                                    ? "bg-yellow-500 text-black hover:bg-yellow-400" 
                                                                    : "bg-white/5 text-gray-600 cursor-not-allowed"
                                                            )}
                                                        >
                                                            Sblocca a {title.cost} 🐑
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>

                            {/* Effects Section */}
                            <section className="space-y-4">
                                <h3 className="text-xs font-black text-blue-400 tracking-widest uppercase flex items-center gap-2">
                                    ✨ Bordi Avatar Animati
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {SHOP_EFFECTS.map(effect => {
                                        const isUnlocked = effect.cost === 0 || (user?.unlocked_avatar_effects || []).includes(effect.id);
                                        const isEquipped = (user?.selected_avatar_effect === effect.id) || (!user?.selected_avatar_effect && effect.id === 'none');
                                        const canAfford = (user?.sheep_balance ?? 100) >= effect.cost;

                                        return (
                                            <div key={effect.id} className="bg-white/[0.03] border border-white/5 rounded-xl p-4 flex flex-col justify-between hover:border-white/10 transition-all">
                                                <div className="flex items-center gap-3 mb-4">
                                                    <div className={clsx(
                                                        "w-12 h-12 rounded-full bg-blue-600/10 flex items-center justify-center border-2 border-blue-500/30 text-blue-400 overflow-hidden shrink-0",
                                                        getAvatarEffectClass(effect.id)
                                                    )}>
                                                        {pendingAvatar ? (
                                                            <img src={pendingAvatar} alt="Preview" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <User size={20} className="text-blue-500/50" />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <h4 className="text-sm font-black text-white uppercase tracking-wider">{effect.label}</h4>
                                                        <div className="mt-1 flex items-center gap-2">
                                                            {effect.cost > 0 ? (
                                                                <span className="text-xs font-bold text-blue-400">{effect.cost} 🐑</span>
                                                            ) : (
                                                                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Gratis</span>
                                                            )}
                                                            {isUnlocked && (
                                                                <span className="text-[9px] bg-green-500/10 text-green-400 border border-green-500/20 px-1.5 py-0.5 rounded font-bold uppercase tracking-tight">
                                                                    Sbloccato
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="pt-2 border-t border-white/5 flex gap-2">
                                                    {isUnlocked ? (
                                                        isEquipped ? (
                                                            <button
                                                                onClick={() => handleEquipEffect(null)}
                                                                className="w-full py-2 bg-red-600/10 hover:bg-red-600/20 text-red-400 hover:text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
                                                            >
                                                                Rimuovi
                                                            </button>
                                                        ) : (
                                                            <button
                                                                onClick={() => handleEquipEffect(effect.id)}
                                                                className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
                                                            >
                                                                Equipaggia
                                                            </button>
                                                        )
                                                    ) : (
                                                        <button
                                                            onClick={() => handleBuyEffect(effect.id, effect.cost)}
                                                            disabled={!canAfford}
                                                            className={clsx(
                                                                "w-full py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                                                                canAfford 
                                                                    ? "bg-yellow-500 text-black hover:bg-yellow-400" 
                                                                    : "bg-white/5 text-gray-600 cursor-not-allowed"
                                                            )}
                                                        >
                                                            Sblocca a {effect.cost} 🐑
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>

                            {/* Services Section */}
                            <section className="space-y-4">
                                <h3 className="text-xs font-black text-blue-400 tracking-widest uppercase flex items-center gap-2">
                                    🤝 Servizi & Coaching
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {SHOP_SERVICES.map(service => {
                                        const count = (user?.unlocked_services || []).filter(s => s === service.id).length;
                                        const canAfford = (user?.sheep_balance ?? 100) >= service.cost;

                                        return (
                                            <div key={service.id} className="bg-white/[0.03] border border-white/5 rounded-xl p-4 flex flex-col justify-between hover:border-white/10 transition-all">
                                                <div className="flex gap-3 mb-4">
                                                    <div className="w-12 h-12 bg-blue-500/10 flex items-center justify-center rounded-xl border border-blue-500/20 shrink-0 text-xl flex-shrink-0">
                                                        {service.id === 'replay_review' ? '🎥' : '👨‍🏫'}
                                                    </div>
                                                    <div>
                                                        <h4 className="text-sm font-black text-white uppercase tracking-wider">{service.label}</h4>
                                                        <p className="text-[10px] text-gray-400 font-medium leading-normal mt-1">{service.desc}</p>
                                                        <div className="mt-2 flex items-center gap-2">
                                                            <span className="text-xs font-bold text-blue-400">{service.cost} 🐑</span>
                                                            {count > 0 && (
                                                                <span className="text-[9px] bg-green-500/10 text-green-400 border border-green-500/20 px-1.5 py-0.5 rounded font-bold uppercase tracking-tight">
                                                                    Riscattato {count}x
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="pt-2 border-t border-white/5 flex flex-col gap-2">
                                                    <button
                                                        onClick={() => handleBuyService(service.id, service.cost)}
                                                        disabled={!canAfford}
                                                        className={clsx(
                                                            "w-full py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                                                            canAfford 
                                                                ? "bg-yellow-500 text-black hover:bg-yellow-400" 
                                                                : "bg-white/5 text-gray-600 cursor-not-allowed"
                                                        )}
                                                    >
                                                        Riscatta a {service.cost} 🐑
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>

                            {/* Active Services Instructions */}
                            {user?.unlocked_services && user.unlocked_services.length > 0 && (
                                <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-600/5 space-y-2">
                                    <h4 className="text-[11px] font-black text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                                        📢 Come utilizzare i tuoi servizi riscattati
                                    </h4>
                                    <p className="text-[10px] text-gray-300 leading-normal font-medium">
                                        Hai riscattato con successo dei servizi! Per prenotare l'analisi del replay o l'ora di coaching, per favore <strong>unisciti al nostro server Discord</strong> e contatta un membro dello staff fornendo il tuo nickname (<strong>{user.nickname || 'Nessun nickname impostato'}</strong>). Lo staff concorderà data e ora direttamente con te.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-white/5 bg-black/20 flex flex-col sm:flex-row gap-4 items-center justify-between rounded-b-2xl shrink-0">
                    <p className="text-[10px] text-gray-500 tracking-wide uppercase">Sincronizzato con il Cloud</p>
                    <button
                        onClick={() => setShowLogoutConfirm(true)}
                        className="w-full sm:w-auto px-6 py-2 border border-red-500/30 text-red-500 hover:bg-red-500/10 rounded-lg text-sm font-bold transition-all uppercase tracking-widest"
                    >
                        Esci dall'Account
                    </button>
                </div>

                {/* Logout Confirmation Modal Overlay */}
                {showLogoutConfirm && (
                    <div className="absolute inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 rounded-2xl">
                        <div className="bg-[#1a1c23] border border-red-500/30 p-8 rounded-3xl max-w-sm w-full shadow-2xl animate-in zoom-in duration-300 text-center">
                            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/20">
                                <LogOut className="text-red-500" size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2 uppercase tracking-tight">Esci dall'Account</h3>
                            <p className="text-sm text-gray-400 mb-8 leading-relaxed">
                                Sei sicuro di voler uscire? Dovrai effettuare nuovamente l'accesso per interagire con la community.
                            </p>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowLogoutConfirm(false)}
                                    className="flex-1 px-4 py-2.5 border border-white/10 text-gray-400 rounded-xl hover:bg-white/5 transition-colors font-bold text-xs uppercase"
                                >
                                    Annulla
                                </button>
                                <button
                                    onClick={() => { 
                                        logout(); 
                                        onClose();
                                        setShowLogoutConfirm(false); 
                                    }}
                                    className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl transition-all font-bold text-xs uppercase shadow-lg shadow-red-600/20 flex items-center justify-center gap-2"
                                >
                                    Esci Ora
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
