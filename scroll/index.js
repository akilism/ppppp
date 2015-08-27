var $ = require('jquery');
var React = require('react');

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

// Do not call this before window loading;
function embedComponent(Component, container, dimensions) {
  $(window).load(function() {
    dimensions = getDefaultDimensions(container, dimensions);
    Component = getEmbeddableComponent(Component, container, dimensions);
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
