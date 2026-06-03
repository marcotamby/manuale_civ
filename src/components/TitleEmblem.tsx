import clsx from 'clsx';

interface TitleEmblemProps {
    titleId: string;
    className?: string;
    size?: number;
}

export interface ShopTitle {
    id: string;
    label: string;
    cost: number;
    desc: string;
    color: string;
}

export const SHOP_TITLES: ShopTitle[] = [
    { id: 'novice', label: 'Novizio del Gregge', cost: 0, desc: 'Ha appena iniziato il suo viaggio nel gregge.', color: 'text-gray-400 border-gray-500/20 bg-gray-500/5' },
    { id: 'shearer', label: 'Tosatore di Professione', cost: 150, desc: 'Esperto nella tosatura e nella raccolta della lana.', color: 'text-slate-300 border-slate-500/20 bg-slate-500/5' },
    { id: 'shepherd', label: 'Guardiano dei Pascoli', cost: 300, desc: 'Protegge il pascolo dalle minacce esterne con fermezza.', color: 'text-yellow-500/90 border-yellow-500/20 bg-yellow-500/5' },
    { id: 'wool_magnate', label: 'Magnate della Lana', cost: 600, desc: 'Possiede le riserve di lana più grandi del territorio.', color: 'text-amber-500 border-amber-500/20 bg-amber-500/5' },
    { id: 'shepherd_king', label: 'Re dei Pastori', cost: 1200, desc: 'Governa con saggezza e guida tutto il gregge sul sentiero.', color: 'text-yellow-400 border-yellow-400/30 bg-yellow-400/5 shadow-[0_0_10px_rgba(234,179,8,0.1)]' },
    { id: 'wolf_legend', label: 'Leggenda dei Lupi', cost: 2500, desc: 'Una leggenda vivente che ha domato i lupi selvaggi delle montagne.', color: 'text-cyan-400 border-cyan-400/30 bg-cyan-400/5 shadow-[0_0_10px_rgba(34,211,238,0.15)]' },
];

export function TitleEmblem({ titleId, className, size = 16 }: TitleEmblemProps) {
    switch (titleId) {
        case 'novice':
            return (
                <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={clsx("shrink-0", className)}>
                    {/* Lamb ears */}
                    <path d="M4 10c-1-1-2-1.5-2 .5s1.5 3 2.5 3.5" fill="rgba(255,255,255,0.15)" stroke="#94a3b8" />
                    <path d="M20 10c1-1 2-1.5 2 .5s-1.5 3-2.5 3.5" fill="rgba(255,255,255,0.15)" stroke="#94a3b8" />
                    {/* Face/head */}
                    <rect x="7" y="7" width="10" height="11" rx="5" fill="#f8fafc" stroke="#64748b" strokeWidth="1.5" />
                    {/* Wool fluff top */}
                    <path d="M8 7a2 2 0 0 1 4-1.5A2 2 0 0 1 16 7" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1.5" />
                    {/* Eyes */}
                    <circle cx="10" cy="11" r="1" fill="#0f172a" />
                    <circle cx="14" cy="11" r="1" fill="#0f172a" />
                    {/* Nose/mouth */}
                    <path d="M12 13v1m-1 1.5c.5.5 1 .5 1.5 0" stroke="#475569" strokeWidth="1.5" />
                </svg>
            );
        case 'shearer':
            return (
                <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={clsx("shrink-0", className)}>
                    {/* Left blade */}
                    <path d="M6 18L18 6" stroke="#94a3b8" strokeWidth="2" />
                    <path d="M18 6c0-1.5-1.5-2-3-2L9 9" stroke="#cbd5e1" strokeWidth="1.5" />
                    {/* Right blade */}
                    <path d="M18 18L6 6" stroke="#94a3b8" strokeWidth="2" />
                    <path d="M6 6c0-1.5 1.5-2 3-2l6 5" stroke="#cbd5e1" strokeWidth="1.5" />
                    {/* Handles */}
                    <circle cx="5" cy="19" r="2.5" stroke="#64748b" strokeWidth="2" fill="rgba(0,0,0,0.2)" />
                    <circle cx="19" cy="19" r="2.5" stroke="#64748b" strokeWidth="2" fill="rgba(0,0,0,0.2)" />
                    {/* Center pivot */}
                    <circle cx="12" cy="12" r="1" fill="#3b82f6" />
                </svg>
            );
        case 'shepherd':
            return (
                <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={clsx("shrink-0", className)}>
                    {/* Crook staff curve */}
                    <path d="M15 21V6a3 3 0 0 0-6 0v2" stroke="#eab308" strokeWidth="2.5" strokeLinecap="round" />
                    {/* Handle details */}
                    <path d="M12 11h2.5" stroke="#facc15" strokeWidth="1.5" />
                    <path d="M12 15h2.5" stroke="#facc15" strokeWidth="1.5" />
                    {/* Glowing tip */}
                    <circle cx="9" cy="8" r="1" fill="#4ade80" className="animate-pulse" />
                </svg>
            );
        case 'wool_magnate':
            return (
                <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={clsx("shrink-0", className)}>
                    {/* Main ball */}
                    <circle cx="12" cy="12" r="8" fill="#eab308" fillOpacity="0.1" stroke="#fbbf24" strokeWidth="2" />
                    {/* Threads wrap */}
                    <path d="M8 8c2.5 1 5.5 1 8 0" stroke="#f59e0b" strokeWidth="1.5" />
                    <path d="M6 12c4 2 8 2 12 0" stroke="#fbbf24" strokeWidth="1.5" />
                    <path d="M8 16c2.5-1 5.5-1 8 0" stroke="#f59e0b" strokeWidth="1.5" />
                    <path d="M12 4c1 2.5 1 5.5 0 8" stroke="#f59e0b" strokeWidth="1.5" />
                    <path d="M12 12c-1 2.5-1 5.5 0 8" stroke="#fbbf24" strokeWidth="1.5" />
                </svg>
            );
        case 'shepherd_king':
            return (
                <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={clsx("shrink-0", className)}>
                    {/* Crown base */}
                    <path d="M2 18h20v2H2z" fill="#d97706" stroke="#b45309" strokeWidth="1.5" />
                    {/* Crown shape */}
                    <path d="M4 18l2-10 4 5 2-8 2 8 4-5 2 10z" fill="#f59e0b" stroke="#d97706" strokeWidth="2" />
                    {/* Jewels */}
                    <circle cx="6" cy="8" r="1" fill="#ef4444" />
                    <circle cx="12" cy="10" r="1.5" fill="#3b82f6" />
                    <circle cx="18" cy="8" r="1" fill="#ef4444" />
                    <circle cx="12" cy="2" r="1" fill="#ef4444" />
                </svg>
            );
        case 'wolf_legend':
            return (
                <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={clsx("shrink-0", className)}>
                    {/* Flames bg */}
                    <path d="M5 14c-1-3 1-6 2-7 1 2 2.5 3 2.5 5.5" stroke="#ef4444" strokeWidth="1.5" className="animate-pulse" />
                    <path d="M19 14c1-3-1-6-2-7-1 2-2.5 3-2.5 5.5" stroke="#3b82f6" strokeWidth="1.5" className="animate-pulse" />
                    {/* Main pad */}
                    <path d="M12 11.5c-2 0-3.5 1.5-3.5 3s1.5 2.5 3.5 2.5 3.5-1 3.5-2.5-1.5-3-3.5-3z" fill="#0f172a" stroke="#cbd5e1" strokeWidth="2" />
                    {/* Toe pads */}
                    <circle cx="8" cy="9.5" r="1.5" fill="#ef4444" stroke="#cbd5e1" strokeWidth="1" />
                    <circle cx="10.5" cy="8" r="1.5" fill="#3b82f6" stroke="#cbd5e1" strokeWidth="1" />
                    <circle cx="13.5" cy="8" r="1.5" fill="#ef4444" stroke="#cbd5e1" strokeWidth="1" />
                    <circle cx="16" cy="9.5" r="1.5" fill="#3b82f6" stroke="#cbd5e1" strokeWidth="1" />
                </svg>
            );
        default:
            return null;
    }
}
