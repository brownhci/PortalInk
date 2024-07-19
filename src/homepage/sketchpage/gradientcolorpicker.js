import React from 'react'
import reactCSS from 'reactcss'
import { SketchPicker } from 'react-color'
import FormControl from '@material-ui/core/FormControl';

export class GradientColorPicker extends React.Component {
    state = {
        displayColorPicker: false
    };

    handleClick = () => {
        this.setState({ displayColorPicker: !this.state.displayColorPicker })
    };

    handleClose = () => {
        this.setState({ displayColorPicker: false })
    };

    handleChange = (color) => {
        this.props.changeColor(color)
    };

    render() {
        const styles = reactCSS({
            'default': {
                color: {
                    width: '36px',
                    height: '30px',
                    borderRadius: '2px',
                    background: `${this.props.color}`,
                },
                swatch: {
                    padding: '5px',
                    background: '#fff',
                    borderRadius: '1px',
                    boxShadow: '0 0 0 1px rgba(0,0,0,.1)',
                    display: 'inline-block',
                    cursor: 'pointer'
                },
                popover: {
                    position: 'absolute',
                    zIndex: '2',
                },
                cover: {
                    position: 'fixed',
                    top: '0px',
                    right: '0px',
                    bottom: '0px',
                    left: '0px',
                },
                label: {
                    fontSize: '12px',
                    fontFamily: "-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif,Apple Color Emoji,Segoe UI Emoji,Segoe UI Symbol", 
                    color: "gray",
                    paddingBottom: '7px',
                    paddingLeft: '5px',
                    fontWeight: '400',
                    LineHeight: '1'
                }
            },
        });

        return (
            <span style={styles.main}>
                <FormControl>
                    <div style={styles.swatch} onClick={this.handleClick}>
                        <div style={styles.color} />
                    </div>
                </FormControl>
                {this.state.displayColorPicker ? <div style={styles.popover}>
                    <div style={styles.cover} onClick={this.handleClose} />
                    <SketchPicker color={this.props.color} onChange={this.handleChange} className="gradient-color-picker-display"/>
                </div> : null}
            </span>

        )
    }
}
