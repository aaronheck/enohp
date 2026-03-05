import React from 'react';
import './CreateGame.css';

const steps = [
    { icon: '🎙️', text: 'Pick a word and record it backwards.' },
    { icon: '📨', text: 'A friend listens and guesses what you said.' },
    { icon: '🔁', text: 'They record their guess backwards and pass it on.' },
    { icon: '🏁', text: 'See how much the word drifted by the end.' },
];

export default class CreateGame extends React.Component {
    state = {
        turnsValue: 5,
        allowReRecords: true,
        loading: false,
    };

    async create() {
        this.setState({ loading: true });
        let body = {};
        body.turns = this.state.turnsValue;
        body.allowReRecords = this.state.allowReRecords;
        let response = await fetch('https://b7tfgad8z3.execute-api.us-east-2.amazonaws.com/test/game', {
            method: 'POST',
            body: JSON.stringify(body)
        });

        let res = await response.json();
        let id = res.id;
        window.location.href = "/game?id=" + id;
    }

    render() {
        const { loading, turnsValue, allowReRecords } = this.state;
        return (
            <div className="create-game-page">
                <div className="create-game-card">
                    <h2 className="create-game-heading">Create Game</h2>
                    <p className="create-game-subtext">The backwards talking game. Pass a word through a chain of friends — see how much it changes.</p>

                    <div className="how-it-works-section">
                        <p className="how-it-works-heading">How it works</p>
                        {steps.map((s, i) => (
                            <div key={i} className="step-row">
                                <span className="step-icon">{s.icon}</span>
                                <p className="step-text">{s.text}</p>
                            </div>
                        ))}
                    </div>

                    <div className="divider" />

                    <div className="field-group">
                        <label className="field-label" htmlFor="num-turns">Number of Turns</label>
                        <input
                            className="number-input"
                            type="number"
                            id="num-turns"
                            min="4"
                            max="25"
                            value={turnsValue}
                            onChange={evt => this.setState({ turnsValue: evt.target.value })}
                        />
                    </div>

                    <label className="checkbox-row" htmlFor="allow-rerecords">
                        <input
                            id="allow-rerecords"
                            className="checkbox-input"
                            type="checkbox"
                            checked={allowReRecords}
                            onChange={() => this.setState({ allowReRecords: !allowReRecords })}
                        />
                        <span className="checkbox-label">Allow Re-Records</span>
                    </label>

                    <button
                        className="create-button"
                        disabled={loading}
                        onClick={() => this.create()}
                    >
                        {loading ? 'Creating...' : 'Create Game'}
                    </button>
                </div>
            </div>
        );
    }
}
