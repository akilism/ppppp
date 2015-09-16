var $ = require('jquery');
var React = require('react');
var ReactDOM = require('react-dom');
var _ = require('underscore');
var directions = require('directions');

Math.linearTween = function (t, b, c, d) {
  //
  return c*t/d + b;
};
Math.easeOutBack = function (t, b, c, d, s) {
    if (s === undefined) s = 1.70158;
    return c*((t=t/d-1)*t*((s+1)*t + s) + 1) + b;
};
Math.easeInOutQuad = function (t, b, c, d) {
  t /= d/2;
  if (t < 1) return c/2*t*t + b;
  t--;
  return -c/2 * (t*(t-2) - 1) + b;
};

// "markers": [{"name": "crown-vic", "anchor": 0.75}];

var scene = [
    { "name": "marseille",
      "type": "title",
      "title": "MARSEILLE",
      "backgroundImage": "/erik3/marseille_1.jpg",
      "fontSize": 250,
      "coords": { "lat": 40.8025967, "lng": -73.9502753},
      "progressIndicator": {
        "name": "Marseille",
        "location": "France",
        "startPosition": 0,
        "endPosition": 0.15,
      }},
    // {"name": "progressmap",
    //  "type": "routemap"},
    {"name": "square",
      "type": "slide1",
      "coords": { "lat": 40.780916, "lng": -73.972981 },
      "progressIndicator": {
        "name": "Marseille Square",
        "location": "Marseille, France",
        "startPosition": 0.15,
        "endPosition": 0.35
      }},
    {"name": "slide2",
      "type": "slide2",
      "coords": { "lat": 40.704021, "lng": -74.017073},
      "progressIndicator": {
        "name": "Life is Hard",
        "location": "Marseille, France",
        "startPosition": 0.35,
        "endPosition": 1
      }},
      ];


function createViewport(Component, container) {
  class Viewport extends React.Component {
    getChildContext() {
      return {
        getPercentage: this.getPct.bind(this),
        getPercentageInverse: this.getInv.bind(this)
      };
    }

    componentWillMount() {
      var viewportWidth, viewportHeight;
      if (container === document.body) {
        //if mobile use screen height and width
        [viewportWidth, viewportHeight] = [$(window).width(), $(window).height()+56];
      } else {
        [viewportWidth, viewportHeight] = [$(container).width(), $(container).height()];
      }
      if (!viewportWidth || !viewportHeight) {
        throw new Error("Viewport must have a non-zero width and height");
      }

      this.setState({measurements: {
        viewportWidth, viewportHeight, viewportLeft: 0, viewportTop: 0,
        contentHeight: (viewportHeight * 4), adjustedViewportTop: 0,
        pctScroll: 0 }});
    }

    componentDidMount() {
      $(window).on('scroll', _.throttle(this.handleScroll.bind(this), 10));
    }

    render() {
      var style = {
        width: this.state.measurements.viewportWidth,
        height: this.state.measurements.contentHeight,
      };

      return (
        <div style={style}>
          <Component ref="viewportRoot" measurements={this.state.measurements} />
        </div>
      );
    }

    getPct(ref, anchor) {
      var component = this.bfs(ref);
      return component.getPct(anchor);
    }

    getInv(ref, anchor) {
      var component = this.bfs(ref);
      return component.getInv(anchor);
    }

    handleScroll(ev) {
      var viewportLeft = $(ev.target).scrollLeft(),
          viewportTop = $(ev.target).scrollTop(),
          contentHeight = this.state.measurements.contentHeight,
          adjustedViewportTop = (viewportTop / this.state.measurements.viewportHeight) * (contentHeight * 0.1),
          pctScroll = viewportTop / contentHeight; //(contentHeight - this.state.measurements.viewportHeight);
      // console.log("pctScroll:", pctScroll, " contentHeight:", contentHeight, " viewportTop:", viewportTop, " viewportHeight:", this.state.measurements.viewportHeight);
      this.setState({measurements: _.extend(this.state.measurements, {viewportLeft, viewportTop, contentHeight, adjustedViewportTop, pctScroll})});
    }

    bfs(ref) {
      let items = [];
      let path = [];

      var buildPath = function(path) { return path.reverse().join(' -> '); };

      var search = function(items, goal, path) {
        if(items.length === 0) { throw new Error('Item not found.'); }
        let [refName, component] = items.shift();
        if(goal === refName) { return component; }
        return search(_.pairs(component.refs).concat(items), goal, path.concat(refName));
      };

      return search(_.pairs(this.refs), ref, []);
    }
  }

  Viewport.childContextTypes = {
    getPercentage: React.PropTypes.func.isRequired,
    getPercentageInverse: React.PropTypes.func.isRequired,
  };

  return Viewport;
}

class Root extends React.Component {
  constructor(props) {
    super(props)
  }

  render() {
    return (
      <div>
        <SlideComponent measurements={this.props.measurements} start={0.75} end={1}    backgroundColor="black" />
        <SlideComponent measurements={this.props.measurements} start={0.5}  end={0.75} backgroundColor="yellow" />
        <SlideComponent measurements={this.props.measurements} start={0.25} end={0.5}  backgroundColor="magenta" />
        <Slide1 />
        <Title measurements={this.props.measurements} start={0}  end={0.25} title="marseille" backgroundImage="/erik3/marseille_1.jpg" />
      </div>
    );
  }
}

class Base extends React.Component {
  constructor(props) {
    super(props);
  }

  getPct(anchor) {
    var {viewportHeight, adjustedViewportTop} = this.props.measurements,
      $p = $(ReactDOM.findDOMNode(this)),
      el_height = $p.outerHeight(),
      el_top = $p.position().top,
      scroll_anchor = adjustedViewportTop + (viewportHeight * anchor),
      pct_elapsed,
      pct_elapsed_raw;
      // isActive = ($p.attr("data-activate") === "true") ? true : false;

    if (el_top > scroll_anchor) {
      pct_elapsed = 0;
    } else if (el_top + el_height < scroll_anchor) {
      pct_elapsed = 1.0;
    } else {
      pct_elapsed = (scroll_anchor - el_top) / el_height;
    }
    pct_elapsed_raw = (scroll_anchor - el_top) / el_height;
    //el_id: $p.attr("id"), isActive: isActive
    return {pct_elapsed: pct_elapsed, pct_elapsed_raw: pct_elapsed_raw};
  }

  getInv(anchor) {
    var {viewportHeight, viewportTop} = this.props.measurements,
      $p = $(ReactDOM.findDOMNode(this)),
      el_height = $p.outerHeight(),
      el_top = $p.position().top,
      el_anchor = el_top + (el_height * anchor),
      pct_elapsed,
      pct_elapsed_raw;

      if (el_anchor > viewportTop + viewportHeight) {
        pct_elapsed = 0;
      } else if (el_anchor < viewportTop) {
        pct_elapsed = 1.0;
      } else {
        pct_elapsed = 1 - ((el_anchor - viewportTop) / viewportHeight);
      }
      pct_elapsed_raw = 1 - ((el_anchor - viewportTop) / viewportHeight);
      // el_id: $(p).attr("id"), isActive: isActive
      return {pct_elapsed: pct_elapsed, pct_elapsed_raw: pct_elapsed_raw};
  }
}

class MarkerComponent extends Base {
  constructor(props) {
    super(props);
  }

  render() {
    return (
      <p className="marker-p" id={this.props.id}  onClick={this.props.clickHandler} data-activate={this.props.isActive}>
        {this.props.copy}
      </p>
    );
  }
}

class ScanComponent extends Base {
  constructor(props) {
    super(props);
  }

  adjust() {
    throw "You must override adjust"
  }
}

ScanComponent.contextTypes = {
  getPercentage: React.PropTypes.func.isRequired,
};

class SlideComponent extends ScanComponent {
  constructor(props) {
    super(props);
    this.state = {
      top: 0
    }
  }

  componentWillReceiveProps() {
    this.setState(_.extend(this.state, this.adjust(this.state)));
  }

  adjust(last_state) {
    var {viewportHeight, viewportTop, adjustedViewportTop, contentHeight, pctScroll} = this.props.measurements;

    var destTop = viewportHeight * -1,
      newTop;

    if (pctScroll >= this.props.end) {
        newTop = destTop;
    } else if(pctScroll >= this.props.start){
        newTop = Math.linearTween((pctScroll-this.props.start), 0, destTop, 0.1);
    } else {
      newTop = 0;
    }

    return {top: newTop};
  }

  render() {
    // width: this.props.measurements.viewportWidth
    return(
      <div className='bg-slide' style={{
        top: this.state.top,
        backgroundColor: this.props.backgroundColor,
        height: this.props.measurements.viewportHeight,
      }}>
       {this.props.backgroundColor}
      </div>
    )
  }
}

class Title extends ScanComponent {
  constructor(props) {
    super(props);
    this.state = {
      top: 0
    };
  }

  componentWillReceiveProps() {
    this.setState(_.extend(this.state, this.adjust(this.state)));
  }

  adjust(last_state) {
    var {viewportHeight, viewportTop, adjustedViewportTop, contentHeight, pctScroll} = this.props.measurements;

    var dest_top = viewportHeight * -1,
      newTop;
    if(pctScroll < 0.1){
        newTop = Math.linearTween((pctScroll-this.props.start), 0, dest_top, 0.1);
    } else if (pctScroll) {
        newTop = dest_top;
    }
    return {top: newTop};
  }

  render() {
    return(
      <div className='bg-slide' style={{
        height: this.props.measurements.viewportHeight,
        top: this.state.top,
        backgroundImage: "url('" + this.props.backgroundImage + "')",
        backgroundSize: "cover"
      }}>
        <h3 className="vid-title" style={{fontSize: this.props.fontSize}}>{this.props.title}</h3>
      </div>
    )
  }
}



function embedComponent(Component, container, callback) {
  $(container).empty();
  var Viewport = createViewport(Component, container);
  ReactDOM.render(<Viewport/>, container, callback);
}

$(function() {
  embedComponent(Root, document.body);
});

var animatePov = function(sv,pov){
    var start_pov = sv.getPov(),
        ticks = 24,
        heading_d = pov.heading - start_pov.heading,
        pitch_d = pov.pitch - start_pov.pitch,
        zoom_d = pov.zoom - start_pov.zoom,
        i = 0;
    var next = function(){
        var pov = sv.getPov(),
            h = pov.heading,
            p = pov.pitch,
            z = pov.zoom,
            new_heading = Math.easeInOutQuad(i,start_pov.heading,heading_d,ticks),
            new_pitch = Math.easeInOutQuad(i,start_pov.pitch,pitch_d,ticks),
            new_zoom = Math.easeInOutQuad(i,start_pov.zoom,zoom_d,ticks);
        console.log(new_heading)
        sv.setPov({heading: new_heading, pitch: new_pitch, zoom: new_zoom});
        i++;
        if(i < ticks){
            setTimeout(function(){
              next();
            },33)
        }
    }
    next();
};
