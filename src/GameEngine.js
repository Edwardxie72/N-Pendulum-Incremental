export class GameEngine {
  constructor() {
    this.joules = 0;
    this.totalJoulesEarned = 0;
    this.links = 1;
    this.maxLinks = 10;
    this.slingshotLevel = 1;
    this.motorLevel = 0;
    this.frictionLevel = 0;
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
      constantsValue: document.getElementById('constantsValue'),
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
    return 10 * Math.pow(100, this.links - 1);
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
  
  addJoules(amount) {
    const finalAmount = amount * this.cHeat;
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
  
  bindEvents() {
    this.ui.buyLinkBtn.addEventListener('click', () => this.buyLink());
    this.ui.buySlingshotBtn.addEventListener('click', () => this.buySlingshot());
    this.ui.buyMotorBtn.addEventListener('click', () => this.buyMotor());
    this.ui.buyFrictionBtn.addEventListener('click', () => this.buyFriction());
    
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
    this.ui.constantsValue.innerText = this.universalConstants;
  }
  
  formatNumber(num) {
    if (num < 1000) return num.toFixed(2);
    if (num < 1e6) return (num / 1000).toFixed(2) + 'k';
    if (num < 1e9) return (num / 1e6).toFixed(2) + 'M';
    if (num < 1e12) return (num / 1e9).toFixed(2) + 'B';
    return num.toExponential(2);
  }
  
  saveState() {
    const state = {
      joules: this.joules,
      links: this.links,
      slingshotLevel: this.slingshotLevel,
      motorLevel: this.motorLevel,
      frictionLevel: this.frictionLevel,
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
        this.universalConstants = state.universalConstants || 0;
        this.cHeat = state.cHeat || 1.0;
      } catch(e) {
        console.error("Save corrupted");
      }
    }
  }
}
