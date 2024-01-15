 export default async function AudioRecorder() {
    	let buffer = []

        let analyzer = null;
		let mediaRecorder = null;
	    async function getMediaRecorder(constraints) {
	        try {
				console.log("asking");
				// TODO: figure this out.
				let getUser = navigator.mediaDevices.getUserMedia || 
				navigator.getUserMedia || navigator.webkitGetUserMedia ||
				navigator.mozGetUserMedia || navigator.msGetUserMedia;
	            let stream = await navigator.mediaDevices.getUserMedia({audio: true});
                console.log("granted");
				let audioContent = new AudioContext();
                let audioStream = audioContent.createMediaStreamSource( stream );
                analyzer = audioContent.createAnalyser();
                audioStream.connect(analyzer);
				// play with gain?
                analyzer.fftSize = 512;
	            return new MediaRecorder(stream);
	        } catch (err) {
				alert("E: " + err);
	        }
	    }

	    function isRecording() {
	    	return mediaRecorder && mediaRecorder.state === 'recording';
	    }

    	async function start(sectionAmplitudeCallback) {
			mediaRecorder = await getMediaRecorder();
    		if(isRecording()) {
    			return false;	
    		}
    		buffer = []
            var dataArray = new Float32Array(analyzer.fftSize);

    		mediaRecorder.ondataavailable = function(e) {
             analyzer.getFloatTimeDomainData(dataArray);
    		 buffer.push(e.data);
    		}
            mediaRecorder.start();
    	}

        function getSectionAmplitude() {
            if(!isRecording()) {
                return 0;
            }
            var dataArray = new Float32Array(analyzer.fftSize);
            analyzer.getFloatTimeDomainData(dataArray);
            return 200 * dataArray.reduce((a, b) => Math.abs(a) + Math.abs(b)) / dataArray.length;
        }

    	function stop(onStop) {
    		mediaRecorder.onstop = async (e) => {
				mediaRecorder.stream.getTracks()[0].stop();
				console.log(mediaRecorder);
    			const blob = new Blob(buffer, { 'type' : 'audio/ogg; codecs=opus' });
  				onStop(blob);
    		};
    		mediaRecorder.stop();
    	}

    	return {
    		isRecording,
    		start,
    		stop,
            getSectionAmplitude
    	};
    }