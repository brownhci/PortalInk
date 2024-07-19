import _ from "lodash"
import 'svg.filter.js'
import '../stabilizers/path-data-polyfill.js';
import { SVGTransformToMatrix, getCoordScaleFactor, getNumSigFigs} from "../util";
import { pathDataToPolys } from "svg-path-to-polygons"

import simplify from 'simplify-js'

let getVec = (a, b) => [b[0] - a[0], b[1] - a[1]];
let rotVec90 = (v) => [-v[1], v[0]];
let rotVec180 = (v) => [-v[0], -v[1]];
let scaleVec = (v, s) => [v[0] * s, v[1] * s];
let addVec = (a, b) => [a[0] + b[0], a[1] + b[1]];
let getVecLen = (v) => Math.sqrt(v[0] ** 2 + v[1] ** 2);
let normVec = (v) => {
  let length = Math.sqrt(v[0] ** 2 + v[1] ** 2);
  return [v[0] / length, v[1] / length];  // care, divide by zero
}
let calcOrthos = (direction, width) => {
  let normalizedOrthogonal = normVec(rotVec90(direction));
  let orthoCCW = scaleVec(normalizedOrthogonal, width);
  let orthoCW = rotVec180(orthoCCW);

  return [orthoCCW, orthoCW];
}

/** Single stroke of a sketch. SVG implementation. */
export default class Path {
  /**
   * Refactored so the constructor is cleaner
   * @param {object} draw - the svg draw object used to render this path
   * @param {Array} coords - the list of coordinates that define the path
   * @param {object} layer - the layer the stroke is contained in
   * @param {object} params - parameters that characterize the stroke (color, width, filterID, opacity, fill, filterIsVisible, variableWidth, isImported, strokeNode, scale)
   * @param {object} logging - used for logging user interactions (status, created, idCreator, idStroke, idMovedFrom, timeStart, timeEnd, rendered, erased)
   */

  // color, width, initialCoords, draw, idCreator, idStroke, status, idMovedFrom,
  //  created, timeStart, timeEnd, filterID, opacity, fill, filterIsVisible, variableWidth = true, layer
   constructor(draw, coords, layer, params, logging) {
    this.draw = draw
    this.coords = coords // Flattened array of points, stored as [x1, y1, x2, y2, ...]
    this.layer = layer
    this.params = params
    this.logging = logging

    this.svgPath = null
    
    this.logging.rendered = true
    this.logging.erased = false
    this.movedFrom = null

    if (this.params.isImported) { // imported strokes (not directly drawn need preprocessing)
      if (this.params.strokeNode.tagName === "polyline") {
        this.coords = []
        let points = this.params.strokeNode.getAttribute("points").split(" ")
        let numSigFigs = 2
        if (points.length > 0) {
          numSigFigs = points.length === 1 ? getNumSigFigs(Number(points[0].split(",")[0])) : Math.max(getNumSigFigs(Number(points[0].split(",")[0])), getNumSigFigs(Number(points[1].split(",")[0])))
        }
        let coordScaleFactor = Math.pow(10, numSigFigs)
        for (let i = 0; i < points.length; i++) {
            let pPair = points[i].split(",")
            // let xCoord = -this.params.newSGTransformX + (Number(pPair[0]) - (this.params.dx - this.params.oldSGTransformX) ) * this.params.scale
            // let yCoord = -this.params.newSGTransformY + (Number(pPair[1]) - (this.params.dy - this.params.oldSGTransformY)) * this.params.scale
            let xCoord = Number(pPair[0])
            let yCoord = Number(pPair[1])
            this.coords.push(Math.round(xCoord * coordScaleFactor) / coordScaleFactor)
            this.coords.push(Math.round(yCoord * coordScaleFactor) / coordScaleFactor)
        }
      }
      else if (this.params.strokeNode.tagName === "path") {
          let style = this.params.strokeNode.getAttribute("style")
          if (style) {
              style = style.replaceAll(" ", "")
              let styles = style.split(";")
              let context = this
              Array.from(styles).forEach(function(s) {
                  if (s !== "") {
                      let pair = s.split(":")
                      context.params.strokeNode.setAttribute(pair[0], pair[1])
                  }
              })
          }
          this.coords = coords
      }
      this.params.fill = this.params.strokeNode.getAttribute("fill") ? this.params.strokeNode.getAttribute("fill") : "none"
      this.params.fillOpacity = this.params.strokeNode.getAttribute("fill-opacity")
      this.params.color = this.params.strokeNode.getAttribute("stroke") ? this.params.strokeNode.getAttribute("stroke") : "black"
      this.params.width = this.params.strokeNode.getAttribute("stroke-width")
      this.params.strokeOpacity = this.params.strokeNode.getAttribute("opacity") ? this.params.strokeNode.getAttribute("opacity") : "1"
      this.params.filterResCorrection = (this.params.strokeNode.getAttribute("transform") && this.params.strokeNode.getAttribute("transform").split("matrix(")[1]) ? 1/Number(this.params.strokeNode.getAttribute("transform").split("matrix(")[1].split(",")[0]) : 1
      this.params.isWaypointPortal = this.params.strokeNode.getAttribute("isWaypointPortal") === 'yes'
      this.params.waypointID = this.params.strokeNode.getAttribute("waypointID")
      let options = { width: this.params.width, color: this.params.color, opacity: this.strokeOpacity, linecap: 'round', linejoin: 'round', fillopacity: this.params.strokeOpacity}


      if(this.params.isText) {
        this.params.lineSpacing = this.params.strokeNode.children.length >= 2 && this.params.strokeNode.children[0].getAttribute('y') ? this.params.strokeNode.children[1].getAttribute('y') - this.params.strokeNode.children[0].getAttribute('y') : 0
        this.params.lineSpacing += this.params.strokeNode.children.length >= 1 && this.params.strokeNode.children[0].getAttribute('dy') ? parseFloat(this.params.strokeNode.children[0].getAttribute('dy')) : 0
        if (this.params.strokeNode.children.length > 0) {
          let node = this.params.strokeNode
          this.svgPath = this.draw.text(function(add) {
            Array.from(node.children).map((child) => {
              let parentTextContent = child.textContent
              var combinedTextContent = Array.from(child.children).map(function(tspan) {
                if (tspan.textContent) return tspan.textContent
                else return " ";
              }).join('');
              if (parentTextContent.replace(/\s+/g, '') === combinedTextContent.replace(/\s+/g, '')) {
                add.tspan(combinedTextContent).newLine()
              }
              else {
                add.tspan(parentTextContent + combinedTextContent).newLine()
              }
              return true
            })
          })
          if(this.params.strokeNode.getAttribute('x')) {
            this.svgPath.node.setAttribute('x', this.params.strokeNode.getAttribute('x'))
            this.svgPath.node.setAttribute('y', this.params.strokeNode.getAttribute('y'))
          }
        }
        else {
          this.svgPath = this.draw.text("")
        }
        this.svgPath.node.setAttribute('style', this.params.strokeNode.getAttribute("style"))
        this.svgPath.attr('potraced', 'yes')
      }
      else if(this.params.isPath){ // imported potrace stroke goes here
        this.svgPath = this.draw.path(this.params.pathRep)
          .fill({color: this.params.fill, opacity: this.params.fillOpacity});
        this.svgPath.attr('potraced', 'yes');
        this.params.opacity = this.params.fillOpacity; // TODO bandaid fix
      }
      else {
        this.svgPath = this.params.fill !== "none" ? 
          this.draw.polyline(this.coords).fill({color: this.params.fill, opacity: this.params.fillOpacity}) : 
          this.draw.polyline(this.coords).fill('none').stroke(options)
        this.params.opacity = this.params.fill !== "none" ? this.params.strokeOpacity : this.params.fillOpacity
      }

      let filter = this.params.strokeNode.getAttribute("filter")
      if (filter !== null && filter !== "") {
          this.svgPath.attr('filter', filter)
          this.params.filterID = filter.split("#")[1]
          this.params.filterID = this.params.filterID.substring(0, this.params.filterID.length - 1)
          let filterHiddenTag = this.params.filterID.split("___")
          if (filterHiddenTag.length === 2) {
            this.params.filterID = filterHiddenTag[0]
          }
      }
      this.params.color = this.params.fill !== "none" ? this.params.fill : this.strokeColor
    }
    else {
      this.options = { width: this.params.width, color: this.params.color, opacity: this.params.opacity, linecap: 'round', linejoin: 'round', fillopacity: this.params.opacity }
    
      if(this.params.isPath){ // dead code?
        this.svgPath = this.draw.path(this.params.pathRep).fill({color: this.params.color, opacity: this.params.opacity});
      }
      else if(!this.params.variableWidth){
        this.svgPath = this.params.fill ? 
          this.draw.polyline(this.coords).fill({color: this.params.color, opacity: this.params.opacity}) : 
          this.draw.polyline(this.coords).fill('none').stroke(this.options)
      } 
      else {
        // Alternative fill rule for variable width
        this.svgPath = this.draw.polyline(this.coords).fill({color: this.params.color, opacity: this.params.opacity});
        this.params.width = (this.params.width * 0.8 * 10)/10; // correct width so it's the same as the non-variable width scenario
        // don't round!
      }
    }

    this.params.filterIsVisible = this.params.filterIsVisible === undefined ? true : this.params.filterIsVisible
    if (this.params.filterID !== undefined && this.params.filterID !== "empty" && this.params.filterIsVisible) {
      this.svgPath.attr('filter', 'url(#' + this.params.filterID + ')')
    }

    if (this.params.isText) {}
    else if(this.params.isPath) this.calculatePathCoords();
    if (!this.params.stops) {
      this.params.stops = []
    }
    this.hasGradient = false;
    this.gradientCollection = null;
    this.orderIndex = -1;

    if(this.params.potraced === undefined) this.params.potraced = false;
    if(this.params.isPath === undefined) this.params.isPath = false;
    if(this.params.pathRep === undefined) this.params.pathRep = "";

    if(this.params.isWaypointPortal) this.svgPath.attr('isWaypointPortal', 'yes')
    if(this.params.waypointID) this.svgPath.attr('waypointID', this.params.waypointID)

    this.svgPath.transform({
      a: 1/this.params.filterResCorrection, b: 0, c: 0, d: 1/this.params.filterResCorrection, e: 0, f: 0
    })

    if(this.params.isText) {
      let params = this.params
      if (this.params.strokeNode.getAttribute('transform')) this.svgPath.node.setAttribute('transform', SVGTransformToMatrix(this.params.strokeNode.getAttribute('transform')))
      Array.from(this.svgPath.node.children).map((child) => {
        child.setAttribute('dy', params.lineSpacing)
        if(this.svgPath.node.getAttribute('x')) child.setAttribute('x', this.svgPath.node.getAttribute('x'))
        return true
      })
    }
  }

  /**
   * Converts this path into a plain object.
   * @return {object} object containing keys:
   *
   */
  serialize(includeCoords=true) {
    let coordscopy = _.cloneDeep(this.coords)
    let paramscopy = _.cloneDeep(this.params)
    let loggingcopy = _.cloneDeep(this.logging)
    if (!this.svgPath.node.getAttribute("isWaypointPortal") && this.params.isWaypointPortal) delete this.params.isWaypointPortal
    if (!this.svgPath.node.getAttribute("waypointID") && this.params.waypointID) delete this.params.waypointID
    if (includeCoords) {
      return {
        coords: coordscopy,
        layerID: this.layer.node.id,
        params: paramscopy,
        logging: loggingcopy
      }
    }
    else {
      return {
        layerID: this.layer.node.id,
        params: paramscopy,
        logging: loggingcopy
      }
    }
  }

  /**
   *
   * @param {object} serializedPath
   * @param {object} draw
   * @return {Path} the deserialized path
   */
  static deserialize(serializedPath, draw, primarySketch) {
    let layer = document.getElementById(serializedPath.layerID).instance
    serializedPath.params.isImported = false
    const newCopy = new Path(draw, serializedPath.coords, layer, serializedPath.params, serializedPath.logging)
    if (serializedPath?.params.stops?.length > 0) newCopy.setGradientStops(serializedPath.params.stops, primarySketch);
    if (serializedPath?.params?.potraced === true) newCopy.svgPath.attr('potraced', 'yes')
    if (serializedPath?.params?.isWaypointPortal) newCopy.svgPath.attr('isWaypointPortal', 'yes')
    if (serializedPath?.params?.waypointID) newCopy.svgPath.attr('waypointID', serializedPath.params.waypointID)
    return newCopy
  }

  calculatePathCoords(){
    this.pathCoords = [];
    const zoomLevel = this.draw.viewbox().zoom;
    const precisionNeeded = Math.log10(zoomLevel) | 0 + 2;
    const toleranceNeeded = zoomLevel < 0 ? 1 : (0.1) ** (Math.log10(zoomLevel));
    const loops = pathDataToPolys(this.params.pathRep, {tolerance: toleranceNeeded, decimals: precisionNeeded});
    
    /*const dx = this.params.dx || 0, dy = this.params.dy || 0;
    const oldSGTransformX = this.params.oldSGTransformX || 0, oldSGTransformY = this.params.oldSGTransformX || 0;
    const scale = this.params.scale || 1;*/

    for (let j = 0; j < loops.length; j++) {
      let loopCoords = []
      for (let i = 0; i < loops[j].length; i++) {
        loopCoords.push(loops[j][i][0]) // no dx - oldSGTransformX needed ??
        loopCoords.push(loops[j][i][1])
      }
      this.pathCoords.push(loopCoords)
    } 
  }

  /**
   * Adds a point to the path and renders it.
   *
   * @param {number} x
   * @param {number} y
   */
  addPoint(x, y) {
    let displacementX = x === this.coords[this.coords.length - 2] ? 1 : 0
    let displacementY = y === this.coords[this.coords.length - 1] ? 1 : 0
    this.coords.push(x + displacementX)
    this.coords.push(y + displacementY)
    this.svgPath.plot(this.coords)
  }

  /**
   * Sets all the path's coords to a list of points
   * 
   * @param {points} points 
   */
   setPoints(points, stabilizerName){
    if(this.params.fill || !this.params.variableWidth){
      this.coords = points.map(p => p.slice(0, 2)).flat()
      this.svgPath.plot(this.coords)
      return;
    } 
    else {
      // algorithm only works with 3+ points
      if(points.length < 3) return;

      // if starting points are all the same point then return
      let startingIndex = -1;
      for(let i = 0; i < points.length - 1; i++){
        if(getVecLen(getVec(points[i], points[i + 1])) > 1e-2){
          startingIndex = i;
          break;
        }
      }
      if(startingIndex === -1) return;

      // arrays to hold points on the clockwise and counterclockwise "side" of the stroke
      let pointsCCW = [];
      let pointsCW = [];
      
      // calculate bvalues for the first point
      let startingDirection = getVec(points[startingIndex], points[startingIndex + 1]);
      let startingOrthoLength = this.params.width * points[startingIndex][3];
      let [startingOrthoCCW, startingOrthoCW] = calcOrthos(startingDirection, startingOrthoLength);
      let startingCCWPoint = addVec(points[startingIndex], startingOrthoCCW);
      let startingCWPoint = addVec(points[startingIndex], startingOrthoCW);
      let startingTailedCCWPoint = addVec(points[startingIndex + 1], startingOrthoCCW);
      let startingTailedCWPoint = addVec(points[startingIndex + 1], startingOrthoCW);
      pointsCCW.push(startingCCWPoint);
      pointsCW.push(startingCWPoint);

      // calculate middle points
      // assume normal and tail points use same pressure for ortho length
      // this is not true but for optimization's sake we will assume
      let previousOrthoCCW = startingOrthoCCW;
      let previousOrthoCW = startingOrthoCW;
      let previousTailedCCWPoint = startingTailedCCWPoint;
      let previousTailedCWPoint = startingTailedCWPoint;
      let previousOrthoLength = startingOrthoLength;

      for(let i = startingIndex + 1; i < points.length - 1; i++){
        let currPoint = points[i];
        let nextPoint = points[i + 1];

        // get stroke direciton, if not moving then skip duplicate point
        let direction = getVec(currPoint, nextPoint);
        if(getVecLen(direction) < 1e-2) {
          continue;
        }

        // calculate current point orthogonals 
        let orthoLength = this.params.width * currPoint[3];
        if(!orthoLength) orthoLength = previousOrthoLength; // temp fix for last cursor event missing pressure 
        let [orthoCCW, orthoCW] = calcOrthos(direction, orthoLength);

        // fix injected points causing artifacts
        if(currPoint[2] === 1 && nextPoint[2] === 0);
        else if(currPoint[2] === 1 || nextPoint[2] === 1){
          orthoCCW = previousOrthoCCW;
          orthoCW = previousOrthoCW;
        }

        // calculate CW and CCW points 
        // let CCWPoint = addVec(currPoint, orthoCCW);
        // let CWPoint = addVec(currPoint, orthoCW);
        let tailedCCWPoint = addVec(nextPoint, orthoCCW);
        let tailedCWPoint = addVec(nextPoint, orthoCW);

        // because direction is so random, need to normalize it
        // TODO use inkscape to investigate but need to turn off roundind
        /*let rawAngle = getAngle(previousDirection, direction);
        previousAngles.push(rawAngle);
        let angle = stabilizerName === 'spring' ? rawAngle : movingAverage(previousAngles, 10);*/

        // if the turn is not sharp, find average between current and previous orthogonal and use it (less noise)
        // otherwise, truncate the end (should insert curved point here) 
        let averageOrthoCCW = scaleVec(normVec(addVec(previousOrthoCCW, orthoCCW)), orthoLength);
        let averageOrthoCW = scaleVec(normVec(addVec(previousOrthoCW, orthoCW)), orthoLength);

        // strange bug where current CCW ortho cancels out with previous CCW ortho, which seems like a CW ortho?
        // maybe there's an edge case mistake somewhere but for now, use isNaN to ignore the case
        if(
          isNaN(averageOrthoCCW[0]) || isNaN(averageOrthoCCW[1]) || 
          isNaN(averageOrthoCW[0]) || isNaN(averageOrthoCW[1])
        ){
          // console.log(previousOrthoCCW, orthoCCW, orthoLength);
        }

        else {
          pointsCCW.push(addVec(currPoint, averageOrthoCCW));
          pointsCW.push(addVec(currPoint, averageOrthoCW));
        }

        // cache previous point calculations
        previousOrthoCCW = orthoCCW;
        previousOrthoCW = orthoCW;
        previousTailedCCWPoint = tailedCCWPoint;
        previousTailedCWPoint = tailedCWPoint;
        previousOrthoLength = orthoLength;
      }

      // calculate final points
      pointsCCW.push(previousTailedCCWPoint);
      pointsCW.push(previousTailedCWPoint);

      // generate start cap
      let startCapDirec = getVec(points[startingIndex], points[startingIndex + 1]);
      let startCapPoints = [];
      let vecLen = getVecLen(startCapDirec);
      let scale = startingOrthoLength / vecLen;
      for(let theta = -Math.PI; theta <= Math.PI; theta += Math.PI / 6){
        let x1 = startCapDirec[0] * scale;
        let y1 = startCapDirec[1] * scale;
        let x2 = Math.cos(theta) * x1 - Math.sin(theta) * y1;
        let y2 = Math.sin(theta) * x1 + Math.cos(theta) * y1;
        startCapPoints.push(addVec(points[startingIndex], [x2, y2]));
      }

      // generate end cap
      let lastIndex = -1;
      for(let i = points.length - 1; i > 0; i--){
        if(getVecLen(getVec(points[i], points[i - 1])) > 1e-2){
          lastIndex = i;
          break;
        }
      }
      if(lastIndex === -1) return;

      let endCapDirec = getVec(points[lastIndex - 1], points[lastIndex]);
      let endCapPoints = [];
      for(let theta = -Math.PI; theta <= Math.PI; theta += Math.PI / 6){
        let vecLen = getVecLen(endCapDirec);
        let width = previousOrthoLength;
        let scale = width / vecLen;
        let x1 = endCapDirec[0] * scale;
        let y1 = endCapDirec[1] * scale;
        let x2 = Math.cos(theta) * x1 - Math.sin(theta) * y1;
        let y2 = Math.sin(theta) * x1 + Math.cos(theta) * y1;
        endCapPoints.push(addVec(points[lastIndex], [x2, y2]));
      }

      let finalPoints = [
        ...startCapPoints,
        ...pointsCW,
        ...endCapPoints,
        ...pointsCCW.reverse()
      ];
      
      this.coords = finalPoints.map(p => p.slice(0, 2)).flat()
      this.svgPath.plot(this.coords)
    }
  }
  
/**
   * Converts final polyline to a potraced path
   * @param {HTMLCanvasElement} bufferCanvas
   * @param {CanvasRenderingContext2D} bctx
   */
potrace(
  bufferCanvas, bctx, sketchPageRef, backgroundWorker, 
  scheduler, webworker = true, 
  bounds = undefined, layerTransform = [[1, 0, 0], [0, 1, 0], [0, 0, 1]]
){
  const svgRef = document.getElementById('main-canvas');
  const rawViewBox = svgRef.getAttribute('viewBox');
  let viewBox = rawViewBox.split(' ').map(parseFloat);

  const coord = viewBox.slice(0, 2);
  const scaleFactorX = bufferCanvas.width / viewBox[2];
  const scaleFactorY = bufferCanvas.height / viewBox[3];

  const thisId = this.logging.idStroke;
  scheduler.pathRefs.set(thisId, this);
  scheduler.callbacks.set(thisId, (data) => {
    if(data.id !== thisId) return; // ids should match...
    let pathCommand = data.res;

    const attributes = this.svgPath.attr();

    delete attributes.points;

    const newPath = this.draw.path(pathCommand);
    newPath.attr(attributes)
    if(!this.params.fill && !this.params.variableWidth){
      newPath.attr('stroke', null);
      newPath.attr('stroke-width', null);
      newPath.attr('stroke-opacity', null);
      newPath.attr('stroke-linecap', null);
      newPath.attr('stroke-linejoin', null);
      newPath.attr('fill', this.params.color);
    }
    newPath.attr('potraced', 'yes');

    this.svgPath.after(newPath);
    this.svgPath.remove();

    this.svgPath = newPath;
    this.params.potraced = true;
    this.params.isPath = true;
    this.params.pathRep = pathCommand;
    this.calculatePathCoords();

    sketchPageRef.serializeToString();
  });
  
  backgroundWorker.postMessage({
    id: thisId,
    coords: this.coords,
    coord: coord,
    bWidth: svgRef.getAttribute('width'),
    bHeight: svgRef.getAttribute('height'),
    scaleFactorX: scaleFactorX,
    scaleFactorY: scaleFactorY,
    filterResCorrection: this.params.filterResCorrection,
    bounds: bounds,
    vbox: viewBox,
    zoom: this.draw.viewbox().zoom,
    // currentLayerOffset: currentLayerOffset,
    layerTransform: layerTransform,
    isPolylineFormat: !this.params.fill && !this.params.variableWidth,
    lineWidth: this.params.width
  });
}


  /**
   * Moves the path by a certain displacement.
   *
   * @param {number} x
   * @param {number} y
   */
  moveBy(x, y, primarySketch) {
    if(this.params.isText){return}
    if(!this.params.potraced){
      let numSigFigs = Math.max(getNumSigFigs(this.coords[0]), getNumSigFigs(this.coords[1]))
      let coordScaleFactor = Math.pow(10, numSigFigs)

      for (let i = 0; i < this.coords.length; i++) {
        this.coords[i] = (i % 2 === 0) ? this.coords[i] + x : this.coords[i] + y
        this.coords[i] = Math.round(this.coords[i] * coordScaleFactor) / coordScaleFactor
      }

      this.svgPath.plot(this.coords)
    } else {
      const pathData = this.svgPath.node.getPathData();
      for(let command of pathData){
        for(let i = 0; i < command.values.length; i += 2){
          command.values[i] += x;
          command.values[i + 1] += y;
        }
      }
      for(let command of pathData){
        command.values = command.values.map(n => Math.round(n * 100) / 100)
      }
      
      this.svgPath.node.setPathData(pathData);
      this.params.pathRep = this.svgPath.node.getAttribute('d');
    }

    if(this.params.stops.length > 0){
      this.setGradientStops(this.params.stops, primarySketch)
      this.gradientCollection.opacity(0.1);
    }
  }

  /**
   * "Highlights" the path by changing its opacity.
   */
  highlight(newOpacity=null) {
    if (newOpacity !== null) {
      this.svgPath.opacity(newOpacity)
      this.gradientCollection?.opacity(newOpacity)
    }
    else {
      this.svgPath.opacity(this.params.opacity)
      this.gradientCollection?.opacity(this.params.opacity)
    }
  }

  /**
   * Changes the color of the path
   * @param {string} color 
   */
  setColor(color) {
    this.params.color = color
    // this.svgPath.stroke({color: color})
    if (/* this.params.fill*/ true) {
      this.svgPath.fill(this.params.color)
    }
  }

  changeFilter(newFilterID) {
    this.params.filterID = newFilterID
    if (this.params.filterID === "empty") {
      this.svgPath.attr('filter', '')
    }
    else {
        this.svgPath.attr('filter', 'url(#' + newFilterID + ')')
    }
  }

  updateFilterVisibility(filterID, isVisible) {
    this.params.filterIsVisible = isVisible;

    if (this.params.filterID === filterID) {
      if (isVisible) {
        this.svgPath.attr('filter', 'url(#' + this.params.filterID + ')')
      }
      else {
        this.svgPath.attr('filter', 'url(#' + this.params.filterID + '___hidden)')
      }
    }
  }

  /**
   * Stop rendering this path on the SVG.
   */
  remove(status) {
    if (this.params.filterID) {
      this.filterElement = document.getElementById(this.params.filterID)
    }
    this.svgPath.remove()
    this.logging.rendered = false
    this.logging.status = status
    if (status === 2) {
      this.logging.erased = true
    }

    if(this.params.stops?.length > 0){
      this.gradientCollection.remove();
    }
  }

  /**
   * Adds this path to the group so it can be rendered.
   *
   * @param {object} sketchGroup
   */
  addToGroup(sketchGroup) {
    let filterElementExists = document.getElementById(this.params.filterID) 
    if (!filterElementExists && this.filterElement) {
      let svg = document.getElementById('main-canvas')
      svg.appendChild(this.filterElement)
    }
    sketchGroup.add(this.svgPath)
    // sketchGroup.add(this.svgGuide)
    this.logging.rendered = true
    this.logging.status = 1
    this.highlight()

    if (this.gradientCollection) this.layer.add(this.gradientCollection)
  }

  pathCoordsAtIndex(coords, index, xy) {
    return coords[index * 2 + xy]
  }

  smoothCoords(coords) {
    let str = ''
    str += ('M ' + this.pathCoordsAtIndex(coords, 0, 0) + ' ' + this.pathCoordsAtIndex(coords, 0, 1) + ' ')
    let skip1 = true
    let skip2 = false
    let cp1x, cp1y, cp2x, cp2y
    for (let i = 0; i < coords.length / 2 - 1; i++) {
      if (skip1) {
        cp1x = this.pathCoordsAtIndex(coords, i, 0) // x
        cp1y = this.pathCoordsAtIndex(coords, i, 1) // y
        skip1 = false
        skip2 = true
      }
      if (skip2) {
        cp2x = this.pathCoordsAtIndex(coords, i, 0) // x
        cp2y = this.pathCoordsAtIndex(coords, i, 1) // y

        skip1 = false
        skip2 = false
      } else {
        str += 'C ' + cp1x + ' ' + cp1y + ' ' + cp2x + ' ' + cp2y + ' ' +
          this.pathCoordsAtIndex(coords, i, 0) + ' ' + this.pathCoordsAtIndex(coords, i, 1) + ' '
        skip1 = true
        skip2 = false
      }
    }
    return str
  }

  addToGroupSmoothed(sketchGroup) {
    this.svgPath.remove()
    let path = this.params.fill ? 
      this.draw.path(this.smoothCoords(this.coords)).fill({color: this.params.color, opacity: this.params.opacity}) : 
      this.draw.path(this.smoothCoords(this.coords)).fill('none').stroke(this.options)
    this.svgPath = path
    sketchGroup.add(path)
  }

  trimCoords() {
    let points = []
    let viewbox = this.draw.viewbox()
    for (let i = 0; i < this.coords.length - 1; i+=2){
      points.push({x: this.coords[i] * (1/this.params.filterResCorrection), y: this.coords[i+1] * (1/this.params.filterResCorrection)})
    }
    let simplified = simplify(points, 0.5 / viewbox.zoom)
    let coordScaleFactorX = Math.pow(10, getCoordScaleFactor(viewbox.width * this.params.filterResCorrection))
    let coordScaleFactorY = Math.pow(10, getCoordScaleFactor(viewbox.height * this.params.filterResCorrection))
    let newPoints = []
    for (let i = 0; i < simplified.length; i++) {
      newPoints.push(Math.round(simplified[i].x * this.params.filterResCorrection * coordScaleFactorX) / coordScaleFactorX)
      newPoints.push(Math.round(simplified[i].y * this.params.filterResCorrection * coordScaleFactorY) / coordScaleFactorY)
    }
    this.coords = newPoints
    console.log("trimmed")
    this.svgPath.plot(this.coords)
  }

  setGradientStops(stops, primarySketch){
    this.params.stops = stops;
    this.orderIndex = -1; // if gradient already exists, it will have a certain index in the entire sketch's <g> and we want to preserve the order!

    if(this.gradientCollection && this.gradientCollection.remove) {
      let layerID = this.layer.node.id
      const allChildren = document.getElementById(layerID).children;
      const targetId = this.svgPath.node.id;

      for(let i = 0; i < allChildren.length; i++){
        if(targetId === allChildren[i].id) this.orderIndex = i + 1;
      }
      
      this.gradientCollection.remove(); 
    }

    const gradCollection = this.draw.group();
    gradCollection.attr('pointer-events', 'none')
    gradCollection.attr('gradient-overlay', this.svgPath.id())

    this.svgPath.attr('gradient-ids', stops.map(s => s.id).join(','));

    if (this.filter !== null && this.filter !== ""){
        gradCollection.attr('filter', this.filter)
    }

    for(let i = 0; i < stops.length; i++){
        const curStop = stops[i];
        const pathNode = this.svgPath.clone();
        pathNode.fill(`url(#${curStop.id})`);
        pathNode.attr(`opacity`, '1');
        gradCollection.add(pathNode);
    }
    
    if(this.orderIndex === -1) this.layer.add(gradCollection);
    else this.layer.add(gradCollection, this.orderIndex);

    this.gradientCollection = gradCollection;
  }
}
