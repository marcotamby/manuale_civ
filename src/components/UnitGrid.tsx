import { civilizationsData, unitsList } from '../data/aoe4Data';
import type { Unit } from '../data/aoe4Data';
import { Shield, Sword, Zap } from 'lucide-react';


interface UnitGridProps {
  civId: string;
  age: number;
  onSelectUnit: (unit: Unit) => void;
}

export function UnitGrid({ civId, age, onSelectUnit }: UnitGridProps) {
  const civ = civilizationsData.find(c => c.id === civId);

  // Combine generic units (filtering out excluded ones) and unique units for this civ
  const applicableGenericUnits = unitsList.filter(u => !(u.excludedCivs || []).includes(civId));
  const allUnits = [...applicableGenericUnits, ...(civ?.uniqueUnits || [])];

  const filteredUnits = allUnits.filter(u => u.age <= age);

  const filteredTechs = civ?.technologies.filter(t => t.age <= age) || [];
  
  const filteredLandmarks = civ?.landmarks.filter(l => l.age === age) || [];

  return (
    <div className="space-y-10">
      
      {/* Civilization Header Info */}
      <div className="glass p-6 rounded-2xl relative overflow-hidden">
        <div className="absolute right-0 top-0 opacity-10 blur-3xl w-64 h-64 bg-blue-500 rounded-full mix-blend-screen pointer-events-none"></div>
        <div className="absolute left-0 bottom-0 opacity-10 blur-3xl w-64 h-64 bg-yellow-500 rounded-full mix-blend-screen pointer-events-none"></div>
        
        <h2 className="text-3xl font-bold mb-2 flex items-center gap-3">
          {civ?.name} <span className="text-sm font-normal px-3 py-1 bg-blue-600/20 text-blue-400 rounded-full border border-blue-500/30">Age {age}</span>
        </h2>
        <p className="text-gray-300 max-w-2xl mb-6">{civ?.shortDescription}</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {civ?.passiveBonuses.map((bonus, idx) => (
            <div key={idx} className="flex items-start gap-3 bg-black/20 p-3 rounded-lg border border-white/5">
              <Zap size={18} className="text-yellow-500 mt-1 flex-shrink-0" />
              <p className="text-sm text-gray-300">{bonus}</p>
            </div>
          ))}
        </div>
      </div>



      <div>
        <h3 className="text-xl font-semibold mb-6 flex items-center gap-2 text-white/90">
          <Shield className="text-yellow-500" /> Landmarks (Age {age})
        </h3>
        
        {filteredLandmarks.length === 0 ? (
          <div className="text-center p-10 glass rounded-xl text-gray-500 italic">
            No landmarks defined for this age in the database.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredLandmarks.map(landmark => {
              const imgUrl = `https://data.aoe4world.com/images/buildings/${landmark.id}.png`;
              return (
              <div key={landmark.id} className="glass p-4 md:p-5 rounded-2xl border-t-2 border-t-yellow-500/50 hover:glass-hover transition-all group flex flex-col md:flex-row gap-4 items-center">
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-xl bg-black/40 border border-white/10 flex-shrink-0 overflow-hidden flex items-center justify-center p-2 relative">
                  <div className="absolute inset-0 flex items-center justify-center text-yellow-500/30">
                    <Shield size={24} />
                  </div>
                  <img 
                    src={imgUrl} 
                    alt={landmark.name}
                    className="max-w-full max-h-full object-contain group-hover:scale-110 transition-transform duration-500 relative z-10"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.opacity = '0';
                    }}
                  />
                </div>
                <div className="flex-1 text-center md:text-left">
                  <div className="flex justify-between items-center md:items-start mb-2">
                    <h4 className="font-bold text-lg group-hover:text-yellow-400 transition-colors">{landmark.name}</h4>
                    <span className="text-[10px] font-bold px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded-full border border-yellow-500/30 uppercase tracking-wider ml-2">
                      {landmark.type}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed italic">{landmark.description}</p>
                </div>
              </div>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <h3 className="text-xl font-semibold mb-6 flex items-center gap-2 text-white/90">
          <Sword className="text-gray-400" /> Units
        </h3>
        
        {filteredUnits.length === 0 ? (
          <div className="text-center p-12 glass rounded-xl text-gray-500">
            No units found for this age.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredUnits.map(unit => {
              // Format ID to match the image precisely. Generic ids usually don't have dashes but uniques might.
              // AoE4World image URLs usually expect lowercase with dashes for spaces or base ids.
              let imgId = unit.id.toLowerCase().replace(/\s+/g, '-');
              if (imgId === "man-at-arms-1") imgId = "man-at-arms-1";
              else if (imgId === "king-2") imgId = "king";
              else if (imgId === "longbowman-2") imgId = "longbowman-2";
              
              return (
              <div 
                key={unit.id}
                onClick={() => onSelectUnit(unit)}
                className="glass hover:glass-hover group cursor-pointer rounded-2xl overflow-hidden transition-all duration-300 flex flex-col h-full transform hover:-translate-y-1"
              >
                <div className="h-28 bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center p-3 relative overflow-hidden">
                  <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')]"></div>
                  
                  <div className="absolute inset-0 flex items-center justify-center text-blue-500/20">
                     <Sword size={32} />
                  </div>
                  
                  <img 
                    src={`https://data.aoe4world.com/images/units/${imgId}.png`}
                    alt={unit.name}
                    className="w-16 h-16 md:w-20 md:h-20 object-contain z-10 group-hover:scale-110 transition-transform duration-500 relative"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      if (!target.src.endsWith('-icon.png') && !target.src.includes('-2.png') && !target.src.includes('-3.png') && !target.src.includes('-4.png')) {
                         // Try to append an age number as fallback for generic ones that don't match
                         target.src = `https://data.aoe4world.com/images/units/${imgId}-${unit.age}.png`;
                      } else {
                         target.style.opacity = '0';
                      }
                    }}
                  />
                  
                  <Shield size={60} className="text-white/5 absolute -right-3 -bottom-3 rotate-12" />
                </div>
                
                <div className="p-4 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-sm md:text-base group-hover:text-yellow-400 transition-colors">{unit.name}</h4>
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 bg-white/10 rounded text-gray-300 ml-1">{unit.type}</span>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-1 mt-auto pt-2 text-xs text-gray-400">
                    <div className="flex flex-col"><span className="text-[10px] text-gray-500">ATK</span><span className="font-semibold text-white">{unit.stats.attack}</span></div>
                    <div className="flex flex-col"><span className="text-[10px] text-gray-500">ARM</span><span className="font-semibold text-white">{unit.stats.armor}</span></div>
                    <div className="flex flex-col"><span className="text-[10px] text-gray-500">HP</span><span className="font-semibold text-white">{unit.stats.health}</span></div>
                  </div>
                </div>
              </div>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <h3 className="text-xl font-semibold mb-6 flex items-center gap-2 text-white/90">
          <Shield className="text-gray-400" /> Technologies
        </h3>
        
        {filteredTechs.length === 0 ? (
          <div className="text-center p-12 glass rounded-xl text-gray-500">
            No unique technologies available in this age.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTechs.map(tech => (
              <div key={tech.id} className="glass p-5 rounded-xl border-l-4 border-l-yellow-500">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-bold text-lg">{tech.name}</h4>
                  <span className="text-xs bg-gray-800 px-2 py-1 rounded text-gray-400">{tech.building}</span>
                </div>
                <p className="text-sm text-gray-400 leading-relaxed">{tech.description}</p>
              </div>
            ))}
          </div>
        )}
      </div>
      
    </div>
  );
}
