import { useState, useEffect, useRef } from 'react';
import { 
  AlignLeft, AlignCenter, AlignRight, AlignJustify, 
  ChevronDown, Link as LinkIcon, ExternalLink 
} from 'lucide-react';
import { clsx } from 'clsx';

interface WYSIWYGEditorProps {
  initialValue: string;
  onChange: (html: string) => void;
}

export function WYSIWYGEditor({ initialValue, onChange }: WYSIWYGEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
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
        // Ensure it opens in new tab
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
    <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
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
                "p-2 rounded-lg transition-all w-10 h-10 flex items-center justify-center",
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
                "p-2 rounded-lg transition-all",
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
              "p-2 rounded-lg transition-all",
              activeStyles.link ? "bg-blue-500 text-white shadow-lg scale-110" : "text-slate-300 hover:text-white hover:bg-white/10"
            )}
            title="Inserisci Link"
          >
            <LinkIcon size={18}/>
          </button>
          <button 
            type="button"
            onMouseDown={(e) => { e.preventDefault(); handleAddLink(true); }} 
            className="p-2 px-3 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-[10px] font-black uppercase tracking-tighter hover:brightness-110 transition-all shadow-lg flex items-center gap-1.5"
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
            className="bg-white/10 border border-white/20 rounded-xl text-[10px] py-2 px-3 text-white outline-none focus:border-blue-500/50 cursor-pointer hover:bg-white/20 transition-all font-black uppercase tracking-widest appearance-none pr-8 min-w-[120px]"
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
              "p-2 rounded-lg font-black text-[10px] px-4 transition-all uppercase tracking-tighter",
              activeStyles.h2 ? "bg-blue-500 text-white shadow-lg scale-110" : "hover:bg-white/10 text-white"
            )} 
            title="Titolo Grande"
          >
            TITOLO H2
          </button>
        </div>

        <div className="relative group/emoji">
          <button type="button" className="p-2 hover:bg-white/10 rounded-lg text-lg flex items-center justify-center w-10 h-10 transition-transform hover:scale-110 active:scale-95">😀</button>
          <div className="absolute bottom-full left-0 mb-4 p-4 bg-[#0d1117]/95 border border-white/10 rounded-[2rem] hidden group-hover/emoji:grid grid-cols-5 gap-3 z-[100] shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-3xl animate-in fade-in slide-in-from-bottom-4 duration-300 border-b-blue-500 w-[280px]">
            {['🏆','🎮','⚔️','🏰','🎖️','🥇','🥈','🥉','📜','⚖️','📢','🔴','🟢','🔵','⭐','🔥','⚡','💎','🛡️','👑'].map(emoji => (
              <button 
                key={emoji}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); document.execCommand('insertText', false, emoji); handleInput(); }}
                className="w-10 h-10 flex items-center justify-center hover:bg-white/20 rounded-2xl text-2xl transition-all hover:scale-125"
              >
                {emoji}
              </button>
            ))}
          </div>
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
        className="w-full bg-black/40 border border-white/10 p-8 rounded-[2rem] text-white text-base outline-none focus:border-blue-500/40 transition-all min-h-[450px] overflow-y-auto shadow-inner text-left regulation-editor-content"
        style={{ textAlign: 'left' }}
      ></div>
      <p className="text-[9px] text-gray-500 italic px-4">Modifica il testo sopra. Clicca sui tasti per applicare lo stile alla selezione.</p>
    </div>
  );
}
