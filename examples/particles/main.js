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
    this.state = {
        maxCellSize: 15,
        animate: true
    };

    this.particleVertShader = `attribute vec2 aVertexPosition;
      attribute vec2 aTextureCoord;
      // attribute vec4 aColor;

      // uniform mat3 projectionMatrix;
      // uniform mat3 otherMatrix;
      uniform vec2 uResolution;

      varying vec2 vTextureCoord;

      void main() {
        vec2 zeroToOne = aVertexPosition / uResolution;
        // convert from 0->1 to 0->2
        vec2 zeroToTwo = zeroToOne * 2.0;
        // convert from 0->2 to -1->+1 (clipspace)
        vec2 clipSpace = zeroToTwo - 1.0;
        // flip y coordinate put 0,0 in top left instead of bottom left.
        gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
        vTextureCoord = aTextureCoord;
      }`;

    this.particleFragShader = `precision mediump float;
      uniform sampler2D uImage;
      uniform vec2 uTextureSize;

      varying vec2 vTextureCoord;

      void main() {
        gl_FragColor = texture2D(uImage, vTextureCoord).rgba;
      }`;

    this.fragmentShader = `precision mediump float;
      uniform vec2 uResolution;
      uniform vec2 uMouse;
      uniform vec2 uTextureSize;
      uniform float uScroll;
      uniform float uTtime;
      uniform sampler2D uSpriteTexture;
      varying vec2 vTextureCoord;

      vec2 random2(vec2 st){
          st = vec2(dot(st, vec2(127.1,311.7)), dot(st, vec2(269.5,183.3)));
          return -1.0 + 2.0 * fract(sin(st) * 43758.5453123);
      }

      float noise(vec2 st) {
          vec2 i = floor(st);
          vec2 f = fract(st);
          vec2 u = f*f*(3.0-2.0*f);
          return mix(mix(dot(random2(i + vec2(0.0,0.0)), f - vec2(0.0,0.0)), dot(random2(i + vec2(1.0,0.0)), f - vec2(1.0,0.0)), u.x),
                     mix(dot(random2(i + vec2(0.0,1.0)), f - vec2(0.0,1.0)), dot(random2(i + vec2(1.0,1.0)), f - vec2(1.0,1.0)), u.x), u.y);
      }

      void main() {
        vec2 st = gl_FragCoord.xy / uResolution.xy;
        vec2 st_texture = gl_FragCoord.xy / uTextureSize.xy;
        vec2 st_mouse = uMouse.xy / uResolution.xy;
        float time = uTime / 30.0;
        vec4 spriteValue = texture2D(uSpriteTexture, vTextureCoord);
        vec3 color = vec3(0.0);
        gl_FragColor = spriteValue;
      }`;
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


  compileShader(gl, shaderSource, shaderType) {
    // Create the shader object
    var shader = gl.createShader(shaderType);

    // Set the shader source code.
    gl.shaderSource(shader, shaderSource);

    // Compile the shader
    gl.compileShader(shader);

    // Check if it compiled
    var success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    if (!success) {
      // Something went wrong during compilation; get the error
      throw "could not compile shader:" + gl.getShaderInfoLog(shader);
    }

    return shader;
  }

  createProgram(gl, vertexShader, fragmentShader) {
    var program = gl.createProgram();

    // attach the shaders.
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);

    // link the program.
    gl.linkProgram(program);

    // Check if it linked.
    var success = gl.getProgramParameter(program, gl.LINK_STATUS);
    if (!success) {
        // something went wrong with the link
        throw ("program filed to link:" + gl.getProgramInfoLog (program));
    }

    return program;
  }

  createTexture(gl) {
    var texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);

    // Set the parameters so we can render any size image.
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    return texture;
  }

  createTextFBO(gl, width, height, image=null) {
    var texture = this.createTexture(gl);

    if(image) {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    } else {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, image);
    }

    // Create a framebuffer
    var fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);

    // Attach a texture to it.
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

    return {texture, fbo};
  }

  setParticleData(w, h) {
    let numParticles = w * h,
        arrLen = numParticles * 3,
        arrPos = new Float32Array(arrLen),
        arrIdx = new Float32Array(arrLen);

    for(var i = 0; i < numParticles; i++) {
      let pIdx = i * 3,
          tX = Math.floor(i % w) / w, //Texture pixel x.
          tY = Math.floor(i / w) / h, //Texture pixel y.
          x = Math.random() * 2.0 - 1.0, //Effect pixel x.
          y = Math.random() * 2.0 - 1.0; //Effect pixel y.

          arrPos[pIdx] = x;
          arrPos[pIdx + 1] = y;
          arrPos[pIdx + 2] = 0;
          arrIdx[pIdx] = tX;
          arrIdx[pIdx + 1] = tY;
          arrIdx[pIdx + 2] = 1;
    }
  }

  componentDidMount() {
    var canvas = this.refs.stage;
    var image = this.refs.gza;
    this.gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    var gl = this.gl,
      vertShader = this.compileShader(gl, this.particleVertShader, gl.VERTEX_SHADER),
      fragShader = this.compileShader(gl, this.particleFragShader, gl.FRAGMENT_SHADER),
      program = this.createProgram(gl, vertShader, fragShader);
    gl.useProgram(program);

    image.onload = () => {
      context.enableExtension("OES_texture_float");
      context.maxVertexTextureImageUnits();

      var textureSizeLocation = gl.getUniformLocation(program, "uTextureSize"),
          resolutionLocation = gl.getUniformLocation(program, "uResolution"),
          positionLocation = gl.getAttribLocation(program, "aVertexPosition"),
          texCoordLocation = gl.getAttribLocation(program, "aTextureCoord"),
          vertexBuffer = gl.createBuffer(),
          textureCoordBuffer = gl.createBuffer();

      gl.uniform2f(textureSizeLocation, image.width, image.height);
      gl.uniform2f(resolutionLocation, canvas.width, canvas.height);

      // look up where the vertex data needs to go.
      gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
      // setup a rectangle from 10,20 to image.width, image.height in pixels
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
          10, 20,
          image.width, 20,
          10, image.height,
          10, image.height,
          image.width, 20,
          image.width, image.height]), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(positionLocation);
      gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

      // provide texture coordinates for the rectangle.
      gl.bindBuffer(gl.ARRAY_BUFFER, textureCoordBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
          0.0,  0.0,
          1.0,  0.0,
          0.0,  1.0,
          0.0,  1.0,
          1.0,  0.0,
          1.0,  1.0]), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(texCoordLocation);
      gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 0, 0);

      var {texture: originalTexture, fbo: originalFbo} = this.createTextFBO(gl, canvas.width, canvas.height, image);
      var {texture: particleTexture, fbo: particleFbo} = this.createTextFBO(gl, image.width, image.height, null);

       // draw
      gl.bindTexture(gl.TEXTURE_2D, originalTexture);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

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

class Shade extends ScanComponent {
  constructor(props) {
    super(props);
    this.state = {
        maxCellSize: 15,
        animate: true
    };

    this.particleVertShader = `attribute vec2 aVertexPosition;
      attribute vec2 aTextureCoord;
      attribute vec4 aColor;

      uniform mat3 projectionMatrix;
      uniform mat3 otherMatrix;

      void main() {
        gl_Position = vec4((projectionMatrix * vec3(aVertexPosition, 1.0)).xy, 0.0, 1.0);
      }`;

    this.particleFragShader = `void main() {
      gl_FragColor = vec4(0, 1, 0, 1);  // green
    }`;

    this.fragmentShader = `precision mediump float;
      uniform vec2 uResolution;
      uniform vec2 uMouse;
      uniform vec2 uTextureSize;
      uniform float uScroll;
      uniform float uTtime;
      uniform sampler2D uSpriteTexture;
      varying vec2 vTextureCoord;

      vec2 random2(vec2 st){
          st = vec2(dot(st, vec2(127.1,311.7)), dot(st, vec2(269.5,183.3)));
          return -1.0 + 2.0 * fract(sin(st) * 43758.5453123);
      }

      float noise(vec2 st) {
          vec2 i = floor(st);
          vec2 f = fract(st);
          vec2 u = f*f*(3.0-2.0*f);
          return mix(mix(dot(random2(i + vec2(0.0,0.0)), f - vec2(0.0,0.0)), dot(random2(i + vec2(1.0,0.0)), f - vec2(1.0,0.0)), u.x),
                     mix(dot(random2(i + vec2(0.0,1.0)), f - vec2(0.0,1.0)), dot(random2(i + vec2(1.0,1.0)), f - vec2(1.0,1.0)), u.x), u.y);
      }

      void main() {
        vec2 st = gl_FragCoord.xy / uResolution.xy;
        vec2 st_texture = gl_FragCoord.xy / uTextureSize.xy;
        vec2 st_mouse = uMouse.xy / uResolution.xy;
        float time = uTime / 30.0;
        vec4 spriteValue = texture2D(uSpriteTexture, vTextureCoord);
        vec3 color = vec3(0.0);
        gl_FragColor = spriteValue;
      }`;
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

  setBuffer(gl) {
    this.buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    console.log(this.buffer);
  }

  setParticleShaders() {
    // this.particleShaderManager = new PIXI.ShaderManager(this.renderer);
    var uniforms = {},
        attribs = {aPosition: 0};

    // this.particleShader = new PIXI.Shader(this.renderer.shaderManager, this.particleVertShader, this.particleFragShader, uniforms, attribs);
    this.particleShader = new PIXI.AbstractFilter(this.particleVertShader, this.particleFragShader, uniforms);
    // this.renderer.shaderManager.setShader(this.particleShader);
  }

  componentDidMount() {
    var gza = PIXI.Sprite.fromImage("/shade/gza.png");
    gza.width = 260;
    gza.height = 613;
    gza.position = new PIXI.Point(525, 45);

    this.renderer = new PIXI.WebGLRenderer(this.props.measurements.viewportWidth,this.props.measurements.viewportHeight-0, {transparent: true});
    this.setBuffer(this.renderer.gl);
    this.refs.stage.appendChild(this.renderer.view);

    this.stage = new PIXI.Container();
    // this.uniforms = {
    //   uResolution: { type: "v2", value: {x: this.props.measurements.viewportWidth, y: this.props.measurements.viewportHeight-0}},
    //   uTime: {type: "1f", value: 0.0},
    //   uMouse: { type: "v2", value: {x: 0.0, y: 0.0}},
    //   uTextureSize: { type: "v2", value: {x: 260.0, y: 613.0}},
    //   uSpriteTexture: {type: "sampler2D", value: gza.texture },
    //   uScroll: {type: "1f", value: 0.0}
    // };

    // this.shader = new PIXI.AbstractFilter(null, this.fragmentShader, this.uniforms);
    this.count = 0;

    this.interactionManager = new PIXI.interaction.InteractionManager(this.renderer);
    this.setParticleShaders();
    // gza.shader = this.particleShader;
    // console.log(this.particleShader);
    this.stage.addChild(gza);

    this.animate();
    this.bindHandlers();
  }

  animate() {
    requestAnimationFrame(() => { this.animate(); });
    var mouse = this.interactionManager.mouse.global;
    // this.shader.uniforms.uTime.value = this.count;

    // if (mouse.x > 0 && mouse.y > 0) {  // If mouse is over stage
    //   this.shader.uniforms.uMouse.value = {x: mouse.x, y: mouse.y};
    // }

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
