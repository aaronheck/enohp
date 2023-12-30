
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
    this.setState({buttonText: this.shareOrCopyText[1]});
    let id = await saveAudioFile(this.props.blobToSave);
    let url = window.location.origin + '?id=' + id;
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