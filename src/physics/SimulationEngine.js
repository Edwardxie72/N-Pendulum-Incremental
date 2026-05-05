import { NPendulum } from './NPendulum.js';

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
      friction: 0.1
    };
    
    this.pendulum = null;
    
    this.isDragging = false;
    this.dragStart = { x: 0, y: 0 };
    this.dragCurrent = { x: 0, y: 0 };
    this.bindEvents();
  }
  
  setLinks(numLinks) {
    const cx = this.simCanvas.width / 2;
    const cy = this.simCanvas.height / 3;
    
    let oldThetas = [];
    let oldOmegas = [];
    if (this.pendulum) {
      oldThetas = this.pendulum.state.slice(0, this.pendulum.N);
      oldOmegas = this.pendulum.state.slice(this.pendulum.N, 2 * this.pendulum.N);
    }
    
    this.pendulum = new NPendulum(cx, cy, numLinks, this.config);
    
    for (let i = 0; i < numLinks; i++) {
      if (i < oldThetas.length) {
        this.pendulum.state[i] = oldThetas[i];
        this.pendulum.state[numLinks + i] = oldOmegas[i];
      } else {
        this.pendulum.state[i] = Math.PI / 2; 
        this.pendulum.state[numLinks + i] = 0;
      }
    }
    
    this.trailCtx.clearRect(0, 0, this.trailCanvas.width, this.trailCanvas.height);
  }
  
  bindEvents() {
    this.simCanvas.addEventListener('mousedown', (e) => this.startDrag(e));
    this.simCanvas.addEventListener('mousemove', (e) => this.drag(e));
    window.addEventListener('mouseup', () => this.endDrag());
    
    // Touch support for mobile
    this.simCanvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.startDrag(e.touches[0]);
    }, {passive: false});
    this.simCanvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      this.drag(e.touches[0]);
    }, {passive: false});
    window.addEventListener('touchend', () => this.endDrag());
  }
  
  startDrag(e) {
    this.isDragging = true;
    const rect = this.simCanvas.getBoundingClientRect();
    this.dragStart = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    this.dragCurrent = { ...this.dragStart };
  }
  
  drag(e) {
    if (!this.isDragging) return;
    const rect = this.simCanvas.getBoundingClientRect();
    this.dragCurrent = { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }
  
  endDrag() {
    if (!this.isDragging || !this.pendulum) return;
    this.isDragging = false;
    
    const dx = this.dragStart.x - this.dragCurrent.x;
    const dy = this.dragStart.y - this.dragCurrent.y;
    
    let impulse = (dx + dy) * 0.01; 
    
    // Cap the maximum velocity you can inject with a single slingshot
    const MAX_IMPULSE = 4;
    if (impulse > MAX_IMPULSE) impulse = MAX_IMPULSE;
    if (impulse < -MAX_IMPULSE) impulse = -MAX_IMPULSE;

    for(let i=0; i<this.pendulum.N; i++) {
        this.pendulum.state[this.pendulum.N + i] += impulse;
    }
  }

  update(dt) {
    if (!this.pendulum) return;
    this.pendulum.update(dt);
    
    const ke = this.pendulum.getKineticEnergy();
    if (ke > 0.01) {
      this.gameEngine.addJoules(ke * dt * 0.1); 
    }
  }

  draw() {
    this.ctx.clearRect(0, 0, this.simCanvas.width, this.simCanvas.height);
    if (!this.pendulum) return;

    this.trailCtx.lineCap = 'round';
    this.trailCtx.lineJoin = 'round';
    this.trailCtx.lineWidth = 2;

    if (this.pendulum.prevTrail && this.pendulum.currTrail) {
      this.trailCtx.beginPath();
      this.trailCtx.moveTo(this.pendulum.prevTrail.x, this.pendulum.prevTrail.y);
      this.trailCtx.lineTo(this.pendulum.currTrail.x, this.pendulum.currTrail.y);
      
      const hue = (this.pendulum.N * 30) % 360;
      this.trailCtx.strokeStyle = `hsla(${hue}, 100%, 50%, 0.5)`; 
      this.trailCtx.stroke();
    }

    this.ctx.drawImage(this.trailCanvas, 0, 0);

    if (this.isDragging) {
      this.ctx.beginPath();
      this.ctx.moveTo(this.dragStart.x, this.dragStart.y);
      this.ctx.lineTo(this.dragCurrent.x, this.dragCurrent.y);
      this.ctx.strokeStyle = 'rgba(255, 64, 0, 0.8)';
      this.ctx.lineWidth = 3;
      this.ctx.setLineDash([5, 5]);
      this.ctx.stroke();
      this.ctx.setLineDash([]);
    }

    const pos = this.pendulum.getPositions();
    let startX = this.pendulum.x;
    let startY = this.pendulum.y;

    for (let i = 0; i < pos.length; i++) {
      const endX = pos[i].x;
      const endY = pos[i].y;

      const fraction1 = i / pos.length;
      const fraction2 = (i + 1) / pos.length;
      
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
      this.ctx.lineWidth = 5;
      this.ctx.stroke();

      startX = endX;
      startY = endY;
    }

    this.ctx.fillStyle = '#008b8b';
    this.ctx.beginPath();
    this.ctx.arc(this.pendulum.x, this.pendulum.y, 8, 0, Math.PI * 2);
    this.ctx.fill();

    for (let i = 0; i < pos.length; i++) {
      const fraction = (i + 1) / pos.length;
      const h = 180 - fraction * (180 - 15);
      const l = 27 + fraction * (50 - 27);
      this.ctx.fillStyle = `hsl(${h}, 100%, ${l}%)`;
      
      this.ctx.beginPath();
      this.ctx.arc(pos[i].x, pos[i].y, 10, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }
}
