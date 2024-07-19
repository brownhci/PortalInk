/** A collection of path. Keeps track of a undo and redo buffer. */
import Path from './path'
import SketchObject from './sketchobject'
import SVG from 'svg.js'
import { pathDataToPolys } from "svg-path-to-polygons"

import { SpringStabilizer } from '../stabilizers/springstabilizer'
import { NoneStabilizer } from '../stabilizers/nonestabilizer'
import { chunkArrayIntoPairs, makeid, pointInsidePolygon } from '../util'
import { mat_apply, mat_scale, mat_translate, mat_compose, mat_identity } from '../../util/matrix'

let getVecLen = (v) => {
  let len = Math.sqrt(v[0] ** 2 + v[1] ** 2);
  return len;
}

let movingAverage = (array, window) => {
  if(array.length < window) {
    return array.reduce((a, b) => a + b) / array.length;
  } else {
    return array.slice(-window).reduce((a, b) => a + b) / window;
  }
}

export default class Sketch {
  /**
   * @param {object} draw - the SVG draw object
   * @param {object} svg - the svg element
   */
  constructor(draw, svg, sketchPage) {
    // this.paths = []
    this.clearedSketches = [[]] // Stores current sketch and all cleared sketches for undoing and redoing clears.
    this.sketchGroup = draw.group()
    this.sketchGroup.node.setAttribute("id", "sketchGroup")
    this.draw = draw

    let svgNS = "http://www.w3.org/2000/svg";
    let xlinkNS = "http://www.w3.org/1999/xlink";

    let imgElement = document.createElementNS(svgNS, 'image');

    imgElement.setAttributeNS(xlinkNS, 'href', '');
    imgElement.setAttribute("id", "portal-preview-transition");
    imgElement.setAttribute("alt", "transition preview for waypoint portal");
    imgElement.setAttribute("style", "x: 0px; y: 0px; width: 1px; height: 1px; display: none;");

    this.draw.node.appendChild(imgElement);

    this.currentPath = null
    this.undoIndex = 0
    this.clearUndoIndex = 0
    this.svg = svg
    this.prevMouseLocation = null
    this.currMouseLocation = null
    this.beganHighlighting = false
    this.currStrokeID = 1
    this.currStrokeFilterID = ""

    this.originalWidth = this.getWidth()
    this.originalHeight = this.getHeight()
    this.animationfinished = true

    // stabilizer variables
    // we use skip over distance for performance, may switch over once optimized
    this.stabilizerParams = {};
    this.stabilizerOptimized = new SpringStabilizer(0.4, 0.4);
    this.noStabilizerOptimized = new NoneStabilizer();
    this.previousPoint = [0,0];
    this.currentPressures = [];
    this.sketchPageRef = sketchPage;

    // potrace variables
    this.svgRef = document.getElementById('main-canvas');
    this.bufferCanvas = document.createElement('canvas');
    this.bufferCanvas.width = this.svgRef.getAttribute('width');
    this.bufferCanvas.height = this.svgRef.getAttribute('height');
    this.bctx = this.bufferCanvas.getContext('2d');
    this.webworkersSupported = typeof(Worker) !== "undefined";
    if(this.webworkersSupported){
      this.backgroundWorker = new Worker(new URL('../stabilizers/potrace-worker.js', import.meta.url))
      this.scheduler = {
        worker: this.backgroundWorker,
        pathRefs: new Map(),
        callbacks: new Map(),
      }
      this.backgroundWorker.onmessage = (message) => {
        if(!message) {
          console.log("Web worker error");
          return;
        }
        
        const id = message.data.id;
        if(this.scheduler.pathRefs.has(id) && this.scheduler.callbacks.has(id)){
          const curCallback = this.scheduler.callbacks.get(id);
          this.scheduler.pathRefs.delete(id);
          this.scheduler.callbacks.delete(id);
          curCallback(message.data);
        }
      };
    } else {
      this.backgroundWorker = undefined;
      this.scheduler = undefined;
    }
    
    this.currentLayer = this.sketchGroup.group()
    this.currentLayer.node.setAttribute("id", "layer1")

    this.startingTranslate = [0, 0]; // for calculating change between layers
    this.currentLayerTransformation = mat_identity(); // for calculating pen shift

    this.updateDimensions()
  }

  // from stabilizer name return corresponding stabilizer function
  getCorrespondingStabilizer(){
    switch(this.stabilizerParams.selectedStabilizer){
      case 'none':
        return this.noStabilizerOptimized;

      case 'spring':
        // let expRamp = (v, k) => (Math.exp(k * v) - 1) / (Math.exp(k) - 1);
        this.stabilizerOptimized.springConst = (1 - this.stabilizerParams.smoothing / 2) - 0.25;
        this.stabilizerOptimized.dampening = 0.4;
        return this.stabilizerOptimized;
        
      default:
        return;
    }
  }

  getSketchObjs() {
    return this.clearedSketches[this.clearedSketches.length - this.clearUndoIndex - 1]
  }

  setSketchObjs(newSketchObjs) {
    this.clearedSketches[this.clearedSketches.length - this.clearUndoIndex - 1] = newSketchObjs
  }

  updateSketchObjs(sketchObjs, newSketchObjs) {
    sketchObjs.push(newSketchObjs)
    this.setSketchObjs(sketchObjs)
    this.clearedSketches = this.clearedSketches.slice(0, this.clearedSketches.length - this.clearUndoIndex)
    this.undoIndex = 0
    this.clearUndoIndex = 0
  }

  getWidth() {
    let sketchpad = document.getElementById('main-canvas')
    if (sketchpad !== null) {
      return sketchpad.clientWidth
    }
    return this.svg.clientWidth
  }

  getHeight() {
    let sketchpad = document.getElementById('main-canvas')
    if (sketchpad !== null) {
      return sketchpad.clientHeight
    }
    return this.svg.clientHeight
  }

  addZero(x, n) {
    while (x.toString().length < n) {
      x = "0" + x;
    }
    return x;
  }

  getTime() {
    return Date.now()
  }

  /**
   * Serialize a path into an array of objects
   * @return {Array}
   */
  serialize() {
    let serialized = []
    let sketchObjs = this.getSketchObjs()
    for (let i = 0; i < sketchObjs.length - this.undoIndex; i++) {
      if (sketchObjs[i].isPath()) {
        serialized.push(sketchObjs[i].obj.serialize())
      }
    }
    return serialized
  }

  /**
   * Loads in a serialized sketch.
   * @param {Object} serializedSketch
   */
  loadSketch(serializedSketch) {
    this.remove()
    this.setSketchObjs([])
    for (let serializedPath of serializedSketch) {
      if (serializedPath.logging.status === 1) {
        let path = Path.deserialize(serializedPath, this.draw)
        if (path !== null ) {
          path.hasprettyStroke = false
          let newSketchObj = new SketchObject(path, "path")
          this.getSketchObjs().push(newSketchObj)
        }
      }
    }
  }

  /**
   * Reset the origin to the center of image and scale sketch to fit screen, assuming it fit in original width and
   * height.
   */
  updateDimensions() {
    // let xScaleFactor = (this.getWidth() / this.originalWidth)
    // let yScaleFactor = (this.getHeight() / this.originalHeight)

    this.updateOrigin()
    this.bufferCanvas.width = this.getWidth();
    this.bufferCanvas.height = this.getHeight();
    // let scaleFactor = Math.min(xScaleFactor, yScaleFactor)

    // this.sketchGroup.transform({
    //   scale: scaleFactor,
    //   cx: 0,
    //   cy: 0,
    // })
  }

  updateOrigin() {
    this.sketchGroup.transform({
      scale: 1,
    })
    this.sketchGroup.transform({
      x: this.getWidth() / 2,
      y: this.getHeight() / 2,
    })
  }

  /**
   * Undo an operation (erase, move, draw, clear)
   */
  undo(layerspageRef) {
    if (this.undoIndex < this.getSketchObjs().length) { // undo a sketch obj operation
      let sketchObj = this.getSketchObjs()[this.getSketchObjs().length - this.undoIndex - 1]
      sketchObj.undo(layerspageRef, this, this.sketchGroup)
      this.undoIndex += 1
    } else if (this.clearUndoIndex < this.clearedSketches.length - 1) { // Undoing a canvas clear
      this.undoIndex = 0
      this.clearUndoIndex += 1
      for (let sketchObj of this.getSketchObjs()) {
        if (sketchObj.isPath() && sketchObj.obj.logging.rendered) {
          sketchObj.obj.addToGroup(sketchObj.obj.layer)
          if (sketchObj.obj.gradientCollection) sketchObj.obj.layer.add(sketchObj.obj.gradientCollection)
        }
      }
    } else {
      return false
    }
    return true
  }

  /**
   * Redo an operation (erase, move, draw, clear)
   */
  redo(layerspageRef) {
    if (this.undoIndex > 0) {
      let sketchObj = this.getSketchObjs()[this.getSketchObjs().length - this.undoIndex]
      sketchObj.redo(layerspageRef, this, this.sketchGroup)
      this.undoIndex -= 1
    } else if (this.clearUndoIndex > 0) { //redo clear
      this.remove()
      this.clearUndoIndex -= 1
      this.undoIndex = this.getSketchObjs().length
    } else {
      return false
    }
    return true
  }

  /**
   * Clears all strokes
   */
  clear() {
    if (this.getSketchObjs().length === 0) {
      return false
    }
    this.setSketchObjs(this.getSketchObjs().slice(0, this.getSketchObjs().length - this.undoIndex))
    this.clearedSketches = this.clearedSketches.slice(0, this.clearedSketches.length - this.clearUndoIndex)
    this.clearUndoIndex = 0
    this.undoIndex = 0
    this.remove()
    this.clearedSketches.push([])
    this.currentLayer = this.sketchGroup.group()
    this.currentLayer.node.setAttribute("id", "layer1")
    return true
  }

  /**
   * Visually removes the sketch group
   */
  remove() {
    this.sketchGroup.remove()
    this.sketchGroup = this.draw.group()
    this.sketchGroup.node.setAttribute("id", "sketchGroup")
    const imageElement = document.getElementById("portal-preview-transition");
    this.svgRef.insertBefore(imageElement, this.sketchGroup.node.nextSibling);
    this.updateDimensions()
  }

  /**
   * Erases a stroke by making a copy of the stroke and hiding both
   */
  erase(mouseX, mouseY) {
    let selected = this.select(mouseX, mouseY)
    if (typeof selected !== 'undefined') {
      let sketchObjs = selected[0]
      let targetPath = selected[1]
      let portalID = targetPath.svgPath.node.id
      let waypointID = targetPath.svgPath.node.getAttribute("waypointID")
      if (waypointID) {
        this.sketchPageRef.removeFromDepthToTeleportationMap([portalID], false)
        this.sketchPageRef.waypointRef.current.removePortalID(waypointID, portalID)
        this.removePortalPreview(targetPath.layer.node, portalID)
      }
      targetPath.remove(2)
      let newSketchObj = new SketchObject(targetPath, "path")
      this.updateSketchObjs(sketchObjs, newSketchObj)
      return true
    }
    return false
  }

  clone(targetPath) {
    targetPath.highlight()
    targetPath.previousPolyline = targetPath.svgPath.previous()

    let newTargetPath
    newTargetPath = Path.deserialize(targetPath.serialize(), this.draw, this)
    // note: gradientCollection is added onto newTarget path within deseralize
    newTargetPath.movedFrom = targetPath
    newTargetPath.previousPolyline = targetPath.previousPolyline
    newTargetPath.addToGroup(targetPath.layer)
    if (targetPath.previousPolyline === undefined) {
      newTargetPath.svgPath.back()
    }
    else {
      targetPath.previousPolyline.after(newTargetPath.svgPath)
    }

    targetPath.remove()

    return newTargetPath
  }

  changeFilter(mouseX, mouseY, newFilterID) {
    let selected = this.select(mouseX, mouseY)
    if (typeof selected !== 'undefined') {
      let sketchObjs = selected[0]
      let newTargetPath = this.clone(selected[1])
      newTargetPath.changeFilter(newFilterID)

      let newSketchObj = new SketchObject(newTargetPath, "path")
      this.updateSketchObjs(sketchObjs, newSketchObj)

      return true
    }
    else {
      return false
    }
  }

  /**
   * Colors a stroke by making a copy of the stroke, changing color of copy and hiding previous stroke
   */
  color(mouseX, mouseY, color) {
    let selected = this.select(mouseX, mouseY)
    if (typeof selected !== 'undefined') {
      let sketchObjs = selected[0]
      let newTargetPath = this.clone(selected[1]);

      newTargetPath.setColor(color)
      let newSketchObj = new SketchObject(newTargetPath, "path")
      this.updateSketchObjs(sketchObjs, newSketchObj)

      return true
    }
    return false
  }

  pickColor(mouseX, mouseY) {
    let selected = this.select(mouseX, mouseY) 
    if (typeof selected !== 'undefined') {
      let targetPath = selected[1]
      this.currentPath = targetPath
      return targetPath.params.color
    }
    else {
      return false
    }
  }

  moveToBack(mouseX, mouseY) {
    let selected = this.select(mouseX, mouseY) 
    if (typeof selected !== 'undefined') {
      let sketchObjs = selected[0]
      let newTargetPath = this.clone(selected[1])
      newTargetPath.svgPath.back()

      // need to move the gradient objects relative too
      if(newTargetPath.gradientCollection){
        let layerID = newTargetPath.layer.node.id
        const allChildren = document.getElementById(layerID).children;
        const targetId = newTargetPath.svgPath.node.id;
        let orderIndex = -1;
        for(let i = 0; i < allChildren.length; i++){
          if(targetId === allChildren[i].id) orderIndex = i + 1;
        }

        newTargetPath.gradientCollection.remove();
        newTargetPath.layer.add(newTargetPath.gradientCollection, orderIndex);
      }

      newTargetPath.previousPolyline = newTargetPath.svgPath.previous()

      let newSketchObj = new SketchObject(newTargetPath, "path")
      this.updateSketchObjs(sketchObjs, newSketchObj)
      return true
    }
    else {
      return false
    }
  }

  moveToFront(mouseX, mouseY) {
    let selected = this.select(mouseX, mouseY) 
    if (typeof selected !== 'undefined') {
      let sketchObjs = selected[0]
      let newTargetPath = this.clone(selected[1])
      newTargetPath.svgPath.front()

      // need to move the gradient objects relative too
      if(newTargetPath.gradientCollection){
        let layerID = newTargetPath.layer.node.id
        const allChildren = document.getElementById(layerID).children;
        const targetId = newTargetPath.svgPath.node.id;
        let orderIndex = -1;
        for(let i = 0; i < allChildren.length; i++){
          if(targetId === allChildren[i].id) orderIndex = i + 1;
        }

        newTargetPath.gradientCollection.remove();
        newTargetPath.layer.add(newTargetPath.gradientCollection, orderIndex);
      }


      newTargetPath.previousPolyline = newTargetPath.svgPath.previous()
      let newSketchObj = new SketchObject(newTargetPath, "path")
      this.updateSketchObjs(sketchObjs, newSketchObj)
      return true
    }
    else {
      return false
    }
  }

  /**
   * Selects the stroke closest to mouse position
   */
  select(clientX, clientY) {
    let sketchObjs = this.getSketchObjs()
    if (sketchObjs.length > 0) {
      let rect = this.svg.getBoundingClientRect()
      let transform = this.sketchGroup.transform()
      let viewbox = this.draw.viewbox()
      
      // transformation: S -> C
      // clientX, clientY is in screen space S
      // mouseX, mouseY in canvas space C
      const pSC = mat_compose(
        mat_scale(1 / transform.scaleX, 1 / transform.scaleY),                // scale by sketchgroup correction (is this always 1?)
        mat_translate(viewbox.x - transform.x, viewbox.y - transform.y),      // translate to canvas offset (viewport origin) and add sketchgroup correction
        mat_scale(1 / viewbox.zoom),                                          // scale screen to canvas space
        mat_translate(-rect.left, -rect.top)                                  // move to screen origin
      );
      let [mouseX, mouseY] = mat_apply(pSC, [clientX, clientY]);

      if (Number.isNaN(mouseX) || Number.isNaN(mouseY)) return;

      sketchObjs = sketchObjs.slice(0, sketchObjs.length - this.undoIndex)
      let validSketchObjs = sketchObjs.filter(sketchObj => {
        if(!sketchObj.isPath()) return false;

        let path = sketchObj.obj;
        const layerVisible = path.layer.node.style.display !== 'none';
        const isRendered = path.logging.status === 1;

        const layerId = path.layer.node.id;
        const layerspageRef = this.sketchPageRef.props.layerspageRef.current;
        const layersIndex = layerspageRef.state.layers.findIndex((layer) => layer.name === layerId);
        const currentLayer = layerspageRef.state.layers[layersIndex];
        const layerTransf = currentLayer.transformations.getInverseMatrix();
        const newmouse = mat_apply(layerTransf, [mouseX, mouseY]);

        if(path.svgPath.type === 'path'){
          let winding = 0;
          for(let loop of path.pathCoords){
            const isInside = sketchObj.isPath() && pointInsidePolygon([
              newmouse[0] * path.params.filterResCorrection, 
              newmouse[1] * path.params.filterResCorrection
            ], chunkArrayIntoPairs(loop));
            if(isInside) winding += 1;
          }

          return winding % 2 === 1 && layerVisible && isRendered;
        } 
        
        // is polyline
        else {
          const isInside = sketchObj.isPath() && pointInsidePolygon([
            newmouse[0] * path.params.filterResCorrection, 
            newmouse[1] * path.params.filterResCorrection
          ], chunkArrayIntoPairs(path.coords));
          return isInside && layerVisible && isRendered;
        }
      });
      if(validSketchObjs.length === 0) return;

      const layerContainer = document.getElementById('sketchGroup');
      let orders = validSketchObjs.map(path => {
        const node = path.obj.svgPath.node;
        const layer = path.obj.layer.node;

        const nodeIndex = Array.from(layer.children).indexOf(node);
        const layerIndex = Array.from(layerContainer.children).indexOf(layer);
        return [layerIndex, nodeIndex];
      });
      let indexedOrder = orders.map((order, i) => [i, order]);
      indexedOrder.sort((a, b) => a[1][0] - b[1][0] || a[1][1] - b[1][1]);
      const pathOnTopIndex = indexedOrder[indexedOrder.length - 1][0]
      const pathOnTop = validSketchObjs[pathOnTopIndex].obj;

      return [sketchObjs, pathOnTop];
    }
  }

  /**
   * Given a list of stroke coords, find the minimum distance between any point in the list and mouse position
   */
  getClosestDistanceDrawnSVG(coords, mouseX, mouseY) {
    var distances = []
    for (let i = 0; i < coords.length; i+=2) {
      let x = coords[i] - mouseX
      let y = coords[i+1] - mouseY
      distances.push(Math.sqrt(x*x + y*y))
    }
    return Math.min.apply(null, distances)
  }

  getClosestDistanceImportedSVG(boundingRect, mouseX, mouseY) {
    var distances = []
    for (let width = 0; width < boundingRect.width; width++) {
      for (let height = 0; height < boundingRect.height; height++) {
        let x = boundingRect.x + width - mouseX
        let y = boundingRect.y + height - mouseY
        distances.push(Math.sqrt(x*x + y*y))
      }
    }
    return Math.min.apply(null, distances)
  }

  /**
   * Starts moving the stroke closest to mouse position by 
   * - Making a copy of the stroke
   * - Hiding the original stroke
   * - Setting the copied stroke as the one targetted for moving
   */
  startMove(event) {
    if (event.type.startsWith('touch')) {
      event = event.changedTouches[0]
    }
    let selected = this.select(event.clientX, event.clientY)
    if (typeof selected !== 'undefined') {
      let rect = this.svg.getBoundingClientRect()
      let transform = this.sketchGroup.transform()
      let viewbox = this.draw.viewbox()

      let layerpage = this.sketchPageRef.props.layerspageRef.current;
      let currentLayer = layerpage.state.layers[layerpage.state.selectedIndex];
      this.currentLayerTransformation = currentLayer.transformations.getInverseMatrix();

      let mouseX = ((event.clientX - rect.left) / viewbox.zoom + viewbox.x - transform.x) / transform.scaleX
      let mouseY = ((event.clientY - rect.top) / viewbox.zoom + viewbox.y - transform.y) / transform.scaleY
      const newmouse = mat_apply(this.currentLayerTransformation, [mouseX, mouseY]);
      [mouseX, mouseY] = newmouse;
      this.prevMouseLocation = [mouseX * selected[1].params.filterResCorrection, mouseY * selected[1].params.filterResCorrection]
      this.currMouseLocation = [mouseX * selected[1].params.filterResCorrection, mouseY * selected[1].params.filterResCorrection]
      
      // makes (unrendered) copy of target path for future undo and adds to stack 
      let sketchObjs = selected[0]
      let targetPath = selected[1]
      targetPath.previousPolyline = targetPath.svgPath.previous()
      let newTargetPath = Path.deserialize(targetPath.serialize(), this.draw, this)
      newTargetPath.logging.timeStart = this.getTime()
      newTargetPath.logging.idStroke = this.currStrokeID
      newTargetPath.logging.created = 2
      newTargetPath.logging.idMovedFrom = targetPath.logging.idStroke
      newTargetPath.movedFrom = targetPath
      newTargetPath.previousPolyline = targetPath.previousPolyline
      newTargetPath.addToGroup(newTargetPath.layer)
      if (targetPath.previousPolyline === undefined) {
        newTargetPath.svgPath.back()
      }
      else {
        targetPath.previousPolyline.after(newTargetPath.svgPath)
      }
      // if moved path is a portal, temporarily remove portal preview
      let waypointID = targetPath.svgPath.node.getAttribute("waypointID")
      if (waypointID) {
        let portalID = targetPath.svgPath.node.id
        this.sketchPageRef.removeFromDepthToTeleportationMap([portalID], false)
        this.sketchPageRef.waypointRef.current.removePortalID(waypointID, portalID)
        this.removePortalPreview(targetPath.layer.node, portalID)
      }

      targetPath.remove(3)
      this.currStrokeID += 1
      newTargetPath.highlight(0.2)
      newTargetPath.gradientCollection?.opacity(0.2);

      let newSketchObj = new SketchObject(newTargetPath, "path")
      this.updateSketchObjs(sketchObjs, newSketchObj)
      this.currentPath = newTargetPath

      this.sketchPageRef.props.layerspageRef.current.layerClicked(-1, newTargetPath.layer.node.id)
      return true
    }
    return false
  }

  startTranslateLayer(event){
    // console.log("Start layer move");

    let rect = this.svg.getBoundingClientRect()
    let transform = this.sketchGroup.transform()
    let viewbox = this.draw.viewbox()
    let mouseX = ((event.clientX - rect.left) / viewbox.zoom + viewbox.x - transform.x) / transform.scaleX
    let mouseY = ((event.clientY - rect.top) / viewbox.zoom + viewbox.y - transform.y) / transform.scaleY
    
    this.prevMouseLocation = [mouseX, mouseY];
    this.currMouseLocation = [mouseX, mouseY];

    let layerpage = this.sketchPageRef.props.layerspageRef.current;
    let currentLayer = layerpage.state.layers[layerpage.state.selectedIndex];
    this.startingTranslate = currentLayer.transformations.baseTranslate;
    
    return true;
  }

  // same code as startTranslateLayer
  startScaleLayer(event){
    let rect = this.svg.getBoundingClientRect()
    let transform = this.sketchGroup.transform()
    let viewbox = this.draw.viewbox()
    let mouseX = ((event.clientX - rect.left) / viewbox.zoom + viewbox.x - transform.x) / transform.scaleX
    let mouseY = ((event.clientY - rect.top) / viewbox.zoom + viewbox.y - transform.y) / transform.scaleY
    
    this.prevMouseLocation = [mouseX, mouseY];
    this.currMouseLocation = [mouseX, mouseY];

    let layerpage = this.sketchPageRef.props.layerspageRef.current;
    let currentLayer = layerpage.state.layers[layerpage.state.selectedIndex];
    this.startingTranslate = currentLayer.transformations.baseTranslate;
    
    return true;
  }

  endMove() {
    this.currentPath.highlight()
    const currentPathFilter = this.currentPath.params.filterID;
    if(currentPathFilter) this.currentPath.updateFilterVisibility(currentPathFilter, this.currentPath.params.filterIsVisible);
    
    // if done moving portal, add back portal preview
    let waypointID = this.currentPath.svgPath.node.getAttribute("waypointID")
    let portalID = this.currentPath.svgPath.node.id
    if (waypointID) {
      let depth = this.currentPath.layer.node.getAttribute("depth")
      depth = depth ? depth : 1
      this.sketchPageRef.addToDepthToTeleportationMap(depth, portalID, waypointID)
      this.sketchPageRef.waypointRef.current.addPortalID(waypointID, portalID)
      let svgPathSplitByM = this.currentPath.svgPath.node.getAttribute("d").split("M")
      this.addPortalPreview(this.currentPath.layer.node, this.currentPath.svgPath.node, waypointID, svgPathSplitByM)
    }

    this.currentPath.logging.timeEnd = this.getTime()
    let saveData = this.prevMouseLocation.concat(this.currMouseLocation)
    this.currentPath.calculatePathCoords();
    this.currMouseLocation = null
    return saveData
  }

  endTranslateLayer(){
    let layerpage = this.sketchPageRef.props.layerspageRef.current;
    let currentLayer = layerpage.state.layers[layerpage.state.selectedIndex];
    let id = currentLayer.name;
    let layerSvgObj = document.getElementById(id).instance;

    let endingTranslate = currentLayer.transformations.baseTranslate;
    let relativeTranslate = endingTranslate.map((n, i) => n - this.startingTranslate[i]);
    
    let sketchObjs = this.getSketchObjs().slice(0, this.getSketchObjs().length - this.undoIndex)
    let newSketchObj = new SketchObject(
      layerSvgObj, "layer", "translate layer", 
      {
        relativeTranslate: relativeTranslate,
        layerName: id
      }
    ); 
    this.updateSketchObjs(sketchObjs, newSketchObj)
    this.currentLayer = layerSvgObj;
  }

  // almost same code as endScaleLayer
  endScaleLayer(){
    let layerpage = this.sketchPageRef.props.layerspageRef.current;
    let currentLayer = layerpage.state.layers[layerpage.state.selectedIndex];
    let id = currentLayer.name;
    let layerSvgObj = document.getElementById(id).instance;

    let endingTranslate = currentLayer.transformations.baseScale;
    let relativeTranslate = endingTranslate.map((n, i) => n - this.startingTranslate[i]);
    
    let sketchObjs = this.getSketchObjs().slice(0, this.getSketchObjs().length - this.undoIndex)
    let newSketchObj = new SketchObject(
      layerSvgObj, "layer", "scale layer", 
      {
        relativeTranslate: relativeTranslate,
        layerName: id
      }
    ); 
    this.updateSketchObjs(sketchObjs, newSketchObj)
    this.currentLayer = layerSvgObj;
  }

  hide() {
    this.sketchGroup.hide()
  }

  show() {
    this.sketchGroup.show()
  }

  /**
   * Depending on mode, adds a point onto the current or moves path
   * @param {object} event
   * @param {string} mode
   */
  continueLineWithEvent(event, mode, injectedFlag = false) {
    let rect = this.svg.getBoundingClientRect()
    let x
    let y
    let transform = this.sketchGroup.transform()
    let viewbox = this.draw.viewbox()
    // Transform coordinates on svg div to center origin coordinates of sketchGroup
    if (event.type.startsWith('touch')) {
      event = event.changedTouches[0]
    }

    // viewport space to svg space
    x = ((event.clientX - rect.left) / viewbox.zoom + viewbox.x - transform.x) / transform.scaleX
    y = ((event.clientY - rect.top) / viewbox.zoom + viewbox.y - transform.y) / transform.scaleY
    
    // fix: replace time variable with injection flag (corner correction)
    // time sampling unreliable so not needed for now, can replace w/ injection flag
    let t = injectedFlag ? 1 : 0;

    if (mode === 'draw') {
      let newXY = mat_apply(this.currentLayerTransformation, [x, y]); // layer transformation correction
      x = newXY[0];
      y = newXY[1];
      x *= viewbox.zoom
      y *= viewbox.zoom

      // TODO: scale the brush width by layer transformation scaling factor??
      // accounting for point rescaling to preserve filter resolution
      // moving average pressure to make it less noisy
      this.currentPressures.push(event.pressure);
      let p = movingAverage(this.currentPressures, this.stabilizerParams.selectedStabilizer === 'none' ? 50 : 60);
      if(isNaN(p)) p = 0.5;

      // with stylus, pointerEvents seem to fire much faster so to get rid of some noise
      // check if new point is some distance away before adding it to stroke
      if(this.stabilizerParams.selectedStabilizer === 'none'){
        if(getVecLen([x - this.previousPoint[0], y - this.previousPoint[1]]) < 2) {
          return;
        }
      }

      // stabilizer needs to set points instead
      let currentStabilizer = this.getCorrespondingStabilizer();
      currentStabilizer.continueStroke([x, y, t, p]);
      let stabilizedPoints = currentStabilizer.getStrokePoints();

      this.currentPath.setPoints(stabilizedPoints, this.stabilizerParams.selectedStabilizer);
      this.previousPoint = [x, y];
    }
    else if (mode === 'move') {
      if (this.currMouseLocation !== null) {
        let newXY = mat_apply(this.currentLayerTransformation, [x, y]);
        x = newXY[0];
        y = newXY[1];

        x *= this.currentPath.params.filterResCorrection
        y *= this.currentPath.params.filterResCorrection
        this.currentPath.moveBy(x - this.currMouseLocation[0], y - this.currMouseLocation[1], this)
        this.currMouseLocation = [x, y]
      }
    }
    else if (mode === 'translate layer') {
      if (this.currMouseLocation !== null){
        const dx = x - this.currMouseLocation[0];
        const dy = y - this.currMouseLocation[1];
        this.sketchPageRef.props.layerspageRef.current.translateLayer(null, dx, dy);
        this.currMouseLocation = [x, y]
      }
    }
    else if (mode === 'scale layer') {
      if (this.currMouseLocation !== null){
        const dx = x - this.currMouseLocation[0];
        // const dy = y - this.currMouseLocation[1];
        const ds = dx * 0.01;
        this.sketchPageRef.props.layerspageRef.current.translateLayer(null, dx, dx * viewbox.height / viewbox.width);
        this.sketchPageRef.props.layerspageRef.current.scaleLayer(null, ds);
        this.currMouseLocation = [x, y]
      }
    }
  }

  addPortalToWaypoint(mouseX, mouseY) {
    let selected = this.select(mouseX, mouseY) 
    if (typeof selected !== 'undefined') {
      let targetPath = selected[1]
      this.currentPath = targetPath
      if (!this.currentPath.params.waypointID) {
        let svgPathSplitByM = this.currentPath.svgPath.node.getAttribute("d").split("M")
        if (svgPathSplitByM.length === 3) {
          console.log("valid portal")
          let waypointID = this.sketchPageRef.waypointRef.current.getCurrentWaypointID()
          this.currentPath.params.isWaypointPortal = true
          this.currentPath.params.waypointID = waypointID
          this.currentPath.svgPath.attr('isWaypointPortal', 'yes')
          this.currentPath.svgPath.attr('waypointID', waypointID)
          this.currentPath.svgPath.attr('class', 'waypoint')
          this.currentPath.svgPath.attr('id', 'SvgjsPortal'+makeid(6))

          let depth = this.currentPath.layer.node.getAttribute("depth") ? this.currentLayer.node.getAttribute("depth") : 1
          let portalID = this.currentPath.svgPath.node.id
          this.sketchPageRef.addToDepthToTeleportationMap(depth, portalID, waypointID)
          this.sketchPageRef.waypointRef.current.addPortalID(waypointID, portalID)

          // add fill with preview
          this.addPortalPreview(this.currentPath.layer.node, this.currentPath.svgPath.node, waypointID, svgPathSplitByM)
          return true
        }
        else {
          console.log("invalid portal")
          return false
        }
      }
    }
    else {
      return false
    }
  }

  addPortalPreview(layerNode, svgPathNode, waypointID, svgPathSplitByM) {
    const svgns = "http://www.w3.org/2000/svg";
    const previewPath = document.createElementNS(svgns, "path");
    previewPath.setAttribute('id', svgPathNode.id + '-preview')
    previewPath.setAttribute('fill', `url(#${waypointID})`)
    previewPath.setAttribute('d', "M" + svgPathSplitByM[2])
    previewPath.setAttribute('waypointID', waypointID)
    previewPath.setAttribute('transform', svgPathNode.getAttribute('transform'))
    previewPath.setAttribute('potraced', 'yes')
    layerNode.appendChild(previewPath)
  }

  removePortalPreview(layerNode, portalID) {
    const portalPreview = document.getElementById(portalID + '-preview');
    layerNode.removeChild(portalPreview);
  }

  removePortalToWaypoint(mouseX, mouseY) {
    let selected = this.select(mouseX, mouseY) 
    if (typeof selected !== 'undefined') {
      let targetPath = selected[1]
      this.currentPath = targetPath

      if (this.currentPath.params.waypointID) {
        let portalID = this.currentPath.svgPath.node.id
        this.sketchPageRef.removeFromDepthToTeleportationMap([portalID])
        this.sketchPageRef.waypointRef.current.removePortalID(this.currentPath.params.waypointID, portalID)

        delete this.currentPath.params.isWaypointPortal
        delete this.currentPath.params.waypointID
        this.removePortalPreview(this.currentPath.layer.node, portalID)
      }
    }
    else {
      return false
    }
  }

  detachPortalID(portalID) {
    let path = document.getElementById(portalID)
    path.removeAttribute("waypointID")
    path.removeAttribute("isWaypointPortal")
    path.removeAttribute("class")
  }

  /**
   *
   * @param {string} color
   * @param {number} width
   */
  startPath(
    color, width, filterResCorrection, filterID, opacity, fill, userID, 
    filterIsVisible, filterReference, stabilizerParams, brushRadiusParams
  ) {
    let layerpage = this.sketchPageRef.props.layerspageRef.current;
    let currentLayer = layerpage.state.layers[layerpage.state.selectedIndex];
    this.currentLayerTransformation = currentLayer.transformations.getInverseMatrix();
    let currentLayerScaling = currentLayer.transformations.baseScale[0];

    let brushRadiusScale = (brushRadiusParams.employCorrection ? 1 / brushRadiusParams.depth : 1);
    let params = {
      color: color, width: width / currentLayerScaling * brushRadiusScale, 
      filterResCorrection: filterResCorrection, filterID: filterID, 
      opacity: opacity, fill: fill, filterIsVisible: filterIsVisible, 
      variableWidth: stabilizerParams.variableWidth, isImported: false, stops: []
    }
    let logging = {
      idCreator: userID, idStroke: this.currStrokeID, status: 1, idMovedFrom: 0, created: 1, timeStart: "", timeEnd: "", rendered: true, erased: false, movedFrom: null
    }
    this.currentPath = new Path(this.draw, [], this.currentLayer, params, logging)
    this.currStrokeID += 1
    this.currentPath.addToGroup(this.currentLayer)
    this.currentPath.logging.timeStart = this.getTime()
  
    this.stabilizerParams = stabilizerParams;
    this.getCorrespondingStabilizer().startStroke();
    this.stabilizerOptimized.startStroke();
  }

  /**
   * Adds the current path to the list of other paths.
   */
  finishPath(shouldPotrace = true, bounds = []) {
    this.currentPath.logging.timeEnd = this.getTime()
    
    let layerpage = this.sketchPageRef.props.layerspageRef.current;
    let currentLayer = layerpage.state.layers[layerpage.state.selectedIndex];
    const layerTransform = currentLayer.transformations.getMatrix();

    if(shouldPotrace) this.currentPath.potrace(
      this.bufferCanvas, this.bctx, this.sketchPageRef,
      this.backgroundWorker, this.scheduler, this.webworkersSupported,
      bounds, layerTransform
    );
    else this.currentPath.trimCoords()

    let sketchObj = new SketchObject(this.currentPath, "path")
    let sketchObjs = this.getSketchObjs().slice(0, this.getSketchObjs().length - this.undoIndex)
    this.updateSketchObjs(sketchObjs, sketchObj)
  }

  /**
   * Add new path based on JSON specifications
   * @param {*} json 
   */
  addPathFromCode(json) {
    let newTargetPath = Path.deserialize(json, this.draw)
    let sketchObjs = this.getSketchObjs().slice(0, this.getSketchObjs().length - this.undoIndex)
    let targetPath = this.currentPath
    newTargetPath.logging.idStroke = this.currStrokeID
    newTargetPath.logging.created = 2
    this.currStrokeID += 1
    newTargetPath.logging.idMovedFrom = targetPath.logging.idStroke
    newTargetPath.movedFrom = targetPath
    targetPath.remove(3)
    newTargetPath.addToGroupSmoothed(newTargetPath.layer) // necessary, otherwise copied path off position
    newTargetPath.logging.timeStart = this.getTime()
    let newSketchObj = new SketchObject(newTargetPath, "path")
    this.updateSketchObjs(sketchObjs, newSketchObj)
    this.currentPath = newTargetPath
  }

  /**
   * Converts time with format (hh:mm:ss:ms) into milliseconds
   * @param {string} time 
   */
  convertToMillisec(time){
    let l = time.split(":")
    return (parseInt(l[0]*3600000) + parseInt(l[1]*60000) + parseInt(l[2]*1000) + parseInt(l[3]))
  }

  processImportedStroke(strokeNode, userID, scale, dx, dy, sketchGroup, gradientIDs = []) {
    let oldSGTransformX = 0, oldSGTransformY = 0
    if (sketchGroup) {
      let sketchGroupTransform = sketchGroup.getAttribute("transform").split(",")
      oldSGTransformX = sketchGroupTransform[4]
      oldSGTransformY = sketchGroupTransform[5].slice(0, -1)
    }
    if (strokeNode.tagName === "path") {
      let id = strokeNode.getAttribute("id") ? strokeNode.getAttribute("id") : 'SvgjsPath' + makeid(6)
      strokeNode.setAttribute("id", id)
      if (id.includes("preview")) {
        this.currentLayer.node.appendChild(strokeNode)
        return
      }
      let d = strokeNode.getAttribute("d")
      if (d.includes("A") || d.includes("a") || d.includes("Q") || d.includes("q") || d.includes("d")){
        let pathLength = strokeNode.getTotalLength()
        let numPoints = 16
        let pathCoords = []
        for (let i = 0; i < numPoints; i++) {
          let p = strokeNode.getPointAtLength(i * pathLength / numPoints)
          pathCoords.push(Math.round((p.x - (dx - oldSGTransformX)) * scale))
          pathCoords.push(Math.round((p.y - (dy - oldSGTransformY)) * scale))
        }
        this.addImportedStroke(strokeNode, userID, scale, dx, dy, pathCoords, oldSGTransformX, oldSGTransformY, gradientIDs)
      }
      else {
        if(strokeNode.hasAttribute('potraced')){
          this.addImportedStroke(strokeNode, userID, scale, dx, dy, [-1, -1], oldSGTransformX, oldSGTransformY, gradientIDs)
        } else {
          let points = pathDataToPolys(d, {tolerance:1, decimals:1})
          for (let j = 0; j < points.length; j++) {
            let pathCoords = []
            for (let i = 0; i < points[j].length; i++) {
              pathCoords.push(Math.round((points[j][i][0] - (dx - oldSGTransformX)) * scale))
              pathCoords.push(Math.round((points[j][i][1] - (dy - oldSGTransformY)) * scale))
            }
            
            this.addImportedStroke(strokeNode, userID, scale, dx, dy, pathCoords, oldSGTransformX, oldSGTransformY, gradientIDs, true)
          }
        }
      }
    }
    else if (strokeNode.tagName === "text") {
      let id = strokeNode.getAttribute("id") ? strokeNode.getAttribute("id") : 'SvgjsText' + makeid(6)
      strokeNode.setAttribute("id", id)
      this.addImportedStroke(strokeNode, userID, scale, dx, dy, [], oldSGTransformX, oldSGTransformY, gradientIDs)
    }
    else {
      this.addImportedStroke(strokeNode, userID, scale, dx, dy, [], oldSGTransformX, oldSGTransformY, gradientIDs, true)
    }
  }

  addImportedStroke(strokeNode, userID, scale, dx, dy, pathCoords, oldSGTransformX=0, oldSGTransformY=0, gradientIDs, isPolyline = false) {
    let currTime = this.getTime()
    const isPotraced = strokeNode.hasAttribute('potraced');
    const isText = strokeNode.tagName === "text"
    const isWaypointPortal = strokeNode.hasAttribute('isWaypointPortal')
    const waypointID = strokeNode.getAttribute('waypointID') ? strokeNode.getAttribute('waypointID') : null
    let params = {
      strokeNode: strokeNode, scale: scale, dx: dx, dy: dy, oldSGTransformX: oldSGTransformX, oldSGTransformY: oldSGTransformY, newSGTransformX: this.sketchGroup.transform().x, newSGTransformY: this.sketchGroup.transform().y, isImported: true,
      isPath: isPotraced, isText: isText, potraced: isPotraced, pathRep: isPotraced ? strokeNode.getAttribute('d') : '', isWaypointPortal: isWaypointPortal, waypointID: waypointID
    }
    let logging = {
      idCreator: userID, idStroke: this.currStrokeID, status: 1, timeStart: currTime, timeEnd: currTime, rendered: true, created: 1, movedFrom: null, idMovedFrom: 0,
    }
    this.currentPath = new Path(this.draw, pathCoords, this.currentLayer, params, logging)
    if (this.currentPath.coords.length > 0 || this.currentPath.params.isText) {
      this.currStrokeID += 1
      this.currentPath.logging.timeEnd = this.getTime()
      this.currentPath.svgPath.attr('id', strokeNode.id)
      let sketchObjs = this.getSketchObjs().slice(0, this.getSketchObjs().length - this.undoIndex)
      let newSketchObj = new SketchObject(this.currentPath, "path")
      this.updateSketchObjs(sketchObjs, newSketchObj)
      this.currentPath.addToGroup(this.currentLayer)

      if (isWaypointPortal && waypointID) {
        let depth = this.currentLayer.node.getAttribute("depth") ? this.currentLayer.node.getAttribute("depth") : 1
        this.sketchPageRef.addToDepthToTeleportationMap(depth, this.currentPath.svgPath.node.getAttribute('id'), waypointID)
      }
    }

    let stops = []
    if (gradientIDs) {
      const gradientDOMObjs = gradientIDs.map(id => document.getElementById(id));
      stops = gradientDOMObjs.map(stopSVG => {
        const stopA = stopSVG.firstChild;

        // inverse of cx/cy calculation in importedstroke.js
        const isRadialGradient = stopSVG.nodeName === 'radialGradient';

        let ratioX, ratioY;
        if(isRadialGradient){
          ratioX = stopSVG.cx.baseVal.value;
          ratioY = stopSVG.cy.baseVal.value;
        }
        else {
          ratioX = stopSVG.x1.baseVal.value;
          ratioY = stopSVG.y1.baseVal.value;
        }

        // strength is either radialGradient default value or length of linearGradient vector
        let strengthVal;
        if(isRadialGradient){
          strengthVal = stopSVG.r.baseVal;
        } else {
          const x1 = ratioX;
          const y1 = ratioY;
          const x2 = stopSVG.x2.baseVal.value;
          const y2 = stopSVG.y2.baseVal.value;
          const strength = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2) * 2.5;

          const svgElement = document.createElementNS("http://www.w3.org/2000/svg", "svg");
          strengthVal = svgElement.createSVGLength();
          strengthVal.value = strength;
        }
        
        let rotation = 45;
        if(!isRadialGradient){
          const x1 = ratioX;
          const y1 = ratioY;
          const x2 = stopSVG.x2.baseVal.value;
          const y2 = stopSVG.y2.baseVal.value;
          rotation = 180 / Math.PI * Math.atan2(y2 - y1, x2 - x1);
          if(rotation < 0) rotation += 360;
        }

        return {
          type: isRadialGradient ? 0 : 1,
          x: ratioX,
          y: ratioY,
          direction: rotation, // BUG

          color: stopA.getAttribute('stop-color'),
          svgNode: stopSVG,
          colorNode: stopA,
          id: stopSVG.id,
          strength: strengthVal,

          domHandle: {},
          orderIcon: {}
        };
      });
    }

    if(stops.length > 0){
      this.currentPath.setGradientStops(stops, this);
    }

    if(isPolyline){
      if(!this.sketchPageRef.state.hasPolyline){
        this.sketchPageRef.setState({hasPolyline: true});
      }
    }
  }

  sequentialConvert(callback){
    let sketchObjs = this.getSketchObjs()
    let visibleSketchObjs = sketchObjs.filter(sketchObj => {
      let path = sketchObj.obj
      const layerVisible = sketchObj.isPath() && path.layer.node.style.display !== 'none';
      const isRendered = sketchObj.isPath() && path.logging.status === 1;
      return layerVisible && isRendered;
    });

    let polylines = visibleSketchObjs.filter(sketchObj => {
      return sketchObj.obj.svgPath.type === "polyline"
    });
    let totalNumStrokes = polylines.length;

    let i = 0;
    let dispatcher = setInterval(() => {
      i++;
      if(polylines.length <= 0){
        clearInterval(dispatcher);
        callback();
        return;
      }

      let curPolyline = polylines.pop().obj;

      const ps = curPolyline.coords;
      let smallExtent = [ps[0], ps[1]];
      let largeExtent = [ps[0], ps[1]];
      for(let i = 0; i < ps.length; i += 2){
        const p = [ps[i], ps[i + 1]];
        if(p[0] < smallExtent[0] && p[1] < smallExtent[1]){
          smallExtent = p;
        }

        if(p[0] > largeExtent[0] && p[1] > largeExtent[1]){
          largeExtent = p;
        }
      }

      // BUG: imported polyline might be in translated layer and break potrace w/o current layer offset???
      curPolyline = curPolyline.potrace(
        this.bufferCanvas, this.bctx, this.sketchPageRef,
        this.backgroundWorker, this.scheduler, this.webworkersSupported,
        [smallExtent, largeExtent],
      );
      
      this.sketchPageRef.setState({
        curConverterStroke: i,
        totalConverterStrokes: totalNumStrokes,
      });
    }, 300);
  }

  getBBoxOfZoomedStrokes(filterID) {
    let sketchObjs = this.getSketchObjs().slice(0, this.getSketchObjs().length - this.undoIndex)
    let bigBBox = new SVG.BBox()
    for (let i = 0; i < sketchObjs.length; i++) {
      if (sketchObjs[i].isPath() && sketchObjs[i].obj.filterID === filterID) {
        bigBBox = sketchObjs[i].obj.svgPath._array.bbox()
      }
    }
    return bigBBox
  }

  getFilterNames() {
    let sketchObjs = this.getSketchObjs().slice(0, this.getSketchObjs().length - this.undoIndex)
    let filterNames = new Set()
    for (let i = 0; i < sketchObjs.length; i++) {
      if (sketchObjs[i].isPath() && sketchObjs[i].obj.params.filterID) {
        filterNames.add(sketchObjs[i].obj.params.filterID)
      }
    }
    return filterNames
  }

  translateAllPaths(x, y) {
    let sketchObjs = this.getSketchObjs().slice(0, this.getSketchObjs().length - this.undoIndex)
    for (let i = 0; i < sketchObjs.length; i++) {
      if (sketchObjs[i].isPath()) {
        sketchObjs[i].obj.moveBy(x, y, this)
      }
    }
    this.setSketchObjs(sketchObjs)
  }

  updatePathFilterVisibilities(filterID, isVisible) {
    let sketchObjs = this.getSketchObjs()
    for (let i = 0; i < sketchObjs.length; i++) {
      if (sketchObjs[i].isPath()) {
        sketchObjs[i].obj.updateFilterVisibility(filterID, isVisible)
      }
    }
    this.setSketchObjs(sketchObjs)
  }

  addSVGGroup(id, depth, addAtIndex = false) { // create an svg layer
    this.currentLayer = this.sketchGroup.group()
    this.currentLayer.node.setAttribute("id", id)
    depth = depth ? depth : 1
    this.currentLayer.node.setAttribute("depth", depth)

    if (addAtIndex) {
      let parent = document.getElementById(id).parentElement
      const child1 = parent.children[parent.children.length - 1]
      const child2 = parent.children[addAtIndex]
      if (parent.children.length - 1 < addAtIndex) { // put after 
        parent.insertBefore(child1, child2.nextSibling);
      }
      else if (parent.children.length - 1 > addAtIndex) { // put before
        parent.insertBefore(child1, child2);
      }
      this.currentLayer = child1.instance
    }
    else {
      addAtIndex = this.sketchGroup.node.children.length - 1
    }

    let sketchObjs = this.getSketchObjs().slice(0, this.getSketchObjs().length - this.undoIndex)
    let newSketchObj = new SketchObject(this.currentLayer, "layer", "add layer", {"index" : addAtIndex})
    this.updateSketchObjs(sketchObjs, newSketchObj)
  }

  changeSVGGroup(id) {
    this.currentLayer = document.getElementById(id).instance
  }

  changeSVGGroupFilter(id, filterID, needsCloning=true, filterDOM=null) {
    let layer = document.getElementById(id)
    let currFilter = layer.querySelector("filter")
    if (currFilter) layer.removeChild(currFilter)
    if (filterID === "empty") {
      layer.removeAttribute("filter")
    }
    else {
      let layerFilterClone
      if (needsCloning) {
        let layerFilter = document.getElementById(`${filterID}-!layer`)
        layerFilterClone = layerFilter.cloneNode(true)
      }
      else {
        layerFilterClone = filterDOM
      }
      layerFilterClone.id = `${filterID}-!!layer`
      layer.appendChild(layerFilterClone)
      layer.setAttribute("filter", `url(#${filterID}-!!layer)`)
    }
  }

  changeSVGGroupName(oldID, newID) {
    let layer = document.getElementById(oldID)
    layer.setAttribute("id", newID)
    if (layer.getAttribute("onmouseover")) {
      layer.setAttribute("onmouseover", `$('${newID}___audio').play(); $('${newID}___audio').loop=true`)
      layer.setAttribute("onmouseout", `$('${newID}___audio').pause()`)
    }
  }

  reorderSVGGroup(id, oldIndex, newIndex, newDepth=null, createSketchObject=false) {
    let parent = document.getElementById(id).parentElement
    const child1 = parent.children[oldIndex]
    const child2 = parent.children[newIndex]
    if (oldIndex < newIndex) { // put after 
      parent.insertBefore(child1, child2.nextSibling);
    }
    else if (oldIndex > newIndex) { // put before
      parent.insertBefore(child1, child2);
    }
    this.currentLayer = child1.instance
    if (createSketchObject) {
      let sketchObjs = this.getSketchObjs().slice(0, this.getSketchObjs().length - this.undoIndex)
      let oldDepth = this.currentLayer.node.getAttribute("depth")
      let newSketchObj = new SketchObject(this.currentLayer, "layer", "reorder layer", {"oldIndex" : oldIndex, "newIndex": newIndex, "oldDepth": oldDepth, "newDepth": newDepth})
      this.updateSketchObjs(sketchObjs, newSketchObj)
    }
    if (newDepth) {
      this.currentLayer.node.setAttribute("depth", newDepth)
    }
  }

  changeSVGGroupOwnership(id, layer) {
    let sketchObjs = this.getSketchObjs().slice(0, this.getSketchObjs().length - this.undoIndex)
    for (let i = 0; i < sketchObjs.length; i++) {
      if (sketchObjs[i].isPath() && sketchObjs[i].obj.layer.node.id === id) {
        sketchObjs[i].obj.layer = layer
      }
    }
  }

  mergeSVGGroup(fromID, fromIndex, toIndex, createSketchObject=false) {
    let parent = document.getElementById(fromID).parentElement
    const fromChild = parent.children[fromIndex]
    const toChild = parent.children[toIndex]
    this.changeSVGGroupOwnership(fromID, toChild.instance)
    // merge DOM elements
    let fragment = document.createDocumentFragment()
    let fragmentLength = 0
    for (let i = 0; i < fromChild.children.length; i++) {
      const childElement = fromChild.children[i]
      fragment.appendChild(childElement)
      i--
      fragmentLength += 1
    }
    if (fromIndex > toIndex) { // merge down
      toChild.appendChild(fragment)
    }
    else { // merge up
      toChild.insertBefore(fragment, toChild.children[0])
    }
    fromChild.instance.remove()
    this.currentLayer = toChild.instance

    if (createSketchObject) {
      let sketchObjs = this.getSketchObjs().slice(0, this.getSketchObjs().length - this.undoIndex)
      let newSketchObj = new SketchObject(this.currentLayer, "layer", "merge layer", 
        {"mergeDown" : fromIndex > toIndex, "fromLayer": fromChild.instance, "fragmentLength": fragmentLength, 
        "finalIndex": Math.min(fromIndex, toIndex)})
      this.updateSketchObjs(sketchObjs, newSketchObj)
    }
  }

  separateSVGGroup(mergeDown, mergedLayer, fromLayer, fragmentLength) {
    // separate DOM elements
    let toFragment = document.createDocumentFragment()
    if (mergeDown) {
      for (let i = mergedLayer.node.children.length - fragmentLength; i < mergedLayer.node.children.length; i++) {
        const childElement = mergedLayer.node.children[i]
        toFragment.appendChild(childElement)
        i--
      }
    }
    else {
      for (let i = 0; i < fragmentLength; i++) {
        const childElement = mergedLayer.node.children[0]
        toFragment.appendChild(childElement)
      }
    }
    fromLayer.node.appendChild(toFragment)
    this.changeSVGGroupOwnership(fromLayer.node.id, fromLayer)
    this.currentLayer = fromLayer
  }

  deleteSVGGroup(id, index) {
    let parent = document.getElementById(id).parentElement
    let layer = document.getElementById(id).instance
    layer.remove()

    let sketchObjs = this.getSketchObjs().slice(0, this.getSketchObjs().length - this.undoIndex)
    let newSketchObj = new SketchObject(layer, "layer", "delete layer", {"index" : index})
    this.updateSketchObjs(sketchObjs, newSketchObj)
    this.currentLayer = parent.children[parent.children.length - 1].instance
  }

}
