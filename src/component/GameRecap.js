import React from 'react';
import RecapTurnStep from "./RecapTurnStep";
import { getGame } from "../logic/game-storage";

export default class GameRecap extends React.Component {
    state = {
        game: null
    };

    componentDidMount() {
        this.fetchGame();
    }

    async fetchGame() {
        const urlParams = new URLSearchParams(window.location.search);
        const gameId = urlParams.get('gameId');
        let game = await getGame(gameId);
        this.setState({ game });
    }

    render() {
        return (
            <div className="App">
                <header className="App-header steps">
                    {this.state.game && this.state.game.turns.map((turn, i) =>
                        <RecapTurnStep turn={turn} key={i} />
                    )}
                </header>
            </div>
        );
    }
}

// Game is configurable. Has X turns and other turns.