
import React, { Component } from 'react'
import { FilterTopbar } from './filtertopbar'
import DisplayList from './displaylist'
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogTitle from '@material-ui/core/DialogTitle';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemText from '@material-ui/core/ListItemText';
import { withStyles } from "@material-ui/core/styles";
import { makeFilterElementFromDict } from "../util"

import './filterpage.css'
import { Tooltip } from '@material-ui/core';
import { PatternHandler } from '../patterngenerators/patternparamhandler';

const PreviewTooltip = withStyles({
    tooltip: {
        backgroundColor: "rgb(250,250,250);"
    }
})(Tooltip);

export class FilterPage extends Component {
    constructor(props) {
        super(props)
        this.state = {
            dbDialogIsOpen: false,
            filtersData: [],
            previewFilter: null
        }
        this.currentPreviewPatternRefs = [];
    }

    componentDidMount() {
        this.setBindings()
    }

    setBindings() {
        this.openDBDialog = this.openDBDialog.bind(this)
        this.filterPreview = this.filterPreview.bind(this)
    }

    closeDBDialog() {
        this.setState({dbDialogIsOpen: false})
    }

    openDBDialog(data, filterIndex) {
        this.setState({dbDialogIsOpen: true})
        this.setState({filtersData: data})
        this.currFilterIndex = filterIndex
    }

    dbFilterClicked(index) {
        let newCode = []
        for (let i = 0; i < this.state.filtersData[index].params.length ; i++) {
            let f = this.state.filtersData[index].params[i]
            if (f["child"] !== undefined) {
                if (Array.isArray(f["child"])) {
                    f["child"] = f["child"].map(c => {
                        return JSON.stringify(c)
                    })
                }
                else {
                    f["child"] = JSON.stringify(f["child"])
                }
            }
            newCode.push(JSON.stringify(f))
        }
        if (this.currFilterIndex === -1) {
            this.props.addFilterSet(newCode, this.state.filtersData[index].filterID, "preset")
        }
        else {
            this.props.updateFilterCode(newCode, this.currFilterIndex, 0, false)
            this.props.changeFilterID(this.currFilterIndex, this.state.filtersData[index].filterID)
        }
        this.closeDBDialog()
        this.props.sendLog('added_filter_preset')
    }

    filterPreview(index, filtersData=null, customFiltersID=null) {
        let isPreview = index !== -1
        filtersData = isPreview ? this.state.filtersData[index].params : filtersData
        let filtersID = isPreview ? "preview-filter" : "editable-filter"
        if (customFiltersID) {
            filtersID = customFiltersID
        }
        let newPreviewFilter = makeFilterElementFromDict(filtersID, filtersData, isPreview)

        // if preview then change the feImage ID slightly so that we don't get a race condition 
        // which happens when removing the preview <pattern> and adding the actual preset <pattern?
        // since otherwise both would read from the same ID in the patternHandler Map<>() 
        if(isPreview){
            for(let i = 0; i < newPreviewFilter.props.children.length; i++){
                const child = newPreviewFilter.props.children[i];
                if(child.type === "feImage"){

                    let parsedFilter = child.props;
                    const svgID = parsedFilter.href.slice(1);
                    const svgDefElem = document.querySelector('defs');

                    const mainSVGCanvas = document.getElementById('main-canvas')
                    const dimensions = [mainSVGCanvas.width.baseVal.value, mainSVGCanvas.height.baseVal.value];
                    
                    // create pattern handler
                    const newHandler = new PatternHandler(
                        'grid', parsedFilter, svgID, svgDefElem, this.props.patternHandlers, dimensions,
                        this.props.updateFilterCode
                    );
                    /*if(parsedFilter.customunit){
                        newHandler.swapRectWithImage(
                            new Blob([parsedFilter.customunit], { type: "image/svg+xml" }), '',
                            i, j, parsedFilter
                        );
                    }*/
                    if(parsedFilter && parsedFilter.animation){
                        const animationParams = JSON.parse(parsedFilter.animation);
                        const animationNamesToAdd = Object.keys(animationParams);
                        animationNamesToAdd.forEach(key => {
                            const parsedCurrentAni = JSON.parse(animationParams[key])
                            newHandler.updateAnimatedParam(parsedCurrentAni)
                        });
                    }

                    this.currentPreviewPatternRefs.push(newHandler);
                    this.props.patternHandlers.set(svgID, newHandler);
                }
            }
        }

        if (isPreview) {
            this.setState({previewFilter: newPreviewFilter})
        }
        else {
            return newPreviewFilter
        }
    }

    unlinkFilterPreview(){
        if(this.currentPreviewPatternRefs.length > 0){
            this.currentPreviewPatternRefs.forEach(ref => {
                ref.deleteSelf();
                this.props.patternHandlers.delete(ref.svgID); // has -preview
            });
            this.currentPreviewPatternRefs = [];
        }
    }

    render() {
        return (
            <div id="filterpage">
                <FilterTopbar
                    cropToggle={this.props.cropToggle}
                    toggleCrop={this.props.toggleCrop}
                    toggleFilters={this.props.toggleFilters}
                    addFilterSet={this.props.addFilterSet}
                    updateFilterCode={this.props.updateFilterCode}
                    changeFilterID={this.props.changeFilterID}
                    openDBDialog={this.openDBDialog}
                    sendLog={this.props.sendLog}
                    openEditDialogAtIndex={this.props.openEditDialogAtIndex}
                    clearList={this.props.clearList}
                    toggleAllFilterVisibility={this.props.toggleAllFilterVisibility}
                    allFilterIsVisible={this.props.allFilterIsVisible}

                />
                <DisplayList
                    changeFilterID={this.props.changeFilterID}
                    changeSelectedFilter={this.props.changeSelectedFilter}
                    selectedFilter={this.props.selectedFilter}
                    list={this.props.list}
                    addFilterSet={this.props.addFilterSet}
                    removeFilterSet={this.props.removeFilterSet}
                    updateFilterCode={this.props.updateFilterCode}
                    addFilterToSet={this.props.addFilterToSet}
                    removeFilterFromSet={this.props.removeFilterFromSet}
                    updateFilterAnimation={this.props.updateFilterAnimation}
                    openDBDialog={this.openDBDialog}
                    filterPreview={this.filterPreview}
                    sendLog={this.props.sendLog}
                    refreshFilter={this.props.refreshFilter}
                    editDialogOpenIndex={this.props.editDialogOpenIndex}
                    openEditDialogAtIndex={this.props.openEditDialogAtIndex}
                    moveFilterPrimitivesToEnd={this.props.moveFilterPrimitivesToEnd}
                    toggleFilterVisibility={this.props.toggleFilterVisibility}
                    allFilterIsVisible={this.props.allFilterIsVisible}
                    
                    patternSVGReferences={this.props.patternSVGReferences}
                    patternSVGPathReferences={this.props.patternSVGPathReferences}
                    patternSVGAnimators={this.props.patternSVGAnimators}
                    patternHandlers={this.props.patternHandlers}
                    maxDepth={this.props.maxDepth}/>
                <Dialog
                    open={this.state.dbDialogIsOpen}
                    onClose={() => this.closeDBDialog()}
                    aria-labelledby="alert-dialog-title"
                    aria-describedby="alert-dialog-description">
                    <DialogTitle id="alert-dialog-title">{"Get Filters from Presets"}</DialogTitle>
                    <DialogContent className="dialog-content">
                        <List component="nav" aria-label="database filters">
                            {this.state.filtersData.map((filter, index) => {
                                return (<PreviewTooltip key={"filter-from-db-"+filter.filterID+"-"+index} title={
                                    <React.Fragment>
                                        <svg width="200" height="200" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" id='preview-svg-container'>
                                            <g fill="none" filter="url(#preview-filter)">
                                                <path stroke="#63B0A6" d="M5 160 l415 0" strokeWidth="16" strokeLinecap="round"/>
                                                <rect id="rect-3" x="25" y="50" width="50" height="100" fill="#D65D4F"/>
                                                <rect id="rect-4" x="90" y="50" width="100" height="50" fill="#FFCB52"/>
                                            </g>
                                            {this.state.previewFilter}
                                        </svg>
                                    </React.Fragment>
                                } placement="left">
                                    <ListItem button
                                        onMouseEnter={() => this.filterPreview(index)}
                                        onMouseLeave={() => this.unlinkFilterPreview()}
                                        onClick={() => this.dbFilterClicked(index)}>
                                        <ListItemText primary={filter.filterID + ` (by ${filter.username})`} />
                                    </ListItem>
                                </PreviewTooltip>
                                )}
                            )}
                        </List>
                    </DialogContent>
                    <DialogActions>
                    </DialogActions>
                </Dialog>
            </div>
        )
    }
}