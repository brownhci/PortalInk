import { setParameter, loadCanvas, getPath, process } from '../stabilizers/potrace-offscreen';
import { mat_apply, mat_scale, mat_translate, mat_compose, mat_inverse } from '../../util/matrix'

console.log("potrace webworker online!")

// eslint-disable-next-line no-restricted-globals
self.onmessage = (message) => {
    const data = message.data;
    const bWidth = data.bWidth, bHeight = data.bHeight;
    const bufferCanvas = new OffscreenCanvas(bWidth, bHeight);
    const bctx = bufferCanvas.getContext('2d');

    const id = data.id;
    const coord = data.coord; // viewbox coord
    const coords = data.coords; // path coords
    const scaleFactorX = data.scaleFactorX;
    const scaleFactorY = data.scaleFactorY;
    const filterResCorrection = data.filterResCorrection; // when importing this value is wrong!!!
    const isImported = data.bounds.length !== 0;
    const bounds = isImported ? data.bounds : [[0, 0], [0, 0]];
    const vbox = data.vbox;
    const zoom = data.zoom;
    const layerTransform = data.layerTransform;
    const inverseLayerTransform = mat_inverse(layerTransform);
    const isPolylineFormat = data.isPolylineFormat;
    const lineWidth = data.lineWidth;

    const cbounds = bounds.map(point => { // bounds in current canvas space
        return [
            point[0] / filterResCorrection / zoom,
            point[1] / filterResCorrection / zoom,
        ];
    });
    const centerX = (cbounds[1][0] + cbounds[0][0]) / 2 ;
    const centerY = (cbounds[1][1] + cbounds[0][1]) / 2 ;

    const vbox_left = vbox[0]; // canvas space
    const vbox_top = vbox[1];

    const shiftX = (vbox_left) - centerX - coord[0];
    const shiftY = (vbox_top) - centerY - coord[1];

    // given coordinates in path space and we want screen space (buffer canvas)
    // transformation: P -> S
    const pSP = isImported ? mat_compose(
        mat_translate(bufferCanvas.width / 2, bufferCanvas.height / 2),                         // translate to screen center     
        mat_scale(scaleFactorX * filterResCorrection, scaleFactorY * filterResCorrection),      // scale in to fill screen, upscale + canvas to screen space
        mat_translate(shiftX, shiftY),                                                          // shift path to center of screen
        mat_scale(1 / zoom / filterResCorrection),                                              // scale out from path space to canvas space (origin)
    ) 
    : mat_compose(
        mat_translate(bufferCanvas.width / 2 * scaleFactorX, bufferCanvas.height / 2 * scaleFactorY),       // translate to screen center     
        mat_scale(scaleFactorX, scaleFactorY),                                                              // scale in to fill screen, upscale + canvas to screen space
        
        mat_translate(                                                                                      // shift path to center of screen
            -coord[0],  // consider layer offset as well
            -coord[1]
        ),        
        layerTransform,                                          
        mat_scale(1 / filterResCorrection),      // path to canvas space
    );

    /*bctx.fillStyle = 'white';
        bctx.fillRect(0, 0, bWidth, bHeight);
    
        for(let i = 0; i < coords.length; i += 2){
            let [x, y] = mat_apply(pSP, [coords[i], coords[i + 1]]);
            bctx.lineTo(x, y);
        }
    
        bctx.closePath();
        bctx.fillStyle = 'black';
        bctx.fill();*/

    // assumes coordinates are in path-ready form
    if(!isPolylineFormat){
        bctx.fillStyle = 'white';
        bctx.fillRect(0, 0, bWidth, bHeight);
    
        for(let i = 0; i < coords.length; i += 2){
            let [x, y] = mat_apply(pSP, [coords[i], coords[i + 1]]);
            bctx.lineTo(x, y);
        }
    
        bctx.closePath();
        bctx.fillStyle = 'black';
        bctx.fill();
    } 
    // assumes coordinates are in old polyline form
    else {
        bctx.fillStyle = 'white';
        bctx.fillRect(0, 0, bWidth, bHeight);
    
        bctx.lineCap = "round";
        bctx.beginPath();
        for(let i = 0; i < coords.length; i += 2){
            let [x, y] = mat_apply(pSP, [coords[i], coords[i + 1]]);
            bctx.lineTo(x, y);
        }
    
        bctx.strokeStyle = 'black';
        bctx.lineWidth = lineWidth;
        bctx.stroke();
    }
    

    setParameter({
        turnpolicy: "minority",
        turdsize: 1,
        optcurve: true,
        alphamax: 4,
        opttolerance: 1
    });

    loadCanvas(bufferCanvas, () => {
        // given coordinates in screen space (buffer canvas) and we want path space
        // transformation: S -> P, inverse of P -> S
        const pPS1 = isImported ? mat_compose(
            mat_scale(filterResCorrection * zoom),
            mat_translate(-shiftX, -shiftY),
            mat_scale(1 / scaleFactorX / filterResCorrection, 1 / scaleFactorY / filterResCorrection),
            mat_translate(-bufferCanvas.width / 2, -bufferCanvas.height / 2),
        )
        : mat_compose(
            mat_scale(filterResCorrection),  
            inverseLayerTransform,   
            mat_translate(                                                                                  // shift path to center of screen
                coord[0], 
                coord[1]
            ),       
                                                      
            mat_scale(1 / scaleFactorX, 1 / scaleFactorY),                                                  // scale in to fill screen, upscale + canvas to screen space
            mat_translate(-bufferCanvas.width / 2 * scaleFactorX, -bufferCanvas.height / 2 * scaleFactorY), // translate to screen center
        );

        process(() => {
            let pathCommand = getPath(
                (x) => {
                    const n = mat_apply(pPS1, [x, 0])[0];
                    const truncN = n.toFixed(2);
                    return truncN;
                },
                (y) => {
                    const n = mat_apply(pPS1, [0, y])[1];
                    const truncN = n.toFixed(2);
                    return truncN;
                }
            );

            // eslint-disable-next-line no-restricted-globals
            self.postMessage({
                id: id,
                res: pathCommand
            });
        });
    });
};