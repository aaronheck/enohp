import React from 'react';
import { useNavigate } from "react-router-dom";

export default class Home extends React.Component {
    // navigate = useNavigate();
    state = {
        turnsValue: 5,
        allowReRecords: true
    };

    componentDidMount() {
    }

   
    async create() {
        // alert(this.state.turnsValue + " " + this.state.allowReRecords);
        // makes a request to lambda
        // lambda saves configuration in s3 or ddb
        // lambda returns the game id
        let body = {};
        body.turns = this.state.turnsValue;
        body.allowReRecords = this.state.allowReRecords;
        let response = await fetch('https://b7tfgad8z3.execute-api.us-east-2.amazonaws.com/test/game', {
            method: 'POST',
            body: JSON.stringify(body)
        });

        let res = await response.json();
        let id = res.id;
        // this.navigate("/game?id=" + id);
        window.location.href = "/game?id=" + id;
    }

    updateInputValue(evt) {
        const val = evt.target.value;
        this.setState({
            turnsValue: val
        });
    }

    handleReRecordsCheckChange(evt) {
        this.setState({
            allowReRecords: !this.state.allowReRecords
        });
    }

    render() {
        return (
            <div style={{ display: "flex", flexDirection: "column", width: "250px" }}>
                <h1>Create Game</h1>
                Number of Turns: <input type="number" id="num-turns" name="num-turns" min="4" max="25"
                    value={this.state.turnsValue} onChange={evt => this.updateInputValue(evt)} />

                <label>
                    <input type="checkbox" checked={this.state.allowReRecords}
                        onChange={()=>this.handleReRecordsCheckChange()}
                    />
                    Allow Re-Records
                </label>
                <button onClick={() => { this.create() }}>Create</button>
            </div>
        );
    }
}
