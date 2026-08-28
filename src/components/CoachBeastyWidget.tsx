import React, { useState, useRef, useEffect } from 'react';
import { X, Send, RotateCcw, Sparkles, Shield, Swords, Zap } from 'lucide-react';
import { useAuth } from './AuthContext';

interface TacticalCard {
  title?: string;
  age?: string;
  counterUnits?: Array<{ name: string; icon: string; role: string }>;
  villi?: { food?: number; wood?: number; gold?: number; stone?: number };
  villagers?: { food?: number; wood?: number; gold?: number; stone?: number };
  proTip?: string;
}

interface Message {
  id: string;
  sender: 'user' | 'coach';
  text: string;
  tacticalCard?: TacticalCard | null;
  timestamp: string;
}

const PRESET_PROMPTS = [
  "Come contrasto la Cavalleria Francese con gli Inglesi in Età II?",
  "Qual è la migliore apertura villi per gli Ottomani 1 TC?",
  "Quali civiltà bannare nella mappa Dry Arabia?",
  "Come si gioca il matchup Sacro Romano Impero vs Bisantini?"
];

export const CoachBeastyWidget: React.FC = () => {
  const { user } = useAuth();
  const userNickname = user?.nickname || user?.name || '';
  const displayName = userNickname || 'nabbo';

  const [isOpen, setIsOpen] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);

  // Initialize or update welcome message when user changes
  useEffect(() => {
    setMessages([
      {
        id: 'welcome',
        sender: 'coach',
        text: `Ciao **${displayName}**! 👋 Sono **Coach Beasty AI**.\n\nChiedimi consigli su matchup, contromisure delle unità, posizionamento delle strutture o distribuzione dei villi per qualsiasi civiltà!`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  }, [displayName]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen, loading]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputMessage).trim();
    if (!query || loading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInputMessage('');
    setLoading(true);

    try {
      const historyPayload = messages.map(m => ({
        sender: m.sender,
        text: m.text
      }));

      const res = await fetch('/api/coach-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          history: historyPayload,
          userNickname: userNickname
        })
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || 'Errore nella comunicazione con Coach Beasty');
      }

      const coachMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'coach',
        text: data.reply || 'Errore nella generazione della risposta.',
        tacticalCard: data.tacticalCard || null,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, coachMsg]);
    } catch (err: any) {
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'coach',
        text: `⚠️ Si è verificato un errore: ${err.message || 'Impossibile connettersi al Coach'}. Riprova tra poco!`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: 'welcome-' + Date.now(),
        sender: 'coach',
        text: `Chat azzerata! 🔄 Come posso aiutarti ora nelle tue battaglie, **${displayName}**?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  return (
    <div className="fixed bottom-20 right-4 sm:bottom-24 sm:right-6 z-50 font-sans select-none">
      
      {/* Drawer Dialog Modal */}
      {isOpen && (
        <div className="fixed bottom-36 right-4 sm:bottom-40 sm:right-6 w-[92vw] sm:w-[420px] h-[560px] max-h-[75vh] bg-[#0a0c10]/95 backdrop-blur-xl border border-[#D4AF37]/30 rounded-2xl shadow-2xl shadow-black/90 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-blue-950/80 p-3.5 border-b border-[#D4AF37]/20 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <img 
                  src="/beasty_avatar.jpg" 
                  alt="Coach Beasty AI" 
                  className="w-9 h-9 rounded-xl object-cover border border-[#D4AF37]/50 shadow-md"
                />
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                </span>
              </div>
              <div>
                <h3 className="font-bold text-[#D4AF37] text-sm tracking-wide">
                  Coach Beasty AI
                </h3>
              </div>
            </div>

            <div className="flex items-center space-x-1">
              <button 
                onClick={handleResetChat} 
                className="text-slate-400 hover:text-[#D4AF37] p-1.5 rounded-lg hover:bg-slate-800/60 transition"
                title="Azzera conversazione"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setIsOpen(false)} 
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800/60 transition"
                title="Chiudi widget"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 text-xs elegant-scrollbar bg-slate-950/80">
            {messages.map((msg) => (
              <div 
                key={msg.id} 
                className={`flex items-start space-x-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.sender === 'coach' && (
                  <img 
                    src="/beasty_avatar.jpg" 
                    alt="Coach Beasty" 
                    className="w-7 h-7 rounded-lg object-cover border border-[#D4AF37]/40 shrink-0 mt-0.5" 
                  />
                )}

                <div className={`max-w-[85%] rounded-2xl p-3 shadow-md ${
                  msg.sender === 'user' 
                    ? 'bg-blue-600/25 border border-blue-500/40 text-blue-100 rounded-tr-none' 
                    : 'bg-slate-900/90 border border-slate-800 text-slate-200 rounded-tl-none space-y-2.5'
                }`}>
                  
                  {/* Message Text */}
                  <div className="whitespace-pre-wrap leading-relaxed select-text">
                    {msg.text.split('\n\n').map((paragraph, idx) => (
                      <p key={idx} className={idx > 0 ? 'mt-2' : ''}>
                        {paragraph}
                      </p>
                    ))}
                  </div>

                  {/* Tactical Card Render */}
                  {msg.tacticalCard && (
                    <div className="bg-slate-950/90 border border-[#D4AF37]/30 rounded-xl p-3 space-y-2.5 mt-2">
                      {(msg.tacticalCard.title || msg.tacticalCard.age) && (
                        <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                          <span className="font-semibold text-[#D4AF37] text-xs flex items-center gap-1">
                            <Swords className="w-3.5 h-3.5 text-[#D4AF37]" />
                            {msg.tacticalCard.title || 'Scheda Tattica'}
                          </span>
                          {msg.tacticalCard.age && (
                            <span className="text-[10px] bg-blue-500/10 text-blue-300 px-2 py-0.5 rounded border border-blue-500/20">
                              {msg.tacticalCard.age}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Counter Units Grid */}
                      {msg.tacticalCard.counterUnits && msg.tacticalCard.counterUnits.length > 0 && (
                        <div className="space-y-1.5">
                          <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                            <Shield className="w-3 h-3 text-emerald-400" /> Unità Consigliate:
                          </span>
                          <div className="grid grid-cols-2 gap-1.5">
                            {msg.tacticalCard.counterUnits.map((u, i) => (
                              <div key={i} className="bg-slate-900/90 p-2 rounded-lg border border-slate-800 flex items-center space-x-2">
                                <span className="text-base">{u.icon || '🛡️'}</span>
                                <div className="min-w-0 flex-1">
                                  <div className="font-semibold text-emerald-400 text-[11px] truncate">{u.name}</div>
                                  <div className="text-[9px] text-slate-400 truncate">{u.role}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Villi Distribution */}
                      {(msg.tacticalCard.villi || msg.tacticalCard.villagers) && (
                        <div className="space-y-1">
                          <span className="text-[11px] text-slate-400 font-medium">🌾 Villi consigliati:</span>
                          <div className="grid grid-cols-4 gap-1 text-center">
                            {(() => {
                              const v = msg.tacticalCard.villi || msg.tacticalCard.villagers || {};
                              return (
                                <>
                                  <div className="bg-amber-950/30 border border-amber-500/20 p-1 rounded-lg">
                                    <div className="text-slate-400 text-[9px]">Cibo</div>
                                    <div className="font-bold text-[#D4AF37] text-xs">{v.food ?? 0}</div>
                                  </div>
                                  <div className="bg-emerald-950/30 border border-emerald-500/20 p-1 rounded-lg">
                                    <div className="text-slate-400 text-[9px]">Legno</div>
                                    <div className="font-bold text-emerald-400 text-xs">{v.wood ?? 0}</div>
                                  </div>
                                  <div className="bg-yellow-950/30 border border-yellow-500/20 p-1 rounded-lg">
                                    <div className="text-slate-400 text-[9px]">Oro</div>
                                    <div className="font-bold text-yellow-400 text-xs">{v.gold ?? 0}</div>
                                  </div>
                                  <div className="bg-slate-800/40 border border-slate-700/20 p-1 rounded-lg">
                                    <div className="text-slate-400 text-[9px]">Pietra</div>
                                    <div className="font-bold text-slate-300 text-xs">{v.stone ?? 0}</div>
                                  </div>
                                </>
                              );
                            })()}
                          </div>
                        </div>
                      )}

                      {/* Pro Tip */}
                      {msg.tacticalCard.proTip && (
                        <div className="bg-blue-950/40 border-l-2 border-[#D4AF37] p-2 rounded-r-lg text-[11px] text-slate-200 flex items-start gap-1.5">
                          <Zap className="w-3.5 h-3.5 text-[#D4AF37] shrink-0 mt-0.5" />
                          <span><strong>Tip Pro:</strong> {msg.tacticalCard.proTip}</span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className={`text-[9px] mt-1 text-right ${msg.sender === 'user' ? 'text-blue-300/60' : 'text-slate-500'}`}>
                    {msg.timestamp}
                  </div>
                </div>

                {msg.sender === 'user' && (
                  <div className="w-7 h-7 rounded-lg bg-blue-600 text-white font-bold flex items-center justify-center shrink-0 mt-0.5 text-xs shadow-md">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            ))}

            {/* Quick Prompts Pills */}
            {messages.length <= 2 && !loading && (
              <div className="pt-2 space-y-1.5">
                <span className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider">
                  Domande frequenti:
                </span>
                <div className="space-y-1.5">
                  {PRESET_PROMPTS.map((promptText, i) => (
                    <button
                      key={i}
                      onClick={() => handleSendMessage(promptText)}
                      className="w-full text-left bg-slate-900/90 hover:bg-blue-950/40 hover:border-blue-500/40 border border-slate-800 text-[11px] text-slate-300 p-2 rounded-xl transition flex items-center justify-between group"
                    >
                      <span className="truncate pr-2">{promptText}</span>
                      <Sparkles className="w-3.5 h-3.5 text-slate-500 group-hover:text-[#D4AF37] shrink-0 transition" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Loading Indicator */}
            {loading && (
              <div className="flex items-center space-x-2.5">
                <img 
                  src="/beasty_avatar.jpg" 
                  alt="Coach Beasty" 
                  className="w-7 h-7 rounded-lg object-cover border border-[#D4AF37]/40 shrink-0 animate-pulse" 
                />
                <div className="bg-slate-900 border border-slate-800 rounded-2xl rounded-tl-none p-3 text-slate-400 text-xs flex items-center space-x-2">
                  <div className="flex space-x-1">
                    <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                    <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                    <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce"></span>
                  </div>
                  <span>Coach Beasty sta elaborando la tattica per {displayName}...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Bar */}
          <div className="p-3 bg-slate-950 border-t border-slate-800/80">
            <form 
              onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
              className="flex items-center space-x-2"
            >
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder={`Chiedi a Coach Beasty, ${displayName}...`}
                disabled={loading}
                className="flex-1 bg-slate-900 border border-slate-700/80 focus:border-blue-500/60 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none transition"
              />
              <button
                type="submit"
                disabled={loading || !inputMessage.trim()}
                className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold p-2.5 rounded-xl text-xs flex items-center justify-center transition shadow-md shadow-blue-600/20"
                title="Invia messaggio"
              >
                <Send className="w-4 h-4 text-white" />
              </button>
            </form>
          </div>

        </div>
      )}

      {/* Floating Trigger Button (Positioned above bottom bar) */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="group relative flex items-center justify-center w-14 h-14 rounded-full bg-slate-900 border-2 border-[#D4AF37] shadow-xl shadow-blue-900/40 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer overflow-hidden p-0.5"
        title="Coach Beasty AI"
      >
        <div className="relative w-full h-full flex items-center justify-center">
          {isOpen ? (
            <X className="w-6 h-6 text-white stroke-[2.5]" />
          ) : (
            <>
              <img 
                src="/beasty_avatar.jpg" 
                alt="Coach Beasty AI" 
                className="w-full h-full rounded-full object-cover group-hover:scale-110 transition-transform duration-300"
              />
              <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500 border border-slate-900"></span>
              </span>
            </>
          )}
        </div>
      </button>

    </div>
  );
};
