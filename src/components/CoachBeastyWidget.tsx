import React, { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, RotateCcw, Sparkles, Shield, Swords, Zap } from 'lucide-react';

interface TacticalCard {
  title?: string;
  age?: string;
  counterUnits?: Array<{ name: string; icon: string; role: string }>;
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
  "Qual è la migliore apertura villici per gli Ottomani 1 TC?",
  "Quali civiltà bannare nella mappa Dry Arabia?",
  "Come si gioca il matchup Sacro Romano Impero vs Bisantini?"
];

export const CoachBeastyWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'coach',
      text: "Ciao comandante! 👋 Sono **Coach Beasty AI**, il tuo assistente strategico di Age of Empires IV.\n\nChiedimi consigli su matchup, contromisure delle unità, posizionamento delle strutture o distribuzione dei villici per qualsiasi civiltà!",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

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
          history: historyPayload
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
        text: "Chat azzerata! 🔄 Come posso aiutarti ora nelle tue battaglie su AoE IV?",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 font-sans select-none">
      
      {/* Drawer Dialog Modal */}
      {isOpen && (
        <div className="w-[92vw] sm:w-[420px] h-[580px] max-h-[82vh] mb-3 bg-[#0a0c10]/95 backdrop-blur-xl border border-[#D4AF37]/30 rounded-2xl shadow-2xl shadow-black/80 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-amber-950/80 via-slate-900 to-slate-950 p-3.5 border-b border-[#D4AF37]/20 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shadow-lg shadow-amber-500/20 text-slate-950 font-bold">
                  <Bot className="w-5 h-5 text-slate-950" />
                </div>
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                </span>
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="font-semibold text-amber-400 text-sm tracking-wide flex items-center gap-1.5">
                    Coach Beasty AI
                  </h3>
                  <span className="bg-amber-500/10 text-amber-300 text-[10px] px-1.5 py-0.2 rounded border border-amber-500/30 font-mono">
                    AoE4 Expert
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">Assistente Tattico Strategico</p>
              </div>
            </div>

            <div className="flex items-center space-x-1">
              <button 
                onClick={handleResetChat} 
                className="text-slate-400 hover:text-amber-400 p-1.5 rounded-lg hover:bg-slate-800/60 transition"
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
          <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 text-xs elegant-scrollbar bg-slate-950/60">
            {messages.map((msg) => (
              <div 
                key={msg.id} 
                className={`flex items-start space-x-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.sender === 'coach' && (
                  <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-4 h-4 text-amber-400" />
                  </div>
                )}

                <div className={`max-w-[85%] rounded-2xl p-3 shadow-md ${
                  msg.sender === 'user' 
                    ? 'bg-amber-600/20 border border-amber-500/40 text-amber-100 rounded-tr-none' 
                    : 'bg-slate-900/90 border border-slate-800 text-slate-200 rounded-tl-none space-y-2.5'
                }`}>
                  
                  {/* Message Text with simple formatting support */}
                  <div className="whitespace-pre-wrap leading-relaxed select-text">
                    {msg.text.split('\n\n').map((paragraph, idx) => (
                      <p key={idx} className={idx > 0 ? 'mt-2' : ''}>
                        {paragraph}
                      </p>
                    ))}
                  </div>

                  {/* Tactical Card Render */}
                  {msg.tacticalCard && (
                    <div className="bg-slate-950/80 border border-amber-500/30 rounded-xl p-3 space-y-2.5 mt-2">
                      {(msg.tacticalCard.title || msg.tacticalCard.age) && (
                        <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                          <span className="font-semibold text-amber-400 text-xs flex items-center gap-1">
                            <Swords className="w-3.5 h-3.5" />
                            {msg.tacticalCard.title || 'Scheda Tattica'}
                          </span>
                          {msg.tacticalCard.age && (
                            <span className="text-[10px] bg-amber-500/10 text-amber-300 px-2 py-0.5 rounded border border-amber-500/20">
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

                      {/* Villagers Distribution */}
                      {msg.tacticalCard.villagers && (
                        <div className="space-y-1">
                          <span className="text-[11px] text-slate-400 font-medium">🌾 Villici consigliati:</span>
                          <div className="grid grid-cols-4 gap-1 text-center">
                            <div className="bg-amber-950/40 border border-amber-500/20 p-1 rounded-lg">
                              <div className="text-slate-400 text-[9px]">Cibo</div>
                              <div className="font-bold text-amber-400 text-xs">{msg.tacticalCard.villagers.food ?? 0}</div>
                            </div>
                            <div className="bg-emerald-950/40 border border-emerald-500/20 p-1 rounded-lg">
                              <div className="text-slate-400 text-[9px]">Legno</div>
                              <div className="font-bold text-emerald-400 text-xs">{msg.tacticalCard.villagers.wood ?? 0}</div>
                            </div>
                            <div className="bg-yellow-950/40 border border-yellow-500/20 p-1 rounded-lg">
                              <div className="text-slate-400 text-[9px]">Oro</div>
                              <div className="font-bold text-yellow-400 text-xs">{msg.tacticalCard.villagers.gold ?? 0}</div>
                            </div>
                            <div className="bg-slate-800/40 border border-slate-700/20 p-1 rounded-lg">
                              <div className="text-slate-400 text-[9px]">Pietra</div>
                              <div className="font-bold text-slate-300 text-xs">{msg.tacticalCard.villagers.stone ?? 0}</div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Pro Tip */}
                      {msg.tacticalCard.proTip && (
                        <div className="bg-amber-500/10 border-l-2 border-amber-500 p-2 rounded-r-lg text-[11px] text-amber-200 flex items-start gap-1.5">
                          <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                          <span><strong>Tip Pro:</strong> {msg.tacticalCard.proTip}</span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className={`text-[9px] mt-1 text-right ${msg.sender === 'user' ? 'text-amber-300/60' : 'text-slate-500'}`}>
                    {msg.timestamp}
                  </div>
                </div>

                {msg.sender === 'user' && (
                  <div className="w-7 h-7 rounded-lg bg-amber-500 text-slate-950 font-bold flex items-center justify-center shrink-0 mt-0.5 text-xs">
                    U
                  </div>
                )}
              </div>
            ))}

            {/* Quick Prompts Pills (Shown when conversation is short) */}
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
                      className="w-full text-left bg-slate-900/80 hover:bg-amber-950/40 hover:border-amber-500/40 border border-slate-800 text-[11px] text-slate-300 p-2 rounded-xl transition flex items-center justify-between group"
                    >
                      <span className="truncate pr-2">{promptText}</span>
                      <Sparkles className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-400 shrink-0 transition" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Loading Indicator */}
            {loading && (
              <div className="flex items-center space-x-2.5">
                <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-amber-400 animate-pulse" />
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-2xl rounded-tl-none p-3 text-slate-400 text-xs flex items-center space-x-2">
                  <div className="flex space-x-1">
                    <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                    <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                    <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce"></span>
                  </div>
                  <span>Coach Beasty sta elaborando la tattica...</span>
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
                placeholder="Chiedi a Coach Beasty AI..."
                disabled={loading}
                className="flex-1 bg-slate-900 border border-slate-700/80 focus:border-amber-500/60 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none transition"
              />
              <button
                type="submit"
                disabled={loading || !inputMessage.trim()}
                className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-bold p-2.5 rounded-xl text-xs flex items-center justify-center transition shadow-md shadow-amber-500/20"
                title="Invia messaggio"
              >
                <Send className="w-4 h-4 text-slate-950" />
              </button>
            </form>
          </div>

        </div>
      )}

      {/* Floating Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="group relative flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700 text-slate-950 shadow-xl shadow-amber-500/20 border-2 border-amber-400 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer"
        title="Coach Beasty AI - Assistente AoE IV"
      >
        <div className="relative">
          {isOpen ? (
            <X className="w-6 h-6 text-slate-950 stroke-[2.5]" />
          ) : (
            <>
              <Bot className="w-7 h-7 text-slate-950 stroke-[2.2] group-hover:rotate-12 transition-transform duration-300" />
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-300 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-400"></span>
              </span>
            </>
          )}
        </div>
      </button>

    </div>
  );
};
