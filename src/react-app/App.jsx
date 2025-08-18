import React from 'react';
import './App.css';
import Timeline from './components/Timeline';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>APOD Timeline</h1>
      </header>
      <main className="main-content">
        <Timeline />
      </main>
    </div>
  );
}

export default App;
