# PortalInk
A web-based tool for artists to craft and export 2.5D graphical stories while remaining in 2D space by using SVG transitions. This is achieved via a parallax effect that generates a sense of depth that can be further explored using pan and zoom interactions. Any canvas position can be saved and linked to in a closed drawn stroke, or "portal," allowing the artist to create spatially discontinuous, or even infinitely looping visual trajectories. Learn more by reading our paper at [link after publication]!

<div align="center">
    <a href="https://github.com/brownhci/PortalInk/blob/main/examples/fig7_ant_restaurant.svg" target="_blank" style="display: inline-block;">
        <img src="https://github.com/brownhci/PortalInk/blob/main/examples/ant.gif" alt="Ant restaurant" style="height: 150px; margin: 10px;">
    </a>
    <a href="https://github.com/brownhci/PortalInk/blob/main/examples/fig12B_solar_system.svg" target="_blank" style="display: inline-block;">
        <img src="https://github.com/brownhci/PortalInk/blob/main/examples/presentation.gif" alt="Solar system" style="height: 150px; margin: 10px;">
    </a>
    <a href="https://github.com/brownhci/PortalInk/blob/main/examples/fig11_theatre.svg" target="_blank" style="display: inline-block;">
        <img src="https://github.com/brownhci/PortalInk/blob/main/examples/theatre.gif" alt="Theatre" style="height: 150px; margin: 10px;">
    </a>
</div>


## Live Demo
PortalInk is an extension of filtered.ink, which previously explored compositing SVG filters as a metaphor for the drawing brush. We run a live illustration application with functionalities from both at [filtered.ink](https://filtered.ink). Visit this to try it out!

## Setup
If you want to set up and develop PortalInk yourself, first make sure node and npm are installed. This application was created/tested using `node=v16.18.0` and `npm=8.19.2`.

### Creating the database
Before launching the application, you need to create a database on Firebase to store your drawings across sessions:
1. Navigate to the [Firebase Console](https://console.firebase.google.com/).
2. Click on "Add project" and follow the setup wizard to create a new Firebase project.
3. After creation, navigate to Project Overview > Project Settings. Scroll down to find your configuration parameters. Copy those parameters into an `.env` file that should look something like:
```
REACT_APP_FIREBASE_KEY=<apiKey>
REACT_APP_FIREBASE_DOMAIN=<authDomain>
REACT_APP_FIREBASE_PROJECT_ID=<projectId>
REACT_APP_FIREBASE_STORAGE_BUCKET=<storageBucket>
REACT_APP_FIREBASE_SENDER_ID=<messagingSenderId>
REACT_APP_FIREBASE_APP_ID=<appId>
REACT_APP_FIREBASE_MEASUREMENT_ID=<measurementId>
GENERATE_SOURCEMAP=false
```
Please place that file in the root of this repository. 

### Running the frontend:
After the database is set up, run `npm install --force` to install dependencies. Then, run `npm start` to start the application.
