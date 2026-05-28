-- Create table for Privacy Policy
CREATE TABLE IF NOT EXISTS privacy_policy (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE privacy_policy ENABLE ROW LEVEL SECURITY;

-- Enable public read access
DROP POLICY IF EXISTS "Public read access for privacy_policy" ON privacy_policy;
CREATE POLICY "Public read access for privacy_policy" ON privacy_policy FOR SELECT USING (true);

-- Enable admin write access (using public fallback like FAQ tables to prevent auth mismatch issues)
DROP POLICY IF EXISTS "Admin write access for privacy_policy" ON privacy_policy;
DROP POLICY IF EXISTS "Public write access for privacy_policy" ON privacy_policy;
CREATE POLICY "Public write access for privacy_policy" ON privacy_policy FOR ALL USING (true) WITH CHECK (true);

-- Insert default row
INSERT INTO privacy_policy (id, title, content)
VALUES (
    'policy',
    'Privacy & Cookie Policy',
    '<h2>1. Introduzione</h2>
<p>Benvenuto su ManualeCiv. La tua privacy è estremamente importante per noi. Questa pagina spiega come raccogliamo, utilizziamo e proteggiamo i tuoi dati personali in conformità con il Regolamento Generale sulla Protezione dei Dati (GDPR) dell''Unione Europea.</p>

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
  <li>Identificare l''autore delle proposte di modifica inviate.</li>
  <li>Gestire la tua lista personalizzata di civiltà preferite.</li>
  <li>Gestire il tuo saldo punti ("Pecore") e le attività correlate alla community.</li>
  <li>Gestire i permessi e i ruoli per i collaboratori del sito (Staff).</li>
  <li>Prevenire abusi o spam sul sistema delle modifiche.</li>
</ul>
<p class="highlight">Non vendiamo, cediamo o condividiamo i tuoi dati con terze parti per scopi commerciali o pubblicitari.</p>

<h2>4. Cookie e Tecnologie di Storage</h2>
<p>Il sito utilizza esclusivamente tecnologie necessarie al funzionamento e al miglioramento dell''esperienza utente:</p>
<ul>
  <li><strong>Cookie Tecnici:</strong> Necessari per gestire l''autenticazione (Google OAuth) e memorizzare il tuo consenso alla privacy.</li>
  <li><strong>Session Storage:</strong> Utilizziamo lo storage temporaneo del browser per funzioni di sessione, come evitare la ricomparsa di popup già chiusi o gestire l''ID temporaneo del contatore presenze. Questi dati vengono eliminati automaticamente alla chiusura della scheda o del browser.</li>
</ul>

<h2>5. Contatore Presenze in Tempo Reale</h2>
<p>Per mostrare la vitalità della community, utilizziamo <strong>Supabase Presence</strong>. Questa tecnologia permette di contare quanti utenti sono online e su quali sezioni del sito si trovano.</p>
<ul>
  <li><strong>Visitatori:</strong> Il tracciamento è totalmente anonimo e basato su un identificativo casuale generato all''accesso.</li>
  <li><strong>Utenti Autenticati:</strong> Per i membri dello staff, la presenza permette il coordinamento in tempo reale sulle modifiche alle civiltà.</li>
  <li><strong>Controllo:</strong> Se scegli di "Rifiutare gli Opzionali" nel banner dei cookie, non verrai incluso nel conteggio globale delle presenze.</li>
</ul>

<h2>6. Sicurezza e Conservazione</h2>
<p>I tuoi dati sono conservati in modo sicuro tramite la piattaforma <strong>Supabase</strong>, che utilizza crittografia avanzata. Le tue password non vengono mai salvate sui nostri server poiché l''autenticazione è gestita esternamente da Google.</p>

<h2>7. I Tuoi Diritti</h2>
<p>In ogni momento puoi:</p>
<ul>
  <li>Richiedere la cancellazione totale dei tuoi dati e del tuo account inviando una mail all''amministratore (<a href="mailto:marco.tamborrino.94@gmail.com">marco.tamborrino.94@gmail.com</a>).</li>
  <li>Revocare l''accesso al sito direttamente dalle impostazioni di sicurezza del tuo account Google.</li>
  <li>Richiedere informazioni su quali dati sono associati alla tua email.</li>
</ul>'
)
ON CONFLICT (id) DO UPDATE 
SET title = EXCLUDED.title, content = EXCLUDED.content;
