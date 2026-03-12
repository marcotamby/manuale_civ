import { useCivData } from './CivContext';
import { Shield, Sword, Zap, X, BarChart2, ChevronUp, ChevronDown } from 'lucide-react';

interface CompareViewProps {
  civIds: string[];
  onClose: () => void;
}

export function CompareView({ civIds, onClose }: CompareViewProps) {
  const { civilizations: civilizationsData } = useCivData();
  const civs = civIds.map(id => civilizationsData.find(c => c.id === id)).filter(Boolean);

  if (civs.length < 2) return null;

  const [civ1, civ2] = civs;

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-[var(--color-brand-dark)] h-full">
      <header className="mb-10 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-600 mb-2 flex items-center gap-4">
            <BarChart2 size={40} className="text-blue-500" />
            Confronto Civiltà
          </h1>
          <p className="text-gray-400 italic text-sm md:text-base">Analisi fianco a fianco di {civ1!.name} e {civ2!.name}.</p>
        </div>
        <button
          onClick={onClose}
          className="p-3 glass rounded-full hover:bg-red-500/20 hover:text-red-400 transition-all border border-white/10"
        >
          <X size={24} />
        </button>
      </header>

      <div className="max-w-7xl mx-auto pb-20 space-y-12">
        {/* Row 1: Headers */}
        <div className="grid grid-cols-2 gap-3 md:gap-8">
          {[civ1, civ2].map((civ, idx) => (
            <div key={`header-${civ!.id}`} className="glass p-4 md:p-8 rounded-3xl border border-[#D4AF37]/20 relative overflow-hidden group animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: `${idx * 150}ms` }}>
              <div className="absolute inset-0 opacity-10 transition-transform duration-700 group-hover:scale-110">
                <img src={civ!.flag} alt="" className="w-full h-full object-cover blur-xl" />
              </div>
              <div className="relative flex flex-col md:flex-row items-center gap-3 md:gap-6 text-center md:text-left">
                <img src={civ!.flag} alt={civ!.name} className="w-10 h-10 md:w-20 md:h-20 object-contain drop-shadow-2xl" />
                <div>
                  <h2 className="text-sm md:text-3xl font-bold text-white mb-1 md:mb-2">{civ!.name}</h2>
                  <span className={`text-[8px] md:text-xs font-bold px-2 md:px-3 py-0.5 md:py-1 rounded-full border ${civ!.difficulty === 'Facile' ? 'text-green-400 border-green-500/40 bg-green-500/10' :
                      civ!.difficulty === 'Medio' ? 'text-yellow-400 border-yellow-500/40 bg-yellow-500/10' :
                        'text-red-400 border-red-500/40 bg-red-500/10'
                    }`}>
                    {civ!.difficulty}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Row 2: Playstyle/Description */}
        <div className="grid grid-cols-2 gap-3 md:gap-8">
          {[civ1, civ2].map(civ => (
            <section key={`style-${civ!.id}`} className="glass p-4 md:p-6 rounded-2xl border border-white/5 h-full">
              <h3 className="text-[10px] md:text-sm font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Shield size={16} className="text-blue-400" />
                Stile di Gioco
              </h3>
              <p className="text-gray-300 leading-relaxed text-[11px] md:text-sm">{civ!.shortDescription}</p>
            </section>
          ))}
        </div>

        {/* Row 3: Key Bonuses */}
        <div className="grid grid-cols-2 gap-3 md:gap-8">
          {[civ1, civ2].map(civ => (
            <section key={`bonuses-${civ!.id}`} className="space-y-4 h-full">
              <h3 className="text-[10px] md:text-sm font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                <Zap size={16} className="text-yellow-500" />
                Bonus Chiave
              </h3>
              <div className="grid grid-cols-1 gap-3">
                {civ!.passiveBonuses.slice(0, 4).map((bonus, bIdx) => (
                  <div key={bIdx} className="glass p-2 md:p-4 rounded-xl border border-white/5 text-[10px] md:text-sm text-gray-300 min-h-[60px] flex items-center">
                    {bonus}
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* Row 3.5: Strengths */}
        <div className="grid grid-cols-2 gap-3 md:gap-8">
          {[civ1, civ2].map(civ => (
            <section key={`strengths-${civ!.id}`} className="space-y-4 h-full">
              <h3 className="text-[10px] md:text-sm font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                <ChevronUp size={16} className="text-green-400" />
                Punti di Forza
              </h3>
              <div className="glass p-4 rounded-xl border border-green-500/20 text-gray-300 text-[11px] md:text-sm leading-relaxed">
                <ul className="space-y-2 list-disc list-inside">
                  {civ!.strengths && civ!.strengths.length > 0 ? (
                    civ!.strengths.map((str, idx) => (
                      <li key={idx}><strong className="text-green-400">{str}</strong></li>
                    ))
                  ) : (
                    <li className="text-gray-500 italic">Dati non disponibili.</li>
                  )}
                </ul>
              </div>
            </section>
          ))}
        </div>

        {/* Row 3.6: Weaknesses */}
        <div className="grid grid-cols-2 gap-3 md:gap-8">
          {[civ1, civ2].map(civ => (
            <section key={`weaknesses-${civ!.id}`} className="space-y-4 h-full">
              <h3 className="text-[10px] md:text-sm font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                <ChevronDown size={16} className="text-red-400" />
                Punti Deboli
              </h3>
              <div className="glass p-4 rounded-xl border border-red-500/20 text-gray-300 text-[11px] md:text-sm leading-relaxed">
                {civ!.weaknesses && civ!.weaknesses.length > 0 ? (
                  <ul className="space-y-2 list-disc list-inside">
                    {civ!.weaknesses.map((wk, idx) => (
                      <li key={idx}><strong className="text-red-400">{wk}</strong></li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-500 italic px-2">Dati non disponibili.</p>
                )}
              </div>
            </section>
          ))}
        </div>

        {/* Row 4: Unique Units */}
        <div className="grid grid-cols-2 gap-3 md:gap-8">
          {[civ1, civ2].map(civ => (
            <section key={`units-${civ!.id}`} className="space-y-4 h-full">
              <h3 className="text-[10px] md:text-sm font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                <Sword size={16} className="text-red-400" />
                Unità Uniche
              </h3>
              {civ!.uniqueUnits.length > 0 ? (
                <div className="grid grid-cols-1 gap-3">
                  {civ!.uniqueUnits.map(unit => (
                    <div key={unit.id} className="glass p-3 md:p-4 rounded-xl border border-white/5 space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-white text-xs md:text-base font-bold block">{unit.name}</span>
                          <span className="text-[8px] md:text-[10px] text-gray-400 uppercase tracking-wider">{unit.type} • Age {unit.age}</span>
                        </div>
                      </div>
                      <div className="text-[11px] md:text-[13px] text-gray-300 leading-relaxed">
                        {unit.description}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="glass p-4 rounded-xl border border-white/5 text-gray-500 italic text-sm">
                  Nessuna unità unica specifica.
                </div>
              )}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
