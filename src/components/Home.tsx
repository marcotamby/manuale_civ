import { useState } from 'react';
import { useCivData } from './CivContext';
import { CustomSelect } from './CustomSelect';
import { Heart, BarChart2 } from 'lucide-react';
import { useAuth } from './AuthContext';

interface HomeProps {
  onSelectCiv: (civId: string) => void;
  onCompareCivs?: (civIds: string[]) => void;
}

export function Home({ onSelectCiv, onCompareCivs }: HomeProps) {
  const { favorites, toggleFavorite } = useAuth();
  const { civilizations: civilizationsData } = useCivData();
  const [difficultyFilter, setDifficultyFilter] = useState<'Tutte' | 'Facile' | 'Medio' | 'Difficile' | 'Preferiti'>('Tutte');
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);
  const [isCompareMode, setIsCompareMode] = useState(false);

  const filteredCivs = civilizationsData.filter(civ => {
    if (difficultyFilter === 'Preferiti') return favorites.includes(civ.id);
    return difficultyFilter === 'Tutte' || civ.difficulty === difficultyFilter;
  });

  const handleCardClick = (civId: string) => {
    if (isCompareMode) {
      setSelectedForCompare(prev => {
        if (prev.includes(civId)) return prev.filter(id => id !== civId);
        if (prev.length < 2) return [...prev, civId];
        return prev;
      });
    } else {
      onSelectCiv(civId);
    }
  };

  const handleStartCompare = () => {
    if (selectedForCompare.length === 2 && onCompareCivs) {
      onCompareCivs(selectedForCompare);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 h-full bg-[var(--color-brand-dark)]">
      <header className="mb-6 flex flex-row items-center justify-between gap-2 overflow-x-auto no-scrollbar pb-2">
        <div className="flex-1 w-full flex flex-row flex-nowrap items-center justify-end gap-2">
          <div className="flex items-center glass p-1 rounded-xl h-[42px]">
            <button
              onClick={() => setIsCompareMode(!isCompareMode)}
              className={`flex items-center gap-2 px-4 h-full rounded-lg text-sm font-bold transition-all ${
                isCompareMode 
                  ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]' 
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <BarChart2 size={16} />
              <span>{isCompareMode ? 'Annulla' : 'Confronta'}</span>
            </button>
            {isCompareMode && selectedForCompare.length === 2 && (
              <button
                onClick={handleStartCompare}
                className="animate-in fade-in zoom-in duration-300 flex items-center gap-2 px-4 h-full bg-yellow-600/80 text-white font-bold rounded-lg shadow-lg border border-yellow-500/50 hover:bg-yellow-500 transition-all text-sm ml-1"
              >
                Vai ({selectedForCompare.length})
              </button>
            )}
          </div>

          <div className="flex items-center glass p-1 rounded-xl h-[42px]">
            <button
              onClick={() => setDifficultyFilter(difficultyFilter === 'Preferiti' ? 'Tutte' : 'Preferiti')}
              className={`flex items-center gap-2 px-3 h-full rounded-lg text-sm font-bold transition-all ${
                difficultyFilter === 'Preferiti'
                  ? 'bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.4)]' 
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <Heart size={16} fill={difficultyFilter === 'Preferiti' ? 'currentColor' : 'none'} />
              <span className="hidden xs:inline">Preferiti</span>
            </button>
          </div>

          <CustomSelect
            label="Filtra"
            options={[
              { value: 'Tutte', label: 'Tutte le civiltà' },
              { value: 'Preferiti', label: 'Civiltà Preferite' },
              { value: 'Facile', label: 'Difficoltà: Facile' },
              { value: 'Medio', label: 'Difficoltà: Media' },
              { value: 'Difficile', label: 'Difficoltà: Difficile' }
            ]}
            value={difficultyFilter}
            onChange={setDifficultyFilter}
          />
        </div>
      </header>

      <div className="grid grid-cols-4 sm:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3 md:gap-5 pb-20">
        {filteredCivs.map(civ => {
          const isSelected = selectedForCompare.includes(civ.id);
          const isFavorite = favorites.includes(civ.id);

          return (
            <div 
              key={civ.id}
              onClick={() => handleCardClick(civ.id)}
              className={`group relative h-40 md:h-56 rounded-xl cursor-pointer overflow-hidden border transition-all duration-500 ${
                isSelected 
                  ? 'border-blue-500 shadow-[0_0_30px_rgba(37,99,235,0.4)] scale-[0.98]' 
                  : 'border-[#D4AF37]/20 hover:border-yellow-400 hover:shadow-[0_0_30px_rgba(212,175,55,0.25)] hover:-translate-y-1'
              }`}
            >
              {/* Full Cover Flag Background */}
              <div className="absolute inset-0">
                <img 
                  src={civ.flag} 
                  alt={civ.name}
                  loading={filteredCivs.indexOf(civ) < 12 ? "eager" : "lazy"}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-gray-500"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>';
                  }}
                />
                {/* Cinematic Vignette Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent opacity-90" />
              </div>

              {/* Selection Indicator */}
              {isCompareMode && (
                <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${isSelected ? 'bg-blue-600/20' : 'bg-black/40 opacity-0 group-hover:opacity-100'}`}>
                  <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-blue-600 border-white scale-110' : 'border-white/50'}`}>
                    {isSelected && <BarChart2 size={16} className="text-white" />}
                  </div>
                </div>
              )}

              {/* Content Top Left: Difficulty */}
              {!isCompareMode && (
                <div className={`absolute top-3 left-3 text-[10px] font-bold px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md border ${
                  civ.difficulty === 'Facile' ? 'text-green-400 border-green-400/30' : 
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
                    toggleFavorite(civ.id);
                  }}
                  className={`absolute top-3 right-3 p-2 rounded-full backdrop-blur-md border transition-all duration-300 hover:scale-125 ${
                    isFavorite 
                      ? 'bg-red-500 text-white border-red-400 shadow-[0_0_15px_rgba(239,68,68,0.5)]' 
                      : 'bg-black/60 text-gray-400 border-white/10 hover:text-red-400 hover:border-red-400/50'
                  }`}
                >
                  <Heart size={16} fill={isFavorite ? "currentColor" : "none"} />
                </button>
              )}

              {/* Text at bottom */}
              <div className="absolute bottom-0 left-0 right-0 p-2 md:p-3">
                <h3 className="text-sm md:text-base font-bold text-white mb-0.5 group-hover:text-yellow-400 transition-colors drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">{civ.name}</h3>
                <p className="text-[10px] text-gray-300 line-clamp-1 opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">{civ.shortDescription}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
