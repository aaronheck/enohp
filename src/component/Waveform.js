import React, { useRef, useEffect } from 'react'

const Waveform = props => {
  
  const { audioRecorder, isRecording, ...rest } = props
  const canvasRef = useRef(null)
  useEffect(() => {
    
    const canvas = canvasRef.current
    canvas.width = 200;
    canvas.height = 25;
    const context = canvas.getContext('2d')
    let frameCount = 0

    const draw = () => {
    	if(isRecording) {
	    	let ctx = context;
	    	let sectionAmplitude = 0;
	    	if(audioRecorder) {
	      		sectionAmplitude = audioRecorder.getSectionAmplitude();
	     	}
	      	ctx.lineWidth = 1;
	      	ctx.strokeStyle = 'rgb(0, 0, 0)';
		    ctx.beginPath();
		    var sliceWidth = 1;
		    
		    // shift 
		    var sizeOfShift = -4
		    ctx.globalCompositeOperation = "copy";
			ctx.drawImage(ctx.canvas, sizeOfShift, 0);
			ctx.globalCompositeOperation = "source-over"

			// Cut the amplitude in half and make the min amplitude 2px;
		    var y = Math.max(sectionAmplitude * 0.5, 2);

		    ctx.save();
		    ctx.fillStyle='rgb(0, 0, 0)';
		    ctx.fillRect(canvas.width - 5, // write newest bar near end of canvas (x axis)
		    	(canvas.height - y) / 2, // start the bar from the center - half amplitude
		    	sliceWidth, // the bar should be this wide
		    	y); // bar should be this tall

		    ctx.restore();
		} else {
			context.clearRect(0, 0, canvas.width, canvas.height);

		}
	  }
	  const interval = setInterval(draw, 100);


    const render = () => {
      frameCount++      
    }
    render()
    
    return () => {
      clearInterval(interval);
    }
  }, [isRecording])
  
  return <canvas id="waveform" ref={canvasRef}/>
}

export default Waveform