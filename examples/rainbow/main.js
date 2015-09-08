var $ = require('jquery');
var React = require('react');
var ReactDOM = require('react-dom');

// NOTE(brian): sorry for mutating global Array.prototype
Array.prototype.rotate = function(index) {
  if (!index) {
    return this.slice(0);
  } else {
    var left = this.slice(0, index);
    var right = this.slice(index, this.length);
    return right.concat(left);
  }
};

const colors = [
  {
    name: 'red',
    css: '#FF0000',
  },
  {
    name: 'orange',
    css: '#FF7F00',
  },
  {
    name: 'yellow',
    css: '#FFFF00',
  },
  {
    name: 'green',
    css: '#00FF00',
  },
  {
    name: 'blue',
    css: '#0000FF',
  },
  {
    name: 'indigo',
    css: '#4B0082',
  },
  {
    name: 'violet',
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

class Color extends React.Component {
  render() {
    var style = {
      position: 'absolute',
      top: this.props.top,
      backgroundColor: this.props.css,
      width: this.props.width,
      height: this.props.height,
    };
    return (
      <div style={style}>
        <div style={{
          position: 'relative',
          textAlign: 'center',
          width: this.props.width,
          top: '45%',
          fontSize: '50px',
          fontFamily: 'sans-serif',
        }}>
          {this.props.name}
        </div>
      </div>
    );
  }
}

class Rainbow extends React.Component {
  render() {
    var {colors} = this.props,
        {viewportHeight, viewportTop} = this.context,
        colorHeight = viewportHeight,
        colorsHeight = colorHeight * colors.length,
        rainbowHeight = colorsHeight * (Math.round(viewportTop / colorsHeight) + 1),
        currentIndex = Math.floor(viewportTop / viewportHeight) % colors.length,
        repetitions = Math.floor(viewportTop / colorsHeight),
        children = colors
          .map(({name, css}, index) => {
            var absolute;
            if (index === currentIndex) {
              absolute = index * colorHeight + repetitions * colorsHeight;
            } else {
              absolute = viewportTop;
            }
            return (
              <Color
                css={css}
                key={name}
                name={name}
                top={absolute}
                width={this.props.width}
                height={colorHeight}
                />
            );
          })
          .rotate(currentIndex)
          .reverse();
    return (
      <div
        style={{
          position: 'absolute',
          left: this.props.left,
          width: this.props.width,
          height: rainbowHeight,
        }}>
        {children}
      </div>
    );
  }
}

Rainbow.contextTypes = {
  viewportHeight: React.PropTypes.number.isRequired,
  viewportTop: React.PropTypes.number.isRequired,
};

class DoubleRainbow extends React.Component {
  render() {
    var {colors} = this.props,
        {viewportHeight, viewportTop} = this.context,
        colorHeight = viewportHeight,
        colorsHeight = colorHeight * colors.length,
        rainbowHeight = colorsHeight * (Math.round(viewportTop / colorsHeight) + 1),
        currentIndex = Math.floor(viewportTop / viewportHeight) % colors.length,
        repetitions = Math.floor(viewportTop / colorsHeight),
        children = colors
          .map(({name, css}, index) => {
            var absolute;
            if (index === currentIndex) {
              absolute = index * colorHeight + repetitions * colorsHeight;
              // NOTE(brian): this is dumb
              var fixed = absolute - viewportTop;
              absolute = fixed * 2 + viewportTop;
            } else {
              absolute = viewportTop;
            }
            return (
              <Color
                css={css}
                key={name}
                name={name}
                top={absolute}
                width={this.props.width}
                height={colorHeight}
                />
            );
          })
          .rotate(currentIndex)
          .reverse();
    return (
      <div
        style={{
          position: 'absolute',
          left: this.props.left,
          width: this.props.width,
          height: rainbowHeight,
        }}>
        {children}
      </div>
    );
  }
}

DoubleRainbow.contextTypes = {
  viewportHeight: React.PropTypes.number.isRequired,
  viewportTop: React.PropTypes.number.isRequired,
};


class Root extends React.Component {
  render() {
    var width = this.context.viewportWidth / 2;
    return (
      <div>
        <Rainbow colors={colors} left='0%' width={width} />
        <DoubleRainbow colors={colors} left='50%' width={width} />
      </div>
    );
  }
}

Root.contextTypes = {
  viewportWidth: React.PropTypes.number.isRequired,
  viewportHeight: React.PropTypes.number.isRequired,
  viewportTop: React.PropTypes.number.isRequired,
};

$(function() {
  embedComponent(Root, document.body);
});
