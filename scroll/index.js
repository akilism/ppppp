var $ = require('jquery');
var React = require('react');

function prepareComponent(Component, viewport) {
  class EmbeddableComponent extends React.Component {
    constructor(props) {
      super(props);
      this.state = {
        width: null, height: null,
        x: null, y: null,
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
          <Component scrollX={this.state.x} scrollY={this.state.y} {...this.props} />
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
      this.setState({
        x: $target.scrollLeft(),
        y: $target.scrollTop(),
      });
    }
  }

  return EmbeddableComponent;
}

function embedComponent(Component, viewport, callback) {
  $(window).one('load', () => {
    var $viewport = $(viewport);
    $viewport.empty();
    Component = prepareComponent(Component, viewport);
    React.render(<Component/>, viewport, callback);
  });
}

class HelloWorld extends React.Component {
  constructor(props) {
    super(props);
    this.state = {scrollX: null, scrollY: null, vx: 0, vy: 0};
  }

  render() {
    return (
      <div style={{width: 10000, height: 10000}}>
        <div style={{position: 'fixed', top: '50%', left: '50%',}}>{this.state.vx},{this.state.vy}</div>
      </div>
    );
  }

  componentWillReceiveProps(nextProps) {
    var vx = nextProps.scrollX - this.state.scrollX;
    var vy = nextProps.scrollY - this.state.scrollY;
    this.setState({
      scrollX: nextProps.scrollX,
      scrollY: nextProps.scrollY,
      vx: vx,
      vy: vy,
    });
  }
}

embedComponent(HelloWorld, document.getElementById('root'));
