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
        <Shade measurements={this.props.measurements} start={0} end={1}  />
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
        maxCellSize: 15,
        animate: true
    };

    this.fragmentShader = ["precision mediump float;",
      "uniform vec2 resolution;",
      "uniform vec2 mouse;",
      "uniform vec2 textureSize;",
      "uniform float scroll;",
      "uniform float time;",
      "uniform sampler2D spriteTexture;",
      "varying vec2 vTextureCoord;",
      "vec2 random2(vec2 st){",
      "    st = vec2(dot(st, vec2(127.1,311.7)), dot(st, vec2(269.5,183.3)));",
      "    return -1.0 + 2.0 * fract(sin(st) * 43758.5453123);",
      "}",
      "float noise(vec2 st) {",
      "    vec2 i = floor(st);",
      "    vec2 f = fract(st);",
      "    vec2 u = f*f*(3.0-2.0*f);",
      "    return mix(mix(dot(random2(i + vec2(0.0,0.0)), f - vec2(0.0,0.0)), dot(random2(i + vec2(1.0,0.0)), f - vec2(1.0,0.0)), u.x),",
      "               mix(dot(random2(i + vec2(0.0,1.0)), f - vec2(0.0,1.0)), dot(random2(i + vec2(1.0,1.0)), f - vec2(1.0,1.0)), u.x), u.y);",
      "}",
      "void main() {",
      "  vec2 st = gl_FragCoord.xy / resolution.xy;",
      "  vec2 st_texture = gl_FragCoord.xy / textureSize.xy;",
      "  vec2 st_mouse = mouse.xy / resolution.xy;",
      "  float _time = time / 30.0;",
      "  vec3 color = vec3(0.0);",
      "  vec2 pos;",
      "  float n2;",
      "  vec3 c = vec3(0.0);",
      "  mat2 m = mat2(1.25, 1.1, -1.2, 1.5);",
      "  for(float i = 0.0; i < 30.0; i++) {",
      "    pos = ((st * sin(0.25 * i + 0.50) + 0.05 * _time) * 8.0);",
      // "    pos = (st * cos(i * 0.5 + 0.25) + 0.15 * _time) * 10.0;",
      // "    pos = (st + (_time * 0.5)) * 10.0;",
      "    n2  = 0.8000 * noise(pos); pos = m * pos * 1.01;",
      "    n2 += 0.6500 * noise(pos); pos = m * pos * 1.02;",
      "    n2 += 0.4250 * noise(pos); pos = m * pos * 1.03;",
      "    n2 += 0.20625 * noise(pos); pos = m * pos * 1.14;",
      "    n2 = n2 * 2.5 * 0.25;",
      "    c += vec3(n2 * n2);",
      "  }",
      "  color = c;",
      "  float modifier = 3.0 * (2.0 * scroll);",
      // "  gl_FragColor = vec4(smoothstep(0.0, 1.0, color / modifier), 0.25) + texture2D(spriteTexture, vTextureCoord);",
      "vec4 spriteValue = texture2D(spriteTexture, vTextureCoord);",
      "vec4 shadeValue = vec4(smoothstep(0.0, 1.0, color / modifier), 0.0);",
      "float alpha = 1.0 - (shadeValue.r + shadeValue.g + shadeValue.b);",
      "if(alpha <= 0.0 || scroll == 0.0 || spriteValue.a == 0.0) {",
      "  discard;",
      "} else {",
      // spriteValue + vec4(smoothstep(0.0, 1.0, color / modifier), 0.0);
      // "  gl_FragColor = vec4(spriteValue.rgb, alpha);",
      "  gl_FragColor = vec4(smoothstep(0.0, 1.0, spriteValue.rgb), alpha);",
      "}",
      "}"].join('');
  }

  componentWillReceiveProps() {
    this.setState(this.adjust(this.state));
  }

  isActive(d){
    return (d.pctScroll >= this.props.start && d.pctScroll < this.props.end);
  }

  adjust(last_state) {
    var {viewportHeight, viewportTop, adjustedViewportTop, contentHeight, pctScroll} = this.props.measurements,
        adjustedPctScroll = this.scaler(pctScroll),
        active = this.isActive(this.props.measurements),
        maxCellSize = this.state.maxCellSize,
        animate = last_state.animate;

    if(active) {
      this.shader.uniforms.scroll.value = adjustedPctScroll;
    }

    return {animate: false};
  }

  componentDidMount() {
    var gza = PIXI.Sprite.fromImage("/shade/gza.png");
    gza.width = 260;
    gza.height = 613;
    gza.position = new PIXI.Point(525, 45);

    this.renderer = new PIXI.WebGLRenderer(this.props.measurements.viewportWidth,this.props.measurements.viewportHeight-0, {transparent: true});
    this.refs.stage.appendChild(this.renderer.view);

    this.stage = new PIXI.Container();
    this.uniforms = {
      resolution: { type: "v2", value: {x: this.props.measurements.viewportWidth, y: this.props.measurements.viewportHeight-0}},
      time: {type: "1f", value: 0.0},
      mouse: { type: "v2", value: {x: 0.0, y: 0.0}},
      textureSize: { type: "v2", value: {x: 260.0, y: 613.0}},
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
        <div ref="stage" className="pixi-stage" style={{width: "100%", height: "100%"}} ></div>
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
