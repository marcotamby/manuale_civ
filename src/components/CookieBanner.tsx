import { useState, useEffect } from 'react';

export function CookieBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookieConsent');
    if (!consent) {
      setIsVisible(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('cookieConsent', 'accepted');
    setIsVisible(false);
  };

  const handleDecline = () => {
    localStorage.setItem('cookieConsent', 'declined');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 shrink-0 bg-gray-900 border-t border-[#D4AF37]/30 shadow-[0_-5px_20px_rgba(0,0,0,0.5)] flex flex-col sm:flex-row items-center justify-between gap-4 glass">
      <div className="text-sm text-gray-300 flex-1">
        <p><strong>Informativa sui Cookie:</strong> Utilizziamo cookie tecnici per migliorare la tua esperienza di navigazione. Continuando a utilizzare il sito accetti i termini allineati alla normativa UE e GDPR.</p>
      </div>
      <div className="flex shrink-0 gap-3">
        <button 
          onClick={handleDecline}
          className="px-4 py-2 rounded-md text-sm font-medium transition-colors text-gray-400 hover:text-white"
        >
          Rifiuta Opzionali
        </button>
        <button 
          onClick={handleAccept}
          className="px-6 py-2 rounded-md text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/30 transition-all"
        >
          Accetta Tutti
        </button>
      </div>
    </div>
  );
}
