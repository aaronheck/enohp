
import React from "react";
import PropTypes from "prop-types";
import "./Record.css";
import {saveAudioFile} from "../logic/recording-storage";


export default class ShareStep extends React.Component {
  // Step Completion should be a callback.
  static propTypes = {
    text: PropTypes.string,
    subtext: PropTypes.string,
    blobToSave: PropTypes.any
  };

  state = {
    buttonText: "Copy Link to Send",
    url: null
  };
  
  saveAndCopyUrl = async () => {
    this.setState({buttonText: "Copying..."});
    let id = await saveAudioFile(this.props.blobToSave);
    let url = window.location.origin + '?id=' + id;
    navigator.clipboard.writeText(url);
    this.setState({buttonText: "Copied!", url: url});
    navigator.share({url:url})
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