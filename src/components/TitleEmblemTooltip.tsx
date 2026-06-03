import { useState, useRef, useEffect } from 'react';
import { TitleEmblem, SHOP_TITLES } from './TitleEmblem';
import { X } from 'lucide-react';
import clsx from 'clsx';

export { SHOP_TITLES };

interface TitleEmblemTooltipProps {
    titleId: string;
    label: string;
    placement?: 'top' | 'bottom';
}

export function TitleEmblemTooltip({ titleId, label, placement = 'top' }: TitleEmblemTooltipProps) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const titleInfo = SHOP_TITLES.find(t => t.id === titleId);

    useEffect(() => {
        if (!isOpen) return;
        const handleOutsideClick = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleOutsideClick);
        return () => document.removeEventListener('mousedown', handleOutsideClick);
    }, [isOpen]);

    if (!titleInfo) {
        return (
            <span className="text-[9px] font-black text-blue-400 tracking-wider uppercase bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                🏆 {label}
            </span>
        );
    }

    return (
        <div ref={containerRef} className="relative inline-block select-none z-40">
            {/* Clickable Badge */}
            <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(!isOpen);
                }}
                className={clsx(
                    "text-[9px] font-black tracking-wider uppercase px-2 py-0.5 rounded border flex items-center gap-1.5 active:scale-95 transition-all shadow-sm cursor-pointer hover:bg-blue-500/15",
                    titleInfo.color || "text-blue-400 border-blue-500/20 bg-blue-500/5"
                )}
                title="Clicca per dettagli emblema"
            >
                <TitleEmblem titleId={titleId} size={12} className="filter drop-shadow-[0_0_4px_rgba(59,130,246,0.5)]" />
                <span>{label}</span>
            </button>

            {/* Floating Tooltip Card */}
            {isOpen && (
                <>
                    {/* Arrow/Card Container */}
                    <div 
                        onClick={(e) => e.stopPropagation()}
                        className={clsx(
                            "absolute z-[999] w-60 p-4 rounded-2xl border bg-[#0b0f19] border-blue-500/30 text-left shadow-[0_10px_35px_rgba(0,0,0,0.95)] animate-in zoom-in-95 duration-150 origin-center",
                            placement === 'top' && "bottom-full left-1/2 -translate-x-1/2 mb-3.5",
                            placement === 'bottom' && "top-full left-1/2 -translate-x-1/2 mt-3.5"
                        )}
                    >
                        {/* Triangular Indicator */}
                        <div className={clsx(
                            "absolute w-3 h-3 rotate-45 bg-[#0b0f19] border border-blue-500/30 z-0",
                            placement === 'top' && "top-full left-1/2 -translate-x-1/2 -mt-1.5 border-t-0 border-l-0",
                            placement === 'bottom' && "bottom-full left-1/2 -translate-x-1/2 -mb-1.5 border-b-0 border-r-0"
                        )} />

                        {/* Relative Wrapper for z-index containment */}
                        <div className="relative z-10">
                            {/* Close Button */}
                            <button 
                                onClick={() => setIsOpen(false)}
                                className="absolute top-0 right-0 p-1 text-gray-500 hover:text-white rounded-full hover:bg-white/5 transition-all"
                            >
                                <X size={12} />
                            </button>

                            {/* Content */}
                            <div className="flex flex-col items-center text-center">
                                <div className="w-14 h-14 bg-blue-500/10 flex items-center justify-center rounded-2xl border border-blue-500/20 mb-3 shadow-inner">
                                    <TitleEmblem titleId={titleId} size={36} className="filter drop-shadow-[0_0_10px_rgba(59,130,246,0.6)]" />
                                </div>
                                <h4 className="text-xs font-black text-white uppercase tracking-wider leading-tight mb-1">{label}</h4>
                                <p className="text-[10px] text-gray-400 leading-normal font-medium mt-1">{titleInfo.desc}</p>
                                
                                {titleInfo.cost > 0 ? (
                                    <span className="text-[9px] font-black text-blue-400 bg-blue-500/15 border border-blue-500/20 px-2 py-0.5 rounded-full mt-3.5 uppercase tracking-widest">
                                        Valore: {titleInfo.cost} 🐑
                                    </span>
                                ) : (
                                    <span className="text-[9px] font-black text-gray-500 bg-white/5 border border-white/5 px-2 py-0.5 rounded-full mt-3.5 uppercase tracking-widest">
                                        Sblocco Gratuito
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
