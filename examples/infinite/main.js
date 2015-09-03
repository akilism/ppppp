window.$ = require('jquery');
window._ = require('underscore');
window.React = require('react');
window.ReactDOM = require('react-dom');
window.raf = require('raf');

function prepareComponent(Component, viewport) {
  class Embedder extends React.Component {
    constructor(props) {
      super(props);
    }

    getChildContext() {
      return this.state;
    }

    componentWillMount() {
      $(viewport).empty();
      var width, height;
      if (viewport === document.body) {
        [width, height] = [$(window).width(), $(window).height()];
      } else {
        [width, height] = [$(viewport).width(), $(viewport).height()];
      }
      if (!width || !height) {
        throw new Error("Viewport must have a non-zero width and height");
      }
      $(viewport).css({
        width,
        height,
        position: 'relative',
        overflow: 'scroll',
      });
      this.setState({width, height, x: 0, y: 0});
    }

    componentDidMount() {
      if (viewport === document.body) {
        $(window).on('scroll mousewheel', _.throttle(this.handleScroll.bind(this), 10));
      } else {
        $(viewport).on('scroll mousewheel', _.throttle(this.handleScroll.bind(this), 10));
      }
    }

    componentWillUnmount() {
      // TODO(brian)
    }

    render() {
      return <Component />;
    }

    handleScroll(ev) {
      var x = $(ev.target).scrollLeft();
      var y = $(ev.target).scrollTop();
      this.setState({x,y});
    }
  }

  Embedder.childContextTypes = {
    width: React.PropTypes.number.isRequired,
    height: React.PropTypes.number.isRequired,
    x: React.PropTypes.number.isRequired,
    y: React.PropTypes.number.isRequired,
  };

  return Embedder;
}

function embedComponent(Component, viewport, callback) {
  Component = prepareComponent(Component, viewport);
  ReactDOM.render(<Component/>, viewport, callback);
}

class Root extends React.Component {
  render() {
    return (
      <div style={{height: this.context.height * 2}}>
        <Position>
          <div style={{backgroundColor: 'red', width: this.context.width, height: 300, border: '1px solid black'}}>
          </div>
        </Position>
      </div>
    );
  }
}

Root.contextTypes = {
  width: React.PropTypes.number.isRequired,
  height: React.PropTypes.number.isRequired,
};

class Speed extends React.Component {
  render() {
    return this.props.children;
  }

  getChildContext() {
    return {
      y: this.context.y * 2,
    };
  }
}

Speed.contextTypes = {
  y: React.PropTypes.number.isRequired,
};

Speed.childContextTypes = {
  y: React.PropTypes.number.isRequired,
};

class Position extends React.Component {
  render() {
    var style = {
      position: 'absolute',
      top: this.context.y,
    };
    return (
      <div style={style}>{this.props.children}</div>
    );
  }
}

Position.contextTypes = {
  y: React.PropTypes.number.isRequired,
};

$(function() {
  embedComponent(Root, document.body);
});
