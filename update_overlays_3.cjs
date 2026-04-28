const fs = require('fs');

function update(path) {
    let css = fs.readFileSync(path, 'utf8');
    
    // Fix map-wrapper and map-card
    css = css.replace(/\.map-card \{[\s\S]*?justify-content: center;\n        \}/, `.map-wrapper {
            display: flex; flex-direction: column; align-items: center; gap: 15px;
            transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .map-wrapper.next {
            transform: scale(1.05);
        }
        
        .map-card {
            width: 440px; height: 220px; background: var(--bg-dark); border-radius: 20px; 
            border: 2px solid rgba(255,255,255,0.05); overflow: hidden;
            box-shadow: 0 20px 60px rgba(0,0,0,0.8);
            position: relative;
        }`);

    // Update animations for wrapper
    css = css.replace(/\.map-card\.next \{ animation: boxPulse 2s infinite; \}/, `.map-wrapper.next .map-card { animation: boxPulse 2s infinite; border-color: var(--blue); }`);
    css = css.replace(/\.map-card\.next::before \{/, `.map-wrapper.next .map-card::before {`);
    
    // Fix map-name-label
    css = css.replace(/\.map-name-label \{[\s\S]*?\}/, `.map-name-label { 
            padding: 6px 20px; border-radius: 8px; background: rgba(0,0,0,0.8);
            font-size: 20px; font-weight: 900; text-transform: uppercase; letter-spacing: 4px;
            text-shadow: 0 2px 10px rgba(0,0,0,1); z-index: 3; color: white;
            white-space: nowrap;
            border: 1px solid rgba(255,255,255,0.1);
        }`);
        
    // Fix winner icon size
    css = css.replace(/font-size: 60px;/, `font-size: 35px;`);
    
    // Replace loser-t1 / loser-t2 targeting
    css = css.replace(/\.map-card\.loser-t1 \.civs-left \.map-civ-flag \{/g, `.map-wrapper.loser-t1 .civs-left .map-civ-flag {`);
    css = css.replace(/\.map-card\.loser-t2 \.civs-right \.map-civ-flag \{/g, `.map-wrapper.loser-t2 .civs-right .map-civ-flag {`);
    
    // Replace JS render logic
    css = css.replace(/const card = document\.createElement\('div'\);[\s\S]*?mapsContainer\.appendChild\(card\);/, `const wrapper = document.createElement('div');
                wrapper.className = \`map-wrapper \${map.isNext ? 'next' : ''} \${loserT1Class} \${loserT2Class}\`;
                
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
                wrapper.innerHTML = \`
                    <div class="map-card">
                        <div class="map-image" style="background-image: url('\${getMapUrl(map.name)}')"></div>
                        <div class="map-overlay"></div>
                        
                        <div class="civs-left">
                            \${t1FlagsHTML}
                        </div>
                        <div class="civs-right">
                            \${t2FlagsHTML}
                        </div>
                        
                        <div class="winner-icon \${isT1Winner ? 'win-t1' : 'win-t2'}" style="display: \${map.winner ? 'block' : 'none'};">🏆</div>
                    </div>
                    <div class="map-name-label">\${mapNameStr}</div>
                \`;
                mapsContainer.appendChild(wrapper);`);

    // Clean up old map-card.next styles that might have been left
    css = css.replace(/\.map-card\.next \{ \s*border-color: var\(--blue\); \s*box-shadow: 0 0 50px rgba\(0, 68, 255, 0\.3\);\s*transform: scale\(1\.05\);\s*\}/, '');

    fs.writeFileSync(path, css);
}

update('public/overlays/tournament-2v2-high-match/index.html');
update('public/overlays/tournament-2v2-low-match/index.html');
