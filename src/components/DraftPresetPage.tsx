import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Sparkles, Swords, Users, ArrowRight, Loader2 } from 'lucide-react';
import { draftService } from '../services/draftService';
import type { DraftPreset } from '../services/draftService';
import { Toast } from './Toast';

export function DraftPresetPage() {
  const { presetId } = useParams<{ presetId: string }>();
  const navigate = useNavigate();

  const [preset, setPreset] = useState<DraftPreset | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [hostName, setHostName] = useState('Giocatore 1');
  const [guestName, setGuestName] = useState('Giocatore 2');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (presetId) {
      loadPreset(presetId);
    }
  }, [presetId]);

  const loadPreset = async (id: string) => {
    setLoading(true);
    try {
      const data = await draftService.getPresetById(id);
      if (data) {
        setPreset(data);
      } else {
        // Fallback default preset if id not found
        setPreset({
          id: id,
          title: 'Draft Match BO3',
          description: 'Captain\'s Mode Draft per Age of Empires IV',
          scope: 'civs',
          is_active: true,
          turns: [
            { step: 1, player: 'HOST', action: 'BAN', target: 'CIV', amount: 1, timeLimit: 30 },
            { step: 2, player: 'GUEST', action: 'BAN', target: 'CIV', amount: 1, timeLimit: 30 },
            { step: 3, player: 'HOST', action: 'PICK', target: 'CIV', amount: 1, timeLimit: 30 },
            { step: 4, player: 'GUEST', action: 'PICK', target: 'CIV', amount: 1, timeLimit: 30 },
            { step: 5, player: 'GUEST', action: 'PICK', target: 'CIV', amount: 1, timeLimit: 30 },
            { step: 6, player: 'HOST', action: 'PICK', target: 'CIV', amount: 1, timeLimit: 30 },
          ]
        });
      }
    } catch (err) {
      console.error('Error loading preset:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartDraft = async () => {
    if (!preset) return;
    setCreating(true);
    try {
      const room = await draftService.createRoom(preset, hostName, guestName);
      navigate(`/draft/room/${room.id}`);
    } catch (err) {
      console.error('Error creating draft room:', err);
      setToastMessage('Errore nella creazione della stanza draft.');
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center text-gray-300 gap-3">
        <Loader2 className="animate-spin text-yellow-500" size={36} />
        <p className="font-semibold text-lg">Caricamento preset del draft...</p>
      </div>
    );
  }

  if (!preset) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center text-center p-6">
        <h2 className="text-2xl font-bold text-red-400 mb-2">Preset Non Trovato</h2>
        <p className="text-gray-400 mb-6">Il preset richiesto non esiste o è stato rimosso.</p>
        <button
          onClick={() => navigate('/')}
          className="px-6 py-2 bg-yellow-500 text-black font-bold rounded-xl"
        >
          Torna alla Home
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-[85vh] max-w-4xl mx-auto px-4 py-10 flex flex-col items-center justify-center">
      {toastMessage && (
        <Toast
          message={toastMessage}
          type="error"
          isVisible={!!toastMessage}
          onClose={() => setToastMessage(null)}
        />
      )}

      {/* Card Wrapper */}
      <div className="w-full bg-gray-900/90 border border-yellow-500/30 rounded-3xl p-6 sm:p-10 shadow-[0_0_50px_rgba(0,0,0,0.8)] backdrop-blur-2xl space-y-8">
        
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-yellow-500/10 border border-yellow-500/30 rounded-full text-yellow-400 text-xs font-bold uppercase tracking-widest">
            <Sparkles size={14} /> Captain's Mode Draft
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            {preset.title}
          </h1>
          {preset.description && (
            <p className="text-gray-400 text-sm max-w-xl mx-auto">
              {preset.description}
            </p>
          )}
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-black/40 p-4 rounded-2xl border border-white/5 text-center">
          <div className="p-3">
            <span className="block text-[10px] text-gray-400 font-bold uppercase">Formato</span>
            <span className="text-base font-extrabold text-yellow-400">
              {preset.scope === 'civs' ? '⚔️ Solo Civiltà' : preset.scope === 'maps' ? '🗺️ Solo Mappe' : '⚔️🗺️ Civs & Mappe'}
            </span>
          </div>
          <div className="p-3">
            <span className="block text-[10px] text-gray-400 font-bold uppercase">Turni Totali</span>
            <span className="text-base font-extrabold text-white">
              {preset.turns?.length || 0} Step
            </span>
          </div>
          <div className="p-3 col-span-2 sm:col-span-1">
            <span className="block text-[10px] text-gray-400 font-bold uppercase">Timer per Turno</span>
            <span className="text-base font-extrabold text-emerald-400">
              30 Secondi
            </span>
          </div>
        </div>

        {/* Players Name Setup */}
        <div className="space-y-4 pt-2">
          <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2">
            <Users size={18} className="text-yellow-500" /> Nomi dei Partecipanti (Opzionale)
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-black/50 p-4 rounded-2xl border border-red-500/30 space-y-2">
              <label className="block text-xs font-bold text-red-400 uppercase tracking-wider">
                🔴 Host (Giocatore 1)
              </label>
              <input
                type="text"
                value={hostName}
                onChange={(e) => setHostName(e.target.value)}
                placeholder="Es. Player 1"
                className="w-full bg-black/70 border border-white/20 rounded-xl px-4 py-2.5 text-white font-bold text-sm focus:border-red-500 focus:outline-none"
              />
            </div>

            <div className="bg-black/50 p-4 rounded-2xl border border-blue-500/30 space-y-2">
              <label className="block text-xs font-bold text-blue-400 uppercase tracking-wider">
                🔵 Guest (Giocatore 2)
              </label>
              <input
                type="text"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="Es. Player 2"
                className="w-full bg-black/70 border border-white/20 rounded-xl px-4 py-2.5 text-white font-bold text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-4 text-center">
          <button
            onClick={handleStartDraft}
            disabled={creating}
            className="w-full sm:w-auto px-10 py-4 bg-gradient-to-r from-yellow-500 via-amber-400 to-yellow-500 hover:from-yellow-400 hover:to-yellow-400 text-black font-extrabold text-lg rounded-2xl shadow-[0_0_30px_rgba(212,175,55,0.4)] hover:shadow-[0_0_40px_rgba(212,175,55,0.6)] transition-all flex items-center justify-center gap-3 mx-auto disabled:opacity-50"
          >
            {creating ? (
              <>
                <Loader2 className="animate-spin" size={24} />
                <span>Generazione Stanza...</span>
              </>
            ) : (
              <>
                <Swords size={24} />
                <span>AVVIA STANZA DRAFT MATCH</span>
                <ArrowRight size={20} />
              </>
            )}
          </button>

          <p className="text-xs text-gray-400 mt-4">
            Dopo aver cliccato, verrà creata la stanza con link unico da condividere con l'avversario e con lo streamer.
          </p>
        </div>

      </div>
    </div>
  );
}
