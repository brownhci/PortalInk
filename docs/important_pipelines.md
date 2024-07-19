
# Important pipelines:

Important pipelines, or code logic flows, for various functionalities in an illustration editor. The following have been written out, and please feel free to add more!

[Drawing a stroke](#drawing-a-stroke)
[React UI updating state](#react-ui-updating-state)
[Importing from Firebase](#importing-from-firebase)
[Parsing an input SVG](#parsing-an-input-svg)
[Autosaving to Firebase](#autosaving-to-firebase)

<br>

### Drawing a stroke:
When starting a stroke:
- The `pointerdown()` event attached to the SVG “canvas” is fired from `sketchpage.js`, which calls:
- `handleMouseDown()` in `sketchpage.js` where we verify sketchpage is in drawing mode with `state.sketchMode === “draw”`, and then call:
- `startPath()` in `sketch.js` where we create path parameters and create a new `Path` object, storing it in the class member `currentPath`, which calls:
- `constructor()` in `path.js` where we parse the input parameters and create the actual `SVGElement` node that goes into the DOM (displayed on our SVG “canvas”)

When continuing a stroke:
- The `pointermove()` event attached to the SVG “canvas” is fired from `sketchpage.js`, which calls:
- `handleMove()` in `sketchpage.js` where we verify sketchpage is in drawing mode with `this.drawing`, and then call:
- `continueLineWithEvent()` in `sketch.js` where we verify if we are in drawing mode again with `mode === “draw”`. Importantly, our user input coordinates are stored in the variable `stabilizedPoints` which we pass into our `currentPath` with:
- `setPoints()` in `path.js` where we update the `SVGElement` node with the new input coordinates. Updates should directly be applied to the node (or replace the node with a new node that is attached) so that they reflect in the DOM. 
- Points are represented by a 4 element list `[x, y, 0, p]` where `x` and `y` are the user’s input coordinates, `p` is the stylus pressure, and `0` can be ignored

When ending a stroke:
- The `pointerup()` event attached to the SVG “canvas” is fired from `sketchpage.js`, which calls:
- `handleMouseUp()` in `sketchpage.js` where we verify sketchpage is in drawing mode with `state.sketchMode === “draw”`, and then call:
- `finishPath()` in `sketch.js` where we do our finalizing logic such as updating the undo/redo stack and calling the `potrace()` function in `path.js`

### React UI updating state: 
Example when switching between different tools:
- `TooltipToggleButton` that corresponds with “draw” in `topbar.js` is pressed which calls `this.props.drawMode()` which is:
- `drawMode()` in sketchpage.js which sets the sketchpage’s `sketchMode` state variable to `“draw”`
This way when `handleMouseMove` is called, we know to use the draw pipeline! 

### Importing from Firebase:
Entry point:
- Log into firebase in `componentDidMount()` in `homepage.js` using `firebase.auth()` to get anonymous user credentials (persistent between sessions), namely the `uid`
- Fetch `active_filter_sets/uid` from Firebase. If the filter set exists, we have a pre-existing user and continue to parse the user data. If the filter set does not exist, we have a new user and need to populate the various user data fields in Firebase per the new `uid`.

Loading an existing user:
- Fetch `active_filter_sets/uid/filters` from Firebase. This contains all the JSON objects that represent a combination of SVG filters. 
- Fetch `active_filter_sets/uid/svgString from Firebase`. This contains the SVG file in string format that stores everything about a drawing (to be imported). Any persistent metadata must be embedded into/parsed from this string. 
- Parse any animated patterns defined in the `<def>` tag of the SVG.
- Call `parseSVG()` in `sketchpage.js` to parse and import the SVG (where the illustration’s SVG primitives are loaded in, filters are loaded in, and where custom attributes are interpreted)

Loading a new user:
- Create `active_filter_sets/uid/filters` in Firebase.
- Create `active_filter_sets/uid/svgString` in Firebase. 

### Parsing an input SVG:
< To be written >

### Autosaving to Firebase:
Whenever the drawing is modified, we call `serializeToString()` in `sketchpage.js` which converts the SVG drawing back into a single string that can be sent and saved to Firebase. This involves:
- Looping through all nodes and seeing which filters are used. These filters will be saved in the final SVG string, and unused filters are removed from the SVG DOM.
- Parse and save custom attributes consistent with XML format and add to the SVG DOM.
- Use an `XMLSerializer()` to serialize the SVG DOM into a string, which is sent to the Firebase with `updateSVGString()` in `homepage.js`
