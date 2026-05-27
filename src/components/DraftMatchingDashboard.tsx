import { useState, useEffect } from 'react';
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
}

const DEFAULT_STATE: DashboardState = {
  coaches: [],
  students: [],
  pairings: [],
  casters: [
    { name: '', active: false },
    { name: '', active: false }
  ],
  liveSync: true
};

const OVERLAY_ID = "draft-matching";

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

  // Fetch initial state
  useEffect(() => {
    overlayService.getOverlayState(OVERLAY_ID)
      .then(savedState => {
        if (savedState) {
          setState({
            ...DEFAULT_STATE,
            ...savedState,
            // Ensure lists are defined
            coaches: savedState.coaches || [],
            students: savedState.students || [],
            pairings: savedState.pairings || [],
            casters: savedState.casters || DEFAULT_STATE.casters,
            liveSync: savedState.liveSync !== undefined ? savedState.liveSync : true
          });
        }
      })
      .catch(err => onError("Errore caricamento stato: " + err.message));
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

  const handleStateChange = async (newState: DashboardState) => {
    setState(newState);
    if (newState.liveSync) {
      await saveState(newState);
    }
  };

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
    if (DEFAULT_STATE.liveSync) {
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
    const newState = {
      ...state,
      coaches: [...state.coaches, newCoach]
    };
    setNewCoachName('');
    handleStateChange(newState);
  };

  const deleteCoach = (id: string) => {
    const newState = {
      ...state,
      coaches: state.coaches.filter(c => c.id !== id),
      // Clean up pairings
      pairings: state.pairings.filter(p => p.coachId !== id)
    };
    handleStateChange(newState);
  };

  const startEditCoach = (coach: Coach) => {
    setEditingCoachId(coach.id);
    setEditingCoachName(coach.name);
  };

  const saveEditCoach = () => {
    if (!editingCoachName.trim() || !editingCoachId) return;
    const newState = {
      ...state,
      coaches: state.coaches.map(c => c.id === editingCoachId ? { ...c, name: editingCoachName.trim() } : c)
    };
    setEditingCoachId(null);
    setEditingCoachName('');
    handleStateChange(newState);
  };

  // Students Management
  const addStudent = () => {
    if (!newStudentName.trim()) return;
    const newStudent: Student = {
      id: `s-${Date.now()}`,
      name: newStudentName.trim()
    };
    const newState = {
      ...state,
      students: [...state.students, newStudent]
    };
    setNewStudentName('');
    handleStateChange(newState);
  };

  const deleteStudent = (id: string) => {
    const newState = {
      ...state,
      students: state.students.filter(s => s.id !== id),
      // Clean up pairings
      pairings: state.pairings.filter(p => p.studentId !== id)
    };
    handleStateChange(newState);
  };

  const startEditStudent = (student: Student) => {
    setEditingStudentId(student.id);
    setEditingStudentName(student.name);
  };

  const saveEditStudent = () => {
    if (!editingStudentName.trim() || !editingStudentId) return;
    const newState = {
      ...state,
      students: state.students.map(s => s.id === editingStudentId ? { ...s, name: editingStudentName.trim() } : s)
    };
    setEditingStudentId(null);
    setEditingStudentName('');
    handleStateChange(newState);
  };

  // Pairings Management
  const handlePair = (coachId: string, studentId: string) => {
    // Remove existing pairing for this coach if any
    const filteredPairings = state.pairings.filter(p => p.coachId !== coachId);
    
    const newPairings = [...filteredPairings];
    if (studentId) {
      newPairings.push({ coachId, studentId });
    }

    const newState = {
      ...state,
      pairings: newPairings
    };
    handleStateChange(newState);
  };

  // Casters Management
  const handleCasterNameChange = (idx: number, name: string) => {
    const newCasters = [...state.casters];
    newCasters[idx] = { ...newCasters[idx], name };
    const newState = {
      ...state,
      casters: newCasters
    };
    handleStateChange(newState);
  };

  const handleCasterActiveChange = (idx: number, active: boolean) => {
    const newCasters = [...state.casters];
    newCasters[idx] = { ...newCasters[idx], active };
    const newState = {
      ...state,
      casters: newCasters
    };
    handleStateChange(newState);
  };

  // Toggle Live Sync
  const handleToggleLiveSync = () => {
    const newState = {
      ...state,
      liveSync: !state.liveSync
    };
    handleStateChange(newState);
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
              ) : (
                state.coaches.map(coach => (
                  <div 
                    key={coach.id}
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
                ))
              )}
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
              ) : (
                state.students.map(student => (
                  <div 
                    key={student.id}
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
                            <span className="text-[8px] font-bold text-amber-500/60 uppercase tracking-widest mt-0.5">
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
                ))
              )}
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
                  
                  return (
                    <div 
                      key={coach.id}
                      className="bg-black/30 border border-white/5 rounded-2xl p-4 space-y-2 hover:border-amber-500/20 transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-amber-500 uppercase tracking-wider">
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

        {/* Row 2: Casters Configuration */}
        <div className="bg-[#0a0f1a] border border-white/10 rounded-3xl p-6 shadow-2xl">
          <h3 className="text-sm font-black text-blue-400 uppercase tracking-widest mb-4 border-b border-white/5 pb-3 flex items-center gap-2">
            <Sparkles size={16} className="text-cyan-400" /> Configurazione Caster
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {state.casters.map((c, idx) => (
              <div key={idx} className="flex items-center gap-4 bg-black/40 p-4 rounded-2xl border border-white/5 hover:border-blue-500/20 transition-all group overflow-hidden">
                <div className="flex-1 min-w-0">
                  <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest block mb-1">Caster #{idx+1}</span>
                  <input 
                    type="text" 
                    value={c.name} 
                    onChange={(e) => handleCasterNameChange(idx, e.target.value)} 
                    placeholder={`Nome Caster ${idx+1}`} 
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

      </div>
    </div>
  );
}
