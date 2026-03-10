import { useState, useEffect } from 'react';
import { X, User, Heart, MessageSquare, Trophy, ExternalLink, Loader2 } from 'lucide-react';
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

export function ProfileModal({ isOpen, onClose, onSelectCiv }: ProfileModalProps) {
    const { user, favorites, updateRank, logout } = useAuth();
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

                    {/* Rank Section */}
                    <section>
                        <div className="flex items-center gap-2 mb-4 text-blue-400 tracking-widest uppercase text-xs font-bold">
                            <Trophy size={14} />
                            <span>Grado Attuale</span>
                        </div>
                        <div className="glass p-4 rounded-xl border border-white/5 flex flex-col sm:flex-row items-center gap-4">
                            <div className="flex-1 w-full">
                                <select
                                    value={user?.rank || 'Unranked'}
                                    onChange={(e) => updateRank(e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors [&>option]:bg-[#1a1c32]"
                                >
                                    {RANKS.map(rank => (
                                        <option key={rank} value={rank}>{rank}</option>
                                    ))}
                                </select>
                            </div>
                            <p className="text-[10px] text-gray-500 italic max-w-[200px] text-center sm:text-left">
                                Il tuo rank viene visualizzato accanto alle tue proposte di modifica.
                            </p>
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
