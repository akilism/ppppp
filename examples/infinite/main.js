window.$ = require('jquery');
window.React = require('react');
window.ReactDOM = require('react-dom');

const identity = a => a;

var rainbow = [
  {
    label: 'red',
    css: '#FF0000',
  },
  {
    label: 'orange',
    css: '#FF7F00',
  },
  {
    label: 'yellow',
    css: '#FFFF00',
  },
  {
    label: 'green',
    css: '#00FF00',
  },
  {
    label: 'blue',
    css: '#0000FF',
  },
  {
    label: 'indigo',
    css: '#4B0082',
  },
  {
    label: 'violet',
    css: '#8B00FF',
  }
];

rainbow = rainbow.concat(rainbow);

function createViewport(Component, container) {
  class Viewport extends React.Component {
    getChildContext() { return this.state; }

    componentWillMount() {
      var viewportWidth, viewportHeight;
      if (container === document.body) {
        [viewportWidth, viewportHeight] = [$(window).width(), $(window).height()];
      } else {
        [viewportWidth, viewportHeight] = [$(container).width(), $(container).height()];
      }
      if (!viewportWidth || !viewportHeight) {
        throw new Error("Viewport must have a non-zero width and height");
      }
      this.setState({
        viewportWidth, viewportHeight,
        viewportLeft: 0, viewportTop: 0,
      });
    }

    render() {
      var style = {
        width: this.state.viewportWidth,
        height: this.state.viewportHeight,
        position: 'relative',
        overflow: 'scroll',
        boxSizing: 'border-box',
      };
      return (
        <div style={style} onScroll={this.handleScroll.bind(this)}>
          <Component />
        </div>
      );
    }

    handleScroll(ev) {
      var viewportLeft = $(ev.target).scrollLeft(),
          viewportTop = $(ev.target).scrollTop();
      this.setState({viewportLeft, viewportTop});
    }
  }

  Viewport.childContextTypes = {
    viewportWidth: React.PropTypes.number.isRequired,
    viewportHeight: React.PropTypes.number.isRequired,
    viewportLeft: React.PropTypes.number.isRequired,
    viewportTop: React.PropTypes.number.isRequired,
  };

  return Viewport;
}

function embedComponent(Component, container, callback) {
  $(container).empty();
  var Viewport = createViewport(Component, container);
  ReactDOM.render(<Viewport/>, container, callback);
}

class Track extends React.Component {
  getChildContext() {
    return this.props.adjust();
  }

  render() {
    var {trackWidth, trackHeight, viewportTop} = this.getChildContext();
    var style = {
      width: trackWidth,
      height: trackHeight,
    };
    return (
      <div style={style}>{this.props.children}</div>
    );
  }
}

Track.childContextTypes = {
  trackWidth: React.PropTypes.number.isRequired,
  trackHeight: React.PropTypes.number.isRequired,
};

function shift(arr, index) {
  var left = arr.slice(0, index);
  var right = arr.slice(index, arr.length);
  return right.concat(left);
}
window.shift = shift;

class Root extends React.Component {
  adjustTrackContext() {
    var {viewportWidth, viewportHeight, viewportTop} = this.context,
        trackWidth = viewportWidth,
        // NOTE(brian): Infinite scroll never been so easy
        trackHeight = viewportHeight * 2 + viewportTop,
        colorsHeight = rainbow.length * viewportHeight;
    return { trackWidth, trackHeight };
  }

  render() {
    var currentIndex = Math.floor(this.context.viewportTop / this.context.viewportHeight) % rainbow.length;
    var colors = rainbow.map(({label, css}, index) => {
      return (
        <Color
          key={index}
          css={css}
          index={index}
          label={label}>
          <div style={{position: 'absolute', left: '45%', top: '45%', fontSize: '50px'}}>
            {label}
          </div>
        </Color>
      );
    }).reverse();
    return (
      <Track adjust={this.adjustTrackContext.bind(this)}>
        {colors}
      </Track>
    );
  }
}

Root.contextTypes = {
  viewportWidth: React.PropTypes.number.isRequired,
  viewportHeight: React.PropTypes.number.isRequired,
  viewportTop: React.PropTypes.number.isRequired,
};

function fixedToAbsolute(viewportTop, trackTop, fixed) {
  return fixed + viewportTop - trackTop;
}

class Color extends React.Component {
  render() {
    var elTop = this.props.index * this.context.viewportHeight;
    var colorHeight = this.context.viewportHeight;
    var colorsHeight = colorHeight * rainbow.length;
    var viewportTop = this.context.viewportTop % colorsHeight;
    var repetitions = Math.floor(this.context.viewportTop / colorsHeight);
    var currentIndex = Math.floor(this.context.viewportTop / colorHeight) % rainbow.length;
    if (this.props.label === 'red') {
      console.log({
        repetitions,
        viewportTop,
        elTop,
        currentIndex,
      });
    }
    var fixed = viewportTop > elTop || viewportTop < -elTop
      ? elTop - viewportTop
      : 0;
    //NOTE(brian): Assuming track top is always 0 for now
    var absolute = fixedToAbsolute(this.context.viewportTop, 0, fixed);
    var style = {
      position: 'absolute',
      top: absolute,
      width: this.context.viewportWidth,
      height: this.context.viewportHeight,
      backgroundColor: this.props.css,
    };
    return (
      <div style={style}>{this.props.children}</div>
    );
  }
}

Color.contextTypes = {
  viewportTop: React.PropTypes.number.isRequired,
  viewportHeight: React.PropTypes.number.isRequired,
  viewportWidth: React.PropTypes.number.isRequired,
};

$(function() {
  embedComponent(Root, document.body);
});
