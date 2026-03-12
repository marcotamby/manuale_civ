import { Link, useLocation } from 'react-router-dom';
import { HelpCircle, Coffee, MessageSquare } from 'lucide-react';

export function MobileFooter() {
  const location = useLocation();
  const isFaq = location.pathname === '/faq';

  return (
    <footer className="md:hidden fixed bottom-0 left-0 right-0 z-40 px-4 py-3 bg-[#0d1424]/90 backdrop-blur-md border-t border-yellow-500/20 shadow-[0_-4px_20px_rgba(0,0,0,0.5)] flex items-center justify-around">
      <Link
        to="/faq"
        className={`flex flex-col items-center gap-1 transition-all ${isFaq ? 'text-yellow-500' : 'text-gray-400 hover:text-yellow-500'}`}
      >
        <HelpCircle size={20} className={isFaq ? 'scale-110' : ''} />
        <span className="text-[10px] font-bold uppercase tracking-widest">FAQ</span>
      </Link>

      <a
        href="https://discord.gg/XmFhYzwC"
        target="_blank"
        rel="noopener noreferrer"
        className="flex flex-col items-center gap-1 text-gray-400 hover:text-indigo-400 transition-all font-sans"
      >
        <MessageSquare size={20} />
        <span className="text-[10px] font-bold uppercase tracking-widest">Discord</span>
      </a>

      <a
        href="https://ko-fi.com/marcotamby"
        target="_blank"
        rel="noopener noreferrer"
        className="flex flex-col items-center gap-1 text-gray-400 hover:text-amber-500 transition-all font-sans"
      >
        <Coffee size={20} />
        <span className="text-[10px] font-bold uppercase tracking-widest">Sostieni</span>
      </a>
    </footer>
  );
}
