import Step from './Step'
import React from 'react';
import AudioRecorder from "../logic/record-util"; 

export default class Game extends React.Component {
  
 

  state = {
  	forwardsBlob: null,
    backwardsBlob: null,
  	step: 0,
    audioRecorder: null
  };

  // componentDidMount () {
   
  // } 

  // console.log(audioRecorder);

 // {this.state.step >= 2 && 
 //        	<Step text="Step 2: Listen Backwards"
 //             buttonText="Ok Sounds Good" buttonClick={()=>{}}/>}

  render() {
    return (
      <div className="App">
        
      <header className="App-header steps">
        <span onClick={()=>{
           var audioRecorder = AudioRecorder();
           audioRecorder.then(a => this.setState({audioRecorder: a}));
          this.setState({step:1});
          // console.log("hey");
          // alert("hit");

          }}>Start</span>
          
          <Step text="Step 1: Say 'Doorknob' Forwards"
        	  audioRecorder={this.state.audioRecorder}
              blob={this.state.forwardsBlob}
            buttonText="Ok Sounds Good"
            onStepCompletion={()=>{this.setState({step:2})}} />
       	<Step className={this.state.step < 2 ? "hidden" : "nope"}
              text="Step 2: Say 'Doorknob' Backwards"
            audioRecorder={this.state.audioRecorder}
              blob={this.state.forwardsBlob}
            buttonText="Ok Sounds Good"
            subtext="Try to mimic the reversed audio from step 1."
            onStepCompletion={()=>{this.setState({step:3})}} />
  
      </header>
    </div>
    );
  }
}

// 1. Record Forwards & Listen Backwards
// 2. Listen Backwards & Record Backwards
// 3. Listen Backwards Reversed & Submit