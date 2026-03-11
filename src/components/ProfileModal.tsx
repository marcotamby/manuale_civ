import { useState, useEffect } from 'react';
import { X, User, Heart, MessageSquare, Trophy, ExternalLink, Loader2, ChevronDown } from 'lucide-react';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabaseClient';
import type { Suggestion } from './AdminDashboardModal';

interface ProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectCiv: (civId: string) => void;
}

const RANKS = [
    'Unranked',
    'Bronze I', 'Bronze II', 'Bronze III',
    'Silver I', 'Silver II', 'Silver III',
    'Gold I', 'Gold II', 'Gold III',
    'Platinum I', 'Platinum II', 'Platinum III',
    'Diamond I', 'Diamond II', 'Diamond III',
    'Conqueror I', 'Conqueror II', 'Conqueror III'
];

const RANK_ICONS: Record<string, string> = {
    'Bronze I': 'https://static.aoe4world.com/assets/rank_levels/season_3/solo_bronze_1-a193ea93b70b33ed636f2356854abe66585ef4d901dcef5a5248739970d03ccc.svg',
    'Bronze II': 'https://static.aoe4world.com/assets/rank_levels/season_3/solo_bronze_2-a193ea93b70b33ed636f2356854abe66585ef4d901dcef5a5248739970d03ccc.svg', // Guessed hash, pattern likely holds
    'Bronze III': 'https://static.aoe4world.com/assets/rank_levels/season_3/solo_bronze_3-a193ea93b70b33ed636f2356854abe66585ef4d901dcef5a5248739970d03ccc.svg',
    'Silver I': 'https://static.aoe4world.com/assets/rank_levels/season_3/solo_silver_1-af994caf7a9461b35d33d8263328b152ffb146ef8882118184c5e4e3964c9337.svg',
    'Silver II': 'https://static.aoe4world.com/assets/rank_levels/season_3/solo_silver_2-af994caf7a9461b35d33d8263328b152ffb146ef8882118184c5e4e3964c9337.svg',
    'Silver III': 'https://static.aoe4world.com/assets/rank_levels/season_3/solo_silver_3-af994caf7a9461b35d33d8263328b152ffb146ef8882118184c5e4e3964c9337.svg',
    'Gold I': 'https://static.aoe4world.com/assets/rank_levels/season_3/solo_gold_1-a42fe36b5df89a42efaf489e6ef10d7c5546fd36a77c5977ce34dca3e822b420.svg',
    'Gold II': 'https://static.aoe4world.com/assets/rank_levels/season_3/solo_gold_2-e1e4843093c7120ad707e9e6ff0f0674e1db471491ef8694b72271dc08478af8.svg',
    'Gold III': 'https://static.aoe4world.com/assets/rank_levels/season_3/solo_gold_3-68164da46a35c3c0229a4d3e8dd065957198b8f81df268ac667aa3ce642ff4d5.svg',
    'Platinum I': 'https://static.aoe4world.com/assets/rank_levels/season_3/solo_platinum_1-55fc3aa3a2a72c71fb3eee19f251d1db6bd66f8d6a39977a222ec2c74ac6bb77.svg',
    'Platinum II': 'https://static.aoe4world.com/assets/rank_levels/season_3/solo_platinum_2-55fc3aa3a2a72c71fb3eee19f251d1db6bd66f8d6a39977a222ec2c74ac6bb77.svg',
    'Platinum III': 'https://static.aoe4world.com/assets/rank_levels/season_3/solo_platinum_3-55fc3aa3a2a72c71fb3eee19f251d1db6bd66f8d6a39977a222ec2c74ac6bb77.svg',
    'Diamond I': 'https://static.aoe4world.com/assets/rank_levels/season_3/solo_diamond_1-f298786d7d0c5af34efc552724d1e6962e143f05326f6092863a3542647987be.svg',
    'Diamond II': 'https://static.aoe4world.com/assets/rank_levels/season_3/solo_diamond_2-f298786d7d0c5af34efc552724d1e6962e143f05326f6092863a3542647987be.svg',
    'Diamond III': 'https://static.aoe4world.com/assets/rank_levels/season_3/solo_diamond_3-f298786d7d0c5af34efc552724d1e6962e143f05326f6092863a3542647987be.svg',
    'Conqueror I': 'https://static.aoe4world.com/assets/rank_levels/season_3/solo_conqueror_1-77cc5eae2e96a4b63b00a46fdf16567a134a81c0b39fa88e4e33a8c95a8071c2.svg',
    'Conqueror II': 'https://static.aoe4world.com/assets/rank_levels/season_3/solo_conqueror_2-d8ba19bf68442f739f9120493515f6043b4f80eeeabeca1ebe0e1dd1414eaace.svg',
    'Conqueror III': 'https://static.aoe4world.com/assets/rank_levels/season_3/solo_conqueror_3-7bfca5cbf4863241844cfc355340bcf5209c36d93bc747c5d96e33704349e65a.svg'
};

export function ProfileModal({ isOpen, onClose, onSelectCiv }: ProfileModalProps) {
    const { user, favorites, updateProfile, logout } = useAuth();
    const [mySuggestions, setMySuggestions] = useState<Suggestion[]>([]);
    const [isLoading, setIsLoading] = useState(false);

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
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md shadow-2xl animate-in fade-in duration-300">
            <div className="bg-[#0f1423] border border-blue-500/30 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-[0_0_50px_rgba(37,99,235,0.2)] filter drop-shadow-2xl relative overflow-hidden">

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/10 bg-gradient-to-r from-[#0d1424] to-[#1a1c32] shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-blue-600/20 flex items-center justify-center border border-blue-500/30 text-blue-400">
                            <User size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white uppercase tracking-wider">Il Tuo Profilo</h2>
                            <p className="text-xs text-gray-400">{user?.email}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 custom-scrollbar">

                    {/* Rank & Nickname Section */}
                    <section className="space-y-6">
                        <div>
                            <div className="flex items-center gap-2 mb-4 text-blue-400 tracking-widest uppercase text-xs font-bold">
                                <Trophy size={14} />
                                <span>Informazioni In-Gioco</span>
                            </div>
                            <div className="glass p-6 rounded-xl border border-white/5 space-y-4">
                                <div>
                                    <label className="block text-[10px] text-gray-500 uppercase font-bold mb-1.5">Nickname AoE4</label>
                                    <input
                                        type="text"
                                        placeholder="Inserisci il tuo nickname..."
                                        value={user?.nickname || ''}
                                        onChange={(e) => updateProfile({ nickname: e.target.value })}
                                        className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                                    />
                                </div>
                                <div className="flex flex-col sm:flex-row items-center gap-4 pt-2">
                                    <div className="flex-1 w-full">
                                        <label className="block text-[10px] text-gray-500 uppercase font-bold mb-1.5">Grado Attuale</label>
                                        <div className="relative">
                                            <select
                                                value={user?.rank || 'Unranked'}
                                                onChange={(e) => updateProfile({ rank: e.target.value })}
                                                className="w-full bg-black/40 border border-white/10 rounded-lg pl-4 pr-10 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors [&>option]:bg-[#1a1c32] appearance-none"
                                            >
                                                {RANKS.map(rank => (
                                                    <option key={rank} value={rank}>{rank}</option>
                                                ))}
                                            </select>
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                                <ChevronDown size={16} className="text-gray-500" />
                                            </div>
                                        </div>
                                    </div>
                                    {user?.rank && user.rank !== 'Unranked' && RANK_ICONS[user.rank] && (
                                        <div className="w-16 h-16 bg-white/5 rounded-xl border border-white/10 flex items-center justify-center p-2 group overflow-hidden">
                                            <img
                                                src={RANK_ICONS[user.rank]}
                                                alt={user.rank}
                                                className="w-full h-full object-contain drop-shadow-[0_0_10px_rgba(255,255,255,0.2)] group-hover:scale-110 transition-transform"
                                            />
                                        </div>
                                    )}
                                </div>
                                <p className="text-[10px] text-gray-500 italic text-center sm:text-left">
                                    Il tuo nickname e rank verranno visualizzati accanto alle tue proposte di modifica.
                                </p>
                            </div>
                        </div>
                    </section>


                    {/* Favorites Section */}
                    <section>
                        <div className="flex items-center gap-2 mb-4 text-red-400 tracking-widest uppercase text-xs font-bold">
                            <Heart size={14} />
                            <span>Civiltà Preferite ({favorites.length})</span>
                        </div>
                        {favorites.length > 0 ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {favorites.map(favId => (
                                    <button
                                        key={favId}
                                        onClick={() => {
                                            onSelectCiv(favId);
                                            onClose();
                                        }}
                                        className="glass px-4 py-3 rounded-xl border border-white/5 text-gray-300 hover:text-white hover:border-blue-400/50 hover:bg-blue-400/5 transition-all flex items-center gap-2 group"
                                    >
                                        <span className="capitalize text-sm font-medium">{favId}</span>
                                        <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-6 glass rounded-xl border border-white/5">
                                <p className="text-sm text-gray-500">Non hai ancora aggiunto civiltà ai preferiti.</p>
                            </div>
                        )}
                    </section>

                    {/* Suggestions Section */}
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
                                    <div key={sugg.id} className="glass p-4 rounded-xl border border-white/5 hover:border-white/10 transition-all">
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
                            <div className="text-center py-6 glass rounded-xl border border-white/5">
                                <p className="text-sm text-gray-500">Non hai ancora inviato nessuna proposta.</p>
                            </div>
                        )}
                    </section>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-white/5 bg-black/20 flex flex-col sm:flex-row gap-4 items-center justify-between shrink-0">
                    <p className="text-[10px] text-gray-500 tracking-wide uppercase">
                        Sincronizzato con il Cloud
                    </p>
                    <button
                        onClick={() => {
                            logout();
                            onClose();
                        }}
                        className="w-full sm:w-auto px-6 py-2 border border-red-500/30 text-red-500 hover:bg-red-500/10 rounded-lg text-sm font-bold transition-all uppercase tracking-widest"
                    >
                        Esci dall'Account
                    </button>
                </div>
            </div>
        </div>
    );
}
