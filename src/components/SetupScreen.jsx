import React, { useState } from 'react';
import './SetupScreen.css';

function SetupScreen({ onStart }) {
  const [numPendulums, setNumPendulums] = useState(100);
  const [baseTheta1, setBaseTheta1] = useState(Math.PI / 2); // 90 degrees
  const [baseTheta2, setBaseTheta2] = useState(Math.PI / 2);
  const [variance, setVariance] = useState(0.0001);
  const [length1, setLength1] = useState(150);
  const [length2, setLength2] = useState(150);
  const [mass1, setMass1] = useState(10);
  const [mass2, setMass2] = useState(10);
  const [gravity, setGravity] = useState(1);

  const handleSubmit = (e) => {
    e.preventDefault();
    onStart({
      numPendulums: Number(numPendulums),
      baseTheta1: Number(baseTheta1),
      baseTheta2: Number(baseTheta2),
      variance: Number(variance),
      length1: Number(length1),
      length2: Number(length2),
      mass1: Number(mass1),
      mass2: Number(mass2),
      gravity: Number(gravity),
    });
  };

  return (
    <div className="setup-container">
      <div className="glass-panel setup-panel">
        <h1 className="title">N-Pendulum Simulator</h1>
        <p className="subtitle">Visualize Chaos Theory</p>

        <form onSubmit={handleSubmit} className="setup-form">
          <div className="form-group">
            <label>Number of Pendulums (N)</label>
            <input type="number" value={numPendulums} onChange={e => setNumPendulums(e.target.value)} min="1" max="1000" />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Starting Angle 1 (rad)</label>
              <input type="number" step="0.01" value={baseTheta1} onChange={e => setBaseTheta1(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Starting Angle 2 (rad)</label>
              <input type="number" step="0.01" value={baseTheta2} onChange={e => setBaseTheta2(e.target.value)} />
            </div>
          </div>

          <div className="form-group">
            <label>Random Variance ($\epsilon$ rad)</label>
            <input type="number" step="0.00001" value={variance} onChange={e => setVariance(e.target.value)} />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Length 1</label>
              <input type="number" value={length1} onChange={e => setLength1(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Length 2</label>
              <input type="number" value={length2} onChange={e => setLength2(e.target.value)} />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Mass 1</label>
              <input type="number" value={mass1} onChange={e => setMass1(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Mass 2</label>
              <input type="number" value={mass2} onChange={e => setMass2(e.target.value)} />
            </div>
          </div>

          <div className="form-group">
            <label>Gravity</label>
            <input type="number" step="0.1" value={gravity} onChange={e => setGravity(e.target.value)} />
          </div>

          <button type="submit" className="btn-primary start-btn">Start Simulation</button>
        </form>
      </div>
    </div>
  );
}

export default SetupScreen;
