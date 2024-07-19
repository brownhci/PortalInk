
import React, { Component } from 'react'
import IconButton from '@material-ui/core/IconButton';
import Tooltip from '@material-ui/core/Tooltip';
import Switch from '@material-ui/core/Switch';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogTitle from '@material-ui/core/DialogTitle';
import CloudUploadIcon from '@material-ui/icons/CloudUpload';
import TextField from '@material-ui/core/TextField';
import DoneIcon from '@material-ui/icons/Done';
import SvgIcon from "@material-ui/core/SvgIcon";
import Menu from '@material-ui/core/Menu';
import MenuItem from '@material-ui/core/MenuItem';
import VisibilityIcon from '@material-ui/icons/Visibility';
import VisibilityOffIcon from '@material-ui/icons/VisibilityOff';

import { ReactComponent as AddIcon } from '../assets/add.svg'

import GeneratedFilter from './generatedfilter';
import { base } from '../../base'

import { PauseButton } from './pausebutton'
import './filtertopbar.css'

export class FilterTopbar extends Component {
    constructor(props) {
        super(props)
        this.state = {
            dialogIsOpen: false,
            extractedInfo: '',
            uploadedClicked: false,
            jsonExtracted: false,
            newFilterName: "unnamed",
            addFilterMenuAnchor: null
        }
    }

    openDialog() {
        this.setState({dialogIsOpen: true})
        this.setState({uploadedClicked: false})
        this.setState({jsonExtracted: false})
        this.setState({addFilterMenuAnchor: null})
    }

    closeDialog() {
        this.setState({dialogIsOpen: false})
    }

    generateClicked() {
        let filter = document.getElementById("generated-filter")
        if (filter !== null) {
            let newCode = []
            for (let i = 0; i < filter.children.length; i++) {
                let attr_map = {"filterName": filter.children[i].nodeName}
                let attr = filter.children[i].attributes
                for (let j = 0; j < attr.length; j++) {
                    attr_map[attr[j].name] = attr[j].value
                }
                if (filter.children[i].hasChildNodes()) {
                    attr_map["child"] = []
                    for (let k = 0; k < filter.children[i].children.length; k++) {
                        let child_map = {"filterName": filter.children[i].children[k].nodeName}
                        let child_attr = filter.children[i].children[k].attributes
                        for (let l = 0; l < child_attr.length; l++) {
                            child_map[child_attr[l].name] = child_attr[l].value
                        }
                        attr_map["child"].push(JSON.stringify(child_map))
                    }
                }
                newCode.push(JSON.stringify(attr_map))
            }
            this.props.addFilterSet(newCode, this.state.newFilterName)
        }
        this.closeDialog()
    }

    importPhoto(input) {
        console.log("uploaded")
        this.setState({uploadedClicked: true})
        var preview = document.getElementById("imported-photo")
        var importBtn = document.getElementById("import-photo-btn")
        importBtn.style.display = "none"
        preview.style.display = "block"
        document.getElementById("generate-filter-btn").style.display = "block"
        let topbar = this

        if (input.files && input.files[0]) {
            var reader = new FileReader()
            var state = this
            reader.onload = function (e) {
                preview.setAttribute('src', e.target.result)
                preview.setAttribute('width', "300px")
                preview.setAttribute('height', "300px")
                
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
                            .then(res => state.setState({extractedInfo: res}, () => {
                                topbar.setState({jsonExtracted: true})
                            }))
                            .catch(error => console.error(error))
                    })
            }
            reader.readAsDataURL(input.files[0])
        }
    }

    handleNewFilterNameChange = (event) => {
        this.setState({newFilterName: event.target.value})
    }

    addBlankFilterSet() {
        this.setState({addFilterMenuAnchor: null})
        let index = this.props.addFilterSet(null, "", "new", undefined, true)
        this.props.openEditDialogAtIndex(index)
        this.props.sendLog('added_filter_scratch')
    }

    addFilterSetFromPreset() {
        this.setState({addFilterMenuAnchor: null})
        base.fetch('stored_filter_sets', {
            context: this,
            asArray: true,
            then(data){
                this.props.openDBDialog(data, -1)
            }
        })
    }

    handleAddFilterBtnClicked = (event) => {
        this.setState({addFilterMenuAnchor: event.currentTarget})
    }

    renderAllFilterVisibilityIcon() {
        return this.props.allFilterIsVisible ? <VisibilityIcon style={{ height: 30 }}/> : <VisibilityOffIcon style={{ height: 30 }}/>
    }

    render() {
        return (
            <div id="filters-topbar">
                <div id="filters-outer-container">
                    <Tooltip title="Toggle all filter visibility">
                        <IconButton
                            color='inherit'
                            onClick={(event) => {this.props.toggleAllFilterVisibility(this.props.allFilterIsVisible)}}
                            onFocus={(event) => event.stopPropagation()}
                            aria-label="toggle all filter visibility"
                            size="small">
                                {this.renderAllFilterVisibilityIcon()}
                            </IconButton>
                        </Tooltip>
                    <PauseButton sendLog={this.props.sendLog}/>

                    <div id='filters-inner-container'>
                        <span id="toggle-btn">
                            <Tooltip title="Selecting this speeds up rendering your illustration but may cut off some ink in rare cases">
                                <FormControlLabel
                                    control={
                                        <Switch
                                            size="small"
                                            checked={!this.props.cropToggle}
                                            onChange={() => {
                                                this.props.toggleCrop()
                                                
                                                let SVGElem = document.getElementById('main-canvas');
                                                let antialiasSetting = this.props.cropToggle ? 'optimizeSpeed' : 'auto';
                                                if(SVGElem) SVGElem.style.setProperty('shape-rendering', antialiasSetting)
                                            }}
                                            name="checkedUseFilter"
                                            inputProps={{ 'aria-label': 'checkbox to crop filter for performance' }}/>
                                    }
                                    labelPlacement="start"
                                    label={<span className='small-bold-text' id='optimize-label'>Optimize</span>}
                                />
                            </Tooltip>


                            <Tooltip title="Add filter">
                                <IconButton 
                                    id="add-filter-btn"
                                    onClick={this.handleAddFilterBtnClicked} 
                                    color='secondary' 
                                    aria-label="add filter"
                                    size="small">
                                    <SvgIcon>
                                        <AddIcon/>
                                    </SvgIcon>
                                </IconButton>
                            </Tooltip>
                        </span>

                        

                    </div>
                </div>
                <Menu
                    getContentAnchorEl={null}
                    anchorOrigin={{vertical: 'bottom', horizontal: 'left'}}
                    transformOrigin={{vertical: 'top', horizontal: 'left'}}
                    anchorEl={this.state.addFilterMenuAnchor}
                    open={Boolean(this.state.addFilterMenuAnchor)}
                    onClose={() => this.setState({addFilterMenuAnchor: null})}>
                    <MenuItem onClick={() => this.addBlankFilterSet()} disableRipple>
                        Add blank filter
                        </MenuItem>
                    <MenuItem onClick={() => this.addFilterSetFromPreset()} disableRipple>
                        Add preset filter
                    </MenuItem>
                    {/* <MenuItem onClick={() => this.openDialog()} disableRipple>
                        Generate filter
                    </MenuItem> */}
                </Menu>
                <Dialog
                    maxWidth={false}
                    open={this.state.dialogIsOpen}
                    onClose={() => this.closeDialog()}
                    aria-labelledby="alert-dialog-title"
                    aria-describedby="alert-dialog-description">
                    <DialogTitle id="alert-dialog-title">{"Import"}</DialogTitle>
                    <DialogContent className="dialog-content">
                        <div>
                        <label id="import-photo-btn" htmlFor="file-upload" className="custom-file-upload">
                            <CloudUploadIcon fontSize="large" style={{ color: 'black' }}/>
                            <p>
                            Click here to import photo to convert to filter.
                            </p>
                        </label>
                        <input id="file-upload" type="file" accept="image/png, image/jpeg" onChange={() => this.importPhoto(document.getElementById("file-upload"))}/>
                        <div id="imported-panel">
                            <img id="imported-photo" src="#" alt="loading import..." />
                            <GeneratedFilter 
                                uploadedClicked={this.state.uploadedClicked} 
                                dialogIsOpen={this.state.dialogIsOpen} 
                                extractedInfo={this.state.extractedInfo} 
                                jsonExtracted={this.state.jsonExtracted}/>
                        </div>
                        <div id="generate-filter-btn">
                        <TextField 
                            label="New Filter Name" 
                            color="secondary" 
                            onChange={this.handleNewFilterNameChange}
                            value={this.state.newFilterName}/>
                        <IconButton 
                            onClick={() => this.generateClicked()} 
                            color='inherit' 
                            aria-label="confirm generate filter via photo">
                            <DoneIcon style={{ color: 'black' }}/>
                        </IconButton>
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
