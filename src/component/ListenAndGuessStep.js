import Record from "./Record";
import Player from "./Player";
import Waveform from "./Waveform";
// import Playback from "./Playback";
import React from "react";
import PropTypes from "prop-types";
import "./Record.css";
import { getAudioFile } from "../logic/recording-storage";

export default class ListenAndGuessStep extends React.Component {
    // Step Completion should be a callback.
    static propTypes = {
        audioRecorder: PropTypes.object,
        text: PropTypes.string,
        subtext: PropTypes.string,
        buttonClick: PropTypes.func,
        blob: PropTypes.object,
        onStepCompletion: PropTypes.func,
        playBackwards: PropTypes.bool,
        id: PropTypes.string
    };

    state = {
        recordingComplete: false,
        blob: null,
        recordingStarted: false,
        isRecording: false,
        inputValue: ''
    };

    componentDidMount() {
        const urlParams = new URLSearchParams(window.location.search);
        const id = urlParams.get('id');
        this.getAudioFileInternal(id);
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
                <h3>{this.props.text}</h3>
                {this.props.subtext && <span className="subtext">{this.props.subtext}</span>}
                {!this.state.recordingStarted && <span style={{ 'padding-bottom': '15px' }}></span>}
                {this.state.blob && <Player blob={this.state.blob} playBackwards={true} hideRecordAgain={true} />}
                <input type="text" style={{ 'margin-top': '25px' }} value={this.state.inputValue} onChange={evt => this.updateInputValue(evt)}/>
                <input type="submit" value="Guess" onClick={() => { this.props.onStepCompletion(this.state.inputValue) }} />
            </div>

        );
    }
}