import Player from "./Player";
import React from "react";
import PropTypes from "prop-types";
import "./Record.css";
import { getAudioFile } from "../logic/recording-storage";

export default class StartGameStep extends React.Component {
    static propTypes = {
        text: PropTypes.string,
        subtext: PropTypes.string,
        buttonClick: PropTypes.func,
        blob: PropTypes.object,
        onStepCompletion: PropTypes.func,
        playBackwards: PropTypes.bool,
        id: PropTypes.string
    };

    state = {
        inputValue: ''
    };

    componentDidMount() {
        const urlParams = new URLSearchParams(window.location.search);
        const id = urlParams.get('id');
        // this.getAudioFileInternal(id);
    }

    getAudioFileInternal = async (id) => {
        let file = await getAudioFile(id);
        let blob = await file.blob();
        this.setState({ blob: blob });
    };

    updateInputValue(evt) {
        const val = evt.target.value;
        this.setState({
          inputValue: val
        });
      }

    render() {
        return (
            <div className={this.props.className + " step"}>
                <h3>Pick a Word</h3>
                {<span className="subtext">Pick a word to start the game.</span>}
                <input type="text" style={{ 'margin-top': '25px' }} value={this.state.inputValue} onChange={evt => this.updateInputValue(evt)}/>
                <input type="submit" value="Start Game" onClick={() => { this.props.onStepCompletion(this.state.inputValue) }} />
            </div>
        );
    }
}