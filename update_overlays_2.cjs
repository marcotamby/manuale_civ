const fs = require('fs');

function updateFile(path) {
    let content = fs.readFileSync(path, 'utf8');

    // Make map card slightly larger, add box pulse, update map name label and winner icon
    content = content.replace(
        /\.map-card \{\s*width: 400px; height: 200px;/,
        `.map-card {
            width: 440px; height: 220px;` // Make it slightly larger
    );

    // Box pulse animation
    content = content.replace(
        /\.map-card\.next::before \{/,
        `@keyframes boxPulse {
            0% { box-shadow: 0 0 30px rgba(0, 68, 255, 0.3); }
            50% { box-shadow: 0 0 60px rgba(0, 68, 255, 0.6); }
            100% { box-shadow: 0 0 30px rgba(0, 68, 255, 0.3); }
        }
        .map-card.next { animation: boxPulse 2s infinite; }
        .map-card.next::before {`
    );

    // Update map name label styling for darker bg
    content = content.replace(
        /\.map-name-label \{\s*position: absolute; bottom: 15px; left: 0; width: 100%; text-align: center;\s*font-size: 24px; font-weight: 900; text-transform: uppercase; letter-spacing: 4px;\s*text-shadow: 0 4px 20px rgba\(0,0,0,1\); z-index: 3; color: white;\s*\}/,
        `.map-name-label { 
            position: absolute; bottom: 15px; left: 50%; transform: translateX(-50%);
            padding: 4px 16px; border-radius: 8px; background: rgba(0,0,0,0.7);
            font-size: 22px; font-weight: 900; text-transform: uppercase; letter-spacing: 4px;
            text-shadow: 0 2px 10px rgba(0,0,0,1); z-index: 3; color: white;
            white-space: nowrap;
        }`
    );

    // Update winner icon styling
    content = content.replace(
        /\.winner-icon \{\s*position: absolute; top: 50%; left: 50%; transform: translate\(-50%, -50%\);\s*z-index: 4; display: none; filter: drop-shadow\(0 0 20px rgba\(255,215,0,0\.5\)\);\s*font-size: 60px;\s*\}/,
        `.winner-icon {
            position: absolute; top: 50%; transform: translateY(-50%);
            z-index: 5; display: none; filter: drop-shadow(0 0 20px rgba(255,215,0,0.8));
            font-size: 60px;
        }
        .winner-icon.win-t1 { left: 40px; }
        .winner-icon.win-t2 { right: 40px; }`
    );

    // Update maps render logic for winner icon class
    content = content.replace(
        /<div class="winner-icon" style="display: \$\{map\.winner \? 'block' : 'none'\};">🏆<\/div>/,
        `<div class="winner-icon \${isT1Winner ? 'win-t1' : 'win-t2'}" style="display: \${map.winner ? 'block' : 'none'};">🏆</div>`
    );

    // BEST OF Text dynamic
    // Update the hardcoded best of 3
    content = content.replace(
        /<div class="best-of">BEST OF 3<\/div>/g,
        `<div class="best-of" id="best-of-text">BEST OF 3</div>`
    );
    
    // update the render function to set BEST OF based on maps length
    if (!content.includes(`document.getElementById('best-of-text').innerText =`)) {
        content = content.replace(
            /const mapsContainer = document\.getElementById\('maps-section'\);/,
            `const bestOfElem = document.getElementById('best-of-text');
            if (bestOfElem) bestOfElem.innerText = \`BEST OF \${state.maps?.length || 3}\`;
            
            const mapsContainer = document.getElementById('maps-section');`
        );
    }

    // Replace the specific animation from previous version that wasn't replacing correctly if existed
    // No need if we do it cleanly.

    fs.writeFileSync(path, content);
    console.log(path + ' updated');
}

updateFile('./public/overlays/tournament-2v2-high-match/index.html');
updateFile('./public/overlays/tournament-2v2-low-match/index.html');
