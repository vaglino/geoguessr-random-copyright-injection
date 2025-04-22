// ==UserScript==
// @name         Random Copyright Overlay (NMPZ only) - Pixelated & Blurred
// @description  Overlay random, pixelated & blurred copyrights on NMPZ
// @namespace    https://www.geoguessr.com/
// @version      0.4
// @author       bober
// @match        https://www.geoguessr.com/*
// @grant        none
// @run-at       document-start
// @license      GPL-3.0-or-later; http://www.gnu.org/licenses/gpl-3.0.txt
// ==/UserScript==

(function() {
  'use strict';

  // cache for generated legend <img> elements
  const legendCache = new Map();

  // parameters
  const GRID_COLS   = 8;
  const GRID_ROWS   = 8;
  const JITTER      = 0.3;
  const SKIP_P      = 0.3;
  const MIN_FS      = 10;
  const MAX_FS      = 25;
  const MAX_SHEAR   = 55;
  const PX_FACTOR   = 0.9;  // draw at 25% resolution
  const BLUR_PX     = 0.1;   // CSS blur
  const OPACITY     = 0.1;  // text alpha

  // utility randoms
  function randYear() { return 2010 + Math.floor(Math.random()*14); }
  function norm(x, center) { return (x - center) / center; }

  // once we know canvas size, compute cell & center
  function makeOverlay(svCanvas) {
    const W = svCanvas.offsetWidth, H = svCanvas.offsetHeight;
    const cx = W/2, cy = H/2;
    const cellW = W/GRID_COLS, cellH = H/GRID_ROWS;

    // create overlay div
    const overlay = document.createElement('div');
    Object.assign(overlay.style, {
      position:        'absolute',
      top:             '0',
      left:            '0',
      width:           W+'px',
      height:          H+'px',
      pointerEvents:   'none',
      overflow:        'hidden',
      zIndex:          9999
    });
    const parent = svCanvas.parentNode;
    if (getComputedStyle(parent).position === 'static') {
      parent.style.position = 'relative';
    }
    parent.appendChild(overlay);

    // generate one legend img (or clone) and position it
    function placeLegend(col,row) {
      const year = randYear();
      // jittered center of this cell
      const baseX = (col+0.5)*cellW, baseY = (row+0.5)*cellH;
      const x = baseX + (Math.random()-0.5)*2*JITTER*cellW;
      const y = baseY + (Math.random()-0.5)*2*JITTER*cellH;

      const shear = -MAX_SHEAR * norm(x, cx) * Math.abs(norm(y, cy));
      const angle = norm(y, cy) > 0 ? -shear : shear;
      const fs = MIN_FS + (MAX_FS - MIN_FS)*Math.abs(norm(x, cx));

      // get or build the <img> for this year+fs
      const key = year+'-'+Math.round(fs);
      let img = legendCache.get(key);
      if (!img) {
        img = buildLegendImage(year, fs);
        legendCache.set(key, img);
      }

      // clone & position
      const node = img.cloneNode();
      Object.assign(node.style, {
        left:      x+'px',
        top:       y+'px',
        transform: `translate(-50%,-50%) skewY(${angle}deg)`,
      });
      overlay.appendChild(node);
    }

    // build one <img> that has pixelation & blur baked in
    function buildLegendImage(year, fs) {
        const text = `© ${year} Google`;
        // 1) measure with actualBoundingBox metrics
        const measureCtx = document.createElement('canvas').getContext('2d');
        measureCtx.font         = `${year>=2021?'bold ':''}${fs}px "Roboto Condensed", sans-serif`;
        measureCtx.textBaseline = 'top';
        const m = measureCtx.measureText(text);
        const w = Math.ceil(m.actualBoundingBoxLeft + m.actualBoundingBoxRight);
        const h = Math.ceil(m.actualBoundingBoxAscent + m.actualBoundingBoxDescent);

        // 2) pad around that box
        const pad  = 4; // full‑res pixels, adjust up if you still see clipping
        const cw   = Math.ceil((w + pad*2) * PX_FACTOR);
        const ch   = Math.ceil((h + pad*2) * PX_FACTOR);

        // 3) draw into the tiny offscreen canvas
        const off  = document.createElement('canvas');
        off.width  = cw;
        off.height = ch;
        const ctx  = off.getContext('2d');
        ctx.scale(PX_FACTOR, PX_FACTOR);
        ctx.font         = `${year>=2021?'bold ':''}${fs}px "Roboto Condensed", sans-serif`;
        ctx.textBaseline = 'top';
        ctx.fillStyle    = `rgba(255,255,255,${OPACITY})`;
        ctx.fillText(text, pad, pad);

        // 4) turn it into an <img> that you clone later
        const img = new Image();
        img.src = off.toDataURL();
        Object.assign(img.style, {
            position:       'absolute',
            width:          `${w + pad*2}px`,
            height:         `${h + pad*2}px`,
            imageRendering: 'pixelated',
            filter:         `blur(${BLUR_PX}px)`,
            pointerEvents:  'none',
        });
        return img;
    }

    // place them all
    for (let r=0; r<GRID_ROWS; r++) {
      for (let c=0; c<GRID_COLS; c++) {
        if (Math.random() > SKIP_P) placeLegend(c,r);
      }
    }
  }

  // fast poll for the map canvas
  const intv = setInterval(() => {
    const cv = document.querySelector('canvas');
    if (cv && cv.offsetWidth && cv.offsetHeight) {
      clearInterval(intv);
      makeOverlay(cv);
    }
  }, 100);

})();
