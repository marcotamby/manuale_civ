import { useState, useEffect, useRef } from 'react';
import { 
  ShieldCheck, 
  Save, 
  CheckCircle2, 
  Loader2, 
  Eye, 
  EyeOff, 
  Sliders, 
  MapPin, 
  Search, 
  X, 
  Copy, 
  ExternalLink, 
  Radio 
} from 'lucide-react';
import { overlayService } from '../services/overlayService';
import type { OverlayState } from '../services/overlayService';

const OVERLAY_ID = 'in-game-brand';

interface InGameBrandDashboardProps {
  onError?: (msg: string) => void;
  onActivePathChange?: (path: string) => void;
}

const ALL_AOE4_MAPS = [
  'African Waters',
  'Alopecia',
  'Altai',
  'Anatolian Hills',
  'Ancient Spires',
  'Archipelago',
  'Atacama',
  'Baltic',
  'Basin',
  'Black Forest',
  'Bohemia',
  'Boulder Bay',
  'Canal',
  'Carmel',
  'Cauldron',
  'Cliffside',
  'Coastal',
  'Coastal Cliffs',
  'Confluence',
  'Continental',
  'Danube River',
  'Dry Arabia',
  'Dry River',
  'Enlightened Horizon',
  'Flankwoods',
  'Floodplain',
  'Forest Ponds',
  'Forts',
  'Fortress',
  'Four Lakes',
  'French Pass',
  'Frisian Marshes',
  'Glade',
  'Golden Heights',
  'Golden Pit',
  'Golden Swamp',
  'Gorge',
  'Hallowed Spring',
  'Haywire',
  'Hidden Valley',
  'Hideout',
  'High View',
  'Hill and Dale',
  'Himeyama',
  'Holy Island',
  'Jousting Fields',
  'Kawasan',
  'King of the Hill',
  'Lake Side',
  'Lipany',
  'Marshland',
  'MegaRandom',
  'Migration',
  'Mongolian Heights',
  'Mountain Clearing',
  'Mountain Pass',
  'Nagari',
  'Oasis',
  'Prairie',
  'Relic River',
  'Rocky Canyon',
  'Rocky River',
  'Scandinavia',
  'Shadow Lake',
  'Socotra',
  'Sunkenlands',
  'The Pit',
  'Thickets',
  'Transhumance',
  'Tundra',
  'Turtle Ridge',
  'Volcanic Island',
  'Warring Islands',
  'Waterholes',
  'Waterlanes',
  'Wetlands',
  'Wilderness'
];

const DEFAULT_STATE: OverlayState = {
  tournamentTitle: 'Ends of Summer Champions',
  dayNumber: 1,
  dayText: 'Giornata 1',
  mapName: 'Dry Arabia',
  showTopBanner: true,
  showMinimapCrest: true,
  showMinimapInfo: true,
  topBannerOffsetY: 0,
  minimapCrestOffsetY: 0,
  minimapBottomOffsetY: 0
};

export function InGameBrandDashboard({ onError, onActivePathChange }: InGameBrandDashboardProps) {
  const [state, setState] = useState<OverlayState>(DEFAULT_STATE);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isLiveSyncing, setIsLiveSyncing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [mapSearchQuery, setMapSearchQuery] = useState('');

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

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

  // Instant Live Sync to Supabase
  const pushLiveState = (newState: OverlayState, immediate = false) => {
    setState(newState);
    setIsLiveSyncing(true);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const executePush = async () => {
      setIsSaving(true);
      try {
        await overlayService.updateOverlayState(OVERLAY_ID, newState);
        setIsLiveSyncing(false);
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 1500);
      } catch (err) {
        console.error('Errore sync realtime:', err);
        setIsLiveSyncing(false);
      } finally {
        setIsSaving(false);
      }
    };

    if (immediate) {
      executePush();
    } else {
      debounceTimerRef.current = setTimeout(executePush, 200);
    }
  };

  const handleDaySelect = (day: number) => {
    const updated = {
      ...state,
      dayNumber: day,
      dayText: `Giornata ${day}`
    };
    pushLiveState(updated, true);
  };

  const handleMapSelect = (map: string) => {
    const updated = { ...state, mapName: map };
    pushLiveState(updated, true);
  };

  const copyLink = (path: string) => {
    const fullUrl = `${window.location.origin}${path}`;
    navigator.clipboard.writeText(fullUrl);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2000);
  };

  const filteredMaps = ALL_AOE4_MAPS.filter((m) =>
    m.toLowerCase().includes(mapSearchQuery.toLowerCase().trim())
  );

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
              In-Game Brand (1V1)
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 flex items-center gap-1">
                <Radio size={12} className="animate-pulse text-emerald-400" />
                Live Sync Istantaneo
              </span>
            </h2>
            <p className="text-xs text-slate-400">Tutte le modifiche si sincronizzano in diretta streaming su OBS in tempo reale.</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isLiveSyncing ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/15 border border-cyan-400/30 text-cyan-300 text-xs font-bold animate-pulse">
              <Loader2 size={13} className="animate-spin" /> Inviando a OBS...
            </div>
          ) : showSuccess ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-xs font-bold animate-in fade-in">
              <CheckCircle2 size={14} /> Aggiornato Live
            </div>
          ) : null}

          <button
            onClick={() => pushLiveState(state, true)}
            disabled={isSaving}
            className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-yellow-500 via-amber-500 to-orange-600 hover:from-yellow-400 hover:to-orange-500 text-black font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-yellow-500/20 active:scale-95 disabled:opacity-50"
          >
            {isSaving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            Salva
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 overflow-y-auto custom-scrollbar space-y-6">
        
        {/* Row 1: Titolo Torneo (In Alto) & Giornata (Sotto alla Mappa) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Titolo Torneo (Elemento Superiore) */}
          <div className="bg-black/40 border border-white/10 rounded-xl p-5 flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-yellow-400"></span>
                1. Nome Torneo (Banner In Alto)
              </label>
              <button
                type="button"
                onClick={() => pushLiveState({ ...state, showTopBanner: state.showTopBanner === false ? true : false }, true)}
                className={`text-xs font-bold flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-all ${
                  state.showTopBanner !== false 
                    ? 'bg-yellow-500/15 border-yellow-500/40 text-yellow-300' 
                    : 'bg-white/5 border-white/10 text-slate-500'
                }`}
              >
                {state.showTopBanner !== false ? <Eye size={13} /> : <EyeOff size={13} />}
                {state.showTopBanner !== false ? 'Visibile' : 'Nascosto'}
              </button>
            </div>
            <input
              type="text"
              value={state.tournamentTitle || ''}
              onChange={(e) => pushLiveState({ ...state, tournamentTitle: e.target.value })}
              placeholder="Ends of Summer Champions"
              className="bg-[#0e1424] border border-white/10 focus:border-yellow-400/60 rounded-xl px-4 py-2.5 text-sm font-bold text-white focus:outline-none"
            />
            <p className="text-[11px] text-slate-400">Posizionato al centro sotto l'HUD spettatore.</p>
          </div>

          {/* Selettore Giornata (Area Scura Minimappa) */}
          <div className="bg-black/40 border border-white/10 rounded-xl p-5 flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                2. Giornata (Sotto la Mappa)
              </label>
              <button
                type="button"
                onClick={() => pushLiveState({ ...state, showMinimapInfo: state.showMinimapInfo === false ? true : false }, true)}
                className={`text-xs font-bold flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-all ${
                  state.showMinimapInfo !== false 
                    ? 'bg-cyan-500/15 border-cyan-400/40 text-cyan-300' 
                    : 'bg-white/5 border-white/10 text-slate-500'
                }`}
              >
                {state.showMinimapInfo !== false ? <Eye size={13} /> : <EyeOff size={13} />}
                {state.showMinimapInfo !== false ? 'Visibile' : 'Nascosto'}
              </button>
            </div>
            
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 4].map((d) => (
                <button
                  key={d}
                  onClick={() => handleDaySelect(d)}
                  className={`py-2 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all border ${
                    (state.dayNumber || 1) === d
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-md shadow-cyan-500/20 scale-[1.02]'
                      : 'bg-[#0e1424] border-white/10 text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  Giorno {d}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <span className="text-[11px] text-slate-400">Testo personalizzato:</span>
              <input
                type="text"
                value={state.dayText || ''}
                onChange={(e) => pushLiveState({ ...state, dayText: e.target.value })}
                placeholder="Giornata 1"
                className="flex-1 bg-[#0e1424] border border-white/10 focus:border-cyan-400/60 rounded-lg px-3 py-1 text-xs font-bold text-cyan-300 focus:outline-none"
              />
            </div>
          </div>

        </div>

        {/* Row 2: Ricerca e Selezione Mappa */}
        <div className="bg-black/40 border border-white/10 rounded-xl p-5 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <label className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <MapPin size={16} className="text-cyan-400" />
                3. Mappa In Corso (Area Scura Minimappa)
              </label>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Mappa attuale selezionata: <span className="font-black text-yellow-400 text-xs uppercase">{state.mapName || 'Nessuna'}</span>
              </p>
            </div>

            {/* Search Input Bar */}
            <div className="relative w-full md:w-80">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={mapSearchQuery}
                onChange={(e) => setMapSearchQuery(e.target.value)}
                placeholder="Cerca tra tutte le 77 mappe..."
                className="w-full bg-[#0e1424] border border-white/15 focus:border-cyan-400/70 rounded-xl pl-9 pr-8 py-2 text-xs font-bold text-white focus:outline-none placeholder-slate-500 shadow-inner"
              />
              {mapSearchQuery && (
                <button
                  onClick={() => setMapSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Maps Grid with Thumbnails */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 max-h-64 overflow-y-auto custom-scrollbar p-1 bg-[#060912] rounded-xl border border-white/5">
            {filteredMaps.length > 0 ? (
              filteredMaps.map((map) => {
                const isSelected = state.mapName?.toLowerCase() === map.toLowerCase();
                return (
                  <button
                    key={map}
                    onClick={() => handleMapSelect(map)}
                    className={`flex items-center gap-2 p-2 rounded-xl text-left transition-all border relative overflow-hidden group ${
                      isSelected
                        ? 'bg-gradient-to-r from-cyan-500/25 to-blue-500/25 border-cyan-400 text-cyan-200 shadow-md shadow-cyan-500/20 ring-1 ring-cyan-400/50'
                        : 'bg-[#0d1322] border-white/5 text-slate-300 hover:border-white/20 hover:bg-white/5'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 bg-black/50 border border-white/10">
                      <img
                        src={`/maps/${map}.png`}
                        alt={map}
                        onError={(e) => { (e.target as HTMLImageElement).src = '/aoeitalia-logo.png'; }}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-200"
                      />
                    </div>
                    <span className="text-[11px] font-bold truncate flex-1">{map}</span>
                    {isSelected && (
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400 animate-pulse"></span>
                    )}
                  </button>
                );
              })
            ) : (
              <div className="col-span-full py-8 text-center text-slate-500 text-xs">
                Nessuna mappa trovata con "{mapSearchQuery}".
              </div>
            )}
          </div>

          {/* Custom Map Input fallback */}
          <div className="flex items-center gap-3 pt-1">
            <span className="text-[11px] font-bold text-slate-400">Inserisci mappa manuale:</span>
            <input
              type="text"
              value={state.mapName || ''}
              onChange={(e) => pushLiveState({ ...state, mapName: e.target.value })}
              placeholder="Es. Dry Arabia personalizzata"
              className="bg-[#0e1424] border border-white/10 focus:border-cyan-400/60 rounded-lg px-3 py-1.5 text-xs font-bold text-white focus:outline-none w-72"
            />
          </div>
        </div>

        {/* Row 3: Logo Crest Minimappa Toggle & Regolazioni Posizione */}
        <div className="bg-black/40 border border-white/10 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Sliders size={16} className="text-yellow-400" />
              Calibrazione Posizione & Badge AoEItalia
            </h3>

            <button
              type="button"
              onClick={() => pushLiveState({ ...state, showMinimapCrest: state.showMinimapCrest === false ? true : false }, true)}
              className={`text-xs font-bold flex items-center gap-1.5 px-3 py-1 rounded-lg border transition-all ${
                state.showMinimapCrest !== false 
                  ? 'bg-yellow-500/15 border-yellow-500/40 text-yellow-300' 
                  : 'bg-white/5 border-white/10 text-slate-500'
              }`}
            >
              {state.showMinimapCrest !== false ? <Eye size={13} /> : <EyeOff size={13} />}
              Badge Logo Minimappa: {state.showMinimapCrest !== false ? 'Visibile' : 'Nascosto'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Altezza Banner Alto (Y):</span>
                <span className="font-bold text-yellow-400">{state.topBannerOffsetY || 0}px</span>
              </div>
              <input
                type="range"
                min="-30"
                max="50"
                value={state.topBannerOffsetY || 0}
                onChange={(e) => pushLiveState({ ...state, topBannerOffsetY: parseInt(e.target.value) || 0 })}
                className="w-full accent-yellow-400"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Altezza Logo Minimappa (Y):</span>
                <span className="font-bold text-cyan-400">{state.minimapCrestOffsetY || 0}px</span>
              </div>
              <input
                type="range"
                min="-50"
                max="50"
                value={state.minimapCrestOffsetY || 0}
                onChange={(e) => pushLiveState({ ...state, minimapCrestOffsetY: parseInt(e.target.value) || 0 })}
                className="w-full accent-cyan-400"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Altezza Area Scura Mappa (Y):</span>
                <span className="font-bold text-emerald-400">{state.minimapBottomOffsetY || 0}px</span>
              </div>
              <input
                type="range"
                min="-40"
                max="40"
                value={state.minimapBottomOffsetY || 0}
                onChange={(e) => pushLiveState({ ...state, minimapBottomOffsetY: parseInt(e.target.value) || 0 })}
                className="w-full accent-emerald-400"
              />
            </div>
          </div>
        </div>

        {/* Row 4: Link OBS */}
        <div className="bg-black/40 border border-white/10 rounded-xl p-5 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Link OBS Browser Source</h4>
            <p className="text-xs text-slate-400 mt-0.5">Risoluzione 1920x1080, sfondo 100% trasparente.</p>
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
