export class DoublePendulum {
  constructor(x, y, config, initialTheta1, initialTheta2) {
    this.x = x;
    this.y = y;
    this.m1 = config.mass1;
    this.m2 = config.mass2;
    this.l1 = config.length1;
    this.l2 = config.length2;
    this.g = config.gravity * 100; // Scale gravity for pixel units (100px = 1m)

    // State: [theta1, theta2, omega1, omega2]
    this.state = [initialTheta1, initialTheta2, 0, 0];
    
    // Trail positions for offscreen rendering
    this.prevTrail = null;
    this.currTrail = null;
  }

  getDerivatives(state) {
    const [t1, t2, w1, w2] = state;
    const { m1, m2, l1, l2, g } = this;

    const delta = t1 - t2;
    const den1 = (2 * m1 + m2) - m2 * Math.cos(2 * t1 - 2 * t2);

    const num1 = -g * (2 * m1 + m2) * Math.sin(t1) 
                 - m2 * g * Math.sin(t1 - 2 * t2) 
                 - 2 * Math.sin(t1 - t2) * m2 * (w2 * w2 * l2 + w1 * w1 * l1 * Math.cos(t1 - t2));
    const a1 = num1 / (l1 * den1);

    const num2 = 2 * Math.sin(t1 - t2) * (w1 * w1 * l1 * (m1 + m2) 
                 + g * (m1 + m2) * Math.cos(t1) 
                 + w2 * w2 * l2 * m2 * Math.cos(t1 - t2));
    const a2 = num2 / (l2 * den1);

    return [w1, w2, a1, a2];
  }

  update(dt) {
    // RK4 Integration
    const s = this.state;
    
    const k1 = this.getDerivatives(s);
    
    const s2 = s.map((val, i) => val + 0.5 * dt * k1[i]);
    const k2 = this.getDerivatives(s2);
    
    const s3 = s.map((val, i) => val + 0.5 * dt * k2[i]);
    const k3 = this.getDerivatives(s3);
    
    const s4 = s.map((val, i) => val + dt * k3[i]);
    const k4 = this.getDerivatives(s4);

    for (let i = 0; i < 4; i++) {
      this.state[i] += (dt / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]);
    }

    // Keep angles within -PI to PI (optional but good for stability)
    // Actually, keeping them continuous might be better for trail rendering, but let's leave it continuous.

    // Calculate positions
    const p = this.getPositions();
    this.prevTrail = this.currTrail ? { ...this.currTrail } : { x: p.x2, y: p.y2 };
    this.currTrail = { x: p.x2, y: p.y2 };
  }

  getPositions() {
    const [t1, t2] = this.state;
    const x1 = this.x + this.l1 * Math.sin(t1);
    const y1 = this.y + this.l1 * Math.cos(t1);
    const x2 = x1 + this.l2 * Math.sin(t2);
    const y2 = y1 + this.l2 * Math.cos(t2);
    return { x1, y1, x2, y2 };
  }
}
