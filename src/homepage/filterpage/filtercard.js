import React from 'react';
import IconButton from '@material-ui/core/IconButton';
import Tooltip from '@material-ui/core/Tooltip';
import DeleteForeverIcon from '@material-ui/icons/DeleteForever';
import User from '../../util/user.js'
import Card from '@material-ui/core/Card';
import CardContent from '@material-ui/core/CardContent';
import EditIcon from '@material-ui/icons/Edit';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogTitle from '@material-ui/core/DialogTitle';
import FilterEditor from './filtereditor.js';
import MuiAlert from '@material-ui/lab/Alert'
import Snackbar from '@material-ui/core/Snackbar'
import CallSplitIcon from '@material-ui/icons/CallSplit';
import Portal from '@material-ui/core/Portal';
import VisibilityIcon from '@material-ui/icons/Visibility';
import VisibilityOffIcon from '@material-ui/icons/VisibilityOff';
import CloudUploadIcon from '@material-ui/icons/CloudUpload';
import CloseIcon from '@material-ui/icons/Close';

import "./filtercard.css"
import { base } from '../../base'
import { makeid } from '../util.js';

class FilterCard extends React.Component {

    constructor(props) {
        super(props)
        this.state = {
            filterID: this.props.id,
            filterTypeToAdd: "feBlend",
            snackbarOpen: false,
            snackbarMessage: '',
            snackbarSeverity: 'info',
            filterIsVisible: true
        }
        this.filterTypes = ["feBlend", "feColorMatrix", "feComponentTransfer", "feComposite", "feConvolveMatrix", "feDiffuseLighting", "feDisplacementMap", "feDropShadow", "feFlood", "feGaussianBlur", "feImage", "feMerge", "feMorphology", "feOffset", "feSpecularLighting", "feTile", "feTurbulence"]
        this.editorRef = React.createRef()
    }

    componentDidMount() {
        this.openSnackbar = this.openSnackbar.bind(this)
    }

    addFilterToDB = (event) => {
        event.stopPropagation()
        let username = User.getUsername()
        let context = this
        event.stopPropagation()
        let filter_to_store = {
            "filterID": this.props.id,
            "checked": false,
            "username": username,
            "params": this.props.params.map(p => {
                p = JSON.parse(p)
                if (p["child"] !== undefined) {
                    if (Array.isArray(p["child"])) {
                        p["child"] = p["child"].map(c => {
                            return JSON.parse(c)
                        })
                    }
                    else {
                        p["child"] = JSON.parse(p["child"])
                    }
                }
                return p
            })
        }
        base.push('stored_filter_sets', {
            data: filter_to_store,
            then(err){
              if(!err){
                context.setState({snackbarMessage: 'Successfully added filter to presets!'})
                context.setState({snackbarSeverity: 'success'})
                context.props.sendLog("saved_filter_to_DB")
              }
              else {
                context.setState({snackbarMessage: 'Uh-oh--something went wrong!'})
                context.setState({snackbarSeverity: 'error'})
              }
              context.setState({snackbarOpen: true})
            }
        })
    }

    removeClicked = (event) => {
        event.stopPropagation()
        this.props.openEditDialogAtIndex(-1)
        if (this.props.checked) {
            this.props.changeSelectedFilter("")
        }
        this.props.removeFilterSet(this.props.index)
        this.props.sendLog("removed_filter")
    }

    editClicked = (event) => {
        event.stopPropagation()
        this.props.openEditDialogAtIndex(this.props.index)
        this.props.sendLog("opened_edit_filter_dialog")
    }

    remixClicked = (event) => {
        event.stopPropagation()
        //clone and open edit dialog of new filter

        // replace old IDs with new IDs for patterns so that the remix doesn't link back to the original
        // filter's <pattern> and <grid> when updating params 
        const newParams = this.props.params.map(params => {
            const parsedObject = JSON.parse(params);
            const oldHref = parsedObject.href?.slice(1);
            if(oldHref) return params.replace(new RegExp(oldHref, 'g'), makeid(8));
            else return params;
        });

        // adding random number in front of remix fixes this??
        this.props.addFilterSet(newParams, this.props.id+"-remix-"+(Math.random() * 100 | 0).toString().padStart(2, '0'), "preset", true)
    }

    cardClicked() {
        if (this.props.checked) {
            this.props.changeSelectedFilter("-1")
        }
        else {
            this.props.changeSelectedFilter(this.props.index.toString())
        }
    }

    closeEditDialog() {
        this.props.changeFilterID(this.props.index, this.editorRef.current.state.filterID)
        this.props.openEditDialogAtIndex(-1)
        this.props.sendLog("closed_edit_filter_dialog")
        if (this.props.listLength === 1) {
            this.props.changeSelectedFilter("0")
        }
        this.props.refreshFilter(this.props.index)
    }

    getFromDBClicked = (event) => {
        event.stopPropagation()
        base.fetch('stored_filter_sets', {
            context: this,
            asArray: true,
            then(data){
                this.props.openDBDialog(data, this.props.index)
            }
        })
    }

    onFilterTextFieldChange = (event) => {
        this.props.changeFilterID(this.props.index, this.state.filterID)
    }

    handleFilterTypeChange = (event) => {
        this.setState({filterTypeToAdd: event.target.value})
    }

    addFilter = (event) => {
        let filterInfo = JSON.stringify({filterName: this.state.filterTypeToAdd, result: ""})
        this.props.addFilterToSet(this.props.index, filterInfo)
    }

    openSnackbar(message, severity) {
        this.setState({snackbarMessage: message})
        this.setState({snackbarSeverity: severity})
        this.setState({snackbarOpen: true})
    }

    toggleFilterVisibilityClicked(event) {
        event.stopPropagation()
        let visibility = this.props.allFilterIsVisible && this.state.filterIsVisible
        this.setState({filterIsVisible: !visibility}, () => {
            this.props.toggleFilterVisibility(this.props.index, this.state.filterID, !visibility)
        })
    }

    renderFilterVisibilityIcon() {
        return this.state.filterIsVisible ? <VisibilityIcon style={{ height: 30 }}/> : <VisibilityOffIcon style={{ height: 30 }}/>
    }

    render() {
        return (
            <div id="filter-card">
                <Card onClick={() => this.cardClicked()}>
                <CardContent className={this.props.checked ? "filter-card-prop selected-card" : "filter-card-prop unselected-card"}>
                <div>
                    <div className='btn-top-right'>
                        <span className="small-padding-around">
                        <Tooltip title="Toggle filter visibility">
                            <span>
                                <IconButton
                                    color='inherit'
                                    disabled={!this.props.allFilterIsVisible}
                                    onClick={(event) => {this.toggleFilterVisibilityClicked(event)}}
                                    onFocus={(event) => event.stopPropagation()}
                                    aria-label="toggle filter visibility"
                                    size="small">
                                        {this.renderFilterVisibilityIcon()}
                                </IconButton>
                            </span>
                        </Tooltip>
                        </span>
                    </div>
                    <div>
                        <svg className='clickable-layers-icon' focusable="false" viewBox="0 0 24 24" style={{ height: 15, width: 15}}>
                            {/* <path id={`${this.state.filterID}-!card-preview`} d="M6 6 h18v18H6z" filter={`url(#${this.state.filterID}-!layer)`}></path> */}
                            {this.props.filterPreview(-1, this.props.params.map(x => JSON.parse(x)), `${this.state.filterID}-!layer`)} 
                        </svg>
                        {this.state.filterID}
                    </div>
                    <div className='flex-left pad-top'>
                        <div className='pad-sides pad-top'>
                            <div className='filter-card-btn' onClick={this.editClicked}>
                                <IconButton
                                    color='secondary'
                                    onFocus={(event) => event.stopPropagation()}
                                    aria-label="edit filter"
                                    size="small">
                                    <EditIcon/>
                                </IconButton>
                                <span className='pad-top-small'>Edit</span>
                            </div>
                        </div>
                        <div className='pad-sides pad-top'>
                            <div className='filter-card-btn' onClick={this.remixClicked}>
                                <IconButton
                                    color='secondary'
                                    onFocus={(event) => event.stopPropagation()}
                                    aria-label="remix filter"
                                    size="small">
                                    <CallSplitIcon/>
                                </IconButton>
                                <span className='pad-top-small'>Remix</span>
                            </div>
                        </div>
                    </div>
                </div>
                </CardContent>
                </Card>
                <Dialog
                    maxWidth={false}
                    open={this.props.editDialogOpenIndex === this.props.index}
                    onClose={() => this.closeEditDialog()}>
                    <DialogTitle>{"Edit Filter"}</DialogTitle>
                    <DialogContent dividers>
                        <FilterEditor
                        ref={this.editorRef}
                        id={this.props.id}
                        index={this.props.index}
                        params={this.props.params}
                        changeFilterID={this.props.changeFilterID}
                        filterPreview={this.props.filterPreview}
                        updateFilterCode={this.props.updateFilterCode}
                        removeFilterFromSet={this.props.removeFilterFromSet}
                        updateFilterAnimation={this.props.updateFilterAnimation}
                        addFilterToSet={this.props.addFilterToSet}
                        sendLog={this.props.sendLog}
                        openSnackbar={this.openSnackbar}
                        moveFilterPrimitivesToEnd={this.props.moveFilterPrimitivesToEnd}
                        
                        patternSVGReferences={this.props.patternSVGReferences}
                        patternSVGPathReferences={this.props.patternSVGPathReferences}
                        patternSVGAnimators={this.props.patternSVGAnimators}
                        patternHandlers={this.props.patternHandlers}
                        maxDepth={this.props.maxDepth}/>
                    </DialogContent>
                    <div className="pad-top-and-sides flex-row">
                        <div className='flex-row'>
                            <div className='filter-card-btn' onClick={this.removeClicked}>
                                <IconButton
                                    color='inherit'
                                    onFocus={(event) => event.stopPropagation()}
                                    aria-label="delete filter"
                                    size="small">
                                    <DeleteForeverIcon/>
                                </IconButton>
                                <span className='pad-top-small'>Delete Filter</span>
                            </div>
                            <div className='tiny-padding'></div>
                            <div className='filter-card-btn' onClick={this.addFilterToDB}>
                                <IconButton
                                    color='inherit'
                                    onFocus={(event) => event.stopPropagation()}
                                    aria-label="upload filter to presets"
                                    size="small">
                                    <CloudUploadIcon/>
                                </IconButton>
                                <span className='pad-top-small'>Upload Filter to Presets</span>
                            </div>
                        </div>
                        <div className='filter-card-btn' onClick={() => this.closeEditDialog()}>
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
                <Portal>
                    <Snackbar open={this.state.snackbarOpen} autoHideDuration={2000} onClose={() => this.setState({ snackbarOpen: false })}>
                        <MuiAlert severity={this.state.snackbarSeverity} elevation={6} variant="filled">
                            {this.state.snackbarMessage}
                        </MuiAlert>
                    </Snackbar>
                </Portal>
            </div>
        )
    }

}

export default FilterCard
