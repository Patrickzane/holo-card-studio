/**
 * Browser-side 3D Holographic Card GIF Exporter.
 * Renders a 32-frame seamless 3D tilted holographic loop on an offscreen Canvas
 * and encodes it with gifenc (pure JS, zero backend required).
 */

export async function exportHoloGif({
  imgEl,
  aspect = 0.718,
  glowColor = '#7dd3fc',
  intensity = 1.0,
  maxTilt = 16,
  radius = 18,
  hasSlab = true,
  hasBevel = true,
  isGold = false,
  onProgress = () => {},
}) {
  onProgress('正在加载 GIF 编码器...');
  const { GIFEncoder, quantize, applyPalette } = await import('https://esm.sh/gifenc@1.0.3');

  const OUT_W = 480;
  const OUT_H = aspect >= 1 ? 360 : 520;
  const FRAMES = 32;
  const DELAY_MS = 45; // ~22 fps

  // Fit card dimensions inside studio frame
  const maxCardW = OUT_W * 0.68;
  const maxCardH = OUT_H * 0.76;
  let cardW = maxCardW;
  let cardH = cardW / aspect;
  if (cardH > maxCardH) {
    cardH = maxCardH;
    cardW = cardH * aspect;
  }
  cardW = Math.round(cardW);
  cardH = Math.round(cardH);
  const scaledRadius = Math.round(radius * (cardW / 400));

  // Pre-render rounded-corner source artwork + subtle sparkles onto an offscreen canvas
  const artCanvas = document.createElement('canvas');
  artCanvas.width = cardW;
  artCanvas.height = cardH;
  const actx = artCanvas.getContext('2d');
  actx.save();
  roundRectPath(actx, 0, 0, cardW, cardH, scaledRadius);
  actx.clip();
  // Cover-fit image
  const imgAspect = (imgEl.naturalWidth || 1) / (imgEl.naturalHeight || 1);
  let sx = 0, sy = 0, sw = imgEl.naturalWidth || cardW, sh = imgEl.naturalHeight || cardH;
  if (imgAspect > aspect) {
    sw = sh * aspect;
    sx = ((imgEl.naturalWidth || cardW) - sw) * 0.5;
  } else {
    sh = sw / aspect;
    sy = ((imgEl.naturalHeight || cardH) - sh) * 0.5;
  }
  actx.drawImage(imgEl, sx, sy, sw, sh, 0, 0, cardW, cardH);
  actx.restore();

  // Deterministic sparkle coordinates
  const stars = Array.from({ length: 42 }, (_, idx) => ({
    x: ((idx * 97 + 23) % 100) / 100,
    y: ((idx * 53 + 41) % 100) / 100,
    r: 1.5 + (idx % 4) * 0.8,
    phase: idx * 0.7,
  }));

  const frameCanvas = document.createElement('canvas');
  frameCanvas.width = OUT_W;
  frameCanvas.height = OUT_H;
  const ctx = frameCanvas.getContext('2d', { willReadFrequently: true });

  const cardLayer = document.createElement('canvas');
  cardLayer.width = cardW;
  cardLayer.height = cardH;
  const cctx = cardLayer.getContext('2d');

  const gif = GIFEncoder();

  for (let i = 0; i < FRAMES; i++) {
    onProgress(`正在渲染 3D 帧 ${i + 1}/${FRAMES}...`);
    if (i % 4 === 0) await new Promise((r) => setTimeout(r, 0));

    const t = (2 * Math.PI * i) / FRAMES;
    const yawDeg = maxTilt * 0.85 * Math.sin(t);
    const pitchDeg = maxTilt * 0.5 * Math.cos(t);
    const floatY = Math.sin(t) * -7;

    const yawRad = (yawDeg * Math.PI) / 180;
    const pitchRad = (pitchDeg * Math.PI) / 180;
    const scaleX = Math.cos(yawRad);
    const scaleY = Math.cos(pitchRad);
    const skewY = Math.sin(yawRad) * Math.sin(pitchRad) * 0.35;

    // 1. Studio dark vignette backdrop + breathing aura
    const bg = ctx.createRadialGradient(
      OUT_W * 0.5 - yawDeg * 2,
      OUT_H * 0.48 + floatY,
      20,
      OUT_W * 0.5,
      OUT_H * 0.5,
      OUT_W * 0.65
    );
    bg.addColorStop(0, '#23283b');
    bg.addColorStop(0.55, '#11141e');
    bg.addColorStop(1, '#07080d');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, OUT_W, OUT_H);

    // Subtle colored aura
    ctx.save();
    ctx.globalAlpha = 0.22 + 0.06 * Math.sin(t);
    const aura = ctx.createRadialGradient(
      OUT_W * 0.5 - yawDeg * 2.5,
      OUT_H * 0.5 + floatY,
      10,
      OUT_W * 0.5,
      OUT_H * 0.5,
      OUT_W * 0.45
    );
    aura.addColorStop(0, glowColor);
    aura.addColorStop(1, 'transparent');
    ctx.fillStyle = aura;
    ctx.fillRect(0, 0, OUT_W, OUT_H);
    ctx.restore();

    // 2. Compose front card face with dynamic holo shader + bevel
    cctx.clearRect(0, 0, cardW, cardH);
    cctx.save();
    roundRectPath(cctx, 0, 0, cardW, cardH, scaledRadius);
    cctx.clip();
    cctx.drawImage(artCanvas, 0, 0);

    const lightX = (0.5 + Math.sin(t) * 0.36) * cardW;
    const lightY = (0.5 + Math.cos(t) * 0.32) * cardH;

    // Holographic rainbow sweep
    if (intensity > 0.02) {
      cctx.save();
      cctx.globalCompositeOperation = 'color-dodge';
      cctx.globalAlpha = Math.min(0.78, 0.38 * intensity);
      const holoGrad = cctx.createLinearGradient(
        lightX - cardW * 0.65,
        lightY - cardH * 0.65,
        lightX + cardW * 0.65,
        lightY + cardH * 0.65
      );
      if (isGold) {
        holoGrad.addColorStop(0, 'rgba(255, 200, 60, 0)');
        holoGrad.addColorStop(0.35, 'rgba(255, 225, 110, 0.85)');
        holoGrad.addColorStop(0.5, 'rgba(255, 250, 200, 1)');
        holoGrad.addColorStop(0.65, 'rgba(245, 175, 45, 0.85)');
        holoGrad.addColorStop(1, 'rgba(255, 200, 60, 0)');
      } else {
        holoGrad.addColorStop(0, 'rgba(255, 70, 130, 0)');
        holoGrad.addColorStop(0.25, 'rgba(255, 95, 140, 0.75)');
        holoGrad.addColorStop(0.45, 'rgba(255, 230, 90, 0.85)');
        holoGrad.addColorStop(0.6, 'rgba(75, 245, 185, 0.85)');
        holoGrad.addColorStop(0.78, 'rgba(85, 185, 255, 0.85)');
        holoGrad.addColorStop(1, 'rgba(205, 100, 255, 0)');
      }
      cctx.fillStyle = holoGrad;
      cctx.fillRect(0, 0, cardW, cardH);

      // Diagonal micro-grating lines
      cctx.globalAlpha = Math.min(0.25, 0.14 * intensity);
      cctx.strokeStyle = '#ffffff';
      cctx.lineWidth = 1;
      for (let gx = -cardH; gx < cardW + cardH; gx += 6) {
        cctx.beginPath();
        cctx.moveTo(gx, 0);
        cctx.lineTo(gx + cardH * 0.6, cardH);
        cctx.stroke();
      }
      cctx.restore();

      // Twinkling cosmos stars
      cctx.save();
      cctx.globalCompositeOperation = 'screen';
      stars.forEach((s) => {
        const tw = Math.max(0, Math.sin(t * 2 + s.phase));
        if (tw < 0.2) return;
        const sxPos = s.x * cardW;
        const syPos = s.y * cardH;
        cctx.globalAlpha = tw * 0.7 * Math.min(1, intensity);
        cctx.fillStyle = '#ffffff';
        cctx.beginPath();
        cctx.arc(sxPos, syPos, s.r, 0, Math.PI * 2);
        cctx.fill();
      });
      cctx.restore();
    }

    // Specular glare beam
    cctx.save();
    cctx.globalCompositeOperation = 'overlay';
    const glare = cctx.createRadialGradient(lightX, lightY, 4, lightX, lightY, cardW * 0.65);
    glare.addColorStop(0, 'rgba(255,255,255,0.65)');
    glare.addColorStop(0.4, 'rgba(255,255,255,0.18)');
    glare.addColorStop(1, 'rgba(0,0,0,0.12)');
    cctx.fillStyle = glare;
    cctx.fillRect(0, 0, cardW, cardH);
    cctx.restore();

    // Chamfered metallic bevel border
    if (hasBevel) {
      cctx.save();
      const bGrad = cctx.createLinearGradient(
        lightX - cardW * 0.5,
        lightY - cardH * 0.5,
        lightX + cardW * 0.5,
        lightY + cardH * 0.5
      );
      if (isGold) {
        bGrad.addColorStop(0, '#fff6c8');
        bGrad.addColorStop(0.5, '#d49b2a');
        bGrad.addColorStop(1, '#fff6c8');
      } else {
        bGrad.addColorStop(0, '#ffffff');
        bGrad.addColorStop(0.35, '#93c5fd');
        bGrad.addColorStop(0.65, '#f9a8d4');
        bGrad.addColorStop(1, '#ffffff');
      }
      cctx.strokeStyle = bGrad;
      cctx.lineWidth = 5;
      roundRectPath(cctx, 2, 2, cardW - 4, cardH - 4, Math.max(0, scaledRadius - 2));
      cctx.stroke();
      cctx.restore();
    }
    cctx.restore();

    // 3. Draw floating shadow
    const centerX = OUT_W * 0.5;
    const centerY = OUT_H * 0.5 + floatY;
    ctx.save();
    ctx.translate(centerX - yawDeg * 1.4, centerY + 18 - pitchDeg * 1.1);
    ctx.transform(scaleX, skewY, -skewY * 0.6, scaleY, 0, 0);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.filter = 'blur(16px)';
    roundRectPath(ctx, -cardW * 0.48, -cardH * 0.48, cardW * 0.96, cardH * 0.96, scaledRadius);
    ctx.fill();
    ctx.restore();

    // 4. Draw 8-layer 3D brushed-metallic slab thickness
    if (hasSlab) {
      const slabShiftX = -Math.sin(yawRad) * 9;
      const slabShiftY = Math.sin(pitchRad) * 7;
      for (let s = 7; s >= 1; s--) {
        const frac = s / 7;
        ctx.save();
        ctx.translate(centerX + slabShiftX * frac, centerY + slabShiftY * frac);
        ctx.transform(scaleX, skewY, -skewY * 0.6, scaleY, 0, 0);
        const shade = Math.round(135 + 65 * (1 - frac));
        ctx.fillStyle = isGold ? `rgb(${shade + 25}, ${shade}, ${Math.round(shade * 0.55)})` : `rgb(${shade}, ${shade + 5}, ${shade + 16})`;
        roundRectPath(ctx, -cardW * 0.5, -cardH * 0.5, cardW, cardH, scaledRadius);
        ctx.fill();
        ctx.restore();
      }
    }

    // 5. Draw transformed front card face
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.transform(scaleX, skewY, -skewY * 0.6, scaleY, 0, 0);
    ctx.drawImage(cardLayer, -cardW * 0.5, -cardH * 0.5);
    ctx.restore();

    // Quantize & write GIF frame
    const imgData = ctx.getImageData(0, 0, OUT_W, OUT_H).data;
    const palette = quantize(imgData, 256);
    const index = applyPalette(imgData, palette);
    gif.writeFrame(index, OUT_W, OUT_H, { palette, delay: DELAY_MS });
  }

  onProgress('正在打包 GIF 文件...');
  gif.finish();
  const bytes = gif.bytes();
  const blob = new Blob([bytes], { type: 'image/gif' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'holo-card-3d.gif';
  a.click();
  URL.revokeObjectURL(a.href);
}

function roundRectPath(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w * 0.5, h * 0.5);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}
