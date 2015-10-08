var $ = require('jquery');
var React = require('react');
var ReactDOM = require('react-dom');
var _ = require('underscore');
var directions = require('directions');
var Conti = require('conti');

var scaler = (function(currMin, currMax, otherMin, otherMax) {
  var left = currMax - currMin;
  var right = otherMax - otherMin;

  var scale = right / left;

  var getVal = function(val) {
    return otherMin + (val - currMin) * scale;
  };

  return getVal;
});

window.Conti = Conti;
window.jQ = $;

Math.linearTween = function (t, b, c, d) { return c*t/d + b; };
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


function createViewport(Component, container) {
  class Viewport extends React.Component {
    getChildContext() {
      return {
        getPercentage: this.getPct.bind(this),
        getPercentageInverse: this.getInv.bind(this),
        toggleWormhole: this.toggleWormhole.bind(this)
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

      this.setState({measurements:
          { viewportWidth,
            viewportHeight,
            viewportLeft: 0,
            viewportTop: 0,
            contentHeight: (viewportHeight * 20),
            adjustedViewportTop: 0,
            pctScroll: 0,
            wormholeDist: 0,
            wormholeActive: false },
        wormholeJump: null,
        jumpDiff: 0,
        wormholePosition: null});
    }

    componentDidMount() {
      $(window).on('scroll', _.throttle(this.handleScroll.bind(this), 10));
    }

    toggleWormhole(wormholeJump) {
      wormholeJump = wormholeJump || this.state.wormholeJump;

      var newState = this.calculateMeasurements(!this.state.measurements.wormholeActive, wormholeJump);
      newState.measurements.wormholeActive = !this.state.measurements.wormholeActive;
      newState.wormholePosition = this.state.measurements.viewportTop;
      this.setState(newState);
    }

    handleScroll(ev) {
      var newState = this.calculateMeasurements(this.state.measurements.wormholeActive, this.state.wormholeJump);
      this.setState(newState);
    }

    calculateMeasurements(wormholeActive, wormholeJump) {
      var viewportLeft = 0, //$(ev.target).scrollLeft(),
          viewportTop = $(window).scrollTop(),
          contentHeight = this.state.measurements.contentHeight,
          adjustedViewportTop = (viewportTop / this.state.measurements.viewportHeight) * (contentHeight * 0.1),
          wormholeDist = this.state.measurements.wormholeDist,
          jumpDiff = this.state.jumpDiff,
          pctScroll;

      // when the wormhole is active viewport top is set to the wormhole activation point. this effectively
      // freezes the non-wormhole components in place to their pre-wormhole positions.
      // when the wormhole is off we subtract the wormhole travelled distance from the viewport top so that
      // pctScroll is calculated as if you never scrolled into the wormhole.
      if(wormholeActive) {
        wormholeDist = this.state.wormholePosition ? viewportTop - this.state.wormholePosition : 0;
        viewportTop = this.state.wormholePosition ?  this.state.wormholePosition : viewportTop;
      } else {
        // wormholeJump is the exit pctScroll location for the wormhole.
        // This is calculated once when we jump out of a wormhole.
        // That value is then applied on each new viewportTop when calculating the pctScroll.
        if(wormholeJump) {
          var jumpTop = wormholeJump * (contentHeight - this.state.measurements.viewportHeight);
          jumpDiff = (viewportTop - wormholeDist) - jumpTop;
          wormholeJump = null;
        }

        viewportTop = (viewportTop - wormholeDist < 0) ? 0 : (viewportTop - wormholeDist);
      }

      pctScroll = (viewportTop - jumpDiff) / (contentHeight - this.state.measurements.viewportHeight);
      //Ugly but stops the cards from scroll past 0.
      pctScroll = (pctScroll < 0) ? 0 : pctScroll;

      return {
        wormholeJump,
        jumpDiff,
        measurements: _.extend(this.state.measurements, {viewportLeft, viewportTop, contentHeight, adjustedViewportTop, pctScroll, wormholeDist})
      };
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

    // These are probably not going to be used anymore. They were for
    // finding a markers pctScroll and invScroll.
    getPct(ref, anchor) {
      var component = this.bfs(ref);
      return component.getPct(anchor);
    }

    getInv(ref, anchor) {
      var component = this.bfs(ref);
      return component.getInv(anchor);
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
    //End unused stuff.
  }

  Viewport.childContextTypes = {
    getPercentage: React.PropTypes.func.isRequired,
    getPercentageInverse: React.PropTypes.func.isRequired,
    toggleWormhole: React.PropTypes.func.isRequired
  };

  return Viewport;
}

class Root extends React.Component {
  constructor(props) {
    super(props)
  }

  render() {
    // <PixelTransition measurements={this.props.measurements} start={0} end={0.5} imagePath="/akilpixi/wiki.jpg" imagePath2="/akilpixi/gza.jpg" />
    // <PixelFace measurements={this.props.measurements} start={0} end={0.1} imagePath="/akilpixi/ratking.jpg" />
    // <ScrambleMask measurements={this.props.measurements} start={0} end={0.1} imagePath="/akilpixi/ratking.jpg" />
    return (
      <div>
        <Shade measurements={this.props.measurements} start={0} end={0.25}  />
        <audio id="sfxError">
          <source src="/akilpixi/error.wav" type="audio/wav" />
        </audio>
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
    this.scaler = scaler(this.props.start, this.props.end, 0, 1);
  }

  adjust() {
    throw "You must override adjust"
  }

  errorInput() {
    //shake screen or something here.
    console.error("ERROR INPUT!!!!");
    $(".stage-bg").addClass("shake");
    // $("#sfxError")[0].stop();
    var $sfxError = $("#sfxError");
    $sfxError[0].currentTime = 0;
    $sfxError[0].play();
    setTimeout(() => {
      $(".stage-bg").removeClass("shake");
    }, 100);
  }

  bindHandlers() {
    $(window).on("keydown", (e) => {
        if(e.keyCode == 16){
          e.preventDefault();
          this.errorInput();
          return false;
        }
    });
  }
}

ScanComponent.contextTypes = {
  getPercentage: React.PropTypes.func.isRequired,
  toggleWormhole: React.PropTypes.func.isRequired
};


class Shade extends ScanComponent {
  constructor(props) {
    super(props);
    this.state = {
    };

    this.fragmentShader = ["precision mediump float;",
      "uniform vec2 resolution;",
      "uniform vec2 mouse;",
      "uniform float scroll;",
      "uniform float time;",
      "float random(vec2 st, float multiplier) {",
      "  return fract(sin(dot(st.xy, vec2(21.8380, 132.039932))) * multiplier);",
      "}",
      "vec2 truchetPattern(vec2 _st, float _index) {",
      "  _index = fract(((_index - 0.5) * 2.0));",
      "  if(_index > 0.75) {",
      "    _st = vec2(1.0) - _st;",
      "  } else if(_index > 0.5) {",
      "    _st = vec2(1.0 - _st.x, _st.y);",
      "  } else if(_index > 0.25) {",
      "    _st = 1.0 - vec2(1.0 - _st.x, _st.y);",
      "  }",
      "  return _st;",
      "}",
      "void main() {",
      "  vec2 st = gl_FragCoord.xy / resolution.xy;",
      "  vec2 st_mouse = mouse.xy / resolution.xy;",
      "  float _time = time / 60.0;",
      "  st *= 10.0;",
      "  st = (st - vec2(5.0)) * 1.5;",
      "  vec2 ipos = floor(st);",
      "  vec2 fpos = fract(st);",
      "  vec2 tile = truchetPattern(fpos, random(ipos, (scroll * _time)));",
      "  float color = 0.0;",
      "  color = (step(length(tile), 0.6) - step(length(tile), 0.4)) + (step(length(tile - vec2(1.0)), 0.6) - step(length(tile - vec2(1.0)), 0.4));",
      "  gl_FragColor = vec4((vec3(color) - vec3(0.50,0.25,0.5)), 1.0);",
      "}"].join('');
  }

  componentWillReceiveProps() {
    this.setState(this.adjust(this.state));
  }

  componentWillMount() {
    this.setState({textTop: -this.props.measurements.viewportHeight});
  }

  isActive(d){
    return (d.pctScroll >= this.props.start && d.pctScroll < this.props.end);
  }

  adjust(last_state) {
    var {viewportHeight, viewportWidth, viewportTop, adjustedViewportTop, contentHeight, pctScroll} = this.props.measurements,
        adjustedPctScroll = this.scaler(pctScroll),
        active = this.isActive(this.props.measurements),
        maxCellSize = this.state.maxCellSize,
        animate = last_state.animate,
        textTop = last_state.textTop;

    if(active) {
      this.shader.uniforms.scroll.value = adjustedPctScroll;
      textTop = Math.linearTween(adjustedPctScroll, -viewportHeight, viewportHeight, 1);
    }

    return {textTop: textTop};
  }

  componentDidMount() {
    var gza = PIXI.Sprite.fromImage("/shade/gza.png");
    gza.width = this.props.measurements.viewportWidth;
    gza.height = this.props.measurements.viewportHeight;

    this.renderer = new PIXI.WebGLRenderer(this.props.measurements.viewportWidth,this.props.measurements.viewportHeight-0, {transparent: true});
    this.refs.stage.appendChild(this.renderer.view);

    this.stage = new PIXI.Container();
    this.uniforms = {
      resolution: { type: "v2", value: {x: this.props.measurements.viewportWidth, y: this.props.measurements.viewportHeight-0}},
      time: {type: "1f", value: 0.0},
      mouse: { type: "v2", value: {x: 0.0, y: 0.0}},
      textureSize: { type: "v2", value: {x: this.props.measurements.viewportWidth, y: this.props.measurements.viewportHeight}},
      spriteTexture: {type: "sampler2D", value: gza.texture },
      scroll: {type: "1f", value: 0.0}
    };

    this.shader = new PIXI.AbstractFilter(null, this.fragmentShader, this.uniforms);
    this.count = 0;

    gza.shader = this.shader;
    this.interactionManager = new PIXI.interaction.InteractionManager(this.renderer);
    this.stage.addChild(gza);
    this.animate();
    this.bindHandlers();
  }

  animate() {
    requestAnimationFrame(() => { this.animate(); });
    var mouse = this.interactionManager.mouse.global;
    this.shader.uniforms.time.value = this.count;

    if (mouse.x > 0 && mouse.y > 0) {  // If mouse is over stage
      this.shader.uniforms.mouse.value = {x: mouse.x, y: mouse.y};
    }

    this.count++;
    this.renderer.render(this.stage);
  }

  render() {
    return(
      <div className="stage-bg" style={{position: "fixed", width: this.props.measurements.viewportWidth, height: this.props.measurements.viewportHeight-0}}>
        <div ref="stage" className="pixi-stage" style={{width: "100%", height: "100%"}}></div>
        <div ref="text" className="hero-text" style={{transform: "translate(0px, "  + this.state.textTop + "px)"}}>
          15 minutes later, I felt my brain rearranging.
        </div>
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
