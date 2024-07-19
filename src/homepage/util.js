import React from 'react'
import * as pathThatSvg from "path-that-svg"

const parser = new DOMParser();
const serializer = new XMLSerializer();

export const convertLayersToPreview = (svgString, numLayers, layerIDs, layerspageRef, fastEval = true) => {
    let noAnimationSVGString = svgString.replace(/<animate[^>]*\/>/gi, ''); // remove animations
    noAnimationSVGString = noAnimationSVGString.replace(/style="display:\s*none;"/g, '') // remove display = none since we always want to see layers

    let doc = parser.parseFromString(noAnimationSVGString, 'image/svg+xml');
    doc = cleanSVGStringForPreview(doc)
    const modifiedSVGString = serializer.serializeToString(doc);

    for (let i = 0; i < numLayers; i++) {
        let layerID = layerIDs[i]
        let pattern = '';
        for (let id of layerIDs) {
            noAnimationSVGString = modifiedSVGString.replace(/(<g id="[^>]*?)\/>/g, '$1></g>');
            if (id !== layerID) {
                pattern += `<g id="${id}"[^>]*>[\\s\\S]*?<\\/g>|`;
            }
        }
        pattern = pattern.slice(0, -1);
        const regex = new RegExp(pattern, 'gi');
        let subStr = noAnimationSVGString.replace(regex, '');
        let url = 'data:image/svg+xml; charset=utf8, ' + encodeURIComponent(subStr);
    
        if(!fastEval) layerspageRef.current.changeLayerSrc(i, url)
        else document.getElementById('layer' + i + '-preview-thumbnail').setAttribute('src', url);
    }
}

export const convertSVGToPreview = (svgString, currentDepth, parallaxOn = undefined) => {
    let noAnimationSVGString = svgString.replace(/<animate[^>]*\/>/gi, ''); // remove animations
    noAnimationSVGString = noAnimationSVGString.replace("viewBox", `preserveAspectRatio="none" viewBox`)
    // noAnimationSVGString = svgString.replace('style="background-color: white"', '') // remove bg if white

    let doc = parser.parseFromString(noAnimationSVGString, 'image/svg+xml');
    doc = cleanSVGStringForPreview(doc)

    // Select the <g id="sketchGroup"> element
    const sketchGroup = doc.querySelector('#sketchGroup');
    if(parallaxOn === undefined || parallaxOn === true){
        const gElements = sketchGroup.querySelectorAll('g[depth]');
        gElements.forEach(gElement => {
            const depth = Number(gElement.getAttribute('depth'));
            if (!isNaN(depth) && depth < currentDepth) {
                gElement.parentNode.removeChild(gElement);
            }
        });
    }

    // Serialize the modified DOM document back to an SVG string
    const modifiedSVGString = serializer.serializeToString(doc);

    let url = 'data:image/svg+xml; charset=utf8, ' + encodeURIComponent(modifiedSVGString);
    return url
}

const cleanSVGStringForPreview = (doc) => {
    const defsElements = doc.querySelectorAll('defs');
    defsElements.forEach(defsElement => {
        defsElement.parentNode.removeChild(defsElement);
    });
    const paletteData = doc.querySelector('#\\[\\[filtered\\.ink-color-palette-data\\]\\]');
    if (paletteData) {
        paletteData.parentNode.removeChild(paletteData);
    }
    const waypointData = doc.querySelector('#\\[\\[filtered\\.ink-waypoint-data\\]\\]');
    if (waypointData) {
        waypointData.parentNode.removeChild(waypointData);
    }
    return doc
}

export const isMouseInsideDiv = (x, y, divID) => {
    const divElement = document.getElementById(divID)
    if (divElement) {
        const divRect = divElement.getBoundingClientRect()
        if (
            x >= divRect.left &&
            x <= divRect.right &&
            y >= divRect.top &&
            y <= divRect.bottom
        ) {
            return true
        }
        else {
            return false
        }
    }
    else {
        console.log(`div ${divID} does not exist`)
        return false
    }
}

export const isDivBeyondCanvas = (divID, canvasRect) => {
    const divElement = document.getElementById(divID+"-preview")
    if (divElement) {
        const divRect = divElement.getBoundingClientRect()
        if (
            (divRect.top <= canvasRect.top &&
                divRect.bottom >= canvasRect.bottom) &&
            (divRect.left <= canvasRect.left &&
                divRect.right >= canvasRect.right)
        ) {
            return true
        }
        else {
            return false
        }
    }
    else {
        console.log(`div ${divID} does not exist`)
        return false
    }
}

export const makeFilterElementFromDict = (filtersID, filtersData, isPreview=false, wrapSVG=false, depth=undefined) => {
    let newPreviewFilter =
            <filter id={filtersID}>
                {filtersData.map((filter, ind) => {
                    let filterCopy = filterProps(filter, depth)

                    // if preview then change the feImage ID slightly so that we don't get a race condition 	
                    // which happens when removing the preview <pattern> and adding the actual preset <pattern?	
                    // since otherwise both would read from the same ID in the patternHandler Map<>() 	
                    if(isPreview) filterCopy.href = `${filterCopy.href}-preview`

                    let filterBase = <filterCopy.filtername key={filtersID+"-"+ind}/>
                    filterCopy["children"] = []
                    if (filterCopy.child !== undefined) {
                        if (!Array.isArray(filterCopy.child)) {
                            filterCopy.child = [filterCopy.child]
                        }
                        let childrenAnimations = filterCopy.child.map((c, index) => {
                            if (typeof(c) === "string") {
                                c = JSON.parse(c)
                            }
                            c = filterProps(c)
                            let filterChildBase = <c.filtername key={c.filtername + index}/>
                            if (c.animation !== undefined) {
                                let animationList = JSON.parse(c.animation)
                                Object.keys(animationList).forEach((k) => {
                                    let filterAniBase = <animate/>
                                    let parsed = JSON.parse(animationList[k])
                                    parsed["attributeType"] = "XML"
                                    parsed["repeatCount"] = "indefinite"
                                    let filterAniFilledIn = React.cloneElement(filterAniBase, parsed)
                                    c["children"].push(filterAniFilledIn)
                                })
                            }
                            let filterChildFilledIn = React.cloneElement(filterChildBase, c)
                            return filterChildFilledIn
                        })
                        filterCopy["children"].push(...childrenAnimations)
                    }
                    if (filterCopy.animation !== undefined) {
                        let animationList = JSON.parse(filterCopy.animation)
                        Object.keys(animationList).forEach((k, index) => {
                            let filterAniBase = <animate/>
                            let parsed = JSON.parse(animationList[k])
                            parsed["key"] = filterCopy["filterName"] + "-" + k + "-" + index.toString()
                            parsed["attributeType"] = "XML"
                            parsed["repeatCount"] = "indefinite"
                            let filterAniFilledIn = React.cloneElement(filterAniBase, parsed)
                            filterCopy["children"].push(filterAniFilledIn)
                        })
                    }
                    let filterFilledIn = React.cloneElement(filterBase, filterCopy)
                    return filterFilledIn
                })}
            </filter>
        
    if (wrapSVG) {
        return <svg>
            {newPreviewFilter}
        </svg>
    }
    else {
        return newPreviewFilter
    }
}

const filterProps = (dict, depth=-1) => {
    let dict_copy = JSON.parse(JSON.stringify(dict))
    if (dict_copy["filterName"] !== undefined) {
        dict_copy["filtername"] = dict_copy["filterName"]
        delete dict_copy["filterName"]
    }
    if (dict_copy["lighting-color"] !== undefined) {
        dict_copy["lightingColor"] = dict_copy["lightingColor"] === undefined ? dict_copy["lighting-color"] : dict_copy["lightingColor"]
        delete dict_copy["lighting-color"]
    }
    if (dict_copy["flood-color"] !== undefined) {
        dict_copy["floodColor"] = dict_copy["flood-color"]
        delete dict_copy["flood-color"]
    }
    if (dict_copy["color-interpolation-filters"] !== undefined) {
        dict_copy["colorInterpolationFilters"] = dict_copy["color-interpolation-filters"]
        delete dict_copy["color-interpolation-filters"]
    }
    if (dict_copy["depthEffects"] !== undefined) {
        if (depth) {
            let depthEffects = JSON.parse(dict_copy["depthEffects"])
            depth = Math.trunc(depth)
            depth = Math.min(depth, depthEffects.length-1)
            depth = Math.max(0, depth)
            return filterProps(JSON.parse(dict_copy["depthEffects"])[depth])
        }
        else {
            return filterProps(JSON.parse(dict_copy["depthEffects"])[0])
        }
    }
    if (dict_copy["child"] !== undefined && Array.isArray(dict_copy["child"]) && typeof(dict_copy["child"][0]) !== "string") {
        dict_copy["child"] = dict_copy["child"].map(c => {
            return JSON.stringify(c)
        })
    }
    return dict_copy
}

export const parseExtractedJSON = (json, effect) => {
    try {
        json = JSON.parse(json)
        if (effect === "Add noise [+]") {
            let scaleArea = Math.sqrt(json.avgArea / json.baseAvgArea)
            let scaleAspectRatio = json.avgAspectRatio / json.baseAvgAspectRatio
            // direction
            let turbulenceFrequencyX = (json.baseFrequency / scaleArea).toFixed(3)
            let turbulenceFrequencyY = ((json.baseFrequency / scaleArea) * scaleAspectRatio).toFixed(3)
            return JSON.stringify({ filterName: "feTurbulence", baseFrequency: turbulenceFrequencyX + " " + turbulenceFrequencyY, numOctaves: 1, seed: 0, stitchTiles: "noStitch", in: "SourceGraphic", result: "noise" })
            }
        else if (effect === "Apply colors [+]") {
            let reds = ""
            let greens = ""
            let blues = ""
            for (let i = 0; i < json.colors.length; i++) {
                reds += json.colors[i].x/255 + " "
                greens += json.colors[i].y/255 + " "
                blues += json.colors[i].z/255 + " "
            }
            let colorMatrix = {filterName: "feColorMatrix", type: "matrix", values: "0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0 0 1", result: "ColorMatrixOut"}
            let f1r = {filterName: "feFuncR", type: "linear", slope: "2", intercept:-(0.5 * 2) + 0.5}
            let f1g = {filterName: "feFuncG", type: "linear", slope: "2", intercept:-(0.5 * 2) + 0.5}
            let f1b = {filterName: "feFuncB", type: "linear", slope: "2", intercept:-(0.5 * 2) + 0.5}
            let componentTransfer1 = {filterName: "feComponentTransfer", in: "ColorMatrixOut", result: "transfer1", child: [JSON.stringify(f1r), JSON.stringify(f1g), JSON.stringify(f1b)]}
            let f2r = {filterName: "feFuncR", type: "table", tableValues: reds}
            let f2g = {filterName: "feFuncG", type: "table", tableValues: greens}
            let f2b = {filterName: "feFuncB", type: "table", tableValues: blues}
            let componentTransfer2 = {filterName: "feComponentTransfer", in: "transfer1", result: "transfer2", child: [JSON.stringify(f2r), JSON.stringify(f2g), JSON.stringify(f2b)]}
            return [JSON.stringify(colorMatrix), JSON.stringify(componentTransfer1), JSON.stringify(componentTransfer2)]
        }
        else {
            return {}
        }
    }
    catch(err) {
        console.log("JSON not loaded")
        return {}
    }
}

// https://stackoverflow.com/questions/1349404/generate-random-string-characters-in-javascript?page=1&tab=votes#tab-top
export const makeid = (length) => {
    var result           = '';
    var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for ( var i = 0; i < length; i++ ) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
   }
   return result;
}

export const flattenToPaths = (svg) => {
    if (svg.includes("main-canvas") || svg.includes("<!DOCTYPE html>") || svg === "") {
        return Promise.resolve(svg)
    }
    else {
        return pathThatSvg(svg)
    }
}

export const unravelGroup = (svgGroup, unraveledElems) => {
    Array.from(svgGroup.children).forEach(function(child) {
        if (child.nodeName === "path" || child.nodeName === "polyline") {
            unraveledElems.push(child)
        }
        else if (child.nodeName === "g" && child.hasAttribute('gradient-overlay')){
            unraveledElems.push(child)
        }
        else if (child.nodeName === "g")  {
            unraveledElems.concat(unravelGroup(child, unraveledElems))
        }
    })
    return unraveledElems
}

export const chunkArrayIntoPairs = (array) => {
    const pairs = [];
    for (let i = 0; i < array.length; i += 2) pairs.push(array.slice(i, i + 2));
    return pairs;
}

export const pointInsidePolygon = (point, vs) => {
/* https://github.com/substack/point-in-polygon (MIT license):
The MIT License (MIT)

Copyright (c) 2016 James Halliday

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

ray-casting algorithm based on
https://wrf.ecse.rpi.edu/Research/Short_Notes/pnpoly.html/pnpoly.html*/

var x = point[0], y = point[1];

var inside = false;
for (var i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    var xi = vs[i][0], yi = vs[i][1];
    var xj = vs[j][0], yj = vs[j][1];
    
    var intersect = ((yi > y) !== (yj > y))
        && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
}

return inside;
};

export const getCoordScaleFactor = (dim) => {
    let x = 1, dir = 1
    if (dim === 1e4) {
        return 1
    }
    else if (dim < 1e4) {
        x = 1e4/dim
        dir = 1
    }
    else {
        x = dim / 1e4
        dir = -1
    }
    let xString = x.toString()
    if (xString.indexOf(".") !== -1) {
        return dir * xString.split(".")[0].length
    }
    else {
        return dir * xString.length
    }

}

export const getNumSigFigs = (num) => {
    num = num.toString()
    if (num.indexOf(".") !== -1) {
        return num.split(".")[1].length
    }
    else {
        return 1
    }
}

export const hexToRgb = (hex) => {
    hex = hex.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return {red: r, green: g, blue: b}
}

export const getNumberInRange = (numbers, x, y) => {
    for (const num of numbers) {
      if (num >= x && num <= y) {
        return num
      }
    }
    return false
}

export const waitMilliseconds = (millisecs, f) => {
    setTimeout(function() {
      f()
    }, millisecs);
}

export const SVGTransformToMatrix = (transform) => {
    if (transform && transform.includes("translate")) {
        let tr = transform.split("(")[1].split(")")[0].split(" ")
        if (tr[1] === undefined) {
            tr = transform.split("(")[1].split(")")[0].split(",")
        }
        return `matrix(1,0,0,1,${tr[0]},${tr[1]})`
    }
    else {
        return transform
    }   
}