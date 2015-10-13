var $ = require('jquery');
var React = require('react');
var ReactDOM = require('react-dom');
var _ = require('underscore');
var ndarray = require('ndarray');
var Geom = require('gl-geometry');
var VAO = require('gl-vao');
var GLBuffer = require('gl-buffer');
var Shader = require('gl-shader');
var Texture = require('gl-texture2d');
var FBO = require('gl-fbo');
var ABT = require('a-big-triangle');
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
    // <Shade measurements={this.props.measurements} start={0} end={0.5}  />
    return (
      <div>
        <WebGL measurements={this.props.measurements} start={0} end={0.5} />
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

class WebGL extends ScanComponent {
  constructor(props) {
    super(props);
    this.state = { animate: true };

    this.vert = `
      attribute vec2 aTexturePosition;
      attribute vec2 aVertexPosition;
      uniform vec2 uResolution;

      varying vec2 vTexturePosition;

      void main() {
        vec2 zeroToOne = aVertexPosition / uResolution;
        vec2 zeroToTwo = zeroToOne * 2.0;
        vec2 clipSpace = zeroToTwo - 1.0;
        gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
        vTexturePosition = aTexturePosition;
      }
    `;

    this.frag = `
      precision mediump float;
      uniform sampler2D uImage;
      uniform vec2 uTextureSize;
      varying vec2 vTexturePosition;
      void main() {
        //vec2 onePixel = vec2(1.0, 1.0) / uTextureSize;
        gl_FragColor = texture2D(uImage, vTexturePosition).rgba;
      }
    `;

    this.renderVert = `
      precision mediump float;
      // attribute vec2 aTexturePosition;
      attribute vec2 aVertexPosition;
      uniform vec2 uResolution;
      uniform sampler2D uData;
      uniform float uTime;

      varying vec2 vTexturePosition;


      void main() {
        // vec2 zeroToOne = aVertexPosition / uResolution;
        // vec2 zeroToTwo = zeroToOne * 2.0;
        // vec2 clipSpace = zeroToTwo - 1.0;
        // gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
        vec4 fboPosition = texture2D(uData, aVertexPosition);
        vec2 position = fboPosition.xy;
        // position.x *= uResolution.y / uResolution.x;
        gl_PointSize = 2.0;
        gl_Position = vec4(position, 1, 1);
        // gl_Position = vec4(aVertexPosition, 1, 1);
        vTexturePosition = aVertexPosition;
      }
    `;

    this.renderFrag = `
      precision mediump float;
      uniform sampler2D uImage;
      uniform vec2 uTextureSize;
      uniform sampler2D uData;
      uniform vec2 uResolution;

      varying vec2 vTexturePosition;

      void main() {
        //vec2 onePixel = vec2(1.0, 1.0) / uTextureSize;
        vec2 uv = gl_FragCoord.xy / uResolution;
        vec4 tData = texture2D(uData, vTexturePosition);
        gl_FragColor = texture2D(uImage, vTexturePosition).rgba; //vec4(1,1,1,1); //
        vec2  p = (gl_PointCoord.xy - 0.5) * 2.0;
        float d = 1.0 - dot(p, p);
        gl_FragColor = vec4(d * vec3(0.55, 0.2, 0.25), 1);
      }
    `;

    this.logicVert = `
      precision mediump float;
      attribute vec2 aVertexPosition;

      void main() {
        gl_Position = vec4(aVertexPosition, 1, 1);
      }
    `;

    this.logicFrag = `
      // precision mediump float;
      // uniform sampler2D uData;
      // uniform vec2 uResolution;

      // void main() {
      //   vec2 uv = gl_FragCoord.xy / uResolution;
      //   vec4 tData = texture2D(uData, uv);
      //   vec2 position = tData.xy;
      //   vec2 finalPosition = tData.zw;
      //   vec2 onePixel = vec2(1.0, 1.0) / uResolution;
      //   vec2 newPosition = position + onePixel;

      //   gl_FragColor = vec4(vec2(0.5), finalPosition);
      // }

      precision mediump float;
      #define PI 3.14159265359
      uniform sampler2D uData;
      // uniform float time;
      uniform vec2 uResolution;
      // #pragma glslify: noise = require('glsl-noise/simplex/3d')
      void main() {
        vec2 uv       = gl_FragCoord.xy / uResolution;
        vec4 tData    = texture2D(uData, uv);
        vec2 position = tData.xy;
        vec2 speed    = tData.zw;
        // speed.x += noise(vec3(position * 2.125, uv.x + time)) * 0.000225;
        // speed.y += noise(vec3(position * 2.125, uv.y + time + 1000.0)) * 0.000225;
        float r = length(position);
        float a;
        if (r > 0.001) {
          a = atan(position.y, position.x);
        } else {
          a = 0.0;
        }
        position.x += cos(a + PI * 0.5) * 0.005;
        position.y += sin(a + PI * 0.5) * 0.005;
        position += speed;
        speed *= 0.975;
        position *= 0.995;
        gl_FragColor = vec4(position, speed);
        gl_FragColor = vec4(position, speed);
      }
    `;

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
     // this.shader.uniforms.uScroll.value = adjustedPctScroll;
    }

    return {animate: false};
  }

  setInitialParticleData([w, h]) {
    let numParticles = w * h,
        data = new Float32Array(numParticles * 4),
        pIdx = 0;

    for(var i = 0; i < w; i++) {
      for(var j = 0; j < h; j++) {
        var u = i / (w - 1);
        var v = j / (h - 1);
        var x = Math.abs(Math.random() * 2.0 - 1.0);
        var y = Math.abs(Math.random() * 2.0 - 1.0);
        data[pIdx++] = x;
        data[pIdx++] = y;
        data[pIdx++] = u;
        data[pIdx++] = v;
      }
    }

    var pixels = ndarray(data, [w, h, 4]);
    console.log(pixels);
    // this.FBOs[0].color[0].setPixels(pixels);
    // this.FBOs[1].color[0].setPixels(pixels);
    this.prevFBO.color[0].setPixels(pixels);
    this.currFBO.color[0].setPixels(pixels);
  }

  generateLUT([w, h]) {
    var size = w * h * 2;
    var data = new Float32Array(size);
    var k = 0;

    for (var i = 0; i < w; i++) {
      for (var j = 0; j < h; j++) {
        var u = i / (w - 1);
        var v = j / (h - 1);
        data[k++] = u;
        data[k++] = v;
      }
    }
    return data;
  }

  setupParticleSim() {
    console.log('setup called');
    var canvas = this.refs.stage;
    this.gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    let gl = this.gl;

    this.texture = Texture(gl, this.refs.gza);
    let [w, h] = this.texture.shape;

    this.logicShader = Shader(gl, this.logicVert, this.logicFrag);
    console.log('logic shader created');
    this.renderShader = Shader(gl, this.renderVert, this.renderFrag);
    console.log('render shader created');

    this.currFBO = FBO(gl, [w, h], {float: true});
    this.prevFBO = FBO(gl, [w, h], {float: true});

    // this.current = 0;
    // this.FBOs = [FBO(gl, [w, h], {float: true}), FBO(gl, [w, h], {float: true})];

    this.setInitialParticleData(this.texture.shape);

    this.particleVAO = VAO(gl,
      [{"buffer": GLBuffer(gl, this.generateLUT([w, h])),
        "type": gl.Float,
        "size": 2},
       {"buffer": GLBuffer(gl, new Float32Array([0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0, 1.0])),
        "type": gl.FLOAT,
        "size": 2}]);

    this.logicShader.attributes.aVertexPosition.location = 0;
    this.renderShader.attributes.aVertexPosition.location = 0;
    // this.renderShader.attributes.aTexturePosition.location = 1;
    this.animate();
    // this.draw();
  }

  step() {
    // console.log('step called');
    let [w, h] = this.texture.shape;
    this.currFBO.bind();
    // let prevFBO = this.FBOs[this.current],
    //     currFBO = this.FBOs[this.current ^= 1];

    // currFBO.bind()
    this.gl.viewport(0, 0, w, h);

    this.logicShader.bind();
    this.logicShader.uniforms.uResolution = [w, h];
    this.logicShader.uniforms.uData = this.prevFBO.color[0].bind();

    this.particleVAO.bind();
    this.particleVAO.draw(this.gl.POINTS, w * h);
    // ABT(this.gl);
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);


    var prevFBO = this.prevFBO;
    this.prevFBO = this.currFBO;
    this.currFBO = prevFBO;
  }

  /*
    checkFBOs(lastFBO) {
      read(this.prevFBO.color[0], function(err, prevData) {
        read(lastFBO.color[0], function(err, lastData) {
          read(this.currFBO.color[0], function(err, currData) {
            console.log(assert.deepEqual(currData, lastData));
            console.log(assert.deepEqual(prevData, lastData));
            console.log(assert.deepEqual(currData, prevData));
         });
        });
      });
    }
  */

  draw(delta) {
    // console.log('draw called:', delta);
    let gl = this.gl,
        width  = gl.drawingBufferWidth,
        height = gl.drawingBufferHeight,
        [w, h] = this.texture.shape;

    // Disabling blending here is important – if it's still
    // enabled your simulation will behave differently
    // to what you'd expect.
    gl.disable(gl.BLEND);
    this.step();

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.clearColor(0.045, 0.02, 0.095, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.viewport(0, 0, width, height);

    this.renderShader.bind();
    this.renderShader.uniforms.uData = this.prevFBO.color[0].bind(); //this.FBOs[this.current].color[0].bind();
    this.renderShader.uniforms.uResolution = [w, h];
    this.renderShader.uniforms.uImage = this.texture.bind();
    this.renderShader.uniforms.uTextureSize = [w, h];
    this.renderShader.uniforms.uTime = delta;
    this.particleVAO.bind();
    this.particleVAO.draw(gl.POINTS, w * h);
    this.particleVAO.unbind();
  }

  setupWebGL() {
    var canvas = this.refs.stage;
    this.gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    let gl = this.gl;


    this.texture = Texture(gl, this.refs.gza);
    let [w, h] = this.texture.shape;

    // 0 = aVertexCoord  //This is the shape to draw the texture into. texture_width x texture_height
    // 1 = aTextureCoord //These are the 0->1 webgl coordinates for the texture.
    this.vao = VAO(gl,
      [{"buffer": GLBuffer(gl, new Float32Array([10, 20, w, 20, 10, h, 10, h, w, 20, w, h])),
        "type": gl.FLOAT,
        "size": 2},
       {"buffer": GLBuffer(gl, new Float32Array([0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0, 1.0])),
        "type": gl.FLOAT,
        "size": 2}]);

    this.shader = Shader(gl, this.vert, this.frag);
    this.shader.attributes.aVertexPosition.location = 0;
    this.shader.attributes.aTexturePosition.location = 1;

    this.shader.bind();
    this.shader.uniforms.uImage = this.texture.bind();
    this.shader.uniforms.uResolution = [this.props.measurements.viewportWidth, this.props.measurements.viewportHeight];
    this.shader.uniforms.uTextureSize = [w, h];
    this.vao.bind();
    this.vao.draw(gl.TRIANGLES, 6);
    this.vao.unbind();
  }

  componentDidMount() {
    var image = this.refs.gza;

    image.onload = () => {
      this.lastFrame = 0;
      this.setupParticleSim();
    }
  }

  animate(time) {
    time = time || 0;
    let delta = time - this.lastFrame;
    this.lastFrame = time;
    requestAnimationFrame((t) => { this.animate(t); });
    this.draw(delta);
  }

  render() {
    return(
      <div className="stage-bg" style={{position: "fixed",
                                        width: this.props.measurements.viewportWidth,
                                        height: this.props.measurements.viewportHeight-0}}>
        <canvas ref="stage" className="stage" width={this.props.measurements.viewportWidth}
                height={this.props.measurements.viewportHeight}></canvas>
        <img src="/shade/gza.png" ref="gza" style={{visibility: 'hidden'}} />
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
