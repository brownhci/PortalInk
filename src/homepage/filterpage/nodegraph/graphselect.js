import React from 'react';
import { forwardRef } from 'react';
import { useStoreState, useStoreActions } from 'react-flow-renderer';
import Hotkeys from 'react-hot-keys'

export const GraphSelect = forwardRef((props,ref) => {

  const setSelectedElements = useStoreActions((actions) => actions.setSelectedElements)
  const selectedElements = useStoreState((state) => state.selectedElements)

  const deleteNode = () => {
    if (selectedElements !== null) {
      props.onElementsRemove(selectedElements)
    }
  }

  const duplicateNode = () => {
    if (selectedElements !== null) {
      props.duplicateElement(selectedElements);
    }
  }

  // const switchBranch = () => {
  //   if (selectedElements !== null) {
  //     props.switchActiveBranch(selectedElements)
  //   }
  // }

  const selectElement = (element) => {
    setSelectedElements(element)
  }

  ref.current = selectElement

  return (
    <Hotkeys
      keyName={"delete"}
      onKeyDown={deleteNode}>
    <div id="node-graph-topbar" style={{display: 'flex', flexDirection: 'column'}} className='flex-row'>
      {/* <div className="button-outlined node-graph-btn" onClick={switchBranch}>switch active branch</div> */}
      <div className="button-outlined node-graph-btn delete-btn" onClick={deleteNode}>Delete Primitive</div>
      <div className="button-outlined node-graph-btn" onClick={duplicateNode} style={{marginTop: '4px'}}>Clone Primitive</div>
    </div>
    </Hotkeys>
  )
})