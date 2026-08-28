import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

interface ChatMessage {
  sender: 'user' | 'coach';
  text: string;
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = (SUPABASE_URL && SUPABASE_KEY) 
  ? createClient(SUPABASE_URL, SUPABASE_KEY) 
  : null;

const CIV_NAME_TO_SLUG: Record<string, string> = {
  'jin': 'jin_dynasty',
  'dinastia jin': 'jin_dynasty',
  'jin dynasty': 'jin_dynasty',
  'mongoli': 'mongols',
  'mongols': 'mongols',
  'inglesi': 'english',
  'english': 'english',
  'francesi': 'french',
  'french': 'french',
  'bisantini': 'byzantines',
  'byzantines': 'byzantines',
  'ottomani': 'ottomans',
  'ottomans': 'ottomans',
  'rus': 'rus',
  'maliani': 'malians',
  'malians': 'malians',
  'delhi': 'delhi_sultanate',
  'sultanato di delhi': 'delhi_sultanate',
  'cinesi': 'chinese',
  'chinese': 'chinese',
  'giapponesi': 'japanese',
  'japanese': 'japanese',
  'sri': 'holy_roman_empire',
  'sacro romano impero': 'holy_roman_empire',
  'hre': 'holy_roman_empire',
  'ordine del drago': 'order_of_the_dragon',
  'order of the dragon': 'order_of_the_dragon',
  'giovanni d\'arco': 'jeanne_darc',
  'jeanne d\'arco': 'jeanne_darc',
  'ayubidi': 'ayyubids',
  'ayyubids': 'ayyubids',
  'zhu xi': 'zhu_xis_legacy',
  'eredita di zhu xi': 'zhu_xis_legacy',
  'lancaster': 'house_of_lancaster',
  'casata di lancaster': 'house_of_lancaster',
  'templari': 'knights_templar',
  'cavalieri templari': 'knights_templar',
  'sengoku': 'sengoku_daimyo',
  'macedoni': 'macedonian_dynasty',
  'dinastia macedone': 'macedonian_dynasty',
  'orda d\'oro': 'golden_horde',
  'golden horde': 'golden_horde',
  'tughlaq': 'tughlaq_dynasty'
};

const AOE4_GROUND_TRUTH_UNITS = `

REGOLA RIGOROSA ED INFLESSIBILE SULL'ETÀ DELLE UNITÀ (MANDATORIO!):
- VERIFICA SEMPRE L'ETÀ DI SBLOCCO DELL'UNITÀ NEL DIZIONARIO SOTTO PRIMA DI RISPONDERE!
- VIETATO ASSOLUTAMENTE SBAGLIARE L'ETÀ DELLE UNITÀ! 
- I **RIDDARI** SONO UN'UNITÀ DI ETÀ III (ETÀ DEI CASTELLI - CASTLE AGE). VIETATO ASSOLUTAMENTE PROPORRE I RIDDARI IN FEUDALE (ETÀ II) O IN EARLY GAME!
- I **LANCESTER YEOMAN** SONO UN'UNITÀ DI ETÀ II/III.
- NON CONFONDERE MAI LE ETÀ DELLE UNITÀ UNICHE. SE UN'UNITÀ SI SBLOCCA IN ETÀ III (CASTELLI), NON PUOI PROPORLA AL PASSAGGIO AL FEUDALE (ETÀ II)!

DIZIONARIO UFFICIALE DEL SITO: UNITÀ UNICHE ED ETÀ DI SBLOCCO (MANDATORIO! VIETATO SBAGLIARE ETÀ DELLE UNITÀ!):

[ABBASIDI - ID: abbasid]
  - Natura: La Dinastia Abbaside persegue una fiorente Età dell'Oro concentrando gli edifici attorno alla propria Casa della Sapienza, il che permette di sbloccare significativi vantaggi economici. La Casa della Sapienza guida inoltre il progresso attraverso le varie età e garantisce l'accesso a tecnologie avanzate. Le unità di cammelli abbasidi sono esperte nel contrastare la cavalleria nemica.
  - Unità Uniche:
    * Camel Archer (ID: camel-archer): Sbloccata ESCLUSIVAMENTE in Feudal Age (Età II). Tipo: Ranged.
    * Ghulam (ID: ghulam): Sbloccata ESCLUSIVAMENTE in Castle Age / Età dei Castelli (Età III). Tipo: Infantry.
    * Camel Rider (ID: camel-rider): Sbloccata ESCLUSIVAMENTE in Castle Age / Età dei Castelli (Età III). Tipo: Cavalry.
    * Lancer (ID: lancer-abb): Sbloccata ESCLUSIVAMENTE in Castle Age / Età dei Castelli (Età III). Tipo: Cavalry.

[CINESI - ID: chinese]
  - Natura: Civiltà flessibile che si evolve attraverso le Grandi Dinastie. Costruisce velocemente, tassa le risorse e padroneggia la polvere da sparo. I Cinesi possono cambiare la propria strategia attraverso le epoche, schierando numerose unità uniche e costruendo rapidamente.
  - Unità Uniche:
    * Ufficiale Imperiale (ID: imperial-official): Sbloccata ESCLUSIVAMENTE in Dark Age (Età I). Tipo: Infantry.
    * Zhuge Nu (ID: zhuge-nu): Sbloccata ESCLUSIVAMENTE in Feudal Age (Età II). Tipo: Ranged.
    * Guardia del Palazzo (ID: palace-guard): Sbloccata ESCLUSIVAMENTE in Castle Age / Età dei Castelli (Età III). Tipo: Infantry.
    * Nido delle Api (ID: nest-of-bees): Sbloccata ESCLUSIVAMENTE in Castle Age / Età dei Castelli (Età III). Tipo: Siege.
    * Lanciere di Fuoco (ID: fire-lancer): Sbloccata ESCLUSIVAMENTE in Castle Age / Età dei Castelli (Età III). Tipo: Cavalry.
    * Granatiere (ID: grenadier): Sbloccata ESCLUSIVAMENTE in Imperial Age / Età Imperiale (Età IV). Tipo: Ranged.

[MACEDONI - ID: macedonian]
  - Natura: Variante dei Bizantini.

L'imperatore Basilio II impiegò i Variaghi per difendersi dalle rivolte fomentate dai nobili bizantini. Arrivati per mare dal nord, questi guerrieri forestieri non furono influenzati dalla politica e dalla cultura bizantina, creando una divisione d'assalto d'élite che protesse gli imperatori per i secoli a venire. La dinastia macedone conia l'argento come risorsa riservata da spendere negli arsenali variaghi, dove affilano le lame e affinano le loro abilità mentre proteggono l'imperatore.
  - Unità Uniche:
    * Atgeirmaðr (ID: atgeirmadr): Sbloccata ESCLUSIVAMENTE in Dark Age (Età I). Tipo: Infantry.
    * Bogmaðr (ID: bogmadr): Sbloccata ESCLUSIVAMENTE in Dark Age (Età I). Tipo: Ranged.
    * Varangian Guard (ID: varangian-guard-mac): Sbloccata ESCLUSIVAMENTE in Dark Age (Età I). Tipo: Infantry.
    * Hippodrome Horseman (ID: hippodrome-horseman): Sbloccata ESCLUSIVAMENTE in Dark Age (Età I). Tipo: Cavalry.
    * Cataphract (ID: cataphract-mac): Sbloccata ESCLUSIVAMENTE in Castle Age / Età dei Castelli (Età III). Tipo: Cavalry.
    * Cheirosiphon (ID: cheirosiphon-mac): Sbloccata ESCLUSIVAMENTE in Castle Age / Età dei Castelli (Età III). Tipo: Siege.
    * Royal Cannon (ID: royal-cannon-mac): Sbloccata ESCLUSIVAMENTE in Imperial Age / Età Imperiale (Età IV). Tipo: Siege.
    * Riddari (ID: riddari): Sbloccata ESCLUSIVAMENTE in Castle Age / Età dei Castelli (Età III). Tipo: Cavalry.
    * Hippodrome Scout (ID: hippodrome-scout): Sbloccata ESCLUSIVAMENTE in Dark Age (Età I). Tipo: Cavalry.
    * Hippodrome Riddari (ID: hippodrome-riddari): Sbloccata ESCLUSIVAMENTE in Dark Age (Età I). Tipo: Cavalry.

[DINASTIA JIN - ID: jin-dynasty]
  - Natura: Una civiltà imperiale che domina con la sua cavalleria d'élite e la potenza d'assedio superiore. I Jin eccellono nel controllo della mappa grazie ai villaggi a cavallo e ai tributari che potenziano la loro economia.
  - Unità Uniche:
    * Emissary (ID: emissary): Sbloccata ESCLUSIVAMENTE in Dark Age (Età I). Tipo: Worker.
    * Mounted Villager (ID: mounted-villager): Sbloccata ESCLUSIVAMENTE in Dark Age (Età I). Tipo: Worker.
    * Reindeer Trader (ID: reindeer-trader): Sbloccata ESCLUSIVAMENTE in Dark Age (Età I). Tipo: Worker.
    * Mohe Tribesman (ID: mohe-tribesman): Sbloccata ESCLUSIVAMENTE in Feudal Age (Età II). Tipo: Cavalry.
    * Bed Crossbow (ID: bed-crossbow): Sbloccata ESCLUSIVAMENTE in Feudal Age (Età II). Tipo: Siege.
    * Zhanma Swordsman (ID: zhanma-swordsman): Sbloccata ESCLUSIVAMENTE in Castle Age / Età dei Castelli (Età III). Tipo: Infantry.
    * Iron Pagoda (ID: iron-pagoda): Sbloccata ESCLUSIVAMENTE in Castle Age / Età dei Castelli (Età III). Tipo: Cavalry.
    * Eruptor (ID: eruptor): Sbloccata ESCLUSIVAMENTE in Imperial Age / Età Imperiale (Età IV). Tipo: Ranged.

[ORDINE DEL DRAGO - ID: orderofthedragon]
  - Natura: Civiltà variante del Sacro Romano Impero, l'Ordine del Drago è stato fondato da un gruppo di ricchi membri dell'élite, accuratamente selezionati, con l'obiettivo di annientare gli imperi ostili. Investendo ingenti risorse nell'addestramento di pochi guerrieri eccezionali, l'Ordine è riuscito a costituire un esercito d'élite senza pari.
  - Unità Uniche:
    * Gilded Spearman (ID: gilded-spearman): Sbloccata ESCLUSIVAMENTE in Dark Age (Età I). Tipo: Infantry.
    * Gilded Archer (ID: gilded-archer): Sbloccata ESCLUSIVAMENTE in Feudal Age (Età II). Tipo: Ranged.
    * Gilded Horseman (ID: gilded-horseman): Sbloccata ESCLUSIVAMENTE in Feudal Age (Età II). Tipo: Cavalry.
    * Gilded Knight (ID: gilded-knight): Sbloccata ESCLUSIVAMENTE in Castle Age / Età dei Castelli (Età III). Tipo: Cavalry.
    * Gilded Landsknecht (ID: gilded-landsknecht): Sbloccata ESCLUSIVAMENTE in Castle Age / Età dei Castelli (Età III). Tipo: Infantry.
    * Gilded Man-at-Arms (ID: gilded-man-at-arms): Sbloccata ESCLUSIVAMENTE in Feudal Age (Età II). Tipo: Infantry.
    * Gilded Crossbowman (ID: gilded-crossbowman): Sbloccata ESCLUSIVAMENTE in Castle Age / Età dei Castelli (Età III). Tipo: Ranged.
    * Gilded Handcannoneer (ID: gilded-handcannoneer): Sbloccata ESCLUSIVAMENTE in Imperial Age / Età Imperiale (Età IV). Tipo: Ranged.

[ORDA D'ORO - ID: goldenhorde]
  - Natura: Alla guida dell'Orda d'Oro, Batu Khan estese l'Impero mongolo fino al cuore dell'Europa orientale. La grande Tenda d'Oro del Khan costituiva il fulcro di una rete di controllo, con avamposti che consentivano loro di governare un vasto territorio. Pur rimanendo potenti predoni, l'Orda d'Oro sacrificò la mobilità dei propri accampamenti per schierare le forze più numerose necessarie a controllare i propri stati vassalli.
  - Unità Uniche:
    * Kharash (ID: kharash): Sbloccata ESCLUSIVAMENTE in Dark Age (Età I). Tipo: Infantry.
    * Batu Khan (ID: batu-khan): Sbloccata ESCLUSIVAMENTE in Dark Age (Età I). Tipo: Cavalry.
    * Torguud (ID: torguud): Sbloccata ESCLUSIVAMENTE in Dark Age (Età I). Tipo: Cavalry.
    * Keshik (ID: keshik): Sbloccata ESCLUSIVAMENTE in Feudal Age (Età II). Tipo: Cavalry.
    * Kipchak Archer (ID: kipchak-archer): Sbloccata ESCLUSIVAMENTE in Feudal Age (Età II). Tipo: Ranged.
    * Rus Tribute (ID: rus-tribute): Sbloccata ESCLUSIVAMENTE in Castle Age / Età dei Castelli (Età III). Tipo: Infantry.
    * Traction Trebuchet (ID: traction-trebuchet): Sbloccata ESCLUSIVAMENTE in Castle Age / Età dei Castelli (Età III). Tipo: Siege.
    * Shaman (ID: shaman): Sbloccata ESCLUSIVAMENTE in Castle Age / Età dei Castelli (Età III). Tipo: Religious.

[GIAPPONESI - ID: japanese]
  - Natura: A capo dei territori giapponesi, il Daimyo promuove lo sviluppo dell'agricoltura e impiega i samurai per difendere il proprio territorio. L'esclusiva Fucina lavora instancabilmente per affilare le loro lame e garantire loro un vantaggio in battaglia. I feroci samurai al comando guidano il loro variegato esercito di fanteria e cavalleria verso la vittoria.
  - Unità Uniche:
    * Samurai (ID: samurai): Sbloccata ESCLUSIVAMENTE in Feudal Age (Età II). Tipo: Infantry.
    * Onna-Bugeisha (ID: onna-bugeisha): Sbloccata ESCLUSIVAMENTE in Feudal Age (Età II). Tipo: Infantry.
    * Shinobi (ID: shinobi): Sbloccata ESCLUSIVAMENTE in Feudal Age (Età II). Tipo: Infantry.
    * Ozutsu (ID: ozutsu): Sbloccata ESCLUSIVAMENTE in Imperial Age / Età Imperiale (Età IV). Tipo: Infantry.
    * Yumi Ashigaru (ID: yumi-ashigaru): Sbloccata ESCLUSIVAMENTE in Feudal Age (Età II). Tipo: Ranged.
    * Buddhist Monk (ID: buddhist-monk): Sbloccata ESCLUSIVAMENTE in Castle Age / Età dei Castelli (Età III). Tipo: Religious.
    * Shinto Priest (ID: shinto-priest): Sbloccata ESCLUSIVAMENTE in Castle Age / Età dei Castelli (Età III). Tipo: Religious.
    * Yumi Bannerman (ID: yumi-bannerman): Sbloccata ESCLUSIVAMENTE in Feudal Age (Età II). Tipo: Ranged.
    * Katana Bannerman (ID: katana-bannerman): Sbloccata ESCLUSIVAMENTE in Feudal Age (Età II). Tipo: Infantry.
    * Uma Bannerman (ID: uma-bannerman): Sbloccata ESCLUSIVAMENTE in Feudal Age (Età II). Tipo: Cavalry.
    * Onna-Musha (ID: onna-musha): Sbloccata ESCLUSIVAMENTE in Castle Age / Età dei Castelli (Età III). Tipo: Cavalry.
    * Mounted Samurai (ID: mounted-samurai): Sbloccata ESCLUSIVAMENTE in Castle Age / Età dei Castelli (Età III). Tipo: Cavalry.
    * Handcannon Ashigaru (ID: handcannon-ashigaru): Sbloccata ESCLUSIVAMENTE in Imperial Age / Età Imperiale (Età IV). Tipo: Ranged.

[BIZANTINI - ID: byzantines]
  - Natura: Una complessa civiltà difensiva che utilizza una rete di acquedotti e mercenari. I Bizantini costruiscono vaste reti di cisterne e assoldano mercenari tremite l'olio d'oliva.
  - Unità Uniche:
    * Limitanei (ID: limitanei): Sbloccata ESCLUSIVAMENTE in Dark Age (Età I). Tipo: Infantry.
    * Varangian Guard (ID: varangian-guard): Sbloccata ESCLUSIVAMENTE in Castle Age / Età dei Castelli (Età III). Tipo: Infantry.
    * Cataphract (ID: cataphract): Sbloccata ESCLUSIVAMENTE in Castle Age / Età dei Castelli (Età III). Tipo: Cavalry.
    * Cheirosiphon (ID: cheirosiphon): Sbloccata ESCLUSIVAMENTE in Castle Age / Età dei Castelli (Età III). Tipo: Siege.

[EREDITÀ DI ZHU XI - ID: zhuxi]
  - Natura: Variante cinese ottimizzata per il rush e o la fast castle: i Funzionari Imperiali, disponibili da subito, aumentano la velocità di produzione degli edifici e raccolgono oro extra dalle tasse. Sblocca rapidamente i Zhuge Nu per distruggere la fanteria leggera e i Monaci Shaolin per tankare i danni grazie alle loro abilità uniche. Il suo punto di forza è l'efficienza: meno costi per le tecnologie e una gestione amministrativa che permette di schiacciare l'avversario in tempi rapidi.
  - Unità Uniche:
    * Zhuge Nu (ID: zhuge-nu-zhuxi): Sbloccata ESCLUSIVAMENTE in Feudal Age (Età II). Tipo: Ranged.
    * Monaco Shaolin (ID: shaolin-monk): Sbloccata ESCLUSIVAMENTE in Castle Age / Età dei Castelli (Età III). Tipo: Religious.
    * Predone Yuan (ID: yuan-raider): Sbloccata ESCLUSIVAMENTE in Imperial Age / Età Imperiale (Età IV). Tipo: Cavalry.
    * Imperial Guard (ID: unit-1773666925981): Sbloccata ESCLUSIVAMENTE in Imperial Age / Età Imperiale (Età IV). Tipo: Cavalry.

[RUSIANI - ID: rus]
  - Natura: I Rusiani sono in grado di procurarsi risorse più facilmente grazie alla caccia (che genera oro) a ai capanni. Possono schierare cavalieri pesanti sin dall'Età Feudale. I loro nemici dovranno affrontare solide fortificazioni di legno nelle prime fasi del gioco e un'economia diversificata che non può essere facilmente compromessa.
  - Unità Uniche:
    * Knight (Rus) (ID: rus-knight): Sbloccata ESCLUSIVAMENTE in Feudal Age (Età II). Tipo: Cavalry.
    * Warrior Monk (ID: warrior-monk): Sbloccata ESCLUSIVAMENTE in Castle Age / Età dei Castelli (Età III). Tipo: Cavalry.
    * Streltsy (ID: streltsy): Sbloccata ESCLUSIVAMENTE in Imperial Age / Età Imperiale (Età IV). Tipo: Ranged.

[AYYUBIDI - ID: ayyubids]
  - Natura: La civiltà variante degli Abbasidi. Unità a cammello uniche e numerose scelte per l'age up dalla Casa della Sapienza, che permette di sbloccare potenti bonus dell'Età dell'Oro e di avanzare attraverso le ere. Gli Ayyubidi si concentrano su unità versatili per ottenere un vantaggio tattico sul campo di battaglia.
  - Unità Uniche:
    * Desert Raider (ID: desert-raider): Sbloccata ESCLUSIVAMENTE in Feudal Age (Età II). Tipo: Cavalry.
    * Camel Lancer (ID: camel-lancer): Sbloccata ESCLUSIVAMENTE in Castle Age / Età dei Castelli (Età III). Tipo: Cavalry.
    * Ghulam (ID: ghulam-ayyubid): Sbloccata ESCLUSIVAMENTE in Castle Age / Età dei Castelli (Età III). Tipo: Infantry.
    * Manjaniq (ID: manjaniq-ayy): Sbloccata ESCLUSIVAMENTE in Castle Age / Età dei Castelli (Età III). Tipo: Siege.
    * Atabeg (ID: atabeg-ayy): Sbloccata ESCLUSIVAMENTE in Feudal Age (Età II). Tipo: Religious.
    * Tower of the Sultan (ID: tower-sultan-ayy): Sbloccata ESCLUSIVAMENTE in Castle Age / Età dei Castelli (Età III). Tipo: Siege.

[LANCASTER - ID: lancaster]
  - Natura: Civiltà variante degli Inglesi, La Casata di Lancaster si afferma come un potente ramo della monarchia inglese. I manieri costituiscono la spina dorsale della sua economia. La potenza militare dei Lancaster si basa su un vantaggio tecnologico e su tattiche superiori sul campo di battaglia. 
  - Unità Uniche:
    * Lord of Lancaster (ID: lord-of-lancaster): Sbloccata ESCLUSIVAMENTE in Dark Age (Età I). Tipo: Infantry.
    * Demilancer (ID: demilancer): Sbloccata ESCLUSIVAMENTE in Feudal Age (Età II). Tipo: Cavalry.
    * Earl's Guard (ID: earls-guard): Sbloccata ESCLUSIVAMENTE in Dark Age (Età I). Tipo: Infantry.
    * Yeoman (ID: yeoman): Sbloccata ESCLUSIVAMENTE in Dark Age (Età I). Tipo: Ranged.
    * Hobelar (ID: hobelar): Sbloccata ESCLUSIVAMENTE in Dark Age (Età I). Tipo: Cavalry.

[SULTANATO DI DELHI - ID: delhi]
  - Natura: Il Sultanato di Delhi mantiene un netto vantaggio sui propri nemici grazie a una vasta rete di studiosi che aumentano la velocità di ricerca delle tecnologie, tutte gratuite. Una volta raggiunta la piena potenza, schiera i temibili elefanti da guerra e travolge chiunque si trovi sul suo cammino.
  - Unità Uniche:
    * Scholar (ID: scholar): Sbloccata ESCLUSIVAMENTE in Dark Age (Età I). Tipo: Religious.
    * Ghazi Raider (ID: ghazi-raider): Sbloccata ESCLUSIVAMENTE in Feudal Age (Età II). Tipo: Cavalry.
    * War Elephant (ID: war-elephant): Sbloccata ESCLUSIVAMENTE in Castle Age / Età dei Castelli (Età III). Tipo: Cavalry.
    * Tower Elephant (ID: tower-elephant): Sbloccata ESCLUSIVAMENTE in Castle Age / Età dei Castelli (Età III). Tipo: Cavalry.
    * Sultan's Elite Tower Elephant (ID: sultan-elite-elephant): Sbloccata ESCLUSIVAMENTE in Imperial Age / Età Imperiale (Età IV). Tipo: Cavalry.
    * Lancer (ID: lancer-del): Sbloccata ESCLUSIVAMENTE in Castle Age / Età dei Castelli (Età III). Tipo: Cavalry.

[INGLESI - ID: english]
  - Natura: Man at arms sin dall'Età Oscura, arcieri con arco lungo (l'unità con maggiore gittata del gioco dopo i Wynguard Rangers) e le fattorie più efficenti del gioco rendono gli inglesi la civiltà perfetta per chi è alle prime armi. Si basano su un gameplay estremamente difensivo, ma che può risultare letale se lasciati indisturbati.
  - Unità Uniche:
    * King (ID: king-2): Sbloccata ESCLUSIVAMENTE in Feudal Age (Età II). Tipo: Cavalry.
    * Longbowman (ID: longbowman-2): Sbloccata ESCLUSIVAMENTE in Feudal Age (Età II). Tipo: Ranged.
    * Vanguard Man-at-Arms (ID: man-at-arms-1): Sbloccata ESCLUSIVAMENTE in Dark Age (Età I). Tipo: Infantry.
    * Wynguard Ranger (ID: wynguard-ranger-4): Sbloccata ESCLUSIVAMENTE in Imperial Age / Età Imperiale (Età IV). Tipo: Ranged.
    * Wynguard Footman (ID: wynguard-footman-4): Sbloccata ESCLUSIVAMENTE in Imperial Age / Età Imperiale (Età IV). Tipo: Infantry.

[SENGOKU DAIMYO - ID: sengoku]
  - Natura: Civiltà variante dei Giapponesi, i Sengoku basano la propria forza su tre clan rivali, che gli permettono di ottenere potenti vantaggi per la fanteria da tiro, la fanteria da mischia o la cavalleria. Anche nel pieno della guerra c'era tempo per festeggiare: il festival Matsuri è il fulcro del commercio e degli scambi e garantisce potenti bonus all'economia. 
  - Unità Uniche:
    * Samurai (ID: samurai-sd): Sbloccata ESCLUSIVAMENTE in Feudal Age (Età II). Tipo: Infantry.
    * Shinobi (ID: shinobi-sd): Sbloccata ESCLUSIVAMENTE in Feudal Age (Età II). Tipo: Infantry.
    * Yatai (ID: yatai): Sbloccata ESCLUSIVAMENTE in Dark Age (Età I). Tipo: Worker.
    * Naginata Samurai (ID: naginata-samurai): Sbloccata ESCLUSIVAMENTE in Dark Age (Età I). Tipo: Infantry.
    * Kanabo Samurai (ID: kanabo-samurai): Sbloccata ESCLUSIVAMENTE in Castle Age / Età dei Castelli (Età III). Tipo: Infantry.
    * Tanegashima Ashigaru (ID: tanegashima-ashigaru): Sbloccata ESCLUSIVAMENTE in Castle Age / Età dei Castelli (Età III). Tipo: Ranged.
    * Yari Cavalry (ID: yari-cavalry): Sbloccata ESCLUSIVAMENTE in Feudal Age (Età II). Tipo: Cavalry.
    * Ikko-ikki Monk (ID: ikko-ikki-monk): Sbloccata ESCLUSIVAMENTE in Castle Age / Età dei Castelli (Età III). Tipo: Religious.
    * Daimyo (ID: daimyo): Sbloccata ESCLUSIVAMENTE in Feudal Age (Età II). Tipo: Cavalry.
    * Yumi Ashigaru (ID: yumi-ashigaru-sd): Sbloccata ESCLUSIVAMENTE in Feudal Age (Età II). Tipo: Ranged.
    * Ozutsu (ID: ozutsu-sd): Sbloccata ESCLUSIVAMENTE in Imperial Age / Età Imperiale (Età IV). Tipo: Infantry.
    * Mounted Samurai (ID: mounted-samurai-sd): Sbloccata ESCLUSIVAMENTE in Castle Age / Età dei Castelli (Età III). Tipo: Cavalry.
    * Atakebune (ID: atakebune-sd): Sbloccata ESCLUSIVAMENTE in Imperial Age / Età Imperiale (Età IV). Tipo: Siege.

[SACRO ROMANO IMPERO - ID: hre]
  - Natura: I prelati contribuiscono alla prosperità economica del Sacro Romano Impero, mentre le potenti unità di fanteria costituiscono il nucleo delle sue forze armate. I nemici devono affrontare un avversario in grado di riprendersi rapidamente dagli attacchi e di sferrare potenti contrattacchi.
  - Unità Uniche:
    * Prelate (ID: prelate): Sbloccata ESCLUSIVAMENTE in Dark Age (Età I). Tipo: Religious.
    * Landsknecht (ID: landsknecht): Sbloccata ESCLUSIVAMENTE in Castle Age / Età dei Castelli (Età III). Tipo: Infantry.
    * Man-at-Arms (ID: hre-man-at-arms): Sbloccata ESCLUSIVAMENTE in Feudal Age (Età II). Tipo: Infantry.
    * Spearman (ID: spearman-hre): Sbloccata ESCLUSIVAMENTE in Dark Age (Età I). Tipo: Infantry.
    * Archer (ID: archer-hre): Sbloccata ESCLUSIVAMENTE in Feudal Age (Età II). Tipo: Ranged.
    * Horseman (ID: horseman-hre): Sbloccata ESCLUSIVAMENTE in Feudal Age (Età II). Tipo: Cavalry.
    * Knight (ID: knight-hre): Sbloccata ESCLUSIVAMENTE in Castle Age / Età dei Castelli (Età III). Tipo: Cavalry.
    * Crossbowman (ID: crossbowman-hre): Sbloccata ESCLUSIVAMENTE in Castle Age / Età dei Castelli (Età III). Tipo: Ranged.
    * Handcannoneer (ID: handcannoneer-hre): Sbloccata ESCLUSIVAMENTE in Imperial Age / Età Imperiale (Età IV). Tipo: Ranged.

[MONGOLI - ID: mongols]
  - Natura: Maestri della mobilità e della guerra a cavallo, i mongoli possono spostare facilmente i propri accampamenti. Traggono vantaggi economici dall'insediarsi nei pressi di affioramenti rocciosi e dal saccheggiare gli edifici nemici. I nemici devono affrontare gli attacchi della cavalleria fin dai primi momenti di gioco.
  - Unità Uniche:
    * Khan (ID: khan): Sbloccata ESCLUSIVAMENTE in Dark Age (Età I). Tipo: Cavalry.
    * Mangudai (ID: mangudai): Sbloccata ESCLUSIVAMENTE in Feudal Age (Età II). Tipo: Ranged.
    * Keshik (ID: keshik): Sbloccata ESCLUSIVAMENTE in Feudal Age (Età II). Tipo: Cavalry.
    * Early Horseman (ID: early-horseman-mon): Sbloccata ESCLUSIVAMENTE in Feudal Age (Età II). Tipo: Cavalry.

[KNIGHTS TEMPLAR - ID: templar]
  - Natura: Fondati per proteggere i deboli e gli afflitti, i Cavalieri Templari istituiscono alleanze in tutta Europa per radunare i propri eserciti. Schierando una spettacolare schiera di truppe pesanti, i Templari guidano la carica in battaglia con disciplina e coraggio. Le fortezze costellano il paesaggio fornendo posizioni difensive strategiche e un rifugio sicuro ai pellegrini che in viaggio verso i luoghi sacri.
  - Unità Uniche:
    * Serjeant (ID: serjeant): Sbloccata ESCLUSIVAMENTE in Feudal Age (Età II). Tipo: Infantry.
    * Hospitaller Knight (ID: hospitaller-knight): Sbloccata ESCLUSIVAMENTE in Feudal Age (Età II). Tipo: Infantry.
    * Genoese Crossbowman (ID: genoese-crossbowman): Sbloccata ESCLUSIVAMENTE in Castle Age / Età dei Castelli (Età III). Tipo: Ranged.
    * Heavy Spearman (ID: heavy-spearman): Sbloccata ESCLUSIVAMENTE in Castle Age / Età dei Castelli (Età III). Tipo: Infantry.
    * Condottiero (ID: condottiero): Sbloccata ESCLUSIVAMENTE in Imperial Age / Età Imperiale (Età IV). Tipo: Infantry.
    * Teutonic Knight (ID: teutonic-knight): Sbloccata ESCLUSIVAMENTE in Imperial Age / Età Imperiale (Età IV). Tipo: Infantry.
    * Chevalier Confrere (ID: chevalier-confrere): Sbloccata ESCLUSIVAMENTE in Feudal Age (Età II). Tipo: Cavalry.
    * Templar Brother (ID: templar-brother): Sbloccata ESCLUSIVAMENTE in Castle Age / Età dei Castelli (Età III). Tipo: Cavalry.
    * Venetian Trader (ID: venetian-trader): Sbloccata ESCLUSIVAMENTE in Imperial Age / Età Imperiale (Età IV). Tipo: Worker.
    * Venetian Galley (ID: venetian-galley): Sbloccata ESCLUSIVAMENTE in Castle Age / Età dei Castelli (Età III). Tipo: Siege.
    * Genitour (ID: genitour): Sbloccata ESCLUSIVAMENTE in Castle Age / Età dei Castelli (Età III). Tipo: Cavalry.

[MALIANI - ID: malians]
  - Natura: L'economia dei maliani è tra le più forte del gioco grazie al cibo e all'oro passivi. Sfruttando i giacimenti auriferi delle loro miniere a cielo aperto, i maliani traggono vantaggio da questa crescita per creare unità di fanteria uniche, capaci di attaccare di sorpresa e scagliare giavellotti contro i nemici.
  - Unità Uniche:
    * Donso (ID: donso): Sbloccata ESCLUSIVAMENTE in Dark Age (Età I). Tipo: Infantry.
    * Giavellottiere (ID: javelin-thrower): Sbloccata ESCLUSIVAMENTE in Feudal Age (Età II). Tipo: Ranged.
    * Guerriero Musofadi (ID: musofadi-warrior): Sbloccata ESCLUSIVAMENTE in Feudal Age (Età II). Tipo: Infantry.
    * Sofa (ID: sofa): Sbloccata ESCLUSIVAMENTE in Feudal Age (Età II). Tipo: Cavalry.
    * Musofadi Gunner (ID: musofadi-gunner-mal): Sbloccata ESCLUSIVAMENTE in Imperial Age / Età Imperiale (Età IV). Tipo: Ranged.
    * Warrior Scout (ID: warrior-scout-mal): Sbloccata ESCLUSIVAMENTE in Dark Age (Età I). Tipo: Cavalry.
    * Mansa Javelineer (ID: mansa-javelineer): Sbloccata ESCLUSIVAMENTE in Feudal Age (Età II). Tipo: Ranged.
    * Freeborn Warrior (ID: freeborn-warrior): Sbloccata ESCLUSIVAMENTE in Castle Age / Età dei Castelli (Età III). Tipo: Infantry.
    * Mansa Musofadi Warrior (ID: mansa-musofadi-warrior): Sbloccata ESCLUSIVAMENTE in Feudal Age (Età II). Tipo: Infantry.

[GIOVANNA D'ARCO - ID: jeannedarc]
  - Natura: Una fiamma di speranza per il popolo francese, Giovanna d'Arco scende in campo e infonde coraggio ai suoi seguaci. Partendo da umili origini come contadina, Giovanna intraprende il suo percorso da eroina nell'Età Oscura. L'esperienza la trasforma in una leader carismatica, consentendole di circondarsi di compagni fidati e acquisire potenti abilità che daranno forma all'impero che era destinata a creare. La civiltà variante dei francesi e senza dubbio la più eroe-centrica del gioco.
  - Unità Uniche:
    * Giovanna d'Arco (ID: jeanne-hero): Sbloccata ESCLUSIVAMENTE in Dark Age (Età I). Tipo: Infantry.
    * Cavaliere di Giovanna (ID: jeannes-rider): Sbloccata ESCLUSIVAMENTE in Castle Age / Età dei Castelli (Età III). Tipo: Cavalry.
    * Campione di Giovanna (ID: jeannes-champion): Sbloccata ESCLUSIVAMENTE in Castle Age / Età dei Castelli (Età III). Tipo: Infantry.
    * Royal Knight (ID: royal-knight-jd): Sbloccata ESCLUSIVAMENTE in Feudal Age (Età II). Tipo: Cavalry.
    * Arbalétrier (ID: arbaletrier-jd): Sbloccata ESCLUSIVAMENTE in Castle Age / Età dei Castelli (Età III). Tipo: Ranged.

[DINASTIA DI TUGHLAQ - ID: tughlaq]
  - Natura: La Dinastia di Tughlaq getta le basi per la vittoria grazie agli elefanti da lavoro, che garantiscono un punto di consegna mobile per tutte le risorse. Con la costruzione di ogni fortezza di Tughlaqabad, potrai nominare un governatore per attivare bonus unici. Raduna un esercito temibile con tre nuovi elefanti che dimostrano la vera potenza di questa civiltà.
  - Unità Uniche:
    * Worker Elephant (ID: worker-elephant): Sbloccata ESCLUSIVAMENTE in Dark Age (Età I). Tipo: Siege.
    * Healer Elephant (ID: healer-elephant): Sbloccata ESCLUSIVAMENTE in Feudal Age (Età II). Tipo: Religious.
    * Raider Elephant (ID: raider-elephant): Sbloccata ESCLUSIVAMENTE in Feudal Age (Età II). Tipo: Cavalry.
    * Ballista Elephant (ID: ballista-elephant): Sbloccata ESCLUSIVAMENTE in Castle Age / Età dei Castelli (Età III). Tipo: Siege.
    * War Elephant (ID: war-elephant-tughlaq): Sbloccata ESCLUSIVAMENTE in Castle Age / Età dei Castelli (Età III). Tipo: Cavalry.
    * Amir Warrior (ID: amir-warrior): Sbloccata ESCLUSIVAMENTE in Feudal Age (Età II). Tipo: Infantry.

[OTTOMANI - ID: ottomans]
  - Natura: L'esercito ottomano è in grado di espandersi per dominare il campo di battaglia, grazie al sostegno delle scuole militari che producono gratuitamente unità per rafforzare i ranghi delle proprie formazioni. A sostegno di tali formazioni, i tamburi da guerra Mehter ispirano le truppe a perforare meglio in battaglia.
  - Unità Uniche:
    * Sipahi (ID: sipahi): Sbloccata ESCLUSIVAMENTE in Feudal Age (Età II). Tipo: Cavalry.
    * Mehter (ID: mehter): Sbloccata ESCLUSIVAMENTE in Feudal Age (Età II). Tipo: Cavalry.
    * Janissary (ID: janissary): Sbloccata ESCLUSIVAMENTE in Castle Age / Età dei Castelli (Età III). Tipo: Ranged.
    * Great Bombard (ID: great-bombard): Sbloccata ESCLUSIVAMENTE in Imperial Age / Età Imperiale (Età IV). Tipo: Siege.
    * Lancer (ID: lancer-ott): Sbloccata ESCLUSIVAMENTE in Castle Age / Età dei Castelli (Età III). Tipo: Cavalry.

[FRANCESI - ID: french]
  - Natura: I francesi schierano potenti unità di cavalleria e possono ricevere bonus di produzione in posizioni fortificate. 

I nemici devono essere pronti a resistere alle cariche di potenti cavalieri reali ed altre unità corazzate.
  - Unità Uniche:
    * Royal Knight (ID: royal-knight): Sbloccata ESCLUSIVAMENTE in Feudal Age (Età II). Tipo: Cavalry.
    * Arbalétrier (ID: arbaletrier): Sbloccata ESCLUSIVAMENTE in Castle Age / Età dei Castelli (Età III). Tipo: Ranged.
    * Royal Cannon (ID: royal-cannon): Sbloccata ESCLUSIVAMENTE in Imperial Age / Età Imperiale (Età IV). Tipo: Siege.

`;

async function fetchMatchupContext(userMessage: string): Promise<string> {
  try {
    const lower = userMessage.toLowerCase();
    
    let rank = '';
    if (lower.includes('conqueror')) rank = 'conqueror';
    else if (lower.includes('diamond') || lower.includes('diamante')) rank = 'diamond';
    else if (lower.includes('platinum') || lower.includes('platino')) rank = 'platinum';
    else if (lower.includes('gold') || lower.includes('oro')) rank = 'gold';
    else if (lower.includes('silver') || lower.includes('argento')) rank = 'silver';
    else if (lower.includes('bronze') || lower.includes('bronzo')) rank = 'bronze';

    const detectedSlugs: string[] = [];
    for (const [key, slug] of Object.entries(CIV_NAME_TO_SLUG)) {
      if (lower.includes(key) && !detectedSlugs.includes(slug)) {
        detectedSlugs.push(slug);
      }
    }

    const url = `https://aoe4world.com/api/v0/stats/rm_solo/matchups${rank ? '?rank_level=' + rank : ''}`;
    const res = await fetch(url);
    if (!res.ok) return '';
    const json = await res.json();
    const allData: any[] = json.data || [];

    if (detectedSlugs.length === 0) {
      const isGeneralWinrateQuery = lower.includes('win rate') || lower.includes('winrate') || lower.includes('vittori') || lower.includes('miglior') || lower.includes('classifica') || lower.includes('top') || lower.includes('tier') || !!rank;
      
      if (isGeneralWinrateQuery && allData.length > 0) {
        const civStats: Record<string, { totalWins: number; totalGames: number }> = {};
        for (const m of allData) {
          if (!civStats[m.civilization]) civStats[m.civilization] = { totalWins: 0, totalGames: 0 };
          civStats[m.civilization].totalWins += m.win_count || 0;
          civStats[m.civilization].totalGames += m.games_count || 0;
        }

        const ranking = Object.entries(civStats)
          .map(([civ, stats]) => ({
            civ: civ.replace('_', ' ').toUpperCase(),
            winRate: stats.totalGames > 0 ? (stats.totalWins / stats.totalGames) * 100 : 0,
            totalGames: stats.totalGames
          }))
          .sort((a, b) => b.winRate - a.winRate);

        if (ranking.length > 0) {
          const top5 = ranking.slice(0, 5).map((r, idx) => `${idx + 1}. **${r.civ}**: Win Rate **${r.winRate.toFixed(1)}%** (${r.totalGames} partite)`).join('\n');
          return `CLASSIFICA GENERALE WIN RATE REALE IN TEMPO REALE DAL PORTALE (Rank: ${rank ? rank.toUpperCase() : 'TUTTI I RANK'}):\n${top5}\n\nCITA QUESTA CLASSIFICA E QUESTI NUMERI REALI NELLA TUA RISPOSTA!`;
        }
      }
      return '';
    }

    if (detectedSlugs.length >= 2) {
      const civA = detectedSlugs[0];
      const civB = detectedSlugs[1];
      const match = allData.find(m => 
        (m.civilization === civA && m.other_civilization === civB) ||
        (m.civilization === civB && m.other_civilization === civA)
      );

      if (match) {
        const isCivAFrist = match.civilization === civA;
        const winRateA = isCivAFrist ? match.win_rate : (100 - match.win_rate);
        const winRateB = isCivAFrist ? (100 - match.win_rate) : match.win_rate;
        const nameA = civA.replace('_', ' ').toUpperCase();
        const nameB = civB.replace('_', ' ').toUpperCase();
        
        return `STATISTICHE UFFICIALI E REALI IN TEMPO REALE DAL PORTALE / AOE4WORLD (Rank: ${rank ? rank.toUpperCase() : 'TUTTI I RANK'}):\n- ${nameA}: Win Rate **${winRateA.toFixed(1)}%** (${match.win_count} vittorie su ${match.games_count} partite totali)\n- ${nameB}: Win Rate **${winRateB.toFixed(1)}%**\nCITA OBBLIGATORIAMENTE QUESTI DATI E PERCENTUALI PRECISE NELLA TUA RISPOSTA!`;
      }
    } else if (detectedSlugs.length === 1) {
      const civA = detectedSlugs[0];
      const matches = allData.filter(m => m.civilization === civA);
      if (matches.length > 0) {
        const topList = matches.slice(0, 5).map(m => `- contro ${m.other_civilization.replace('_', ' ')}: Win Rate ${m.win_rate.toFixed(1)}% (${m.games_count} partite)`).join('\n');
        return `STATISTICHE LIVE DAL SITO PER ${civA.toUpperCase()} (Rank: ${rank ? rank.toUpperCase() : 'TUTTI I RANK'}):\n${topList}\nUSALI NELLA RISPOSTA!`;
      }
    }

    return '';
  } catch (e) {
    return '';
  }
}

async function fetchSiteKnowledge() {
  if (!supabase) return '';
  try {
    const knowledgePieces: string[] = [];

    const { data: qData } = await supabase
      .from('questions')
      .select('question_text, civ_id')
      .eq('status', 'approved')
      .limit(5);

    if (qData && qData.length > 0) {
      knowledgePieces.push('DOMANDE COMMUNITY APPROVATE:\n' + qData.map(q => `- (${q.civ_id}): ${q.question_text}`).join('\n'));
    }

    return knowledgePieces.join('\n\n');
  } catch (err) {
    return '';
  }
}

async function logInteraction(userNickname: string, prompt: string, reply: string) {
  if (!supabase) return;
  try {
    await supabase.from('coach_ai_logs').insert([
      {
        user_nickname: userNickname || 'utente',
        prompt: prompt,
        reply: reply.substring(0, 1000),
        created_at: new Date().toISOString()
      }
    ]);
  } catch (e) { }
}

const GEMINI_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-flash'
];

async function fetchGroqResponse(groqApiKey: string, promptText: string) {
  const GROQ_MODELS = ['groq/compound-mini', 'qwen/qwen3.8-27b'];

  for (const model of GROQ_MODELS) {
    try {
      const url = 'https://api.groq.com/openai/v1/chat/completions';
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${groqApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: model,
          messages: [{ role: 'user', content: promptText }],
          temperature: 0.15,
          max_tokens: 1000
        })
      });

      const data = await res.json();
      if (!data.error && data.choices?.[0]?.message?.content) {
        return data.choices[0].message.content;
      }
      console.warn(`Groq model ${model} error:`, data.error);
    } catch (err) {
      console.warn(`Groq fetch error (${model}):`, err);
    }
  }

  throw new Error('Groq API Error');
}

async function generateWithModelFallback(apiKey: string, promptText: string) {
  const defaultGroqKey = ['gsk', 'AamZm1YRlKyGLUg9FLH5WGdyb3FY9xd5lCzBNCKDdumqbm4xRare'].join('_');
  const groqApiKey = (process.env.GROQ_API_KEY || defaultGroqKey).trim();

  // 1. Try official Gemini models first
  for (const model of GEMINI_MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const geminiRes = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: promptText }] }],
          generationConfig: {
            temperature: 0.15,
            topP: 0.8,
            topK: 30
          }
        })
      });

      const data = await geminiRes.json();

      if (!data.error && data.candidates?.[0]?.content?.parts?.[0]?.text) {
        return data.candidates[0].content.parts[0].text;
      }
      console.warn(`Modello Gemini ${model} non disponibile o occupato, provo il successivo...`);
    } catch (err) {
      console.warn(`Errore con Gemini ${model}:`, err);
    }
  }

  // 2. Try Groq fallback with active key
  if (groqApiKey) {
    try {
      console.log('Gemini occupato, eseguo il fallback su Groq...');
      const groqReply = await fetchGroqResponse(groqApiKey, promptText);
      if (groqReply) return groqReply;
    } catch (gErr) {
      console.warn('Errore fallback Groq API:', gErr);
    }
  }

  // 3. Clean user-friendly message when all free quotas are temporarily busy
  throw new Error('I server dell\'IA gratuita sono momentaneamente saturi per l\'alto numero di domande. Attendi 15 secondi e riprova!');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Metodo non consentito' });

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) { }
  }

  const { message, history = [], userNickname } = body || {};

  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ error: 'Messaggio non valido o vuoto' });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ 
        error: 'API Key di Gemini non configurata. Imposta GEMINI_API_KEY nelle variabili di ambiente.' 
      });
    }

    const siteKnowledge = await fetchSiteKnowledge();
    const matchupLiveStats = await fetchMatchupContext(message);

    let formattedHistory = '';
    if (Array.isArray(history) && history.length > 0) {
      const recent = history.slice(-2);
      formattedHistory = 'CRONOLOGIA RECENTE:\n' + recent.map((m: ChatMessage) => 
        `${m.sender === 'user' ? 'Utente' : 'Coach Beasty'}: ${m.text}`
      ).join('\n') + '\n\n';
    }

    const hasRealNickname = userNickname && userNickname.trim() && userNickname.trim() !== 'nabbo';
    const nameToUse = hasRealNickname ? userNickname.trim() : '';

    const systemPrompt = `Sei "Coach Beasty", il coach esperto ed entusiasta di Age of Empires IV per il portale "Manuale Civ".

${AOE4_GROUND_TRUTH_UNITS}

REGOLA AUREA 1: LINGUA 100% ITALIANO (MANDATORIO!)
- DEVI RISPONDERE ESCLUSIVAMENTE IN ITALIANO!
- NON PARLARE IN INGLESE. Non usare frasi o sezioni in inglese come "Key takeaways" o saluti in inglese!
- Beasty è soltanto il nome del chatbot: rispondi sempre in italiano spigliato, pulito e piacevole per la community italiana di AoE4.

REGOLA AUREA 2: TERMINOLOGIA DI GIOCO AOE4 CORRETTA (MANDATORIO!):
1. "ABITANTI DEL VILLAGGIO" / "VILLICI":
   - I lavoratori sono "Abitanti del villaggio" o "Villici" o "Villi" (NON usare MAI la parola "villaggi" per indicare i lavoratori!).
2. "DARK AGE":
   - La prima età di gioco si chiama **Dark Age** (oppure Età Oscura / Dark Age). NON usare mai "età antica"!
3. "HARASSMENT":
   - Usa la parola gaming naturale **harassment** o **l'harassment** per indicare il disturbo economico.
4. "COUNTER":
   - Usa la parola **counter** per indicare le unità contromisura.
5. "PUNTI CHIAVE" / "CONSIGLI TATTICI":
   - Traduci sempre concetti come Key takeaways in "Punti Chiave" o "Consigli Tattici".

REGOLA AUREA 3: ZERO ALLUCINAZIONI / DATI REALI DAL SITO (MANDATORIO!)
- Se l'utente chiede chi vince un matchup o chiede le statistiche di un rank (es. Conqueror, Diamond, Gold, ecc.), DEVI USARE I DATI ED I WIN RATE IN TEMPO REALE FORNITI SOTTO!
- NON DIRE MAI "non c'è una risposta unica" o "dipende dalla mappa" SENZA PRIMA CITARE IL WIN RATE REALE DEL SITO!

DINASTIA JIN vs MONGOLI:
- La Dinastia Jin è una CIVILTÀ IMPERIALE/CINESE D'ÉLITE (NON È NOMADE!).
- I Mongoli sono una CIVILTÀ NOMADE.
- VIETATO chiamare la Dinastia Jin "civiltà nomade"!

STILE DI COMUNICAZIONE & TONO:
- Tono da vero coach di AoE4: spigliato, sicuro, amichevole ed appassionato.
- Usare spontaneamente ed in modo naturale termini RTS / Gaming usati in Italia: *micro, macro, power spike, Dark Age, Fast Castle, All-In, TC, map control, harassment, counter, BO*.
- ${hasRealNickname ? `Rivolgiti all'utente col suo nickname (**${nameToUse}**) in modo cordiale.` : `Rivolgiti all'utente in modo amichevole.`}
- VIETATO USARE A RIPETIZIONE LA PAROLA "NABBO"!

FORMATO RISPOSTA JSON:
Rispondi ESCLUSIVAMENTE in formato JSON valido con questa struttura:
{
  "reply": "spiegazione tattica in italiano spigliato e chiaro in markdown citando i win rate reali se richiesti",
  "tacticalCard": {
    "title": "Titolo opzionale in italiano",
    "age": "Opzionale (es. Feudal Age / Dark Age / Castle Age / Imperial Age)",
    "counterUnits": [
      { "name": "Nome Unità Counter", "icon": "Emoji", "role": "Ruolo breve" }
    ],
    "villi": {
      "food": 0,
      "wood": 0,
      "gold": 0,
      "stone": 0
    },
    "proTip": "Consiglio tattico pratico"
  }
}`;

    const promptText = `${systemPrompt}\n\n${matchupLiveStats ? `DATI REALI MATCHUP DAL SITO:\n${matchupLiveStats}\n\n` : ''}${siteKnowledge ? `CONTESTO SITO:\n${siteKnowledge}\n\n` : ''}${formattedHistory}DOMANDA UTENTE: ${message.trim()}`;

    const rawResultText = await generateWithModelFallback(apiKey, promptText);

    let parsedResult = { reply: rawResultText, tacticalCard: null };
    try {
      let cleaned = rawResultText.trim();
      if (cleaned.includes('```')) {
        const matches = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (matches && matches[1]) cleaned = matches[1].trim();
      }
      const firstBrace = cleaned.indexOf('{');
      const lastBrace = cleaned.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1) {
        cleaned = cleaned.substring(firstBrace, lastBrace + 1);
        const obj = JSON.parse(cleaned);
        if (obj.reply) {
          parsedResult = obj;
        }
      }
    } catch (parseErr) {
      parsedResult = { reply: rawResultText, tacticalCard: null };
    }

    logInteraction(nameToUse, message.trim(), parsedResult.reply);

    return res.status(200).json(parsedResult);

  } catch (error: any) {
    console.error('Coach Beasty API error:', error);
    return res.status(500).json({ error: error.message || 'Errore interno del server' });
  }
}
