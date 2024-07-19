import React, { Component } from 'react'
import Box from '@material-ui/core/Box';
import Tooltip from '@material-ui/core/Tooltip';
import IconButton from '@material-ui/core/IconButton';
import PanToolIcon from '@material-ui/icons/PanTool';
import UndoIcon from '@material-ui/icons/Undo';
import RedoIcon from '@material-ui/icons/Redo';
import DeleteSweepIcon from '@material-ui/icons/DeleteSweep';
import GetAppIcon from '@material-ui/icons/GetApp';
import ToggleButton from '@material-ui/lab/ToggleButton';
import ToggleButtonGroup from '@material-ui/lab/ToggleButtonGroup';
import { ColorPicker } from './colorpicker';
import TextField from '@material-ui/core/TextField';
import ColorizeIcon from '@material-ui/icons/Colorize';
import SvgIcon from "@material-ui/core/SvgIcon";
import BrushIcon from '@material-ui/icons/Brush';
import AddPhotoAlternateIcon from '@material-ui/icons/AddPhotoAlternate';
import ZoomInIcon from '@material-ui/icons/ZoomIn';
import ZoomOutIcon from '@material-ui/icons/ZoomOut';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import FlipToFrontIcon from '@material-ui/icons/FlipToFront';
import FlipToBackIcon from '@material-ui/icons/FlipToBack';
import Popover from '@material-ui/core/Popover';
import OpenWithIcon from '@material-ui/icons/OpenWith';
import PaletteIcon from '@material-ui/icons/Palette';
import PinDropIcon from '@material-ui/icons/PinDrop';

import { ReactComponent as EraserIcon } from '../assets/eraser.svg'
import { ReactComponent as PaintFillIcon } from '../assets/paintfill.svg'
import { ReactComponent as ColorIcon } from '../assets/drop.svg'
import { ReactComponent as MagicWandIcon } from '../assets/magicwand.svg'
import './topbar.css'

import { forwardRef } from 'react';

// stabilizer imports
import FormGroup from '@material-ui/core/FormGroup';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Checkbox from '@material-ui/core/Checkbox';
import Slider from '@material-ui/core/Slider';
import SettingsIcon from '@material-ui/icons/Settings';
import LensIcon from '@material-ui/icons/Lens';
import GradientIcon from '@material-ui/icons/Gradient';
import { Button } from '@material-ui/core';

const TooltipToggleButton = forwardRef(
    ({ TooltipProps, ...props }, ref) => {
        return (
            <Tooltip {...TooltipProps}>
                <ToggleButton ref={ref} {...props} />
            </Tooltip>
        )
    }
)
export class Topbar extends Component {
    constructor(props) {
        super(props)
        this.state = {
            mode: "draw",
            color: {
                r: '0',
                g: '0',
                b: '0',
                a: '1',
            },
            clearModalOpen: false,
            strokeSizeSliderOpen: false,
            opacitySliderOpen: false,

            // canvas state parameter
            canvasSettingsModalOpen: false,
        }
    }

    componentDidMount(){
        // disable ctrl + Z undo from working with the topbar textfields
        document.getElementById('change-stroke-size-textfield').addEventListener("keydown", (event) => {
            if(event.ctrlKey && event.key === "z"){
                event.preventDefault();
            }
        });

        document.getElementById('change-opacity-textfield').addEventListener("keydown", (event) => {
            if(event.ctrlKey && event.key === "z"){
                event.preventDefault();
            }
        });
    }

    // canvas dialogue update handler functions
    handleCanvasSettingsClicked = (event) => {
        this.setState({ canvasSettingsModalOpen: true })
    }

    changeMode = (_, newMode) => {
        if (newMode !== null) {
            this.setState({ mode: newMode })
        }
    }

    handleStrokeSizeChange = (event, newValue) => {
        newValue = newValue ? newValue : event.target.value
        if (newValue < 1) {
            newValue = 1
        }
        this.props.changeStrokeSize(newValue)
    }

    openStrokeSizeSlider = (event) => {
        this.setState({ strokeSizeSliderOpen: true })
    }

    handleOpacityChange = (event, newValue) => {
        newValue = newValue ? newValue : event.target.value
        this.props.changeOpacity(newValue)
    }

    handleClearClicked = (event) => {
        this.setState({ clearModalOpen: true })
    }

    clearDrawingClicked() {
        this.props.clear()
        this.setState({ clearModalOpen: false })
    }

    clearFiltersClicked() {
        this.props.clearList()
        this.setState({ clearModalOpen: false })
    }

    clearDrawingAndFiltersClicked() {
        this.props.clear()
        this.props.clearList()
        this.setState({ clearModalOpen: false })
    }

    render() {
        return (
            <div id="topbar">
                <div id="topbar-btns">
                    {/* <Tooltip title="Convert code to illustration">
                        <IconButton className="float-btn" onClick={() => this.props.verifyJSON()} color="secondary" aria-label="convert code to illustration">
                            <ForwardIcon />
                        </IconButton>
                    </Tooltip> */}
                    <ToggleButtonGroup id='toggle-group' className="float-btn" value={this.state.mode} exclusive onChange={this.changeMode} aria-label="mode">
                        <TooltipToggleButton onClick={() => this.props.drawMode()} value="draw" aria-label="ink mode" TooltipProps={{ title: "Ink" }}>
                            <BrushIcon />
                        </TooltipToggleButton>
                        <TooltipToggleButton onClick={() => this.props.drawMode(true)} value="drawFill" aria-label="fill mode" TooltipProps={{ title: "Fill" }}>
                            <SvgIcon fontSize='small'>
                                <PaintFillIcon />
                            </SvgIcon>
                        </TooltipToggleButton>
                        <TooltipToggleButton onClick={() => this.props.pickColor()} value="pickColor" aria-label="pick color" TooltipProps={{ title: "Pick Color" }}>
                            <ColorizeIcon />
                        </TooltipToggleButton>
                        <TooltipToggleButton onClick={() => this.props.colorMode()} value="color" aria-label="color mode" TooltipProps={{ title: "Change Color" }}>
                            <SvgIcon>
                                <ColorIcon />
                            </SvgIcon>
                        </TooltipToggleButton>
                        {/* <TooltipToggleButton onClick={() => this.props.filterMode()} value="changeFilter" aria-label="change filter" TooltipProps={{ title: "Change Filter" }}>
                            <SvgIcon>
                                <MagicWandIcon />
                            </SvgIcon>
                        </TooltipToggleButton> */}
                        <TooltipToggleButton onClick={() => this.props.gradientMode()} value="gradient" aria-label="gradient mode" TooltipProps={{ title: "Change Gradient" }}>
                            <SvgIcon>
                                <GradientIcon />
                            </SvgIcon>
                        </TooltipToggleButton>
                        <TooltipToggleButton onClick={() => this.props.eraseMode()} value="erase" aria-label="erase mode" TooltipProps={{ title: "Erase" }}>
                            <SvgIcon>
                                <EraserIcon />
                            </SvgIcon>
                        </TooltipToggleButton>
                        <TooltipToggleButton onClick={() => this.props.moveMode()} value="move" aria-label="move mode" TooltipProps={{ title: "Move" }}>
                            <PanToolIcon style={{ height: 20 }} />
                        </TooltipToggleButton>
         
                        <TooltipToggleButton onClick={() => this.props.translateLayerMode()} value="layer-translate" aria-label="layer translate mode" TooltipProps={{ title: "Layer Move" }}>
                            <div className='move-icon-container move-icon-shared-container move-icon-opacity'>
                                <svg className='' viewBox='0 0 30 30'>
                                    <path transform='translate(4 4)' d="M23 5.5V20c0 2.2-1.8 4-4 4h-7.3c-1.08 0-2.1-.43-2.85-1.19L1 14.83s1.26-1.23 1.3-1.25c.22-.19.49-.29.79-.29.22 0 .42.06.6.16.04.01 4.31 2.46 4.31 2.46V4c0-.83.67-1.5 1.5-1.5S11 3.17 11 4v7h1V1.5c0-.83.67-1.5 1.5-1.5S15 .67 15 1.5V11h1V2.5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5V11h1V5.5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5z"></path>
                                    <path transform='translate(-2 -2)' d="M19 5v14H5V5h14m0-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"></path>
                                </svg>
                            </div>
                        </TooltipToggleButton>

                        <TooltipToggleButton onClick={() => this.props.scaleLayerMode()} value="layer-scale" aria-label="layer scale mode" TooltipProps={{ title: "Layer Scale" }}>
                            <div className='move-icon-container move-icon-shared-container move-icon-opacity'>
                                <svg className='' viewBox='0 0 30 30'>
                                    <rect fill="none" height="30" width="30"/>
                                    <polygon transform='scale(1.25 1.25) translate(1.75 1.75)' points="21,11 21,3 13,3 16.29,6.29 6.29,16.29 3,13 3,21 11,21 7.71,17.71 17.71,7.71"/>
                                    <path transform='translate(-2 -2)' d="M19 5v14H5V5h14m0-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"></path>
                                </svg>
                            </div>
                        </TooltipToggleButton>
                        
                        <TooltipToggleButton onClick={() => this.props.moveToFrontMode()} value="move to front" aria-label="move to front mode" TooltipProps={{ title: "Move to Front" }}>
                            <FlipToFrontIcon style={{ height: 20 }} />
                        </TooltipToggleButton>
                        <TooltipToggleButton onClick={() => this.props.moveToBackMode()} value="move to back" aria-label="move to back mode" TooltipProps={{ title: "Move to Back" }}>
                            <FlipToBackIcon style={{ height: 20 }} />
                        </TooltipToggleButton>
                        <TooltipToggleButton onClick={() => this.props.panMode()} value="pan" aria-label="pan mode" TooltipProps={{ title: "Pan (SPACE + drag)" }}>
                            <OpenWithIcon />
                        </TooltipToggleButton>
                    </ToggleButtonGroup>
                    <Box mx={0.75}>
                        <TextField
                            className='topbar-textfield'
                            id="change-stroke-size-textfield"
                            label="Size"
                            color="secondary"
                            size="small"
                            type="tel"
                            value={this.props.strokeSize}
                            InputProps={{ style: { width: `28px` } }}
                            onChange={this.handleStrokeSizeChange}
                            onClick={() => { this.setState({ strokeSizeSliderOpen: true }) }}
                        />
                    </Box>
                    <Popover
                        open={this.state.strokeSizeSliderOpen}
                        anchorEl={document.getElementById("change-stroke-size-textfield")}
                        onClose={() => { this.setState({ strokeSizeSliderOpen: false }); }}
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'left', }}
                        transformOrigin={{ vertical: 'top', horizontal: 'left', }}>
                        <Tooltip title="You can also scroll up ↑ or down ↓ to change the ink size">
                            <div className='topbar-slider'>
                                <Slider
                                    value={Number(this.props.strokeSize)}
                                    size="small"
                                    color="secondary"
                                    min={1}
                                    max={100}
                                    step={1}
                                    onChange={this.handleStrokeSizeChange}
                                />
                            </div>
                        </Tooltip>
                    </Popover>
                    <Box mx={0.75}>
                        <TextField
                            className='topbar-textfield'
                            id="change-opacity-textfield"
                            label="Opacity"
                            color="secondary"
                            size="small"
                            type="tel"
                            value={this.props.opacity}
                            InputProps={{ style: { width: `32px` }, inputProps: { min: 0, max: 1, step: 0.01 } }}
                            onChange={this.handleOpacityChange}
                            onClick={() => { this.setState({ opacitySliderOpen: true }) }}
                        />
                    </Box>
                    <Popover
                        open={this.state.opacitySliderOpen}
                        anchorEl={document.getElementById("change-opacity-textfield")}
                        onClose={() => { this.setState({ opacitySliderOpen: false }); }}
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'left', }}
                        transformOrigin={{ vertical: 'top', horizontal: 'left', }}>
                        <Tooltip title="Change the opacity of the ink">
                            <div className='topbar-slider'>
                                <Slider
                                    value={Number(this.props.opacity)}
                                    size="small"
                                    color="secondary"
                                    min={0.01}
                                    max={1}
                                    step={0.01}
                                    onChange={this.handleOpacityChange}
                                />
                            </div>
                        </Tooltip>
                    </Popover>
                    <ColorPicker id="color-picker" label="Color" color={this.props.color} changeColor={this.props.changeColor} renderLabel={true} />
                    <ColorPicker label="Canvas" color={this.props.currCanvasColor} changeColor={this.props.changeCanvasColor} renderLabel={true} />
                    <Tooltip title="Canvas Settings">
                        <IconButton onClick={this.handleCanvasSettingsClicked} htmlcolor='black' aria-label="clear">
                            <BrushIcon className='brush-icon' />
                            <SettingsIcon className='setting-icon' />
                            <LensIcon className='circle-icon' />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Undo">
                        <IconButton onClick={() => this.props.undo()} htmlcolor='black' aria-label="undo action">
                            <UndoIcon />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Redo">
                        <IconButton onClick={() => this.props.redo()} htmlcolor='black' aria-label="redo action">
                            <RedoIcon />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Zoom In (CTRL + scroll up ↑)">
                        <IconButton onClick={() => this.props.canvasZoom(1)} htmlcolor='black' aria-label="zoom in">
                            <ZoomInIcon />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Zoom Out (CTRL + scroll down ↓)">
                        <IconButton onClick={() => this.props.canvasZoom(-1)} htmlcolor='black' aria-label="zoom out">
                            <ZoomOutIcon />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Clear">
                        <IconButton onClick={this.handleClearClicked} htmlcolor='black' aria-label="clear">
                            <DeleteSweepIcon />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Import SVG">
                        <label className="import-label">
                            <input id="input" onChange={() => this.props.importSVG(document.getElementById("input"))}
                                onClick={() => document.getElementById("input").value = null} name="img" type="file" required />
                            <AddPhotoAlternateIcon />
                        </label>
                    </Tooltip>
                    <Tooltip title="Download illustration">
                        <IconButton onClick={() => this.props.download()} htmlcolor='black' aria-label="download illustration">
                            <GetAppIcon />
                        </IconButton>
                    </Tooltip>
                </div>
                <Dialog
                    open={this.state.clearModalOpen}
                    onClose={() => this.setState({ clearModalOpen: false })}
                    aria-labelledby="homepage-popup">
                    <DialogContent>
                        <div className='flex-row'>
                            <div id='delete-icon'>
                                <DeleteSweepIcon style={{ height: 60 }} />
                            </div>
                            <div>
                                <div id="popup-text-clear">
                                    What do you want to clear?
                                </div>
                                <div className="flex-row">
                                    <div className='tinier-padding'>
                                        <div className='button-outlined' onClick={() => this.clearDrawingClicked()}>Illustration</div>
                                    </div>
                                    <div className='tinier-padding'>
                                        <div className='button-outlined' onClick={() => this.clearFiltersClicked()}>Filters</div>
                                    </div>
                                    <div className='tinier-padding'>
                                        <div className='button-outlined' onClick={() => this.clearDrawingAndFiltersClicked()}>Both</div>
                                    </div>
                                    <div className='tinier-padding'>
                                        <div className='button-outlined' onClick={() => this.setState({ clearModalOpen: false })}>Cancel</div>
                                    </div>

                                </div>
                            </div>
                        </div>
                    </DialogContent>
                    <DialogActions>
                    </DialogActions>
                </Dialog>

                {/* canvas setting dialogue tentative location */}
                <Dialog
                    open={this.state.canvasSettingsModalOpen}
                    onClose={() => this.setState({ canvasSettingsModalOpen: false })}
                    aria-labelledby="homepage-popup"
                    maxWidth="lg">
                    <DialogContent className='flex-direc-row'>
                        <div className='flex-col'>
                            <div className='pr-1'>
                                {/* <div id="popup-text-clear">
                                    Pen Stabilizer Settings
                                </div> */}
                                
                                <div id="popup-text-clear"></div>
                                <div style={{marginBottom: '8px'}} className='no-pad-text'>
                                    <SettingsIcon size="small"/> Pen Stabilizer Settings:
                                </div>
                                <div className="flex-col">
                                    <ToggleButtonGroup
                                        className='on-off-group'
                                        value={this.props.selectedStabilizer}
                                        exclusive
                                        onChange={this.props.handleStabilizerOption}
                                        aria-label="text alignment"
                                    >
                                        <ToggleButton value="none" className='full-width-button'>
                                            <Tooltip title="No pen stabilization!"><div>OFF</div></Tooltip>
                                        </ToggleButton>


                                        <ToggleButton value="spring" className='full-width-button'>
                                            <Tooltip title="Stabilize via simulated drag on paper"><div>ON</div></Tooltip>
                                        </ToggleButton>
                                    </ToggleButtonGroup>

                                    <FormGroup className='stabilizerParameterContainer'>
                                        <div className="small-heading-padding">
                                            <Tooltip title="Pressure-controlled line-width for stylus users">
                                                <FormControlLabel control={<Checkbox
                                                    checked={this.props.variableWidth}
                                                    onChange={this.props.handleVariableWidthChange}
                                                />} label="Experimental: Pen Pressure" />
                                            </Tooltip>
                                        </div>

                                        <div className="">
                                            <Tooltip title="Option to add a corner when pausing the cursor">
                                                <FormControlLabel control={<Checkbox
                                                    checked={this.props.cornerCorrection}
                                                    onChange={this.props.handleStabilizerCornerCorrectionChange}
                                                />} label="Corner Correction" />
                                            </Tooltip>
                                        </div>

                                        <div className=''>
                                            Smoothing Factor: {this.props.smoothing}
                                        </div>

                                        <div className="filter-container-center">
                                            <Slider
                                                disabled={false}
                                                value={this.props.smoothing}
                                                color="primary"
                                                min={0}
                                                max={1}
                                                step={0.01}
                                                onChange={this.props.handleStabilizerSmoothingChange}
                                            />
                                        </div>


                                    </FormGroup>

                                    <div className='horizontal-1em-spacer'></div>
                                </div>
                            </div>
                        </div>

                        <div className='vertical-setting-spacer'></div>

                        <div className='flex-col'>
                            <div className='pr-1'>
                                <div id="popup-text-clear"></div>
                                <div className="flex-col">
                                    <div className='no-pad-text'>
                                            <PinDropIcon size="small"/> Waypoints:
                                    </div>
                                    <FormGroup className='stabilizerParameterContainer'>
                                        <div className="">
                                            <Tooltip title="Container to store waypoints to automatically zoom to">
                                                <FormControlLabel control={<Checkbox
                                                    checked={this.props.waypointDialogOpen}
                                                    onChange={() => this.props.setWaypointDialogOpen(!this.props.waypointDialogOpen)}
                                                />} label="On-screen waypoint list" />
                                            </Tooltip>
                                        </div>
                                        <Button className='clear-palette-button'
                                            onClick={() => this.props.waypointRef.current.clearWaypoints()}
                                            style={{backgroundColor: "white"}}
                                            size='small'
                                            variant="outlined">
                                                Clear Waypoints
                                        </Button>
                                        <Button className='clear-palette-button'
                                            onClick={() => this.props.waypointRef.current.updateWaypointPreviewsChained()}
                                            style={{backgroundColor: "white"}}
                                            size='small'
                                            variant="outlined">
                                                Update Rendering
                                        </Button>
                                    </FormGroup>
                                </div>
                            </div>
                            <div className='pr-1'>
                                {/* <div id="popup-text-clear">
                                    Color Palette Settings
                                </div> */}
                                <br></br>
                                <div className="flex-col">
                                    <div className='no-pad-text'>
                                            <PaletteIcon size="small"/> Color Palette:
                                    </div>
                                    <FormGroup className='stabilizerParameterContainer'>
                                        <div className="">
                                            <Tooltip title="Palette to store current brush color">
                                                <FormControlLabel control={<Checkbox
                                                    checked={this.props.paletteDialogOpenIndex !== -1}
                                                    onChange={this.props.handleColorPaletteToggle}
                                                />} label="On-screen palette" />
                                            </Tooltip>
                                        </div>
                                        <Button className='clear-palette-button'
                                            onClick={() => this.props.clearColorPalette()}
                                            style={{backgroundColor: "white"}}
                                            size='small'
                                            variant="outlined">
                                                Clear Palette
                                        </Button>
                                    </FormGroup>
                                </div>
                            </div>
                        </div>

                        <div className='vertical-setting-spacer'></div>

                        <div className='flex-col'>
                            <div className='pr-1'>
                                <div id="popup-text-clear"></div>
                                <div className="flex-col">
                                    <div className='no-pad-text'>
                                            <PinDropIcon size="small"/> Pan + zoom settings:
                                    </div>
                                    <FormGroup className='stabilizerParameterContainer'>
                                        <div className="">
                                            <Tooltip title="Check if exported .SVG file should contain pan + zoom logic!">
                                                <FormControlLabel control={<Checkbox
                                                    checked={this.props.exportZoomAndPan}
                                                    onChange={() => this.props.toggleExportZoomAndPan()}
                                                />} label="Export zoom + pan" />
                                            </Tooltip>
                                        </div>


                                        <div className=''>
                                            Parallax zoom sensitivity: {this.props.zoomSensitivity}
                                        </div>

                                        <div className="filter-container-center">
                                            <Slider
                                                disabled={false}
                                                value={this.props.zoomSensitivity}
                                                color="primary"
                                                min={0.1}
                                                max={2}
                                                step={0.1}
                                                onChange={this.props.changeZoomSensitivity}
                                            />
                                        </div>

                                        
                                        <div className=''>
                                            Parallax pan sensitivity: {this.props.panSensitivity}
                                        </div>

                                        <div className="filter-container-center">
                                            <Slider
                                                disabled={false}
                                                value={this.props.panSensitivity}
                                                color="primary"
                                                min={0.1}
                                                max={2}
                                                step={0.1}
                                                onChange={this.props.changePanSensitivity}
                                            />
                                        </div>

                                        <Button className='clear-palette-button'
                                            onClick={() => this.props.resetPanZoomSettings()}
                                            style={{backgroundColor: "white"}}
                                            size='small'
                                            variant="outlined">
                                                Reset pan + zoom settings
                                        </Button>

                                    </FormGroup>
                                </div>
                            </div>
                        </div>
                    </DialogContent>
                    <DialogActions>
                    </DialogActions>
                </Dialog>
            </div>
        )
    }
}
