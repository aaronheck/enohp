
import React from "react";
import PropTypes from "prop-types";
import "./Record.css";
import { saveAudioFile } from "../logic/recording-storage";
import { getNickname } from "../logic/user-storage";


export default class ShareStep extends React.Component {
  copyText = ["Copy", "Copying...", "Copied"];
  shareText = ["Share", "Opening...", "Share"];

  shareOrCopyText = navigator.share ? this.shareText : this.copyText;

  static propTypes = {
    text: PropTypes.string,
    subtext: PropTypes.string,
    blobToSave: PropTypes.any,
    consistencyToken: PropTypes.string,
    guess: PropTypes.string,
    gameId: PropTypes.string
  };

  state = {
    buttonText: "",
    url: null
  };

  componentDidMount() {
    this.setState({ buttonText: this.shareOrCopyText[0] });
  }
  saveAndCopyUrl = async () => {
    let nickname = await getNickname();
    const gameId = this.props.gameId;

    this.setState({ buttonText: this.shareOrCopyText[1] });
    await saveAudioFile(this.props.blobToSave, gameId, this.props.consistencyToken, nickname, this.props.guess);
    let url = window.location.origin + '/game?' + new URLSearchParams({
      id: gameId,
    });
    // TODO: Allison says this does not work anymore.
    if (navigator.share) {
      navigator.share({ url: url });
    } else {
      navigator.clipboard.writeText(url);
    }

    this.setState({ buttonText: this.shareOrCopyText[2], url: url });
  };

  render() {
    return (
      <div className={this.props.className + " step"}>
        <h3>{this.props.text}</h3>
        {this.props.subtext && <span className="subtext">{this.props.subtext}</span>}
        <div onClick={this.saveAndCopyUrl}
          style={{ color: 'blue', cursor: 'pointer' }}>
          {this.state.buttonText}
        </div>
      </div>

    );
  }
}