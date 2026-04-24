import { Link, useLocation } from 'react-router-dom';
import { HelpCircle, Coffee, MessageSquare, Trophy, Youtube, Twitch } from 'lucide-react';
import { usePresence } from './PresenceContext';
import { useAuth } from './AuthContext';

export function MobileFooter() {
  const location = useLocation();
  const { isAdmin } = useAuth();
  const { activeAdmins } = usePresence();
  const isFaq = location.pathname === '/faq';

  return (
    <footer className="md:hidden fixed bottom-0 left-0 right-0 z-40 px-4 py-2.5 bg-[#0d1424]/95 backdrop-blur-xl border-t border-yellow-500/20 shadow-[0_-8px_30px_rgba(0,0,0,0.6)] flex flex-col gap-2.5">
      {/* Primary Actions Row */}
      <div className="flex items-center justify-around w-full">
        <Link
          to="/faq"
          className={`flex flex-col items-center gap-1 transition-all ${isFaq ? 'text-yellow-500' : 'text-gray-400 hover:text-yellow-500'}`}
        >
          <HelpCircle size={18} className={isFaq ? 'scale-110' : ''} />
          <span className="text-[9px] font-bold uppercase tracking-widest">FAQ</span>
        </Link>

        <a
          href="https://discord.gg/XmFhYzwC"
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col items-center gap-1 text-gray-400 hover:text-indigo-400 transition-all font-sans"
        >
          <MessageSquare size={18} />
          <span className="text-[9px] font-bold uppercase tracking-widest">Discord</span>
        </a>

        <a
          href="https://ko-fi.com/marcotamby"
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col items-center gap-1 text-gray-400 hover:text-amber-500 transition-all font-sans"
        >
          <Coffee size={18} />
          <span className="text-[9px] font-bold uppercase tracking-widest">Sostieni</span>
        </a>

        <Link
          to="/tornei"
          className={`flex flex-col items-center gap-1 transition-all ${location.pathname.startsWith('/tornei') ? 'text-yellow-500' : 'text-gray-400 hover:text-yellow-500'}`}
        >
          <Trophy size={18} className={location.pathname.startsWith('/tornei') ? 'scale-110' : ''} />
          <span className="text-[9px] font-bold uppercase tracking-widest">Tornei</span>
        </Link>
      </div>

      {/* Social Links Row */}
      <div className="flex items-center justify-around w-full pt-3 border-t border-white/5">
        <a 
          href="https://www.twitch.tv/aoeitalia" 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-[9px] font-black text-[#a970ff] drop-shadow-[0_0_8px_rgba(169,112,255,0.3)] transition-all"
        >
          <Twitch size={13} />
          <span>Twitch <span className="text-white/40 font-bold italic">Aoeitalia</span></span>
        </a>

        <a 
          href="https://www.youtube.com/@marcotamby_aoe" 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-[9px] font-black text-[#ff4e4e] drop-shadow-[0_0_8px_rgba(255,78,78,0.3)] transition-all"
        >
          <Youtube size={13} />
          <span>YT <span className="text-white/40 font-bold italic">Marco</span></span>
        </a>

        <a 
          href="https://www.youtube.com/@AoeItalia" 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-[9px] font-black text-[#ff4e4e] drop-shadow-[0_0_8px_rgba(255,78,78,0.3)] transition-all"
        >
          <Youtube size={13} />
          <span>YT <span className="text-white/40 font-bold italic">Aoeitalia</span></span>
        </a>
      </div>

      {/* Admin Live indicator - Bottom Right (only for admins) */}
      {isAdmin && Object.keys(activeAdmins).length > 0 && (
        <div className="absolute -top-12 right-4 flex items-center gap-2 px-3 py-1.5 bg-[#0d1424]/90 backdrop-blur-md rounded-full border border-yellow-500/30 shadow-lg animate-in slide-in-from-right duration-500">
          <div className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500"></span>
          </div>
          <span className="text-[9px] font-black text-yellow-500 uppercase tracking-widest">
            {Object.keys(activeAdmins).length} LIVE
          </span>
        </div>
      )}
    </footer>
  );
}
