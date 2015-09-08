window.$ = require('jquery');
window.React = require('react');
window.ReactDOM = require('react-dom');

const identity = a => a;

const rainbow = [
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
        WebkitOverflowScrolling: 'touch',
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
    var {trackWidth, trackHeight} = this.getChildContext();
    var style = {
      width: trackWidth,
      height: trackHeight,
    };
    return (
      <div style={style}>
        {this.props.children}
      </div>
    );
  }
}

Track.childContextTypes = {
  trackWidth: React.PropTypes.number.isRequired,
  trackHeight: React.PropTypes.number.isRequired,
};


Array.prototype.rotate = function(index) {
  if (!index) {
    return this;
  } else {
    var left = this.slice(0, index);
    var right = this.slice(index, this.length);
    return right.concat(left);
  }
};

function fixedToAbsolute(viewportTop, trackTop, fixed) {
  return fixed + viewportTop - trackTop;
}

class Rainbow extends React.Component {
  adjustTrackContext() {
    var {viewportWidth, viewportHeight, viewportTop} = this.context,
        colorsHeight = rainbow.length * viewportHeight,
        trackWidth = viewportWidth,
        trackHeight = colorsHeight * (Math.round(viewportTop / colorsHeight) + 1);
    return { trackWidth, trackHeight };
  }

  render() {
    var {viewportWidth, viewportHeight, viewportTop} = this.context,
        colorHeight = viewportHeight,
        colorsHeight = colorHeight * rainbow.length,
        currentIndex = Math.floor(viewportTop / viewportHeight) % rainbow.length,
        repetitions = Math.floor(viewportTop / colorsHeight),
        children = rainbow
          .map(({label, css}, index) => {
            var absolute;
            if (index === currentIndex) {
              absolute = index * colorHeight + repetitions * colorsHeight;
            } else {
              absolute = viewportTop;
            }
            return (
              <Color
                css={css}
                key={label}
                label={label}
                absolute={absolute}
                width={this.context.viewportWidth}
                height={this.context.viewportHeight}
                />
            );
          })
          .rotate(currentIndex)
          .reverse();
    return (
      <Track adjust={this.adjustTrackContext.bind(this)}>
        {children}
      </Track>
    );
  }
}

Root.contextTypes = {
  viewportWidth: React.PropTypes.number.isRequired,
  viewportHeight: React.PropTypes.number.isRequired,
  viewportTop: React.PropTypes.number.isRequired,
};

class Color extends React.Component {
  render() {
    var style = {
      position: 'absolute',
      top: this.props.absolute,
      backgroundColor: this.props.css,
      width: this.props.width,
      height: this.props.height,
    };
    return (
      <div style={style} id={this.props.label}>
        <div style={{position: 'absolute', left: '45%', top: '45%', fontSize: '50px'}}>
          {this.props.label}
        </div>
      </div>
    );
  }
}

$(function() {
  embedComponent(Root, document.body);
});
