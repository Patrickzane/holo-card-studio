import { PRESETS, FOIL_TEXTURES } from './presets.js';
import { generateAutoSubjectMask, generateDemoArtwork } from './mask-generator.js';
import { HoloCardEngine } from './card-engine.js';
import { exportHoloGif } from './gif-exporter.js';

const cardEl = document.getElementById('card');
const rotatorEl = document.getElementById('rotator');
const artworkEl = document.getElementById('artwork');

const customGrid = document.getElementById('customPresetGrid');
const officialGrid = document.getElementById('officialPresetGrid');
const foilSelect = document.getElementById('foilSelect');

const toggleSlab = document.getElementById('toggleSlab');
const toggleBevel = document.getElementById('toggleBevel');
const toggleFullBleed = document.getElementById('toggleFullBleed');
const toggleAutoMask = document.getElementById('toggleAutoMask');
const toggleIdle = document.getElementById('toggleIdle');

const intensityRange = document.getElementById('intensityRange');
const tiltRange = document.getElementById('tiltRange');
const radiusRange = document.getElementById('radiusRange');
const sizeRange = document.getElementById('sizeRange');

const intensityVal = document.getElementById('intensityVal');
const tiltVal = document.getElementById('tiltVal');
const radiusVal = document.getElementById('radiusVal');
const sizeVal = document.getElementById('sizeVal');

const backBadgeInput = document.getElementById('backBadgeInput');
const backTitleInput = document.getElementById('backTitleInput');
const backDescInput = document.getElementById('backDescInput');

const backBadgeEl = document.getElementById('backBadge');
const backTitleEl = document.getElementById('backTitle');
const backDescEl = document.getElementById('backDesc');

const toastEl = document.getElementById('toast');

let currentPreset = PRESETS[0];
let currentFoilMode = 'auto';
let customMaskDataUrl = null;
let autoMaskDataUrl = null;
let currentAspect = 0.718;

const engine = new HoloCardEngine(cardEl, rotatorEl);

function showToast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => toastEl.classList.remove('show'), 2600);
}

function applyPreset(presetId) {
  const preset = PRESETS.find((p) => p.id === presetId) || PRESETS[0];
  currentPreset = preset;

  // Reset upstream attributes cleanly
  ['data-subtypes', 'data-supertype', 'data-trainer-gallery', 'data-number', 'data-set', 'data-preset-group'].forEach((attr) =>
    cardEl.removeAttribute(attr)
  );

  cardEl.setAttribute('data-rarity', preset.rarity);
  if (preset.presetGroup) {
    cardEl.setAttribute('data-preset-group', preset.presetGroup);
  }
  Object.entries(preset.attrs || {}).forEach(([k, v]) => {
    cardEl.setAttribute(`data-${k}`, v);
  });

  document.documentElement.style.setProperty('--card-glow', preset.glow || '#7dd3fc');
  applyFoilOverride();

  document.querySelectorAll('.preset-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.presetId === preset.id);
  });
}

function applyFoilOverride() {
  const foilVal = currentFoilMode === 'auto' ? currentPreset.foil : currentFoilMode;
  if (!foilVal || foilVal === 'none') {
    cardEl.style.removeProperty('--foil');
  } else {
    cardEl.style.setProperty('--foil', `url("${foilVal}")`);
  }
}

function applyMaskState() {
  if (customMaskDataUrl) {
    cardEl.style.setProperty('--mask', `url("${customMaskDataUrl}")`);
    cardEl.classList.add('masked');
  } else if (toggleAutoMask.checked && autoMaskDataUrl) {
    cardEl.style.setProperty('--mask', `url("${autoMaskDataUrl}")`);
    cardEl.classList.add('masked');
  } else {
    cardEl.style.removeProperty('--mask');
    cardEl.classList.remove('masked');
  }
}

function updateCardSizing() {
  const userMaxW = Number(sizeRange.value) || 400;
  // Constrain height for ultra-tall cards while allowing landscape cards to breathe
  const vwLimit = window.innerWidth < 900 ? window.innerWidth * 0.86 : (window.innerWidth - 380) * 0.82;
  const vhLimit = window.innerHeight * 0.72;
  const maxWidthByHeight = vhLimit * currentAspect;
  const finalW = Math.max(220, Math.min(userMaxW, vwLimit, maxWidthByHeight));
  document.documentElement.style.setProperty('--card-width', `${Math.round(finalW)}px`);
  document.documentElement.style.setProperty('--card-aspect', `${currentAspect.toFixed(4)}`);
}

function loadImageSrc(src, label) {
  customMaskDataUrl = null;
  artworkEl.onload = () => {
    const nw = artworkEl.naturalWidth || 900;
    const nh = artworkEl.naturalHeight || 1254;
    currentAspect = nw / nh;
    updateCardSizing();
    try {
      autoMaskDataUrl = generateAutoSubjectMask(artworkEl);
    } catch {
      autoMaskDataUrl = null;
    }
    applyMaskState();
    if (label) showToast(`已加载：${label}`);
  };
  artworkEl.src = src;
}

function renderSidebarOptions() {
  PRESETS.forEach((p) => {
    const btn = document.createElement('button');
    btn.className = 'preset-btn';
    btn.dataset.presetId = p.id;
    btn.title = p.desc;
    btn.textContent = p.name;
    btn.addEventListener('click', () => applyPreset(p.id));
    if (p.group === 'custom') {
      customGrid.appendChild(btn);
    } else {
      officialGrid.appendChild(btn);
    }
  });

  FOIL_TEXTURES.forEach((tex) => {
    const opt = document.createElement('option');
    opt.value = tex.value;
    opt.textContent = tex.label;
    foilSelect.appendChild(opt);
  });
}

function handleFileUpload(file) {
  if (!file || !file.type.startsWith('image/')) {
    showToast('请上传图片文件（JPG / PNG / WebP）');
    return;
  }
  const reader = new FileReader();
  reader.onload = (ev) => {
    document.querySelectorAll('.demo-btn').forEach((b) => b.classList.remove('active'));
    loadImageSrc(ev.target.result, file.name);
  };
  reader.readAsDataURL(file);
}

function buildEmbedUrl() {
  const url = new URL(window.location.href);
  url.search = '';
  url.searchParams.set('embed', '1');
  url.searchParams.set('preset', currentPreset.id);
  if (currentFoilMode !== 'auto') url.searchParams.set('foil', currentFoilMode);
  url.searchParams.set('slab', toggleSlab.checked ? '1' : '0');
  url.searchParams.set('bevel', toggleBevel.checked ? '1' : '0');
  url.searchParams.set('full', toggleFullBleed.checked ? '1' : '0');
  url.searchParams.set('idle', toggleIdle.checked ? '1' : '0');
  url.searchParams.set('intensity', intensityRange.value);
  url.searchParams.set('tilt', tiltRange.value);
  url.searchParams.set('radius', radiusRange.value);
  return url.toString();
}

function exportStandaloneHtml() {
  const activePreset = currentPreset;
  const foilVal = currentFoilMode === 'auto' ? activePreset.foil : currentFoilMode;
  const origin = window.location.origin;
  const resolveAsset = (path) => (path && path.startsWith('/') ? `${origin}${path}` : path);

  const imgSrc = artworkEl.src;
  const isSlab = toggleSlab.checked;
  const isBevel = toggleBevel.checked;
  const isFull = toggleFullBleed.checked;
  const radiusPx = radiusRange.value;
  const intensity = Number(intensityRange.value) / 100;
  const maxTilt = Number(tiltRange.value);

  const docHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${backTitleEl.textContent} - 3D Holo Card</title>
<link rel="stylesheet" href="${origin}/css/cards.css" />
<link rel="stylesheet" href="${origin}/css/cards/base.css" />
<link rel="stylesheet" href="${origin}/css/cards/amazing-rare.css" />
<link rel="stylesheet" href="${origin}/css/cards/cosmos-holo.css" />
<link rel="stylesheet" href="${origin}/css/cards/radiant-holo.css" />
<link rel="stylesheet" href="${origin}/css/cards/rainbow-alt.css" />
<link rel="stylesheet" href="${origin}/css/cards/rainbow-holo.css" />
<link rel="stylesheet" href="${origin}/css/cards/regular-holo.css" />
<link rel="stylesheet" href="${origin}/css/cards/reverse-holo.css" />
<link rel="stylesheet" href="${origin}/css/cards/secret-rare.css" />
<link rel="stylesheet" href="${origin}/css/cards/shiny-rare.css" />
<link rel="stylesheet" href="${origin}/css/cards/shiny-v.css" />
<link rel="stylesheet" href="${origin}/css/cards/shiny-vmax.css" />
<link rel="stylesheet" href="${origin}/css/cards/trainer-gallery-holo.css" />
<link rel="stylesheet" href="${origin}/css/cards/v-full-art.css" />
<link rel="stylesheet" href="${origin}/css/cards/v-max.css" />
<link rel="stylesheet" href="${origin}/css/cards/v-regular.css" />
<link rel="stylesheet" href="${origin}/css/cards/v-star.css" />
<link rel="stylesheet" href="${origin}/css/custom/shaders.css" />
<link rel="stylesheet" href="${origin}/css/enhancements.css" />
<style>
  html, body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: radial-gradient(circle at 50% 45%, #1d2130 0%, #090b10 100%); font-family: system-ui, sans-serif; overflow: hidden; }
  :root { --card-aspect: ${currentAspect.toFixed(4)}; --card-width: min(460px, 86vw); --card-radius: ${radiusPx}px; --holo-intensity: ${intensity}; --card-glow: ${activePreset.glow}; }
  .card { --foil: ${foilVal && foilVal !== 'none' ? `url("${resolveAsset(foilVal)}")` : 'none'}; }
</style>
</head>
<body>
  <div class="stage">
    <div class="studio-aura"></div>
    <div class="card-wrap">
      <div class="card-shadow"></div>
      <div class="card interactive ${isFull ? 'full-bleed' : ''} ${isSlab ? 'has-slab' : ''} ${isBevel ? 'has-bevel' : ''}" id="card" data-rarity="${activePreset.rarity}">
        <div class="card__translater">
          <div class="card__rotator" id="rotator">
            ${Array.from({ length: 8 }, (_, i) => `<div class="slab-layer" style="transform: translateZ(-${i + 1}px); filter: brightness(${(1 - i * 0.045).toFixed(2)});"></div>`).join('\n            ')}
            <div class="card__back">
              <div class="card-back__badge">${backBadgeEl.textContent}</div>
              <div class="card-back__title">${backTitleEl.textContent}</div>
              <div class="card-back__desc">${backDescEl.textContent}</div>
              <div class="metallic-bevel"></div>
            </div>
            <div class="card__front">
              <img class="card__artwork" src="${imgSrc}" alt="Holo Card" />
              <div class="card__shine"></div>
              <div class="card__glare"></div>
              <div class="metallic-bevel"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  <script>
    const root = document.documentElement, rot = document.getElementById('rotator'), card = document.getElementById('card');
    let hv = false, fl = false, tx = 0, ty = 0, px = 50, py = 50, cx = 0, cy = 0, cpx = 50, cpy = 50, cf = 0, it = 0;
    function upd(clientX, clientY) {
      const r = card.getBoundingClientRect();
      const x = Math.max(0, Math.min(1, (clientX - r.left) / r.width)), y = Math.max(0, Math.min(1, (clientY - r.top) / r.height));
      px = x * 100; py = y * 100; tx = (x - 0.5) * ${maxTilt * 2} * (fl ? -1 : 1); ty = (0.5 - y) * ${maxTilt * 1.45};
    }
    card.addEventListener('pointerenter', (e) => { hv = true; card.classList.add('interacting'); upd(e.clientX, e.clientY); });
    card.addEventListener('pointermove', (e) => { hv = true; upd(e.clientX, e.clientY); });
    card.addEventListener('pointerleave', () => { hv = false; card.classList.remove('interacting'); });
    card.addEventListener('click', (e) => { e.preventDefault(); fl = !fl; });
    (function tick(){
      it += 0.022;
      if (!hv && ${toggleIdle.checked ? 'true' : 'false'}) { tx = Math.sin(it) * ${maxTilt * 0.45}; ty = Math.cos(it * 0.85) * ${maxTilt * 0.3}; px = 50 + Math.sin(it) * 24; py = 50 + Math.cos(it * 0.85) * 18; }
      cx += (tx - cx) * 0.12; cy += (ty - cy) * 0.12; cpx += (px - cpx) * 0.14; cpy += (py - cpy) * 0.14; cf += ((fl ? 180 : 0) - cf) * 0.1;
      const flt = hv ? 0 : Math.sin(it) * -6;
      const fl_l = cpx / 100, fl_t = cpy / 100, fc = Math.min(1, Math.hypot(fl_l - 0.5, fl_t - 0.5) * 1.42);
      const ang = Math.atan2(cpy - 50, cpx - 50) * (180 / Math.PI) + 135;
      const s = root.style;
      s.setProperty('--pointer-x', cpx.toFixed(2) + '%'); s.setProperty('--pointer-y', cpy.toFixed(2) + '%');
      s.setProperty('--pointer-from-left', fl_l.toFixed(4)); s.setProperty('--pointer-from-top', fl_t.toFixed(4));
      s.setProperty('--pointer-from-center', fc.toFixed(4));
      s.setProperty('--background-x', (37 + fl_l * 26).toFixed(2) + '%'); s.setProperty('--background-y', (33 + fl_t * 34).toFixed(2) + '%');
      s.setProperty('--rotate-x', cx.toFixed(2) + 'deg'); s.setProperty('--rotate-y', cy.toFixed(2) + 'deg');
      s.setProperty('--flip-y', cf.toFixed(2) + 'deg'); s.setProperty('--pointer-angle', ang.toFixed(1) + 'deg');
      s.setProperty('--angle', ang.toFixed(1) + 'deg'); s.setProperty('--translate-y', flt.toFixed(2) + 'px');
      requestAnimationFrame(tick);
    })();
  </script>
</body>
</html>`;

  const blob = new Blob([docHtml], { type: 'text/html;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `holo-card-${activePreset.id}.html`;
  a.click();
  URL.revokeObjectURL(a.href);
  showToast('已导出独立交互卡片 HTML');
}

function bindControls() {
  document.getElementById('imageInput').addEventListener('change', (e) => {
    if (e.target.files?.[0]) handleFileUpload(e.target.files[0]);
  });

  document.getElementById('maskInput').addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      customMaskDataUrl = ev.target.result;
      applyMaskState();
      showToast('已应用自定义局部闪卡遮罩');
    };
    reader.readAsDataURL(file);
  });

  document.getElementById('clearMaskBtn').addEventListener('click', () => {
    customMaskDataUrl = null;
    applyMaskState();
    showToast('已清除自定义遮罩');
  });

  document.querySelectorAll('.demo-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.demo-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      loadImageSrc(generateDemoArtwork(btn.dataset.demo), btn.textContent.trim());
    });
  });

  foilSelect.addEventListener('change', (e) => {
    currentFoilMode = e.target.value;
    applyFoilOverride();
  });

  toggleSlab.addEventListener('change', () => cardEl.classList.toggle('has-slab', toggleSlab.checked));
  toggleBevel.addEventListener('change', () => cardEl.classList.toggle('has-bevel', toggleBevel.checked));
  toggleFullBleed.addEventListener('change', () => cardEl.classList.toggle('full-bleed', toggleFullBleed.checked));
  toggleAutoMask.addEventListener('change', applyMaskState);
  toggleIdle.addEventListener('change', () => {
    engine.idleEnabled = toggleIdle.checked;
  });

  intensityRange.addEventListener('input', () => {
    intensityVal.textContent = `${intensityRange.value}%`;
    document.documentElement.style.setProperty('--holo-intensity', (Number(intensityRange.value) / 100).toFixed(2));
  });

  tiltRange.addEventListener('input', () => {
    tiltVal.textContent = `${tiltRange.value}°`;
    engine.maxTilt = Number(tiltRange.value);
  });

  radiusRange.addEventListener('input', () => {
    radiusVal.textContent = `${radiusRange.value}px`;
    document.documentElement.style.setProperty('--card-radius', `${radiusRange.value}px`);
  });

  sizeRange.addEventListener('input', () => {
    sizeVal.textContent = `${sizeRange.value}px`;
    updateCardSizing();
  });

  document.getElementById('flipTopBtn').addEventListener('click', () => engine.toggleFlip());
  document.getElementById('flipSideBtn').addEventListener('click', () => engine.toggleFlip());
  document.getElementById('resetTiltBtn').addEventListener('click', () => {
    engine.setFlip(false);
    engine.targetRx = 0;
    engine.targetRy = 0;
  });

  backBadgeInput.addEventListener('input', () => (backBadgeEl.textContent = backBadgeInput.value || 'EDITION'));
  backTitleInput.addEventListener('input', () => (backTitleEl.textContent = backTitleInput.value || 'HOLO CARD'));
  backDescInput.addEventListener('input', () => (backDescEl.textContent = backDescInput.value));

  const exportGifBtn = document.getElementById('exportGifBtn');
  exportGifBtn.addEventListener('click', async () => {
    const origText = exportGifBtn.textContent;
    exportGifBtn.disabled = true;
    try {
      await exportHoloGif({
        imgEl: artworkEl,
        aspect: currentAspect,
        glowColor: currentPreset.glow || '#7dd3fc',
        intensity: Number(intensityRange.value) / 100,
        maxTilt: Number(tiltRange.value),
        radius: Number(radiusRange.value),
        hasSlab: toggleSlab.checked,
        hasBevel: toggleBevel.checked,
        isGold: currentPreset.presetGroup === 'gold' || currentPreset.rarity === 'rare secret',
        onProgress: (msg) => {
          exportGifBtn.textContent = msg;
        },
      });
      showToast('3D 闪卡 GIF 已导出下载！');
    } catch (err) {
      console.error(err);
      showToast('GIF 导出失败，请检查网络后重试');
    } finally {
      exportGifBtn.disabled = false;
      exportGifBtn.textContent = origText;
    }
  });

  document.getElementById('exportHtmlBtn').addEventListener('click', exportStandaloneHtml);
  document.getElementById('copyEmbedBtn').addEventListener('click', async () => {
    const iframeCode = `<iframe src="${buildEmbedUrl()}" width="480" height="620" style="border:0;background:transparent;" allowtransparency="true"></iframe>`;
    try {
      await navigator.clipboard.writeText(iframeCode);
      showToast('已复制 iframe 嵌入代码到剪贴板');
    } catch {
      window.prompt('复制以下 iframe 嵌入代码：', iframeCode);
    }
  });

  // Global drag & drop + Ctrl+V paste
  let dragCount = 0;
  window.addEventListener('dragenter', (e) => {
    e.preventDefault();
    dragCount++;
    document.body.classList.add('dragging');
  });
  window.addEventListener('dragover', (e) => e.preventDefault());
  window.addEventListener('dragleave', () => {
    dragCount = Math.max(0, dragCount - 1);
    if (dragCount === 0) document.body.classList.remove('dragging');
  });
  window.addEventListener('drop', (e) => {
    e.preventDefault();
    dragCount = 0;
    document.body.classList.remove('dragging');
    const file = e.dataTransfer?.files?.[0];
    if (file) handleFileUpload(file);
  });

  window.addEventListener('paste', (e) => {
    const items = e.clipboardData?.items || [];
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        handleFileUpload(item.getAsFile());
        break;
      }
    }
  });

  window.addEventListener('resize', updateCardSizing);
}

function applyUrlParams() {
  const p = new URLSearchParams(window.location.search);
  if (p.get('embed') === '1') {
    document.body.classList.add('embed-mode');
  }
  if (p.get('preset')) applyPreset(p.get('preset'));
  if (p.get('foil')) {
    currentFoilMode = p.get('foil');
    foilSelect.value = currentFoilMode;
    applyFoilOverride();
  }
  if (p.has('slab')) {
    toggleSlab.checked = p.get('slab') !== '0';
    cardEl.classList.toggle('has-slab', toggleSlab.checked);
  }
  if (p.has('bevel')) {
    toggleBevel.checked = p.get('bevel') !== '0';
    cardEl.classList.toggle('has-bevel', toggleBevel.checked);
  }
  if (p.has('full')) {
    toggleFullBleed.checked = p.get('full') !== '0';
    cardEl.classList.toggle('full-bleed', toggleFullBleed.checked);
  }
  if (p.has('idle')) {
    toggleIdle.checked = p.get('idle') !== '0';
    engine.idleEnabled = toggleIdle.checked;
  }
  if (p.get('intensity')) {
    intensityRange.value = p.get('intensity');
    intensityVal.textContent = `${intensityRange.value}%`;
    document.documentElement.style.setProperty('--holo-intensity', (Number(intensityRange.value) / 100).toFixed(2));
  }
  if (p.get('tilt')) {
    tiltRange.value = p.get('tilt');
    tiltVal.textContent = `${tiltRange.value}°`;
    engine.maxTilt = Number(tiltRange.value);
  }
  if (p.get('radius')) {
    radiusRange.value = p.get('radius');
    radiusVal.textContent = `${radiusRange.value}px`;
    document.documentElement.style.setProperty('--card-radius', `${radiusRange.value}px`);
  }
  if (p.get('title')) {
    backTitleInput.value = p.get('title');
    backTitleEl.textContent = p.get('title');
  }
  if (p.get('img')) {
    loadImageSrc(p.get('img'));
    return true;
  }
  return false;
}

// Init
renderSidebarOptions();
bindControls();
applyPreset('cosmos');
const customLoaded = applyUrlParams();
if (!customLoaded) {
  loadImageSrc(generateDemoArtwork('obsidian'));
}
updateCardSizing();
