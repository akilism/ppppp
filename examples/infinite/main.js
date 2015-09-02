var $ = require('jquery');
var React = require('react');

function prepareComponent(Component, viewport) {
  class EmbeddableComponent extends React.Component {
    getChildContext() {
      return {
        x: this.state.x,
        y: this.state.y,
        width: this.state.width,
        height: this.state.height,
      };
    }

    componentWillMount() {
      var width, height;
      if (viewport === document.body) {
        [width, height] = [$(window).width(), $(window).height()];
      } else { 
        [width, height] = [$(viewport).width(), $(viewport).height()];
      }
      this.setState({width, height, x: 0, y: 0});
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
        border: '1px solid black',
      };
      return (
        <div style={style} onScroll={this.handleScroll.bind(this)}>
          <Component />
        </div>
      );
    }

    handleScroll(ev) {
      var $target = $(ev.target);
      var x = $target.scrollLeft();
      var y = $target.scrollTop();
      this.setState({x, y});
    }
  }

  EmbeddableComponent.childContextTypes = {
    width: React.PropTypes.number.isRequired,
    height: React.PropTypes.number.isRequired,
    x: React.PropTypes.number.isRequired,
    y: React.PropTypes.number.isRequired,
  };

  return EmbeddableComponent;
}

function embedComponent(Component, viewport, callback) {
  $(viewport).empty();
  Component = prepareComponent(Component, viewport);
  React.render(<Component/>, viewport, callback);
}


class Infinite extends React.Component {
  render() {
    console.log('infinite', this.context);
    return (
      <div style={{height: 2000}}>
        <Speed>
          <Position/>
        </Speed>
      </div>
    );
  }
}

Infinite.contextTypes = {
  y: React.PropTypes.number.isRequired,
};

//Infinite.childContextTypes = {
//  y: React.PropTypes.number.isRequired,
//};

class Speed extends React.Component {
  render() {
    console.log('speed', this.context);
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
    console.log('position', this.context);
    var style = {
      position: 'absolute',
      top: this.context.y,
      border: '1px solid black',
    };
    return (
      <div style={style}>{this.context.y}</div>
    );
  }
}

Position.contextTypes = {
  y: React.PropTypes.number.isRequired,
};

$(function() {
  var Infinite1 = prepareComponent(Infinite, document.body);
  React.render(<Infinite1/>, document.body);
});
