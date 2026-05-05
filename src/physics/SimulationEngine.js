import { NPendulum } from './NPendulum.js';

export class SimulationEngine {
  constructor(canvas, config) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.trailCanvas = document.createElement('canvas');
    this.trailCtx = this.trailCanvas.getContext('2d');
    this.config = config;
    this.pendulums = [];
    this.animationId = null;
    this.lastTime = null;

    this.init();
  }

  init() {
    this.resize();
    window.addEventListener('resize', this.resize.bind(this));

    const cx = this.canvas.width / 2;
    const cy = this.canvas.height / 3;

    // Create N pendulums with slight variance
    for (let i = 0; i < this.config.numPendulums; i++) {
      // Variance applied to the base starting angle
      const offset = (i - this.config.numPendulums / 2) * this.config.variance;
      const initialThetas = new Array(this.config.links).fill(this.config.baseAngle + offset);
      
      this.pendulums.push(new NPendulum(cx, cy, this.config, initialThetas));
    }
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    
    this.trailCanvas.width = window.innerWidth;
    this.trailCanvas.height = window.innerHeight;
    
    // Update origin if resizing
    const cx = this.canvas.width / 2;
    const cy = this.canvas.height / 3;
    this.pendulums.forEach(p => {
      p.x = cx;
      p.y = cy;
    });
  }

  start() {
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  stop() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    window.removeEventListener('resize', this.resize.bind(this));
  }

  loop(currentTime) {
    // Time delta in seconds, capped at 0.1s to prevent huge jumps
    let dt = (currentTime - this.lastTime) / 1000;
    if (dt > 0.1) dt = 0.1; 
    // Speed up simulation a bit visually
    dt *= 1.5;

    this.update(dt);
    this.draw();

    this.lastTime = currentTime;
    this.animationId = requestAnimationFrame(this.loop.bind(this));
  }

  update(dt) {
    // To increase numerical stability, we can take multiple smaller steps
    const steps = 4;
    const subDt = dt / steps;
    
    for (let s = 0; s < steps; s++) {
      for (const p of this.pendulums) {
        p.update(subDt);
      }
    }
  }

  draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // The user requested:
    // Anchor: Dark Cyan (#008b8b)
    // Middle: Mid Gradient
    // End: Orange (#ff4000)

    const anchorColor = '#008b8b';
    const midColor = '#806646'; // Approximate midpoint between cyan and orange (or can use gradient)
    const endColor = '#ff4000';

    // Draw new trails to offscreen canvas
    this.trailCtx.lineCap = 'round';
    this.trailCtx.lineJoin = 'round';
    this.trailCtx.lineWidth = 1.5;

    for (let i = 0; i < this.pendulums.length; i++) {
      const p = this.pendulums[i];
      if (p.prevTrail && p.currTrail) {
        this.trailCtx.beginPath();
        this.trailCtx.moveTo(p.prevTrail.x, p.prevTrail.y);
        this.trailCtx.lineTo(p.currTrail.x, p.currTrail.y);
        
        // Scale hue across rainbow (0 to 360) based on index
        const hue = (i / this.pendulums.length) * 360;
        this.trailCtx.strokeStyle = `hsla(${hue}, 100%, 50%, 0.4)`; 
        this.trailCtx.stroke();
      }
    }

    // Draw the permanent trails to main canvas
    this.ctx.drawImage(this.trailCanvas, 0, 0);

    // Draw pendulums
    for (const p of this.pendulums) {
      const pos = p.getPositions();
      
      let startX = p.x;
      let startY = p.y;

      for (let i = 0; i < pos.length; i++) {
        const endX = pos[i].x;
        const endY = pos[i].y;

        const fraction1 = i / pos.length;
        const fraction2 = (i + 1) / pos.length;
        
        // HSL interpolation from Dark Cyan (180, 100%, 27%) to Orange (15, 100%, 50%)
        const h1 = 180 - fraction1 * (180 - 15);
        const l1 = 27 + fraction1 * (50 - 27);
        const color1 = `hsl(${h1}, 100%, ${l1}%)`;

        const h2 = 180 - fraction2 * (180 - 15);
        const l2 = 27 + fraction2 * (50 - 27);
        const color2 = `hsl(${h2}, 100%, ${l2}%)`;

        const grad = this.ctx.createLinearGradient(startX, startY, endX, endY);
        grad.addColorStop(0, color1);
        grad.addColorStop(1, color2);

        this.ctx.beginPath();
        this.ctx.moveTo(startX, startY);
        this.ctx.lineTo(endX, endY);
        this.ctx.strokeStyle = grad;
        this.ctx.lineWidth = 4;
        this.ctx.stroke();

        startX = endX;
        startY = endY;
      }

      // Draw bobs
      this.ctx.fillStyle = anchorColor;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
      this.ctx.fill();

      for (let i = 0; i < pos.length; i++) {
        const fraction = (i + 1) / pos.length;
        const h = 180 - fraction * (180 - 15);
        const l = 27 + fraction * (50 - 27);
        this.ctx.fillStyle = `hsl(${h}, 100%, ${l}%)`;
        
        this.ctx.beginPath();
        this.ctx.arc(pos[i].x, pos[i].y, 8, 0, Math.PI * 2);
        this.ctx.fill();
      }
    }
  }
}
