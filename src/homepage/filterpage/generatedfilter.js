import React from 'react'
import CircularProgress from '@material-ui/core/CircularProgress';
import Slider from '@material-ui/core/Slider';
import Checkbox from '@material-ui/core/Checkbox';


import './generatedfilter.css'

/**
 * Displays a filter extracted from a photo
 */
class GeneratedFilter extends React.Component {
    constructor(props) {
        super(props)
        this.state = {
            seed: 0,
            rectangularPattern: false,
            lightingChecked: false,
            lightingColor: "white",
            turbulenceFrequencyX: 0.1,
            turbulenceFrequencyY: 0.1
        }
        this.jsonLoaded = false
        this.json = {}
        this.reds = ""
        this.greens = ""
        this.blues = ""
        this.turbulenceFrequency = "0.1"
        this.rectangularPattern = false
        
        this.initializedLighting = false
    }

    componentDidUpdate() {
        if (this.jsonLoaded) {
            if (!this.initializedLighting) {
                //if 3 colors are similar apply lighting with color
                if (this.colorsAreClose(this.json.colors)) {
                    this.setState({lightingChecked: true})
                }
                this.setState({lightingColor: `rgb(${this.json.colors[1].x+10},${this.json.colors[1].y+10},${this.json.colors[1].z+10})`})
                this.initializedLighting = true
            }
        }
    }

    parseJSON() {
        try {
            this.json = JSON.parse(this.props.extractedInfo)
            console.log(this.json)
            let scaleArea = Math.sqrt(this.json.avgArea / this.json.baseAvgArea)
            let scaleAspectRatio = this.json.avgAspectRatio / this.json.baseAvgAspectRatio
            console.log(scaleArea)
            console.log(scaleAspectRatio)
            let xDisplacement = (this.json.columns / (this.json.avgWidth + 1)) / this.json.columns
            let yDisplacement = (this.json.rows / (this.json.avgHeight + 1)) / this.json.rows
            // rectangular?
            if (this.json.avgRectAreaOverArea < 2) {
                this.rectangularPattern = true
            }
            // color
            for (let i = 0; i < this.json.colors.length; i++) {
                this.reds += this.json.colors[i].x/255 + " "
                this.greens += this.json.colors[i].y/255 + " "
                this.blues += this.json.colors[i].z/255 + " "
            }
            // direction
            this.setState({turbulenceFrequencyX: (this.json.baseFrequency / scaleArea).toFixed(3)})
            this.setState({turbulenceFrequencyY: ((this.json.baseFrequency / scaleArea) * scaleAspectRatio).toFixed(3)})
            this.turbulenceFrequency = `${this.state.turbulenceFrequencyX} ${this.state.turbulenceFrequencyY}`
            if (this.json.avgAspectRatio < 2 && this.json.avgAspectRatio > 0.8 && this.rectangularPattern) {
                this.turbulenceFrequency = `0.1`
                this.turbulenceFrequencyRow = `${xDisplacement} 0.7`
                this.turbulenceFrequencyColumn = `0.7 ${yDisplacement}`
            }
            this.jsonLoaded = true
        }
        catch(err) {
            console.log("JSON not loaded")
        }
    }

    /**
     * Computes color closeness based on Euclidean distance
     * @param {*} colors
     */
    colorsAreClose(colors) {
        let distance = function(c1, c2){
            return Math.sqrt(Math.pow(c1.x-c2.x, 2) + Math.pow(c1.y-c2.y, 2) + Math.pow(c1.z-c2.z, 2))
        }
        return distance(colors[0], colors[1]) < 50 && distance(colors[1], colors[2]) && distance(colors[2], colors[0])
    }

    displayColor(colors) {
        if (colors !== undefined) {
            return(
                colors.map((color, index) => 
                    <span key={"extracted-color-"+index}>
                        <svg width="50" height="50" xmlns="http://www.w3.org/2000/svg">
                            <rect width="50" height="50" style={{fill : `rgb(${color.x},${color.y},${color.z})`}}/>
                        </svg>
                    </span>
                )
            )
        }
        else {
            return (
                <div></div>
            )
        }
    }

    displayFilter() {
        if (this.turbulenceFrequency === "0.1" && this.rectangularPattern) {
            if (this.state.lightingChecked) {
                return (
                    <filter id="generated-filter">
                        <feTurbulence seed={this.state.seed} baseFrequency={this.turbulenceFrequencyRow} numOctaves="3" result="n"/>
                        <feTurbulence seed={this.state.seed} baseFrequency={this.turbulenceFrequencyColumn} numOctaves="3"/>
                        <feBlend in="n" result="noise"/>
                        <feDiffuseLighting in='noise' lightingColor={this.state.lightingColor} surfaceScale='2'>
                            <feDistantLight azimuth='45' elevation='60' />
                        </feDiffuseLighting>
                        <feComposite in2="SourceGraphic" operator="in"/>
                    </filter>
                )
            }
            else {
                return (
                    <filter id="generated-filter">
                        <feTurbulence seed={this.state.seed} baseFrequency={this.turbulenceFrequencyRow} numOctaves="3" result="n"/>
                        <feTurbulence seed={this.state.seed} baseFrequency={this.turbulenceFrequencyColumn} numOctaves="3"/>
                        <feBlend in="n" result="noise"/>
                        <feColorMatrix values="0 0 0 1 0
                                               0 0 0 1 0
                                               0 0 0 1 0
                                               0 0 0 0 1"/>
                        <feComponentTransfer>
                            <feFuncR type="linear" slope="2" intercept={-(0.5 * 2) + 0.5}/>
                            <feFuncG type="linear" slope="2" intercept={-(0.5 * 2) + 0.5}/>
                            <feFuncB type="linear" slope="2" intercept={-(0.5 * 2) + 0.5}/>
                        </feComponentTransfer>
                        <feComponentTransfer colorInterpolationFilters="sRGB">
                            <feFuncR type="table" tableValues={this.reds}/>
                            <feFuncG type="table" tableValues={this.greens}/>
                            <feFuncB type="table" tableValues={this.blues}/>
                        </feComponentTransfer>
                        <feComposite in2="SourceGraphic" operator="in"/>
                    </filter>
                )
            }
        }
        else {
            return (
                <filter id="generated-filter">
                    <feTurbulence seed={this.state.seed} type="fractalNoise" numOctaves="3" baseFrequency={this.state.turbulenceFrequencyX + " " + this.state.turbulenceFrequencyY}/>
                    <feColorMatrix values="0 0 0 1 0
                                           0 0 0 1 0
                                           0 0 0 1 0
                                           0 0 0 0 1"/>
                    <feComponentTransfer>
                        <feFuncR type="linear" slope="2" intercept={-(0.5 * 2) + 0.5}/>
                        <feFuncG type="linear" slope="2" intercept={-(0.5 * 2) + 0.5}/>
                        <feFuncB type="linear" slope="2" intercept={-(0.5 * 2) + 0.5}/>
                    </feComponentTransfer>
                    <feComponentTransfer colorInterpolationFilters="sRGB">
                        <feFuncR type="table" tableValues={this.reds}/>
                        <feFuncG type="table" tableValues={this.greens}/>
                        <feFuncB type="table" tableValues={this.blues}/>
                    </feComponentTransfer>
                    <feComposite in2="SourceGraphic" operator="in"/>
                </filter>
            )
        }
    }

    handleLightingChange = (event) => {
        this.setState({lightingChecked: event.target.checked})
    }

    render() {
        if (this.props.uploadedClicked && this.props.jsonExtracted) {
            if (!this.jsonLoaded) {
                this.parseJSON()
            }
            return(
                <div>
                    {/* {this.displayColor(this.json.colors)} */}
                    <div className="filter-container">
                        <div id="generated-svg">
                            <div>
                                <span className="generated-filter-text">Newly Generated Filter</span>
                            </div>
                            <svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
                                {this.displayFilter()}
                                <rect width="200" height="200" filter="url(#generated-filter)"/>
                            </svg>
                        </div>
                        <div id="generated-params">
                            <div className={(this.turbulenceFrequency === "0.1" && this.rectangularPattern) ? "component-show" : "component-hide"}>
                                <span className="generated-filter-text">Lighting</span>
                                <Checkbox
                                    checked={this.state.lightingChecked}
                                    onChange={this.handleLightingChange}
                                    inputProps={{ 'aria-label': 'checkbox for whether to use lighting' }}
                                />
                            </div>
                            <div id="params-padding">
                                <div className="filter-container">
                                    <Slider color="secondary" aria-label="Small" value={this.state.seed} onChange={(event, newValue) => {this.setState({seed: newValue})}} aria-labelledby="continuous-slider" valueLabelDisplay="auto"/>
                                    <span className="generated-filter-text">Seed</span>
                                </div>
                                <div className="filter-container">
                                    <Slider color="secondary" aria-label="Small" value={this.state.turbulenceFrequencyX} onChange={(event, newValue) => {this.setState({turbulenceFrequencyX: newValue})}} aria-labelledby="continuous-slider" valueLabelDisplay="auto" min={0} max={1} step={0.001}/>
                                    <span className="generated-filter-text">ScaleX</span>
                                </div>
                                <div className="filter-container">
                                    <Slider color="secondary" aria-label="Small" value={this.state.turbulenceFrequencyY} onChange={(event, newValue) => {this.setState({turbulenceFrequencyY: newValue})}} aria-labelledby="continuous-slider" valueLabelDisplay="auto" min={0} max={1} step={0.001}/>
                                    <span className="generated-filter-text">ScaleY</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )
        }
        else if (this.props.uploadedClicked) {
            return(
                <div id="loading-placeholder">
                    <CircularProgress color="inherit" size={80}/>
                </div>
            )
        }
        else {
            return(<div></div>)
        }
    }
}

export default GeneratedFilter