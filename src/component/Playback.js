import React from "react";
import PropTypes from "prop-types";
var toWav = require("audiobuffer-to-wav");

// import "./Playback.css";

export default class Playback extends React.Component {
  static propTypes = {
    blob: PropTypes.object,
    playBackwards: PropTypes.bool,
  };

  handleClick = async (buttonName) => {
    if (this.state.isRecording) {
      (await this.props.audioRecorder).stop((blob) => {
        this.setState((prevState) => ({
          blob: blob,
        }));
      });
    } else {
      (await this.props.audioRecorder).start();
    }
    this.setState((prevState) => ({
      isRecording: !prevState.isRecording,
    }));
  };

  play = () => {
    if (this.props.playBackwards) {
      this.playBackwards();
    } else {
      const audioURL = window.URL.createObjectURL(this.props.blob);
      var a = new Audio(audioURL);
      a.play();
    }
  };

  playBackwards = async () => {
    var context = new AudioContext();
    context.decodeAudioData(
      await this.props.blob.arrayBuffer(),
      async function (buffer) {
        var source = context.createBufferSource();
        for (var i = 0; i < buffer.numberOfChannels; i++) {
          Array.prototype.reverse.call(buffer.getChannelData(i));
        }
        var wav = toWav(buffer);
        console.log(wav);
        var blob = new window.Blob([new DataView(wav)], {
          type: "audio/wav",
        });

        var url = window.URL.createObjectURL(blob);
        var a = new Audio(url);
        a.playbackRate = 1;
        await a.play();
        a.onended = function () {
          // alert("The audio has ended");
        };
      }
    );
  };

  render() {
    return <span onClick={this.play}>Play Backwards </span>;
  }
}
