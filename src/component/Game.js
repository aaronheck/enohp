import Step from './Step'
import ListenAndGuessStep from './ListenAndGuessStep'
import ShareStep from './ShareStep'
import React from 'react';
import AudioRecorder from "../logic/record-util"; 

export default class Game extends React.Component {
  state = {
  	forwardsBlob: null,
    backwardsBlob: null,
  	step: 0,
    audioRecorder: null,
    seedId: null,
    newId: null,
    blobToSave: null,
    guess: ""
  };

  componentDidMount () {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');
    var audioRecorder = AudioRecorder();
    audioRecorder.then(a => this.setState({audioRecorder: a, seedId: id}));
  } 

  render() {
    return (
      <div className="App">
      <header className="App-header steps">
      <ListenAndGuessStep text="Step 1: What do you think your friend is saying?"
                  subtext="Reversed audio of backwards speaking."
        	  audioRecorder={this.state.audioRecorder}
            id={this.state.seedId}
            buttonText="Ok Sounds Good"
            onStepCompletion={(guess)=>{
              this.setState({step:1, guess});
              
            }} />
        <Step className={this.state.step < 1 ? "hidden" : "nope"}
            text={`Step 2: Say '${this.state.guess}' Forwards`}
          audioRecorder={this.state.audioRecorder}
            blob={this.state.forwardsBlob}
          buttonText="Ok Sounds Good"
          onStepCompletion={()=>{this.setState({step:2})}} />
       	<Step className={this.state.step < 2 ? "hidden" : "nope"}
            text={`Step 3: Say '${this.state.guess}' Backwards`}
            audioRecorder={this.state.audioRecorder}
              blob={this.state.forwardsBlob}
            buttonText="Ok Sounds Good"
            showShare={true}
            subtext="Try to mimic the reversed audio from the previous step."
            onStepCompletion={(blob)=>{this.setState({step:3, blobToSave:blob})}} />
          <ShareStep className={this.state.step < 3 ? "hidden" : "nope"} text="Send it on."
                  subtext="Keep the game going and send a link to the next person."
        	  audioRecorder={this.state.audioRecorder}
            blobToSave={this.state.blobToSave} />
      </header>
    </div>
    );
  }
}

// Game is configurable. Has X turns and other turns.