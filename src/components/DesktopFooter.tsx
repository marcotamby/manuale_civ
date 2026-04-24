import { Youtube, Twitch, ExternalLink } from 'lucide-react';

export function DesktopFooter() {
  return (
    <footer className="hidden md:flex items-center justify-between px-8 py-2 border-t border-white/5 bg-[#0a0a0b]/80 backdrop-blur-md z-50">
      <div className="flex items-center gap-6">
        <p className="text-[9px] font-black text-gray-600 uppercase tracking-[0.2em] select-none">
          Social & Community
        </p>
        
        <div className="h-3 w-[1px] bg-white/10" />

        <div className="flex items-center gap-6">
          <a 
            href="https://www.twitch.tv/aoeitalia" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-[10px] font-bold text-gray-400 hover:text-purple-400 transition-all group"
          >
            <Twitch size={12} className="group-hover:scale-110 transition-transform" />
            <span>Twitch <span className="text-gray-600 font-medium">Aoeitalia</span></span>
          </a>

          <a 
            href="https://www.youtube.com/@marcotamby_aoe" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-[10px] font-bold text-gray-400 hover:text-red-500 transition-all group"
          >
            <Youtube size={12} className="group-hover:scale-110 transition-transform" />
            <span>YouTube <span className="text-gray-600 font-medium">Marcotamby</span></span>
          </a>

          <a 
            href="https://www.youtube.com/@AoeItalia" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-[10px] font-bold text-gray-400 hover:text-red-500 transition-all group"
          >
            <Youtube size={12} className="group-hover:scale-110 transition-transform" />
            <span>YouTube <span className="text-gray-600 font-medium">Aoeitalia</span></span>
          </a>
        </div>
      </div>

      <div className="flex items-center gap-4 text-[9px] font-bold text-gray-600 uppercase tracking-widest">
        <span>Age of Empires IV © Microsoft</span>
        <div className="w-1 h-1 rounded-full bg-white/10" />
        <a href="/privacy" className="hover:text-white transition-colors flex items-center gap-1">
          Privacy <ExternalLink size={10} />
        </a>
      </div>
    </footer>
  );
}
