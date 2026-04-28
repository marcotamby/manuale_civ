const fs = require('fs');

function updateFile(path) {
    let content = fs.readFileSync(path, 'utf8');

    // Update CSS
    content = content.replace(
        /\/\* Maps Section \*\/[\s\S]*?@keyframes pulse/m,
        `/* Maps Section */
        #maps-section {
            position: absolute; top: 220px; left: 50%; transform: translateX(-50%);
            display: flex; gap: 40px; justify-content: center; width: 100%;
            padding: 0 100px;
        }
        
        .map-card {
            width: 400px; height: 200px; background: var(--bg-dark); border-radius: 20px; 
            border: 2px solid rgba(255,255,255,0.05); overflow: hidden;
            box-shadow: 0 20px 60px rgba(0,0,0,0.8);
            transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
            position: relative;
            display: flex; align-items: center; justify-content: center;
        }
        .map-card.next { 
            border-color: var(--blue); 
            box-shadow: 0 0 50px rgba(0, 68, 255, 0.3);
            transform: scale(1.05);
        }
        .map-card.next::before {
            content: 'PROSSIMO GAME';
            position: absolute; top: 10px; left: 50%; transform: translateX(-50%);
            background: var(--blue); color: white; padding: 4px 15px; border-radius: 20px;
            font-size: 10px; font-weight: 900; letter-spacing: 2px; z-index: 10;
            animation: pulse 2s infinite;
        }

        .map-image { position: absolute; inset: 0; background-size: cover; background-position: center; z-index: 1; }
        .map-overlay { position: absolute; inset: 0; background: linear-gradient(to top, rgba(0,0,0,0.9), rgba(0,0,0,0.2)); z-index: 2; }
        
        .map-name-label { 
            position: absolute; bottom: 15px; left: 0; width: 100%; text-align: center;
            font-size: 24px; font-weight: 900; text-transform: uppercase; letter-spacing: 4px;
            text-shadow: 0 4px 20px rgba(0,0,0,1); z-index: 3; color: white;
        }

        .winner-icon {
            position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
            z-index: 4; display: none; filter: drop-shadow(0 0 20px rgba(255,215,0,0.5));
            font-size: 60px;
        }

        /* Left/Right Civ Layout */
        .civs-left, .civs-right {
            position: absolute; top: 0; bottom: 0; width: 120px;
            display: flex; flex-direction: column; z-index: 3;
        }
        .civs-left { left: 0; }
        .civs-right { right: 0; }

        .map-civ-flag {
            flex: 1; background-size: cover; background-position: center;
            position: relative;
        }
        .civs-left .map-civ-flag {
            -webkit-mask-image: linear-gradient(to right, black 20%, transparent 100%);
            mask-image: linear-gradient(to right, black 20%, transparent 100%);
        }
        .civs-right .map-civ-flag {
            -webkit-mask-image: linear-gradient(to left, black 20%, transparent 100%);
            mask-image: linear-gradient(to left, black 20%, transparent 100%);
        }
        
        .map-civ-flag.sniped { filter: grayscale(1) brightness(0.3); }
        .map-civ-flag.sniped::after {
            content: '✕'; position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
            color: #ff4444; font-size: 40px; font-weight: 900; text-shadow: 0 0 15px rgba(0,0,0,1);
        }

        .map-card.loser-t1 .civs-left .map-civ-flag { filter: brightness(0.4) grayscale(0.5); }
        .map-card.loser-t2 .civs-right .map-civ-flag { filter: brightness(0.4) grayscale(0.5); }

        @keyframes pulse`
    );

    // Update getCivFlagUrl
    content = content.replace(
        /function getCivFlagUrl\(id\) \{[\s\S]*?return `\/civs\/\$\{name\}\.webp`;\n        \}/,
        `function getCivFlagUrl(id) {
            if (!id) return '';
            const mapping = {
                'abbasid': 'Abbasid Dynasty', 'ayyubids': 'Ayyubids', 'byzantines': 'Byzantines',
                'chinese': 'Chinese', 'delhi': 'Delhi Sultanate', 'english': 'English',
                'french': 'French', 'hre': 'Holy Roman Empire', 'japanese': 'Japanese',
                'jeannedarc': 'jeannedarc', 'malians': 'Malians', 'mongols': 'Mongols',
                'orderofthedragon': 'Order of the Dragon', 'ottomans': 'Ottomans',
                'rus': 'Rus', 'zhuxi': 'Zhu Xis Legacy',
                'goldenhorde': 'Golden Horde', 'lancaster': 'House of Lancaster',
                'templar': 'Knights Templar', 'macedonian': 'Macedonian Dynasty',
                'sengoku': 'Sengoku Daimyo', 'tughlaq': 'Tughlaq Dynasty'
            };
            const name = mapping[id.toLowerCase()] || id;
            return \`/civs/\${name}.png\`;
        }`
    );

    // Update maps render logic
    content = content.replace(
        /\/\/ Maps\s+const mapsContainer = document\.getElementById\('maps-section'\);\s+mapsContainer\.innerHTML = '';\s+\(state\.maps \|\| \[\]\)\.forEach\(\(map, idx\) => \{[\s\S]*?mapsContainer\.appendChild\(card\);\s+\}\);/m,
        `// Maps
            const mapsContainer = document.getElementById('maps-section');
            mapsContainer.innerHTML = '';
            (state.maps || []).forEach((map, idx) => {
                const isT1Winner = map.winner === 1;
                const isT2Winner = map.winner === 2;
                const loserT1Class = isT2Winner ? 'loser-t1' : '';
                const loserT2Class = isT1Winner ? 'loser-t2' : '';
                
                const card = document.createElement('div');
                card.className = \`map-card \${map.isNext ? 'next' : ''} \${loserT1Class} \${loserT2Class}\`;
                
                let t1FlagsHTML = '';
                (map.t1Civs || []).forEach(civId => {
                    if (civId) t1FlagsHTML += \`<div class="map-civ-flag \${map.t1Snipe === civId ? 'sniped' : ''}" style="background-image: url('\${getCivFlagUrl(civId)}')"></div>\`;
                });
                if (map.t1Snipe && !(map.t1Civs || []).includes(map.t1Snipe)) {
                    t1FlagsHTML += \`<div class="map-civ-flag sniped" style="background-image: url('\${getCivFlagUrl(map.t1Snipe)}')"></div>\`;
                }

                let t2FlagsHTML = '';
                (map.t2Civs || []).forEach(civId => {
                    if (civId) t2FlagsHTML += \`<div class="map-civ-flag \${map.t2Snipe === civId ? 'sniped' : ''}" style="background-image: url('\${getCivFlagUrl(civId)}')"></div>\`;
                });
                if (map.t2Snipe && !(map.t2Civs || []).includes(map.t2Snipe)) {
                    t2FlagsHTML += \`<div class="map-civ-flag sniped" style="background-image: url('\${getCivFlagUrl(map.t2Snipe)}')"></div>\`;
                }

                const mapNameStr = map.name ? map.name : 'TBD';
                card.innerHTML = \`
                    <div class="map-image" style="background-image: url('\${getMapUrl(map.name)}')"></div>
                    <div class="map-overlay"></div>
                    
                    <div class="civs-left">
                        \${t1FlagsHTML}
                    </div>
                    <div class="civs-right">
                        \${t2FlagsHTML}
                    </div>
                    
                    <div class="map-name-label">\${mapNameStr}</div>
                    <div class="winner-icon" style="display: \${map.winner ? 'block' : 'none'};">🏆</div>
                \`;
                mapsContainer.appendChild(card);
            });`
    );

    fs.writeFileSync(path, content);
    console.log(path + ' updated');
}

updateFile('./public/overlays/tournament-2v2-high-match/index.html');
updateFile('./public/overlays/tournament-2v2-low-match/index.html');
