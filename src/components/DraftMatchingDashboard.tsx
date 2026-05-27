import { useState, useEffect, useRef } from 'react';
import { Save, Plus, X, ChevronDown, Loader2, RefreshCcw, Sparkles, Users, HelpCircle, Trash2, Edit2, Check } from 'lucide-react';
import { overlayService } from '../services/overlayService';

interface DraftMatchingDashboardProps {
  onError: (msg: string) => void;
}

interface Coach {
  id: string;
  name: string;
}

interface Student {
  id: string;
  name: string;
}

interface Pairing {
  coachId: string;
  studentId: string;
}

interface Caster {
  name: string;
  active: boolean;
}

interface DashboardState {
  coaches: Coach[];
  students: Student[];
  pairings: Pairing[];
  casters: Caster[];
  liveSync: boolean;
  titleText: string;
  titleFont: string;
  titleFontSize: number;
  titleColor?: string;
  titleBorderColor?: string;
  titleBorderWidth?: number;
}

const DEFAULT_STATE: DashboardState = {
  coaches: [],
  students: [],
  pairings: [],
  casters: [
    { name: '', active: false },
    { name: '', active: false }
  ],
  liveSync: true,
  titleText: 'MATCHMAKING DRAFT',
  titleFont: 'Outfit',
  titleFontSize: 32,
  titleColor: '#ffffff',
  titleBorderColor: '#000000',
  titleBorderWidth: 0
};

const OVERLAY_ID = "draft-matching";

const PAIRING_COLORS = [
  '#00f0ff', // Electric Cyan
  '#ff007b', // Hot Pink
  '#00ff88', // Emerald Green
  '#bd00ff', // Violet/Purple
  '#ff7b00', // Neon Orange
  '#ffd800', // Bright Gold
  '#ff3c3c', // Vivid Coral/Red
  '#0088ff', // Sky Blue
  '#a2ff00', // Lime Green
  '#ff00d4'  // Magenta
];

export function DraftMatchingDashboard({ onError }: DraftMatchingDashboardProps) {
  const [state, setState] = useState<DashboardState>(DEFAULT_STATE);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Inputs
  const [newCoachName, setNewCoachName] = useState('');
  const [newStudentName, setNewStudentName] = useState('');
  const [editingCoachId, setEditingCoachId] = useState<string | null>(null);
  const [editingCoachName, setEditingCoachName] = useState('');
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [editingStudentName, setEditingStudentName] = useState('');

  // Dropdown & Sync Refs
  const [fontMenuOpen, setFontMenuOpen] = useState(false);
  const fontDropdownRef = useRef<HTMLDivElement>(null);
  const isLoadedRef = useRef(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch initial state
  useEffect(() => {
    overlayService.getOverlayState(OVERLAY_ID)
      .then(savedState => {
        if (savedState) {
          setState({
            ...DEFAULT_STATE,
            ...savedState,
            coaches: savedState.coaches || [],
            students: savedState.students || [],
            pairings: savedState.pairings || [],
            casters: savedState.casters || DEFAULT_STATE.casters,
            liveSync: savedState.liveSync !== undefined ? savedState.liveSync : true,
            titleText: savedState.titleText !== undefined ? savedState.titleText : DEFAULT_STATE.titleText,
            titleFont: savedState.titleFont || DEFAULT_STATE.titleFont,
            titleFontSize: savedState.titleFontSize || DEFAULT_STATE.titleFontSize,
            titleColor: savedState.titleColor || DEFAULT_STATE.titleColor,
            titleBorderColor: savedState.titleBorderColor || DEFAULT_STATE.titleBorderColor,
            titleBorderWidth: savedState.titleBorderWidth !== undefined ? savedState.titleBorderWidth : DEFAULT_STATE.titleBorderWidth
          });
        }
        isLoadedRef.current = true;
      })
      .catch(err => onError("Errore caricamento stato: " + err.message));
  }, []);

  // Click outside custom font dropdown to close it
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (fontDropdownRef.current && !fontDropdownRef.current.contains(event.target as Node)) {
        setFontMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Save changes
  const saveState = async (updatedState: DashboardState) => {
    try {
      await overlayService.updateOverlayState(OVERLAY_ID, updatedState);
      return true;
    } catch (err: any) {
      onError("Errore salvataggio: " + err.message);
      return false;
    }
  };

  // Debounced auto-sync to avoid Supabase write race conditions during quick typing
  useEffect(() => {
    if (!isLoadedRef.current) return;

    if (state.liveSync) {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(() => {
        overlayService.updateOverlayState(OVERLAY_ID, state)
          .catch(err => onError("Errore sincronizzazione live: " + err.message));
      }, 250);
    }

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [state]);

  const handleSaveManual = async () => {
    setIsSaving(true);
    const success = await saveState(state);
    if (success) {
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    }
    setIsSaving(false);
  };

  const handleReset = async () => {
    setState(DEFAULT_STATE);
    setShowResetConfirm(false);
    if (!DEFAULT_STATE.liveSync) {
      await saveState(DEFAULT_STATE);
    }
  };

  // Coaches Management
  const addCoach = () => {
    if (!newCoachName.trim()) return;
    const newCoach: Coach = {
      id: `c-${Date.now()}`,
      name: newCoachName.trim()
    };
    setState(prev => ({
      ...prev,
      coaches: [...prev.coaches, newCoach]
    }));
    setNewCoachName('');
  };

  const deleteCoach = (id: string) => {
    setState(prev => ({
      ...prev,
      coaches: prev.coaches.filter(c => c.id !== id),
      pairings: prev.pairings.filter(p => p.coachId !== id)
    }));
  };

  const startEditCoach = (coach: Coach) => {
    setEditingCoachId(coach.id);
    setEditingCoachName(coach.name);
  };

  const saveEditCoach = () => {
    if (!editingCoachName.trim() || !editingCoachId) return;
    setState(prev => ({
      ...prev,
      coaches: prev.coaches.map(c => c.id === editingCoachId ? { ...c, name: editingCoachName.trim() } : c)
    }));
    setEditingCoachId(null);
    setEditingCoachName('');
  };

  // Students Management
  const addStudent = () => {
    if (!newStudentName.trim()) return;
    const newStudent: Student = {
      id: `s-${Date.now()}`,
      name: newStudentName.trim()
    };
    setState(prev => ({
      ...prev,
      students: [...prev.students, newStudent]
    }));
    setNewStudentName('');
  };

  const deleteStudent = (id: string) => {
    setState(prev => ({
      ...prev,
      students: prev.students.filter(s => s.id !== id),
      pairings: prev.pairings.filter(p => p.studentId !== id)
    }));
  };

  const startEditStudent = (student: Student) => {
    setEditingStudentId(student.id);
    setEditingStudentName(student.name);
  };

  const saveEditStudent = () => {
    if (!editingStudentName.trim() || !editingStudentId) return;
    setState(prev => ({
      ...prev,
      students: prev.students.map(s => s.id === editingStudentId ? { ...s, name: editingStudentName.trim() } : s)
    }));
    setEditingStudentId(null);
    setEditingStudentName('');
  };

  // Pairings Management
  const handlePair = (coachId: string, studentId: string) => {
    setState(prev => {
      const filteredPairings = prev.pairings.filter(p => p.coachId !== coachId);
      const newPairings = [...filteredPairings];
      if (studentId) {
        newPairings.push({ coachId, studentId });
      }
      return {
        ...prev,
        pairings: newPairings
      };
    });
  };

  // Casters Management
  const handleCasterNameChange = (idx: number, name: string) => {
    setState(prev => {
      const newCasters = [...prev.casters];
      newCasters[idx] = { ...newCasters[idx], name };
      return {
        ...prev,
        casters: newCasters
      };
    });
  };

  const handleCasterActiveChange = (idx: number, active: boolean) => {
    setState(prev => {
      const newCasters = [...prev.casters];
      newCasters[idx] = { ...newCasters[idx], active };
      return {
        ...prev,
        casters: newCasters
      };
    });
  };

  // Toggle Live Sync
  const handleToggleLiveSync = () => {
    setState(prev => ({
      ...prev,
      liveSync: !prev.liveSync
    }));
  };

  // Check if a student is already paired (returns coach name)
  const getPairedCoachName = (studentId: string) => {
    const pairing = state.pairings.find(p => p.studentId === studentId);
    if (!pairing) return null;
    const coach = state.coaches.find(c => c.id === pairing.coachId);
    return coach ? coach.name : 'Altro Coach';
  };

  return (
    <div className="flex flex-col bg-[#05080f] font-inter text-white min-h-screen">
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;800;900&family=Inter:wght@400;700&family=Montserrat:wght@400;700;900&family=Cinzel:wght@700;900&family=Orbitron:wght@700;900&family=Bebas+Neue&family=Russo+One&family=Teko:wght@700&family=Press+Start+2P&family=Cinzel+Decorative:wght@700;900&display=swap" rel="stylesheet" />
      {/* Top Action Bar */}
      <div className="flex items-center justify-between p-6 bg-black/40 border-b border-white/10 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <button
            onClick={handleSaveManual}
            disabled={isSaving}
            className={`flex items-center justify-center gap-2 px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-lg ${
              isSaving 
                ? 'bg-gray-800 text-gray-500' 
                : showSuccess 
                  ? 'bg-green-600 text-white shadow-green-500/20' 
                  : 'bg-blue-600 text-white hover:bg-blue-500 shadow-blue-500/20'
            }`}
          >
            {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {isSaving ? 'Salvataggio...' : showSuccess ? 'Salvato!' : 'Salva Overlay'}
          </button>
          
          {!showResetConfirm ? (
            <button 
              onClick={() => setShowResetConfirm(true)} 
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-red-600/10 border border-red-600/30 text-red-500 hover:bg-red-600 hover:text-white transition-all font-black text-xs uppercase tracking-widest"
            >
              <RefreshCcw size={14} />
              Reset Campi
            </button>
          ) : (
            <div className="flex items-center gap-2 bg-red-600 p-1 rounded-xl shadow-lg animate-in zoom-in-95 duration-200">
              <span className="text-[10px] font-black text-white px-3 uppercase tracking-tighter">Confermi?</span>
              <button 
                onClick={handleReset} 
                className="bg-white text-red-600 px-4 py-2 rounded-lg font-black text-[10px] uppercase hover:bg-gray-100 transition-all"
              >
                SI, RESET
              </button>
              <button 
                onClick={() => setShowResetConfirm(false)} 
                className="bg-black/20 text-white w-8 h-8 flex items-center justify-center rounded-lg hover:bg-black/30"
              >
                <X size={14}/>
              </button>
            </div>
          )}
        </div>

        {/* Live Sync Toggle */}
        <div className="flex items-center gap-4 bg-black/60 px-6 py-3 rounded-2xl border border-white/5 shadow-inner">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              {state.liveSync && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              )}
              <span className={`relative inline-flex rounded-full h-2 w-2 ${state.liveSync ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
            </span>
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Sincronizzazione Live</span>
          </div>
          <div 
            onClick={handleToggleLiveSync} 
            className={`w-12 h-6 rounded-full relative cursor-pointer transition-all ${state.liveSync ? 'bg-emerald-500 shadow-lg shadow-emerald-500/20' : 'bg-white/10'}`}
          >
            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${state.liveSync ? 'left-7' : 'left-1'}`}></div>
          </div>
        </div>
      </div>

      <div className="p-8 pb-32 space-y-8">
        
        {/* Row 1: Coaches, Students, Pairings */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Column 1: Coaches */}
          <div className="bg-[#0a0f1a] border border-white/10 rounded-3xl p-6 shadow-2xl flex flex-col h-[650px]">
            <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-3">
              <h3 className="text-sm font-black text-amber-500 uppercase tracking-widest flex items-center gap-2">
                <Users size={16} /> Coach ({state.coaches.length})
              </h3>
              <span className="text-[10px] text-gray-500 uppercase font-medium">Sinistra Live</span>
            </div>

            {/* Add Coach Input */}
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={newCoachName}
                onChange={(e) => setNewCoachName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addCoach()}
                placeholder="Aggiungi Coach..."
                className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:border-amber-500/50 outline-none transition-all placeholder:text-gray-600 font-bold uppercase"
              />
              <button
                onClick={addCoach}
                className="bg-amber-500 hover:bg-amber-400 text-black p-2.5 rounded-xl transition-all shadow-md shadow-amber-500/10 flex items-center justify-center shrink-0 w-10 h-10"
              >
                <Plus size={18} />
              </button>
            </div>

            {/* Coach List */}
            <div className="flex-1 overflow-y-auto elegant-scrollbar space-y-2 pr-1">
              {state.coaches.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-600 gap-2">
                  <HelpCircle size={24} className="opacity-35" />
                  <span className="text-[10px] font-black uppercase tracking-wider">Nessun coach inserito</span>
                </div>
              ) :
                state.coaches.map(coach => {
                  const pairingIndex = state.pairings.findIndex(p => p.coachId === coach.id);
                  const isPaired = pairingIndex !== -1;
                  const pairingColor = isPaired ? PAIRING_COLORS[pairingIndex % PAIRING_COLORS.length] : null;

                  return (
                    <div 
                      key={coach.id}
                      style={pairingColor ? { borderColor: `${pairingColor}33`, borderLeftColor: pairingColor, borderLeftWidth: '4px', borderLeftStyle: 'solid' } : undefined}
                      className="bg-black/30 border border-white/5 hover:border-amber-500/20 rounded-xl p-3 flex items-center justify-between group transition-all"
                    >
                      {editingCoachId === coach.id ? (
                        <div className="flex items-center gap-2 w-full">
                          <input
                            type="text"
                            value={editingCoachName}
                            onChange={(e) => setEditingCoachName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && saveEditCoach()}
                            className="flex-1 bg-black/60 border border-blue-500/50 rounded-lg px-2 py-1.5 text-xs text-white uppercase font-bold outline-none"
                          />
                          <button onClick={saveEditCoach} className="p-1.5 bg-green-600 text-white rounded-md hover:bg-green-500">
                            <Check size={16} />
                          </button>
                        </div>
                      ) : (
                        <>
                          <span className="font-bold text-xs uppercase tracking-wide truncate max-w-[200px]">
                            {coach.name}
                          </span>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => startEditCoach(coach)}
                              className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-amber-500 transition-all"
                              title="Modifica"
                            >
                              <Edit2 size={18} />
                            </button>
                            <button 
                              onClick={() => deleteCoach(coach.id)}
                              className="p-2 hover:bg-red-500/20 rounded-lg text-gray-500 hover:text-red-400 transition-all"
                              title="Elimina"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })
              }
            </div>
          </div>

          {/* Column 2: Students (Allievi) */}
          <div className="bg-[#0a0f1a] border border-white/10 rounded-3xl p-6 shadow-2xl flex flex-col h-[650px]">
            <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-3">
              <h3 className="text-sm font-black text-blue-400 uppercase tracking-widest flex items-center gap-2">
                <Users size={16} /> Allievi ({state.students.length})
              </h3>
              <span className="text-[10px] text-gray-500 uppercase font-medium">Destra Live</span>
            </div>

            {/* Add Student Input */}
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={newStudentName}
                onChange={(e) => setNewStudentName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addStudent()}
                placeholder="Aggiungi Allievo..."
                className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:border-blue-500/50 outline-none transition-all placeholder:text-gray-600 font-bold uppercase"
              />
              <button
                onClick={addStudent}
                className="bg-blue-600 hover:bg-blue-500 text-white p-2.5 rounded-xl transition-all shadow-md shadow-blue-600/10 flex items-center justify-center shrink-0 w-10 h-10"
              >
                <Plus size={18} />
              </button>
            </div>

            {/* Student List */}
            <div className="flex-1 overflow-y-auto elegant-scrollbar space-y-2 pr-1">
              {state.students.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-600 gap-2">
                  <HelpCircle size={24} className="opacity-35" />
                  <span className="text-[10px] font-black uppercase tracking-wider">Nessun allievo inserito</span>
                </div>
              ) :
                state.students.map(student => {
                  const pairingIndex = state.pairings.findIndex(p => p.studentId === student.id);
                  const isPaired = pairingIndex !== -1;
                  const pairingColor = isPaired ? PAIRING_COLORS[pairingIndex % PAIRING_COLORS.length] : null;

                  return (
                    <div 
                      key={student.id}
                      style={pairingColor ? { borderColor: `${pairingColor}33`, borderRightColor: pairingColor, borderRightWidth: '4px', borderRightStyle: 'solid' } : undefined}
                      className="bg-black/30 border border-white/5 hover:border-blue-500/20 rounded-xl p-3 flex items-center justify-between group transition-all"
                    >
                    {editingStudentId === student.id ? (
                      <div className="flex items-center gap-2 w-full">
                        <input
                          type="text"
                          value={editingStudentName}
                          onChange={(e) => setEditingStudentName(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && saveEditStudent()}
                          className="flex-1 bg-black/60 border border-blue-500/50 rounded-lg px-2 py-1.5 text-xs text-white uppercase font-bold outline-none"
                        />
                        <button onClick={saveEditStudent} className="p-1.5 bg-green-600 text-white rounded-md hover:bg-green-500">
                          <Check size={16} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex flex-col min-w-0">
                          <span className="font-bold text-xs uppercase tracking-wide truncate max-w-[180px]">
                            {student.name}
                          </span>
                          {getPairedCoachName(student.id) && (
                            <span className="text-[8px] font-bold text-cyan-400/80 uppercase tracking-widest mt-0.5">
                              Abbinato a: {getPairedCoachName(student.id)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => startEditStudent(student)}
                            className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-blue-400 transition-all"
                            title="Modifica"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button 
                            onClick={() => deleteStudent(student.id)}
                            className="p-2 hover:bg-red-500/20 rounded-lg text-gray-500 hover:text-red-400 transition-all"
                            title="Elimina"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                  );
                })
              }
            </div>
          </div>

          {/* Column 3: Pairings (Abbinamenti) */}
          <div className="bg-[#0a0f1a] border border-white/10 rounded-3xl p-6 shadow-2xl flex flex-col h-[650px]">
            <h3 className="text-sm font-black text-amber-500 uppercase tracking-widest mb-4 border-b border-white/5 pb-3 flex items-center gap-2">
              <Sparkles size={16} /> Abbinamenti ({state.pairings.length})
            </h3>
            
            <div className="flex-1 overflow-y-auto elegant-scrollbar space-y-4 pr-1">
              {state.coaches.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-600 gap-2 text-center p-4">
                  <HelpCircle size={24} className="opacity-35" />
                  <span className="text-[10px] font-black uppercase tracking-wider">
                    Inserisci i Coach e gli Allievi nelle colonne a sinistra per creare gli abbinamenti
                  </span>
                </div>
              ) : (
                state.coaches.map(coach => {
                  const pairing = state.pairings.find(p => p.coachId === coach.id);
                  const selectedStudentId = pairing ? pairing.studentId : '';
                  const pairingIndex = state.pairings.findIndex(p => p.coachId === coach.id);
                  const isPaired = pairingIndex !== -1;
                  const pairingColor = isPaired ? PAIRING_COLORS[pairingIndex % PAIRING_COLORS.length] : null;
                  
                  return (
                    <div 
                      key={coach.id}
                      style={pairingColor ? { borderColor: `${pairingColor}33`, borderLeftColor: pairingColor, borderLeftWidth: '4px', borderLeftStyle: 'solid' } : undefined}
                      className="bg-black/30 border border-white/5 rounded-2xl p-4 space-y-2 hover:border-amber-500/20 transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-cyan-400 uppercase tracking-wider">
                          Coach: {coach.name}
                        </span>
                        {pairing && (
                          <button
                            onClick={() => handlePair(coach.id, '')}
                            className="text-[9px] font-black text-red-400 hover:text-red-300 uppercase tracking-widest"
                          >
                            Rimuovi link
                          </button>
                        )}
                      </div>

                      <div className="relative">
                        <select
                          value={selectedStudentId}
                          onChange={(e) => handlePair(coach.id, e.target.value)}
                          className="w-full bg-[#0d111a] border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-amber-500/50 outline-none font-bold uppercase appearance-none cursor-pointer"
                        >
                          <option value="">Seleziona un Allievo...</option>
                          {state.students.map(student => {
                            const pairedCoach = getPairedCoachName(student.id);
                            const isPairedElsewhere = pairedCoach && selectedStudentId !== student.id;
                            
                            return (
                              <option 
                                key={student.id} 
                                value={student.id}
                                className="bg-[#0d111a]"
                              >
                                {student.name} {isPairedElsewhere ? `(con ${pairedCoach})` : ''}
                              </option>
                            );
                          })}
                        </select>
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500" size={14} />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>

        {/* Row 2: Casters & Title Settings */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Card: Caster Configuration */}
          <div className="bg-[#0a0f1a] border border-white/10 rounded-3xl p-6 shadow-2xl">
            <h3 className="text-sm font-black text-blue-400 uppercase tracking-widest mb-4 border-b border-white/5 pb-3 flex items-center gap-2">
              <Sparkles size={16} className="text-cyan-400" /> Configurazione Caster
            </h3>
            <div className="space-y-4">
              {state.casters.slice(0, 1).map((c, idx) => (
                <div key={idx} className="flex items-center gap-4 bg-black/40 p-4 rounded-2xl border border-white/5 hover:border-blue-500/20 transition-all group overflow-hidden">
                  <div className="flex-1 min-w-0">
                    <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest block mb-1">Nome Caster</span>
                    <input 
                      type="text" 
                      value={c.name} 
                      onChange={(e) => handleCasterNameChange(idx, e.target.value)} 
                      placeholder="Nome Caster" 
                      className="w-full bg-transparent text-xs font-black text-white outline-none placeholder:text-gray-700 uppercase tracking-wider" 
                    />
                  </div>
                  <div 
                    onClick={() => handleCasterActiveChange(idx, !c.active)}
                    className={`w-12 h-6 rounded-full relative cursor-pointer transition-all flex-shrink-0 ${c.active ? 'bg-cyan-500 shadow-lg shadow-cyan-500/20' : 'bg-white/10'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${c.active ? 'left-7' : 'left-1'}`}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Card: Title Settings */}
          <div className="bg-[#0a0f1a] border border-white/10 rounded-3xl p-6 shadow-2xl flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-black text-purple-400 uppercase tracking-widest mb-4 border-b border-white/5 pb-3 flex items-center gap-2">
                <Sparkles size={16} className="text-purple-400" /> Impostazioni Titolo Overlay
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Title Text Input */}
                <div className="space-y-1">
                  <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest block font-bold">Testo Titolo</span>
                  <input 
                    type="text" 
                    value={state.titleText} 
                    onChange={(e) => setState(prev => ({ ...prev, titleText: e.target.value }))} 
                    placeholder="Esempio: MATCHMAKING DRAFT" 
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:border-purple-500/50 outline-none transition-all placeholder:text-gray-700 font-bold uppercase" 
                  />
                </div>

                {/* Font Family Selector */}
                <div className="space-y-1 relative" ref={fontDropdownRef}>
                  <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest block font-bold">Font Titolo</span>
                  <button
                    onClick={() => setFontMenuOpen(!fontMenuOpen)}
                    type="button"
                    className="w-full bg-black/40 border border-white/10 hover:border-purple-500/30 rounded-xl px-4 py-2.5 text-xs text-white outline-none font-bold flex items-center justify-between transition-all cursor-pointer"
                  >
                    <span style={{ fontFamily: state.titleFont }} className="tracking-wide uppercase">
                      {state.titleFont}
                    </span>
                    <ChevronDown size={14} className={`text-gray-500 transition-transform duration-300 ${fontMenuOpen ? 'rotate-180 text-purple-400' : ''}`} />
                  </button>

                  {fontMenuOpen && (
                    <div className="absolute left-0 right-0 mt-2 bg-[#090d16]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="p-1.5 max-h-60 overflow-y-auto elegant-scrollbar space-y-0.5">
                        {[
                          { value: 'Outfit', label: 'Outfit', desc: 'Moderna & Sleek' },
                          { value: 'Inter', label: 'Inter', desc: 'Pulito & Leggibile' },
                          { value: 'Montserrat', label: 'Montserrat', desc: 'Bold & Geometrico' },
                          { value: 'Cinzel', label: 'Cinzel', desc: 'Classico & Mitico' },
                          { value: 'Orbitron', label: 'Orbitron', desc: 'Fantascienza & Gaming' },
                          { value: 'Bebas Neue', label: 'Bebas Neue', desc: 'Bold & Impattante' },
                          { value: 'Russo One', label: 'Russo One', desc: 'Gaming & Tecnologico' },
                          { value: 'Teko', label: 'Teko', desc: 'Stretto & Moderno' },
                          { value: 'Press Start 2P', label: 'Press Start 2P', desc: 'Pixel Retro Gaming' },
                          { value: 'Cinzel Decorative', label: 'Cinzel Decorative', desc: 'Artistico & Elegante' }
                        ].map((item) => {
                          const isSelected = state.titleFont === item.value;
                          return (
                            <button
                              key={item.value}
                              type="button"
                              onClick={() => {
                                setState(prev => ({ ...prev, titleFont: item.value }));
                                setFontMenuOpen(false);
                              }}
                              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all text-left ${
                                isSelected 
                                  ? 'bg-purple-600/20 border border-purple-500/30 text-white' 
                                  : 'hover:bg-white/5 border border-transparent text-gray-300 hover:text-white'
                              }`}
                            >
                              <div className="flex flex-col">
                                <span style={{ fontFamily: item.value }} className="text-xs font-bold uppercase tracking-wider">
                                  {item.label}
                                </span>
                                <span className="text-[8px] text-gray-500 font-medium">
                                  {item.desc}
                                </span>
                              </div>
                              {isSelected && (
                                <Check size={12} className="text-purple-400" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Title Control sliders and color pickers */}
            <div className="space-y-4 mt-4">
              {/* Sliders Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Font Size Slider */}
                <div className="space-y-1">
                  <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest block font-bold">Dimensione Carattere ({state.titleFontSize}px)</span>
                  <div className="flex items-center gap-4 bg-black/40 px-4 py-2 rounded-xl border border-white/5">
                    <input 
                      type="range" 
                      min="16" 
                      max="64" 
                      value={state.titleFontSize} 
                      onChange={(e) => setState(prev => ({ ...prev, titleFontSize: parseInt(e.target.value) }))}
                      className="flex-1 accent-purple-500 h-1 bg-white/10 rounded-lg cursor-pointer"
                    />
                    <span className="text-xs font-black text-purple-400 w-8 text-right">{state.titleFontSize}px</span>
                  </div>
                </div>

                {/* Border Width Slider */}
                <div className="space-y-1">
                  <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest block font-bold">Spessore Contorno ({state.titleBorderWidth || 0}px)</span>
                  <div className="flex items-center gap-4 bg-black/40 px-4 py-2 rounded-xl border border-white/5">
                    <input 
                      type="range" 
                      min="0" 
                      max="8" 
                      value={state.titleBorderWidth || 0} 
                      onChange={(e) => setState(prev => ({ ...prev, titleBorderWidth: parseInt(e.target.value) }))}
                      className="flex-1 accent-purple-500 h-1 bg-white/10 rounded-lg cursor-pointer"
                    />
                    <span className="text-xs font-black text-purple-400 w-8 text-right">{state.titleBorderWidth || 0}px</span>
                  </div>
                </div>
              </div>

              {/* Colors Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Text Fill Color */}
                <div className="space-y-1">
                  <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest block font-bold">Colore Riempimento</span>
                  <div className="flex items-center gap-3 bg-black/40 border border-white/10 rounded-xl px-3 py-2">
                    <input 
                      type="color" 
                      value={state.titleColor || '#ffffff'} 
                      onChange={(e) => setState(prev => ({ ...prev, titleColor: e.target.value }))} 
                      className="w-8 h-8 bg-transparent border-0 rounded cursor-pointer shrink-0" 
                    />
                    <span className="text-xs font-mono uppercase text-gray-300">{state.titleColor || '#ffffff'}</span>
                  </div>
                </div>

                {/* Text Border/Outline Color */}
                <div className="space-y-1">
                  <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest block font-bold">Colore Contorno</span>
                  <div className="flex items-center gap-3 bg-black/40 border border-white/10 rounded-xl px-3 py-2">
                    <input 
                      type="color" 
                      value={state.titleBorderColor || '#000000'} 
                      onChange={(e) => setState(prev => ({ ...prev, titleBorderColor: e.target.value }))} 
                      className="w-8 h-8 bg-transparent border-0 rounded cursor-pointer shrink-0" 
                    />
                    <span className="text-xs font-mono uppercase text-gray-300">{state.titleBorderColor || '#000000'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
