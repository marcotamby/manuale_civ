import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Swords, Users, Shield, ArrowRight, Loader2, Eye } from 'lucide-react';
import { draftService } from '../services/draftService';
import type { DraftPreset, TurnPlayer } from '../services/draftService';

type UserRole = 'HOST' | 'GUEST' | 'SPECTATOR';

export function DraftPresetPage() {
  const { presetId } = useParams<{ presetId: string }>();
  const navigate = useNavigate();

  const [preset, setPreset] = useState<DraftPreset | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole>('HOST');
  const [playerName, setPlayerName] = useState('Giocatore 1');

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
      const roleForRoom: TurnPlayer = selectedRole === 'GUEST' ? 'GUEST' : 'HOST';
      const room = await draftService.createRoom(preset, playerName, roleForRoom);
      sessionStorage.setItem(`draft_role_${room.id}`, selectedRole);
      navigate(`/draft/room/${room.id}`);
    } catch (err) {
      console.error('Error creating draft room:', err);
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center text-slate-300 gap-3 font-sans">
        <Loader2 className="animate-spin text-cyan-400" size={36} />
        <p className="font-semibold text-lg">Caricamento preset del draft...</p>
      </div>
    );
  }

  if (!preset) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center text-center p-6 font-sans">
        <h2 className="text-2xl font-bold text-red-400 mb-2">Preset Non Trovato</h2>
        <p className="text-slate-400 mb-6">Il preset richiesto non esiste o è stato rimosso.</p>
        <button
          onClick={() => navigate('/')}
          className="px-6 py-2 bg-slate-200 text-black font-bold rounded-xl"
        >
          Torna alla Home
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-[85vh] max-w-4xl mx-auto px-4 py-8 flex flex-col items-center justify-center font-sans">
      
      {/* Clean Frameless Layout - No Outer Background Boxes! */}
      <div className="w-full space-y-8 p-2 sm:p-4">
        
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-[#0b101e] border border-slate-700/80 rounded-full text-slate-200 text-xs font-bold uppercase tracking-widest shadow-md">
            <Swords size={14} className="text-cyan-400" /> Captain's Mode Draft
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
            {preset.title}
          </h1>
          {preset.description && (
            <p className="text-slate-400 text-sm max-w-xl mx-auto">
              {preset.description}
            </p>
          )}
        </div>

        {/* Clean Info Row (No Dark Background Box) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-center py-4 border-y border-slate-800/80">
          <div className="p-2">
            <span className="block text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Formato</span>
            <span className="text-base font-extrabold text-slate-200">
              {preset.scope === 'civs' ? '⚔️ Solo Civiltà' : preset.scope === 'maps' ? '🗺️ Solo Mappe' : '⚔️🗺️ Civs & Mappe'}
            </span>
          </div>
          <div className="p-2">
            <span className="block text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Turni Totali</span>
            <span className="text-base font-extrabold text-cyan-400">
              {preset.turns?.length || 0} Step
            </span>
          </div>
          <div className="p-2 col-span-2 sm:col-span-1">
            <span className="block text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Timer per Turno</span>
            <span className="text-base font-extrabold text-slate-200">
              30 Secondi
            </span>
          </div>
        </div>

        {/* Role Selection (Clean Floating Card Buttons) */}
        <div className="space-y-4 pt-2">
          <h3 className="text-xs font-extrabold text-slate-300 uppercase tracking-widest flex items-center gap-2">
            <Users size={16} className="text-cyan-400" /> 1. Scegli il tuo Ruolo
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <button
              type="button"
              onClick={() => {
                setSelectedRole('HOST');
                if (playerName === 'Giocatore 2') setPlayerName('Giocatore 1');
              }}
              className={`p-5 rounded-2xl border flex flex-col items-center justify-center gap-2.5 transition-all duration-300 ${
                selectedRole === 'HOST'
                  ? 'bg-red-950/40 border-red-500 text-white ring-2 ring-red-500/50 shadow-lg shadow-red-950/30'
                  : 'bg-slate-900/40 border-slate-800/80 text-slate-400 hover:border-slate-700 hover:text-white'
              }`}
            >
              <Shield size={26} className={selectedRole === 'HOST' ? 'text-red-400' : 'text-slate-500'} />
              <span className="font-extrabold text-sm tracking-wide">🔴 Host (Giocatore 1)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setSelectedRole('GUEST');
                if (playerName === 'Giocatore 1') setPlayerName('Giocatore 2');
              }}
              className={`p-5 rounded-2xl border flex flex-col items-center justify-center gap-2.5 transition-all duration-300 ${
                selectedRole === 'GUEST'
                  ? 'bg-blue-950/40 border-blue-500 text-white ring-2 ring-blue-500/50 shadow-lg shadow-blue-950/30'
                  : 'bg-slate-900/40 border-slate-800/80 text-slate-400 hover:border-slate-700 hover:text-white'
              }`}
            >
              <Shield size={26} className={selectedRole === 'GUEST' ? 'text-blue-400' : 'text-slate-500'} />
              <span className="font-extrabold text-sm tracking-wide">🔵 Guest (Giocatore 2)</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedRole('SPECTATOR')}
              className={`p-5 rounded-2xl border flex flex-col items-center justify-center gap-2.5 transition-all duration-300 ${
                selectedRole === 'SPECTATOR'
                  ? 'bg-purple-950/40 border-purple-500 text-white ring-2 ring-purple-500/50 shadow-lg shadow-purple-950/30'
                  : 'bg-slate-900/40 border-slate-800/80 text-slate-400 hover:border-slate-700 hover:text-white'
              }`}
            >
              <Eye size={26} className={selectedRole === 'SPECTATOR' ? 'text-purple-400' : 'text-slate-500'} />
              <span className="font-extrabold text-sm tracking-wide">👁️ Spettatore / Streamer</span>
            </button>
          </div>
        </div>

        {/* Player Name Input (Clean Input without Outer Box) */}
        {selectedRole !== 'SPECTATOR' && (
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-extrabold text-slate-300 uppercase tracking-widest flex items-center gap-2">
              <Swords size={16} className="text-cyan-400" /> 2. Inserisci il TUO Nome
            </h3>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                Il tuo Nickname in-game
              </label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Es. Player 1"
                className="w-full bg-[#0b101e] border border-slate-700/80 rounded-2xl px-5 py-3.5 text-white font-extrabold text-base focus:border-cyan-400 focus:outline-none shadow-md transition-all"
              />
            </div>
          </div>
        )}

        {/* Action Button */}
        <div className="pt-6 text-center">
          <button
            onClick={handleStartDraft}
            disabled={creating}
            className="w-full sm:w-auto px-10 py-4 bg-gradient-to-r from-slate-200 via-slate-100 to-slate-300 hover:from-white hover:to-slate-200 text-black font-extrabold text-lg rounded-2xl shadow-[0_0_30px_rgba(255,255,255,0.2)] transition-all flex items-center justify-center gap-3 mx-auto disabled:opacity-50"
          >
            {creating ? (
              <>
                <Loader2 className="animate-spin text-black" size={24} />
                <span>Generazione Stanza...</span>
              </>
            ) : (
              <>
                <Swords size={24} />
                <span>CREA E ENTRA IN STANZA DRAFT</span>
                <ArrowRight size={20} />
              </>
            )}
          </button>

          <p className="text-xs text-slate-400 mt-4">
            Verrà creata la stanza con il link unico da condividere con l'avversario.
          </p>
        </div>

      </div>
    </div>
  );
}
