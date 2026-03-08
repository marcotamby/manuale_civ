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

  // Combine generic units and unique units for this civ
  const allUnits = [...unitsList, ...(civ?.uniqueUnits || [])];

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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredLandmarks.map(landmark => (
              <div key={landmark.id} className="glass p-6 rounded-2xl border-t-2 border-t-yellow-500/50 hover:glass-hover transition-all group">
                <div className="flex justify-between items-start mb-3">
                  <h4 className="font-bold text-xl group-hover:text-yellow-400 transition-colors">{landmark.name}</h4>
                  <span className="text-[10px] font-bold px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded-full border border-yellow-500/30 uppercase tracking-wider">
                    {landmark.type}
                  </span>
                </div>
                <p className="text-sm text-gray-400 leading-relaxed italic">{landmark.description}</p>
              </div>
            ))}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredUnits.map(unit => (
              <div 
                key={unit.id}
                onClick={() => onSelectUnit(unit)}
                className="glass hover:glass-hover group cursor-pointer rounded-2xl overflow-hidden transition-all duration-300 flex flex-col h-full transform hover:-translate-y-1"
              >
                <div className="h-32 bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center p-4 relative">
                  {/* Decorative faint icon */}
                  <Shield size={64} className="text-white/5 absolute" />
                  <div className="w-16 h-16 rounded-full bg-blue-600/20 border border-blue-500/50 flex items-center justify-center text-blue-300 backdrop-blur-md z-10 group-hover:scale-110 transition-transform">
                    {/* Placeholder for real unit icon */}
                    <span className="font-bold text-lg">{unit.name[0]}</span>
                  </div>
                </div>
                
                <div className="p-5 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-lg group-hover:text-yellow-400 transition-colors">{unit.name}</h4>
                    <span className="text-xs font-semibold px-2 py-1 bg-white/10 rounded text-gray-300">{unit.type}</span>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2 mt-4 text-sm text-gray-400">
                    <div className="flex flex-col"><span className="text-xs text-gray-500">ATK</span><span className="font-semibold text-white">{unit.stats.attack}</span></div>
                    <div className="flex flex-col"><span className="text-xs text-gray-500">ARM</span><span className="font-semibold text-white">{unit.stats.armor}</span></div>
                    <div className="flex flex-col"><span className="text-xs text-gray-500">HP</span><span className="font-semibold text-white">{unit.stats.health}</span></div>
                  </div>
                </div>
              </div>
            ))}
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
