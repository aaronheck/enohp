import React from "react";
import PropTypes from "prop-types";
import "./Record.css";


export default class Record extends React.Component {
  static propTypes = {
    audioRecorder: PropTypes.object,
    onStart: PropTypes.func,
    onStop: PropTypes.func,
    sectionAmplitudeCallback: PropTypes.func
  };

  state = {
    isRecording: false
  };

  handleClick = async buttonName => {
    console.log(this.state);
    // stops recording if recording
    if(this.state.isRecording) {
      (await this.props.audioRecorder).stop(this.props.onStop);
    } else {
      // start recording.
      var x = (await this.props.audioRecorder);
      x.start();
      this.props.onStart();
    }
    this.setState(prevState => ({
      isRecording: !prevState.isRecording
    }));
    this.props.handleRecordClick && this.props.handleRecordClick();
    console.log(this.state);
  };

  componentDidMount() {
    this.props.setTriggerRecord(this.handleClick);
  }


  render() {
    return (
      <span>
        <span class="record-button" onClick={this.handleClick}>
          <span class={"transition inner " + (this.state.isRecording ? 'stop' : 'start')}></span>
        </span>
      </span>
    );
  }
}