const SVG = 'http://www.w3.org/2000/svg';

export const createGridPattern2 = (params, id, defs, dimensions) => {
    let counter = 0;
    
    let dimension = Math.max(dimensions[0], dimensions[1]) * Math.SQRT2;
    const sqrt2_w_factor = (dimension - dimensions[0]) / 2;
    const sqrt2_h_factor = (dimension - dimensions[1]) / 2;
    
    let calc_dx = params.dx / dimension;
    let calc_dy = params.dy / dimension;

    let calc_cellwidth = params.cellwidth;
    let calc_cellheight = params.cellheight;
    let calc_xalternatingoffset = params.xalternatingoffset;
    while(calc_xalternatingoffset >= params.dx) calc_xalternatingoffset -= params.dx;

    const basePattern = document.createElementNS(SVG, 'pattern');
    basePattern.setAttribute('width', calc_dx);
    basePattern.setAttribute('height', calc_dy);
    basePattern.setAttribute('id', id + "_" + counter);
    basePattern.setAttribute('viewBox', `0 0 ${params.dx} ${params.dy}`) // potentially use a viewbox to fix shape getting out of bounds

    const w_2 = params.dx / 2; 
    const h_2 = params.dy / 2;
    const w_4 = params.dx / 4;
    const h_4 = params.dy / 4; 
    const w_8 = params.dx / 8;
    const h_8 = params.dy / 8; 

    if(params.unittype === 'square'){
        const rect = document.createElementNS(SVG, 'rect');
        const quart_cell_width = params.dx / 4; // pixels
        const quart_cell_height = params.dy / 4; // pixels
        const half_cell_width = params.dx / 2; // pixels
        const half_cell_height = params.dy / 2; // pixels
        rect.setAttribute('x', quart_cell_width); // range of value 10 and whatever the width stretches to must stay WITHIN pattern box
        rect.setAttribute('y', quart_cell_height);
        rect.setAttribute('width', half_cell_width);
        rect.setAttribute('height', half_cell_height);
        rect.setAttribute('transform-origin', `${half_cell_width} ${half_cell_height}`)
        rect.setAttribute('transform', `scale(${calc_cellwidth / half_cell_width} ${calc_cellheight / half_cell_height}) rotate(${params.unitrot})`)
        rect.setAttribute('fill', 'black');
        basePattern.appendChild(rect);
    } 
    else if(params.unittype === 'circle'){
        const circle = document.createElementNS(SVG, 'ellipse');
        circle.setAttribute('cx', w_2); 
        circle.setAttribute('cy', h_2);
        circle.setAttribute('rx', w_4);
        circle.setAttribute('rx', h_4);
        circle.setAttribute('transform-origin', `${w_2} ${h_2}`)
        circle.setAttribute('transform', `scale(${calc_cellwidth / w_2} ${calc_cellheight / h_2}) rotate(${params.unitrot})`)
        circle.setAttribute('fill', 'black');
        basePattern.appendChild(circle);
    }
    else if(params.unittype === 'triangle') {
        const triangle = document.createElementNS(SVG, 'path');
        triangle.setAttribute('d', `
            M${w_2} ${h_2 + (-h_4 + h_8)},
            L${w_2 + w_4*Math.sqrt(3)/2} ${h_2 + (h_4/2 + h_8)},
            L${w_2 - w_4*Math.sqrt(3)/2} ${h_2 + (h_4/2 + h_8)},
            L${w_2} ${h_2 + (-h_4 + h_8)},
        `);
        triangle.setAttribute('transform-origin', `${w_2} ${h_2}`)
        triangle.setAttribute('transform', `scale(${calc_cellwidth / w_2} ${calc_cellheight / h_2}) rotate(${params.unitrot})`)
        triangle.setAttribute('fill', 'black');
        basePattern.appendChild(triangle);
    } 
    else if(params.unittype === 'star'){
        const star = document.createElementNS(SVG, 'path');
        star.setAttribute('d', `
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
        star.setAttribute('transform-origin', `${w_2} ${h_2}`)
        star.setAttribute('transform', `scale(${calc_cellwidth / w_2} ${calc_cellheight / h_2}) rotate(${params.unitrot})`)
        star.setAttribute('fill', 'black');
        basePattern.appendChild(star);
    }
    else if(params.unittype === 'hexagon'){
        const hexagon = document.createElementNS(SVG, 'path');
        const S3 = Math.sqrt(3) / 1.5;
        hexagon.setAttribute('d', `
            M${w_2 - w_8 * S3} ${h_4},
            L${w_2 + w_8 * S3} ${h_4},
            L${w_2 + 2 * w_8 * S3} ${h_2},
            L${w_2 + w_8 * S3} ${h_2 + h_4},
            L${w_2 - w_8 * S3} ${h_2 + h_4},
            L${w_2 - 2 * w_8 * S3} ${h_2},
            L${w_2 - w_8 * S3} ${h_4},
        `);
        hexagon.setAttribute('transform-origin', `${w_2} ${h_2}`)
        hexagon.setAttribute('transform', `scale(${calc_cellwidth / w_2} ${calc_cellheight / h_2}) rotate(${params.unitrot})`)
        hexagon.setAttribute('fill', 'black');
        basePattern.appendChild(hexagon);
    }
    else if(params.unittype === 'hatches'){
        const hatches = document.createElementNS(SVG, 'path');

        const lineWidth = 5;
        const lines = 4;
        let spacing = (50 - lines * lineWidth) / (lines - 1);
        let command = '';
        for(let i = 0; i < lines; i++){
            const y = (lineWidth + spacing) * i;
            command += `M 0,${y} h ${50} v ${lineWidth} h ${-50} v ${-lineWidth} z`;
        }
        /*
        const lineWidth = 4;
        const lines = 4;
        let spacing = (25 - lines * lineWidth) / (lines - 1);
        let command = '';
        for(let i = 0; i < lines; i++){
            const y = (lineWidth + spacing) * i;
            command += `M 12.5,${y + 12.5} h ${25} v ${lineWidth} h ${-25} v ${-lineWidth} z`;
        }*/
        hatches.setAttribute('d', command);

        hatches.setAttribute('transform-origin', `${w_2} ${h_2}`)
        hatches.setAttribute('transform', `scale(${calc_cellwidth / w_2} ${calc_cellheight / h_2}) rotate(${params.unitrot})`)
        hatches.setAttribute('fill', 'black');
        basePattern.appendChild(hatches);
    }
    else if(params.unittype === 'custom'){ // just use default rectangle
        const rect = document.createElementNS(SVG, 'rect');
        const quart_cell_width = params.dx / 4; // pixels
        const quart_cell_height = params.dy / 4; // pixels
        const half_cell_width = params.dx / 2; // pixels
        const half_cell_height = params.dy / 2; // pixels
        rect.setAttribute('x', quart_cell_width); // range of value 10 and whatever the width stretches to must stay WITHIN pattern box
        rect.setAttribute('y', quart_cell_height);
        rect.setAttribute('width', half_cell_width);
        rect.setAttribute('height', half_cell_height);
        rect.setAttribute('transform-origin', `${half_cell_width} ${half_cell_height}`)
        rect.setAttribute('transform', `scale(${calc_cellwidth / half_cell_width} ${calc_cellheight / half_cell_height}) rotate(${params.unitrot})`)
        rect.setAttribute('fill', 'black');
        basePattern.appendChild(rect);
    } 

    defs.appendChild(basePattern);

    const group = document.createElementNS(SVG, 'g');
    group.setAttribute('width', dimension);
    group.setAttribute('height', dimension);
    group.setAttribute('id', id);
    group.setAttribute('transform', `rotate(${params.rotation} ${dimensions[0] / 2} ${dimensions[1] / 2})`);

    const renderedElement = document.createElementNS(SVG, 'path');
    renderedElement.setAttribute('d', `M 0 0,l ${dimension} 0,l 0 ${dimension},l -${dimension} 0,l 0 -${dimension}`);
    renderedElement.setAttribute('fill', `url(#${id + "_" + counter})`);
    renderedElement.setAttribute('transform', `translate(${params.sx - sqrt2_w_factor} ${params.sy - sqrt2_h_factor})`)

    // no setAttribute translate because on initialization, translate = 0, 0
    group.appendChild(renderedElement);

    defs.appendChild(group);

    return {
        groupReferences: [group],
        patternReferences: [basePattern],
        renderedElements: [renderedElement]
        // renderedElements: [renderedElement, renderedElement2]
    };
}