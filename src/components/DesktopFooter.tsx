import { Youtube, Twitch, ExternalLink } from 'lucide-react';

export function DesktopFooter() {
  return (
    <footer className="hidden md:flex flex-col lg:flex-row items-center justify-between px-8 py-4 lg:py-3 border-t border-white/10 bg-[#16171d] z-50 gap-4 lg:gap-0">
      <div className="flex items-center gap-4 lg:gap-6 xl:gap-8 flex-wrap lg:flex-nowrap justify-center lg:justify-start shrink-0">
        <div className="flex items-center gap-3 shrink-0">
          <img 
            src="/aoeitalia-logo.png" 
            alt="Aoeitalia Logo" 
            className="h-6 w-auto object-contain hover:scale-105 transition-transform"
          />
          <div className="h-4 w-[1px] bg-white/20" />
          <p className="text-[9px] xl:text-[12px] font-black uppercase tracking-[0.2em] select-none whitespace-nowrap bg-gradient-to-b from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            Social & Community
          </p>
        </div>
        
        <div className="hidden lg:block h-5 w-[1px] bg-white/20 shrink-0" />

        <div className="flex items-center gap-3 lg:gap-4 xl:gap-8 flex-wrap lg:flex-nowrap justify-center">
          <a 
            href="https://www.twitch.tv/aoeitalia" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-[11px] lg:text-[13px] font-bold text-white/70 hover:text-purple-400 transition-all group"
          >
            <Twitch size={16} className="group-hover:scale-110 transition-transform" />
            <span>Twitch <span className="hidden xl:inline text-white/20 font-medium">Aoeitalia</span></span>
          </a>

          <a 
            href="https://www.youtube.com/@AoeItalia" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-[11px] lg:text-[13px] font-bold text-white/70 hover:text-red-500 transition-all group"
          >
            <Youtube size={16} className="group-hover:scale-110 transition-transform" />
            <span>YouTube <span className="hidden xl:inline text-white/20 font-medium">Aoeitalia</span></span>
          </a>

          <a 
            href="https://www.youtube.com/@marcotamby_aoe" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-[11px] lg:text-[13px] font-bold text-white/70 hover:text-red-500 transition-all group"
          >
            <Youtube size={16} className="group-hover:scale-110 transition-transform" />
            <span>YouTube <span className="hidden xl:inline text-white/20 font-medium">marcotamby</span></span>
          </a>

          <a 
            href="https://discord.gg/8Tx2YdXrEu" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-[11px] lg:text-[13px] font-bold text-white/70 hover:text-indigo-400 transition-all group"
          >
            <svg className="w-4 h-4 fill-current group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.874.893.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.419-2.157 2.419zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.419-2.157 2.419z" />
            </svg>
            <span>Discord <span className="hidden xl:inline text-white/20 font-medium">Aoeitalia</span></span>
          </a>
        </div>
      </div>

      <div className="flex items-center gap-2 lg:gap-4 xl:gap-6 text-[9px] xl:text-[12px] font-bold text-white/30 uppercase tracking-widest whitespace-nowrap shrink-0 justify-center">
        <span className="hidden xl:inline">Age of Empires IV © Microsoft</span>
        <span className="inline xl:hidden">AoE IV © Microsoft</span>
        <div className="w-1 h-1 rounded-full bg-white/20 shrink-0" />
        <a href="/privacy" className="hover:text-white transition-colors flex items-center gap-1">
          Privacy <ExternalLink size={14} />
        </a>
        <div className="w-1 h-1 rounded-full bg-white/20 shrink-0" />
        <button 
          onClick={() => window.dispatchEvent(new CustomEvent('open-cookie-settings'))}
          className="hover:text-white transition-colors cursor-pointer bg-transparent border-none p-0 outline-none"
        >
          Gestisci Cookie
        </button>
      </div>
    </footer>
  );
}
