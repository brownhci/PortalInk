import React from 'react'
import ToggleButton from '@material-ui/lab/ToggleButton';
import ToggleButtonGroup from '@material-ui/lab/ToggleButtonGroup';
import FilterParamEditor from './filterparameditor';
import DirectionsRunIcon from '@material-ui/icons/DirectionsRun';
import LayersIcon from '@material-ui/icons/Layers';
import { parseExtractedJSON, makeid } from "../util"
import TextField from '@material-ui/core/TextField';
import ReactFlow, { ReactFlowProvider, updateEdge, removeElements, addEdge, isNode, isEdge} from 'react-flow-renderer';
import { nodeTypes } from './nodegraph/customgraphnodes'

import {GraphSelect} from './nodegraph/graphselect'

import './generatedfilter.css'
import  './nodegraph/customgraphnodes.css'

import { PatternHandler } from '../patterngenerators/patternparamhandler';

class FilterEditor extends React.Component {
    constructor(props) {
        super(props)
        this.originalFilterWhenOpened = JSON.parse(JSON.stringify(this.props.params))
        let paramNames = {}
        let parsedParams = this.props.params.map((p, index) => {
            p = JSON.parse(p)
            if (p["child"] !== undefined && !Array.isArray(p["child"])) {
                p["child"] = JSON.parse(p["child"])
            }
            paramNames[index] = Object.keys(p).filter(k => k !== "filterName" && k !== "child" && k !== "animation")
            return p
        })
        let preview = this.props.filterPreview(-1, parsedParams)
        this.idToIndexMap = {}
        this.nodePositions = {}
        this.state = {
            filterID: this.props.id,
            previewFilter: preview,
            addMode: "primitives",
            selectedEffect: "",
            extractedInfo: '',
            jsonExtracted: false,
            selectedFilterIndex: -1,
            selectedFilterName: "",
            mouseDownSVG: false,
            selectedSpotlightType: "source",
            nodeGraphElements: this.convertToNodeElements(parsedParams, true),
            animationAnchor: null,
            selectedAnimationState: -1,
            paramToAnimate: "",
            selectedElements: [],
            selectedLightSourceType: ""
        }
        this.currMouseLocation = [0, 0]
        this.filterTypes = ["feBlend", "feColorMatrix", "feComponentTransfer", "feComposite", "feConvolveMatrix", "feDiffuseLighting", "feDisplacementMap", "feDropShadow", "feFlood", "feGaussianBlur", "feMorphology", "feSpecularLighting", "feTurbulence"]
        this.effectTypes = ["+ Import noise", "+ Import colors"]
        this.filterSelectOptions = {
            "stitchTiles": ["stitch", "noStitch"],
            "attributeName": paramNames
        }
        this.graphSelectRef = React.createRef()
        this.editFilterRef = React.createRef()
        this.filterParamEditorRef = React.createRef()

        this.changeAnimatingParamRef = {ref: () => {}};
        this.previousAnimatingParam = "undefined"; // cannot be "" because of edge case (?)
    }

    componentDidMount() {
        this.setBindings()
        this.refreshPreview()
    }

    setBindings() {
        this.refreshPreview = this.refreshPreview.bind(this)
        this.setSpotlightType = this.setSpotlightType.bind(this)
        this.setAnimationAnchor = this.setAnimationAnchor.bind(this)
        this.updateAnimationState = this.updateAnimationState.bind(this)
        this.switchActiveBranch = this.switchActiveBranch.bind(this)
        this.updateSelectedLightSourceType = this.updateSelectedLightSourceType.bind(this)

        this.duplicateElement = this.duplicateElement.bind(this)
    }

    updateSelectedLightSourceType(selectedFilter) {
        if (selectedFilter.filterName === "feDiffuseLighting" || selectedFilter.filterName === "feSpecularLighting") {
            let parsedLight = JSON.parse(selectedFilter["child"])
            this.setState({selectedLightSourceType: parsedLight.filterName})
        }
        else {
            this.setState({selectedLightSourceType: ""})
        }
    }

    /**
     *
     * @param {*} parsedParams filter params to be converted into nodes
     * @param {*} isNew indicates whether the node graph is newly opened
     * @returns
     */
    convertToNodeElements(parsedParams, isNew=false) {
        let elements = [{id: 'SourceGraphic', type: 'customInput', style: {'border': '2px solid #c3c3c3', 'pointerEvents': 'none'}, data: {label: <span>Input Ink</span>}, position: {x: 50, y: 10}}]
        // add nodes
        for (let i = 0; i < parsedParams.length; i++) {
            this.idToIndexMap[parsedParams[i].result] = i
            if (parsedParams[i].result === undefined) {
                parsedParams[i].result = makeid(6)
            }
            let customType = parsedParams[i].in === undefined ? 'noInput' : 'customDefault'
            if (parsedParams[i].in2 !== undefined) {
                customType = 'twoInput'
            }
            if (isNew || this.nodePositions[parsedParams[i].result] === undefined) {
                this.nodePositions[parsedParams[i].result] = {x: 200+(i%2*-1)*50, y: 10+(i+1)*80}
            }
            let newPosition = this.nodePositions[parsedParams[i].result]
            elements.push({id: parsedParams[i].result, type: customType, data: {label:
                <div className={(parsedParams[i].animation === undefined || parsedParams[i].animation === '{}') ? "" : "bounce"}>{(() => {
                    // convert raw SVG filter name into displayable name
                    if(parsedParams[i].filterName !== 'feImage'){
                        return this.removeFe(parsedParams[i].filterName)
                    } else{
                        // const type = parsedParams[i].patterntype;
                        // return type[0].toUpperCase() + type.slice(1) + " Pattern";
                        return "Pattern Base"
                    }
                })()}</div>
            }, position: newPosition})
        }
        // add edges
        for (let i = 0; i < parsedParams.length; i++) {
            if (parsedParams[i].in !== undefined && parsedParams[i].in !== "") {
                elements.push({id: 'ein1'+parsedParams[i].in+'-'+parsedParams[i].result, targetHandle: 'a-in', source: parsedParams[i].in, target: parsedParams[i].result, animated: true})
            }
            if (parsedParams[i].in2 !== undefined && parsedParams[i].in2 !== "") {
                elements.push({id: 'ein2'+parsedParams[i].in2+'-'+parsedParams[i].result, targetHandle: 'b-in', source: parsedParams[i].in2, target: parsedParams[i].result, animated: true})
            }
        }
        return elements
    }

    highlightActivePrimitives(parsedParams) {
        let highlightColor = "#292121"
        let activeNodeIDs = parsedParams.length === 0 ? new Set(["SourceGraphic"]) : new Set([parsedParams[parsedParams.length-1].result])
        for (let i = parsedParams.length-1; i >= 0; i--) {
            let elem = parsedParams[i]
            if (activeNodeIDs.has(elem.result)) {
                if (elem.in !== undefined) {
                    activeNodeIDs.add(elem.in)
                }
                if (elem.in2 !== undefined) {
                    activeNodeIDs.add(elem.in2)
                }
            }
        }
        let elements = this.state.nodeGraphElements
        for (let i = 0; i < elements.length; i++) {
            let elem = elements[i]
            if (isNode(elem)) {
                if (activeNodeIDs.has(elem.id)) {
                    if (elem.style) {
                        elem.style['backgroundColor'] = highlightColor
                        elem.style['color'] = 'white'
                    }
                    else {
                        elem.style = {'backgroundColor': highlightColor, 'color': 'white'}
                    }
                }
                else {
                    elem.style = elem.id === "SourceGraphic" ? {'backgroundColor': 'rgb(100,100,100)', 'border': '2px solid white', 'pointerEvents': 'none'} : {}
                }
                elements[i] = elem
            }
            else {
                if (activeNodeIDs.has(elem.source) && activeNodeIDs.has(elem.target)) {
                    elem.style = {'stroke': highlightColor}
                }
                else {
                    elem.style = {}
                }
                elements[i] = elem
            }
        }
        this.setState({nodeGraphElements: elements})
    }

    switchActiveBranch(elementSelected) {
        let parsedParams = this.props.params.map(p => {
            p = JSON.parse(p)
            if (p["child"] !== undefined && !Array.isArray(p["child"])) {
                p["child"] = JSON.parse(p["child"])
            }
            return p
        })
        let currElemID = elementSelected[0].id
        if (isNode(elementSelected[0])) {
            for (let i = 0; i < parsedParams.length; i++) {
                let elem = parsedParams[i]
                if (elem.in === currElemID) {
                    currElemID = elem.result
                }
                else if (elem.in2 === currElemID) {
                    currElemID = elem.result
                }
            }
            this.props.moveFilterPrimitivesToEnd(this.props.index, new Set([this.idToIndexMap[currElemID]])).then(() => {
                this.refreshPreview()
                this.setState({selectedFilterIndex: this.idToIndexMap[currElemID]})
                for (let j = 0; j < this.state.selectedElements.length; j++) {
                    let el = this.state.selectedElements[j]
                    if (isNode(el)) {
                        this.setState({selectedFilterIndex: this.idToIndexMap[el.id]}, () => {
                            this.updateSelectedLightSourceType(JSON.parse(this.props.params[this.state.selectedFilterIndex]))
                        })
                    }
                }

            })
        }
    }

    refreshPreview(callback, depthIndex=-1) {
        let parsedParams = this.props.params.map(p => {
            p = JSON.parse(p)
            if (p.depthEffects && depthIndex > -1) {
                p = JSON.parse(p.depthEffects)[depthIndex]
            }
            if (p["child"] !== undefined && !Array.isArray(p["child"])) {
                p["child"] = JSON.parse(p["child"])
            }
            return p
        })
        let newPreview = this.props.filterPreview(-1, parsedParams)
        this.setState({previewFilter: newPreview})
        this.setState({nodeGraphElements: this.convertToNodeElements(parsedParams)}, () =>  {
            this.highlightActivePrimitives(parsedParams)
            if(callback) callback();
        })
    }

    // callback is used in multi-primitive connection scenario
    // mainly with the pattern templates for now...
    addFilter(filterIndex, newFilter, callback) {
        if (Array.isArray(newFilter)) {
            for (var i = 0; i < newFilter.length; i++) {
                if (i === newFilter.length - 1) {
                    this.props.addFilterToSet(this.props.index, newFilter[i]).then(() => {
                        this.refreshPreview(callback)
                    })
                }
                else {
                    this.props.addFilterToSet(this.props.index, newFilter[i])
                }
            }
        }
        else {
            this.props.addFilterToSet(this.props.index, newFilter).then(() => {
                let newID = JSON.parse(newFilter).result
                this.refreshPreview(callback)
                for (let j = 0; j < this.state.nodeGraphElements.length; j++) {
                    if (newID === this.state.nodeGraphElements[j].id) {
                        this.onElementClick(null, this.state.nodeGraphElements[j])
                        this.graphSelectRef.current(this.state.nodeGraphElements[j])
                        break
                    }
                }
            })
        }
    }

    removeFilter(filterComponentIndex) {
        this.props.removeFilterFromSet(this.props.index, filterComponentIndex).then(() => {
            this.refreshPreview()
        })
    }

    getEmptyFilter(filterType, patterndata = null, isPattern = false) {
        let previousComponentObject;
        let previousComponent = "SourceGraphic"
        if (this.props.params.length > 0) {
            previousComponentObject = JSON.parse(this.props.params[this.props.params.length - 1])
            previousComponent = previousComponentObject['result']
        }
        let dict
        if (filterType === "feTurbulence") {
            dict = { filterName: filterType, baseFrequency: "0.1 0.1", numOctaves: 1, seed: 0, stitchTiles: "noStitch", result: makeid(6) }}
        else if (filterType === "feBlend") {
            dict = { filterName: filterType, mode: "multiply", in: previousComponent, in2: "SourceGraphic", result: makeid(6) }}
        else if (filterType === "feColorMatrix") {
            dict = { filterName: filterType, values: "1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 1 0", type: "matrix", in: previousComponent, result: makeid(6) }}
        else if (filterType === "feComponentTransfer") {
            let children = [JSON.stringify({filterName: "feFuncR", type: "linear", slope: 0.1, intercept: 0.1}), JSON.stringify({filterName: "feFuncG", type: "linear", slope: 0.1, intercept: 0.1}), JSON.stringify({filterName: "feFuncB", type: "linear", slope: 0.1, intercept: 0.1})]
            dict = { filterName: filterType, in: previousComponent, result: makeid(6), child: children}}
        else if (filterType === "feComposite") {
            let newNodeIn = previousComponent;
            let newNodeIn2 = "SourceGraphic";
            if(previousComponentObject && previousComponentObject.filterName === 'feImage') {
                newNodeIn = "SourceGraphic";
                newNodeIn2 = previousComponent;
            } 
            
            dict = { filterName: filterType, operator: "in",  in: newNodeIn, in2: newNodeIn2, result: makeid(6) }}
        else if (filterType === "feConvolveMatrix") {
            dict = { filterName: filterType, kernelMatrix: "1 0 0 0 1 0 0 0 1", in: previousComponent, result: makeid(6) }}
        else if (filterType === "feDiffuseLighting") {
            dict = { filterName: filterType, lightingColor: "F9F7EF", mode: "multiply", surfaceScale: 1, diffuseConstant: 1, in: previousComponent, result: makeid(6), child: JSON.stringify({ filterName: "feDistantLight", azimuth: 60, elevation: 50 })}}
        else if (filterType === "feDisplacementMap") {
            dict = { filterName: filterType, scale: 1, xChannelSelector: "R", yChannelSelector: "G", in: "SourceGraphic", in2: previousComponent, result: makeid(6) }}
        else if (filterType === "feDropShadow") {
            dict = { filterName: filterType, dx: 0, dy: 0, stdDeviation: 0.1, in: previousComponent, result: makeid(6) }}
        else if (filterType === "feFlood") {
            dict = { filterName: filterType, 'flood-color': "#392e76", floodOpacity: 0.9, result: makeid(6) }}
        else if (filterType === "feGaussianBlur") {
            dict = { filterName: filterType, stdDeviation: 5, in: previousComponent, result: makeid(6)}}
        else if (filterType === "feMorphology") {
             dict = { filterName: filterType, operator: "dilate", radius: 2, in: previousComponent, result: makeid(6) }}
        else if (filterType === "feSpecularLighting") {
            dict = { filterName: filterType, lightingColor: "F9F7EF", surfaceScale: 25, specularConstant: 2, specularExponent: 1, in: previousComponent, result: makeid(6), child: JSON.stringify({ filterName: "feDistantLight", azimuth: 45, elevation: 10 })}}
        
        else if (isPattern){
            // TEMP: don't hard-code the width/height values, fix later
            const svgID = makeid(8);
            const svgDefElem = document.querySelector('defs');

            const mainSVGCanvas = document.getElementById('main-canvas')
            const dimensions = [mainSVGCanvas.width.baseVal.value, mainSVGCanvas.height.baseVal.value];
            const newHandler = new PatternHandler(
                'grid', patterndata, svgID, svgDefElem, this.props.patternHandlers, dimensions,
                this.props.updateFilterCode
            );
            this.props.patternHandlers.set(svgID, newHandler)

            if(filterType === 'patternGrid'){
                dict = { 
                    filterName: "feImage", href: `#${svgID}`, result: makeid(6), 
                    patterntype: 'grid', type: patterndata.type, cellwidth: patterndata.cellwidth, cellheight: patterndata.cellheight, 
                    dx: patterndata.dx, dy: patterndata.dy, sx: patterndata.sx, sy: patterndata.sy,
                    rotation: patterndata.rotation, unittype: patterndata.unittype, unitrot: patterndata.unitrot
                };

            } else if(filterType === 'patternLine'){
                dict = { filterName: "feImage", href: `#${svgID}`, result: makeid(6), 
                    patterntype: 'line', dx: patterndata.dx, linewidth: patterndata.linewidth, angle: patterndata.angle}}
        }

        else {
            dict = { filterName: filterType, result: "" }}

        return JSON.stringify(dict)
    }

    addModeChange(newValue) {
        if (newValue !== null) {
            this.setState({addMode: newValue})
            this.setState({selectedEffect: ""})
        }
    }

    displayList() {
        if (this.state.addMode === "primitives") {
            return (
                <div id="primitives-list">
                    <div className="primitive-category">Combine</div>
                    <div className="filter-names" onClick={() => this.addFilter(this.props.index, this.getEmptyFilter("feBlend"))}> + Blend </div>
                    <div className="filter-names" onClick={() => this.addFilter(this.props.index, this.getEmptyFilter("feComposite"))}> + Composite </div>
                    <div className="primitive-category">Change color</div>
                    <div className="filter-names" onClick={() => this.addFilter(this.props.index, this.getEmptyFilter("feColorMatrix"))}> + Color Matrix <DirectionsRunIcon style={{ fontSize: 15, float: 'right' }} /></div>
                    <div className="filter-names" onClick={() => this.addFilter(this.props.index, this.getEmptyFilter("feComponentTransfer"))}> + Component Transfer </div>
                    <div className="filter-names" onClick={() => this.addFilter(this.props.index, this.getEmptyFilter("feFlood"))}> + Flood <DirectionsRunIcon style={{ fontSize: 15, float: 'right' }} /><LayersIcon style={{ fontSize: 15, float: 'right' }} /></div>
                    <div className="primitive-category">Lighting</div>
                    <div className="filter-names" onClick={() => this.addFilter(this.props.index, this.getEmptyFilter("feDiffuseLighting"))}> + Diffuse Light <DirectionsRunIcon style={{ fontSize: 15, float: 'right' }} /></div>
                    <div className="filter-names" onClick={() => this.addFilter(this.props.index, this.getEmptyFilter("feSpecularLighting"))}> + Specular Light <DirectionsRunIcon style={{ fontSize: 15, float: 'right' }} /></div>
                    <div className="primitive-category">Distortion</div>
                    <div className="filter-names" onClick={() => this.addFilter(this.props.index, this.getEmptyFilter("feTurbulence"))}> + Turbulence <DirectionsRunIcon style={{ fontSize: 15, float: 'right' }} /></div>
                    <div className="filter-names" onClick={() => this.addFilter(this.props.index, this.getEmptyFilter("feMorphology"))}> + Morphology <DirectionsRunIcon style={{ fontSize: 15, float: 'right' }} /><LayersIcon style={{ fontSize: 15, float: 'right' }} /></div>
                    <div className="filter-names" onClick={() => this.addFilter(this.props.index, this.getEmptyFilter("feDisplacementMap"))}> + Displacement <DirectionsRunIcon style={{ fontSize: 15, float: 'right' }} /><LayersIcon style={{ fontSize: 15, float: 'right' }} /></div>
                    <div className="filter-names" onClick={() => this.addFilter(this.props.index, this.getEmptyFilter("feDropShadow"))}> + Drop Shadow <DirectionsRunIcon style={{ fontSize: 15, float: 'right' }} /><LayersIcon style={{ fontSize: 15, float: 'right' }} /></div>
                    <div className="filter-names" onClick={() => this.addFilter(this.props.index, this.getEmptyFilter("feGaussianBlur"))}> + Blur <DirectionsRunIcon style={{ fontSize: 15, float: 'right' }} /><LayersIcon style={{ fontSize: 15, float: 'right' }} /></div>
                    <div className="filter-names" onClick={() => this.addFilter(this.props.index, this.getEmptyFilter("feConvolveMatrix"))}> + Convolutions <DirectionsRunIcon style={{ fontSize: 15, float: 'right' }} /></div>
                </div>
            )
        } 

        else if(this.state.addMode === "patterns"){
            return (
                <div id="primitives-list">
                    <div className="primitive-category">Patterns</div>
                    <div className="filter-names" onClick={() => {
                        this.addFilter(this.props.index, this.getEmptyFilter("patternGrid", {
                            cellwidth: 25,
                            cellheight: 25,
                            dx: 50,
                            dy: 50,
                            sx: 0,
                            sy: 0,
                            rotation: 0,
                            unittype: "square",
                            unitrot: 0
                        }, true));                  
                    }}> + Pattern Base <DirectionsRunIcon style={{ fontSize: 15, float: 'right' }} /></div>

                    <div className="primitive-category">Templates</div>

                    <div className="filter-names" onClick={() => {
                        this.addFilter(this.props.index, this.getEmptyFilter("patternGrid", {
                            cellwidth: 5,
                            cellheight: 50,
                            dx: 20,
                            dy: 50,
                            sx: 0,
                            sy: 0,
                            rotation: 0,
                            unittype: "square",
                            unitrot: 0
                        }, true));  
                    }}> + Line Pattern <DirectionsRunIcon style={{ fontSize: 15, float: 'right' }} /></div>

                    <div className="filter-names" onClick={() => {
                        const checkers1 = this.getEmptyFilter("patternGrid", {
                            cellwidth: 20,
                            cellheight: 20,
                            dx: 40,
                            dy: 40,
                            sx: 0,
                            sy: 0,
                            rotation: 0,
                            unittype: "square",
                            unitrot: 0
                        }, true);
                        this.addFilter(this.props.index, checkers1);  

                        const checkers2 = this.getEmptyFilter("patternGrid", {
                            cellwidth: 20,
                            cellheight: 20,
                            dx: 40,
                            dy: 40,
                            sx: 20,
                            sy: 20,
                            rotation: 0,
                            unittype: "square",
                            unitrot: 0
                        }, true);
                        this.addFilter(this.props.index, checkers2);  

                        let composite1 = this.getEmptyFilter("feComposite");
                        let composite1Obj = JSON.parse(composite1);
                        composite1Obj.operator = 'over';
                        let editedComposite1Str = JSON.stringify(composite1Obj);
                        
                        this.addFilter(this.props.index, editedComposite1Str, () => {
                            const checkers1Obj = JSON.parse(checkers1);
                            const checkers2Obj = JSON.parse(checkers2);
    
                            this.onConnect({
                                source: checkers1Obj.result,
                                sourceHandle: 'a-out',
                                target: composite1Obj.result,
                                targetHandle: 'a-in'
                            });
                            this.onConnect({
                                source: checkers2Obj.result,
                                sourceHandle: 'a-out',
                                target: composite1Obj.result,
                                targetHandle: 'b-in'
                            });
                        });

                    }}> + Checkerboard Pattern <DirectionsRunIcon style={{ fontSize: 15, float: 'right' }} /></div>
                            
                    <div className="filter-names" onClick={() => {
                        const averageSpacing = 50;
                        const randomSign = () => Math.sign(Math.random() - 0.5);


                        const createRandGrid = (x, y) => this.getEmptyFilter("patternGrid", {
                            cellwidth: 6,
                            cellheight: 6,
                            dx: averageSpacing,
                            dy: averageSpacing,
                            sx: x + ((Math.random() + 0.5) * 6 * randomSign() | 0),
                            sy: y + ((Math.random() + 0.5) * 6 * randomSign() | 0),
                            rotation: 0,
                            unittype: "circle",
                            unitrot: 0
                        }, true);

                        const randomRotation = Math.random() * 360 | 0;
                        const grid1 = createRandGrid(15 - 2 + 2, 10 - 2 + 2).replace('rotation":0,', `rotation":${randomRotation},`);
                        const grid2 = createRandGrid(15 - 2 - 2, 40 + 2 + 2).replace('rotation":0,', `rotation":${randomRotation},`);
                        const grid3 = createRandGrid(35 + 2 - 2, 40 + 2 - 2).replace('rotation":0,', `rotation":${randomRotation},`);
                        const grid4 = createRandGrid(35 + 2 + 2, 10 - 2 - 2).replace('rotation":0,', `rotation":${randomRotation},`);
                        const grid5 = createRandGrid(25, 25).replace('rotation":0,', `rotation":${randomRotation},`);
                        const grid6 = createRandGrid(0, 25).replace('rotation":0,', `rotation":${randomRotation},`);
                        const grid1Obj = JSON.parse(grid1);
                        const grid2Obj = JSON.parse(grid2);
                        const grid3Obj = JSON.parse(grid3);
                        const grid4Obj = JSON.parse(grid4);
                        const grid5Obj = JSON.parse(grid5);
                        const grid6Obj = JSON.parse(grid6);
                        
                        this.addFilter(this.props.index, grid1);  
                        this.addFilter(this.props.index, grid2);  
                        this.addFilter(this.props.index, grid3);  
                        this.addFilter(this.props.index, grid4);   
                        this.addFilter(this.props.index, grid5);  
                        this.addFilter(this.props.index, grid6);  

                        let composite1 = this.getEmptyFilter("feComposite").replace('operator":"in', `operator":"over`);
                        let composite1Obj = JSON.parse(composite1);
                        this.addFilter(this.props.index, composite1);

                        let composite2 = this.getEmptyFilter("feComposite").replace('operator":"in', `operator":"over`);
                        let composite2Obj = JSON.parse(composite2);
                        this.addFilter(this.props.index, composite2);
                        
                        let composite3 = this.getEmptyFilter("feComposite").replace('operator":"in', `operator":"over`);
                        let composite3Obj = JSON.parse(composite3);
                        this.addFilter(this.props.index, composite3);

                        let composite4 = this.getEmptyFilter("feComposite").replace('operator":"in', `operator":"over`);
                        let composite4Obj = JSON.parse(composite4);
                        this.addFilter(this.props.index, composite4);

                        let composite5 = this.getEmptyFilter("feComposite").replace('operator":"in', `operator":"over`);
                        let composite5Obj = JSON.parse(composite5);
                        this.addFilter(this.props.index, composite5, () => {
                            // g1 & g2 -> c1
                            this.onConnect({
                                source: grid1Obj.result,
                                sourceHandle: 'a-out',
                                target: composite1Obj.result,
                                targetHandle: 'a-in'
                            });
                            this.onConnect({
                                source: grid2Obj.result,
                                sourceHandle: 'a-out',
                                target: composite1Obj.result,
                                targetHandle: 'b-in'
                            });

                            // g3 & g4 -> c2
                            this.onConnect({
                                source: grid3Obj.result,
                                sourceHandle: 'a-out',
                                target: composite2Obj.result,
                                targetHandle: 'a-in'
                            });
                            this.onConnect({
                                source: grid4Obj.result,
                                sourceHandle: 'a-out',
                                target: composite2Obj.result,
                                targetHandle: 'b-in'
                            });

                            // g5 & g6 -> c3
                            this.onConnect({
                                source: grid5Obj.result,
                                sourceHandle: 'a-out',
                                target: composite3Obj.result,
                                targetHandle: 'a-in'
                            });
                            this.onConnect({
                                source: grid6Obj.result,
                                sourceHandle: 'a-out',
                                target: composite3Obj.result,
                                targetHandle: 'b-in'
                            });

                            // c1 & c2 -> c4
                            this.onConnect({
                                source: composite1Obj.result,
                                sourceHandle: 'a-out',
                                target: composite4Obj.result,
                                targetHandle: 'a-in'
                            });
                            this.onConnect({
                                source: composite2Obj.result,
                                sourceHandle: 'a-out',
                                target: composite4Obj.result,
                                targetHandle: 'b-in'
                            });

                            // c3 & c4 -> c5
                            this.onConnect({
                                source: composite3Obj.result,
                                sourceHandle: 'a-out',
                                target: composite5Obj.result,
                                targetHandle: 'a-in'
                            });
                            this.onConnect({
                                source: composite4Obj.result,
                                sourceHandle: 'a-out',
                                target: composite5Obj.result,
                                targetHandle: 'b-in'
                            });
                        });

                        /*let [composite2Obj, composite2] = replaceWithOver(this.getEmptyFilter("feComposite"));
                        this.addFilter(this.props.index, composite2);
                        let [composite3Obj, composite3] = replaceWithOver(this.getEmptyFilter("feComposite"));
                        this.addFilter(this.props.index, composite3);
                        let [composite4Obj, composite4] = replaceWithOver(this.getEmptyFilter("feComposite"));
                        this.addFilter(this.props.index, composite4);
                        let [composite5Obj, composite5] = replaceWithOver(this.getEmptyFilter("feComposite"));
                        this.addFilter(this.props.index, composite5);
                        let [composite6Obj, composite6] = replaceWithOver(this.getEmptyFilter("feComposite"));
                        this.addFilter(this.props.index, composite6);*/
                        
                    }}> + Irregular Pattern <DirectionsRunIcon style={{ fontSize: 15, float: 'right' }} /></div>
                                                    
                </div>
            )
        } 

        else {
            return (
                <div>
                    <div className="helper-text">(experimental)</div>
                    <div className="helper-text">Generate combinations of primitives by extracting from user-inputted photos.</div>
                    <br/>
                    {this.effectTypes.map((effectType) =>
                        {
                            return (
                                <label key={"new-effect-"+effectType} htmlFor="file-upload">
                                    <div className="filter-names"
                                        onClick={() => this.setState({selectedEffect: effectType})}>
                                            {effectType}
                                    </div>
                                </label>
                            )
                        }
                    )}
                </div>
            )
        }
    }

    importPhoto(input) {
        console.log("uploaded")
        if (input.files && input.files[0]) {
            var reader = new FileReader()
            var state = this
            reader.onload = function (e) {
                fetch(e.target.result)
                    .then(function(response) {
                        return response.blob()
                    })
                    .then(function(blob) {
                        var formData = new FormData()
                        formData.append('upl', input.files[0], "test.jpg")
                        fetch(`${process.env.PUBLIC_URL}/processImg`, {
                            method: 'post',
                            body: formData
                        })
                            .then(res => res.text())
                            .then(res => {
                                    let newDict = parseExtractedJSON(res, state.state.selectedEffect)
                                    state.addFilter(state.props.index, newDict)
                                }
                            )
                            .catch(error => console.error(error))
                    })
            }
            reader.readAsDataURL(input.files[0])
        }
    }

    removeFe(filterName) {
        if(filterName === 'feImage') return 'Pattern';
        else return filterName.substring(2)
    }

    setAnimationAnchor(paramToAnimate, reset=false) {
        if (reset) {
            this.setState({selectedAnimationState: -1})
            this.setState({paramToAnimate: ""})
            this.setState({animationAnchor: null})
            this.previousAnimatingParam = "undefined";
        }
        else {
            // edge case, if one animationknob is open and then we directly click on another one
            // it ends up triggering the "close" setAnimationAnchor logic
            // so we need to make sure the paramToAnimate/animatingParam in filtereditor and filterparam editor are ""
            
            let bool = this.state.animationAnchor !== null && paramToAnimate !== this.previousAnimatingParam;
            this.setState({selectedAnimationState: -1})
            if(!bool) this.setState({paramToAnimate: paramToAnimate})
            else {
                this.setState({paramToAnimate: ""})
                this.changeAnimatingParamRef.ref("");
            }
            
            this.setState({animationAnchor: this.state.animationAnchor === null ? this.editFilterRef.current : null}, () => {
                if (this.state.animationAnchor) {
                    this.props.sendLog("opened_animation_editor+" + this.state.selectedFilterName + "+" + this.state.paramToAnimate)
                }
                else {
                    this.props.sendLog("closed_animation_editor+" + this.state.selectedFilterName + "+" + this.state.paramToAnimate)
                }
            });

            this.previousAnimatingParam = paramToAnimate;
        }
    }

    updateAnimationState(num) {
        this.setState({selectedAnimationState: num})
    }

    onPaneClick = (event) => {
        this.setState({selectedFilterName: ""})
        this.setState({selectedElements: []})
        this.setState({selectedFilterIndex: -1})
    }

    onElementClick = (event, elementClicked) => {
        if (isNode(elementClicked)) {
            let selectedElems = []
            let newElems = this.state.nodeGraphElements
            for (let i = 0; i < this.state.nodeGraphElements.length; i++) {
                let elem = this.state.nodeGraphElements[i]
                if (isEdge(elem)) {
                    if (elem.source === elementClicked.id || elem.target === elementClicked.id) {
                        selectedElems.push(elem)
                    }
                }
            }

            selectedElems.push(elementClicked)
            this.setState({selectedElements: selectedElems})
            this.setState({nodeGraphElements: newElems})
        }
        else {
            this.setState({selectedElements: [elementClicked]})
        }
        if (elementClicked.position !== undefined) {
            this.setState({selectedFilterIndex: this.idToIndexMap[elementClicked.id]}, () => {
                this.setState({selectedFilterName: elementClicked.data.label.props.children}, () => {
                    this.props.sendLog("editting+" + this.state.selectedFilterName)
                })
            })
            this.setAnimationAnchor(this.state.paramToAnimate, true)
        }
        if (isNode(elementClicked)) {
            this.switchActiveBranch([elementClicked])
        }
    }

    onElementsRemove = (elementsToRemove) => {
        if (elementsToRemove.length === 1) { // assume only one element is removed at a time?
            if (isNode(elementsToRemove[0])) {
                this.removeFilter(this.idToIndexMap[elementsToRemove[0].id])
            }
            if (isEdge(elementsToRemove[0])) {
                this.props.openSnackbar("Connections between primitives can only be redirected, not removed!", "info")
                return
            }
        }
        else {
            let filterIndicesToRemove = []
            for (let i = 0; i < elementsToRemove.length; i++) {
                if (this.idToIndexMap[elementsToRemove[i].id] !== undefined) {
                    filterIndicesToRemove.push(this.idToIndexMap[elementsToRemove[i].id])
                }
            }
            filterIndicesToRemove = filterIndicesToRemove.sort((a, b) => b-a);
            for (let i = 0; i < filterIndicesToRemove.length; i++) {
                this.removeFilter(filterIndicesToRemove[i])
            }
        }
        this.setState({selectedFilterIndex: -1})
        this.setState({nodeGraphElements: removeElements(elementsToRemove, this.state.nodeGraphElements)})

        // no matter what element we're removing, animated or not, if it exists the animation should be cleared.
        this.changeAnimatingParamRef.ref("");
        this.setState({paramToAnimate: ""});
    }

    onConnect = (params) => {
        let filterIndexToEdit = this.idToIndexMap[params.target]
        let filterToEdit = JSON.parse(this.props.params[filterIndexToEdit])
        if (params.targetHandle === 'a-in') {
            filterToEdit.in = params.source
        }
        else if (params.targetHandle === 'b-in') {
            filterToEdit.in2 = params.source
        }
        let code = JSON.stringify(filterToEdit)
        this.props.updateFilterCode(code, this.props.index, filterIndexToEdit).then(() => {
            let parsedParams = this.props.params.map(p => {
                p = JSON.parse(p)
                if (p["child"] !== undefined && !Array.isArray(p["child"])) {
                    p["child"] = JSON.parse(p["child"])
                }
                return p
            })
            let indiciesMovedFrom = new Set([])
            let sources = new Set([params.source])
            if (params.sourceHandle === 'a-out') {
                for (let i = 0; i < parsedParams.length; i++) {
                    if (sources.has(parsedParams[i].in) || sources.has(parsedParams[i].in2)) {
                        sources.add(parsedParams[i].result)
                        indiciesMovedFrom.add(i)
                    }
                }
            }
            this.props.moveFilterPrimitivesToEnd(this.props.index, indiciesMovedFrom).then(() => {
                this.refreshPreview()
            })
        })
        this.setState({nodeGraphElements: addEdge(params, this.state.nodeGraphElements)})
    }

    onEdgeUpdate = (oldEdge, newConnection) => {
        let filterIndexToEdit = this.idToIndexMap[newConnection.target]
        let filterToEdit = JSON.parse(this.props.params[filterIndexToEdit])
        filterToEdit.in = newConnection.source
        let code = JSON.stringify(filterToEdit)
        this.props.updateFilterCode(code, this.props.index, filterIndexToEdit).then(() => {
            this.refreshPreview()
        })
        this.setState({nodeGraphElements: updateEdge(oldEdge, newConnection, this.state.nodeGraphElements)})
    }

    duplicateElement(elementToDuplicate){
        let previousComponentObject;
        let previousComponent = "SourceGraphic"
        if (this.props.params.length > 0) {
            previousComponentObject = JSON.parse(this.props.params[this.props.params.length - 1])
            previousComponent = previousComponentObject['result']
        }

        const parsedParams = this.props.params.map(p => JSON.parse(p))
        const selectedParam = parsedParams.filter(p => p.result === elementToDuplicate[0].id)[0]; // params to go into our duplicated node

        if(selectedParam.filterName !== "feImage"){
            if(selectedParam.in) selectedParam.in = previousComponent;
            if(selectedParam.in2) selectedParam.in2 = "SourceGraphic";
            const id = makeid(6);
            selectedParam.result = id;
    
            this.addFilter(this.props.index, JSON.stringify(selectedParam));
        } 
        
        else {
            const svgID = makeid(8);
            const svgDefElem = document.querySelector('defs');
            const patterndata = { 
                filterName: "feImage", href: `#${svgID}`, result: makeid(6), 
                patterntype: 'grid', type: selectedParam.type, 
                cellwidth: selectedParam.cellwidth, cellheight: selectedParam.cellheight, 
                dx: selectedParam.dx, dy: selectedParam.dy, sx: selectedParam.sx, sy: selectedParam.sy,
                rotation: selectedParam.rotation, unittype: selectedParam.unittype, unitrot: selectedParam.unitrot
            };
            if(selectedParam.animation) patterndata.animation = selectedParam.animation;
            if(selectedParam.customunit) patterndata.customunit = selectedParam.customunit;

            const mainSVGCanvas = document.getElementById('main-canvas')
            const dimensions = [mainSVGCanvas.width.baseVal.value, mainSVGCanvas.height.baseVal.value];
            const newHandler = new PatternHandler(
                'grid', patterndata, svgID, svgDefElem, this.props.patternHandlers, dimensions,
                this.props.updateFilterCode
            );
            
            this.props.patternHandlers.set(svgID, newHandler)

            if(selectedParam.animation){
                const animationParams = JSON.parse(selectedParam.animation);
                const animationNamesToAdd = Object.keys(animationParams);
                animationNamesToAdd.forEach(key => {
                    const parsedCurrentAni = JSON.parse(animationParams[key])
                    newHandler.updateAnimatedParam(parsedCurrentAni)
                });
            }

            if(selectedParam.customunit){
                const currentSelectedFilterIndex = this.props.params.length; // duped elem will be last param, so we use param length
                newHandler.swapRectWithImage(
                    new Blob([selectedParam.customunit], { type: "image/svg+xml" }), '',
                    this.props.index, currentSelectedFilterIndex, patterndata
                );
            }

            this.addFilter(this.props.index, JSON.stringify(patterndata))
        }
    }

    handleSVGDrag(e) {
        if (this.state.mouseDownSVG && this.state.selectedFilterIndex >= 0) {
            let selectedFilter = JSON.parse(this.props.params[this.state.selectedFilterIndex])
            if (this.state.selectedFilterName === "Turbulence") {
                let freqs = this.state.selectedAnimationState !== -1 && this.state.paramToAnimate === "baseFrequency" ? JSON.parse(JSON.parse(selectedFilter.animation)["baseFrequency"]).values.split(";")[this.state.selectedAnimationState] : selectedFilter.baseFrequency
                freqs = freqs.split(" ")
                let mouseMovement = [(e.clientX - this.currMouseLocation[0])/1000, (e.clientY - this.currMouseLocation[1])/1000]
                let newFreqs = [Math.max(0, (Number(freqs[0]) - mouseMovement[0]).toFixed(4)), Math.max(0, (Number(freqs[1]) - mouseMovement[1]).toFixed(4))].join(' ')
                this.filterParamEditorRef.current.updateFilter(selectedFilter, "baseFrequency", newFreqs)
                this.currMouseLocation = [e.clientX, e.clientY]
            }
            else if (this.state.selectedFilterName === "DropShadow") {
                let dx = this.state.selectedAnimationState !== -1 && this.state.paramToAnimate === "dx" ? JSON.parse(JSON.parse(selectedFilter.animation)["baseFrequency"]).values.split(";")[this.state.selectedAnimationState] : selectedFilter.dx
                let dy = this.state.selectedAnimationState !== -1 && this.state.paramToAnimate === "dy" ? JSON.parse(JSON.parse(selectedFilter.animation)["baseFrequency"]).values.split(";")[this.state.selectedAnimationState] : selectedFilter.dy
                let mouseMovement = [(e.clientX - this.currMouseLocation[0]), (e.clientY - this.currMouseLocation[1])]
                this.filterParamEditorRef.current.updateFilter(selectedFilter, "dx", dx + mouseMovement[0])
                this.filterParamEditorRef.current.updateFilter(selectedFilter, "dy", dy + mouseMovement[1])
                this.currMouseLocation = [e.clientX, e.clientY]
            }
            else if (this.state.selectedFilterName === "DiffuseLighting" || this.state.selectedFilterName === "SpecularLighting") {
                let lightSource = JSON.parse(selectedFilter["child"])
                if (lightSource.filterName !== "feDistantLight") {
                    let mouseMovement = [(e.clientX - this.currMouseLocation[0]), (e.clientY - this.currMouseLocation[1])]
                    if (lightSource.filterName === "feSpotLight" && this.state.selectedSpotlightType === "target") {
                        lightSource.pointsAtX = lightSource.pointsAtX + mouseMovement[0]
                        lightSource.pointsAtY = lightSource.pointsAtY + mouseMovement[1]
                    }
                    else {
                        lightSource.x = lightSource.x + mouseMovement[0]
                        lightSource.y = lightSource.y + mouseMovement[1]
                    }
                    selectedFilter["child"] = JSON.stringify(lightSource)
                    let code = JSON.stringify(selectedFilter)
                    this.props.updateFilterCode(code, this.props.index, this.state.selectedFilterIndex).then(() => {
                        this.refreshPreview()
                    })
                    this.currMouseLocation = [e.clientX, e.clientY]
                }
            }
        }
    }

    handleSVGMouseDown(e) {
        if (!this.state.mouseDownSVG) {
            this.setState({mouseDownSVG: true})
            this.currMouseLocation = [e.clientX, e.clientY]
        }
    }

    handleSVGMouseUp() {
        if (this.state.mouseDownSVG) {
            this.setState({mouseDownSVG: false})
        }
    }

    setSpotlightType(newType) {
        this.setState({selectedSpotlightType: newType})
    }

    handleSVGScroll(e) {
        if (this.state.selectedFilterName === "DiffuseLighting") {
            let filterToEdit = JSON.parse(this.props.params[this.state.selectedFilterIndex])
            let lightSource = JSON.parse(filterToEdit["child"])
            if (lightSource.filterName !== "feDistantLight") {
                if (lightSource.filterName === "feSpotLight" && this.state.selectedSpotlightType === "target") {
                    lightSource.pointsAtZ = lightSource.pointsAtZ - e.deltaY/30
                }
                else {
                    lightSource.z = lightSource.z - e.deltaY/30
                }
                filterToEdit["child"] = JSON.stringify(lightSource)
                let code = JSON.stringify(filterToEdit)
                this.props.updateFilterCode(code, this.props.index, this.state.selectedFilterIndex).then(() => {
                    this.refreshPreview()
                })
            }
        }
    }

    resetFilter() {
        this.props.updateFilterCode(this.originalFilterWhenOpened, this.props.index, 0, false).then(() => {
            this.refreshPreview()
        })
    }

    getCursorStyle() {
        if (this.state.selectedFilterName === "Turbulence" || this.state.selectedFilterName === "DropShadow") {
            return "svg-move"
        }
        else if (this.state.selectedLightSourceType === "feSpotLight" || this.state.selectedLightSourceType === "fePointLight") {
            return "svg-move"
        }
        else {
            return ""
        }
    }

    render() {
        return (
        <div>
            <div className="filter-container">
                <div id="editable-svg" className="small-padding">
                    <div className='flex-row'>
                        <div className='tiny-padding'>Name:</div>
                        <TextField
                            onFocus={(event) => event.stopPropagation()}
                            onClick={(event) => event.stopPropagation()}
                            onChange={event => this.setState({filterID: event.target.value})}
                            color='primary'
                            value={this.state.filterID}
                            size="small"/>
                        <div className='right-padding-7'><div className='button-outlined' onClick={() => this.resetFilter()} >Reset</div></div>
                    </div>
                    <div className='tiny-padding'></div>
                    <div onWheel={(e) => this.handleSVGScroll(e)}
                        onMouseDown={(e) => this.handleSVGMouseDown(e)}
                        onMouseMove={(e) => this.handleSVGDrag(e)}
                        onMouseUp={() => this.handleSVGMouseUp()}
                        className={"tiny-padding pad-top " + this.getCursorStyle()}>
                        <svg id="preview-svg" width="300" height="200" viewBox="0 0 300 200" xmlns="http://www.w3.org/2000/svg">
                            <text x="5" y="20" fill="#999" fontSize="smaller">Preview</text>
                            <g fill="none" filter={this.props.params.length === 0 ? "" : "url(#editable-filter)"}>
                                <path stroke="#63B0A6" d="M5 160 l415 0" strokeWidth="16" strokeLinecap="round"/>
                                <rect id="rect-1" x="50" y="50" width="50" height="100" fill="#D65D4F"/>
                                <rect id="rect-2" x="185" y="50" width="100" height="50" fill="#FFCB52"/>
                            </g>
                            {this.state.previewFilter}
                        </svg>
                    </div>
                    <div id="param-editor" ref={this.editFilterRef} className="tiny-padding">
                        <FilterParamEditor
                            ref={this.filterParamEditorRef}
                            index={this.props.index}
                            updateFilterCode={this.props.updateFilterCode}
                            refreshPreview={this.refreshPreview}
                            selectedFilterIndex={this.state.selectedFilterIndex}
                            setSpotlightType={this.setSpotlightType}
                            selectedSpotlightType={this.state.selectedSpotlightType}
                            updateFilterAnimation={this.props.updateFilterAnimation}
                            params={this.props.params}
                            selectedAnimationState={this.state.selectedAnimationState}
                            animationAnchor={this.state.animationAnchor}
                            paramToAnimate={this.state.paramToAnimate}
                            setAnimationAnchor={this.setAnimationAnchor}
                            updateAnimationState={this.updateAnimationState}
                            updateSelectedLightSourceType={this.updateSelectedLightSourceType}
                            
                            changeAnimatingParamRef={this.changeAnimatingParamRef}
                            patternSVGReferences={this.props.patternSVGReferences}
                            patternSVGPathReferences={this.props.patternSVGPathReferences}
                            patternSVGAnimators={this.props.patternSVGAnimators}
                            patternHandlers={this.props.patternHandlers}
                            maxDepth={this.props.maxDepth}/>
                    </div>
                </div>
                <div className='column-space-between'>
                    <div id="editable-dm-params">
                        <ReactFlowProvider>
                            <ReactFlow
                                elements={this.state.nodeGraphElements}
                                onElementsRemove={this.onElementsRemove}
                                // onElementClick={this.onElementClick}
                                onEdgeUpdate={this.onEdgeUpdate}
                                onPaneClick={this.onPaneClick}
                                onConnect={this.onConnect}
                                onNodeDragStart={this.onElementClick}
                                nodeTypes={nodeTypes}
                            />
                            <GraphSelect ref={this.graphSelectRef}
                                onElementsRemove={this.onElementsRemove}
                                switchActiveBranch={this.switchActiveBranch}

                                duplicateElement={this.duplicateElement}
                                changeAnimatingParamRef={this.changeAnimatingParamRef}/>
                        </ReactFlowProvider>
                    </div>
                </div>
                <div className="small-padding column-space-between" id="params-list">
                    <div>
                    <ToggleButtonGroup
                        color="secondary"
                        value={this.state.addMode}
                        exclusive
                        onChange={(event, newValue) => this.addModeChange(newValue)}>
                        <ToggleButton value="primitives">Primitives</ToggleButton>
                        <ToggleButton value="patterns">Patterns</ToggleButton>
                        {/*<ToggleButton value="effects">Import</ToggleButton>*/}
                    </ToggleButtonGroup>
                    {this.displayList()}
                    </div>
                    <input id="file-upload" type="file" accept="image/png, image/jpeg" onClick={() => document.getElementById("file-upload").value = null} onChange={() => this.importPhoto(document.getElementById("file-upload"))}/>
                </div>
            </div>
        </div>
        )
    }
}

export default FilterEditor
