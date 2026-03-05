import React from 'react';

// TODO: Previous Games page
// Show a list of games the current user has participated in, identified by nickname cookie.
// Each entry should show:
//   - The game ID / a shareable link
//   - The original word (if this user started the game)
//   - How many turns have been completed vs the total
//   - A link to view the recap if the game is finished
// Games should be stored/fetched from the backend, keyed by nickname or a device ID cookie.

export default class PreviousGames extends React.Component {
    render() {
        return (
            <div>
                <h2>Previous Games</h2>
                <p>Coming soon.</p>
            </div>
        );
    }
}
