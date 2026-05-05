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
    for (let i = 0; i < this.N; i++) {
      this.state[i] = Math.PI / 2;
    }
    
    this.prevTrail = null;
    this.currTrail = null;
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

    // Prevent spinning past the top (Invisible Ceiling) - only for the first link
    const CEILING = Math.PI * 0.98; // Just before reaching the exact top
    if (this.state[0] > CEILING) {
      this.state[0] = CEILING;
      this.state[this.N] *= -0.6; // Bounce with energy loss
    } else if (this.state[0] < -CEILING) {
      this.state[0] = -CEILING;
      this.state[this.N] *= -0.6; // Bounce with energy loss
    }

    const pos = this.getPositions();
    const lastBob = pos[pos.length - 1];
    
    this.prevTrail = this.currTrail ? { ...this.currTrail } : { x: lastBob.x, y: lastBob.y };
    this.currTrail = { x: lastBob.x, y: lastBob.y };
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
