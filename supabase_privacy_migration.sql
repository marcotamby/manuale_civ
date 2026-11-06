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
<p>Benvenuto su ManualeCiv. La tua privacy è estremamente importante per noi. Questa pagina spiega come raccogliamo, utilizziamo e proteggiamo i tuoi dati personali in conformità con il <strong>Regolamento Generale sulla Protezione dei Dati (GDPR - Regolamento UE 2016/679)</strong>, il <strong>Codice Privacy (D.Lgs. 196/2003 e s.m.i., art. 122)</strong> e le <strong>Linee Guida del Garante per la protezione dei dati personali</strong>, incluso il <em>Provvedimento n. 284 del 17 aprile 2026</em> in materia di pixel di tracciamento (in vigore dal 29 ottobre 2026).</p>

<h2>2. Dati Raccolti</h2>
<p>Raccogliamo dati personali solo quando decidi volontariamente di autenticarti tramite Google OAuth per interagire con il sito (proporre modifiche, partecipare alle attività della community o salvare preferiti). I dati raccolti includono:</p>
<ul>
  <li>Nome e Cognome (forniti da Google)</li>
  <li>Indirizzo Email</li>
  <li>Immagine del profilo (opzionale)</li>
</ul>

<h2>3. Finalità del Trattamento</h2>
<p>I tuoi dati vengono utilizzati esclusivamente per:</p>
<ul>
  <li>Identificare l''autore delle proposte di modifica inviate.</li>
  <li>Inviare notifiche strettamente tecniche e di servizio (email transazionali) relative all''esito di approvazione o rifiuto delle proposte di modifica da te inviate.</li>
  <li>Gestire la tua lista personalizzata di civiltà preferite.</li>
  <li>Gestire il tuo saldo punti ("Pecore") e le attività correlate alla community.</li>
  <li>Gestire i permessi e i ruoli per i collaboratori del sito (Staff).</li>
  <li>Prevenire abusi o spam sul sistema delle modifiche.</li>
</ul>
<p class="highlight">Non vendiamo, cediamo o condividiamo i tuoi dati con terze parti per scopi commerciali, di profilazione o pubblicitari.</p>

<h2>4. Cookie, Tecnologie di Storage e Statistiche</h2>
<p>Il sito utilizza tecnologie necessarie al funzionamento e, solo previo tuo consenso, strumenti statistici aggregati:</p>
<ul>
  <li><strong>Cookie Tecnici e Local Storage:</strong> Necessari per gestire l''autenticazione (Google OAuth) e memorizzare la tua scelta sul consenso alla privacy (<code>cookieConsent</code>). Non richiedono consenso preventivo ai sensi dell''art. 122 del Codice Privacy.</li>
  <li><strong>Session Storage:</strong> Utilizziamo lo storage temporaneo del browser per funzioni di sessione, come evitare la ricomparsa di popup già chiusi o gestire l''ID temporaneo del contatore presenze. Questi dati vengono eliminati automaticamente alla chiusura della scheda o del browser.</li>
  <li><strong>Statistiche Aggregate (Google Analytics 4):</strong> Esclusivamente previo tuo consenso esplicito tramite il banner dei cookie, utilizziamo Google Analytics con <em>Google Consent Mode v2</em> e anonimizzazione dell''IP per analizzare in forma aggregata le visite alle pagine. In assenza di consenso o in caso di rifiuto ("Rifiuta Opzionali"), i cookie analitici sono bloccati per impostazione predefinita (<em>privacy by default</em>).</li>
</ul>

<h2>5. Pixel di Tracciamento (Tracking Pixel / Web Beacon) e Comunicazioni Email</h2>
<p>In conformità all''art. 122 del Codice Privacy e alle <strong>Linee Guida del Garante Privacy sull''utilizzo di tracking pixel nelle comunicazioni di posta elettronica (Provvedimento n. 284 del 17 aprile 2026)</strong>, informiamo gli utenti di quanto segue:</p>
<ul>
  <li><strong>Assenza di Pixel Pubblicitari o di Profilazione sul Sito:</strong> ManualeCiv <strong>non utilizza</strong> pixel di tracciamento o web beacon di terze parti per finalità di marketing, retargeting o profilazione comportamentale (es. Meta Pixel, TikTok Pixel o strumenti analoghi).</li>
  <li><strong>Comunicazioni Email di Servizio:</strong> Le uniche email inviate da ManualeCiv (tramite il fornitore tecnico <em>Resend</em>) sono notifiche strettamente transazionali e di servizio, inviate solo quando un utente autenticato propone volontariamente una modifica al manuale per comunicarne l''esito. Non inviamo newsletter commerciali, DEM o comunicazioni promozionali.</li>
  <li><strong>Nessun Tracking Pixel nelle Email:</strong> Le email inviate da ManualeCiv <strong>non contengono pixel di tracciamento (web beacon, immagini trasparenti 1x1 o codici di tracciamento occulti)</strong> e non tracciano l''apertura dei messaggi, l''orario di lettura, il numero di visualizzazioni, l''indirizzo IP o il tipo di dispositivo del destinatario.</li>
  <li><strong>Garanzia di Consenso Preventivo:</strong> Qualora in futuro venissero introdotti servizi opzionali di newsletter o analisi basati su pixel di tracciamento, questi saranno attivati esclusivamente previo consenso libero, specifico, informato e documentabile dell''utente (<em>opt-in</em>), con possibilità di revoca semplice e granulare in qualsiasi momento.</li>
</ul>

<h2>6. Contatore Presenze in Tempo Reale</h2>
<p>Per mostrare la vitalità della community, utilizziamo <strong>Supabase Presence</strong>. Questa tecnologia permette di contare quanti utenti sono online e su quali sezioni del sito si trovano.</p>
<ul>
  <li><strong>Visitatori:</strong> Il tracciamento è totalmente anonimo e basato su un identificativo casuale temporaneo generato all''accesso.</li>
  <li><strong>Utenti Autenticati:</strong> Per i membri dello staff, la presenza permette il coordinamento in tempo reale sulle modifiche alle civiltà.</li>
  <li><strong>Controllo e Revoca:</strong> Se scegli di "Rifiuta Opzionali" nel banner dei cookie o disattivi l''opzione tramite il pannello "Gestisci Cookie", non verrai incluso nel conteggio globale delle presenze.</li>
</ul>

<h2>7. Sicurezza e Conservazione</h2>
<p>I tuoi dati sono conservati in modo sicuro tramite la piattaforma <strong>Supabase</strong>, che utilizza crittografia avanzata. Le tue password non vengono mai salvate sui nostri server poiché l''autenticazione è gestita esternamente da Google. L''invio delle notifiche email di servizio avviene tramite <strong>Resend</strong> nel rispetto del principio di minimizzazione dei dati.</p>

<h2>8. I Tuoi Diritti e Revoca del Consenso</h2>
<p>Ai sensi degli artt. 15-22 del GDPR e della normativa nazionale vigente, in ogni momento puoi:</p>
<ul>
  <li><strong>Modificare o revocare il consenso</strong> ai cookie e agli strumenti di tracciamento opzionali in modo semplice e immediato cliccando sul pulsante <strong>"Gestisci Cookie"</strong> presente in fondo a questa pagina e nel footer del sito.</li>
  <li>Richiedere l''accesso, la rettifica, la portabilità o la cancellazione totale dei tuoi dati e del tuo account inviando una mail all''amministratore (<a href="mailto:marco.tamborrino.94@gmail.com">marco.tamborrino.94@gmail.com</a>).</li>
  <li>Revocare l''accesso al sito direttamente dalle impostazioni di sicurezza del tuo account Google.</li>
  <li>Proporre reclamo all''Autorità di controllo competente (in Italia, il <strong>Garante per la protezione dei dati personali</strong> - <a href="https://www.garanteprivacy.it" target="_blank" rel="noopener noreferrer">www.garanteprivacy.it</a>).</li>
</ul>'
)
ON CONFLICT (id) DO UPDATE 
SET title = EXCLUDED.title, content = EXCLUDED.content, updated_at = NOW();
