import { Youtube, Twitch, ExternalLink } from 'lucide-react';

export function DesktopFooter() {
  return (
    <footer className="hidden md:flex items-center justify-between px-8 py-4 border-t border-white/10 bg-[#16171d] z-50">
      <div className="flex items-center gap-8">
        <p className="text-[12px] font-black text-cyan-400 uppercase tracking-[0.2em] select-none">
          Social & Community
        </p>
        
        <div className="h-5 w-[1px] bg-white/20" />

        <div className="flex items-center gap-8">
          <a 
            href="https://www.twitch.tv/aoeitalia" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-[13px] font-bold text-white/70 hover:text-purple-400 transition-all group"
          >
            <Twitch size={16} className="group-hover:scale-110 transition-transform" />
            <span>Twitch <span className="text-white/30 font-medium">Aoeitalia</span></span>
          </a>

          <a 
            href="https://www.youtube.com/@marcotamby_aoe" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-[13px] font-bold text-white/70 hover:text-red-500 transition-all group"
          >
            <Youtube size={16} className="group-hover:scale-110 transition-transform" />
            <span>YouTube <span className="text-white/30 font-medium">Marcotamby</span></span>
          </a>

          <a 
            href="https://www.youtube.com/@AoeItalia" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-[13px] font-bold text-white/70 hover:text-red-500 transition-all group"
          >
            <Youtube size={16} className="group-hover:scale-110 transition-transform" />
            <span>YouTube <span className="text-white/30 font-medium">Aoeitalia</span></span>
          </a>
        </div>
      </div>

      <div className="flex items-center gap-6 text-[12px] font-bold text-white/30 uppercase tracking-widest">
        <span>Age of Empires IV © Microsoft</span>
        <div className="w-1 h-1 rounded-full bg-white/20" />
        <a href="/privacy" className="hover:text-white transition-colors flex items-center gap-1">
          Privacy <ExternalLink size={14} />
        </a>
      </div>
    </footer>
  );
}
