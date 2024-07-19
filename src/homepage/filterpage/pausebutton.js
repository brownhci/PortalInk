import Tooltip from '@material-ui/core/Tooltip'
import React, { Component } from 'react'
import PlayArrowIcon from '@material-ui/icons/PlayArrow'
import PauseIcon from '@material-ui/icons/Pause'
import ToggleButton from '@material-ui/lab/ToggleButton';
import ToggleButtonGroup from '@material-ui/lab/ToggleButtonGroup';

import './pausebutton.css'

import { forwardRef } from 'react';

const TooltipToggleButton = forwardRef(
    ({ TooltipProps, ...props }, ref) => {
      return (
        <Tooltip {...TooltipProps}>
          <ToggleButton ref={ref} {...props} />
        </Tooltip>
      )
    }
)

export class PauseButton extends Component {
    constructor(props) {
        super(props)
        this.state = {
            mode: "play"
        }
    }

    componentDidMount() {
        this.setBindings()
    }

    setBindings() {
        this.changeMode = this.changeMode.bind(this)
    }

    changeMode(clicked){
        if(this.state.mode === "play" && clicked === 'pause'){
            this.setState({mode: "pause"});
            this.props.sendLog("pause_animation")
            document.getElementById('main-canvas').pauseAnimations();
        } else if(this.state.mode === 'pause' && clicked === "play"){
            this.setState({mode: "play"});
            this.props.sendLog("play_animation")
            document.getElementById('main-canvas').unpauseAnimations();
        }
    }

    render() {
        return (
            /*<div id='toggleplay-group-container'>*/
            <ToggleButtonGroup id='toggleplay-group' className="float-btn" value={this.state.mode} exclusive>
                <TooltipToggleButton id='play-btn' onClick={() => this.changeMode('play')} value="play" size="small" aria-label="play animations" TooltipProps={{title: "Play Animations"}}>
                    <PlayArrowIcon/>
                </TooltipToggleButton>
                <TooltipToggleButton id='play-btn' onClick={() => this.changeMode('pause')} value="pause" size="small" aria-label="pause animations" TooltipProps={{title: "Pause Animations"}}>
                    <PauseIcon/>
                </TooltipToggleButton>
            </ToggleButtonGroup>
            /*</div>*/
        )
    }
}