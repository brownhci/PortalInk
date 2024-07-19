import React from 'react'
import { Card } from '@material-ui/core'
import './colorpalette.css';
import './waypoints.css'
import PinDropIcon from '@material-ui/icons/PinDrop';
import { convertSVGToPreview, makeid } from '../util';
import ClearIcon from '@material-ui/icons/Clear';
import LinkIcon from '@material-ui/icons/Link';
import Tooltip from '@material-ui/core/Tooltip';

export class Waypoints extends React.Component {
    constructor(props){
        super(props);

        this.width = 3;
        this.height = 10;

        this.state = {
            waypoints: [],
            currentWaypointIndex: -1
        };

        this.dragging = false;
        this.cachedOffset = [0, 0];
        this.previousOffset = [0, 0];

        document.addEventListener('mousemove', (e) => {
            if(!this.dragging) return;
            const dialog = document.querySelector('.waypoint-card');
            const ds = dialog.style;
            const nx = e.clientX;
            const ny = e.clientY;

            const px = `${(ny - this.cachedOffset[1]) + this.previousOffset[1]}px`;
            const py = `${nx - this.cachedOffset[0] + this.previousOffset[0]}px`;
            ds.translate = `${py} ${px}`;
        });
        document.addEventListener('mouseup', () => {
            if(this.dragging) this.dragging = false;
        });
    }

    returnWaypoints() {
        return this.state.waypoints
    }

    waypointModeMatchesLayerMode(waypointID) {
        let index = this.state.waypoints.findIndex(function (w) {
            return w.id === waypointID
        })
        let waypoint = this.state.waypoints[index]
        if (this.props.parallaxOn === waypoint.parallaxIsOn) {
            return waypoint
        }
        else {
            return false
        }
    }

    handleWaypointClick(waypoint, callback) {
        if (this.props.parallaxOn === waypoint.parallaxIsOn) {
            if (this.props.parallaxOn) {
                this.props.setParallax(waypoint.depth, waypoint.posX, waypoint.posY, callback)
            }
            else {
                this.props.setViewBox(waypoint.viewboxString, waypoint.depth, waypoint.posX, waypoint.posY, callback)
            }
            return true
        }
        else {
            return false
        }
    }

    clearWaypoints(callback) {
        if (!callback) {
            let portalIDsToDetach = []
            for (let i = 0; i < this.state.waypoints.length; i++) {
                let wp = this.state.waypoints[i]
                portalIDsToDetach.push(...wp.portalIDs)
            }
            this.props.removeFromDepthToTeleportationMap(portalIDsToDetach)
        }
        this.setState({currentWaypointIndex: -1})
        this.setState({waypoints: []}, () => {
            if (callback) {
                callback()
            }
        })
    }

    addWaypointFromImport(waypoint) {
        this.setState(prevState => ({
            waypoints: [...prevState.waypoints, waypoint]
        }));
    }

    updateWaypointPreviewsChained(){
        const waypoints = this.state.waypoints;

        // fast version ... makes me nervous so I have the other version
        // const next_call = (w) => {
        //     this.addWaypointFromImport(w, () => {
        //         i += 1;
        //         if(i >= waypoints.length) return;
        //         else next_call(waypoints[i]);
        //     });
        // }
        // next_call(waypoints[i]);

        let i = 0;
        const next_call = (w, callback) => {
            this.updateWaypointPreview(w, () => {
                setTimeout(() => {
                    i += 1;
                    if(i >= waypoints.length) {
                        if(callback) callback();
                    }
                    else next_call(waypoints[i], callback);
                }, 500);
            });
        }
        next_call(waypoints[i], () => {
            this.setState({waypoints: waypoints});
        });
    }

    addWaypoint() {
        let svgString = this.props.serializeToString(true, false)
        let previewURL = convertSVGToPreview(svgString, this.props.depth / 5)

        let currentWaypoints = [...this.state.waypoints]
        let newID = `waypoint-${makeid(5)}`
        const viewbox = this.props.draw.viewbox()
        const viewboxString = `${viewbox.x} ${viewbox.y} ${viewbox.width} ${viewbox.height}`
        currentWaypoints.push({id: newID, url: previewURL, parallaxIsOn: this.props.parallaxOn, viewboxString: viewboxString, depth: this.props.depth, posX: this.props.position[0], posY: this.props.position[1]})
        this.addWaypointPreview(newID, previewURL)
        this.setState({ waypoints: currentWaypoints }, () => {
            this.props.serializeToString()
        });
    }

    addWaypointPreview(id, previewURL) {
        const defs = document.querySelector('defs');
        const svgns = "http://www.w3.org/2000/svg";

        // Create the pattern element
        const pattern = document.createElementNS(svgns, "pattern");
        pattern.setAttribute("id", id);
        pattern.setAttribute("patternUnits", "objectBoundingBox");
        pattern.setAttribute("patternContentUnits", "objectBoundingBox")
        pattern.setAttribute("width", "1");
        pattern.setAttribute("height", "1");
        pattern.setAttribute("x", "0");
        pattern.setAttribute("y", "0");
        // Create the image element within the pattern
        const image = document.createElementNS(svgns, "image");
        image.setAttribute("href", previewURL);
        image.setAttribute("x", "0");
        image.setAttribute("y", "0");
        image.setAttribute("width", "1");
        image.setAttribute("height", "1");

        pattern.appendChild(image);
        defs.appendChild(pattern);
    }

    updateWaypointPreview(waypoint, callback){
        // TODO
        this.handleWaypointClick(waypoint, () => {
            let svgString = this.props.serializeToString(true, false)
            let newPreviewURL = convertSVGToPreview(svgString, this.props.depth / 5, waypoint.parallaxIsOn);
            const pattern_elem = document.getElementById(waypoint.id);
            
            if(pattern_elem.children.length > 0){
                const img = pattern_elem.children[0];
                img.setAttribute('href', newPreviewURL);
                waypoint.url = newPreviewURL;
            }

            // TODO: consider portalIDs portal aspect ratio and change pattern width/height aspect ratio
            //       to negate so we don't get warped portal viewss

            if(callback) callback();
        });
    }

    deleteWaypoint(e, index) {
        e.stopPropagation()
        let currentWaypoints = [...this.state.waypoints]
        let portalIDsToDetach = currentWaypoints[index].portalIDs
        if (portalIDsToDetach) {
            console.log(portalIDsToDetach)
            this.props.removeFromDepthToTeleportationMap(portalIDsToDetach)
        }
        let deletedWaypoints = currentWaypoints.splice(index, 1)
        const foundPattern = document.getElementById(deletedWaypoints[0].id)
        if (foundPattern) {
            foundPattern.parentNode.removeChild(foundPattern);
        }
        this.setState({ waypoints: currentWaypoints })
        this.props.serializeToString()
    }

    getCurrentWaypointID() {
        let currentWaypoint = this.state.waypoints[this.state.currentWaypointIndex]
        return currentWaypoint.id
    }

    addPortalID(waypointID, portalID) {
        let currentWaypoints = [...this.state.waypoints]
        for (let i = 0; i < currentWaypoints.length; i++) {
            if (currentWaypoints[i].id === waypointID) {
                if (currentWaypoints[i]['portalIDs']) {
                    currentWaypoints[i]['portalIDs'].push(portalID)
                }
                else {
                    currentWaypoints[i]['portalIDs'] = [portalID]
                }
            }
        }
        this.setState({ waypoints: currentWaypoints }, () => {})
    }

    removePortalID(waypointID, portalID) {
        let currentWaypoints = [...this.state.waypoints]
        for (let i = 0; i < currentWaypoints.length; i++) {
            if (currentWaypoints[i].id === waypointID) {
                if (currentWaypoints[i].portalIDs && currentWaypoints[i].portalIDs.includes(portalID)) {
                    const index = currentWaypoints[i].portalIDs.indexOf(portalID)
                    currentWaypoints[i].portalIDs.splice(index, 1)
                }
            }
        }
        this.setState({ waypoints: currentWaypoints }, () => {})
    }

    waypointLinkClicked(e, index) {
        e.stopPropagation()
        if (index === this.state.currentWaypointIndex) {
            this.unhighlightPortals(this.state.waypoints[this.state.currentWaypointIndex].portalIDs)
            this.setState({currentWaypointIndex: -1})
            this.props.waypointMode(false)
        }
        else {
            if (this.state.currentWaypointIndex !== -1) {
                this.unhighlightPortals(this.state.waypoints[this.state.currentWaypointIndex].portalIDs)
            }
            this.highlightPortals(this.state.waypoints[index].portalIDs)
            this.setState({currentWaypointIndex: index})
            this.props.waypointMode(true)
        }
    }

    stopDrawingWaypoint() {
        let waypoint = this.state.waypoints[this.state.currentWaypointIndex]
        if (waypoint && waypoint.portalIDs) {
            this.unhighlightPortals(waypoint.portalIDs)
            this.setState({currentWaypointIndex: -1})
        }
    }

    highlightPortals(portalIDs) {
        if (portalIDs) {
            for (const portalID of portalIDs) {
                let portal = document.getElementById(portalID)
                portal.setAttribute("class", "waypoint");
            }
        }
    }

    unhighlightPortals(portalIDs) {
        if (portalIDs) {
            for (const portalID of portalIDs) {
                let portal = document.getElementById(portalID)
                portal.removeAttribute("class")
            }
        }
    }

    render(){
        return (<Card className='waypoint-card' style={this.props.waypointDialogOpen ? {display: "block"} : {display: "none"}}>
            <div 
                className='palette-handle'
                onPointerDown={(e) => {
                    this.dragging = true;
                    this.cachedOffset = [
                        e.clientX,
                        e.clientY
                    ];

                    const dialog = document.querySelector('.waypoint-card');
                    const ds = dialog.style;
                    this.previousOffset = ds.translate.split(' ').map(s => parseFloat(s.slice(0, -2)));
                    if(isNaN(this.previousOffset[0])) this.previousOffset = [0, 0];
                }}>
                <div className='palette-handle-line'></div>
                <div className='palette-handle-line'></div>
            </div>
            <div className='waypoint-rows-container' onContextMenu={(e) => e.preventDefault()}>
                <div style={{textAlign: "center", color: "gray"}}><PinDropIcon size="small"/></div>
                <Tooltip title='Add waypoint'>
                    <div className="waypoint-preview-empty" 
                        onClick={() => this.addWaypoint()}>
                        +
                    </div>
                </Tooltip>
                <div className='pad-top-small'></div>
                <div className='waypoint-list'>
                    {this.state.waypoints.map((waypoint, index) => {
                        return(
                            <div key={`waypoint-${index}`} className='layers-preview-wrapper'>
                                <div className='waypoint-preview-wrapper' onClick={(index) => this.handleWaypointClick(waypoint)}>
                                    <img id={`waypoint-thumbnail-${index}`} alt={`preview for waypoint with index ${index}`} src={waypoint.url} className={this.props.parallaxOn === waypoint.parallaxIsOn ? 'waypoint-preview' : 'waypoint-preview-disabled'}/>
                                    <Tooltip title='Delete waypoint'>
                                        <ClearIcon size='small' className={this.props.parallaxOn === waypoint.parallaxIsOn ? 'close-button' : 'close-button-disabled'} onClick={(e) => this.deleteWaypoint(e, index)}/>
                                    </Tooltip>
                                    <Tooltip title={index === this.state.currentWaypointIndex ? 'Stop editing portals to waypoint' : 'Start editing portals to waypoint'}>
                                        <LinkIcon size='small' className={this.props.parallaxOn === waypoint.parallaxIsOn ? index === this.state.currentWaypointIndex ? 'link-button-active' : 'link-button' : 'link-button-disabled'} onClick={(e) => this.waypointLinkClicked(e, index)}/>
                                    </Tooltip>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </Card>);
    }
}