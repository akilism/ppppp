var $ = require('jquery');
var React = require('react');

function prepareComponent(Component, viewport) {
  class EmbeddableComponent extends React.Component {
    constructor(props) {
      super(props);
      this.state = {
        width: null,    height: null,
        scrollX: null,  scrollY: null,
        scrollVX: 0, scrollVY: 0,
      };
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
          <Component {...this.props} {...this.state} />
        </div>
      );
    }

    componentWillMount() {
      var width, height;
      if (viewport === document.body) {
        [width, height] = [$(window).width(), $(window).height()];
      } else { 
        [width, height] = [$(viewport).width(), $(viewport).height()];
      }
      this.setState({width, height});
    }

    handleScroll(ev) {
      var $target = $(ev.target);
      var scrollX = $target.scrollLeft();
      var scrollY = $target.scrollTop();
      var scrollVX = scrollX - this.state.scrollX;
      var scrollVY = scrollY - this.state.scrollY;
      this.setState({
        scrollX,
        scrollY,
        scrollVX,
        scrollVY,
      });
    }
  }

  return EmbeddableComponent;
}

function embedComponent(Component, viewport, callback) {
  $(window).one('load', () => {
    $(viewport).empty();
    Component = prepareComponent(Component, viewport);
    React.render(<Component/>, viewport, callback);
  });
}

class HelloWorld extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    return (
      <div style={{width: 10000, height: 10000}}>
        <div style={{position: 'fixed', top: '50%', left: '50%',}}>{this.props.scrollVX},{this.props.scrollVY}</div>
      </div>
    );
  }
}

embedComponent(HelloWorld, document.getElementById('root'));
