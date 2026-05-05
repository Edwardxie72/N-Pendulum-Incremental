export class GameEngine {
  constructor() {
    this.joules = 0;
    this.totalJoulesEarned = 0;
    this.links = 1;
    this.maxLinks = 10;
    this.slingshotLevel = 1;
    this.motorLevel = 0;
    this.frictionLevel = 0;
    this.loopLevel = 0;
    this.jouleMultiplierLevel = 0;
    this.universalConstants = 0;
    this.cHeat = 1.0; // Prestige multiplier
    
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
      currentMotor: document.getElementById('currentMotor'),
      motorCost: document.getElementById('motorCost'),
      buyMotorBtn: document.querySelector('#buy-motor-btn button'),
      currentFriction: document.getElementById('currentFriction'),
      frictionCost: document.getElementById('frictionCost'),
      buyFrictionBtn: document.querySelector('#buy-friction-btn button'),
      currentLoop: document.getElementById('currentLoop'),
      loopCost: document.getElementById('loopCost'),
      buyLoopBtn: document.querySelector('#buy-loop-btn button'),
      currentJouleMultiplier: document.getElementById('currentJouleMultiplier'),
      jouleMultiplierCost: document.getElementById('jouleMultiplierCost'),
      buyJouleMultiplierBtn: document.querySelector('#buy-joule-multiplier-btn button'),
      constantsValue: document.getElementById('constantsValue'),
      prestigeBtn: document.getElementById('prestigeBtn'),
      heatDeathBtn: document.getElementById('heatDeathBtn')
    };
    
    this.loadState();
    this.bindEvents();
    this.updateUI();
  }
  
  setSimulation(sim) {
    this.simulation = sim;
    this.simulation.setLinks(this.links);
  }
  
  getLinkCost() {
    return Math.pow(10, 2 + ((this.links - 1) * (this.links + 2) / 2));
  }
  
  getSlingshotCost() {
    return 5 * Math.pow(2.5, this.slingshotLevel - 1);
  }
  
  getMotorCost() {
    return 50 * Math.pow(3, this.motorLevel);
  }
  
  getFrictionCost() {
    return 100 * Math.pow(3.5, this.frictionLevel);
  }
  
  getLoopCost() {
    return 200 * Math.pow(2.5, this.loopLevel);
  }
  
  calculateLoopBonus() {
    return 10 * Math.pow(10, this.links - 1) * Math.pow(1.1, this.loopLevel);
  }
  
  getJouleMultiplierCost() {
    return 100 * Math.pow(5, this.jouleMultiplierLevel);
  }
  
  addJoules(amount, isBaseKinetic = false) {
    let finalAmount = amount;
    if (isBaseKinetic) {
      finalAmount *= Math.pow(2, this.jouleMultiplierLevel);
    }
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
    }
  }
  
  buyMotor() {
    const cost = this.getMotorCost();
    if (this.joules >= cost) {
      this.joules -= cost;
      this.motorLevel++;
      this.saveState();
      this.updateUI();
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
  
  hardReset() {
    this.isResetting = true;
    localStorage.removeItem('entropyEngineSave');
    location.reload();
  }

  getPendingConstants() {
    return (this.links - 1) + (this.slingshotLevel - 1) + this.motorLevel + this.frictionLevel + this.loopLevel + this.jouleMultiplierLevel;
  }

  prestige() {
    const gained = this.getPendingConstants();
    if (gained > 0) {
      this.universalConstants += gained;
      this.joules = 0;
      this.links = 1;
      this.slingshotLevel = 1;
      this.motorLevel = 0;
      this.frictionLevel = 0;
      this.loopLevel = 0;
      this.jouleMultiplierLevel = 0;
      this.cHeat = 1.0;
      this.saveState();
      location.reload();
    }
  }
  
  bindEvents() {
    this.ui.buyLinkBtn.addEventListener('click', () => this.buyLink());
    this.ui.buySlingshotBtn.addEventListener('click', () => this.buySlingshot());
    this.ui.buyMotorBtn.addEventListener('click', () => this.buyMotor());
    this.ui.buyFrictionBtn.addEventListener('click', () => this.buyFriction());
    this.ui.buyLoopBtn.addEventListener('click', () => this.buyLoop());
    this.ui.buyJouleMultiplierBtn.addEventListener('click', () => this.buyJouleMultiplier());
    
    this.ui.prestigeBtn.addEventListener('click', () => {
      if (confirm("Are you sure you want to undergo Entropic Rebirth? You will lose all current Joules and Upgrades, but gain a permanent production multiplier!")) {
        this.prestige();
      }
    });

    this.ui.heatDeathBtn.addEventListener('click', () => {
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
    
    // Fast UI update for the main counter
    this.ui.jouleValue.innerText = this.formatNumber(this.joules);
    
    // Update button states
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
    
    if (this.joules >= this.getMotorCost()) {
      this.ui.buyMotorBtn.classList.remove('disabled');
    } else {
      this.ui.buyMotorBtn.classList.add('disabled');
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
    
    const pending = this.getPendingConstants();
    if (pending > 0) {
      this.ui.prestigeBtn.classList.remove('disabled');
      this.ui.prestigeBtn.innerText = `Entropic Rebirth (+${this.formatNumber(pending)} Constants)`;
    } else {
      this.ui.prestigeBtn.classList.add('disabled');
      this.ui.prestigeBtn.innerText = `Rebirth at 1 Upgrade`;
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
    this.ui.currentSlingshot.innerText = this.slingshotLevel;
    this.ui.slingshotCost.innerText = this.formatNumber(this.getSlingshotCost());
    this.ui.currentMotor.innerText = this.motorLevel;
    this.ui.motorCost.innerText = this.formatNumber(this.getMotorCost());
    this.ui.currentFriction.innerText = this.frictionLevel;
    this.ui.frictionCost.innerText = this.formatNumber(this.getFrictionCost());
    this.ui.currentLoop.innerText = this.loopLevel;
    this.ui.loopCost.innerText = this.formatNumber(this.getLoopCost());
    this.ui.currentJouleMultiplier.innerText = this.jouleMultiplierLevel;
    this.ui.jouleMultiplierCost.innerText = this.formatNumber(this.getJouleMultiplierCost());
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
      motorLevel: this.motorLevel,
      frictionLevel: this.frictionLevel,
      loopLevel: this.loopLevel,
      jouleMultiplierLevel: this.jouleMultiplierLevel,
      universalConstants: this.universalConstants,
      cHeat: this.cHeat
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
        this.motorLevel = state.motorLevel || 0;
        this.frictionLevel = state.frictionLevel || 0;
        this.loopLevel = state.loopLevel || 0;
        this.jouleMultiplierLevel = state.jouleMultiplierLevel || 0;
        this.universalConstants = state.universalConstants || 0;
        this.cHeat = 1.0; // Disabled until Shop is added
        this.totalJoulesEarned = state.totalJoulesEarned || this.joules;
      } catch(e) {
        console.error("Save corrupted");
      }
    }
  }
}
