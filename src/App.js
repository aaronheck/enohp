import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import Daily from './screens/Daily';
import Home from './screens/Home';
import Turn from './screens/Turn';
import Recap from './screens/Recap';
import MyChains from './screens/MyChains';
import HowToPlay from './screens/HowToPlay';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Daily />} />
      <Route path="friends" element={<Home />} />
      <Route path="game" element={<Turn />} />
      <Route path="recap" element={<Recap />} />
      <Route path="previous" element={<MyChains />} />
      <Route path="tutorial" element={<HowToPlay />} />
      {/* Old "Create Game" page; chains now start from Play with friends. */}
      <Route path="create" element={<Navigate to="/friends" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
