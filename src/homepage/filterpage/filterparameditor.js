import React from 'react'
import { ChromePicker } from 'react-color'
import Slider from '@material-ui/core/Slider';
import ReactFlow, { isNode, ReactFlowProvider } from 'react-flow-renderer';
import Button from '@material-ui/core/Button';
import AnimationKnob from './animationKnob';
import Popper from '@material-ui/core/Popper';
import Paper from '@material-ui/core/Paper';
import Badge from '@material-ui/core/Badge';
import Grid from '@material-ui/core/Grid';
// import Switch from '@material-ui/core/Switch';
// import FormControlLabel from '@material-ui/core/FormControlLabel';
import { nodeTypes } from './nodegraph/customgraphnodes'
import DirectionsRunIcon from '@material-ui/icons/DirectionsRun';
import { ColorPicker } from '../sketchpage/colorpicker';
import FilterDepthEffect from './filterdeptheffect';

import './generatedfilter.css'

import ToggleButton from '@material-ui/lab/ToggleButton';
import ToggleButtonGroup from '@material-ui/lab/ToggleButtonGroup';

class FilterParamEditor extends React.Component {
    constructor(props) {
        super(props)
        this.state = {
            colorMatrixI: 0,
            colorMatrixJ: 0,
            animatingParam: "",
            patternParamMode: "unit",
            currDepthIndex: 0
        }
        this.turbulenceTypes = ["fractalNoise", "turbulence"]
        this.lightTypes = ["fePointLight", "feDistantLight", "feSpotLight"]
        this.lightMap = {
            "fePointLight": "Point Light",
            "feDistantLight": "Distant Light",
            "feSpotLight": "Spot Light"
        }
        this.morphologyTypes = ["dilate", "erode"]
        this.blendStyles = ["multiply", "normal", "screen", "darken", "lighten"]
        this.compositeStyles = ["over", "in", "out", "atop", "xor", "lighter"]

        this.gridTypes = ["square", "circle"]
        this.updateFilterTimeout = 0;
        this.depthEffectRef = React.createRef()

        // bad to allow parent access to child, but not sure how else to access animationknob.js from graphselect.js
        // animationknob and graphselect both share filtereditor but not each other
        this.props.changeAnimatingParamRef.ref = (param) => {
            this.changeAnimatingParam(param, () => {});
        }
    }

    componentDidMount() {
        this.changeAnimatingParam = this.changeAnimatingParam.bind(this)
        this.updateFilter = this.updateFilter.bind(this);
        this.delayedUpdateFilter = this.delayedUpdateFilter.bind(this);
        this.displayPatternParams = this.displayPatternParams.bind(this);
        this.makeDepthEffectsList = this.makeDepthEffectsList.bind(this)
        this.updateDepthEffect = this.updateDepthEffect.bind(this)
        this.removeDepthEffect = this.removeDepthEffect.bind(this)
        this.updateDepthEffectHelper = this.updateDepthEffectHelper.bind(this)
        this.updateCurrDepthIndex = this.updateCurrDepthIndex.bind(this)
    }

    animationBtnClicked(paramToAnimate, selectedFilter) {
        this.setState({animatingParam: paramToAnimate})
        this.props.setAnimationAnchor(paramToAnimate)
    }

    changeAnimatingParam(param, callback) {
        this.setState({animatingParam: param}, callback)
    }

    renderAnimation(selectedFilter, paramToAnimate, isDepthEffect=false) {
        return (
            <span className="float-right">
                <Popper
                    style={{ zIndex: 1400 }}
                    open={Boolean(this.props.animationAnchor)}
                    anchorEl={this.props.animationAnchor}
                    placement="left"
                >
                    <Paper>
                        <AnimationKnob
                            filterIndex={this.props.index}
                            paramToAnimate={this.props.paramToAnimate}
                            originalParamVal={selectedFilter[this.props.paramToAnimate]}
                            filterComponentIndex={this.props.selectedFilterIndex}
                            updateFilterAnimation={this.props.updateFilterAnimation}
                            refreshPreview={this.props.refreshPreview}
                            animationDict={selectedFilter.animation}
                            selectedAnimationState={this.props.selectedAnimationState}
                            setAnimationAnchor={this.props.setAnimationAnchor}
                            updateAnimationState={this.props.updateAnimationState}
                            changeAnimatingParam={this.changeAnimatingParam}
                            
                            selectedFilter={selectedFilter}
                            patternSVGReferences={this.props.patternSVGReferences}
                            patternSVGPathReferences={this.props.patternSVGPathReferences}
                            patternSVGAnimators={this.props.patternSVGAnimators}
                            patternHandlers={this.props.patternHandlers}
                            delayedUpdateFilter={this.delayedUpdateFilter}/>
                    </Paper>
                </Popper>
                <Badge anchorOrigin={{ vertical: 'top', horizontal: 'left',}} color="secondary" variant="dot" invisible={
                    selectedFilter.animation === undefined || JSON.parse(selectedFilter.animation)[paramToAnimate] === undefined
                }>
                    <Button disabled={isDepthEffect} variant="outlined" size="small" onClick={(event) => this.animationBtnClicked(paramToAnimate, selectedFilter)} startIcon={<DirectionsRunIcon style={{ fontSize: 15 }}/>}
                        style={{fontSize: '0.65rem', padding: '1px 7px'}}>
                        animate
                    </Button>
                </Badge>

            </span>
        )
    }

    setColorMatrix(values) {
        let val = values.split(" ").map(Number)
        this.valArr = []
        while (val.length) this.valArr.push(val.splice(0,5))
        this.colorMatrixVals = []
        let colorType = ["R", "G", "B", "A", "C"]
        let bgColor = ['#F5D0DC', '#E6F0F0', '#D8DDFE', '#FCF9F2', '#FCF9F2']
        for (let i = 0; i < 5; i++) {
            this.colorMatrixVals.push({ id: i.toString()+"in", type: 'input', data: { label: colorType[i] }, sourcePosition: 'right', position: { x: 5, y: 10+i*50 }, style: {
                background: bgColor[i],
                color: '#333',
                border: '1px solid #222138',
                width: 10,
                fontSize: 'large',
                padding: '3px 10px',
                cursor: "pointer"
            }})
            if (i <= 3) {
                this.colorMatrixVals.push({ id: i.toString()+"out", type: 'output', data: { label: colorType[i] }, targetPosition: 'left', position: { x: 265, y: 25+i*50 }, style: {
                    background: bgColor[i],
                    color: '#333',
                    border: '1px solid #222138',
                    width: 10,
                    fontSize: 'large',
                    padding: '3px 10px',
                    cursor: "pointer"
                }})
            }
        }
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 5; j++) {
                this.colorMatrixVals.push({ id: 'e'+j.toString()+'in-'+i.toString()+'out', source: j.toString()+'in', target: i.toString()+'out',
                style: { "strokeWidth": 4, "opacity": this.valArr[i][j] }})
            }
        }
    }

    // work around, not good method to do this but temp fix
    delayedUpdateFilter(selectedFilter, paramsToUpdate, newVals){
        if(selectedFilter.filterName !== 'feImage') return;

        clearTimeout(this.updateFilterTimeout);
        this.updateFilterTimeout = setTimeout(() => {
            let aniDict = JSON.parse(selectedFilter["animation"])
            let currentAni = JSON.parse(aniDict[paramsToUpdate])
            const id = selectedFilter["href"].slice(1);
            const currentPatternHandler = this.props.patternHandlers.get(id);
            currentPatternHandler.updateAnimatedParam(currentAni);
        }, 100);
    }

    // selectedFilter is patternData or params
    updateFilter(selectedFilter, paramsToUpdate, newVals) {
        let hasDepthEffect = JSON.parse(this.props.params[this.props.selectedFilterIndex]).depthEffects
        if (hasDepthEffect) {
            this.depthEffectRef.current.updateDataPointValue(newVals)
            this.updateDepthEffect(selectedFilter, this.state.currDepthIndex, paramsToUpdate, newVals, true)
            return
        }
        else if (paramsToUpdate !== this.state.animatingParam) { // no animation
            if (selectedFilter.filterName === "feColorMatrix") {
                this.valArr[this.state.colorMatrixI][this.state.colorMatrixJ] = newVals
                selectedFilter[paramsToUpdate] = this.valArr.map(e => e.join(' ')).join(' ')
            }

            else if(selectedFilter.filterName === "feImage"){ // pattern
                selectedFilter[paramsToUpdate] = newVals;

                // import/custom SVG loading favors the custom SVG
                // so if we switch back, we need to erase it so the system doesn't default to an old one
                if(paramsToUpdate === "unittype" && newVals !== "custom"){
                    if(selectedFilter.customunit){
                        selectedFilter.customunit = null;
                    }
                }
                const filterSVGID = selectedFilter.href.slice(1);
                // buffer the input so it doesn't lag updating the svg path 
                clearTimeout(this.updateFilterTimeout);
                this.updateFilterTimeout = setTimeout(() => {
                    const currentPatternHandler = this.props.patternHandlers.get(filterSVGID);
                    currentPatternHandler.updateParamReference(selectedFilter);
                    currentPatternHandler.updateStaticParam(paramsToUpdate, newVals);
                }, 100);
            }

            else {
                selectedFilter[paramsToUpdate] = newVals
            }

            this.props.updateSelectedLightSourceType(selectedFilter)
        }

        else { // animation
            let aniDict = JSON.parse(selectedFilter["animation"])
            let currentAni = JSON.parse(aniDict[paramsToUpdate])
            let valList = currentAni.values.split(";")
            if (selectedFilter.filterName === "feColorMatrix") {
                this.valArr[this.state.colorMatrixI][this.state.colorMatrixJ] = newVals
                valList[this.props.selectedAnimationState] = this.valArr.map(e => e.join(' ')).join(' ')
            }
            else {
                valList[this.props.selectedAnimationState] = newVals
            }
            currentAni.values = valList.join(";")
            aniDict[paramsToUpdate] = JSON.stringify(currentAni)
            selectedFilter["animation"] = JSON.stringify(aniDict)

            if(selectedFilter.filterName === "feImage"){
                const id = selectedFilter["href"].slice(1);
    
                // buffer the input so it doesn't lag updating the svg path 
                clearTimeout(this.updateFilterTimeout);
                this.updateFilterTimeout = setTimeout(() => {
                    const currentPatternHandler = this.props.patternHandlers.get(id);
                    currentPatternHandler.updateAnimatedParam(currentAni);
                }, 100);
            }
            
        }
        let code = JSON.stringify(selectedFilter)
        this.props.updateFilterCode(code, this.props.index, this.props.selectedFilterIndex).then(() => {
            this.props.refreshPreview()
        })
    }

    getDisabledCondition(selectedFilter, param) {
        return (
            ((selectedFilter.animation !== undefined && JSON.parse(selectedFilter.animation)[param] !== undefined) && this.props.selectedAnimationState === -1)
                || (this.props.selectedAnimationState !== -1 && this.props.paramToAnimate !== param)
        )
    }

    renderGaussianBlur(selectedFilter, isDepthEffect=false) {
        let val = this.props.selectedAnimationState !== -1 && this.props.paramToAnimate === "stdDeviation" ? JSON.parse(JSON.parse(selectedFilter.animation)["stdDeviation"]).values.split(";")[this.props.selectedAnimationState] : selectedFilter.stdDeviation
        return (
            <div id="generated-params">
                <div className="small-heading-padding">
                    Blur Std Deviation: {val}
                    {this.renderAnimation(selectedFilter, "stdDeviation", isDepthEffect)}
                </div>
                <div className="filter-container-center">
                    <Slider
                        disabled={this.getDisabledCondition(selectedFilter, "stdDeviation")}
                        value={Number(val)}
                        color="primary"
                        onChange={(event, newValue) => {this.updateFilter(selectedFilter, "stdDeviation", newValue)}}
                    />
                </div>
            </div>
        )
    }

    renderFlood(selectedFilter, isDepthEffect=false) {
        let val = this.props.selectedAnimationState !== -1 && this.props.paramToAnimate === "flood-color" ? JSON.parse(JSON.parse(selectedFilter.animation)["flood-color"]).values.split(";")[this.props.selectedAnimationState] : selectedFilter["flood-color"]
        return (
            <div id="generated-params">
                <div className="small-heading-padding">
                    Flood Color: {val}
                    {this.renderAnimation(selectedFilter, "flood-color", isDepthEffect)}
                </div>
                <br></br>
                <div className="filter-container-center">
                    <ChromePicker disableAlpha={true} color={val}
                        onChange={(color, _) => {this.updateFilter(selectedFilter, "flood-color", color.hex)}} />
                </div>
                <br></br>
            </div>
        )
    }

    renderBlend(selectedFilter) {
        return (
            <div id="generated-params">
                <div className="small-heading-padding">
                    Blend Style:
                </div>
                <div className="filter-container-center flex-wrap">
                {
                    this.blendStyles.map((style, index) => {
                        return (
                        <span key={"blend-"+index} className="button-wrapper2">
                            <div className={selectedFilter.mode === style ? "button-outlined button-selected" : "button-outlined"} onClick={() => this.updateFilter(selectedFilter, "mode", style)}>{style}</div>
                        </span>
                        )
                    })
                }
                </div>
            </div>
        )
    }

    renderComposite(selectedFilter) {
        return (
            <div id="generated-params">
                <div className="small-heading-padding">
                    Composite Style:
                </div>
                <div className="filter-container-center flex-wrap">
                {
                    this.compositeStyles.map((style, index) => {
                        return (
                        <span key={"composite-"+index} className="button-wrapper2">
                            <div className={selectedFilter.operator === style ? "button-outlined button-selected" : "button-outlined"} onClick={() => this.updateFilter(selectedFilter, "operator", style)}>{style}</div>
                        </span>
                        )
                    })
                }
                </div>
            </div>
        )
    }

    renderTurbulence(selectedFilter) {
        let valOctaves = this.props.selectedAnimationState !== -1 && this.props.paramToAnimate === "numOctaves" ? JSON.parse(JSON.parse(selectedFilter.animation)["numOctaves"]).values.split(";")[this.props.selectedAnimationState] : selectedFilter.numOctaves
        let valSeed = this.props.selectedAnimationState !== -1 && this.props.paramToAnimate === "seed" ? JSON.parse(JSON.parse(selectedFilter.animation)["seed"]).values.split(";")[this.props.selectedAnimationState] : selectedFilter.seed
        let freqs = this.props.selectedAnimationState !== -1 && this.props.paramToAnimate === "baseFrequency" ? JSON.parse(JSON.parse(selectedFilter.animation)["baseFrequency"]).values.split(";")[this.props.selectedAnimationState] : selectedFilter.baseFrequency
        selectedFilter.type = selectedFilter.type === undefined ? "turbulence" : selectedFilter.type
        return (
            <div id="generated-params">
                <div className="small-heading-padding">
                    Drag above to adjust the frequency of noise: {freqs}
                    {this.renderAnimation(selectedFilter, "baseFrequency")}
                </div>
                <div className="small-heading-padding">
                    Type:
                </div>
                <div className="filter-container-center flex-wrap">
                {
                    this.turbulenceTypes.map((style, index) => {
                        return (
                        <span key={"turbulence-"+index} className="button-wrapper2">
                            <div className={selectedFilter.type === style ? "button-outlined button-selected" : "button-outlined"} onClick={() => this.updateFilter(selectedFilter, "type", style)}>{style}</div>
                        </span>
                        )
                    })
                }
                </div>
                <div className="small-heading-padding">
                    Number of Octaves: {valOctaves}
                    {this.renderAnimation(selectedFilter, "numOctaves")}
                </div>
                <div className="filter-container-center">
                    <Slider
                        disabled={this.getDisabledCondition(selectedFilter, "numOctaves")}
                        value={Number(valOctaves)}
                        color="primary"
                        marks
                        min={1}
                        max={8}
                        onChange={(event, newValue) => {this.updateFilter(selectedFilter, "numOctaves", newValue)}}
                    />
                </div>
                <div className="small-heading-padding">
                    Seed: {valSeed}
                    {this.renderAnimation(selectedFilter, "seed")}
                </div>
                <div className="filter-container-center">
                    <Slider
                        disabled={this.getDisabledCondition(selectedFilter, "seed")}
                        value={Number(valSeed)}
                        color="primary"
                        onChange={(event, newValue) => {this.updateFilter(selectedFilter, "seed", newValue)}}
                    />
                </div>
            </div>
        )
    }

    onColorMatrixElementClick(elementClicked) {
        let colorToValMap = {"R": 0, "G": 1, "B": 2, "A": 3, "C": 4}
        if (isNode(elementClicked)) {
            if (elementClicked.type === "input") {
                this.setState({colorMatrixJ: colorToValMap[elementClicked.data.label]})
            }
            else {
                this.setState({colorMatrixI: colorToValMap[elementClicked.data.label]})
            }
        }
        else {
            this.setState({colorMatrixJ: elementClicked.source[0]})
            this.setState({colorMatrixI: elementClicked.target[0]})
        }
    }

    renderColorMatrix(selectedFilter) {
        let val = this.props.selectedAnimationState !== -1 && this.props.paramToAnimate === "values" ? JSON.parse(JSON.parse(selectedFilter.animation)["values"]).values.split(";")[this.props.selectedAnimationState] : selectedFilter.values
        this.setColorMatrix(val)
        return (
            <div id="generated-params">
                <div className="small-heading-padding">
                    Convert R, G, B, and A to new values by changing edge weights.
                    {this.renderAnimation(selectedFilter, "values")}
                </div>
                <div id="color-matrix-graph">
                    <ReactFlowProvider>
                        <ReactFlow
                            nodesDraggable={false}
                            nodesConnectable={false}
                            paneMoveable={false}
                            zoomOnScroll={false}
                            zoomOnDoubleClick={false}
                            panOnScroll={false}
                            snapToGrid={true}
                            elements={this.colorMatrixVals}
                            nodeTypes={nodeTypes}
                            onElementClick={(event, elementClicked) => this.onColorMatrixElementClick(elementClicked)}
                        />
                    </ReactFlowProvider>
                </div>
                <div className="filter-container-center">
                    <div className="tiny-padding">
                        <select className="original" size="small" value={this.state.colorMatrixJ} onChange={(event) => this.setState({colorMatrixJ: event.target.value})}>
                            <option value={0}>R</option>
                            <option value={1}>G</option>
                            <option value={2}>B</option>
                            <option value={3}>A</option>
                            <option value={4}>C</option>
                        </select>
                    </div>
                    <Slider
                        value={this.valArr[this.state.colorMatrixI][this.state.colorMatrixJ]}
                        disabled={this.getDisabledCondition(selectedFilter, "values")}
                        color="primary"
                        step={0.01}
                        min={0}
                        max={1}
                        onChange={(event, newValue) => {this.updateFilter(selectedFilter, "values", newValue)}}
                    />
                    <div className="tiny-padding">
                        <select className="original" size="small" value={this.state.colorMatrixI} onChange={(event) => this.setState({colorMatrixI: event.target.value})}>
                            <option value={0}>R</option>
                            <option value={1}>G</option>
                            <option value={2}>B</option>
                            <option value={3}>A</option>
                        </select>
                    </div>
                </div>
            </div>
        )
    }

    renderDisplacementMap(selectedFilter, isDepthEffect=false) {
        let val = this.props.selectedAnimationState !== -1 && this.props.paramToAnimate === "scale" ? JSON.parse(JSON.parse(selectedFilter.animation)["scale"]).values.split(";")[this.props.selectedAnimationState] : selectedFilter.scale
        return (
            <div id="generated-params">
                <div className="small-heading-padding">
                    Displacement scale: {val}
                    {this.renderAnimation(selectedFilter, "scale", isDepthEffect)}
                </div>
                <div className="filter-container-center">
                    <Slider
                        disabled={this.getDisabledCondition(selectedFilter, "scale")}
                        value={Number(val)}
                        color="primary"
                        min={0}
                        max={200}
                        onChange={(event, newValue) => {this.updateFilter(selectedFilter, "scale", newValue)}}
                    />
                </div>
            </div>
        )
    }

    renderDropShadow(selectedFilter, isDepthEffect) {
        let val = this.props.selectedAnimationState !== -1 && this.props.paramToAnimate === "stdDeviation" ? JSON.parse(JSON.parse(selectedFilter.animation)["stdDeviation"]).values.split(";")[this.props.selectedAnimationState] : selectedFilter.stdDeviation
        return (
            <div id="generated-params">
                <div className="small-heading-padding">
                    Drag above to adjust the position of the shadow.
                </div>
                <div className="small-heading-padding">
                    Shadow Std Deviation: {val}
                    {this.renderAnimation(selectedFilter, "stdDeviation", isDepthEffect)}
                </div>
                <div className="filter-container-center">
                    <Slider
                        disabled={this.getDisabledCondition(selectedFilter, "stdDeviation")}
                        value={Number(val)}
                        color="primary"
                        step={0.1}
                        max={25}
                        onChange={(event, newValue) => {this.updateFilter(selectedFilter, "stdDeviation", newValue)}}
                    />
                </div>
            </div>
        )
    }

    renderMorphology(selectedFilter, isDepthEffect=false) {
        let val = this.props.selectedAnimationState !== -1 && this.props.paramToAnimate === "radius" ? JSON.parse(JSON.parse(selectedFilter.animation)["radius"]).values.split(";")[this.props.selectedAnimationState] : selectedFilter.radius
        return (
            <div id="generated-params">
                <div className="small-heading-padding">
                    Morph style:
                </div>
                <div className="filter-container-center flex-wrap">
                {
                    this.morphologyTypes.map((style, index) => {
                        return (
                        <span key={"morph-"+index} className="button-wrapper2">
                            <div className={selectedFilter.operator === style ? "button-outlined button-selected" : "button-outlined"} onClick={() => this.updateFilter(selectedFilter, "operator", style)}>{style}</div>
                        </span>
                        )
                    })
                }
                </div>
                <div className="small-heading-padding">
                    Morph radius: {val}
                    {this.renderAnimation(selectedFilter, "radius", isDepthEffect)}
                </div>
                <div className="filter-container-center">
                    <Slider
                        disabled={this.getDisabledCondition(selectedFilter, "radius")}
                        value={(Number(val))}
                        color="primary"
                        step={1}
                        max={30}
                        onChange={(event, newValue) => {this.updateFilter(selectedFilter, "radius", newValue)}}
                    />
                </div>
            </div>
        )
    }

    setNewLightChild(selectedFilter, selectedChild, paramToUpdate, newValue) {
        selectedChild[paramToUpdate] = newValue
        let newChild = JSON.stringify(selectedChild)
        this.updateFilter(selectedFilter, "child", newChild)
    }

    renderLightSource(selectedFilter, selectedChild) {
        let parsedLight = JSON.parse(selectedChild)
        if (parsedLight.filterName === "feDistantLight") {
            return (
                <div className="light-source">
                    <div className="small-heading-padding">
                        Azimuth: {parsedLight.azimuth}
                    </div>
                    <div className="filter-container-center">
                        <Slider
                            value={Number(parsedLight.azimuth)}
                            color="primary"
                            max={360}
                            onChange={(event, newValue) => {this.setNewLightChild(selectedFilter, parsedLight, "azimuth", newValue)}}
                        />
                    </div>
                    <div className="small-heading-padding">
                        Elevation: {parsedLight.elevation}
                    </div>
                    <div className="filter-container-center">
                        <Slider
                            value={Number(parsedLight.elevation)}
                            color="primary"
                            max={60}
                            onChange={(event, newValue) => {this.setNewLightChild(selectedFilter, parsedLight, "elevation", newValue)}}
                        />
                    </div>
                </div>
            )
        }
        else if (parsedLight.filterName === "fePointLight") {
            return (
                <div className="light-source">
                    <div className="small-heading-padding">
                        Drag above to adjust the position of the light source. Scroll to adjust light height.
                    </div>
                </div>
            )
        }
        else if (parsedLight.filterName === "feSpotLight") {
            return (
                <div className="light-source">
                    <div className="small-heading-padding">
                        Drag above to adjust the position of the light.
                    </div>
                    <div className="filter-container-center flex-wrap">
                    {
                        ["source", "target"].map((style, index) => {
                            return (
                            <span key={"spotlight-"+index} className="button-wrapper2">
                                <div className={this.props.selectedSpotlightType === style ? "button-outlined button-selected" : "button-outlined"} onClick={() => this.props.setSpotlightType(style)}>{style}</div>
                            </span>
                            )
                        })
                    }
                    </div>
                    Scroll to adjust height.
                </div>
            )
        }
        else {
            return(<span></span>)
        }
    }

    getNewLightSource(lightType) {
        if (lightType === "feSpotLight") {
            return JSON.stringify({ filterName: "feSpotLight", x: 5, y: 5, z: 5, pointsAtX: 50, pointsAtY: 50, pointsAtZ: 0, specularExponent: 1, limitingConeAngle: 40})
        }
        else if (lightType === "fePointLight") {
            return JSON.stringify({ filterName: "fePointLight", x: 25, y: 125, z: 25})
        }
        else {
            return JSON.stringify({ filterName: "feDistantLight", azimuth: 60, elevation: 50 })
        }
    }

    renderDiffuseLighting(selectedFilter) {
        let surfaceScale = this.props.selectedAnimationState !== -1 && this.props.paramToAnimate === "surfaceScale" ? JSON.parse(JSON.parse(selectedFilter.animation)["surfaceScale"]).values.split(";")[this.props.selectedAnimationState] : selectedFilter.surfaceScale
        let diffuseConstant = this.props.selectedAnimationState !== -1 && this.props.paramToAnimate === "diffuseConstant" ? JSON.parse(JSON.parse(selectedFilter.animation)["diffuseConstant"]).values.split(";")[this.props.selectedAnimationState] : selectedFilter.diffuseConstant
        let lightingColor = selectedFilter.lightingColor === undefined ? "white" : selectedFilter.lightingColor
        return (
            <div id="generated-params">
                <div className='small-heading-padding'>
                    Lighting color: &nbsp; <ColorPicker color={lightingColor} renderLabel={false} changeColor={(color) => {this.updateFilter(selectedFilter, "lightingColor", color.hex)}}/>
                </div>
                <div className="small-heading-padding">
                    Surface height: {surfaceScale}
                    {this.renderAnimation(selectedFilter, "surfaceScale")}
                </div>
                <div className="filter-container-center">
                    <Slider
                        disabled={this.getDisabledCondition(selectedFilter, "surfaceScale")}
                        value={Number(surfaceScale)}
                        color="primary"
                        step={1}
                        max={25}
                        onChange={(event, newValue) => {this.updateFilter(selectedFilter, "surfaceScale", newValue)}}
                    />
                </div>
                <div className="small-heading-padding">
                    Diffuse constant (k_d): {diffuseConstant}
                    {this.renderAnimation(selectedFilter, "diffuseConstant")}
                </div>
                <div className="filter-container-center">
                    <Slider
                        disabled={this.getDisabledCondition(selectedFilter, "diffuseConstant")}
                        value={Number(diffuseConstant)}
                        color="primary"
                        step={0.01}
                        max={2}
                        onChange={(event, newValue) => {this.updateFilter(selectedFilter, "diffuseConstant", newValue)}}
                    />
                </div>
                <div id="light-source-container">
                    <div className="filter-container-center flex-wrap">
                        {
                            this.lightTypes.map((style, index) => {
                                return (
                                <span key={"diffuseLight-"+index} className="button-wrapper2">
                                    <div className={JSON.parse(selectedFilter.child).filterName === style ? "button-outlined button-outlined-smaller-padding button-selected" : "button-outlined button-outlined-smaller-padding"} onClick={() => this.updateFilter(selectedFilter, "child", this.getNewLightSource(style))}>{this.lightMap[style]}</div>
                                </span>
                                )
                            })
                        }
                    </div>
                    {this.renderLightSource(selectedFilter, selectedFilter["child"])}
                </div>
            </div>
        )
    }

    renderSpecularLighting(selectedFilter) {
        let surfaceScale = this.props.selectedAnimationState !== -1 && this.props.paramToAnimate === "surfaceScale" ? JSON.parse(JSON.parse(selectedFilter.animation)["surfaceScale"]).values.split(";")[this.props.selectedAnimationState] : selectedFilter.surfaceScale
        let specularConstant = this.props.selectedAnimationState !== -1 && this.props.paramToAnimate === "specularConstant" ? JSON.parse(JSON.parse(selectedFilter.animation)["specularConstant"]).values.split(";")[this.props.selectedAnimationState] : selectedFilter.specularConstant
        let specularExponent = this.props.selectedAnimationState !== -1 && this.props.paramToAnimate === "specularExponent" ? JSON.parse(JSON.parse(selectedFilter.animation)["specularExponent"]).values.split(";")[this.props.selectedAnimationState] : selectedFilter.specularExponent
        let lightingColor = selectedFilter.lightingColor ? selectedFilter.lightingColor : "white"
        return (
            <div id="generated-params">
                <div className='small-heading-padding'>
                    Lighting color: &nbsp; <ColorPicker color={lightingColor} renderLabel={false} changeColor={(color) => {this.updateFilter(selectedFilter, "lightingColor", color.hex)}}/>
                </div>
                <div className="small-heading-padding">
                    Surface height: {surfaceScale}
                    {this.renderAnimation(selectedFilter, "surfaceScale")}
                </div>
                <div className="filter-container-center">
                    <Slider
                        disabled={this.getDisabledCondition(selectedFilter, "surfaceScale")}
                        value={Number(surfaceScale)}
                        color="primary"
                        step={1}
                        max={25}
                        onChange={(event, newValue) => {this.updateFilter(selectedFilter, "surfaceScale", newValue)}}
                    />
                </div>
                <div className="small-heading-padding">
                    Specular constant (k_s): {specularConstant}
                    {this.renderAnimation(selectedFilter, "specularConstant")}
                </div>
                <div className="filter-container-center">
                    <Slider
                        disabled={this.getDisabledCondition(selectedFilter, "specularConstant")}
                        value={Number(specularConstant)}
                        color="primary"
                        step={0.01}
                        max={2}
                        onChange={(event, newValue) => {this.updateFilter(selectedFilter, "specularConstant", newValue)}}
                    />
                </div>
                <div className="small-heading-padding">
                    Specular exponent: {specularExponent}
                </div>
                <div className="filter-container-center">
                    <Slider
                        disabled={this.getDisabledCondition(selectedFilter, "specularExponent")}
                        value={Number(specularExponent)}
                        color="primary"
                        max={50}
                        onChange={(event, newValue) => {this.updateFilter(selectedFilter, "specularExponent", newValue)}}
                    />
                </div>
                <div id="light-source-container">
                    <div className="filter-container-center flex-wrap">
                        {
                            this.lightTypes.map((style, index) => {
                                return (
                                <span key={"specularLight-"+index} className="button-wrapper2">
                                    <div className={JSON.parse(selectedFilter.child).filterName === style ? "button-outlined button-outlined-smaller-padding button-selected" : "button-outlined button-outlined-smaller-padding"} onClick={() => this.updateFilter(selectedFilter, "child", this.getNewLightSource(style))}>{this.lightMap[style]}</div>
                                </span>
                                )
                            })
                        }
                    </div>
                    {this.renderLightSource(selectedFilter, selectedFilter["child"])}
                </div>
            </div>
        )
    }

    setNewComponentTransfer(selectedFilter, childIndex, paramToUpdate, newValue, iterateThroughAllChildren=false) {
        let originalType = JSON.parse(selectedFilter.child[0]).type
        let filterNames = ["feFuncR", "feFuncG", "feFuncB"]
        if (originalType === newValue) {
            return
        }
        else if (newValue === 'linear') {
            for (let i = 0; i < selectedFilter.child.length; i++) {
                selectedFilter.child[i] = JSON.stringify({filterName: filterNames[i], type: "linear", slope: 0.1, intercept: 0.1})
            }
        }
        else if (originalType === 'linear' && newValue === 'table') {
            for (let i = 0; i < selectedFilter.child.length; i++) {
                selectedFilter.child[i] = JSON.stringify({filterName: filterNames[i], type: "table", tableValues: "0 0.5 1"})
            }
        }
        else if (originalType === 'linear' && newValue === 'discrete') {
            for (let i = 0; i < selectedFilter.child.length; i++) {
                selectedFilter.child[i] = JSON.stringify({filterName: filterNames[i], type: "discrete", tableValues: "0 0.5 1"})
            }
        }
        else {
            if (iterateThroughAllChildren) {
                for (let i = 0; i < selectedFilter.child.length; i++) {
                    let parsedChild = JSON.parse(selectedFilter.child[i])
                    parsedChild[paramToUpdate] = newValue
                    let newChild = JSON.stringify(parsedChild)
                    selectedFilter.child[i] = newChild
                }
            }
            else {
                let parsedChild = JSON.parse(selectedFilter.child[childIndex])
                parsedChild[paramToUpdate] = newValue
                let newChild = JSON.stringify(parsedChild)
                selectedFilter.child[childIndex] = newChild
            }
        }
        this.updateFilter(selectedFilter, "child", selectedFilter.child)
    }

    renderComponentTransfer(selectedFilter) {
        let type = JSON.parse(selectedFilter.child[0]).type
        if (type === "table" || type === "discrete") {
            let colorDict = {}
            let gradientDict = {}
            let increment = 100 / (JSON.parse(selectedFilter.child[0]).tableValues.trim().split(" ").length)
            for (let i = 0; i < selectedFilter.child.length; i++) {
                let child = JSON.parse(selectedFilter.child[i])
                colorDict[child.filterName.slice(-1).toLowerCase()] = child.tableValues.trim().split(" ").map(Number)
                let gradients = child.tableValues.trim().split(" ").map((val, index) => {
                    let rgb = [0,0,0]
                    rgb[i] = Math.round(Number(val) * 255)
                    let discretizer = type === "discrete" ? ` ${index*increment}% ${(index+1)*increment}%` : ""
                    return "rgb(" + rgb.join(",") + ")" + discretizer
                })
                gradientDict[child.filterName.slice(-1).toLowerCase()] = (gradients).join(", ")
            }
            let allColors = []
            for (let i=0; i < colorDict['r'].length; i++) {
                let color = []
                for (let k in colorDict) {
                    color.push(Math.round(colorDict[k][i] * 255))
                }
                let discretizer = type === "discrete" ? ` ${i*increment}% ${(i+1)*increment}%` : ""
                allColors.push("rgb(" + color.join(",") + ")" + discretizer)
            }
            allColors = allColors.join(", ")
            return (
                <div id="generated-params">
                    <div className="small-heading-padding">
                        Map colors to new ranges
                    </div>
                    <div className="filter-container-center flex-wrap">
                    {
                        ["table", "discrete", "linear"].map((style, index) => {
                            return (
                            <span key={"componentTransferType-"+style+index} className="button-wrapper2">
                                <div className={type === style ? "button-outlined button-selected" : "button-outlined"} onClick={() => this.setNewComponentTransfer(selectedFilter, index, "type", style, true)}>{style}</div>
                            </span>
                            )
                        })
                    }
                    </div>
                    {["r", "g", "b"].map((col, index) => {
                        return (<div key={"componentTransfer-slider-" + index}>
                            <div className="filter-container-center">
                            <span className="small-padding-right">{col.toUpperCase()}</span>
                            <Slider
                                value={colorDict[col]}
                                max={1}
                                track={type==="table"}
                                step={0.01}
                                color="primary"
                                onChange={(event, newValue) => {this.setNewComponentTransfer(selectedFilter, index, "tableValues", newValue.join(" "))}}
                            />
                            </div>
                            <div style={{backgroundImage: `linear-gradient(to right, ${gradientDict[col]})`, height: "20px", borderRadius: "5px"}}></div>
                        </div>)
                    })
                    }
                    <div className="small-heading-padding">
                        Output color
                    </div>
                    <div style={{backgroundImage: `linear-gradient(to right, ${allColors})`, height: "20px", borderRadius: "5px"}}></div>
                </div>
            )
        }
        else if (type === "linear") {
            let parsedChildren = selectedFilter.child.map(c => JSON.parse(c))
            return (
                <div>
                    <div className="small-heading-padding">
                         Map colors to new ranges
                    </div>
                    <div className="filter-container-center flex-wrap">
                        {
                            ["table", "discrete", "linear"].map((style, index) => {
                                return (
                                    <span key={"componentTransferType-"+style+index} className="button-wrapper2">
                                        <div className={type === style ? "button-outlined button-selected" : "button-outlined"} onClick={() => this.setNewComponentTransfer(selectedFilter, index, "type", style, true)}>{style}</div>
                                    </span>
                                )
                            })
                        }
                    </div>
                    {['Red', 'Green', 'Blue'].map((col, index) => {
                        return (
                            <div key={"componentTransferLinear"+index}>
                                <div className="small-heading-padding">
                                    {col}
                                </div>
                                <div className="filter-container-center">
                                    <span className="small-padding-right helper-text">Slope</span>
                                    <Slider
                                        value={Number(parsedChildren[index].slope)}
                                        color="primary"
                                        max={5}
                                        step={0.01}
                                        onChange={(event, newValue) => {this.setNewComponentTransfer(selectedFilter, index, "slope", newValue)}}
                                    />
                                </div>
                                <div className="filter-container-center">
                                    <span className="small-padding-right helper-text">Intercept</span>
                                    <Slider
                                        value={Number(parsedChildren[index].intercept)}
                                        color="primary"
                                        max={5}
                                        step={0.01}
                                        onChange={(event, newValue) => {this.setNewComponentTransfer(selectedFilter, index, "intercept", newValue)}}
                                    />
                                </div>
                            </div>
                        )
                    })
                    }
                </div>
            )
        }
        else {
            return(<div>WIP</div>)
        }
    }

    convolveMatrixOnWheel(event, index, kernelMatrix, selectedFilter) {
        if (event.deltaY > 0) {
            kernelMatrix[index] = Number(kernelMatrix[index]) - 1
        }
        else if (event.deltaY < 0) {
            kernelMatrix[index] = Number(kernelMatrix[index]) + 1
        }
        kernelMatrix = kernelMatrix.join(" ")
        this.updateFilter(selectedFilter, "kernelMatrix", kernelMatrix)
    }

    renderConvolveMatrix(selectedFilter) {
        let kernelMatrix = this.props.selectedAnimationState !== -1 && this.props.paramToAnimate === "kernelMatrix" ? JSON.parse(JSON.parse(selectedFilter.animation)["kernelMatrix"]).values.split(";")[this.props.selectedAnimationState] : selectedFilter.kernelMatrix
        let color1 = [131, 58, 180]
        let color2 = [252, 176, 69]
        kernelMatrix = kernelMatrix.split(" ")
        let kernelMatrixColors = kernelMatrix.map(val => {
            val = Number(val)
            let maxMin = val > 0 ? 20 : -20
            val /= maxMin
            return `rgb(${Math.round(color1[0] * val + color2[0] * (1-val))}, ${Math.round(color1[1] * val + color2[1] * (1-val))}, ${Math.round(color1[2] * val + color2[2] * (1-val))})`
        })
        return (
            <div id="generated-params">
                <div className="small-heading-padding">
                    Scroll to change intensity.
                    {this.renderAnimation(selectedFilter, "kernelMatrix")}
                </div>
                <br/>
                <div className="medium-padding">
                    <Grid container spacing={4}>
                        {kernelMatrixColors.map((matrixVal, index) => {
                            return (
                            <Grid item key={"kernel-val-"+index} xs={4}>
                                <Paper onWheel={(event) => this.convolveMatrixOnWheel(event, index, kernelMatrix, selectedFilter)} className="scrollable" style={{ backgroundColor: matrixVal, height: "50px"}}><div className="filter-container-center ">{kernelMatrix[index]}</div></Paper>
                            </Grid>
                            )
                        })}
                    </Grid>
                </div>
            </div>
        )
    }

    displayPatternParams(
        selectedFilter, 
        cellwidth, cellheight,
        dx, dy, sx, sy, rotation,
        unitType, unitrot
    ){
        if(this.state.patternParamMode === "unit"){
            return (
                <div>
                    <div className="small-heading-padding">
                        Unit Width: {cellwidth}
                        {this.renderAnimation(selectedFilter, "cellwidth")}
                    </div>
                    <div className="filter-container-center">
                        <Slider
                            disabled={this.getDisabledCondition(selectedFilter, "cellwidth")}
                            value={Number(cellwidth)}
                            color="primary"
                            min={1}
                            max={50}
                            onChange={(event, newValue) => {this.updateFilter(selectedFilter, "cellwidth", newValue)}}
                        />
                    </div>

                    <div className="small-heading-padding">
                        Unit Height: {cellheight}
                        {this.renderAnimation(selectedFilter, "cellheight")}
                    </div>
                    <div className="filter-container-center">
                        <Slider
                            disabled={this.getDisabledCondition(selectedFilter, "cellheight")}
                            value={Number(cellheight)}
                            color="primary"
                            min={1}
                            max={50}
                            onChange={(event, newValue) => {this.updateFilter(selectedFilter, "cellheight", newValue)}}
                        />
                    </div>

                    <div className="small-heading-padding">
                        Unit Rotation: {unitrot}
                    </div>
                    <div className="filter-container-center slimmer-slider">
                        <Slider
                            disabled={this.getDisabledCondition(selectedFilter, "unitrot")}
                            value={Number(unitrot)}
                            color="primary"
                            min={0}
                            max={359}
                            onChange={(event, newValue) => {this.updateFilter(selectedFilter, "unitrot", newValue)}}
                        />
                    </div>

                    <div className="small-heading-padding">
                        Unit Shape: {unitType.slice(0, 1).toUpperCase() + unitType.slice(1)}
                    </div>
                    <div id='other-shapes'>
                        <Grid container spacing={1} 
                            style={{
                                margin: 0,
                                width: '280px',
                            }}>
                            <Grid item xs={4}>
                                <Button variant="outlined" size="small" id='grid-unit-type-selector'
                                    onClick={() => this.updateFilter(selectedFilter, "unittype", "square")}>
                                    <svg width={50} height={50}>
                                        <rect x={10} y={10} width={30} height={30}></rect>
                                    </svg>
                                </Button>
                            </Grid>
                            <Grid item xs={4}>
                                <Button variant="outlined" size="small" id='grid-unit-type-selector'
                                    onClick={() => this.updateFilter(selectedFilter, "unittype", "circle")}>
                                    <svg width={50} height={50}>
                                        <circle cx={25} cy={25} r={15}></circle>
                                    </svg>
                                </Button>
                            </Grid>
                            <Grid item xs={4}>
                                <Button variant="outlined" size="small" id='grid-unit-type-selector'
                                    onClick={() => this.updateFilter(selectedFilter, "unittype", "triangle")}>
                                    <svg width={50} height={50}>
                                        <path fill='#000000' d='M 25 10 L 42 40 L 8 40 L 25 10'>
                                        </path>
                                    </svg>
                                </Button>
                            </Grid>
                            <Grid item xs={4}>
                                <Button variant="outlined" size="small" id='grid-unit-type-selector'
                                    onClick={() => this.updateFilter(selectedFilter, "unittype", "star")}>
                                    <svg width={50} height={50}>
                                        <path fill='#000000' d='M 25 7.5 L 31 19 L 42.5 25 L 31 31 L 25 42.5 L 19 31 L 7.5 25 L 19 19 L 25 7.5'>
                                        </path>
                                    </svg>
                                </Button>
                            </Grid>
                            <Grid item xs={4}>
                                <Button variant="outlined" size="small" id='grid-unit-type-selector'
                                    onClick={() => this.updateFilter(selectedFilter, "unittype", "hexagon")}>
                                    <svg width={50} height={50}>
                                    <path fill='#000000' d='M 16.3 10 L 33.7 10 L 42.5 25 L 33.7 40 L 16.3 40 L 7.5 25 L 16.3 10'>
                                        </path>
                                    </svg>
                                </Button>
                            </Grid>
                            <Grid item xs={4}>
                                <Button variant="outlined" size="small" id='grid-unit-type-selector'
                                    onClick={() => this.updateFilter(selectedFilter, "unittype", "hatches")}>
                                    <svg width={50} height={50}>
                                    <path style={{transform: 'scale(0.65, 0.65)', transformOrigin: '25px 25px'}} fill='#000000' d='M 0,0 h 50 v 5 h -50 v -5 z M 0,15 h 50 v 5 h -50 v -5 z M 0,30 h 50 v 5 h -50 v -5 z M 0,45 h 50 v 5 h -50 v -5 z'>
                                        </path>
                                    </svg>
                                </Button>
                            </Grid>
                        </Grid>
                    </div>

                    <div id='custom-unit-shape-container'>
                        <div>
                            Import a unit shape:
                        </div>
                        <input id='svg-pattern-unit-input' type="file" accept="image/svg+xml" onChange={(event => {
                            const file = event.target.files[0];

                            const fr = new FileReader();
                            fr.onload = (event) => {
                                const svgString = event.target.result;
                                const svgBlob = new Blob([svgString], { type: "image/svg+xml" }); // extract svg string and use as blob, we will save it later!
                                const url = URL.createObjectURL(svgBlob);

                                let parsedParams = this.props.params.map(p => JSON.parse(p));
                                let targetPatternParam = parsedParams[this.props.selectedFilterIndex];
                                let targetPatternID = targetPatternParam.href.slice(1);

                                let targetPatternHandler = this.props.patternHandlers.get(targetPatternID);
                                targetPatternHandler.swapRectWithImage(svgBlob, url, this.props.index, this.props.selectedFilterIndex, targetPatternParam); // pass indexes because we need to manually call update filter code
                            };
                            fr.readAsText(file);
                        })}/>
                        <Button id='svg-upload-button' onClick={() => {
                            const fileInput = document.getElementById('svg-pattern-unit-input');
                            fileInput.click();
                        }} variant="outlined" size="small">Open .SVG file</Button>
                    </div>
                </div>
            )
        } else {
            return (
                <div>
                    <div className="small-heading-padding">
                        X Spacing: {dx}
                    </div>
                    <div className="filter-container-center slimmer-slider">
                        <Slider
                            disabled={this.getDisabledCondition(selectedFilter, "dx")}
                            value={Number(dx)}
                            color="primary"
                            min={1}
                            max={50}
                            onChange={(event, newValue) => {this.updateFilter(selectedFilter, "dx", newValue)}}
                        />
                    </div>

                    <div className="small-heading-padding">
                        Y Spacing: {dy}
                    </div>
                    <div className="filter-container-center slimmer-slider">
                        <Slider
                            disabled={this.getDisabledCondition(selectedFilter, "dy")}
                            value={Number(dy)}
                            color="primary"
                            min={1}
                            max={50}
                            onChange={(event, newValue) => {this.updateFilter(selectedFilter, "dy", newValue)}}
                        />
                    </div>
                    
                    <div className="small-heading-padding">
                        Shift X: {sx}
                        {this.renderAnimation(selectedFilter, "sx")}
                    </div>
                    <div className="filter-container-center">
                        <Slider
                            disabled={this.getDisabledCondition(selectedFilter, "sx")}
                            value={Number(sx)}
                            color="primary"
                            min={-50}
                            max={50}
                            onChange={(event, newValue) => {this.updateFilter(selectedFilter, "sx", newValue)}}
                        />
                    </div>

                    <div className="small-heading-padding">
                        Shift Y: {sy}
                        {this.renderAnimation(selectedFilter, "sy")}
                    </div>
                    <div className="filter-container-center">
                        <Slider
                            disabled={this.getDisabledCondition(selectedFilter, "sy")}
                            value={Number(sy)}
                            color="primary"
                            min={-50}
                            max={50}
                            onChange={(event, newValue) => {this.updateFilter(selectedFilter, "sy", newValue)}}
                        />
                    </div>

                    <div className="small-heading-padding">
                        Rotation: {rotation}
                    </div>
                    <div className="filter-container-center slimmer-slider">
                        <Slider
                            disabled={this.getDisabledCondition(selectedFilter, "rotation")}
                            value={Number(rotation)}
                            color="primary"
                            min={0}
                            step={5}
                            max={360}
                            onChange={(event, newValue) => {this.updateFilter(selectedFilter, "rotation", newValue)}}
                        />
                    </div>
                </div>
            )
        }
    }

    renderPattern(selectedFilter){
        selectedFilter.type = selectedFilter.type === undefined ? "turbulence" : selectedFilter.type
        if(selectedFilter.patterntype === 'grid'){ 
            let cellwidth = this.props.selectedAnimationState !== -1 && this.props.paramToAnimate === "cellwidth" ? 
                JSON.parse(JSON.parse(selectedFilter.animation)["cellwidth"]).values.split(";")[this.props.selectedAnimationState] : 
                selectedFilter.cellwidth;
            let cellheight = this.props.selectedAnimationState !== -1 && this.props.paramToAnimate === "cellheight" ? 
                JSON.parse(JSON.parse(selectedFilter.animation)["cellheight"]).values.split(";")[this.props.selectedAnimationState] : 
                selectedFilter.cellheight;
            let dx = this.props.selectedAnimationState !== -1 && this.props.paramToAnimate === "dx" ? 
                JSON.parse(JSON.parse(selectedFilter.animation)["dx"]).values.split(";")[this.props.selectedAnimationState] : 
                selectedFilter.dx;
            let dy = this.props.selectedAnimationState !== -1 && this.props.paramToAnimate === "dy" ? 
                JSON.parse(JSON.parse(selectedFilter.animation)["dy"]).values.split(";")[this.props.selectedAnimationState] : 
                selectedFilter.dy;

            let sx = this.props.selectedAnimationState !== -1 && this.props.paramToAnimate === "sx" ? 
                JSON.parse(JSON.parse(selectedFilter.animation)["sx"]).values.split(";")[this.props.selectedAnimationState] : 
                selectedFilter.sx;
            let sy = this.props.selectedAnimationState !== -1 && this.props.paramToAnimate === "sy" ? 
                JSON.parse(JSON.parse(selectedFilter.animation)["sy"]).values.split(";")[this.props.selectedAnimationState] : 
                selectedFilter.sy;

            let rotation = this.props.selectedAnimationState !== -1 && this.props.paramToAnimate === "rotation" ? 
                JSON.parse(JSON.parse(selectedFilter.animation)["rotation"]).values.split(";")[this.props.selectedAnimationState] : 
                selectedFilter.rotation;

            let unitType = this.props.selectedAnimationState !== -1 && this.props.paramToAnimate === "unittype" ? 
                JSON.parse(JSON.parse(selectedFilter.animation)["unittype"]).values.split(";")[this.props.selectedAnimationState] : 
                selectedFilter.unittype;
            let unitRot = this.props.selectedAnimationState !== -1 && this.props.paramToAnimate === "unitrot" ? 
                JSON.parse(JSON.parse(selectedFilter.animation)["unitrot"]).values.split(";")[this.props.selectedAnimationState] : 
                selectedFilter.unitrot;

            return (
                <div>
                    <ToggleButtonGroup
                        id="pattern-paramlist-selector"
                        color="secondary"
                        value={this.state.patternParamMode}
                        exclusive
                        onChange={(event, newValue) => {
                            this.props.setAnimationAnchor("", true);
                            this.setState({patternParamMode: newValue})
                        }}>
                        <ToggleButton id="pattern-paramlist-option" value="grid">Grid</ToggleButton>
                        <ToggleButton id="pattern-paramlist-option" value="unit">Unit</ToggleButton>
                    </ToggleButtonGroup>

                    {this.displayPatternParams(selectedFilter, cellwidth, cellheight, dx, dy, sx, sy, rotation, unitType, unitRot)}
                </div>
            )
        } 

        else if(selectedFilter.patterntype === 'line'){
            let dx = selectedFilter.dx
            let linewidth = selectedFilter.linewidth
            let angle = selectedFilter.angle

            return (
                <div id="generated-params">
                    <div className="small-heading-padding">
                        Line Spacing: {dx}
                    </div>
                    <div className="filter-container-center">
                        <Slider
                            disabled={this.getDisabledCondition(selectedFilter, "dx")}
                            value={dx}
                            color="primary"
                            min={1}
                            max={100}
                            onChange={(event, newValue) => {this.updateFilter(selectedFilter, "dx", newValue)}}
                        />
                    </div>

                    <div className="small-heading-padding">
                        Line Width: {linewidth}
                    </div>
                    <div className="filter-container-center">
                        <Slider
                            disabled={this.getDisabledCondition(selectedFilter, "linewidth")}
                            value={Number(linewidth)}
                            color="primary"
                            min={1}
                            max={100}
                            onChange={(event, newValue) => {this.updateFilter(selectedFilter, "linewidth", newValue)}}
                        />
                    </div>

                    <div className="small-heading-padding">
                        Angle: {angle}
                    </div>
                    <div className="filter-container-center">
                        <Slider
                            disabled={this.getDisabledCondition(selectedFilter, "angle")}
                            value={Number(angle)}
                            color="primary"
                            min={0}
                            max={360}
                            onChange={(event, newValue) => {this.updateFilter(selectedFilter, "angle", newValue)}}
                        />
                    </div>
                </div>
            )
        }
    }

    renderSelectedFilter(selectedFilter, isDepthEffect=false) {
        if (selectedFilter === undefined) { // defaults to Pan & Zoom filter
            return (
                <div id="generated-params">
                    Click on a node on the right to see details.
                </div>
            )
        } else {
            switch (selectedFilter.filterName) {
                case "feBlend":
                    return this.renderBlend(selectedFilter)
                case "feColorMatrix":
                    return this.renderColorMatrix(selectedFilter)
                case "feComponentTransfer":
                    return this.renderComponentTransfer(selectedFilter)
                case "feComposite":
                    return this.renderComposite(selectedFilter)
                case "feConvolveMatrix":
                    return this.renderConvolveMatrix(selectedFilter)
                case "feDisplacementMap":
                    return this.renderDisplacementMap(selectedFilter, isDepthEffect)
                case "feDiffuseLighting":
                    return this.renderDiffuseLighting(selectedFilter)
                case "feDropShadow":
                    return this.renderDropShadow(selectedFilter, isDepthEffect)
                case "feFlood":
                    return this.renderFlood(selectedFilter, isDepthEffect)
                case "feGaussianBlur":
                    return this.renderGaussianBlur(selectedFilter, isDepthEffect)
                case "feMorphology":
                    return this.renderMorphology(selectedFilter, isDepthEffect)
                case "feSpecularLighting":
                    return this.renderSpecularLighting(selectedFilter)
                case "feTurbulence":
                    return this.renderTurbulence(selectedFilter)
                case "feImage":
                    return this.renderPattern(selectedFilter)
                default:
                    return (
                        selectedFilter.filterName
                    )
            }
        }
    }

    makeDepthEffectsList(selectedFilter, callback) {
        let depthEffectsList = []
        for (let i = 0; i < this.props.maxDepth+1; i++) {
            depthEffectsList.push(JSON.parse(JSON.stringify(selectedFilter)))
        }
        selectedFilter["depthEffects"] = JSON.stringify(depthEffectsList)
        let code = JSON.stringify(selectedFilter)
        this.props.updateFilterCode(code, this.props.index, this.props.selectedFilterIndex).then(() => {
            callback()
        })
    }

    updateDepthEffect(selectedFilter, index, paramToUpdate, newVal, fromSlider=false) {
        if (fromSlider) {
            selectedFilter = this.props.params[this.props.selectedFilterIndex] ? JSON.parse(this.props.params[this.props.selectedFilterIndex]): undefined
        }
        let depthEffects = JSON.parse(selectedFilter["depthEffects"])
        depthEffects[index][paramToUpdate] = newVal
        this.updateDepthEffectHelper(selectedFilter, index, depthEffects)
    }

    updateDepthEffectHelper(selectedFilter, index, newDepthEffects) {
        selectedFilter["depthEffects"] = JSON.stringify(newDepthEffects)
        let code = JSON.stringify(selectedFilter)
        this.props.updateFilterCode(code, this.props.index, this.props.selectedFilterIndex).then(() => {
            this.props.refreshPreview(null, index)
        })
    }

    removeDepthEffect(selectedFilter) {
        delete selectedFilter.depthEffects
        let code = JSON.stringify(selectedFilter)
        this.props.updateFilterCode(code, this.props.index, this.props.selectedFilterIndex).then(() => {
            this.props.refreshPreview()
        })
    }

    updateCurrDepthIndex(newDepthIndex) {
        this.setState({currDepthIndex: newDepthIndex})
    }

    render() {
        let selectedFilter = this.props.params[this.props.selectedFilterIndex] ? JSON.parse(this.props.params[this.props.selectedFilterIndex]): undefined
        if (selectedFilter !== undefined && selectedFilter.filterName === "feColorMatrix") {
            this.setColorMatrix(selectedFilter.values)
        }
        let filterTitle = selectedFilter === undefined ? "Configure Filter" : "Configure " + selectedFilter.filterName.substring(2)
        let docLink = selectedFilter === undefined ? <div></div> : <div className="padding-top small-bold-text">See documentation <a target="_blank" rel="noreferrer" href={`https://developer.mozilla.org/en-US/docs/Web/SVG/Element/${selectedFilter.filterName}`}>here</a>.</div>
        return(
            <div>
                <h3>{filterTitle}</h3>
                {(this.depthEffectRef.current && selectedFilter && selectedFilter.depthEffects) ? this.renderSelectedFilter(JSON.parse(selectedFilter.depthEffects)[this.state.currDepthIndex], true) : this.renderSelectedFilter(selectedFilter)} 
                {/* {this.renderSelectedFilter(selectedFilter)} */}
                {selectedFilter ? <FilterDepthEffect ref={this.depthEffectRef} 
                    makeDepthEffectsList={this.makeDepthEffectsList} 
                    maxDepth={this.props.maxDepth} 
                    updateDepthEffect={this.updateDepthEffect}
                    updateDepthEffectHelper={this.updateDepthEffectHelper}
                    removeDepthEffect={this.removeDepthEffect}
                    updateCurrDepthIndex={this.updateCurrDepthIndex}
                    refreshPreview={this.props.refreshPreview}
                    currDepthIndex={this.state.currDepthIndex}
                    selectedFilter={selectedFilter}/> : <span></span>}
                {docLink}
            </div>
        )
    }
}

export default FilterParamEditor