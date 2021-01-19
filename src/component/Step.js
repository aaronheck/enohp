import Record from "./Record";
import Player from "./Player";
import Waveform from "./Waveform";
import Playback from "./Playback";
import React from "react";
import PropTypes from "prop-types";
import "./Record.css";

export default class Step extends React.Component {
  // Step Completion should be a callback.
  static propTypes = {
    audioRecorder: PropTypes.object,
    text: PropTypes.string,
    buttonClick: PropTypes.func,
    blob: PropTypes.object,
    onStepCompletion: PropTypes.func,
    playBackwards: PropTypes.bool
  };

  state = {
    recordingComplete: false,
    blob: null,
    recordingStarted: false,
    isRecording: false
  };

  onStop = blob => {
    this.setState(prevState => ({
      recordingComplete: true,
      blob: blob,
      isRecording: false
    }));
  };

  onStart = () => {
    this.setState(prevState => ({
      recordingStarted: true,
      isRecording: true
    }));
  };

  onRecordAgain = () => {
    this.setState(prevState => ({
      recordingComplete: false
    }));
    this.triggerRecord();
  };

  render() { 

    //        {this.state.recordingComplete && <Playback blob={this.state.blob} playBackwards={true} />}
    let showRecord = this.props.audioRecorder && (!this.state.recordingComplete || this.state.isRecording);
    return (
      <div className={this.props.className + " step"}>
      	<h3>{this.props.text}</h3>

        <Waveform audioRecorder={this.props.audioRecorder} isRecording={this.state.isRecording} />
        {!this.state.recordingStarted && <span>Click to start recording...</span>}
        {this.recordingComplete && <Player blob={this.state.blob} />}
        <div  style={{ display: showRecord ? 'block' : 'none' }}>
          <Record 
          onStart={this.onStart} 
          onStop={this.onStop} 
          audioRecorder={this.props.audioRecorder}
          setTriggerRecord={triggerRecord => this.triggerRecord = triggerRecord}/>
        </div>
        {this.state.recordingComplete && <Player blob={this.state.blob} playBackwards={true} onRecordAgain={this.onRecordAgain} />}
      </div>

    );
  }
}