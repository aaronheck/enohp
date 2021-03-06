import Step from './Step'
import React from 'react';
import AudioRecorder from "../logic/record-util"; 

export default class Game extends React.Component {
  
 

  state = {
  	forwardsBlob: null,
    backwardsBlob: null,
  	step: 1,
    audioRecorder: null
  };

  componentDidMount () {
    var audioRecorder = AudioRecorder();
    audioRecorder.then(a => this.setState({audioRecorder: a}))
  }

  // console.log(audioRecorder);

 // {this.state.step >= 2 && 
 //        	<Step text="Step 2: Listen Backwards"
 //             buttonText="Ok Sounds Good" buttonClick={()=>{}}/>}

  render() {
    return (
      <div className="App">
      <header className="App-header steps">
        <Step text="Step 1: Say 'Doorknob' Forwards"
        	  audioRecorder={this.state.audioRecorder}
            blob={this.state.forwardsBlob}
            buttonText="Ok Sounds Good"
            buttonClick={()=>{this.setState({step:2})}} />
       	<Step className={this.state.step < 2 ? "hidden" : "nope"} text="Step 2: Record Backwards"
       		blob={this.state.forwardsBlob}
       		playBackwards={true}
            buttonText="Ok Sounds Good" buttonClick={()=>{}}/>
       
      </header>
    </div>
    );
  }
}

// 1. Record Forwards & Listen Backwards
// 2. Listen Backwards & Record Backwards
// 3. Listen Backwards Reversed & Submit