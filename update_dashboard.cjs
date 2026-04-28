const fs = require('fs');
const path = './src/components/TournamentOverlay2v2Dashboard.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1) Add matchType to config state
content = content.replace(
    /const \[config, setConfig\] = useState\(\{[\s\S]*?t1P1: '', t1P2: '', t2P1: '', t2P2: '',\s*\}\);/,
    `const [config, setConfig] = useState({
    t1Name: '', t2Name: '',
    t1P1: '', t1P2: '', t2P1: '', t2P2: '',
    matchType: 'BO3',
  });`
);

// 2) Add BO3/BO5 buttons to config modal
content = content.replace(
    /<div className="flex gap-4">[\s\S]*?<\/button>\s*<\/div>\s*<\/div>\s*<\/div>\s*\)\s*;\s*\}\s*return \(/,
    `<div className="flex gap-4 mb-4">
            <button 
              onClick={() => setConfig({...config, matchType: 'BO3'})}
              className={\`flex-1 py-3 rounded-xl font-black uppercase tracking-widest text-xs transition-all \${config.matchType === 'BO3' ? 'bg-blue-500 text-white shadow-[0_0_20px_rgba(59,130,246,0.3)]' : 'bg-white/5 text-gray-400 hover:bg-white/10'}\`}
            >
              BEST OF 3
            </button>
            <button 
              onClick={() => setConfig({...config, matchType: 'BO5'})}
              className={\`flex-1 py-3 rounded-xl font-black uppercase tracking-widest text-xs transition-all \${config.matchType === 'BO5' ? 'bg-blue-500 text-white shadow-[0_0_20px_rgba(59,130,246,0.3)]' : 'bg-white/5 text-gray-400 hover:bg-white/10'}\`}
            >
              BEST OF 5
            </button>
          </div>
          <div className="flex gap-4">
            <button 
              onClick={handleStartMatch}
              className="flex-1 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl text-white font-black uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-[0_0_30px_rgba(79,70,229,0.3)]"
            >
              Avvia Match
            </button>
          </div>
        </div>
      </div>
    );
  }

  const adjustTimer = (delta) => {
    let newMin = state.timer.min + delta;
    if (newMin < 0) newMin = 0;
    setState({
      ...state,
      timer: { ...state.timer, min: newMin, timestamp: Date.now() }
    });
  };

  return (`
);

// 3) Update handleStartMatch to initialize 5 maps if BO5
content = content.replace(
    /const newState = \{[\s\S]*?maps: \[[\s\S]*?\],[\s\S]*?t1: \{ \.\.\.state\.t1/,
    `const initialMaps = config.matchType === 'BO5' ? [
      { name: '', t1Civs: ['', ''], t2Civs: ['', ''], winner: 0, isNext: false, t1Snipe: '', t2Snipe: '' },
      { name: '', t1Civs: ['', ''], t2Civs: ['', ''], winner: 0, isNext: false, t1Snipe: '', t2Snipe: '' },
      { name: '', t1Civs: ['', ''], t2Civs: ['', ''], winner: 0, isNext: false, t1Snipe: '', t2Snipe: '' },
      { name: '', t1Civs: ['', ''], t2Civs: ['', ''], winner: 0, isNext: false, t1Snipe: '', t2Snipe: '' },
      { name: '', t1Civs: ['', ''], t2Civs: ['', ''], winner: 0, isNext: false, t1Snipe: '', t2Snipe: '' }
    ] : [
      { name: '', t1Civs: ['', ''], t2Civs: ['', ''], winner: 0, isNext: false, t1Snipe: '', t2Snipe: '' },
      { name: '', t1Civs: ['', ''], t2Civs: ['', ''], winner: 0, isNext: false, t1Snipe: '', t2Snipe: '' },
      { name: '', t1Civs: ['', ''], t2Civs: ['', ''], winner: 0, isNext: false, t1Snipe: '', t2Snipe: '' }
    ];

    const newState = {
      ...state,
      maps: initialMaps,
      t1: { ...state.t1`
);

// 4) Update Timer UI
content = content.replace(
    /<div className="bg-\[#0f172a\] p-4 rounded-2xl border border-white\/5">[\s\S]*?<div className="flex items-center gap-2 mb-4">[\s\S]*?<Timer className="text-blue-400" size=\{14\} \/>[\s\S]*?<h3 className="text-xs font-black text-blue-400 tracking-widest">TIMER<\/h3>[\s\S]*?<\/div>[\s\S]*?<div className="flex items-center gap-4 bg-\[#0d111a\] p-3 rounded-xl border border-white\/5">[\s\S]*?<div className="flex-1 flex items-center justify-center gap-2">[\s\S]*?<input type="number" value=\{state\.timer\.min\}[\s\S]*?<\/div>[\s\S]*?<button onClick=\{[\s\S]*?<\/button>[\s\S]*?<\/div>[\s\S]*?<\/div>/,
    `<div className="bg-[#0f172a] p-4 rounded-2xl border border-white/5 h-full">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Timer className="text-blue-400" size={14} />
              <h3 className="text-xs font-black text-blue-400 tracking-widest">TIMER</h3>
            </div>
          </div>
          <div className="flex items-center justify-between gap-3 bg-[#0d111a] p-2 rounded-xl border border-white/5">
            <div className="flex items-center gap-2 px-2">
              <button onClick={() => adjustTimer(-1)} className="p-1 rounded bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-colors" title="-1 minuto">
                <Minus size={14} />
              </button>
              <div className="flex items-center gap-1 font-black text-xs text-white">
                <input type="number" value={state.timer.min} onChange={(e) => setState({ ...state, timer: { ...state.timer, min: parseInt(e.target.value) || 0 } })} className="w-8 bg-transparent text-right outline-none" min="0" />
                <span className="text-white/50">:</span>
                <input type="number" value={state.timer.sec} onChange={(e) => setState({ ...state, timer: { ...state.timer, sec: parseInt(e.target.value) || 0 } })} className="w-8 bg-transparent outline-none" min="0" max="59" />
              </div>
              <button onClick={() => adjustTimer(1)} className="p-1 rounded bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-colors" title="+1 minuto">
                <Plus size={14} />
              </button>
            </div>
            
            <button 
              onClick={() => setState({ ...state, timer: { ...state.timer, active: !state.timer.active, timestamp: Date.now() } })}
              className={\`w-10 h-5 rounded-full transition-colors relative \${state.timer.active ? 'bg-blue-500' : 'bg-white/10'}\`}
            >
              <div className={\`absolute top-1 left-1 w-3 h-3 rounded-full bg-white transition-transform \${state.timer.active ? 'translate-x-5' : ''}\`} />
            </button>
          </div>
        </div>`
);

fs.writeFileSync(path, content);
console.log(path + ' updated');
