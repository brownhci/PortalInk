import React from 'react'
import FilterCard from './filtercard'

import './displaylist.css'

/**
 * Displays each filter list using a FilterCard
 */
class DisplayList extends React.Component {

    render() {
        if (this.props.list.length > 0) {
            return(
                <div id="list">
                    {this.props.list.map(
                        (filter, index) =>
                        <FilterCard
                            key={"filter-card-" + index +"_"+filter.filterID}
                            index={index}
                            changeFilterID={this.props.changeFilterID}
                            params={filter.params === undefined ? [] : filter.params}
                            id={filter.filterID}
                            addFilterSet={this.props.addFilterSet}
                            removeFilterSet={this.props.removeFilterSet}
                            changeSelectedFilter={this.props.changeSelectedFilter}
                            checked={filter.checked}
                            updateFilterCode={this.props.updateFilterCode}
                            addFilterToSet={this.props.addFilterToSet}
                            removeFilterFromSet={this.props.removeFilterFromSet}
                            updateFilterAnimation={this.props.updateFilterAnimation}
                            openDBDialog={this.props.openDBDialog}
                            filterPreview={this.props.filterPreview}
                            sendLog={this.props.sendLog}
                            refreshFilter={this.props.refreshFilter}
                            editDialogOpenIndex={this.props.editDialogOpenIndex}
                            openEditDialogAtIndex={this.props.openEditDialogAtIndex}
                            moveFilterPrimitivesToEnd={this.props.moveFilterPrimitivesToEnd}
                            listLength={this.props.list.length}
                            toggleFilterVisibility={this.props.toggleFilterVisibility}
                            allFilterIsVisible={this.props.allFilterIsVisible}
                            
                            patternSVGReferences={this.props.patternSVGReferences}
                            patternSVGPathReferences={this.props.patternSVGPathReferences}
                            patternSVGAnimators={this.props.patternSVGAnimators}
                            patternHandlers={this.props.patternHandlers}
                            maxDepth={this.props.maxDepth}>
                        </FilterCard>
                    )}
                </div>
            )
        } else {
            return(
                <div className="filter-helper-text">
                    <h3>Add filters here. Filters are visual effects for ink.</h3>
                    <p>Combine one or more primitives to produce unique texture, lighting, and animated effects.</p>
                </div>
            )
        }
    }
}

export default DisplayList