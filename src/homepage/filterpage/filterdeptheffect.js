import React from 'react'
import Button from '@material-ui/core/Button';
import LayersIcon from '@material-ui/icons/Layers';
import './filterdeptheffect.css'
import { isNumber, isString } from 'lodash';
import { hexToRgb } from '../util';

// chart adapted from https://stackoverflow.com/questions/43757979/chart-js-drag-points-on-linear-chart
var Chart = window.Chart
const controllableFilterParams = {
    feGaussianBlur: [{name: "stdDeviation", min: 0, max: 100, step: 20}],
    feMorphology: [{name: "radius", min: 0, max: 30, step: 1}],
    feDropShadow: [{name: "stdDeviation", min: 0, max: 25, step: 5}],
    feDisplacementMap: [{name: "scale", min: 0, max: 200, step: 20}],
    feFlood: [{name: "flood-color", min: 0, max: 255, step: 5}]
}

class FilterDepthEffect extends React.Component {
    constructor(props) {
        super(props)
        this.state = {
            depthEffectActive: this.props.selectedFilter.depthEffects !== undefined,
            currDatasetIndex: 0
        }
        this.myChart = null
        this.activePoint = null
        this.canvas = null
        this.doit = null
    }

    componentDidMount() {
        this.updateGraph()
    }

    updateGraph = () => {
        this.xVals = Array.from({ length: this.props.maxDepth + 1 }, (_, i) => i)
        if (this.props.selectedFilter.depthEffects) {
            let depthEffects = JSON.parse(this.props.selectedFilter.depthEffects)
            if (depthEffects.length < this.props.maxDepth + 1) {
                let newDepthEffects = depthEffects.concat(Array(this.props.maxDepth + 1 - depthEffects.length).fill(depthEffects[depthEffects.length -1]))
                this.props.updateDepthEffectHelper(this.props.selectedFilter, this.props.currDepthIndex, newDepthEffects)
            }
            this.restoreDepthGraph()
        }
    }

    componentDidUpdate() {
        if (this.activePoint === null) {
            var context = this
            clearTimeout(this.doit)
            this.doit = setTimeout(function () {
                context.updateGraph()
            }, 10)
        }
    }

    initializeDepthGraph(datasets) {
        var ctx = document.getElementById("depth-canvas").getContext("2d");
        this.canvas = document.getElementById("depth-canvas");
        var context = this
        this.myChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: this.xVals,
                datasets: datasets.map(dataset => ({
                    ...dataset,
                    steppedLine: 'before', // Set the line to step before points
                })),
            },
            options: {
                animation: { duration: 0 },
                tooltips: { mode: 'nearest' },
                scales: {
                    yAxes: datasets.map((dataset, index) => {
                        return {
                            ticks: {
                                suggestedMin: controllableFilterParams[context.props.selectedFilter.filterName][index].min,
                                suggestedMax: controllableFilterParams[context.props.selectedFilter.filterName][index].max,
                                stepSize: controllableFilterParams[context.props.selectedFilter.filterName][index].step,
                                display: false
                            }
                        } 
                    })
                },
                legend: {
                    onClick: function () { }, // prevent clicking on legend from removing dataset
                    display: false
                },
            }
        });
        // let move_handler = function (event) {
        //     // locate grabbed point in chart data
        //     if (context.activePoint != null) {
        //         var data = context.activePoint._chart.data;
        //         var datasetIndex = context.activePoint._datasetIndex;

        //         // read mouse position
        //         const helpers = Chart.helpers;
        //         var position = helpers.getRelativePosition(event, context.myChart);

        //         // convert mouse position to chart y axis value 
        //         var chartArea = context.myChart.chartArea;
        //         var yAxis = context.myChart.scales["y-axis-0"];
        //         var yValue = context.map(position.y, chartArea.bottom, chartArea.top, yAxis.min, yAxis.max);
        //         yValue = Math.round(yValue)
        //         yValue = Math.max(yValue, controllableFilterParams[context.props.selectedFilter.filterName][datasetIndex].min)
        //         yValue = Math.min(yValue, controllableFilterParams[context.props.selectedFilter.filterName][datasetIndex].max)

        //         // update y value of active data point
        //         data.datasets[datasetIndex].data[context.activePoint._index] = yValue;
        //         let label = controllableFilterParams[context.props.selectedFilter.filterName][datasetIndex].name
        //         context.props.updateDepthEffect(context.props.selectedFilter, context.activePoint._index, label, yValue)
        //         context.myChart.update();
        //     };
        // };

        // set pointer event handlers for canvas element
        context.canvas.onpointerdown = function (event) {
            // check for data point near event location
            const points = context.myChart.getElementAtEvent(event, { intersect: false });
            if (points.length > 0) {
                // grab nearest point, start dragging
                context.activePoint = points[0]
                var data = context.activePoint._chart.data
                var datasetIndex = context.activePoint._datasetIndex
                var pointBgColors = Array(data.datasets[datasetIndex].pointBackgroundColor.length).fill("lightgray")
                pointBgColors[context.activePoint._index] = "black"
                data.datasets[datasetIndex].pointBackgroundColor = pointBgColors
                context.myChart.update();
                // context.canvas.onpointermove = move_handler;

                context.setState({ currDatasetIndex: datasetIndex })
                context.props.updateCurrDepthIndex(context.activePoint._index)
                context.props.refreshPreview(null, context.activePoint._index)
            };
        };
        context.canvas.onpointerup = function (event) {
            // release grabbed point, stop dragging
            context.activePoint = null;
            context.canvas.onpointermove = null;
        };
        context.canvas.onpointermove = null;
    }

    // map value to other coordinate system
    map(value, start1, stop1, start2, stop2) {
        return start2 + (stop2 - start2) * ((value - start1) / (stop1 - start1))
    };

    updateDataPointValue(value) {
        this.activePoint = true
        this.myChart.data.datasets[this.state.currDatasetIndex].data[this.props.currDepthIndex] = this.parseDepthParams(value)
        this.myChart.update()
    }

    restoreDepthGraph() {
        let paramsForDepth = controllableFilterParams[this.props.selectedFilter.filterName]
        if (paramsForDepth) {
            let datasets = []
            let colors = Array(this.props.maxDepth + 1).fill("lightgray")
            colors[0] = "black"
            for (let i = 0; i < paramsForDepth.length; i++) {
                const data = JSON.parse(this.props.selectedFilter.depthEffects).map(x => this.parseDepthParams(x[paramsForDepth[i].name]))
                datasets.push(
                    {
                        data: data,
                        label: paramsForDepth[i].name,
                        borderColor: "lightgray",
                        pointBackgroundColor: colors,
                        fill: false
                    }
                )
            }
            this.initializeDepthGraph(datasets)
        }
    }

    enableDepthClicked() {
        this.props.makeDepthEffectsList(this.props.selectedFilter, () => {
            let paramsForDepth = controllableFilterParams[this.props.selectedFilter.filterName]
            if (paramsForDepth) {
                let datasets = []
                let colors = Array(this.props.maxDepth + 1).fill("lightgray")
                colors[0] = "black"
                for (let i = 0; i < paramsForDepth.length; i++) {
                    datasets.push(
                        {
                            data: Array(this.props.maxDepth + 1).fill(this.parseDepthParams(this.props.selectedFilter[paramsForDepth[i].name])),
                            label: paramsForDepth[i].name,
                            borderColor: "lightgray",
                            pointBackgroundColor: colors,
                            fill: false
                        }
                    )
                }
                this.initializeDepthGraph(datasets)
            }
        })
    }


    parseDepthParams(param) {
        if (isNumber(param)) {
            return param
        }
        else if (isString(param) && param[0] === "#") {
            let rgb = hexToRgb(param)
            return Math.round((rgb.red + rgb.green + rgb.blue) / 3)
        }
    }

    removeDepthClicked() {
        this.props.removeDepthEffect(this.props.selectedFilter)
    }

    hasAnimation() {
        return this.props.selectedFilter.animation && this.props.selectedFilter.animation !== "{}"
    }

    render() {
        if (controllableFilterParams[this.props.selectedFilter.filterName]) {
            return (
                <div>
                {
                    this.props.selectedFilter.depthEffects ?
                        <div className='dialog-content'>
                            <div>
                                <canvas id="depth-canvas" height="100"></canvas>
                            </div>
                            <Button variant="outlined" size="small" onClick={() => this.removeDepthClicked()} startIcon={<LayersIcon style={{ fontSize: 15 }} />}
                                style={{ fontSize: '0.65rem', padding: '1px 7px' }}>
                                Remove Depth Effect
                            </Button>
                        </div> :
                        <div className='dialog-content'>
                            <Button disabled={this.hasAnimation()} variant="outlined" size="small" onClick={() => this.enableDepthClicked()} startIcon={<LayersIcon style={{ fontSize: 15 }} />}
                                style={{ fontSize: '0.65rem', padding: '1px 7px' }}>
                                Enable Depth Effect
                            </Button>
                        </div>
                }
                </div>
            )
        }
        else {
            return (
                <div></div>
            )
        }
    }
}

export default FilterDepthEffect