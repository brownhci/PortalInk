export class SpringStabilizer {
    constructor(k = 0.4, z = 0.4){
        this.springConst = k;    // spring constant
        this.dampening = z;    // dampening factor

        this.dt = 1;
        this.m = 1;

        this.prevPoint = [-1, -1, -1];
        this.velocity = [0, 0, 0];
        this.position = [-1, -1, -1];
        this.collectedPoints = [];

        this.firstPoint = false;
        this.flag = 0;
    }

    startStroke(){
        this.firstPoint = true;
    } 

    continueStroke(point){
        if(this.firstPoint){
            this.prevPoint = point;
            this.velocity = [0, 0, 0];
            this.position = point;
            this.collectedPoints = [];

            this.flag = 0;
            this.firstPoint = false;
        }

        this.flag += 1;
        // if(this.flag % 2 === 0) return;

        let currPoint = point;

        let dx = [
            currPoint[0] - this.prevPoint[0],
            currPoint[1] - this.prevPoint[1],
            currPoint[3] - this.prevPoint[3],
        ];

        let accel = [
            this.springConst * dx[0] / this.m,
            this.springConst * dx[1] / this.m,
            0.9 * dx[2] / this.m
        ];
        
        this.velocity = [
            (this.velocity[0] + accel[0] * this.dt) * this.dampening,
            (this.velocity[1] + accel[1] * this.dt) * this.dampening,
            (this.velocity[2] + accel[2] * this.dt) * this.dampening,
        ];

        this.position = [
            this.position[0] + this.velocity[0] * this.dt,
            this.position[1] + this.velocity[1] * this.dt,
            currPoint[2],
            currPoint[3]
            // this.position[2] + this.velocity[2] * this.dt,
        ];

        this.prevPoint = this.position;
        this.collectedPoints.push(this.position);

        return this.position;
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