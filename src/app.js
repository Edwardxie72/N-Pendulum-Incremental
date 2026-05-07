import { SimulationEngine } from './physics/SimulationEngine.js';
import { GameEngine } from './GameEngine.js';

document.addEventListener('DOMContentLoaded', () => {
  const simCanvas = document.getElementById('simulation-canvas');
  const trailCanvas = document.getElementById('trailCanvas');

  // Resize canvas to fill the container
  function resizeCanvas() {
    const container = document.getElementById('canvasContainer');
    simCanvas.width = container.clientWidth;
    simCanvas.height = container.clientHeight;
    trailCanvas.width = container.clientWidth;
    trailCanvas.height = container.clientHeight;
    
    if (window.simulation) {
      window.simulation.recenter();
    }
  }
  
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  // Initialize GameEngine which manages state and currency
  const game = new GameEngine();
  
  // Create physics engine
  const simulation = new SimulationEngine(simCanvas, trailCanvas, game);
  window.simulation = simulation;
  game.setSimulation(simulation);
  
  // Start loop
  let lastTime = performance.now();
  function loop(currentTime) {
    const dt = Math.min((currentTime - lastTime) / 1000, 0.1); // Cap dt to prevent explosion on tab switch
    lastTime = currentTime;
    
    simulation.update(dt);
    simulation.draw();
    game.update(dt);
    
    requestAnimationFrame(loop);
  }
  
  requestAnimationFrame(loop);
  
  // Debug Features
  const DEBUG = true; // Set to true locally to enable debug features
  if (DEBUG) {
    const resetBtn = document.getElementById('reset-btn');
    if (resetBtn) {
      resetBtn.style.display = 'block';
      resetBtn.addEventListener('click', () => {
        game.hardReset();
      });
    }
  }
  
  const playAgainBtn = document.getElementById('play-again-btn');
  if (playAgainBtn) {
    playAgainBtn.addEventListener('click', () => {
      game.hardReset();
    });
  }

  // UI Tab Navigation Logic
  const navBtns = document.querySelectorAll('.nav-btn');
  const tabContents = document.querySelectorAll('.tab-content');
  const sidePanel = document.getElementById('sidePanel');
  const settingsBtn = document.getElementById('settings-toggle-btn');

  sidePanel.classList.add('open'); // Default open

  function switchTab(targetId) {
    tabContents.forEach(tab => tab.classList.remove('active'));
    navBtns.forEach(btn => btn.classList.remove('active'));
    
    document.getElementById(targetId).classList.add('active');
    
    document.querySelectorAll(`.nav-btn[data-target="${targetId}"]`).forEach(btn => {
      btn.classList.add('active');
    });

    sidePanel.classList.add('open');
  }

  navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      if (window.innerWidth < 768 && btn.classList.contains('active')) {
        sidePanel.classList.toggle('open');
        return;
      }
      switchTab(btn.getAttribute('data-target'));
    });
  });

  if (settingsBtn) {
    settingsBtn.addEventListener('click', () => {
      if (window.innerWidth < 768) {
        if (document.getElementById('settings-tab').classList.contains('active') && sidePanel.classList.contains('open')) {
          sidePanel.classList.remove('open');
          return;
        }
      }
      switchTab('settings-tab');
    });
  }

  // ── Hold-to-upgrade ──────────────────────────────────────────────────────
  // Buttons that should NOT rapid-fire (they have confirm dialogs or are one-shot)
  const NO_HOLD_IDS = new Set(['prestigeBtn', 'heatDeathBtn', 'reset-btn', 'play-again-btn', 'settings-toggle-btn']);

  let holdTimeout = null;
  let holdInterval = null;

  function stopHold() {
    clearTimeout(holdTimeout);
    clearInterval(holdInterval);
    holdTimeout = null;
    holdInterval = null;
  }

  function startHold(btn) {
    if (NO_HOLD_IDS.has(btn.id)) return;
    holdTimeout = setTimeout(() => {
      holdInterval = setInterval(() => {
        if (btn.classList.contains('disabled')) {
          stopHold(); // ran out of currency mid-hold
        } else {
          btn.click();
        }
      }, 80);
    }, 350);
  }

  // Attach to all buttons — new ones added after load won't be covered, but all
  // shop buttons are static HTML so this is fine.
  document.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('mousedown', () => startHold(btn));
    btn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      startHold(btn);
    }, { passive: false });
  });

  window.addEventListener('mouseup', stopHold);
  window.addEventListener('touchend', stopHold);
  window.addEventListener('mouseleave', stopHold);
});
