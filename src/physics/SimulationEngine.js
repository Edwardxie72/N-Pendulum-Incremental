import { NPendulum } from './NPendulum.js';

// 10-system rainbow: red → orange → yellow → chartreuse → green → cyan → sky → blue → indigo → violet
const SYSTEM_HUES = [0, 25, 50, 80, 120, 165, 200, 235, 265, 290];

// Returns hsl() for a given system at a given chain fraction (0=anchor, 1=tip)
// Lightness fades from bright (inner) to deep (outer) within each system's hue
function sysColor(sysIdx, fraction) {
  const hue = SYSTEM_HUES[sysIdx % SYSTEM_HUES.length];
  const lightness = 65 - fraction * 33; // 65% at anchor → 32% at tip
  return `hsl(${hue}, 95%, ${lightness}%)`;
}

function sysColorA(sysIdx, fraction, alpha) {
  const hue = SYSTEM_HUES[sysIdx % SYSTEM_HUES.length];
  const lightness = 65 - fraction * 33;
  return `hsla(${hue}, 95%, ${lightness}%, ${alpha})`;
}

export class SimulationEngine {
  constructor(simCanvas, trailCanvas, gameEngine) {
    this.simCanvas = simCanvas;
    this.trailCanvas = trailCanvas;
    this.ctx = simCanvas.getContext('2d');
    this.trailCtx = trailCanvas.getContext('2d');
    this.gameEngine = gameEngine;
    
    this.config = {
      linkMass: 10,
      linkLength: 70,
      gravity: 9.8 * 100,
      friction: 1.2
    };
    
    this.pendulums = [];   // Array of NPendulum systems
    this.floatingTexts = [];
    this.expandingCircles = [];
    
    this.isDragging = false;
    this.dragStart = { x: 0, y: 0 };
    this.dragCurrent = { x: 0, y: 0 };
    this.bindEvents();
  }

  // Backward-compat getter — primary pendulum
  get pendulum() { return this.pendulums[0] || null; }

  // ─── Setup ─────────────────────────────────────────────────────────────────

  setLinks(numLinks) {
    // Save primary system state before rebuild
    let oldThetas = [], oldOmegas = [];
    if (this.pendulums.length > 0) {
      const p0 = this.pendulums[0];
      oldThetas = p0.state.slice(0, p0.N);
      oldOmegas = p0.state.slice(p0.N, 2 * p0.N);
    }

    // Rebuild primary pendulum
    const p0 = new NPendulum(0, 0, numLinks, this.config);
    this.pendulums = [p0];
    this.recenter();

    for (let i = 0; i < numLinks; i++) {
      if (i < oldThetas.length) {
        p0.state[i] = oldThetas[i];
        p0.state[numLinks + i] = oldOmegas[i];
        p0.lastRewardAnglesAbs[i] = oldThetas[i];
        p0.lastRewardAnglesRel[i] = i > 0 ? oldThetas[i] - oldThetas[i - 1] : oldThetas[i];
      } else {
        p0.state[i] = Math.PI / 2;
        p0.state[numLinks + i] = 0;
        p0.lastRewardAnglesAbs[i] = Math.PI / 2;
        p0.lastRewardAnglesRel[i] = i > 0 ? Math.PI / 2 - p0.state[i - 1] : Math.PI / 2;
      }
    }

    this.syncPendulumCount();
    this.trailCtx.clearRect(0, 0, this.trailCanvas.width, this.trailCanvas.height);
  }

  // Add/remove extra systems to match rebirthLinksLevel, capped at 10 total
  syncPendulumCount() {
    const target = Math.min(10, 1 + (this.gameEngine.rebirthLinksLevel || 0));
    while (this.pendulums.length < target) this._spawnSystem();
    while (this.pendulums.length > target) this.pendulums.pop();
  }

  _spawnSystem() {
    const base = this.pendulums[0];
    const idx = this.pendulums.length;   // index the new system will occupy
    // All systems pivot from the exact same anchor
    const p = new NPendulum(base.x, base.y, base.N, this.config);
    p.l = base.l;
    for (let i = 0; i < p.N; i++) {
      // Offset the starting angles slightly so they fan out visually
      p.state[i] = base.state[i] + 0.05 * idx;
      // Increased velocity offset for faster divergence
      p.state[p.N + i] = base.state[p.N + i] + 0.02 * idx * (i + 1);
      p.lastRewardAnglesAbs[i] = base.lastRewardAnglesAbs[i];
      p.lastRewardAnglesRel[i] = base.lastRewardAnglesRel[i];
    }
    this.pendulums.push(p);
  }

  recenter() {
    if (this.pendulums.length === 0) return;

    let cx, cy, maxRadius;

    if (window.innerWidth >= 768) {
      const availableWidth = this.simCanvas.width - 400;
      cx = availableWidth / 2;
      cy = this.simCanvas.height * 0.45;
      const maxH = availableWidth / 2 - 40;
      const maxU = cy - 100;
      const maxD = this.simCanvas.height - cy - 40;
      maxRadius = Math.max(50, Math.min(maxH, maxU, maxD));
    } else {
      cx = this.simCanvas.width / 2;
      cy = this.simCanvas.height * 0.28;
      const maxH = this.simCanvas.width / 2 - 20;
      const maxU = cy - 120;
      const maxD = this.simCanvas.height * 0.52 - cy;
      maxRadius = Math.max(50, Math.min(maxH, maxU, maxD));
    }

    const targetLength = Math.min(120, maxRadius / this.pendulums[0].N);
    this.config.linkLength = targetLength;

    for (let i = 0; i < this.pendulums.length; i++) {
      const p = this.pendulums[i];
      p.x = cx;
      p.y = cy;
      p.l = targetLength;
      p.trailHistory = [];  // clear on resize to prevent stale positions
      p.prevTrails = null;
      p.currTrails = null;
    }
    if (this.trailCtx) {
      this.trailCtx.clearRect(0, 0, this.trailCanvas.width, this.trailCanvas.height);
    }
  }

  // ─── Input ─────────────────────────────────────────────────────────────────

  bindEvents() {
    this.simCanvas.addEventListener('mousedown', (e) => this.startDrag(e));
    this.simCanvas.addEventListener('mousemove', (e) => this.drag(e));
    window.addEventListener('mouseup', () => this.endDrag());
    this.simCanvas.addEventListener('touchstart', (e) => { e.preventDefault(); this.startDrag(e.touches[0]); }, { passive: false });
    this.simCanvas.addEventListener('touchmove',  (e) => { e.preventDefault(); this.drag(e.touches[0]); },      { passive: false });
    window.addEventListener('touchend', () => this.endDrag());
  }

  startDrag(e) {
    this.isDragging = true;
    const rect = this.simCanvas.getBoundingClientRect();
    this.dragStart   = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    this.dragCurrent = { ...this.dragStart };
  }

  drag(e) {
    if (!this.isDragging) return;
    const rect = this.simCanvas.getBoundingClientRect();
    this.dragCurrent = { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  endDrag() {
    if (!this.isDragging || this.pendulums.length === 0) return;
    this.isDragging = false;

    const dx = this.dragStart.x - this.dragCurrent.x;
    const dy = this.dragStart.y - this.dragCurrent.y;
    const level = this.gameEngine.slingshotLevel || 1;
    const exponent = this.gameEngine.getRebirthSlingshotExponent();
    
    let baseImpulse = (dx + dy) * 0.002 * level;
    let impulse = Math.sign(baseImpulse) * (Math.pow(Math.abs(baseImpulse) + 1, exponent) - 1);

    const MAX_IMPULSE = Math.pow((1.0 + level * 0.5) + 1, exponent) - 1;
    impulse = Math.max(-MAX_IMPULSE, Math.min(MAX_IMPULSE, impulse));

    for (const p of this.pendulums) {
      for (let i = 0; i < p.N; i++) {
        const lm = 1.0 + i * 0.5;
        const li = impulse * lm;
        const lmax = MAX_IMPULSE * lm;
        const cur = p.state[p.N + i];
        if (li > 0 && cur < lmax)  p.state[p.N + i] = Math.min(lmax, cur + li);
        if (li < 0 && cur > -lmax) p.state[p.N + i] = Math.max(-lmax, cur + li);
      }
    }
  }

  // ─── Automation burst ──────────────────────────────────────────────────────

  triggerAutomationBurst(powerLevel) {
    if (this.pendulums.length === 0 || powerLevel === 0) return;

    const burstOmega = this.gameEngine.getBurstPowerValue(powerLevel);

    for (const p of this.pendulums) {
      const N = p.N;
      for (let i = 0; i < N; i++) {
        const direction = Math.random() < 0.5 ? 1 : -1;
        const scale = 1.0 + (i / N) * 0.5;
        p.state[N + i] += burstOmega * direction * scale;
      }
    }

    // Shockwave from anchor
    const anchor = this.pendulums[0];
    this.expandingCircles.push({ x: anchor.x, y: anchor.y, radius: 10, life: 1.0, color: 'hsl(180, 100%, 50%)' });
    this.floatingTexts.push({ x: anchor.x, y: anchor.y - 50, text: 'CHAOS BURST!', life: 1.5, color: 'hsl(180, 100%, 80%)' });
  }

  // ─── Update ────────────────────────────────────────────────────────────────

  update(dt) {
    if (this.pendulums.length === 0) return;

    const frictionLvl = this.gameEngine.frictionLevel || 0;
    const friction = 1.0 * Math.pow(0.90, frictionLvl);

    for (let si = 0; si < this.pendulums.length; si++) {
      const p = this.pendulums[si];
      p.friction = friction;
      p.update(dt);

      const ke = p.getKineticEnergy();
      if (ke > 0.01) {
        // Weight KE by the average distance multiplier across all links
        const distFactor = this.gameEngine.getRebirthDistanceMult();
        let avgDistMult = 0;
        for (let li = 0; li < p.N; li++) avgDistMult += Math.pow(distFactor, li);
        avgDistMult = p.N > 0 ? avgDistMult / p.N : 1;
        this.gameEngine.addJoules(ke * dt * 0.01 * avgDistMult, true);
      }

      if (p.loopEvents && p.loopEvents.length > 0) {
        const bonus = this.gameEngine.calculateLoopBonus();
        const distFactor = this.gameEngine.getRebirthDistanceMult();
        for (const ev of p.loopEvents) {
          // Further links generate exponentially more from loop events
          const linkDistMult = Math.pow(distFactor, ev.linkIndex);
          this.gameEngine.addJoules(bonus * linkDistMult);
          const frac = (ev.linkIndex + 1) / p.N;
          const col = sysColor(si, frac);
          this.floatingTexts.push({ x: ev.x, y: ev.y, text: `+${this.gameEngine.formatNumber(bonus * linkDistMult)}`, life: 1.0, color: col });
          this.expandingCircles.push({ x: ev.cx, y: ev.cy, radius: ev.r, life: 1.0, color: col });
        }
        p.loopEvents = [];
      }
    }

    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      this.floatingTexts[i].y -= 50 * dt;
      this.floatingTexts[i].life -= dt;
      if (this.floatingTexts[i].life <= 0) this.floatingTexts.splice(i, 1);
    }
    for (let i = this.expandingCircles.length - 1; i >= 0; i--) {
      this.expandingCircles[i].radius += 100 * dt;
      this.expandingCircles[i].life -= dt;
      if (this.expandingCircles[i].life <= 0) this.expandingCircles.splice(i, 1);
    }
  }

  // ─── Draw ──────────────────────────────────────────────────────────────────

  draw() {
    this.ctx.clearRect(0, 0, this.simCanvas.width, this.simCanvas.height);
    if (this.pendulums.length === 0) return;

    // Trail: clear completely each frame and redraw from history.
    // This guarantees zero ghost remnants — no alpha accumulation rounding errors.
    const TRAIL_BUCKETS = 6;
    this.trailCtx.clearRect(0, 0, this.trailCanvas.width, this.trailCanvas.height);
    this.trailCtx.lineCap = 'round';
    this.trailCtx.lineJoin = 'round';
    this.trailCtx.lineWidth = 2;

    for (let si = 0; si < this.pendulums.length; si++) {
      const p = this.pendulums[si];
      const hist = p.trailHistory;
      if (!hist || hist.length < 2) continue;

      const len = hist.length;
      for (let i = 0; i < p.N; i++) {
        const frac = (i + 1) / p.N;
        for (let b = 0; b < TRAIL_BUCKETS; b++) {
          const h0 = Math.floor(b * (len - 1) / TRAIL_BUCKETS);
          const h1 = Math.floor((b + 1) * (len - 1) / TRAIL_BUCKETS);
          const alpha = ((b + 1) / TRAIL_BUCKETS) * 0.55;
          this.trailCtx.beginPath();
          this.trailCtx.strokeStyle = sysColorA(si, frac, alpha);
          this.trailCtx.moveTo(hist[h0][i].x, hist[h0][i].y);
          for (let h = h0 + 1; h <= h1; h++) {
            this.trailCtx.lineTo(hist[h][i].x, hist[h][i].y);
          }
          this.trailCtx.stroke();
        }
      }
    }

    this.ctx.drawImage(this.trailCanvas, 0, 0);

    // Drag indicator
    if (this.isDragging) {
      this.ctx.beginPath();
      this.ctx.arc(this.dragStart.x, this.dragStart.y, 8, 0, Math.PI * 2);
      this.ctx.fillStyle = 'rgba(255, 64, 0, 0.8)';
      this.ctx.fill();
      this.ctx.beginPath();
      this.ctx.moveTo(this.dragStart.x, this.dragStart.y);
      this.ctx.lineTo(this.dragCurrent.x, this.dragCurrent.y);
      this.ctx.strokeStyle = 'rgba(255, 64, 0, 0.8)';
      this.ctx.lineWidth = 3;
      this.ctx.setLineDash([5, 5]);
      this.ctx.stroke();
      this.ctx.setLineDash([]);
    }

    // Draw rods and bobs for all systems
    for (let si = 0; si < this.pendulums.length; si++) {
      const p = this.pendulums[si];
      const pos = p.getPositions();
      let sx = p.x, sy = p.y;

      for (let i = 0; i < pos.length; i++) {
        const ex = pos[i].x, ey = pos[i].y;
        const f1 = i / pos.length, f2 = (i + 1) / pos.length;
        const grad = this.ctx.createLinearGradient(sx, sy, ex, ey);
        grad.addColorStop(0, sysColor(si, f1));
        grad.addColorStop(1, sysColor(si, f2));
        this.ctx.beginPath();
        this.ctx.moveTo(sx, sy);
        this.ctx.lineTo(ex, ey);
        this.ctx.strokeStyle = grad;
        this.ctx.lineWidth = 5;
        this.ctx.stroke();
        sx = ex; sy = ey;
      }

      // Anchor dot
      this.ctx.fillStyle = sysColor(si, 0);
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
      this.ctx.fill();

      // Bob dots
      for (let i = 0; i < pos.length; i++) {
        const frac = (i + 1) / pos.length;
        this.ctx.fillStyle = sysColor(si, frac);
        this.ctx.beginPath();
        this.ctx.arc(pos[i].x, pos[i].y, 10, 0, Math.PI * 2);
        this.ctx.fill();
      }

      // Update trail history (60 frames = ~1s of trail)
      const TRAIL_LEN = 60;
      if (!p.trailHistory) p.trailHistory = [];
      p.trailHistory.push(pos);
      if (p.trailHistory.length > TRAIL_LEN) p.trailHistory.shift();
    }

    // Expanding circles
    for (const ec of this.expandingCircles) {
      this.ctx.beginPath();
      this.ctx.arc(ec.x, ec.y, ec.radius, 0, Math.PI * 2);
      this.ctx.strokeStyle = ec.color.replace(')', `, ${ec.life})`).replace('hsl', 'hsla');
      this.ctx.lineWidth = 3;
      this.ctx.stroke();
    }

    // Floating texts
    this.ctx.font = "bold 20px 'Orbitron', sans-serif";
    this.ctx.textAlign = 'center';
    for (const ft of this.floatingTexts) {
      this.ctx.fillStyle = ft.color.replace(')', `, ${ft.life})`).replace('hsl', 'hsla');
      this.ctx.fillText(ft.text, ft.x, ft.y);
    }
  }
}
