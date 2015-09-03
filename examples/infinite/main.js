window.$ = require('jquery');
window._ = require('underscore');
window.React = require('react');
window.ReactDOM = require('react-dom');
window.raf = require('raf');

function prepareComponent(Component, viewport) {
  class Container extends React.Component {
    constructor(props) {
      super(props);
    }

    getChildContext() {
      return this.state;
    }

    componentWillMount() {
      var width, height;
      if (viewport === document.body) {
        [width, height] = [$(window).width(), $(window).height()];
      } else {
        [width, height] = [$(viewport).width(), $(viewport).height()];
      }
      if (!width || !height) {
        throw new Error("Viewport must have a non-zero width and height");
      }
      this.setState({width, height, x: 0, y: 0});
    }

    render() {
      var style = {
        width: this.state.width,
        height: this.state.height,
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
      var x = $(ev.target).scrollLeft(),
          y = $(ev.target).scrollTop();
      this.setState({x, y});
    }
  }

  Container.childContextTypes = {
    width: React.PropTypes.number.isRequired,
    height: React.PropTypes.number.isRequired,
    x: React.PropTypes.number.isRequired,
    y: React.PropTypes.number.isRequired,
  };

  return Container;
}

function embedComponent(Component, viewport, callback) {
  $(viewport).empty();
  Component = prepareComponent(Component, viewport);
  ReactDOM.render(<Component/>, viewport, callback);
}

class Root extends React.Component {
  render() {
    return (
      <div style={{width: this.context.width, height: this.context.height * 2}}>
        <Position>
          <div style={{backgroundColor: 'red', width: this.context.width, height: 300, border: '1px solid black'}}>
          </div>
        </Position>
        <Speed>
          <Position>
            <div style={{backgroundColor: 'blue', width: this.context.width, height: 300, border: '1px solid black'}}>
            </div>
          </Position>
        </Speed>
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
