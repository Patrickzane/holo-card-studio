/**
 * 3D Spring Physics & CSS Variable Engine for Holo Card Studio.
 * Binds pointer & click events on the STATIC outer `.card` element (never the 3D-rotated element)
 * so getBoundingClientRect() never oscillates and click-to-flip works reliably at any tilt angle.
 */

export class HoloCardEngine {
  constructor(cardEl, rotatorEl) {
    this.cardEl = cardEl;
    this.rotatorEl = rotatorEl;
    this.root = document.documentElement;

    this.hovering = false;
    this.flipped = false;
    this.idleEnabled = true;
    this.maxTilt = 18; // degrees

    this.targetRx = 0; // --rotate-x (rotates around Y axis in CSS base.css)
    this.targetRy = 0; // --rotate-y (rotates around X axis in CSS base.css)
    this.targetPx = 50;
    this.targetPy = 50;

    this.curRx = 0;
    this.curRy = 0;
    this.curPx = 50;
    this.curPy = 50;
    this.curFlip = 0;
    this.idleTime = 0;
    this.onFlipChange = null;

    this._bindEvents();
    this._tick = this._tick.bind(this);
    requestAnimationFrame(this._tick);
  }

  _bindEvents() {
    // Use cardEl (static outer bounding box) to prevent 3D tilt feedback jitter
    this.cardEl.addEventListener('pointerenter', (e) => {
      this.hovering = true;
      this.cardEl.classList.add('interacting');
      this._updateFromClientPoint(e.clientX, e.clientY);
    });

    this.cardEl.addEventListener('pointermove', (e) => {
      this.hovering = true;
      this.cardEl.classList.add('interacting');
      this._updateFromClientPoint(e.clientX, e.clientY);
    });

    this.cardEl.addEventListener('pointerleave', () => {
      this.hovering = false;
      this.cardEl.classList.remove('interacting');
      if (!this.idleEnabled) {
        this.targetRx = 0;
        this.targetRy = 0;
        this.targetPx = 50;
        this.targetPy = 50;
      }
    });

    this.cardEl.addEventListener('click', (e) => {
      e.preventDefault();
      this.toggleFlip();
    });

    if (window.DeviceOrientationEvent) {
      window.addEventListener('deviceorientation', (e) => {
        if (e.gamma === null || e.beta === null || this.hovering) return;
        const gx = Math.max(-25, Math.min(25, e.gamma)) / 25;
        const gy = Math.max(-25, Math.min(25, e.beta - 35)) / 25;
        this.targetRx = gx * this.maxTilt;
        this.targetRy = -gy * (this.maxTilt * 0.72);
        this.targetPx = 50 + gx * 42;
        this.targetPy = 50 + gy * 42;
      });
    }
  }

  _updateFromClientPoint(clientX, clientY) {
    const rect = this.cardEl.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
    this.targetPx = x * 100;
    this.targetPy = y * 100;
    // When flipped 180deg, invert horizontal tilt direction so it still feels natural
    const flipSign = this.flipped ? -1 : 1;
    this.targetRx = (x - 0.5) * (this.maxTilt * 2) * flipSign;
    this.targetRy = (0.5 - y) * (this.maxTilt * 1.45);
  }

  toggleFlip() {
    this.flipped = !this.flipped;
    if (typeof this.onFlipChange === 'function') {
      this.onFlipChange(this.flipped);
    }
  }

  setFlip(flag) {
    this.flipped = !!flag;
    if (typeof this.onFlipChange === 'function') {
      this.onFlipChange(this.flipped);
    }
  }

  _tick() {
    this.idleTime += 0.022;
    let floatY = 0;

    if (!this.hovering && this.idleEnabled) {
      this.targetRx = Math.sin(this.idleTime) * (this.maxTilt * 0.45);
      this.targetRy = Math.cos(this.idleTime * 0.85) * (this.maxTilt * 0.30);
      this.targetPx = 50 + Math.sin(this.idleTime) * 24;
      this.targetPy = 50 + Math.cos(this.idleTime * 0.85) * 18;
      floatY = Math.sin(this.idleTime) * -6;
    }

    const goalFlip = this.flipped ? 180 : 0;
    this.curRx += (this.targetRx - this.curRx) * 0.14;
    this.curRy += (this.targetRy - this.curRy) * 0.14;
    this.curPx += (this.targetPx - this.curPx) * 0.16;
    this.curPy += (this.targetPy - this.curPy) * 0.16;
    this.curFlip += (goalFlip - this.curFlip) * 0.11;

    const fromLeft = this.curPx / 100;
    const fromTop = this.curPy / 100;
    const fromCenter = Math.min(1, Math.hypot(fromLeft - 0.5, fromTop - 0.5) * 1.42);
    const bgX = 37 + fromLeft * 26;
    const bgY = 33 + fromTop * 34;
    const angle = Math.atan2(this.curPy - 50, this.curPx - 50) * (180 / Math.PI) + 135;

    const st = this.root.style;
    st.setProperty('--pointer-x', `${this.curPx.toFixed(2)}%`);
    st.setProperty('--pointer-y', `${this.curPy.toFixed(2)}%`);
    st.setProperty('--pointer-from-left', fromLeft.toFixed(4));
    st.setProperty('--pointer-from-top', fromTop.toFixed(4));
    st.setProperty('--pointer-from-center', fromCenter.toFixed(4));
    st.setProperty('--background-x', `${bgX.toFixed(2)}%`);
    st.setProperty('--background-y', `${bgY.toFixed(2)}%`);
    st.setProperty('--rotate-x', `${this.curRx.toFixed(2)}deg`);
    st.setProperty('--rotate-y', `${this.curRy.toFixed(2)}deg`);
    st.setProperty('--flip-y', `${this.curFlip.toFixed(2)}deg`);
    st.setProperty('--pointer-angle', `${angle.toFixed(1)}deg`);
    st.setProperty('--angle', `${angle.toFixed(1)}deg`);
    st.setProperty('--translate-y', `${floatY.toFixed(2)}px`);
    st.setProperty('--card-scale', this.hovering ? '1.03' : '1');
    st.setProperty('--card-opacity', this.hovering || this.idleEnabled ? '0.92' : '0.45');

    requestAnimationFrame(this._tick);
  }
}
