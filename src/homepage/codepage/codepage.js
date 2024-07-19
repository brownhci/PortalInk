
import React, { Component } from 'react'
import Editor from 'react-simple-code-editor';
import Prism from 'prismjs';

import './codepage.css'
import './prism.css'

export class CodePage extends Component {
    constructor(props) {
        super(props)
        this.state = {}
    }

    render() {
        return (
            <div id="codepage">
                <Editor
                    className="code-field"
                    value={this.props.currStrokeCode}
                    onValueChange={() => {}} //code => this.props.updateStrokeCode(code)}
                    highlight={code => Prism.highlight(code, Prism.languages.javascript, 'javascript')}
                    padding={10}
                    style={{
                        fontFamily: '"Fira code", "Fira Mono", monospace',
                        fontSize: 14,
                    }}
                />
            </div>
        )
    }
}