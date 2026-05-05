export class GameEngine {
  constructor() {
    this.joules = 0;
    this.totalJoulesEarned = 0;
    this.links = 1;
    this.maxLinks = 10;
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
  
  bindEvents() {
    this.ui.buyLinkBtn.addEventListener('click', () => this.buyLink());
    
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
  }
  
  updateUI() {
    this.ui.jouleRate.innerText = this.formatNumber(this.jouleRate);
    this.ui.currentLinks.innerText = this.links;
    this.ui.linkCost.innerText = this.formatNumber(this.getLinkCost());
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
        this.universalConstants = state.universalConstants || 0;
        this.cHeat = state.cHeat || 1.0;
      } catch(e) {
        console.error("Save corrupted");
      }
    }
  }
}
