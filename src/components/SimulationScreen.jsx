import React, { useEffect, useRef } from 'react';
import { SimulationEngine } from '../physics/SimulationEngine';
import './SimulationScreen.css';

function SimulationScreen({ config, onBack }) {
  const canvasRef = useRef(null);
  const engineRef = useRef(null);

  useEffect(() => {
    if (canvasRef.current && !engineRef.current) {
      engineRef.current = new SimulationEngine(canvasRef.current, config);
      engineRef.current.start();
    }

    return () => {
      if (engineRef.current) {
        engineRef.current.stop();
      }
    };
  }, [config]);

  return (
    <div className="simulation-container">
      <canvas ref={canvasRef} className="simulation-canvas"></canvas>
      
      <div className="controls-overlay glass-panel">
        <div className="stats">
          <p><strong>N:</strong> {config.numPendulums}</p>
          <p><strong>Var:</strong> {config.variance}</p>
        </div>
        <button className="btn-primary back-btn" onClick={onBack}>
          ← Back to Setup
        </button>
      </div>
    </div>
  );
}

export default SimulationScreen;
