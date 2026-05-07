export class GameEngine {
  constructor() {
    this.joules = 0;
    this.totalJoulesEarned = 0;
    this.links = 1;
    this.maxLinks = 10;
    this.slingshotLevel = 1;
    this.frictionLevel = 0;
    this.loopLevel = 0;
    this.jouleMultiplierLevel = 0;
    this.burstPowerLevel = 0;
    this.burstTimerLevel = 0;
    this.burstAccumulator = 0;
    this.loopLevel = 0;
    this.jouleMultiplierLevel = 0;
    this.universalConstants = 0;
    this.cHeat = 1.0; // Prestige multiplier

    // Permanent rebirth upgrades (persist across prestige resets)
    this.rebirthLinksLevel = 0;
    this.rebirthSlingshotLevel = 0;
    this.rebirthLoopLevel = 0;
    this.rebirthJouleLevel = 0;
    this.rebirthDistanceLevel = 0;     // Pendulum distance multiplier (3 tiers max)
    this.rebirthConstantMultLevel = 0; // Prestige constant multiplier (linear: level+1 x)

    this.jouleRate = 0; // tracking J/s for UI
    this.joulesThisSecond = 0;
    this.timeAccumulator = 0;

    this.simulation = null;

    // UI elements
    this.ui = {
      jouleValue: document.getElementById('jouleValue'),
      jouleRate: document.getElementById('jouleRate'),
      currentLinks: document.getElementById('currentLinks'),
      linkCost: document.getElementById('linkCost'),
      buyLinkBtn: document.querySelector('#buy-link-btn button'),
      currentSlingshot: document.getElementById('currentSlingshot'),
      slingshotCost: document.getElementById('slingshotCost'),
      buySlingshotBtn: document.querySelector('#buy-slingshot-btn button'),
      currentFriction: document.getElementById('currentFriction'),
      frictionCost: document.getElementById('frictionCost'),
      buyFrictionBtn: document.querySelector('#buy-friction-btn button'),
      currentLoop: document.getElementById('currentLoop'),
      loopCost: document.getElementById('loopCost'),
      buyLoopBtn: document.querySelector('#buy-loop-btn button'),
      currentJouleMultiplier: document.getElementById('currentJouleMultiplier'),
      jouleMultiplierCost: document.getElementById('jouleMultiplierCost'),
      buyJouleMultiplierBtn: document.querySelector('#buy-joule-multiplier-btn button'),

      currentBurstPower: document.getElementById('currentBurstPower'),
      burstPowerCost: document.getElementById('burstPowerCost'),
      buyBurstPowerBtn: document.querySelector('#buy-burst-power-btn button'),
      currentBurstTimer: document.getElementById('currentBurstTimer'),
      burstTimerCost: document.getElementById('burstTimerCost'),
      buyBurstTimerBtn: document.querySelector('#buy-burst-timer-btn button'),
      burstCountdown: document.getElementById('burstCountdown'),
      burstHud: document.getElementById('burst-hud'),
      burstBarFill: document.getElementById('burstBarFill'),

      // Rebirth shop UI
      currentRebirthLinks: document.getElementById('currentRebirthLinks'),
      rebirthLinksCost: document.getElementById('rebirthLinksCost'),
      buyRebirthLinksBtn: document.querySelector('#buy-rebirth-links-btn button'),
      currentRebirthSlingshot: document.getElementById('currentRebirthSlingshot'),
      rebirthSlingshotCost: document.getElementById('rebirthSlingshotCost'),
      buyRebirthSlingshotBtn: document.querySelector('#buy-rebirth-slingshot-btn button'),
      currentRebirthLoop: document.getElementById('currentRebirthLoop'),
      rebirthLoopCost: document.getElementById('rebirthLoopCost'),
      buyRebirthLoopBtn: document.querySelector('#buy-rebirth-loop-btn button'),
      currentRebirthJoule: document.getElementById('currentRebirthJoule'),
      rebirthJouleCost: document.getElementById('rebirthJouleCost'),
      buyRebirthJouleBtn: document.querySelector('#buy-rebirth-joule-btn button'),
      currentRebirthDistance: document.getElementById('currentRebirthDistance'),
      rebirthDistanceCost: document.getElementById('rebirthDistanceCost'),
      buyRebirthDistanceBtn: document.querySelector('#buy-rebirth-distance-btn button'),
      currentRebirthConstantMult: document.getElementById('currentRebirthConstantMult'),
      rebirthConstantMultCost: document.getElementById('rebirthConstantMultCost'),
      buyRebirthConstantMultBtn: document.querySelector('#buy-rebirth-constant-mult-btn button'),

      constantsValue: document.getElementById('constantsValue'),
      prestigeBtn: document.getElementById('prestigeBtn'),
      heatDeathBtn: document.getElementById('heatDeathBtn'),

      // Prestige Modal UI
      prestigeModal: document.getElementById('prestige-confirm-modal'),
      prestigeConfirmBtn: document.getElementById('prestigeConfirmBtn'),
      prestigeCancelBtn: document.getElementById('prestigeCancelBtn'),
      modalPendingConstants: document.getElementById('modalPendingConstants'),

      // Tutorial overlays
      tutorial1: document.getElementById('tutorial-1'),
      tutorial2: document.getElementById('tutorial-2'),
      tutorial1Continue: document.getElementById('tutorial-1-continue'),
      tutorial2Continue: document.getElementById('tutorial-2-continue'),
    };

    this.loadState();
    this.bindEvents();
    this.updateUI();

    // Show tutorial 1 on very first launch
    if (!localStorage.getItem('tutorial1Shown')) {
      this.ui.tutorial1.classList.remove('hidden');
    }
  }  // end constructor

  setSimulation(sim) {
    this.simulation = sim;
    this.simulation.setLinks(this.links);
  }

  // ─── Regular upgrade costs ────────────────────────────────────────────────

  getLinkCost() {
    return Math.pow(10, 2 + ((this.links - 1) * (this.links + 2) / 2));
  }

  getSlingshotCost() {
    return 3 * Math.pow(2.5, this.slingshotLevel - 1);
  }

  getFrictionCost() {
    return 100 * Math.pow(3.5, this.frictionLevel);
  }

  getLoopCost() {
    return 200 * Math.pow(2.5, this.loopLevel);
  }

  calculateLoopBonus() {
    const baseBonus = 10 * Math.pow(10, this.links - 1) * (1 + this.loopLevel * 0.5);
    const exponent = this.getRebirthLoopExponent();
    return Math.pow(baseBonus + 1, exponent) - 1;
  }

  getJouleMultiplierCost() {
    return 100 * Math.pow(5, this.jouleMultiplierLevel);
  }

  getBurstPowerCost() {
    // Quadratic exponent: starts at 500, hits ~1e96 at level 30
    return Math.round(500 * Math.pow(10, this.burstPowerLevel * this.burstPowerLevel / 9.65));
  }

  getBurstTimerCost() {
    // Quadratic exponent: starts at 1000, hits ~1e96 at level 30
    return Math.round(1000 * Math.pow(10, this.burstTimerLevel * this.burstTimerLevel / 9.68));
  }

  getBurstPowerValue(level) {
    if (level === 0) return 0;
    // sqrt scaling: grows fast early, tapers off — spinning only at very high levels
    return 1.5 + Math.sqrt(level) * 1.8;
  }

  getBurstTimerValue(level) {
    // Each phase is 5 upgrades. Step size halves every phase.
    const phase = Math.floor(level / 5);
    const levelInPhase = level % 5;
    const phaseStart = 10.0 / Math.pow(2, phase);
    const step = 1.0 / Math.pow(2, phase);
    return Math.max(0.5, phaseStart - levelInPhase * step);
  }

  // ─── Rebirth upgrade costs (paid in Universal Constants) ─────────────────

  getRebirthLinksCost() {
    // Starts at 10 constants, triples each level: 10, 30, 90, 270...
    return Math.round(10 * Math.pow(3, this.rebirthLinksLevel));
  }

  getRebirthSlingshotCost() {
    // Starts at 10 constants: 10, 25, 62, 156...
    return Math.round(10 * Math.pow(2.5, this.rebirthSlingshotLevel));
  }

  getRebirthLoopCost() {
    return Math.round(10 * Math.pow(2.5, this.rebirthLoopLevel));
  }

  getRebirthJouleCost() {
    // Slightly steeper since it affects all income: 10, 27, 72, 195...
    return Math.round(10 * Math.pow(2.7, this.rebirthJouleLevel));
  }

  getRebirthDistanceCost() {
    return Math.round(100 * Math.pow(10, this.rebirthDistanceLevel));
  }

  getRebirthDistanceMult() {
    return Math.pow(10, this.rebirthDistanceLevel);
  }

  getRebirthConstantMultCost() {
    // 20, 60, 180, 540... (triples each level)
    return Math.round(20 * Math.pow(3, this.rebirthConstantMultLevel));
  }

  // Returns the multiplier applied to constants gained on prestige: 1x, 2x, 3x...
  getRebirthConstantMultiplier() {
    const n = 1 + this.rebirthConstantMultLevel;
    return (n * (n + 1)) / 2;
  }

  // ─── Rebirth upgrade values ───────────────────────────────────────────────

  getRebirthSlingshotExponent() {
    return 1.0 + this.rebirthSlingshotLevel * 0.02;
  }

  getRebirthLoopExponent() {
    return 1.0 + this.rebirthLoopLevel * 0.02;
  }

  getRebirthJouleExponent() {
    return 1.0 + this.rebirthJouleLevel * 0.02;
  }

  // ─── Regular buy methods ──────────────────────────────────────────────────

  addJoules(amount, isBaseKinetic = false) {
    let finalAmount = amount;
    if (isBaseKinetic) {
      finalAmount *= Math.pow(1.5, this.jouleMultiplierLevel);
    }
    const exponent = this.getRebirthJouleExponent();
    finalAmount = Math.pow(finalAmount + 1, exponent) - 1;

    this.joules += finalAmount;
    this.totalJoulesEarned += finalAmount;
    this.joulesThisSecond += finalAmount;
  }

  buyLink() {
    if (this.links >= this.maxLinks) return;

    const cost = this.getLinkCost();
    if (this.joules >= cost) {
      this.joules -= cost;
      this.links++;
      this.saveState();
      this.updateUI();

      if (this.simulation) {
        this.simulation.setLinks(this.links);
      }
    }
  }

  buySlingshot() {
    const cost = this.getSlingshotCost();
    if (this.joules >= cost) {
      this.joules -= cost;
      this.slingshotLevel++;
      this.saveState();
      this.updateUI();
      // Trigger tutorial 2 the first time the player reaches 3.0x
      if (this.slingshotLevel === 3 && !localStorage.getItem('tutorial2Shown')) {
        this.ui.tutorial2.classList.remove('hidden');
      }
    }
  }

  buyFriction() {
    const cost = this.getFrictionCost();
    if (this.joules >= cost) {
      this.joules -= cost;
      this.frictionLevel++;
      this.saveState();
      this.updateUI();
    }
  }

  buyLoop() {
    const cost = this.getLoopCost();
    if (this.joules >= cost) {
      this.joules -= cost;
      this.loopLevel++;
      this.saveState();
      this.updateUI();
    }
  }

  buyJouleMultiplier() {
    const cost = this.getJouleMultiplierCost();
    if (this.joules >= cost) {
      this.joules -= cost;
      this.jouleMultiplierLevel++;
      this.saveState();
      this.updateUI();
    }
  }

  buyBurstPower() {
    const cost = this.getBurstPowerCost();
    if (this.joules >= cost) {
      this.joules -= cost;
      this.burstPowerLevel++;
      this.saveState();
      this.updateUI();
    }
  }

  buyBurstTimer() {
    if (this.getBurstTimerValue(this.burstTimerLevel) <= 0.5) return; // already at minimum
    const cost = this.getBurstTimerCost();
    if (this.joules >= cost) {
      this.joules -= cost;
      this.burstTimerLevel++;
      this.saveState();
      this.updateUI();
    }
  }

  // ─── Rebirth buy methods (spend Universal Constants) ─────────────────────

  buyRebirthLinks() {
    if (this.rebirthLinksLevel >= 9) return; // max 10 total systems
    const cost = this.getRebirthLinksCost();
    if (this.universalConstants >= cost) {
      this.universalConstants -= cost;
      this.rebirthLinksLevel++;
      this.saveState();
      this.updateUI();
      if (this.simulation) this.simulation.syncPendulumCount();
    }
  }

  buyRebirthSlingshot() {
    const cost = this.getRebirthSlingshotCost();
    if (this.universalConstants >= cost) {
      this.universalConstants -= cost;
      this.rebirthSlingshotLevel++;
      this.saveState();
      this.updateUI();
    }
  }

  buyRebirthLoop() {
    const cost = this.getRebirthLoopCost();
    if (this.universalConstants >= cost) {
      this.universalConstants -= cost;
      this.rebirthLoopLevel++;
      this.saveState();
      this.updateUI();
    }
  }

  buyRebirthJoule() {
    const cost = this.getRebirthJouleCost();
    if (this.universalConstants >= cost) {
      this.universalConstants -= cost;
      this.rebirthJouleLevel++;
      this.saveState();
      this.updateUI();
    }
  }

  buyRebirthDistance() {
    const cost = this.getRebirthDistanceCost();
    if (this.universalConstants >= cost) {
      this.universalConstants -= cost;
      this.rebirthDistanceLevel++;
      this.saveState();
      this.updateUI();
    }
  }

  buyRebirthConstantMult() {
    const cost = this.getRebirthConstantMultCost();
    if (this.universalConstants >= cost) {
      this.universalConstants -= cost;
      this.rebirthConstantMultLevel++;
      this.saveState();
      this.updateUI();
    }
  }

  // ─── Prestige / Reset ─────────────────────────────────────────────────────

  hardReset() {
    this.isResetting = true;

    this.joules = 0;
    this.totalJoulesEarned = 0;
    this.links = 1;
    this.maxLinks = 10;
    this.slingshotLevel = 1;
    this.frictionLevel = 0;
    this.loopLevel = 0;
    this.jouleMultiplierLevel = 0;
    this.burstPowerLevel = 0;
    this.burstTimerLevel = 0;
    this.burstAccumulator = 0;
    this.universalConstants = 0;
    this.cHeat = 1.0;
    this.rebirthLinksLevel = 0;
    this.rebirthSlingshotLevel = 0;
    this.rebirthLoopLevel = 0;
    this.rebirthJouleLevel = 0;
    this.rebirthDistanceLevel = 0;
    this.rebirthConstantMultLevel = 0;

    localStorage.clear(); // also clears tutorial1Shown, tutorial2Shown
    window.location.replace(window.location.pathname);
  }

  getPendingConstants() {
    return (this.links - 1) + (this.slingshotLevel - 1) + this.frictionLevel + this.loopLevel + this.jouleMultiplierLevel + this.burstPowerLevel + this.burstTimerLevel;
  }

  prestige() {
    const gained = this.getPendingConstants();
    if (gained > 0 && this.totalJoulesEarned >= 1e10) {
      this.universalConstants += Math.floor(gained * this.getRebirthConstantMultiplier());
      this.joules = 0;
      this.links = 1;
      this.slingshotLevel = 1;
      this.frictionLevel = 0;
      this.loopLevel = 0;
      this.jouleMultiplierLevel = 0;
      this.burstPowerLevel = 0;
      this.burstTimerLevel = 0;
      this.burstAccumulator = 0;
      this.totalJoulesEarned = 0;
      this.cHeat = 1.0;
      // rebirthXxxLevel intentionally NOT reset — these are permanent
      this.saveState();
      location.reload();
    }
  }

  bindEvents() {
    this.ui.buyLinkBtn.addEventListener('click', () => this.buyLink());
    this.ui.buySlingshotBtn.addEventListener('click', () => this.buySlingshot());
    this.ui.buyFrictionBtn.addEventListener('click', () => this.buyFriction());
    this.ui.buyLoopBtn.addEventListener('click', () => this.buyLoop());
    this.ui.buyJouleMultiplierBtn.addEventListener('click', () => this.buyJouleMultiplier());
    this.ui.buyBurstPowerBtn.addEventListener('click', () => this.buyBurstPower());
    this.ui.buyBurstTimerBtn.addEventListener('click', () => this.buyBurstTimer());

    // Tutorial continue buttons
    this.ui.tutorial1Continue.addEventListener('click', () => {
      this.ui.tutorial1.classList.add('hidden');
      localStorage.setItem('tutorial1Shown', '1');
    });
    this.ui.tutorial2Continue.addEventListener('click', () => {
      this.ui.tutorial2.classList.add('hidden');
      localStorage.setItem('tutorial2Shown', '1');
    });

    // Rebirth shop buttons
    this.ui.buyRebirthLinksBtn.addEventListener('click', () => this.buyRebirthLinks());
    this.ui.buyRebirthSlingshotBtn.addEventListener('click', () => this.buyRebirthSlingshot());
    this.ui.buyRebirthLoopBtn.addEventListener('click', () => this.buyRebirthLoop());
    this.ui.buyRebirthJouleBtn.addEventListener('click', () => this.buyRebirthJoule());
    this.ui.buyRebirthDistanceBtn.addEventListener('click', () => this.buyRebirthDistance());
    this.ui.buyRebirthConstantMultBtn.addEventListener('click', () => this.buyRebirthConstantMult());

    this.ui.prestigeBtn.addEventListener('click', () => {
      if (this.ui.prestigeBtn.classList.contains('disabled')) return;
      
      // Update modal with current pending constants
      const pending = this.getPendingConstants();
      const multiplier = this.getRebirthConstantMultiplier();
      this.ui.modalPendingConstants.innerText = this.formatNumber(Math.floor(pending * multiplier));
      
      this.ui.prestigeModal.classList.remove('hidden');
    });

    this.ui.prestigeConfirmBtn.addEventListener('click', () => {
      this.prestige();
      this.ui.prestigeModal.classList.add('hidden');
    });

    this.ui.prestigeCancelBtn.addEventListener('click', () => {
      this.ui.prestigeModal.classList.add('hidden');
    });

    this.ui.heatDeathBtn.addEventListener('click', () => {
      if (this.joules < 1e100) return;
      document.getElementById('victory-screen').classList.remove('hidden');
    });

    // Save every 5 seconds
    setInterval(() => this.saveState(), 5000);
  }

  update(dt) {
    this.timeAccumulator += dt;
    if (this.timeAccumulator >= 1.0) {
      this.jouleRate = this.joulesThisSecond / this.timeAccumulator;
      this.joulesThisSecond = 0;
      this.timeAccumulator = 0;
      this.updateUI();
    }

    // Automation Burst Logic
    if (this.burstPowerLevel > 0) {
      this.burstAccumulator += dt;
      const targetTime = this.getBurstTimerValue(this.burstTimerLevel);
      if (this.burstAccumulator >= targetTime) {
        this.burstAccumulator -= targetTime;
        if (this.simulation) {
          this.simulation.triggerAutomationBurst(this.burstPowerLevel);
        }
      }

      const remaining = Math.max(0, targetTime - this.burstAccumulator);
      const progress = 1 - (remaining / targetTime);

      if (this.ui.burstHud) this.ui.burstHud.classList.remove('hidden');
      if (this.ui.burstCountdown) this.ui.burstCountdown.innerText = `${remaining.toFixed(1)}s`;
      if (this.ui.burstBarFill) this.ui.burstBarFill.style.width = `${(progress * 100).toFixed(1)}%`;
    } else {
      if (this.ui.burstHud) this.ui.burstHud.classList.add('hidden');
    }

    // Fast UI update for the main counter
    this.ui.jouleValue.innerText = this.formatNumber(this.joules);

    // ── Regular upgrade button states (joule-gated) ──
    const cost = this.getLinkCost();
    if (this.links >= this.maxLinks) {
      this.ui.buyLinkBtn.innerText = "MAXED OUT";
      this.ui.buyLinkBtn.classList.add('disabled');
    } else {
      if (this.joules >= cost) {
        this.ui.buyLinkBtn.classList.remove('disabled');
      } else {
        this.ui.buyLinkBtn.classList.add('disabled');
      }
    }

    if (this.joules >= this.getSlingshotCost()) {
      this.ui.buySlingshotBtn.classList.remove('disabled');
    } else {
      this.ui.buySlingshotBtn.classList.add('disabled');
    }

    if (this.joules >= this.getFrictionCost()) {
      this.ui.buyFrictionBtn.classList.remove('disabled');
    } else {
      this.ui.buyFrictionBtn.classList.add('disabled');
    }

    if (this.joules >= this.getLoopCost()) {
      this.ui.buyLoopBtn.classList.remove('disabled');
    } else {
      this.ui.buyLoopBtn.classList.add('disabled');
    }

    if (this.joules >= this.getJouleMultiplierCost()) {
      this.ui.buyJouleMultiplierBtn.classList.remove('disabled');
    } else {
      this.ui.buyJouleMultiplierBtn.classList.add('disabled');
    }

    if (this.joules >= this.getBurstPowerCost()) {
      this.ui.buyBurstPowerBtn.classList.remove('disabled');
    } else {
      this.ui.buyBurstPowerBtn.classList.add('disabled');
    }

    const timerMaxed = this.getBurstTimerValue(this.burstTimerLevel) <= 0.5;
    if (timerMaxed || this.joules < this.getBurstTimerCost()) {
      this.ui.buyBurstTimerBtn.classList.add('disabled');
    } else {
      this.ui.buyBurstTimerBtn.classList.remove('disabled');
    }

    // ── Rebirth upgrade button states (constant-gated) ──
    if (this.rebirthLinksLevel >= 9 || this.universalConstants < this.getRebirthLinksCost()) {
      this.ui.buyRebirthLinksBtn.classList.add('disabled');
    } else {
      this.ui.buyRebirthLinksBtn.classList.remove('disabled');
    }

    if (this.universalConstants >= this.getRebirthSlingshotCost()) {
      this.ui.buyRebirthSlingshotBtn.classList.remove('disabled');
    } else {
      this.ui.buyRebirthSlingshotBtn.classList.add('disabled');
    }

    if (this.universalConstants >= this.getRebirthLoopCost()) {
      this.ui.buyRebirthLoopBtn.classList.remove('disabled');
    } else {
      this.ui.buyRebirthLoopBtn.classList.add('disabled');
    }

    if (this.universalConstants >= this.getRebirthJouleCost()) {
      this.ui.buyRebirthJouleBtn.classList.remove('disabled');
    } else {
      this.ui.buyRebirthJouleBtn.classList.add('disabled');
    }

    if (this.universalConstants >= this.getRebirthDistanceCost()) {
      this.ui.buyRebirthDistanceBtn.classList.remove('disabled');
    } else {
      this.ui.buyRebirthDistanceBtn.classList.add('disabled');
    }

    if (this.universalConstants >= this.getRebirthConstantMultCost()) {
      this.ui.buyRebirthConstantMultBtn.classList.remove('disabled');
    } else {
      this.ui.buyRebirthConstantMultBtn.classList.add('disabled');
    }

    const pending = this.getPendingConstants();
    const hasEnoughJoules = this.totalJoulesEarned >= 1e10;
    if (pending > 0 && hasEnoughJoules) {
      this.ui.prestigeBtn.classList.remove('disabled');
      this.ui.prestigeBtn.innerText = `Entropic Rebirth (+${this.formatNumber(Math.floor(pending * this.getRebirthConstantMultiplier()))} ⚛)`;
    } else if (pending > 0) {
      this.ui.prestigeBtn.classList.add('disabled');
      this.ui.prestigeBtn.innerText = `Reach 1e10 J to Rebirth (+${this.formatNumber(Math.floor(pending * this.getRebirthConstantMultiplier()))} ⚛)`;
    } else {
      this.ui.prestigeBtn.classList.add('disabled');
      this.ui.prestigeBtn.innerText = `Rebirth (Reach 1e10 J)`;
    }

    if (this.joules >= 1e100) {
      this.ui.heatDeathBtn.classList.remove('disabled');
    } else {
      this.ui.heatDeathBtn.classList.add('disabled');
    }
  }

  updateUI() {
    this.ui.jouleRate.innerText = this.formatNumber(this.jouleRate);
    this.ui.currentLinks.innerText = this.links;
    this.ui.linkCost.innerText = this.formatNumber(this.getLinkCost());
    this.ui.currentSlingshot.innerHTML = `${this.slingshotLevel.toFixed(1)}x &rarr; ${(this.slingshotLevel + 1).toFixed(1)}x`;
    this.ui.slingshotCost.innerText = this.formatNumber(this.getSlingshotCost());
    this.ui.currentFriction.innerHTML = `${(Math.pow(0.90, this.frictionLevel) * 100).toFixed(0)}% &rarr; ${(Math.pow(0.90, this.frictionLevel + 1) * 100).toFixed(0)}%`;
    this.ui.frictionCost.innerText = this.formatNumber(this.getFrictionCost());
    this.ui.currentLoop.innerHTML = `${(1 + this.loopLevel * 0.5).toFixed(1)}x &rarr; ${(1 + (this.loopLevel + 1) * 0.5).toFixed(1)}x`;
    this.ui.loopCost.innerText = this.formatNumber(this.getLoopCost());
    this.ui.currentJouleMultiplier.innerHTML = `${Math.pow(1.5, this.jouleMultiplierLevel).toFixed(2)}x &rarr; ${Math.pow(1.5, this.jouleMultiplierLevel + 1).toFixed(2)}x`;
    this.ui.jouleMultiplierCost.innerText = this.formatNumber(this.getJouleMultiplierCost());

    this.ui.currentBurstPower.innerHTML = `${this.getBurstPowerValue(this.burstPowerLevel).toFixed(1)} rad/s &rarr; ${this.getBurstPowerValue(this.burstPowerLevel + 1).toFixed(1)} rad/s`;
    this.ui.burstPowerCost.innerText = this.formatNumber(this.getBurstPowerCost());
    const curTimer = this.getBurstTimerValue(this.burstTimerLevel);
    if (curTimer <= 0.5) {
      this.ui.currentBurstTimer.innerHTML = `0.50s <span style="color:#a855f7;font-weight:700">(MAXED)</span>`;
      this.ui.burstTimerCost.innerText = 'MAX';
    } else {
      this.ui.currentBurstTimer.innerHTML = `${curTimer.toFixed(2)}s &rarr; ${this.getBurstTimerValue(this.burstTimerLevel + 1).toFixed(2)}s`;
      this.ui.burstTimerCost.innerText = this.formatNumber(this.getBurstTimerCost());
    }

    // Rebirth shop displays
    const totalSystems = 1 + this.rebirthLinksLevel;
    const maxSystems = 10;
    const systemsLabel = this.rebirthLinksLevel >= 9
      ? `${totalSystems} Systems (MAXED)`
      : `${totalSystems} System${totalSystems > 1 ? 's' : ''} &rarr; ${totalSystems + 1} Systems`;
    this.ui.currentRebirthLinks.innerHTML = systemsLabel;
    this.ui.rebirthLinksCost.innerText = this.rebirthLinksLevel >= 9 ? 'MAX' : this.getRebirthLinksCost();

    const sExp = this.getRebirthSlingshotExponent();
    this.ui.currentRebirthSlingshot.innerHTML = `^${sExp.toFixed(2)} &rarr; ^${(sExp + 0.02).toFixed(2)}`;
    this.ui.rebirthSlingshotCost.innerText = this.getRebirthSlingshotCost();

    const lExp = this.getRebirthLoopExponent();
    this.ui.currentRebirthLoop.innerHTML = `^${lExp.toFixed(2)} &rarr; ^${(lExp + 0.02).toFixed(2)}`;
    this.ui.rebirthLoopCost.innerText = this.getRebirthLoopCost();

    const jExp = this.getRebirthJouleExponent();
    this.ui.currentRebirthJoule.innerHTML = `^${jExp.toFixed(2)} &rarr; ^${(jExp + 0.02).toFixed(2)}`;
    this.ui.rebirthJouleCost.innerText = this.getRebirthJouleCost();

    const dFactor = this.getRebirthDistanceMult();
    const dNext = Math.pow(10, this.rebirthDistanceLevel + 1);
    this.ui.currentRebirthDistance.innerHTML = `${this.formatNumber(dFactor)}x &rarr; ${this.formatNumber(dNext)}x per link`;
    this.ui.rebirthDistanceCost.innerText = this.formatNumber(this.getRebirthDistanceCost());

    const cMult = this.getRebirthConstantMultiplier();
    const nextN = 2 + this.rebirthConstantMultLevel;
    const nextMult = (nextN * (nextN + 1)) / 2;
    this.ui.currentRebirthConstantMult.innerHTML = `${cMult}x &rarr; ${nextMult}x Constants`;
    this.ui.rebirthConstantMultCost.innerText = this.getRebirthConstantMultCost();

    this.ui.constantsValue.innerText = this.formatNumber(this.universalConstants);
  }

  formatNumber(num) {
    if (num === 0) return "0.00";
    if (num < 1000) return num.toFixed(2);
    const exponent = Math.floor(Math.log10(num));
    const engExponent = exponent - (exponent % 3);
    const mantissa = num / Math.pow(10, engExponent);
    return mantissa.toFixed(2) + 'e' + engExponent;
  }

  saveState() {
    if (this.isResetting) return;
    const state = {
      joules: this.joules,
      links: this.links,
      slingshotLevel: this.slingshotLevel,
      frictionLevel: this.frictionLevel,
      loopLevel: this.loopLevel,
      jouleMultiplierLevel: this.jouleMultiplierLevel,
      burstPowerLevel: this.burstPowerLevel,
      burstTimerLevel: this.burstTimerLevel,
      universalConstants: this.universalConstants,
      cHeat: this.cHeat,
      totalJoulesEarned: this.totalJoulesEarned,
      // Permanent rebirth upgrades
      rebirthLinksLevel: this.rebirthLinksLevel,
      rebirthSlingshotLevel: this.rebirthSlingshotLevel,
      rebirthLoopLevel: this.rebirthLoopLevel,
      rebirthJouleLevel: this.rebirthJouleLevel,
      rebirthDistanceLevel: this.rebirthDistanceLevel,
      rebirthConstantMultLevel: this.rebirthConstantMultLevel,
    };
    localStorage.setItem('entropyEngineSave', JSON.stringify(state));
  }

  loadState() {
    const saved = localStorage.getItem('entropyEngineSave');
    if (saved) {
      try {
        const state = JSON.parse(saved);
        this.joules = state.joules || 0;
        this.links = state.links || 1;
        this.slingshotLevel = state.slingshotLevel || 1;
        this.frictionLevel = state.frictionLevel || 0;
        this.loopLevel = state.loopLevel || 0;
        this.jouleMultiplierLevel = state.jouleMultiplierLevel || 0;
        this.burstPowerLevel = state.burstPowerLevel || 0;
        this.burstTimerLevel = state.burstTimerLevel || 0;
        this.universalConstants = state.universalConstants || 0;
        this.cHeat = 1.0;
        this.totalJoulesEarned = state.totalJoulesEarned || this.joules;

        // Rebirth upgrades (permanent)
        this.rebirthLinksLevel = state.rebirthLinksLevel || 0;
        this.rebirthSlingshotLevel = state.rebirthSlingshotLevel || 0;
        this.rebirthLoopLevel = state.rebirthLoopLevel || 0;
        this.rebirthJouleLevel = state.rebirthJouleLevel || 0;
        this.rebirthDistanceLevel = state.rebirthDistanceLevel || 0;
        this.rebirthConstantMultLevel = state.rebirthConstantMultLevel || 0;

        // maxLinks stays 10; rebirthLinksLevel controls extra pendulum systems in SimulationEngine

        this.totalJoulesEarned = state.totalJoulesEarned || this.joules;
      } catch (e) {
        console.error("Save corrupted");
      }
    }
  }
}
