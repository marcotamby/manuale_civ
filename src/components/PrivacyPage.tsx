import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './AuthContext';
import { SEO } from './SEO';
import { ArrowLeft, Edit3, Save, X, Loader2, CheckCircle, Shield } from 'lucide-react';
import { WYSIWYGEditor } from './WYSIWYGEditor';

const DEFAULT_CONTENT = `<h2>1. Introduzione</h2>
<p>Benvenuto su ManualeCiv. La tua privacy è estremamente importante per noi. Questa pagina spiega come raccogliamo, utilizziamo e proteggiamo i tuoi dati personali in conformità con il Regolamento Generale sulla Protezione dei Dati (GDPR) dell'Unione Europea.</p>

<h2>2. Dati Raccolti</h2>
<p>Raccogliamo dati personali solo quando decidi volontariamente di autenticarti tramite Google OAuth per interagire con il sito (proporre modifiche o salvare preferiti). I dati raccolti includono:</p>
<ul>
  <li>Nome e Cognome (forniti da Google)</li>
  <li>Indirizzo Email</li>
  <li>Immagine del profilo (opzionale)</li>
</ul>

<h2>3. Finalità del Trattamento</h2>
<p>I tuoi dati vengono utilizzati esclusivamente per:</p>
<ul>
  <li>Identificare l'autore delle proposte di modifica inviate.</li>
  <li>Gestire la tua lista personalizzata di civiltà preferite.</li>
  <li>Gestire il tuo saldo punti ("Pecore") e le attività correlate alla community.</li>
  <li>Gestire i permessi e i ruoli per i collaboratori del sito (Staff).</li>
  <li>Prevenire abusi o spam sul sistema delle modifiche.</li>
</ul>
<p class="highlight">Non vendiamo, cediamo o condividiamo i tuoi dati con terze parti per scopi commerciali o pubblicitari.</p>

<h2>4. Cookie e Tecnologie di Storage</h2>
<p>Il sito utilizza esclusivamente tecnologie necessarie al funzionamento e al miglioramento dell'esperienza utente:</p>
<ul>
  <li><strong>Cookie Tecnici:</strong> Necessari per gestire l'autenticazione (Google OAuth) e memorizzare il tuo consenso alla privacy.</li>
  <li><strong>Session Storage:</strong> Utilizziamo lo storage temporaneo del browser per funzioni di sessione, come evitare la ricomparsa di popup già chiusi o gestire l'ID temporaneo del contatore presenze. Questi dati vengono eliminati automaticamente alla chiusura della scheda o del browser.</li>
</ul>

<h2>5. Contatore Presenze in Tempo Reale</h2>
<p>Per mostrare la vitalità della community, utilizziamo <strong>Supabase Presence</strong>. Questa tecnologia permette di contare quanti utenti sono online e su quali sezioni del sito si trovano.</p>
<ul>
  <li><strong>Visitatori:</strong> Il tracciamento è totalmente anonimo e basato su un identificativo casuale generato all'accesso.</li>
  <li><strong>Utenti Autenticati:</strong> Per i membri dello staff, la presenza permette il coordinamento in tempo reale sulle modifiche alle civiltà.</li>
  <li><strong>Controllo:</strong> Se scegli di "Rifiutare gli Opzionali" nel banner dei cookie, non verrai incluso nel conteggio globale delle presenze.</li>
</ul>

<h2>6. Sicurezza e Conservazione</h2>
<p>I tuoi dati sono conservati in modo sicuro tramite la piattaforma <strong>Supabase</strong>, che utilizza crittografia avanzata. Le tue password non vengono mai salvate sui nostri server poiché l'autenticazione è gestita esternamente da Google.</p>

<h2>7. I Tuoi Diritti</h2>
<p>In ogni momento puoi:</p>
<ul>
  <li>Richiedere la cancellazione totale dei tuoi dati e del tuo account inviando una mail all'amministratore (<a href="mailto:marco.tamborrino.94@gmail.com">marco.tamborrino.94@gmail.com</a>).</li>
  <li>Revocare l'accesso al sito direttamente dalle impostazioni di sicurezza del tuo account Google.</li>
  <li>Richiedere informazioni su quali dati sono associati alla tua email.</li>
</ul>`;

export function PrivacyPage() {
  const navigate = useNavigate();
  const { isSuperAdmin } = useAuth();
  
  const [title, setTitle] = useState("Privacy & Cookie Policy");
  const [content, setContent] = useState(DEFAULT_CONTENT);
  const [loading, setLoading] = useState(true);

  // Modal editing states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [saveLoading, setSaveLoading] = useState(false);
  const [isSaveSuccess, setIsSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPolicy = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('privacy_policy')
          .select('title, content')
          .eq('id', 'policy')
          .maybeSingle();
        
        if (data && !error) {
          setTitle(data.title);
          setContent(data.content);
        }
      } catch (err) {
        console.error("Errore nel caricamento della privacy policy:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchPolicy();
  }, []);

  const openModal = () => {
    setEditTitle(title);
    setEditContent(content);
    setIsModalOpen(false); // Reset first
    setTimeout(() => {
      setIsModalOpen(true);
      setIsSaveSuccess(false);
      setSaveError(null);
    }, 0);
  };

  const handleSave = async () => {
    try {
      setSaveLoading(true);
      setSaveError(null);
      
      const { error } = await supabase
        .from('privacy_policy')
        .upsert({
          id: 'policy',
          title: editTitle,
          content: editContent,
          updated_at: new Date().toISOString()
        });
      
      if (error) throw error;
      
      setTitle(editTitle);
      setContent(editContent);
      setIsSaveSuccess(true);
      
      // Auto-close modal after 2 seconds to let the user see the inline "Salvato!" state
      setTimeout(() => {
        setIsModalOpen(false);
        setIsSaveSuccess(false);
      }, 2000);
    } catch (err: any) {
      console.error("Errore durante il salvataggio della privacy policy:", err);
      setSaveError(`Errore durante il salvataggio: ${err.message || err.details || JSON.stringify(err)}`);
    } finally {
      setSaveLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center lg:bg-transparent bg-[#0a0a0b]">
        <Loader2 className="animate-spin text-sky-400" size={40} />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 h-full lg:bg-transparent bg-[#0a0a0b] text-gray-300 relative z-10 elegant-scrollbar">
      <SEO 
        title="Privacy & Cookie Policy | Manuale Civ"
        description="Leggi l'informativa sulla privacy e cookie policy di Manuale Civ, per capire come trattiamo in totale sicurezza i tuoi dati personali."
      />
      
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <button 
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-sky-400 hover:text-cyan-300 transition-all hover:translate-x-[-4px]"
          >
            <ArrowLeft size={20} />
            <span className="font-sans font-bold uppercase text-xs tracking-widest">Torna alla Home</span>
          </button>

          {isSuperAdmin && (
            <button 
              onClick={openModal}
              className="flex items-center gap-2 px-4 py-2 bg-sky-500/20 text-sky-400 border border-sky-500/30 rounded-lg hover:bg-sky-500/30 transition-all text-xs font-bold uppercase tracking-wider animate-pulse hover:animate-none"
            >
              <Edit3 size={16} /> Modifica Privacy
            </button>
          )}
        </div>

        {/* Main Content Card */}
        <div className="bg-[#0f0f0f]/95 backdrop-blur-2xl p-8 rounded-2xl border border-sky-500/30 shadow-2xl shadow-black/50">
          <h1 className="text-3xl font-bold text-white mb-6 italic font-serif border-b border-sky-500/20 pb-4 flex items-center gap-3">
            <Shield className="text-sky-400" size={28} />
            {title}
          </h1>
          
          <div 
            className="prose prose-invert max-w-none text-sm leading-relaxed space-y-6 text-gray-300
              [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-sky-400 [&_h2]:mt-8 [&_h2]:mb-4 [&_h2]:border-b [&_h2]:border-white/5 [&_h2]:pb-2
              [&_p]:mb-4
              [&_ul]:list-disc [&_ul]:ml-6 [&_ul]:mt-2 [&_ul]:space-y-2
              [&_li]:mb-1
              [&_a]:text-sky-400 [&_a]:hover:underline [&_a]:transition-colors
              [&_strong]:text-white
              [&_p.highlight]:mt-4 [&_p.highlight]:p-4 [&_p.highlight]:bg-sky-500/10 [&_p.highlight]:border-l-4 [&_p.highlight]:border-sky-400 [&_p.highlight]:text-white [&_p.highlight]:italic [&_p.highlight]:font-medium [&_p.highlight]:rounded-r-lg"
            dangerouslySetInnerHTML={{ __html: content }} 
          />

          <section className="pt-8 border-t border-sky-500/20 mt-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <p className="text-xs text-gray-500 italic flex-1">
              Ultimo aggiornamento effettuato. ManualeCiv è un progetto amatoriale dedicato alla community di Age of Empires IV.
            </p>
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('open-cookie-settings'))}
              className="text-xs font-bold uppercase tracking-wider text-sky-400 hover:text-cyan-300 transition-colors bg-sky-500/10 hover:bg-sky-500/20 px-4 py-2 rounded-lg border border-sky-500/30 shrink-0 cursor-pointer self-start sm:self-auto"
            >
              Gestisci Cookie
            </button>
          </section>
        </div>
      </div>

      {/* Edit Modal - Rendered via React Portal */}
      {isModalOpen && createPortal(
        <div 
          className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setIsModalOpen(false)}
        >
          <div 
            className="bg-[#0f0f0f] border border-sky-500/30 rounded-2xl max-w-4xl w-full max-h-[95vh] flex flex-col shadow-2xl shadow-sky-500/20 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/5">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Edit3 className="text-sky-400" size={20} />
                Modifica Privacy & Cookie Policy
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/5"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1 elegant-scrollbar">
              {saveError && (
                <div className="p-3 bg-red-950/50 border border-red-500/35 text-red-200 text-xs rounded-lg whitespace-pre-wrap">
                  {saveError}
                </div>
              )}
              
              <div className="space-y-1">
                <label className="text-xs font-bold text-sky-400 uppercase tracking-wider">Titolo Pagina</label>
                <input 
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:border-sky-400 focus:outline-none transition-all text-sm font-medium"
                  placeholder="Es. Privacy & Cookie Policy"
                />
              </div>

              <div className="space-y-1 flex-1 flex flex-col">
                <label className="text-xs font-bold text-sky-400 uppercase tracking-wider mb-2">Contenuto Pagina</label>
                <WYSIWYGEditor 
                  initialValue={editContent} 
                  onChange={setEditContent} 
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-white/5 flex justify-end gap-3">
              <button 
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-all text-xs font-bold uppercase tracking-wider"
              >
                Annulla
              </button>
              
              <button 
                type="button"
                onClick={handleSave}
                disabled={saveLoading || isSaveSuccess}
                className={`flex items-center justify-center gap-2 px-5 py-2 rounded-lg transition-all duration-300 text-xs font-bold uppercase tracking-wider shadow-lg disabled:opacity-50 min-w-[120px] ${
                  isSaveSuccess 
                    ? 'bg-[#00ff9f] text-[#0d1424] shadow-[0_0_20px_rgba(0,255,159,0.6)] scale-105' 
                    : 'bg-sky-500 text-white hover:bg-sky-400 shadow-sky-500/20'
                }`}
              >
                {saveLoading ? (
                  <Loader2 className="animate-spin" size={14} />
                ) : isSaveSuccess ? (
                  <CheckCircle size={14} className="animate-in zoom-in" />
                ) : (
                  <Save size={14} />
                )}
                {isSaveSuccess ? 'Salvato!' : 'Salva'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}


