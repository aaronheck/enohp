(this.webpackJsonpenohp=this.webpackJsonpenohp||[]).push([[0],[,function(e,t){e.exports={getAudioFile:async function(e){let t=await(e=>fetch("https://b7tfgad8z3.execute-api.us-east-2.amazonaws.com/test/recording?id="+e,{method:"GET"}))(e),a=(await t.json()).url;var s;return await(s=a,fetch(s,{method:"GET"}))},saveAudioFile:async function(e){let t=await fetch("https://b7tfgad8z3.execute-api.us-east-2.amazonaws.com/test/recording",{method:"POST"}),a=await t.json(),s=a.url;var o,n;return await(o=s,n=e,fetch(o,{method:"PUT",headers:{"Content-Type":"audio/wav"},body:n})),a.key}}},function(e,t,a){},,,function(e,t,a){e.exports=a(13)},,,,,function(e,t,a){},,function(e,t,a){},function(e,t,a){"use strict";a.r(t);var s=a(0),o=a.n(s),n=a(4),r=a.n(n);a(10),a(2);class i extends o.a.Component{constructor(){super(...arguments),this.state={isRecording:!1},this.handleClick=async e=>{if(console.log(this.state),this.state.isRecording)(await this.props.audioRecorder).stop(this.props.onStop);else{var t=await this.props.audioRecorder;console.log(t),t.start(),this.props.onStart()}this.setState(e=>({isRecording:!e.isRecording})),this.props.handleRecordClick&&this.props.handleRecordClick(),console.log(this.state)}}componentDidMount(){this.props.setTriggerRecord(this.handleClick)}render(){return o.a.createElement("span",null,o.a.createElement("span",{class:"record-button",onClick:this.handleClick},o.a.createElement("span",{class:"transition inner "+(this.state.isRecording?"stop":"start")})))}}var c=a(1),l=a(11);var d=function(e){const[t,a]=Object(s.useState)(0),[n,r]=Object(s.useState)(0),[i,c]=Object(s.useState)(null),[d,u]=Object(s.useState)(null),[p,h]=Object(s.useState)(0),[m,g]=Object(s.useState)(1),[b,v]=Object(s.useState)(0),{blob:S,playBackards:w,onRecordAgain:y,hideRecordAgain:f,...R}=e,E=[.5,1];async function x(e){C();var t=window.URL.createObjectURL(i),a=new Audio(t);u(a),a.playbackRate=m,a.autoplay=!0,a.onended=e;var s=setInterval((function(){a.paused&&clearInterval(s),r(100*a.currentTime/p)}),10);await a.play()}function C(){d&&(d.pause(),d.currentTime=0)}return Object(s.useEffect)(()=>{!async function(){var t=new AudioContext;t.decodeAudioData(await e.blob.arrayBuffer(),(async function(a){t.createBufferSource();for(var s=0;s<a.numberOfChannels;s++)e.playBackards,Array.prototype.reverse.call(a.getChannelData(s));h(a.duration);var o=l(a),n=new window.Blob([new DataView(o)],{type:"audio/wav"});c(n)}))}()},[e.blob]),Object(s.useEffect)(()=>{if(i)try{/^((?!chrome|android).)*safari/i.test(navigator.userAgent)||x()}catch(e){}},[i]),o.a.createElement("div",null,o.a.createElement("div",{class:"player"},o.a.createElement("div",{class:"unplayed"}),o.a.createElement("div",{class:"played",style:{width:n+"%"}}),o.a.createElement("div",{class:"current",style:{left:n/100*350-4}})),o.a.createElement("div",{class:"player-controls"},!f&&o.a.createElement("div",{class:"button-and-label"},o.a.createElement("div",{class:"secondary-player-button",onClick:function(){C(),e.onRecordAgain&&e.onRecordAgain()}},o.a.createElement("div",{class:"small-record"})),o.a.createElement("span",{class:"button-label"},"Record Again")),o.a.createElement("div",{class:"button-and-label"},o.a.createElement("div",{class:"play",onClick:x},o.a.createElement("img",{src:"/play.svg"})),o.a.createElement("span",{class:"button-label"},"Play in reverse")),o.a.createElement("div",{class:"button-and-label"},o.a.createElement("div",{class:"secondary-player-button",onClick:function(){v(b+1),g(E[b%E.length])}},m+"x"),o.a.createElement("span",{class:"button-label"},"Speed"))))};var u=e=>{const{audioRecorder:t,isRecording:a,...n}=e,r=Object(s.useRef)(null);return Object(s.useEffect)(()=>{const e=r.current;e.width=200,e.height=25;const s=e.getContext("2d");const o=setInterval(()=>{if(a){let a=s,n=0;t&&(n=t.getSectionAmplitude()),a.lineWidth=1,a.strokeStyle="rgb(0, 0, 0)",a.beginPath();a.globalCompositeOperation="copy",a.drawImage(a.canvas,-4,0),a.globalCompositeOperation="source-over";var o=Math.max(.5*n,2);a.save(),a.fillStyle="rgb(0, 0, 0)",a.fillRect(e.width-5,(e.height-o)/2,1,o),a.restore()}else s.clearRect(0,0,e.width,e.height)},100);return()=>{clearInterval(o)}},[a]),o.a.createElement("canvas",{id:"waveform",ref:r})};class p extends o.a.Component{constructor(){super(...arguments),this.state={recordingComplete:!1,blob:null,recordingStarted:!1,isRecording:!1},this.onStop=async e=>{this.setState(t=>({recordingComplete:!0,blob:e,isRecording:!1})),this.props.onStepCompletion&&this.props.onStepCompletion(e)},this.onStart=()=>{this.setState(e=>({recordingStarted:!0,isRecording:!0}))},this.onRecordAgain=()=>{this.setState(e=>({recordingComplete:!1})),this.triggerRecord()}}render(){let e=this.props.audioRecorder&&(!this.state.recordingComplete||this.state.isRecording);return o.a.createElement("div",{className:this.props.className+" step"},o.a.createElement("h3",null,this.props.text),this.props.subtext&&o.a.createElement("span",{className:"subtext"},this.props.subtext),o.a.createElement(u,{audioRecorder:this.props.audioRecorder,isRecording:this.state.isRecording}),!this.state.recordingStarted&&o.a.createElement("span",{style:{"padding-bottom":"15px"}},"Click to start recording..."),o.a.createElement("div",{style:{display:e?"block":"none"}},o.a.createElement(i,{onStart:this.onStart,onStop:this.onStop,audioRecorder:this.props.audioRecorder,setTriggerRecord:e=>this.triggerRecord=e})),this.state.recordingComplete&&o.a.createElement(d,{blob:this.state.blob,playBackwards:!0,onRecordAgain:this.onRecordAgain}))}}class h extends o.a.Component{constructor(){super(...arguments),this.state={recordingComplete:!1,blob:null,recordingStarted:!1,isRecording:!1,inputValue:""},this.getAudioFileInternal=async e=>{let t=await Object(c.getAudioFile)(e),a=await t.blob();this.setState({blob:a})}}componentDidMount(){const e=new URLSearchParams(window.location.search).get("id");this.getAudioFileInternal(e)}updateInputValue(e){const t=e.target.value;this.setState({inputValue:t})}render(){return o.a.createElement("div",{className:this.props.className+" step"},o.a.createElement("h3",null,this.props.text),this.props.subtext&&o.a.createElement("span",{className:"subtext"},this.props.subtext),!this.state.recordingStarted&&o.a.createElement("span",{style:{"padding-bottom":"15px"}}),this.state.blob&&o.a.createElement(d,{blob:this.state.blob,playBackwards:!0,hideRecordAgain:!0}),o.a.createElement("input",{type:"text",style:{"margin-top":"25px"},value:this.state.inputValue,onChange:e=>this.updateInputValue(e)}),o.a.createElement("input",{type:"submit",value:"Guess",onClick:()=>{this.props.onStepCompletion(this.state.inputValue)}}))}}class m extends o.a.Component{constructor(){super(...arguments),this.state={buttonText:"Copy Link to Send",url:null},this.saveAndCopyUrl=async()=>{this.setState({buttonText:"Copying..."});let e=await Object(c.saveAudioFile)(this.props.blobToSave),t=window.location.origin+"?id="+e;navigator.clipboard.writeText(t),this.setState({buttonText:"Copied!",url:t}),navigator.share({url:t})}}render(){return o.a.createElement("div",{className:this.props.className+" step"},o.a.createElement("h3",null,this.props.text),this.props.subtext&&o.a.createElement("span",{className:"subtext"},this.props.subtext),o.a.createElement("div",{onClick:this.saveAndCopyUrl,style:{color:"blue",cursor:"pointer"}},this.state.buttonText),null!=this.state.url&&this.state.url)}}class g extends o.a.Component{constructor(){super(...arguments),this.state={forwardsBlob:null,backwardsBlob:null,step:0,audioRecorder:null,seedId:null,newId:null,blobToSave:null,guess:""}}componentDidMount(){const e=new URLSearchParams(window.location.search).get("id");(async function(){let e=[],t=null;const a=await async function(e){try{console.log("asking");let e=await navigator.mediaDevices.getUserMedia({audio:!0});console.log("granted");let a=new AudioContext,s=a.createMediaStreamSource(e);return t=a.createAnalyser(),s.connect(t),t.fftSize=1024,new MediaRecorder(e)}catch(s){var a;alert("e"),navigator.getUserMedia=navigator.getUserMedia||navigator.webkitGetUserMedia||navigator.mozGetUserMedia||navigator.msGetUserMedia||(null===(a=navigator.mediaDevices)||void 0===a?void 0:a.getUserMedia),alert("E: "+navigator.getUserMedia)}}();function s(){return"recording"===a.state}return{isRecording:s,start:function(o){if(s())return!1;e=[];var n=new Float32Array(t.fftSize);a.ondataavailable=function(a){t.getFloatTimeDomainData(n);e.push(a.data)},a.start()},stop:function(t){a.onstop=async a=>{const s=new Blob(e,{type:"audio/ogg; codecs=opus"});t(s)},a.stop()},getSectionAmplitude:function(){if(!s())return 0;var e=new Float32Array(t.fftSize);return t.getFloatTimeDomainData(e),200*e.reduce((e,t)=>Math.abs(e)+Math.abs(t))/e.length}}})().then(t=>this.setState({audioRecorder:t,seedId:e}))}render(){return o.a.createElement("div",{className:"App"},o.a.createElement("header",{className:"App-header steps"},o.a.createElement(h,{text:"Step 1: What do you think your friend is saying?",subtext:"Reversed audio of backwards speaking.",audioRecorder:this.state.audioRecorder,id:this.state.seedId,buttonText:"Ok Sounds Good",onStepCompletion:e=>{this.setState({step:1,guess:e})}}),o.a.createElement(p,{className:this.state.step<1?"hidden":"nope",text:"Step 2: Say '".concat(this.state.guess,"' Forwards"),audioRecorder:this.state.audioRecorder,blob:this.state.forwardsBlob,buttonText:"Ok Sounds Good",onStepCompletion:()=>{this.setState({step:2})}}),o.a.createElement(p,{className:this.state.step<2?"hidden":"nope",text:"Step 3: Say '".concat(this.state.guess,"' Backwards"),audioRecorder:this.state.audioRecorder,blob:this.state.forwardsBlob,buttonText:"Ok Sounds Good",showShare:!0,subtext:"Try to mimic the reversed audio from the previous step.",onStepCompletion:e=>{this.setState({step:3,blobToSave:e})}}),o.a.createElement(m,{className:this.state.step<3?"hidden":"nope",text:"Send it on.",subtext:"Keep the game going and send a link to the next person.",audioRecorder:this.state.audioRecorder,blobToSave:this.state.blobToSave})))}}a(12);var b=function(){return o.a.createElement(g,null)};Boolean("localhost"===window.location.hostname||"[::1]"===window.location.hostname||window.location.hostname.match(/^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/));r.a.render(o.a.createElement(o.a.StrictMode,null,o.a.createElement(b,null)),document.getElementById("root")),"serviceWorker"in navigator&&navigator.serviceWorker.ready.then(e=>{e.unregister()}).catch(e=>{console.error(e.message)})}],[[5,1,2]]]);
//# sourceMappingURL=main.1ff37516.chunk.js.map