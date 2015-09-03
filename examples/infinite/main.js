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
    getChildContext() {
      return this.state;
    }

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

class Container extends React.Component {
  getChildContext() {
    return {
      containerWidth: this.props.widthFn(this.context.viewportWidth),
      containerHeight: this.props.heightFn(this.context.viewportHeight),
    };
  }

  render() {
    var style = {
      width: this.props.widthFn(this.context.viewportWidth),
      height: this.props.heightFn(this.context.viewportHeight),
    };
    return (
      <div style={style}>{this.props.children}</div>
    );
  }
}

Container.defaultProps = { widthFn: identity, heightFn: identity };

Container.contextTypes = {
  viewportWidth: React.PropTypes.number.isRequired,
  viewportHeight: React.PropTypes.number.isRequired,
};

Container.childContextTypes = {
  containerWidth: React.PropTypes.number.isRequired,
  containerHeight: React.PropTypes.number.isRequired,
};

class Root extends React.Component {
  render() {
    var height = this.context.viewportHeight * 2 / rainbow.length;
    var colors = rainbow.map(({label, css}, index) => {
      return (
        <Color
          key={label}
          css={css}
          index={index}
          label={label}
          height={height}>
          {label}
        </Color>
      );
    }).reverse();
    return (
      <Container heightFn={h => h * 2}>{colors}</Container>
    );
  }
}

Root.contextTypes = {
  viewportWidth: React.PropTypes.number.isRequired,
  viewportHeight: React.PropTypes.number.isRequired,
};

function fixedToAbsolute(viewportTop, fixed) {
  return fixed + viewportTop;
}

class Color extends React.Component {
  render() {
    var breakpoint = this.props.index * this.props.height;
    var fixed = this.context.viewportTop < breakpoint
      ? 0
      : this.context.viewportTop - breakpoint;
    var absolute = fixedToAbsolute(this.context.viewportTop, fixed);
    var style = {
      position: 'absolute',
      top: absolute,
      width: this.context.containerWidth,
      height: this.props.height,
      backgroundColor: this.props.css,
    };
    return (
      <div style={style}>{this.props.children}</div>
    );
  }
}

Color.contextTypes = {
  viewportTop: React.PropTypes.number.isRequired,
  containerWidth: React.PropTypes.number.isRequired,
};

$(function() {
  embedComponent(Root, document.body);
});
