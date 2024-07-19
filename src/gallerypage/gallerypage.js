import React, { Component } from 'react'
import { Link } from 'react-router-dom';
// import FaceIcon from '@material-ui/icons/Face';

import './gallerypage.css'


export class GalleryPage extends Component {
    constructor(props) {
        super(props)
        this.state = {
        }
        this.drawings = [
            {name: "Sunset", file: require('./drawings/sunset.svg').default, artistUrl: 'https://eutopi.portfoliobox.net/watercolour'},
            {name: "Starry Night", file: require('./drawings/starrynight.svg').default, artistUrl: 'https://eutopi.portfoliobox.net/watercolour'},
            {name: "Brewing", file: require('./drawings/brewing.svg').default, artistUrl: 'https://eutopi.portfoliobox.net/watercolour'},
            {name: "Fishing", file: require('./drawings/fishing.svg').default, artistUrl: 'https://eutopi.portfoliobox.net/watercolour'},
            {name: "Alley Cat", file: require('./drawings/alley_cat.svg').default, artistUrl: 'https://connieliu.me/play.html'},
            {name: "Snow White", file: require('./drawings/snowwhite-FINAL.svg').default},
            {name: "Falling Star", file: require('./drawings/fallingstar-FINAL.svg').default},
            {name: "Birds", file: require('./drawings/bird_scene.svg').default},
            {name: "Reading Scene", file: require('./drawings/reading_scene.svg').default},
            {name: "Ants", file: require('./drawings/ants.svg').default},
            {name: "Cliff", file: require('./drawings/cliff.svg').default},
            {name: "Kirby", file: require('./drawings/kirby_potraced.svg').default},
            {name: "Pane and Bottles", file: require('./drawings/pane_and_bottles_potraced.svg').default},
            {name: "Dress", file: require('./drawings/dress_potraced.svg').default}
        ]
    }

    remixFromGallery(svgFile) {
        fetch(svgFile)
            .then(response => response.text())
            .then(str => {
                this.props.history.push({
                    pathname: '/', state: {svgString: str}
                })
            })
    }

    pauseSVG(id) {
        let svg = document.getElementById(id).contentDocument.documentElement
        if (typeof svg.pauseAnimations === "function") {
            svg.pauseAnimations()
        }
    }

    playSVG(id) {
        let svg = document.getElementById(id).contentDocument.documentElement
        if (typeof svg.unpauseAnimations === "function") {
            svg.unpauseAnimations()
        }
    }

    render() {
        return(
            <div id="gallery-root">
                <div className="header">
                    <div className="flex-row">
                        <div className="topbar-left-padding"></div>
                        <span className='pad-sides'>
                            <Link to='/' className='topbar-link'>
                                <span>🖌️ home</span>
                            </Link>
                        </span>
                        <span className='pad-sides'>
                            <Link to='/about' className='topbar-link'>
                                <span>☕ about</span>
                            </Link>
                        </span>
                    </div>
                    <div id="title" className="flex-row">
                        <div className="pad-right">filtered.ink:</div>
                        <div className="bounce"> Animated</div>
                        <div className="pad-left">Illustrations</div>
                    </div>
                </div>
                <div className="gallery">
                    <div className="gallery-text">
                    👆 Hover on / touch the illustration to toggle animation
                    </div>
                    <div className='gallery-items'>
                        {this.drawings.map((d, index) => {
                            return <div key={"gallery-svg-"+index}  className='pad-15'><div key={"gallery-svg-"+index}  className='gallery-image'>
                                            <object 
                                                aria-label={d['name']}
                                                id={"svg-drawing-"+d["name"]} 
                                                onLoad={() => this.pauseSVG("svg-drawing-"+d["name"])} 
                                                onMouseEnter={() => this.playSVG("svg-drawing-"+d["name"])}
                                                onMouseLeave={() => this.pauseSVG("svg-drawing-"+d["name"])}
                                                onTouchStart={() => this.playSVG("svg-drawing-"+d["name"])}
                                                onTouchCancel={() => this.pauseSVG("svg-drawing-"+d["name"])}
                                                onTouchEnd={() => this.pauseSVG("svg-drawing-"+d["name"])}
                                                data={d["file"]} type="image/svg+xml" height={300}></object>
                                        <div className='drawing-caption'>
                                            <div>
                                                {d["name"]}
                                                {/* <a href={d["artistUrl"]} target="_blank" rel="noreferrer"><FaceIcon style={{color: "white", height: 15}}/></a> */}
                                            </div>
                                            <div className="remix-from-gallery-btn gallery-img" onClick={() => this.remixFromGallery(d["file"])}>remix </div>
                                        </div>
                                </div></div>
                        })}
                    </div>
                </div>
            </div>
        )
    }
}
