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
      this.setState({
        width, height,
        left: 0, top: 0,
        scrollLeft: 0, scrollTop: 0,
      });
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
      var scrollLeft = $(ev.target).scrollLeft(),
          scrollTop = $(ev.target).scrollTop();
      this.setState({scrollLeft, scrollTop});
    }
  }

  Container.childContextTypes = {
    width: React.PropTypes.number.isRequired,
    height: React.PropTypes.number.isRequired,
    left: React.PropTypes.number.isRequired,
    top: React.PropTypes.number.isRequired,
    scrollLeft: React.PropTypes.number.isRequired,
    scrollTop: React.PropTypes.number.isRequired,
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
      <div style={{height: this.context.height * 2}}>
        <Speed>
          <Positioner>
            <div style={{backgroundColor: 'blue', width: this.context.width, height: 300, border: '1px solid black'}}>
            </div>
          </Positioner>
        </Speed>
        <Positioner>
          <div style={{backgroundColor: 'red', width: this.context.width, height: 300, border: '1px solid black'}}>
          </div>
        </Positioner>
      </div>
    );
  }
  componentDidUpdate() {
    console.log($(ReactDOM.findDOMNode(this)).height());
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
    var top = this.context.scrollTop;
    return {
      top
    };
  }
}

Speed.contextTypes = {
  height: React.PropTypes.number.isRequired,
  top: React.PropTypes.number.isRequired,
  scrollTop: React.PropTypes.number.isRequired,
};

Speed.childContextTypes = {
  top: React.PropTypes.number.isRequired,
};

class Positioner extends React.Component {
  render() {
    var style = {
      top: this.context.top,
      position: 'absolute',
    };
    return (
      <div style={style}>{this.props.children}</div>
    );
  }
}

Positioner.contextTypes = {
  top: React.PropTypes.number.isRequired,
};

$(function() {
  embedComponent(Root, document.body);
});
