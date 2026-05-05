import React, { useState } from 'react';
import SetupScreen from './components/SetupScreen';
import SimulationScreen from './components/SimulationScreen';

function App() {
  const [isSimulating, setIsSimulating] = useState(false);
  const [config, setConfig] = useState(null);

  const startSimulation = (newConfig) => {
    setConfig(newConfig);
    setIsSimulating(true);
  };

  const stopSimulation = () => {
    setIsSimulating(false);
  };

  return (
    <div className="app-container">
      {isSimulating ? (
        <SimulationScreen config={config} onBack={stopSimulation} />
      ) : (
        <SetupScreen onStart={startSimulation} />
      )}
    </div>
  );
}

export default App;
