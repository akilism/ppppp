var $ = require('jquery');
var React = require('react');
var {maps} = require('google');

function getEmbeddableComponent(Component, container, dimensions) {
  var [width, height] = dimensions;
  class Spy extends React.Component {
    constructor() {
      super();
      this.state = {
        width: width,
        height: height,
      };
    }

    render() {
      var width  = this.state.width  || width;
      var height = this.state.height || height;

      var initialStyle = {
        width: `${width}`,
        height: `${height}`,
        position: 'relative',
        overflow: 'scroll',
      };
      return (
        <div onScroll={this.handleScroll} style={initialStyle}>
          <Component {...this.props} />
        </div>
      );
    }

    componentDidMount() {
      var $container = $(container);
      this.setState({
        width: $container.width,
        height: $container.height,
      });
    }

    handleScroll(ev) {
      console.log([$(window).scrollLeft(), $(window).scrollTop()]);
    }
  }
  return Spy;
}

function getDefaultDimensions(container, dimensions) {
  var dimensions = dimensions || [];
  var [width, height] = dimensions;
  if (width == null) {
    width = $(container).width();
  }
  if (height == null) {
    height = $(container).height();
  }
  return [width, height];
}

function embedComponent(Component, container, dimensions) {
  dimensions = getDefaultDimensions(container, dimensions);
  Component = getEmbeddableComponent(Component, container, dimensions);
  $(function() {
    React.render(<Component/>, container);
  });
}

class HelloWorld extends React.Component {
  render() {
    return (
      <div>Hello World</div>
    );
  }
}

$(function() {
  var initialWidth = $(document.body).width();
  var initialHeight = $(document.body).height();
  embedComponent(HelloWorld, document.body);//[10000, 10000]);
});
