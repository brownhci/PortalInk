import React, { Component } from 'react'
import { GradientColorPicker } from './gradientcolorpicker';
import { Slider, Tooltip, Typography } from '@material-ui/core';
import IconButton from '@material-ui/core/IconButton';
import DeleteIcon from '@material-ui/icons/Delete'
import AddIcon from '@material-ui/icons/Add'
import ToggleButtonGroup from '@material-ui/lab/ToggleButtonGroup';
import ToggleButton from '@material-ui/lab/ToggleButton';
import ArrowLeftIcon from '@material-ui/icons/ArrowLeft';
import ArrowRightIcon from '@material-ui/icons/ArrowRight';

import { forwardRef } from 'react';
import { makeid } from '../util';

const TooltipToggleButton = forwardRef(
    ({ TooltipProps, ...props }, ref) => {
      return (
        <Tooltip {...TooltipProps}>
          <ToggleButton ref={ref} {...props} />
        </Tooltip>
      )
    }
)

const SVG = 'http://www.w3.org/2000/svg';

export class GradientDialog extends Component {
    constructor(props) {
        super(props)
        this.state = {
            mode: this.props.selectedPath?.params.stops?.length > 0 ? this.props.selectedPath.params.stops[0].type : 0,
            currentColor: '#00aaffff',
            stops: this.props.selectedPath ? this.props.selectedPath.params.stops : [],
            selectedStopIndex: -1,
        }

        this.selectedPath = this.props.selectedPath;
        this.pathBBox = this.selectedPath.svgPath.node.getBoundingClientRect();

        this.props.closeRef.ref = () => {
            this.props.selectedPath.highlight();
            const previewContainer = document.getElementById('gradient-order-container-inner');
            if(previewContainer) previewContainer.innerHTML = '';
        }
        this.props.deleteRef.ref = () => {
            for(let i = this.state.stops.length - 1; i >= 0; i--){
                this.deleteStopAtIndex(i);
            }
        }

        this._mounted = false;
        this.freshMounted = false;
        this.renderTimes = 0;
    }

    componentDidMount() {
        // console.log("MOUNTED!!!!!"); this._mounted = true;
        this.freshMounted = true;
        this.renderTimes = 0;
        this.setBindings()
        this.switchStop(this.state.stops.length - 1)
    }

    componentWillUnmount (){
        // console.log("UNMOUNT!!!!!"); this._mounted = false;
        this.freshMounted = false;
        this.props.serializeToString();
    }

    setBindings() {
        this.changeColor = this.changeColor.bind(this)
    }

    changeColor(c) {
        const alpha = c.rgb.a;
        const alphaHex = (alpha * 255 | 0).toString(16);
        const newColor = c.hex + alphaHex;

        const curStops = this.state.stops
        curStops[this.state.selectedStopIndex].color = newColor;

        this.setState({
            stops: curStops,
            currentColor: newColor
        }, () => {
            const currentStop = this.state.stops[this.state.selectedStopIndex];
            currentStop.colorNode.setAttribute('stop-color', this.state.currentColor);
            currentStop.domHandle.style.backgroundColor = this.state.currentColor;
            currentStop.orderIcon.style.backgroundColor = this.state.currentColor;
        });
    }

    changeMode(type){
        const curStops = this.state.stops;
        const curIndex = this.state.selectedStopIndex;

        if(type === 0){
            const oldX = curStops[curIndex].x;
            const oldY = curStops[curIndex].y;
            const newStop = this.createSVGNodes(curStops[curIndex].color, curStops[curIndex].strength.value, curStops[curIndex].id, type);
            newStop.svgNode.setAttribute('r', curStops[curIndex].strength.value);

            const newStopObj = {
                type: type,
                x: oldX,
                y: oldY,
                direction: curStops[curIndex].direction,
    
                color: this.state.currentColor,
                svgNode: newStop.svgNode,
                colorNode: newStop.colorNode,
                id: curStops[curIndex].id,
                strength: curStops[curIndex].strength,
    
                domHandle: curStops[curIndex].domHandle,
                orderIcon: curStops[curIndex].orderIcon
            }
            curStops[curIndex] = newStopObj;
            
            this.setState({
                mode: type,
                stops: curStops
            }, () => {
                this.positionStop(curIndex, oldX, oldY, true, 0);
            })
        }

        else {
            const oldX = curStops[curIndex].x;
            const oldY = curStops[curIndex].y;
            const newStop = this.createSVGNodes(curStops[curIndex].color, curStops[curIndex].strength.value, curStops[curIndex].id, type);

            const newStopObj = {
                type: type,
                x: oldX,
                y: oldY,
                direction: curStops[curIndex].direction,
    
                color: this.state.currentColor,
                svgNode: newStop.svgNode,
                colorNode: newStop.colorNode,
                id: curStops[curIndex].id,
                strength: curStops[curIndex].strength,
    
                domHandle: curStops[curIndex].domHandle,
                orderIcon: curStops[curIndex].orderIcon
            };
            curStops[curIndex] = newStopObj;
            
            this.setState({
                mode: type,
                stops: curStops
            }, () => {
                this.positionStop(curIndex, oldX, oldY, true, type, curStops[curIndex].direction);
            })
        }
    }

    switchStop(index){
        if(index < 0) return;

        const selectedStop = this.state.stops[index];

        this.setState({
            selectedStopIndex: index,
            currentColor: selectedStop.color,
            mode: selectedStop.type
        }, () => {
            this.state.stops.map(stop => stop.domHandle.style.border = '2px solid #ffffffee')
            selectedStop.domHandle.style.border = '4px solid #ffffffff'

            this.state.stops.map(stop => stop.orderIcon.style.border = '2px solid #d4d4d4')
            selectedStop.orderIcon.style.border = '2px solid #f50057ff'
        });
    }

    createOrderIcon(color){
        const orderIcon = document.createElement('div');
        const is = orderIcon.style;
        is.width = '35px';
        is.height = '30px';
        is.borderRadius = '2px'
        is.border = '2px solid #d4d4d4'
        is.margin = '2px';
        is.backgroundColor = color;
        orderIcon.draggable = true;

        return orderIcon;
    }

    reorder(direction){
        const curStops = this.state.stops;
        const curIndex = this.state.selectedStopIndex;

        const indexToSwap = curIndex + direction;
        if(indexToSwap < 0 || indexToSwap > curStops.length - 1) return;

        const temp = curStops[curIndex];
        curStops[curIndex] = curStops[indexToSwap];
        curStops[indexToSwap] = temp;

        this.setState({
            stops: curStops,
            selectedStopIndex: indexToSwap
        });
    }

    createHandle(color){
        const stopHandleObject = document.createElement('div');
        const cs = stopHandleObject.style;
        cs.position = 'fixed';
        cs.left = `${this.pathBBox.x + this.pathBBox.width / 2}px`;
        cs.top = `${this.pathBBox.y + this.pathBBox.height / 2}px`;
        cs.width = '10px';
        cs.height = '10px';
        cs.border = '3px solid #ffffffee'
        cs.borderRadius = '10px'
        cs.backgroundColor = color;

        return stopHandleObject;
    }

    // returns svgNode and colorNode
    createSVGNodes(color, strength, id, type = 0){ // 0 = radial, 1 = linear
        const stopID = id;
        const stopStrength = strength;
        const defaultStopSVG = document.createElementNS(SVG, type === 0 ? 'radialGradient' : 'linearGradient');
        defaultStopSVG.setAttribute('id', stopID);

        if(type === 0){
            defaultStopSVG.setAttribute('r', stopStrength)
        } 

        const stopA = document.createElementNS(SVG, 'stop');
        stopA.setAttribute('stop-color', color);
        stopA.setAttribute('offset', '0%')
        defaultStopSVG.append(stopA);
        const stopB = document.createElementNS(SVG, 'stop');
        stopB.setAttribute('stop-color', '#00000000');
        stopB.setAttribute('offset', '100%')
        defaultStopSVG.append(stopB);

        const defs = document.querySelector('defs');
        const oldStopSVG = document.getElementById(stopID);
        if(oldStopSVG) oldStopSVG.remove();
        defs.appendChild(defaultStopSVG); // need remove later?

        return {
            svgNode: defaultStopSVG,
            colorNode: stopA
        };
    }

    positionStop(stopIndex, ratioX, ratioY, updateState = true, type = 0, direction = 45){
        const curStops = this.state.stops;
        curStops[stopIndex].x = ratioX;
        curStops[stopIndex].y = ratioY;

        curStops[stopIndex].domHandle.style.left = `${this.pathBBox.left + this.pathBBox.width * ratioX - 10}px`;
        curStops[stopIndex].domHandle.style.top = `${this.pathBBox.top + this.pathBBox.height * ratioY - 10}px`;

        if(type === 0){
            curStops[stopIndex].svgNode.setAttribute('fx', `${ratioX}`);
            curStops[stopIndex].svgNode.setAttribute('fy', `${ratioY}`);
            curStops[stopIndex].svgNode.setAttribute('cx', `${ratioX}`);
            curStops[stopIndex].svgNode.setAttribute('cy', `${ratioY}`);
        } 
        
        else {
            curStops[stopIndex].svgNode.setAttribute('x1', `${ratioX}`);
            curStops[stopIndex].svgNode.setAttribute('y1', `${ratioY}`);
            
            const length = curStops[stopIndex].strength.value / 2.5;
            const x2 = Math.cos(direction * Math.PI / 180) * length + ratioX;
            const y2 = Math.sin(direction * Math.PI / 180) * length + ratioY;
            curStops[stopIndex].svgNode.setAttribute('x2', `${x2}`);
            curStops[stopIndex].svgNode.setAttribute('y2', `${y2}`);
            
        }

        if(type === 0){
            curStops[stopIndex].svgNode.setAttribute('gradientTransform', 
                `translate(${ratioX}, ${ratioY}) scale(${1}, ${this.pathBBox.width / this.pathBBox.height}) translate(${-ratioX}, ${-ratioY})`
            );
        }

        if(updateState) this.setState({
            stops: curStops
        });
    }

    addHandleEventListeners(handleObj, orderIconObj, currentIndex, stopID){
        // remember to delete these event listeners if we delete gradient or close gradient menu
        
        let mouseDown = false;
        handleObj.addEventListener('mousedown', e => { // change to this selected stop
            mouseDown = true;
            const remappedIndex = this.state.stops.map((stop, i) => stop.id === stopID ? i : -1).filter(n => n !== -1)[0]
            this.switchStop(remappedIndex)
        });
        handleObj.addEventListener('mouseup', e => mouseDown = false);
        document.addEventListener('mousemove', e => {
            if(!mouseDown) return;

            const newX = e.clientX;
            const newY = e.clientY;

            const remappedIndex = this.state.stops.map((stop, i) => stop.id === stopID ? i : -1).filter(n => n !== -1)[0]
            const curStop = this.state.stops[remappedIndex];

            const ratioX = (newX - this.pathBBox.left) / this.pathBBox.width;
            const ratioY = (newY - this.pathBBox.top) / this.pathBBox.height;

            this.positionStop(this.state.selectedStopIndex,  ratioX, ratioY, true, curStop.type, curStop.direction)
        });

        orderIconObj.addEventListener('mousedown', e => {
            
            const remappedIndex = this.state.stops.map((stop, i) => stop.id === stopID ? i : -1).filter(n => n !== -1)[0]
            this.switchStop(remappedIndex)
        });
    }

    addStop(type = 0, direction = 45){
        const stopHandleObject = this.createHandle(this.state.currentColor);

        // create stop svgNode and colorNode
        const stopID = makeid(8), stopStrength = 2;
        const nodes = this.createSVGNodes(this.state.currentColor, stopStrength, stopID, type);
        const defaultStopSVG = nodes.svgNode;
        const stopA = nodes.colorNode;

        const orderIcon = this.createOrderIcon(this.state.currentColor);

        const svgElement = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        const length = svgElement.createSVGLength();
        length.value = stopStrength;

        const currentIndex = this.state.stops.length;
        const stopObj = {
            type: type,
            x: 0.5,
            y: 0.5,
            direction: direction,

            color: this.state.currentColor,
            svgNode: defaultStopSVG,
            colorNode: stopA,
            id: stopID,
            strength: length/*stopStrength*/,

            domHandle: stopHandleObject,
            orderIcon: orderIcon
        };
        
        this.addHandleEventListeners(stopHandleObject, orderIcon, currentIndex, stopID);

        const curStops = this.state.stops;
        curStops.push(stopObj);
        this.setState({
            stops: curStops,
            selectedStopIndex: curStops.length - 1
        }, () => {
            this.positionStop(curStops.length - 1, stopObj.x, stopObj.y, true, type, direction);
            this.switchStop(curStops.length - 1);
        })
    }

    deleteStop(){
        const si = this.state.selectedStopIndex;
        
        // delete children and itself
        const removedStop = this.state.stops.splice(si, 1)[0];
        removedStop.svgNode.remove();
        removedStop.domHandle.remove();
        removedStop.orderIcon.remove();

        
        // select previous stop if it exists
        let newStop = si - 1;
        if(newStop < 0) newStop = 0;
        if(this.state.stops.length > 0) this.switchStop(newStop);

        // otherwise reset state
        else {
            this.setState({
                selectedStopIndex: -1
            });
        }
    }

    deleteStopAtIndex(si){
        // delete children and itself
        const removedStop = this.state.stops.splice(si, 1)[0];
        removedStop.svgNode.remove();
        removedStop.domHandle.remove();
        removedStop.orderIcon.remove();

        
        // select previous stop if it exists
        let newStop = si - 1;
        if(newStop < 0) newStop = 0;
        if(this.state.stops.length > 0) this.switchStop(newStop);

        // otherwise reset state
        else {
            this.setState({
                selectedStopIndex: -1
            });
        }
    }

    updateSliderValue(value){
        const curStops = this.state.stops;
        const curIndex = this.state.selectedStopIndex;
        if(curStops[curIndex].strength.value){
            curStops[curIndex].strength.value = value;
        } else {
            const svgElement = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            const length = svgElement.createSVGLength();
            length.value = value;
            curStops[curIndex].strength = length;
        }
        curStops[curIndex].svgNode.setAttribute('r', value);

        this.setState({
            stops: curStops
        }, () => {
            if(curStops[curIndex].type === 1){
                this.positionStop(
                    curIndex,
                    curStops[curIndex].x,
                    curStops[curIndex].y,
                    true,
                    1,
                    curStops[curIndex].direction
                );
            }
        })
    }

    updateDirection(value){
        const curStops = this.state.stops;
        const curIndex = this.state.selectedStopIndex;
        curStops[curIndex].direction = value;

        this.setState({
            stops: curStops
        }, () => {
            this.positionStop(
                curIndex,
                curStops[curIndex].x,
                curStops[curIndex].y,
                true,
                1,
                value
            );
        })
    }

    render() {
        // create svg elements for stops if they don't exist
        const curStops = this.state.stops;
        this.renderTimes += 1;

        for(let i = 0; i < curStops.length; i++){
            const curStop = curStops[i];

            if(this.freshMounted){
                const orderIcon = this.createOrderIcon(curStop.color);
                curStop.orderIcon = orderIcon;
            
                curStop.domHandle = this.createHandle(curStop.color);
                this.addHandleEventListeners(curStop.domHandle, curStop.orderIcon, i, curStop.id);
                this.positionStop(i, curStop.x, curStop.y, false)
            }

            if(!(curStop.svgNode instanceof Element)){
                const nodes = this.createSVGNodes(curStop.color, curStop.strength, curStop.id);
                curStop.svgNode = nodes.svgNode;
                curStop.colorNode = nodes.colorNode;
            }
        }

        this.freshMounted = false;

        const hasStop = this.state.selectedStopIndex !== -1;
        const isLinear = this.state.stops[this.state.selectedStopIndex]?.type === 1;

        // position container for highlighting outline
        const svgRef = document.getElementById('main-canvas');
        const svgRefBB = svgRef.getBoundingClientRect();
        const outlineContainer = document.getElementById('outline-guide');
        const curStyle = outlineContainer?.style;
        if(curStyle){
            curStyle.left = `${svgRefBB.left}px`;
            curStyle.top = `${svgRefBB.top}px`;
        }

        // insert highlighting outline
        const outlineSVGContainer = outlineContainer;
        const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        if(outlineSVGContainer){
            const sketchGroupRef = document.getElementById('sketchGroup');
            group.setAttribute('transform', sketchGroupRef.getAttribute('transform'));
            outlineSVGContainer.innerHTML = '';
            outlineSVGContainer.appendChild(group);
            outlineSVGContainer.setAttribute('width', svgRef.getAttribute('width'));
            outlineSVGContainer.setAttribute('height', svgRef.getAttribute('height'));
            outlineSVGContainer.setAttribute('viewBox', svgRef.getAttribute('viewBox'));

            const pathNode = this.selectedPath.svgPath.clone();
            const viewBox = svgRef.getAttribute('viewBox').split(' ').map(parseFloat);
            const ratio = Math.abs(viewBox[2]) / parseFloat(svgRef.getAttribute('width'));
            
            group.appendChild(pathNode.node);
            pathNode.attr('fill', 'none');
            pathNode.attr('stroke', 'white')
            pathNode.attr('stroke-width', 5 * ratio)
            pathNode.attr('stroke-linejoin', 'round')
            pathNode.attr('stroke-linecap', 'round')
            pathNode.attr('opacity', '1')
            pathNode.attr('z-index', '150')

            // for polyline highlighting, need to add copy of first point to the end
            // such that the white stroke will go all the way around and cover the last segment
            if(pathNode.node.tagName === 'polyline'){ 
                const oldPoints = pathNode.attr('points').split(' ');
                const newPoints = oldPoints.concat([oldPoints[0]]);
                pathNode.attr('points', newPoints.join(' '))
            }

            const background = this.selectedPath.svgPath.clone(); 
            group.appendChild(background.node)
            background.attr('fill', this.props.selectedPath.params.color);
            background.attr('stroke', 'none')
            background.attr('z-index', '100')
            background.attr('opacity', '1')
        }

        // insert handles
        const stopHandleContainer = document.getElementById('gradient-handles');
        if(stopHandleContainer){
            for(let i = 0; i < this.state.stops.length; i++){
                const currentStop = this.state.stops[i];
                if(currentStop.domHandle instanceof Element) stopHandleContainer.appendChild(currentStop.domHandle)
            }
        }

        // insert gradient preview
        if(outlineSVGContainer){
            for(let i = 0; i < this.state.stops.length; i++){
                const currentStop = this.state.stops[i];

                const pathNode = this.selectedPath.svgPath.clone();
                group.appendChild(pathNode.node);

                pathNode.attr('fill', `url(#${currentStop.id})`);
                pathNode.attr('stroke', 'none')
                pathNode.attr('z-index', '100')
                pathNode.attr('opacity', '1')
            }
        }

        const gradientOrderContainer = document.getElementById('gradient-order-container-inner')
        if(gradientOrderContainer){
            for(let i = 0; i < this.state.stops.length; i++){
                const currentStop = this.state.stops[i];
                if(currentStop.orderIcon instanceof Element) gradientOrderContainer.appendChild(currentStop.orderIcon)
            }
        }

        this.selectedPath.setGradientStops(this.state.stops, this.props.primarySketch);

        return (
            <div>
                <div className='flex-row'>
                    <Typography>Add new color</Typography>
                    <Tooltip title="Add Gradient" onClick={() => this.addStop(this.state.mode)}>
                        <IconButton>
                            <AddIcon />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete Gradient" onClick={() => this.deleteStop()}>
                        <IconButton>
                            <DeleteIcon />
                        </IconButton>
                    </Tooltip>
                </div>

                <div style={{opacity: hasStop ? 1 : 0.5, pointerEvents: hasStop ? 'auto' : 'none'}}>
                    <div className='flex-row pad-bottom-small'>
                        <Typography>Strength:</Typography>
                    
                        <Slider
                            onChange={(_, values) => {
                                this.updateSliderValue(values)
                            }}
                            step={0.05}
                            min={0}
                            max={5}
                            value={hasStop ? this.state.stops[this.state.selectedStopIndex].strength.value : []}
                            className="gradient-strength-slider">
                        </Slider>
                    </div>

                    <div className='flex-row pad-bottom-small' style={{opacity: isLinear ? 1 : 0.5, pointerEvents: isLinear ? 'auto' : 'none'}}>
                        <Typography>Rotation:</Typography>
                    
                        <Slider
                            onChange={(_, values) => this.updateDirection(values)}
                            step={0.05}
                            min={0}
                            max={360}
                            value={isLinear ? this.state.stops[this.state.selectedStopIndex].direction : []}
                            className="gradient-strength-slider">
                        </Slider>
                    </div>

                    <div className='flex-row'>
                        <ToggleButtonGroup id='toggle-group' value={this.state.mode} className="float-btn" onChange={(_, value) => this.changeMode(value)} exclusive>
                            <TooltipToggleButton value={0} aria-label="ink mode"TooltipProps={{title: "Set Radial Gradient"}} className='gradient-type-button'>
                                <Typography>Radial</Typography>
                            </TooltipToggleButton>
                            <TooltipToggleButton value={1} aria-label="ink mode" TooltipProps={{title: "Set Linear Gradient"}} className='gradient-type-button'>
                                <Typography>Linear</Typography>
                            </TooltipToggleButton>
                        </ToggleButtonGroup>
                        <div>
                            <GradientColorPicker className='gradient-color-picker'
                                color={this.state.currentColor}
                                changeColor={(c) => this.changeColor(c)}/>
                        </div>
                    </div>

                    <div className='flex-row'>
                        <Tooltip className='gradient-order-tooltip' title='Gradient ordering from back to front'>
                            <Typography>Gradient Stop Ordering</Typography>
                        </Tooltip>
                        <Tooltip title="Move gradient stop back" onClick={() => this.reorder(-1)}>
                            <IconButton className='gradient-order-shifting-btn'>
                                <ArrowLeftIcon />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Move gradient stop forward" onClick={() => this.reorder(1)}>
                            <IconButton className='gradient-order-shifting-btn'>
                                <ArrowRightIcon />
                            </IconButton>
                        </Tooltip>
                    </div>
                    
                </div>

                <div id='gradient-order-container'>
                    <div id='gradient-order-container-inner'></div>
                </div>
                

                <svg style={{zIndex: -1}} className='gradient-path-outline-guide' id='outline-guide'>

                </svg>

                <div id='gradient-handles'>

                </div>
            </div>
        )
    }
}