import React, { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { track } from './lib/analytics';
import Daily, { PastScreen } from './screens/Daily';
import Home from './screens/Home';
import Turn from './screens/Turn';
import Recap from './screens/Recap';
import MyChains from './screens/MyChains';
import HowToPlay from './screens/HowToPlay';
import Practice from './screens/Practice';
import InAppBanner from './ui/InAppBanner';
import Privacy from './screens/Privacy';
import AdminList from './screens/AdminList';
import { IS_ADMIN } from './lib/admin';

export default function App() {
  const { pathname } = useLocation();
  useEffect(() => {
    track('page_view', { path: pathname });
  }, [pathname]);

  // The puzzle review build (on the Pi): just the candidate list and the puzzle screen.
  if (IS_ADMIN) {
    return (
      <Routes>
        <Route path="/" element={<AdminList />} />
        <Route path="puzzle/:n" element={<Daily />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  return (
    <>
      <InAppBanner />
      <Routes>
        <Route path="/" element={<Daily />} />
        <Route path="puzzle/:n" element={<Daily />} />
        <Route path="past" element={<PastScreen />} />
        <Route path="privacy" element={<Privacy />} />
        <Route path="friends" element={<Home />} />
        <Route path="game" element={<Turn />} />
        <Route path="recap" element={<Recap />} />
        <Route path="previous" element={<MyChains />} />
        <Route path="tutorial" element={<HowToPlay />} />
        <Route path="practice" element={<Practice />} />
        <Route path="practice/:n" element={<Practice />} />
        {/* Old "Create Game" page; chains now start from Play with friends. */}
        <Route path="create" element={<Navigate to="/friends" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
