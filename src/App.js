import Game from './component/Game'
import Home from './component/Home'
import CreateGame from './component/CreateGame'
import PreviousGames from './component/PreviousGames'
import Tutorial from './component/Tutorial'

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
        <Route path="previous" element={ <PreviousGames/> } />
        <Route path="tutorial" element={ <Tutorial/> } />
        <Route path="recap" element={ <GameRecap/> } />
      </Routes>
    </div>
  );
}

export default App;
