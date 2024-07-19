import React, { Component } from 'react'
import { CodePage } from './codepage/codepage'
import { SketchPage } from './sketchpage/sketchpage'
import { FilterPage } from './filterpage/filterpage'
import { LayersPage } from './layerspage/layerspage';
import { Link } from 'react-router-dom';
import Button from '@material-ui/core/Button';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import AddPhotoAlternateIcon from '@material-ui/icons/AddPhotoAlternate';
import GetAppIcon from '@material-ui/icons/GetApp';

import { firebase, base } from '../base'
import User from '../util/user.js'
import { makeid } from "./util"

import './homepage.css'

import { PatternHandler } from './patterngenerators/patternparamhandler';

export class HomePage extends Component {
    constructor(props) {
        super(props)
        this.state = {
            width: window.innerWidth,
            currStrokeCode: "Start an SVG illustration to begin! -->",
            currSliderVal: 1,
            codeToSVGButtonClicked: false,
            sliderVisible: false,
            cropToggle: false,
            list: [],
            selectedFilter: '',
            username: '',
            uid: '',
            svgString: '',
            startupModalOpen: false,
            helpModalOpen: false,
            editDialogOpenIndex: -1,
            gradientDialogOpenIndex: -1,
            converterDialogOpenIndex: -1,
            paletteDialogOpenIndex: 1,
            allFilterIsVisible: true,
            parallaxOn: false,
            maxDepth: 1
        }
        this.filterVisibilities = {}
        this.filterVisibilitiesFromCard = {}
        this.sketchpageRef = React.createRef()
        this.filtereditorRef = React.createRef()

        // maps to store pattern SVG and path references 
        this.patternSVGReferences = new Map();
        this.patternSVGPathReferences = new Map();
        this.patternSVGAnimators = new Map();
        this.patternHandlers = new Map();
        this.layerspageRef = React.createRef()
    }

    componentDidMount() {
        this.setBindings()
        var context = this
        window.addEventListener('resize', () => {
            this.setState({ width: window.innerWidth })
        })
        firebase.auth().signInAnonymously().then((userCredential) => {
            var userid = userCredential.user.uid
            var localuid = localStorage.getItem('userId')
            if (userid !== localuid) {
                localStorage.setItem('userId', userid)
            }
            context.setState({ uid: userid }, () => {
                context.setState({ username: User.getUsername() }, () => {
                    context.sendLog("loaded_homepage")
                    base.fetch(`active_filter_sets/${context.state.uid}`, {
                        context: context, asArray: true, then(data) {
                            if (data.length === 0) {
                                // context.setState({ startupModalOpen: true })
                                base.post(`active_filter_sets/${context.state.uid}`, {
                                    data: { username: context.state.username, filters: [] },
                                    then: () => {
                                        context.listRef = base.syncState(`active_filter_sets/${context.state.uid}/filters`, {
                                            context: context, state: 'list', asArray: true,
                                            then: () => {
                                                context.listRef = base.syncState(`active_filter_sets/${context.state.uid}/svgString`, {
                                                    context: context, state: 'svgString',
                                                    then: () => {
                                                        for (let i = 0; i < context.state.list.length; i++) {
                                                            if (context.state.list[i].checked) {
                                                                context.setState({ selectedFilter: i.toString() })
                                                            }
                                                        }
                                                        context.callAPI()
                                                        if (this.state.list.length === 1) {
                                                            this.changeSelectedFilter("0")
                                                        }
                                                    }
                                                })
                                            }
                                        })
                                    }
                                })
                            }
                            else {
                                context.listRef = base.syncState(`active_filter_sets/${context.state.uid}/filters`, {
                                    context: context, state: 'list', asArray: true,
                                    then: () => {
                                        context.listRef = base.syncState(`active_filter_sets/${context.state.uid}/svgString`, {
                                            context: context, state: 'svgString',
                                            then: () => {
                                                if (this.props.location.state !== undefined) { // means this is remixed from gallery
                                                    context.clearList()
                                                    context.sketchpageRef.current.parseSVG(context.sketchpageRef.current, this.props.location.state.svgString)
                                                }
                                                else {
                                                    if (context.state.list.length === 0 && context.state.svgString === '') {
                                                        context.callAPI()
                                                    }
                                                    else {
                                                        // load previous patterns into dom here
                                                        for (let i = 0; i < context.state.list.length; i++) {
                                                            const rawFilter = context.state.list[i];

                                                            if (!rawFilter.params) continue;

                                                            for (let j = 0; j < rawFilter.params.length; j++) {
                                                                const param = rawFilter.params[j];

                                                                let parsedFilter = JSON.parse(param);
                                                                if (parsedFilter.filterName === 'feImage') {
                                                                    console.log("Loading pattern...")

                                                                    const patterntype = parsedFilter.patterntype;
                                                                    const svgID = parsedFilter.href.slice(1);

                                                                    const svgDefElem = document.querySelector('defs');

                                                                    if (patterntype === 'grid') {
                                                                        const mainSVGCanvas = document.getElementById('main-canvas')
                                                                        const dimensions = [mainSVGCanvas.width.baseVal.value, mainSVGCanvas.height.baseVal.value];

                                                                        // create pattern handler
                                                                        const newHandler = new PatternHandler(
                                                                            'grid', parsedFilter, svgID, svgDefElem, context.patternHandlers, dimensions,
                                                                            context.updateFilterCode
                                                                        );
                                                                        if (parsedFilter.customunit) {
                                                                            newHandler.swapRectWithImage(
                                                                                new Blob([parsedFilter.customunit], { type: "image/svg+xml" }), '',
                                                                                i, j, parsedFilter
                                                                            );
                                                                        }
                                                                        context.patternHandlers.set(svgID, newHandler)

                                                                        // and update pattern handler with animations
                                                                        if (parsedFilter && parsedFilter.animation) {
                                                                            const animationParams = JSON.parse(parsedFilter.animation);
                                                                            const animationNamesToAdd = Object.keys(animationParams);
                                                                            animationNamesToAdd.forEach(key => {
                                                                                const parsedCurrentAni = JSON.parse(animationParams[key])
                                                                                newHandler.updateAnimatedParam(parsedCurrentAni)
                                                                            });
                                                                        }
                                                                    } else if (patterntype === 'line') {
                                                                        // TODO
                                                                    }

                                                                    // context.patternSVGPathReferences.set(svgID, patternGeneratorOutput.patternReferences);
                                                                    // context.patternSVGReferences.set(svgID, patternGeneratorOutput.renderedElements);
                                                                }
                                                            }
                                                        }

                                                        context.sketchpageRef.current.parseSVG(context.sketchpageRef.current, context.state.svgString, false)
                                                        for (let i = 0; i < context.state.list.length; i++) {
                                                            if (context.state.list[i].checked) {
                                                                context.setState({ selectedFilter: i.toString() })
                                                            }
                                                        }
                                                    }
                                                }
                                                if (this.state.list.length === 1) {
                                                    this.changeSelectedFilter("0")
                                                }
                                            }
                                        })
                                    }
                                })
                            }
                        }
                    })
                })
            })
        }).catch((error) => {
            console.log(error.message)
        })
    }

    componentWillUnmount() {
        base.removeBinding(this.listRef)
    }

    callAPI() {
        console.log("fetched")
        fetch(`${process.env.PUBLIC_URL}/processImg`)
            .then(res => res.text())
            .then(text => this.sketchpageRef.current.parseSVG(this.sketchpageRef.current, text))
            .catch(() => console.log("error with processImg"))
    }

    setBindings() {
        this.updateStrokeCode = this.updateStrokeCode.bind(this)
        this.verifyStrokeCode = this.verifyStrokeCode.bind(this)
        this.updateSliderVal = this.updateSliderVal.bind(this)
        this.changeFilterID = this.changeFilterID.bind(this)
        this.changeSelectedFilter = this.changeSelectedFilter.bind(this)
        this.updateFilterCode = this.updateFilterCode.bind(this)
        this.addFilterToSet = this.addFilterToSet.bind(this)
        this.removeFilterFromSet = this.removeFilterFromSet.bind(this)
        this.updateFilterAnimation = this.updateFilterAnimation.bind(this)
        this.toggleCrop = this.toggleCrop.bind(this)
        this.addToListFromDOM = this.addToListFromDOM.bind(this)
        this.sendLog = this.sendLog.bind(this)
        this.updateSVGString = this.updateSVGString.bind(this)
        this.refreshFilter = this.refreshFilter.bind(this)
        this.openEditDialogAtIndex = this.openEditDialogAtIndex.bind(this)
        this.clearList = this.clearList.bind(this)
        this.moveFilterPrimitivesToEnd = this.moveFilterPrimitivesToEnd.bind(this)
        this.toggleFilterVisibility = this.toggleFilterVisibility.bind(this)
        this.toggleAllFilterVisibility = this.toggleAllFilterVisibility.bind(this)
        this.openGradientDialogAtIndex = this.openGradientDialogAtIndex.bind(this);
        this.openConverterDialogAtIndex = this.openConverterDialogAtIndex.bind(this);
        this.openPaletteDialogAtIndex = this.openPaletteDialogAtIndex.bind(this);
        this.layerpageHelper = this.layerpageHelper.bind(this)
        this.toggleParallax = this.toggleParallax.bind(this)
        this.updateMaxDepth = this.updateMaxDepth.bind(this)
    }

    refreshFilter(index) {
        this.sketchpageRef.current.initializeFilterSet(index, true)
        this.sketchpageRef.current.serializeToString()
    }

    toggleCrop() {
        this.setState({ cropToggle: !this.state.cropToggle })
    }

    toggleFilterVisibility(index, filterID, isVisible) {
        this.filterVisibilities[filterID] = isVisible
        this.filterVisibilitiesFromCard[filterID] = isVisible
        this.sketchpageRef.current.primarySketch.updatePathFilterVisibilities(filterID, isVisible)
    }

    toggleAllFilterVisibility(isVisible) {
        let visibility = !isVisible
        this.setState({ allFilterIsVisible: visibility }, () => {
            for (let i = 0; i < this.state.list.length; i++) {
                let k = this.state.list[i].filterID
                this.filterVisibilitiesFromCard[k] = this.filterVisibilitiesFromCard[k] === undefined ? true : this.filterVisibilitiesFromCard[k]
                this.filterVisibilities[k] = visibility ? this.filterVisibilitiesFromCard[k] : visibility
                this.sketchpageRef.current.primarySketch.updatePathFilterVisibilities(k, this.filterVisibilities[k])
            }
        })
    }

    updateSVGString(newString) {
        this.setState({ svgString: newString })
    }

    updateStrokeCode(newStrokeCode) {
        this.setState({ currStrokeCode: newStrokeCode })
        this.setState({ sliderVisible: true })
    }

    updateFilterCode(code, filterIndex, filterComponentIndex, byComponentIndex = true, isNewFilter = false) {
        let l = this.state.list
        if (byComponentIndex) {
            l[filterIndex].params[filterComponentIndex] = code

        }
        else {
            l[filterIndex].params = code
        }
        if (!isNewFilter && l[filterIndex].type === "preset") {
            l[filterIndex].type = "remix"
        }
        this.setState({ list: l })

        // freshly added preset filter
        if (isNewFilter) {
            code.forEach(filterCode => {
                const parsedFilter = JSON.parse(filterCode);
                if (parsedFilter.filterName !== "feImage") return;

                const svgID = parsedFilter.href.slice(1);
                const svgDefElem = document.querySelector('defs');
                const mainSVGCanvas = document.getElementById('main-canvas')
                const dimensions = [mainSVGCanvas.width.baseVal.value, mainSVGCanvas.height.baseVal.value];

                // create pattern handler
                if (this.patternHandlers.has(svgID)) return; // filter already has been handled somewher else

                const newHandler = new PatternHandler(
                    'grid', parsedFilter, svgID, svgDefElem, this.patternHandlers, dimensions,
                    this.updateFilterCode
                );
                // make sure custom unit is swapped in if it exists
                if (parsedFilter.customunit) {
                    newHandler.swapRectWithImage(
                        new Blob([parsedFilter.customunit], { type: "image/svg+xml" }), '',
                        filterIndex, filterComponentIndex, parsedFilter
                    );
                }

                if (parsedFilter && parsedFilter.animation) {
                    const animationParams = JSON.parse(parsedFilter.animation);
                    const animationNamesToAdd = Object.keys(animationParams);
                    animationNamesToAdd.forEach(key => {
                        const parsedCurrentAni = JSON.parse(animationParams[key])
                        newHandler.updateAnimatedParam(parsedCurrentAni)
                    });
                }
                this.patternHandlers.set(svgID, newHandler);
            })
        }

        return Promise.resolve()
    }

    updateSliderVal(newSliderVal) {
        this.setState({ currSliderVal: newSliderVal })
        let strokeCodeJSON = JSON.parse(this.state.currStrokeCode)
        let newCoords = []
        for (let i = 0; i < strokeCodeJSON.coords.length - (newSliderVal * 2); i += 2) {
            let sumX = 0
            let sumY = 0
            for (let j = 0; j < newSliderVal * 2; j++) {
                if (j % 2 === 0) {
                    sumX += strokeCodeJSON.coords[i + j]
                }
                else {
                    sumY += strokeCodeJSON.coords[i + j]
                }
            }
            sumX /= newSliderVal
            sumY /= newSliderVal
            sumX = Math.round(sumX)
            sumY = Math.round(sumY)
            newCoords.push.apply(newCoords, [sumX, sumY])
        }
        strokeCodeJSON.coords = newCoords
        this.setState({ currStrokeCode: JSON.stringify(strokeCodeJSON) })
    }

    verifyStrokeCode() {
        this.setState({ codeToSVGButtonClicked: true })
    }

    changeFilterID(index, newID) {
        let l = this.state.list
        l[index].filterID = newID
        this.setState({ list: l })
    }

    changeSelectedFilter(newFilter, callback) {
        let l = this.state.list
        this.setState({ selectedFilter: newFilter.toString() }, () => {
            for (let i = 0; i < l.length; i++) {
                l[i].checked = i.toString() === this.state.selectedFilter
            }
            this.setState({ list: l }, () => {
                if (callback) {
                    callback()
                }
            })
        })
    }

    openEditDialogAtIndex(index) {
        this.setState({ editDialogOpenIndex: index })
    }

    openGradientDialogAtIndex(index) {
        this.setState({ gradientDialogOpenIndex: index })
    }

    openConverterDialogAtIndex(index) {
        this.setState({ converterDialogOpenIndex: index })
    }

    openPaletteDialogAtIndex(index) {
        this.setState({ paletteDialogOpenIndex: index })
    }

    /**
     * Adds the blank filter to the list and opens the filter editor
     */
    addFilterSet = (newCode = null, newName = "", newType = "new", openEditor = false) => {
        this.setState({ list: [...this.state.list, { filterID: "empty-" + (Date.now() % 1000), params: [], checked: false, type: newType }] }, () => {
            let index = this.state.list.length - 1
            this.changeSelectedFilter(index, () => {
                if (newCode !== null) {
                    this.updateFilterCode(newCode, index, 0, false, true)
                    this.changeFilterID(index, newName)
                }
                if (openEditor) {
                    this.openEditDialogAtIndex(index)
                }
            })
        })
    }

    addToListFromDOM = (dom = null) => {
        if (dom !== null) {
            let newCode = []
            for (let i = 0; i < dom.children.length; i++) {
                let attr_map = { "filterName": dom.children[i].nodeName }
                let attr = dom.children[i].attributes
                for (let j = 0; j < attr.length; j++) {
                    if (attr[j].name !== "animation") {
                        attr_map[attr[j].name] = attr[j].value
                    }
                }
                if (attr_map["baseFrequency"] !== undefined && attr_map["baseFrequency"].split(" ").length === 1) {
                    attr_map["baseFrequency"] = attr_map["baseFrequency"] + " " + attr_map["baseFrequency"]
                }
                if (attr_map["result"] === undefined) {
                    attr_map["result"] = makeid(6)
                }
                if (attr_map["filterName"] === 'feImage') {
                    const svgDefElem = document.querySelector('defs');
                    const mainSVGCanvas = document.getElementById('main-canvas')
                    const dimensions = [mainSVGCanvas.width.baseVal.value, mainSVGCanvas.height.baseVal.value];
                    const svgID = attr_map["href"].slice(1);

                    // create pattern handler
                    const newHandler = new PatternHandler(
                        'grid', attr_map, svgID, svgDefElem, this.patternHandlers, dimensions,
                        this.updateFilterCode
                    );
                    if (attr_map.customunit) {
                        newHandler.swapRectWithImage(
                            new Blob([attr_map.customunit], { type: "image/svg+xml" }), '',
                            0, 0, attr_map, false
                        );
                    }
                    this.patternHandlers.set(svgID, newHandler)
                }
                if (dom.children[i].hasChildNodes()) {
                    for (let k = 0; k < dom.children[i].children.length; k++) {
                        let node = dom.children[i].children[k]


                        // parse animation tags for importing seperately
                        if (attr_map["filterName"] === 'feImage') {
                            const svgID = attr_map["href"].slice(1);
                            const handler = this.patternHandlers.get(svgID);

                            let child_map = { "filterName": node.nodeName }
                            let child_attr = node.attributes
                            for (let l = 0; l < child_attr.length; l++) {
                                child_map[child_attr[l].name] = child_attr[l].value
                            }
                            handler.updateAnimatedParam(child_map);
                            if (attr_map["animation"] === undefined) {
                                attr_map["animation"] = {}
                            }
                            attr_map["animation"][node.getAttribute('attributeName')] = JSON.stringify({ "attributeName": node.getAttribute('attributeName'), "dur": node.getAttribute('dur'), "values": node.getAttribute('values') })
                        }

                        else if (node.nodeName === "animate") {
                            if (attr_map["animation"] === undefined) {
                                attr_map["animation"] = {}
                            }
                            if (node.getAttribute('attributeName') !== "None") {
                                attr_map["animation"][node.getAttribute('attributeName')] = JSON.stringify({ "attributeName": node.getAttribute('attributeName'), "dur": node.getAttribute('dur'), "values": node.getAttribute('values') })
                            }
                        }
                        else {
                            if (attr_map["child"] === undefined) {
                                attr_map["child"] = []
                            }
                            let child_map = { "filterName": node.nodeName }
                            let child_attr = node.attributes
                            for (let l = 0; l < child_attr.length; l++) {
                                child_map[child_attr[l].name] = child_attr[l].value
                            }
                            attr_map["child"].push(JSON.stringify(child_map))
                        }
                    }
                    if (attr_map["child"] !== undefined && attr_map["child"].length === 1) {
                        attr_map["child"] = attr_map["child"][0]
                    }
                    attr_map["animation"] = JSON.stringify(attr_map["animation"])
                }
                newCode.push(JSON.stringify(attr_map))
            }
            this.addFilterSet(newCode, dom.getAttribute("id"), "preset")
        }
    }

    /**
     * Removes the filter with the corresponding index from the list
     * @param {number} index
     */
    removeFromList = index => {
        var l = this.state.list
        l.splice(index, 1)
        this.setState({ list: l })
    }

    clearList = () => {
        this.setState({ list: [] })
    }

    addFilterToSet = (index, filterInfo) => {
        var l = this.state.list
        if (l[index].params === undefined) {
            l[index].params = []
        }
        let newParams = [...l[index].params, filterInfo]
        l[index].params = newParams
        this.setState({ list: l })
        return Promise.resolve()
    }

    removeFilterFromSet = (filterIndex, filterComponentIndex) => {
        var l = this.state.list
        let newParams = l[filterIndex].params
        let filterComponentRemovedID = JSON.parse(newParams[filterComponentIndex]).result
        newParams.splice(filterComponentIndex, 1)
        for (let i = 0; i < newParams.length; i++) { // Fix for Safari (Chrome automatically does this): defaulting to SourceGraphic for non-existent input names
            let param = JSON.parse(newParams[i])
            if (param.in === filterComponentRemovedID) {
                param.in = "SourceGraphic"
                newParams[i] = JSON.stringify(param)
            }
            else if (param.in2 === filterComponentRemovedID) {
                param.in2 = "SourceGraphic"
                newParams[i] = JSON.stringify(param)
            }
        }
        l[filterIndex].params = newParams
        this.setState({ list: l })
        return Promise.resolve()
    }

    moveFilterPrimitivesToEnd = (filterIndex, indiciesMovedFrom) => {
        if (indiciesMovedFrom.size > 0) {
            var l = this.state.list
            let originalParams = l[filterIndex].params
            let start = []
            let end = []
            for (let i = 0; i < originalParams.length; i++) {
                if (indiciesMovedFrom.has(i)) {
                    end.push(originalParams[i])
                }
                else {
                    start.push(originalParams[i])
                }
            }
            l[filterIndex].params = start.concat(end)
            this.setState({ list: l })
        }
        return Promise.resolve()
    }

    updateFilterAnimation = (filterIndex, filterComponentIndex, animationParams, childIndex) => {
        var l = this.state.list
        if (childIndex === undefined) {
            let params = JSON.parse(l[filterIndex].params[filterComponentIndex])
            params["animation"] = JSON.stringify(animationParams)
            l[filterIndex].params[filterComponentIndex] = JSON.stringify(params)
        }
        else {
            let params = JSON.parse(l[filterIndex].params[filterComponentIndex])
            if (childIndex === -1) {
                let child = JSON.parse(params["child"])
                child["animation"] = JSON.stringify(animationParams)
                params["child"] = JSON.stringify(child)
            }
            else {
                let child = JSON.parse(params["child"][childIndex])
                child["animation"] = JSON.stringify(animationParams)
                params["child"][childIndex] = JSON.stringify(child)
            }
            l[filterIndex].params[filterComponentIndex] = JSON.stringify(params)
        }
        this.setState({ list: l })
        return Promise.resolve()
    }

    layerpageHelper(task, id, layerFilterID, extraParams = {}) {
        if (task === "add") {
            this.updateMaxDepth(extraParams.depth, true)
            this.layerspageRef.current.addLayer(id, layerFilterID, extraParams.depth, false)
        }
        else if (task === "change filter") {
            this.layerspageRef.current.changeLayerFilter(id, layerFilterID, false, true)
        }
        else if (task === "change visibility") {
            this.layerspageRef.current.setLayerVisibility(id, extraParams.isVisible)
        }
        else if (task === "change opacity") {
            this.layerspageRef.current.setLayerOpacity(id, extraParams.opacityVal)
        }
        else if (task === "translate layer") {
            this.layerspageRef.current.translateLayer(id, extraParams.dx, extraParams.dy)
        }
        else if (task === "update layer transformations") {
            this.layerspageRef.current.setLayerTransformations(
                id,
                extraParams.baseTranslate, extraParams.baseScale, extraParams.parallaxTranslate, extraParams.parallaxScale
            );
        }
    }

    toggleParallax(bool) {
        this.setState({ parallaxOn: bool }, () => {
            if (!this.state.parallaxOn) {
                this.layerspageRef.current.resetParallax()
                this.sketchpageRef.current.resetParallax();
            } else {
                
                this.layerspageRef.current.resetParallax()
                this.sketchpageRef.current.startParallax();
            }
        })
    }

    updateMaxDepth(newMaxDepth, imported=false) {
        if (imported) {
            if (newMaxDepth > this.state.maxDepth) {
                this.setState({maxDepth: newMaxDepth})
            }
        }
        else {
            this.setState({maxDepth: newMaxDepth})
        }
    }

    sendLog(interaction) {
        // let msg = this.state.username + '+' + interaction
        // let time = new Date().toISOString()
        // let logMsg = time + "+" + msg
        // let date = time.split("T")[0]
        // base.push(`logs/${date}/${this.state.username}`, {
        //     data: logMsg,
        //     then(err){
        //       if(err){
        //         console.log("Could not add log.")
        //       }
        //     }
        // })
        // new Image().src = 'https://sketchy.cs.brown.edu/textures?data=' + msg + '&...'
    }

    render() {
        return (
            <div id="homepage-root">
                <div className="homepage-flex">
                    {/* <div className="filter-column flex-parent-column">
                        <FilterPage
                            changeFilterID={this.changeFilterID}
                            changeSelectedFilter={this.changeSelectedFilter}
                            selectedFilter={this.state.selectedFilter}
                            list={this.state.list}
                            cropToggle={this.state.cropToggle}
                            toggleCrop={this.toggleCrop}
                            removeFilterSet={this.removeFromList}
                            clearList={this.clearList}
                            addFilterSet={this.addFilterSet}
                            updateFilterCode={this.updateFilterCode}
                            addFilterToSet={this.addFilterToSet}
                            removeFilterFromSet={this.removeFilterFromSet}
                            updateFilterAnimation={this.updateFilterAnimation}
                            sendLog={this.sendLog}
                            refreshFilter={this.refreshFilter}
                            openEditDialogAtIndex={this.openEditDialogAtIndex}
                            editDialogOpenIndex={this.state.editDialogOpenIndex}
                            moveFilterPrimitivesToEnd={this.moveFilterPrimitivesToEnd}
                            toggleFilterVisibility={this.toggleFilterVisibility}
                            toggleAllFilterVisibility={this.toggleAllFilterVisibility}
                            allFilterIsVisible={this.state.allFilterIsVisible}

                            patternSVGReferences={this.patternSVGReferences}
                            patternSVGPathReferences={this.patternSVGPathReferences}
                            patternSVGAnimators={this.patternSVGAnimators}
                            patternHandlers={this.patternHandlers}
                            maxDepth={this.state.maxDepth}/>
                        <CodePage
                            currStrokeCode={this.state.currStrokeCode}
                            updateStrokeCode={this.updateStrokeCode}
                            updateSliderVal={this.updateSliderVal}
                            verifyStrokeCode={this.verifyStrokeCode}
                            sliderVisible={this.state.sliderVisible} />
                    </div> */}
                    <div className='sketch-column'>
                        <SketchPage ref={this.sketchpageRef}
                            layerspageRef={this.layerspageRef}
                            username={this.state.username}
                            uid={this.state.uid}
                            currStrokeCode={this.state.currStrokeCode}
                            updateStrokeCode={this.updateStrokeCode}
                            codeToSVGButtonClicked={this.state.codeToSVGButtonClicked}
                            selectedFilter={this.state.selectedFilter}
                            list={this.state.list}
                            updateFilterColor={this.updateFilterColor}
                            addToListFromDOM={this.addToListFromDOM}
                            changeSelectedFilter={this.changeSelectedFilter}
                            sendLog={this.sendLog}
                            updateSVGString={this.updateSVGString}
                            cropToggle={this.state.cropToggle}
                            clearList={this.clearList}
                            filterVisibilities={this.filterVisibilities}
                            patternSVGReferences={this.patternSVGReferences}
                            patternSVGPathReferences={this.patternSVGPathReferences}
                            gradientDialogOpenIndex={this.state.gradientDialogOpenIndex}
                            converterDialogOpenIndex={this.state.converterDialogOpenIndex}
                            paletteDialogOpenIndex={this.state.paletteDialogOpenIndex}
                            openPaletteDialogAtIndex={this.openPaletteDialogAtIndex}
                            openGradientDialogAtIndex={this.openGradientDialogAtIndex}
                            openConverterDialogAtIndex={this.openConverterDialogAtIndex}
                            toggleAllFilterVisibility={this.toggleAllFilterVisibility}
                            layerpageHelper={this.layerpageHelper}
                            parallaxOn={this.state.parallaxOn}
                            maxDepth={this.state.maxDepth}/>
                    </div>
                    <div className='layer-column'>
                        <LayersPage ref={this.layerspageRef}
                            sketchpageRef={this.sketchpageRef}
                            filters={this.state.list}
                            parallaxOn={this.state.parallaxOn}
                            toggleParallax={this.toggleParallax}
                            updateMaxDepth={this.updateMaxDepth}/>
                    </div>
                </div>
                <div className="cursor"></div>
                <Dialog
                    open={this.state.startupModalOpen}
                    onClose={() => this.setState({ startupModalOpen: false })}
                    aria-labelledby="homepage-popup">
                    <DialogContent>
                        <div className='flex-left'>
                            <div className='spin'>🎨</div>
                            <b><span id="popup-header"><span className='cursive-font'>filtered.ink</span>, a live visual editor for SVG filters</span></b>
                        </div>
                        <div id="popup-text">
                            It's time for a new way to illustrate the web.
                        </div><div id="popup-text">
                            Pixels have reigned over online images. gif, jpeg, png, webp, heic, avif.
                        </div><div id="popup-text">
                            But we don't think in pixels. We dream of lines, curves, corners. And we give them personality. This line is like a gentle pencil stroke. This curve, it's moving like flowing water. And the corner, reflects light at its blade.
                        </div><div id="popup-text">
                            These dynamic lines, curves, and corners are actually possible today with SVG files. Textures, animations, and lighting are represented by SVG Filters, or "shaders" in computer graphics. Filters are typically computer code, written in advance. But what if you could design them visually, remix filters made by others, and see them as you draw?
                        </div><div id="popup-text">
                            <b>Introducing <em>filtered.ink</em>, a real-time visual editor for SVG filters.</b>
                        </div><div id="popup-text">
                            <b>Design, remix, and draw with filters to create dynamic and animated images for the web.</b>
                        </div><div id="popup-text">
                            Flash is dead. Long live SVG, filtered.
                        </div>
                    </DialogContent>
                    <DialogActions>
                        {/* <Button onClick={() => this.setState({ startupModalOpen: false, helpModalOpen: true })}> */}
                        <Button onClick={() => {}}>
                            <Link to='/about'><span>Learn More</span></Link>
                        </Button>
                        <Button onClick={() => this.setState({ startupModalOpen: false })} color="primary" autoFocus>
                            Begin
                        </Button>
                    </DialogActions>
                </Dialog>
                <Dialog
                    open={this.state.helpModalOpen}
                    onClose={() => this.setState({ helpModalOpen: false })}
                    aria-labelledby="help-popup">
                    <DialogContent>
                        <div className='flex-left'>
                            <div className='spin'>🎨</div>
                            <b><span id="popup-header">How <span className='cursive-font'>filtered.ink</span> works</span></b>
                        </div>
                        <div id="popup-text">
                            filtered.ink is for making <i>vector-based</i> illustrations that can be scaled to any resolution. You can start with a template and a couple of filters for your ink, but feel free to clear the canvas to get a blank slate (the template comes back whenever you refresh while the list of active filters is empty).
                        </div><div id="popup-text">
                            Your tools are shown at the top, starting with your two ink tools, Ink and Fill, followed by tools that let you change or move the existing ink. Next to those are options for changing the size, color, and opacity of your ink tool. And finally, actions that apply to the illustration.
                        </div><div id="popup-text">
                            The download (<GetAppIcon style={{ height: 20 }} />) and import (<AddPhotoAlternateIcon style={{ height: 20 }} />) buttons let you save and remix illustrations (notice the imports must be in SVG format). If you don't know where to start, try taking a look at the <Link to='/gallery'>gallery</Link> and remixing from there!
                        </div><div id="popup-text">
                            Interactions on the site are captured and used anonymously for studies.
                        </div><div id="popup-text">
                            <b>Understanding Filters</b>
                        </div><div id="popup-text">
                            Filters transform the ink in unique ways, by changing the colors or distorting the ink, or any combination. The ways it transforms the ink can usually be animated, to express motion or personality. Filters are comprised of primitives that each do one type of transformation, but the primitives can be connected together in a flow diagram, so that multiple primitives can transform the ink.
                        </div><div id="popup-text">
                            Start with a blank filter by pressing the plus button near the top left, or use a preset filter made by someone else. You can edit the filters at any time, and remixing lets you build a new filter from an existing filter. When you select a filter by choosing one from the left, it becomes active and will apply the next time you use the Ink or Fill tools.
                        </div><div id="popup-text">
                            If you create a cool filter you would like to share with others, save it to the list of presets (but please no duplicates). If you find any bugs, wish to request a feature, or want your illustration displayed in the gallery, feel free to email tongyu_zhou@brown.edu.
                        </div><div id="popup-text">
                            Happy inking! 🖌️
                        </div>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => this.setState({ helpModalOpen: false })}>
                            Okay
                        </Button>
                    </DialogActions>
                </Dialog>
            </div>
        )
    }
}
