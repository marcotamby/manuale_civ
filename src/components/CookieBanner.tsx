import { useState, useEffect } from 'react';
import { Shield, X, Activity, Lock, Settings } from 'lucide-react';

export function CookieBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [consentPresence, setConsentPresence] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookieConsent');
    if (!consent) {
      setIsVisible(true);
      // GDPR defaults optional cookies to false until explicitly accepted
      setConsentPresence(false);
    } else {
      setConsentPresence(consent === 'accepted');
    }
  }, []);

  useEffect(() => {
    const handleOpenSettings = () => {
      const consent = localStorage.getItem('cookieConsent');
      setConsentPresence(consent === 'accepted');
      setIsCustomizing(true);
      setIsVisible(true);
    };

    window.addEventListener('open-cookie-settings', handleOpenSettings);
    return () => {
      window.removeEventListener('open-cookie-settings', handleOpenSettings);
    };
  }, []);

  const handleAcceptAll = () => {
    localStorage.setItem('cookieConsent', 'accepted');
    setConsentPresence(true);
    setIsVisible(false);
    setIsCustomizing(false);
    window.dispatchEvent(new Event('cookie-consent-changed'));
  };

  const handleDeclineAll = () => {
    localStorage.setItem('cookieConsent', 'declined');
    setConsentPresence(false);
    setIsVisible(false);
    setIsCustomizing(false);
    window.dispatchEvent(new Event('cookie-consent-changed'));
  };

  const handleSaveSelection = () => {
    const nextConsent = consentPresence ? 'accepted' : 'declined';
    localStorage.setItem('cookieConsent', nextConsent);
    setIsVisible(false);
    setIsCustomizing(false);
    window.dispatchEvent(new Event('cookie-consent-changed'));
  };

  if (!isVisible) return null;

  return (
    <>
      {/* Bottom Banner */}
      {!isCustomizing && (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4 shrink-0 bg-gray-900 border-t border-cyan-500/20 shadow-[0_-5px_20px_rgba(0,0,0,0.5)] flex flex-col md:flex-row items-center justify-between gap-4 glass">
          <div className="text-sm text-gray-300 flex-1 flex items-start gap-3">
            <Shield className="text-cyan-400 shrink-0 mt-0.5" size={18} />
            <p>
              <strong>Informativa sui Cookie:</strong> Utilizziamo cookie tecnici ed essenziali per il funzionamento del sito. Con il tuo consenso, utilizziamo anche cookie opzionali per tracciare le presenze in tempo reale.
              <a href="/privacy" className="text-cyan-400 hover:underline ml-1">Leggi la Privacy Policy</a>
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3 w-full md:w-auto justify-end">
            <button 
              onClick={handleDeclineAll}
              className="px-4 py-2 rounded-md text-sm font-medium transition-colors text-gray-400 hover:text-white"
            >
              Rifiuta Opzionali
            </button>
            <button 
              onClick={() => setIsCustomizing(true)}
              className="px-4 py-2 rounded-md text-sm font-medium transition-colors border border-gray-700 hover:border-cyan-500/40 text-gray-300 hover:text-cyan-400 flex items-center gap-1.5"
            >
              <Settings size={14} />
              Personalizza
            </button>
            <button 
              onClick={handleAcceptAll}
              className="px-6 py-2 rounded-md text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/30 transition-all"
            >
              Accetta Tutti
            </button>
          </div>
        </div>
      )}

      {/* Customization Modal */}
      {isCustomizing && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#0f111a] border border-cyan-500/30 rounded-2xl w-full max-w-lg overflow-hidden shadow-[0_10px_50px_rgba(0,0,0,0.8)] animate-in zoom-in-95 duration-200 flex flex-col glass">
            {/* Header */}
            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-slate-950/40">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Shield className="text-cyan-400" size={20} />
                Gestione Cookie e Privacy
              </h3>
              <button 
                onClick={() => {
                  if (localStorage.getItem('cookieConsent')) {
                    setIsVisible(false);
                    setIsCustomizing(false);
                  } else {
                    handleDeclineAll();
                  }
                }}
                className="text-gray-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/5"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6 overflow-y-auto max-h-[60vh] elegant-scrollbar">
              <p className="text-xs text-gray-400 leading-relaxed">
                Su ManualeCiv rispettiamo la tua privacy. Scegli quali categorie di cookie e tracciamenti desideri attivare. Le modifiche avranno effetto immediato.
              </p>

              <div className="space-y-4">
                {/* Technical Cookies */}
                <div className="flex items-start justify-between gap-4 p-4 rounded-xl bg-white/5 border border-white/5">
                  <div className="flex gap-3">
                    <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 shrink-0 mt-0.5">
                      <Lock size={18} />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                        Cookie Tecnici e Necessari
                        <span className="text-[10px] font-black uppercase bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded">Sempre Attivi</span>
                      </h4>
                      <p className="text-xs text-gray-400 leading-relaxed">
                        Essenziali per il corretto funzionamento del sito. Consentono l'autenticazione (Google OAuth), la memorizzazione delle preferenze e dello stato del consenso privacy.
                      </p>
                    </div>
                  </div>
                  <div className="relative inline-flex h-6 w-11 shrink-0 cursor-not-allowed rounded-full border-2 border-transparent bg-cyan-500/50 transition-colors duration-200 ease-in-out">
                    <span className="pointer-events-none inline-block h-5 w-5 translate-x-5 transform rounded-full bg-white shadow" />
                  </div>
                </div>

                {/* Presence / Analytics Cookies */}
                <div className="flex items-start justify-between gap-4 p-4 rounded-xl bg-white/5 border border-white/5 hover:border-cyan-500/10 transition-colors">
                  <div className="flex gap-3">
                    <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 shrink-0 mt-0.5">
                      <Activity size={18} />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-white">
                        Contatore Presenze e Statistiche
                      </h4>
                      <p className="text-xs text-gray-400 leading-relaxed">
                        Utilizza Supabase Presence per conteggiarti (in forma totalmente anonima) nel contatore degli utenti online e visualizzare quali sezioni del sito sono visitate. Se disattivato, sarai escluso dalle presenze.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setConsentPresence(!consentPresence)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-cyan-500/50 ${
                      consentPresence ? 'bg-cyan-500' : 'bg-gray-700'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${
                        consentPresence ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-white/10 bg-slate-950/40 flex flex-col sm:flex-row items-center justify-between gap-3">
              <button 
                onClick={handleDeclineAll}
                className="w-full sm:w-auto px-4 py-2 rounded-md text-sm font-medium transition-colors text-gray-400 hover:text-white text-center"
              >
                Rifiuta Opzionali
              </button>
              
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <button 
                  onClick={handleSaveSelection}
                  className="w-full sm:w-auto px-4 py-2 rounded-md text-sm font-bold transition-all border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 text-center px-4"
                >
                  Conferma Selezione
                </button>
                <button 
                  onClick={handleAcceptAll}
                  className="w-full sm:w-auto px-6 py-2 rounded-md text-sm font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/30 transition-all text-center"
                >
                  Accetta Tutti
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
