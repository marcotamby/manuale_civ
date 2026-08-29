import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { X, Send, Sparkles, RotateCcw, ChevronRight, Swords, Copy, Check } from 'lucide-react';

interface Message {
  id: string;
  sender: 'user' | 'coach';
  text: string;
  tacticalCard?: {
    title?: string;
    age?: string;
    counterUnits?: Array<{ name: string; icon?: string; role?: string }>;
    villi?: { food?: number; wood?: number; gold?: number; stone?: number };
    proTip?: string;
  } | null;
  timestamp: string;
}

interface FunnelOption {
  label: string;
  prompt: string;
}

interface FunnelCategory {
  id: string;
  label: string;
  icon: string;
  description: string;
  options: FunnelOption[];
}

const FUNNEL_CATEGORIES: FunnelCategory[] = [
  {
    id: 'aggressive',
    label: 'Strategie Aggressive',
    icon: '💥',
    description: 'Fast Feudal, Rush, All-In, Tower Rush',
    options: [
      { label: '🔥 Come fare un Feudal All-In efficace?', prompt: 'Qual è la migliore strategia per un Feudal All-In aggressivo in AoE4?' },
      { label: '🏹 Come eseguire la Tower Rush con i Mongoli?', prompt: 'Spiegami passo-passo come fare una Tower Rush efficace con i Mongoli.' },
      { label: '🛡️ Come difendersi da un Rush Feudale precoce?', prompt: 'Quali sono i consigli chiave per difendersi da un aggressione Feudale nei primi minuti?' }
    ]
  },
  {
    id: 'boom',
    label: 'Strategia Boom & Economia',
    icon: '🏰',
    description: '2 TC, Fast Castle, Boom Economico',
    options: [
      { label: '💎 Quando conviene fare il secondo Centro Città (2 TC)?', prompt: 'In quali matchup conviene passare a 2 TC e a quale minutaggio ideale?' },
      { label: '👑 Come eseguire una Fast Castle in sicurezza?', prompt: 'Quali sono le civiltà migliori per la Fast Castle e come difendersi durante il passaggio di età?' },
      { label: '📈 Come gestire l\'economia in Età Imperiale (Post-Boom)?', prompt: 'Come ripartire i villi in Età IV per sostenere l\'esercito ed il riaddestramento rapido?' }
    ]
  },
  {
    id: 'matchups',
    label: 'Guida ai Matchup & Civiltà',
    icon: '🛡️',
    description: 'Consigli contro civiltà specifiche e percentuali reali',
    options: [
      { label: '🇫🇷 Come giocare Inglesi contro Francesi?', prompt: 'Qual è la guida tattica e il win rate per Inglesi contro Francesi?' },
      { label: '🇩🇪 Come contrastare il Sacro Romano Impero (SRI)?', prompt: 'Come impedire al Sacro Romano Impero di raccogliere tutte le reliquie in Fast Castle?' },
      { label: '🇨🇳 Dinastia Jin vs Mongoli a livello Conqueror?', prompt: 'Chi vince a livello Conqueror tra Dinastia Jin e Mongoli e quali sono i win rate del sito?' }
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
      { label: '🐎 Quando produrre la Cavalleria Leggera?', prompt: 'In quali situazioni la Cavalleria Leggera è la scelta migliore?' }
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
  const navigate = useNavigate();
  const { user } = useAuth();
  const userNickname = user?.nickname || user?.name || '';
  const displayName = userNickname || 'utente';

  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const [isOpen, setIsOpen] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedFunnelCategory, setSelectedFunnelCategory] = useState<FunnelCategory | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);

  // Draggable position state for trigger button
  const [btnPos, setBtnPos] = useState<{ x: number; y: number } | null>(null);
  const isDraggingBtnRef = useRef(false);
  const dragBtnStartRef = useRef({ startX: 0, startY: 0, initX: 0, initY: 0 });
  const hasBtnMovedRef = useRef(false);

  // Draggable position state for chat modal drawer
  const [modalPos, setModalPos] = useState<{ x: number; y: number } | null>(null);
  const isDraggingModalRef = useRef(false);
  const dragModalStartRef = useRef({ startX: 0, startY: 0, initX: 0, initY: 0 });

  useEffect(() => {
    setMessages([
      {
        id: 'welcome',
        sender: 'coach',
        text: displayName !== 'utente' 
          ? `Ciao **${displayName}**! 👋 Sono **Coach Beasty AI**.\n\nChiedimi consigli su matchup, win rate reali, contromisure delle unità, posizionamento o distribuzione dei villi!`
          : `Ciao! 👋 Sono **Coach Beasty AI**.\n\nChiedimi consigli su matchup, win rate reali, contromisure delle unità, posizionamento o distribuzione dei villi!`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  }, [displayName]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  };

  const scrollToTop = () => {
    const applyScrollTop = () => {
      if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTop = 0;
      }
    };
    applyScrollTop();
    requestAnimationFrame(applyScrollTop);
    setTimeout(applyScrollTop, 40);
    setTimeout(applyScrollTop, 120);
  };

  useEffect(() => {
    if (isOpen) {
      scrollToTop();
    }
  }, [isOpen]);

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
      const historyPayload = messages.slice(-2).map(m => ({
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

      let data: any = {};
      const rawText = await res.text();
      try {
        data = JSON.parse(rawText);
      } catch (parseErr) {
        if (!res.ok) {
          throw new Error('Il server del Coach è momentaneamente occupato. Riprova tra poco!');
        } else {
          throw new Error('Risposta non valida ricevuta dal server.');
        }
      }

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
      let errorMsgText = (err.message || 'Impossibile connettersi al Coach').trim();
      if (errorMsgText.startsWith('⚠️')) {
        errorMsgText = errorMsgText.substring(2).trim();
      }
      if (errorMsgText.startsWith('Si è verificato un errore:')) {
        errorMsgText = errorMsgText.replace('Si è verificato un errore:', '').trim();
      }
      errorMsgText = errorMsgText.replace(/\.?\s*Riprova tra poco!?/gi, '').trim();

      const cleanError = `⚠️ Si è verificato un errore: ${errorMsgText}. Riprova tra poco!`;

      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'coach',
        text: cleanError,
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
        text: displayName !== 'utente'
          ? `Chat azzerata! 🔄 Come posso aiutarti ora nelle tue battaglie, **${displayName}**?`
          : `Chat azzerata! 🔄 Come posso aiutarti ora nelle tue battaglie?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
    setSelectedFunnelCategory(null);
  };

  const [hasActiveBanner, setHasActiveBanner] = useState(false);

  useEffect(() => {
    const checkBanner = () => {
      const bannerEl = document.querySelector('[class*="from-cyan-950"]');
      setHasActiveBanner(!!bannerEl);
    };

    checkBanner();
    const interval = setInterval(checkBanner, 500);
    return () => clearInterval(interval);
  }, [isOpen]);

  const isModalManuallyMovedRef = useRef(false);

  const calcModalPosFromBtn = (bX: number, bY: number) => {
    const modalWidth = Math.min(440, window.innerWidth * 0.94);
    const modalHeight = Math.min(580, window.innerHeight - 80);

    let mX = bX > window.innerWidth / 2 
      ? bX - modalWidth + 56 
      : bX;

    mX = Math.max(10, Math.min(window.innerWidth - modalWidth - 10, mX));

    let mY = bY > window.innerHeight / 2
      ? bY - modalHeight - 10
      : bY + 64;

    mY = Math.max(hasActiveBanner ? 112 : 50, Math.min(window.innerHeight - modalHeight - 10, mY));

    return { x: mX, y: mY };
  };

  // --- Trigger Button Drag Handlers ---
  const handleBtnPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    isDraggingBtnRef.current = true;
    hasBtnMovedRef.current = false;

    const defaultX = window.innerWidth - 76;
    const defaultY = window.innerHeight - 96;
    const initX = btnPos ? btnPos.x : defaultX;
    const initY = btnPos ? btnPos.y : defaultY;

    dragBtnStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initX,
      initY
    };

    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch (err) {}
  };

  const handleBtnPointerMove = (e: React.PointerEvent) => {
    if (!isDraggingBtnRef.current) return;
    const deltaX = e.clientX - dragBtnStartRef.current.startX;
    const deltaY = e.clientY - dragBtnStartRef.current.startY;

    if (Math.abs(deltaX) > 4 || Math.abs(deltaY) > 4) {
      hasBtnMovedRef.current = true;
    }

    const newX = Math.max(10, Math.min(window.innerWidth - 66, dragBtnStartRef.current.initX + deltaX));
    const newY = Math.max(10, Math.min(window.innerHeight - 66, dragBtnStartRef.current.initY + deltaY));

    setBtnPos({ x: newX, y: newY });

    if (!isModalManuallyMovedRef.current) {
      setModalPos(calcModalPosFromBtn(newX, newY));
    }
  };

  const handleBtnPointerUp = (e: React.PointerEvent) => {
    if (!isDraggingBtnRef.current) return;
    isDraggingBtnRef.current = false;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch (err) {}

    if (!hasBtnMovedRef.current) {
      setIsOpen(prev => {
        const nextOpen = !prev;
        if (nextOpen && btnPos && !isModalManuallyMovedRef.current) {
          setModalPos(calcModalPosFromBtn(btnPos.x, btnPos.y));
        }
        return nextOpen;
      });
    }
  };

  const handleCloseModal = (e: React.SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Reset button and modal position back to default initial bottom-right position
    setBtnPos(null);
    setModalPos(null);
    isModalManuallyMovedRef.current = false;

    setIsOpen(false);
  };

  // --- Modal Header Drag Handlers ---
  const handleHeaderPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    if ((e.target as HTMLElement).closest('button')) return;

    isDraggingModalRef.current = true;

    const modalWidth = Math.min(440, window.innerWidth * 0.94);
    const defaultX = btnPos ? calcModalPosFromBtn(btnPos.x, btnPos.y).x : Math.max(10, window.innerWidth - modalWidth - 24);
    const defaultY = btnPos ? calcModalPosFromBtn(btnPos.x, btnPos.y).y : (hasActiveBanner ? 112 : 70);

    const initX = modalPos ? modalPos.x : defaultX;
    const initY = modalPos ? modalPos.y : defaultY;

    dragModalStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initX,
      initY
    };

    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch (err) {}
  };

  const handleHeaderPointerMove = (e: React.PointerEvent) => {
    if (!isDraggingModalRef.current) return;
    const deltaX = e.clientX - dragModalStartRef.current.startX;
    const deltaY = e.clientY - dragModalStartRef.current.startY;

    const modalWidth = Math.min(440, window.innerWidth * 0.94);
    const newX = Math.max(10, Math.min(window.innerWidth - modalWidth - 10, dragModalStartRef.current.initX + deltaX));
    const newY = Math.max(10, Math.min(window.innerHeight - 180, dragModalStartRef.current.initY + deltaY));

    isModalManuallyMovedRef.current = true;
    setModalPos({ x: newX, y: newY });
  };

  const handleHeaderPointerUp = (e: React.PointerEvent) => {
    if (!isDraggingModalRef.current) return;
    isDraggingModalRef.current = false;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch (err) {}
  };

  const renderFormattedText = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, lIdx) => {
      // Regex matches both [markdown link](url) and **bold**
      const tokenRegex = /(\[[^\]]+\]\([^\s)]+\)|\*\*.*?\*\*)/g;
      const parts = line.split(tokenRegex);

      return (
        <React.Fragment key={lIdx}>
          {parts.map((part, pIdx) => {
            if (!part) return null;

            // Check if it's a markdown link [Label](url)
            const linkMatch = part.match(/^\[([^\]]+)\]\(([^\s)]+)\)$/);
            if (linkMatch) {
              const [, label, url] = linkMatch;
              const isInternal = url.startsWith('/');
              return (
                <a
                  key={pIdx}
                  href={url}
                  onClick={(e) => {
                    if (isInternal) {
                      e.preventDefault();
                      navigate(url);
                    }
                  }}
                  target={isInternal ? undefined : "_blank"}
                  rel={isInternal ? undefined : "noopener noreferrer"}
                  className="inline-flex items-center gap-1 font-bold text-cyan-300 hover:text-cyan-100 bg-cyan-950/60 hover:bg-cyan-900/80 px-2 py-0.5 rounded-md text-[13px] my-0.5 mx-0.5 border border-cyan-500/40 hover:border-cyan-400 cursor-pointer shadow-sm transition-all hover:scale-[1.02] active:scale-95 select-none"
                  title={`Apri ${label} sul sito`}
                >
                  <span>{label}</span>
                  <span className="text-[10px] text-cyan-400 font-normal opacity-80">↗</span>
                </a>
              );
            }

            // Check if it's **bold**
            if (part.startsWith('**') && part.endsWith('**')) {
              const cleanBold = part.slice(2, -2);
              const isUserNick = displayName !== 'utente' && cleanBold.toLowerCase() === displayName.toLowerCase();
              return (
                <strong 
                  key={pIdx} 
                  className={isUserNick ? "font-bold text-cyan-300 drop-shadow-[0_0_8px_rgba(6,182,212,0.4)]" : "font-bold text-slate-100"}
                >
                  {cleanBold}
                </strong>
              );
            }

            return part;
          })}
          {lIdx < lines.length - 1 && <br />}
        </React.Fragment>
      );
    });
  };

  return (
    <>
      {/* Drawer Dialog Modal - Cyan / Silver / Electric Blue Theme */}
      {isOpen && (
        <div 
          style={modalPos ? { left: `${modalPos.x}px`, top: `${modalPos.y}px` } : undefined}
          className={modalPos 
            ? "fixed w-[94vw] sm:w-[440px] h-[580px] max-h-[calc(100vh-5rem)] bg-[#0a0c10]/95 backdrop-blur-xl border border-cyan-500/30 rounded-2xl shadow-2xl shadow-black/90 flex flex-col overflow-hidden animate-in fade-in duration-200 z-[9999] font-sans pointer-events-auto"
            : `fixed ${hasActiveBanner ? 'top-28 sm:top-28' : 'top-16 sm:top-20'} bottom-20 sm:bottom-24 right-4 sm:right-6 w-[94vw] sm:w-[440px] max-h-[580px] bg-[#0a0c10]/95 backdrop-blur-xl border border-cyan-500/30 rounded-2xl shadow-2xl shadow-black/90 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200 z-[9999] font-sans pointer-events-auto`
          }
        >
          
          {/* Header - DragHandle */}
          <div 
            onPointerDown={handleHeaderPointerDown}
            onPointerMove={handleHeaderPointerMove}
            onPointerUp={handleHeaderPointerUp}
            className="bg-gradient-to-r from-slate-900 via-slate-900 to-blue-950/80 p-3.5 border-b border-cyan-500/20 flex items-center justify-between shrink-0 relative z-10 cursor-grab active:cursor-grabbing select-none"
            title="Trascina per spostare la chat"
          >
            <div className="flex items-center space-x-3 pointer-events-none">
              <div className="relative">
                <img 
                  src="/beasty_avatar.jpg" 
                  alt="Coach Beasty AI" 
                  className="w-9 h-9 rounded-xl object-cover border border-cyan-500/40 shadow-md"
                />
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
                </span>
              </div>
              <div>
                <h3 className="font-bold text-cyan-400 text-base tracking-wide flex items-center gap-1.5">
                  Coach Beasty AI
                </h3>
              </div>
            </div>

            <div className="flex items-center space-x-1 relative z-30 pointer-events-auto">
              <button 
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleResetChat();
                }} 
                onPointerDown={(e) => e.stopPropagation()}
                className="text-slate-400 hover:text-cyan-300 p-2 rounded-lg hover:bg-slate-800/80 transition cursor-pointer"
                title="Azzera conversazione"
              >
                <RotateCcw className="w-4.5 h-4.5 pointer-events-none" />
              </button>
              <button 
                type="button"
                onClick={handleCloseModal} 
                onPointerDown={handleCloseModal}
                onTouchEnd={handleCloseModal}
                className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800/80 transition cursor-pointer relative z-50"
                title="Chiudi widget"
              >
                <X className="w-5 h-5 pointer-events-none" />
              </button>
            </div>
          </div>

          {/* Messages Area - Full Selectable Text */}
          <div ref={messagesContainerRef} className="flex-1 min-h-0 overflow-y-auto p-3.5 space-y-4 elegant-scrollbar bg-slate-950/80 select-text">
            {messages.map((msg) => (
              <div 
                key={msg.id} 
                className={`flex gap-3 ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {msg.sender === 'coach' ? (
                  <img 
                    src="/beasty_avatar.jpg" 
                    alt="Beasty" 
                    className="w-7 h-7 rounded-lg object-cover border border-cyan-500/40 shrink-0 mt-0.5"
                  />
                ) : (
                  user?.avatar_url ? (
                    <img 
                      src={user.avatar_url} 
                      alt={displayName} 
                      className="w-7 h-7 rounded-lg object-cover border border-cyan-500/40 shrink-0 mt-0.5"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-lg bg-blue-600/80 border border-cyan-400/30 flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5">
                      {displayName !== 'utente' ? displayName.charAt(0).toUpperCase() : 'U'}
                    </div>
                  )
                )}

                <div className={`max-w-[85%] rounded-2xl p-3 text-sm leading-relaxed ${
                  msg.sender === 'user' 
                    ? 'bg-blue-600/90 text-white rounded-tr-none shadow-md shadow-blue-900/30 border border-blue-400/30' 
                    : 'bg-slate-900/95 text-slate-100 border border-slate-800 rounded-tl-none shadow-lg'
                }`}>
                  <div className="text-slate-100 space-y-1">
                    {renderFormattedText(msg.text)}
                  </div>

                  {msg.tacticalCard && (
                    <div className="mt-3 p-3 bg-slate-950/90 border border-cyan-500/30 rounded-xl space-y-2.5">
                      {msg.tacticalCard.title && (
                        <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                          <span className="font-bold text-cyan-400 text-xs uppercase tracking-wider flex items-center gap-1.5">
                            <Swords className="w-3.5 h-3.5" />
                            {msg.tacticalCard.title}
                          </span>
                          {msg.tacticalCard.age && (
                            <span className="text-[10px] bg-blue-950 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-full font-semibold">
                              {msg.tacticalCard.age}
                            </span>
                          )}
                        </div>
                      )}

                      {msg.tacticalCard.counterUnits && msg.tacticalCard.counterUnits.length > 0 && (
                        <div className="space-y-1">
                          <span className="text-[11px] font-semibold text-slate-400 block">Counter consigliati:</span>
                          <div className="grid grid-cols-1 gap-1">
                            {msg.tacticalCard.counterUnits.map((unit, idx) => (
                              <div key={idx} className="flex items-center justify-between text-xs bg-slate-900/80 px-2.5 py-1 rounded border border-slate-800">
                                <span className="font-medium text-slate-200 flex items-center gap-1.5">
                                  <span>{unit.icon || '⚔️'}</span>
                                  <span>{unit.name}</span>
                                </span>
                                {unit.role && <span className="text-[10px] text-slate-400">{unit.role}</span>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {msg.tacticalCard.villi && (
                        <div className="space-y-1">
                          <span className="text-[11px] font-semibold text-slate-400 block">Ripartizione Abitanti del Villaggio (Villi):</span>
                          <div className="grid grid-cols-4 gap-1 text-center">
                            <div className="bg-cyan-950/40 border border-cyan-500/30 rounded p-1">
                              <span className="block text-[10px] text-cyan-300 font-bold">🌾 Cibo</span>
                              <span className="text-xs font-black text-cyan-200">{msg.tacticalCard.villi.food || 0}</span>
                            </div>
                            <div className="bg-blue-950/40 border border-blue-500/30 rounded p-1">
                              <span className="block text-[10px] text-blue-300 font-bold">🪵 Legna</span>
                              <span className="text-xs font-black text-blue-200">{msg.tacticalCard.villi.wood || 0}</span>
                            </div>
                            <div className="bg-slate-900 border border-slate-700 rounded p-1">
                              <span className="block text-[10px] text-slate-300 font-bold">🪙 Oro</span>
                              <span className="text-xs font-black text-slate-200">{msg.tacticalCard.villi.gold || 0}</span>
                            </div>
                            <div className="bg-slate-800/60 border border-slate-600/30 rounded p-1">
                              <span className="block text-[10px] text-slate-300 font-bold">🪨 Pietra</span>
                              <span className="text-xs font-black text-slate-100">{msg.tacticalCard.villi.stone || 0}</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {msg.tacticalCard.proTip && (
                        <div className="bg-blue-950/40 border border-blue-500/20 p-2 rounded text-xs text-blue-200 flex items-start gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                          <span><strong>Pro Tip:</strong> {msg.tacticalCard.proTip}</span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-1 pt-1 border-t border-slate-800/40 text-[10px] select-none">
                    {msg.sender === 'coach' ? (
                      <button 
                        type="button"
                        onClick={() => handleCopyText(msg.id, msg.text)}
                        className="text-slate-400 hover:text-cyan-300 flex items-center gap-1 transition cursor-pointer"
                        title="Copia risposta"
                      >
                        {copiedId === msg.id ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-400 font-semibold">Copiato!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copia</span>
                          </>
                        )}
                      </button>
                    ) : <span />}
                    <span className="opacity-40 font-mono">{msg.timestamp}</span>
                  </div>
                </div>
              </div>
            ))}

            {/* Funnel Navigation - Seamless Cyan/Silver Theme */}
            {selectedFunnelCategory ? (
              <div className="pt-2 pb-1 space-y-2 animate-in fade-in duration-200">
                <div className="flex items-center justify-between border-b border-slate-800/60 pb-2 px-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm">{selectedFunnelCategory.icon}</span>
                    <span className="font-bold text-xs text-cyan-400 uppercase tracking-wider">{selectedFunnelCategory.label}</span>
                  </div>
                  <button 
                    onClick={() => setSelectedFunnelCategory(null)}
                    className="text-[11px] text-cyan-400 hover:text-cyan-300 font-semibold transition"
                  >
                    ← Torna al menu
                  </button>
                </div>
                <div className="space-y-1">
                  {selectedFunnelCategory.options.map((opt, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(opt.prompt)}
                      disabled={loading}
                      className="w-full text-left py-2 px-2.5 rounded-lg hover:bg-slate-900/80 text-xs text-slate-300 hover:text-white transition flex items-center justify-between group disabled:opacity-50 border-l-2 border-transparent hover:border-cyan-400"
                    >
                      <span className="font-medium">{opt.label}</span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-cyan-400 transition-transform group-hover:translate-x-0.5 shrink-0 ml-2" />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="pt-2 pb-1 space-y-2 animate-in fade-in duration-200">
                <div className="flex items-center space-x-2 pb-1.5 border-b border-slate-800/60 px-1">
                  <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest">Cosa stai cercando?</span>
                </div>
                <div className="space-y-1">
                  {FUNNEL_CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedFunnelCategory(cat)}
                      disabled={loading}
                      className="w-full text-left py-2 px-2.5 rounded-xl hover:bg-slate-900/90 transition flex items-center justify-between group disabled:opacity-50 border-l-2 border-transparent hover:border-cyan-400"
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <span className="text-base shrink-0">{cat.icon}</span>
                        <div className="truncate">
                          <div className="font-semibold text-xs text-slate-200 group-hover:text-cyan-300 transition-colors truncate">
                            {cat.label}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">
                            {cat.description}
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-cyan-400 transition-transform group-hover:translate-x-0.5 shrink-0 ml-2" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {loading && (
              <div className="flex items-end gap-2.5 my-2 animate-in fade-in duration-200">
                <img 
                  src="/beasty_avatar.jpg" 
                  alt="Coach Beasty AI" 
                  className="w-7 h-7 rounded-lg object-cover border border-cyan-500/30 shrink-0 mb-1" 
                />
                <div className="bg-slate-900/90 border border-cyan-500/30 rounded-2xl rounded-bl-xs px-4 py-3 text-slate-200 flex items-center gap-2.5 shadow-lg shadow-cyan-950/20">
                  <span className="text-xs text-cyan-300 font-medium">Coach Beasty sta scrivendo</span>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Footer */}
          <div className="p-3.5 bg-slate-900/95 border-t border-cyan-500/20 shrink-0">
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2.5"
            >
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder={displayName !== 'utente' ? `Chiedi a Coach Beasty, ${displayName}...` : 'Chiedi a Coach Beasty...'}
                disabled={loading}
                className="flex-1 bg-slate-950 border border-slate-700/80 focus:border-cyan-400 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-cyan-400/50 transition disabled:opacity-50 shadow-inner"
              />
              <button
                type="submit"
                disabled={!inputMessage.trim() || loading}
                className="bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 disabled:hover:bg-cyan-500 text-slate-950 p-3 rounded-xl transition shadow-md shadow-cyan-950 cursor-pointer shrink-0 font-bold flex items-center justify-center"
                title="Invia messaggio"
              >
                <Send className="w-5 h-5 text-slate-950 fill-slate-950" />
              </button>
            </form>
          </div>

        </div>
      )}

      {/* Floating Trigger Button - Hidden when modal is open */}
      {!isOpen && (
        <div 
          style={btnPos ? { left: `${btnPos.x}px`, top: `${btnPos.y}px` } : undefined}
          onPointerDown={handleBtnPointerDown}
          onPointerMove={handleBtnPointerMove}
          onPointerUp={handleBtnPointerUp}
          className={btnPos 
            ? "fixed z-[9990] font-sans select-none cursor-grab active:cursor-grabbing touch-none" 
            : "fixed bottom-20 right-4 sm:bottom-24 sm:right-6 z-[9990] font-sans select-none cursor-grab active:cursor-grabbing touch-none"
          }
          title="Trascina per spostare il bottone"
        >
          <button
            type="button"
            className="group relative flex items-center justify-center w-14 h-14 rounded-full bg-slate-900 border-2 border-cyan-400 shadow-xl shadow-cyan-500/20 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer overflow-hidden p-0.5 pointer-events-none"
          >
            <div className="relative w-full h-full flex items-center justify-center">
              <img 
                src="/beasty_avatar.jpg" 
                alt="Coach Beasty AI" 
                className="w-full h-full rounded-full object-cover group-hover:scale-110 transition-transform duration-300"
              />
              <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500 border border-slate-900"></span>
              </span>
            </div>
          </button>
        </div>
      )}
    </>
  );
};
