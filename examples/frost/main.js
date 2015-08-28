var React = require('react');
var embedComponent = require('embedComponent');

class Vector extends React.Component {
  render() {
    return (
      <svg style={{border: '1px solid black'}} width="200" height="200">
        <line x1="100" y1="100"
              x2={100 + this.props.x} y2={100 + this.props.y}
              stroke="red" strokeWidth="10" />
      </svg>
    );
  }
}

class RobertFrost extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    return (
      <div style={{width: 10000, height: 10000}}>
        <div style={{position: 'fixed', top: '40%', left: '60%',}}>
          <div>scrollLeft:{this.props.scrollX}</div>
          <div>scrollTop:{this.props.scrollY}</div>
          <Vector x={this.props.scrollVX} y={this.props.scrollVY} />
        </div>
      </div>
    );
  }
}

embedComponent(RobertFrost, document.getElementById('root'));
