import React, { Component } from 'react';
import './App.css';
import {HashRouter, Route, Switch} from "react-router-dom";
import { HomePage } from "./homepage/homepage";
import { GalleryPage } from "./gallerypage/gallerypage";
import { AboutPage } from './aboutpage/aboutpage';
import { createMuiTheme } from '@material-ui/core/styles';
import { ThemeProvider } from '@material-ui/styles';

const theme = createMuiTheme({
  typography: {
    fontFamily: [
      "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "Helvetica", "Arial", "sans-serif", "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"
    ].join(','),
  },
  palette: {
    primary: {
      main: '#262d4f'
    }
  }
});

class App extends Component {

  render() {
    return (
      <ThemeProvider theme={theme}>
        <div className="App">
          <HashRouter basename={process.env.PUBLIC_URL} onUpdate={() => window.scrollTo(0, 0)}>
            <Switch>
              <Route exact path='/' component={HomePage}/>
              {/* <Route path='/gallery' component={GalleryPage}/>
              <Route path='/about' component={AboutPage}/> */}
            </Switch>
          </HashRouter>
        </div>
      </ThemeProvider>
    )
  }
}

export default App;
