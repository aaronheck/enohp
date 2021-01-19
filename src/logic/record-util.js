 export default async function AudioRecorder() {
    	let buffer = []

        let analyzer = null;
		const mediaRecorder = await getMediaRecorder();

	    async function getMediaRecorder(constraints) {
	        try {
	            let stream = await navigator.mediaDevices.getUserMedia({audio: true});
                let audioContent = new AudioContext();
                let audioStream = audioContent.createMediaStreamSource( stream );
                analyzer = audioContent.createAnalyser();
                audioStream.connect(analyzer);
                analyzer.fftSize = 1024;
	            return new MediaRecorder(stream);
	            /* use the stream */
	        } catch (err) {
	            /* handle the error */
	        }
	    }

	    function isRecording() {
	    	return mediaRecorder.state === 'recording';
	    }
        var d = []

    	function start(sectionAmplitudeCallback) {
    		if(isRecording()) {
    			return false;	
    		}
    		buffer = []
            var dataArray = new Float32Array(analyzer.fftSize);

    		mediaRecorder.ondataavailable = function(e) {
             analyzer.getFloatTimeDomainData(dataArray)
             var max  = 0;
            // for (var i = 0 ; i < dataArray.length; i++) {
            //     max = Math.abs(Math.max(Math.abs(dataArray[0], max)));
            // }
            // console.log(max * 200);
            // d.push(max * 200)
            // console.log(200 * dataArray.reduce((a, b) => Math.abs(a) + Math.abs(b)) / dataArray.length)
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