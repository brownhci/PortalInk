import React, { Component } from 'react'
import Slider from '@material-ui/core/Slider';
import ArrowDropDownCircleIcon from '@material-ui/icons/ArrowDropDownCircle';
import IconButton from '@material-ui/core/IconButton';
import Tooltip from '@material-ui/core/Tooltip';
import './movingavgslider.css'

export class MovingAvgSlider extends Component {
    constructor(props) {
        super(props)
        this.state = {
            sliderVal: 1,
            toolTipCaption: ""
        }
    }

    handleSliderChange = (event, newValue) => {
        this.setState({sliderVal: newValue})
        this.setState({toolTipCaption: "Takes moving average of coordinates at a range of " + newValue.toString()})
    }

    render() {
        return (
            <div id={this.props.sliderVisible ? 'slider' : 'slider-hidden'}>
                    <Slider
                    color="secondary"
                    value={this.state.sliderVal}
                    aria-labelledby="discrete-slider-small-steps"
                    onChange={this.handleSliderChange}
                    step={1}
                    min={1}
                    max={50}
                    valueLabelDisplay="auto"
                    />
                    <IconButton color="secondary" 
                        onClick={() => this.props.updateSliderVal(this.state.sliderVal)} 
                        aria-label="get running avg">
                            <Tooltip title={this.state.toolTipCaption}>
                                <ArrowDropDownCircleIcon id="icon"/>
                            </Tooltip>
                    </IconButton>
                </div>
        )
    }
}