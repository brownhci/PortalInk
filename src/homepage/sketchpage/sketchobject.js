export default class SketchObject {
    /**
   * @param {object} obj - the object contained in this wrapper
   * @param {string} type - string indicate the type of sketch object (path, layer)
   * @param {string} operation - string indicate the type of operation that was done to the object (draw path, add layer, remove layer, etc.)
   * @param {object} helperParams - a dictionary of helper parameters to store in order to help with undo/redo
   */
    constructor(object, type, operation, helperParams={}) {
        this.obj = object
        this.type = type
        this.operation = operation
        this.helperParams = helperParams
    }

    isPath() {
        return this.type === "path"
    }

    isLayer() {
        return this.type === "layer"
    }

    undo(layerspageRef, sketchRef, sketchGroup) {
        if (this.isLayer()) { // undo a layer operation
            let targetLayer = this.obj
            if (this.operation === "add layer") {
                let parent = document.getElementById(targetLayer.node.id).parentElement
                targetLayer.remove()
                sketchRef.currentLayer = parent.children[parent.children.length - 1].instance
                layerspageRef.redoLayerDelete(this.helperParams.index)
            }
            else if (this.operation === "delete layer") {
                sketchGroup.add(targetLayer)
                sketchRef.reorderSVGGroup(targetLayer.node.id, sketchGroup.node.children.length-1, this.helperParams.index)
                layerspageRef.undoLayerDelete(targetLayer, this.helperParams.index)
            }
            else if (this.operation === "reorder layer") {
                sketchRef.reorderSVGGroup(targetLayer.node.id, this.helperParams.newIndex, this.helperParams.oldIndex, this.helperParams.oldDepth)
                layerspageRef.undoRedoLayerReorder(this.helperParams.newIndex, this.helperParams.oldIndex, this.helperParams.oldDepth)
            }   
            else if (this.operation === "merge layer") {
                sketchGroup.add(this.helperParams.fromLayer)
                let fromLayerIndex = this.helperParams.mergeDown ? this.helperParams.finalIndex + 1 : this.helperParams.finalIndex
                sketchRef.reorderSVGGroup(this.helperParams.fromLayer, sketchGroup.node.children.length-1, fromLayerIndex)
                sketchRef.separateSVGGroup(this.helperParams.mergeDown, targetLayer, this.helperParams.fromLayer, this.helperParams.fragmentLength)
                layerspageRef.undoLayerDelete(this.helperParams.fromLayer, fromLayerIndex)
            }
            else if (this.operation === "translate layer") {
                const offset = this.helperParams.relativeTranslate;
                const name = this.helperParams.layerName;
                layerspageRef.translateLayer(name, -offset[0], -offset[1]);
            }
        }
        else if (this.isPath()) { // undo a path operation
          let targetPath = this.obj
          if (targetPath.logging.status === 2 && !targetPath.logging.rendered && targetPath.logging.erased) { // undo erase
            targetPath.addToGroup(targetPath.layer)
            let portalID = targetPath.svgPath.node.id
            let waypointID = targetPath.svgPath.node.getAttribute("waypointID")
            if (waypointID) {
              let depth = targetPath.layer.node.getAttribute("depth")
              depth = depth ? depth : 1
              sketchRef.sketchPageRef.addToDepthToTeleportationMap(depth, portalID, waypointID)
              sketchRef.sketchPageRef.waypointRef.current.addPortalID(waypointID, portalID)
              let svgPathSplitByM = targetPath.svgPath.node.getAttribute("d").split("M")
              sketchRef.addPortalPreview(targetPath.layer.node, targetPath.svgPath.node, waypointID, svgPathSplitByM)
            }
            if (targetPath.gradientCollection) targetPath.after(targetPath.gradientCollection)
          }
          else if (targetPath.logging.rendered && targetPath.movedFrom !== null && !targetPath.movedFrom.logging.rendered) { //undo move
            targetPath.remove(3)
            targetPath.movedFrom.addToGroup(targetPath.layer)
            if (targetPath.movedFrom.previousPolyline === undefined) {
              targetPath.movedFrom.svgPath.back()
            }
            else {
              targetPath.movedFrom.previousPolyline.after(targetPath.movedFrom.svgPath)
            }

            // undo path move is a portal?
            let waypointID = targetPath.svgPath.node.getAttribute("waypointID")
            if (waypointID) {
              let portalID = targetPath.svgPath.node.id
              sketchRef.sketchPageRef.removeFromDepthToTeleportationMap([portalID], false)
              sketchRef.sketchPageRef.waypointRef.current.removePortalID(waypointID, portalID)
              sketchRef.removePortalPreview(targetPath.layer.node, portalID)

              let portalIDMovedFrom = targetPath.movedFrom.svgPath.node.id
              let depth = targetPath.movedFrom.layer.node.getAttribute("depth")
              depth = depth ? depth : 1
              sketchRef.sketchPageRef.addToDepthToTeleportationMap(depth, portalIDMovedFrom, waypointID)
              sketchRef.sketchPageRef.waypointRef.current.addPortalID(waypointID, portalIDMovedFrom)
              let svgPathSplitByM = targetPath.movedFrom.svgPath.node.getAttribute("d").split("M")
              sketchRef.addPortalPreview(targetPath.movedFrom.layer.node, targetPath.movedFrom.svgPath.node, waypointID, svgPathSplitByM)
            }
    
            // undo color? missing undo color logic unless it's meant to overlap with move
            // when undoing color, got to be careful because it clones the target path and so there's two different gradient collections
            if(targetPath.movedFrom.gradientCollection) targetPath.movedFrom.svgPath.after(targetPath.movedFrom.gradientCollection);
          }
          else { //undo draw
            let portalID = targetPath.svgPath.node.id
            let waypointID = targetPath.svgPath.node.getAttribute("waypointID")
            if (waypointID) {
              sketchRef.sketchPageRef.removeFromDepthToTeleportationMap([portalID], false)
              sketchRef.sketchPageRef.waypointRef.current.removePortalID(waypointID, portalID)
              sketchRef.removePortalPreview(targetPath.layer.node, portalID)
            }
            targetPath.remove(2)
          }
        }
        return this.operation
    }

    redo(layerspageRef, sketchRef, sketchGroup) {
        if (this.isLayer()) { // redo layer delete
            let targetLayer = this.obj
            if (this.operation === "add layer") {
                sketchGroup.add(targetLayer)
                sketchRef.reorderSVGGroup(targetLayer.node.id, sketchGroup.node.children.length-1, this.helperParams.index)
                layerspageRef.undoLayerDelete(targetLayer, this.helperParams.index)
            }
            else if (this.operation === "delete layer") {
                let parent = document.getElementById(targetLayer.node.id).parentElement
                targetLayer.remove()
                sketchRef.currentLayer = parent.children[parent.children.length - 1].instance
                layerspageRef.redoLayerDelete(this.helperParams.index)
            }
            else if (this.operation === "reorder layer") {
                sketchRef.reorderSVGGroup(targetLayer.node.id, this.helperParams.oldIndex, this.helperParams.newIndex, this.helperParams.newDepth)
                layerspageRef.undoRedoLayerReorder(this.helperParams.oldIndex, this.helperParams.oldIndex, this.helperParams.newDepth)
            }
            else if (this.operation === "merge layer") {
                let fromIndex = this.helperParams.mergeDown ? this.helperParams.finalIndex + 1 : this.helperParams.finalIndex
                let toIndex = this.helperParams.mergeDown ? this.helperParams.finalIndex : this.helperParams.finalIndex + 1
                sketchRef.mergeSVGGroup(this.helperParams.fromLayer.node.id, fromIndex, toIndex)
                layerspageRef.redoLayerDelete(fromIndex)
            }
            else if (this.operation === "translate layer") {
              const offset = this.helperParams.relativeTranslate;
              const name = this.helperParams.layerName;
              layerspageRef.translateLayer(name, offset[0], offset[1]);
            }
            else if (this.operation === "scale layer") {
              const offset = this.helperParams.relativeTranslate;
              const name = this.helperParams.layerName;
              layerspageRef.scaleLayer(name, offset[0]);
            }
        }
        else if (this.isPath()) {
            let targetPath = this.obj
            if (targetPath.logging.rendered && targetPath.logging.erased) { // redo erase
              let portalID = targetPath.svgPath.node.id
              let waypointID = targetPath.svgPath.node.getAttribute("waypointID")
              if (waypointID) {
                sketchRef.sketchPageRef.removeFromDepthToTeleportationMap([portalID], false)
                sketchRef.sketchPageRef.waypointRef.current.removePortalID(waypointID, portalID)
                sketchRef.removePortalPreview(targetPath.layer.node, portalID)
              }
              targetPath.remove()
            }
            else if (!targetPath.logging.rendered && targetPath.movedFrom !== null && targetPath.movedFrom.logging.rendered) { //redo move
              targetPath.addToGroup(targetPath.layer) 
              if (targetPath.previousPolyline === undefined) {
                targetPath.svgPath.back()
              }
              else {
                targetPath.previousPolyline.after(targetPath.svgPath)
              }

              // redo path move is a portal?
              let waypointID = targetPath.svgPath.node.getAttribute("waypointID")
              if (waypointID) {
                let portalID = targetPath.svgPath.node.id
                let depth = targetPath.layer.node.getAttribute("depth")
                depth = depth ? depth : 1
                sketchRef.sketchPageRef.addToDepthToTeleportationMap(depth, portalID, waypointID)
                sketchRef.sketchPageRef.waypointRef.current.addPortalID(waypointID, portalID)
                let svgPathSplitByM = targetPath.svgPath.node.getAttribute("d").split("M")
                sketchRef.addPortalPreview(targetPath.layer.node, targetPath.svgPath.node, waypointID, svgPathSplitByM)

                let portalIDMovedFrom = targetPath.movedFrom.svgPath.node.id
                sketchRef.sketchPageRef.removeFromDepthToTeleportationMap([portalIDMovedFrom], false)
                sketchRef.sketchPageRef.waypointRef.current.removePortalID(waypointID, portalIDMovedFrom)
                sketchRef.removePortalPreview(targetPath.layer.node, portalIDMovedFrom)
              }

              if (targetPath.gradientCollection) targetPath.svgPath.after(targetPath.gradientCollection)
              targetPath.movedFrom.remove(3)
              if(targetPath.movedFrom.stops?.length > 0) targetPath.movedFrom.gradientCollection.remove();
              this.currStrokeFilterID = targetPath.filterID
            }
      
            else { //redo draw
              targetPath.addToGroup(targetPath.layer)
              let portalID = targetPath.svgPath.node.id
              let waypointID = targetPath.svgPath.node.getAttribute("waypointID")
              if (waypointID) {
                let depth = targetPath.layer.node.getAttribute("depth")
                depth = depth ? depth : 1
                sketchRef.sketchPageRef.addToDepthToTeleportationMap(depth, portalID, waypointID)
                sketchRef.sketchPageRef.waypointRef.current.addPortalID(waypointID, portalID)
                let svgPathSplitByM = targetPath.svgPath.node.getAttribute("d").split("M")
                sketchRef.addPortalPreview(targetPath.layer.node, targetPath.svgPath.node, waypointID, svgPathSplitByM)
              }
            }
        }
        return this.operation
    }
}