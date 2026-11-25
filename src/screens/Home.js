import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createGame } from '../api/client';
import { getPlayedGames } from '../lib/storage';
import { Button, Notice, Screen } from '../ui/components';
import HowItWorksArt from '../ui/HowItWorksArt';
import './screens.css';

export default function Home() {
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);
  const played = getPlayedGames().length;

  async function start() {
    setCreating(true);
    setError(null);
    try {
      const id = await createGame();
      navigate('/game?id=' + encodeURIComponent(id));
    } catch (e) {
      setError(e.message);
      setCreating(false);
    }
  }

  return (
    <Screen left="yelnats" className="home">
      <h1 className="title" style={{ marginTop: 28 }}>
        Say it
        <br />
        <span className="accent">backwards.</span>
      </h1>
      <p className="lede" style={{ marginTop: 14 }}>
        Telephone, but backwards.
      </p>

      <HowItWorksArt />

      <div className="stack">
        <Notice>{error}</Notice>
        <Button onClick={start} disabled={creating}>
          {creating ? 'Starting…' : 'Start a chain'}
        </Button>
        <div className="row">
          <Button variant="ghost" to="/tutorial">
            How to play
          </Button>
          <Button variant="ghost" to="/previous">
            My chains{played ? ` · ${played}` : ''}
          </Button>
        </div>
      </div>
    </Screen>
  );
}
