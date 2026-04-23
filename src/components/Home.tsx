/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import { useCivData } from './CivContext';
import { CustomSelect } from './CustomSelect';
import { Heart, BarChart2, Zap, Shield } from 'lucide-react';
import { useAuth } from './AuthContext';

interface HomeProps {
  onSelectCiv: (civId: string, tab?: string) => void;
  onCompareCivs?: (civIds: string[]) => void;
}

export function Home({ onSelectCiv, onCompareCivs }: HomeProps) {
  const { favorites, toggleFavorite, isAuthenticated, openLoginModal } = useAuth();
  const { civilizations: civilizationsData } = useCivData();
  const [difficultyFilter, setDifficultyFilter] = useState<'Tutte' | 'Facile' | 'Medio' | 'Difficile' | 'Preferiti'>('Tutte');
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);
  const [isCompareMode, setIsCompareMode] = useState(false);
  const [isBOMode, setIsBOMode] = useState(false);
  const isMaxReached = selectedForCompare.length >= 2;

  const filteredCivs = civilizationsData.filter(civ => {
    if (difficultyFilter === 'Preferiti') return favorites.includes(civ.id);
    if (difficultyFilter === 'Tutte') return true;
    
    // Map Italian labels to possible DB values (some might be stored in English or with different casing)
    const diffMap: Record<string, string[]> = {
      'Facile': ['Facile', 'Easy'],
      'Medio': ['Medio', 'Medium'],
      'Difficile': ['Difficile', 'Hard', 'Difficult']
    };

    const targetValues = diffMap[difficultyFilter] || [difficultyFilter];
    const civDiff = civ.difficulty?.toString().trim() || '';
    
    return targetValues.some(v => v.toLowerCase() === civDiff.toLowerCase());
  });

  const handleCardClick = (civId: string) => {
    if (isCompareMode) {
      setSelectedForCompare(prev => {
        if (prev.includes(civId)) return prev.filter(id => id !== civId);
        if (prev.length < 2) return [...prev, civId];
        return prev;
      });
    } else {
      onSelectCiv(civId, isBOMode ? 'buildorders' : undefined);
    }
  };

  const handleStartCompare = () => {
    if (selectedForCompare.length === 2 && onCompareCivs) {
      onCompareCivs(selectedForCompare);
    }
  };

  useEffect(() => {
    (window as any).resetHomeFilters = () => {
      setDifficultyFilter('Tutte');
      setIsCompareMode(false);
      setSelectedForCompare([]);
    };
    return () => {
      (window as any).resetHomeFilters = undefined;
    };
  }, []);

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 h-full bg-[var(--color-brand-dark)] select-none">
      <header className="mb-4 md:mb-8 flex flex-col gap-2 md:gap-4 shrink-0">
        <div className="flex flex-col md:flex-row md:items-center justify-start gap-3 md:gap-4">
          <div className="hidden lg:block">
            <CustomSelect
              options={[
                { value: 'Tutte', label: 'Tutte le civiltà' },
                { value: 'Preferiti', label: 'Civiltà Preferite' },
                { value: 'Facile', label: 'Facile' },
                { value: 'Medio', label: 'Medio' },
                { value: 'Difficile', label: 'Difficile' }
              ]}
              value={difficultyFilter}
              onChange={setDifficultyFilter}
            />
          </div>

          <div className="flex flex-row items-center gap-2 w-full md:w-auto">
            {/* Build Orders Button */}
            <div className="flex-[1.5] md:flex-initial flex items-center glass p-1 rounded-xl h-[42px]">
              <button
                onClick={() => {
                  setIsBOMode(!isBOMode);
                  if (isCompareMode) setIsCompareMode(false);
                }}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 md:px-4 h-full rounded-lg text-xs sm:text-sm font-bold transition-all ${isBOMode
                  ? 'bg-[#00f3ff] text-black shadow-[0_0_15px_rgba(0,243,255,0.4)]'
                  : 'text-gray-400 hover:text-gray-200'
                  }`}
              >
                <Zap size={14} fill={isBOMode ? 'black' : 'none'} />
                <span className="whitespace-nowrap">Build Orders</span>
              </button>
            </div>

            {/* Confronta Tool */}
            <div className="flex-1 md:flex-initial flex items-center glass p-1 rounded-xl h-[42px]">
              <button
                onClick={() => {
                  if (isCompareMode && selectedForCompare.length === 2) {
                    handleStartCompare();
                  } else {
                    setIsCompareMode(!isCompareMode);
                    if (isBOMode) setIsBOMode(false);
                  }
                }}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 md:px-4 h-full rounded-lg text-xs sm:text-sm font-bold transition-all ${isCompareMode
                  ? selectedForCompare.length === 2 ? 'bg-green-600 text-white shadow-[0_0_15px_rgba(22,163,74,0.4)]' : 'bg-red-500/20 text-red-400 border border-red-500/30'
                  : 'text-gray-400 hover:text-gray-200'
                  }`}
              >
                <BarChart2 size={14} fill={isCompareMode ? (selectedForCompare.length === 2 ? 'white' : 'currentColor') : 'none'} />
                <span className="whitespace-nowrap">
                  {isCompareMode 
                    ? (selectedForCompare.length === 2 ? 'Conferma' : 'Annulla') 
                    : 'Confronta'}
                </span>
              </button>
            </div>

            {/* Favorite Filter Tool */}
            <div className="flex items-center glass p-1 rounded-xl h-[42px]">
              <button
                onClick={() => setDifficultyFilter(difficultyFilter === 'Preferiti' ? 'Tutte' : 'Preferiti')}
                className={`flex items-center justify-center px-3 h-full rounded-lg transition-all ${difficultyFilter === 'Preferiti'
                  ? 'bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.4)]'
                  : 'text-gray-400 hover:text-gray-200'
                  }`}
              >
                <Heart size={16} fill={difficultyFilter === 'Preferiti' ? 'white' : 'none'} />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-6 2xl:grid-cols-8 gap-3 md:gap-5 pb-10">
        {filteredCivs.map(civ => {
          const isSelected = selectedForCompare.includes(civ.id);
          const isFavorite = favorites.includes(civ.id);
          const isUnselectable = isCompareMode && isMaxReached && !isSelected;

          return (
            <div
              key={civ.id}
              onClick={() => handleCardClick(civ.id)}
              className={`group relative h-36 md:h-52 rounded-xl cursor-pointer overflow-hidden border transition-all duration-500 z-10 ${isSelected
                ? 'border-blue-500 shadow-[0_0_30px_rgba(37,99,235,0.4)] scale-[0.98] z-20'
                : isUnselectable
                  ? 'border-[#D4AF37]/5 opacity-40 grayscale-[0.3] cursor-not-allowed'
                  : 'border-[#D4AF37]/30 hover:border-white/80 hover:shadow-[0_50px_100px_rgba(0,0,0,1)] hover:-translate-y-1 hover:scale-110 2xl:hover:scale-[1.25] hover:z-50 transition-all duration-500 [transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)]'
                }`}
            >
              {/* Full Cover Flag Background */}
              <div className="absolute inset-0 bg-[#1a1c23]"> {/* Placeholder background color */}
                <img
                  src={civ.flag}
                  alt={civ.name}
                  loading={filteredCivs.indexOf(civ) < 12 ? "eager" : "lazy"}
                  onLoad={(e) => {
                    (e.target as HTMLImageElement).classList.remove('opacity-0');
                  }}
                  className={`w-full h-full object-cover transition-all duration-1000 opacity-0 ${!isUnselectable ? 'group-hover:scale-[1.3] group-hover:rotate-1' : ''}`}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-gray-500"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>';
                    (e.target as HTMLImageElement).classList.remove('opacity-0');
                  }}
                />
                {/* Cinematic Vignette Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent opacity-90" />
              </div>

              {/* Selection Indicator */}
              {isCompareMode && (
                <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 z-30 ${isSelected 
                  ? 'bg-blue-600/20' 
                  : isUnselectable 
                    ? 'hidden' 
                    : 'bg-black/40 opacity-0 group-hover:opacity-100'}`}>
                  <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-blue-600 border-white scale-110' : 'border-white/50'}`}>
                    {isSelected && <BarChart2 size={16} className="text-white" />}
                  </div>
                </div>
              )}

              {/* Build Order Shortcut Indicator (DESKTOP HOVER) */}
              {isBOMode && !isCompareMode && (
                 <div className="absolute inset-0 bg-cyan-900/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-30">
                    <div className="bg-[#00f3ff] text-black px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] shadow-[0_0_25px_rgba(0,243,255,0.6)] border border-cyan-200 flex items-center gap-2 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                       <Zap size={14} fill="black" />
                       Build Orders
                    </div>
                 </div>
              )}

              {/* Content Top Left: Difficulty (Desktop Only) */}
              {!isCompareMode && (
                <div className={`absolute top-3 left-3 text-[10px] font-bold px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md border hidden md:block ${civ.difficulty === 'Facile' ? 'text-green-400 border-green-400/30' :
                  civ.difficulty === 'Medio' ? 'text-yellow-400 border-yellow-400/30' :
                    'text-red-400 border-red-400/30'
                  }`}>
                  {civ.difficulty}
                </div>
              )}

              {/* Content Top Right: Heart */}
              {!isCompareMode && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isAuthenticated) {
                      openLoginModal();
                      return;
                    }
                    toggleFavorite(civ.id);
                  }}
                  className={`absolute top-2 right-2 p-1.5 rounded-full backdrop-blur-md border transition-all duration-300 hover:scale-125 ${isFavorite
                    ? 'bg-red-500 text-white border-red-400 shadow-[0_0_15px_rgba(239,68,68,0.5)]'
                    : 'bg-black/60 text-gray-400 border-white/10 hover:text-red-400 hover:border-red-400/50'
                    }`}
                >
                  <Heart className="w-3 h-3 md:w-4 md:h-4" fill={isFavorite ? "currentColor" : "none"} />
                </button>
              )}

              {/* Desktop Hover Standard Button */}
              {!isCompareMode && !isBOMode && (
                 <button
                   onClick={(e) => {
                     e.stopPropagation();
                     onSelectCiv(civ.id);
                   }}
                   className="absolute bottom-20 left-1/2 -translate-x-1/2 hidden md:flex items-center gap-2 px-4 py-2 bg-gradient-to-b from-[#e5e7eb] to-[#9ca3af] text-black opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-4 group-hover:translate-y-0 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] whitespace-nowrap shadow-[0_10px_25px_rgba(0,0,0,0.5)] border border-white/40 z-30 cursor-pointer"
                 >
                    <Shield size={14} fill="black" />
                    Scheda civiltà
                 </button>
              )}

              {/* Text at bottom */}
              <div className="absolute bottom-0 left-0 right-0 p-2 md:p-3">
                <h3 className="text-sm md:text-base font-bold text-white mb-0.5 group-hover:text-yellow-400 transition-colors drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">{civ.name}</h3>

                {/* Mobile Difficulty Badge */}
                <div className={`text-[9px] font-bold w-fit px-1.5 py-0.5 rounded-md backdrop-blur-sm border md:hidden mb-1 ${civ.difficulty === 'Facile' ? 'text-green-400 border-green-400/30 bg-green-400/10' :
                  civ.difficulty === 'Medio' ? 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10' :
                    'text-red-400 border-red-400/30 bg-red-400/10'
                  }`}>
                  {civ.difficulty}
                </div>

                <p className="text-[10px] text-gray-300 line-clamp-1 opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">{civ.shortDescription}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
