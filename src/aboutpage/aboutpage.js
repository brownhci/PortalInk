import React, { Component } from 'react'
import { Link } from 'react-router-dom';

import './aboutpage.css'


export class AboutPage extends Component {
    constructor(props) {
        super(props)
        this.state = {
        }
    }


    render() {
        return(
            <div id="about-root">
                <div className="header">
                    <div className="flex-row">
                        <div className="topbar-left-padding"></div>
                        <span className='pad-sides'>
                            <Link to='/' className='topbar-link'>
                                <span>🖌️ home</span>
                            </Link>
                        </span>
                        <span className='pad-sides'>
                            <Link to='/gallery' className='topbar-link'>
                                <span>🖼️ gallery</span>
                            </Link>
                        </span>
                    </div>
                    <div id="title" className="flex-row">
                        <div className="pad-right">filtered.ink:</div>
                        <div className="bounce"> Animated</div>
                        <div className="pad-left">Illustrations</div>
                    </div>
                </div>
                <div className="about">
                    <div id='about-header'>
                        filtered.ink, empowering vector-based dynamic illustrations.
                    </div>
                    <div className='about-section-text'>
                        filtered.ink is for making vector-based illustrations that can be scaled to any resolution. You can start with a template and a couple of filters for your ink, but feel free to clear the canvas to get a blank slate. Your tools are shown at the top, starting with your two ink tools, Ink and Fill, followed by tools that let you change or move the existing ink. Next to those are options for changing the size, color, and opacity of your ink tool. And finally, actions that apply to the illustration. The download and import buttons let you save and remix illustrations (note the imports must be in SVG format). If you don't know where to start, try taking a look at the <Link to='/gallery'><span>gallery</span></Link> and remixing from there!
                    </div>
                    <div className='about-section-text'>
                    <div><b>Understanding Filters</b></div><br></br>
                    
                    <div>Filters transform the ink in unique ways, by changing the colors or distorting the ink, or any combination. The ways it transforms the ink can usually be animated, to express motion or personality. Filters are comprised of primitives that each do one type of transformation, but the primitives can be connected together in a flow diagram, so that multiple primitives can transform the ink.
                    </div><br></br>
                    
                    <div>Start with a blank filter by pressing the plus button near the top left, or use a preset filter made by someone else. You can edit the filters at any time, and remixing lets you build a new filter from an existing filter. When you select a filter by choosing one from the left, it becomes active and will apply the next time you use the Ink or Fill tools.
                    </div><br></br>

                    <div>If you create a cool filter you would like to share with others, save it to the list of presets (but please no duplicates). If you find any bugs, wish to request a feature, or want your illustration displayed in the gallery, feel free to contact us. </div><br></br>

                    <div>Happy inking! 🎨 </div>
                    <div className='about-google-form'>
                        <div><b>Want to be notified about updates?</b></div>
                        <div className='about-btn-wrapper'>
                            <a className='about-btn' href="https://docs.google.com/forms/d/e/1FAIpQLSeTCgnwF1gjrc1O8mfJ_5TmT_TLowFQ2DUhsollmqPG84pAFQ/viewform?usp=pp_url&entry.1299571007=Sketchy+%2B+filtered.ink:+creating+and+remixing+vector-based+illustrations&entry.1760653896=FilteredInk_about_page" role="button">Subscribe</a>
                        </div>
                    </div>
                    </div>
                    <br></br>
                    <hr></hr>
                    <br></br><br></br>
                    <div className='about-section-title'>
                        <span className='about-highlight'>Artist-in-Residency Program</span>
                    </div>
                    <div className='about-section-text'>
                        Are you a Brown University or RISD artist interested in creating illustrations with filtered.ink and helping the team develop more features for a semester? If so, we have a rolling application you can apply for <a href='https://forms.gle/oizhpHwfa1tizFPt7'>here</a>.
                    </div>
                    <br></br>
                    <hr></hr>
                    <br></br><br></br>
                    <div className='about-section-title'>
                        <span className='about-highlight'>Publications</span>
                    </div>
                    <div className='about-section-text'>
                        <div className='about-papers'>
                            <a href='https://jeffhuang.com/papers/FilteredInk_CHI23.pdf'><img alt='pdf icon' width={75} src="https://webgazer.cs.brown.edu/media/pdf.svg"></img></a>
                            <div className='about-papers-description'>
                                If you used filtered.ink, please cite:
                                <div className='bibtex'>
                                <pre><code>
                                    @inproceedings&#123;10.1145/3544548.3581051,<br></br>
                                    &nbsp; author = &#123;Zhou, Tongyu and Liu, Connie and Yang, Joshua Kong and Huang, Jeff&#125;,<br></br>
                                    &nbsp; title = &#123;Filtered.Ink: Creating Dynamic Illustrations with SVG Filters&#125;,<br></br>
                                    &nbsp; year = &#123;2023&#125;,<br></br>
                                    &nbsp; isbn = &#123;9781450394215&#125;,<br></br>
                                    &nbsp; publisher = &#123;Association for Computing Machinery&#125;,<br></br>
                                    &nbsp; address = &#123;New York, NY, USA&#125;,<br></br>
                                    &nbsp; doi = &#123;10.1145/3544548.3581051&#125;,<br></br>
                                    &nbsp; booktitle = &#123;Proceedings of the 2023 CHI Conference on Human Factors in Computing Systems&#125;,<br></br>
                                    &nbsp; articleno = &#123;129&#125;,<br></br>
                                    &nbsp; numpages = &#123;15&#125;,<br></br>
                                    &nbsp; location = &#123;Hamburg, Germany&#125;,<br></br>
                                    &nbsp; series = &#123;CHI '23&#125;<br></br>
                                    &#125;
                                    </code></pre>
                                </div>
                            </div>
                        </div>
                        <div className='about-papers'>
                            <a href='https://the3dsquare.com/assets/animatedpatterns_2023.pdf'><img alt='pdf icon' width={75} src="https://webgazer.cs.brown.edu/media/pdf.svg"></img></a>
                            <div className='about-papers-description'>
                                For the animated patterns specifically:
                                <div className='bibtex'>
                                    <pre><code>
                                    @inproceedings&#123;10.1145/3544549.3583941,<br></br>
                                     &nbsp; author = &#123;Yang, Joshua Kong&#125;,<br></br>
                                     &nbsp; title = &#123;Animated Patterns: Applying Dynamic Patterns to Vector Illustrations&#125;,<br></br>
                                     &nbsp; year = &#123;2023&#125;,<br></br>
                                     &nbsp; isbn = &#123;9781450394222&#125;,<br></br>
                                     &nbsp; publisher = &#123;Association for Computing Machinery&#125;,<br></br>
                                     &nbsp; address = &#123;New York, NY, USA&#125;,<br></br>
                                     &nbsp; doi = &#123;10.1145/3544549.3583941&#125;,<br></br>
                                     &nbsp; booktitle = &#123;Extended Abstracts of the 2023 CHI Conference on Human Factors in Computing Systems&#125;,<br></br>
                                     &nbsp; articleno = &#123;562&#125;,<br></br>
                                     &nbsp; numpages = &#123;7&#125;,<br></br>
                                     &nbsp; location = &#123;Hamburg, Germany&#125;,<br></br>
                                     &nbsp; series = &#123;CHI EA '23&#125;<br></br>
                                    &#125;
                                    </code></pre>
                                </div>
                            </div>
                        </div>
                    </div>
                    <br></br>
                    <hr></hr>
                    <br></br><br></br>
                    <div className='about-section-title'>
                        <span className='about-highlight'>Who We Are</span>
                    </div>
                    <div className='about-section-text'>
                        <br></br>
                        <div className='about-team'>
                            <div className='about-team-member'>
                                <div className='about-photo-container'>
                                    <img alt='team member tongyu' className='about-photo' src='https://tongyuzhou.com/img/prof_pic5.jpg'></img>
                                </div>
                                <div className='about-team-caption'><a href="https://tongyuzhou.com/#/">Tongyu Zhou</a></div>
                            </div>
                            <div className='about-team-member'>
                                <div className='about-photo-container'>
                                    <img alt='team member josh' className='about-photo' src='https://the3dsquare.com/assets/me.png'></img>
                                </div>
                                <div className='about-team-caption'><a href="https://the3dsquare.com/">Joshua Yang</a></div>
                            </div>
                            <div className='about-team-member'>
                                <div className='about-photo-container'>
                                    <img alt='team member jeff' className='about-photo' src='https://jeffhuang.com/assets/headshot.jpg'></img>
                                </div>
                                <div className='about-team-caption'><a href="https://jeffhuang.com/">Jeff Huang</a></div>
                            </div>
                        </div>
                        <br></br><br></br>
                        <div>Previous: <a href='https://connieliu.me/'>Connie Liu</a>, <a href='http://vivianchan.tw/hi'>Vivian Chan</a>, <a href='https://cloris-portfolio.webflow.io/'>Cloris Ding</a></div>
                        
                    </div>
                    <div className='about-section-title'>
                        <span className='about-highlight'>Acknowledgments</span>
                    </div>
                    <div className='about-section-text'>
                    filtered.ink is based on research originally done at Brown University. This work is supported by NSF grant IIS-1552663.
                    </div>
                </div>
            </div>
        )
    }
}
