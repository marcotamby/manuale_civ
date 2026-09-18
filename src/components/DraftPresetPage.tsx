import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Swords, ArrowRight, Loader2, Shield } from 'lucide-react';
import { draftService, generateSessionToken } from '../services/draftService';
import type { DraftPreset } from '../services/draftService';
import { useAuth } from './AuthContext';

export function DraftPresetPage() {
  const { user } = useAuth();
  const { presetId } = useParams<{ presetId: string }>();
  const navigate = useNavigate();

  const [preset, setPreset] = useState<DraftPreset | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const [chosenRole, setChosenRole] = useState<'HOST' | 'GUEST'>('HOST');
  const [nickname, setNickname] = useState('');

  useEffect(() => {
    if (user?.nickname) {
      setNickname(user.nickname);
    } else if (user?.email) {
      setNickname(user.email.split('@')[0]);
    }
  }, [user]);

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
      const sessionToken = generateSessionToken();
      const finalName = nickname.trim() || user?.nickname?.trim() || (chosenRole === 'HOST' ? 'Host' : 'Guest');
      const room = await draftService.createRoom(preset, finalName, chosenRole, sessionToken);
      sessionStorage.setItem(`draft_session_token_${room.id}`, sessionToken);
      sessionStorage.setItem(`draft_role_${room.id}`, chosenRole);
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
              {preset.scope === 'civs' ? '⚔️ Civiltà' : '🗺️ Mappe'}
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

        {/* Role & Nickname Configuration */}
        <div className="max-w-md mx-auto bg-[#0b101e] border border-slate-700/80 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xl">
          <div className="text-center">
            <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">
              Configura il tuo Ingresso in Stanza
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Scegli come vuoi entrare; potrai condividere il link con l'avversario.
            </p>
          </div>

          <div className="space-y-1.5 text-left">
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
              Il tuo Ruolo iniziale
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setChosenRole('HOST')}
                className={`py-2.5 px-3 rounded-xl border text-xs font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  chosenRole === 'HOST'
                    ? 'bg-red-600/30 border-red-500 text-white ring-2 ring-red-500/50 shadow-md shadow-red-500/20'
                    : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white hover:border-slate-600'
                }`}
              >
                <Shield size={14} className={chosenRole === 'HOST' ? 'text-red-400' : 'text-slate-500'} />
                <span>🔴 Host (P1)</span>
              </button>
              <button
                type="button"
                onClick={() => setChosenRole('GUEST')}
                className={`py-2.5 px-3 rounded-xl border text-xs font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  chosenRole === 'GUEST'
                    ? 'bg-blue-600/30 border-blue-500 text-white ring-2 ring-blue-500/50 shadow-md shadow-blue-500/20'
                    : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white hover:border-slate-600'
                }`}
              >
                <Shield size={14} className={chosenRole === 'GUEST' ? 'text-blue-400' : 'text-slate-500'} />
                <span>🔵 Guest (P2)</span>
              </button>
            </div>
          </div>

          <div className="space-y-1.5 text-left">
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
              Il tuo Nickname in-game
            </label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Inserisci il tuo Nickname"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-white font-bold text-sm focus:border-cyan-400 focus:outline-none placeholder:text-slate-600"
            />
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-2 text-center">
          <button
            onClick={handleStartDraft}
            disabled={creating}
            className="w-full sm:w-auto px-10 py-4 bg-gradient-to-r from-slate-200 via-slate-100 to-slate-300 hover:from-white hover:to-slate-200 text-black font-extrabold text-lg rounded-2xl shadow-[0_0_30px_rgba(255,255,255,0.2)] transition-all flex items-center justify-center gap-3 mx-auto disabled:opacity-50 cursor-pointer"
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
