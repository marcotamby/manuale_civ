import { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Save, 
  CheckCircle2, 
  Loader2, 
  Eye, 
  EyeOff, 
  Layers, 
  Sliders, 
  MapPin, 
  Copy,
  ExternalLink
} from 'lucide-react';
import { overlayService } from '../services/overlayService';
import type { OverlayState } from '../services/overlayService';

const OVERLAY_ID = 'in-game-brand';

interface InGameBrandDashboardProps {
  onError?: (msg: string) => void;
  onActivePathChange?: (path: string) => void;
}

const DEFAULT_STATE: OverlayState = {
  tournamentTitle: 'Ends of Summer Champions',
  stageSubtitle: 'QUALIFICAZIONI SVIZZERA',
  matchFormat: 'BO1',
  dayNumber: 1,
  dayText: 'Qualificazioni • Giornata 1/4',
  mapName: 'Dry Arabia',
  minimapBrandTitle: 'AOE ITALIA',
  minimapBrandSub: 'MASTERS',
  showTopBanner: true,
  showMinimapCrest: true,
  showMinimapInfo: true,
  theme: 'gold',
  topBannerOffsetY: 0,
  minimapCrestOffsetY: 0,
  minimapInfoOffsetY: 0
};

const COMMON_AOE4_MAPS = [
  'Dry Arabia',
  'Gorge',
  'Himeyama',
  'Golden Heights',
  'Lipany',
  'Rocky River',
  'Fortress',
  'Four Lakes',
  'Prairie',
  'Cliffside',
  'Glade',
  'Baltic'
];

export function InGameBrandDashboard({ onError, onActivePathChange }: InGameBrandDashboardProps) {
  const [state, setState] = useState<OverlayState>(DEFAULT_STATE);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    onActivePathChange?.('/overlays/in-game-brand/index.html');
  }, [onActivePathChange]);

  // Load state
  useEffect(() => {
    overlayService.getOverlayState(OVERLAY_ID)
      .then((saved) => {
        if (saved && Object.keys(saved).length > 0) {
          setState({ ...DEFAULT_STATE, ...saved });
        }
      })
      .catch((err) => {
        console.error('Errore caricamento in-game-brand state:', err);
        onError?.('Errore nel caricamento delle impostazioni in-game brand.');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [onError]);

  const handleSave = async (customState?: OverlayState) => {
    const toSave = customState || state;
    setIsSaving(true);
    try {
      await overlayService.updateOverlayState(OVERLAY_ID, toSave);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2500);
    } catch (err) {
      console.error('Errore salvataggio in-game-brand:', err);
      onError?.('Errore durante il salvataggio.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDayChange = (day: number) => {
    const newDayText = `Qualificazioni • Giornata ${day}/4`;
    const newState = {
      ...state,
      dayNumber: day,
      dayText: newDayText
    };
    setState(newState);
    handleSave(newState);
  };

  const handleMapSelect = (map: string) => {
    const newState = { ...state, mapName: map };
    setState(newState);
    handleSave(newState);
  };

  const copyLink = (path: string) => {
    const fullUrl = `${window.location.origin}${path}`;
    navigator.clipboard.writeText(fullUrl);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center p-12 text-slate-400">
        <Loader2 className="animate-spin mr-3 text-cyan-400" size={24} />
        Caricamento dashboard In-Game Brand...
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[#080d1a] text-white rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
      {/* Header Bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#060912]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border border-yellow-500/40 flex items-center justify-center text-yellow-400 shadow-lg shadow-yellow-500/10">
            <ShieldCheck size={22} />
          </div>
          <div>
            <h2 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
              In-Game Brand 1v1
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-400/30 text-cyan-300">
                Overlay OBS Trasparente
              </span>
            </h2>
            <p className="text-xs text-slate-400">Personalizza il logo AoEItalia, titolo torneo, minimappa e giornata di gioco in diretta.</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {showSuccess && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-xs font-bold animate-in fade-in">
              <CheckCircle2 size={15} /> Sincronizzato!
            </div>
          )}

          <button
            onClick={() => handleSave()}
            disabled={isSaving}
            className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-yellow-500 via-amber-500 to-orange-600 hover:from-yellow-400 hover:to-orange-500 text-black font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-yellow-500/20 active:scale-95 disabled:opacity-50"
          >
            {isSaving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            Salva Modifiche
          </button>
        </div>
      </div>

      {/* Main Form Content */}
      <div className="flex-1 p-6 overflow-y-auto custom-scrollbar space-y-6">
        
        {/* Row 1: Torneo, Fase, Giornata */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Titolo Torneo */}
          <div className="bg-black/40 border border-white/10 rounded-xl p-4 flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              Titolo Torneo
              <span className="text-[10px] text-yellow-400">In alto & Minimappa</span>
            </label>
            <input
              type="text"
              value={state.tournamentTitle || ''}
              onChange={(e) => setState({ ...state, tournamentTitle: e.target.value })}
              placeholder="Ends of Summer Champions"
              className="bg-[#0e1424] border border-white/10 focus:border-yellow-400/60 rounded-lg px-3 py-2 text-sm font-bold text-white focus:outline-none"
            />
          </div>

          {/* Sottotitolo / Fase */}
          <div className="bg-black/40 border border-white/10 rounded-xl p-4 flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              Sottotitolo / Fase
              <span className="text-[10px] text-cyan-300">Banner Alto</span>
            </label>
            <input
              type="text"
              value={state.stageSubtitle || ''}
              onChange={(e) => setState({ ...state, stageSubtitle: e.target.value })}
              placeholder="QUALIFICAZIONI SVIZZERA"
              className="bg-[#0e1424] border border-white/10 focus:border-cyan-400/60 rounded-lg px-3 py-2 text-sm font-bold text-white focus:outline-none"
            />
          </div>

          {/* Giornata & Formato */}
          <div className="bg-black/40 border border-white/10 rounded-xl p-4 flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              Giornata & Formato
              <span className="text-[10px] text-slate-400">Rapido</span>
            </label>
            <div className="flex gap-2">
              <select
                value={state.dayNumber || 1}
                onChange={(e) => handleDayChange(parseInt(e.target.value) || 1)}
                className="flex-1 bg-[#0e1424] border border-white/10 focus:border-cyan-400/60 rounded-lg px-3 py-2 text-sm font-bold text-cyan-300 focus:outline-none cursor-pointer"
              >
                <option value={1}>Giornata 1/4</option>
                <option value={2}>Giornata 2/4</option>
                <option value={3}>Giornata 3/4</option>
                <option value={4}>Giornata 4/4</option>
              </select>

              <select
                value={state.matchFormat || 'BO1'}
                onChange={(e) => setState({ ...state, matchFormat: e.target.value })}
                className="w-24 bg-[#0e1424] border border-white/10 focus:border-cyan-400/60 rounded-lg px-3 py-2 text-sm font-bold text-yellow-400 focus:outline-none cursor-pointer"
              >
                <option value="BO1">Bo1</option>
                <option value="BO3">Bo3</option>
                <option value="BO5">Bo5</option>
                <option value="FINAL">Finale</option>
              </select>
            </div>
          </div>

        </div>

        {/* Row 2: Mappa Corrente */}
        <div className="bg-black/40 border border-white/10 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <MapPin size={16} className="text-cyan-400" />
              Mappa Attuale in Partita
            </label>
            <input
              type="text"
              value={state.mapName || ''}
              onChange={(e) => setState({ ...state, mapName: e.target.value })}
              placeholder="Nome della Mappa..."
              className="bg-[#0e1424] border border-white/10 focus:border-cyan-400/60 rounded-lg px-3 py-1.5 text-xs font-bold text-white focus:outline-none w-56 text-right"
            />
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {COMMON_AOE4_MAPS.map((map) => (
              <button
                key={map}
                onClick={() => handleMapSelect(map)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                  state.mapName?.toLowerCase() === map.toLowerCase()
                    ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-md shadow-cyan-500/10'
                    : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10'
                }`}
              >
                {map}
              </button>
            ))}
          </div>
        </div>

        {/* Row 3: Visibilità Elementi Grafici (Toggles) */}
        <div className="bg-black/40 border border-white/10 rounded-xl p-5 space-y-4">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <Layers size={16} className="text-yellow-400" />
            Visibilità Elementi Overlay
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Banner Superiore */}
            <div 
              onClick={() => {
                const updated = { ...state, showTopBanner: state.showTopBanner === false ? true : false };
                setState(updated);
                handleSave(updated);
              }}
              className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${
                state.showTopBanner !== false 
                  ? 'bg-yellow-500/10 border-yellow-500/40 text-white' 
                  : 'bg-white/5 border-white/10 text-slate-500'
              }`}
            >
              <div>
                <div className="text-xs font-black uppercase">1. Banner Alto (Sotto HUD)</div>
                <div className="text-[11px] text-slate-400 mt-0.5">Logo AoEItalia + Titolo Torneo</div>
              </div>
              {state.showTopBanner !== false ? <Eye size={18} className="text-yellow-400" /> : <EyeOff size={18} />}
            </div>

            {/* Badge Minimappa */}
            <div 
              onClick={() => {
                const updated = { ...state, showMinimapCrest: state.showMinimapCrest === false ? true : false };
                setState(updated);
                handleSave(updated);
              }}
              className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${
                state.showMinimapCrest !== false 
                  ? 'bg-cyan-500/10 border-cyan-500/40 text-white' 
                  : 'bg-white/5 border-white/10 text-slate-500'
              }`}
            >
              <div>
                <div className="text-xs font-black uppercase">2. Crest Angolare Mappa</div>
                <div className="text-[11px] text-slate-400 mt-0.5">Logo AoEItalia + Badge Mappa</div>
              </div>
              {state.showMinimapCrest !== false ? <Eye size={18} className="text-cyan-400" /> : <EyeOff size={18} />}
            </div>

            {/* Info Mappa e Giornata */}
            <div 
              onClick={() => {
                const updated = { ...state, showMinimapInfo: state.showMinimapInfo === false ? true : false };
                setState(updated);
                handleSave(updated);
              }}
              className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${
                state.showMinimapInfo !== false 
                  ? 'bg-emerald-500/10 border-emerald-500/40 text-white' 
                  : 'bg-white/5 border-white/10 text-slate-500'
              }`}
            >
              <div>
                <div className="text-xs font-black uppercase">3. Testo Mappa & Giornata</div>
                <div className="text-[11px] text-slate-400 mt-0.5">In basso a destra sotto la mappa</div>
              </div>
              {state.showMinimapInfo !== false ? <Eye size={18} className="text-emerald-400" /> : <EyeOff size={18} />}
            </div>

          </div>
        </div>

        {/* Row 4: Regolazioni di Posizione / Offset (Fine Tuning) */}
        <div className="bg-black/40 border border-white/10 rounded-xl p-5 space-y-4">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <Sliders size={16} className="text-cyan-400" />
            Regolazione Fine Altezza (Offset Verticale Pixel)
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Offset Banner Superiore:</span>
                <span className="font-bold text-yellow-400">{state.topBannerOffsetY || 0}px</span>
              </div>
              <input
                type="range"
                min="-30"
                max="50"
                value={state.topBannerOffsetY || 0}
                onChange={(e) => setState({ ...state, topBannerOffsetY: parseInt(e.target.value) || 0 })}
                className="w-full accent-yellow-400"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Offset Crest Minimappa:</span>
                <span className="font-bold text-cyan-400">{state.minimapCrestOffsetY || 0}px</span>
              </div>
              <input
                type="range"
                min="-50"
                max="50"
                value={state.minimapCrestOffsetY || 0}
                onChange={(e) => setState({ ...state, minimapCrestOffsetY: parseInt(e.target.value) || 0 })}
                className="w-full accent-cyan-400"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Offset Info Basso Mappa:</span>
                <span className="font-bold text-emerald-400">{state.minimapInfoOffsetY || 0}px</span>
              </div>
              <input
                type="range"
                min="-40"
                max="40"
                value={state.minimapInfoOffsetY || 0}
                onChange={(e) => setState({ ...state, minimapInfoOffsetY: parseInt(e.target.value) || 0 })}
                className="w-full accent-emerald-400"
              />
            </div>
          </div>
        </div>

        {/* Row 5: Link OBS */}
        <div className="bg-black/40 border border-white/10 rounded-xl p-5 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Link Sorgente Browser per OBS</h4>
            <p className="text-xs text-slate-400 mt-0.5">Aggiungi questo link come Browser Source in OBS (1920x1080, sfondo trasparente).</p>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <button
              onClick={() => copyLink('/overlays/in-game-brand/index.html')}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-cyan-600/20"
            >
              <Copy size={15} /> Copia Link OBS Trasparente
            </button>

            <a
              href="/overlays/in-game-brand/index.html?preview=true"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/15 text-white font-bold text-xs uppercase tracking-wider rounded-xl border border-white/10 transition-all"
            >
              <ExternalLink size={15} /> Apri Test In-Game
            </a>
          </div>
        </div>

      </div>
    </div>
  );
}
