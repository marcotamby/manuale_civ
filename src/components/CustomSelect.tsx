import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

interface Option {
  value: string;
  label: string;
}

interface CustomSelectProps {
  options: Option[];
  value: string;
  onChange: (value: any) => void;
  label?: string;
}

export function CustomSelect({ options, value, onChange, label }: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(o => o.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="flex flex-col gap-1 min-w-[120px] flex-1 sm:flex-initial" ref={dropdownRef}>
      {label && <label className="text-xs text-gray-500 font-bold uppercase tracking-wider ml-1">{label}</label>}
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full h-[42px] bg-black/40 backdrop-blur-md border border-[#D4AF37]/20 hover:border-yellow-500/50 rounded-xl px-2.5 sm:px-4 text-xs sm:text-sm text-white flex items-center justify-between transition-all duration-300 shadow-lg group gap-2"
        >
          <span className="font-medium truncate">{selectedOption?.label}</span>
          <ChevronDown 
            size={16} 
            className={`text-yellow-500 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} 
          />
        </button>

        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-[#1a1c23] border border-[#D4AF37]/30 rounded-xl overflow-hidden z-50 shadow-[0_10px_30px_rgba(0,0,0,0.5)] animate-in fade-in slide-in-from-top-2 duration-200">
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`w-full px-4 py-3 text-sm text-left transition-colors flex items-center justify-between ${
                  value === option.value 
                    ? 'bg-yellow-500/10 text-yellow-400 font-bold' 
                    : 'text-gray-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                {option.label}
                {value === option.value && <div className="w-1.5 h-1.5 rounded-full bg-yellow-500" />}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
