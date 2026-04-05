const fs = require('fs');
const { PNG } = require('pngjs');

// 6 Characters
const numChars = 6;
// 10 columns
const numFrames = 10;
// 3 rows (down, up, right)
const numDirs = 3;

const w = 16;
const h = 32;

const outDir = '../webview-ui/public/assets/characters';

const skinColors = [
  [255, 224, 189], // Light
  [241, 194, 125], // Tan
  [141, 85, 36],    // Dark
  [255, 205, 148], // Medium light
  [198, 134, 66],   // Medium dark
  [255, 224, 189], // Light (reserved for Antigravity)
];

const suitColors = [
  [30, 30, 40],   // 0: Black/Dark Grey
  [20, 20, 60],   // 1: Navy Blue
  [100, 100, 110], // 2: Grey
  [80, 50, 40],   // 3: Brown
  [50, 60, 50],   // 4: Dark Green
  [250, 250, 250], // 5: WHITE (Antigravity)
];

const tieColors = [
  [150, 20, 20], // Red
  [20, 150, 20], // Green
  [20, 20, 150], // Blue
  [150, 150, 20], // Yellow
  [20, 150, 150], // Cyan
  [50, 50, 50],  // Dark (Antigravity tie)
];

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

for (let c = 0; c < numChars; c++) {
  const png = new PNG({ width: w * numFrames, height: h * numDirs });
  
  const skin = skinColors[c];
  const suit = suitColors[c];
  const tie = tieColors[c];
  const glasses = [10, 10, 10];
  const phone = [80, 80, 80];

  function setPixel(px, py, color, alpha=255) {
    if (px < 0 || px >= png.width || py < 0 || py >= png.height) return;
    const idx = (png.width * py + px) << 2;
    png.data[idx] = color[0];
    png.data[idx+1] = color[1];
    png.data[idx+2] = color[2];
    png.data[idx+3] = alpha;
  }

  function drawRect(ox, oy, w_px, h_px, color) {
    for (let y = oy; y < oy + h_px; y++) {
      for (let x = ox; x < ox + w_px; x++) {
        setPixel(x, y, color);
      }
    }
  }

  // Draw each frame
  for (let dir = 0; dir < numDirs; dir++) {
    for (let frame = 0; frame < numFrames; frame++) {
      const basex = frame * w;
      const basey = dir * h;

      // Base Head
      drawRect(basex + 5, basey + 3, 6, 6, skin);
      
      // Glasses
      if (dir === 0) { // Down
        drawRect(basex + 5, basey + 5, 2, 2, glasses); // eye L
        drawRect(basex + 9, basey + 5, 2, 2, glasses); // eye R
        drawRect(basex + 7, basey + 5, 2, 1, glasses); // bridge
      } else if (dir === 2) { // Right
        drawRect(basex + 8, basey + 5, 3, 2, glasses); // eye R
        drawRect(basex + 5, basey + 5, 3, 1, glasses); // frame
      }
      
      let bodyOffset = 0;
      let handY = basey + 16;
      let leftLegOffset = 0;
      let rightLegOffset = 0;

      // Walk cycle offsets
      if (frame === 1) { leftLegOffset = -2; rightLegOffset = 2; bodyOffset=1; }
      if (frame === 3) { leftLegOffset = 2; rightLegOffset = -2; bodyOffset=1; }
      
      // Type/Idle cycle
      if (frame >= 4 && frame <= 6) {
        // Just small hand movements
        handY = basey + 14 + (frame % 2);
      }
      
      // Dance Cycle
      if (frame === 9) {
        bodyOffset = Math.sin(frame * 10) > 0 ? 1 : 0;
        leftLegOffset = Math.sin(frame * 5) > 0 ? 2 : -2;
        rightLegOffset = Math.cos(frame * 5) > 0 ? 2 : -2;
        handY = basey + 12; // Arms up!
      }

      const sitCouch = frame === 7;
      const sitFloor = frame === 8;

      if (sitCouch || sitFloor) {
        bodyOffset = 3;
        handY = basey + 15;
      }

      // Torso
      drawRect(basex + 4, basey + 9 + bodyOffset, 8, 10 - (sitCouch||sitFloor?2:0), suit);
      
      // Tie (front only)
      if (dir === 0) {
        drawRect(basex + 7, basey + 10 + bodyOffset, 2, 5, tie);
      } else if (dir === 2) {
        drawRect(basex + 9, basey + 10 + bodyOffset, 1, 5, tie);
      }
      
      // Legs
      if (sitCouch) {
         // sitting out forward
         drawRect(basex + 4, basey + 19, 8, 3, suit); // thighs
         if (dir === 0) {
            drawRect(basex + 4, basey + 22, 2, 4, suit);
            drawRect(basex + 10, basey + 22, 2, 4, suit);
         } else {
            drawRect(basex + 7, basey + 22, 4, 4, suit);
         }
      } else if (sitFloor) {
         // sitting cross legged
         drawRect(basex + 2, basey + 19, 12, 4, suit);
      } else {
        // standing/walking
        const legW = dir === 2 ? 4 : 3;
        if (dir === 0 || dir === 1) {
          drawRect(basex + 4, basey + 19 + leftLegOffset, legW, 7, suit);
          drawRect(basex + 9, basey + 19 + rightLegOffset, legW, 7, suit);
        } else {
          // right
          drawRect(basex + 6 + rightLegOffset/2, basey + 19 + rightLegOffset, legW, 7, suit);
          drawRect(basex + 6 + leftLegOffset/2, basey + 19 + leftLegOffset, legW, 7, suit);
        }
      }

      // Arms & Hands
      if (dir === 0 || dir === 1) {
         drawRect(basex + 2, basey + 10 + bodyOffset, 2, 6, suit); // Arm L
         drawRect(basex + 12, basey + 10 + bodyOffset, 2, 6, suit); // Arm R
         drawRect(basex + 2, handY, 2, 2, skin); // Hand L
         drawRect(basex + 12, handY, 2, 2, skin); // Hand R
      } else {
         drawRect(basex + 5, basey + 10 + bodyOffset, 3, 6, suit); // Arm Side
         drawRect(basex + 5, handY, 3, 2, skin); // Hand Side
      }

      // Phone
      if (sitCouch || sitFloor) {
         drawRect(basex + 6, handY - 1, 4, 3, phone);
      }
    }
  }

  const outPath = `${outDir}/char_${c}.png`;
  png.pack().pipe(fs.createWriteStream(outPath));
  console.log(`Saved ${outPath}`);
}

// --- Jukebox Generation ---
const jukeDir = '../webview-ui/public/assets/furniture/JUKEBOX';
if (!fs.existsSync(jukeDir)) {
  fs.mkdirSync(jukeDir, { recursive: true });
}

const jukePng = new PNG({ width: 32, height: 32 });
// Draw a basic retro jukebox (32x32)
for (let y = 0; y < 32; y++) {
  for (let x = 0; x < 32; x++) {
     const idx = (jukePng.width * y + x) << 2;
     // Base color (dark grey/brown)
     let r = 80, g = 60, b = 50, a = 255;
     
     // Blue screen/lights
     if (x > 8 && x < 24 && y > 6 && y < 14) {
        r = 100; g = 200; b = 255;
     }

     // Speaker grille
     if (x > 6 && x < 26 && y > 18 && y < 28) {
        r = 40; g = 30; b = 25;
        if ((x + y) % 2 === 0) { r += 20; g += 15; b += 10; }
     }

     // Chrome trim
     if (x === 6 || x === 26 || y === 6 || y === 28) {
        r = 200; g = 200; b = 200;
     }

     // Transparency outside the jukebox shape
     const distFromCenter = Math.abs(x - 16);
     if (distFromCenter > 12 || y < 4 || y > 30) {
        a = 0;
     }

     jukePng.data[idx] = r;
     jukePng.data[idx+1] = g;
     jukePng.data[idx+2] = b;
     jukePng.data[idx+3] = a;
  }
}

jukePng.pack().pipe(fs.createWriteStream(`${jukeDir}/JUKEBOX.png`));
console.log(`Saved ${jukeDir}/JUKEBOX.png`);

// Write manifest
const jukeManifest = {
  id: "JUKEBOX",
  name: "Jukebox",
  category: "electronics",
  type: "asset",
  file: "JUKEBOX.png",
  width: 32,
  height: 32,
  footprintW: 2,
  footprintH: 2
};
fs.writeFileSync(`${jukeDir}/manifest.json`, JSON.stringify(jukeManifest, null, 2));
console.log(`Saved ${jukeDir}/manifest.json`);
