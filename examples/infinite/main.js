window.$ = require('jquery');
window._ = require('underscore');
window.React = require('react');
window.ReactDOM = require('react-dom');
window.raf = require('raf');

const COLORS = [
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

function prepareComponent(Component, viewport) {
  class Container extends React.Component {
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
    var colors = COLORS.map(({label, css}, index) => {
      return (
        <Color
          key={label}
          css={css}
          index={index}>
          {label}
        </Color>
      );
    });
    return (
      <div style={{height: this.context.height * 2}}>
        {colors}
      </div>
    );
  }

  getChildContext() {
    return {
      height: (this.context.height * 2) / COLORS.length,
    }
  }
}

Root.childContextTypes = {
  height: React.PropTypes.number.isRequired,
};

Root.contextTypes = {
  width: React.PropTypes.number.isRequired,
  height: React.PropTypes.number.isRequired,
};

class Color extends React.Component {
  render() {
    var style = {
      backgroundColor: this.props.css,
      width: this.context.width,
      height: this.context.height,
      top: this.context.top * this.context.scrollTop * this.props.index,
    };
    return (
      <div style={style}>
        {this.props.children}
      </div>
    );
  }
}

Color.contextTypes = {
  height: React.PropTypes.number.isRequired,
  width: React.PropTypes.number.isRequired,
  top: React.PropTypes.number.isRequired,
  scrollTop: React.PropTypes.number.isRequired,
}

$(function() {
  embedComponent(Root, document.body);
});
