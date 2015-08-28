var $ = require('jquery');
var React = require('react');

function prepareComponent(Component, viewport) {
  class EmbeddableComponent extends React.Component {
    constructor(props) {
      super(props);
      this.state = {width: null, height: null};
    }

    render() {
      if (!this.state.width || !this.state.height) {
        throw new Error("Viewport must have an explicit width and height");
      }
      var style = {
        width: this.state.width,
        height: this.state.height,

        position: 'relative',
        overflow: 'scroll',
      };
      return (
        <div
          style={style}
          onScroll={this.handleScroll.bind(this)}>
          <Component {...this.props} />
        </div>
      );
    }

    componentWillMount() {
      var width, height;
      if (viewport === document.body) {
        width  = $(window).width();
        height = $(window).height();
      } else { 
        width = $(viewport).width();
        height = $(viewport).height();
      }
      this.setState({width, height});
    }

    handleScroll(ev) {
      console.log([$(ev.target).scrollLeft(), $(ev.target).scrollTop()]);
    }
  }

  return EmbeddableComponent;
}

function embedComponent(Component, viewport, callback) {
  $(window).one('load', function() {
    var $viewport = $(viewport);
    $viewport.empty();
    Component = prepareComponent(Component, viewport);
    React.render(<Component/>, viewport, callback);
  });
}

class HelloWorld extends React.Component {
  render() {
    return (
      <div className="hello"></div>
    );
  }
}

embedComponent(HelloWorld, document.body);
