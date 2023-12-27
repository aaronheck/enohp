import React, { useState, useEffect, useCallback } from "react";
import saveAudioFile from "../logic/recording-storage";

var toWav = require("audiobuffer-to-wav");

function Player(props) {
  const [count, setCount] = useState(0);
  const [playedPercentage, setPlayedPercentage] = useState(0);
  const [processedBlob, setProcessedBlob] = useState(null);
  const [audio, setAudio] = useState(null);
  const [duration, setDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [playbackSpeedClicks, setPlaybackSpeedClicks] = useState(0);
  const { blob, playBackards, onRecordAgain,hideRecordAgain, ...rest } = props;
  const PLAYER_WIDTH = 350;
  const CURRENT_MARKER_OFFSET = 4;
  const PLAYBACK_SPEEDS = [0.5, 1];

  async function play(onEnd) {
  	stop();
  	var url = window.URL.createObjectURL(processedBlob);
  	var newAudio = new Audio(url)
    setAudio(newAudio);

    newAudio.playbackRate = playbackSpeed;
    newAudio.autoplay = true;
    newAudio.onended = onEnd;

	var progressBarUpdateInterval = setInterval(function () {
		if(newAudio.paused) {
			clearInterval(progressBarUpdateInterval);
		}
	  setPlayedPercentage(newAudio.currentTime * 100 / duration);
	}, 10);
    await newAudio.play();
  }

  function stop() {
  	if(audio) {
  		audio.pause();
  		audio.currentTime = 0;
  	}
  }

  function recordAgain() {
  	stop();
  	props.onRecordAgain && props.onRecordAgain();
  }

  async function processAudio() {
    var context = new AudioContext();
    context.decodeAudioData(
      await props.blob.arrayBuffer(),
      async function (buffer) {
        var source = context.createBufferSource();
        for (var i = 0; i < buffer.numberOfChannels; i++) {
          if(props.playBackards || true) {
          	Array.prototype.reverse.call(buffer.getChannelData(i));
          } 
        }
        setDuration(buffer.duration);
        var wav = toWav(buffer);
        var blob = new window.Blob([new DataView(wav)], {
          type: "audio/wav",
        });
        setProcessedBlob(blob); 
      }
    );
  }

  useEffect(() => {
    processAudio();
  }, [props.blob]);

  // Auto play when receive new blob for not safari.
  useEffect(() => {
  	if(processedBlob) {
  		try {
        var isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
        if(!isSafari) {
          play();
        }
      } catch (e) {
        
      }
  	}    
  }, [processedBlob]);

  function getCurrentLocation() {
  	return PLAYER_WIDTH * (playedPercentage / 100) - CURRENT_MARKER_OFFSET;
  }

  function playbackSpeedClick() {
  	setPlaybackSpeedClicks(playbackSpeedClicks+1);
  	setPlaybackSpeed(PLAYBACK_SPEEDS[playbackSpeedClicks % PLAYBACK_SPEEDS.length]);

  }

  return (
  	<div>
	    <div class="player">
	      <div class="unplayed"></div>
	      <div class="played" style={{width: (playedPercentage) + "%"}}></div>
	      <div class="current" style={{left: getCurrentLocation()}}></div>
	    </div>
	    <div class="player-controls">
	    	{!hideRecordAgain && <div class="button-and-label" >
	    		<div class="secondary-player-button" onClick={recordAgain}><div class="small-record"></div></div>
	    		<span class="button-label">Record Again</span>
	    	</div>
        }
	    	<div class="button-and-label">
	    		<div class="play" onClick={play}><img src="/play.svg" /></div>
	    		<span class="button-label">Play in reverse</span>
	    	</div>
	    	<div class="button-and-label">
	    		<div class="secondary-player-button" onClick={playbackSpeedClick}>{playbackSpeed + "x"}</div>
	    		<span class="button-label">Speed</span>
	    	</div>
	    </div>
	    
    </div>
  );
}

export default Player;
