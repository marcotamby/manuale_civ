import { useState } from 'react';
import { useAuth } from './AuthContext';
import { User } from 'lucide-react';
import { Toast } from './Toast';
import type { ToastType } from './Toast';

interface SuggestionFormProps {
  civName: string;
}

export function EditSuggestionForm({ civName }: SuggestionFormProps) {
  const { isAuthenticated, user, openLoginModal } = useAuth();
  const [section, setSection] = useState('');
  const [suggestion, setSuggestion] = useState('');
  const [source, setSource] = useState('');
  const [toast, setToast] = useState<{ isVisible: boolean; message: string; type: ToastType }>({
    isVisible: false,
    message: '',
    type: 'success'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      openLoginModal();
      return;
    }
    console.log('Proposta inviata:', { civName, section, suggestion, source, user: user?.name });
    
    setToast({
      isVisible: true,
      message: 'Proposta inviata con successo!',
      type: 'success'
    });
    
    setSection('');
    setSuggestion('');
    setSource('');
  };

  if (!isAuthenticated) {
    return (
      <div className="glass p-8 rounded-2xl border border-[#D4AF37]/20 text-center flex flex-col items-center">
        <div className="w-16 h-16 bg-blue-600/10 rounded-full flex items-center justify-center mb-4 border border-blue-500/20">
          <User size={32} className="text-blue-400" />
        </div>
        <h3 className="text-xl font-bold text-white mb-2">Accesso Richiesto</h3>
        <p className="text-sm text-gray-400 max-w-sm mb-6">
          Per garantire la qualità dei contributi, ti chiediamo di effettuare l'accesso tramite Google per proporre modifiche.
        </p>
        <button 
          onClick={openLoginModal}
          className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg transition-all"
        >
          Accedi con Google
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-2 mb-6 text-sm text-green-400/80 bg-green-500/5 px-4 py-2 rounded-lg border border-green-500/20 w-fit">
        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        Loggato come <strong>{user?.name}</strong>
      </div>
      
      <p className="text-gray-400 text-sm mb-6">
        Hai informazioni più accurate su questa civiltà? Proponi una modifica e il nostro team la esaminerà.
      </p>



      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Sezione da modificare</label>
          <select
            value={section}
            onChange={(e) => setSection(e.target.value)}
            required
            className="w-full bg-black/40 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-yellow-500 transition-colors [&>option]:bg-[#1a1c23] [&>option]:text-white"
          >
            <option value="">Seleziona sezione...</option>
            <option value="caratteristiche">Caratteristiche</option>
            <option value="bonus">Bonus</option>
            <option value="unita">Unità Uniche</option>
            <option value="tecnologie">Tecnologie</option>
            <option value="build_order">Build Order</option>
            <option value="matchup">Matchup / Consigli</option>
            <option value="altro">Altro</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Descrivi la modifica proposta</label>
          <textarea
            value={suggestion}
            onChange={(e) => setSuggestion(e.target.value)}
            required
            rows={5}
            className="w-full bg-black/40 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-yellow-500 transition-colors resize-y"
            placeholder="Descrivi dettagliatamente la modifica che proponi..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Fonte (opzionale)</label>
          <input
            type="text"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="w-full bg-black/40 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-yellow-500 transition-colors"
            placeholder="Patch note, AoE4World, video, ecc."
          />
        </div>

        <button
          type="submit"
          className="w-full sm:w-auto sm:px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium shadow-lg shadow-blue-500/20 transition-all mt-2"
        >
          Invia Proposta
        </button>
      </form>

      <Toast 
        isVisible={toast.isVisible}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ ...toast, isVisible: false })}
      />
    </div>
  );
}
