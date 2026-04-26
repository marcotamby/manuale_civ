import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  HelpCircle, Info, Layers, Zap, Heart, GitPullRequest, ArrowLeft, 
  Users, Shield, PlayCircle, BookOpen, Sword, Edit3, Save, Plus, Trash2, X, ChevronUp, ChevronDown, Loader2, CheckCircle, Trophy, GripVertical
} from 'lucide-react';
import {
  DndContext, 
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { restrictToFirstScrollableAncestor } from '@dnd-kit/modifiers';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './AuthContext';
import { Toast } from './Toast';
import type { ToastType } from './Toast';

interface FAQItem {
  id?: string;
  section_id?: string;
  label: string;
  description: string;
  icon_name: string;
  display_order: number;
}

interface FAQSection {
  id?: string;
  title: string;
  icon_name: string;
  display_order: number;
  items: FAQItem[];
}

const STATIC_SECTIONS: FAQSection[] = [
  {
    title: "Cosa trovo nelle sezioni?",
    icon_name: "Layers",
    display_order: 0,
    items: [
      {
        label: "Dettaglio Civiltà",
        description: "Ogni civiltà ha una pagina dedicata con bonus, unità uniche, edifici e tecnologie specifiche. È il cuore del manuale per capire come giocare al meglio ogni fazione.",
        icon_name: "Shield",
        display_order: 0
      },
      {
        label: "Unità & Edifici",
        description: "Statistiche dettagliate per ogni singola unità e edificio, inclusi costi, tempi di addestramento e contromisure efficaci.",
        icon_name: "Sword",
        display_order: 1
      },
      {
        label: "Build Orders",
        description: "Sequenze ottimizzate per l'apertura della partita, spiegate passo dopo passo per darti il vantaggio competitivo sin dai primi minuti.",
        icon_name: "BookOpen",
        display_order: 2
      },
      {
        label: "Matchups & Video",
        description: "Consigli su come affrontare ogni specifica civiltà nemica e una selezione di video tutorial dai migliori creator della community.",
        icon_name: "PlayCircle",
        display_order: 3
      }
    ]
  },
  {
    title: "Funzioni Importanti",
    icon_name: "Zap",
    display_order: 1,
    items: [
      {
        label: "Confronta Civiltà",
        description: "Nella Dashboard puoi selezionare più civiltà e metterle a confronto diretto per analizzare differenze di bonus e unità.",
        icon_name: "Users",
        display_order: 0
      },
      {
        label: "I tuoi Preferiti",
        description: "Cliccando sul cuore in ogni civiltà, puoi aggiungerla ai preferiti. Le troverai sempre a portata di mano nella barra laterale.",
        icon_name: "Heart",
        display_order: 1
      },
      {
        label: "Q & A (Domande & Risposte)",
        description: "In ogni scheda civiltà puoi fare domande specifiche o rispondere a dubbi. È lo strumento ideale per consigli tattici e chiarimenti.",
        icon_name: "HelpCircle",
        display_order: 2
      },
      {
        label: "Invia Proposte",
        description: "Se noti un errore o vuoi suggerire un contenuto, usa il tasto 'Proponi Modifica'. La community aiuta a tenere il manuale aggiornato!",
        icon_name: "GitPullRequest",
        display_order: 3
      }
    ]
  }
];

const IconComponent = ({ name, size = 18, className = "" }: { name: string, size?: number, className?: string }) => {
  const icons: Record<string, any> = {
    Layers, Zap, Heart, GitPullRequest, Users, Shield, PlayCircle, BookOpen, Sword, Info, HelpCircle, Trophy
  };
  const Icon = icons[name] || HelpCircle;
  return <Icon size={size} className={className} />;
};

interface SortableItemProps {
  item: FAQItem;
  sIdx: number;
  iIdx: number;
  isEditing: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  onRemove: () => void;
  onUpdate: (field: keyof FAQItem, value: any) => void;
}

function SortableFAQItem({ item, sIdx, iIdx, isEditing, isExpanded, onToggle, onRemove, onUpdate }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: `${sIdx}-${item.id || iIdx}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 'auto',
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <div 
      ref={setNodeRef}
      style={style}
      {...(isEditing ? { ...attributes, ...listeners } : {})}
      className={`bg-black/50 backdrop-blur-md p-5 rounded-2xl border border-white/10 hover:border-blue-500/40 transition-all group relative ${!isEditing ? 'cursor-pointer md:cursor-default' : ''} ${!isEditing && isExpanded ? 'border-blue-500/40 bg-black/70' : ''} ${isDragging ? 'shadow-[0_0_25px_rgba(59,130,246,0.4)] z-50' : ''}`}
      onClick={() => !isEditing && onToggle()}
    >
      {isEditing && (
        <>
          <div 
            className="absolute left-3 top-3 p-1 text-blue-400/50 group-hover:text-blue-400 cursor-grab active:cursor-grabbing z-20 transition-colors"
            title="Trascina qualsiasi punto del box per spostare"
          >
            <GripVertical size={18} className="drop-shadow-[0_0_5px_rgba(96,165,250,0.5)]" />
          </div>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="absolute -top-2 -right-2 p-1.5 bg-red-600 rounded-full text-white shadow-lg z-30 hover:scale-110 transition-transform hover:bg-red-500 border border-white/10"
          >
            <X size={12} />
          </button>
        </>
      )}
      
      {isEditing ? (
        <div className="space-y-4 pt-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative min-w-[120px]">
              <select 
                value={item.icon_name}
                onChange={(e) => onUpdate('icon_name', e.target.value)}
                className="w-full appearance-none bg-black/50 border border-white/10 rounded-lg pl-3 pr-10 py-2 text-sm text-blue-400 focus:border-blue-400 focus:outline-none transition-all cursor-pointer"
              >
                {['Layers', 'Zap', 'Heart', 'GitPullRequest', 'Users', 'Shield', 'PlayCircle', 'BookOpen', 'Sword', 'Info', 'HelpCircle'].map(icon => (
                  <option key={icon} value={icon} className="bg-[#0d1424] text-white">{icon}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-400 pointer-events-none" />
            </div>
            <input 
              value={item.label}
              onChange={(e) => onUpdate('label', e.target.value)}
              className="flex-1 bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-base font-bold text-white focus:border-blue-400 focus:outline-none transition-all"
              placeholder="Titolo elemento"
            />
          </div>
          <textarea 
            value={item.description}
            onChange={(e) => onUpdate('description', e.target.value)}
            className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-sm text-gray-300 h-32 resize-none focus:border-blue-400 focus:outline-none transition-all leading-relaxed"
            placeholder="Descrizione dell'elemento..."
          />
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/5 rounded-lg group-hover:bg-blue-500/10 transition-colors text-blue-400 shrink-0">
                 <IconComponent name={item.icon_name} />
              </div>
              <h3 className="font-bold text-white tracking-wide">{item.label}</h3>
            </div>
            <div className="md:hidden">
              {isExpanded ? <ChevronUp size={16} className="text-blue-400" /> : <ChevronDown size={16} className="text-gray-500" />}
            </div>
          </div>
          <div className={`overflow-hidden transition-all duration-300 md:block ${isExpanded ? 'max-h-96 opacity-100 mt-3' : 'max-h-0 opacity-0 md:max-h-96 md:opacity-100'}`}>
            <p className="text-sm text-gray-400 leading-relaxed border-t border-white/5 pt-3 md:border-0 md:pt-0">
              {item.description}
            </p>
          </div>
        </>
      )}
    </div>
  );
}

export function FAQPage() {
  const navigate = useNavigate();
  const { isSuperAdmin } = useAuth();
  const [sections, setSections] = useState<FAQSection[]>([]);
  const [intro, setIntro] = useState({ title: "Cos'è il Manuale delle Civiltà?", content: "Questo portale è nato per offrire alla community italiana di Age of Empires IV uno strumento completo, rapido e intuitivo per consultare ogni dettaglio del gioco." });
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const [isSaveSuccess, setIsSaveSuccess] = useState(false);
  const [toast, setToast] = useState<{ isVisible: boolean; message: string; type: ToastType }>({
    isVisible: false,
    message: '',
    type: 'success'
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const toggleItem = (sIdx: number, iIdx: number) => {
    if (window.innerWidth >= 768) return; // Don't toggle on desktop
    const key = `${sIdx}-${iIdx}`;
    setExpandedItems(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const fetchFAQ = async () => {
    try {
      setLoading(true);
      
      // Fetch Intro
      const { data: introData } = await supabase
        .from('faq_settings')
        .select('*')
        .eq('id', 'intro')
        .single();
      
      if (introData) {
        setIntro({ title: introData.title, content: introData.content });
      }

      // Fetch Sections
      const { data: sectionData, error: sectionError } = await supabase
        .from('faq_sections')
        .select('*')
        .order('display_order');

      if (sectionError) throw sectionError;

      if (!sectionData || sectionData.length === 0) {
        setSections(STATIC_SECTIONS);
        return;
      }

      const { data: itemData, error: itemError } = await supabase
        .from('faq_items')
        .select('*')
        .order('display_order');

      if (itemError) throw itemError;

      const combined: FAQSection[] = sectionData.map(s => ({
        ...s,
        items: (itemData || []).filter(i => i.section_id === s.id)
      }));

      setSections(combined);
    } catch (err) {
      console.error('Error fetching FAQ:', err);
      if (sections.length === 0) setSections(STATIC_SECTIONS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFAQ();
  }, []);

  const handleAddField = (sectionIdx: number) => {
    const newSections = [...sections];
    newSections[sectionIdx].items.push({
      id: crypto.randomUUID(), // Ensure unique ID for dnd-kit
      label: "Nuovo Elemento",
      description: "Descrizione...",
      icon_name: "Info",
      display_order: newSections[sectionIdx].items.length
    });
    setSections(newSections);
  };

  const handleAddSection = () => {
    setSections([...sections, {
      title: "Nuova Sezione",
      icon_name: "Layers",
      display_order: sections.length,
      items: []
    }]);
  };

  const handleRemoveItem = (sIdx: number, iIdx: number) => {
    const newSections = [...sections];
    newSections[sIdx].items.splice(iIdx, 1);
    setSections(newSections);
  };

  const handleRemoveSection = (sIdx: number) => {
    setSections(sections.filter((_, i) => i !== sIdx));
  };

  const handleSave = async () => {
    try {
      setSaveLoading(true);
      
      // Save Intro
      await supabase.from('faq_settings').upsert({
        id: 'intro',
        title: intro.title,
        content: intro.content
      });

      // Clear existing sections/items to simplify sync
      await supabase.from('faq_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('faq_sections').delete().neq('id', '00000000-0000-0000-0000-000000000000');

      for (let i = 0; i < sections.length; i++) {
        const s = sections[i];
        const { data: newS, error: sErr } = await supabase.from('faq_sections').insert({
          title: s.title,
          icon_name: s.icon_name,
          display_order: i
        }).select().single();

        if (sErr) throw sErr;

        if (s.items.length > 0) {
          const itemsToInsert = s.items.map((item, idx) => ({
            section_id: newS.id,
            label: item.label,
            description: item.description,
            icon_name: item.icon_name,
            display_order: idx
          }));
          const { error: iErr } = await supabase.from('faq_items').insert(itemsToInsert);
          if (iErr) throw iErr;
        }
      }
      
      setIsSaveSuccess(true);
      fetchFAQ();
      
      setTimeout(() => {
        setIsEditing(false);
        setIsSaveSuccess(false);
      }, 1800);

    } catch (err) {
      console.error('Error saving FAQ:', err);
      setToast({
        isVisible: true,
        message: 'Errore nel salvataggio delle FAQ',
        type: 'error'
      });
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDragEnd = (event: DragEndEvent, sectionIdx: number) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = sections[sectionIdx].items.findIndex(i => `${sectionIdx}-${i.id || sections[sectionIdx].items.indexOf(i)}` === active.id);
    const newIndex = sections[sectionIdx].items.findIndex(i => `${sectionIdx}-${i.id || sections[sectionIdx].items.indexOf(i)}` === over.id);

    const newSections = [...sections];
    newSections[sectionIdx].items = arrayMove(newSections[sectionIdx].items, oldIndex, newIndex);
    setSections(newSections);
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center lg:bg-transparent bg-[#0d1424]">
        <Loader2 className="animate-spin text-blue-400" size={40} />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 h-full lg:bg-transparent bg-[#0d1424] text-gray-300 elegant-scrollbar relative z-10">
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
            <div className="flex gap-2">
              {isEditing ? (
                <>
                  <button 
                    onClick={() => setIsEditing(false)}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-all text-xs font-bold uppercase tracking-wider"
                  >
                    <X size={16} /> Annulla
                  </button>
                  <button 
                    onClick={handleSave}
                    disabled={saveLoading || isSaveSuccess}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300 text-xs font-bold uppercase tracking-wider shadow-lg disabled:opacity-50 ${
                      isSaveSuccess 
                        ? 'bg-[#00ff9f] text-[#0d1424] shadow-[0_0_25px_rgba(0,255,159,0.8)] scale-110 animate-[pulse_1s_infinite]' 
                        : 'bg-blue-600 text-white hover:bg-blue-500 shadow-blue-600/20'
                    }`}
                  >
                    {saveLoading ? <Loader2 className="animate-spin" size={16} /> : isSaveSuccess ? <CheckCircle size={16} className="animate-in zoom-in" /> : <Save size={16} />}
                    {isSaveSuccess ? 'Salvato' : 'Salva'}
                  </button>
                </>
              ) : (
                <button 
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-lg hover:bg-blue-600/30 transition-all text-xs font-bold uppercase tracking-wider"
                >
                  <Edit3 size={16} /> Modifica FAQ
                </button>
              )}
            </div>
          )}
        </div>

        <header className="mb-12 border-b border-blue-500/20 pb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20">
              <HelpCircle size={32} className="text-blue-400" />
            </div>
            <div className="relative p-6 md:p-8 flex-1">
              {/* Torn paper effect background - Blended version */}
              <div 
                className="absolute inset-0 bg-black/40 backdrop-blur-lg -z-10" 
                style={{ 
                  clipPath: 'polygon(1% 4%, 20% 0%, 45% 4%, 75% 0%, 98% 3%, 100% 30%, 97% 55%, 100% 85%, 98% 100%, 70% 96%, 40% 100%, 15% 97%, 0% 100%, 2% 70%, 0% 40%, 3% 15%)',
                  maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 95%)',
                  WebkitMaskImage: 'radial-gradient(ellipse at center, black 30%, transparent 95%)'
                }} 
              />
              <h1 className="text-4xl font-sackers font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-200 to-cyan-500 tracking-tight drop-shadow-[0_0_15px_rgba(59,130,246,0.4)]">
                Domande Frequenti
              </h1>
              <p className="text-gray-400 mt-1 font-serif italic">Tutto quello che c'è da sapere sul Manuale delle Civiltà</p>
            </div>
          </div>
        </header>

        <section className="mb-12 glass p-6 md:p-8 rounded-3xl border border-white/5 relative group">
          {isEditing ? (
            <div className="space-y-4 relative z-10">
              <div className="relative">
                <Info size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-400 pointer-events-none" />
                <input 
                  value={intro.title}
                  onChange={(e) => setIntro({ ...intro, title: e.target.value })}
                  className="w-full bg-black/50 border border-blue-500/30 rounded-lg pl-12 pr-4 py-3 text-2xl font-bold text-white transition-all focus:border-blue-400 focus:outline-none"
                  placeholder="Titolo Intro"
                />
              </div>
              <textarea 
                value={intro.content}
                onChange={(e) => setIntro({ ...intro, content: e.target.value })}
                className="w-full bg-black/50 border border-blue-500/30 rounded-lg px-4 py-3 text-lg leading-relaxed text-gray-300 h-40 resize-none transition-all focus:border-blue-400 focus:outline-none"
                placeholder="Contenuto Intro"
              />
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
                <Info className="text-blue-400" />
                {intro.title}
              </h2>
              <p className="text-lg leading-relaxed text-gray-300">
                {intro.content}
              </p>
            </>
          )}
        </section>

        <div className="space-y-12 pb-12">
          {sections.map((section, sIdx) => (
            <div key={sIdx} className="space-y-6 relative group/section">
              {isEditing && (
                <div className="absolute -left-12 top-0 flex flex-col gap-2 p-2 bg-black/40 rounded-lg border border-white/10 opacity-0 group-hover/section:opacity-100 transition-opacity">
                  <button onClick={() => handleRemoveSection(sIdx)} className="text-red-400 hover:text-red-300"><Trash2 size={16} /></button>
                  <div className="h-4" />
                  <button disabled={sIdx === 0} onClick={() => {
                    const next = [...sections];
                    [next[sIdx], next[sIdx-1]] = [next[sIdx-1], next[sIdx]];
                    setSections(next);
                  }} className="text-gray-400 hover:text-white disabled:opacity-20"><ChevronUp size={16} /></button>
                  <button disabled={sIdx === sections.length - 1} onClick={() => {
                    const next = [...sections];
                    [next[sIdx], next[sIdx+1]] = [next[sIdx+1], next[sIdx]];
                    setSections(next);
                  }} className="text-gray-400 hover:text-white disabled:opacity-20"><ChevronDown size={16} /></button>
                </div>
              )}

              {isEditing ? (
                <div className="flex flex-col sm:flex-row gap-4">
                  <input 
                    value={section.title}
                    onChange={(e) => {
                      const next = [...sections];
                      next[sIdx].title = e.target.value;
                      setSections(next);
                    }}
                    className="flex-1 bg-black/50 border border-blue-500/30 rounded-lg px-4 py-2 text-xl font-bold text-white focus:border-blue-400 focus:outline-none"
                  />
                  <div className="relative min-w-[150px]">
                    <select 
                      value={section.icon_name}
                      onChange={(e) => {
                        const next = [...sections];
                        next[sIdx].icon_name = e.target.value;
                        setSections(next);
                      }}
                      className="w-full appearance-none bg-black/50 border border-blue-500/30 rounded-lg pl-4 pr-10 py-2 text-blue-400 focus:border-blue-400 focus:outline-none transition-all cursor-pointer"
                    >
                      {['Layers', 'Zap', 'Heart', 'GitPullRequest', 'Users', 'Shield', 'PlayCircle', 'BookOpen', 'Sword', 'Info', 'HelpCircle'].map(icon => (
                        <option key={icon} value={icon} className="bg-[#0d1424] text-white">{icon}</option>
                      ))}
                    </select>
                    <ChevronDown size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-400 pointer-events-none" />
                  </div>
                </div>
              ) : (
                <h2 className="text-xl font-sackers font-bold text-blue-400/80 tracking-widest flex items-center gap-3 border-b border-white/5 pb-2">
                  <IconComponent name={section.icon_name} className="text-blue-400" />
                  {section.title}
                </h2>
              )}

              <DndContext 
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={(e) => handleDragEnd(e, sIdx)}
                modifiers={[restrictToFirstScrollableAncestor]}
              >
                <div className="grid md:grid-cols-2 gap-4">
                  <SortableContext 
                    items={section.items.map((item, iIdx) => `${sIdx}-${item.id || iIdx}`)}
                    strategy={rectSortingStrategy}
                  >
                    {section.items.map((item, iIdx) => (
                      <SortableFAQItem 
                        key={`${sIdx}-${item.id || iIdx}`}
                        item={item}
                        sIdx={sIdx}
                        iIdx={iIdx}
                        isEditing={isEditing}
                        isExpanded={expandedItems[`${sIdx}-${iIdx}`]}
                        onToggle={() => toggleItem(sIdx, iIdx)}
                        onRemove={() => handleRemoveItem(sIdx, iIdx)}
                        onUpdate={(field, value) => {
                          const next = [...sections];
                          next[sIdx].items[iIdx] = { ...next[sIdx].items[iIdx], [field]: value };
                          setSections(next);
                        }}
                      />
                    ))}
                  </SortableContext>

                  {isEditing && (
                    <button 
                      onClick={() => handleAddField(sIdx)}
                      className="flex flex-col items-center justify-center p-5 rounded-2xl border-2 border-dashed border-white/10 hover:border-blue-500/50 hover:bg-blue-500/5 transition-all group"
                    >
                      <Plus className="text-gray-500 group-hover:text-blue-400 transition-colors mb-2" />
                      <span className="text-xs font-bold text-gray-500 group-hover:text-blue-400 uppercase">Aggiungi Elemento</span>
                    </button>
                  )}
                </div>
              </DndContext>
            </div>
          ))}

          {isEditing && (
            <button 
              onClick={handleAddSection}
              className="w-full flex items-center justify-center gap-3 p-6 rounded-3xl border-2 border-dashed border-blue-500/20 hover:border-blue-500/50 hover:bg-blue-500/5 transition-all group"
            >
              <Plus className="text-blue-400 group-hover:scale-125 transition-transform" />
              <span className="font-sackers font-bold text-blue-400/80 tracking-widest uppercase">Aggiungi Sezione</span>
            </button>
          )}
        </div>

        <footer className="mt-16 pt-8 border-t border-white/5 text-center">
          <p className="text-sm text-gray-500 italic mb-4">
            Il manuale è in continua evoluzione grazie al contributo di tutta la community.
          </p>
          <div className="flex justify-center gap-4">
            <button 
              onClick={() => navigate('/privacy')}
              className="text-xs text-gray-600 hover:text-blue-400 transition-colors font-medium uppercase tracking-widest"
            >
              Privacy & Cookie Policy
            </button>
          </div>
        </footer>
      </div>
      <Toast
        isVisible={toast.isVisible}
        message={toast.message}
        type={toast.type}
        position="top-center"
        onClose={() => setToast({ ...toast, isVisible: false })}
      />
    </div>
  );
}
