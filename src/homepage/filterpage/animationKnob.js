import React from 'react'
import {Knob, Scale, Pointer} from 'rc-knob'
import Slider from '@material-ui/core/Slider'
import DeleteIcon from '@material-ui/icons/Delete'
import IconButton from '@material-ui/core/IconButton';

import './animationKnob.css'
import './generatedfilter.css'

/**
 * Displays editable states and a clock that loops over the states.
 */
class AnimationKnob extends React.Component {
    constructor(props) {
        super(props)
        this.dict = {};
        if (this.props.animationDict === undefined) {
            this.dict = this.makeNewAnimationDict() 
        }
        else if (JSON.parse(this.props.animationDict)[this.props.paramToAnimate] === undefined) {
            this.dict = this.makeNewAnimationDict(JSON.parse(this.props.animationDict)) 
        }
        else {
            this.dict = JSON.parse(JSON.parse(this.props.animationDict)[this.props.paramToAnimate])
        }
        this.state = {
            duration: Number(this.dict.dur),
            currKnobValue: 0,
            numStates: Number(this.dict.values.split(";").length)
        }
        this.currRotation = -90
    }

    componentDidMount() {
        this.intervalID = setInterval(() => {
            this.setState({
              currKnobValue : this.state.currKnobValue === this.state.duration*10 - 1 ? 0 : this.state.currKnobValue + 1
            })
        }, 100)
        this.props.updateAnimationState(0)
    }

    componentWillUnmount() {
        clearInterval(this.intervalID)
        this.props.updateAnimationState(-1)
    }

    updateAnimation(dict, callback = () => {}) {
        let type = "notchild"
        if (type === "animation-child") { // is the animation-child code dead code?
            this.props.updateFilterAnimation(this.props.filterIndex, this.props.filterComponentIndex, dict, 1).then(() => {
                this.props.refreshPreview()
                callback()
            })
        }
        else {
            this.props.updateFilterAnimation(this.props.filterIndex, this.props.filterComponentIndex, dict).then(() => {
                this.props.refreshPreview()
                callback()
            })
        }
    }

    makeNewAnimationDict(dict={}) {
        let newValues
        if (this.props.paramToAnimate === "values") {
            newValues = `${this.props.originalParamVal};1 1 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 1 0`
        }
        else if (this.props.paramToAnimate === "baseFrequency") {
            newValues = `${this.props.originalParamVal};0.1 0.1`
        }
        else if (this.props.paramToAnimate === "kernelMatrix") {
            newValues = `${this.props.originalParamVal};1 8.8 1 1 -7 0.8 1 -8 0.9`
        }
        else {
            newValues = `${this.props.originalParamVal};1`
        }
        let newAnimation = {"attributeName": this.props.paramToAnimate, "dur": 1, "values": newValues}
        dict[this.props.paramToAnimate] = JSON.stringify(newAnimation)
        this.updateAnimation(dict, () => {
            this.props.delayedUpdateFilter(this.props.selectedFilter, this.props.paramToAnimate)
        });

        return JSON.parse(dict[this.props.paramToAnimate])
    }

    removeAnimation() {
        let dict = JSON.parse(this.props.animationDict)
        delete dict[this.props.paramToAnimate]
        this.updateAnimation(dict, () => {})
        this.props.setAnimationAnchor(this.props.paramToAnimate)
        this.props.changeAnimatingParam("")

        // it's an animated pattern, we have to remove the animation tags manually
        // since refreshing the selectedFilter params and, thus, animation dict JSON won't overwrite the animations
        // because the animations are tailored to each parameter manually via JS
        // so we must manually do it here
        if(this.props.selectedFilter.filterName === 'feImage'){
            let filterID = this.props.selectedFilter.href.slice(1);

            let patternHandler = this.props.patternHandlers.get(filterID);
            patternHandler.removeAnimation(this.props.paramToAnimate);
        }
    }

    addAnimationState() {
        let newValue
        if (this.props.paramToAnimate === "values") {
            newValue = `1 1 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 1 0`
        }
        else if (this.props.paramToAnimate === "baseFrequency") {
            newValue = `0.1 0.1`
        }
        else if (this.props.paramToAnimate === "kernelMatrix") {
            newValue = `1 8.8 1 1 -7 0.8 1 -8 0.9`
        }
        else {
            newValue = `1`
        }
        let dict = JSON.parse(this.props.animationDict)
        let paramToAnimateDict = JSON.parse(dict[this.props.paramToAnimate])
        let valuesList = paramToAnimateDict.values.split(";")
        valuesList.splice(this.props.selectedAnimationState, 0, newValue)
        paramToAnimateDict.values = valuesList.join(";")
        dict[this.props.paramToAnimate] = JSON.stringify(paramToAnimateDict)

        this.updateAnimation(dict, () => {
            this.setState({numStates: this.state.numStates + 1})
            this.props.delayedUpdateFilter(this.props.selectedFilter, this.props.paramToAnimate);
        });
    }

    removeAnimationState() {
        if (this.state.numStates === 1) {
            this.removeAnimation()
        }
        else {
            let dict = JSON.parse(this.props.animationDict)
            let paramToAnimateDict = JSON.parse(dict[this.props.paramToAnimate])
            let valuesList = paramToAnimateDict.values.split(";")
            valuesList.splice(this.props.selectedAnimationState, 1)
            paramToAnimateDict.values = valuesList.join(";")
            dict[this.props.paramToAnimate] = JSON.stringify(paramToAnimateDict)
            this.updateAnimation(dict, () => {
                this.props.delayedUpdateFilter(this.props.selectedFilter, this.props.paramToAnimate);
            });
            if (this.props.selectedAnimationState === this.state.numStates - 1) {
                this.props.updateAnimationState(this.props.selectedAnimationState - 1)
            }
            this.setState({numStates: this.state.numStates - 1}) 
        }
    }

    changeTotalDuration(newValue) {
        this.setState({duration: newValue})
        this.setState({currKnobValue: 0})
        let dict = JSON.parse(this.props.animationDict)
        let dictAnimationToUpdate = JSON.parse(dict[this.props.paramToAnimate])
        dictAnimationToUpdate.dur = newValue.toString()
        dict[this.props.paramToAnimate] = JSON.stringify(dictAnimationToUpdate)
        let type = "notchild"
        if (type === "animation-child") {
            this.props.updateFilterAnimation(this.props.filterIndex, this.props.filterComponentIndex, dict, 1).then(() => {
                this.props.refreshPreview()
            })
        }
        else {
            this.props.updateFilterAnimation(this.props.filterIndex, this.props.filterComponentIndex, dict).then(() => {
                this.props.refreshPreview()
            })
        }
    }

    getDashOffset() {
        let perimeter = 2 * Math.PI * 30
        return perimeter - perimeter * (1.0 / this.state.numStates)
    }

    getNextRotation(currState) {
        let nextRotation = -90 + ((currState*1.0/this.state.numStates) * 360 )
        return `rotate(${nextRotation} 50 50)`
    }

    getDonutChartStrokeColor(index) {
        return `rgba(128, 128, 128, ${Math.max(1.0/(index+1))})`
    }

    render() {
        return(
            <div id="knob-wrapper">
                <div className='smaller-text'><b>{this.props.paramToAnimate}</b></div>
                <div id="knob">
                    <Knob 
                        size={100} 
                        steps={this.state.duration*10}
                        min={0}
                        max={this.state.duration*10 - 1}>
                    <Scale 
                        value={2}
                        tickWidth={2}
                        tickHeight={2}
                        radius={45}
                        type="circle"
                        className="normalScale"
                    />
                    <svg width="100%" height="100%">  
                        {[...Array(this.state.numStates).keys()].map(index => {
                            return <circle onClick={() => this.props.updateAnimationState(index)} key={"knob-state-"+index} strokeDasharray="188.496" strokeDashoffset={this.getDashOffset()}  transform={this.getNextRotation(index)} pointerEvents="visibleStroke" className={index === this.props.selectedAnimationState ? "animationSelected" : "state-slice"} cx="50" cy="50" r="30" stroke={this.getDonutChartStrokeColor(index)} strokeWidth="15" fill="transparent"/>
                        })}
                    </svg>
                    <Pointer 
                        percentage={(this.state.currKnobValue) / (this.state.duration*10)}
                        width={5}
                        height={40}
                        radius={10}
                        type="rect"
                        color="#FC5A96"
                    />
                    </Knob>
                </div>
                <div></div>
                <span className="medium-text">Animation Duration: {this.state.duration}s</span>
                <Slider
                    value={Number(this.state.duration)}
                    color="primary"
                    step={0.1}
                    min={0.5}
                    max={10}
                    onChange={(event, newValue) => this.changeTotalDuration(newValue)}
                />
                <div id="knob-control-btns">
                    <div onClick={(event) => this.addAnimationState()} className="button-outlined">add <br></br>state</div>
                    <div onClick={(event) => this.removeAnimationState()} className="button-outlined">remove <br></br> state</div>
                    <IconButton onClick={(event) => this.removeAnimation()} size="small">
                        <DeleteIcon/>
                    </IconButton>
                </div>
            </div>
        )
    }
}

export default AnimationKnob