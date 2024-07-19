import React, { Component } from 'react'
import './layerspage.css'
import VisibilityIcon from '@material-ui/icons/Visibility';
import VisibilityOffIcon from '@material-ui/icons/VisibilityOff';
import AddBoxIcon from '@material-ui/icons/AddBox';
import DeleteForeverIcon from '@material-ui/icons/DeleteForever';
import Tooltip from '@material-ui/core/Tooltip';
import Popover from '@material-ui/core/Popover';
import Slider from '@material-ui/core/Slider';
import SvgIcon from "@material-ui/core/SvgIcon";
import Button from '@material-ui/core/Button';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import TextField from '@material-ui/core/TextField';
import Switch from '@material-ui/core/Switch';
import FlareIcon from '@material-ui/icons/Flare';


import { ReactComponent as MergeUpButton } from '../assets/merge-up.svg'
import { ReactComponent as MergeDownButton } from '../assets/merge-down.svg'
import LayerTransformation from './layertransformation';

const newTransformations = () => new LayerTransformation();

export class LayersPage extends Component {
    constructor(props) {
        super(props)
        this.state = {
            layers: [
                { name: "layer1", visible: true, filter: "empty", opacity: 1, audio: "", filterPopoverOpen: false, settingsPopoverOpen: false, src: "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs%3D", depth: 1, transformations: newTransformations() }
            ],
            selectedIndex: 0,
            currentTarget: null,
            moveFromLayerIndex: null,
            hoveredIndex: -1,
            currentLayerName: '',
            audioModalOpen: false,
            currentAudioModalLayerName: "",
            audioModalURL: "",
            audioURLValid: true
        }
    }

    layerClicked = (index, useName=false) => {
        let newLayers = this.state.layers
        if (useName) {
            index = newLayers.findIndex(function (l) {
                return l.name === useName
            })
            const element = document.getElementById('layer-id-' + index)
            const container = document.getElementById('layers-cards')
            container.scrollTop = element.offsetTop
        }
        this.setState({ selectedIndex: index })
        this.props.sketchpageRef.current.primarySketch.changeSVGGroup(newLayers[index].name)
    }

    renderChangeLayerFilterIcon(filter) {
        let hasFilter = filter && filter !== "empty"
        return hasFilter ? <svg className='clickable-layers-icon' focusable="false" viewBox="0 0 24 24" style={{ height: 15, width: 15 }}>
            <path d="M6 6h12v12H6z" filter={`url(#${filter}-!layer)`}></path>
        </svg> :
            <svg className='clickable-layers-icon' focusable="false" viewBox="0 0 24 24" style={{ height: 15, width: 15 }}>
                <path d="M6 6h12v12h-12v-12v12h12v0-12h-12l12 12" stroke="black"></path>
            </svg>
    }

    renderLayerVisibilityIcon(isVisible) {
        return isVisible ? <div className='clickable-layers-icon'><VisibilityIcon style={{ height: 15, width: 15 }} /></div> : <div className='clickable-layers-icon'><VisibilityOffIcon style={{ height: 15, width: 15 }} /></div>
    }

    changeLayerFilterIconClicked(event, layer, index) {
        event.stopPropagation()
        this.setState({ currentTarget: event.currentTarget.parentNode.parentNode.parentNode.parentNode })
        layer.filterPopoverOpen = !layer.filterPopoverOpen
        let newLayers = this.state.layers
        newLayers[index] = layer
        this.setState({ layers: newLayers })
    }

    layerEffectsIconClicked(event, layer, index) {
        event.stopPropagation()
        this.setState({ currentTarget: event.currentTarget.parentNode.parentNode.parentNode.parentNode })
        layer.settingsPopoverOpen = !layer.settingsPopoverOpen
    }

    changeLayerFilter(index, filterID, callprops = true, useNameInsteadofIndex = false) {
        let newLayers = this.state.layers
        if (useNameInsteadofIndex) { // use layer name instead of index (name = index parameter)
            let newIndex = newLayers.findIndex(function (l) {
                return l.name === index
            })
            newLayers[newIndex].filter = filterID
        }
        else {
            newLayers[index].filter = filterID
        }
        this.props.sketchpageRef.current.primarySketch.changeSVGGroupFilter(newLayers[index].name, filterID)
        this.setState({ layers: newLayers }, () => {
            if (callprops) {
                this.props.sketchpageRef.current.serializeToString()
            }
        })
    }

    setLayerOpacity(name, opacityVal) {
        let newLayers = this.state.layers
        let newIndex = newLayers.findIndex(function (l) {
            return l.name === name
        })
        newLayers[newIndex].opacity = opacityVal
        this.setState({ layers: newLayers })
    }

    handleLayerOpacityChange = (event, newValue, layer, index) => {
        newValue = newValue ? newValue : event.target.value
        let newLayers = this.state.layers
        layer.opacity = newValue
        newLayers[index] = layer
        this.setState({ layers: newLayers }, () => {
            this.props.sketchpageRef.current.serializeToString()
        })

        let layerDOM = document.getElementById(newLayers[index].name)
        layerDOM.setAttribute("opacity", newValue)
    }

    setLayerVisibility(name, isVisible) {
        let newLayers = this.state.layers
        let newIndex = newLayers.findIndex(function (l) {
            return l.name === name
        })
        newLayers[newIndex].visible = isVisible
        this.setState({ layers: newLayers })
    }

    setLayerVisibilityWithIndex(isVisible, layer, index, noSerialize = false) {
        layer.visible = isVisible
        let newLayers = this.state.layers
        newLayers[index] = layer
        this.setState({ layers: newLayers }, () => {
            if(!noSerialize) this.props.sketchpageRef.current.serializeToString()
        })

        let layerDOM = document.getElementById(newLayers[index].name).instance
        if (isVisible) layerDOM.show()
        else layerDOM.hide()
    }

    toggleLayerVisibility(event, layer, index) {
        layer.visible = !layer.visible
        let newLayers = this.state.layers
        newLayers[index] = layer
        this.setState({ layers: newLayers }, () => {
            this.props.sketchpageRef.current.serializeToString()
        })

        let layerDOM = document.getElementById(newLayers[index].name).instance
        if (layerDOM.visible()) {
            layerDOM.hide()
        }
        else {
            layerDOM.show()
        }
    }

    addLayer(name, filterID, depth, callprops = true, addAtIndex = false) {
        let newLayers = this.state.layers
        let largestIndex = 1
        for (let i = 0; i < newLayers.length; i++) {
            if (newLayers[i].name.includes("layer")) {
                let currIndex = parseInt(newLayers[i].name.split("layer")[1])
                if (currIndex > largestIndex) {
                    largestIndex = currIndex
                }
            }
        }
        name = name ? name : "layer" + (largestIndex + 1)
        depth = depth ? depth : 1
        filterID = filterID ? filterID : "empty"
        if (addAtIndex) {
            newLayers.splice(addAtIndex, 0, { name: name, visible: true, filter: filterID, opacity: 1, audio: "", filterPopoverOpen: false, settingsPopoverOpen: false, src: "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs%3D", depth: depth, transformations: newTransformations(depth) })
        }
        else {
            newLayers.unshift({ name: name, visible: true, filter: filterID, opacity: 1, audio: "", filterPopoverOpen: false, settingsPopoverOpen: false, src: "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs%3D", depth: depth, transformations: newTransformations(depth) })
        }
        this.setState({ layers: newLayers }, () => {
            if (callprops) {
                this.props.sketchpageRef.current.primarySketch.addSVGGroup(name, depth, newLayers.length - addAtIndex - 1)
                this.props.sketchpageRef.current.serializeToString()
            }
            this.setState({ selectedIndex: addAtIndex ? addAtIndex : 0 })
        })
    }

    deleteLayer() {
        if (this.state.layers.length > 1) {
            let newLayers = this.state.layers
            let layerToDeleteName = newLayers[this.state.selectedIndex].name
            this.props.sketchpageRef.current.primarySketch.deleteSVGGroup(layerToDeleteName, newLayers.length - this.state.selectedIndex - 1)
            newLayers.splice(this.state.selectedIndex, 1)
            this.setState({ layers: newLayers }, () => {
                this.props.sketchpageRef.current.serializeToString()
            })
            this.setState({ selectedIndex: 0 })
        }
    }

    clearLayers(noLayers = false, callback = null) {
        let newLayers
        if (noLayers) {
            newLayers = []
        }
        else {
            newLayers = [
                { name: "layer1", visible: true, filter: "empty", opacity: 1, audio: "", filterPopoverOpen: false, settingsPopoverOpen: false, src: "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs%3D", depth: 1, transformations: newTransformations() }
            ]
        }
        this.setState({ layers: newLayers }, () => {
            if (callback) {
                callback()
            }
        })
        this.setState({ selectedIndex: 0 })
    }

    startLayerNameEdit(e) {
        let target = e.target
        target.contentEditable = true
        target.focus()
        this.setState({ currentLayerName: target.innerHTML })
    }

    finishLayerNameEdit(e, index) {
        let target = e.target
        target.contentEditable = false
        let newName = target.innerHTML.replace(/<br>|<div>|<\/div>|\n|\W/g, "")
        target.innerHTML = newName
        this.props.sketchpageRef.current.primarySketch.changeSVGGroupName(this.state.currentLayerName, newName)
        let newLayers = this.state.layers
        let layerAudio = document.getElementById(`${newLayers[index].name}___audio`)
        if (layerAudio) {
            layerAudio.setAttribute("id", `${newName}___audio`)
        }
        newLayers[index].name = newName
        this.setState({ layers: newLayers }, () => {
            this.props.sketchpageRef.current.serializeToString()
        })
    }

    onDragEnd(moveToLayerIndex) {  // reorder layer, calls function in sketch.js
        let newLayers = this.state.layers
        let movedLayerName = newLayers[this.state.moveFromLayerIndex].name
        let newDepth = newLayers[moveToLayerIndex].depth
        newLayers[this.state.moveFromLayerIndex].depth = newDepth
        newLayers[this.state.moveFromLayerIndex].transformations.changeDepth(newDepth)

        const layerToMove = newLayers.splice(this.state.moveFromLayerIndex, 1)[0]
        newLayers.splice(moveToLayerIndex, 0, layerToMove)

        this.setState({ layers: newLayers }, () => {
            this.props.sketchpageRef.current.primarySketch.reorderSVGGroup(movedLayerName, newLayers.length - this.state.moveFromLayerIndex - 1, newLayers.length - moveToLayerIndex - 1, newDepth, true)
            this.props.sketchpageRef.current.serializeToString()
        })
        this.setState({ selectedIndex: moveToLayerIndex })
        this.setState({ hoveredIndex: -1 })
    }

    onDragOver(e, index) {
        e.preventDefault()
        this.setState({ hoveredIndex: index })
    }

    mergeLayer(layerFromIndex, layerToIndex) {
        if (layerToIndex < 0 || layerToIndex >= this.state.layers.length) {
            return
        }
        let newLayers = this.state.layers
        this.props.sketchpageRef.current.primarySketch.mergeSVGGroup(newLayers[layerFromIndex].name, newLayers.length - layerFromIndex - 1, newLayers.length - layerToIndex - 1, true)

        newLayers.splice(layerFromIndex, 1)
        this.setState({ layers: newLayers }, () => {
            this.props.sketchpageRef.current.serializeToString()
        })
        let newSelectedIndex = layerFromIndex > layerToIndex ? layerToIndex : layerToIndex - 1
        this.setState({ selectedIndex: newSelectedIndex })
    }

    undoLayerDelete = (targetLayer, index) => {
        let newLayers = this.state.layers
        let filterID = targetLayer.node.getAttribute("filter") ? targetLayer.node.getAttribute("filter") : "empty"
        let opacity = targetLayer.node.getAttribute("opacity") ? targetLayer.node.getAttribute("filter") : 1
        let depth = targetLayer.node.getAttribute("depth") ? targetLayer.node.getAttribute("depth") : 1
        let audioNode = document.getElementById(`${targetLayer.node.id}___audio`)
        let audio = audioNode ? audioNode.getAttribute("src") : ""
        newLayers.splice(newLayers.length - index, 0,
            { name: targetLayer.node.id, visible: targetLayer.visible(), filter: filterID, opacity: opacity, audio: audio, filterPopoverOpen: false, settingsPopoverOpen: false, src: "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs%3D", depth: depth, transformations: newTransformations(depth) })
        this.setState({ layers: newLayers })
        this.setState({ selectedIndex: newLayers.length - index - 1 })
    }

    redoLayerDelete = (index) => {
        let newLayers = this.state.layers
        newLayers.splice(newLayers.length - index - 1, 1)
        console.log(newLayers)
        this.setState({ layers: newLayers })
        this.setState({ selectedIndex: 0 })
    }

    undoRedoLayerReorder = (oldIndex, newIndex, depth) => {
        let newLayers = this.state.layers
        oldIndex = newLayers.length - oldIndex - 1
        newIndex = newLayers.length - newIndex - 1
        const layerToMove = newLayers.splice(oldIndex, 1)[0];
        layerToMove.depth = depth
        layerToMove.transformations.changeDepth(depth)
        newLayers.splice(newIndex, 0, layerToMove);

        this.setState({ layers: newLayers })
        this.setState({ selectedIndex: newIndex })
        this.setState({ hoveredIndex: -1 })
    }

    translateLayer(name, dx, dy) {
        let currentLayer;
        let currentLayerIndex = null;
        if (name === null) {
            currentLayer = this.state.layers[this.state.selectedIndex];
        }
        else {
            currentLayerIndex = this.state.layers.findIndex(l => l.name === name);
            currentLayer = this.state.layers[currentLayerIndex];
        }
        let layerDOM = document.getElementById(currentLayer.name);

        let [x, y] = currentLayer.transformations.baseTranslate;
        currentLayer.transformations.changeBaseTranslate(x + dx, y + dy);

        this.updateTransformationInDOM(currentLayer, layerDOM, currentLayerIndex);
    }

    scaleLayer(name, ds) {
        let currentLayer;
        let currentLayerIndex = null;
        if (name === null) {
            currentLayer = this.state.layers[this.state.selectedIndex];
        }
        else {
            currentLayerIndex = this.state.layers.findIndex(l => l.name === name);
            currentLayer = this.state.layers[currentLayerIndex];
        }
        let layerDOM = document.getElementById(currentLayer.name);

        let [sx, sy] = currentLayer.transformations.baseScale;
        currentLayer.transformations.changeBaseScale(sx + ds, sy + ds);

        this.updateTransformationInDOM(currentLayer, layerDOM, currentLayerIndex);
    }


    setParallax(
        name,
        parallaxTranslate, parallaxScale, mode="absolute",
        updateState = true
    ){
        let currentLayerIndex = this.state.layers.findIndex(l => l.name === name);
        let currentLayer = this.state.layers[currentLayerIndex];
        let layerDOM = document.getElementById(currentLayer.name);

        if (mode === "absolute") {
            currentLayer.transformations.changeParallaxScale(parallaxScale)
            currentLayer.transformations.changeParallaxTranslate(parallaxTranslate)
        }
        else if (mode === "relative") {
            currentLayer.transformations.relativeChangeParallaxScale(parallaxScale)
            currentLayer.transformations.relativeChangeParallaxTranslate(parallaxTranslate)
        }

        this.updateTransformationInDOM(currentLayer, layerDOM, currentLayerIndex, updateState);
    }

    setLayerTransformations(
        name,
        baseTranslate, baseScale, parallaxTranslate, parallaxScale
    ) {
        let currentLayerIndex = this.state.layers.findIndex(l => l.name === name);
        let currentLayer = this.state.layers[currentLayerIndex];
        let layerDOM = document.getElementById(currentLayer.name);

        currentLayer.transformations.baseTranslate = baseTranslate;
        currentLayer.transformations.baseScale = baseScale;
        currentLayer.transformations.parallaxTranslate = parallaxTranslate;
        currentLayer.transformations.parallaxScale = parallaxScale;

        this.updateTransformationInDOM(currentLayer, layerDOM, currentLayerIndex);
    }

    updateTransformationInDOM(currentLayer, layerDOM, currentLayerIndex, updateState = true){
        const newTransform = currentLayer.transformations.getMatrixAttribute();
        const separatedAttributes = currentLayer.transformations.getSeparated();
        layerDOM.setAttribute('transform', newTransform);
        layerDOM.setAttribute('separatedTransform', separatedAttributes);

        let newLayers = this.state.layers;
        if (currentLayerIndex !== null) newLayers[currentLayerIndex] = currentLayer;
        else newLayers[this.state.selectedIndex] = currentLayer;

        if(updateState){
            this.setState({
                layers: newLayers
            });
        }
    }

    panLayersNoParallax(x, y, directSet = false, pd = null, zoom_sensitivity = 1) {
        let layers = this.state.layers
        for (let i = 0; i < layers.length; i ++) {
            let currLayer = layers[i]
            let layerDOM = document.getElementById(currLayer.name);
            currLayer.transformations.changeParallaxScale([pd.depth, pd.depth])
            currLayer.transformations.changeParallaxTranslate([x, y])
            this.updateTransformationInDOM(currLayer, layerDOM, i, true);
        }
    }

    panLayers(x, y, directSet = false, pd = null, zoom_sensitivity = 1) { // pd = parallaxData
        let layers = this.state.layers
        if(directSet){
            let closestVisibleLayerIndex = -1;
            let toggledLayer = false;
            let maxDepth = Infinity;

            for (let i = 0; i < layers.length; i ++) {
                let currLayer = layers[i]
                let distance = currLayer.depth * 50 - pd.depth * zoom_sensitivity * 10;
                if(distance > 0 && distance < maxDepth){
                    closestVisibleLayerIndex = i;
                    maxDepth = distance;
                }

                if(distance < 0){ // layer behind camera, hide it
                    if(currLayer.visible) this.setLayerVisibilityWithIndex(false, currLayer, i, true);
                    toggledLayer = true;
                } else {
                    if(!currLayer.visible) this.setLayerVisibilityWithIndex(true, currLayer, i, true);

                    let proj_x = pd.focalLength / distance * x * zoom_sensitivity;
                    let proj_y = pd.focalLength / distance * y * zoom_sensitivity;
                    let scaleFac = pd.focalLength / distance;

                    // let expFac = 2 * Math.exp(-0.1 * distance / 50);
                    // let proj_x = expFac / 2 * x;
                    // let proj_y = expFac / 2 * y;
                    // let scaleFac = expFac;
                    // if(scaleFac <= 0) scaleFac = 0; 
    
                    //let scaleFac = pd.focalLength / distance;
                    // let scaleFac = 1 + (pd.focalLength / distance - 1) * 0.9;
                    /* let scaleFac = 1 + (pd.focalLength / distance - 1) * 1.1;
                    if(scaleFac <= 0) scaleFac = 0; */
                    
                    this.setParallax(
                        currLayer.name,
                        [proj_x, proj_y], [scaleFac, scaleFac],
                        "absolute", false
                    );
                }
            }

            // auto-select next deepest layer if current selected layer goes invisible
            if(closestVisibleLayerIndex !== -1 && toggledLayer){
                const selectedLayer = layers[this.state.selectedIndex];
                const selectedLayerDistance = selectedLayer.depth * 50 - pd.depth * 10;

                if(maxDepth > selectedLayerDistance){
                    this.layerClicked(closestVisibleLayerIndex);
                }
            }
        }

        else {
            for (let i = 0; i < layers.length; i ++) {
                let currLayer = layers[i]
                this.setParallax(
                    currLayer.name,
                    [x * (1 / currLayer.depth), y * (1 / currLayer.depth)], [1, 1],
                    "relative"
                )   
            }
        }
    }

    zoomLayers(x, y, zf) {
        let layers = this.state.layers
        for (let i = 0; i < layers.length; i++) {
            let currLayer = layers[i]
            let lt = currLayer.transformations
            let zoom = Math.pow(zf, 1 / currLayer.depth)
            // let zoom = zf;
            let translateX = -(x - lt.parallaxTranslate[0]) * (zoom - 1)
            let translateY = -(y - lt.parallaxTranslate[1]) * (zoom - 1)
            this.setParallax(
                currLayer.name,
                [translateX, translateY], [zoom, zoom],
                "relative"
            )
        }
    }

    resetParallax() {
        let layers = this.state.layers
        for (let i = 0; i < layers.length; i++) {
            let currLayer = layers[i]
            this.setParallax(
                currLayer.name,
                [0, 0], [1, 1],
                "absolute"
            )
        }
    }

    renderAudioUploadButton(layer, index) {
        if (layer.audio.length > 0) {
            return (
                <div onClick={() => this.removeAudio(layer, index)} className="custom-audio-file-upload">
                    Remove
                </div>
            )
        }
        else {
            return (
                <div onClick={() => { this.setState({ audioModalOpen: true }); this.setState({ currentAudioModalLayerName: layer.name }) }} className="custom-audio-file-upload">
                    Add
                </div>
            )
        }
    }

    removeAudio(layer, index) {
        layer.audio = ""
        let newLayers = this.state.layers
        newLayers[index] = layer
        var element = document.getElementById(`${newLayers[index].name}___audio`)
        element.parentNode.removeChild(element);

        let layerDOM = document.getElementById(newLayers[index].name)
        layerDOM.removeAttribute("onmouseover")
        layerDOM.removeAttribute("onmouseout")
    }

    isValidUrl(string) {
        try {
            new URL(string);
            return true;
        } catch (err) {
            return false;
        }
    }

    uploadAudio = (audioURL, layerName, serialize = true) => {
        let newLayers = this.state.layers
        let index = newLayers.findIndex(function (l) {
            return l.name === layerName
        })
        if (audioURL && this.isValidUrl(audioURL) && index !== -1) {
            newLayers[index].audio = audioURL
            newLayers[index].settingsPopoverOpen = false
            this.setState({ layers: newLayers })

            let layer = document.getElementById(newLayers[index].name)
            layer.setAttribute("onmouseover", `$('${newLayers[index].name}___audio').play(); $('${newLayers[index].name}___audio').loop=true`)
            layer.setAttribute("onmouseout", `$('${newLayers[index].name}___audio').pause()`)

            if (serialize) {
                let svg = document.getElementById("main-canvas")
                let defs = svg.getElementsByTagName("defs")[0]

                let a = new Audio(audioURL)
                a.setAttribute("id", `${newLayers[index].name}___audio`)
                defs.appendChild(a)

                this.props.sketchpageRef.current.serializeToString()

                this.setState({ audioURLValid: true })
                this.setState({ audioModalURL: "" })
                this.setState({ audioModalOpen: false })
                this.setState({ currentAudioModalLayerIndex: -1 })
            }
        }
        else {
            if (serialize) {
                this.setState({ audioURLValid: false })
            }
        }
    }

    changeLayerSrc = (index, src) => {
        let newLayers = this.state.layers
        newLayers[newLayers.length - index - 1].src = src
        this.setState({ layers: newLayers })
    }

    depthChanged(newDepth, layer, index) {
        newDepth = Number(newDepth)
        let newLayers = this.state.layers
        newLayers[index].depth = newDepth
        let maxDepth = newLayers.reduce(function(prev, current) {
            return (prev.depth > current.depth) ? prev.depth : current.depth
        }).depth
        this.props.updateMaxDepth(maxDepth)

        newLayers[index].transformations.changeDepth(newDepth)

        let movedLayerName = layer.name
        newLayers.sort((a, b) => {
            return a.depth - b.depth
        })
        let moveToLayerIndex = newLayers.findIndex(l => l.name === movedLayerName)
        this.setState({ selectedIndex: moveToLayerIndex })
        this.setState({ layers: newLayers }, () => {
            this.props.sketchpageRef.current.primarySketch.reorderSVGGroup(movedLayerName, newLayers.length - index - 1, newLayers.length - moveToLayerIndex - 1, newDepth, true)
            this.props.sketchpageRef.current.canvasDrawAlternativeParallax()
            this.props.sketchpageRef.current.serializeToString()
        })
    }

    render() {
        return (
            <div id="layerspage">
                <div id="layers-list">
                    <div className='flex-row'>
                        <div className='flex-column pad-left'>
                            <div className='label-top'>Parallax</div>
                            <Switch size="small" color="secondary"
                                checked={this.props.parallaxOn}
                                onChange={(event) => this.props.toggleParallax(event.target.checked)} />
                        </div>
                        <div className='flex-right tiny-padding'>
                            <Tooltip title="Add Layer">
                                <AddBoxIcon className="layer-icon" style={{ paddingTop: 3.5, height: 15 }}
                                    onClick={() => {
                                        let selectedLayerDepth = this.state.layers[this.state.selectedIndex].depth
                                        let previousLayerDepth = this.state.layers[this.state.selectedIndex - 1] ? this.state.layers[this.state.selectedIndex - 1].depth : selectedLayerDepth
                                        this.addLayer(false, false, (selectedLayerDepth + previousLayerDepth) / 2, true, this.state.selectedIndex)
                                    }} />
                            </Tooltip>
                            <Tooltip title="Merge Layer Up">
                                <SvgIcon className={this.state.layers.length <= 1 ? "layer-icon-disabled" : "layer-icon"} style={{ paddingTop: 3.5, height: 15 }} aria-label="merge layer up"
                                    onClick={() => this.mergeLayer(this.state.selectedIndex, this.state.selectedIndex - 1)}>
                                    <MergeUpButton />
                                </SvgIcon>
                            </Tooltip>
                            <Tooltip title="Merge Layer Down">
                                <SvgIcon className={this.state.layers.length <= 1 ? "layer-icon-disabled" : "layer-icon"} style={{ paddingTop: 3.5, height: 15 }} aria-label="merge layer down"
                                    onClick={() => this.mergeLayer(this.state.selectedIndex, this.state.selectedIndex + 1)}>
                                    <MergeDownButton />
                                </SvgIcon>
                            </Tooltip>
                            <Tooltip title="Delete Layer">
                                <DeleteForeverIcon className={this.state.layers.length <= 1 ? "layer-icon-disabled" : "layer-icon"} style={{ height: 19 }}
                                    onClick={() => this.deleteLayer()} />
                            </Tooltip>
                        </div>
                    </div>
                    <div id='layers-cards'>
                    {this.state.layers.map(
                        (layer, index) =>
                            <div id={"layer-id-" + index} key={"layer-id-" + index} className={`layer-card ${this.state.selectedIndex === index ? 'layer-selected' : ''} 
                            ${(this.state.hoveredIndex === index && index > this.state.moveFromLayerIndex) ? 'layer-hovered-below' : ''}
                            ${(this.state.hoveredIndex === index && index < this.state.moveFromLayerIndex) ? 'layer-hovered-above' : ''}
                            `}
                                onClick={() => this.layerClicked(index)}
                                onDragOver={(e) => this.onDragOver(e, index)}
                                onDragStart={() => this.setState({ moveFromLayerIndex: index })}
                                onDrop={(e) => this.onDragEnd(index)}
                                draggable>
                                <div className='flex-parent-column'>
                                    <div className='flex-row'>
                                        <Popover
                                            open={layer.filterPopoverOpen}
                                            anchorEl={this.state.currentTarget}
                                            onClose={() => { layer.filterPopoverOpen = !layer.filterPopoverOpen; let newLayers = this.state.layers; newLayers[index] = layer }}
                                            transformOrigin={{
                                                vertical: 'top',
                                                horizontal: 'right',
                                            }}>
                                            <div className='layer-popover'>
                                                <div id='layer-setting-title'>Layer Filter</div>
                                                <div id='layer-filters-list'>
                                                    <Tooltip title="No filter">
                                                        <svg className={layer.filter === "empty" ? "MuiSvgIcon-root layer-filter-selected clickable-layers-icon" : "MuiSvgIcon-root layer-filter clickable-layers-icon"}
                                                            focusable="false" viewBox="0 0 24 24" style={{ height: 17, width: 17 }}
                                                            onClick={() => this.changeLayerFilter(index, "empty")}>
                                                            <path d="M6 6h12v12h-12v-12v12h12v0-12h-12l12 12" stroke="black"></path>
                                                        </svg>
                                                    </Tooltip>
                                                    {this.props.filters.map((filter, layerFilterIndex) => {
                                                        return (
                                                            <Tooltip key={"layer-filter-id-" + layerFilterIndex} title={filter.filterID}>
                                                                <svg className={layer.filter === filter.filterID ? "MuiSvgIcon-root layer-filter-selected clickable-layers-icon" : "MuiSvgIcon-root layer-filter clickable-layers-icon"}
                                                                    focusable="false" viewBox="0 0 24 24" style={{ height: 17, width: 17 }}
                                                                    onClick={() => this.changeLayerFilter(index, filter.filterID)}>
                                                                    <path d="M6 6h12v12H6z" filter={`url(#${filter.filterID}-!layer)`}></path>
                                                                </svg>
                                                            </Tooltip>
                                                        )
                                                    })}
                                                </div>
                                            </div>
                                        </Popover>
                                        <Popover
                                            open={layer.settingsPopoverOpen}
                                            anchorEl={this.state.currentTarget}
                                            onClose={() => { layer.settingsPopoverOpen = !layer.settingsPopoverOpen; let newLayers = this.state.layers; newLayers[index] = layer }}
                                            transformOrigin={{
                                                vertical: 'top',
                                                horizontal: 'right',
                                            }}>
                                            <div className='layer-popover'>
                                                <div id='layer-setting-title'>Layer Effects</div>
                                                <div className='layer-setting-option'>
                                                    <div className='layer-setting-option-label'>Audio</div>
                                                    <div style={{ paddingTop: 1 }}>
                                                        {this.renderAudioUploadButton(layer, index)}
                                                    </div>
                                                </div>
                                                <div className='layer-setting-option'>
                                                    <div className='layer-setting-option-label'>Opacity</div>
                                                    <Slider size="small" color="secondary" valueLabelDisplay="auto"
                                                        value={Number(layer.opacity)}
                                                        min={0.01}
                                                        max={1}
                                                        step={0.01}
                                                        onChange={(event, newValue) => this.handleLayerOpacityChange(event, newValue, layer, index)} />
                                                </div>

                                            </div>
                                        </Popover>
                                        <div className='flex-left'>
                                            <div onClick={(event) => this.toggleLayerVisibility(event, layer, index)}>
                                                <Tooltip title="Toggle layer visibility">
                                                    {this.renderLayerVisibilityIcon(layer.visible)}
                                                </Tooltip>
                                            </div>
                                            <div onClick={(event) => this.layerEffectsIconClicked(event, layer, index)}>
                                                <Tooltip title="Layer effects">
                                                    <FlareIcon style={{ height: 15, width: 15 }} />
                                                </Tooltip>
                                            </div>
                                            <div onClick={(event) => this.changeLayerFilterIconClicked(event, layer, index)}>
                                                <Tooltip title="Change layer filter">
                                                    {this.renderChangeLayerFilterIcon(layer.filter)}
                                                </Tooltip>
                                            </div>
                                        </div>
                                        <div className="layer-name" suppressContentEditableWarning={true} onDoubleClick={(e) => this.startLayerNameEdit(e)} onBlur={(e) => this.finishLayerNameEdit(e, index)}>
                                            {layer.name}
                                        </div>
                                    </div>
                                    <div className='layers-preview-wrapper'>
                                        <img id={`layer${this.state.layers.length - index - 1}-preview-thumbnail`} alt={`Layer ${index} preview`} src={layer.src}
                                            style={{ width: "100%", border: '1px solid white' }} />
                                    </div>
                                    <div className='layers-depth'>
                                        <div>
                                            Depth:
                                        </div>
                                        <TextField type="number" size="small" value={layer.depth}
                                            onClick={(e) => e.stopPropagation()}
                                            onBlur={(e)=> {e.stopPropagation(); this.depthChanged(layer.depth, layer, index)}}
                                            onChange={(e) => {
                                                e.stopPropagation()
                                                this.setState((prevState) => {
                                                    const newLayers = [...prevState.layers];
                                                    newLayers[index].depth = e.target.value;
                                                    return { layers: newLayers }
                                                })
                                            }}
                                            InputProps={{ style: { width: `32px`, height: `20px`, fontSize: `small` }, inputProps: { min: 1, step: 1, style: { textAlign: `right` } } }} />
                                    </div>
                                </div>
                            </div>
                    )}
                    </div>
                </div>
                <Dialog
                    open={this.state.audioModalOpen}
                    onClose={() => { this.setState({ audioModalOpen: false }); this.setState({ currentAudioModalLayerName: "" }); this.setState({ audioModalURL: "" }); this.setState({ audioURLValid: true }) }}
                    aria-labelledby="add-audio-popup">
                    <DialogContent>
                        <div className='flex-left'>
                            <div className='spin'>🎵</div>
                            <b><span id="popup-header">Add Audio to Layer</span></b>
                        </div>
                        <div id="popup-text">
                            Add a <a href="https://docs.google.com/document/d/e/2PACX-1vRDa2yxiBTLLmxOcdlGgloRib3bTTKCBU1TTzgSxK_BDQh1gMwQ35rg_mMc0mLb3B7v9j975odonkTe/pub" target="_blank" rel="noreferrer">secure URL link</a> to an audio file to set the audio for this layer. You will be able to play it by hovering over the layer.
                        </div>
                        <br></br>
                        <div className='dialog-content'>
                            <TextField
                                onFocus={(event) => event.stopPropagation()}
                                onClick={(event) => event.stopPropagation()}
                                onChange={event => this.setState({ audioModalURL: event.target.value })}
                                color='primary'
                                fullWidth
                                error={!this.state.audioURLValid}
                                helperText={this.state.audioURLValid ? "" : "URL is invalid."}
                                value={this.state.audioModalURL}
                                size="small" />
                        </div>
                        <div id="popup-text" className='tiny-text'>
                            Note: After you refresh the drawing or download and try to open it in a new tab, make sure you click on the drawing first or the audio will not play! (see <a href="https://developer.chrome.com/blog/autoplay/" target="_blank" rel="noreferrer">here</a>)
                        </div>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => { this.setState({ audioModalOpen: false }); this.setState({ currentAudioModalLayerName: "" }); this.setState({ audioModalURL: "" }); this.setState({ audioURLValid: true }) }}>
                            Cancel
                        </Button>
                        <Button onClick={() => { this.uploadAudio(this.state.audioModalURL, this.state.currentAudioModalLayerName) }} color="primary" autoFocus>
                            Confirm
                        </Button>
                    </DialogActions>
                </Dialog>
            </div>
        )
    }
}
