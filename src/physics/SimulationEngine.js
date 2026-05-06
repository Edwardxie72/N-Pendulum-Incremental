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
      friction: 1.2 // Extremely high base friction
    };
    
    this.pendulum = null;
    this.floatingTexts = [];
    this.expandingCircles = [];
    
    this.isDragging = false;
    this.dragStart = { x: 0, y: 0 };
    this.dragCurrent = { x: 0, y: 0 };
    this.bindEvents();
  }
  
  setLinks(numLinks) {
    
    let oldThetas = [];
    let oldOmegas = [];
    if (this.pendulum) {
      oldThetas = this.pendulum.state.slice(0, this.pendulum.N);
      oldOmegas = this.pendulum.state.slice(this.pendulum.N, 2 * this.pendulum.N);
    }
    this.pendulum = new NPendulum(0, 0, numLinks, this.config);
    this.recenter();
    
    for (let i = 0; i < numLinks; i++) {
      if (i < oldThetas.length) {
        this.pendulum.state[i] = oldThetas[i];
        this.pendulum.state[numLinks + i] = oldOmegas[i];
        
        this.pendulum.lastRewardAnglesAbs[i] = oldThetas[i];
        if (i > 0) {
          this.pendulum.lastRewardAnglesRel[i] = oldThetas[i] - oldThetas[i-1];
        } else {
          this.pendulum.lastRewardAnglesRel[i] = oldThetas[i];
        }
      } else {
        this.pendulum.state[i] = Math.PI / 2; 
        this.pendulum.state[numLinks + i] = 0;
        
        this.pendulum.lastRewardAnglesAbs[i] = Math.PI / 2;
        if (i > 0) {
          this.pendulum.lastRewardAnglesRel[i] = Math.PI / 2 - this.pendulum.state[i-1];
        } else {
          this.pendulum.lastRewardAnglesRel[i] = Math.PI / 2;
        }
      }
    }
    
    this.trailCtx.clearRect(0, 0, this.trailCanvas.width, this.trailCanvas.height);
  }
  
  recenter() {
    if (!this.pendulum) return;
    
    let cx = this.simCanvas.width / 2;
    let cy = this.simCanvas.height / 3;
    let maxRadius = 100;
    
    // Adjust for responsive UI overlays and compute safe max radius
    if (window.innerWidth >= 768) {
      // Offset by half of the 380px side panel + 20px padding
      const availableWidth = this.simCanvas.width - 400;
      cx = availableWidth / 2;
      cy = this.simCanvas.height * 0.45; // Center vertically
      
      const maxHorizontal = availableWidth / 2 - 40; // 40px padding
      const maxUp = cy - 100; // Leave space for Top HUD
      const maxDown = this.simCanvas.height - cy - 40;
      
      maxRadius = Math.max(50, Math.min(maxHorizontal, maxUp, maxDown));
    } else {
      // Mobile: Bottom sheet covers bottom 45% (so ~55% is safe)
      cx = this.simCanvas.width / 2;
      cy = this.simCanvas.height * 0.28; // Center in the top 55%
      
      const maxHorizontal = this.simCanvas.width / 2 - 20; // 20px padding
      const maxUp = cy - 120; // Leave space for Top HUD
      const maxDown = (this.simCanvas.height * 0.52) - cy; // Leave space for Bottom Sheet
      
      maxRadius = Math.max(50, Math.min(maxHorizontal, maxUp, maxDown));
    }
    
    this.pendulum.x = cx;
    this.pendulum.y = cy;
    
    // Dynamically adjust pendulum length so the fully extended chain never goes off screen!
    // We cap the max link length to 120 so it doesn't look comically huge when there's only 1 link.
    const targetLength = Math.min(120, maxRadius / this.pendulum.N);
    this.pendulum.l = targetLength;
    this.config.linkLength = targetLength;
    
    // Reset trails so we don't draw a giant line when the canvas resizes
    this.pendulum.prevTrails = null;
    this.pendulum.currTrails = null;
    if (this.trailCtx) {
        this.trailCtx.clearRect(0, 0, this.trailCanvas.width, this.trailCanvas.height);
    }
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
    
    const level = this.gameEngine.slingshotLevel || 1;
    let impulse = (dx + dy) * 0.002 * level; 
    
    // Cap the maximum velocity you can inject with a single slingshot
    const MAX_IMPULSE = 1.0 + (level * 0.5);
    if (impulse > MAX_IMPULSE) impulse = MAX_IMPULSE;
    if (impulse < -MAX_IMPULSE) impulse = -MAX_IMPULSE;

    for(let i=0; i<this.pendulum.N; i++) {
        let currentOmega = this.pendulum.state[this.pendulum.N + i];
        
        let linkMultiplier = 1.0 + (i * 0.1);
        let linkImpulse = impulse * linkMultiplier;
        let linkMaxImpulse = MAX_IMPULSE * linkMultiplier;
        
        if (linkImpulse > 0) {
            if (currentOmega < linkMaxImpulse) {
                this.pendulum.state[this.pendulum.N + i] = Math.min(linkMaxImpulse, currentOmega + linkImpulse);
            }
        } else if (linkImpulse < 0) {
            if (currentOmega > -linkMaxImpulse) {
                this.pendulum.state[this.pendulum.N + i] = Math.max(-linkMaxImpulse, currentOmega + linkImpulse);
            }
        }
    }
  }

  update(dt) {
    if (!this.pendulum) return;
    
    // Dynamically apply friction upgrades (Base 1.0, drops by 10% per level)
    // We add || 0 to protect against browser caching old GameEngine.js versions!
    const frictionLvl = this.gameEngine.frictionLevel || 0;
    this.pendulum.friction = 1.0 * Math.pow(0.90, frictionLvl);
    
    this.pendulum.update(dt);
    
    const motorLvl = this.gameEngine.motorLevel || 0;
    
    // Process swing boosts
    if (this.pendulum.boostEvents && this.pendulum.boostEvents.length > 0) {
      if (motorLvl > 0) {
        const boostAmount = motorLvl * 0.05;
        const maxMotorSpeed = motorLvl * 0.5; // Cap speed that motor will boost up to
        for (const event of this.pendulum.boostEvents) {
          if (event.linkIndex === 0) {
            const currentSpeed = this.pendulum.state[this.pendulum.N + event.linkIndex];
            if (Math.abs(currentSpeed) < maxMotorSpeed) {
              this.pendulum.state[this.pendulum.N + event.linkIndex] += boostAmount * event.direction;
            }
          }
        }
      }
      this.pendulum.boostEvents = [];
    }
    
    const ke = this.pendulum.getKineticEnergy();
    if (ke > 0.01) {
      this.gameEngine.addJoules(ke * dt * 0.01, true); // 10x slower initial generation
    }
    
    if (this.pendulum.loopEvents && this.pendulum.loopEvents.length > 0) {
      const bonus = this.gameEngine.calculateLoopBonus();
      for (const event of this.pendulum.loopEvents) {
        this.gameEngine.addJoules(bonus);
        
        const fraction = (event.linkIndex + 1) / this.pendulum.N;
        const h = 180 - fraction * (180 - 15);
        const l = 27 + fraction * (50 - 27);
        const colorStr = `hsl(${h}, 100%, ${l}%)`;
        
        this.floatingTexts.push({
            x: event.x,
            y: event.y,
            text: `+${this.gameEngine.formatNumber(bonus)}`,
            life: 1.0,
            color: colorStr
        });
        this.expandingCircles.push({
            x: event.cx,
            y: event.cy,
            radius: event.r,
            life: 1.0,
            color: colorStr
        });
      }
      this.pendulum.loopEvents = [];
    }
    
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
        let ft = this.floatingTexts[i];
        ft.y -= 50 * dt;
        ft.life -= dt;
        if (ft.life <= 0) this.floatingTexts.splice(i, 1);
    }
    for (let i = this.expandingCircles.length - 1; i >= 0; i--) {
        let ec = this.expandingCircles[i];
        ec.radius += 100 * dt;
        ec.life -= dt;
        if (ec.life <= 0) this.expandingCircles.splice(i, 1);
    }
  }

  draw() {
    this.ctx.clearRect(0, 0, this.simCanvas.width, this.simCanvas.height);
    if (!this.pendulum) return;

    this.trailCtx.lineCap = 'round';
    this.trailCtx.lineJoin = 'round';
    this.trailCtx.lineWidth = 2;
    
    // Use the native background color with a low opacity to smoothly fade the trail.
    // This perfectly bypasses the integer rounding ghosting bug that destination-out causes!
    this.trailCtx.fillStyle = 'rgba(5, 8, 15, 0.03)';
    this.trailCtx.fillRect(0, 0, this.trailCanvas.width, this.trailCanvas.height);

    if (this.pendulum.prevTrails && this.pendulum.currTrails) {
      for (let i = 0; i < this.pendulum.N; i++) {
        this.trailCtx.beginPath();
        this.trailCtx.moveTo(this.pendulum.prevTrails[i].x, this.pendulum.prevTrails[i].y);
        this.trailCtx.lineTo(this.pendulum.currTrails[i].x, this.pendulum.currTrails[i].y);
        
        const fraction = (i + 1) / this.pendulum.N;
        const h = 180 - fraction * (180 - 15);
        this.trailCtx.strokeStyle = `hsla(${h}, 100%, 50%, 0.6)`; 
        this.trailCtx.stroke();
      }
    }

    this.ctx.drawImage(this.trailCanvas, 0, 0);

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
    
    // Draw expanding circles
    for (const ec of this.expandingCircles) {
        this.ctx.beginPath();
        this.ctx.arc(ec.x, ec.y, ec.radius, 0, Math.PI * 2);
        this.ctx.strokeStyle = ec.color.replace(')', `, ${ec.life})`).replace('hsl', 'hsla');
        this.ctx.lineWidth = 3;
        this.ctx.stroke();
    }
    
    // Draw floating texts
    this.ctx.font = "bold 20px 'Orbitron', sans-serif";
    this.ctx.textAlign = "center";
    for (const ft of this.floatingTexts) {
        this.ctx.fillStyle = ft.color.replace(')', `, ${ft.life})`).replace('hsl', 'hsla');
        this.ctx.fillText(ft.text, ft.x, ft.y);
    }
  }
}
