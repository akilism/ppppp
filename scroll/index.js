var $ = require('jquery');
var React = require('react');
var techGrid = require('./grid.jpg');

function getEmbeddableComponent(Component, container) {
  class Tinker extends React.Component {
    render() {
      var style = {
        width: this.props.width,
        height: this.props.height,
      };
      return <div style={style}></div>;
    }
  }

  class Tailor extends React.Component {
    render() {
      throw new Error('Not Implemented');
    }
  }

  class Soldier extends React.Component {
    render() {
      throw new Error('Not Implemented');
    }
  }

  class Spy extends React.Component {
    constructor(props) {
      super(props);
      this.state = {
        viewPortWidth: null,
        viewPortHeight: null,
        windowWidth: null,
        windowHeight: null,
      };
    }

    render() {
      var initialStyle = {
        width: this.state.viewPortWidth,
        height: this.state.viewPortHeight,
        position: 'relative',
        overflow: 'scroll',
      };
      return (
        <div
          className='embedSpy'
          style={initialStyle}
          onScroll={this.handleScroll.bind(this)}>
          <Component {...this.props} />
        </div>
      );
    }

    componentWillMount() {
      this.setState({
        viewPortWidth: this.state.width || $(container).width(),
        viewPortHeight: this.state.height || $(container).height(),
        windowWidth: $(window).width(),
        windowHeight: $(window).height(),
      });
    }

    handleScroll(ev) {
      console.log([$(ev.target).scrollLeft(), $(ev.target).scrollTop()]);
    }
  }

  return Spy;
}

function embedComponent(Component, container, callback) {
  $(container).empty();
  $(window).one('load', function() {
    Component = getEmbeddableComponent(Component, container);
    React.render(<Component/>, container, callback);
  });
}

class HelloWorld extends React.Component {
  render() {
    return (
      <div className="hello"></div>
    );
  }
}

embedComponent(HelloWorld, $('.root').get(0));
