import Game from './component/Game'
import Home from './component/Home'
import CreateGame from './component/CreateGame'

import React from 'react';
import './App.css';
import { Routes, Route } from "react-router-dom"
import GameRecap from './component/GameRecap';

function App() {
  return (
    <div className="App">
      <Routes>
        <Route path="/" element={ <Home/> } />
        <Route path="game" element={ <Game/> } />
        <Route path="create" element={ <CreateGame/> } />
        <Route path="recap" element={ <GameRecap/> } />
      </Routes>
    </div>
  );
}

export default App;
