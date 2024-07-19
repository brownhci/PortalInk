export class NoneStabilizer {
    constructor(){
        this.collectedPoints = [];
        this.firstPoint = false;
    }

    startStroke(){
        this.firstPoint = true;
    } 

    continueStroke(point){
        if(this.firstPoint){
            this.collectedPoints = [];
            this.firstPoint = false;
        }

        this.collectedPoints.push(point);
    }

    getStrokePoints(){
        return this.collectedPoints;
    }

    getLastPoint(){
        return this.collectedPoints[this.collectedPoints.length - 1];
    }

    popLastPoint(){
        this.collectedPoints.pop();
    }

    endStroke(){

    }
}