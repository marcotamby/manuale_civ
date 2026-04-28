import { useNavigate } from 'react-router-dom';

export function PrivacyPage() {
  const navigate = useNavigate();

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 h-full lg:bg-transparent bg-[#0d1424] text-gray-300 relative z-10 elegant-scrollbar">
      <div className="max-w-4xl mx-auto glass p-8 rounded-2xl border border-[#D4AF37]/30 shadow-2xl">
        <button 
          onClick={() => navigate('/')}
          className="mb-8 flex items-center gap-2 text-yellow-500 hover:text-yellow-400 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
          Torna alla Dashboard
        </button>

        <h1 className="text-3xl font-bold text-white mb-6 italic font-serif border-b border-[#D4AF37]/20 pb-4">Privacy & Cookie Policy</h1>
        
        <div className="space-y-6 text-sm leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-yellow-500 mb-3">1. Introduzione</h2>
            <p>
              Benvenuto su ManualeCiv. La tua privacy è estremamente importante per noi. Questa pagina spiega come raccogliamo, utilizziamo e proteggiamo i tuoi dati personali in conformità con il Regolamento Generale sulla Protezione dei Dati (GDPR) dell'Unione Europea.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-yellow-500 mb-3">2. Dati Raccolti</h2>
            <p>
              Raccogliamo dati personali solo quando decidi volontariamente di autenticarti tramite Google OAuth per interagire con il sito (proporre modifiche o salvare preferiti). I dati raccolti includono:
            </p>
            <ul className="list-disc ml-6 mt-2 space-y-1">
              <li>Nome e Cognome (forniti da Google)</li>
              <li>Indirizzo Email</li>
              <li>Immagine del profilo (opzionale)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-yellow-500 mb-3">3. Finalità del Trattamento</h2>
            <p>I tuoi dati vengono utilizzati esclusivamente per:</p>
            <ul className="list-disc ml-6 mt-2 space-y-1">
              <li>Identificare l'autore delle proposte di modifica inviate.</li>
              <li>Gestire la tua lista personalizzata di civiltà preferite.</li>
              <li>Prevenire abusi o spam sul sistema delle modifiche.</li>
            </ul>
            <p className="mt-2 text-white italic underline font-medium">Non vendiamo, cediamo o condividiamo i tuoi dati con terze parti per scopi commerciali o pubblicitari.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-yellow-500 mb-3">4. Cookie e Tecnologie di Storage</h2>
            <p>
              Il sito utilizza esclusivamente tecnologie necessarie al funzionamento e al miglioramento dell'esperienza utente:
            </p>
            <ul className="list-disc ml-6 mt-2 space-y-1">
              <li><strong>Cookie Tecnici:</strong> Necessari per gestire l'autenticazione (Google OAuth) e memorizzare il tuo consenso alla privacy.</li>
              <li><strong>Session Storage:</strong> Utilizziamo lo storage temporaneo del browser per funzioni di sessione, come evitare la ricomparsa di popup già chiusi o gestire l'ID temporaneo del contatore presenze. Questi dati vengono eliminati automaticamente alla chiusura della scheda o del browser.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-yellow-500 mb-3">5. Contatore Presenze in Tempo Reale</h2>
            <p>
              Per mostrare la vitalità della community, utilizziamo <strong>Supabase Presence</strong>. Questa tecnologia permette di contare quanti utenti sono online e su quali sezioni del sito si trovano.
            </p>
            <ul className="list-disc ml-6 mt-2 space-y-1">
              <li><strong>Visitatori:</strong> Il tracciamento è totalmente anonimo e basato su un identificativo casuale generato all'accesso.</li>
              <li><strong>Utenti Autenticati:</strong> Per i membri dello staff, la presenza permette il coordinamento in tempo reale sulle modifiche alle civiltà.</li>
              <li><strong>Controllo:</strong> Se scegli di "Rifiutare gli Opzionali" nel banner dei cookie, non verrai incluso nel conteggio globale delle presenze.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-yellow-500 mb-3">6. Sicurezza e Conservazione</h2>
            <p>
              I tuoi dati sono conservati in modo sicuro tramite la piattaforma **Supabase**, che utilizza crittografia avanzata. Le tue password non vengono mai salvate sui nostri server poiché l'autenticazione è gestita esternamente da Google.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-yellow-500 mb-3">7. I Tuoi Diritti</h2>
            <p>In ogni momento puoi:</p>
            <ul className="list-disc ml-6 mt-2 space-y-1">
              <li>Richiedere la cancellazione totale dei tuoi dati e del tuo account inviando una mail all'amministratore (<a href="mailto:marco.tamborrino.94@gmail.com" className="text-yellow-500 hover:underline">marco.tamborrino.94@gmail.com</a>).</li>
              <li>Revocare l'accesso al sito direttamente dalle impostazioni di sicurezza del tuo account Google.</li>
              <li>Richiedere informazioni su quali dati sono associati alla tua email.</li>
            </ul>
          </section>

          <section className="pt-8 border-t border-[#D4AF37]/20">
            <p className="text-xs text-gray-500 italic">
              Ultimo aggiornamento: 24 Aprile 2026. ManualeCiv è un progetto amatoriale dedicato alla community di Age of Empires IV.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
