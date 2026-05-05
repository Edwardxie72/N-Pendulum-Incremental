import { SimulationEngine } from './physics/SimulationEngine.js';

document.addEventListener('DOMContentLoaded', () => {
  const setupScreen = document.getElementById('setup-screen');
  const simulationScreen = document.getElementById('simulation-screen');
  const setupForm = document.getElementById('setup-form');
  const backBtn = document.getElementById('back-btn');
  const canvas = document.getElementById('simulation-canvas');
  
  const statN = document.getElementById('stat-n');
  const statVar = document.getElementById('stat-var');

  let engine = null;

  setupForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const config = {
      numPendulums: Number(document.getElementById('numPendulums').value),
      links: Number(document.getElementById('links').value),
      baseAngle: Number(document.getElementById('baseAngle').value),
      variance: Number(document.getElementById('variance').value),
      linkLength: Number(document.getElementById('linkLength').value),
      linkMass: Number(document.getElementById('linkMass').value),
      gravity: Number(document.getElementById('gravity').value),
    };

    statN.textContent = config.numPendulums;
    statVar.textContent = config.variance;

    setupScreen.style.display = 'none';
    simulationScreen.style.display = 'block';

    engine = new SimulationEngine(canvas, config);
    engine.start();
  });

  backBtn.addEventListener('click', () => {
    if (engine) {
      engine.stop();
      engine = null;
    }
    simulationScreen.style.display = 'none';
    setupScreen.style.display = 'flex'; // It uses flexbox in CSS
  });
});
