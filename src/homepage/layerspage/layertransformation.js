import { mat_compose, mat_inverse, mat_scale, mat_translate } from '../../util/matrix';

export default class LayerTransformation {
    constructor(depth=1){
        this.baseTranslate = [0, 0];
        this.baseScale = [1, 1];
        this.parallaxTranslate = [0, 0];
        this.parallaxScale = [1, 1];
        this.depth = depth;
    }

    calculateMatrix(){ 
        // TODO: build matrix manually for faster performance (?)
        // TODO: baseScale may not be necessary -- remove in future?

        // FOR TONGYU: currently the transformation scales (at origin) and then translates
        // - however, you might (?) need to translate then scale then scale again for parallax
        // - basically there are two translates (base/parallax) and two scaling (base/parallax)
        // - you can combine the various transformations as you see fit
        // - mat_compose starts from the right, i.e. matrix @ index=n-1 is applied first, matrix @ index=0 is applied last

        // const tx = this.baseTranslate[0] + this.parallaxTranslate[0];
        // const ty = this.baseTranslate[1] + this.parallaxTranslate[1];

        // const sx = Math.abs(this.baseScale[0]) * this.parallaxScale[0];
        // const sy = Math.abs(this.baseScale[1]) * this.parallaxScale[1];

        /*this.matrix = mat_compose(
            mat_translate(tx, ty),
            mat_scale(sx, sy),
        );*/
        this.matrix = mat_compose(
            //mat_scale(1, 1),
            
            mat_translate(this.parallaxTranslate[0], this.parallaxTranslate[1]),

            //mat_scale(sx, sy),
            mat_scale(this.parallaxScale[0], this.parallaxScale[1]),

            mat_translate(this.baseTranslate[0], this.baseTranslate[1]),

            mat_scale(this.baseScale[0], this.baseScale[1]),
        );

        this.inverseMatrix = mat_inverse(this.matrix);
    }

    changeBaseScale(nsx, nsy){
        this.baseScale = [nsx, nsy];
    }

    changeBaseTranslate(ntx, nty){
        this.baseTranslate = [ntx, nty];
    }

    changeParallaxScale(parallaxScale){
        this.parallaxScale = parallaxScale;
    }

    changeParallaxTranslate(parallaxTranslate){
        this.parallaxTranslate = parallaxTranslate;
    }

    relativeChangeParallaxScale(parallaxScale){
        this.parallaxScale = [this.parallaxScale[0] * parallaxScale[0], this.parallaxScale[1] * parallaxScale[1]];
    }

    relativeChangeParallaxTranslate(parallaxTranslate){
        this.parallaxTranslate = [this.parallaxTranslate[0] + parallaxTranslate[0], this.parallaxTranslate[1] + parallaxTranslate[1]];
    }

    changeDepth(d){
        this.depth = d;
    }

    getMatrixAttribute(){
        this.calculateMatrix();
        return `matrix(${this.matrix[0][0]} ${this.matrix[1][0]} ${this.matrix[0][1]} ${this.matrix[1][1]} ${this.matrix[0][2]} ${this.matrix[1][2]})`
    }

    getMatrix(recalc = true){
        if(recalc) this.calculateMatrix();
        return this.matrix;
    }

    getInverseMatrix(recalc = true){
        if(recalc) this.calculateMatrix();
        return this.inverseMatrix;
    }

    getSeparated(){
        return [
            ...this.baseTranslate,
            ...this.baseScale,
            ...this.parallaxTranslate,
            ...this.parallaxScale
        ];
    }

    temp(){
        return `translate(${this.baseTranslate.join(' ')})`;
    }
}