import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

interface Option {
  value: any;
  label: string;
}

interface CustomSelectProps {
  options: Option[];
  value: any;
  onChange: (value: any) => void;
  label?: string;
  className?: string;
  buttonClassName?: string;
}

export function CustomSelect({ options, value, onChange, label, className = '', buttonClassName = '' }: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(o => String(o.value) === String(value));

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  return (
    <div className={`flex flex-col gap-1 min-w-[120px] flex-1 sm:flex-initial ${className}`} ref={dropdownRef}>
      {label && <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1 mb-1">{label}</label>}
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full h-11 bg-black/40 backdrop-blur-md border border-slate-700/50 hover:border-cyan-500/50 rounded-xl px-4 text-xs sm:text-sm text-white flex items-center justify-between transition-all duration-300 shadow-lg group gap-2 outline-none ${buttonClassName} ${isOpen ? 'border-cyan-500/80 shadow-[0_0_12px_rgba(6,182,212,0.15)]' : ''}`}
        >
          <span className="font-semibold truncate">{selectedOption ? selectedOption.label : 'Seleziona...'}</span>
          <ChevronDown 
            size={16} 
            className={`text-cyan-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} 
          />
        </button>

        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-[#0d1222]/95 backdrop-blur-2xl border border-cyan-500/20 rounded-xl overflow-hidden z-50 shadow-[0_10px_35px_rgba(0,0,0,0.6)] animate-in fade-in slide-in-from-top-2 duration-200 max-h-60 overflow-y-auto custom-scrollbar">
            {options.map((option) => {
              const isSelected = String(value) === String(option.value);
              return (
                <button
                  key={String(option.value)}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={`w-full px-4 py-3 text-xs sm:text-sm text-left transition-colors flex items-center justify-between ${
                    isSelected 
                      ? 'bg-cyan-500/10 text-cyan-400 font-extrabold' 
                      : 'text-gray-300 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <span className="truncate">{option.label}</span>
                  {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
