import { solveLinearSystem } from './MatrixMath.js';

export class NPendulum {
  constructor(x, y, N, config) {
    this.x = x;
    this.y = y;
    this.N = N;
    this.m = config.linkMass;
    this.l = config.linkLength;
    this.g = config.gravity;
    this.friction = config.friction;

    this.state = new Array(2 * this.N).fill(0);
    this.lastRewardAngles = new Array(this.N).fill(0);
    for (let i = 0; i < this.N; i++) {
      this.state[i] = Math.PI / 2;
      this.lastRewardAngles[i] = (i === 0) ? Math.PI / 2 : 0;
    }
    
    this.loopEvents = [];
    this.boostEvents = [];
    this.prevTrails = null;
    this.currTrails = null;
    this.lastSides = new Array(this.N).fill(1);
  }

  getKineticEnergy() {
    let ke = 0;
    const omegas = this.state.slice(this.N, 2 * this.N);
    for(let i=0; i<this.N; i++) {
      ke += 0.5 * this.m * (this.l/100)*(this.l/100) * omegas[i] * omegas[i];
    }
    return ke * Math.pow(this.N, 2.5); 
  }

  getDerivatives(state) {
    const N = this.N;
    const l = this.l;
    const g = this.g;

    const thetas = state.slice(0, N);
    const omegas = state.slice(N, 2 * N);

    const M = Array.from({ length: N }, () => new Array(N).fill(0));
    const C = new Array(N).fill(0);

    const mu = (i, j) => N - Math.max(i, j);

    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        M[i][j] = mu(i, j) * Math.cos(thetas[i] - thetas[j]);
      }
      
      let sum = 0;
      for (let j = 0; j < N; j++) {
        sum += mu(i, j) * omegas[j] * omegas[j] * Math.sin(thetas[i] - thetas[j]);
      }
      const damping = this.friction * omegas[i];
      C[i] = -sum - (g / l) * mu(i, i) * Math.sin(thetas[i]) - damping;
    }

    const alphas = solveLinearSystem(M, C);

    return [...omegas, ...alphas];
  }

  update(dt) {
    const s = this.state;
    
    const k1 = this.getDerivatives(s);
    const s2 = s.map((val, i) => val + 0.5 * dt * k1[i]);
    const k2 = this.getDerivatives(s2);
    const s3 = s.map((val, i) => val + 0.5 * dt * k2[i]);
    const k3 = this.getDerivatives(s3);
    const s4 = s.map((val, i) => val + dt * k3[i]);
    const k4 = this.getDerivatives(s4);

    for (let i = 0; i < 2 * this.N; i++) {
      this.state[i] += (dt / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]);
    }
    
    // Safety limit to prevent Runge-Kutta numerical explosion (NaN)
    // 100 rad/s is visually unlimited (~16 rev/sec) but saves the matrix math
    const MAX_OMEGA = 100;
    for (let i = 0; i < this.N; i++) {
      if (this.state[this.N + i] > MAX_OMEGA) this.state[this.N + i] = MAX_OMEGA;
      if (this.state[this.N + i] < -MAX_OMEGA) this.state[this.N + i] = -MAX_OMEGA;
    }

    const pos = this.getPositions();
    
    // Loop and Boost detection logic
    for (let i = 0; i < this.N; i++) {
        let currentAngle = (i === 0) ? this.state[i] : (this.state[i] - this.state[i - 1]);
        let diff = currentAngle - this.lastRewardAngles[i];
        if (diff >= 2 * Math.PI) {
            this.lastRewardAngles[i] += 2 * Math.PI;
            this.loopEvents.push({ linkIndex: i, x: pos[i].x, y: pos[i].y });
        } else if (diff <= -2 * Math.PI) {
            this.lastRewardAngles[i] -= 2 * Math.PI;
            this.loopEvents.push({ linkIndex: i, x: pos[i].x, y: pos[i].y });
        }
        
        let currentAbsAngle = this.state[i];
        let currentSide = Math.sign(Math.sin(currentAbsAngle));
        if (currentSide !== 0 && this.lastSides[i] !== 0 && currentSide !== this.lastSides[i]) {
            if (Math.cos(currentAbsAngle) > 0) {
                this.boostEvents.push({ linkIndex: i, direction: Math.sign(this.state[this.N + i] || 1) });
            }
        }
        if (currentSide !== 0) this.lastSides[i] = currentSide;
    }
    
    // Multi-trail tracking
    if (this.currTrails) {
      this.prevTrails = this.currTrails.map(p => ({ x: p.x, y: p.y }));
    } else {
      this.prevTrails = pos.map(p => ({ x: p.x, y: p.y }));
    }
    this.currTrails = pos.map(p => ({ x: p.x, y: p.y }));
  }

  getPositions() {
    const pos = [];
    let currentX = this.x;
    let currentY = this.y;
    
    for (let i = 0; i < this.N; i++) {
      const theta = this.state[i];
      currentX += this.l * Math.sin(theta);
      currentY += this.l * Math.cos(theta);
      pos.push({ x: currentX, y: currentY });
    }
    
    return pos;
  }
}
