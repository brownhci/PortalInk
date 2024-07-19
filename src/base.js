import Rebase from 're-base';
import firebase from 'firebase/app';
import 'firebase/database'; // If using Firebase database
// import 'firebase/storage';  // If using Firebase storage
import 'firebase/auth'
import 'firebase/app-check'

const firebaseConfig = {
    apiKey: process.env.REACT_APP_FIREBASE_KEY,
    authDomain: process.env.REACT_APP_FIREBASE_DOMAIN,
    projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
    storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.REACT_APP_FIREBASE_SENDER_ID,
    appId: process.env.REACT_APP_FIREBASE_APP_ID,
    measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID
};

console.log(firebaseConfig)
const firebaseApp = firebase.initializeApp(firebaseConfig)
const base = Rebase.createClass(firebaseApp.database())

export { firebase, firebaseApp, base }