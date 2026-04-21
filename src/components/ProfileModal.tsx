import { useState, useEffect, useRef } from 'react';
import { X, User, Heart, MessageSquare, Trophy, ExternalLink, Loader2, ChevronDown, LogOut, Camera, Trash2 as TrashIcon } from 'lucide-react';
import { useAuth } from './AuthContext';
import { useCivData } from './CivContext';
import { supabase } from '../lib/supabaseClient';
import type { Suggestion } from './AdminDashboardModal';

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
    const { user, favorites, updateProfile, logout, isAdmin, isSuperAdmin } = useAuth();
    const { civilizations } = useCivData();
    const [mySuggestions, setMySuggestions] = useState<Suggestion[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    
    // Local state for pending changes
    const [pendingNickname, setPendingNickname] = useState(user?.nickname || '');
    const [pendingRank, setPendingRank] = useState(user?.rank || 'Unranked');
    const [pendingAvatar, setPendingAvatar] = useState<string | null>(user?.avatar_url || null);
    const [showSaveSuccess, setShowSaveSuccess] = useState(false);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Sync local state ONLY when modal opens
    useEffect(() => {
        if (isOpen) {
            setPendingNickname(user?.nickname || '');
            setPendingRank(user?.rank || 'Unranked');
            setPendingAvatar(user?.avatar_url || null);
            setShowSaveSuccess(false);

            // REFRESH Notification Data from localStorage whenever modal opens
            if (user?.email) {
                const refreshedData = JSON.parse(localStorage.getItem(`lastSeenCounts_${user.email}`) || '{}');
                setLastSeenData(refreshedData);
            }
        }
    }, [isOpen, user?.email]); // Only sync on open, or if user changes while open

    const hasChanges = pendingNickname !== (user?.nickname || '') || 
                       pendingRank !== (user?.rank || 'Unranked') || 
                       pendingAvatar !== (user?.avatar_url || null);

    const handleSaveProfile = () => {
        updateProfile({
            nickname: pendingNickname,
            rank: pendingRank,
            avatar_url: pendingAvatar
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

    useEffect(() => {
        if (isOpen && user?.email) {
            fetchMySuggestions();
        }
    }, [isOpen, user?.email]);

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
        <div className="fixed inset-0 z-[80] flex items-start justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300 overflow-y-auto pt-[280px] sm:pt-[200px]">
            <div className="bg-[#0f1423] border border-blue-500/30 rounded-2xl w-full max-w-2xl mb-20 flex flex-col shadow-[0_0_50px_rgba(37,99,235,0.2)] relative">

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/10 bg-gradient-to-r from-[#0d1424] to-[#1a1c32] rounded-t-2xl shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="flex flex-col items-center gap-2">
                            <div className="relative group/avatar cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                                <div className="w-20 h-20 rounded-full bg-blue-600/10 flex items-center justify-center border-2 border-blue-500/30 text-blue-400 overflow-hidden group-hover/avatar:border-blue-400 group-hover/avatar:shadow-[0_0_20px_rgba(59,130,246,0.3)] transition-all">
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
                                <h2 className="text-xl font-bold text-white uppercase tracking-wider">Il Tuo Profilo</h2>
                                {isAdmin && (
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 font-bold uppercase tracking-widest">
                                        {isSuperAdmin ? 'Admin' : 'Editor'}
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-gray-400">{user?.email}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 custom-scrollbar">

                    {/* Informazioni In-Gioco */}
                    <section>
                        <div className="flex items-center gap-2 mb-4 text-blue-400 tracking-widest uppercase text-xs font-bold">
                            <Trophy size={14} />
                            <span>Informazioni In-Gioco</span>
                        </div>
                        <div className="bg-white/[0.03] border border-white/8 rounded-xl p-5 space-y-5">

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
                                            className="bg-white/[0.03] px-4 py-3 rounded-xl border border-white/5 text-gray-300 hover:text-white hover:border-blue-400/50 hover:bg-blue-400/5 transition-all flex flex-col gap-1 group relative overflow-hidden"
                                        >
                                            <div className="flex items-center justify-between w-full">
                                                <span className="capitalize text-sm font-bold tracking-wide">{favId}</span>
                                                <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </div>

                                            <div className="flex flex-wrap gap-1.5 mt-1">
                                                {hasNewBO && (
                                                    <span className="text-[9px] bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 px-1.5 py-0.5 rounded font-black uppercase tracking-tighter animate-in zoom-in">
                                                        Nuovo Build Order!
                                                    </span>
                                                )}
                                                {hasNewVideo && (
                                                    <span className="text-[9px] bg-red-500/10 text-red-500 border border-red-500/20 px-1.5 py-0.5 rounded font-black uppercase tracking-tighter animate-in zoom-in">
                                                        Nuovo Video!
                                                    </span>
                                                )}
                                            </div>

                                            {(hasNewBO || hasNewVideo) && (
                                                <div className="absolute top-0 right-0 w-8 h-8 bg-red-500/10 blur-xl rounded-full -mr-4 -mt-4 animate-pulse"></div>
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
                                    <Loader2 size={24} className="animate-spin text-blue-500" />
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
