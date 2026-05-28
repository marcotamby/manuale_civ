import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './AuthContext';
import { SEO } from './SEO';
import { clsx } from 'clsx';
import { 
  ArrowLeft, Edit3, Save, X, Loader2, CheckCircle, Shield,
  AlignLeft, AlignCenter, AlignRight, AlignJustify, Link as LinkIcon, ExternalLink, ChevronDown
} from 'lucide-react';

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
  const [supabaseSession, setSupabaseSession] = useState<string>("Verifica in corso...");

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

  const checkSession = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setSupabaseSession(`Autenticato su Supabase: ${session.user.email} (Ruolo DB: ${session.user.role})`);
      } else {
        setSupabaseSession("Non autenticato su Supabase (Ruolo DB: anon)");
      }
    } catch (err: any) {
      setSupabaseSession(`Errore verifica sessione: ${err.message}`);
    }
  };

  const openModal = () => {
    setEditTitle(title);
    setEditContent(content);
    setIsModalOpen(false); // Reset first
    checkSession();
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
        <Loader2 className="animate-spin text-blue-400" size={40} />
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
            className="flex items-center gap-2 text-blue-400 hover:text-cyan-300 transition-all hover:translate-x-[-4px]"
          >
            <ArrowLeft size={20} />
            <span className="font-sans font-bold uppercase text-xs tracking-widest">Torna alla Home</span>
          </button>

          {isSuperAdmin && (
            <button 
              onClick={openModal}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-lg hover:bg-blue-600/30 transition-all text-xs font-bold uppercase tracking-wider animate-pulse hover:animate-none"
            >
              <Edit3 size={16} /> Modifica Privacy
            </button>
          )}
        </div>

        {/* Main Content Card */}
        <div className="bg-[#0f0f0f]/95 backdrop-blur-2xl p-8 rounded-2xl border border-blue-500/30 shadow-2xl shadow-black/50">
          <h1 className="text-3xl font-bold text-white mb-6 italic font-serif border-b border-blue-500/20 pb-4 flex items-center gap-3">
            <Shield className="text-blue-400" size={28} />
            {title}
          </h1>
          
          <div 
            className="prose prose-invert max-w-none text-sm leading-relaxed space-y-6 text-gray-300
              [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-blue-400 [&_h2]:mt-8 [&_h2]:mb-4 [&_h2]:border-b [&_h2]:border-white/5 [&_h2]:pb-2
              [&_p]:mb-4
              [&_ul]:list-disc [&_ul]:ml-6 [&_ul]:mt-2 [&_ul]:space-y-2
              [&_li]:mb-1
              [&_a]:text-blue-400 [&_a]:hover:underline [&_a]:transition-colors
              [&_strong]:text-white
              [&_p.highlight]:mt-4 [&_p.highlight]:p-4 [&_p.highlight]:bg-blue-500/5 [&_p.highlight]:border-l-4 [&_p.highlight]:border-blue-500 [&_p.highlight]:text-white [&_p.highlight]:italic [&_p.highlight]:font-medium [&_p.highlight]:rounded-r-lg"
            dangerouslySetInnerHTML={{ __html: content }} 
          />

          <section className="pt-8 border-t border-blue-500/20 mt-8">
            <p className="text-xs text-gray-500 italic">
              Ultimo aggiornamento effettuato. ManualeCiv è un progetto amatoriale dedicato alla community di Age of Empires IV.
            </p>
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
            className="bg-[#0f0f0f] border border-blue-500/30 rounded-2xl max-w-4xl w-full max-h-[95vh] flex flex-col shadow-2xl shadow-blue-500/20 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/5">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Edit3 className="text-blue-400" size={20} />
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
              <div className="p-2.5 bg-blue-950/25 border border-blue-500/20 text-blue-300 text-xs rounded-lg flex items-center gap-2">
                <div className={clsx("w-2 h-2 rounded-full", supabaseSession.includes("Autenticato") ? "bg-green-400" : "bg-red-400")}></div>
                {supabaseSession}
              </div>

              {saveError && (
                <div className="p-3 bg-red-950/50 border border-red-500/35 text-red-200 text-xs rounded-lg whitespace-pre-wrap">
                  {saveError}
                </div>
              )}
              
              <div className="space-y-1">
                <label className="text-xs font-bold text-blue-400 uppercase tracking-wider">Titolo Pagina</label>
                <input 
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:border-blue-400 focus:outline-none transition-all text-sm font-medium"
                  placeholder="Es. Privacy & Cookie Policy"
                />
              </div>

              <div className="space-y-1 flex-1 flex flex-col">
                <label className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-2">Contenuto Pagina</label>
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
                    : 'bg-blue-600 text-white hover:bg-blue-500 shadow-blue-600/20'
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

function WYSIWYGEditor({ initialValue, onChange }: { initialValue: string, onChange: (html: string) => void }) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [activeStyles, setActiveStyles] = useState({ 
    bold: false, italic: false, underline: false,
    alignLeft: false, alignCenter: false, alignRight: false, alignJustify: false,
    font: 'Inter',
    h2: false,
    link: false
  });

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== initialValue) {
      editorRef.current.innerHTML = initialValue || '';
    }
  }, []);

  const checkActiveStyles = () => {
    if (typeof document === 'undefined') return;
    const block = document.queryCommandValue('formatBlock');
    
    let isH2 = block === 'h2' || block === 'H2';
    if (!isH2) {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        let node: Node | null = selection.anchorNode;
        while (node && node !== editorRef.current) {
          if (node.nodeName === 'H2') {
            isH2 = true;
            break;
          }
          node = node.parentNode;
        }
      }
    }

    setActiveStyles({
      bold: document.queryCommandState('bold') && !isH2,
      italic: document.queryCommandState('italic'),
      underline: document.queryCommandState('underline'),
      alignLeft: document.queryCommandState('justifyLeft'),
      alignCenter: document.queryCommandState('justifyCenter'),
      alignRight: document.queryCommandState('justifyRight'),
      alignJustify: document.queryCommandState('justifyFull'),
      font: (document.queryCommandValue('fontName') || 'Inter').replace(/['"]/g, ''),
      h2: isH2,
      link: document.queryCommandState('createLink')
    });
  };

  const handleAddLink = (asButton: boolean = false) => {
    const url = prompt("Inserisci l'URL (es: https://google.com):");
    if (!url) return;
    
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.toString().length === 0) {
      const text = prompt("Testo da visualizzare:", asButton ? "CLICCA QUI" : "Link");
      if (!text) return;
      
      const html = asButton 
        ? `<a href="${url}" target="_blank" class="premium-link-button">${text}</a>`
        : `<a href="${url}" target="_blank">${text}</a>`;
      document.execCommand('insertHTML', false, html);
    } else {
      if (asButton) {
        const text = selection.toString();
        document.execCommand('insertHTML', false, `<a href="${url}" target="_blank" class="premium-link-button">${text}</a>`);
      } else {
        document.execCommand('createLink', false, url);
        const anchor = selection.anchorNode?.parentElement;
        if (anchor && anchor.tagName === 'A') {
          anchor.setAttribute('target', '_blank');
        }
      }
    }
    handleInput();
  };

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  return (
    <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300 text-left">
      <div className="flex flex-wrap gap-2 mb-1 p-2 bg-black/60 rounded-2xl border border-white/10 sticky top-0 z-20 backdrop-blur-md shadow-xl">
        <div className="flex items-center gap-1 pr-2 border-r border-white/10">
          {[
            { cmd: 'bold', label: 'B', title: 'Grassetto', active: activeStyles.bold, className: 'font-bold' },
            { cmd: 'italic', label: 'I', title: 'Corsivo', active: activeStyles.italic, className: 'italic font-serif' },
            { cmd: 'underline', label: 'U', title: 'Sottolineato', active: activeStyles.underline, className: 'underline' }
          ].map(tool => (
            <button 
              key={tool.cmd}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); document.execCommand(tool.cmd, false); checkActiveStyles(); }} 
              className={clsx(
                "p-2 rounded-lg transition-all w-10 h-10 flex items-center justify-center text-sm font-bold",
                tool.active ? "bg-blue-500 text-white shadow-lg scale-110" : "hover:bg-white/10 text-white"
              )} 
              title={tool.title}
            >
              <span className={tool.className}>{tool.label}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 px-2 border-r border-white/10">
          {[
            { cmd: 'justifyLeft', icon: AlignLeft, active: activeStyles.alignLeft },
            { cmd: 'justifyCenter', icon: AlignCenter, active: activeStyles.alignCenter },
            { cmd: 'justifyRight', icon: AlignRight, active: activeStyles.alignRight },
            { cmd: 'justifyFull', icon: AlignJustify, active: activeStyles.alignJustify }
          ].map(tool => (
            <button 
              key={tool.cmd}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); document.execCommand(tool.cmd, false); checkActiveStyles(); }} 
              className={clsx(
                "p-2 rounded-lg transition-all w-10 h-10 flex items-center justify-center",
                tool.active ? "bg-blue-500 text-white shadow-lg scale-110" : "text-slate-300 hover:text-white hover:bg-white/10"
              )}
            >
              <tool.icon size={18}/>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 px-2 border-r border-white/10">
          <button 
            type="button"
            onMouseDown={(e) => { e.preventDefault(); handleAddLink(false); }} 
            className={clsx(
              "p-2 rounded-lg transition-all w-10 h-10 flex items-center justify-center",
              activeStyles.link ? "bg-blue-500 text-white shadow-lg scale-110" : "text-slate-300 hover:text-white hover:bg-white/10"
            )}
            title="Inserisci Link"
          >
            <LinkIcon size={18}/>
          </button>
          <button 
            type="button"
            onMouseDown={(e) => { e.preventDefault(); handleAddLink(true); }} 
            className="p-2 px-3 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-[10px] font-black uppercase tracking-tighter hover:brightness-110 transition-all shadow-lg flex items-center gap-1.5 h-10"
            title="Inserisci Bottone Premium"
          >
            <ExternalLink size={14}/>
            BOTTONE
          </button>
        </div>

        <div className="flex items-center gap-2 px-2 border-r border-white/10 relative group/font">
          <select 
            value={activeStyles.font}
            onChange={(e) => { 
              document.execCommand('fontName', false, e.target.value); 
              checkActiveStyles();
            }}
            className="bg-white/10 border border-white/20 rounded-xl text-[10px] py-2 px-3 text-white outline-none focus:border-blue-500/50 cursor-pointer hover:bg-white/20 transition-all font-black uppercase tracking-widest appearance-none pr-8 min-w-[120px] h-10"
          >
            <option value="Inter" className="bg-[#121620]">INTER</option>
            <option value="Playfair Display" className="bg-[#121620]">SERIF</option>
            <option value="Roboto Mono" className="bg-[#121620]">MONO</option>
            <option value="Outfit" className="bg-[#121620]">MODERN</option>
          </select>
          <ChevronDown size={12} className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-400 pointer-events-none" />
        </div>

        <div className="flex items-center gap-1 px-2 border-r border-white/10">
          <button 
            type="button"
            onMouseDown={(e) => { 
              e.preventDefault(); 
              const isH2 = activeStyles.h2;
              document.execCommand('formatBlock', false, isH2 ? 'p' : 'h2');
              setTimeout(() => {
                checkActiveStyles();
                handleInput();
              }, 10);
            }} 
            className={clsx(
              "p-2 rounded-lg font-black text-[10px] px-4 transition-all uppercase tracking-tighter h-10 flex items-center justify-center",
              activeStyles.h2 ? "bg-blue-500 text-white shadow-lg scale-110" : "hover:bg-white/10 text-white"
            )} 
            title="Titolo Grande"
          >
            TITOLO H2
          </button>
        </div>

        <div className="relative flex items-center justify-center">
          <button 
            type="button" 
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className={clsx(
              "p-2 rounded-lg text-lg flex items-center justify-center w-10 h-10 transition-transform hover:scale-110 active:scale-95",
              showEmojiPicker ? "bg-white/20" : "hover:bg-white/10"
            )}
          >
            😀
          </button>
          {showEmojiPicker && (
            <div className="absolute bottom-full left-0 mb-4 p-4 bg-[#0d1117] border border-white/10 rounded-[2rem] grid grid-cols-5 gap-3 z-[100] shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-3xl animate-in fade-in slide-in-from-bottom-4 duration-300 border-b-blue-500 w-[280px]">
              {['🏆','🎮','⚔️','🏰','🎖️','🥇','🥈','🥉','📜','⚖️','📢','🔴','🟢','🔵','⭐','🔥','⚡','💎','🛡️','👑'].map(emoji => (
                <button 
                  key={emoji}
                  type="button"
                  onMouseDown={(e) => { 
                    e.preventDefault(); 
                    document.execCommand('insertText', false, emoji); 
                    handleInput();
                    setShowEmojiPicker(false);
                  }}
                  className="w-10 h-10 flex items-center justify-center hover:bg-white/20 rounded-2xl text-2xl transition-all hover:scale-125"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      
      <div 
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onMouseUp={checkActiveStyles}
        onKeyUp={checkActiveStyles}
        onFocus={checkActiveStyles}
        onPaste={(e) => {
          e.preventDefault();
          const html = e.clipboardData.getData('text/html');
          const text = e.clipboardData.getData('text/plain');
          
          if (html) {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            
            const sanitize = (node: Node): string => {
              if (node.nodeType === Node.TEXT_NODE) return node.textContent || '';
              if (node.nodeType !== Node.ELEMENT_NODE) return '';
              
              const el = node as HTMLElement;
              const tag = el.tagName.toLowerCase();
              const innerHTML = Array.from(el.childNodes).map(sanitize).join('');
              
              if (tag === 'h2') return `<h2>${innerHTML}</h2>`;
              if (tag === 'p') return `<p>${innerHTML}</p>`;
              if (tag === 'ul') return `<ul>${innerHTML}</ul>`;
              if (tag === 'ol') return `<ol>${innerHTML}</ol>`;
              if (tag === 'li') return `<li>${innerHTML}</li>`;
              if (tag === 'br') return '<br>';
              if (tag === 'table') return `<table>${innerHTML}</table>`;
              if (tag === 'tr') return `<tr>${innerHTML}</tr>`;
              if (tag === 'td') return `<td>${innerHTML}</td>`;
              if (tag === 'th') return `<th>${innerHTML}</th>`;
              
              let result = innerHTML;
              const style = el.style;
              const isInline = ['span', 'b', 'strong', 'i', 'em', 'u', 'a'].includes(tag);
              const isBold = ['b', 'strong'].includes(tag) || (isInline && (style.fontWeight === 'bold' || parseInt(style.fontWeight) >= 600));
              const isItalic = ['i', 'em'].includes(tag) || (isInline && style.fontStyle === 'italic');
              const isUnderline = tag === 'u' || (isInline && style.textDecoration.includes('underline'));
              
              if (isBold) result = `<b>${result}</b>`;
              if (isItalic) result = `<i>${result}</i>`;
              if (isUnderline) result = `<u>${result}</u>`;
              return result;
            };

            const cleanedHTML = Array.from(doc.body.childNodes).map(sanitize).join('');
            document.execCommand('removeFormat', false);
            document.execCommand('insertHTML', false, cleanedHTML);
          } else {
            document.execCommand('insertText', false, text);
          }
          handleInput();
        }}
        className="w-full bg-black/40 border border-white/10 p-8 rounded-[2rem] text-white text-base outline-none focus:border-blue-500/40 transition-all min-h-[300px] max-h-[40vh] overflow-y-auto shadow-inner text-left elegant-scrollbar"
        style={{ textAlign: 'left' }}
      ></div>
      <p className="text-[9px] text-gray-500 italic px-4">Modifica il testo sopra. Clicca sui tasti per applicare lo stile alla selezione.</p>
    </div>
  );
}
