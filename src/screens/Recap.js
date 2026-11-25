import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getGame } from '../api/client';
import { Button, Screen } from '../ui/components';
import Chain from '../ui/Chain';
import './screens.css';

export default function Recap() {
  const [params] = useSearchParams();
  const gameId = params.get('id') || params.get('gameId'); // old links used gameId
  const [game, setGame] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    getGame(gameId).then(setGame, (e) => setError(e.status === 404 ? "We couldn't find that game." : e.message));
  }, [gameId]);

  const top = { left: <Link to="/">yelnats</Link>, right: game ? `${game.turns.length} on the line` : '' };

  if (error || (game && !game.turns.length)) {
    return (
      <Screen {...top}>
        <h1 className="title title-sm turn-title">{error ? 'Hmm.' : 'Nobody yet.'}</h1>
        <p className="lede" style={{ marginTop: 12 }}>{error || 'No one has played this chain yet.'}</p>
        <div className="spacer" />
        {!error && <Button to={'/game?id=' + encodeURIComponent(gameId)}>Play the first turn</Button>}
        <Button variant="ghost" to="/" style={{ marginTop: 12 }}>
          Home
        </Button>
      </Screen>
    );
  }

  if (!game) {
    return (
      <Screen {...top}>
        <p className="lede turn-title">Winding the string…</p>
      </Screen>
    );
  }

  const first = game.turns[0].guess;
  const last = game.turns[game.turns.length - 1].guess;
  const same = first.trim().toLowerCase() === last.trim().toLowerCase();

  return (
    <Screen {...top}>
      <h1 className="title title-sm turn-title">
        {game.turns.length === 1 ? (
          <>
            It starts with <span className="accent">{first}</span>.
          </>
        ) : same ? (
          <>
            <span className="accent">{first}</span> made it all the way.
          </>
        ) : (
          <>
            From <span className="accent">{first}</span>
            <br />
            to <span className="hot">{last}</span>.
          </>
        )}
      </h1>
      <p className="lede" style={{ marginTop: 10 }}>Tap anyone to hear their recording, rewound.</p>

      <div className="section">
        <Chain turns={game.turns} />
      </div>

      <div className="spacer" />
      <Button variant="ghost" to="/">
        Home
      </Button>
    </Screen>
  );
}
