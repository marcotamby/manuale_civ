import { useState, useEffect } from 'react';
import { Search, X, Play, Loader2, CheckCircle2 } from 'lucide-react';
import { fetchRecentVideos } from '../services/YouTubeService';
import type { YouTubeVideo } from '../services/YouTubeService';

interface YouTubePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (videoIds: string[]) => void;
  selectedIds: string[];
}

export function YouTubePickerModal({ isOpen, onClose, onSelect, selectedIds }: YouTubePickerModalProps) {
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [pendingSelection, setPendingSelection] = useState<string[]>(selectedIds);

  const loadVideos = async () => {
    setLoading(true);
    const data = await fetchRecentVideos();
    setVideos(data);
    setLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      loadVideos();
      setPendingSelection(selectedIds);
    }
  }, [isOpen, selectedIds]);

  const handleToggleVideo = (id: string) => {
    setPendingSelection(prev => 
      prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id]
    );
  };

  const handleConfirm = () => {
    onSelect(pendingSelection);
    onClose();
  };

  if (!isOpen) return null;

  const filteredVideos = videos.filter(v => 
    v.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[60] p-4 backdrop-blur-md">
      <div className="bg-[#0f1115] border border-red-500/30 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-[0_0_50px_rgba(239,68,68,0.3)]">
        
        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-red-500/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center shadow-lg shadow-red-600/20">
              <Play size={20} fill="white" className="text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Sfoglia Canale YouTube</h3>
              <p className="text-xs text-gray-400">Archivio video di @marcotamby_aoe ({videos.length} video trovati)</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors p-2 bg-white/5 rounded-lg">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 border-b border-white/10 bg-black/20 flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text"
              placeholder="Cerca tra tutti i video del canale..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white focus:border-red-500/50 outline-none transition-all"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400 gap-4">
              <Loader2 size={40} className="animate-spin text-red-500" />
              <p>Caricamento archivio video...</p>
            </div>
          ) : filteredVideos.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredVideos.map(video => {
                const isSelected = pendingSelection.includes(video.id);
                return (
                  <div 
                    key={video.id}
                    onClick={() => handleToggleVideo(video.id)}
                    className={`group cursor-pointer rounded-xl overflow-hidden border transition-all duration-300 transform hover:-translate-y-1 ${
                      isSelected 
                        ? 'border-red-500 ring-2 ring-red-500/20 bg-red-500/5' 
                        : 'border-white/5 bg-white/5 hover:border-white/20 hover:bg-white/10'
                    }`}
                  >
                    <div className="relative aspect-video">
                      <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <Play size={32} fill="white" className="text-white" />
                      </div>
                      {isSelected && (
                        <div className="absolute top-2 right-2 bg-red-600 text-white p-1 rounded-full shadow-lg">
                          <CheckCircle2 size={16} />
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="text-sm font-medium text-gray-200 line-clamp-2 leading-tight group-hover:text-white transition-colors">
                        {video.title}
                      </p>
                      <p className="text-[10px] text-gray-500 mt-2 font-mono">{video.id}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-20 text-gray-500">
              <p>Nessun video trovato con questo nome nell'archivio.</p>
            </div>
          )}
        </div>

        <div className="p-4 sm:p-6 bg-black/40 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4 shadow-[0_-10px_20px_rgba(0,0,0,0.5)]">
          <div className="text-sm text-gray-400 w-full text-center md:text-left">
            <span className="text-red-500 font-bold">{pendingSelection.length}</span> video selezionati
          </div>
          <div className="flex flex-col sm:flex-row w-full md:w-auto gap-3">
            <button 
              onClick={onClose}
              className="w-full sm:w-1/3 md:w-auto px-6 py-3 md:py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-all whitespace-nowrap"
            >
              Annulla
            </button>
            <button 
              onClick={handleConfirm}
              className="w-full sm:w-2/3 md:w-auto justify-center px-8 py-3 md:py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-red-600/30 transition-all active:scale-95 whitespace-nowrap"
            >
              <CheckCircle2 size={18} className="shrink-0" />
              <span>Conferma Selezione</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
