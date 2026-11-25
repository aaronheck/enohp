import React from 'react';
import { Link } from 'react-router-dom';
import { getPlayedGames } from '../lib/storage';
import { Button, Screen } from '../ui/components';
import './screens.css';

function ago(ts) {
  const mins = Math.round((Date.now() - ts) / 60000);
  if (mins < 60) return mins <= 1 ? 'just now' : `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  return new Date(ts).toLocaleDateString();
}

export default function MyChains() {
  const games = getPlayedGames();
  return (
    <Screen left={<Link to="/">yelnats</Link>} right="on this phone">
      <h1 className="title title-sm turn-title">My chains</h1>
      {games.length ? (
        <ul className="list">
          {games.map((g) => (
            <li key={g.id}>
              <Link to={'/recap?id=' + encodeURIComponent(g.id)}>
                <span>
                  <b>{g.guess}</b>
                  <small>
                    You played turn {g.turn} · {ago(g.at)}
                  </small>
                </span>
                <span aria-hidden="true">→</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="lede" style={{ marginTop: 12 }}>
          Chains you play on this phone will show up here.
        </p>
      )}
      <div className="spacer" />
      <Button variant="ghost" to="/">
        Home
      </Button>
    </Screen>
  );
}
