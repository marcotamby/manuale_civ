import { useState, useEffect } from 'react';
import { X, ExternalLink, Copy, Check, Clock, Monitor, ShieldCheck, Info } from 'lucide-react';
import { Toast } from './Toast';
import type { ToastType } from './Toast';

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
  const [toast, setToast] = useState<{ isVisible: boolean; message: string; type: ToastType }>({
    isVisible: false,
    message: '',
    type: 'success'
  });

  const overlays: OverlayItem[] = [
    {
      id: 'clock',
      name: 'Clock & Status',
      description: 'Un elegante orologio con indicatore LIVE per le tue stream.',
      path: '/overlays/clock/index.html',
      icon: Clock
    }
    // Nuovi overlay possono essere aggiunti qui
  ];

  useEffect(() => {
    if (isOpen && overlays.length > 0 && !selectedOverlay) {
      setSelectedOverlay(overlays[0]);
    }
  }, [isOpen]);

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
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-2xl font-bold text-white mb-1">{selectedOverlay.name}</h3>
                    <p className="text-sm text-gray-400">{selectedOverlay.description}</p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => copyToClipboard(selectedOverlay.path)}
                      className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-black font-bold rounded-xl hover:bg-yellow-400 transition-all text-xs uppercase"
                    >
                      <Copy size={16} /> Copia URL per OBS
                    </button>
                    <a
                      href={selectedOverlay.path}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 bg-white/10 text-white font-bold rounded-xl hover:bg-white/20 transition-all text-xs uppercase border border-white/10"
                    >
                      <ExternalLink size={16} /> Apri in un'altra scheda
                    </a>
                  </div>
                </div>

                <div className="flex-1 bg-[#1a1c32] rounded-3xl border border-white/5 overflow-hidden shadow-inner relative group">
                  <div className="absolute top-4 left-4 z-10 px-3 py-1 bg-black/60 backdrop-blur-md rounded-full border border-white/10 text-[10px] font-bold text-gray-400 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                    ANTEPRIMA LIVE
                  </div>
                  <iframe
                    src={selectedOverlay.path}
                    className="w-full h-full border-none pointer-events-none"
                    title="Overlay Preview"
                  />
                  <div className="absolute inset-0 bg-transparent group-hover:bg-black/5 transition-colors"></div>
                </div>

                <div className="mt-4 flex items-center gap-2 text-[10px] text-gray-500 font-mono italic">
                  <span>URL sorgente:</span>
                  <span className="text-yellow-500/70">{window.location.origin}{selectedOverlay.path}</span>
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
