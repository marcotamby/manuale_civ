import React, { useState, useRef, useEffect } from 'react';
import { X, Send, RotateCcw, Shield, Swords, Zap, ChevronRight, ArrowLeft } from 'lucide-react';
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

interface FunnelCategory {
  id: string;
  label: string;
  icon: string;
  description: string;
  options: Array<{
    label: string;
    prompt: string;
  }>;
}

const FUNNEL_CATEGORIES: FunnelCategory[] = [
  {
    id: 'aggressive',
    label: 'Strategie Aggressive',
    icon: '💥',
    description: 'Fast Feudal, Rush, All-In, Tower Rush',
    options: [
      { label: '⚡ Come fare un Rush Feudale veloce ed efficace?', prompt: 'Come faccio un Rush Feudale aggressivo e veloce?' },
      { label: '🗼 Come si esegue o difende un Tower Rush?', prompt: 'Qual è la migliore tattica per un Tower Rush (attacco e difesa)?' },
      { label: '🏹 Strategia All-In con 1 Centro Città in Età II', prompt: 'Come si gioca una strategia All-In 1 TC in Feudale?' }
    ]
  },
  {
    id: 'boom',
    label: 'Strategia Boom & Economia',
    icon: '🏰',
    description: '2 TC, Fast Castle, Boom Economico',
    options: [
      { label: '🏗️ Quando conviene fare il 2° Centro Città (2 TC)?', prompt: 'Quando conviene costruire il 2° Centro Città (2 TC) e con quali civiltà?' },
      { label: '🏰 Come fare una Fast Castle sicura ed efficace?', prompt: 'Come si esegue una strategia Fast Castle (Età III veloce)?' },
      { label: '💰 Come gestire l\'economia in Età Imperiale?', prompt: 'Come ottimizzo la produzione di villi e risorse in Età IV?' }
    ]
  },
  {
    id: 'matchups',
    label: 'Guida ai Matchup & Civiltà',
    icon: '🛡️',
    description: 'Consigli contro civiltà specifiche',
    options: [
      { label: '🐎 Come contrasto la Cavalleria Francese?', prompt: 'Come contrasto i Cavalieri Reali Francesi in Età II?' },
      { label: '🏹 Come affrontare gli Inglesi e gli Arcieri Lunghi?', prompt: 'Come si batte la combinazione Arcieri Lunghi + Picchieri degli Inglesi?' },
      { label: '⛺ Come difendersi dagli attacchi rapidi dei Mongoli?', prompt: 'Come difendersi dai raid e dalla pressione iniziale dei Mongoli?' }
    ]
  },
  {
    id: 'counters',
    label: 'Counter Unità & Composizione',
    icon: '⚔️',
    description: 'Fanteria, Cavalleria, Arcieri, Assedio',
    options: [
      { label: '🗡️ Quali sono i counter principali per ogni unità?', prompt: 'Qual è la tabella completa delle contromisure delle unità in AoE4?' },
      { label: '🪵 Come contrastare le armi d\'assedio?', prompt: 'Qual è il modo migliore per distruggere Manganelli e Bombarde nemiche?' },
      { label: '🐎 Quando produrre la Cavalleria Leggera?', prompt: 'In quali situazioni la Cavalleria Leggera (Stradiotti/Cavalleria) è la scelta migliore?' }
    ]
  },
  {
    id: 'villi_bo',
    label: 'Distribuzione Villi & Build Orders',
    icon: '🌾',
    description: 'Cibo, Legna, Oro, Pietra passo-passo',
    options: [
      { label: '🌾 Qual è la distribuzione ideale dei villi ad inizio partita?', prompt: 'Qual è la ripartizione ideale dei villi per iniziare la partita (Cibo/Legna/Oro)?' },
      { label: '⏱️ Come seguire una Build Order senza perdere tempo?', prompt: 'Come si segue correttamente una Build Order passo-passo al minutaggio giusto?' },
      { label: '⛏️ Quando spostare i villi dalla legna all\'oro o alla pietra?', prompt: 'Quando devo spostare i villi dalla legna all\'oro o alla pietra nelle varie età?' }
    ]
  }
];

export const CoachBeastyWidget: React.FC = () => {
  const { user } = useAuth();
  const userNickname = user?.nickname || user?.name || '';
  const displayName = userNickname || 'nabbo';

  const [isOpen, setIsOpen] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedFunnelCategory, setSelectedFunnelCategory] = useState<FunnelCategory | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);

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
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToTop = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = 0;
    }
  };

  // Scroll to top when opening widget so initial welcome message is shown at top
  useEffect(() => {
    if (isOpen) {
      scrollToTop();
    }
  }, [isOpen]);

  // Scroll to bottom only when new messages are added during chat
  useEffect(() => {
    if (isOpen && (messages.length > 1 || loading)) {
      scrollToBottom();
    }
  }, [messages.length, loading]);

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
    setSelectedFunnelCategory(null);
  };

  return (
    <div className="fixed bottom-20 right-4 sm:bottom-24 sm:right-6 z-50 font-sans select-none">
      
      {/* Drawer Dialog Modal - Clamped between top-12 and bottom-20 to never overflow 13" laptop screens */}
      {isOpen && (
        <div className="fixed top-12 sm:top-16 bottom-20 sm:bottom-24 right-4 sm:right-6 w-[94vw] sm:w-[440px] max-h-[580px] bg-[#0a0c10]/95 backdrop-blur-xl border border-[#D4AF37]/30 rounded-2xl shadow-2xl shadow-black/90 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-blue-950/80 p-3.5 border-b border-[#D4AF37]/20 flex items-center justify-between shrink-0">
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
                <h3 className="font-bold text-[#D4AF37] text-base tracking-wide">
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
                <RotateCcw className="w-4.5 h-4.5" />
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

          {/* Messages Area - flex-1 min-h-0 ensures clean internal scrolling */}
          <div ref={messagesContainerRef} className="flex-1 min-h-0 overflow-y-auto p-3.5 space-y-4 elegant-scrollbar bg-slate-950/80">
            {messages.map((msg) => (
              <div 
                key={msg.id} 
                className={`flex items-start space-x-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.sender === 'coach' && (
                  <img 
                    src="/beasty_avatar.jpg" 
                    alt="Coach Beasty" 
                    className="w-8 h-8 rounded-lg object-cover border border-[#D4AF37]/40 shrink-0 mt-0.5" 
                  />
                )}

                <div className={`max-w-[86%] rounded-2xl p-3.5 shadow-md ${
                  msg.sender === 'user' 
                    ? 'bg-blue-600/25 border border-blue-500/40 text-blue-100 rounded-tr-none' 
                    : 'bg-slate-900/90 border border-slate-800 text-slate-200 rounded-tl-none space-y-3'
                }`}>
                  
                  {/* Message Text with Larger Font (text-sm / 14px) and formatted Markdown */}
                  <div className="whitespace-pre-wrap leading-relaxed text-sm sm:text-[15px] select-text">
                    {(() => {
                      const cleanedText = msg.text.replace(/^#+\s*/gm, '');
                      return cleanedText.split('\n\n').map((paragraph, pIdx) => {
                        const parts = paragraph.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
                        return (
                          <p key={pIdx} className={pIdx > 0 ? 'mt-2' : ''}>
                            {parts.map((part, idx) => {
                              if (part.startsWith('**') && part.endsWith('**')) {
                                const content = part.slice(2, -2);
                                const isUserMention = displayName && displayName !== 'nabbo' && content.toLowerCase().includes(displayName.toLowerCase());
                                return (
                                  <strong key={idx} className={`font-bold ${isUserMention ? 'text-cyan-300' : 'text-slate-100'}`}>
                                    {content}
                                  </strong>
                                );
                              }
                              if (part.startsWith('*') && part.endsWith('*')) {
                                return (
                                  <em key={idx} className="italic text-slate-200">
                                    {part.slice(1, -1)}
                                  </em>
                                );
                              }
                              return part;
                            })}
                          </p>
                        );
                      });
                    })()}
                  </div>

                  {/* Tactical Card Render */}
                  {msg.tacticalCard && (
                    <div className="bg-slate-950/90 border border-[#D4AF37]/30 rounded-xl p-3.5 space-y-3 mt-2">
                      {(msg.tacticalCard.title || msg.tacticalCard.age) && (
                        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                          <span className="font-bold text-[#D4AF37] text-sm flex items-center gap-1.5">
                            <Swords className="w-4 h-4 text-[#D4AF37]" />
                            {msg.tacticalCard.title || 'Scheda Tattica'}
                          </span>
                          {msg.tacticalCard.age && (
                            <span className="text-xs bg-blue-500/10 text-blue-300 px-2.5 py-0.5 rounded border border-blue-500/20 font-medium">
                              {msg.tacticalCard.age}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Counter Units Grid */}
                      {msg.tacticalCard.counterUnits && msg.tacticalCard.counterUnits.length > 0 && (
                        <div className="space-y-1.5">
                          <span className="text-xs text-slate-400 font-semibold flex items-center gap-1">
                            <Shield className="w-3.5 h-3.5 text-emerald-400" /> Unità Consigliate:
                          </span>
                          <div className="grid grid-cols-2 gap-2">
                            {msg.tacticalCard.counterUnits.map((u, i) => (
                              <div key={i} className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800 flex items-center space-x-2">
                                <span className="text-lg">{u.icon || '🛡️'}</span>
                                <div className="min-w-0 flex-1">
                                  <div className="font-semibold text-emerald-400 text-xs sm:text-sm truncate">{u.name}</div>
                                  <div className="text-[11px] text-slate-400 truncate">{u.role}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Villi Distribution */}
                      {(msg.tacticalCard.villi || msg.tacticalCard.villagers) && (
                        <div className="space-y-1.5">
                          <span className="text-xs text-slate-400 font-semibold">🌾 Villi consigliati:</span>
                          <div className="grid grid-cols-4 gap-1.5 text-center">
                            {(() => {
                              const v = msg.tacticalCard.villi || msg.tacticalCard.villagers || {};
                              return (
                                <>
                                  <div className="bg-amber-950/30 border border-amber-500/20 p-1.5 rounded-lg">
                                    <div className="text-slate-400 text-[10px]">Cibo</div>
                                    <div className="font-bold text-[#D4AF37] text-sm">{v.food ?? 0}</div>
                                  </div>
                                  <div className="bg-emerald-950/30 border border-emerald-500/20 p-1.5 rounded-lg">
                                    <div className="text-slate-400 text-[10px]">Legno</div>
                                    <div className="font-bold text-emerald-400 text-sm">{v.wood ?? 0}</div>
                                  </div>
                                  <div className="bg-yellow-950/30 border border-yellow-500/20 p-1.5 rounded-lg">
                                    <div className="text-slate-400 text-[10px]">Oro</div>
                                    <div className="font-bold text-yellow-400 text-sm">{v.gold ?? 0}</div>
                                  </div>
                                  <div className="bg-slate-800/40 border border-slate-700/20 p-1.5 rounded-lg">
                                    <div className="text-slate-400 text-[10px]">Pietra</div>
                                    <div className="font-bold text-slate-300 text-sm">{v.stone ?? 0}</div>
                                  </div>
                                </>
                              );
                            })()}
                          </div>
                        </div>
                      )}

                      {/* Pro Tip */}
                      {msg.tacticalCard.proTip && (
                        <div className="bg-blue-950/40 border-l-2 border-[#D4AF37] p-2.5 rounded-r-lg text-xs sm:text-sm text-slate-200 flex items-start gap-2">
                          <Zap className="w-4 h-4 text-[#D4AF37] shrink-0 mt-0.5" />
                          <span><strong>Tip Pro:</strong> {msg.tacticalCard.proTip}</span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className={`text-[10px] mt-1 text-right ${msg.sender === 'user' ? 'text-blue-300/60' : 'text-slate-500'}`}>
                    {msg.timestamp}
                  </div>
                </div>

                {msg.sender === 'user' && (
                  user?.avatar_url ? (
                    <img 
                      src={user.avatar_url} 
                      alt={displayName} 
                      className="w-8 h-8 rounded-lg object-cover border border-blue-400/50 shrink-0 mt-0.5 shadow-md" 
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-blue-600 text-white font-bold flex items-center justify-center shrink-0 mt-0.5 text-xs shadow-md">
                      {displayName.charAt(0).toUpperCase()}
                    </div>
                  )
                )}
              </div>
            ))}

            {/* INTERACTIVE FUNNEL SYSTEM */}
            {messages.length <= 2 && !loading && (
              <div className="pt-2 space-y-2 border-t border-slate-800/80">
                
                {/* Funnel Level 1: Main Category Selection */}
                {!selectedFunnelCategory ? (
                  <div className="space-y-2">
                    <span className="text-xs uppercase font-bold text-[#D4AF37] tracking-wider block">
                      Cosa stai cercando?
                    </span>
                    <div className="space-y-1.5">
                      {FUNNEL_CATEGORIES.map((cat) => (
                        <button
                          key={cat.id}
                          onClick={() => setSelectedFunnelCategory(cat)}
                          className="w-full text-left bg-slate-900/90 hover:bg-blue-950/40 hover:border-blue-500/50 border border-slate-800 p-2.5 rounded-xl transition flex items-center justify-between group"
                        >
                          <div className="flex items-center space-x-2.5 min-w-0">
                            <span className="text-lg">{cat.icon}</span>
                            <div className="min-w-0">
                              <div className="font-semibold text-slate-200 text-xs sm:text-sm group-hover:text-blue-300 transition">
                                {cat.label}
                              </div>
                              <div className="text-[11px] text-slate-400 truncate">
                                {cat.description}
                              </div>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-[#D4AF37] shrink-0 transition" />
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  /* Funnel Level 2: Options for selected category */
                  <div className="space-y-2 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-[#D4AF37] flex items-center gap-1.5">
                        <span>{selectedFunnelCategory.icon}</span>
                        <span>{selectedFunnelCategory.label}</span>
                      </span>
                      <button
                        onClick={() => setSelectedFunnelCategory(null)}
                        className="text-[11px] text-slate-400 hover:text-blue-400 flex items-center gap-1 hover:underline transition"
                      >
                        <ArrowLeft className="w-3 h-3" />
                        <span>Torna alle opzioni</span>
                      </button>
                    </div>

                    <div className="space-y-1.5">
                      {selectedFunnelCategory.options.map((opt, i) => (
                        <button
                          key={i}
                          onClick={() => handleSendMessage(opt.prompt)}
                          className="w-full text-left bg-slate-900/90 hover:bg-blue-950/40 hover:border-blue-500/40 border border-slate-800 text-xs sm:text-sm text-slate-200 p-2.5 rounded-xl transition flex items-center justify-between group"
                        >
                          <span className="pr-2 leading-snug">{opt.label}</span>
                          <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-[#D4AF37] shrink-0 transition" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            )}

            {/* Loading Indicator */}
            {loading && (
              <div className="flex items-center space-x-2.5">
                <img 
                  src="/beasty_avatar.jpg" 
                  alt="Coach Beasty" 
                  className="w-8 h-8 rounded-lg object-cover border border-[#D4AF37]/40 shrink-0 animate-pulse" 
                />
                <div className="bg-slate-900 border border-slate-800 rounded-2xl rounded-tl-none p-3 text-slate-300 text-xs sm:text-sm flex items-center space-x-2">
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
          <div className="p-3 bg-slate-950 border-t border-slate-800/80 shrink-0">
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
                className="flex-1 bg-slate-900 border border-slate-700/80 focus:border-blue-500/60 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none transition"
              />
              <button
                type="submit"
                disabled={loading || !inputMessage.trim()}
                className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold p-2.5 rounded-xl text-xs sm:text-sm flex items-center justify-center transition shadow-md shadow-blue-600/20"
                title="Invia messaggio"
              >
                <Send className="w-4 h-4 text-white" />
              </button>
            </form>
          </div>

        </div>
      )}

      {/* Floating Trigger Button */}
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
