import Player from "./Player";
import React from "react";
import PropTypes from "prop-types";
import "./Record.css";
import { getAudioFileWithSignedUrl } from "../logic/recording-storage";

export default class RecapTurnStep extends React.Component {
    static propTypes = {
        playBackwards: PropTypes.bool,
        turn: PropTypes.object
    };

    state = {
        blob: null
    };

    componentDidMount() {
        console.log(this.props.turn);
        this.getAudioFileInternal();
    }

    getAudioFileInternal = async () => {
        let file = await getAudioFileWithSignedUrl(this.props.turn.signedGet);
        let blob = await file.blob();
        this.setState({ blob: blob });
    };

    render() {
        return (
            <div className={this.props.className + " step"}>
                <h3>{this.props.turn.nickname}</h3>
                {this.props.subtext && <span className="subtext">{this.props.subtext}</span>}
                {!this.state.recordingStarted && <span style={{ 'padding-bottom': '15px' }}></span>}
                {this.state.blob && <Player blob={this.state.blob} playBackwards={true} hideRecordAgain={true} />}
            </div>

        );
    }
}