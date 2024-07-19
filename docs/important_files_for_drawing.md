# Important Files + Methods:

Important files to do with drawing logic and the respective functions are covered in this file. The following have been written out, and please feel free to add more detail if anything is missing!

[homepage.js](#homepagejs)
[sketchpage/sketchpage.js](#sketchpagesketchpagejs)
[sketchpage/topbar.js](#sketchpagetopbarjs)
[sketchpage/sketch.js](#sketchpagesketchjs)
[sketchpage/path.js](#sketchpagepathjs)

<br>

# `homepage.js` 

This file is the entry point for the program.

#### `componentDidMount()`:
- Connects to Firebase database
- Load in saved drawing and saved filters
- **Initialize sketchpage in sketchpage.js**

<br>

# `sketchpage/sketchpage.js`: 

This file contains the overall logic of the drawing program.

#### `constructor()` and `componentDidMount()`:
- Initializes “global” canvas-related variables of the program
- Initializes user input event listeners 
- Initializes sketch.js (our sketch class)

#### `render()`:
- Contains the React JSX of the sketchpage, the SVG “canvas” and React dialogs

#### `handleMouseDown()`:
- Handles mouse down event, entry point for all tools when **starting the stroke**
- Calls startPath in `sketchpage/sketch.js` when in “draw” mode

#### `handleMouseMove()`:
- Handles mouse move event, entry point for all tools when a new `(x,y)` coordinate from user’s input comes in, i.e. when **continuing the stroke**
- Calls `continueLineWithEvent` in `sketchpage/sketch.js` when in “draw” mode

#### `handleMouseUp()`:
- Handles mouse up event, entry point for all tools when **ending the stroke**
- Calls endPath in `sketchpage/sketch.js` when in “draw” mode

#### `serializeToString()` and `download()`:
- Converts drawing into exported SVG
- Must convert custom features into exportable SVG (i.e. custom attributes) here

#### `importSVG()` and `parseSVG()`:
- Converts imported SVG into drawing
- Should convert custom attributes into custom features here
- Calls `processImportedStroke()` in `sketchpage/sketch.js` with each imported stroke

<br>

# `sketchpage/topbar.js`:

This file contains the toolbar React component and tool switching logic.

- Contains the button React components that when clicked, update `sketchpage`’s state
- Contains React Dialog components for various tools
- The `topbar`’s props come from `sketchpage`

<br>

# `sketchpage/sketch.js` 

This file contains main drawing logic of the program.

#### `constructor()`:
- Initializes “global” drawing-related variables of the program

#### `startPath()`
- Contains logic to **start a drawing stroke**
- Creates a new Path object for the new stroke

#### `continueLineWithEvent()`:
- Contains logic to **continue drawing a stroke**
stabilizedPoints stores points of stroke user is currently drawing
- Pass stabilizedPoints into our path object via setPoints()

#### `finishPath()`:
- Contains logic to **finish a drawn stroke**
- For instance with our normal strokes, potrace is called here
 
#### `processImportedStroke()`:
- Process imported stroke data by parsing the XML data and then calling `addImportedStroke()`

#### `addImportedStroke()`:
- Create a new `Path` object with parsed data from `processImportedStroke()`

<br>

# `sketchpage/path.js`:

This file contains our `Path` class/object which stores the actual SVG objects/nodes that are in our SVG canvas.

#### `constructor()`:
- Creates SVG objects based on input parameters

#### `setPoints()`:
- **Update SVG objects** (i.e. the nodes) with new coordinates so that the changes reflect in the DOM
- Currently creates a `<polyline>` per default stroke

#### `serialize()`:
- Turns `Path` object instance into JSON parameters 

#### `deserialize()`
- Turns JSON parameters into a new Path object
