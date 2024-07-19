import React from 'react'
import { Card } from '@material-ui/core';
import './colorpalette.css';
import PaletteIcon from '@material-ui/icons/Palette';

export class CustomColor {
    constructor(rgb){
        this.rgb = rgb ? rgb : [0, 0, 0];
        this.hasColor = rgb ? true : false;
    }

    setHex(hexcode){
        const r = parseInt(hexcode.slice(1, 3), 16);
        const g = parseInt(hexcode.slice(3, 5), 16);
        const b = parseInt(hexcode.slice(5, 7), 16);
        this.rgb = [r, g, b];
        this.hasColor = true;
    }

    getHex(){
        if(this.hasColor) return '#' + this.rgb.map(c => c.toString(16).padStart(2, '0')).join('');
        else return '#ffffff';
    }

    clear(){
        this.rgb = undefined;
        this.hasColor = false;
    }
}

export class ColorPalette extends React.Component {
    constructor(props){
        super(props);

        this.width = 3;
        this.height = 10;

        this.state = {
            colorArray: this.props.colorArray
        };

        this.dragging = false;
        this.cachedOffset = [0, 0];
        this.previousOffset = [0, 0];

        document.addEventListener('mousemove', (e) => {
            if(!this.dragging) return;
            const dialog = document.querySelector('.palette-card');
            const ds = dialog.style;
            const nx = e.clientX;
            const ny = e.clientY;

            const px = `${(ny - this.cachedOffset[1]) + this.previousOffset[1]}px`;
            const py = `${nx - this.cachedOffset[0] + this.previousOffset[0]}px`;
            ds.translate = `${py} ${px}`;
        });
        document.addEventListener('mouseup', () => {
            if(this.dragging) this.dragging = false;
        });
    }

    componentDidMount(){
        this.setColor = this.setColor.bind(this);
        this.clearColorPalette = this.clearColorPalette.bind(this);
    }

    setColor(color, i, j){
        const newColors = this.state.colorArray;
        newColors[i][j].setHex(color);
        this.setState({colorArray: newColors})

        this.props.serializeToString(); // save the color palette
    }

    colorClicked(color, i, j){
        if(color.hasColor){
            this.props.changeColor(color.getHex(), true); // true so function doesn't call .hex
        } else {
            this.setColor(this.props.currColor, i, j);
        }
    }

    clearColorPalette(cb){
        this.setState({
            colorArray: (() => {
                const createEmptyColor = () => new CustomColor();
                const colorArray = new Array(10).fill(0);   // number of rows
                colorArray.forEach((_, i) => colorArray[i] = new Array(3).fill(0).map(_ => createEmptyColor())); // number of columns
                return colorArray;
            })()
        }, () => {
            if(cb) cb();
        });
    }

    render(){
        return (<Card className='palette-card'>
            <div 
                className='palette-handle'
                onPointerDown={(e) => {
                    this.dragging = true;
                    this.cachedOffset = [
                        e.clientX,
                        e.clientY
                    ];

                    const dialog = document.querySelector('.palette-card');
                    const ds = dialog.style;
                    this.previousOffset = ds.translate.split(' ').map(s => parseFloat(s.slice(0, -2)));
                    if(isNaN(this.previousOffset[0])) this.previousOffset = [0, 0];
                }}>
                <div className='palette-handle-line'></div>
                <div className='palette-handle-line'></div>
            </div>
            <div className='color-rows-container' onContextMenu={(e) => e.preventDefault()}>
                <div style={{textAlign: "center", color: "gray"}}><PaletteIcon size="small"/></div>
                {this.state.colorArray.map((row, i) => {
                    return (<div className='color-row' key={`r-${i}`}>
                        {row.map((color, j) => {
                            return (<div 
                                className='color-icon'
                                style={color.hasColor ? {backgroundColor: color.getHex()} : {
                                    backgroundImage: 'linear-gradient(45deg, #cccccc 25%, transparent 25%), linear-gradient(-45deg, #cccccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #cccccc 75%), linear-gradient(-45deg, transparent 75%, #cccccc 75%)',
                                    backgroundSize: '18px 18px',
                                    backgroundPosition: '0 0, 0 9px, 9px -9px, -9px 0px'
                                }} 
                                key={`c-${i}-${j}`}
                                onContextMenu={(e) => {
                                    // only fires with right click
                                    const newColors = this.state.colorArray;
                                    newColors[i][j].clear();
                                    this.setState({colorArray: newColors})
                                    return;
                                }}
                                onClick={(e) => {
                                    // only fires with left click
                                    this.colorClicked(color, i, j);
                                }}>
                            </div>)
                        })}
                    </div>)
                })}
            </div>
        </Card>);
    }
}