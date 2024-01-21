
import React from "react";
import PropTypes from "prop-types";
import "./Record.css";
import {saveAudioFile} from "../logic/recording-storage";


export default class ShareStep extends React.Component {
  copyText = ["Copy", "Copying...", "Copied"];
  shareText = ["Share", "Opening...", "Share"];

  shareOrCopyText = navigator.share ? this.shareText : this.copyText;

  static propTypes = {
    text: PropTypes.string,
    subtext: PropTypes.string,
    blobToSave: PropTypes.any
  };

  state = {
    buttonText: "",
    url: null
  };
  
  componentDidMount() {
    this.setState({buttonText: this.shareOrCopyText[0]});
  }
  saveAndCopyUrl = async () => {
    // this is game id
    // todo get this in props.
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');
    this.setState({buttonText: this.shareOrCopyText[1]});
    await saveAudioFile(this.props.blobToSave, id);
    // this is saving the 
    let url = window.location.origin + '/game?id=' + id;
    if(navigator.share) {
        navigator.share({url:url});
    } else {
        navigator.clipboard.writeText(url);
    }
    
    this.setState({buttonText: this.shareOrCopyText[2], url: url});
  };

  render() { 
    return (
      <div className={this.props.className + " step"}>
      	<h3>{this.props.text}</h3>
        {this.props.subtext && <span className="subtext">{this.props.subtext}</span>}
        <div onClick={this.saveAndCopyUrl} 
            style={{color:'blue', cursor: 'pointer'}}>
                {this.state.buttonText}
        </div>
        {this.state.url != null && this.state.url}
      </div>

    );
  }
}