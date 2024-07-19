import { makeid } from "../util";
import { createGridPattern2 } from "./gridpattern";

const SVG = 'http://www.w3.org/2000/svg';

// NOTE:
// when updating dy or dx, we need to update the scaling in dynamic animateTransform because the formula for those values
// namely `${calc_cellwidth / half_cell_width} ${calc_cellheight / half_cell_height}`, depend on values for dy and dx
// so TODO is to call updateDynamic param on updateParam so they use the new dy or dx

export class PatternHandler {
    constructor(type = 'grid', params, svgID, svgDefElem, container, dimensions, updateFilterCode) {
        this.params = params; // reference to param object
        this.svgID = svgID;
        this.svgDefElem = svgDefElem;
        this.dimensions = dimensions;

        this.parentContainer = container; // new Map()
        // this.patternReferences; // (<pattern>)[]
        // this.renderedElements; // (<path>)[]
        this.animations = new Map();
        this.animationRawValues = new Map();
        this.animationsDict = new Map(); // dictionary of parameters associated with animation raw values

        this.updateFilterCode = updateFilterCode;

        const patternGeneratorOutput = createGridPattern2(params, svgID, svgDefElem, dimensions);
        this.patternReferences = patternGeneratorOutput.patternReferences;
        this.renderedElements = patternGeneratorOutput.renderedElements;
        this.groupReferences = patternGeneratorOutput.groupReferences;

        this.oldCalcWidth = 1;
        this.oldCalcHeight = 1;
    }

    deleteSelf() {
        [...this.animationsDict.keys()].forEach(key => this.removeAnimation(key))
        this.patternReferences.forEach(ref => ref.remove());
        this.renderedElements.forEach(ref => ref.remove());
        this.groupReferences.forEach(ref => ref.remove());
    }

    removeAnimation(aniParamToRemove){
        if(aniParamToRemove === 'cellwidth'){
            this.animationsDict.delete('cellwidth');
            this.animationRawValues.delete('cellwidth');

            // deleted cellwidth aniParam, but there's still cellheight and need to update animation cellsize
            if(this.animationsDict.has('cellheight')){
                this.updateAnimatedParam(this.animationsDict.get('cellheight'));
            } 
            
            else {
                this.animations.get('cellsize').remove();
                this.animations.delete('cellsize');
            }
        }
        
        else if(aniParamToRemove === 'cellheight'){
            this.animationsDict.delete('cellheight');
            this.animationRawValues.delete('cellheight');

            if(this.animationsDict.has('cellwidth')){
                this.updateAnimatedParam(this.animationsDict.get('cellwidth'));
            } else {
                this.animations.get('cellsize').remove();
                this.animations.delete('cellsize');
            }
        }

        else if(aniParamToRemove === 'sx'){
            this.animationsDict.delete('sx');
            this.animationRawValues.delete('sx');

            // deleted cellwidth aniParam, but there's still cellheight and need to update animation cellsize
            if(this.animationsDict.has('sy')){
                this.updateAnimatedParam(this.animationsDict.get('sy'));
            } 
            
            else {
                this.animations.get('cellmove').remove();
                this.animations.delete('cellmove');
            }
        }
        
        else if(aniParamToRemove === 'sy'){
            this.animationsDict.delete('sy');
            this.animationRawValues.delete('sy');

            if(this.animationsDict.has('sx')){
                this.updateAnimatedParam(this.animationsDict.get('sx'));
            } else {
                this.animations.get('cellmove').remove();
                this.animations.delete('cellmove');
            }
        }
    }

    updateParamReference(newParams){
        this.params = newParams;
    }

    updateStaticParam(paramsToUpdate, newVals) { // covers both add and update
        const params = this.params;

        // update unit
        const quart_cell_width = params.dx / 4; // pixels
        const quart_cell_height = params.dy / 4; // pixels
        const half_cell_width = params.dx / 2; // pixels
        const half_cell_height = params.dy / 2; // pixels
        const calc_cellwidth = params.cellwidth;
        const calc_cellheight = params.cellheight;

        const w_2 = params.dx / 2; 
        const h_2 = params.dy / 2;
        const w_4 = params.dx / 4;
        const h_4 = params.dy / 4;
        const w_8 = params.dx / 8; 
        const h_8 = params.dy / 8; 

        if(params.unittype === 'square'){
            const newUnit = document.createElementNS(SVG, 'rect');
            const oldUnit = this.patternReferences[0].firstChild;
            this.patternReferences[0].removeChild(oldUnit);
            this.patternReferences[0].appendChild(newUnit);

            if(this.animations.has('cellsize')) newUnit.append(this.animations.get('cellsize'));
            
            newUnit.setAttribute('x', quart_cell_width); // range of value 10 and whatever the width stretches to must stay WITHIN pattern box
            newUnit.setAttribute('y', quart_cell_height);
            newUnit.setAttribute('width', half_cell_width);
            newUnit.setAttribute('height', half_cell_height);
            newUnit.setAttribute('transform-origin', `${half_cell_width} ${half_cell_height}`)
            newUnit.setAttribute('transform', `scale(${calc_cellwidth / half_cell_width} ${calc_cellheight / half_cell_height}) rotate(${params.unitrot})`)
        }
        else if(params.unittype === 'circle'){
            const newUnit = document.createElementNS(SVG, 'ellipse');
            const oldUnit = this.patternReferences[0].firstChild;
            this.patternReferences[0].removeChild(oldUnit);
            this.patternReferences[0].appendChild(newUnit);

            if(this.animations.has('cellsize')) newUnit.append(this.animations.get('cellsize'));

            newUnit.setAttribute('cx', w_2); 
            newUnit.setAttribute('cy', h_2);
            newUnit.setAttribute('rx', w_4);
            newUnit.setAttribute('rx', h_4);
            newUnit.setAttribute('transform-origin', `${w_2} ${h_2}`)
            newUnit.setAttribute('transform', `scale(${calc_cellwidth / w_2} ${calc_cellheight / h_2}) rotate(${params.unitrot})`)
            newUnit.setAttribute('fill', 'black');
        }
        else if(params.unittype === 'triangle'){
            const newUnit = document.createElementNS(SVG, 'path');
            const oldUnit = this.patternReferences[0].firstChild;
            this.patternReferences[0].removeChild(oldUnit);
            this.patternReferences[0].appendChild(newUnit);

            if(this.animations.has('cellsize')) newUnit.append(this.animations.get('cellsize'));
            
            newUnit.setAttribute('d', `
                M${w_2} ${h_2 + (-h_4 + h_8)},
                L${w_2 + w_4*Math.sqrt(3)/2} ${h_2 + (h_4/2 + h_8)},
                L${w_2 - w_4*Math.sqrt(3)/2} ${h_2 + (h_4/2 + h_8)},
                L${w_2} ${h_2 + (-h_4 + h_8)},
            `);
            newUnit.setAttribute('transform-origin', `${w_2} ${h_2}`)
            newUnit.setAttribute('transform', `scale(${calc_cellwidth / w_2} ${calc_cellheight / h_2}) rotate(${params.unitrot})`)
            newUnit.setAttribute('fill', 'black');
        }
        else if(params.unittype === 'star'){
            const newUnit = document.createElementNS(SVG, 'path');
            const oldUnit = this.patternReferences[0].firstChild;
            this.patternReferences[0].removeChild(oldUnit);
            this.patternReferences[0].appendChild(newUnit);

            if(this.animations.has('cellsize')) newUnit.append(this.animations.get('cellsize'));

            newUnit.setAttribute('d', `
                M${w_2} ${h_4},
                L${w_2 + w_8 / 2} ${h_2 - h_8 / 2},
                L${w_2 + w_4} ${h_2},
                L${w_2 + w_8 / 2} ${h_2 + h_8 / 2},
                L${w_2} ${h_2 + h_4},
                L${w_2 - w_8 / 2} ${h_2 + h_8 / 2},
                L${w_4} ${h_2},
                L${w_2 - w_8 / 2} ${h_2 - h_8 / 2},
                L${w_2} ${h_4},
            `);
            newUnit.setAttribute('transform-origin', `${w_2} ${h_2}`)
            newUnit.setAttribute('transform', `scale(${calc_cellwidth / w_2} ${calc_cellheight / h_2}) rotate(${params.unitrot})`)
            newUnit.setAttribute('fill', 'black');
        }
        else if(params.unittype === 'hexagon'){
            const newUnit = document.createElementNS(SVG, 'path');
            const oldUnit = this.patternReferences[0].firstChild;
            this.patternReferences[0].removeChild(oldUnit);
            this.patternReferences[0].appendChild(newUnit);

            if(this.animations.has('cellsize')) newUnit.append(this.animations.get('cellsize'));

            const S3 = Math.sqrt(3) / 1.5;
            newUnit.setAttribute('d', `
                M${w_2 - w_8 * S3} ${h_4},
                L${w_2 + w_8 * S3} ${h_4},
                L${w_2 + 2 * w_8 * S3} ${h_2},
                L${w_2 + w_8 * S3} ${h_2 + h_4},
                L${w_2 - w_8 * S3} ${h_2 + h_4},
                L${w_2 - 2 * w_8 * S3} ${h_2},
                L${w_2 - w_8 * S3} ${h_4},
            `);
            newUnit.setAttribute('transform-origin', `${w_2} ${h_2}`)
            newUnit.setAttribute('transform', `scale(${calc_cellwidth / w_2} ${calc_cellheight / h_2}) rotate(${params.unitrot})`)
            newUnit.setAttribute('fill', 'black');
        }
        else if(params.unittype === 'hatches'){
            const newUnit = document.createElementNS(SVG, 'path');
            const oldUnit = this.patternReferences[0].firstChild;
            this.patternReferences[0].removeChild(oldUnit);
            this.patternReferences[0].appendChild(newUnit);

            if(this.animations.has('cellsize')) newUnit.append(this.animations.get('cellsize'));

            const lineWidth = 5;
            const lines = 4;
            let spacing = (50 - lines * lineWidth) / (lines - 1);
            let command = '';
            for(let i = 0; i < lines; i++){
                const y = (lineWidth + spacing) * i;
                command += `M 0,${y} h ${50} v ${lineWidth} h ${-50} v ${-lineWidth} z `;
            }
            newUnit.setAttribute('d', command);

            newUnit.setAttribute('transform-origin', `${w_2} ${h_2}`)
            newUnit.setAttribute('transform', `scale(${calc_cellwidth / w_2} ${calc_cellheight / h_2}) rotate(${params.unitrot})`)
            newUnit.setAttribute('fill', 'black');
        }
        else if(params.unittype === 'custom') { // for custom unit?
            const oldUnit = this.patternReferences[0].firstChild;

            oldUnit.setAttribute('x', quart_cell_width); // range of value 10 and whatever the width stretches to must stay WITHIN pattern box
            oldUnit.setAttribute('y', quart_cell_height);
            oldUnit.setAttribute('width', half_cell_width);
            oldUnit.setAttribute('height', half_cell_height);
            oldUnit.setAttribute('transform-origin', `${half_cell_width} ${half_cell_height}`)
            oldUnit.setAttribute('transform', `scale(${calc_cellwidth / half_cell_width} ${calc_cellheight / half_cell_height}) rotate(${params.unitrot})`)
        }

        if(this.animationsDict.size > 0){
            for(const key of this.animationsDict.keys()){
                this.updateAnimatedParam(this.animationsDict.get(key));
            }
        }

        // update pattern spacing
        const dimension = Math.max(this.dimensions[0], this.dimensions[1]); // note this dimension is no sqrt, the gridpattern one does
        const pattern = this.patternReferences[0];
        const calc_dx = params.dx / (dimension * Math.SQRT2);
        const calc_dy = params.dy / (dimension * Math.SQRT2);

        pattern.setAttribute('width', calc_dx);
        pattern.setAttribute('height', calc_dy);
        pattern.setAttribute('viewBox', `0 0 ${params.dx} ${params.dy}`) // potentially use a viewbox to fix shape getting out of bounds


        // update element transforms for sx and sy
        const renderedElement1 = this.renderedElements[0];
        const sqrt2_w_factor = (dimension * Math.SQRT2 - this.dimensions[0]) / 2;
        const sqrt2_h_factor = (dimension * Math.SQRT2 - this.dimensions[1]) / 2;
        renderedElement1.setAttribute('transform', `translate(${params.sx - sqrt2_w_factor} ${params.sy - sqrt2_h_factor})`)

        // update element rotation
        const groupReference1 = this.groupReferences[0];
        groupReference1.setAttribute('transform', `rotate(${params.rotation} ${this.dimensions[0] / 2} ${this.dimensions[1] / 2})`);
    }

    updateAnimatedParam(currentAniParams) { // add or update
        const currentParam = currentAniParams.attributeName;
        const dur = currentAniParams.dur;
        const values = currentAniParams.values;
        const unitRect = this.patternReferences[0].children[0];
        const renderedElement1 = this.renderedElements[0];
        this.animationsDict.set(currentParam, currentAniParams)

        const half_cell_width = this.params.dx / 2; // pixels
        const half_cell_height = this.params.dy / 2; // pixels

        // for sx and sy update, must take sqrt2 factor required for rotation into consideration 
        const dimension = Math.max(this.dimensions[0], this.dimensions[1]);
        const sqrt2_w_factor = (dimension * Math.SQRT2 - this.dimensions[0]) / 2;
        const sqrt2_h_factor = (dimension * Math.SQRT2 - this.dimensions[1]) / 2;

        // care, when updating cellwidth or cellheight, we also need to recenter unitRect according to pattern grid unit bounding box
        if(currentParam === 'cellwidth'){
            const exists = this.animations.has(`cellsize`);

            let widthAnimation = exists ? 
                this.animations.get(`cellsize`) :
                document.createElementNS('http://www.w3.org/2000/svg', 'animateTransform');
            widthAnimation.setAttribute('attributeName', 'transform');
            widthAnimation.setAttribute('attributeType', 'XML');
            widthAnimation.setAttribute('type', 'scale');
            widthAnimation.setAttribute('additive', 'sum');

            const parsedWidthValues = values.split(';').map(parseFloat);
            this.animationRawValues.set('cellwidth', parsedWidthValues);
            const parsedHeightValues = this.animationRawValues.get('cellheight');
            const scaledValues = parsedWidthValues.map((rawwidth, i) => {
                return `${rawwidth / half_cell_width} ${(parsedHeightValues ? parsedHeightValues[i] : this.params.cellheight) / half_cell_height}`
            });
            widthAnimation.setAttribute('values', scaledValues.join(';'));
            widthAnimation.setAttribute('dur', dur);
            widthAnimation.setAttribute('repeatCount', 'indefinite');

            if(!exists){
                unitRect.appendChild(widthAnimation);
                this.animations.set(`cellsize`, widthAnimation);
            }
        }
        
        else if(currentParam === 'cellheight'){
            const exists = this.animations.has(`cellsize`);

            let heightAnimation = exists ? 
                this.animations.get(`cellsize`) :
                document.createElementNS('http://www.w3.org/2000/svg', 'animateTransform');
            heightAnimation.setAttribute('attributeName', 'transform');
            heightAnimation.setAttribute('attributeType', 'XML');
            heightAnimation.setAttribute('type', 'scale');
            heightAnimation.setAttribute('additive', 'sum');

            const parsedHeightValues = values.split(';').map(parseFloat);
            this.animationRawValues.set('cellheight', parsedHeightValues);
            const parsedWidthValues = this.animationRawValues.get('cellwidth');
            const scaledValues = parsedHeightValues.map((rawheight, i) => {
                return `${(parsedWidthValues ? parsedWidthValues[i] : this.params.cellwidth) / half_cell_width} ${rawheight / half_cell_height} `
            });
            heightAnimation.setAttribute('values', scaledValues.join(';'));
            heightAnimation.setAttribute('dur', dur);
            heightAnimation.setAttribute('repeatCount', 'indefinite');

            if(!exists){
                unitRect.appendChild(heightAnimation);
                this.animations.set(`cellsize`, heightAnimation);
            }
        }

        else if(currentParam === 'sx'){
            const exists = this.animations.has(`cellmove`);

            let slideAnimation = exists ? 
                this.animations.get(`cellmove`) :
                document.createElementNS('http://www.w3.org/2000/svg', 'animateTransform');
            slideAnimation.setAttribute('attributeName', 'transform');
            slideAnimation.setAttribute('attributeType', 'XML');
            slideAnimation.setAttribute('type', 'translate');
            // slideAnimation.setAttribute('additive', 'sum');

            const parsedSXValues = values.split(';').map(parseFloat);
            this.animationRawValues.set('sx', parsedSXValues);
            const parsedSYValues = this.animationRawValues.get('sy');
            const scaledValues = parsedSXValues.map((sx, i) => {
                return `${sx - sqrt2_w_factor} ${(parsedSYValues ? parsedSYValues[i] : this.params.sy) - sqrt2_h_factor}`
            });
            slideAnimation.setAttribute('values', scaledValues.join(';'));
            slideAnimation.setAttribute('dur', dur);
            slideAnimation.setAttribute('repeatCount', 'indefinite');

            if(!exists){
                renderedElement1.appendChild(slideAnimation);
                this.animations.set(`cellmove`, slideAnimation);
            }
        }

        else if(currentParam === 'sy'){
            const exists = this.animations.has(`cellmove`);

            let slideAnimation = exists ? 
                this.animations.get(`cellmove`) :
                document.createElementNS('http://www.w3.org/2000/svg', 'animateTransform');
            slideAnimation.setAttribute('attributeName', 'transform');
            slideAnimation.setAttribute('attributeType', 'XML');
            slideAnimation.setAttribute('type', 'translate');
            // slideAnimation.setAttribute('additive', 'sum');

            const parsedSYValues = values.split(';').map(parseFloat);
            this.animationRawValues.set('sy', parsedSYValues);
            const parsedSXValues = this.animationRawValues.get('sx');
            const scaledValues = parsedSYValues.map((sy, i) => {
                return `${(parsedSXValues ? parsedSXValues[i] : this.params.sx) - sqrt2_w_factor} ${sy - sqrt2_h_factor}`
            });
            slideAnimation.setAttribute('values', scaledValues.join(';'));
            slideAnimation.setAttribute('dur', dur);
            slideAnimation.setAttribute('repeatCount', 'indefinite');

            if(!exists){
                renderedElement1.appendChild(slideAnimation);
                this.animations.set(`cellmove`, slideAnimation);
            }
        }
    }

    // newestParamVersion is the params for a SINGLE SVG FILTER that is part of a FILTERED.INK FILTER
    // updateFilterCode is for imported custom units, don't need to call updateFilterCode
    swapRectWithImage(svgBlob, url, index, selectedFilterIndex, newestParamVersion, updateCode = true){
        
        svgBlob.text().then(output => {
            let parser = new DOMParser();
            let doc = parser.parseFromString(output, "image/svg+xml");
            let svgObject = doc.children[0];
            const new_id = makeid(6);
            svgObject.setAttribute('id', `unit-${new_id}`);

            // extract child nodes from svg and put it into g tag so we don't need to nest <svg> in another <svg>
            const group_inner = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            [...svgObject.children].forEach(child => {
                group_inner.appendChild(child);
            });

            const importedViewbox = svgObject.getAttribute('viewBox');
            if(importedViewbox){
                const bounds = importedViewbox.split(' ').map(parseFloat);
                group_inner.setAttribute('transform', `scale(${50 / bounds[2]} ${50 / bounds[3]})`);
                group_inner.setAttribute('viewBox', importedViewbox); // on refresh, this object becomes svgObject so we need to attach the OG viewbox
            }
            const s = new XMLSerializer();
            const svgCode = s.serializeToString(group_inner);
            this.params.customunit = group_inner;
            this.params.unittype = 'custom';
            
            const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            group.appendChild(group_inner);

            // replace rectangle unit for pattern with "svg" group
            const oldUnit = this.patternReferences[0].firstChild;
            this.patternReferences[0].removeChild(oldUnit);
            this.patternReferences[0].appendChild(group);
            
            group.setAttribute('transform', oldUnit.getAttribute('transform'));
            group.setAttribute('transform-origin', oldUnit.getAttribute('transform-origin'));
            
            // copy over animations to new "svg" unit
            this.animations.forEach((animation, key) => {
                if(key === 'cellsize'){ // only cell size animation transforms are applied to the unit shape
                    group.appendChild(animation)
                }
            });

            newestParamVersion.customunit = svgCode;
            newestParamVersion.unittype = 'custom';
            const code = JSON.stringify(newestParamVersion);
            if(updateCode) this.updateFilterCode(code, index, selectedFilterIndex);
        });
    }
}