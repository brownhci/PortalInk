import React, { Component } from 'react'
import Snackbar from '@material-ui/core/Snackbar'
import MuiAlert from '@material-ui/lab/Alert'
import FileSaver from 'file-saver'
import SVG from 'svg.js'
import 'svg.filter.js'
import { Topbar } from './topbar'
import Sketch from './sketch'
import './sketchpage.css'
import './gradientdialog.css'
import { base } from '../../base'
import { flattenToPaths, unravelGroup, makeFilterElementFromDict, convertLayersToPreview, isMouseInsideDiv, getNumberInRange, isDivBeyondCanvas, waitMilliseconds} from '../util'

import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogTitle from '@material-ui/core/DialogTitle';
import IconButton from '@material-ui/core/IconButton';
import DeleteForeverIcon from '@material-ui/icons/DeleteForever';
import CloseIcon from '@material-ui/icons/Close';
import { GradientDialog } from './gradienteditor'
import { Button, Card, LinearProgress, Typography} from '@material-ui/core';
import { ColorPalette, CustomColor } from './colorpalette'
import { Waypoints } from './waypoints'
import { svgRuntimeString } from '../../util/single-file-export-string'
import { svgRuntime } from '../../util/single-file-export'


export class SketchPage extends Component {
    constructor(props) {
        super(props)
        this.state = {
            previousSketchMode: '',
            sketchMode: 'draw',
            currSoundCount: 0,
            currStroke: this.props.currStroke,
            currColor: '#8F7272',
            currCanvasColor: 'white',
            currStrokeSize: 4,
            opacity: 1,
            snackbarOpen: false,
            initializedFilter: null,
            depth: this.props.parallaxOn ? 0 : 1,

            // stabilizer state variables
            selectedStabilizer: 'spring',
            previousSelectedStabilizer: 'spring',
            smoothing: 0.6,
            cornerCorrection: true,
            variableWidth: true,

            // gradient state variables
            gradientSelectedPath: null,
            gradientToClose: {
                ref: null
            },
            gradientToDelete: {
                ref: null
            },

            // color palette state variables
            colorPaletteEventHandler: false,
            colorArray: (() => {
                const createEmptyColor = () => new CustomColor();
                const colorArray = new Array(10).fill(0);   // number of rows
                colorArray.forEach((_, i) => colorArray[i] = new Array(3).fill(0).map(_ => createEmptyColor())); // number of columns
                return colorArray;
            })(),

            // waypoint variables
            waypointDialogOpen: true,
            depthToTeleportationMap: {},

            // zoom + pan variables
            exportZoomAndPan: true,
            zoomSensitivity: 1,
            panSensitivity: 1,

            // legacy conversion variables
            hasPolyline: false,
            curConverterStroke: -1,
            totalConverterStrokes: -1
        }
        this.waypointRef = React.createRef()
        this.drawing = false;
        this.moving = false;
        this.translating = false;
        this.scaling = false;
        this.zoomConstant = 0.95
        this.startTime = Date.now()

        // time correction variables
        this.timeDown = -1;
        this.quickMoving = true;
        this.quickMovingTimer = 0;
        this.pointsLeftToInsert = 0;
        this.maxInsertPoints = 10;
        this.lastDrawEvent = null;
        this.startStrokeTime = Date.now();
        let timeDelay = 0.05 * 1000;

        // time correction loop
        setInterval(() => {
            if(this.state.cornerCorrection && this.drawing) {
                if(!this.quickMoving && this.pointsLeftToInsert > 0 && Date.now() - this.startStrokeTime > timeDelay){
                    this.primarySketch.continueLineWithEvent(this.lastDrawEvent, 'draw', true);
                    this.pointsLeftToInsert -= 1;
                }
            }
        }, 10);

        // gradient dialog & color palette variables
        this.isDraggingGradient = false;
        this.cachedOffset = [0, 0];
        this.previousOffset = [25, 0];
        this.colorPaletteRef = React.createRef();

        // 3D variables
        this.position = [0, 0];
        this.focalLength = 100; // 100
        this.viewport = [0, 0];
        this.overrideInvisible = false;
        this.alternativeParallax = false;

        // zoom velocity smoothing / zoom event injection
        this.isZooming = false;
        this.lastZoomEvent = null;
        this.zoomVelocity = 0;
        this.lastMouseMoveEvent = null;

        this.speedFactor = 0.4;
        this.addVelocity = 0.8 * this.speedFactor;
        this.maxVelocity = 5 * this.speedFactor;
        this.deaccelConst = 0.3 * this.speedFactor;

        this.xyVelocity = [0, 0];
        this.collectedOffsets = [];
        this.deaccelXYConst = 0.8;
        this.wasJustPanning = false;
        this.cursorDown = false;
        this.maxXYVelcoity = 15;

        document.addEventListener('mousemove', (e) => {
            if(!this.wheelZooming) return;
            this.lastMouseMoveEvent = e;
        });

        this.prevXYVelocity = this.xyVelocity;
        this.pauses = 0;
        this.injectZoomingEvents = () => {
            // zooming momentum
            if(this.zoomVelocity > this.maxVelocity) this.zoomVelocity = this.maxVelocity;
            if(this.zoomVelocity < 0) this.zoomVelocity = 0;
            if(this.lastMouseMoveEvent && this.lastZoomEvent && this.zoomVelocity !== 0) {
                const e1 = this.lastZoomEvent;
                const e2 = this.lastMouseMoveEvent;
                this.canvasZoom(-e1.deltaY, true, e2, true, this.zoomVelocity)
                this.zoomVelocity -= this.deaccelConst;
            }

            // panning momentum
            if(!this.props.parallaxOn) return;
            if(this.xyVelocity[0] < -this.maxXYVelcoity) this.xyVelocity[0] = -this.maxXYVelcoity;
            else if(this.xyVelocity[0] > this.maxXYVelcoity) this.xyVelocity[0] = this.maxXYVelcoity;
            if(this.xyVelocity[1] < -this.maxXYVelcoity) this.xyVelocity[1] = -this.maxXYVelcoity;
            else if(this.xyVelocity[1] > this.maxXYVelcoity) this.xyVelocity[1] = this.maxXYVelcoity;

            if((Math.abs(this.xyVelocity[0]) > this.deaccelXYConst) || (Math.abs(this.xyVelocity[1]) > this.deaccelXYConst)){ // only smooth after panning event...
                if(!this.cursorDown){
                    this.canvasPan(undefined, this.xyVelocity)
                    
                    this.xyVelocity[0] -= Math.sign(this.xyVelocity[0]) * this.deaccelXYConst;
                    this.xyVelocity[1] -= Math.sign(this.xyVelocity[1]) * this.deaccelXYConst;
                }
            }

            if(this.prevXYVelocity[0] > this.deaccelXYConst && Math.abs(this.xyVelocity[0]) < this.deaccelXYConst) this.pauses += 1;
            if(this.prevXYVelocity[1] > this.deaccelXYConst && Math.abs(this.xyVelocity[1]) < this.deaccelXYConst) this.pauses += 1;
            if(this.pauses === 2){
                this.serializeToString(true);
                this.pauses += 1;
            }
            this.prevXYVelocity = [
                Math.abs(this.xyVelocity[0]),
                Math.abs(this.xyVelocity[1])
            ];
        };

        this.maxFrameRate = 30;
        let previousTime = new Date().getTime;
        this.injectZoomingEventsLoop = () => {
            let newTime = new Date().getTime();
            if(newTime - previousTime < 1000 / this.maxFrameRate){
                // skip frame
            } else {
                this.injectZoomingEvents();
                previousTime = newTime;
            }
            
            window.requestAnimationFrame(this.injectZoomingEventsLoop);
        }
        this.injectZoomingEventsLoop();
    }

    setBindings() {
        this.verifyJSON = this.verifyJSON.bind(this)
        this.waypointMode = this.waypointMode.bind(this)
        this.drawMode = this.drawMode.bind(this)
        this.colorMode = this.colorMode.bind(this)
        this.filterMode = this.filterMode.bind(this)
        this.eraseMode = this.eraseMode.bind(this)
        this.gradientMode = this.gradientMode.bind(this)
        this.moveMode = this.moveMode.bind(this)
        this.translateLayerMode = this.translateLayerMode.bind(this)
        this.scaleLayerMode = this.scaleLayerMode.bind(this)
        this.panMode = this.panMode.bind(this)
        this.clear = this.clear.bind(this)
        this.undo = this.undo.bind(this)
        this.redo = this.redo.bind(this)
        this.download = this.download.bind(this)
        this.importSVG = this.importSVG.bind(this)
        this.changeColor = this.changeColor.bind(this)
        this.changeCanvasColor = this.changeCanvasColor.bind(this)
        this.changeStrokeSize = this.changeStrokeSize.bind(this)
        this.changeOpacity = this.changeOpacity.bind(this)
        this.pickColor = this.pickColor.bind(this)
        this.moveToBackMode = this.moveToBackMode.bind(this)
        this.moveToFrontMode = this.moveToFrontMode.bind(this)
        this.canvasZoom = this.canvasZoom.bind(this)
        this.handleColorPaletteToggle = this.handleColorPaletteToggle.bind(this);
        this.clearColorPalette = this.clearColorPalette.bind(this);
        this.setWaypointDialogOpen = this.setWaypointDialogOpen.bind(this)
        this.setViewBox = this.setViewBox.bind(this)
        this.setParallax = this.setParallax.bind(this)
        this.removeFromDepthToTeleportationMap = this.removeFromDepthToTeleportationMap.bind(this)
        
        // bind stabilizer handler functions
        this.handleStabilizerOption = this.handleStabilizerOption.bind(this)
        this.handleStabilizerSmoothingChange = this.handleStabilizerSmoothingChange.bind(this)
        this.handleStabilizerCornerCorrectionChange = this.handleStabilizerCornerCorrectionChange.bind(this)
        this.handleVariableWidthChange = this.handleVariableWidthChange.bind(this)

        // bind serializing function so gradient dialog can call it
        this.serializeToString = this.serializeToString.bind(this)
        this.deleteGradientGroup = this.deleteGradientGroup.bind(this)
    }

    componentDidMount() {
        this.setBindings()
        let width = document.getElementById('svg').clientWidth
        let height = document.getElementById('svg').clientHeight
        this.draw = SVG('svg').size(width, height)
        this.draw.node.setAttribute("id", "main-canvas")
        this.draw.node.setAttribute("style", `background-color: white`)

        let defs = this.draw.node.getElementsByTagName("defs")[0]
        var jQuerySelectorScript = document.createElement('script')
        jQuerySelectorScript.innerHTML = "function $(id) { return document.getElementById(id) }"
        defs.appendChild(jQuerySelectorScript)

        
        this.svg = document.getElementById('svg').getElementsByTagName('svg')[0]
        this.viewbox = this.draw.viewbox()
        this.svg.setAttribute("viewBox", this.viewbox)
        this.viewport = this.svg.getAttribute('viewBox').split(' ').slice(2, 4).map(parseFloat);
        
        this.primarySketch = new Sketch(this.draw, this.svg, this)

        var doit
        let context = this
        window.addEventListener('resize', () => {
            clearTimeout(doit)
            doit = setTimeout(function(){ 
                context.resizedWindow(context)
                context.primarySketch.updateDimensions()
                context.serializeToString()
            }, 100)
        })

        window.addEventListener('keyup', (e) => this.handleKeyUp(e))
        window.addEventListener('keydown', (e) => this.handleKeyDown(e))
        this.svg.addEventListener('touchmove', (e) => {
            e.preventDefault()
        })
        this.svg.addEventListener('wheel', (e) => {
            e.preventDefault()
            if (!this.primarySketch.currentLayer.visible()) {
                if (e.ctrlKey || e.metaKey) {
                    // events are injected in requestAnimationLoop
                    // this.canvasZoom(-e.deltaY, true, e)
                    this.wheelZooming = true
                    this.lastZoomEvent = e
                    this.lastMouseMoveEvent = e
                    this.zoomVelocity += this.addVelocity;
                }

                return
            }
            if (e.ctrlKey || e.metaKey) {
                // events are injected in requestAnimationLoop
                // this.canvasZoom(-e.deltaY, true, e)
                this.wheelZooming = true
                this.lastZoomEvent = e
                this.lastMouseMoveEvent = e
                this.zoomVelocity += this.addVelocity;
            }
            else {
                this.changeStrokeSize(e.deltaY * -0.02, true)
            }
        })
        this.cursor = document.querySelector(".cursor")
        this.cursorIn = true
        this.svg.addEventListener('contextmenu', (e) => e.preventDefault())
        // this.svg.addEventListener('pointermove', (e) => this.moveCursor(e, 'in'))
        this.svg.addEventListener('pointerleave', (e) => this.moveCursor(e, 'out'))
        // this.svg.addEventListener('pointerenter', (e) => this.moveCursor(e, 'into'))
        // this.svg.addEventListener('touchmove', (e) => this.moveCursor(e, 'in'))
        // this.svg.addEventListener('touchleave', (e) => this.moveCursor(e, 'out'))
        // this.svg.addEventListener('touchenter', (e) => this.moveCursor(e, 'into'))

        console.log("loaded sketchpage")
    }

    handleStabilizerOption = (event, newOption) => {
        this.setState({selectedStabilizer: newOption});
    
        let notificationDot = document.getElementsByClassName('circle-icon')[0];
        
        if(notificationDot) {
            let color = newOption === 'none' ? 'rgba(0, 0, 0, 0)' : 'rgb(103, 247, 90)'
            notificationDot.style.setProperty('fill', color, 'important')
        }

        if(newOption === null){
            this.setState({selectedStabilizer: this.previousSelectedStabilizer});
        } else {
            this.previousSelectedStabilizer = newOption;
        }
    }

    handleStabilizerSmoothingChange = (event, newValue) => {
        this.setState({smoothing: newValue});
    }

    handleStabilizerCornerCorrectionChange = (event, newValue) => {
        this.setState({cornerCorrection: newValue});
    }

    handleVariableWidthChange = (event, newValue) => {
        this.setState({variableWidth: newValue});
    }

    resizedWindow(context){
        // Haven't resized in 100ms!
        let width = document.getElementById('svg').clientWidth
        let height = document.getElementById('svg').clientHeight
        let vb = context.draw.viewbox()
        let originalZoom = vb.zoom
        let viewboxScale = 1/originalZoom
        context.draw.size(width, height)
        
        vb.width = width * viewboxScale
        vb.height = height * viewboxScale
        vb.zoom = originalZoom
        context.draw.viewbox(vb)
    }

    moveCursor(e, status) {
        if (status === "in") {
            if (this.state.sketchMode === "draw" || this.state.sketchMode === "drawfill") {
                this.cursor.style.top = e.pageY + "px"
                this.cursor.style.left = e.pageX + "px"
                document.getElementById("svg").className = "draw-cursor"
            }
            else if (this.state.sketchMode === "pan") {
                this.cursor.style.top = e.pageY + "px"
                this.cursor.style.left = e.pageX + "px"
                document.getElementById("svg").className = this.panning ? "grabbing-cursor" : "grab-cursor"
                this.cursor.style.display = "none"
            }
            else {
                this.cursor.style.display = "none"
            }
        }
        else if (status === "out") {
            // this.cursorIn = false
            // this.cursor.style.display = "none"
            // document.getElementById("svg").className = "no-cursor";
            // this.handleMouseUp(e, "mouse", true)
            if (this.currHoveredStroke) {
                this.currHoveredStroke.highlight()
                this.currHoveredStroke = undefined
            }
        }
        else {
            this.cursorIn = true
            if (this.state.sketchMode === "draw" || this.state.sketchMode === "drawfill") {
                this.cursor.style.display = "block"
                this.cursor.style.top = e.pageY + "px"
                this.cursor.style.left = e.pageX + "px"
                document.getElementById("svg").className = "draw-cursor"
            }
            else if (this.state.sketchMode === "color") {
                document.getElementById("svg").className = "color-cursor";
            }
            else if (this.state.sketchMode === "pickColor") {
                document.getElementById("svg").className = "pick-color-cursor";
            }
            else if (this.state.sketchMode === "filter") {
                document.getElementById("svg").className = "filter-cursor";
            }
            else if (this.state.sketchMode === "erase") {
                document.getElementById("svg").className = "erase-cursor";
            }
            else if ((!this.moving && this.state.sketchMode === "move") || (!this.panning && this.state.sketchMode === "pan")) {
                document.getElementById("svg").className = "grab-cursor";
            }
        }
    }

    clearAllSketchProperties() {
        let mainCanvas = document.getElementById("main-canvas")
        let animateNodes = mainCanvas.getElementsByTagName("animate")
        Array.from(animateNodes).forEach(function(n) {
            n.remove()
        })
        let filterNodes = mainCanvas.getElementsByTagName("filter")
        Array.from(filterNodes).forEach(function(n) {
            n.remove()
        })
        let defs = mainCanvas.getElementsByTagName("defs")[0]
        Array.from(defs.childNodes).forEach(function(n) {
            if (n.tagName !== "SCRIPT") {
                n.remove()
            }
        })
        this.viewbox = this.draw.viewbox()
        this.viewbox.width = mainCanvas.clientWidth
        this.viewbox.height = mainCanvas.clientHeight
        this.viewbox.x = 0
        this.viewbox.y = 0
        this.draw.viewbox(this.viewbox)
    }

    initializeFilterSet(index, update=false) {
        try {
            let f = this.props.list[index]
            if (!f) {
                return "empty"
            }
            let filter = document.getElementById(f.filterID)
            if (update && filter) { // if update, only update if a path is using it (filter already exists)
                filter.parentNode.removeChild(filter)
                let filterReactElem = makeFilterElementFromDict(f.filterID, f.params.map(x => JSON.parse(x)), false, false, this.state.depth / 5)
                this.setState({initializedFilter: filterReactElem}, () => {
                    let newFilter = document.getElementById(f.filterID)
                    this.svg.appendChild(newFilter.cloneNode(true))
                    this.setState({initializedFilter: null})
                })
                return f.filterID
            }
            else { // if not update, we are trying to add, only add if it doesnt exist
                if (filter) {
                    return f.filterID
                }
                else {
                    let filterReactElem = makeFilterElementFromDict(f.filterID, f.params.map(x => JSON.parse(x)), false, false, this.state.depth / 5)
                    this.setState({initializedFilter: filterReactElem}, () => {
                        let newFilter = document.getElementById(f.filterID)
                        this.svg.appendChild(newFilter.cloneNode(true))
                        this.setState({initializedFilter: null})
                    })
                    return f.filterID
                }
            }
        }
        catch (err) {
            console.log(err)
            return "empty"
        }
    }

    handleMouseDown(e) {
        if (!this.primarySketch.currentLayer.visible()) {
            this.prevX = e.clientX
            this.prevY = e.clientY
            this.prevFrameX = e.clientX;
            this.prevFrameY = e.clientY;
            if (this.state.sketchMode === 'pan') {
                document.getElementById("svg").className = "grabbing-cursor"
                this.panning = true
            }
            return
        }
        this.cursorDown = true;
        this.prevX = e.clientX
        this.prevY = e.clientY
        this.prevFrameX = e.clientX;
        this.prevFrameY = e.clientY;
        this.collectedOffsets = [];
        if (this.state.sketchMode === 'erase') {
            let erased = this.primarySketch.erase(e.clientX, e.clientY)
            if (erased) {
                this.props.sendLog("erased_stroke")
            }
        }
        else if(this.state.sketchMode === 'gradient'){
            let selectResult = this.primarySketch.select(e.clientX, e.clientY);
            if(selectResult === undefined || selectResult === null) {
                return;
            }

            this.props.openGradientDialogAtIndex(0);
            
            let targetPath = selectResult[1];
            this.setState({gradientSelectedPath: targetPath});
        }
        else if (this.state.sketchMode === 'move') {
            document.getElementById("svg").className = "grabbing-cursor"
            if (!this.moving && this.primarySketch.startMove(e)) {
                this.moving = true
                this.primarySketch.continueLineWithEvent(e, 'move')
            }
        }
        else if (this.state.sketchMode === 'translate layer') {
            document.getElementById("svg").className = "grabbing-cursor"
            if (!this.translating && this.primarySketch.startTranslateLayer(e)) {
                this.translating = true
                this.primarySketch.continueLineWithEvent(e, 'translate layer')
            }
        }
        else if (this.state.sketchMode === 'scale layer') {
            document.getElementById("svg").className = "grabbing-cursor"
            if (!this.scaling && this.primarySketch.startScaleLayer(e)) {
                this.scaling = true
                this.primarySketch.continueLineWithEvent(e, 'scale layer')
            }
        }
        else if (this.state.sketchMode === 'pan') {
            document.getElementById("svg").className = "grabbing-cursor"
            this.panning = true
        }
        else if (this.state.sketchMode === 'moveBack') {
            if (this.primarySketch.moveToBack(e.clientX, e.clientY)) {
                this.props.sendLog("moved stroke to back")
            }
        }
        else if (this.state.sketchMode === 'moveFront') {
            if (this.primarySketch.moveToFront(e.clientX, e.clientY)) {
                this.props.sendLog("moved stroke to front")
            }
        }
        else if (this.state.sketchMode === 'draw' || this.state.sketchMode === 'drawfill') {
            this.startStrokeTime = Date.now();
            let filterID = this.initializeFilterSet(this.props.selectedFilter.toString())
            let count = Math.floor(Math.random() * Math.floor(3))
            this.setState({ currSoundCount: count })
            this.drawing = true
            let currZoomFactor = this.draw.viewbox().zoom
            if (this.state.sketchMode === 'draw') {
                this.primarySketch.startPath(
                    this.state.currColor, (this.state.currStrokeSize + 1), currZoomFactor, filterID, this.state.opacity, false, this.props.username, 
                    this.props.filterVisibilities[filterID], this.props.list[this.props.selectedFilter], 
                    {
                        selectedStabilizer: this.state.selectedStabilizer,
                        smoothing: this.state.smoothing,
                        cornerCorrection: this.state.cornerCorrection,
                        variableWidth: this.state.variableWidth
                    },
                    {
                        employCorrection: !this.props.parallaxOn,
                        depth: this.state.depth
                    }
                );
            }
            else if (this.state.sketchMode === 'drawfill') {
                this.primarySketch.startPath(
                    this.state.currColor, (this.state.currStrokeSize + 1), currZoomFactor, filterID, this.state.opacity, true, this.props.username, 
                    this.props.filterVisibilities[filterID], this.props.list[this.props.selectedFilter], 
                    {
                        selectedStabilizer: this.state.selectedStabilizer,
                        smoothing: this.state.smoothing,
                        cornerCorrection: this.state.cornerCorrection,
                        variableWidth: this.state.variableWidth
                    },
                    {
                        employCorrection: !this.props.parallaxOn,
                        depth: this.state.depth
                    }
                );
            }
            // turn off for performance
            this.primarySketch.continueLineWithEvent(e, 'draw')

            // time correction variables
            this.timeDown = new Date();
            this.lastDrawEvent = e;
            this.primarySketch.currentPressures = [];
        }
        else if (this.state.sketchMode === 'color') {
            if (this.primarySketch.color(e.clientX, e.clientY, this.state.currColor)) {
                this.props.sendLog("changed_color_of_stroke")
            }
        }
        else if (this.state.sketchMode === 'pickColor') {
            let pickedColor = this.primarySketch.pickColor(e.clientX, e.clientY)
            if (pickedColor) {
                this.changeColor(pickedColor, true)
                this.props.sendLog("picked_color_from_stroke")
            }
        }
        else if (this.state.sketchMode === 'filter') {
            let newFilterID = this.initializeFilterSet(this.props.selectedFilter.toString())
            if (this.primarySketch.changeFilter(e.clientX, e.clientY, newFilterID)) {
                this.props.sendLog("changed_filter_of_stroke")
            }
        }
        else if (this.state.sketchMode === 'waypoint') {
            e.stopPropagation()
            if (e.button === 0) { // left click, add waypoint
                this.primarySketch.addPortalToWaypoint(e.clientX, e.clientY)
            }
            else if (e.button === 2) { // right click, remove waypoint
                this.primarySketch.removePortalToWaypoint(e.clientX, e.clientY)
            }
        }
    }

    handleMove(e) {
        if (!this.primarySketch.currentLayer.visible()) {
            if(this.panning) {
                this.canvasPan(e)

                if(this.collectedOffsets.length >= 2){
                    const l = this.collectedOffsets.length;
                    const first = this.collectedOffsets[0];
                    const last = this.collectedOffsets[l - 1];
                    const avgVelocity = [(last[0] - first[0])/l, (last[1] - first[1])/l];
                    const avgMagnitude = Math.sqrt(avgVelocity[0] ** 2 + avgVelocity[1] ** 2);
                    const redirectedVelocity = [
                        last[0] - (this.collectedOffsets[l - 2][0] || last[0]),
                        last[1] - (this.collectedOffsets[l - 2][1] || last[1])
                    ];
                    const redirectedMagnitude = Math.sqrt(redirectedVelocity[0] ** 2 + redirectedVelocity[1] ** 2);
                    const scaleFactor = redirectedMagnitude / avgMagnitude;
                    const scaledVelocity = [
                        redirectedVelocity[0] * scaleFactor,
                        redirectedVelocity[1] * scaleFactor
                    ];
                    this.xyVelocity = scaledVelocity;
                }

                e.persist()
                this.prevMouseEvent = e
            }

            return
        }

        if (this.drawing) {
            this.primarySketch.continueLineWithEvent(e, 'draw')

            // time correction variable update logic
            // if not moving, insert points for corner
            this.quickMoving = true;
            this.lastDrawEvent = e;
            clearTimeout(this.quickMovingTimer);
            this.quickMovingTimer = setTimeout(() => {
                this.quickMoving = false;
                this.pointsLeftToInsert = this.maxInsertPoints;
            }, this.selectedStabilizer === 'smooth' ? 150 : 75);
        }
        else if (this.moving) {
            this.primarySketch.continueLineWithEvent(e, 'move')
        }
        else if (this.translating) {
            this.primarySketch.continueLineWithEvent(e, 'translate layer')
        }
        else if (this.scaling) {
            this.primarySketch.continueLineWithEvent(e, 'scale layer')
        }
        else if (this.panning) {
            this.canvasPan(e)

            if(this.collectedOffsets.length >= 2){
                const l = this.collectedOffsets.length;
                const first = this.collectedOffsets[0];
                const last = this.collectedOffsets[l - 1];
                const avgVelocity = [(last[0] - first[0])/l, (last[1] - first[1])/l];
                const avgMagnitude = Math.sqrt(avgVelocity[0] ** 2 + avgVelocity[1] ** 2);
                const redirectedVelocity = [
                    last[0] - (this.collectedOffsets[l - 2][0] || last[0]),
                    last[1] - (this.collectedOffsets[l - 2][1] || last[1])
                ];
                const redirectedMagnitude = Math.sqrt(redirectedVelocity[0] ** 2 + redirectedVelocity[1] ** 2);
                const scaleFactor = redirectedMagnitude / avgMagnitude;
                const scaledVelocity = [
                    redirectedVelocity[0] * scaleFactor,
                    redirectedVelocity[1] * scaleFactor
                ];
                this.xyVelocity = scaledVelocity;
            }
        }
        else if (
            this.state.sketchMode !== 'draw' && this.state.sketchMode !== 'drawfill' && this.state.sketchMode !== 'pan' && 
            this.state.sketchMode !== 'translate layer' && this.state.sketchMode !== 'scale layer'
        ) {
            this.hoverStroke(e)
        }
        e.persist()
        this.prevMouseEvent = e
    }

    handleMouseUp(e, method, cursorMove=false) {
        if (!this.primarySketch.currentLayer.visible()) {
            if(this.state.sketchMode === 'pan') {
                document.getElementById("svg").className = "grab-cursor";
                this.panning = false
            };
            return
        }
        if(this.wasJustPanning){
            this.wasJustPanning = false;
        }
        this.cursorDown = false;

        if (this.state.sketchMode === 'move') {
            document.getElementById("svg").className = "grab-cursor";
            if (this.moving && !this.drawing) {
                this.moving = false
                this.primarySketch.endMove()
                this.props.sendLog("moved_stroke")
            }
        }
        else if (this.state.sketchMode === 'translate layer') {
            document.getElementById("svg").className = "grab-cursor";
            if (this.translating && !this.drawing) {
                this.translating = false
                this.primarySketch.endTranslateLayer()
                this.props.sendLog("translated_layer")
            }
        }
        else if (this.state.sketchMode === 'scale layer') {
            document.getElementById("svg").className = "grab-cursor";
            if (this.scaling && !this.drawing) {
                this.scaling = false
                this.primarySketch.endScaleLayer()
                this.props.sendLog("scaled_layer")
            }
        }
        else if (this.state.sketchMode === 'pan') {
            document.getElementById("svg").className = "grab-cursor";
            this.panning = false
            this.wasJustPanning = true;
        }
        else if ((this.state.sketchMode === 'draw' || this.state.sketchMode === 'drawfill')) { // drawing mode
            for (let i = 0; i < 3; i++) {
                if (e.type === 'mouseup') {
                    this.handleMove(e) // Draw dot at the end for smoothing
                }
            }
            if (this.drawing) {
                this.drawing = false
                this.primarySketch.finishPath()
                this.props.sendLog("drew_stroke_"+ this.props.selectedFilter + "_" + this.props.list[this.props.selectedFilter]?.filterID || 'none')
            }
        }
        if (!cursorMove) {
            if(!this.wasJustPanning){ // don't update if just panning so we don't get blocking action
                if (this.primarySketch.currentPath !== null) {
                    // change selected filter
                    let newFilterIndex = -1
                    for (let i = 0; i < this.props.list.length; i++) {
                        if (this.props.list[i].filterID === this.primarySketch.currentPath.params.filterID) {
                            newFilterIndex = i
                        }
                    }
                    if (this.primarySketch.currentPath.params.filterID !== "empty") {
                        this.props.changeSelectedFilter(newFilterIndex)
                    }
                    this.props.updateStrokeCode(JSON.stringify(this.primarySketch.currentPath.serialize(false)))
                }
                else {
                    this.props.updateStrokeCode("Start inking a SVG to begin! -->")
                }
            }
            
            if (!(this.state.sketchMode === 'draw' || this.state.sketchMode === 'drawfill')) {
                // panning drag action ends
                // reset pauses so we can initiate serializeEvent on momentum end
                this.pauses = 0;
                if(!this.props.parallaxOn) {this.serializeToString(true)}
                if(this.state.sketchMode === 'waypoint') {
                    this.serializeToString()
                }
            }
        }
    }

    handleKeyUp(e) { 
        if (!this.primarySketch.currentLayer.visible()) {
            return
        }
        if (this.cursorIn) {
            if (e.key === 'd' && this.prevMouseEvent != null) {
                this.handleMouseUp(this.prevMouseEvent, 'd-key')
            }
            else if (e.keyCode === 32) {
                this.keyPressed = false
                this.panning = false
                this.setState({sketchMode: this.state.previousSketchMode}, () => {
                    this.moveCursor(e, "into")
                })
            }
            else if (e.keyCode === 17 && this.wheelZooming) {
                this.wheelZooming = false
                this.zoomVelocity = 0;      // TODO: when serialization is moved to off-thread, we don't need to cut it off
                this.serializeToString(this.props.parallaxOn)
            }
        }
    }

    handleKeyDown(e) {
        if (!this.primarySketch.currentLayer.visible()) {
            if(this.cursorIn && e.keyCode === 32 && !this.keyPressed && !this.drawing) {
                this.keyPressed = true
                this.setState({previousSketchMode: this.state.sketchMode}, () => {
                    this.setState({sketchMode: 'pan'}, () => {
                        this.moveCursor(e, "in")
                        this.moveCursor(e, "into")
                    })
                })
            }

            return
        }
        if (this.cursorIn) {
            if ((this.state.sketchMode === 'draw' || this.state.sketchMode === 'drawfill') && e.key === 'd' && this.prevMouseEvent != null && !this.drawing) {
                this.handleMouseDown(this.prevMouseEvent)
            }
            if (e.keyCode === 90 && (e.ctrlKey || e.metaKey) && e.shiftKey) {
                this.primarySketch.redo()
            } else if (e.keyCode === 90 && (e.ctrlKey || e.metaKey)) {
                this.primarySketch.undo()
            }
            else if (e.keyCode === 187 && (e.ctrlKey || e.metaKey)) {
                e.preventDefault()
                this.canvasZoom(1)
                
            }
            else if (e.keyCode === 189 && (e.ctrlKey || e.metaKey)) {
                e.preventDefault()
                this.canvasZoom(-1)
            }
            else if (e.keyCode === 32 && !this.keyPressed && !this.drawing) {
                this.keyPressed = true
                this.setState({previousSketchMode: this.state.sketchMode}, () => {
                    this.setState({sketchMode: 'pan'}, () => {
                        this.moveCursor(e, "in")
                        this.moveCursor(e, "into")
                    })
                })
            }
        }
    }

    canvasDrawAlternativeParallax(){
        const parallaxData = {
            depth: this.state.depth,
            focalLength: this.focalLength,
            v_width: this.viewport[0],
            v_height: this.viewport[1]
        }

        this.props.layerspageRef.current.panLayers(
            this.position[0],
            this.position[1],
            true, parallaxData,
            this.state.zoomSensitivity
        );
    }

    canvasDrawNoParallax() {
        const parallaxData = {
            depth: this.state.depth,
            focalLength: this.focalLength,
            v_width: this.viewport[0],
            v_height: this.viewport[1]
        }

        this.props.layerspageRef.current.panLayersNoParallax(
            this.position[0],
            this.position[1],
            true, parallaxData,
            this.state.zoomSensitivity
        );
    }

    canvasPan(e, offsets = undefined) {
        let offsetX = (e.clientX - this.prevFrameX) * (this.props.parallaxOn ? 1.5 : 1);
        let offsetY = (e.clientY - this.prevFrameY) * (this.props.parallaxOn ? 1.5 : 1);

        if(this.props.parallaxOn){
            offsetX *= this.state.panSensitivity;
            offsetY *= this.state.panSensitivity;
        }

        // factor in rotation while panning ("fake it" by rotating offsets!)
        const rotatePoint = (point, degrees) => {
            const theta = degrees * Math.PI / 180;
            return [
                point[0] * Math.cos(theta) - point[1] * Math.sin(theta),
                point[0] * Math.sin(theta) + point[1] * Math.cos(theta),
            ];
        }
        const rotation = 0; // TODO: add rotation in
        let newOffsets = rotatePoint([offsetX, offsetY], -rotation);
        offsetX = newOffsets[0];
        offsetY = newOffsets[1];

        // const factor = ternary(parallaxOn, 1, 1);
        const factor = 1;
        this.position[0] += offsetX * factor;
        this.position[1] += offsetY * factor;

        this.prevFrameX = e.clientX || 0
        this.prevFrameY = e.clientY || 0
        
        if(this.props.parallaxOn){
            this.canvasDrawAlternativeParallax();
        } else {
            this.canvasDrawNoParallax();
        }
    }

    canvasZoom(zoomDir, useMouseLocation=false, e, useFactor = false, factor = 0) {
        this.viewbox = this.draw.viewbox()
        let sketchGroup = document.getElementById('sketchGroup')
        let rect = this.svg.getBoundingClientRect()
        if(this.portalTransitioning || this.checkIfPortalTriggeredViaCanvasBbox(e, rect, sketchGroup)) return;
        
        if(this.props.parallaxOn){
            let flip = -1;
            let zf = (zoomDir > 0 ? -this.zoomConstant : this.zoomConstant) * flip;

            let newDepth = !useFactor ? this.state.depth + zf : this.state.depth + (Math.sign(zf) * factor)

            // additional check for parallax (handles edge cases where going beyond depth toggles visibility of layer off, so bbox check w/ canvas doesn't work)
            let depthInRange = getNumberInRange(Object.keys(this.state.depthToTeleportationMap), this.state.depth / 5, newDepth / 5)
            if (depthInRange) {
                let teleports = this.state.depthToTeleportationMap[depthInRange]
                for (let i = 0; i < teleports.length; i++) {
                    if (isMouseInsideDiv(e.clientX, e.clientY, teleports[i]["portalID"])) {
                        let waypoint = this.waypointRef.current.waypointModeMatchesLayerMode(teleports[i]["waypointID"])
                        if (waypoint) {
                            const moveableDivBBox = document.getElementById(teleports[i]["portalID"]+"-preview").getBoundingClientRect()
                            const portalTransition = document.getElementById("portal-preview-transition")
                            this.animatePortalTransition(portalTransition, moveableDivBBox, rect, waypoint, sketchGroup)
                            waitMilliseconds(250, () => {
                                sketchGroup.style.opacity = 1
                                this.waypointRef.current.handleWaypointClick(waypoint)
                                portalTransition.style.display = "none"
                                portalTransition.setAttribute("href", "")
                                this.portalTransitioning = false
                                return
                            })
                        }
                    }
                }
            }
            this.setState({depth: newDepth})
            let zoomLocationX = Math.round(e.clientX - rect.left) - rect.width / 2;
            let zoomLocationY = Math.round(e.clientY - rect.top) - rect.height / 2;

            let sign = Math.sign(zf) * -1;
            if(!useFactor) {
                this.position[0] += sign * zoomLocationX * 0.1;
                this.position[1] += sign * zoomLocationY * 0.1;
            } else {
                let finalFactor = (0.1 / 0.95) * factor; // I don't remember where this constant comes from...
                this.position[0] += sign * zoomLocationX * finalFactor;
                this.position[1] += sign * zoomLocationY * finalFactor;
            }  
            
            this.canvasDrawAlternativeParallax();

            // depth effect for filters
            for (let i = 0; i < this.props.list.length; i++) {
                let hasDepthEffect = this.props.list[i].params.some(str => str.includes("depthEffects"))
                if (hasDepthEffect) {
                    this.initializeFilterSet(i.toString(), true)
                }
            }
        }
        else {
            this.computeZoomParametersNoParallax(e, rect, zoomDir, factor)
            this.canvasDrawNoParallax()
        }
    }

    computeZoomParametersNoParallax(e, rect, zoomDir, factor) {
        let Mx = Math.round(e.clientX - rect.left) - rect.width / 2 + 1;
        let My = Math.round(e.clientY - rect.top) - rect.height / 2 + 1;

        const dS = (1 + factor * Math.sign(zoomDir) * 0.05);
        let Sx = this.state.depth * rect.width;
        let Sy = this.state.depth * rect.height;
        this.setState({depth: this.state.depth * dS})

        let Lxept = this.position[0] - Sx / 2;
        let Rxept = this.position[0] + Sx / 2;
        let ax1 = Mx - Lxept;
        let ax2 = Rxept - Mx;
        let bx1 = ax1 * dS;
        let bx2 = ax2 * dS;
        let Lxpept = Mx - bx1;
        let Rxpept = Mx + bx2;
        let tpx = (Lxpept + Rxpept) / 2;

        let Lyept = this.position[1] - Sy / 2;
        let Ryept = this.position[1] + Sy / 2;
        let ay1 = My - Lyept;
        let ay2 = Ryept - My;
        let by1 = ay1 * dS;
        let by2 = ay2 * dS;
        let Lypept = My - by1;
        let Rypept = My + by2;
        let tpy = (Lypept + Rypept) / 2;

        this.position = [tpx, tpy]
    }

    checkIfPortalTriggeredViaCanvasBbox(e, canvasBbox, sketchGroup) {
        for (const key in this.state.depthToTeleportationMap) {
            const teleports = this.state.depthToTeleportationMap[key];
            for (let i = 0; i < teleports.length; i++) {
                if (isDivBeyondCanvas(teleports[i]["portalID"], canvasBbox) && isMouseInsideDiv(e.clientX, e.clientY, teleports[i]["portalID"])) {
                    let waypoint = this.waypointRef.current.waypointModeMatchesLayerMode(teleports[i]["waypointID"])
                    if (waypoint) {
                        const moveableDivBBox = document.getElementById(teleports[i]["portalID"]+"-preview").getBoundingClientRect()
                        const portalTransition = document.getElementById("portal-preview-transition")
                        this.animatePortalTransition(portalTransition, moveableDivBBox, canvasBbox, waypoint, sketchGroup)
                        waitMilliseconds(250, () => {
                            sketchGroup.style.opacity = 1
                            this.waypointRef.current.handleWaypointClick(waypoint)
                            portalTransition.style.display = "none"
                            portalTransition.setAttribute("href", "")
                            this.portalTransitioning = false
                            return true
                        })
                    }
                }
            }
        }
        return false
    }

    animatePortalTransition(portalTransition, moveableDivBBox, canvasBbox, waypoint, sketchGroup) {
        const portalTransitionStyle = portalTransition.style
        portalTransitionStyle.display = "block"
        portalTransition.setAttribute("href", waypoint.url)
        sketchGroup.style.opacity = 0
        portalTransitionStyle.x = `${this.viewbox.x + (moveableDivBBox.left - canvasBbox.left) / (canvasBbox.width / this.viewbox.width)}px`
        portalTransitionStyle.y = `${this.viewbox.y + (moveableDivBBox.top - canvasBbox.top) / (canvasBbox.height / this.viewbox.height)}px`
        portalTransitionStyle.width = `${moveableDivBBox.width / (canvasBbox.width / this.viewbox.width)}px`
        portalTransitionStyle.height = `${moveableDivBBox.height / (canvasBbox.height / this.viewbox.height)}px`
        this.portalTransitioning = true
        waitMilliseconds(1, () => {
            portalTransitionStyle.transition = "all 0.25s ease"
            let viewboxList = waypoint.viewboxString.split(" ").map(parseFloat);
            portalTransitionStyle.x = `${-(viewboxList[2] - this.viewbox.width)/2}px`
            portalTransitionStyle.y = `${-(viewboxList[3] - this.viewbox.height)/2}px`
            portalTransitionStyle.width = `${viewboxList[2]}px`
            portalTransitionStyle.height = `${viewboxList[3]}px`
        })
    }

    setViewBox(viewboxString, depth, posX, posY, callback) {
        this.setState({depth: depth}, () => {
            this.position = [posX, posY]
            // let viewboxList = viewboxString.split(" ")
            // this.viewbox.x = viewboxList[0]
            // this.viewbox.y = viewboxList[1]
            // this.viewbox.width = viewboxList[2]
            // this.viewbox.height = viewboxList[3]
            // this.draw.viewbox(this.viewbox)   
            this.canvasDrawNoParallax()

            if(callback) callback();
        })
    }

    resetViewBox(){
        this.viewbox.x = 0;
        this.viewbox.y = 0;
        const svgElem = document.getElementById('main-canvas');
        this.viewbox.width = parseFloat(svgElem.getAttribute('width'));
        this.viewbox.height = parseFloat(svgElem.getAttribute('height'));
    }

    setParallax(depth, posX, posY, callback) {
        this.setState({depth: depth}, () => {
            this.position = [posX, posY]
            this.resetViewBox()
            this.draw.viewbox(this.viewbox)
            this.canvasDrawAlternativeParallax()
            
            if(callback) callback();
        })
    }

    startParallax(){
        this.setState({depth: this.props.parallaxOn ? 0 : 1}, () => {
            this.position = [0, 0];
            this.resetViewBox();
            this.draw.viewbox(this.viewbox);
            this.canvasDrawAlternativeParallax();
        })
    }

    resetParallax(){
        this.setState({depth: this.props.parallaxOn ? 0 : 1})
        this.position = [0, 0];
        this.resetViewBox();
        this.draw.viewbox(this.viewbox)
    }

    hoverStroke(e) {
        let selected = this.primarySketch.select(e.clientX, e.clientY)
        
        if (typeof selected !== 'undefined') {
            if (typeof this.currHoveredStroke !== 'undefined' && this.currHoveredStroke.svgPath.node.id !== selected[1].svgPath.node.id) {
                this.currHoveredStroke.highlight()
            }
            this.currHoveredStroke = selected[1]
            this.currHoveredStroke.highlight(0.2)
        }
        else {
            if (typeof this.currHoveredStroke !== 'undefined') {
                this.currHoveredStroke.highlight()
            }
        }
    }

    waypointMode(on) {
        if (on) {
            this.setState({ previousSketchMode: this.state.sketchMode}, () => {
                this.setState({ sketchMode: 'waypoint'})
                document.getElementById("svg").className = "waypoint-cursor"
                this.props.sendLog("changed_mode_waypoint")
            })
        }
        else {
            this.setState({sketchMode: this.state.previousSketchMode}, () => {
                if (this.state.sketchMode === "draw" || this.state.sketchMode === "drawfill") {
                    document.getElementById("svg").className = "draw-cursor";
                }
                else if (this.state.sketchMode === "color") {
                    document.getElementById("svg").className = "color-cursor";
                }
                else if (this.state.sketchMode === "pickColor") {
                    document.getElementById("svg").className = "pick-color-cursor";
                }
                else if (this.state.sketchMode === "filter") {
                    document.getElementById("svg").className = "filter-cursor";
                }
                else if (this.state.sketchMode === "erase") {
                    document.getElementById("svg").className = "erase-cursor";
                }
                else if (this.state.sketchMode === "move" || this.state.sketchMode === "pan" || this.state.sketchMode === "translate layer" || this.state.sketchMode === "scale layer") {
                    document.getElementById("svg").className = "grab-cursor";
                }
                else if (this.state.sketchMode === "gradient") {
                    document.getElementById("svg").className = "gradient-cursor";
                }
                else {
                    document.getElementById("svg").className = "default-cursor";
                }
            })
        }
    }

    drawMode(fill=false) {
        if (fill) {
            this.setState({ sketchMode: 'drawfill' })
            this.props.sendLog("changed_mode_drawfill")
        }
        else {
            this.setState({ sketchMode: 'draw' })
            this.props.sendLog("changed_mode_draw")
        }
        document.getElementById("svg").className = "draw-cursor"
        if (typeof(this.currHoveredStroke) !== "undefined") {
            this.currHoveredStroke.highlight()
        }
        this.waypointRef.current.stopDrawingWaypoint()
    }

    colorMode() {
        this.setState({ sketchMode: 'color' })
        document.getElementById("svg").className = "color-cursor"
        this.props.sendLog("changed_mode_dropcolor")
        this.waypointRef.current.stopDrawingWaypoint()
    }

    filterMode() {
        this.setState({sketchMode: 'filter'})
        document.getElementById("svg").className = "filter-cursor"
        this.props.sendLog("changed_mode_changefilter")
        this.waypointRef.current.stopDrawingWaypoint()
    }

    pickColor() {
        this.setState({ sketchMode: 'pickColor' })
        document.getElementById("svg").className = "pick-color-cursor"
        this.props.sendLog("changed_mode_pickcolor")
        this.waypointRef.current.stopDrawingWaypoint()
    }

    eraseMode() {
        this.setState({ sketchMode: 'erase' })
        document.getElementById("svg").className = "erase-cursor"
        this.props.sendLog("changed_mode_erase")
        this.waypointRef.current.stopDrawingWaypoint()
    }

    gradientMode() {
        this.setState({ sketchMode: 'gradient' })
        document.getElementById("svg").className = "gradient-cursor"
        this.props.sendLog("changed_mode_gradient")
        this.waypointRef.current.stopDrawingWaypoint()
    }

    moveMode() {
        this.setState({ sketchMode: 'move' })
        document.getElementById("svg").className = "grab-cursor"
        this.props.sendLog("changed_mode_move")
        this.waypointRef.current.stopDrawingWaypoint()
    }

    translateLayerMode() {
        this.setState({ sketchMode: 'translate layer' })
        document.getElementById("svg").className = "grab-cursor"
        this.props.sendLog("changed_mode_translate_layer")
        this.waypointRef.current.stopDrawingWaypoint()
    }

    scaleLayerMode(){
        this.setState({ sketchMode: 'scale layer' })
        document.getElementById("svg").className = "grab-cursor"
        this.props.sendLog("changed_mode_scale_layer")
        this.waypointRef.current.stopDrawingWaypoint()
    }

    moveToBackMode() {
        this.setState({ sketchMode: 'moveBack' })
        document.getElementById("svg").className = "default-cursor"
        this.props.sendLog("changed_mode_move_to_back")
        this.waypointRef.current.stopDrawingWaypoint()
    }

    moveToFrontMode() {
        this.setState({ sketchMode: 'moveFront' })
        document.getElementById("svg").className = "default-cursor"
        this.props.sendLog("changed_mode_move_to_front")
        this.waypointRef.current.stopDrawingWaypoint()
    }

    panMode() {
        this.setState({ sketchMode: 'pan' })
        document.getElementById("svg").className = "grab-cursor"
        this.props.sendLog("changed_mode_pan")
        this.waypointRef.current.stopDrawingWaypoint()
    }

    clear() {
        if (this.primarySketch.clear()) {
            this.waypointRef.current.clearWaypoints(() => {
                this.props.layerspageRef.current.clearLayers(false, () => {
                    this.setState({depthToTeleportationMap: {}})
                    this.primarySketch.updateDimensions()
                    this.clearAllSketchProperties()
                    this.drawMode()
                    this.serializeToString()
                    this.props.sendLog("cleared_canvas")
                })
            })
        }
    }

    undo() { 
        this.primarySketch.undo(this.props.layerspageRef.current) 
        this.serializeToString(false)
        this.props.sendLog("clicked_undo")
    }

    redo() { 
        this.primarySketch.redo(this.props.layerspageRef.current) 
        let currStrokeFilterID = this.primarySketch.currStrokeFilterID
        for (let i = 0; i < this.props.list.length; i++) {
            if (this.props.list[i].filterID === currStrokeFilterID) {
                this.initializeFilterSet(i.toString())
                break
            }
        }
        this.serializeToString(false)
        this.props.sendLog("clicked_redo")
    }

    changeColor(color, colorDropped=false) {
        if (colorDropped) {
            this.setState({ currColor: color})
        }
        else {
            this.setState({ currColor: color.hex})
        }
    }

    changeCanvasColor(color, colorIsObj=true) {
        if (colorIsObj) {
            this.setState({currCanvasColor: color.hex})
            this.svg.style.backgroundColor = color.hex
        }
        else {
            this.setState({currCanvasColor: color})
            this.svg.style.backgroundColor = color
        }
        this.serializeToString()
    }

    changeStrokeSize(size, wheel=false) {
        let newStrokeSize = wheel ? this.state.currStrokeSize + parseInt(size) : parseInt(size)
        if (newStrokeSize < 1) {
            newStrokeSize = 1
        }
        if (newStrokeSize > 100) {
            newStrokeSize = 100
        }
        this.setState({ currStrokeSize: newStrokeSize }, () => {
            this.cursor.style.width = (newStrokeSize * this.zoomConstant).toString() + "px"
            this.cursor.style.height = (newStrokeSize * this.zoomConstant).toString() + "px"
        })
    }

    changeOpacity(val) {
        let newOpacity = parseFloat(val)
        if (newOpacity < 0) {
            newOpacity = 0
        } else if (newOpacity > 1 || isNaN(newOpacity)) {
            newOpacity = 1
        }
        this.setState({ opacity: newOpacity })
    }

    serializeToString(processThumbnails = true, save = true) {
        //convert svg to blob
        let svg = document.getElementById('main-canvas')
        let serializer = new XMLSerializer()
        let numStrokes = 0, numLayers = 0
        let layerIDs = []

        //remove filters that are not used by strokes + update the metadata to store
        let activeFiltersList = new Set()
        for (let i = 0; i < this.props.list.length; i++) {
            activeFiltersList.add(this.props.list[i].filterID)
        }

        for (let i = 0; i < svg.children.length; i++) {
            let SVGChild = svg.children[i]
            if (SVGChild.nodeName === "g") {
                if (SVGChild.id === '[[filtered.ink-color-palette-data]]' || SVGChild.id === '[[filtered.ink-waypoint-data]]') {
                    continue;
                }

                // looks through individual strokes
                for (let j = 0; j < SVGChild.children.length; j++) {
                    let sketchGroupElement = SVGChild.children[j]
                    if (sketchGroupElement.nodeName === "g") {
                        numLayers += 1
                        layerIDs.push(sketchGroupElement.id)
                        for (let k = 0; k < sketchGroupElement.children.length; k++) {
                            let stroke = sketchGroupElement.children[k]
                            if (stroke.getAttribute("filter")) {
                                let filterName = stroke.getAttribute("filter").split("#")[1]
                                filterName = filterName.substring(0, filterName.length - 1)
                                activeFiltersList.add(filterName)
                            }
                            numStrokes += 1
                        }
                    }
                    else { // is a stroke
                        if (sketchGroupElement.getAttribute("filter")) {
                            let filterName = sketchGroupElement.getAttribute("filter").split("#")[1]
                            filterName = filterName.substring(0, filterName.length - 1)
                            activeFiltersList.add(filterName)
                        }
                        numStrokes += 1
                    }
                }
            }
        }
        for (let i = 0; i < svg.children.length; i++) {
            let SVGChild = svg.children[i]
            if (SVGChild.nodeName === "filter") {
                if (!activeFiltersList.has(SVGChild.id)) {
                    let unusedFilter = document.getElementById(SVGChild.id)
                    svg.removeChild(unusedFilter)
                }
            }
        }

        // save color palette in an empty <g> tag
        let tempPalette = document.getElementById('[[filtered.ink-color-palette-data]]');
        const colorPaletteContainer = tempPalette ? tempPalette : document.createElementNS('http://www.w3.org/2000/svg', 'g');
        colorPaletteContainer.id = '[[filtered.ink-color-palette-data]]';
        colorPaletteContainer.textContent = '';
        for (let i = 0; i < this.state.colorArray.length; i++) {
            for (let j = 0; j < this.state.colorArray[0].length; j++) {
                let curColor = this.colorPaletteRef.current.state.colorArray[i][j];
                const individualColor = document.createElementNS('http://www.w3.org/2000/svg', 'g');
                individualColor.id = `${i}-${j}-${!curColor.hasColor ? 'none' : curColor.getHex()}`;
                colorPaletteContainer.appendChild(individualColor);
            }
        }
        svg.appendChild(colorPaletteContainer);

        // save waypoints in an empty <g> tag
        let tempWaypoints = document.getElementById('[[filtered.ink-waypoint-data]]');
        const waypointsContainer = tempWaypoints ? tempWaypoints : document.createElementNS('http://www.w3.org/2000/svg', 'g');
        waypointsContainer.id = '[[filtered.ink-waypoint-data]]';
        waypointsContainer.textContent = '';
        const waypointsList = this.waypointRef.current.returnWaypoints()
        for (let i = 0; i < waypointsList.length; i++) {
            const individualWaypoint = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            let waypointDict = { ...waypointsList[i] }
            // if (!waypointDict.parallaxIsOn) {
            //     delete waypointDict["url"]
            // }
            delete waypointDict["url"]
            const waypointDataString = JSON.stringify(waypointDict)
            individualWaypoint.id = `waypoint==${i}==${waypointDataString}`
            waypointsContainer.appendChild(individualWaypoint);
        }
        svg.appendChild(waypointsContainer);

        // save sensitivity numbers in an empty <g> tag
        let tempSS = document.getElementById('[[filtered.ink-sensitivity-data]]');
        const sensitivitySettings = tempSS ? tempSS : document.createElementNS('http://www.w3.org/2000/svg', 'g');
        sensitivitySettings.id = '[[filtered.ink-sensitivity-data]]';
        sensitivitySettings.textContent = '';
        sensitivitySettings.setAttribute('zoom', `${this.state.zoomSensitivity}`);
        sensitivitySettings.setAttribute('pan', `${this.state.panSensitivity}`);
        svg.appendChild(sensitivitySettings);

        // final serialization step
        let svgString = serializer.serializeToString(svg)
        if (!save) {
            return svgString
        }
        else {
            clearTimeout(this.startSerialization);
            this.startSerialization = setTimeout(() => {

                convertLayersToPreview(svgString, numLayers, layerIDs, this.props.layerspageRef, processThumbnails) // processThumbnails = fastEval on
                if (numStrokes === 0) {
                    this.props.updateSVGString('')
                }
                else {
                    svgString = svgString.replaceAll('xmlns="" ', '')
                    this.props.updateSVGString(svgString)
                }
            }, 750);
        }
    }

    /**
    * Download current sketch as svg file
    */
    download() {
        //convert svg to blob
        let svg = document.getElementById('main-canvas')
        let metadataToStore = {username: this.props.username, artistID: this.props.uid, timestamp: Date.now(), timeElapsed: Date.now() - this.startTime, filters: [], svgString: ""}
        let serializer = new XMLSerializer()
        let strokes = this.primarySketch.serialize()
        
        //remove filters that are not used by strokes + update the metadata to store
        let activeFiltersList = new Set()
        for (let i = 0; i < svg.children.length; i++) {
            let SVGChild = svg.children[i]
            if (SVGChild.nodeName === "g") {
                for (let j = 0; j < SVGChild.children.length; j++) {
                    let sketchGroupElement = SVGChild.children[j]
                    if (sketchGroupElement.nodeName === "g") {
                        for (let k = 0; k < sketchGroupElement.children.length; k++) {
                            let stroke = sketchGroupElement.children[k]
                            if (stroke.getAttribute("filter")) {
                                let filterName = stroke.getAttribute("filter").split("#")[1]
                                filterName = filterName.substring(0, filterName.length - 1)
                                activeFiltersList.add(filterName)
                            }
                        }
                    }
                    else { // is a stroke
                        if (sketchGroupElement.getAttribute("filter")) {
                            let filterName = sketchGroupElement.getAttribute("filter").split("#")[1]
                            filterName = filterName.substring(0, filterName.length - 1)
                            activeFiltersList.add(filterName)
                        }
                    }
                }
            }
        }
        for (let i = 0; i < svg.children.length; i++) {
            let SVGChild = svg.children[i]
            if (SVGChild.nodeName === "filter") {
                if (!activeFiltersList.has(SVGChild.id)) {
                    let unusedFilter = document.getElementById(SVGChild.id)
                    svg.removeChild(unusedFilter)
                }
                else {
                    let filterType = SVGChild.type === undefined ? "unknown" : SVGChild.type
                    metadataToStore["filters"].push({"type": filterType, "filterID": SVGChild.id})
                }
            }
        }
        let numNewStrokes = 0
        for (let i = 0; i < strokes.length; i++) {
            if (strokes[i].idCreator !== "imported") {
                numNewStrokes += 1
            }
        }

        let svgString = serializer.serializeToString(svg)
        svgString = svgString.replaceAll('xmlns="" ', '')
        let numImportedStrokes = strokes.length - numNewStrokes
        metadataToStore["numNewStrokes"] = numNewStrokes
        metadataToStore["numImportedStrokes"] = numImportedStrokes
        metadataToStore["svgString"] = svgString
        let finalSvgString = svgString;

        // include single-file-export javascript
        if(this.state.exportZoomAndPan){
            const runtime = svgRuntimeString;
            // const runtime = svgRuntime.toString(); // for dev build only
            const rawScriptNode = `<script>(${runtime})()</script>`;
    
            let position = [0, 0];
            let depth = 0;
            
            if(this.props.parallaxOn){
                depth = this.state.depth;
                position = this.position
            } else {
                const svgElem = document.getElementById('main-canvas');
                const d_one_width = parseFloat(svgElem.getAttribute('width'));
                const d_one_height = parseFloat(svgElem.getAttribute('height'));
                const d_cur_width = this.viewbox.width;
                const d_cur_height = this.viewbox.height;
    
                depth = d_one_width / d_cur_width;
    
                let true_center = [
                    d_one_width / 2,
                    d_one_height / 2
                ];
    
                position = [
                    (-(this.viewbox.x + d_cur_width / 2) + true_center[0]) * depth,
                    (-(this.viewbox.y + d_cur_height / 2) + true_center[1]) * depth,
                ]
            }
    
            const parallaxOnInjectedScript = rawScriptNode
                .replace('"[[REPLACE-PARALLAX-ON]]"', this.props.parallaxOn)
                .replace('"[[REPLACE-DEPTH]]"', depth)
                .replace('"[[REPLACE-ZOOM-SENSITIVITY]]"', this.state.zoomSensitivity)
                .replace('"[[REPLACE-PAN-SENSITIVITY]]"', this.state.panSensitivity)
                .replace('"[[REPLACE-POSITION]]"', JSON.stringify(position))
                .replace('"[[REPLACE-VIEWBOX]]"', `"${0} ${0} ${
                    parseFloat(svg.getAttribute('width'))
                } ${
                    parseFloat(svg.getAttribute('height'))
                }"`)
                .replace('"[[REPLACE-DEPTH-TO-TELEPORT-MAP]]"', JSON.stringify(this.state.depthToTeleportationMap));
            finalSvgString = `${svgString.slice(0, -6)}${parallaxOnInjectedScript}</svg>`;
        }   

        //download
        let blob = new Blob([finalSvgString], { type: "image/svg+xml" })
        FileSaver.saveAs(blob, "img.svg")
        //save to DB
        let context = this
        base.push(`completed_drawings`, {
            data: metadataToStore,
            then (err) {
              if (err) {
                console.log(err)
              }
              else {
                context.props.sendLog("downloaded_SVG")
              }
            }
        })
    }

    /**
     * Import local SVG file
     * @param {*} input 
     */
    importSVG(input) {
        let sketchpage = this
        let file = input.files[0]
        if (file.name.endsWith('svg')) {
            const promise = new Promise((resolve) => {
                const reader = new FileReader()
                reader.onload = function () {
                    resolve(reader.result)
                }
                reader.readAsText(file)
            })
            promise.then(img => {
                this.parseSVG(sketchpage, img)
                this.props.sendLog("imported_SVG")
            })
        }
        else {
            this.setState({snackbarOpen: true})
        }
    }

    parseSVG(sketchpage, img, template=true) {
        let context = this
        img = flattenToPaths(img).then((result) => {
            let parser = new DOMParser()
            let elems = parser.parseFromString(result, "image/svg+xml").documentElement
            let viewBox = elems.getAttribute("viewBox")
            let filterIDToIndex = {}
            let counter = 0, scale = 1, canvasX = 0, canvasY = 0, dx = 0, dy = 0
            if (viewBox) {
                viewBox = viewBox.split(" ")
                let canvasViewBox = document.getElementById("main-canvas").getAttribute("viewBox").split(" ")
                canvasX = Number(canvasViewBox[2])
                canvasY = Number(canvasViewBox[3])
                let importImgX = Number(viewBox[2])
                let importImgY = Number(viewBox[3])
                if (elems.getAttribute("id") === "main-canvas" && elems.getElementById("sketchGroup")) { // imported from a filtered.ink output (use viewbox and coordinates as is)
                    let canvasXRatio = canvasX / importImgX
                    let canvasYRatio = canvasY / importImgY
                    if (canvasXRatio > canvasYRatio) {
                        document.getElementById("main-canvas").setAttribute("viewBox", `${viewBox[0]} ${viewBox[1]} ${canvasX / canvasYRatio} ${viewBox[3]}`)
                    }
                    else {
                        document.getElementById("main-canvas").setAttribute("viewBox", `${viewBox[0]} ${viewBox[1]} ${viewBox[2]} ${canvasY / canvasXRatio}`)
                    }
                    let elemsStyle = elems.getAttribute("style")
                    if (elemsStyle) {
                        let color = elemsStyle.split(": ")[1]
                        context.svg.style.backgroundColor = color
                        context.setState({currCanvasColor: color})
                    }
                }
                else { // otherwise, use existing viewbox and rescale new incoming coordinates
                    scale = importImgX / canvasX > importImgY / canvasY ? canvasX / importImgX : canvasY / importImgY
                    dx = Number(viewBox[0])
                    dy = Number(viewBox[1])
                }

                
                console.log(viewBox[0], viewBox[1], viewBox[2], viewBox[3])
            }

            Array.from(elems.children).forEach(function(e) {
                if (e.nodeName === "g") {
                    if (e.getAttribute("id") === "sketchGroup") { // imported from a filtered.ink output (keep layers)
                        if (e.children.length >= 1 && e.children[0].nodeName === "g") { 
                            context.props.layerspageRef.current.clearLayers(true)
                            var originalSketchGroup = document.getElementById("sketchGroup")
                            originalSketchGroup.replaceChildren()
                        }
                        Array.from(e.children).forEach(function(layer) {
                            if (layer.nodeName === "g") {
                                let layerID = layer.getAttribute("id")
                                let layerStyle = layer.getAttribute("style")
                                let layerOpacity = layer.getAttribute("opacity")
                                let layerFilterID = layer.getAttribute("filter")
                                let layerDepth = layer.getAttribute("depth") ? Number(layer.getAttribute("depth")) : 1
                                let layerAudio = document.getElementById(`${layerID}___audio`)
                                let layerTransform = layer.getAttribute("separatedTransform")
                                layerFilterID = layerFilterID ? layerFilterID.split("#")[1].split("-!!")[0] : "empty"

                                context.props.layerpageHelper("add", layerID, layerFilterID, {"depth": layerDepth}) 
                                context.primarySketch.addSVGGroup(layerID, layerDepth)
                                
                                if (layerStyle) {
                                    context.props.layerpageHelper("change visibility", layerID, layerFilterID, {"isVisible": false}) 
                                    context.primarySketch.currentLayer.node.setAttribute("style", layerStyle)
                                }
                                if (layerOpacity) {
                                    context.props.layerpageHelper("change opacity", layerID, layerFilterID, {"opacityVal": layerOpacity})
                                    context.primarySketch.currentLayer.node.setAttribute("opacity", layerOpacity)
                                }
                                if (layerAudio) {
                                    context.props.layerspageRef.current.uploadAudio(layerAudio.getAttribute("src"), layerID, false)
                                }
                                if (layerTransform){
                                    let args = layerTransform.split(',').map(parseFloat);
                                    let baseTranslate = args.slice(0, 2);
                                    let baseScale = args.slice(2, 4);
                                    
                                    // let parallaxTranslate = args.slice(4, 6); // don't import parallax
                                    // let parallaxScale = args.slice(6, 8);
                                    let parallaxTranslate = [0, 0];
                                    let parallaxScale = [1, 1];

                                    context.props.layerpageHelper("update layer transformations", layerID, layerFilterID, {
                                        baseTranslate: baseTranslate, baseScale: baseScale,
                                        parallaxTranslate: parallaxTranslate, parallaxScale: parallaxScale,
                                    });
                                }
                                Array.from(layer.children).forEach(function(layerChild) {
                                    if (layerChild.nodeName === "filter") {
                                        let layerFilterID = layerChild.getAttribute("id").split("-!!")[0]
                                        context.primarySketch.changeSVGGroupFilter(layerID, layerFilterID, false, layerChild)
                                    }
                                    else {
                                        // <g> is a gradient group which we won't insert here
                                        if(layerChild.hasAttribute('gradient-overlay')){
                                            ; // do nothing
                                        } 

                                        // <g> is not a gradient, check if it has any gradients and then process/import it
                                        else {
                                            let gradientIds = [];
                                            if(layerChild.hasAttribute('gradient-ids')){
                                                gradientIds = layerChild.getAttribute('gradient-ids').split(',')
                                            }
                                            if(gradientIds[0] === '') gradientIds = undefined; // no gradients actually loaded into attribute gradient-ids
                                            sketchpage.primarySketch.processImportedStroke(layerChild, "imported", scale, dx, dy, e, gradientIds)
                                        }
                                    }
                                })
                            }
                            else {
                                // <g> is a gradient group which we won't insert here
                                if(layer.hasAttribute('gradient-overlay')){
                                    ; // do nothing
                                } 
                                // <g> is not a gradient, check if it has any gradients and then process/import it
                                else {
                                    let gradientIds = [];
                                    if(layer.hasAttribute('gradient-ids')){
                                        gradientIds = layer.getAttribute('gradient-ids').split(',')
                                    }
                                    if(gradientIds[0] === '') gradientIds = undefined; // no gradients actually loaded into attribute gradient-ids
                                    sketchpage.primarySketch.processImportedStroke(layer, "imported", scale, dx, dy, e, gradientIds)
                                }
                            }
                        })
                    }
                    else { // imported from other source (flatten layers)

                        // import color palette 
                        if(e.id === '[[filtered.ink-color-palette-data]]'){
                            let rawHexColors = [...e.children].map(child => child.id);
                            for(let c of rawHexColors){
                                const args = c.split('-');
                                const i = parseInt(args[0]), j = parseInt(args[1]);
                                if(args[2] !== 'none') {
                                    context.colorPaletteRef.current.setColor(args[2], i, j)
                                }
                            }
                            return;
                        }

                        // import waypoints
                        if(e.id === '[[filtered.ink-waypoint-data]]'){
                            context.setState({waypointDialogOpen: true}, () => {
                                try {
                                    let waypointIDToPortalIDs = {}
                                    for (const key in context.state.depthToTeleportationMap) {
                                        let teleports = context.state.depthToTeleportationMap[key]
                                        for (let i = 0; i < teleports.length; i++) {
                                            let waypointID = teleports[i]['waypointID']
                                            let portalID = teleports[i]['portalID']
                                            if (waypointIDToPortalIDs[waypointID]) {
                                                waypointIDToPortalIDs[waypointID].push(portalID)
                                            }
                                            else {
                                                waypointIDToPortalIDs[waypointID] = [portalID]
                                            }
                                        }
                                    }
                                    context.waypointRef.current.clearWaypoints()
                                    let rawWaypointData = [...e.children].map(child => child.id)
                                    let patterns = document.querySelector('defs').childNodes
                                    for (const [index, w] of rawWaypointData.entries()) {
                                        const args = w.split('==');
                                        const waypoint = JSON.parse(args[2])
                                        if (patterns[index+1].id === waypoint.id) {
                                            waypoint.url = patterns[index+1].childNodes[0].href.baseVal
                                        }
                                        if (waypoint.id in waypointIDToPortalIDs) waypoint.portalIDs = waypointIDToPortalIDs[waypoint.id]
                                        context.waypointRef.current.addWaypointFromImport(waypoint)
                                    }
                                }
                                catch(err) {
                                    console.log(err)
                                }
                            })
                        }

                        else if(e.id === '[[filtered.ink-sensitivity-data]]'){
                            const zoom_n = parseFloat(e.getAttribute('zoom')) || 1;
                            const pan_n = parseFloat(e.getAttribute('pan')) || 1;
                            context.setState({
                                zoomSensitivity: zoom_n,
                                panSensitivity: pan_n
                            });
                        }

                        let unraveledElems = unravelGroup(e, [])
                        Array.from(unraveledElems).forEach(function(stroke) {
                            sketchpage.primarySketch.processImportedStroke(stroke, "imported", scale, dx, dy, null, [])
                        })
                    }
                }
                else if (e.nodeName === "path") {
                    sketchpage.primarySketch.processImportedStroke(e, "imported", scale, dx, dy, null, [])
                }
                else if (e.nodeName === "text") {
                    sketchpage.primarySketch.processImportedStroke(e, "imported", scale, dx, dy, null, [])
                }
                else if (e.nodeName === "filter") {
                    let f = sketchpage.primarySketch.draw.svg(e.outerHTML)
                    f.node.lastChild.type = "preset"
                    if (template) {
                        sketchpage.props.addToListFromDOM(e)
                    }
                    filterIDToIndex[f.node.lastChild.id] = counter
                    counter += 1
                }
                else if(e.nodeName === "defs"){
                    const defsElem = sketchpage.primarySketch.svg.querySelector('defs');
                    Array.from(e.children).forEach(tag => {
                        if(tag.nodeName === 'radialGradient' || tag.nodeName === 'linearGradient'){
                            defsElem.appendChild(tag);
                        }
                        else if (tag.nodeName === 'audio') {
                            defsElem.appendChild(tag);
                        }
                        else if (tag.nodeName === 'pattern' && tag.id.includes("waypoint")) {
                            defsElem.appendChild(tag);
                        }
                    })
                }
            })
            if (elems.getAttribute("id") !== "main-canvas") {
                sketchpage.primarySketch.translateAllPaths(-canvasX/2, -canvasY/2)
            }
            this.serializeToString();
        })
    }

    verifyJSON() {
        try {
            let json = JSON.parse(this.props.currStrokeCode)
            this.primarySketch.addPathFromCode(json)
        }
        catch (err) {
            this.setState({ snackbarOpen: true })
        }
    }

    deleteGradientGroup(){
        this.state.gradientToDelete.ref();
        this.props.openGradientDialogAtIndex(-1);
        this.props.sendLog("closed_gradient_filter_dialog");
    }

    closeGradientDialog(){
        this.state.gradientToClose.ref();
        this.props.openGradientDialogAtIndex(-1);
        this.props.sendLog("closed_gradient_filter_dialog")
        this.isDraggingGradient = false;
        this.cachedOffset = [0, 0];
    }

    closeConverterDialog(){
        this.state.gradientToClose.ref();
        this.props.openGradientDialogAtIndex(-1);
        this.props.sendLog("closed_gradient_filter_dialog")
        this.isDraggingGradient = false;
        this.cachedOffset = [0, 0];
    }

    handleColorPaletteToggle(){
        if(this.props.paletteDialogOpenIndex !== -1){
            this.props.openPaletteDialogAtIndex(-1);
        } else {
            this.props.openPaletteDialogAtIndex(1);
        }
    }

    clearColorPalette(){
        this.colorPaletteRef.current.clearColorPalette(() => {
            this.serializeToString();
        });
    }

    setWaypointDialogOpen(isOpen) {
        this.waypointRef.current.stopDrawingWaypoint()
        this.setState({ waypointDialogOpen: isOpen})
    }

    startConversion(){
        this.setState({hasPolyline: false});
        this.props.openConverterDialogAtIndex(0);
        document.getElementById('main-canvas').pauseAnimations();
        this.props.toggleAllFilterVisibility(true);
        
        this.primarySketch.sequentialConvert(() => {
            this.props.toggleAllFilterVisibility(false);
            document.getElementById('main-canvas').unpauseAnimations();    
            this.props.openConverterDialogAtIndex(-1);
        });
    }

    addToDepthToTeleportationMap(depth, portalID, waypointID) {
        let currDepthToTeleportationMap = this.state.depthToTeleportationMap
        let teleport = {"portalID": portalID, "waypointID": waypointID}
        if (depth in currDepthToTeleportationMap) {
            currDepthToTeleportationMap[depth].push(teleport);
        } else {
            currDepthToTeleportationMap[depth] = [teleport];
        }
        this.setState({depthToTeleportationMap: currDepthToTeleportationMap}, () => {})
    }

    removeFromDepthToTeleportationMap(portalIDs, detachPortalIDs=true) {
        if (detachPortalIDs) {
            for (let i = 0; i < portalIDs.length; i++) {
                this.primarySketch.detachPortalID(portalIDs[i])
            }
        }
        const portalIDSet = new Set(portalIDs)
        let currDepthToTeleportationMap = this.state.depthToTeleportationMap
        for (const key in currDepthToTeleportationMap) {
            let teleports = currDepthToTeleportationMap[key]
            const filteredTeleports = teleports.filter((t) => !portalIDSet.has(t.portalID))
            currDepthToTeleportationMap[key] = filteredTeleports
        }
        this.setState({depthToTeleportationMap: currDepthToTeleportationMap})
    }

    render() {        
        return (
            <div id="sketchpage">
                <Topbar verifyJSON={this.verifyJSON} 
                    importSVG={this.importSVG} 
                    color={this.state.currColor}
                    drawMode={this.drawMode} 
                    colorMode={this.colorMode}
                    filterMode={this.filterMode}
                    eraseMode={this.eraseMode} 
                    gradientMode={this.gradientMode}
                    moveMode={this.moveMode} 
                    translateLayerMode={this.translateLayerMode}
                    scaleLayerMode={this.scaleLayerMode}
                    panMode={this.panMode}
                    undo={this.undo} 
                    redo={this.redo} 
                    clear={this.clear} 
                    download={this.download}
                    changeColor={this.changeColor}
                    changeStrokeSize={this.changeStrokeSize}
                    strokeSize={this.state.currStrokeSize}
                    opacity={this.state.opacity}
                    changeOpacity={this.changeOpacity}
                    pickColor={this.pickColor}
                    sendLog={this.props.sendLog}
                    clearList={this.props.clearList}
                    moveToBackMode={this.moveToBackMode}
                    moveToFrontMode={this.moveToFrontMode}
                    canvasZoom={this.canvasZoom}
                    currCanvasColor={this.state.currCanvasColor}
                    changeCanvasColor={this.changeCanvasColor}
                    
                    paletteDialogOpenIndex={this.props.paletteDialogOpenIndex}
                    handleColorPaletteToggle={this.handleColorPaletteToggle}
                    clearColorPalette={this.clearColorPalette}

                    // stabilizer variables
                    smoothing={this.state.smoothing}
                    cornerCorrection={this.state.cornerCorrection}
                    selectedStabilizer={this.state.selectedStabilizer}
                    handleStabilizerOption={this.handleStabilizerOption}
                    handleStabilizerSmoothingChange={this.handleStabilizerSmoothingChange}
                    handleStabilizerCornerCorrectionChange={this.handleStabilizerCornerCorrectionChange}
                    variableWidth={this.state.variableWidth}
                    handleVariableWidthChange={this.handleVariableWidthChange}

                    // waypoint variables
                    setWaypointDialogOpen={this.setWaypointDialogOpen}
                    waypointDialogOpen={this.state.waypointDialogOpen}
                    waypointRef={this.waypointRef}

                    // zoom + pan variables
                    exportZoomAndPan={this.state.exportZoomAndPan}
                    toggleExportZoomAndPan={() => this.setState({exportZoomAndPan: !this.state.exportZoomAndPan})}
                    zoomSensitivity={this.state.zoomSensitivity}
                    changeZoomSensitivity={(e, v) => this.setState({zoomSensitivity: v})}
                    panSensitivity={this.state.panSensitivity}
                    changePanSensitivity={(e, v) => this.setState({panSensitivity: v})}
                    resetPanZoomSettings={() => this.setState({
                        exportZoomAndPan: true,
                        zoomSensitivity: 1,
                        panSensitivity: 1
                    })}
                />
                <div id="svg"
                    // replace mouse with pointer events for stylus pressure
                    // onMouseDown={(e) => this.handleMouseDown(e)}
                    // onMouseMove={(e) => this.handleMove(e)}
                    onPointerDown={(e) => this.handleMouseDown(e)}
                    onPointerMove={(e) => this.handleMove(e)}

                    onMouseLeave={(e) => this.handleMouseUp(e, 'mouse', true)}
                    onMouseUp={(e) => this.handleMouseUp(e, 'mouse')}
                    onTouchCancel={(e) => this.handleMouseUp(e, 'mobile')}
                    onTouchEnd={(e) => this.handleMouseUp(e, 'mobile')}
                    
                    // temp workaround for pointer/touch dual-firing
                    // onTouchMove={(e) => this.handleMove(e)}
                    // onTouchStart={(e) => this.handleMouseDown(e)}
                >
                    {this.props.parallaxOn ? <div className='float-top-right'>Depth: {(this.state.depth / 5).toFixed(2)}</div> : <span></span>}
                </div>
                <svg id="temporary-new-filter-holder">
                    {this.state.initializedFilter}
                </svg>
                <Snackbar open={this.state.snackbarOpen} autoHideDuration={2000} onClose={() => this.setState({ snackbarOpen: false })}>
                    <MuiAlert severity="error" elevation={6} variant="filled">
                        SVG code invalid!
                    </MuiAlert>
                </Snackbar>
                <Dialog
                    maxWidth={false}
                    open={this.props.gradientDialogOpenIndex !== -1}
                    onClose={() => {}}
                    className="gradient-dialog"
                    onPointerMove={(e) => {
                        if(!this.isDraggingGradient) return;

                        const dialog = document.querySelector('.gradient-dialog .MuiDialog-paper');
                        const ds = dialog.style;
                        const nx = e.clientX;
                        const ny = e.clientY;
                        ds.marginTop = `${(ny - this.cachedOffset[1]) * 2 + this.previousOffset[1]}px`;
                        ds.marginLeft = `${nx - this.cachedOffset[0] + this.previousOffset[0]}px`;
                    }}
                    >
                    <DialogTitle
                        onPointerDown={(e) => {
                            this.isDraggingGradient = true;
                            this.cachedOffset = [
                                e.clientX,
                                e.clientY
                            ];

                            const dialog = document.querySelector('.gradient-dialog .MuiDialog-paper');
                            const ds = dialog.style;
                            this.previousOffset = [ds.marginLeft, ds.marginTop].map(s => parseFloat(s.slice(0, -2)));
                            if(isNaN(this.previousOffset[0])) this.previousOffset = [25, 0]; // default in css
                        }}
                        onPointerUp={() => {
                            this.isDraggingGradient = false;
                        }}
                        className="gradient-dialog-title">
                        {"Edit Gradient Group"}
                    </DialogTitle>
                    <DialogContent dividers>
                        <GradientDialog
                            selectedPath={this.state.gradientSelectedPath}
                            primarySketch={this.primarySketch}
                            open={this.props.gradientDialogOpenIndex}
                            serializeToString={this.serializeToString}
                            closeRef={this.state.gradientToClose}
                            deleteRef={this.state.gradientToDelete}
                            draw={this.draw}>
                        </GradientDialog>
                    </DialogContent>
                    <div className="pad-top-and-sides flex-row">
                        <div className='flex-row'>
                            <div className='filter-card-btn' onClick={this.deleteGradientGroup}>
                                <IconButton
                                    color='inherit'
                                    onFocus={(event) => event.stopPropagation()}
                                    aria-label="delete gradient"
                                    size="small">
                                    <DeleteForeverIcon/>
                                </IconButton>
                                <span className='pad-top-small'>Delete Gradient Group</span>
                            </div>

                        </div>
                        <div className='filter-card-btn margin-left' onClick={() => this.closeGradientDialog()}>
                                <IconButton
                                    onFocus={(event) => event.stopPropagation()}
                                    aria-label="close editor dialog"
                                    size="small">
                                    <CloseIcon/>
                                </IconButton>
                            <span className='pad-top-small'>Close</span>
                        </div>
                    </div>
                    <DialogActions>
                    </DialogActions>
                </Dialog>

                <Dialog
                    maxWidth={false}
                    open={this.props.converterDialogOpenIndex !== -1}
                    onClose={() => this.closeGradientDialog()}
                    className="conversion-dialog">
                    <DialogTitle>
                        {"Smoothing legacy paths..."}
                    </DialogTitle>
                    <DialogContent dividers>
                        <Typography>{`Finished converting ${this.state.curConverterStroke} of ${this.state.totalConverterStrokes} paths`}</Typography>
                        <LinearProgress className='progress-bar' variant="determinate" value={this.state.curConverterStroke / this.state.totalConverterStrokes * 100}/>
                        <Typography className='centered-label'>{"(This is a one-time process!)"}</Typography>
                    </DialogContent>
                </Dialog>

                {this.props.paletteDialogOpenIndex !== -1 && <ColorPalette
                    ref={this.colorPaletteRef}
                    eventHandler={this.state.colorPaletteEventHandler}
                    sketchpageRef={this}
                    changeColor={this.changeColor}
                    currColor={this.state.currColor}
                    colorArray={this.state.colorArray}
                    serializeToString={this.serializeToString}
                ></ColorPalette>}

                {<Waypoints
                    ref={this.waypointRef}
                    waypointMode={this.waypointMode}
                    waypointDialogOpen={this.state.waypointDialogOpen}
                    sketchpageRef={this}
                    serializeToString={this.serializeToString}
                    parallaxOn={this.props.parallaxOn}
                    draw={this.draw}
                    setViewBox={this.setViewBox}
                    depth={this.state.depth}
                    position={this.position}
                    setParallax={this.setParallax}
                    removeFromDepthToTeleportationMap={this.removeFromDepthToTeleportationMap}
                ></Waypoints>}

                {this.state.hasPolyline && <Card
                    style={{backgroundColor: "rgb(250, 239, 201)"}}
                    className='converter-card'>
                    Legacy strokes detected ... <Button
                        onClick={() => this.startConversion()}
                        className='converter-button'
                        style={{backgroundColor: "white"}}
                        variant="outlined">
                        Convert Now!
                    </Button>
                </Card>}
            </div>
        )
    }
}