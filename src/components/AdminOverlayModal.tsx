import { useState, useEffect, useRef } from 'react';
import { X, ExternalLink, Copy, Monitor, ShieldCheck, Info, Trophy, Settings, ChevronLeft, Pencil, Check, Image as ImageIcon, Upload } from 'lucide-react';
import { AoE4MatchDashboard } from './AoE4MatchDashboard';
import { TournamentOverlayDashboard } from './TournamentOverlayDashboard';
import { Toast } from './Toast';
import type { ToastType } from './Toast';
import { overlayService } from '../services/overlayService';

interface OverlayItem {
  id: string;
  name: string;
  description: string;
  path: string;
  icon: any;
}

interface AdminOverlayModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AdminOverlayModal({ isOpen, onClose }: AdminOverlayModalProps) {
  const [selectedOverlay, setSelectedOverlay] = useState<OverlayItem | null>(null);
  const [activeTab, setActiveTab] = useState<'preview' | 'dashboard'>('preview');
  const [previewScale, setPreviewScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const [toast, setToast] = useState<{ isVisible: boolean; message: string; type: ToastType }>({
    isVisible: false,
    message: '',
    type: 'success'
  });
  
  const [overlayNames, setOverlayNames] = useState<Record<string, string>>({});
  const [overlayIcons, setOverlayIcons] = useState<Record<string, string>>({});
  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState<string>('');
  const [isSavingName, setIsSavingName] = useState(false);
  const editNameInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const overlays: OverlayItem[] = [
    {
      id: 'aoe4-match',
      name: 'AoE4 Match 3V3',
      description: 'Overlay professionale per Match 3V3 con mappe, casters e timer.',
      path: '/overlays/match-aoe4/index.html',
      icon: Trophy
    },
    {
      id: 'tournament-1v1-bracket',
      name: 'Torneo 1V1 (Tabellone)',
      description: 'Overlay 1V1 con tabellone progressivo a 8 partecipanti.',
      path: '/overlays/tournament-1v1-bracket/index.html',
      icon: Trophy
    }
  ];

  useEffect(() => {
    if (isOpen) {
      overlays.forEach(ov => {
        overlayService.getOverlayName(ov.id).then(name => {
          if (name) setOverlayNames(prev => ({ ...prev, [ov.id]: name }));
        });
        overlayService.getOverlayIcon(ov.id).then(icon => {
          if (icon) setOverlayIcons(prev => ({ ...prev, [ov.id]: icon }));
        });
      });
    }
  }, [isOpen]);

  const overlayDisplayName = (selectedOverlay && overlayNames[selectedOverlay.id]) || selectedOverlay?.name || '';
  const overlayDisplayIcon = (selectedOverlay && overlayIcons[selectedOverlay.id]) || '';

  useEffect(() => {
    if (activeTab !== 'preview') return;
    const updateScale = () => {
      const container = containerRef.current;
      if (container) {
        const { width, height } = container.getBoundingClientRect();
        const scale = Math.min(width / 1920, height / 1080);
        setPreviewScale(scale);
      }
    };
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [activeTab, isOpen, selectedOverlay]);

  useEffect(() => {
    if (isOpen && overlays.length > 0 && !selectedOverlay) {
      setSelectedOverlay(overlays[0]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isEditingName && editNameInputRef.current) {
      editNameInputRef.current.focus();
      editNameInputRef.current.select();
    }
  }, [isEditingName]);

  const handleSaveName = async () => {
    if (!selectedOverlay || !editNameValue.trim()) return;
    setIsSavingName(true);
    try {
      await overlayService.updateOverlayName(selectedOverlay.id, editNameValue.trim());
      setOverlayNames(prev => ({ ...prev, [selectedOverlay.id]: editNameValue.trim() }));
      setIsEditingName(false);
      setToast({ isVisible: true, message: 'Nome aggiornato! ✏️', type: 'success' });
    } catch {
      setToast({ isVisible: true, message: 'Errore nel salvataggio del nome.', type: 'error' });
    } finally {
      setIsSavingName(false);
    }
  };

  const handleIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedOverlay) return;
    
    if (file.size > 200 * 1024) {
      setToast({ isVisible: true, message: 'Immagine troppo grande (max 200KB)', type: 'error' });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      try {
        await overlayService.updateOverlayIcon(selectedOverlay.id, base64);
        setOverlayIcons(prev => ({ ...prev, [selectedOverlay.id]: base64 }));
        setToast({ isVisible: true, message: 'Icona aggiornata! 🖼️', type: 'success' });
      } catch {
        setToast({ isVisible: true, message: 'Errore caricamento icona.', type: 'error' });
      }
    };
    reader.readAsDataURL(file);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-in fade-in duration-300">
      <div className="bg-[#0f1423] border border-[#D4AF37]/30 rounded-3xl w-full max-w-[95vw] h-[90vh] flex flex-col shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden relative">
        <div className="flex items-center justify-between px-8 py-6 bg-black/40 border-b border-white/5 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-[#D4AF37]/10 rounded-2xl border border-[#D4AF37]/30 shadow-lg shadow-[#D4AF37]/5">
              <Monitor className="text-[#D4AF37]" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-white uppercase tracking-wider">Gestione Overlay Stream</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <ShieldCheck size={14} className="text-green-500" />
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Accesso Admin Riservato</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-gray-500 hover:text-white transition-all"><X size={24} /></button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="w-[380px] border-r border-white/5 bg-black/20 flex flex-col overflow-y-auto custom-scrollbar p-6 space-y-6">
            <h4 className="text-[11px] font-black text-gray-500 uppercase tracking-[0.3em] px-2">Overlay Disponibili</h4>
            <div className="space-y-4">
              {overlays.map((ov) => {
                const isSelected = selectedOverlay?.id === ov.id;
                const displayName = overlayNames[ov.id] || ov.name;
                const displayIcon = overlayIcons[ov.id] || '';
                
                return (
                  <button
                    key={ov.id}
                    onClick={() => setSelectedOverlay(ov)}
                    className={`w-full group p-5 rounded-2xl border transition-all text-left relative flex items-center gap-4 ${
                      isSelected 
                        ? 'bg-gradient-to-br from-[#D4AF37]/20 to-black border-[#D4AF37]/50 shadow-xl' 
                        : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center border shrink-0 overflow-hidden ${
                      isSelected ? 'bg-[#D4AF37]/20 border-[#D4AF37]/30' : 'bg-white/5 border-white/10'
                    }`}>
                      {displayIcon ? (
                        <img src={displayIcon} className="w-full h-full object-cover" />
                      ) : (
                        <ov.icon className={isSelected ? 'text-[#D4AF37]' : 'text-gray-500'} size={20} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-black text-sm text-white uppercase tracking-wider truncate">{displayName}</div>
                      <div className="text-[10px] text-gray-500 mt-1 line-clamp-1 group-hover:text-gray-400 transition-colors font-medium">{ov.description}</div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-auto p-6 bg-blue-500/5 rounded-3xl border border-blue-500/20 space-y-4">
              <div className="flex items-center gap-3 text-blue-400">
                <Info size={18} />
                <span className="font-black text-xs uppercase tracking-widest">Come usarli</span>
              </div>
              <p className="text-[11px] text-gray-400 leading-relaxed font-medium">
                Copia l'URL e incollalo in una <span className="text-white font-bold">Sorgente Browser</span> su OBS Studio o Streamlabs. Imposta la risoluzione desiderata (es. 1920x1080).
              </p>
            </div>
          </div>

          <div className="flex-1 bg-black/40 flex flex-col overflow-hidden relative">
            {!selectedOverlay ? (
              <div className="flex-1 flex flex-col items-center justify-center space-y-4 text-gray-600">
                <Monitor size={64} className="opacity-20" />
                <p className="font-black text-sm uppercase tracking-widest">Seleziona un overlay per iniziare</p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="px-10 py-10 flex items-start justify-between bg-gradient-to-b from-black/60 to-transparent border-b border-white/5">
                  <div className="flex-1 min-w-0 pr-12">
                    <div className="flex items-center gap-6 group mb-3">
                      <div className="relative group/icon shrink-0">
                        <div className="w-16 h-16 bg-[#D4AF37]/10 rounded-2xl border border-[#D4AF37]/30 flex items-center justify-center overflow-hidden shadow-2xl transition-all group-hover/icon:border-[#D4AF37]/60">
                          {overlayDisplayIcon ? (
                            <img src={overlayDisplayIcon} className="w-full h-full object-cover" />
                          ) : (
                            <selectedOverlay.icon className="text-[#D4AF37]" size={32} />
                          )}
                        </div>
                        <button 
                          onClick={() => fileInputRef.current?.click()}
                          className="absolute -bottom-2 -right-2 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white border-2 border-[#0f1423] hover:bg-blue-500 transition-all shadow-lg scale-0 group-hover/icon:scale-100"
                        >
                          <Upload size={14} />
                        </button>
                        <input type="file" ref={fileInputRef} onChange={handleIconUpload} accept="image/*" className="hidden" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        {isEditingName ? (
                          <div className="flex items-center gap-3 animate-in fade-in slide-in-from-left-4 duration-200 w-full">
                            <input
                              ref={editNameInputRef}
                              type="text"
                              value={editNameValue}
                              onChange={(e) => setEditNameValue(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                              onBlur={handleCancelEditName}
                              className="bg-white/5 border border-blue-500/50 rounded-xl px-4 py-2 text-2xl font-black text-white uppercase tracking-tight focus:outline-none focus:ring-2 ring-blue-500/20 w-full max-w-xl"
                            />
                            <button onClick={handleSaveName} disabled={isSavingName} className="p-3 bg-green-600 text-white rounded-xl hover:bg-green-500 transition-all shadow-lg shadow-green-900/20">
                              {isSavingName ? <RefreshCcw size={20} className="animate-spin" /> : <Check size={20} />}
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-4 group/title max-w-full overflow-hidden">
                            <h3 className="text-3xl font-black text-white uppercase tracking-tight truncate flex-1 min-w-0 leading-tight">
                              {overlayDisplayName}
                            </h3>
                            <button onClick={handleStartEditName} className="p-2 rounded-lg hover:bg-white/10 text-gray-500 hover:text-yellow-400 transition-all shrink-0">
                              <Pencil size={18} />
                            </button>
                          </div>
                        )}
                        <p className="text-base text-gray-400 leading-snug mt-2 line-clamp-1">{selectedOverlay.description}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-3 shrink-0 pt-2">
                    <button
                      onClick={() => setActiveTab(activeTab === 'preview' ? 'dashboard' : 'preview')}
                      className={`flex items-center gap-2.5 px-6 py-3 font-black rounded-xl transition-all text-[11px] uppercase border shadow-xl whitespace-nowrap ${
                        activeTab === 'dashboard'
                          ? 'bg-indigo-600 text-white border-indigo-400 shadow-indigo-500/20'
                          : 'bg-indigo-500/10 text-indigo-300 border-indigo-500/50 hover:bg-indigo-500/20'
                      }`}
                    >
                      {activeTab === 'preview' ? <Settings size={18} /> : <ChevronLeft size={18} />}
                      {activeTab === 'preview' ? 'Configura' : 'Indietro'}
                    </button>
                    <button
                      onClick={() => copyToClipboard(selectedOverlay.path)}
                      className="flex items-center gap-2.5 px-6 py-3 bg-emerald-600 text-white font-black rounded-xl hover:bg-emerald-500 transition-all text-[11px] uppercase shadow-xl shadow-emerald-900/20 border border-emerald-400/30 whitespace-nowrap"
                    >
                      <Copy size={18} /> Copia URL
                    </button>
                    <a
                      href={selectedOverlay.path}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2.5 px-6 py-3 bg-sky-600 text-white font-black rounded-xl hover:bg-sky-500 transition-all text-[11px] uppercase border border-sky-400/30 shadow-xl shadow-sky-900/20 whitespace-nowrap"
                    >
                      <ExternalLink size={18} /> Apri Overlay
                    </a>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar">
                  {activeTab === 'preview' ? (
                    <div className="h-full flex flex-col p-8">
                      <div className="flex-1 bg-black rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl relative group min-h-[650px]">
                        <div className="absolute top-6 left-6 z-10 px-4 py-2 bg-black/60 backdrop-blur-md rounded-full border border-white/10 text-[11px] font-black text-gray-300 flex items-center gap-3">
                          <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></div>
                          ANTEPRIMA LIVE (1920x1080)
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center p-6">
                          <div className="w-full h-full relative" ref={containerRef}>
                            <iframe src={selectedOverlay.path} className="absolute top-0 left-0 border-none bg-transparent origin-top-left" style={{ width: '1920px', height: '1080px', transform: `scale(${previewScale})` }} title="Overlay Preview" />
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="h-full bg-black/20 p-8">
                      {selectedOverlay.id === 'aoe4-match' ? (
                        <AoE4MatchDashboard onError={(msg) => setToast({ isVisible: true, message: msg, type: 'error' })} />
                      ) : (
                        <TournamentOverlayDashboard onError={(msg) => setToast({ isVisible: true, message: msg, type: 'error' })} />
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <Toast isVisible={toast.isVisible} message={toast.message} type={toast.type} onClose={() => setToast({ ...toast, isVisible: false })} />
    </div>
  );
}

const RefreshCcw = ({ size, className }: { size: number; className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" /><path d="M16 16h5v5" /></svg>
);
