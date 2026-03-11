import type { Unit } from '../data/aoe4Data';
import { X, Shield, Sword, Heart, FastForward, CheckCircle2, XCircle, Info, Settings } from 'lucide-react';
import { useAuth } from './AuthContext';

interface UnitDetailModalProps {
  unit: Unit;
  onClose: () => void;
  onEdit?: (id: string, isGlobal: boolean) => void;
}

import type { ElementType } from 'react';

// A simple progress bar component for stats
const StatBar = ({ label, value, max, icon: Icon, colorClass }: { label: string, value: number, max: number, icon: ElementType, colorClass: string }) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className="mb-4">
      <div className="flex justify-between items-end mb-1">
        <span className="text-sm font-medium text-gray-400 flex items-center gap-1">
          <Icon size={14} className={colorClass} /> {label}
        </span>
        <span className="text-sm font-bold">{value}</span>
      </div>
      <div className="w-full bg-gray-800 rounded-full h-2">
        <div 
          className={`h-2 rounded-full ${colorClass.replace('text-', 'bg-')}`} 
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );
};

export function UnitDetailModal({ unit, onClose, onEdit }: UnitDetailModalProps) {
  const { isAdmin } = useAuth();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      ></div>
      
      {/* Modal */}
      <div className="relative w-full max-w-2xl bg-[#1e2332] border border-[#D4AF37]/30 rounded-2xl shadow-[0_0_40px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-700 flex justify-between items-center bg-gradient-to-r from-gray-900 to-[#1e2332]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded bg-blue-600/20 border border-blue-500/50 flex items-center justify-center text-blue-300">
              <span className="font-bold">{unit.name[0]}</span>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">{unit.name}</h2>
              <span className="text-xs text-yellow-500 font-medium tracking-wider uppercase">{unit.type} • Age {unit.age}</span>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-full transition-colors"
          >
            <X size={24} />
          </button>
          
          {isAdmin && onEdit && (
            <button 
              onClick={() => {
                const isGlobal = (window as any).currentCivUniqueUnits ? !(window as any).currentCivUniqueUnits.some((uu: any) => uu.id === unit.id) : false;
                onEdit(unit.id, isGlobal);
                onClose();
              }}
              className="absolute top-4 right-16 p-2.5 bg-yellow-600 hover:bg-yellow-500 text-black rounded-full shadow-lg transition-all active:scale-95 flex items-center justify-center border border-yellow-400/50"
              title="Modifica Unità"
            >
              <Settings size={20} fill="black" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          <p className="text-gray-300 mb-8 leading-relaxed text-lg border-l-4 border-blue-500 pl-4 py-1 italic">
            "{unit.description}"
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Stats Area */}
            <div className="glass p-5 rounded-xl">
              <h3 className="text-lg font-semibold mb-6 flex items-center gap-2 text-white">
                <Info size={18} className="text-blue-400" /> Unit Statistics
              </h3>
              
              <StatBar label="Health" value={unit.stats.health} max={250} icon={Heart} colorClass="text-green-500" />
              <StatBar label="Attack" value={unit.stats.attack} max={50} icon={Sword} colorClass="text-red-500" />
              <StatBar label="Armor" value={unit.stats.armor} max={10} icon={Shield} colorClass="text-yellow-500" />
              <StatBar label="Speed" value={unit.stats.speed} max={2.0} icon={FastForward} colorClass="text-blue-500" />
            </div>

            {/* Counters / Strengths & Weaknesses */}
            <div className="space-y-4">
              <div className="bg-green-900/10 border border-green-500/20 p-5 rounded-xl">
                <h3 className="text-green-400 font-semibold mb-3 flex items-center gap-2">
                  <CheckCircle2 size={18} /> Strong Against
                </h3>
                <ul className="space-y-2">
                  {unit.strengths.length > 0 ? unit.strengths.map((str, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm text-gray-300">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                      {str}
                    </li>
                  )) : <li className="text-gray-500 text-sm italic">None specific</li>}
                </ul>
              </div>

              <div className="bg-red-900/10 border border-red-500/20 p-5 rounded-xl">
                <h3 className="text-red-400 font-semibold mb-3 flex items-center gap-2">
                  <XCircle size={18} /> Weak Against
                </h3>
                <ul className="space-y-2">
                  {unit.weaknesses.length > 0 ? unit.weaknesses.map((wk, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm text-gray-300">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                      {wk}
                    </li>
                  )) : <li className="text-gray-500 text-sm italic">None specific</li>}
                </ul>
              </div>
            </div>
            
          </div>
          
          {/* CounterSystem Component */}
          <div className="mt-8 border-t border-gray-700 pt-6">
            <h3 className="text-lg font-semibold mb-4 text-white">Suggested Counters</h3>
            <div className="flex flex-wrap gap-2">
              {unit.weaknesses.map((wk, idx) => (
                <div key={idx} className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm font-medium hover:bg-gray-700 transition cursor-default">
                  Use: <span className="text-yellow-500">{wk}</span>
                </div>
              ))}
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
