import { useState, useEffect, useRef } from 'react';
import { X, ExternalLink, Copy, Monitor, ShieldCheck, Info, Trophy, Settings, ChevronLeft, Pencil, Check } from 'lucide-react';
import { AoE4MatchDashboard } from './AoE4MatchDashboard';
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
  // Inline name editing
  const [overlayDisplayName, setOverlayDisplayName] = useState<string>('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState<string>('');
  const [isSavingName, setIsSavingName] = useState(false);
  const editNameInputRef = useRef<HTMLInputElement>(null);

  const overlays: OverlayItem[] = [
    {
      id: 'aoe4-match',
      name: 'AoE4 Match 3V3',
      description: 'Overlay professionale per Match 3V3 con mappe, casters e timer.',
      path: '/overlays/match-aoe4/index.html',
      icon: Trophy
    }
  ];

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

  // Load display name from DB whenever the selected overlay changes
  useEffect(() => {
    if (!selectedOverlay) return;
    setOverlayDisplayName(selectedOverlay.name); // fallback
    overlayService.getOverlayName(selectedOverlay.id).then(name => {
      if (name) setOverlayDisplayName(name);
    });
  }, [selectedOverlay]);

  // Auto-focus when entering edit mode
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
      setOverlayDisplayName(editNameValue.trim());
      setIsEditingName(false);
      setToast({ isVisible: true, message: 'Nome aggiornato con successo! ✏️', type: 'success' });
    } catch {
      setToast({ isVisible: true, message: 'Errore nel salvataggio del nome.', type: 'error' });
    } finally {
      setIsSavingName(false);
    }
  };

  const handleStartEditName = () => {
    setEditNameValue(overlayDisplayName);
    setIsEditingName(true);
  };

  const handleCancelEditName = () => {
    setIsEditingName(false);
    setEditNameValue('');
  };

  useEffect(() => {
    setActiveTab('preview');
  }, [selectedOverlay]);

  const copyToClipboard = (path: string) => {
    const fullUrl = `${window.location.origin}${path}`;
    navigator.clipboard.writeText(fullUrl).then(() => {
      setToast({
        isVisible: true,
        message: 'URL copiato negli appunti! 📋',
        type: 'success'
      });
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-in fade-in duration-300">
      <div className="bg-[#0f1423] border border-[#D4AF37]/30 rounded-3xl w-full max-w-6xl h-[85vh] flex flex-col shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden relative">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#D4AF37]/20 bg-gradient-to-r from-[#0d1424] to-[#1a1c32] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center text-yellow-500">
              <Monitor size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white uppercase tracking-wider">Gestione Overlay Stream</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <ShieldCheck size={12} className="text-green-500" />
                <span className="text-[10px] text-gray-400 uppercase font-black tracking-widest">Accesso Admin Riservato</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
          >
            <X size={28} />
          </button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar - List of Overlays */}
          <div className="w-80 border-r border-white/5 bg-black/20 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-4 px-2">Overlay Disponibili</h3>
            {overlays.map((overlay) => (
              <button
                key={overlay.id}
                onClick={() => setSelectedOverlay(overlay)}
                className={`w-full flex items-start gap-4 p-4 rounded-2xl transition-all border ${
                  selectedOverlay?.id === overlay.id
                    ? 'bg-yellow-500/10 border-yellow-500/50 shadow-lg shadow-yellow-500/5'
                    : 'bg-white/5 border-transparent hover:bg-white/10'
                }`}
              >
                <div className={`p-2 rounded-lg ${selectedOverlay?.id === overlay.id ? 'text-yellow-500 bg-yellow-500/20' : 'text-gray-400 bg-black/40'}`}>
                  <overlay.icon size={20} />
                </div>
                <div className="text-left">
                  <div className={`font-bold text-sm ${selectedOverlay?.id === overlay.id ? 'text-white' : 'text-gray-300'}`}>{overlay.name}</div>
                  <div className="text-[10px] text-gray-500 line-clamp-1 mt-1">{overlay.description}</div>
                </div>
              </button>
            ))}

            <div className="mt-8 p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl">
              <div className="flex items-center gap-2 text-blue-400 mb-2">
                <Info size={16} />
                <span className="text-xs font-bold uppercase">Come usarli</span>
              </div>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                Copia l'URL e incollalo in una <strong>Sorgente Browser</strong> su OBS Studio o Streamlabs. Imposta la risoluzione desiderata (es. 1920x1080).
              </p>
            </div>
          </div>

          {/* Main Content - Preview & Details */}
          <div className="flex-1 flex flex-col bg-black/40 p-6 overflow-hidden">
            {selectedOverlay ? (
              <>
                <div className="flex items-start justify-between mb-6">
                  <div className="max-w-[280px]">
                    {/* Editable Name */}
                    {isEditingName ? (
                      <div className="flex items-center gap-2 mb-1">
                        <input
                          ref={editNameInputRef}
                          value={editNameValue}
                          onChange={e => setEditNameValue(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') handleCancelEditName(); }}
                          className="bg-white/10 border border-yellow-500/50 rounded-lg px-3 py-1.5 text-white text-lg font-bold focus:outline-none focus:border-yellow-400 w-full"
                          placeholder="Nome overlay..."
                          disabled={isSavingName}
                        />
                        <button
                          onClick={handleSaveName}
                          disabled={isSavingName}
                          title="Salva"
                          className="p-2 rounded-lg bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/30 transition-colors shrink-0"
                        >
                          {isSavingName ? <span className="text-xs">...</span> : <Check size={16} />}
                        </button>
                        <button
                          onClick={handleCancelEditName}
                          title="Annulla"
                          className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 border border-white/10 transition-colors shrink-0"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-2xl font-bold text-white">{overlayDisplayName}</h3>
                        <button
                          onClick={handleStartEditName}
                          title="Modifica nome"
                          className="p-1.5 rounded-lg hover:bg-white/10 text-gray-500 hover:text-yellow-400 transition-all"
                        >
                          <Pencil size={14} />
                        </button>
                      </div>
                    )}
                    <p className="text-sm text-gray-400 leading-snug">{selectedOverlay.description}</p>
                  </div>
                  <div className="flex gap-2 shrink-0 pt-1">
                    <button
                      onClick={() => setActiveTab(activeTab === 'preview' ? 'dashboard' : 'preview')}
                      className={`flex items-center gap-2 px-3 py-1.5 font-black rounded-lg transition-all text-[10px] uppercase border shadow-lg whitespace-nowrap lg:px-4 ${
                        activeTab === 'dashboard'
                          ? 'bg-indigo-600 text-white border-indigo-400 shadow-indigo-500/20'
                          : 'bg-indigo-500/10 text-indigo-300 border-indigo-500/50 hover:bg-indigo-500/20'
                      }`}
                    >
                      {activeTab === 'preview' ? <Settings size={14} /> : <ChevronLeft size={14} />}
                      {activeTab === 'preview' ? 'Configura' : 'Indietro'}
                    </button>
                    <button
                      onClick={() => copyToClipboard(selectedOverlay.path)}
                      className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 text-white font-black rounded-lg hover:bg-emerald-500 transition-all text-[10px] uppercase shadow-lg shadow-emerald-900/20 border border-emerald-400/30 whitespace-nowrap lg:px-4"
                    >
                      <Copy size={14} /> Copia URL
                    </button>
                    <a
                      href={selectedOverlay.path}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-3 py-1.5 bg-sky-600 text-white font-black rounded-lg hover:bg-sky-500 transition-all text-[10px] uppercase border border-sky-400/30 shadow-lg shadow-sky-900/20 whitespace-nowrap lg:px-4"
                    >
                      <ExternalLink size={14} /> Apri Overlay
                    </a>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar">
                  {activeTab === 'preview' ? (
                    <div className="h-full flex flex-col p-4">
                      <div className="flex-1 bg-black rounded-3xl border border-white/5 overflow-hidden shadow-2xl relative group min-h-[400px]">
                        <div className="absolute top-4 left-4 z-10 px-3 py-1 bg-black/60 backdrop-blur-md rounded-full border border-white/10 text-[10px] font-bold text-gray-400 flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                          ANTEPRIMA LIVE (1920x1080)
                        </div>
                        
                        {/* Scaling Iframe Container */}
                        <div className="absolute inset-0 flex items-center justify-center p-4">
                          <div className="w-full h-full relative" ref={containerRef}>
                            <iframe
                              src={selectedOverlay.path}
                              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 border-none pointer-events-none"
                              style={{
                                width: '1920px',
                                height: '1080px',
                                transform: `scale(${previewScale})`,
                                transformOrigin: 'center center'
                              }}
                              title="Overlay Preview"
                            />
                          </div>
                        </div>
                        <div className="absolute inset-0 bg-transparent group-hover:bg-black/5 transition-colors pointer-events-none"></div>
                      </div>

                      <div className="mt-4 flex items-center gap-2 text-[10px] text-gray-500 font-mono italic">
                        <span>URL sorgente:</span>
                        <span className="text-yellow-500/70">{window.location.origin}{selectedOverlay.path}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="animate-in slide-in-from-bottom-4 fade-in duration-500">
                      {selectedOverlay.id === 'aoe4-match' ? (
                        <AoE4MatchDashboard 
                          onError={(msg) => setToast({ isVisible: true, message: msg, type: 'error' })}
                        />
                      ) : (
                        <div className="p-12 text-center text-gray-500 bg-white/5 rounded-3xl border border-dashed border-white/10">
                          Configurazione rapida non ancora disponibile per questo overlay.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center opacity-40">
                <Monitor size={64} className="mb-4" />
                <p>Seleziona un overlay per visualizzare l'anteprima.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <Toast
        isVisible={toast.isVisible}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ ...toast, isVisible: false })}
      />
    </div>
  );
}
