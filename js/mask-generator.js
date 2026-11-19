/**
 * Generates:
 * 1. Automatic subject / skin-tone protection mask (alpha mask data URL)
 *    so faces & central subjects receive gentler glare while backgrounds/edges sparkle brightly.
 * 2. Clean procedural showcase cards via Canvas (no external private images in repo).
 */

export function generateAutoSubjectMask(imgEl) {
  const size = 256;
  const w = Math.max(64, size);
  const h = Math.max(64, Math.round(size * ((imgEl.naturalHeight || 1) / (imgEl.naturalWidth || 1))));

  const srcCanvas = document.createElement('canvas');
  srcCanvas.width = w;
  srcCanvas.height = h;
  const sctx = srcCanvas.getContext('2d', { willReadFrequently: true });
  sctx.drawImage(imgEl, 0, 0, w, h);

  const imgData = sctx.getImageData(0, 0, w, h);
  const d = imgData.data;

  const maskCanvas = document.createElement('canvas');
  maskCanvas.width = w;
  maskCanvas.height = h;
  const mctx = maskCanvas.getContext('2d');
  const out = mctx.createImageData(w, h);
  const od = out.data;

  for (let y = 0; y < h; y++) {
    const ny = (y / h - 0.5) * 2;
    for (let x = 0; x < w; x++) {
      const nx = (x / w - 0.5) * 2;
      const idx = (y * w + x) * 4;
      const r = d[idx];
      const g = d[idx + 1];
      const b = d[idx + 2];

      // Convert RGB -> simple warm/skin detector + center weighting
      const maxC = Math.max(r, g, b);
      const minC = Math.min(r, g, b);
      const sat = maxC > 0 ? (maxC - minC) / maxC : 0;
      const isWarmSkin = r > 85 && g > 50 && b > 35 && r > g && g >= b * 0.85 && sat > 0.14 && sat < 0.65;

      // Radial center attenuation (keeps outer 25% frame glowing brightly)
      const radial = Math.sqrt(nx * nx + ny * ny);
      const centerProtect = Math.max(0, 1 - radial / 0.88) * 0.55;
      const skinProtect = isWarmSkin ? 0.55 : 0;

      // Mask alpha: 1.0 = full holo shine, 0.20 = protected subject zone
      const holoAlpha = Math.max(0.20, Math.min(1.0, 1.0 - Math.max(centerProtect, skinProtect * 0.9)));
      const aByte = Math.round(holoAlpha * 255);

      od[idx] = 255;
      od[idx + 1] = 255;
      od[idx + 2] = 255;
      od[idx + 3] = aByte;
    }
  }

  mctx.putImageData(out, 0, 0);

  // Smooth the alpha mask with blur
  const blurCanvas = document.createElement('canvas');
  blurCanvas.width = w;
  blurCanvas.height = h;
  const bctx = blurCanvas.getContext('2d');
  bctx.filter = 'blur(10px)';
  bctx.drawImage(maskCanvas, 0, 0);

  return blurCanvas.toDataURL('image/png');
}

export function generateDemoArtwork(kind = 'obsidian') {
  const specs = {
    obsidian: { w: 900, h: 1254 },
    jewelry: { w: 1000, h: 1000 },
    cyber: { w: 1280, h: 720 },
  };
  const { w, h } = specs[kind] || specs.obsidian;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');

  if (kind === 'obsidian') {
    const bg = ctx.createRadialGradient(w * 0.5, h * 0.36, 40, w * 0.5, h * 0.5, h * 0.72);
    bg.addColorStop(0, '#2a2216');
    bg.addColorStop(0.55, '#12131c');
    bg.addColorStop(1, '#07080d');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Subtle geometric frame
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.45)';
    ctx.lineWidth = 4;
    ctx.strokeRect(42, 42, w - 84, h - 84);
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.18)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(58, 58, w - 116, h - 116);

    // Central luminous orb / crest
    const orb = ctx.createRadialGradient(w * 0.5, h * 0.42, 10, w * 0.5, h * 0.42, 270);
    orb.addColorStop(0, 'rgba(255, 232, 160, 0.95)');
    orb.addColorStop(0.32, 'rgba(245, 158, 11, 0.42)');
    orb.addColorStop(0.7, 'rgba(120, 53, 15, 0.14)');
    orb.addColorStop(1, 'transparent');
    ctx.fillStyle = orb;
    ctx.beginPath();
    ctx.arc(w * 0.5, h * 0.42, 270, 0, Math.PI * 2);
    ctx.fill();

    // Diamond emblem
    ctx.save();
    ctx.translate(w * 0.5, h * 0.42);
    ctx.rotate(Math.PI / 4);
    ctx.strokeStyle = '#fde68a';
    ctx.lineWidth = 5;
    ctx.strokeRect(-115, -115, 230, 230);
    ctx.strokeStyle = 'rgba(253, 230, 138, 0.45)';
    ctx.lineWidth = 2;
    ctx.strokeRect(-145, -145, 290, 290);
    ctx.restore();

    ctx.fillStyle = '#fef3c7';
    ctx.textAlign = 'center';
    ctx.font = '700 24px "Segoe UI", sans-serif';
    ctx.fillText('EDITION NO. 001  ·  OBSIDIAN GOLD', w * 0.5, 128);

    ctx.font = '800 62px "Segoe UI", sans-serif';
    ctx.fillStyle = '#fde68a';
    ctx.fillText('HOLO STUDIO', w * 0.5, h * 0.77);

    ctx.font = '400 26px "Segoe UI", sans-serif';
    ctx.fillStyle = 'rgba(248, 250, 252, 0.72)';
    ctx.fillText('3D 立体全息闪卡引擎 · 拖入任意图片即时预览', w * 0.5, h * 0.825);
  } else if (kind === 'jewelry') {
    const bg = ctx.createLinearGradient(0, 0, w, h);
    bg.addColorStop(0, '#0f172a');
    bg.addColorStop(0.5, '#1e293b');
    bg.addColorStop(1, '#090d16');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Faceted crystal polygon
    const cx = w * 0.5, cy = h * 0.45;
    const pts = [
      [cx, cy - 230],
      [cx + 190, cy - 60],
      [cx + 120, cy + 190],
      [cx - 120, cy + 190],
      [cx - 190, cy - 60],
    ];
    const grad = ctx.createLinearGradient(cx - 180, cy - 220, cx + 180, cy + 200);
    grad.addColorStop(0, '#e0f2fe');
    grad.addColorStop(0.45, '#7dd3fc');
    grad.addColorStop(1, '#312e81');
    ctx.fillStyle = grad;
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    ctx.lineWidth = 3;
    ctx.stroke();
    pts.forEach(([x, y]) => {
      ctx.beginPath();
      ctx.moveTo(cx, cy - 20);
      ctx.lineTo(x, y);
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.stroke();
    });

    ctx.fillStyle = '#e0f2fe';
    ctx.textAlign = 'center';
    ctx.font = '700 44px "Segoe UI", sans-serif';
    ctx.fillText('LUXURY SHOWCASE', cx, h * 0.81);
    ctx.font = '400 24px "Segoe UI", sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('珠宝 · 精工商品 · 1:1 高定橱窗展示卡', cx, h * 0.87);
  } else {
    // 16:9 Cyber Neon Landscape
    const bg = ctx.createLinearGradient(0, 0, w, h);
    bg.addColorStop(0, '#090d1a');
    bg.addColorStop(0.5, '#171230');
    bg.addColorStop(1, '#0b1628');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Perspective grid lines
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.22)';
    ctx.lineWidth = 1.5;
    for (let x = -400; x <= w + 400; x += 80) {
      ctx.beginPath();
      ctx.moveTo(w * 0.5 + (x - w * 0.5) * 0.15, h * 0.48);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = h * 0.5; y <= h; y += 34) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    const glow = ctx.createRadialGradient(w * 0.5, h * 0.42, 10, w * 0.5, h * 0.42, 340);
    glow.addColorStop(0, 'rgba(244, 114, 182, 0.85)');
    glow.addColorStop(0.45, 'rgba(96, 165, 250, 0.35)');
    glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 72px "Segoe UI", sans-serif';
    ctx.fillText('16:9 WIDE EDITION', w * 0.5, h * 0.46);
    ctx.font = '400 28px "Segoe UI", sans-serif';
    ctx.fillStyle = '#bae6fd';
    ctx.fillText('支持横屏海报 · 产品图 · 3D 金属侧边与动态光线跟随', w * 0.5, h * 0.56);
  }

  return canvas.toDataURL('image/png');
}
