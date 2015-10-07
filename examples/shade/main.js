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

    //"  gl_FragColor.r = abs(sin(u_time / 50.0));",
    this.fragmentShader = ["precision mediump float;",
      "uniform vec2 resolution;",
      "uniform vec2 mouse;",
      "uniform float scroll;",
      "uniform float time;",
      "void main() {",
      "  vec2 st = gl_FragCoord.xy / resolution;",
      "  gl_FragColor.r = 0.0;",
      "  gl_FragColor.g = st.y;",
      "  gl_FragColor.b = abs(cos(scroll));",
      "  gl_FragColor.a = scroll;",
      "}"].join('');
    this.fragmentShader = ["precision mediump float;",
      "uniform vec2 resolution;",
      "uniform vec2 mouse;",
      "uniform float scroll;",
      "uniform float time;",
      "float field(in vec3 p,float s) {",
      "  float _time = time / 30.0;",
      "  float strength = 7. + .03 * log(1.e-6 + fract(sin(_time) * 4373.11));",
      "  float accum = s/4.;",
      "  float prev = 0.;",
      "  float tw = 0.;",
      "  for (int i = 0; i < 26; ++i) {",
      "    float mag = dot(p, p);",
      "    p = abs(p) / mag + vec3(-.5, -.4, -1.5);",
      "    float w = exp(-float(i) / 7.);",
      "    accum += w * exp(-strength * pow(abs(mag - prev), 2.2));",
      "    tw += w;",
      "    prev = mag;",
      "  }",
      "  return max(0., 5. * accum / tw - .7);",
      "}",
      "float field2(in vec3 p, float s) {",
      "  float _time = time / 30.0;",
      "  float strength = 7. + .03 * log(1.e-6 + fract(sin(_time) * 4373.11));",
      "  float accum = s/4.;",
      "  float prev = 0.;",
      "  float tw = 0.;",
      "  for (int i = 0; i < 18; ++i) {",
      "    float mag = dot(p, p);",
      "    p = abs(p) / mag + vec3(-.5, -.4, -1.5);",
      "    float w = exp(-float(i) / 7.);",
      "    accum += w * exp(-strength * pow(abs(mag - prev), 2.2));",
      "    tw += w;",
      "    prev = mag;",
      "  }",
      "  return max(0., 5. * accum / tw - .7);",
      "}",
      "vec3 nrand3( vec2 co )",
      "{",
      "  vec3 a = fract( cos( co.x*8.3e-3 + co.y )*vec3(1.3e5, 4.7e5, 2.9e5) );",
      "  vec3 b = fract( sin( co.x*0.3e-3 + co.y )*vec3(8.1e5, 1.0e5, 0.1e5) );",
      "  vec3 c = mix(a, b, 0.5);",
      "  return c;",
      "}",
      "void main() {",
      "  float _time = time / 30.0;",
      "  vec2 uv = 2. * gl_FragCoord.xy / resolution.xy - 1.;",
      "  vec2 uvs = uv * resolution.xy / max(resolution.x, resolution.y);",
      "  vec3 p = vec3(uvs / 4., 0) + vec3(1., -1.3, 0.);",
      "  p += .2 * vec3(sin(_time / 16.), sin(_time / 12.),  sin(_time / 128.));",
      "  float freqs[4];",
      "  float t = field(p,freqs[2]);",
      "  float v = (1. - exp((abs(uv.x) - 1.) * 6.)) * (1. - exp((abs(uv.y) - 1.) * 6.));",
      "  vec3 p2 = vec3(uvs / (4.+sin(_time*0.11)*0.2+0.2+sin(_time*0.15)*0.3+0.4), 1.5) + vec3(2., -1.3, -1.);",
      "  p2 += 0.25 * vec3(sin(_time / 16.), sin(_time / 12.),  sin(_time / 128.));",
      "  float t2 = field2(p2,freqs[3]);",
      "  vec4 c2 = mix(.4, 1., v) * vec4(1.3 * t2 * t2 * t2 ,1.8  * t2 * t2 , t2* freqs[0], t2);",
      "  vec2 seed = p.xy * 2.0; ",
      "  seed = floor(seed * resolution.x);",
      "  vec3 rnd = nrand3( seed );",
      "  vec4 starcolor = vec4(pow(rnd.y,40.0));",
      "  vec2 seed2 = p2.xy * 2.0;",
      "  seed2 = floor(seed2 * resolution.x);",
      "  vec3 rnd2 = nrand3( seed2 );",
      "  starcolor += vec4(pow(rnd2.y,40.0));",
      "  gl_FragColor = mix(freqs[3]-.3, 1., v) * vec4(1.5*freqs[2] * t * t* t , 1.2*freqs[1] * t * t, freqs[3]*t, 1.0)+c2+starcolor;",
      "}"].join('');
    this.fragmentShader = ["precision mediump float;",
      "uniform vec2 resolution;",
      "uniform vec2 mouse;",
      "uniform vec2 time;",
      "float plot(vec2 st, float pct) {",
      "  return smoothstep(pct - 0.01, pct, st.y) - smoothstep(pct, pct + 0.01, st.y);",
      "}",
      "void main() {",
      "  vec2 st = gl_FragCoord.xy / resolution;",
      "  float y = sin(st.x);",
      "  vec3 color = vec3(y);",
      "  float pct = plot(st, y);",
      "  color = (1.0 - pct) * color + pct * vec3(0.0,1.0,0.0);",
      "  gl_FragColor = vec4(color, 1.0);",
      "}"].join('');
    this.fragmentShader = ["precision mediump float;",
        "uniform vec2 resolution;",
        "uniform vec2 mouse;",
        "uniform float scroll;",
        "uniform float time;",
        "float field(in vec3 p) {",
        "  float _time = time / 30.0;",
        "  float strength = 7. + .03 * log(1.e-6 + fract(sin(_time) * 4373.11));",
        "  float accum = 0.;",
        "  float prev = 0.;",
        "  float tw = 0.;",
        "  for (int i = 0; i < 32; ++i) {",
        "    float mag = dot(p, p);",
        "    p = abs(p) / mag + vec3(-.5, -.4, -1.5);",
        "    float w = exp(-float(i) / 7.);",
        "    accum += w * exp(-strength * pow(abs(mag - prev), 2.3));",
        "    tw += w;",
        "    prev = mag;",
        "  }",
        "  return max(0., 5. * accum / tw - .7);",
        "}",
        "void main() {",
        "  float _time = time / 30.0;",
        "  float _scroll = scroll * 100.0;",
        "  vec2 uv = 2. * gl_FragCoord.xy / resolution.xy - 1.;",
        "  vec2 uvs = uv * resolution.xy / max(resolution.x, resolution.y);",
        "  vec3 p = vec3(uvs / 4., 0) + vec3(1., -1.3, 0.);",
        "  p += .2 * vec3(sin(_scroll / 16.), sin(_scroll / 12.),  sin(_time / 128.));",
        "  float t = field(p);",
        "  float v = (1. - exp((abs(uv.x) - 1.) * 6.)) * (1. - exp((abs(uv.y) - 1.) * 6.));",
        "  gl_FragColor = mix(.4, 1., v) * vec4(1.8 * t * t * t, 1.4 * t * t, t, 1.0);",
        "}"].join('');
  }

  componentWillReceiveProps() {
    this.setState(this.adjust(this.state));
  }

  isActive(d){
    return (d.pctScroll >= this.props.start && d.pctScroll < this.props.end);
  }

  randomFill(width, height) {
    var arr = _.flatten(Array(width*height).fill(0).map(() => {
      return (Math.random() > 0.75) ? [255.0,255.0,255.0,255.0] : [0.0,0.0,0.0,255.0];
    }));
    return new Uint8ClampedArray(arr);
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

  makeInitialGameState(width, height) {
    var fill = this.randomFill(width, height);
    var initialStage = new PIXI.Container();
    var renderer = new PIXI.CanvasRenderer(width, height, null, true);
    var context = renderer.context;
    var imageData = new ImageData(fill, width, height);

    this.refs.stage.appendChild(renderer.view);
    renderer.render(initialStage);
    context.putImageData(imageData, 0, 0);
    return renderer.view;
  };

  componentDidMount() {
    //var initialState = this.makeInitialGameState(this.props.measurements.viewportWidth, this.props.measurements.viewportHeight-0);
    var bg = PIXI.Sprite.fromImage("http://www.goodboydigital.com/pixijs/examples/25/test_BG.jpg");
    //var initialTexture = PIXI.Texture.fromCanvas(initialState);
    var initialTexture = PIXI.Texture.EMPTY;
    // var bg = new PIXI.Sprite(initialTexture);
    bg.width = this.props.measurements.viewportWidth;
    bg.height = this.props.measurements.viewportHeight-0;

    // bg.texture = initialTexture;
    this.renderer = new PIXI.WebGLRenderer(this.props.measurements.viewportWidth,this.props.measurements.viewportHeight-0, {transparent: true});
    this.refs.stage.appendChild(this.renderer.view);

    this.stage = new PIXI.Container();
    this.uniforms = {
      resolution: { type: "v2", value: {x: this.props.measurements.viewportWidth, y: this.props.measurements.viewportHeight-0}},
      prevState: { type: "sampler2D", value: initialTexture },
      // redraw: {type: "bool", value: false},
      time: {type: "1f", value: 0.0},
      mouse: { type: "v2", value: {x: 0.0, y: 0.0}},
      scroll: {type: "1f", value: 0.0}
    };

    this.shader = new PIXI.AbstractFilter(null, this.fragmentShader, this.uniforms);
    this.count = 0;

    bg.shader = this.shader;
    this.interactionManager = new PIXI.interaction.InteractionManager(this.renderer);
    this.stage.addChild(bg);
    this.animate();
    // this.renderer.render(this.stage);
    // debugger;
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
