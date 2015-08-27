var $ = require('jquery');
var React = require('react');
var {maps} = require('google');

function getEmbeddedComponent(Component, [width, height], container) {

  class Spy extends React.Component {
    constructor() {
      super();
      this.state = {
        width: width,
        height: height,
      };
    }

    render() {
      var width = this.state.width || 10000;
      var height = this.state.height || 10000;
      var initialStyle = {
        width: `${width}`,
        height: `${height}`,
        position: 'absolute',
        top: '50%',
        left: '50%',
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
      $(window).on('scroll', this.handleScroll);
    }

    handleScroll(ev) {
      console.log([$(window).scrollLeft(), $(window).scrollTop()]);
    }
  }
  return Spy;
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
  var EmbeddedHelloWorld = getEmbeddedComponent(HelloWorld, [10000, 10000], document.body);
  React.render(<EmbeddedHelloWorld/>, document.body);
});
